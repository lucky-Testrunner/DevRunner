import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCommandsStore = defineStore('commands', () => {
  const commands = ref<Command[]>([])
  const selectedCommandIds = ref<Set<string>>(new Set())
  const loading = ref(false)
  const error = ref<string | null>(null)

  const selectedCommands = computed(() => 
    commands.value.filter(c => selectedCommandIds.value.has(c.id))
  )

  async function loadCommands(projectId: string) {
    if (!projectId) return
    loading.value = true
    error.value = null
    try {
      const result = await window.electronAPI.commands.list(projectId)
      if (result.success && result.data) {
        commands.value = result.data
      } else {
        error.value = result.error || 'Failed to load commands'
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  async function createCommand(projectId: string, commandData: {
    name: string
    description?: string
    type: 'service' | 'oneoff'
    shell: 'cmd' | 'powershell' | 'bash'
    command: string
    workingDirectory?: string
    env?: Record<string, string>
    autoRestart?: boolean
  }) {
    loading.value = true
    error.value = null
    try {
      const result = await window.electronAPI.commands.create(projectId, commandData)
      if (result.success && result.data) {
        commands.value.push(result.data)
        return result.data
      } else {
        error.value = result.error || 'Failed to create command'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  async function updateCommand(projectId: string, commandId: string, updates: Partial<{
    name: string
    description?: string
    type: 'service' | 'oneoff'
    shell: 'cmd' | 'powershell' | 'bash'
    command: string
    workingDirectory?: string
    env?: Record<string, string>
    autoRestart?: boolean
  }>) {
    loading.value = true
    error.value = null
    try {
      const result = await window.electronAPI.commands.update(projectId, commandId, updates)
      if (result.success && result.data) {
        const index = commands.value.findIndex(c => c.id === commandId)
        if (index !== -1) {
          commands.value[index] = result.data
        }
        return result.data
      } else {
        error.value = result.error || 'Failed to update command'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteCommand(projectId: string, commandId: string) {
    loading.value = true
    error.value = null
    try {
      const result = await window.electronAPI.commands.delete(projectId, commandId)
      if (result.success) {
        commands.value = commands.value.filter(c => c.id !== commandId)
        selectedCommandIds.value.delete(commandId)
        return true
      } else {
        error.value = result.error || 'Failed to delete command'
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return false
    } finally {
      loading.value = false
    }
  }

  function toggleCommandSelection(commandId: string) {
    if (selectedCommandIds.value.has(commandId)) {
      selectedCommandIds.value.delete(commandId)
    } else {
      selectedCommandIds.value.add(commandId)
    }
  }

  function selectAllCommands() {
    commands.value.forEach(c => selectedCommandIds.value.add(c.id))
  }

  function clearSelection() {
    selectedCommandIds.value.clear()
  }

  function clearCommands() {
    commands.value = []
    selectedCommandIds.value.clear()
  }

  return {
    commands,
    selectedCommandIds,
    selectedCommands,
    loading,
    error,
    loadCommands,
    createCommand,
    updateCommand,
    deleteCommand,
    toggleCommandSelection,
    selectAllCommands,
    clearSelection,
    clearCommands
  }
})
