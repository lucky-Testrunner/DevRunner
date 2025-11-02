import { ipcMain } from 'electron'
import { getCommandRepository } from '../repository/command-repository.js'
import { ValidationError } from '../validation/validators.js'
import { Command, CommandType, ShellType } from '../types/project.js'

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

export function registerCommandHandlers(): void {
  ipcMain.handle(
    'commands:list',
    async (_event, projectId: string): Promise<IpcResult<Command[]>> => {
      try {
        const repository = getCommandRepository()
        const commands = repository.listCommands(projectId)
        return createSuccessResult(commands)
      } catch (error) {
        console.error('Error listing commands:', error)
        if (error instanceof ValidationError) {
          return createErrorResult(`验证错误：${error.message}`)
        }
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'commands:get',
    async (_event, projectId: string, commandId: string): Promise<IpcResult<Command | null>> => {
      try {
        const repository = getCommandRepository()
        const command = repository.getCommandById(projectId, commandId)
        return createSuccessResult(command || null)
      } catch (error) {
        console.error('Error getting command:', error)
        if (error instanceof ValidationError) {
          return createErrorResult(`验证错误：${error.message}`)
        }
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'commands:create',
    async (
      _event,
      projectId: string,
      commandData: {
        name: string
        description?: string
        type: CommandType
        shell: ShellType
        command: string
        workingDirectory?: string
        env?: Record<string, string>
        autoRestart?: boolean
      }
    ): Promise<IpcResult<Command>> => {
      try {
        const repository = getCommandRepository()
        const command = repository.createCommand(projectId, commandData)
        return createSuccessResult(command)
      } catch (error) {
        console.error('Error creating command:', error)
        if (error instanceof ValidationError) {
          return createErrorResult(`验证错误：${error.message}`)
        }
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'commands:update',
    async (
      _event,
      projectId: string,
      commandId: string,
      updates: Partial<{
        name: string
        description?: string
        type: CommandType
        shell: ShellType
        command: string
        workingDirectory?: string
        env?: Record<string, string>
        autoRestart?: boolean
      }>
    ): Promise<IpcResult<Command>> => {
      try {
        const repository = getCommandRepository()
        const command = repository.updateCommand(projectId, commandId, updates)
        return createSuccessResult(command)
      } catch (error) {
        console.error('Error updating command:', error)
        if (error instanceof ValidationError) {
          return createErrorResult(`验证错误：${error.message}`)
        }
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'commands:delete',
    async (_event, projectId: string, commandId: string): Promise<IpcResult<boolean>> => {
      try {
        const repository = getCommandRepository()
        const deleted = repository.deleteCommand(projectId, commandId)
        return createSuccessResult(deleted)
      } catch (error) {
        console.error('Error deleting command:', error)
        if (error instanceof ValidationError) {
          return createErrorResult(`验证错误：${error.message}`)
        }
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )
}
