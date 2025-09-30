<template>
  <div class="global-error-handler">
    <!-- Error notifications container -->
    <div class="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      <transition-group
        name="notification"
        tag="div"
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-x-full scale-95"
        enter-to-class="opacity-100 translate-x-0 scale-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-x-0 scale-100"
        leave-to-class="opacity-0 translate-x-full scale-95"
      >
        <div
          v-for="error in visibleErrors"
          :key="error.id"
          :class="[
            'notification-card',
            severityClasses[error.severity]
          ]"
        >
          <div class="flex items-start space-x-3">
            <!-- Error icon -->
            <div class="flex-shrink-0">
              <div :class="['w-8 h-8 rounded-full flex items-center justify-center', iconBgClasses[error.severity]]">
                <component :is="getErrorIcon(error.severity)" :class="['w-4 h-4', iconClasses[error.severity]]" />
              </div>
            </div>
            
            <!-- Error content -->
            <div class="flex-1 min-w-0">
              <h4 :class="['text-sm font-semibold', titleClasses[error.severity]]">
                {{ getErrorTitle(error) }}
              </h4>
              <p :class="['text-sm mt-1', messageClasses[error.severity]]">
                {{ error.message }}
              </p>
              
              <!-- Recovery actions -->
              <div v-if="error.retryable && getRecoveryActions(error).length > 0" class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="action in getRecoveryActions(error)"
                  :key="action.label"
                  @click="executeAction(action, error)"
                  :class="[
                    'text-xs px-3 py-1 rounded-full font-medium transition-colors',
                    actionClasses[error.severity]
                  ]"
                >
                  {{ action.label }}
                </button>
              </div>
              
              <!-- Error details (development only) -->
              <details v-if="isDevelopment && error.stack" class="mt-2">
                <summary class="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                  Technical details
                </summary>
                <pre class="text-xs text-gray-600 mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-20">{{ error.stack }}</pre>
              </details>
            </div>
            
            <!-- Close button -->
            <button
              @click="dismissError(error.id)"
              :class="['flex-shrink-0 p-1 rounded-md transition-colors', closeButtonClasses[error.severity]]"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
          
          <!-- Auto-dismiss progress bar -->
          <div v-if="error.autoDismiss" class="mt-3">
            <div class="w-full bg-black bg-opacity-10 rounded-full h-1">
              <div 
                :class="['h-1 rounded-full transition-all ease-linear', progressBarClasses[error.severity]]"
                :style="{ 
                  width: `${getProgress(error)}%`, 
                  transitionDuration: `${error.remainingTime}ms` 
                }"
              ></div>
            </div>
          </div>
        </div>
      </transition-group>
    </div>
    
    <!-- Critical error overlay -->
    <div
      v-if="criticalError"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center space-x-3 mb-4">
          <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900">Critical Error</h3>
        </div>
        
        <p class="text-gray-600 mb-6">{{ criticalError.message }}</p>
        
        <div class="flex space-x-3">
          <button
            v-for="action in getRecoveryActions(criticalError)"
            v-if="criticalError.retryable && getRecoveryActions(criticalError).length > 0"
            :key="action.label"
            @click="executeAction(action, criticalError)"
            :class="[
              'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              action.type === 'retry' ? 'bg-blue-600 text-white hover:bg-blue-700' :
              action.type === 'refresh' ? 'bg-green-600 text-white hover:bg-green-700' :
              'bg-gray-200 text-gray-800 hover:bg-gray-300'
            ]"
          >
            {{ action.label }}
          </button>
        </div>
        
        <div v-if="criticalError.id" class="mt-4 text-xs text-gray-400 text-center">
          Error ID: {{ criticalError.id }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useGlobalErrorHandler } from '../../composables/useErrorHandling'
import type { EnhancedError, RecoveryAction } from '../../utils/errorHandling'
import { getRecoveryActions } from '../../utils/errorHandling'

interface ErrorNotification extends EnhancedError {
  autoDismiss: boolean
  dismissTime: number
  remainingTime: number
}

// Composables
const { errors, clearErrors } = useGlobalErrorHandler()

// Component state
const notifications = ref<ErrorNotification[]>([])
const criticalError = ref<ErrorNotification | null>(null)

// Constants
const AUTO_DISMISS_DURATION = 8000 // 8 seconds
const CRITICAL_DISMISS_DURATION = 0 // Never auto-dismiss critical errors

// Computed properties
const isDevelopment = computed(() => import.meta.env.DEV)

const visibleErrors = computed(() => {
  return notifications.value.filter(error => 
    error.severity !== 'critical' && 
    Date.now() - error.timestamp.getTime() < error.dismissTime
  )
})

// Styling classes
const severityClasses = {
  low: 'notification-info',
  medium: 'notification-warning', 
  high: 'notification-error',
  critical: 'notification-critical'
}

const iconBgClasses = {
  low: 'bg-blue-100',
  medium: 'bg-yellow-100',
  high: 'bg-red-100',
  critical: 'bg-red-200'
}

const iconClasses = {
  low: 'text-blue-600',
  medium: 'text-yellow-600',
  high: 'text-red-600',
  critical: 'text-red-700'
}

const titleClasses = {
  low: 'text-blue-800',
  medium: 'text-yellow-800',
  high: 'text-red-800',
  critical: 'text-red-900'
}

const messageClasses = {
  low: 'text-blue-700',
  medium: 'text-yellow-700',
  high: 'text-red-700',
  critical: 'text-red-800'
}

