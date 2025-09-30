import { ref, type Ref, type ComputedRef } from 'vue'
import { globalErrorHandler, type EnhancedError } from './errorHandling'
import { securityMonitor } from './securityMonitor'

// Client-side error handling middleware
interface ClientErrorContext {
  component?: string
  action?: string
  userId?: string
  sessionId?: string
  url?: string
  userAgent?: string
}

interface ClientErrorState {
  hasError: boolean
  errors: EnhancedError[]
  isOnline: boolean
  retryQueue: Array<() => Promise<void>>
}

class ClientErrorHandler {
  private state: Ref<ClientErrorState>
  
  constructor() {
    // Initialize state - will be properly set up when Vue is available
    this.state = ref({
      hasError: false,
      errors: [],
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      retryQueue: []
    })
    
    this.setupEventListeners()
  }

  private maxRetryQueue = 10
  private retryDelay = 1000
  private maxRetryDelay = 30000

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return // Skip in non-browser environments
    // Network status monitoring
    window.addEventListener('online', () => {
      this.state.value.isOnline = true
      this.processRetryQueue()
    })

    window.addEventListener('offline', () => {
      this.state.value.isOnline = false
    })

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        component: 'Global',
        action: 'unhandledrejection'
      })
    })

    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        component: 'Global',
        action: 'javascript_error',
        url: event.filename,
        userAgent: navigator.userAgent
      })
    })

    // Resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement
        this.handleError(new Error(`Failed to load resource: ${target.tagName}`), {
          component: 'Resource',
          action: 'load_error',
          url: (target as any).src || (target as any).href
        })
      }
    }, true)

    // Security violations (CSP)
    document.addEventListener('securitypolicyviolation', (event) => {
      this.handleSecurityViolation(event)
    })
  }

  handleError(error: Error | string, context?: ClientErrorContext): EnhancedError {
    const errorObj = typeof error === 'string' ? new Error(error) : error
    
    // Log to global error handler
    const enhancedError = globalErrorHandler.handleError(errorObj, {
      ...context,
      clientSide: true,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    })

    // Add to local state
    this.state.value.errors.unshift(enhancedError)
    this.state.value.hasError = true

    // Limit error history
    if (this.state.value.errors.length > 100) {
      this.state.value.errors = this.state.value.errors.slice(0, 100)
    }

    // Check for security threats
    this.checkForSecurityThreats(errorObj, context)

    return enhancedError
  }

  private handleSecurityViolation(event: SecurityPolicyViolationEvent): void {
    const threat = {
      type: 'xss' as const,
      severity: 'high' as const,
      description: `CSP violation: ${event.violatedDirective}`,
      payload: event.blockedURI || event.sourceFile || 'unknown',
      blocked: true,
      context: {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        lineNumber: event.lineNumber,
        columnNumber: event.columnNumber
      }
    }

    securityMonitor.logThreat(threat)
    
    this.handleError(new Error(`Security policy violation: ${event.violatedDirective}`), {
      component: 'Security',
      action: 'csp_violation'
    })
  }

  private checkForSecurityThreats(error: Error, context?: ClientErrorContext): void {
    const message = error.message.toLowerCase()
    
    // Check for potential XSS attempts
    if (message.includes('script') || message.includes('eval') || message.includes('javascript:')) {
      securityMonitor.logThreat({
        type: 'xss',
        severity: 'medium',
        description: 'Potential XSS attempt detected in client error',
        payload: error.message,
        blocked: false,
        context: { clientSide: true, ...context }
      })
    }

    // Check for potential data exfiltration attempts
    if (message.includes('fetch') && message.includes('cors')) {
      securityMonitor.logThreat({
        type: 'data_exfiltration',
        severity: 'medium',
        description: 'Potential data exfiltration attempt via CORS error',
        payload: error.message,
        blocked: false,
        context: { clientSide: true, ...context }
      })
    }
  }

  // Retry mechanism for failed operations
  addToRetryQueue(operation: () => Promise<void>): void {
    if (this.state.value.retryQueue.length >= this.maxRetryQueue) {
      // Remove oldest operation
      this.state.value.retryQueue.shift()
    }
    
    this.state.value.retryQueue.push(operation)
  }

  private async processRetryQueue(): Promise<void> {
    if (!this.state.value.isOnline || this.state.value.retryQueue.length === 0) {
      return
    }

    const operations = [...this.state.value.retryQueue]
    this.state.value.retryQueue = []

    for (const operation of operations) {
      try {
        await operation()
      } catch (error) {
        // If retry fails, add back to queue with exponential backoff
        setTimeout(() => {
          this.addToRetryQueue(operation)
        }, Math.min(this.retryDelay * 2, this.maxRetryDelay))
        
        this.handleError(error as Error, {
          component: 'RetryQueue',
          action: 'retry_failed'
        })
      }
    }
  }

  // Manual retry for specific error
  async retryOperation(errorId: string, operation: () => Promise<void>): Promise<boolean> {
    try {
      await operation()
      
      // Remove error from state if retry successful
      this.state.value.errors = this.state.value.errors.filter((e: EnhancedError) => e.id !== errorId)
      
      if (this.state.value.errors.length === 0) {
        this.state.value.hasError = false
      }
      
      return true
    } catch (error) {
      this.handleError(error as Error, {
        component: 'Manual',
        action: 'retry_failed'
      })
      return false
    }
  }

  // Clear specific error
  clearError(errorId: string): void {
    this.state.value.errors = this.state.value.errors.filter((e: EnhancedError) => e.id !== errorId)
    
    if (this.state.value.errors.length === 0) {
      this.state.value.hasError = false
    }
  }

  // Clear all errors
  clearAllErrors(): void {
    this.state.value.errors = []
    this.state.value.hasError = false
  }

  // Get error statistics
  getErrorStats(): {
    total: number
    byCategory: Record<string, number>
    bySeverity: Record<string, number>
    recent: EnhancedError[]
  } {
    const byCategory: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}

    this.state.value.errors.forEach((error: EnhancedError) => {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1
    })

    return {
      total: this.state.value.errors.length,
      byCategory,
      bySeverity,
      recent: this.state.value.errors.slice(0, 10)
    }
  }

  // Reactive state getters
  get hasError(): ComputedRef<boolean> {
    return { value: this.state.value.hasError } as ComputedRef<boolean>
  }

  get errors(): ComputedRef<EnhancedError[]> {
    return { value: this.state.value.errors } as ComputedRef<EnhancedError[]>
  }

  get isOnline(): ComputedRef<boolean> {
    return { value: this.state.value.isOnline } as ComputedRef<boolean>
  }

  get retryQueueLength(): ComputedRef<number> {
    return { value: this.state.value.retryQueue.length } as ComputedRef<number>
  }
}

