import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { HTTPException } from 'hono/http-exception'
import { initializeDatabase } from '../db'
import { postsRouter } from './routes/posts'
import { transactionsRouter } from './routes/transactions'
import { accountsRouter } from './routes/accounts'
import { usersRouter } from './routes/users'
import { securityMonitor } from '../utils/securityMonitor'

// Enhanced error logging
interface ErrorLog {
  id: string
  timestamp: Date
  level: 'error' | 'warn' | 'info'
  message: string
  error?: any
  request?: {
    method: string
    url: string
    headers: Record<string, string>
    body?: any
  }
  response?: {
    status: number
    headers: Record<string, string>
  }
  userAgent?: string
  ip?: string
  userId?: string
}

class ServerErrorLogger {
  private logs: ErrorLog[] = []
  private maxLogs = 1000

  log(level: ErrorLog['level'], message: string, error?: any, context?: Partial<ErrorLog>): void {
    const logEntry: ErrorLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...context
    }

    this.logs.unshift(logEntry)
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs)
    }

    // Console logging with appropriate level
    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
    logMethod(`[${level.toUpperCase()}] ${message}`, error || '')

    // In production, send to external logging service
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalLogger(logEntry)
    }
  }

  private async sendToExternalLogger(log: ErrorLog): Promise<void> {
    // Implement external logging service integration
    // For now, just store in a file or database
    try {
      // Example: send to logging service
      // await fetch('https://logging-service.com/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(log)
      // })
    } catch (error) {
      console.error('Failed to send log to external service:', error)
    }
  }

  getLogs(level?: ErrorLog['level'], limit = 100): ErrorLog[] {
    let filteredLogs = this.logs
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level)
    }
    return filteredLogs.slice(0, limit)
  }

  clearLogs(): void {
    this.logs = []
  }
}

const serverLogger = new ServerErrorLogger()

// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function rateLimit(maxRequests = 100, windowMs = 60000) {
  return async (c: any, next: any) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean up old entries
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetTime < now) {
        rateLimitMap.delete(key)
      }
    }

    const current = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs }

    if (current.count >= maxRequests) {
      serverLogger.log('warn', `Rate limit exceeded for IP: ${ip}`, null, {
        request: {
          method: c.req.method,
          url: c.req.url,
          headers: Object.fromEntries(c.req.header())
        },
        ip
      })

      throw new HTTPException(429, { 
        message: 'Too many requests. Please try again later.',
        cause: `Rate limit: ${maxRequests} requests per ${windowMs}ms`
      })
    }

    current.count++
    rateLimitMap.set(ip, current)

    c.set('rateLimit', {
      remaining: maxRequests - current.count,
      resetTime: current.resetTime
    })

    await next()
  }
}

// Enhanced input sanitization and validation middleware
function sanitizeInput() {
  return async (c: any, next: any) => {
    if (c.req.method === 'POST' || c.req.method === 'PUT' || c.req.method === 'PATCH') {
      try {
        const body = await c.req.json()
        
        // Validate request size
        const bodyString = JSON.stringify(body)
        if (bodyString.length > 1024 * 1024) { // 1MB limit
          throw new HTTPException(413, { 
            message: 'Request payload too large',
            cause: 'Maximum request size is 1MB'
          })
        }
        
        // Sanitize and validate
        const sanitized = sanitizeObject(body)
        const validation = validateRequestStructure(sanitized, c.req.url, c.req.method)
        
        if (!validation.isValid) {
          throw new HTTPException(422, { 
            message: 'Validation failed',
            cause: { details: validation.errors }
          })
        }
        
        c.set('sanitizedBody', sanitized)
        c.set('originalBody', body)
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error
        }
        // Not JSON or parsing error
        if (c.req.header('content-type')?.includes('application/json')) {
          throw new HTTPException(400, { 
            message: 'Invalid JSON in request body',
            cause: 'Request body must be valid JSON'
          })
        }
      }
    }
    await next()
  }
}

function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  const sanitized: any = {}
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeValue(key)
    sanitized[sanitizedKey] = sanitizeObject(value)
  }
  return sanitized
}

