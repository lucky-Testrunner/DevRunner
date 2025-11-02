<template>
  <div class="app">
    <Sidebar
      :projects="projectsStore.projects"
      :selectedProjectId="projectsStore.selectedProjectId"
      :loading="projectsStore.loading"
      :processInfo="processesStore.processInfo"
      @openProjectDialog="openProjectDialog()"
      @selectProject="handleSelectProject"
      @editProject="openProjectDialog"
      @deleteProject="handleDeleteProject"
    />
    
    <main class="main-content">
      <div v-if="!projectsStore.selectedProjectId" class="no-project-selected">
        <h2>欢迎使用项目管理器</h2>
        <p>从侧边栏选择项目或创建一个新项目以开始</p>
        <button @click="openProjectDialog()" class="btn btn-primary btn-large">
          创建您的第一个项目
        </button>
      </div>
      
      <template v-else>
        <ExecutionControls
          :selectedCount="commandsStore.selectedCommandIds.size"
          :runningCount="runningCommandsCount"
          :totalCount="commandsStore.commands.length"
          :executing="isExecuting"
          :hasRunningSelected="hasRunningSelectedCommands"
          @clearSelection="commandsStore.clearSelection()"
          @runSelected="handleRunSelected"
          @stopSelected="handleStopSelected"
          @stopAll="handleStopAll"
        />
        
        <CommandList
          :commands="commandsStore.commands"
          :selectedCommandIds="commandsStore.selectedCommandIds"
          :loading="commandsStore.loading"
          :processInfo="processesStore.processInfo"
          :processOutputs="processesStore.processOutputs"
          :executingCommands="processesStore.executingCommands"
          :showLogs="true"
          @openCommandDialog="openCommandDialog()"
          @selectAll="commandsStore.selectAllCommands()"
          @toggleSelection="commandsStore.toggleCommandSelection"
          @editCommand="openCommandDialog"
          @deleteCommand="handleDeleteCommand"
          @executeCommand="handleExecuteCommand"
          @stopCommand="handleStopCommand"
          @toggleLogs="handleToggleLogs"
        />
      </template>
    </main>
    
    <ProjectDialog
      :isOpen="projectDialogOpen"
      :project="editingProject"
      :loading="projectsStore.loading"
      :error="projectsStore.error"
      @close="closeProjectDialog"
      @submit="handleProjectSubmit"
    />
    
    <CommandDialog
      :isOpen="commandDialogOpen"
      :command="editingCommand"
      :loading="commandsStore.loading"
      :error="commandsStore.error"
      @close="closeCommandDialog"
      @submit="handleCommandSubmit"
    />
    
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useProjectsStore } from './stores/projects'
import { useCommandsStore } from './stores/commands'
import { useProcessesStore } from './stores/processes'
import { useToastStore } from './stores/toast'
import Sidebar from './components/Sidebar.vue'
import CommandList from './components/CommandList.vue'
import ExecutionControls from './components/ExecutionControls.vue'
import ProjectDialog from './components/ProjectDialog.vue'
import CommandDialog from './components/CommandDialog.vue'
import ToastContainer from './components/ToastContainer.vue'

const projectsStore = useProjectsStore()
const commandsStore = useCommandsStore()
const processesStore = useProcessesStore()
const toastStore = useToastStore()

const projectDialogOpen = ref(false)
const commandDialogOpen = ref(false)
const editingProject = ref<Project | null>(null)
const editingCommand = ref<Command | null>(null)
const isExecuting = ref(false)

const runningCommandsCount = computed(() => {
  let count = 0
  for (const info of processesStore.processInfo.values()) {
    if (info.status === 'running') count++
  }
  return count
})

const hasRunningSelectedCommands = computed(() => {
  for (const commandId of commandsStore.selectedCommandIds) {
    const info = processesStore.processInfo.get(commandId)
    if (info?.status === 'running') return true
  }
  return false
})

watch(() => projectsStore.selectedProjectId, async (newProjectId) => {
  if (newProjectId) {
    await commandsStore.loadCommands(newProjectId)
    await processesStore.refreshAllProcessInfo(newProjectId)
    startProcessRefreshInterval()
  } else {
    commandsStore.clearCommands()
  }
})

let refreshInterval: number | null = null

const startProcessRefreshInterval = () => {
  if (refreshInterval) clearInterval(refreshInterval)
  refreshInterval = window.setInterval(async () => {
    if (projectsStore.selectedProjectId) {
      await processesStore.refreshAllProcessInfo(projectsStore.selectedProjectId)
    }
  }, 2000)
}

onMounted(async () => {
  await projectsStore.loadProjects()
  if (projectsStore.projects.length > 0 && !projectsStore.selectedProjectId) {
    projectsStore.selectProject(projectsStore.projects[0].id)
  }
})

const openProjectDialog = (project?: Project) => {
  editingProject.value = project || null
  projectDialogOpen.value = true
}

const closeProjectDialog = () => {
  projectDialogOpen.value = false
  editingProject.value = null
}

const handleProjectSubmit = async (data: { name: string; description?: string; path?: string }) => {
  if (editingProject.value) {
    const result = await projectsStore.updateProject(editingProject.value.id, data)
    if (result) {
      toastStore.success('项目更新成功')
      closeProjectDialog()
    } else {
      toastStore.error(projectsStore.error || '更新项目失败')
    }
  } else {
    const result = await projectsStore.createProject(data)
    if (result) {
      toastStore.success('项目创建成功')
      closeProjectDialog()
    } else {
      toastStore.error(projectsStore.error || '创建项目失败')
    }
  }
}

