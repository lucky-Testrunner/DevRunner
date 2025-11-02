import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getProjectRepository, resetProjectRepository } from './project-repository'
import { getProjectStore, resetProjectStore } from '../store/store'
import { ValidationError } from '../validation/validators'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp/test-data')
  }
}))

describe('ProjectRepository', () => {
  beforeEach(() => {
    resetProjectStore()
    resetProjectRepository()
    const store = getProjectStore()
    store.clear()
  })

  afterEach(() => {
    const store = getProjectStore()
    store.clear()
    resetProjectRepository()
    resetProjectStore()
  })

  describe('listProjects', () => {
    it('should return empty array initially', () => {
      const repository = getProjectRepository()
      const projects = repository.listProjects()
      expect(projects).toEqual([])
    })

    it('should return all projects', () => {
      const repository = getProjectRepository()
      repository.createProject({ name: 'Project 1' })
      repository.createProject({ name: 'Project 2' })

      const projects = repository.listProjects()
      expect(projects).toHaveLength(2)
      expect(projects[0].name).toBe('Project 1')
      expect(projects[1].name).toBe('Project 2')
    })
  })

  describe('getProjectById', () => {
    it('should return undefined for non-existent project', () => {
      const repository = getProjectRepository()
      const project = repository.getProjectById('non-existent')
      expect(project).toBeUndefined()
    })

    it('should return project by ID', () => {
      const repository = getProjectRepository()
      const created = repository.createProject({ name: 'Test Project' })
      const found = repository.getProjectById(created.id)
      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
      expect(found?.name).toBe('Test Project')
    })
  })

  describe('getProjectByName', () => {
    it('should return undefined for non-existent project', () => {
      const repository = getProjectRepository()
      const project = repository.getProjectByName('Non-existent')
      expect(project).toBeUndefined()
    })

    it('should return project by name', () => {
      const repository = getProjectRepository()
      repository.createProject({ name: 'Test Project' })
      const found = repository.getProjectByName('Test Project')
      expect(found).toBeDefined()
      expect(found?.name).toBe('Test Project')
    })
  })

  describe('createProject', () => {
    it('should create a project with required fields', () => {
      const repository = getProjectRepository()
      const project = repository.createProject({ name: 'New Project' })

      expect(project.id).toBeDefined()
      expect(project.name).toBe('New Project')
      expect(project.commands).toEqual([])
      expect(project.createdAt).toBeDefined()
      expect(project.updatedAt).toBeDefined()
    })

    it('should create a project with optional fields', () => {
      const repository = getProjectRepository()
      const project = repository.createProject({
        name: 'New Project',
        description: 'Test description',
        path: '/test/path'
      })

      expect(project.name).toBe('New Project')
      expect(project.description).toBe('Test description')
      expect(project.path).toBe('/test/path')
    })

    it('should throw error for duplicate project name', () => {
      const repository = getProjectRepository()
      repository.createProject({ name: 'Duplicate' })

      expect(() => repository.createProject({ name: 'Duplicate' })).toThrow(ValidationError)
      expect(() => repository.createProject({ name: 'Duplicate' })).toThrow(
        'Project with name "Duplicate" already exists'
      )
    })

    it('should throw error for invalid project data', () => {
      const repository = getProjectRepository()
      expect(() => repository.createProject({ name: '' })).toThrow(ValidationError)
    })
  })

  describe('updateProject', () => {
    it('should update project fields', () => {
      const repository = getProjectRepository()
      const project = repository.createProject({ name: 'Original Name' })

      const updated = repository.updateProject(project.id, {
        name: 'Updated Name',
        description: 'New description'
      })

      expect(updated.id).toBe(project.id)
      expect(updated.name).toBe('Updated Name')
      expect(updated.description).toBe('New description')
      expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(project.updatedAt).getTime())
    })

    it('should throw error for non-existent project', () => {
      const repository = getProjectRepository()
      expect(() => repository.updateProject('non-existent', { name: 'Updated' })).toThrow(
        ValidationError
      )
      expect(() => repository.updateProject('non-existent', { name: 'Updated' })).toThrow(
        'Project with ID "non-existent" not found'
      )
    })

    it('should throw error for duplicate name', () => {
      const repository = getProjectRepository()
      const project1 = repository.createProject({ name: 'Project 1' })
      repository.createProject({ name: 'Project 2' })

      expect(() => repository.updateProject(project1.id, { name: 'Project 2' })).toThrow(
        ValidationError
      )
    })

    it('should allow updating to same name', () => {
      const repository = getProjectRepository()
      const project = repository.createProject({ name: 'Project' })

      expect(() =>
        repository.updateProject(project.id, { name: 'Project', description: 'New desc' })
      ).not.toThrow()
    })
  })

  describe('deleteProject', () => {
    it('should delete an existing project', () => {
      const repository = getProjectRepository()
      const project = repository.createProject({ name: 'To Delete' })

      const deleted = repository.deleteProject(project.id)
      expect(deleted).toBe(true)

      const found = repository.getProjectById(project.id)
      expect(found).toBeUndefined()
    })

    it('should return false for non-existent project', () => {
      const repository = getProjectRepository()
      const deleted = repository.deleteProject('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('projectExists', () => {
    it('should return true for existing project', () => {
      const repository = getProjectRepository()
      const project = repository.createProject({ name: 'Exists' })
      expect(repository.projectExists(project.id)).toBe(true)
    })

    it('should return false for non-existent project', () => {
      const repository = getProjectRepository()
      expect(repository.projectExists('non-existent')).toBe(false)
    })
  })

  describe('data persistence', () => {
    it('should persist data across repository instances', () => {
      const repository1 = getProjectRepository()
      const project = repository1.createProject({ name: 'Persistent Project' })

      resetProjectRepository()

      const repository2 = getProjectRepository()
      const found = repository2.getProjectById(project.id)
      expect(found).toBeDefined()
      expect(found?.name).toBe('Persistent Project')
    })
  })
})
