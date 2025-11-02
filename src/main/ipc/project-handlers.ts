import { ipcMain } from 'electron'
import { getProjectRepository } from '../repository/project-repository.js'
import { ValidationError } from '../validation/validators.js'
import { Project } from '../types/project.js'

interface IpcResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

function createSuccessResult<T>(data: T): IpcResult<T> {
  return { success: true, data }
}

function createErrorResult(error: string): IpcResult<never> {
  return { success: false, error }
}

export function registerProjectHandlers(): void {
  ipcMain.handle('projects:list', async (): Promise<IpcResult<Project[]>> => {
    try {
      const repository = getProjectRepository()
      const projects = repository.listProjects()
      return createSuccessResult(projects)
    } catch (error) {
      console.error('Error listing projects:', error)
      return createErrorResult(error instanceof Error ? error.message : '未知错误')
    }
  })

  ipcMain.handle(
    'projects:get',
    async (_event, id: string): Promise<IpcResult<Project | null>> => {
      try {
        const repository = getProjectRepository()
        const project = repository.getProjectById(id)
        return createSuccessResult(project || null)
      } catch (error) {
        console.error('Error getting project:', error)
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'projects:create',
    async (
      _event,
      projectData: { name: string; description?: string; path?: string }
    ): Promise<IpcResult<Project>> => {
      try {
        const repository = getProjectRepository()
        const project = repository.createProject(projectData)
        return createSuccessResult(project)
      } catch (error) {
        console.error('Error creating project:', error)
        if (error instanceof ValidationError) {
          return createErrorResult(`验证错误：${error.message}`)
        }
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle(
    'projects:update',
    async (
      _event,
      id: string,
      updates: Partial<{ name: string; description?: string; path?: string }>
    ): Promise<IpcResult<Project>> => {
      try {
        const repository = getProjectRepository()
        const project = repository.updateProject(id, updates)
        return createSuccessResult(project)
      } catch (error) {
        console.error('Error updating project:', error)
        if (error instanceof ValidationError) {
          return createErrorResult(`验证错误：${error.message}`)
        }
        return createErrorResult(error instanceof Error ? error.message : '未知错误')
      }
    }
  )

  ipcMain.handle('projects:delete', async (_event, id: string): Promise<IpcResult<boolean>> => {
    try {
      const repository = getProjectRepository()
      const deleted = repository.deleteProject(id)
      return createSuccessResult(deleted)
    } catch (error) {
      console.error('Error deleting project:', error)
      if (error instanceof ValidationError) {
        return createErrorResult(`验证错误：${error.message}`)
      }
      return createErrorResult(error instanceof Error ? error.message : '未知错误')
    }
  })
}
