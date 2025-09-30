<template>
  <div class="validated-input">
    <!-- Label -->
    <label 
      v-if="label" 
      :for="inputId"
      :class="[
        'block text-sm font-medium mb-2',
        hasError ? 'text-red-700' : 'text-gray-700'
      ]"
    >
      {{ label }}
      <span v-if="required" class="text-red-500 ml-1">*</span>
    </label>
    
    <!-- Input wrapper -->
    <div class="relative">
      <!-- Text input -->
      <input
        v-if="type !== 'textarea' && type !== 'select'"
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxLength"
        :min="min"
        :max="max"
        :step="step"
        :autocomplete="autocomplete"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      />
      
      <!-- Textarea -->
      <textarea
        v-else-if="type === 'textarea'"
        :id="inputId"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :maxlength="maxLength"
        :rows="rows"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      />
      
      <!-- Select -->
      <select
        v-else-if="type === 'select'"
        :id="inputId"
        :value="modelValue"
        :disabled="disabled"
        :class="inputClasses"
        @change="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      
      <!-- Loading indicator -->
      <div
        v-if="isValidating"
        class="absolute right-3 top-1/2 transform -translate-y-1/2"
      >
        <div class="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
      
      <!-- Success indicator -->
      <div
        v-else-if="isValid && hasBeenValidated"
        class="absolute right-3 top-1/2 transform -translate-y-1/2"
      >
        <svg class="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
      </div>
      
      <!-- Error indicator -->
      <div
        v-else-if="hasError"
        class="absolute right-3 top-1/2 transform -translate-y-1/2"
      >
        <svg class="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </div>
      
      <!-- Character count (for text inputs with maxLength) -->
      <div
        v-if="showCharCount && maxLength"
        class="absolute bottom-2 right-3 text-xs"
        :class="{
          'text-red-500': characterCount > maxLength * 0.9,
          'text-yellow-500': characterCount > maxLength * 0.8,
          'text-gray-400': characterCount <= maxLength * 0.8
        }"
      >
        {{ characterCount }}/{{ maxLength }}
      </div>
    </div>
    
    <!-- Help text -->
    <p v-if="helpText && !hasError" class="mt-1 text-sm text-gray-500">
      {{ helpText }}
    </p>
    
    <!-- Error messages -->
    <transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <div v-if="hasError" class="mt-1">
        <p
          v-for="error in errorMessages"
          :key="error"
          class="text-sm text-red-600 flex items-center space-x-1"
        >
          <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>{{ error }}</span>
        </p>
      </div>
    </transition>
    
    <!-- Success message -->
    <transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-1"
    >
      <p v-if="successMessage && isValid && hasBeenValidated" class="mt-1 text-sm text-green-600 flex items-center space-x-1">
        <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        <span>{{ successMessage }}</span>
      </p>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { sanitizeText, sanitizeAmount, sanitizeEmail } from '../../utils/validation'
import type { ValidationRule } from '../../composables/useErrorHandling'

interface Option {
  value: string | number
  label: string
}

interface Props {
  modelValue: string | number
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select'
  label?: string
  placeholder?: string
  helpText?: string
  successMessage?: string
  required?: boolean
  disabled?: boolean
  readonly?: boolean
  maxLength?: number
  min?: number | string
  max?: number | string
  step?: number | string
  rows?: number
  autocomplete?: string
  showCharCount?: boolean
  validateOnInput?: boolean
  validateOnBlur?: boolean
  sanitize?: boolean
  rules?: ValidationRule[]
  options?: Option[] // For select inputs
  debounceMs?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false,
  readonly: false,
  rows: 3,
  showCharCount: false,
  validateOnInput: true,
  validateOnBlur: true,
  sanitize: true,
  debounceMs: 300
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
  'validate': [isValid: boolean, errors: string[]]
  'focus': [event: FocusEvent]
  'blur': [event: FocusEvent]
}>()

// Component state
const inputId = ref(`input-${Math.random().toString(36).substr(2, 9)}`)
const isFocused = ref(false)
const hasBeenValidated = ref(false)
const isValidating = ref(false)
const validationErrors = ref<string[]>([])
const debounceTimer = ref<NodeJS.Timeout | null>(null)

// Computed properties
const characterCount = computed(() => {
  return String(props.modelValue || '').length
})

const hasError = computed(() => {
  return validationErrors.value.length > 0
})

const isValid = computed(() => {
  return hasBeenValidated.value && validationErrors.value.length === 0
})

const errorMessages = computed(() => {
  return validationErrors.value
})

