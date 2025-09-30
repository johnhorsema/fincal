import { ref, computed, reactive, readonly } from 'vue'
import { ApiError } from '../api/client'
import { 
  globalErrorHandler, 
  getErrorMessage, 
  getRecoveryActions, 
  type EnhancedError,
  type RecoveryAction 
} from '../utils/errorHandling'

// Error state interface
interface ErrorState {
  hasError: boolean
  error: Error | null
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  recoveryActions: RecoveryAction[]
  timestamp: Date | null
  context?: Record<string, any>
}

// Form error interface
interface FormErrors {
  [field: string]: string | string[]
}

// Validation error interface
interface ValidationError {
  field: string
  message: string
  value?: any
}

export function useErrorHandling() {
  // Global error state
  const errorState = reactive<ErrorState>({
    hasError: false,
    error: null,
    message: '',
    severity: 'low',
    recoveryActions: [],
    timestamp: null,
    context: undefined
  })

  // Form-specific errors
  const formErrors = ref<FormErrors>({})
  const validationErrors = ref<ValidationError[]>([])

  // Loading states for error recovery
  const isRetrying = ref(false)
  const retryCount = ref(0)
  const maxRetries = ref(3)

  // Computed properties
  const hasGlobalError = computed(() => errorState.hasError)
  const hasFormErrors = computed(() => Object.keys(formErrors.value).length > 0)
  const hasValidationErrors = computed(() => validationErrors.value.length > 0)
  const hasAnyError = computed(() => hasGlobalError.value || hasFormErrors.value || hasValidationErrors.value)

  const canRetry = computed(() => {
    return errorState.error && 
           retryCount.value < maxRetries.value && 
           errorState.recoveryActions.some(action => action.type === 'retry')
  })

  // Error handling functions
  const handleError = (error: Error | ApiError | string, context?: Record<string, any>) => {
    const enhancedError = globalErrorHandler.handleError(error, context)
    
    errorState.hasError = true
    errorState.error = typeof error === 'string' ? new Error(error) : error
    errorState.message = getErrorMessage(error)
    errorState.severity = enhancedError.severity
    errorState.recoveryActions = getRecoveryActions(enhancedError)
    errorState.timestamp = new Date()
    errorState.context = context

    return enhancedError
  }

  const handleApiError = (error: ApiError, context?: Record<string, any>) => {
    // Handle specific API error cases
    if (error.status === 422 && error.details.details) {
      // Handle validation errors from server
      setFormErrors(error.details.details)
    }

    return handleError(error, { ...context, apiStatus: error.status })
  }

  const handleValidationError = (errors: ValidationError[]) => {
    validationErrors.value = errors
    
    // Also set form errors for easier access
    const formErrorsObj: FormErrors = {}
    errors.forEach(error => {
      if (formErrorsObj[error.field]) {
        if (Array.isArray(formErrorsObj[error.field])) {
          (formErrorsObj[error.field] as string[]).push(error.message)
        } else {
          formErrorsObj[error.field] = [formErrorsObj[error.field] as string, error.message]
        }
      } else {
        formErrorsObj[error.field] = error.message
      }
    })
    
    setFormErrors(formErrorsObj)
  }

  const setFormErrors = (errors: FormErrors) => {
    formErrors.value = { ...errors }
  }

  const setFieldError = (field: string, message: string | string[]) => {
    formErrors.value[field] = message
  }

  const clearFieldError = (field: string) => {
    delete formErrors.value[field]
  }

  const clearFormErrors = () => {
    formErrors.value = {}
    validationErrors.value = []
  }

  const clearGlobalError = () => {
    errorState.hasError = false
    errorState.error = null
    errorState.message = ''
    errorState.severity = 'low'
    errorState.recoveryActions = []
    errorState.timestamp = null
    errorState.context = undefined
    retryCount.value = 0
  }

  const clearAllErrors = () => {
    clearGlobalError()
    clearFormErrors()
  }

  // Recovery actions
  const retry = async (action?: () => Promise<void> | void) => {
    if (!canRetry.value) return

    isRetrying.value = true
    retryCount.value++

    try {
      if (action) {
        await action()
      } else {
        // Default retry action
        window.location.reload()
      }
      
      clearGlobalError()
    } catch (error) {
      handleError(error as Error, { retryAttempt: retryCount.value })
    } finally {
      isRetrying.value = false
    }
  }

  const executeRecoveryAction = async (action: RecoveryAction) => {
    try {
      if (action.type === 'retry') {
        await retry(action.action)
      } else {
        await action.action()
        if (action.type !== 'ignore') {
          clearGlobalError()
        }
      }
    } catch (error) {
      handleError(error as Error, { recoveryAction: action.type })
    }
  }

  // Utility functions
  const getFieldError = (field: string): string | string[] | undefined => {
    return formErrors.value[field]
  }

  const hasFieldError = (field: string): boolean => {
    return field in formErrors.value
  }

  const getFieldErrorMessage = (field: string): string => {
    const error = formErrors.value[field]
    if (!error) return ''
    
    if (Array.isArray(error)) {
      return error[0] // Return first error
    }
    
    return error
  }

  const getFieldErrorMessages = (field: string): string[] => {
    const error = formErrors.value[field]
    if (!error) return []
    
    if (Array.isArray(error)) {
      return error
    }
    
    return [error]
  }

  // Async operation wrapper with error handling
  const withErrorHandling = async <T>(
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T | null> => {
    try {
      clearAllErrors()
      return await operation()
    } catch (error) {
      if (error instanceof ApiError) {
        handleApiError(error, context)
      } else {
        handleError(error as Error, context)
      }
      return null
    }
  }

  // Form submission wrapper
  const handleFormSubmit = async <T>(
    submitFn: () => Promise<T>,
    options?: {
      clearErrorsOnStart?: boolean
      context?: Record<string, any>
    }
  ): Promise<T | null> => {
    const { clearErrorsOnStart = true, context } = options || {}
    
    if (clearErrorsOnStart) {
      clearAllErrors()
    }

    try {
      return await submitFn()
    } catch (error) {
      if (error instanceof ApiError) {
        handleApiError(error, { ...context, formSubmission: true })
      } else {
        handleError(error as Error, { ...context, formSubmission: true })
      }
      return null
    }
  }

  // Validation helpers
  const validateField = (field: string, value: any, rules: ValidationRule[]): boolean => {
    clearFieldError(field)
    
    for (const rule of rules) {
      const result = rule.validate(value)
      if (!result.isValid) {
        setFieldError(field, result.message)
        return false
      }
    }
    
    return true
  }

  const validateForm = (data: Record<string, any>, rules: Record<string, ValidationRule[]>): boolean => {
    clearFormErrors()
    let isValid = true
    
    for (const [field, fieldRules] of Object.entries(rules)) {
      const fieldValid = validateField(field, data[field], fieldRules)
      if (!fieldValid) {
        isValid = false
      }
    }
    
    return isValid
  }

  return {
    // State
    errorState: readonly(errorState),
    formErrors: readonly(formErrors),
    validationErrors: readonly(validationErrors),
    isRetrying: readonly(isRetrying),
    retryCount: readonly(retryCount),
    
    // Computed
    hasGlobalError,
    hasFormErrors,
    hasValidationErrors,
    hasAnyError,
    canRetry,
    
    // Error handling
    handleError,
    handleApiError,
    handleValidationError,
    setFormErrors,
    setFieldError,
    clearFieldError,
    clearFormErrors,
    clearGlobalError,
    clearAllErrors,
    
    // Recovery
    retry,
    executeRecoveryAction,
    
    // Utilities
    getFieldError,
    hasFieldError,
    getFieldErrorMessage,
    getFieldErrorMessages,
    withErrorHandling,
    handleFormSubmit,
    validateField,
    validateForm
  }
}

// Validation rule interface
export interface ValidationRule {
  validate: (value: any) => { isValid: boolean; message: string }
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value: any) => ({
      isValid: value !== null && value !== undefined && value !== '',
      message
    })
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value: any) => {
      const length = value ? value.toString().length : 0
      return {
        isValid: length >= min,
        message: message || `Must be at least ${min} characters`
      }
    }
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value: any) => {
      const length = value ? value.toString().length : 0
      return {
        isValid: length <= max,
        message: message || `Must be no more than ${max} characters`
      }
    }
  }),

  email: (message = 'Must be a valid email address'): ValidationRule => ({
    validate: (value: any) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      return {
        isValid: !value || emailRegex.test(value),
        message
      }
    }
  }),

  numeric: (message = 'Must be a number'): ValidationRule => ({
    validate: (value: any) => ({
      isValid: !value || !isNaN(Number(value)),
      message
    })
  }),

  positive: (message = 'Must be a positive number'): ValidationRule => ({
    validate: (value: any) => ({
      isValid: !value || (Number(value) > 0),
      message
    })
  }),

  uuid: (message = 'Must be a valid UUID'): ValidationRule => ({
    validate: (value: any) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      return {
        isValid: !value || uuidRegex.test(value),
        message
      }
    }
  })
}

// Global error handler composable for app-wide error handling
export function useGlobalErrorHandler() {
  const errors = ref<EnhancedError[]>([])
  const isVisible = ref(false)
  const currentError = ref<EnhancedError | null>(null)

  // Subscribe to global error handler
  const unsubscribe = globalErrorHandler.getErrorLogger()

  const showError = (error: EnhancedError) => {
    errors.value.unshift(error)
    currentError.value = error
    isVisible.value = true
  }

  const hideError = () => {
    isVisible.value = false
    currentError.value = null
  }

  const clearErrors = () => {
    errors.value = []
    hideError()
  }

  const getRecentErrors = (limit = 10) => {
    return errors.value.slice(0, limit)
  }

  return {
    errors: readonly(errors),
    isVisible: readonly(isVisible),
    currentError: readonly(currentError),
    showError,
    hideError,
    clearErrors,
    getRecentErrors
  }
}