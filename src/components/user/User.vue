<template>
  <div class="user-profile bg-white rounded-lg shadow-sm border p-4">
    <div class="flex items-center space-x-3">
      <div class="flex-shrink-0">
        <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
          {{ user.name.charAt(0).toUpperCase() }}
        </div>
      </div>
      <div class="flex-1 min-w-0">
        <h3 class="text-sm font-medium text-gray-900 truncate">
          {{ user.name }}
        </h3>
        <p class="text-sm text-gray-500 truncate">
          {{ user.email }}
        </p>
      </div>
      <div class="flex-shrink-0">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {{ user.personas.length }} persona{{ user.personas.length !== 1 ? 's' : '' }}
        </span>
      </div>
    </div>
    
    <div v-if="showPersonas && user.personas.length > 0" class="mt-4 space-y-2">
      <h4 class="text-xs font-medium text-gray-700 uppercase tracking-wide">Available Personas</h4>
      <div class="grid grid-cols-1 gap-2">
        <UserPersona
          v-for="persona in user.personas"
          :key="persona.id"
          :persona="persona"
          :is-selected="selectedPersonaId === persona.id"
          @select="$emit('persona-selected', persona)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'
import type { User, UserPersona as UserPersonaType } from '../../types'
import UserPersona from './UserPersona.vue'

interface Props {
  user: User
  selectedPersonaId?: string
  showPersonas?: boolean
}

interface Emits {
  (e: 'persona-selected', persona: UserPersonaType): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>