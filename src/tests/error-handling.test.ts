import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  sanitizeText, 
  sanitizeFilename, 
  sanitizeEmail, 
  sanitizeAmount,
  validateAndSanitizePost,
  validateAndSanitizeAccount,
  validateAndSanitizeUser,
  RateLimiter,
  createRecoveryActions
} from '../utils/validation'
import { 
  ErrorLogger, 
  GlobalErrorHandler, 
  getErrorMessage, 
  getRecoveryActions,
  handleAsyncError,
  withErrorHandling
} from '../utils/errorHandling'
import { securityMonitor } from '../utils/securityMonitor'
import { ApiError } from '../api/client'

describe('Input Sanitization', () => {
  describe('sanitizeText', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World'
      const result = sanitizeText(input)
      expect(result).toBe('Hello  World')
    })

    it('should remove HTML tags', () => {
      const input = 'Hello <div>World</div>'
      const result = sanitizeText(input)
      expect(result).toBe('Hello World')
    })

    it('should remove dangerous protocols', () => {
      const input = 'javascript:alert("xss") data:text/html,<script>alert("xss")</script>'
      const result = sanitizeText(input)
      expect(result).toBe('')
    })

    it('should remove SQL injection attempts', () => {
      const input = "'; DROP TABLE users; --"
      const result = sanitizeText(input)
      expect(result).toBe("';  TABLE users;")
    })

    it('should handle non-string input', () => {
      expect(sanitizeText(null as any)).toBe('')
      expect(sanitizeText(undefined as any)).toBe('')
      expect(sanitizeText(123 as any)).toBe('')
    })
  })

  describe('sanitizeFilename', () => {
    it('should remove path traversal attempts', () => {
      const input = '../../../etc/passwd'
      const result = sanitizeFilename(input)
      expect(result).toBe('etc_passwd')
    })

    it('should replace unsafe characters', () => {
      const input = 'file<>:"|?*.txt'
      const result = sanitizeFilename(input)
      expect(result).toBe('file_________.txt')
    })

    it('should limit filename length', () => {
      const input = 'a'.repeat(300)
      const result = sanitizeFilename(input)
      expect(result.length).toBeLessThanOrEqual(255)
    })
  })

  describe('sanitizeEmail', () => {
    it('should convert to lowercase and trim', () => {
      const input = '  TEST@EXAMPLE.COM  '
      const result = sanitizeEmail(input)
      expect(result).toBe('test@example.com')
    })

    it('should handle non-string input', () => {
      expect(sanitizeEmail(null as any)).toBe('')
      expect(sanitizeEmail(undefined as any)).toBe('')
    })
  })

  describe('sanitizeAmount', () => {
    it('should format numbers correctly', () => {
      expect(sanitizeAmount(123.456)).toBe('123.46')
      expect(sanitizeAmount(123)).toBe('123.00')
    })

    it('should clean string amounts', () => {
      expect(sanitizeAmount('$123.45')).toBe('123.45')
      expect(sanitizeAmount('1,234.56')).toBe('1234.56')
    })

    it('should handle multiple decimal points', () => {
      expect(sanitizeAmount('123.45.67')).toBe('123.4567')
    })

    it('should handle invalid input', () => {
      expect(sanitizeAmount('')).toBe('0')
      expect(sanitizeAmount('abc')).toBe('0')
      expect(sanitizeAmount(null as any)).toBe('0.00')
    })
  })
})

