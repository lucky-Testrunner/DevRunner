<template>
  <div class="execution-controls">
    <div class="controls-left">
      <div v-if="selectedCount > 0" class="selection-info">
        <span class="selection-badge">已选择 {{ selectedCount }} 个</span>
        <button @click="$emit('clearSelection')" class="btn btn-link">
          清除
        </button>
      </div>
      <div class="running-services">
        <span class="status-icon">●</span>
        <span>{{ runningCount }} 运行中</span>
        <span class="separator">|</span>
        <span>总计 {{ totalCount }} 个</span>
      </div>
    </div>
    
    <div class="controls-right">
      <button
        v-if="selectedCount > 0"
        @click="$emit('runSelected')"
        class="btn btn-success"
        :disabled="executing"
      >
        <span v-if="executing">⏳ 执行中...</span>
        <span v-else>▶ 运行所选 ({{ selectedCount }})</span>
      </button>
      <button
        v-if="selectedCount > 0 && hasRunningSelected"
        @click="$emit('stopSelected')"
        class="btn btn-danger"
        :disabled="executing"
      >
        ■ 停止所选
      </button>
      <button
        v-if="runningCount > 0"
        @click="$emit('stopAll')"
        class="btn btn-danger"
        :disabled="executing"
      >
        ■ 停止所有 ({{ runningCount }})
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  selectedCount: number
  runningCount: number
  totalCount: number
  executing: boolean
  hasRunningSelected: boolean
}>()

defineEmits<{
  clearSelection: []
  runSelected: []
  stopSelected: []
  stopAll: []
}>()
</script>

<style scoped>
.execution-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #2d3748;
  border-bottom: 1px solid #4a5568;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.selection-badge {
  background: #4299e1;
  color: white;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.running-services {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #cbd5e0;
  font-size: 13px;
}

.status-icon {
  color: #48bb78;
  font-size: 10px;
}

.separator {
  color: #4a5568;
}

.btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
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

.btn-link {
  background: transparent;
  color: #4299e1;
  padding: 3px 6px;
}

.btn-link:hover:not(:disabled) {
  background: rgba(66, 153, 225, 0.1);
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
</style>
