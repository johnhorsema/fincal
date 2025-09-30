<template>
  <header class="bg-white/80 backdrop-blur-md shadow-soft border-b border-gray-200/50 px-4 sm:px-6 py-3 sticky top-0 z-30">
    <div class="flex items-center justify-between">
      <!-- Mobile menu button -->
      <button
        @click="$emit('toggle-sidebar')"
        class="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all duration-200 hover:scale-105"
      >
        <span class="sr-only">Open sidebar</span>
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <!-- Logo and title -->
      <div class="flex items-center">
        <div class="flex-shrink-0 lg:hidden">
          <h1 class="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
            FinCal
          </h1>
        </div>
      </div>

      <!-- User menu -->
      <div class="flex items-center space-x-3 sm:space-x-4">
        <!-- Persona selector -->
        <div class="relative hidden sm:block">
          <select 
            v-model="selectedPersona"
            class="appearance-none bg-white/90 border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:shadow-sm"
          >
            <option value="accountant">👨‍💼 Accountant</option>
            <option value="marketing">📢 Marketing</option>
            <option value="manager">👔 Manager</option>
            <option value="admin">⚙️ Admin</option>
          </select>
          <div class="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <!-- Mobile persona indicator -->
        <div class="sm:hidden">
          <div class="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
            {{ getPersonaEmoji(selectedPersona) }}
          </div>
        </div>

        <!-- Notifications (placeholder) -->
        <button class="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-5 5v-5zM10.5 3.75a6 6 0 0 1 6 6v2.25a2.25 2.25 0 0 1-2.25 2.25H7.5a2.25 2.25 0 0 1-2.25-2.25V9.75a6 6 0 0 1 6-6z" />
          </svg>
          <!-- Notification badge -->
          <span class="absolute -top-1 -right-1 h-3 w-3 bg-error-500 rounded-full animate-pulse"></span>
        </button>

        <!-- User avatar -->
        <div class="flex items-center">
          <div class="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
            <span class="text-sm font-medium text-white">{{ userInitials }}</span>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineEmits<{
  'toggle-sidebar': []
}>()

const selectedPersona = ref('accountant')
const userName = ref('John Doe') // This would come from user state

const userInitials = computed(() => {
  return userName.value
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
})

const getPersonaEmoji = (persona: string) => {
  const emojiMap: Record<string, string> = {
    accountant: '👨‍💼',
    marketing: '📢',
    manager: '👔',
    admin: '⚙️'
  }
  return emojiMap[persona] || '👤'
}
</script>