function sanitizeValue(value: any): any {
  if (typeof value !== 'string') {
    return value
  }

  // Enhanced sanitization patterns
  let sanitized = value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/data:(?!image\/)/gi, '') // Remove data: protocols except images
    .replace(/vbscript:/gi, '') // Remove vbscript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi, '') // Remove SQL keywords
    .replace(/(--|\*\/|\*|\/\*)/g, '') // Remove SQL comments
    .replace(/\.\.[\/\\]/g, '') // Remove path traversal
    .trim()

  // Additional security checks
  if (detectXSSAttempt(sanitized)) {
    serverLogger.log('warn', 'XSS attempt detected in input', null, {
      originalValue: value,
      sanitizedValue: sanitized,
      threatType: 'XSS'
    })
    
    // Log to security monitor
    securityMonitor.logThreat({
      type: 'xss',
      severity: 'high',
      description: 'XSS attempt detected in user input',
      payload: value,
      blocked: true
    })
    
    return '' // Return empty string for security threats
  }
  
  if (detectSQLInjection(sanitized)) {
    serverLogger.log('warn', 'SQL injection attempt detected in input', null, {
      originalValue: value,
      sanitizedValue: sanitized,
      threatType: 'SQL_INJECTION'
    })
    
    // Log to security monitor
    securityMonitor.logThreat({
      type: 'sql_injection',
      severity: 'critical',
      description: 'SQL injection attempt detected in user input',
      payload: value,
      blocked: true
    })
    
    return '' // Return empty string for security threats
  }

  return sanitized
}

