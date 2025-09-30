<template>
  <div class="user-demo p-6 max-w-4xl mx-auto">
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">User Management Demo</h1>
      <p class="text-gray-600">
        This demo shows the user management and persona switching functionality.
      </p>
    </div>

    <!-- Authentication Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Authentication</h2>
        
        <div v-if="!isAuthenticated">
          <LoginForm @login-success="handleLoginSuccess" />
        </div>
        
        <div v-else>
          <UserProfile 
            @show-login="showLogin = true"
            @persona-changed="handlePersonaChanged"
          />
        </div>
      </div>

      <!-- Current State Display -->
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-4">Current State</h2>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Authentication Status
            </label>
            <span 
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              :class="isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
            >
              {{ isAuthenticated ? 'Authenticated' : 'Not Authenticated' }}
            </span>
          </div>
          
          <div v-if="currentUser">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Current User
            </label>
            <div class="text-sm text-gray-900">
              <p><strong>Name:</strong> {{ currentUser.name }}</p>
              <p><strong>Email:</strong> {{ currentUser.email }}</p>
              <p><strong>Personas:</strong> {{ currentUser.personas.length }}</p>
            </div>
          </div>
          
          <div v-if="currentPersona">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Active Persona
            </label>
            <div class="flex items-center space-x-2">
              <div 
                class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                :class="getPersonaColor(currentPersona.role)"
              >
                {{ currentPersona.name.charAt(0).toUpperCase() }}
              </div>
              <div class="text-sm text-gray-900">
                <span class="font-medium">{{ currentPersona.name }}</span>
                <span class="text-gray-500 ml-1 capitalize">({{ currentPersona.role }})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Persona Management Section -->
    <div v-if="currentUser && currentUser.personas.length > 0" class="bg-white rounded-lg shadow-sm border p-6 mb-8">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Available Personas</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UserPersona
          v-for="persona in currentUser.personas"
          :key="persona.id"
          :persona="persona"
          :is-selected="currentPersona?.id === persona.id"
          @select="handlePersonaSelect(persona)"
        />
      </div>
    </div>

    <!-- Demo Actions -->
    <div class="bg-white rounded-lg shadow-sm border p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Demo Actions</h2>
      
      <div class="space-y-4">
        <div>
          <button
            @click="createDemoUser"
            :disabled="loading"
            class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            Create Demo User
          </button>
          <p class="text-sm text-gray-500 mt-1">
            Creates a new user with multiple personas for testing
          </p>
        </div>
        
        <div v-if="isAuthenticated">
          <button
            @click="logout"
            class="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Logout
          </button>
          <p class="text-sm text-gray-500 mt-1">
            Sign out and clear authentication state
          </p>
        </div>
      </div>
    </div>

    <!-- Event Log -->
    <div class="bg-white rounded-lg shadow-sm border p-6 mt-8">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Event Log</h2>
      
      <div class="space-y-2 max-h-64 overflow-y-auto">
        <div
          v-for="(event, index) in eventLog"
          :key="index"
          class="text-sm p-2 bg-gray-50 rounded border-l-4"
          :class="getEventColor(event.type)"
        >
          <div class="flex justify-between items-start">
            <span class="font-medium">{{ event.message }}</span>
            <span class="text-xs text-gray-500">{{ formatTime(event.timestamp) }}</span>
          </div>
          <div v-if="event.data" class="text-xs text-gray-600 mt-1">
            {{ JSON.stringify(event.data, null, 2) }}
          </div>
        </div>
        
        <div v-if="eventLog.length === 0" class="text-center py-4 text-gray-500">
          No events yet. Try logging in or switching personas.
        </div>
      </div>
      
      <button
        v-if="eventLog.length > 0"
        @click="clearEventLog"
        class="mt-4 text-sm text-gray-500 hover:text-gray-700"
      >
        Clear Log
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'
import { LoginForm, UserProfile, UserPersona } from '../components'
import type { UserPersona as UserPersonaType } from '../types'

const { 
  currentUser, 
  currentPersona, 
  isAuthenticated, 
  logout: authLogout,
  switchPersona,
  createUser,
  initializeAuth
} = useAuth()

const loading = ref(false)
const showLogin = ref(false)

interface LogEvent {
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
  timestamp: Date
  data?: any
}

const eventLog = ref<LogEvent[]>([])

function addEvent(type: LogEvent['type'], message: string, data?: any) {
  eventLog.value.unshift({
    type,
    message,
    timestamp: new Date(),
    data
  })
  
  // Keep only last 20 events
  if (eventLog.value.length > 20) {
    eventLog.value = eventLog.value.slice(0, 20)
  }
}

function handleLoginSuccess() {
  addEvent('success', 'User logged in successfully', {
    user: currentUser.value?.name,
    email: currentUser.value?.email
  })
}

function handlePersonaChanged(persona: UserPersonaType) {
  addEvent('info', 'Persona switched', {
    from: currentPersona.value?.name,
    to: persona.name,
    role: persona.role
  })
}

function handlePersonaSelect(persona: UserPersonaType) {
  try {
    switchPersona(persona)
    addEvent('success', 'Persona selected', {
      persona: persona.name,
      role: persona.role
    })
  } catch (error) {
    addEvent('error', 'Failed to switch persona', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

async function createDemoUser() {
  loading.value = true
  
  try {
    const demoUser = await createUser({
      name: `Demo User ${Date.now()}`,
      email: `demo${Date.now()}@example.com`,
      personas: [
        { id: crypto.randomUUID(), name: 'Accountant', role: 'accountant' },
        { id: crypto.randomUUID(), name: 'Marketing Manager', role: 'marketing' },
        { id: crypto.randomUUID(), name: 'Sales Rep', role: 'sales' },
        { id: crypto.randomUUID(), name: 'Operations Manager', role: 'manager' }
      ]
    })
    
    if (demoUser) {
      addEvent('success', 'Demo user created', {
        name: demoUser.name,
        email: demoUser.email,
        personas: demoUser.personas.length
      })
    } else {
      addEvent('error', 'Failed to create demo user')
    }
  } catch (error) {
    addEvent('error', 'Error creating demo user', {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  } finally {
    loading.value = false
  }
}

function logout() {
  const userName = currentUser.value?.name
  authLogout()
  addEvent('info', 'User logged out', { user: userName })
}

function clearEventLog() {
  eventLog.value = []
}

function getPersonaColor(role: string): string {
  const colors: Record<string, string> = {
    accountant: 'bg-blue-500',
    marketing: 'bg-purple-500',
    sales: 'bg-green-500',
    manager: 'bg-orange-500',
    admin: 'bg-red-500',
    default: 'bg-gray-500'
  }
  
  return colors[role.toLowerCase()] || colors.default
}

function getEventColor(type: LogEvent['type']): string {
  const colors = {
    info: 'border-blue-400',
    success: 'border-green-400',
    warning: 'border-yellow-400',
    error: 'border-red-400'
  }
  return colors[type]
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString()
}

onMounted(async () => {
  await initializeAuth()
  addEvent('info', 'Demo page loaded')
})
</script>