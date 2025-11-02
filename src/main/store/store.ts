import Store from 'electron-store'
import { ProjectsData } from '../types/project.js'
import { app } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

const schema = {
  version: {
    type: 'number',
    default: 1
  },
  projects: {
    type: 'array',
    default: []
  }
} as const

export class ProjectStore {
  private store: Store<ProjectsData>
  private backupPath: string
  private isTest: boolean

  constructor() {
    this.isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
    
    const storeOptions: Record<string, unknown> = {
      name: 'projects',
      schema: schema,
      defaults: {
        version: 1,
        projects: []
      },
      clearInvalidConfig: true
    }

    if (this.isTest) {
      storeOptions.projectName = 'test-app'
      storeOptions.projectVersion = '1.0.0'
      storeOptions.cwd = `/tmp/electron-store-test-${Date.now()}-${Math.random()}`
    }

    this.store = new Store<ProjectsData>(storeOptions as never)

    // 确保 store 已初始化默认值
    if (!this.store.has('version')) {
      this.store.set('version', 1)
    }
    if (!this.store.has('projects')) {
      this.store.set('projects', [])
    }

    this.backupPath = join(app.getPath('userData'), 'projects-backup.json')
    
    if (!this.isTest) {
      this.ensureDataIntegrity()
    }
  }

  private ensureDataIntegrity(): void {
    try {
      const projects = this.store.get('projects')
      
      if (!Array.isArray(projects)) {
        console.error('Projects data is corrupt, attempting to restore from backup')
        this.restoreFromBackup()
        return
      }

      this.createBackup()
    } catch (error) {
      console.error('Error ensuring data integrity:', error)
      this.restoreFromBackup()
    }
  }

  private createBackup(): void {
    if (this.isTest) {
      return
    }
    
    try {
      const data = this.getData()
      fs.writeFileSync(this.backupPath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      console.error('Failed to create backup:', error)
    }
  }

  private restoreFromBackup(): void {
    try {
      if (fs.existsSync(this.backupPath)) {
        const backupData = JSON.parse(fs.readFileSync(this.backupPath, 'utf-8'))
        if (backupData && Array.isArray(backupData.projects)) {
          this.store.set(backupData)
          console.log('Successfully restored from backup')
          return
        }
      }
    } catch (error) {
      console.error('Failed to restore from backup:', error)
    }
    
    this.store.set({
      version: 1,
      projects: []
    })
    console.log('Reset to default empty state')
  }

  getData(): ProjectsData {
    return {
      version: this.store.get('version', 1),
      projects: this.store.get('projects', [])
    }
  }

  setData(data: ProjectsData): void {
    this.store.set(data)
    this.createBackup()
  }

  clear(): void {
    this.store.clear()
    this.createBackup()
  }

  get path(): string {
    return this.store.path
  }
}

let storeInstance: ProjectStore | null = null

export function getProjectStore(): ProjectStore {
  if (!storeInstance) {
    storeInstance = new ProjectStore()
  }
  return storeInstance
}

export function resetProjectStore(): void {
  storeInstance = null
}
