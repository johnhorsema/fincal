<template>
  <transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0 translate-y-2 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-2 scale-95"
  >
    <div
      v-if="visible"
      :class="[
        'notification',
        typeClasses,
        positionClasses
      ]"
      role="alert"
    >
      <div class="flex items-start space-x-3">
        <!-- Icon -->
        <div class="flex-shrink-0">
          <div :class="['w-6 h-6 rounded-full flex items-center justify-center', iconBgClass]">
            <component :is="iconComponent" :class="['w-4 h-4', iconColorClass]" />
          </div>
        </div>
        
        <!-- Content -->
        <div class="flex-1 min-w-0">
          <h4 v-if="title" :class="['text-sm font-medium', titleColorClass]">
            {{ title }}
          </h4>
          <p :class="['text-sm', messageColorClass, { 'mt-1': title }]">
            {{ message }}
          </p>
        </div>
        
        <!-- Close button -->
        <button
          v-if="closable"
          @click="handleClose"
          :class="['flex-shrink-0 p-1 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors', closeButtonClass]"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
      
      <!-- Progress bar for auto-dismiss -->
      <div v-if="autoClose && duration" class="mt-3">
        <div class="w-full bg-black bg-opacity-10 rounded-full h-1">
          <div 
            class="h-1 rounded-full transition-all ease-linear"
            :class="progressBarClass"
            :style="{ width: `${progress}%`, transitionDuration: `${duration}ms` }"
          ></div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, h } from 'vue'

type NotificationType = 'success' | 'error' | 'warning' | 'info'
type Position = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'

interface Props {
  type?: NotificationType
  title?: string
  message: string
  position?: Position
  autoClose?: boolean
  duration?: number
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  position: 'bottom-right',
  autoClose: true,
  duration: 5000,
  closable: true
})

const emit = defineEmits<{
  close: []
}>()

const visible = ref(true)
const progress = ref(0)
let timer: NodeJS.Timeout | null = null
let progressTimer: NodeJS.Timeout | null = null

// Icon components
const CheckIcon = () => h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
  h('path', { 'fill-rule': 'evenodd', d: 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z', 'clip-rule': 'evenodd' })
])

const ExclamationIcon = () => h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
  h('path', { 'fill-rule': 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z', 'clip-rule': 'evenodd' })
])

const InformationIcon = () => h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
  h('path', { 'fill-rule': 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z', 'clip-rule': 'evenodd' })
])

const iconComponent = computed(() => {
  const icons = {
    success: CheckIcon,
    error: ExclamationIcon,
    warning: ExclamationIcon,
    info: InformationIcon
  }
  return icons[props.type]
})

const typeClasses = computed(() => {
  const classes = {
    success: 'notification-success',
    error: 'notification-error',
    warning: 'notification-warning',
    info: 'notification-info'
  }
  return classes[props.type]
})

const positionClasses = computed(() => {
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  }
  return positions[props.position]
})

const iconBgClass = computed(() => {
  const classes = {
    success: 'bg-success-100',
    error: 'bg-error-100',
    warning: 'bg-warning-100',
    info: 'bg-info-100'
  }
  return classes[props.type]
})

const iconColorClass = computed(() => {
  const classes = {
    success: 'text-success-600',
    error: 'text-error-600',
    warning: 'text-warning-600',
    info: 'text-info-600'
  }
  return classes[props.type]
})

const titleColorClass = computed(() => {
  const classes = {
    success: 'text-success-800',
    error: 'text-error-800',
    warning: 'text-warning-800',
    info: 'text-info-800'
  }
  return classes[props.type]
})

const messageColorClass = computed(() => {
  const classes = {
    success: 'text-success-700',
    error: 'text-error-700',
    warning: 'text-warning-700',
    info: 'text-info-700'
  }
  return classes[props.type]
})

const closeButtonClass = computed(() => {
  const classes = {
    success: 'text-success-600 hover:text-success-800',
    error: 'text-error-600 hover:text-error-800',
    warning: 'text-warning-600 hover:text-warning-800',
    info: 'text-info-600 hover:text-info-800'
  }
  return classes[props.type]
})

const progressBarClass = computed(() => {
  const classes = {
    success: 'bg-success-600',
    error: 'bg-error-600',
    warning: 'bg-warning-600',
    info: 'bg-info-600'
  }
  return classes[props.type]
})

const handleClose = () => {
  visible.value = false
  setTimeout(() => {
    emit('close')
  }, 200)
}

const startAutoClose = () => {
  if (props.autoClose && props.duration) {
    // Start progress animation
    setTimeout(() => {
      progress.value = 100
    }, 50)
    
    // Auto close after duration
    timer = setTimeout(() => {
      handleClose()
    }, props.duration)
  }
}

onMounted(() => {
  startAutoClose()
})

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer)
  }
  if (progressTimer) {
    clearTimeout(progressTimer)
  }
})
</script>