const inputClasses = computed(() => {
  const baseClasses = [
    'block w-full px-3 py-2 border rounded-md shadow-sm transition-colors duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    'readonly:bg-gray-50 readonly:cursor-default'
  ]
  
  if (hasError.value) {
    baseClasses.push(
      'border-red-300 text-red-900 placeholder-red-300',
      'focus:ring-red-500 focus:border-red-500',
      'bg-red-50'
    )
  } else if (isValid.value && hasBeenValidated.value) {
    baseClasses.push(
      'border-green-300 text-green-900',
      'focus:ring-green-500 focus:border-green-500',
      'bg-green-50'
    )
  } else if (isFocused.value) {
    baseClasses.push(
      'border-blue-300',
      'focus:ring-blue-500 focus:border-blue-500'
    )
  } else {
    baseClasses.push(
      'border-gray-300 text-gray-900 placeholder-gray-400',
      'focus:ring-blue-500 focus:border-blue-500'
    )
  }
  
  // Add padding for icons
  if (props.type !== 'textarea') {
    baseClasses.push('pr-10')
  }
  
  // Add padding for character count
  if (props.showCharCount && props.maxLength && props.type === 'textarea') {
    baseClasses.push('pb-6')
  }
  
  return baseClasses.join(' ')
})

// Methods
const sanitizeValue = (value: string | number): string | number => {
  if (!props.sanitize || typeof value !== 'string') {
    return value
  }
  
  switch (props.type) {
    case 'email':
      return sanitizeEmail(value)
    case 'number':
      return sanitizeAmount(value)
    default:
      return sanitizeText(value)
  }
}

const validateValue = async (value: string | number): Promise<{ isValid: boolean; errors: string[] }> => {
  const errors: string[] = []
  
  // Required validation
  if (props.required && (!value || String(value).trim() === '')) {
    errors.push(`${props.label || 'This field'} is required`)
  }
  
  // Type-specific validation
  if (value && String(value).trim() !== '') {
    switch (props.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(String(value))) {
          errors.push('Please enter a valid email address')
        }
        break
        
      case 'number':
        if (isNaN(Number(value))) {
          errors.push('Please enter a valid number')
        } else {
          const numValue = Number(value)
          if (props.min !== undefined && numValue < Number(props.min)) {
            errors.push(`Value must be at least ${props.min}`)
          }
          if (props.max !== undefined && numValue > Number(props.max)) {
            errors.push(`Value must be no more than ${props.max}`)
          }
        }
        break
        
      case 'url':
        try {
          new URL(String(value))
        } catch {
          errors.push('Please enter a valid URL')
        }
        break
    }
    
    // Length validation
    if (props.maxLength && String(value).length > props.maxLength) {
      errors.push(`Must be ${props.maxLength} characters or less`)
    }
  }
  
  // Custom rules validation
  if (props.rules && value) {
    for (const rule of props.rules) {
      const result = rule.validate(value)
      if (!result.isValid) {
        errors.push(result.message)
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

const performValidation = async (value: string | number) => {
  isValidating.value = true
  
  try {
    const result = await validateValue(value)
    validationErrors.value = result.errors
    hasBeenValidated.value = true
    
    emit('validate', result.isValid, result.errors)
  } finally {
    isValidating.value = false
  }
}

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  let value: string | number = target.value
  
  // Sanitize input
  value = sanitizeValue(value)
  
  // Update model
  emit('update:modelValue', value)
  
  // Debounced validation on input
  if (props.validateOnInput) {
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
    }
    
    debounceTimer.value = setTimeout(() => {
      performValidation(value)
    }, props.debounceMs)
  }
}

const handleBlur = (event: FocusEvent) => {
  isFocused.value = false
  emit('blur', event)
  
  // Clear debounce timer and validate immediately on blur
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
    debounceTimer.value = null
  }
  
  if (props.validateOnBlur) {
    performValidation(props.modelValue)
  }
}

const handleFocus = (event: FocusEvent) => {
  isFocused.value = true
  emit('focus', event)
}

// Reset validation state when value changes externally
watch(() => props.modelValue, (newValue, oldValue) => {
  if (newValue !== oldValue && hasBeenValidated.value) {
    // Reset validation state when value changes externally
    hasBeenValidated.value = false
    validationErrors.value = []
  }
})

// Expose validation method for external use
defineExpose({
  validate: () => performValidation(props.modelValue),
  reset: () => {
    hasBeenValidated.value = false
    validationErrors.value = []
    isValidating.value = false
  },
  focus: () => {
    nextTick(() => {
      const input = document.getElementById(inputId.value)
      input?.focus()
    })
  },
  isValid: computed(() => isValid.value),
  hasError: computed(() => hasError.value),
  errors: computed(() => validationErrors.value)
})
</script>

<style scoped>
/* Custom styles for better UX */
.validated-input input:focus,
.validated-input textarea:focus,
.validated-input select:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.validated-input input.border-red-300:focus,
.validated-input textarea.border-red-300:focus,
.validated-input select.border-red-300:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

.validated-input input.border-green-300:focus,
.validated-input textarea.border-green-300:focus,
.validated-input select.border-green-300:focus {
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
}
</style>