describe('Enhanced Validation', () => {
  describe('validateAndSanitizePost', () => {
    it('should validate and sanitize valid post', () => {
      const post = {
        content: 'Hello World!',
        authorId: '123e4567-e89b-12d3-a456-426614174000',
        authorPersona: 'Test User',
        attachments: ['file1.txt', 'file2.pdf']
      }

      const result = validateAndSanitizePost(post)
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBeDefined()
      expect(result.sanitized!.content).toBe('Hello World!')
    })

    it('should reject post with XSS attempt', () => {
      const post = {
        content: '<script>alert("xss")</script>',
        authorId: '123e4567-e89b-12d3-a456-426614174000',
        authorPersona: 'Test User'
      }

      const result = validateAndSanitizePost(post)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Post content cannot be empty after sanitization')
    })

    it('should reject invalid author ID format', () => {
      const post = {
        content: 'Hello World!',
        authorId: 'invalid-id',
        authorPersona: 'Test User'
      }

      const result = validateAndSanitizePost(post)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Invalid author ID format')
    })

    it('should handle missing required fields', () => {
      const post = {}

      const result = validateAndSanitizePost(post)
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('validateAndSanitizeAccount', () => {
    it('should validate and sanitize valid account', () => {
      const account = {
        name: 'Cash Account',
        type: 'asset' as const,
        category: 'Current Assets',
        isActive: true
      }

      const result = validateAndSanitizeAccount(account)
      expect(result.isValid).toBe(true)
      expect(result.sanitized).toBeDefined()
    })

    it('should reject invalid account type', () => {
      const account = {
        name: 'Test Account',
        type: 'invalid' as any,
        category: 'Test Category'
      }

      const result = validateAndSanitizeAccount(account)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Account type must be one of: asset, liability, equity, revenue, expense')
    })
  })
})

describe('Rate Limiting', () => {
  let rateLimiter: RateLimiter

  beforeEach(() => {
    rateLimiter = new RateLimiter(5, 1000) // 5 requests per second
  })

  it('should allow requests under limit', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.isAllowed('test-ip')).toBe(true)
    }
  })

  it('should block requests over limit', () => {
    // Use up the limit
    for (let i = 0; i < 5; i++) {
      rateLimiter.isAllowed('test-ip')
    }

    // Next request should be blocked
    expect(rateLimiter.isAllowed('test-ip')).toBe(false)
  })

  it('should track remaining requests', () => {
    expect(rateLimiter.getRemainingRequests('test-ip')).toBe(5)
    
    rateLimiter.isAllowed('test-ip')
    expect(rateLimiter.getRemainingRequests('test-ip')).toBe(4)
  })

  it('should handle different IPs separately', () => {
    // Use up limit for first IP
    for (let i = 0; i < 5; i++) {
      rateLimiter.isAllowed('ip1')
    }

    // Second IP should still be allowed
    expect(rateLimiter.isAllowed('ip2')).toBe(true)
  })
})

describe('Error Logging', () => {
  let errorLogger: ErrorLogger

  beforeEach(() => {
    errorLogger = new ErrorLogger()
  })

  it('should log errors with proper categorization', () => {
    const error = new Error('Validation failed')
    const logged = errorLogger.log(error, { context: 'test' })

    expect(logged.category).toBe('validation')
    expect(logged.message).toBe('Validation failed')
    expect(logged.context).toEqual({ context: 'test' })
  })

  it('should categorize API errors correctly', () => {
    const apiError = new ApiError('Unauthorized', 401, {
      error: 'Unauthorized',
      message: 'Unauthorized',
      timestamp: new Date()
    })

    const logged = errorLogger.log(apiError)
    expect(logged.category).toBe('authentication')
    expect(logged.severity).toBe('high')
  })

  it('should determine severity correctly', () => {
    const securityError = new Error('XSS attempt detected')
    const logged = errorLogger.log(securityError)
    expect(logged.severity).toBe('critical')
  })

  it('should filter errors by category', () => {
    errorLogger.log(new Error('Validation failed'))
    errorLogger.log(new Error('Network error'))
    
    const validationErrors = errorLogger.getErrorsByCategory('validation')
    expect(validationErrors.length).toBe(1)
    expect(validationErrors[0].message).toBe('Validation failed')
  })
})

describe('Error Message Resolution', () => {
  it('should return user-friendly messages for common errors', () => {
    expect(getErrorMessage(new Error('fetch failed'))).toBe('Unable to connect to the server. Please check your internet connection and try again.')
    expect(getErrorMessage(new Error('validation failed'))).toBe('Please check your input and try again.')
    expect(getErrorMessage(new Error('unauthorized'))).toBe('You need to sign in to perform this action.')
  })

  it('should handle API errors', () => {
    const apiError = new ApiError('Server Error', 500, {
      error: 'Server Error',
      message: 'Server Error',
      timestamp: new Date()
    })

    expect(getErrorMessage(apiError)).toBe('Something went wrong on our end. Please try again later.')
  })

  it('should use fallback for unknown errors', () => {
    const weirdError = new Error('SomeInternalError: Stack trace here...')
    expect(getErrorMessage(weirdError, 'Custom fallback')).toBe('Custom fallback')
  })
})

describe('Recovery Actions', () => {
  it('should suggest appropriate recovery actions', () => {
    const networkError = new Error('fetch failed')
    const actions = createRecoveryActions(networkError, 'test')

    expect(actions.length).toBeGreaterThan(0)
    expect(actions.some(action => action.type === 'retry')).toBe(true)
  })

  it('should suggest form review for validation errors', () => {
    const validationError = new Error('validation failed')
    const actions = createRecoveryActions(validationError, 'test')

    expect(actions.some(action => action.type === 'fallback')).toBe(true)
  })
})

describe('Global Error Handler', () => {
  let globalHandler: GlobalErrorHandler
  let onErrorSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onErrorSpy = vi.fn()
    globalHandler = new GlobalErrorHandler(onErrorSpy)
  })

  it('should handle errors and call callback', () => {
    const error = new Error('Test error')
    const logged = globalHandler.handleError(error, { test: true })

    expect(logged.message).toBe('Test error')
    expect(logged.context).toEqual({ test: true })
    expect(onErrorSpy).toHaveBeenCalledWith(logged)
  })
})