// Create global client error handler instance
export const clientErrorHandler = new ClientErrorHandler()

// Vue plugin for easy integration
export const ErrorHandlerPlugin = {
  install(app: any) {
    app.config.globalProperties.$errorHandler = clientErrorHandler
    
    // Global error handler for Vue
    app.config.errorHandler = (error: Error, instance: any, _info: string) => {
      clientErrorHandler.handleError(error, {
        component: instance?.$options?.name || 'Unknown',
        action: 'vue_error',
        userAgent: navigator.userAgent
      })
    }
  }
}

// Composable for using error handler in components
export function useClientErrorHandler() {
  return {
    handleError: (error: Error | string, context?: ClientErrorContext) => 
      clientErrorHandler.handleError(error, context),
    clearError: (errorId: string) => clientErrorHandler.clearError(errorId),
    clearAllErrors: () => clientErrorHandler.clearAllErrors(),
    retryOperation: (errorId: string, operation: () => Promise<void>) => 
      clientErrorHandler.retryOperation(errorId, operation),
    addToRetryQueue: (operation: () => Promise<void>) => 
      clientErrorHandler.addToRetryQueue(operation),
    hasError: clientErrorHandler.hasError,
    errors: clientErrorHandler.errors,
    isOnline: clientErrorHandler.isOnline,
    retryQueueLength: clientErrorHandler.retryQueueLength,
    getErrorStats: () => clientErrorHandler.getErrorStats()
  }
}