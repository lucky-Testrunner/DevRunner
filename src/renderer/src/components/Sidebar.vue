<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>项目</h2>
      <button @click="$emit('openProjectDialog')" class="btn btn-icon" title="添加项目">
        <span>+</span>
      </button>
    </div>
    
    <div v-if="loading" class="sidebar-loading">加载中...</div>
    
    <div v-else-if="!projects ||projects.length === 0" class="sidebar-empty">
      <p>暂无项目</p>
      <button @click="$emit('openProjectDialog')" class="btn btn-primary">
        创建第一个项目
      </button>
    </div>
    
    <ul v-else class="project-list">
      <li
        v-for="project in (projects || [])"
        :key="project.id"
        :class="['project-item', { active: project.id === selectedProjectId }]"
        @click="$emit('selectProject', project.id)"
      >
        <div class="project-info">
        <div class="project-name">{{ project.name }}</div>
        <div v-if="project.description" class="project-description">{{ project.description }}</div>
        <div class="project-meta">
          <span class="command-count">{{ project.commands?.length || 0 }} 条命令</span>
          <span v-if="runningCommandsCount(project.id) > 0" class="running-count">
            {{ runningCommandsCount(project.id) }} 运行中
          </span>
        </div>
        </div>
        <div class="project-actions">
        <button
          @click.stop="$emit('editProject', project)"
          class="btn btn-icon btn-small"
          title="编辑"
        >
          ✎
        </button>
        <button
          @click.stop="$emit('deleteProject', project.id)"
          class="btn btn-icon btn-small btn-danger"
          title="删除"
        >
          ×
        </button>
        </div>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  projects?: Project[]
  selectedProjectId?: string | null
  loading?: boolean
  processInfo?: Map<string, ProcessInfo>
}>(), {
  projects: () => [],
  selectedProjectId: null,
  loading: false,
  processInfo: () => new Map()
})

defineEmits<{
  openProjectDialog: []
  selectProject: [id: string]
  editProject: [project: Project]
  deleteProject: [id: string]
}>()

const runningCommandsCount = (projectId: string) => {
  const project = (props.projects || []).find(p => p.id === projectId)
  if (!project) return 0
  
  return (project.commands || []).filter(cmd => {
    const info = props.processInfo.get(cmd.id)
    return info?.status === 'running'
  }).length
}
</script>

<style scoped>
.sidebar {
  width: 280px;
  background: #2d3748;
  border-right: 1px solid #4a5568;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #4a5568;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #e2e8f0;
}

.sidebar-loading,
.sidebar-empty {
  padding: 20px;
  text-align: center;
  color: #a0aec0;
}

.sidebar-empty p {
  margin-bottom: 16px;
}

.project-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  flex: 1;
}

.project-item {
  padding: 12px 16px;
  border-bottom: 1px solid #4a5568;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.project-item:hover {
  background: #374151;
}

.project-item.active {
  background: #3b4b5e;
  border-left: 3px solid #4299e1;
}

.project-info {
  flex: 1;
  min-width: 0;
}

.project-name {
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-description {
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #718096;
}

.running-count {
  color: #48bb78;
  font-weight: 600;
}

.project-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.project-item:hover .project-actions {
  opacity: 1;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  background: #4a5568;
  color: #e2e8f0;
}

.btn:hover {
  background: #5a6678;
}

.btn-primary {
  background: #4299e1;
  color: white;
}

.btn-primary:hover {
  background: #3182ce;
}

.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.btn-small {
  width: 24px;
  height: 24px;
  font-size: 14px;
}

.btn-danger {
  background: #f56565;
}

.btn-danger:hover {
  background: #e53e3e;
}
</style>
