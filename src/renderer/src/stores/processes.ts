import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useProcessesStore = defineStore('processes', () => {
  const processInfo = ref<Map<string, ProcessInfo>>(new Map())
  const processOutputs = ref<Map<string, ProcessOutput[]>>(new Map())
  const executingCommands = ref<Set<string>>(new Set())
  const error = ref<string | null>(null)

  // 事件监听清理函数（保留以备将来使用）
  let _unsubscribeOutput: (() => void) | null = null
  let _unsubscribeStarted: (() => void) | null = null
  let _unsubscribeExit: (() => void) | null = null
  let _unsubscribeError: (() => void) | null = null
  let _unsubscribePorts: (() => void) | null = null

  // 初始化事件监听
  function initializeEventListeners() {
    if (window.electronAPI?.on) {
      // 监听进程输出
      _unsubscribeOutput = window.electronAPI.on.processOutput((data) => {
        const outputs = processOutputs.value.get(data.commandId) || []
        outputs.push(data.output)
        
        // 限制最多1000条日志
        if (outputs.length > 1000) {
          outputs.shift()
        }
        
        processOutputs.value.set(data.commandId, outputs)
      })

      // 监听进程启动
      _unsubscribeStarted = window.electronAPI.on.processStarted((data) => {
        refreshProcessInfo(data.commandId)
      })

      // 监听进程退出
      _unsubscribeExit = window.electronAPI.on.processExit((data) => {
        refreshProcessInfo(data.commandId)
      })

      // 监听进程错误
      _unsubscribeError = window.electronAPI.on.processError((data) => {
        refreshProcessInfo(data.commandId)
      })

      // 监听进程端口信息
      if (window.electronAPI.on.processPorts) {
        _unsubscribePorts = window.electronAPI.on.processPorts((data) => {
          refreshProcessInfo(data.commandId)
        })
      }
    }
  }

  // 清理事件监听（保留以备将来使用）
  // function cleanupEventListeners() {
  //   unsubscribeOutput?.()
  //   unsubscribeStarted?.()
  //   unsubscribeExit?.()
  //   unsubscribeError?.()
  //   unsubscribePorts?.()
  // }

  // 自动初始化
  initializeEventListeners()

  async function executeCommand(projectId: string, commandId: string) {
    executingCommands.value.add(commandId)
    error.value = null
    // 清空旧的日志
    processOutputs.value.delete(commandId)
    try {
      const result = await window.electronAPI.process.execute({ projectId, commandId })
      if (result.success && result.data) {
        if (result.data.success && result.data.pid) {
          await refreshProcessInfo(commandId)
        }
        return result.data
      } else {
        error.value = result.error || 'Failed to execute command'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      executingCommands.value.delete(commandId)
    }
  }

  async function executeMultiple(projectId: string, commandIds: string[]) {
    commandIds.forEach(id => executingCommands.value.add(id))
    error.value = null
    try {
      const result = await window.electronAPI.process.executeMultiple({ projectId, commandIds })
      if (result.success && result.data) {
        for (const response of result.data) {
          if (response.success) {
            await refreshProcessInfo(response.commandId)
          }
        }
        return result.data
      } else {
        error.value = result.error || 'Failed to execute commands'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    } finally {
      commandIds.forEach(id => executingCommands.value.delete(id))
    }
  }

  async function stopCommand(commandId: string) {
    error.value = null
    try {
      const result = await window.electronAPI.process.stop({ commandId })
      if (result.success && result.data) {
        // 停止后清空日志
        processOutputs.value.delete(commandId)
        await refreshProcessInfo(commandId)
        return result.data
      } else {
        error.value = result.error || 'Failed to stop command'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    }
  }

  async function stopMultiple(commandIds: string[]) {
    error.value = null
    try {
      const result = await window.electronAPI.process.stopMultiple({ commandIds })
      if (result.success && result.data) {
        for (const response of result.data) {
          if (response.success) {
            // 停止后清空日志
            processOutputs.value.delete(response.commandId)
            await refreshProcessInfo(response.commandId)
          }
        }
        return result.data
      } else {
        error.value = result.error || 'Failed to stop commands'
        return null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      return null
    }
  }

  async function refreshProcessInfo(commandId: string) {
    try {
      const result = await window.electronAPI.process.getInfo(commandId)
      if (result.success && result.data) {
        processInfo.value.set(commandId, result.data)
      } else if (result.success && !result.data) {
        processInfo.value.delete(commandId)
      }
    } catch (err) {
      console.error('Failed to refresh process info:', err)
    }
  }

  async function refreshAllProcessInfo(projectId?: string) {
    try {
      const result = await window.electronAPI.process.getAllInfo(projectId)
      if (result.success && result.data) {
        processInfo.value.clear()
        result.data.forEach(info => {
          processInfo.value.set(info.commandId, info)
        })
      }
    } catch (err) {
      console.error('Failed to refresh all process info:', err)
    }
  }

  async function loadProcessOutput(commandId: string, limit?: number) {
    try {
      const result = await window.electronAPI.process.getOutput(commandId, limit)
      if (result.success && result.data) {
        processOutputs.value.set(commandId, result.data)
      }
    } catch (err) {
      console.error('Failed to load process output:', err)
    }
  }

  async function isCommandRunning(commandId: string): Promise<boolean> {
    try {
      const result = await window.electronAPI.process.isRunning(commandId)
      if (result.success && result.data !== undefined) {
        return result.data
      }
      return false
    } catch (err) {
      console.error('Failed to check if command is running:', err)
      return false
    }
  }

  function getProcessInfoForCommand(commandId: string): ProcessInfo | null {
    return processInfo.value.get(commandId) || null
  }

  function getProcessOutputForCommand(commandId: string): ProcessOutput[] {
    return processOutputs.value.get(commandId) || []
  }

  function isExecuting(commandId: string): boolean {
    return executingCommands.value.has(commandId)
  }

  return {
    processInfo,
    processOutputs,
    executingCommands,
    error,
    executeCommand,
    executeMultiple,
    stopCommand,
    stopMultiple,
    refreshProcessInfo,
    refreshAllProcessInfo,
    loadProcessOutput,
    isCommandRunning,
    getProcessInfoForCommand,
    getProcessOutputForCommand,
    isExecuting
  }
})