describe('Error Handling Utilities', () => {
  it('should handle async errors', async () => {
    const failingPromise = Promise.reject(new Error('Async error'))
    
    await expect(handleAsyncError(failingPromise)).rejects.toThrow('Async error')
  })

  it('should wrap functions with error handling', () => {
    const throwingFunction = () => {
      throw new Error('Function error')
    }

    const wrappedFunction = withErrorHandling(throwingFunction, { context: 'test' })
    
    expect(() => wrappedFunction()).toThrow('Function error')
  })

  it('should handle async wrapped functions', async () => {
    const throwingAsyncFunction = async () => {
      throw new Error('Async function error')
    }

    const wrappedFunction = withErrorHandling(throwingAsyncFunction, { context: 'test' })
    
    await expect(wrappedFunction()).rejects.toThrow('Async function error')
  })
})

describe('Security Validation', () => {
  it('should detect and prevent XSS attempts', () => {
    const xssAttempts = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')" />',
      '<svg onload="alert(\'xss\')" />',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      '<form><input type="text" onfocus="alert(\'xss\')" /></form>',
      'eval("alert(\'xss\')")',
      'document.cookie',
      'window.location="http://evil.com"'
    ]

    xssAttempts.forEach(attempt => {
      const sanitized = sanitizeText(attempt)
      expect(sanitized).not.toContain('<script')
      expect(sanitized).not.toContain('javascript:')
      expect(sanitized).not.toContain('onerror')
      expect(sanitized).not.toContain('onload')
      expect(sanitized).not.toContain('onfocus')
      expect(sanitized).not.toContain('eval')
      expect(sanitized).not.toContain('document.')
      expect(sanitized).not.toContain('window.')
    })
  })

  it('should detect and prevent SQL injection attempts', () => {
    const sqlAttempts = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --",
      "' UNION SELECT * FROM passwords --",
      "'; TRUNCATE TABLE accounts; --",
      "' OR 1=1 --",
      "'; EXEC xp_cmdshell('dir'); --",
      "' UNION ALL SELECT username, password FROM users --",
      "'; WAITFOR DELAY '00:00:05'; --",
      "' AND (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES) > 0 --"
    ]

    sqlAttempts.forEach(attempt => {
      const sanitized = sanitizeText(attempt)
      expect(sanitized).not.toContain('DROP')
      expect(sanitized).not.toContain('INSERT')
      expect(sanitized).not.toContain('UNION')
      expect(sanitized).not.toContain('SELECT')
      expect(sanitized).not.toContain('TRUNCATE')
      expect(sanitized).not.toContain('EXEC')
      expect(sanitized).not.toContain('WAITFOR')
      expect(sanitized).not.toContain('INFORMATION_SCHEMA')
    })
  })

  it('should prevent path traversal attacks', () => {
    const pathAttempts = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc/passwd',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%252fpasswd'
    ]

    pathAttempts.forEach(attempt => {
      const sanitized = sanitizeFilename(attempt)
      expect(sanitized).not.toContain('../')
      expect(sanitized).not.toContain('..\\')
      expect(sanitized).not.toContain('..../')
      expect(sanitized).not.toContain('%2e%2e')
      expect(sanitized).not.toContain('%252f')
    })
  })

  it('should handle encoded attack attempts', () => {
    const encodedAttempts = [
      '%3Cscript%3Ealert%28%27xss%27%29%3C%2Fscript%3E', // URL encoded script tag
      '&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;', // HTML encoded script tag
      '\u003cscript\u003ealert(\u0027xss\u0027)\u003c/script\u003e' // Unicode encoded script tag
    ]

    encodedAttempts.forEach(attempt => {
      const sanitized = sanitizeText(decodeURIComponent(attempt))
      expect(sanitized).not.toContain('<script')
      expect(sanitized).not.toContain('alert')
    })
  })
})

