<template>
  <teleport to="body">
    <transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isOpen" class="modal-backdrop" @click="handleBackdropClick">
        <div class="modal-container">
          <div class="flex min-h-full items-center justify-center p-4 sm:p-6">
            <transition
              enter-active-class="transition-all duration-300 ease-out"
              enter-from-class="opacity-0 translate-y-4 scale-95"
              enter-to-class="opacity-100 translate-y-0 scale-100"
              leave-active-class="transition-all duration-200 ease-in"
              leave-from-class="opacity-100 translate-y-0 scale-100"
              leave-to-class="opacity-0 translate-y-4 scale-95"
            >
              <div
                v-if="isOpen"
                :class="[
                  'modal-content w-full',
                  sizeClasses,
                  'mx-4 sm:mx-0'
                ]"
                @click.stop
              >
                <!-- Header -->
                <div v-if="showHeader" class="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
                  <div class="flex items-center space-x-3">
                    <!-- Icon -->
                    <div v-if="icon" :class="['w-8 h-8 rounded-full flex items-center justify-center', iconBgClass]">
                      <component :is="icon" :class="['w-5 h-5', iconColorClass]" />
                    </div>
                    
                    <!-- Title -->
                    <div>
                      <h2 class="text-lg sm:text-xl font-semibold text-gray-900">
                        {{ title }}
                      </h2>
                      <p v-if="subtitle" class="text-sm text-gray-600 mt-1">
                        {{ subtitle }}
                      </p>
                    </div>
                  </div>
                  
                  <!-- Close button -->
                  <button
                    v-if="closable"
                    @click="handleClose"
                    class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <!-- Content -->
                <div :class="['flex-1', contentPadding]">
                  <slot />
                </div>

                <!-- Footer -->
                <div v-if="showFooter" :class="['border-t border-gray-200 px-4 py-3 sm:px-6 sm:py-4', footerClass]">
                  <slot name="footer">
                    <div class="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
                      <button
                        v-if="showCancelButton"
                        @click="handleCancel"
                        class="btn btn-outline w-full sm:w-auto"
                      >
                        {{ cancelText }}
                      </button>
                      <button
                        v-if="showConfirmButton"
                        @click="handleConfirm"
                        :disabled="confirmDisabled"
                        :class="[
                          'btn w-full sm:w-auto',
                          confirmButtonClass
                        ]"
                      >
                        <span v-if="confirmLoading" class="flex items-center space-x-2">
                          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>{{ confirmLoadingText }}</span>
                        </span>
                        <span v-else>{{ confirmText }}</span>
                      </button>
                    </div>
                  </slot>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
type ModalType = 'default' | 'success' | 'warning' | 'error' | 'info'

interface Props {
  isOpen: boolean
  title?: string
  subtitle?: string
  size?: ModalSize
  type?: ModalType
  icon?: any
  closable?: boolean
  closeOnBackdrop?: boolean
  showHeader?: boolean
  showFooter?: boolean
  showCancelButton?: boolean
  showConfirmButton?: boolean
  cancelText?: string
  confirmText?: string
  confirmLoadingText?: string
  confirmLoading?: boolean
  confirmDisabled?: boolean
  contentPadding?: string
  footerClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  type: 'default',
  closable: true,
  closeOnBackdrop: true,
  showHeader: true,
  showFooter: false,
  showCancelButton: true,
  showConfirmButton: true,
  cancelText: 'Cancel',
  confirmText: 'Confirm',
  confirmLoadingText: 'Loading...',
  confirmLoading: false,
  confirmDisabled: false,
  contentPadding: 'p-4 sm:p-6',
  footerClass: 'bg-gray-50'
})

const emit = defineEmits<{
  close: []
  cancel: []
  confirm: []
}>()

const sizeClasses = computed(() => {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full mx-4'
  }
  return sizes[props.size]
})

const iconBgClass = computed(() => {
  const classes = {
    default: 'bg-gray-100',
    success: 'bg-success-100',
    warning: 'bg-warning-100',
    error: 'bg-error-100',
    info: 'bg-info-100'
  }
  return classes[props.type]
})

const iconColorClass = computed(() => {
  const classes = {
    default: 'text-gray-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-error-600',
    info: 'text-info-600'
  }
  return classes[props.type]
})

const confirmButtonClass = computed(() => {
  const classes = {
    default: 'btn-primary',
    success: 'btn-success',
    warning: 'btn-warning',
    error: 'btn-error',
    info: 'btn-primary'
  }
  return classes[props.type]
})

const handleClose = () => {
  emit('close')
}

const handleCancel = () => {
  emit('cancel')
  emit('close')
}

const handleConfirm = () => {
  emit('confirm')
}

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    handleClose()
  }
}

const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.isOpen && props.closable) {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscapeKey)
  // Prevent body scroll when modal is open
  if (props.isOpen) {
    document.body.style.overflow = 'hidden'
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKey)
  // Restore body scroll
  document.body.style.overflow = ''
})

// Watch for isOpen changes to manage body scroll
const toggleBodyScroll = (isOpen: boolean) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
}

// Watch isOpen prop
import { watch } from 'vue'
watch(() => props.isOpen, toggleBodyScroll)
</script>