// Enhanced security threat detection
function detectXSSAttempt(value: string): boolean {
  const xssPatterns = [
    /javascript:/i,
    /vbscript:/i,
    /data:(?!image\/)/i, // Allow data: for images only
    /onload/i,
    /onerror/i,
    /onclick/i,
    /onmouseover/i,
    /onmouseout/i,
    /onfocus/i,
    /onblur/i,
    /onchange/i,
    /onsubmit/i,
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /<input/i,
    /<textarea/i,
    /<select/i,
    /<button/i,
    /eval\(/i,
    /expression\(/i,
    /document\./i,
    /window\./i,
    /alert\(/i,
    /confirm\(/i,
    /prompt\(/i,
    /setTimeout/i,
    /setInterval/i,
    /Function\(/i,
    /constructor/i,
    /__proto__/i,
    /prototype/i
  ]
  
  return xssPatterns.some(pattern => pattern.test(value))
}

function detectSQLInjection(value: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|REPLACE)\b.*\b(FROM|INTO|SET|WHERE|VALUES|TABLE)\b)/i,
    /(\bOR\b.*=.*\bOR\b)|(\bAND\b.*=.*\bAND\b)/i,
    /('|(\\')|(;)|(\\;)|(\-\-)|(\*\/)|(\*)|(\+)|(\|\|))/,
    /(\b(EXEC|EXECUTE)\b.*\b(SP_|XP_)\b)/i,
    /(\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS|DUAL)\b)/i,
    /(WAITFOR\s+DELAY|BENCHMARK\s*\(|SLEEP\s*\()/i,
    /(LOAD_FILE\s*\(|INTO\s+OUTFILE|INTO\s+DUMPFILE)/i,
    /(\bCAST\s*\(|\bCONVERT\s*\(|\bCHAR\s*\()/i,
    /(0x[0-9a-f]+|UNHEX\s*\(|HEX\s*\()/i,
    /(\bUNION\b.*\bSELECT\b|\bUNION\b.*\bALL\b.*\bSELECT\b)/i
  ]
  
  return sqlPatterns.some(pattern => pattern.test(value))
}

// Request structure validation
function validateRequestStructure(body: any, url: string, method: string): { isValid: boolean; errors: Record<string, string[]> } {
  const errors: Record<string, string[]> = {}
  
  // Post creation validation
  if (url.includes('/posts') && method === 'POST') {
    if (!body.content || typeof body.content !== 'string') {
      errors.content = ['Content is required and must be a string']
    } else if (body.content.length > 500) {
      errors.content = ['Content must be 500 characters or less']
    }
    
    if (!body.authorId || typeof body.authorId !== 'string') {
      errors.authorId = ['Author ID is required and must be a string']
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.authorId)) {
      errors.authorId = ['Author ID must be a valid UUID']
    }
    
    if (!body.authorPersona || typeof body.authorPersona !== 'string') {
      errors.authorPersona = ['Author persona is required and must be a string']
    }
    
    if (body.attachments && !Array.isArray(body.attachments)) {
      errors.attachments = ['Attachments must be an array']
    }
  }
  
  // Transaction creation validation
  if (url.includes('/transactions') && method === 'POST') {
    if (!body.description || typeof body.description !== 'string') {
      errors.description = ['Description is required and must be a string']
    } else if (body.description.length > 200) {
      errors.description = ['Description must be 200 characters or less']
    }
    
    if (!body.date) {
      errors.date = ['Date is required']
    } else if (new Date(body.date) > new Date()) {
      errors.date = ['Date cannot be in the future']
    }
    
    if (!body.entries || !Array.isArray(body.entries) || body.entries.length < 2) {
      errors.entries = ['At least 2 transaction entries are required']
    } else {
      // Validate transaction balance
      let totalDebits = 0
      let totalCredits = 0
      
      body.entries.forEach((entry: any, index: number) => {
        if (!entry.accountId) {
          errors[`entries.${index}.accountId`] = ['Account ID is required']
        }
        
        const hasDebit = entry.debitAmount && entry.debitAmount > 0
        const hasCredit = entry.creditAmount && entry.creditAmount > 0
        
        if (!hasDebit && !hasCredit) {
          errors[`entries.${index}.amount`] = ['Either debit or credit amount is required']
        }
        
        if (hasDebit && hasCredit) {
          errors[`entries.${index}.amount`] = ['Entry cannot have both debit and credit amounts']
        }
        
        if (hasDebit) totalDebits += entry.debitAmount
        if (hasCredit) totalCredits += entry.creditAmount
      })
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        errors.balance = ['Transaction must balance - total debits must equal total credits']
      }
    }
  }
  
  // Account creation validation
  if (url.includes('/accounts') && method === 'POST') {
    if (!body.name || typeof body.name !== 'string') {
      errors.name = ['Name is required and must be a string']
    } else if (body.name.length > 100) {
      errors.name = ['Name must be 100 characters or less']
    }
    
    const validTypes = ['asset', 'liability', 'equity', 'revenue', 'expense']
    if (!body.type || !validTypes.includes(body.type)) {
      errors.type = ['Type must be one of: asset, liability, equity, revenue, expense']
    }
    
    if (!body.category || typeof body.category !== 'string') {
      errors.category = ['Category is required and must be a string']
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Security headers middleware
function securityHeaders() {
  return async (c: any, next: any) => {
    await next()
    
    // Set security headers
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('X-Frame-Options', 'DENY')
    c.header('X-XSS-Protection', '1; mode=block')
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
  }
}

// Create Hono app
const app = new Hono()

// Security middleware (first)
app.use('*', securityHeaders())

// Rate limiting
app.use('*', rateLimit(100, 60000)) // 100 requests per minute

// CORS middleware
app.use('*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

// Logging middleware
app.use('*', logger())
app.use('*', prettyJSON())

// Input sanitization
app.use('*', sanitizeInput())

// Request logging middleware
app.use('*', async (c, next) => {
  const start = Date.now()
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  
  try {
    await next()
    
    const duration = Date.now() - start
    const rateLimit = c.get('rateLimit')
    
    // Add rate limit headers
    if (rateLimit) {
      c.header('X-RateLimit-Remaining', rateLimit.remaining.toString())
      c.header('X-RateLimit-Reset', rateLimit.resetTime.toString())
    }
    
    // Log successful requests (only in development or for errors)
    if (c.res.status >= 400) {
      serverLogger.log('warn', `HTTP ${c.res.status} ${c.req.method} ${c.req.url}`, null, {
        request: {
          method: c.req.method,
          url: c.req.url,
          headers: Object.fromEntries(c.req.header())
        },
        response: {
          status: c.res.status,
          headers: Object.fromEntries(c.res.headers.entries())
        },
        ip,
        userAgent: c.req.header('user-agent')
      })
    }
    
  } catch (error) {
    const duration = Date.now() - start
    
    serverLogger.log('error', `Request failed: ${c.req.method} ${c.req.url}`, error, {
      request: {
        method: c.req.method,
        url: c.req.url,
        headers: Object.fromEntries(c.req.header())
      },
      ip,
      userAgent: c.req.header('user-agent')
    })
    
    throw error
  }
})

// Enhanced error handling middleware
app.onError((err, c) => {
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
  const userId = c.get('userId') // Assuming auth middleware sets this
  
  // Enhanced error categorization
  const errorCategory = categorizeError(err)
  const errorSeverity = determineSeverity(err)
  
  // Log the error with enhanced context
  serverLogger.log('error', 'API Error occurred', err, {
    request: {
      method: c.req.method,
      url: c.req.url,
      headers: Object.fromEntries(c.req.header()),
      body: c.get('sanitizedBody')
    },
    ip,
    userId,
    userAgent: c.req.header('user-agent'),
    category: errorCategory,
    severity: errorSeverity,
    timestamp: new Date().toISOString()
  })
  
  if (err instanceof HTTPException) {
    // Enhanced error response with recovery suggestions
    const errorResponse = {
      error: err.message,
      message: getUserFriendlyMessage(err, errorCategory),
      timestamp: new Date().toISOString(),
      category: errorCategory,
      severity: errorSeverity,
      recoverable: isRecoverable(err),
      retryable: isRetryable(err),
      ...(process.env.NODE_ENV === 'development' && err.cause && { details: err.cause }),
      ...(err.status === 422 && { details: err.cause }) // Always include validation details
    }
    
    return c.json(errorResponse, err.status)
  }

  // Enhanced server error response
  const errorResponse = {
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message || 'An unexpected error occurred'
      : getUserFriendlyMessage(err, errorCategory),
    timestamp: new Date().toISOString(),
    category: errorCategory,
    severity: errorSeverity,
    recoverable: true,
    retryable: errorSeverity !== 'critical',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  }

  return c.json(errorResponse, 500)
})

// Error categorization helper
function categorizeError(error: any): string {
  if (error instanceof HTTPException) {
    if (error.status === 400) return 'validation'
    if (error.status === 401) return 'authentication'
    if (error.status === 403) return 'authorization'
    if (error.status === 404) return 'not_found'
    if (error.status === 409) return 'conflict'
    if (error.status === 422) return 'validation'
    if (error.status === 429) return 'rate_limit'
    if (error.status >= 500) return 'server'
  }
  
  const message = error.message?.toLowerCase() || ''
  if (message.includes('validation') || message.includes('required')) return 'validation'
  if (message.includes('balance') || message.includes('transaction')) return 'business'
  if (message.includes('database') || message.includes('sql')) return 'database'
  if (message.includes('network') || message.includes('timeout')) return 'network'
  if (message.includes('security') || message.includes('injection')) return 'security'
  
  return 'server'
}

// Error severity determination
function determineSeverity(error: any): string {
  if (error instanceof HTTPException) {
    if (error.status === 429) return 'medium' // Rate limiting
    if (error.status >= 400 && error.status < 500) return 'low' // Client errors
    if (error.status >= 500) return 'high' // Server errors
  }
  
  const message = error.message?.toLowerCase() || ''
  if (message.includes('security') || message.includes('injection')) return 'critical'
  if (message.includes('database') || message.includes('corruption')) return 'high'
  if (message.includes('validation') || message.includes('required')) return 'low'
  
  return 'medium'
}

// User-friendly message mapping
function getUserFriendlyMessage(error: any, category: string): string {
  const messages = {
    validation: 'Please check your input and try again.',
    authentication: 'You need to sign in to perform this action.',
    authorization: 'You don\'t have permission to perform this action.',
    not_found: 'The requested resource was not found.',
    conflict: 'This action conflicts with existing data.',
    rate_limit: 'Too many requests. Please wait a moment and try again.',
    business: 'Transaction must balance - total debits must equal total credits.',
    database: 'A database error occurred. Please try again later.',
    network: 'Network error occurred. Please check your connection.',
    security: 'Security violation detected. This incident has been logged.',
    server: 'Something went wrong on our end. Please try again later.'
  }
  
  return messages[category] || 'An unexpected error occurred.'
}

// Recovery determination
function isRecoverable(error: any): boolean {
  if (error instanceof HTTPException) {
    // Security errors are not recoverable
    if (error.status === 403 && error.message.includes('security')) return false
    // Most client errors are recoverable by fixing input
    if (error.status >= 400 && error.status < 500) return true
    // Server errors might be recoverable
    if (error.status >= 500) return true
  }
  
  const message = error.message?.toLowerCase() || ''
  if (message.includes('security') || message.includes('injection')) return false
  
  return true
}

// Retry determination
function isRetryable(error: any): boolean {
  if (error instanceof HTTPException) {
    // Rate limit errors are retryable after delay
    if (error.status === 429) return true
    // Server errors are retryable
    if (error.status >= 500) return true
    // Most client errors are not retryable
    if (error.status >= 400 && error.status < 500) return false
  }
  
  const message = error.message?.toLowerCase() || ''
  if (message.includes('network') || message.includes('timeout')) return true
  if (message.includes('validation') || message.includes('required')) return false
  
  return true
}

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  })
})

// Error logs endpoint (development only)
app.get('/api/logs', (c) => {
  if (process.env.NODE_ENV !== 'development') {
    throw new HTTPException(404, { message: 'Not found' })
  }
  
  const level = c.req.query('level') as 'error' | 'warn' | 'info' | undefined
  const limit = parseInt(c.req.query('limit') || '100')
  
  const logs = serverLogger.getLogs(level, limit)
  
  return c.json({
    data: logs,
    count: logs.length
  })
})

// Clear logs endpoint (development only)
app.delete('/api/logs', (c) => {
  if (process.env.NODE_ENV !== 'development') {
    throw new HTTPException(404, { message: 'Not found' })
  }
  
  serverLogger.clearLogs()
  
  return c.json({ message: 'Logs cleared successfully' })
})

// API routes
app.route('/api/posts', postsRouter)
app.route('/api/transactions', transactionsRouter)
app.route('/api/accounts', accountsRouter)
app.route('/api/users', usersRouter)

// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    timestamp: new Date().toISOString()
  }, 404)
})

// Initialize database and start server
async function startServer() {
  try {
    console.log('Initializing database...')
    await initializeDatabase(true) // Seed with default data
    
    console.log('Starting API server...')
    const port = process.env.PORT || 3001
    
    console.log(`Server running on http://localhost:${port}`)
    
    return {
      port: Number(port),
      fetch: app.fetch
    }
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

export { app, startServer }