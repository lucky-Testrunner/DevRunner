export type ShellType = 'cmd' | 'powershell' | 'bash'
export type CommandType = 'service' | 'oneoff'

export interface Command {
  id: string
  name: string
  description?: string
  type: CommandType
  shell: ShellType
  command: string
  workingDirectory?: string
  env?: Record<string, string>
  autoRestart?: boolean
  createdAt: string
  updatedAt: string
}

export interface CommandRuntimeStatus {
  commandId: string
  status: 'idle' | 'running' | 'stopped' | 'error'
  pid?: number
  ports?: number[]
  startedAt?: string
  stoppedAt?: string
  exitCode?: number
  error?: string
  restartCount?: number
}

export interface Project {
  id: string
  name: string
  description?: string
  path?: string
  commands: Command[]
  runtimeStatus?: CommandRuntimeStatus[]
  createdAt: string
  updatedAt: string
}

export interface ProjectsData {
  version: number
  projects: Project[]
}
