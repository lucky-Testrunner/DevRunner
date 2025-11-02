interface IpcResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

interface Project {
  id: string
  name: string
  description?: string
  path?: string
  commands: Command[]
  createdAt: string
  updatedAt: string
}

interface Command {
  id: string
  name: string
  description?: string
  type: 'service' | 'oneoff'
  shell: 'cmd' | 'powershell' | 'bash'
  command: string
  workingDirectory?: string
  env?: Record<string, string>
  autoRestart?: boolean
  createdAt: string
  updatedAt: string
}

interface ProcessInfo {
  commandId: string
  projectId: string
  pid: number
  startedAt: string
  status: 'running' | 'stopped' | 'error'
  exitCode?: number
  error?: string
}

interface ExecuteCommandResponse {
  commandId: string
  success: boolean
  pid?: number
  exitCode?: number
  error?: string
  output?: string
}

interface StopCommandResponse {
  commandId: string
  success: boolean
  error?: string
}

interface ProcessOutput {
  type: 'stdout' | 'stderr'
  data: string
  timestamp: string
}

export interface ElectronAPI {
  ping: () => Promise<string>
  projects: {
    list: () => Promise<IpcResult<Project[]>>
    get: (id: string) => Promise<IpcResult<Project | null>>
    create: (projectData: {
      name: string
      description?: string
      path?: string
    }) => Promise<IpcResult<Project>>
    update: (
      id: string,
      updates: Partial<{ name: string; description?: string; path?: string }>
    ) => Promise<IpcResult<Project>>
    delete: (id: string) => Promise<IpcResult<boolean>>
  }
  commands: {
    list: (projectId: string) => Promise<IpcResult<Command[]>>
    get: (projectId: string, commandId: string) => Promise<IpcResult<Command | null>>
    create: (
      projectId: string,
      commandData: {
        name: string
        description?: string
        type: 'service' | 'oneoff'
        shell: 'cmd' | 'powershell' | 'bash'
        command: string
        workingDirectory?: string
        env?: Record<string, string>
        autoRestart?: boolean
      }
    ) => Promise<IpcResult<Command>>
    update: (
      projectId: string,
      commandId: string,
      updates: Partial<{
        name: string
        description?: string
        type: 'service' | 'oneoff'
        shell: 'cmd' | 'powershell' | 'bash'
        command: string
        workingDirectory?: string
        env?: Record<string, string>
        autoRestart?: boolean
      }>
    ) => Promise<IpcResult<Command>>
    delete: (projectId: string, commandId: string) => Promise<IpcResult<boolean>>
  }
  process: {
    execute: (request: {
      projectId: string
      commandId: string
    }) => Promise<IpcResult<ExecuteCommandResponse>>
    executeMultiple: (request: {
      projectId: string
      commandIds: string[]
    }) => Promise<IpcResult<ExecuteCommandResponse[]>>
    stop: (request: { commandId: string }) => Promise<IpcResult<StopCommandResponse>>
    stopMultiple: (request: {
      commandIds: string[]
    }) => Promise<IpcResult<StopCommandResponse[]>>
    stopAll: (request: { projectId: string }) => Promise<IpcResult<{ stoppedCount: number }>>
    getInfo: (commandId: string) => Promise<IpcResult<ProcessInfo | null>>
    getAllInfo: (projectId?: string) => Promise<IpcResult<ProcessInfo[]>>
    getOutput: (commandId: string, limit?: number) => Promise<IpcResult<ProcessOutput[]>>
    isRunning: (commandId: string) => Promise<IpcResult<boolean>>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
