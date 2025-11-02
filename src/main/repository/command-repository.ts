import { Command, CommandType, ShellType } from '../types/project.js'
import { getProjectStore } from '../store/store.js'
import { ValidationError, validateCommandData, validateId } from '../validation/validators.js'
import { v4 as uuidv4 } from 'uuid'

export class CommandRepository {
  private getStore() {
    return getProjectStore()
  }

  listCommands(projectId: string): Command[] {
    validateId(projectId)
    
    const data = this.getStore().getData()
    const project = data.projects.find((p) => p.id === projectId)
    
    if (!project) {
      throw new ValidationError(`Project with ID "${projectId}" not found`)
    }
    
    return project.commands
  }

  getCommandById(projectId: string, commandId: string): Command | undefined {
    const commands = this.listCommands(projectId)
    return commands.find((c) => c.id === commandId)
  }

  getCommandByName(projectId: string, name: string): Command | undefined {
    const commands = this.listCommands(projectId)
    return commands.find((c) => c.name === name)
  }

  createCommand(
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
  ): Command {
    validateId(projectId)
    validateCommandData(commandData)

    const data = this.getStore().getData()
    const projectIndex = data.projects.findIndex((p) => p.id === projectId)

    if (projectIndex === -1) {
      throw new ValidationError(`Project with ID "${projectId}" not found`)
    }

    const existingCommand = this.getCommandByName(projectId, commandData.name)
    if (existingCommand) {
      throw new ValidationError(
        `Command with name "${commandData.name}" already exists in project`
      )
    }

    const now = new Date().toISOString()
    const command: Command = {
      id: uuidv4(),
      ...commandData,
      createdAt: now,
      updatedAt: now
    }

    data.projects[projectIndex].commands.push(command)
    data.projects[projectIndex].updatedAt = now
    this.getStore().setData(data)

    return command
  }

  updateCommand(
    projectId: string,
    commandId: string,
    updates: Partial<Omit<Command, 'id' | 'createdAt'>>
  ): Command {
    validateId(projectId)
    validateId(commandId)
    validateCommandData(updates)

    const data = this.getStore().getData()
    const projectIndex = data.projects.findIndex((p) => p.id === projectId)

    if (projectIndex === -1) {
      throw new ValidationError(`Project with ID "${projectId}" not found`)
    }

    const commandIndex = data.projects[projectIndex].commands.findIndex((c) => c.id === commandId)

    if (commandIndex === -1) {
      throw new ValidationError(`Command with ID "${commandId}" not found in project`)
    }

    if (updates.name) {
      const existingCommand = this.getCommandByName(projectId, updates.name)
      if (existingCommand && existingCommand.id !== commandId) {
        throw new ValidationError(
          `Command with name "${updates.name}" already exists in project`
        )
      }
    }

    const now = new Date().toISOString()
    const updatedCommand: Command = {
      ...data.projects[projectIndex].commands[commandIndex],
      ...updates,
      updatedAt: now
    }

    data.projects[projectIndex].commands[commandIndex] = updatedCommand
    data.projects[projectIndex].updatedAt = now
    this.getStore().setData(data)

    return updatedCommand
  }

  deleteCommand(projectId: string, commandId: string): boolean {
    validateId(projectId)
    validateId(commandId)

    const data = this.getStore().getData()
    const projectIndex = data.projects.findIndex((p) => p.id === projectId)

    if (projectIndex === -1) {
      return false
    }

    const commandIndex = data.projects[projectIndex].commands.findIndex((c) => c.id === commandId)

    if (commandIndex === -1) {
      return false
    }

    data.projects[projectIndex].commands.splice(commandIndex, 1)
    data.projects[projectIndex].updatedAt = new Date().toISOString()
    this.getStore().setData(data)

    return true
  }

  commandExists(projectId: string, commandId: string): boolean {
    try {
      return this.getCommandById(projectId, commandId) !== undefined
    } catch {
      return false
    }
  }
}

let repositoryInstance: CommandRepository | null = null

export function getCommandRepository(): CommandRepository {
  if (!repositoryInstance) {
    repositoryInstance = new CommandRepository()
  }
  return repositoryInstance
}

export function resetCommandRepository(): void {
  repositoryInstance = null
}
