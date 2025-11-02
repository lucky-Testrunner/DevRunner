import { ipcMain, BrowserWindow } from 'electron'
import { getProcessManager, ProcessInfo, ProcessOutput } from '../services/process-manager.js'
import { getCommandRepository } from '../repository/command-repository.js'
import { getProjectRepository } from '../repository/project-repository.js'
import { ValidationError } from '../validation/validators.js'

interface IpcResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

function createSuccessResult<T>(data: T): IpcResult<T> {
  return { success: true, data }
}

function createErrorResult(error: string): IpcResult<never> {
  return { success: false, error }
}

export interface ExecuteCommandRequest {
  projectId: string
  commandId: string
}

export interface ExecuteMultipleCommandsRequest {
  projectId: string
  commandIds: string[]
}

export interface StopCommandRequest {
  commandId: string
}

export interface StopMultipleCommandsRequest {
  commandIds: string[]
}

export interface StopAllCommandsRequest {
  projectId: string
}

export interface ExecuteCommandResponse {
  commandId: string
  success: boolean
  pid?: number
  exitCode?: number
  error?: string
  output?: string
}

export interface StopCommandResponse {
  commandId: string
  success: boolean
  error?: string
}

export function registerProcessHandlers(): void {
  const processManager = getProcessManager()
  const commandRepository = getCommandRepository()
  const projectRepository = getProjectRepository()

  // 转发进程事件到所有渲染进程
  processManager.on('process:output', (data: { commandId: string; output: ProcessOutput }) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('process:output', data)
    })
  })

  processManager.on('process:started', (data: { commandId: string; pid: number }) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('process:started', data)
    })
  })

  processManager.on('process:exit', (data: { commandId: string; exitCode: number | null; signal: string | null }) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('process:exit', data)
    })
  })

  processManager.on('process:error', (data: { commandId: string; error: string }) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('process:error', data)
    })
  })

  processManager.on('process:ports', (data: { commandId: string; ports: number[] }) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('process:ports', data)
    })
  })

  ipcMain.handle(
    'process:execute',
    async (_event, request: ExecuteCommandRequest): Promise<IpcResult<ExecuteCommandResponse>> => {
      try {
        const { projectId, commandId } = request
        const command = commandRepository.getCommandById(projectId, commandId)

        if (!command) {
          return createErrorResult('命令未找到')
        }

        // 获取项目信息以使用项目路径作为默认工作目录
        const project = projectRepository.getProjectById(projectId)
        const workingDirectory = command.workingDirectory || project?.path

        const result = await processManager.executeCommand({
          commandId: command.id,
          projectId,
          command: command.command,
          shell: command.shell,
          workingDirectory,
          env: command.env,
          isService: command.type === 'service'
        })

        return createSuccessResult({
          commandId: result.commandId,
          success: result.success,
          pid: result.pid,
          exitCode: result.exitCode,
          error: result.error,
          output: result.output
        })
      } catch (error) {
        console.error('Error executing command:', error)
        if (error instanceof ValidationError) {
          return createErrorResult(`验证错误：${error.message}`)
        }
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'process:execute-multiple',
    async (
      _event,
      request: ExecuteMultipleCommandsRequest
    ): Promise<IpcResult<ExecuteCommandResponse[]>> => {
      try {
        const { projectId, commandIds } = request
        const results: ExecuteCommandResponse[] = []

        for (const commandId of commandIds) {
          const command = commandRepository.getCommandById(projectId, commandId)

          if (!command) {
            results.push({
              commandId,
              success: false,
              error: '命令未找到'
            })
            continue
          }

          // 获取项目信息以使用项目路径作为默认工作目录
          const project = projectRepository.getProjectById(projectId)
          const workingDirectory = command.workingDirectory || project?.path

          const result = await processManager.executeCommand({
            commandId: command.id,
            projectId,
            command: command.command,
            shell: command.shell,
            workingDirectory,
            env: command.env,
            isService: command.type === 'service'
          })

          results.push({
            commandId: result.commandId,
            success: result.success,
            pid: result.pid,
            exitCode: result.exitCode,
            error: result.error,
            output: result.output
          })
        }

        return createSuccessResult(results)
      } catch (error) {
        console.error('Error executing multiple commands:', error)
        if (error instanceof ValidationError) {
          return createErrorResult(`验证错误：${error.message}`)
        }
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'process:stop',
    async (_event, request: StopCommandRequest): Promise<IpcResult<StopCommandResponse>> => {
      try {
        const { commandId } = request
        const stopped = await processManager.stopProcess(commandId)

        if (stopped) {
          return createSuccessResult({
            commandId,
            success: true
          })
        } else {
          return createSuccessResult({
            commandId,
            success: false,
            error: '进程未找到或已停止'
          })
        }
      } catch (error) {
        console.error('Error stopping command:', error)
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'process:stop-multiple',
    async (
      _event,
      request: StopMultipleCommandsRequest
    ): Promise<IpcResult<StopCommandResponse[]>> => {
      try {
        const { commandIds } = request
        const results: StopCommandResponse[] = []

        for (const commandId of commandIds) {
          const stopped = await processManager.stopProcess(commandId)

          results.push({
            commandId,
            success: stopped,
            error: stopped ? undefined : '进程未找到或已停止'
          })
        }

        return createSuccessResult(results)
      } catch (error) {
        console.error('Error stopping multiple commands:', error)
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'process:stop-all',
    async (_event, request: StopAllCommandsRequest): Promise<IpcResult<{ stoppedCount: number }>> => {
      try {
        const { projectId } = request
        const stoppedCount = await processManager.stopAllProcesses(projectId)

        return createSuccessResult({ stoppedCount })
      } catch (error) {
        console.error('Error stopping all commands:', error)
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'process:get-info',
    async (_event, commandId: string): Promise<IpcResult<ProcessInfo | null>> => {
      try {
        const info = processManager.getProcessInfo(commandId)
        return createSuccessResult(info || null)
      } catch (error) {
        console.error('Error getting process info:', error)
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'process:get-all-info',
    async (_event, projectId?: string): Promise<IpcResult<ProcessInfo[]>> => {
      try {
        const allInfo = processManager.getAllProcessInfo(projectId)
        return createSuccessResult(allInfo)
      } catch (error) {
        console.error('Error getting all process info:', error)
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'process:get-output',
    async (_event, commandId: string, limit = 100): Promise<IpcResult<ProcessOutput[]>> => {
      try {
        const output = processManager.getProcessOutput(commandId, limit)
        return createSuccessResult(output)
      } catch (error) {
        console.error('Error getting process output:', error)
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle('process:is-running', async (_event, commandId: string): Promise<IpcResult<boolean>> => {
    try {
      const isRunning = processManager.isProcessRunning(commandId)
      return createSuccessResult(isRunning)
    } catch (error) {
      console.error('Error checking if process is running:', error)
      return createErrorResult(error instanceof Error ? error.message : '未知错误')
    }
  })
}