const actionClasses = {
  low: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  high: 'bg-red-100 text-red-800 hover:bg-red-200',
  critical: 'bg-red-200 text-red-900 hover:bg-red-300'
}

const closeButtonClasses = {
  low: 'text-blue-400 hover:text-blue-600 hover:bg-blue-100',
  medium: 'text-yellow-400 hover:text-yellow-600 hover:bg-yellow-100',
  high: 'text-red-400 hover:text-red-600 hover:bg-red-100',
  critical: 'text-red-500 hover:text-red-700 hover:bg-red-100'
}

const progressBarClasses = {
  low: 'bg-blue-600',
  medium: 'bg-yellow-600',
  high: 'bg-red-600',
  critical: 'bg-red-700'
}

// Icon components
const InfoIcon = () => h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
  h('path', { 'fill-rule': 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z', 'clip-rule': 'evenodd' })
])

const WarningIcon = () => h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
  h('path', { 'fill-rule': 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z', 'clip-rule': 'evenodd' })
])

const ErrorIcon = () => h('svg', { fill: 'currentColor', viewBox: '0 0 20 20' }, [
  h('path', { 'fill-rule': 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z', 'clip-rule': 'evenodd' })
])

// Methods
const getErrorIcon = (severity: string) => {
  const icons = {
    low: InfoIcon,
    medium: WarningIcon,
    high: ErrorIcon,
    critical: ErrorIcon
  }
  return icons[severity as keyof typeof icons] || InfoIcon
}

const getErrorTitle = (error: ErrorNotification): string => {
  const titles = {
    low: 'Information',
    medium: 'Warning',
    high: 'Error',
    critical: 'Critical Error'
  }
  
  // Customize based on category
  if (error.category === 'network') return 'Connection Problem'
  if (error.category === 'validation') return 'Invalid Input'
  if (error.category === 'authentication') return 'Authentication Required'
  if (error.category === 'authorization') return 'Access Denied'
  if (error.category === 'business') return 'Business Rule Violation'
  
  return titles[error.severity] || 'Notification'
}

const getProgress = (error: ErrorNotification): number => {
  if (!error.autoDismiss) return 0
  
  const elapsed = Date.now() - error.timestamp.getTime()
  const total = error.dismissTime - error.timestamp.getTime()
  return Math.max(0, Math.min(100, (elapsed / total) * 100))
}

const addError = (error: EnhancedError) => {
  const notification: ErrorNotification = {
    ...error,
    autoDismiss: error.severity !== 'critical',
    dismissTime: error.severity === 'critical' 
      ? Date.now() + (24 * 60 * 60 * 1000) // 24 hours for critical
      : Date.now() + AUTO_DISMISS_DURATION,
    remainingTime: error.severity === 'critical' 
      ? CRITICAL_DISMISS_DURATION 
      : AUTO_DISMISS_DURATION
  }
  
  if (error.severity === 'critical') {
    criticalError.value = notification
  } else {
    notifications.value.unshift(notification)
    
    // Limit number of visible notifications
    if (notifications.value.length > 5) {
      notifications.value = notifications.value.slice(0, 5)
    }
    
    // Auto-dismiss
    if (notification.autoDismiss) {
      setTimeout(() => {
        dismissError(notification.id)
      }, AUTO_DISMISS_DURATION)
    }
  }
}

const dismissError = (errorId: string) => {
  notifications.value = notifications.value.filter(error => error.id !== errorId)
  
  if (criticalError.value?.id === errorId) {
    criticalError.value = null
  }
}

const executeAction = async (action: RecoveryAction, error: ErrorNotification) => {
  try {
    await action.action()
    
    // Dismiss error after successful action (except ignore type)
    if (action.type !== 'ignore') {
      dismissError(error.id)
    }
  } catch (actionError) {
    console.error('Recovery action failed:', actionError)
    // Could show another error notification here
  }
}

const clearAllErrors = () => {
  notifications.value = []
  criticalError.value = null
  clearErrors()
}

// Lifecycle
onMounted(() => {
  // Subscribe to global error events
  errors.value.forEach(error => addError(error))
  
  // Listen for new errors
  window.addEventListener('error', (event) => {
    const error = {
      id: crypto.randomUUID(),
      message: event.message,
      category: 'client' as const,
      severity: 'high' as const,
      timestamp: new Date(),
      recoverable: true,
      retryable: false,
      stack: event.error?.stack,
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    }
    addError(error)
  })
  
  window.addEventListener('unhandledrejection', (event) => {
    const error = {
      id: crypto.randomUUID(),
      message: event.reason?.message || 'Unhandled promise rejection',
      category: 'client' as const,
      severity: 'high' as const,
      timestamp: new Date(),
      recoverable: true,
      retryable: true,
      stack: event.reason?.stack,
      context: {
        promise: event.promise
      }
    }
    addError(error)
  })
})

// Expose methods for external use
defineExpose({
  addError,
  dismissError,
  clearAllErrors
})
</script>

<style scoped>
.notification-card {
  @apply bg-white rounded-lg shadow-lg border p-4 max-w-sm;
}

.notification-info {
  @apply border-blue-200;
}

.notification-warning {
  @apply border-yellow-200;
}

.notification-error {
  @apply border-red-200;
}

.notification-critical {
  @apply border-red-300 bg-red-50;
}

/* Transition animations */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.95);
}
</style>