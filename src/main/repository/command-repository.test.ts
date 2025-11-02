import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getCommandRepository, resetCommandRepository } from './command-repository'
import { getProjectRepository, resetProjectRepository } from './project-repository'
import { getProjectStore, resetProjectStore } from '../store/store'
import { ValidationError } from '../validation/validators'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-data')
  }
}))

describe('CommandRepository', () => {
  let projectId: string

  beforeEach(() => {
    resetProjectStore()
    resetCommandRepository()
    resetProjectRepository()
    const store = getProjectStore()
    store.clear()

    const projectRepository = getProjectRepository()
    const project = projectRepository.createProject({ name: 'Test Project' })
    projectId = project.id
  })

  afterEach(() => {
    const store = getProjectStore()
    store.clear()
    resetCommandRepository()
    resetProjectRepository()
    resetProjectStore()
  })

  describe('listCommands', () => {
    it('should return empty array initially', () => {
      const repository = getCommandRepository()
      const commands = repository.listCommands(projectId)
      expect(commands).toEqual([])
    })

    it('should return all commands for a project', () => {
      const repository = getCommandRepository()
      repository.createCommand(projectId, {
        name: 'Command 1',
        type: 'oneoff',
        shell: 'bash',
        command: 'echo 1'
      })
      repository.createCommand(projectId, {
        name: 'Command 2',
        type: 'service',
        shell: 'bash',
        command: 'echo 2'
      })

      const commands = repository.listCommands(projectId)
      expect(commands).toHaveLength(2)
      expect(commands[0].name).toBe('Command 1')
      expect(commands[1].name).toBe('Command 2')
    })

    it('should throw error for non-existent project', () => {
      const repository = getCommandRepository()
      expect(() => repository.listCommands('non-existent')).toThrow(ValidationError)
    })
  })

  describe('getCommandById', () => {
    it('should return undefined for non-existent command', () => {
      const repository = getCommandRepository()
      const command = repository.getCommandById(projectId, 'non-existent')
      expect(command).toBeUndefined()
    })

    it('should return command by ID', () => {
      const repository = getCommandRepository()
      const created = repository.createCommand(projectId, {
        name: 'Test Command',
        type: 'oneoff',
        shell: 'bash',
        command: 'echo test'
      })

      const found = repository.getCommandById(projectId, created.id)
      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.name).toBe('Test Command')
    })
  })

  describe('getCommandByName', () => {
    it('should return undefined for non-existent command', () => {
      const repository = getCommandRepository()
      const command = repository.getCommandByName(projectId, 'Non-existent')
      expect(command).toBeUndefined()
    })

    it('should return command by name', () => {
      const repository = getCommandRepository()
      repository.createCommand(projectId, {
        name: 'Test Command',
        type: 'oneoff',
        shell: 'bash',
        command: 'echo test'
      })

      const found = repository.getCommandByName(projectId, 'Test Command')
      expect(found).toBeDefined()
      expect(found?.name).toBe('Test Command')
    })
  })

  describe('createCommand', () => {
    it('should create a command with required fields', () => {
      const repository = getCommandRepository()
      const command = repository.createCommand(projectId, {
        name: 'Build',
        type: 'oneoff',
        shell: 'bash',
        command: 'npm run build'
      })

      expect(command.id).toBeDefined()
      expect(command.name).toBe('Build')
      expect(command.type).toBe('oneoff')
      expect(command.shell).toBe('bash')
      expect(command.command).toBe('npm run build')
      expect(command.createdAt).toBeDefined()
      expect(command.updatedAt).toBeDefined()
    })

    it('should create a command with optional fields', () => {
      const repository = getCommandRepository()
      const command = repository.createCommand(projectId, {
        name: 'Server',
        type: 'service',
        shell: 'bash',
        command: 'npm start',
        description: 'Start development server',
        workingDirectory: '/app',
        env: { NODE_ENV: 'development' },
        autoRestart: true
      })

      expect(command.description).toBe('Start development server')
      expect(command.workingDirectory).toBe('/app')
      expect(command.env).toEqual({ NODE_ENV: 'development' })
      expect(command.autoRestart).toBe(true)
    })

    it('should throw error for duplicate command name in project', () => {
      const repository = getCommandRepository()
      repository.createCommand(projectId, {
        name: 'Duplicate',
        type: 'oneoff',
        shell: 'bash',
        command: 'echo 1'
      })

      expect(() =>
        repository.createCommand(projectId, {
          name: 'Duplicate',
          type: 'oneoff',
          shell: 'bash',
          command: 'echo 2'
        })
      ).toThrow(ValidationError)
      expect(() =>
        repository.createCommand(projectId, {
          name: 'Duplicate',
          type: 'oneoff',
          shell: 'bash',
          command: 'echo 2'
        })
      ).toThrow('Command with name "Duplicate" already exists in project')
    })

    it('should throw error for non-existent project', () => {
      const repository = getCommandRepository()
      expect(() =>
        repository.createCommand('non-existent', {
          name: 'Command',
          type: 'oneoff',
          shell: 'bash',
          command: 'echo test'
        })
      ).toThrow(ValidationError)
    })

    it('should throw error for invalid command data', () => {
      const repository = getCommandRepository()
      expect(() =>
        repository.createCommand(projectId, {
          name: '',
          type: 'oneoff',
          shell: 'bash',
          command: 'echo test'
        })
      ).toThrow(ValidationError)
    })
  })

  describe('updateCommand', () => {
    it('should update command fields', () => {
      const repository = getCommandRepository()
      const command = repository.createCommand(projectId, {
        name: 'Original',
        type: 'oneoff',
        shell: 'bash',
        command: 'echo original'
      })

      const updated = repository.updateCommand(projectId, command.id, {
        name: 'Updated',
        command: 'echo updated',
        description: 'Updated description'
      })

      expect(updated.id).toBe(command.id)
      expect(updated.name).toBe('Updated')
      expect(updated.command).toBe('echo updated')
      expect(updated.description).toBe('Updated description')
      expect(updated.updatedAt).toBeDefined()
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(command.updatedAt).getTime())
    })

    it('should throw error for non-existent project', () => {
      const repository = getCommandRepository()
      expect(() =>
        repository.updateCommand('non-existent', 'command-id', { name: 'Updated' })
      ).toThrow(ValidationError)
    })

    it('should throw error for non-existent command', () => {
      const repository = getCommandRepository()
      expect(() =>
        repository.updateCommand(projectId, 'non-existent', { name: 'Updated' })
      ).toThrow(ValidationError)
    })

    it('should throw error for duplicate name', () => {
      const repository = getCommandRepository()
      const command1 = repository.createCommand(projectId, {
        name: 'Command 1',
        type: 'oneoff',
        shell: 'bash',
        command: 'echo 1'
      })
      repository.createCommand(projectId, {
        name: 'Command 2',
        type: 'oneoff',
        shell: 'bash',
        command: 'echo 2'
      })

      expect(() => repository.updateCommand(projectId, command1.id, { name: 'Command 2' })).toThrow(
        ValidationError
      )
    })

    it('should allow updating to same name', () => {
      const repository = getCommandRepository()
      const command = repository.createCommand(projectId, {
        name: 'Command',
        type: 'oneoff',
        shell: 'bash',
        command: 'echo test'
      })

      expect(() =>
        repository.updateCommand(projectId, command.id, {
          name: 'Command',
          description: 'New desc'
        })
      ).not.toThrow()
    })
  })

  describe('deleteCommand', () => {
    it('should delete an existing command', () => {
      const repository = getCommandRepository()
      const command = repository.createCommand(projectId, {
        name: 'To Delete',
        type: 'oneoff',
        shell: 'bash',
        command: 'echo test'
      })

      const deleted = repository.deleteCommand(projectId, command.id)
      expect(deleted).toBe(true)

      const found = repository.getCommandById(projectId, command.id)
      expect(found).toBeUndefined()
    })

    it('should return false for non-existent project', () => {
      const repository = getCommandRepository()
      const deleted = repository.deleteCommand('non-existent', 'command-id')
      expect(deleted).toBe(false)
    })

    it('should return false for non-existent command', () => {
      const repository = getCommandRepository()
      const deleted = repository.deleteCommand(projectId, 'non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('commandExists', () => {
    it('should return true for existing command', () => {
      const repository = getCommandRepository()
      const command = repository.createCommand(projectId, {
        name: 'Exists',
        type: 'oneoff',
        shell: 'bash',
        command: 'echo test'
      })

      expect(repository.commandExists(projectId, command.id)).toBe(true)
    })

    it('should return false for non-existent command', () => {
      const repository = getCommandRepository()
      expect(repository.commandExists(projectId, 'non-existent')).toBe(false)
    })

    it('should return false for non-existent project', () => {
      const repository = getCommandRepository()
      expect(repository.commandExists('non-existent', 'command-id')).toBe(false)
    })
  })

  describe('data persistence', () => {
    it('should persist data across repository instances', () => {
      const repository1 = getCommandRepository()
      const command = repository1.createCommand(projectId, {
        name: 'Persistent',
        type: 'oneoff',
        shell: 'bash',
        command: 'echo test'
      })

      resetCommandRepository()

      const repository2 = getCommandRepository()
      const found = repository2.getCommandById(projectId, command.id)
      expect(found).toBeDefined()
      expect(found?.name).toBe('Persistent')
    })
  })
})
