import { contextBridge, ipcRenderer } from 'electron'

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
  ports?: number[]
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

type ProcessOutputEvent = {
  commandId: string
  output: ProcessOutput
}

type ApiSchema = {
  ping: () => Promise<string>
  dialog: {
    openDirectory: () => Promise<{ canceled: boolean; filePaths?: string[] }>
  }
  on: {
    processOutput: (callback: (event: ProcessOutputEvent) => void) => () => void
    processStarted: (callback: (event: { commandId: string; pid: number }) => void) => () => void
    processExit: (callback: (event: { commandId: string; exitCode: number | null; signal: string | null }) => void) => () => void
    processError: (callback: (event: { commandId: string; error: string }) => void) => () => void
    processPorts: (callback: (event: { commandId: string; ports: number[] }) => void) => () => void
  }
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

const api: ApiSchema = {
  ping: () => ipcRenderer.invoke('ping'),
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory')
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id: string) => ipcRenderer.invoke('projects:get', id),
    create: (projectData) => ipcRenderer.invoke('projects:create', projectData),
    update: (id, updates) => ipcRenderer.invoke('projects:update', id, updates),
    delete: (id) => ipcRenderer.invoke('projects:delete', id)
  },
  commands: {
    list: (projectId) => ipcRenderer.invoke('commands:list', projectId),
    get: (projectId, commandId) => ipcRenderer.invoke('commands:get', projectId, commandId),
    create: (projectId, commandData) =>
      ipcRenderer.invoke('commands:create', projectId, commandData),
    update: (projectId, commandId, updates) =>
      ipcRenderer.invoke('commands:update', projectId, commandId, updates),
    delete: (projectId, commandId) => ipcRenderer.invoke('commands:delete', projectId, commandId)
  },
  process: {
    execute: (request) => ipcRenderer.invoke('process:execute', request),
    executeMultiple: (request) => ipcRenderer.invoke('process:execute-multiple', request),
    stop: (request) => ipcRenderer.invoke('process:stop', request),
    stopMultiple: (request) => ipcRenderer.invoke('process:stop-multiple', request),
    stopAll: (request) => ipcRenderer.invoke('process:stop-all', request),
    getInfo: (commandId) => ipcRenderer.invoke('process:get-info', commandId),
    getAllInfo: (projectId) => ipcRenderer.invoke('process:get-all-info', projectId),
    getOutput: (commandId, limit) => ipcRenderer.invoke('process:get-output', commandId, limit),
    isRunning: (commandId) => ipcRenderer.invoke('process:is-running', commandId)
  },
  on: {
    processOutput: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, data: ProcessOutputEvent) => callback(data)
      ipcRenderer.on('process:output', listener)
      return () => ipcRenderer.removeListener('process:output', listener)
    },
    processStarted: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { commandId: string; pid: number }) => callback(data)
      ipcRenderer.on('process:started', listener)
      return () => ipcRenderer.removeListener('process:started', listener)
    },
    processExit: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { commandId: string; exitCode: number | null; signal: string | null }) => callback(data)
      ipcRenderer.on('process:exit', listener)
      return () => ipcRenderer.removeListener('process:exit', listener)
    },
    processError: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { commandId: string; error: string }) => callback(data)
      ipcRenderer.on('process:error', listener)
      return () => ipcRenderer.removeListener('process:error', listener)
    },
    processPorts: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { commandId: string; ports: number[] }) => callback(data)
      ipcRenderer.on('process:ports', listener)
      return () => ipcRenderer.removeListener('process:ports', listener)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', api)