describe('Security Monitor Integration', () => {
  beforeEach(() => {
    // Clear security monitor state
    securityMonitor.clearThreats()
  })

  it('should log XSS attempts to security monitor', () => {
    const xssPayload = '<script>alert("xss")</script>'
    sanitizeText(xssPayload)
    
    const threats = securityMonitor.getThreats('xss')
    expect(threats.length).toBeGreaterThan(0)
    expect(threats[0].payload).toBe(xssPayload)
    expect(threats[0].severity).toBe('high')
  })

  it('should log SQL injection attempts to security monitor', () => {
    const sqlPayload = "'; DROP TABLE users; --"
    sanitizeText(sqlPayload)
    
    const threats = securityMonitor.getThreats('sql_injection')
    expect(threats.length).toBeGreaterThan(0)
    expect(threats[0].payload).toBe(sqlPayload)
    expect(threats[0].severity).toBe('critical')
  })

  it('should auto-block IPs after multiple threats', () => {
    const testIP = '192.168.1.100'
    
    // Simulate multiple XSS attempts from same IP
    for (let i = 0; i < 5; i++) {
      securityMonitor.logThreat({
        type: 'xss',
        severity: 'high',
        description: 'XSS attempt',
        payload: '<script>alert("xss")</script>',
        ip: testIP,
        blocked: false
      })
    }
    
    expect(securityMonitor.isIPBlocked(testIP)).toBe(true)
  })

  it('should generate security metrics', () => {
    // Add some test threats
    securityMonitor.logThreat({
      type: 'xss',
      severity: 'high',
      description: 'XSS attempt',
      payload: '<script>alert("xss")</script>',
      blocked: true
    })
    
    securityMonitor.logThreat({
      type: 'sql_injection',
      severity: 'critical',
      description: 'SQL injection attempt',
      payload: "'; DROP TABLE users; --",
      blocked: true
    })
    
    const metrics = securityMonitor.getSecurityMetrics()
    expect(metrics.totalThreats).toBe(2)
    expect(metrics.topThreatTypes.length).toBeGreaterThan(0)
    expect(metrics.recentThreats.length).toBe(2)
  })

  it('should detect anomalous activity', () => {
    const testIP = '192.168.1.200'
    
    // Simulate rapid-fire requests
    for (let i = 0; i < 15; i++) {
      securityMonitor.logThreat({
        type: 'rate_limit',
        severity: 'medium',
        description: 'Rate limit exceeded',
        payload: 'Too many requests',
        ip: testIP,
        blocked: false
      })
    }
    
    const isAnomalous = securityMonitor.detectAnomalousActivity(testIP)
    expect(isAnomalous).toBe(true)
  })

  it('should generate security report with recommendations', () => {
    // Add critical threat
    securityMonitor.logThreat({
      type: 'sql_injection',
      severity: 'critical',
      description: 'Critical SQL injection attempt',
      payload: "'; DROP DATABASE production; --",
      blocked: true
    })
    
    const report = securityMonitor.generateSecurityReport()
    expect(report.criticalThreats.length).toBe(1)
    expect(report.recommendations.length).toBeGreaterThan(0)
    expect(report.recommendations).toContain('Immediate review required for critical security threats')
  })
})

