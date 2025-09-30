import { ApiError } from '../../server/api/client'

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

// Error categories
export type ErrorCategory = 
  | 'validation' 
  | 'network' 
  | 'authentication' 
  | 'authorization' 
  | 'server' 
  | 'client' 
  | 'business' 
  | 'security'

// Enhanced error interface
export interface EnhancedError {
  id: string
  message: string
  category: ErrorCategory
  severity: ErrorSeverity
  timestamp: Date
  context?: Record<string, any>
  stack?: string
  userAgent?: string
  url?: string
  userId?: string
  recoverable: boolean
  retryable: boolean
}

// Error logging service
export class ErrorLogger {
  private errors: EnhancedError[] = []
  private maxErrors = 100

  log(error: Error | ApiError | string, context?: Record<string, any>): EnhancedError {
    const enhancedError = this.enhanceError(error, context)
    
    // Add to local storage
    this.errors.unshift(enhancedError)
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors)
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Error logged:', enhancedError)
    }

    // In production, you would send to logging service
    this.sendToLoggingService(enhancedError)

    return enhancedError
  }

  private enhanceError(error: Error | ApiError | string, context?: Record<string, any>): EnhancedError {
    const message = typeof error === 'string' ? error : error.message
    const stack = typeof error === 'object' ? error.stack : undefined
    
    return {
      id: crypto.randomUUID(),
      message,
      category: this.categorizeError(error),
      severity: this.determineSeverity(error),
      timestamp: new Date(),
      context,
      stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      recoverable: this.isRecoverable(error),
      retryable: this.isRetryable(error)
    }
  }

  private categorizeError(error: Error | ApiError | string): ErrorCategory {
    const message = typeof error === 'string' ? error : error.message
    const lowerMessage = message.toLowerCase()

    if (error instanceof ApiError) {
      if (error.status === 401) return 'authentication'
      if (error.status === 403) return 'authorization'
      if (error.status >= 400 && error.status < 500) return 'client'
      if (error.status >= 500) return 'server'
      if (error.isNetworkError) return 'network'
    }

    if (lowerMessage.includes('validation') || lowerMessage.includes('required')) {
      return 'validation'
    }

    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'network'
    }

    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
      return 'authentication'
    }

    if (lowerMessage.includes('forbidden') || lowerMessage.includes('permission')) {
      return 'authorization'
    }

    if (lowerMessage.includes('server') || lowerMessage.includes('internal')) {
      return 'server'
    }

    if (lowerMessage.includes('security') || lowerMessage.includes('xss') || lowerMessage.includes('injection')) {
      return 'security'
    }

    if (lowerMessage.includes('balance') || lowerMessage.includes('transaction') || lowerMessage.includes('account')) {
      return 'business'
    }

    return 'client'
  }

  private determineSeverity(error: Error | ApiError | string): ErrorSeverity {
    const message = typeof error === 'string' ? error : error.message
    const lowerMessage = message.toLowerCase()

    // Critical errors
    if (lowerMessage.includes('security') || lowerMessage.includes('injection') || lowerMessage.includes('xss')) {
      return 'critical'
    }

    if (error instanceof ApiError && error.status >= 500) {
      return 'critical'
    }

    // High severity
    if (lowerMessage.includes('data loss') || lowerMessage.includes('corruption')) {
      return 'high'
    }

    if (error instanceof ApiError && error.status === 401) {
      return 'high'
    }

    // Medium severity
    if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
      return 'medium'
    }

    if (lowerMessage.includes('validation') || lowerMessage.includes('required')) {
      return 'medium'
    }

    // Low severity (default)
    return 'low'
  }

  private isRecoverable(error: Error | ApiError | string): boolean {
    if (error instanceof ApiError) {
      // Client errors are usually recoverable by fixing input
      if (error.isClientError) return true
      // Network errors are recoverable by retry
      if (error.isNetworkError) return true
      // Server errors might be recoverable
      if (error.isServerError) return true
    }

    const message = typeof error === 'string' ? error : error.message
    const lowerMessage = message.toLowerCase()

    // Security errors are not recoverable
    if (lowerMessage.includes('security') || lowerMessage.includes('injection')) {
      return false
    }

    return true
  }

  private isRetryable(error: Error | ApiError | string): boolean {
    if (error instanceof ApiError) {
      // Network errors are retryable
      if (error.isNetworkError) return true
      // Server errors are retryable
      if (error.isServerError) return true
      // Client errors are not retryable (except 429)
      if (error.status === 429) return true
      if (error.isClientError) return false
    }

    const message = typeof error === 'string' ? error : error.message
    const lowerMessage = message.toLowerCase()

    // Network errors are retryable
    if (lowerMessage.includes('network') || lowerMessage.includes('timeout')) {
      return true
    }

    // Validation errors are not retryable
    if (lowerMessage.includes('validation') || lowerMessage.includes('required')) {
      return false
    }

    return true
  }

  private getCurrentUserId(): string | undefined {
    // In a real app, get from auth context
    return undefined
  }

  private async sendToLoggingService(error: EnhancedError): Promise<void> {
    // In production, send to external logging service
    // For now, just store in localStorage
    try {
      const stored = localStorage.getItem('app_errors') || '[]'
      const errors = JSON.parse(stored)
      errors.unshift(error)
      
      // Keep only last 50 errors in localStorage
      const trimmed = errors.slice(0, 50)
      localStorage.setItem('app_errors', JSON.stringify(trimmed))
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e)
    }
  }

  getErrors(): EnhancedError[] {
    return [...this.errors]
  }

  getErrorsByCategory(category: ErrorCategory): EnhancedError[] {
    return this.errors.filter(error => error.category === category)
  }

  getErrorsBySeverity(severity: ErrorSeverity): EnhancedError[] {
    return this.errors.filter(error => error.severity === severity)
  }

  clearErrors(): void {
    this.errors = []
    localStorage.removeItem('app_errors')
  }
}

