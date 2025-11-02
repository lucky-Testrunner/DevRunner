/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
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

interface Project {
  id: string
  name: string
  description?: string
  path?: string
  commands: Command[]
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

interface ProcessOutput {
  type: 'stdout' | 'stderr'
  data: string
  timestamp: string
}

interface ElectronAPI {
  ping: () => Promise<string>
  dialog: {
    openDirectory: () => Promise<{ canceled: boolean; filePaths?: string[] }>
  }
  on: {
    processOutput: (callback: (data: { commandId: string; output: ProcessOutput }) => void) => () => void
    processStarted: (callback: (data: { commandId: string; pid: number }) => void) => () => void
    processExit: (callback: (data: { commandId: string; exitCode: number | null; signal: string | null }) => void) => () => void
    processError: (callback: (data: { commandId: string; error: string }) => void) => () => void
    processPorts?: (callback: (data: { commandId: string; ports: number[] }) => void) => () => void
  }
  projects: {
    list: () => Promise<{ success: boolean; data?: Project[]; error?: string }>
    get: (id: string) => Promise<{ success: boolean; data?: Project | null; error?: string }>
    create: (projectData: {
      name: string
      description?: string
      path?: string
    }) => Promise<{ success: boolean; data?: Project; error?: string }>
    update: (
      id: string,
      updates: Partial<{ name: string; description?: string; path?: string }>
    ) => Promise<{ success: boolean; data?: Project; error?: string }>
    delete: (id: string) => Promise<{ success: boolean; error?: string }>
  }
  commands: {
    list: (projectId: string) => Promise<{ success: boolean; data?: Command[]; error?: string }>
    get: (
      projectId: string,
      commandId: string
    ) => Promise<{ success: boolean; data?: Command | null; error?: string }>
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
    ) => Promise<{ success: boolean; data?: Command; error?: string }>
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
    ) => Promise<{ success: boolean; data?: Command; error?: string }>
    delete: (
      projectId: string,
      commandId: string
    ) => Promise<{ success: boolean; error?: string }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