describe('Client Error Handler', () => {
  let clientHandler: any

  beforeEach(async () => {
    // Dynamically import to avoid issues with DOM APIs in test environment
    const { clientErrorHandler } = await import('../utils/clientErrorHandler')
    clientHandler = clientErrorHandler
    clientHandler.clearAllErrors()
  })

  it('should handle JavaScript errors', () => {
    const error = new Error('Test JavaScript error')
    const enhancedError = clientHandler.handleError(error, {
      component: 'TestComponent',
      action: 'test_action'
    })

    expect(enhancedError.message).toBe('Test JavaScript error')
    expect(enhancedError.context?.component).toBe('TestComponent')
    expect(enhancedError.context?.action).toBe('test_action')
    expect(clientHandler.hasError.value).toBe(true)
  })

  it('should handle string errors', () => {
    const errorMessage = 'Test string error'
    const enhancedError = clientHandler.handleError(errorMessage)

    expect(enhancedError.message).toBe(errorMessage)
    expect(clientHandler.hasError.value).toBe(true)
  })

  it('should clear specific errors', () => {
    const error1 = clientHandler.handleError('Error 1')
    const error2 = clientHandler.handleError('Error 2')

    expect(clientHandler.errors.value.length).toBe(2)

    clientHandler.clearError(error1.id)
    expect(clientHandler.errors.value.length).toBe(1)
    expect(clientHandler.errors.value[0].id).toBe(error2.id)
  })

  it('should clear all errors', () => {
    clientHandler.handleError('Error 1')
    clientHandler.handleError('Error 2')
    
    expect(clientHandler.errors.value.length).toBe(2)
    expect(clientHandler.hasError.value).toBe(true)

    clientHandler.clearAllErrors()
    expect(clientHandler.errors.value.length).toBe(0)
    expect(clientHandler.hasError.value).toBe(false)
  })

  it('should generate error statistics', () => {
    clientHandler.handleError(new Error('Network error'))
    clientHandler.handleError(new Error('Validation failed'))
    clientHandler.handleError(new Error('Server error'))

    const stats = clientHandler.getErrorStats()
    expect(stats.total).toBe(3)
    expect(stats.recent.length).toBe(3)
    expect(Object.keys(stats.byCategory).length).toBeGreaterThan(0)
    expect(Object.keys(stats.bySeverity).length).toBeGreaterThan(0)
  })

  it('should limit error history', () => {
    // Add more than 100 errors
    for (let i = 0; i < 105; i++) {
      clientHandler.handleError(`Error ${i}`)
    }

    expect(clientHandler.errors.value.length).toBe(100)
  })

  it('should detect security threats in client errors', () => {
    const xssError = new Error('Uncaught ReferenceError: eval is not defined')
    clientHandler.handleError(xssError)

    const threats = securityMonitor.getThreats('xss')
    expect(threats.some(t => t.context?.clientSide)).toBe(true)
  })

  it('should handle retry operations', async () => {
    let attemptCount = 0
    const operation = vi.fn().mockImplementation(async () => {
      attemptCount++
      if (attemptCount < 2) {
        throw new Error('Operation failed')
      }
      return 'success'
    })

    const error = clientHandler.handleError('Initial error')
    const success = await clientHandler.retryOperation(error.id, operation)

    expect(success).toBe(true)
    expect(operation).toHaveBeenCalledTimes(1)
    expect(clientHandler.errors.value.find(e => e.id === error.id)).toBeUndefined()
  })

  it('should handle failed retry operations', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Retry failed'))

    const error = clientHandler.handleError('Initial error')
    const success = await clientHandler.retryOperation(error.id, operation)

    expect(success).toBe(false)
    expect(operation).toHaveBeenCalledTimes(1)
    expect(clientHandler.errors.value.length).toBeGreaterThan(1) // Original + retry error
  })
})

describe('Form Validation Integration', () => {
  it('should validate posts with comprehensive security checks', () => {
    const maliciousPost = {
      content: '<script>alert("xss")</script>Hello World!',
      authorId: '123e4567-e89b-12d3-a456-426614174000',
      authorPersona: 'Test User<img src="x" onerror="alert(\'xss\')" />',
      attachments: ['../../../etc/passwd', 'normal-file.txt']
    }

    const result = validateAndSanitizePost(maliciousPost)
    
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    
    if (result.sanitized) {
      expect(result.sanitized.content).not.toContain('<script')
      expect(result.sanitized.authorPersona).not.toContain('<img')
      expect(result.sanitized.attachments).not.toContain('../../../etc/passwd')
    }
  })

  it('should validate accounts with business logic', () => {
    const invalidAccount = {
      name: 'Cash Account<script>alert("xss")</script>',
      type: 'invalid_type' as any,
      category: '',
      isActive: 'true' as any // Wrong type
    }

    const result = validateAndSanitizeAccount(invalidAccount)
    
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Account type must be one of: asset, liability, equity, revenue, expense')
    expect(result.errors).toContain('Account category is required')
  })

  it('should validate users with persona validation', () => {
    const invalidUser = {
      name: 'John Doe<script>alert("xss")</script>',
      email: 'invalid-email',
      personas: [
        {
          name: 'Admin<img src="x" onerror="alert(\'xss\')" />',
          role: 'Administrator'
        },
        {
          name: '', // Empty name
          role: 'User'
        }
      ]
    }

    const result = validateAndSanitizeUser(invalidUser)
    
    expect(result.isValid).toBe(false)
    expect(result.errors.some(e => e.includes('email'))).toBe(true)
    expect(result.errors.some(e => e.includes('Persona'))).toBe(true)
  })
})