// User-friendly error messages
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection and try again.',
  TIMEOUT_ERROR: 'The request took too long to complete. Please try again.',
  
  // Authentication errors
  UNAUTHORIZED: 'You need to sign in to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please sign in again.',
  
  // Authorization errors
  FORBIDDEN: 'You don\'t have permission to perform this action.',
  
  // Validation errors
  VALIDATION_FAILED: 'Please check your input and try again.',
  REQUIRED_FIELD: 'This field is required.',
  INVALID_FORMAT: 'Please enter a valid value.',
  
  // Business logic errors
  TRANSACTION_NOT_BALANCED: 'Transaction must balance - total debits must equal total credits.',
  ACCOUNT_IN_USE: 'This account cannot be deleted because it\'s used in transactions.',
  POST_HAS_TRANSACTION: 'This post cannot be deleted because it has an associated transaction.',
  
  // Server errors
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
  
  // Generic errors
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  OPERATION_FAILED: 'The operation could not be completed. Please try again.'
} as const

// Error message resolver
export function getErrorMessage(error: Error | ApiError | string, fallback?: string): string {
  const message = typeof error === 'string' ? error : error.message
  const lowerMessage = message.toLowerCase()

  // Check for specific error patterns
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch failed')) {
    return ERROR_MESSAGES.NETWORK_ERROR
  }

  if (lowerMessage.includes('timeout')) {
    return ERROR_MESSAGES.TIMEOUT_ERROR
  }

  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
    return ERROR_MESSAGES.UNAUTHORIZED
  }

  if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
    return ERROR_MESSAGES.FORBIDDEN
  }

  if (lowerMessage.includes('validation') || lowerMessage.includes('required')) {
    return ERROR_MESSAGES.VALIDATION_FAILED
  }

  if (lowerMessage.includes('balance')) {
    return ERROR_MESSAGES.TRANSACTION_NOT_BALANCED
  }

  if (lowerMessage.includes('account') && lowerMessage.includes('used')) {
    return ERROR_MESSAGES.ACCOUNT_IN_USE
  }

  if (lowerMessage.includes('post') && lowerMessage.includes('transaction')) {
    return ERROR_MESSAGES.POST_HAS_TRANSACTION
  }

  if (error instanceof ApiError) {
    if (error.isServerError) {
      return ERROR_MESSAGES.SERVER_ERROR
    }
    if (error.isNetworkError) {
      return ERROR_MESSAGES.NETWORK_ERROR
    }
  }

  // Return original message if it's user-friendly, otherwise use fallback
  if (message.length < 100 && !message.includes('Error:') && !message.includes('Exception')) {
    return message
  }

  return fallback || ERROR_MESSAGES.UNKNOWN_ERROR
}

