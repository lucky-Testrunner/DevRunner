import { describe, it, expect } from 'vitest'
import {
  ValidationError,
  validateShellType,
  validateCommandType,
  validateProjectName,
  validateCommandName,
  validateCommand,
  validateId,
  validateProjectData,
  validateCommandData
} from './validators'

describe('validators', () => {
  describe('validateShellType', () => {
    it('should validate correct shell types', () => {
      expect(validateShellType('cmd')).toBe(true)
      expect(validateShellType('powershell')).toBe(true)
      expect(validateShellType('bash')).toBe(true)
    })

    it('should reject invalid shell types', () => {
      expect(validateShellType('invalid')).toBe(false)
      expect(validateShellType('')).toBe(false)
      expect(validateShellType(123)).toBe(false)
      expect(validateShellType(null)).toBe(false)
    })
  })

  describe('validateCommandType', () => {
    it('should validate correct command types', () => {
      expect(validateCommandType('service')).toBe(true)
      expect(validateCommandType('oneoff')).toBe(true)
    })

    it('should reject invalid command types', () => {
      expect(validateCommandType('invalid')).toBe(false)
      expect(validateCommandType('')).toBe(false)
      expect(validateCommandType(123)).toBe(false)
    })
  })

  describe('validateProjectName', () => {
    it('should validate correct project names', () => {
      expect(validateProjectName('My Project')).toBe('My Project')
      expect(validateProjectName('  Project  ')).toBe('Project')
    })

    it('should reject invalid project names', () => {
      expect(() => validateProjectName('')).toThrow(ValidationError)
      expect(() => validateProjectName('   ')).toThrow(ValidationError)
      expect(() => validateProjectName(123)).toThrow(ValidationError)
      expect(() => validateProjectName('a'.repeat(256))).toThrow(ValidationError)
    })
  })

  describe('validateCommandName', () => {
    it('should validate correct command names', () => {
      expect(validateCommandName('Build')).toBe('Build')
      expect(validateCommandName('  Test  ')).toBe('Test')
    })

    it('should reject invalid command names', () => {
      expect(() => validateCommandName('')).toThrow(ValidationError)
      expect(() => validateCommandName('   ')).toThrow(ValidationError)
      expect(() => validateCommandName(123)).toThrow(ValidationError)
      expect(() => validateCommandName('a'.repeat(256))).toThrow(ValidationError)
    })
  })

  describe('validateCommand', () => {
    it('should validate correct commands', () => {
      expect(validateCommand('npm run build')).toBe('npm run build')
      expect(validateCommand('  npm test  ')).toBe('npm test')
    })

    it('should reject invalid commands', () => {
      expect(() => validateCommand('')).toThrow(ValidationError)
      expect(() => validateCommand('   ')).toThrow(ValidationError)
      expect(() => validateCommand(123)).toThrow(ValidationError)
    })
  })

  describe('validateId', () => {
    it('should validate correct IDs', () => {
      expect(validateId('abc123')).toBe('abc123')
      expect(validateId('  id  ')).toBe('id')
    })

    it('should reject invalid IDs', () => {
      expect(() => validateId('')).toThrow(ValidationError)
      expect(() => validateId('   ')).toThrow(ValidationError)
      expect(() => validateId(123)).toThrow(ValidationError)
    })
  })

  describe('validateProjectData', () => {
    it('should validate correct project data', () => {
      expect(() =>
        validateProjectData({
          name: 'Test Project',
          description: 'A test project',
          path: '/path/to/project',
          commands: []
        })
      ).not.toThrow()
    })

    it('should reject invalid project data', () => {
      expect(() => validateProjectData({ name: '' })).toThrow(ValidationError)
      expect(() => validateProjectData({ name: 'Valid', description: 123 as any })).toThrow(
        ValidationError
      )
      expect(() => validateProjectData({ name: 'Valid', path: 123 as any })).toThrow(
        ValidationError
      )
      expect(() => validateProjectData({ name: 'Valid', commands: 'invalid' as any })).toThrow(
        ValidationError
      )
    })
  })

  describe('validateCommandData', () => {
    it('should validate correct command data', () => {
      expect(() =>
        validateCommandData({
          name: 'Build',
          command: 'npm run build',
          type: 'oneoff',
          shell: 'bash',
          workingDirectory: '/path',
          env: { NODE_ENV: 'production' },
          autoRestart: true
        })
      ).not.toThrow()
    })

    it('should reject invalid command data', () => {
      expect(() => validateCommandData({ name: '' })).toThrow(ValidationError)
      expect(() => validateCommandData({ command: '' })).toThrow(ValidationError)
      expect(() => validateCommandData({ type: 'invalid' as any })).toThrow(ValidationError)
      expect(() => validateCommandData({ shell: 'invalid' as any })).toThrow(ValidationError)
      expect(() => validateCommandData({ workingDirectory: 123 as any })).toThrow(ValidationError)
      expect(() => validateCommandData({ env: 'invalid' as any })).toThrow(ValidationError)
      expect(() => validateCommandData({ env: { KEY: 123 } as any })).toThrow(ValidationError)
      expect(() => validateCommandData({ autoRestart: 'invalid' as any })).toThrow(
        ValidationError
      )
    })
  })
})