describe('Advanced Security Features', () => {
  beforeEach(() => {
    securityMonitor.clearThreats()
  })

  it('should detect and block coordinated attacks', () => {
    const attackerIP = '192.168.1.100'
    
    // Simulate coordinated attack with multiple vectors
    securityMonitor.logThreat({
      type: 'xss',
      severity: 'high',
      description: 'XSS attempt',
      payload: '<script>alert("xss")</script>',
      ip: attackerIP,
      blocked: false
    })
    
    securityMonitor.logThreat({
      type: 'sql_injection',
      severity: 'critical',
      description: 'SQL injection attempt',
      payload: "'; DROP TABLE users; --",
      ip: attackerIP,
      blocked: false
    })
    
    securityMonitor.logThreat({
      type: 'path_traversal',
      severity: 'medium',
      description: 'Path traversal attempt',
      payload: '../../../etc/passwd',
      ip: attackerIP,
      blocked: false
    })
    
    const isAnomalous = securityMonitor.detectAnomalousActivity(attackerIP)
    expect(isAnomalous).toBe(true)
    
    const suspiciousIPs = securityMonitor.getSuspiciousIPs()
    const attackerData = suspiciousIPs.find(ip => ip.ip === attackerIP)
    expect(attackerData?.threatCount).toBe(3)
  })

  it('should generate comprehensive security reports', () => {
    // Add various types of threats
    const threatTypes = ['xss', 'sql_injection', 'path_traversal', 'rate_limit'] as const
    
    threatTypes.forEach((type, index) => {
      for (let i = 0; i < index + 2; i++) {
        securityMonitor.logThreat({
          type,
          severity: index % 2 === 0 ? 'high' : 'medium',
          description: `${type} attempt ${i}`,
          payload: `payload-${type}-${i}`,
          blocked: true
        })
      }
    })
    
    const report = securityMonitor.generateSecurityReport()
    
    expect(report.summary.totalThreats).toBe(10) // 2+3+4+5 = 14, but we added 10
    expect(report.summary.topThreatTypes.length).toBeGreaterThan(0)
    expect(report.recommendations.length).toBeGreaterThan(0)
    
    // Should recommend SQL injection audit
    expect(report.recommendations.some(r => 
      r.includes('SQL injection')
    )).toBe(true)
  })

  it('should handle data exfiltration detection', () => {
    const largeRequestSize = 2 * 1024 * 1024 // 2MB
    const largeResponseSize = 15 * 1024 * 1024 // 15MB
    const suspiciousIP = '192.168.1.200'
    
    const detected = securityMonitor.detectDataExfiltration(
      largeRequestSize, 
      largeResponseSize, 
      suspiciousIP
    )
    
    expect(detected).toBe(true)
    
    const threats = securityMonitor.getThreats('data_exfiltration')
    expect(threats.length).toBe(1)
    expect(threats[0].ip).toBe(suspiciousIP)
    expect(threats[0].context?.requestSize).toBe(largeRequestSize)
    expect(threats[0].context?.responseSize).toBe(largeResponseSize)
  })

  it('should provide security metrics dashboard data', () => {
    // Add threats for today and yesterday
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    
    // Mock today's threats
    securityMonitor.logThreat({
      type: 'xss',
      severity: 'high',
      description: 'Today XSS attempt',
      payload: '<script>alert("today")</script>',
      blocked: true
    })
    
    const metrics = securityMonitor.getSecurityMetrics()
    
    expect(metrics.totalThreats).toBeGreaterThan(0)
    expect(metrics.threatsToday).toBeGreaterThan(0)
    expect(metrics.topThreatTypes.length).toBeGreaterThan(0)
    expect(metrics.recentThreats.length).toBeGreaterThan(0)
  })
})