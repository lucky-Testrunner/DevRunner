<template>
  <div class="hello">
    <p class="message">{{ msg }}</p>
    <button type="button" @click="ping">Ping main process</button>
    <p class="response" v-if="response">Response: {{ response }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  msg: string
}

defineProps<Props>()
const response = ref<string>('')

const ping = async () => {
  const result = await window.electronAPI.ping()
  response.value = result
}
</script>

<style scoped>
.hello {
  padding: 1rem;
  border: 1px solid #eaeaea;
  border-radius: 8px;
  margin-top: 2rem;
}

.message {
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

button {
  background-color: #42b883;
  border: none;
  border-radius: 4px;
  color: white;
  padding: 0.6rem 1.2rem;
  cursor: pointer;
  font-size: 1rem;
}

button:hover {
  background-color: #37996c;
}

.response {
  margin-top: 1rem;
  color: #35495e;
}
</style>
