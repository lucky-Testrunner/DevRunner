import { Command, CommandType, Project, ShellType } from '../types/project'

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

const SHELL_TYPES: ShellType[] = ['cmd', 'powershell', 'bash']
const COMMAND_TYPES: CommandType[] = ['service', 'oneoff']

export function validateShellType(shell: unknown): shell is ShellType {
  return typeof shell === 'string' && SHELL_TYPES.includes(shell as ShellType)
}

export function validateCommandType(type: unknown): type is CommandType {
  return typeof type === 'string' && COMMAND_TYPES.includes(type as CommandType)
}

export function validateProjectName(name: unknown): string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('项目名称不能为空')
  }
  if (name.length > 255) {
    throw new ValidationError('项目名称长度不能超过255个字符')
  }
  return name.trim()
}

export function validateCommandName(name: unknown): string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('命令名称不能为空')
  }
  if (name.length > 255) {
    throw new ValidationError('命令名称长度不能超过255个字符')
  }
  return name.trim()
}

export function validateCommand(command: unknown): string {
  if (typeof command !== 'string' || command.trim().length === 0) {
    throw new ValidationError('命令内容不能为空')
  }
  return command.trim()
}

export function validateId(id: unknown): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new ValidationError('ID不能为空')
  }
  return id.trim()
}

export function validateProjectData(data: Partial<Project>): void {
  if (data.name !== undefined) {
    validateProjectName(data.name)
  }
  if (data.description !== undefined && typeof data.description !== 'string') {
    throw new ValidationError('项目描述必须是字符串')
  }
  if (data.path !== undefined && typeof data.path !== 'string') {
    throw new ValidationError('项目路径必须是字符串')
  }
  if (data.commands !== undefined) {
    if (!Array.isArray(data.commands)) {
      throw new ValidationError('命令必须是数组')
    }
    data.commands.forEach((cmd, index) => {
      try {
        validateCommandData(cmd)
      } catch (error) {
        if (error instanceof ValidationError) {
          throw new ValidationError(`命令索引 ${index}：${error.message}`)
        }
        throw error
      }
    })
  }
}

export function validateCommandData(data: Partial<Command>): void {
  if (data.name !== undefined) {
    validateCommandName(data.name)
  }
  if (data.command !== undefined) {
    validateCommand(data.command)
  }
  if (data.description !== undefined && typeof data.description !== 'string') {
    throw new ValidationError('命令描述必须是字符串')
  }
  if (data.type !== undefined && !validateCommandType(data.type)) {
    throw new ValidationError(`命令类型必须是以下之一：${COMMAND_TYPES.join('、')}`)
  }
  if (data.shell !== undefined && !validateShellType(data.shell)) {
    throw new ValidationError(`Shell类型必须是以下之一：${SHELL_TYPES.join('、')}`)
  }
  if (data.workingDirectory !== undefined && typeof data.workingDirectory !== 'string') {
    throw new ValidationError('工作目录必须是字符串')
  }
  if (data.env !== undefined) {
    if (typeof data.env !== 'object' || data.env === null || Array.isArray(data.env)) {
      throw new ValidationError('环境变量必须是对象')
    }
    Object.entries(data.env).forEach(([key, value]) => {
      if (typeof value !== 'string') {
        throw new ValidationError(`环境变量"${key}"必须是字符串`)
      }
    })
  }
  if (data.autoRestart !== undefined && typeof data.autoRestart !== 'boolean') {
    throw new ValidationError('自动重启必须是布尔值')
  }
}
