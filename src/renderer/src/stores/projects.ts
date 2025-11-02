import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const selectedProjectId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const selectedProject = computed(() => 
    projects.value.find(p => p.id === selectedProjectId.value) || null
  )

  async function loadProjects() {
    loading.value = true
    error.value = null
    try {
      const result = await window.electronAPI.projects.list()
      if (result.success && result.data) {
        projects.value = result.data
      } else {
        error.value = result.error || 'Failed to load projects'
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  async function createProject(projectData: { name: string; description?: string; path?: string }) {
    loading.value = true
    error.value = null
    try {
      const result = await window.electronAPI.projects.create(projectData)
      if (result.success && result.data) {
        projects.value.push(result.data)
        selectedProjectId.value = result.data.id
        return result.data
      } else {
        error.value = result.error || 'Failed to create project'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateProject(id: string, updates: Partial<{ name: string; description?: string; path?: string }>) {
    loading.value = true
    error.value = null
    try {
      const result = await window.electronAPI.projects.update(id, updates)
      if (result.success && result.data) {
        const index = projects.value.findIndex(p => p.id === id)
        if (index !== -1) {
          projects.value[index] = result.data
        }
        return result.data
      } else {
        error.value = result.error || 'Failed to update project'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteProject(id: string) {
    loading.value = true
    error.value = null
    try {
      const result = await window.electronAPI.projects.delete(id)
      if (result.success) {
        projects.value = projects.value.filter(p => p.id !== id)
        if (selectedProjectId.value === id) {
          selectedProjectId.value = projects.value[0]?.id || null
        }
        return true
      } else {
        error.value = result.error || 'Failed to delete project'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      loading.value = false
    }
  }

  function selectProject(id: string) {
    selectedProjectId.value = id
  }

  return {
    projects,
    selectedProjectId,
    selectedProject,
    loading,
    error,
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject
  }
})
