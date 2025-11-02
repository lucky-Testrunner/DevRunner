import { Project } from '../types/project.js'
import { getProjectStore } from '../store/store.js'
import { ValidationError, validateId, validateProjectData } from '../validation/validators.js'
import { v4 as uuidv4 } from 'uuid'

export class ProjectRepository {
  private getStore() {
    return getProjectStore()
  }

  listProjects(): Project[] {
    const data = this.getStore().getData()
    return data.projects
  }

  getProjectById(id: string): Project | undefined {
    const projects = this.listProjects()
    return projects.find((p) => p.id === id)
  }

  getProjectByName(name: string): Project | undefined {
    const projects = this.listProjects()
    return projects.find((p) => p.name === name)
  }

  createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'commands'>): Project {
    validateProjectData(projectData)

    const existingProject = this.getProjectByName(projectData.name)
    if (existingProject) {
      throw new ValidationError(`Project with name "${projectData.name}" already exists`)
    }

    const now = new Date().toISOString()
    const project: Project = {
      id: uuidv4(),
      ...projectData,
      commands: [],
      createdAt: now,
      updatedAt: now
    }

    const data = this.getStore().getData()
    data.projects.push(project)
    this.getStore().setData(data)

    return project
  }

  updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'commands'>>): Project {
    validateId(id)
    validateProjectData(updates)

    const data = this.getStore().getData()
    const projectIndex = data.projects.findIndex((p) => p.id === id)

    if (projectIndex === -1) {
      throw new ValidationError(`Project with ID "${id}" not found`)
    }

    if (updates.name) {
      const existingProject = this.getProjectByName(updates.name)
      if (existingProject && existingProject.id !== id) {
        throw new ValidationError(`Project with name "${updates.name}" already exists`)
      }
    }

    const updatedProject: Project = {
      ...data.projects[projectIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    }

    data.projects[projectIndex] = updatedProject
    this.getStore().setData(data)

    return updatedProject
  }

  deleteProject(id: string): boolean {
    validateId(id)

    const data = this.getStore().getData()
    const projectIndex = data.projects.findIndex((p) => p.id === id)

    if (projectIndex === -1) {
      return false
    }

    data.projects.splice(projectIndex, 1)
    this.getStore().setData(data)

    return true
  }

  projectExists(id: string): boolean {
    return this.getProjectById(id) !== undefined
  }
}

let repositoryInstance: ProjectRepository | null = null

export function getProjectRepository(): ProjectRepository {
  if (!repositoryInstance) {
    repositoryInstance = new ProjectRepository()
  }
  return repositoryInstance
}

export function resetProjectRepository(): void {
  repositoryInstance = null
}
