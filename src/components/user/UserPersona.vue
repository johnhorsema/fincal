<template>
  <div 
    class="persona-card cursor-pointer rounded-lg border-2 transition-all duration-200 hover:shadow-md"
    :class="[
      isSelected 
        ? 'border-blue-500 bg-blue-50 shadow-sm' 
        : 'border-gray-200 bg-white hover:border-gray-300'
    ]"
    @click="$emit('select')"
  >
    <div class="p-3">
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0">
          <div 
            v-if="persona.avatar"
            class="w-8 h-8 rounded-full overflow-hidden"
          >
            <img 
              :src="persona.avatar" 
              :alt="persona.name"
              class="w-full h-full object-cover"
            >
          </div>
          <div 
            v-else
            class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
            :class="getPersonaColor(persona.role)"
          >
            {{ persona.name.charAt(0).toUpperCase() }}
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <h4 class="text-sm font-medium text-gray-900 truncate">
            {{ persona.name }}
          </h4>
          <p class="text-xs text-gray-500 capitalize truncate">
            {{ persona.role }}
          </p>
        </div>
        <div v-if="isSelected" class="flex-shrink-0">
          <svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import type { UserPersona } from '../../types'

interface Props {
  persona: UserPersona
  isSelected?: boolean
}

interface Emits {
  (e: 'select'): void
}

defineProps<Props>()
defineEmits<Emits>()

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