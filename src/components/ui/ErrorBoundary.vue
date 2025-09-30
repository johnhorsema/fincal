<template>
  <div v-if="hasError" class="error-boundary">
    <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-8">
        <div class="text-center">
          <!-- Error icon -->
          <div class="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <svg class="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <!-- Error title -->
          <h2 class="text-2xl font-bold text-gray-900 mb-2">
            {{ errorTitle }}
          </h2>
          
          <!-- Error message -->
          <p class="text-gray-600 mb-6">
            {{ errorMessage }}
          </p>
          
          <!-- Error details (development only) -->
          <div v-if="showDetails && isDevelopment" class="mb-6">
            <details class="text-left">
              <summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700 mb-2">
                Show technical details
              </summary>
              <div class="bg-gray-100 rounded-lg p-4 text-xs font-mono text-gray-800 overflow-auto max-h-40">
                <div class="mb-2">
                  <strong>Error:</strong> {{ error?.message }}
                </div>
                <div v-if="error?.stack" class="mb-2">
                  <strong>Stack:</strong>
                  <pre class="whitespace-pre-wrap">{{ error.stack }}</pre>
                </div>
                <div v-if="errorInfo">
                  <strong>Component Stack:</strong>
                  <pre class="whitespace-pre-wrap">{{ errorInfo }}</pre>
                </div>
              </div>
            </details>
          </div>
          
          <!-- Recovery actions -->
          <div class="space-y-3">
            <button
              v-for="action in recoveryActions"
              :key="action.label"
              @click="action.action"
              :class="[
                'w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium transition-colors',
                action.type === 'retry' ? 'text-white bg-blue-600 hover:bg-blue-700' :
                action.type === 'refresh' ? 'text-white bg-green-600 hover:bg-green-700' :
                action.type === 'navigate' ? 'text-white bg-purple-600 hover:bg-purple-700' :
                'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
              ]"
            >
              {{ action.label }}
            </button>
          </div>
          
          <!-- Error ID for support -->
          <div v-if="errorId" class="mt-6 text-xs text-gray-400">
            Error ID: {{ errorId }}
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, computed, onErrorCaptured, onMounted } from 'vue'
import { globalErrorHandler, getErrorMessage, getRecoveryActions, type RecoveryAction } from '../../utils/errorHandling'

interface Props {
  fallbackTitle?: string
  fallbackMessage?: string
  showDetails?: boolean
  onError?: (error: Error, errorInfo: string) => void
}

const props = withDefaults(defineProps<Props>(), {
  fallbackTitle: 'Something went wrong',
  fallbackMessage: 'An unexpected error occurred. Please try refreshing the page.',
  showDetails: true
})

const emit = defineEmits<{
  error: [error: Error, errorInfo: string]
}>()

// Error state
const hasError = ref(false)
const error = ref<Error | null>(null)
const errorInfo = ref<string>('')
const errorId = ref<string>('')

// Computed properties
const isDevelopment = computed(() => import.meta.env.DEV)

const errorTitle = computed(() => {
  if (!error.value) return props.fallbackTitle
  
  const message = error.value.message.toLowerCase()
  
  if (message.includes('network') || message.includes('fetch')) {
    return 'Connection Problem'
  }
  
  if (message.includes('validation') || message.includes('required')) {
    return 'Invalid Input'
  }
  
  if (message.includes('unauthorized') || message.includes('authentication')) {
    return 'Authentication Required'
  }
  
  if (message.includes('forbidden') || message.includes('permission')) {
    return 'Access Denied'
  }
  
  if (message.includes('server') || message.includes('500')) {
    return 'Server Error'
  }
  
  return props.fallbackTitle
})

const errorMessage = computed(() => {
  if (!error.value) return props.fallbackMessage
  return getErrorMessage(error.value, props.fallbackMessage)
})

const recoveryActions = computed((): RecoveryAction[] => {
  if (!error.value) return []
  
  const enhancedError = globalErrorHandler.handleError(error.value, {
    component: 'ErrorBoundary',
    errorInfo: errorInfo.value
  })
  
  const actions = getRecoveryActions(enhancedError)
  
  // Always add a refresh action if not already present
  if (!actions.some(action => action.type === 'refresh')) {
    actions.push({
      type: 'refresh',
      label: 'Refresh Page',
      description: 'Reload the page to try again',
      action: () => window.location.reload()
    })
  }
  
  return actions
})

// Error handling
onErrorCaptured((err: Error, instance, info: string) => {
  console.error('Error captured by boundary:', err)
  
  hasError.value = true
  error.value = err
  errorInfo.value = info
  
  // Log error with enhanced error handler
  const enhancedError = globalErrorHandler.handleError(err, {
    component: 'ErrorBoundary',
    instance: instance?.$?.type?.name || 'Unknown',
    errorInfo: info
  })
  
  errorId.value = enhancedError.id
  
  // Emit error event
  emit('error', err, info)
  props.onError?.(err, info)
  
  // Prevent the error from propagating further
  return false
})

// Reset error state
const resetError = () => {
  hasError.value = false
  error.value = null
  errorInfo.value = ''
  errorId.value = ''
}

// Expose reset function
defineExpose({
  resetError,
  hasError: computed(() => hasError.value),
  error: computed(() => error.value)
})

// Auto-reset on route change (if using Vue Router)
onMounted(() => {
  // Listen for navigation events to auto-reset
  window.addEventListener('popstate', resetError)
  
  return () => {
    window.removeEventListener('popstate', resetError)
  }
})
</script>

<style scoped>
.error-boundary {
  /* Ensure error boundary takes full height */
  min-height: 100vh;
}

/* Custom scrollbar for error details */
.error-boundary details div {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.error-boundary details div::-webkit-scrollbar {
  width: 6px;
}

.error-boundary details div::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 3px;
}

.error-boundary details div::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.error-boundary details div::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}
</style>