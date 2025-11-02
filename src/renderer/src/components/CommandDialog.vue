<template>
  <div v-if="isOpen" class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <h3>{{ isEdit ? '编辑命令' : '新建命令' }}</h3>
        <button @click="$emit('close')" class="btn btn-icon">×</button>
      </div>
      
      <form @submit.prevent="handleSubmit" class="dialog-body">
        <div class="form-group">
          <label for="command-name">名称 *</label>
          <input
            id="command-name"
            v-model="formData.name"
            type="text"
            placeholder="输入命令名称"
            required
            autofocus
          />
        </div>
        
        <div class="form-group">
          <label for="command-description">描述</label>
          <textarea
            id="command-description"
            v-model="formData.description"
            placeholder="输入命令描述（可选）"
            rows="2"
          />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="command-type">类型 *</label>
            <select id="command-type" v-model="formData.type" required>
              <option value="service">服务（长期运行）</option>
              <option value="oneoff">任务（一次性）</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="command-shell">Shell *</label>
            <select id="command-shell" v-model="formData.shell" required>
              <option value="bash">Bash</option>
              <option value="cmd">CMD</option>
              <option value="powershell">PowerShell</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label for="command-text">命令 *</label>
          <textarea
            id="command-text"
            v-model="formData.command"
            placeholder="输入要执行的命令"
            rows="3"
            required
            class="monospace"
          />
        </div>
        
        <div class="form-group">
          <label for="command-working-directory">工作目录</label>
          <div class="input-with-button">
            <input
              id="command-working-directory"
              v-model="formData.workingDirectory"
              type="text"
              placeholder="留空以使用项目路径"
            />
            <button type="button" @click="selectDirectory" class="btn btn-secondary">
              浏览
            </button>
          </div>
        </div>
        
        <div v-if="formData.type === 'service'" class="form-group">
          <label class="checkbox-label">
            <input
              type="checkbox"
              v-model="formData.autoRestart"
            />
            <span>失败时自动重启</span>
          </label>
        </div>
        
        <div class="form-group">
          <label>环境变量</label>
          <div class="env-vars">
            <div
              v-for="(value, key, index) in formData.env"
              :key="index"
              class="env-var-row"
            >
              <input
                v-model="envKeys[index]"
                type="text"
                placeholder="键"
                @blur="updateEnvKey(index)"
              />
              <input
                v-model="formData.env[key]"
                type="text"
                placeholder="值"
              />
              <button
                type="button"
                @click="removeEnvVar(key)"
                class="btn btn-icon btn-small btn-danger"
              >
                ×
              </button>
            </div>
            <button
              type="button"
              @click="addEnvVar"
              class="btn btn-secondary btn-small"
            >
              + 添加变量
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
  command?: Command | null
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  close: []
  submit: [data: {
    name: string
    description?: string
    type: 'service' | 'oneoff'
    shell: 'cmd' | 'powershell' | 'bash'
    command: string
    workingDirectory?: string
    env?: Record<string, string>
    autoRestart?: boolean
  }]
}>()

const isEdit = ref(false)

const getDefaultShell = (): 'cmd' | 'powershell' | 'bash' => {
  const platform = navigator.platform.toLowerCase()
  if (platform.includes('win')) {
    return 'powershell'
  }
  return 'bash'
}

const formData = ref({
  name: '',
  description: '',
  type: 'service' as 'service' | 'oneoff',
  shell: getDefaultShell(),
  command: '',
  workingDirectory: '',
  env: {} as Record<string, string>,
  autoRestart: false
})
const envKeys = ref<string[]>([])

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    if (props.command) {
      isEdit.value = true
      formData.value = {
        name: props.command.name,
        description: props.command.description || '',
        type: props.command.type,
        shell: props.command.shell,
        command: props.command.command,
        workingDirectory: props.command.workingDirectory || '',
        env: { ...(props.command.env || {}) },
        autoRestart: props.command.autoRestart || false
      }
      envKeys.value = Object.keys(formData.value.env)
    } else {
      isEdit.value = false
      formData.value = {
        name: '',
        description: '',
        type: 'service',
        shell: getDefaultShell(),
        command: '',
        workingDirectory: '',
        env: {},
        autoRestart: false
      }
      envKeys.value = []
    }
  }
})

const handleSubmit = () => {
  const data: any = {
    name: formData.value.name.trim(),
    type: formData.value.type,
    shell: formData.value.shell,
    command: formData.value.command.trim()
  }
  
  if (formData.value.description.trim()) {
    data.description = formData.value.description.trim()
  }
  
  if (formData.value.workingDirectory.trim()) {
    data.workingDirectory = formData.value.workingDirectory.trim()
  }
  
  if (Object.keys(formData.value.env).length > 0) {
    data.env = { ...formData.value.env }
  }
  
  if (formData.value.type === 'service') {
    data.autoRestart = formData.value.autoRestart
  }
  
  emit('submit', data)
}

const addEnvVar = () => {
  const newKey = `VAR_${envKeys.value.length + 1}`
  formData.value.env[newKey] = ''
  envKeys.value.push(newKey)
}

const removeEnvVar = (key: string) => {
  delete formData.value.env[key]
  const index = envKeys.value.indexOf(key)
  if (index !== -1) {
    envKeys.value.splice(index, 1)
  }
}

const updateEnvKey = (index: number) => {
  const oldKey = Object.keys(formData.value.env)[index]
  const newKey = envKeys.value[index]
  
  if (oldKey !== newKey && newKey) {
    const value = formData.value.env[oldKey]
    delete formData.value.env[oldKey]
    formData.value.env[newKey] = value
  }
}

const selectDirectory = async () => {
  try {
    const result = await (window as any).electronAPI.dialog.openDirectory()
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      formData.value.workingDirectory = result.filePaths[0]
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
  max-width: 600px;
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #cbd5e0;
  font-weight: 500;
  font-size: 14px;
}

.form-group input,
.form-group textarea,
.form-group select {
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
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #4299e1;
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.form-group textarea.monospace {
  font-family: 'Courier New', monospace;
}

.input-with-button {
  display: flex;
  gap: 8px;
}

.input-with-button input {
  flex: 1;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: auto;
  margin: 0;
  cursor: pointer;
}

.env-vars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.env-var-row {
  display: flex;
  gap: 8px;
}

.env-var-row input {
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
  transform: none;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
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

.btn-danger {
  background: #f56565;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #e53e3e;
}
</style>
