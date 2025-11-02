<template>
  <div v-if="isOpen" class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h3>{{ isEdit ? '编辑项目' : '新建项目' }}</h3>
        <button @click="$emit('close')" class="btn btn-icon">×</button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="dialog-body">
        <div class="form-group">
          <label for="project-name">名称 *</label>
          <input
            id="project-name"
            v-model="formData.name"
            type="text"
            placeholder="输入项目名称"
            required
            autofocus
          />
        </div>
        
        <div class="form-group">
          <label for="project-description">描述</label>
          <textarea
            id="project-description"
            v-model="formData.description"
            placeholder="输入项目描述（可选）"
            rows="3"
          />
        </div>
        
        <div class="form-group">
          <label for="project-path">路径</label>
          <div class="input-with-button">
            <input
              id="project-path"
              v-model="formData.path"
              type="text"
              placeholder="项目目录路径（可选）"
            />
            <button type="button" @click="selectDirectory" class="btn btn-secondary">
              浏览
            </button>
          </div>
        </div>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
        
        <div class="dialog-footer">
          <button type="button" @click="$emit('close')" class="btn btn-secondary">
            取消
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? '保存中...' : (isEdit ? '保存' : '创建') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  isOpen: boolean
  project?: Project | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  close: []
  submit: [data: { name: string; description?: string; path?: string }]
}>()

const isEdit = ref(false)
const formData = ref({
  name: '',
  description: '',
  path: ''
})

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (props.project) {
      isEdit.value = true
      formData.value = {
        name: props.project.name,
        description: props.project.description || '',
        path: props.project.path || ''
      }
    } else {
      isEdit.value = false
      formData.value = {
        name: '',
        description: '',
        path: ''
      }
    }
  }
})

const handleSubmit = () => {
  const data: { name: string; description?: string; path?: string } = {
    name: formData.value.name.trim()
  }
  
  if (formData.value.description.trim()) {
    data.description = formData.value.description.trim()
  }
  
  if (formData.value.path.trim()) {
    data.path = formData.value.path.trim()
  }
  
  emit('submit', data)
}

const selectDirectory = async () => {
  try {
    const result = await (window as any).electronAPI.dialog.openDirectory()
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      formData.value.path = result.filePaths[0]
    }
  } catch (error) {
    console.error('Error selecting directory:', error)
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #2d3748;
  border-radius: 8px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #4a5568;
}

.dialog-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #e2e8f0;
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-of-type {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #cbd5e0;
  font-weight: 500;
  font-size: 14px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  background: #1a202c;
  border: 1px solid #4a5568;
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 14px;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #4299e1;
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.input-with-button {
  display: flex;
  gap: 8px;
}

.input-with-button input {
  flex: 1;
}

.error-message {
  margin-top: 16px;
  padding: 12px;
  background: rgba(245, 101, 101, 0.1);
  border: 1px solid #f56565;
  border-radius: 4px;
  color: #fc8181;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #4a5568;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  font-weight: 500;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: transparent;
  color: #cbd5e0;
}

.btn-icon:hover {
  background: #4a5568;
}

.btn-primary {
  background: #4299e1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #3182ce;
}

.btn-secondary {
  background: #4a5568;
  color: #e2e8f0;
}

.btn-secondary:hover:not(:disabled) {
  background: #5a6678;
}
</style>