// Recovery action suggestions
export interface RecoveryAction {
  type: 'retry' | 'refresh' | 'navigate' | 'contact' | 'ignore'
  label: string
  description?: string
  action: () => void | Promise<void>
}

export function getRecoveryActions(error: EnhancedError): RecoveryAction[] {
  const actions: RecoveryAction[] = []

  // Retryable errors
  if (error.retryable) {
    actions.push({
      type: 'retry',
      label: 'Try Again',
      description: 'Attempt the operation again',
      action: () => window.location.reload()
    })
  }

  // Network errors
  if (error.category === 'network') {
    actions.push({
      type: 'refresh',
      label: 'Refresh Page',
      description: 'Reload the page to restore connection',
      action: () => window.location.reload()
    })
  }

  // Authentication errors
  if (error.category === 'authentication') {
    actions.push({
      type: 'navigate',
      label: 'Sign In',
      description: 'Go to the sign in page',
      action: () => {
        // In a real app, navigate to login
        console.log('Navigate to login')
      }
    })
  }

  // Validation errors
  if (error.category === 'validation') {
    actions.push({
      type: 'ignore',
      label: 'Review Form',
      description: 'Check your input and correct any errors',
      action: () => {
        // Scroll to first error field
        const errorElement = document.querySelector('.border-red-300, .border-error-300')
        errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }

  // High severity errors
  if (error.severity === 'high' || error.severity === 'critical') {
    actions.push({
      type: 'contact',
      label: 'Contact Support',
      description: 'Report this issue to our support team',
      action: () => {
        console.log('Contact support with error:', error.id)
      }
    })
  }

  return actions
}

// Global error handler
export class GlobalErrorHandler {
  private errorLogger = new ErrorLogger()
  private onError?: (error: EnhancedError) => void

  constructor(onError?: (error: EnhancedError) => void) {
    this.onError = onError
    this.setupGlobalHandlers()
  }

  private setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = this.errorLogger.log(event.reason, {
        type: 'unhandledrejection',
        promise: event.promise
      })
      this.onError?.(error)
    })

    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      const error = this.errorLogger.log(event.error || event.message, {
        type: 'javascript',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      })
      this.onError?.(error)
    })

    // Handle resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement
        const error = this.errorLogger.log(`Failed to load resource: ${target.tagName}`, {
          type: 'resource',
          src: (target as any).src || (target as any).href,
          tagName: target.tagName
        })
        this.onError?.(error)
      }
    }, true)
  }

  handleError(error: Error | ApiError | string, context?: Record<string, any>): EnhancedError {
    const enhancedError = this.errorLogger.log(error, context)
    this.onError?.(enhancedError)
    return enhancedError
  }

  getErrorLogger(): ErrorLogger {
    return this.errorLogger
  }
}

// Create global instance
export const globalErrorHandler = new GlobalErrorHandler()
export const errorLogger = globalErrorHandler.getErrorLogger()

// Utility functions
export function handleAsyncError<T>(
  promise: Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return promise.catch((error) => {
    globalErrorHandler.handleError(error, context)
    throw error
  })
}

export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => R | Promise<R>,
  context?: Record<string, any>
): (...args: T) => R | Promise<R> {
  return (...args: T) => {
    try {
      const result = fn(...args)
      if (result instanceof Promise) {
        return result.catch((error) => {
          globalErrorHandler.handleError(error, { ...context, args })
          throw error
        })
      }
      return result
    } catch (error) {
      globalErrorHandler.handleError(error as Error, { ...context, args })
      throw error
    }
  }
}