<template>
  <div class="persona-selector">
    <label v-if="label" class="block text-sm font-medium text-gray-700 mb-2">
      {{ label }}
    </label>
    
    <div class="relative">
      <button
        type="button"
        class="relative w-full bg-white border border-gray-200 rounded-md pl-3 pr-8 py-3 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
        :class="{ 'border-red-300 focus:ring-red-500 focus:border-red-500': error }"
        @click="toggleDropdown"
      >
        <div v-if="selectedPersona" class="flex items-center space-x-3">
          <div class="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-sm font-medium">
            {{ selectedPersona.name.charAt(0).toUpperCase() }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <span class="text-gray-900 font-medium">{{ selectedPersona.name }}</span>
              <span class="text-gray-500 text-sm">({{ selectedPersona.role }})</span>
            </div>
          </div>
        </div>
        <span v-else class="text-gray-500">
          {{ placeholder }}
        </span>
        <span class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg class="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </span>
      </button>

      <div
        v-if="isOpen"
        class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-sm max-h-60 overflow-auto"
      >
        <div
          v-for="persona in personas"
          :key="persona.id"
          class="cursor-pointer select-none py-3 px-3 hover:bg-gray-50 transition-colors"
          :class="{ 'bg-gray-50': selectedPersona?.id === persona.id }"
          @click="selectPersona(persona)"
        >
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {{ persona.name.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <span class="text-gray-900 font-medium">{{ persona.name }}</span>
                <span class="text-gray-500 text-sm">({{ persona.role }})</span>
              </div>
            </div>
          </div>
        </div>
        
        <div v-if="personas.length === 0" class="py-3 px-3 text-gray-500 text-sm">
          No personas available
        </div>
      </div>
    </div>
    
    <p v-if="error" class="mt-1 text-sm text-red-600">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, onMounted, onUnmounted } from 'vue'
import type { UserPersona } from '../../types'

interface Props {
  personas: UserPersona[]
  selectedPersona?: UserPersona | null
  label?: string
  placeholder?: string
  error?: string
}

interface Emits {
  (e: 'update:selectedPersona', persona: UserPersona | null): void
  (e: 'change', persona: UserPersona | null): void
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select a persona...',
  label: ''
})

const emit = defineEmits<Emits>()

const isOpen = ref(false)

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function selectPersona(persona: UserPersona) {
  emit('update:selectedPersona', persona)
  emit('change', persona)
  isOpen.value = false
}

function closeDropdown() {
  isOpen.value = false
}



// Close dropdown when clicking outside
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement
  if (!target.closest('.persona-selector')) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>