import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { ShellType } from '../types/project.js'
import { getProjectStore } from '../store/store.js'
import iconv from 'iconv-lite'

export interface ProcessExecutionOptions {
  commandId: string
  projectId: string
  command: string
  shell: ShellType
  workingDirectory?: string
  env?: Record<string, string>
  isService: boolean
}

export interface ProcessOutput {
  type: 'stdout' | 'stderr'
  data: string
  timestamp: string
}

export interface ProcessInfo {
  commandId: string
  projectId: string
  pid: number
  ports?: number[]
  startedAt: string
  status: 'running' | 'stopped' | 'error'
  exitCode?: number
  error?: string
}

export interface ExecutionResult {
  success: boolean
  commandId: string
  pid?: number
  exitCode?: number
  error?: string
  output?: string
}

class ProcessManager extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map()
  private processInfo: Map<string, ProcessInfo> = new Map()
  private outputBuffers: Map<string, ProcessOutput[]> = new Map()

  constructor() {
    super()
    this.reconcileProcesses()
  }

  private decodeBuffer(buffer: Buffer): string {
    // Windows 系统尝试多种编码
    if (process.platform === 'win32') {
      // 优先尝试 GBK 解码（Windows 中文系统默认编码）
      try {
        const gbkResult = iconv.decode(buffer, 'cp936')
        // 如果 GBK 解码后没有乱码，就用 GBK
        if (!gbkResult.includes('�')) {
          return gbkResult
        }
      } catch (error) {
        // GBK 解码失败，继续尝试 UTF-8
      }
      
      // GBK 有乱码或失败，尝试 UTF-8
      try {
        const utf8Result = buffer.toString('utf8')
        if (!utf8Result.includes('�')) {
          return utf8Result
        }
      } catch (error) {
        // UTF-8 也失败
      }
      
      // 都有乱码，返回 GBK（通常更准确）
      return iconv.decode(buffer, 'cp936')
    }
    return buffer.toString('utf8')
  }

  private async getAllChildProcessPIDs(rootPid: number): Promise<number[]> {
    if (process.platform !== 'win32') {
      return [rootPid]
    }

    // 获取所有进程的父子关系
    return new Promise((resolve) => {
      const wmic = spawn('wmic', [
        'process', 'get', 'ParentProcessId,ProcessId'
      ], { windowsHide: true })
      
      let output = ''
      wmic.stdout?.on('data', (data) => {
        output += this.decodeBuffer(data)
      })

      wmic.on('close', () => {
        const processMap = new Map<number, number[]>() // parent -> children[]
        const lines = output.split('\n')
        
        // 解析进程关系（格式：ParentProcessId  ProcessId）
        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 2) {
            const parentPid = parseInt(parts[0], 10)
            const pid = parseInt(parts[1], 10)
            if (!isNaN(parentPid) && !isNaN(pid) && parentPid > 0 && pid > 0) {
              if (!processMap.has(parentPid)) {
                processMap.set(parentPid, [])
              }
              processMap.get(parentPid)!.push(pid)
            }
          }
        }
        
        // 递归查找所有子孙进程（只查找当前进程树）
        const result: number[] = [rootPid]
        const queue: number[] = [rootPid]
        
        while (queue.length > 0) {
          const current = queue.shift()!
          const children = processMap.get(current) || []
          for (const child of children) {
            if (!result.includes(child)) {
              result.push(child)
              queue.push(child)
            }
          }
        }
        
        console.log(`[Port Detection] Complete process tree for ${rootPid}:`, result)
        resolve(result)
      })

      wmic.on('error', (err) => {
        console.error(`[Port Detection] Error getting child processes:`, err)
        resolve([rootPid])
      })
    })
  }

  private async getProcessPorts(pid: number): Promise<number[]> {
    // 获取进程树中所有 PID（包括所有子孙进程）
    const allPids = await this.getAllChildProcessPIDs(pid)
    
    return new Promise((resolve) => {
      if (process.platform === 'win32') {
        const netstat = spawn('netstat', ['-ano'], { windowsHide: true })
        let output = ''

        netstat.stdout?.on('data', (data) => {
          output += this.decodeBuffer(data)
        })

        netstat.on('close', () => {
          const ports: number[] = []
          const portDetails: Array<{port: number, pid: number, address: string}> = []
          const lines = output.split('\n')
          
          console.log(`[Port Detection] Checking ports for PIDs:`, allPids)
          
          for (const line of lines) {
            // 检查包含 LISTENING 的行
            if (line.includes('LISTENING')) {
              const parts = line.trim().split(/\s+/)
              // netstat 输出格式: 协议 本地地址 外部地址 状态 PID
              if (parts.length >= 5) {
                const lastPart = parts[parts.length - 1]
                const linePid = parseInt(lastPart, 10)
                
                // 调试：记录所有监听的端口
                const address = parts[1]
                const portMatch = address.match(/:(\d+)$/)
                if (portMatch) {
                  const port = parseInt(portMatch[1], 10)
                  if (port > 0 && port < 65536) {
                    console.log(`[Port Detection] Found listening port ${port} on ${address} by PID ${linePid}, checking if in tree...`)
                    
                    // 检查是否是进程树中的任一 PID
                    if (allPids.includes(linePid)) {
                      if (!ports.includes(port)) {
                        console.log(`[Port Detection] ✓ Port ${port} belongs to our process tree (PID ${linePid})`)
                        ports.push(port)
                        portDetails.push({port, pid: linePid, address})
                      }
                    } else {
                      console.log(`[Port Detection] ✗ Port ${port} belongs to external PID ${linePid} (not in our tree)`)
                    }
                  }
                }
              }
            }
          }
          
          console.log(`[Port Detection] Summary - Total ports found for our process tree:`, ports)
          console.log(`[Port Detection] Details:`, portDetails)
          resolve(ports)
        })

        netstat.on('error', (err) => {
          console.error(`[Port Detection] Error running netstat:`, err)
          resolve([])
        })
      } else {
        // Unix/Linux 系统使用 lsof
        const lsof = spawn('lsof', ['-iTCP', '-sTCP:LISTEN', '-n', '-P', '-p', pid.toString()])
        let output = ''

        lsof.stdout?.on('data', (data) => {
          output += data.toString()
        })

        lsof.on('close', () => {
          const ports: number[] = []
          const lines = output.split('\n')
          
          for (const line of lines) {
            const portMatch = line.match(/:(\d+)\s+\(LISTEN\)/)
            if (portMatch) {
              const port = parseInt(portMatch[1], 10)
              if (!ports.includes(port)) {
                ports.push(port)
              }
            }
          }
          
          resolve(ports)
        })

        lsof.on('error', () => {
          resolve([])
        })
      }
    })
  }

  private getShellCommand(shell: ShellType, useNewWindow: boolean): { command: string; args: string[] } {
    const platform = process.platform
    
    if (platform === 'win32') {
      // oneoff命令使用新窗口
      if (useNewWindow) {
        if (shell === 'powershell') {
          return {
            command: 'cmd.exe',
            args: ['/c', 'start', '""', 'powershell.exe', '-NoProfile', '-NoExit', '-Command']
          }
        }
        return {
          command: 'cmd.exe',
          args: ['/c', 'start', '""', 'cmd.exe', '/k']
        }
      }
      
      // service命令不使用新窗口以便管理
      if (shell === 'powershell') {
        return {
          command: 'powershell.exe',
          args: ['-NoProfile', '-Command']
        }
      }
      return {
        command: 'cmd.exe',
        args: ['/c']
      }
    }
    
    return {
      command: '/bin/bash',
      args: ['-c']
    }
  }

  async executeCommand(options: ProcessExecutionOptions): Promise<ExecutionResult> {
    const { commandId, projectId, command, shell, workingDirectory, env, isService } = options

    if (this.processes.has(commandId)) {
      return {
        success: false,
        commandId,
        error: 'Command is already running'
      }
    }

    // oneoff类型使用新窗口显示，service类型在后台运行以便管理
    const useNewWindow = !isService
    const shellConfig = this.getShellCommand(shell, useNewWindow)
    
    // 设置环境变量，特别是禁用 Python 输出缓冲
    const processEnv = {
      ...process.env,
      ...env,
      PYTHONUNBUFFERED: '1',  // 禁用 Python 输出缓冲
      PYTHONIOENCODING: 'utf-8'  // 设置 Python 输出编码
    }

    try {
      const childProcess = spawn(
        shellConfig.command,
        [...shellConfig.args, command],
        {
          cwd: workingDirectory || process.cwd(),
          env: processEnv,
          shell: false,
          windowsHide: isService,  // service不显示窗口，oneoff显示
          detached: process.platform !== 'win32',
          stdio: isService ? 'pipe' : 'ignore'  // service捕获输出，oneoff忽略
        }
      )

      if (!childProcess.pid) {
        return {
          success: false,
          commandId,
          error: 'Failed to spawn process'
        }
      }

      const pid = childProcess.pid
      const startedAt = new Date().toISOString()

      // 保存进程信息，包括oneoff类型，以便后续能够停止
      this.processes.set(commandId, childProcess)
      
      const info: ProcessInfo = {
        commandId,
        projectId,
        pid,
        startedAt,
        status: 'running'
      }
      
      this.processInfo.set(commandId, info)
      
      // 清空旧的日志缓冲区（每次运行都是新的日志）
      this.outputBuffers.delete(commandId)
      
      // 异步获取端口信息
      if (isService) {
        // 多次尝试检测端口，因为服务可能需要时间启动
        const detectPorts = async (attempts = 0) => {
          const ports = await this.getProcessPorts(pid)
          const currentInfo = this.processInfo.get(commandId)
          
          if (!currentInfo) return // 进程已停止
          
          if (ports.length > 0) {
            currentInfo.ports = ports
            this.processInfo.set(commandId, currentInfo)
            this.persistProcessInfo(commandId, currentInfo)
            this.emit('process:ports', { commandId, ports })
            console.log(`[Port Detection] Ports detected for ${commandId}:`, ports)
          } else if (attempts < 3) {
            // 没检测到端口，再等待一会重试
            setTimeout(() => detectPorts(attempts + 1), 2000)
          }
        }
        
        setTimeout(() => detectPorts(), 2000) // 等待2秒让服务启动
      }
      
      if (isService) {
        // 添加启动命令到日志
        const startupLog: ProcessOutput = {
          type: 'stdout',
          data: `$ ${command}\n`,
          timestamp: new Date().toISOString()
        }
        this.outputBuffers.set(commandId, [startupLog])
        this.emit('process:output', { commandId, output: startupLog })
        
        this.setupProcessListeners(commandId, childProcess)
      } else {
        // oneoff命令也需要监听退出事件以清理
        childProcess.on('exit', () => {
          this.processes.delete(commandId)
          this.processInfo.delete(commandId)
          this.removePersistedProcessInfo(commandId)
        })
        
        childProcess.on('error', () => {
          this.processes.delete(commandId)
          this.processInfo.delete(commandId)
          this.removePersistedProcessInfo(commandId)
        })
      }
      
      this.persistProcessInfo(commandId, info)
      this.emit('process:started', { commandId, pid })
      
      return {
        success: true,
        commandId,
        pid
      }
    } catch (error) {
      return {
        success: false,
        commandId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private setupProcessListeners(commandId: string, childProcess: ChildProcess): void {
    childProcess.stdout?.on('data', (data) => {
      const output: ProcessOutput = {
        type: 'stdout',
        data: this.decodeBuffer(data),
        timestamp: new Date().toISOString()
      }
      
      const buffer = this.outputBuffers.get(commandId) || []
      buffer.push(output)
      
      if (buffer.length > 1000) {
        buffer.shift()
      }
      
      this.outputBuffers.set(commandId, buffer)
      this.emit('process:output', { commandId, output })
    })

    childProcess.stderr?.on('data', (data) => {
      const output: ProcessOutput = {
        type: 'stderr',
        data: this.decodeBuffer(data),
        timestamp: new Date().toISOString()
      }
      
      const buffer = this.outputBuffers.get(commandId) || []
      buffer.push(output)
      
      if (buffer.length > 1000) {
        buffer.shift()
      }
      
      this.outputBuffers.set(commandId, buffer)
      this.emit('process:output', { commandId, output })
    })

    childProcess.on('exit', (code, signal) => {
      const info = this.processInfo.get(commandId)
      if (info) {
        info.status = 'stopped'
        info.exitCode = code || undefined
        this.processInfo.set(commandId, info)
      }

      this.processes.delete(commandId)
      this.removePersistedProcessInfo(commandId)
      
      this.emit('process:exit', { commandId, exitCode: code, signal })
    })

    childProcess.on('error', (error) => {
      const info = this.processInfo.get(commandId)
      if (info) {
        info.status = 'error'
        info.error = error.message
        this.processInfo.set(commandId, info)
      }

      this.processes.delete(commandId)
      this.removePersistedProcessInfo(commandId)
      
      this.emit('process:error', { commandId, error: error.message })
    })
  }

  async stopProcess(commandId: string): Promise<boolean> {
    const childProcess = this.processes.get(commandId)
    const info = this.processInfo.get(commandId)

    if (!childProcess || !info) {
      return false
    }

    const pid = info.pid

    let killed = false
    try {
      if (process.platform === 'win32') {
        killed = await this.killWindowsProcess(pid)
      } else {
        killed = await this.killUnixProcess(pid)
      }
    } catch (error) {
      console.error(`Error stopping process ${commandId}:`, error)
      killed = false
    }

    this.processes.delete(commandId)
    this.processInfo.delete(commandId)
    this.outputBuffers.delete(commandId)
    this.removePersistedProcessInfo(commandId)

    return killed
  }

  private async killWindowsProcess(pid: number): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true
          resolve(false)
        }
      }, 3000)

      const taskkill = spawn('taskkill', ['/F', '/T', '/PID', pid.toString()], {
        windowsHide: true
      })

      taskkill.on('exit', (code) => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          if (code === 0 || code === 128) {
            resolve(true)
          } else {
            try {
              process.kill(pid, 'SIGTERM')
              resolve(true)
            } catch (error) {
              resolve(false)
            }
          }
        }
      })

      taskkill.on('error', () => {
        if (!resolved) {
          resolved = true
          clearTimeout(timeout)
          try {
            process.kill(pid, 'SIGTERM')
            resolve(true)
          } catch (error) {
            resolve(false)
          }
        }
      })
    })
  }

  private async killUnixProcess(pid: number): Promise<boolean> {
    return new Promise((resolve) => {
      let resolved = false
      
      try {
        process.kill(pid, 'SIGTERM')
        
        const checkInterval = setInterval(() => {
          try {
            process.kill(pid, 0)
          } catch {
            if (!resolved) {
              resolved = true
              clearInterval(checkInterval)
              resolve(true)
            }
          }
        }, 100)
        
        setTimeout(() => {
          if (!resolved) {
            resolved = true
            clearInterval(checkInterval)
            try {
              process.kill(pid, 0)
              process.kill(pid, 'SIGKILL')
              resolve(true)
            } catch {
              resolve(true)
            }
          }
        }, 3000)
      } catch (error) {
        if (!resolved) {
          resolved = true
          resolve(false)
        }
      }
    })
  }

  async stopAllProcesses(projectId?: string): Promise<number> {
    const commandIds = Array.from(this.processInfo.values())
      .filter((info) => !projectId || info.projectId === projectId)
      .map((info) => info.commandId)

    let stoppedCount = 0
    for (const commandId of commandIds) {
      const stopped = await this.stopProcess(commandId)
      if (stopped) {
        stoppedCount++
      }
    }

    return stoppedCount
  }

  getProcessInfo(commandId: string): ProcessInfo | undefined {
    return this.processInfo.get(commandId)
  }

  getAllProcessInfo(projectId?: string): ProcessInfo[] {
    const allInfo = Array.from(this.processInfo.values())
    if (projectId) {
      return allInfo.filter((info) => info.projectId === projectId)
    }
    return allInfo
  }

  getProcessOutput(commandId: string, limit = 100): ProcessOutput[] {
    const buffer = this.outputBuffers.get(commandId) || []
    return buffer.slice(-limit)
  }

  isProcessRunning(commandId: string): boolean {
    return this.processes.has(commandId)
  }

  private persistProcessInfo(commandId: string, info: ProcessInfo): void {
    try {
      const store = getProjectStore()
      const data = store.getData()
      
      const project = data.projects.find((p) => p.id === info.projectId)
      if (!project) {
        return
      }

      const command = project.commands.find((c) => c.id === commandId)
      if (!command) {
        return
      }

      if (!project.runtimeStatus) {
        project.runtimeStatus = []
      }

      const existingIndex = project.runtimeStatus.findIndex((s) => s.commandId === commandId)
      
      const status = {
        commandId,
        status: info.status,
        pid: info.pid,
        ports: info.ports,
        startedAt: info.startedAt,
        exitCode: info.exitCode,
        error: info.error
      }

      if (existingIndex >= 0) {
        project.runtimeStatus[existingIndex] = status
      } else {
        project.runtimeStatus.push(status)
      }

      store.setData(data)
    } catch (error) {
      console.error('Error persisting process info:', error)
    }
  }

  private removePersistedProcessInfo(commandId: string): void {
    try {
      const store = getProjectStore()
      const data = store.getData()
      
      for (const project of data.projects) {
        if (project.runtimeStatus) {
          project.runtimeStatus = project.runtimeStatus.filter((s) => s.commandId !== commandId)
        }
      }

      store.setData(data)
    } catch (error) {
      console.error('Error removing persisted process info:', error)
    }
  }

  private reconcileProcesses(): void {
    try {
      const store = getProjectStore()
      const data = store.getData()
      
      for (const project of data.projects) {
        if (!project.runtimeStatus) {
          continue
        }

        project.runtimeStatus = project.runtimeStatus.filter((status) => {
          if (!status.pid) {
            return false
          }

          try {
            process.kill(status.pid, 0)
            return true
          } catch {
            return false
          }
        })
      }

      store.setData(data)
    } catch (error) {
      console.error('Error reconciling processes:', error)
    }
  }
}

let processManagerInstance: ProcessManager | null = null

export function getProcessManager(): ProcessManager {
  if (!processManagerInstance) {
    processManagerInstance = new ProcessManager()
  }
  return processManagerInstance
}

export function resetProcessManager(): void {
  if (processManagerInstance) {
    processManagerInstance.removeAllListeners()
  }
  processManagerInstance = null
}