const handleSelectProject = (projectId: string) => {
  projectsStore.selectProject(projectId)
  commandsStore.clearSelection()
}

const handleDeleteProject = async (projectId: string) => {
  if (confirm('确定要删除此项目吗？此操作无法撤销。')) {
    const result = await projectsStore.deleteProject(projectId)
    if (result) {
      toastStore.success('项目删除成功')
    } else {
      toastStore.error(projectsStore.error || '删除项目失败')
    }
  }
}

const openCommandDialog = (command?: Command) => {
  editingCommand.value = command || null
  commandDialogOpen.value = true
}

const closeCommandDialog = () => {
  commandDialogOpen.value = false
  editingCommand.value = null
}

const handleCommandSubmit = async (data: any) => {
  if (!projectsStore.selectedProjectId) return
  
  if (editingCommand.value) {
    const result = await commandsStore.updateCommand(
      projectsStore.selectedProjectId,
      editingCommand.value.id,
      data
    )
    if (result) {
      toastStore.success('命令更新成功')
      closeCommandDialog()
    } else {
      toastStore.error(commandsStore.error || '更新命令失败')
    }
  } else {
    const result = await commandsStore.createCommand(projectsStore.selectedProjectId, data)
    if (result) {
      toastStore.success('命令创建成功')
      closeCommandDialog()
    } else {
      toastStore.error(commandsStore.error || '创建命令失败')
    }
  }
}

const handleDeleteCommand = async (commandId: string) => {
  if (!projectsStore.selectedProjectId) return
  
  if (confirm('确定要删除此命令吗？')) {
    const result = await commandsStore.deleteCommand(projectsStore.selectedProjectId, commandId)
    if (result) {
      toastStore.success('命令删除成功')
    } else {
      toastStore.error(commandsStore.error || '删除命令失败')
    }
  }
}

const handleExecuteCommand = async (commandId: string) => {
  if (!projectsStore.selectedProjectId) return
  
  const result = await processesStore.executeCommand(projectsStore.selectedProjectId, commandId)
  if (result?.success) {
    toastStore.success(`命令已启动，进程ID：${result.pid}`)
    await processesStore.refreshAllProcessInfo(projectsStore.selectedProjectId)
  } else {
    toastStore.error(result?.error || '执行命令失败')
  }
}

const handleStopCommand = async (commandId: string) => {
  const result = await processesStore.stopCommand(commandId)
  if (result?.success) {
    toastStore.success('命令停止成功')
    if (projectsStore.selectedProjectId) {
      await processesStore.refreshAllProcessInfo(projectsStore.selectedProjectId)
    }
  } else {
    toastStore.error(result?.error || '停止命令失败')
  }
}

const handleRunSelected = async () => {
  if (!projectsStore.selectedProjectId || commandsStore.selectedCommandIds.size === 0) return
  
  isExecuting.value = true
  const commandIds = Array.from(commandsStore.selectedCommandIds)
  const result = await processesStore.executeMultiple(projectsStore.selectedProjectId, commandIds)
  
  if (result) {
    const successCount = result.filter(r => r.success).length
    toastStore.success(`已启动 ${successCount}/${commandIds.length} 个命令`)
    if (projectsStore.selectedProjectId) {
      await processesStore.refreshAllProcessInfo(projectsStore.selectedProjectId)
    }
  } else {
    toastStore.error('执行命令失败')
  }
  isExecuting.value = false
}

const handleStopSelected = async () => {
  if (commandsStore.selectedCommandIds.size === 0) return
  
  isExecuting.value = true
  const commandIds = Array.from(commandsStore.selectedCommandIds)
  const result = await processesStore.stopMultiple(commandIds)
  
  if (result) {
    const successCount = result.filter(r => r.success).length
    toastStore.success(`已停止 ${successCount}/${commandIds.length} 个命令`)
    if (projectsStore.selectedProjectId) {
      await processesStore.refreshAllProcessInfo(projectsStore.selectedProjectId)
    }
  } else {
    toastStore.error('停止命令失败')
  }
  isExecuting.value = false
}

const handleStopAll = async () => {
  if (!projectsStore.selectedProjectId) return
  
  if (confirm(`确定要停止所有 ${runningCommandsCount.value} 个运行中的命令吗？`)) {
    isExecuting.value = true
    const commandIds = commandsStore.commands
      .filter(cmd => {
        const info = processesStore.processInfo.get(cmd.id)
        return info?.status === 'running'
      })
      .map(cmd => cmd.id)
    
    if (commandIds.length > 0) {
      const result = await processesStore.stopMultiple(commandIds)
      if (result) {
        const successCount = result.filter(r => r.success).length
        toastStore.success(`已停止 ${successCount} 个命令`)
        if (projectsStore.selectedProjectId) {
          await processesStore.refreshAllProcessInfo(projectsStore.selectedProjectId)
        }
      } else {
        toastStore.error('停止命令失败')
      }
    }
    isExecuting.value = false
  }
}

const handleToggleLogs = async (commandId: string) => {
  await processesStore.loadProcessOutput(commandId, 100)
}
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: #1a202c;
  color: #e2e8f0;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.no-project-selected {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
}

.no-project-selected h2 {
  margin: 0 0 16px 0;
  font-size: 28px;
  font-weight: 600;
  color: #e2e8f0;
}

.no-project-selected p {
  margin: 0 0 24px 0;
  font-size: 16px;
  color: #a0aec0;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
  font-weight: 500;
}

.btn-primary {
  background: #4299e1;
  color: white;
}

.btn-primary:hover {
  background: #3182ce;
  transform: translateY(-2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
}

.btn-large {
  padding: 14px 32px;
  font-size: 18px;
}
</style>
