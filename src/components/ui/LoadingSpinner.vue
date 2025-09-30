<template>
  <div class="flex items-center justify-center" :class="containerClass">
    <div class="relative">
      <!-- Primary spinner -->
      <div 
        :class="[
          'border-4 border-gray-200 rounded-full animate-spin',
          sizeClasses.outer,
          `border-t-${color}-600`
        ]"
      ></div>
      
      <!-- Secondary spinner (optional) -->
      <div 
        v-if="variant === 'double'"
        :class="[
          'absolute inset-0 border-4 border-transparent rounded-full animate-spin',
          sizeClasses.outer,
          `border-r-${color}-400`,
          'animation-delay-150'
        ]"
      ></div>
      
      <!-- Pulse dot (for pulse variant) -->
      <div 
        v-if="variant === 'pulse'"
        :class="[
          'absolute inset-0 rounded-full animate-pulse',
          sizeClasses.inner,
          `bg-${color}-600`,
          'opacity-75'
        ]"
      ></div>
    </div>
    
    <!-- Loading text -->
    <div v-if="text" class="ml-3">
      <span :class="textClass">{{ text }}</span>
      <span v-if="showDots" class="loading-dots"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'success' | 'warning' | 'error' | 'gray'
  variant?: 'single' | 'double' | 'pulse'
  text?: string
  showDots?: boolean
  containerClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  color: 'primary',
  variant: 'single',
  showDots: true,
  containerClass: ''
})

const sizeClasses = computed(() => {
  const sizes = {
    sm: { outer: 'w-4 h-4', inner: 'w-2 h-2 m-1' },
    md: { outer: 'w-6 h-6', inner: 'w-3 h-3 m-1.5' },
    lg: { outer: 'w-8 h-8', inner: 'w-4 h-4 m-2' },
    xl: { outer: 'w-12 h-12', inner: 'w-6 h-6 m-3' }
  }
  return sizes[props.size]
})

const textClass = computed(() => {
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  }
  
  const textColors = {
    primary: 'text-primary-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-error-600',
    gray: 'text-gray-600'
  }
  
  return `${textSizes[props.size]} ${textColors[props.color]} font-medium`
})
</script>

<style scoped>
.animation-delay-150 {
  animation-delay: 150ms;
}
</style>