<template>
  <div class="command-list">
    <div class="command-list-header">
      <div class="header-left">
        <h3>命令</h3>
        <span v-if="commands.length > 0" class="command-count-badge">
          {{ commands.length }}
        </span>
      </div>
      <div class="header-actions">
        <button 
          v-if="commands.length > 0"
          @click="$emit('selectAll')" 
          class="btn btn-secondary"
        >
          全选
        </button>
        <button 
          @click="$emit('openCommandDialog')" 
          class="btn btn-primary"
        >
          + 添加命令
        </button>
      </div>
    </div>

    <div v-if="loading" class="command-list-loading">
      加载中...
    </div>

    <div v-else-if="commands.length === 0" class="command-list-empty">
      <p>暂无命令</p>
      <button @click="$emit('openCommandDialog')" class="btn btn-primary">
        创建第一个命令
      </button>
    </div>

    <div v-else class="commands-grid">
      <div
        v-for="command in commands"
        :key="command.id"
        :class="['command-card', { selected: selectedCommandIds.has(command.id) }]"
      >
        <div class="command-card-header">
          <input
            type="checkbox"
            :checked="selectedCommandIds.has(command.id)"
            @change="$emit('toggleSelection', command.id)"
            class="command-checkbox"
          />
          <div class="command-title">
            <h4>{{ command.name }}</h4>
            <span :class="['command-type-badge', `type-${command.type}`]">
              {{ command.type === 'service' ? '服务' : '任务' }}
            </span>
            <template v-if="getProcessInfo(command.id)">
              <span class="status-indicator status-active">● 运行中</span>
              <span class="pid-badge">PID: {{ getProcessInfo(command.id)?.pid }}</span>
              <span
                v-if="getProcessInfo(command.id)?.ports && getProcessInfo(command.id)!.ports!.length > 0"
                class="port-badge"
              >
                端口: {{ getProcessInfo(command.id)!.ports!.join(', ') }}
              </span>
            </template>
          </div>
          <div class="command-actions">
            <button
              @click="$emit('editCommand', command)"
              class="btn btn-icon btn-small"
              title="编辑"
            >
              ✎
            </button>
            <button
              @click="$emit('deleteCommand', command.id)"
              class="btn btn-icon btn-small btn-danger"
              title="删除"
            >
              ×
            </button>
            <template v-if="isExecuting(command.id)">
              <span class="status-indicator status-executing">⏳ 执行中</span>
            </template>
            <template v-else-if="getProcessInfo(command.id)">
              <button
                @click="$emit('stopCommand', command.id)"
                class="btn btn-small btn-danger"
              >
                停止
              </button>
            </template>
            <template v-else>
              <button
                @click="$emit('executeCommand', command.id)"
                class="btn btn-small btn-success"
                :disabled="isExecuting(command.id)"
              >
                ▶ 运行
              </button>
            </template>
          </div>
        </div>

        <div v-if="command.description" class="command-description">
          {{ command.description }}
        </div>

        <div class="command-details">
          <div class="detail-row">
            <div class="detail-item">
              <span class="detail-label">Shell：</span>
              <span class="detail-value">{{ command.shell }}</span>
            </div>
            <div v-if="command.workingDirectory" class="detail-item">
              <span class="detail-label">目录：</span>
              <span class="detail-value">{{ command.workingDirectory }}</span>
            </div>
          </div>
          <div class="detail-item">
            <span class="detail-label">命令：</span>
            <code class="detail-value command-text">{{ command.command }}</code>
          </div>
        </div>


        <div
          v-if="getProcessInfo(command.id) && showLogs"
          class="command-logs"
        >
          <div class="logs-header" @click="toggleLogsExpansion(command.id)">
            <span>日志</span>
            <button class="btn btn-icon btn-tiny">{{ logsExpanded.has(command.id) ? '▼' : '▶' }}</button>
          </div>
          <div v-if="logsExpanded.has(command.id)" class="logs-content">
            <div
              v-for="(output, index) in getOutputs(command.id)"
              :key="index"
              :class="['log-line', `log-${output.type}`]"
            >
              <span class="log-timestamp">{{ formatTimestamp(output.timestamp) }}</span>
              <span class="log-data" v-html="convertAnsiToHtml(output.data)"></span>
            </div>
            <div v-if="getOutputs(command.id).length === 0" class="log-empty">
              暂无输出
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AnsiToHtml from 'ansi-to-html'

const ansiConverter = new AnsiToHtml({
  fg: '#cbd5e0',
  bg: '#1a202c',
  colors: {
    0: '#1a202c',
    1: '#fc8181',
    2: '#68d391',
    3: '#f6e05e',
    4: '#63b3ed',
    5: '#d6bcfa',
    6: '#4fd1c5',
    7: '#e2e8f0'
  }
})

