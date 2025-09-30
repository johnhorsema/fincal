<template>
  <div class="user-profile">
    <div v-if="currentUser" class="bg-white rounded-lg shadow-sm border p-4">
      <!-- Current User Info -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
            {{ currentUser.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <h3 class="text-sm font-medium text-gray-900">{{ currentUser.name }}</h3>
            <p class="text-sm text-gray-500">{{ currentUser.email }}</p>
          </div>
        </div>
        <button
          @click="handleLogout"
          class="text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
        >
          Sign Out
        </button>
      </div>
      
      <!-- Current Persona -->
      <div v-if="currentPersona" class="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <div 
              class="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
              :class="getPersonaColor(currentPersona.role)"
            >
              {{ currentPersona.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900">{{ currentPersona.name }}</p>
              <p class="text-xs text-gray-600 capitalize">{{ currentPersona.role }}</p>
            </div>
          </div>
          <span class="text-xs text-blue-600 font-medium">Active</span>
        </div>
      </div>
      
      <!-- Persona Selector -->
      <div v-if="currentUser.personas.length > 1">
        <PersonaSelector
          :personas="currentUser.personas"
          :selected-persona="currentPersona"
          label="Switch Persona"
          @change="handlePersonaChange"
        />
      </div>
      
      <!-- No Personas Message -->
      <div v-else-if="currentUser.personas.length === 0" class="text-center py-4">
        <p class="text-sm text-gray-500">No personas available</p>
      </div>
    </div>
    
    <!-- Not Authenticated -->
    <div v-else class="text-center py-8">
      <p class="text-gray-500 mb-4">Please sign in to continue</p>
      <button
        @click="$emit('show-login')"
        class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Sign In
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineEmits } from 'vue'
import { useAuth } from '../../composables/useAuth'
import PersonaSelector from './PersonaSelector.vue'
import type { UserPersona } from '../../types'

interface Emits {
  (e: 'show-login'): void
  (e: 'persona-changed', persona: UserPersona): void
}

const emit = defineEmits<Emits>()

const { currentUser, currentPersona, logout, switchPersona } = useAuth()

function handleLogout() {
  logout()
}

function handlePersonaChange(persona: UserPersona | null) {
  if (persona) {
    try {
      switchPersona(persona)
      emit('persona-changed', persona)
    } catch (error) {
      console.error('Failed to switch persona:', error)
    }
  }
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
</script>