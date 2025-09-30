<template>
  <div :class="cardClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  variant?: 'default' | 'elevated' | 'outlined'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  interactive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  interactive: false
})

const cardClasses = computed(() => {
  const base = 'bg-white rounded-lg transition-colors'
  
  const variants = {
    default: 'shadow-sm border border-gray-200',
    elevated: 'shadow-sm border border-gray-100',
    outlined: 'border border-gray-100'
  }
  
  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  const interactive = props.interactive ? 'hover:bg-gray-50 cursor-pointer' : ''
  
  return [base, variants[props.variant], paddings[props.padding], interactive].filter(Boolean).join(' ')
})
</script>