const props = defineProps<{
  commands: Command[]
  selectedCommandIds: Set<string>
  loading: boolean
  processInfo: Map<string, ProcessInfo>
  processOutputs: Map<string, ProcessOutput[]>
  executingCommands: Set<string>
  showLogs?: boolean
}>()

const emit = defineEmits<{
  openCommandDialog: []
  selectAll: []
  toggleSelection: [id: string]
  editCommand: [command: Command]
  deleteCommand: [id: string]
  executeCommand: [id: string]
  stopCommand: [id: string]
  toggleLogs: [id: string]
}>()

const logsExpanded = ref<Set<string>>(new Set())

const getProcessInfo = (commandId: string) => {
  const info = props.processInfo.get(commandId)
  return info?.status === 'running' ? info : null
}

const getOutputs = (commandId: string) => {
  return props.processOutputs.get(commandId) || []
}

const isExecuting = (commandId: string) => {
  return props.executingCommands.has(commandId)
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString()
}

const convertAnsiToHtml = (text: string): string => {
  try {
    return ansiConverter.toHtml(text)
  } catch (error) {
    return text
  }
}

const toggleLogsExpansion = async (commandId: string) => {
  if (logsExpanded.value.has(commandId)) {
    logsExpanded.value.delete(commandId)
  } else {
    logsExpanded.value.add(commandId)
    emit('toggleLogs', commandId)
  }
}
</script>

<style scoped>
.command-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.command-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #4a5568;
  background: #2d3748;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #e2e8f0;
}

.command-count-badge {
  background: #4a5568;
  color: #e2e8f0;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.command-list-loading,
.command-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #a0aec0;
  flex: 1;
}

.command-list-empty p {
  margin-bottom: 16px;
  font-size: 16px;
}

.commands-grid {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-content: start;
}

.command-card {
  background: #2d3748;
  border: 1px solid #4a5568;
  border-radius: 6px;
  padding: 12px;
  transition: all 0.2s;
}

.command-card:hover {
  border-color: #5a6678;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.command-card.selected {
  border-color: #4299e1;
  background: #374151;
}

.command-card-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 8px;
}

.command-checkbox {
  margin-top: 4px;
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.command-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.command-title h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
}

.command-type-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.type-service {
  background: #4299e1;
  color: white;
}

.type-oneoff {
  background: #9f7aea;
  color: white;
}

.command-actions {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-left: auto;
}

.command-description {
  color: #a0aec0;
  font-size: 13px;
  margin-bottom: 8px;
}

.command-details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}

.detail-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.detail-item {
  display: flex;
  gap: 8px;
  font-size: 12px;
}

.detail-label {
  color: #718096;
  font-weight: 600;
  min-width: 80px;
}

.detail-value {
  color: #cbd5e0;
  flex: 1;
  word-break: break-all;
}

.command-text {
  background: #1a202c;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.command-status {
  padding-top: 8px;
  border-top: 1px solid #4a5568;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  font-size: 13px;
  font-weight: 600;
}

.status-executing {
  color: #ed8936;
}

.status-active {
  color: #48bb78;
}

.status-running {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.pid-badge {
  background: #4a5568;
  color: #e2e8f0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.port-badge {
  background: #48bb78;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.command-logs {
  margin-top: 8px;
  border-top: 1px solid #4a5568;
  padding-top: 8px;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  cursor: pointer;
  color: #cbd5e0;
  font-weight: 600;
  font-size: 13px;
}

.logs-content {
  background: #1a202c;
  border-radius: 4px;
  padding: 8px;
  max-height: 200px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 11px;
}

.log-line {
  display: flex;
  gap: 8px;
  padding: 2px 0;
}

.log-timestamp {
  color: #718096;
  min-width: 80px;
}

.log-data {
  flex: 1;
  word-break: break-all;
  white-space: pre-wrap;
}

.log-stdout {
  color: #cbd5e0;
}

.log-stderr {
  color: #cbd5e0; /* 改为正常颜色，因为很多程序把日志输出到 stderr */
}

.log-empty {
  color: #718096;
  text-align: center;
  padding: 8px;
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
  font-weight: 500;
}

.btn:hover:not(:disabled) {
  background: #5a6678;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #4299e1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #3182ce;
}

.btn-secondary {
  background: #718096;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6678;
}

.btn-success {
  background: #48bb78;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #38a169;
}

.btn-danger {
  background: #f56565;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #e53e3e;
}

.btn-small {
  padding: 4px 12px;
  font-size: 12px;
}

.btn-icon {
  width: 24px;
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-tiny {
  width: 20px;
  height: 20px;
  font-size: 10px;
}
</style>
