<template>
  <div class="login-form max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
    <div class="text-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Welcome Back</h2>
      <p class="text-gray-600 mt-2">Sign in to your account</p>
    </div>
    
    <form @submit.prevent="handleLogin">
      <div class="mb-4">
        <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
          Email Address
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          :class="{ 'border-red-300': error }"
          placeholder="Enter your email"
        >
      </div>
      
      <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <p class="text-sm text-red-600">{{ error }}</p>
      </div>
      
      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span v-if="loading">Signing in...</span>
        <span v-else>Sign In</span>
      </button>
    </form>
    
    <div class="mt-6">
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-white text-gray-500">Demo Users</span>
        </div>
      </div>
      
      <div class="mt-4 space-y-2">
        <button
          v-for="user in demoUsers"
          :key="user.id"
          type="button"
          class="w-full text-left px-3 py-2 border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          @click="quickLogin(user.email)"
        >
          <div class="flex items-center space-x-2">
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {{ user.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ user.name }}</p>
              <p class="text-xs text-gray-500">{{ user.email }}</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '../../composables/useAuth'
import type { User } from '../../types'

interface Emits {
  (e: 'login-success'): void
}

const emit = defineEmits<Emits>()

const { login, getAllUsers } = useAuth()

const email = ref('')
const loading = ref(false)
const error = ref('')
const demoUsers = ref<User[]>([])

async function handleLogin() {
  if (!email.value.trim()) {
    error.value = 'Please enter an email address'
    return
  }
  
  loading.value = true
  error.value = ''
  
  try {
    const success = await login(email.value.trim())
    if (success) {
      emit('login-success')
    } else {
      error.value = 'User not found. Please try one of the demo users below.'
    }
  } catch (err) {
    error.value = 'Login failed. Please try again.'
    console.error('Login error:', err)
  } finally {
    loading.value = false
  }
}

async function quickLogin(userEmail: string) {
  email.value = userEmail
  await handleLogin()
}

async function loadDemoUsers() {
  try {
    demoUsers.value = await getAllUsers()
  } catch (err) {
    console.error('Failed to load demo users:', err)
  }
}

onMounted(() => {
  loadDemoUsers()
})
</script>