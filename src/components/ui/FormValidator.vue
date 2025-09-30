<template>
  <div class="form-validator">
    <slot 
      :validate="validateForm"
      :reset="resetValidation"
      :isValid="isFormValid"
      :hasErrors="hasFormErrors"
      :errors="formErrors"
      :isValidating="isValidating"
      :getFieldError="getFieldError"
      :setFieldError="setFieldError"
      :clearFieldError="clearFieldError"
    />
    
    <!-- Form-level error summary -->
    <transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div v-if="showErrorSummary && hasFormErrors" class="form-error-summary">
        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0">
              <svg class="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="flex-1">
              <h3 class="text-sm font-medium text-red-800 mb-2">
                Please correct the following errors:
              </h3>
              <ul class="text-sm text-red-700 space-y-1">
                <li v-for="(error, field) in formErrors" :key="String(field)" class="flex items-start space-x-2">
                  <span class="font-medium">{{ getFieldLabel(String(field)) }}:</span>
                  <span v-if="Array.isArray(error)">{{ error[0] }}</span>
                  <span v-else>{{ error }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useErrorHandling, type ValidationRule } from '../../composables/useErrorHandling'
import { 
  validateAndSanitizePost, 
  validateAndSanitizeAccount, 
  validateAndSanitizeUser
} from '../../utils/validation'
import type { ValidationResult } from '../../types'

interface Props {
  modelValue?: Record<string, any>
  rules?: Record<string, ValidationRule[]>
  validateOnChange?: boolean
  showErrorSummary?: boolean
  fieldLabels?: Record<string, string>
  sanitize?: boolean
  entityType?: 'post' | 'account' | 'user' | 'transaction' | 'custom'
}

const props = withDefaults(defineProps<Props>(), {
  validateOnChange: true,
  showErrorSummary: true,
  sanitize: true,
  entityType: 'custom'
})

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
  'validate': [isValid: boolean, errors: Record<string, string | string[]>]
  'sanitize': [sanitized: Record<string, any>]
}>()

// Use error handling composable
const {
  formErrors,
  hasFormErrors,
  setFormErrors,
  setFieldError,
  clearFieldError,
  clearFormErrors,

  validateForm: validateFormFields
} = useErrorHandling()

// Component state
const isValidating = ref(false)
const hasBeenValidated = ref(false)

// Computed properties
const isFormValid = computed(() => {
  return hasBeenValidated.value && !hasFormErrors.value
})

// Methods
const getFieldLabel = (field: string): string => {
  if (props.fieldLabels && props.fieldLabels[field]) {
    return props.fieldLabels[field]
  }
  
  // Convert camelCase to Title Case
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

const getFieldError = (field: string): string[] | undefined => {
  const error = formErrors.value[field]
  if (Array.isArray(error)) {
    return error as string[]
  }
  return error ? [error as string] : undefined
}

const validateEntitySpecific = (data: Record<string, any>): ValidationResult & { sanitized?: Record<string, any> } => {
  switch (props.entityType) {
    case 'post':
      return validateAndSanitizePost(data)
    case 'account':
      return validateAndSanitizeAccount(data)
    case 'user':
      return validateAndSanitizeUser(data)
    case 'transaction':
      // Transaction validation would be implemented here
      return { isValid: true, errors: [], sanitized: data }
    default:
      // Custom validation using rules
      if (props.rules) {
        const isValid = validateFormFields(data, props.rules)
        return { 
          isValid, 
          errors: isValid ? [] : Object.values(formErrors.value).flat().filter((error): error is string => typeof error === 'string'),
          sanitized: data 
        }
      }
      return { isValid: true, errors: [], sanitized: data }
  }
}

const validateForm = async (): Promise<{ isValid: boolean; sanitized?: Record<string, any> }> => {
  if (!props.modelValue) {
    return { isValid: false }
  }

  isValidating.value = true
  clearFormErrors()

  try {
    const result = validateEntitySpecific(props.modelValue)
    
    if (!result.isValid) {
      // Convert errors array to form errors object
      const errors: Record<string, string[]> = {}
      result.errors.forEach(error => {
        // Try to extract field name from error message
        const fieldMatch = error.match(/^(\w+):\s*(.+)$/)
        if (fieldMatch) {
          const [, field, message] = fieldMatch
          if (!errors[field]) errors[field] = []
          errors[field].push(message)
        } else {
          // Generic error
          if (!errors.general) errors.general = []
          errors.general.push(error)
        }
      })
      
      setFormErrors(errors)
    }

    hasBeenValidated.value = true
    
    // Emit validation result
    const errorRecord: Record<string, string | string[]> = {}
    Object.entries(formErrors.value).forEach(([key, value]) => {
      errorRecord[key] = Array.isArray(value) ? value : [value]
    })
    emit('validate', result.isValid, errorRecord)
    
    // Emit sanitized data if available
    if (result.sanitized && props.sanitize) {
      emit('sanitize', result.sanitized)
    }

    return {
      isValid: result.isValid,
      sanitized: result.sanitized
    }
  } finally {
    isValidating.value = false
  }
}

const resetValidation = () => {
  clearFormErrors()
  hasBeenValidated.value = false
  isValidating.value = false
}

// Watch for model changes and validate if enabled
watch(() => props.modelValue, (newValue) => {
  if (props.validateOnChange && hasBeenValidated.value && newValue) {
    validateForm()
  }
}, { deep: true })

// Expose methods for parent components
defineExpose({
  validateForm,
  resetValidation,
  isValid: isFormValid,
  hasErrors: hasFormErrors,
  errors: formErrors,
  isValidating: computed(() => isValidating.value)
})
</script>

<style scoped>
.form-validator {
  /* Container styles */
}

.form-error-summary {
  /* Error summary styles */
}
</style>