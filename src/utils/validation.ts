import type { 
  Post, 
  Transaction, 
  TransactionEntry, 
  Account, 
  User, 
  UserPersona,
  ValidationResult,
  TransactionValidation 
} from '../types'

// Security and sanitization utilities
export const SECURITY_PATTERNS = {
  // XSS prevention patterns
  SCRIPT_TAG: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  HTML_TAGS: /<[^>]*>/g,
  JAVASCRIPT_PROTOCOL: /javascript:/gi,
  DATA_PROTOCOL: /data:/gi,
  VBSCRIPT_PROTOCOL: /vbscript:/gi,
  
  // SQL injection patterns
  SQL_KEYWORDS: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  SQL_COMMENTS: /(--|\*\/|\*|\/\*)/g,
  
  // File path traversal
  PATH_TRAVERSAL: /\.\.[\/\\]/g,
  
  // Email validation (more strict)
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  
  // Safe filename pattern
  SAFE_FILENAME: /^[a-zA-Z0-9._-]+$/,
  
  // Currency amount pattern
  CURRENCY_AMOUNT: /^\d+(\.\d{1,2})?$/
} as const

// Constants for validation
export const VALIDATION_CONSTANTS = {
  POST_MAX_LENGTH: 500,
  ACCOUNT_NAME_MAX_LENGTH: 100,
  USER_NAME_MAX_LENGTH: 50,
  PERSONA_NAME_MAX_LENGTH: 30,
  TRANSACTION_DESCRIPTION_MAX_LENGTH: 200,
  MIN_TRANSACTION_ENTRIES: 2,
  DECIMAL_PRECISION: 2,
  MAX_AMOUNT: 999999999.99,
  MIN_AMOUNT: 0.01
} as const

// Post validation
export function validatePost(post: Partial<Post>): ValidationResult {
  const errors: string[] = []

  if (!post.content || post.content.trim().length === 0) {
    errors.push('Post content is required')
  } else if (post.content.length > VALIDATION_CONSTANTS.POST_MAX_LENGTH) {
    errors.push(`Post content must be ${VALIDATION_CONSTANTS.POST_MAX_LENGTH} characters or less`)
  }

  if (!post.authorId || post.authorId.trim().length === 0) {
    errors.push('Author ID is required')
  }

  if (!post.authorPersona || post.authorPersona.trim().length === 0) {
    errors.push('Author persona is required')
  }

  // Validate attachments if present
  if (post.attachments && post.attachments.length > 0) {
    post.attachments.forEach((attachment, index) => {
      if (!attachment || attachment.trim().length === 0) {
        errors.push(`Attachment ${index + 1} cannot be empty`)
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Transaction validation with balance checking
export function validateTransaction(transaction: Partial<Transaction>): TransactionValidation {
  const errors: string[] = []
  let totalDebits = 0
  let totalCredits = 0

  if (!transaction.description || transaction.description.trim().length === 0) {
    errors.push('Transaction description is required')
  } else if (transaction.description.length > VALIDATION_CONSTANTS.TRANSACTION_DESCRIPTION_MAX_LENGTH) {
    errors.push(`Transaction description must be ${VALIDATION_CONSTANTS.TRANSACTION_DESCRIPTION_MAX_LENGTH} characters or less`)
  }

  if (!transaction.date) {
    errors.push('Transaction date is required')
  } else if (transaction.date > new Date()) {
    errors.push('Transaction date cannot be in the future')
  }

  if (!transaction.createdBy || transaction.createdBy.trim().length === 0) {
    errors.push('Transaction creator is required')
  }

  if (!transaction.entries || transaction.entries.length < VALIDATION_CONSTANTS.MIN_TRANSACTION_ENTRIES) {
    errors.push(`Transaction must have at least ${VALIDATION_CONSTANTS.MIN_TRANSACTION_ENTRIES} entries`)
  } else {
    // Validate each transaction entry and calculate totals
    transaction.entries.forEach((entry, index) => {
      const entryValidation = validateTransactionEntry(entry)
      if (!entryValidation.isValid) {
        errors.push(...entryValidation.errors.map(error => `Entry ${index + 1}: ${error}`))
      }

      if (entry.debitAmount) {
        totalDebits += entry.debitAmount
      }
      if (entry.creditAmount) {
        totalCredits += entry.creditAmount
      }
    })

    // Check if transaction balances
    const balance = Math.abs(totalDebits - totalCredits)
    if (balance > 0.001) { // Allow for small floating point differences
      errors.push(`Transaction does not balance. Debits: ${formatCurrency(totalDebits)}, Credits: ${formatCurrency(totalCredits)}`)
    }
  }

  const balance = Math.abs(totalDebits - totalCredits)

  return {
    isValid: errors.length === 0,
    errors,
    totalDebits: Math.round(totalDebits * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    balance: Math.round(balance * 100) / 100
  }
}

// Transaction entry validation
export function validateTransactionEntry(entry: Partial<TransactionEntry>): ValidationResult {
  const errors: string[] = []

  if (!entry.accountId || entry.accountId.trim().length === 0) {
    errors.push('Account ID is required')
  }

  const hasDebit = entry.debitAmount !== undefined && entry.debitAmount !== null && entry.debitAmount > 0
  const hasCredit = entry.creditAmount !== undefined && entry.creditAmount !== null && entry.creditAmount > 0

  if (!hasDebit && !hasCredit) {
    errors.push('Entry must have either a debit or credit amount')
  }

  if (hasDebit && hasCredit) {
    errors.push('Entry cannot have both debit and credit amounts')
  }

  if (hasDebit && (entry.debitAmount! < VALIDATION_CONSTANTS.MIN_AMOUNT || entry.debitAmount! > VALIDATION_CONSTANTS.MAX_AMOUNT)) {
    errors.push(`Debit amount must be between ${VALIDATION_CONSTANTS.MIN_AMOUNT} and ${VALIDATION_CONSTANTS.MAX_AMOUNT}`)
  }

  if (hasCredit && (entry.creditAmount! < VALIDATION_CONSTANTS.MIN_AMOUNT || entry.creditAmount! > VALIDATION_CONSTANTS.MAX_AMOUNT)) {
    errors.push(`Credit amount must be between ${VALIDATION_CONSTANTS.MIN_AMOUNT} and ${VALIDATION_CONSTANTS.MAX_AMOUNT}`)
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Account validation
export function validateAccount(account: Partial<Account>): ValidationResult {
  const errors: string[] = []

  if (!account.name || account.name.trim().length === 0) {
    errors.push('Account name is required')
  } else if (account.name.length > VALIDATION_CONSTANTS.ACCOUNT_NAME_MAX_LENGTH) {
    errors.push(`Account name must be ${VALIDATION_CONSTANTS.ACCOUNT_NAME_MAX_LENGTH} characters or less`)
  }

  const validAccountTypes = ['asset', 'liability', 'equity', 'revenue', 'expense']
  if (!account.type || !validAccountTypes.includes(account.type)) {
    errors.push('Account type must be one of: asset, liability, equity, revenue, expense')
  }

  if (!account.category || account.category.trim().length === 0) {
    errors.push('Account category is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// User validation
export function validateUser(user: Partial<User>): ValidationResult {
  const errors: string[] = []

  if (!user.name || user.name.trim().length === 0) {
    errors.push('User name is required')
  } else if (user.name.length > VALIDATION_CONSTANTS.USER_NAME_MAX_LENGTH) {
    errors.push(`User name must be ${VALIDATION_CONSTANTS.USER_NAME_MAX_LENGTH} characters or less`)
  }

  if (!user.email || user.email.trim().length === 0) {
    errors.push('User email is required')
  } else if (!isValidEmail(user.email)) {
    errors.push('User email must be a valid email address')
  }

  if (user.personas && user.personas.length > 0) {
    user.personas.forEach((persona, index) => {
      const personaValidation = validateUserPersona(persona)
      if (!personaValidation.isValid) {
        errors.push(...personaValidation.errors.map(error => `Persona ${index + 1}: ${error}`))
      }
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// User persona validation
export function validateUserPersona(persona: Partial<UserPersona>): ValidationResult {
  const errors: string[] = []

  if (!persona.name || persona.name.trim().length === 0) {
    errors.push('Persona name is required')
  } else if (persona.name.length > VALIDATION_CONSTANTS.PERSONA_NAME_MAX_LENGTH) {
    errors.push(`Persona name must be ${VALIDATION_CONSTANTS.PERSONA_NAME_MAX_LENGTH} characters or less`)
  }

  if (!persona.role || persona.role.trim().length === 0) {
    errors.push('Persona role is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Currency formatting utility
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

// Date formatting utilities
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date)
}

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else {
    return formatDate(date)
  }
}

// Amount parsing utility
export function parseAmount(value: string): number | null {
  const cleaned = value.replace(/[,$\s]/g, '')
  const parsed = parseFloat(cleaned)
  
  if (isNaN(parsed) || parsed < 0) {
    return null
  }
  
  return Math.round(parsed * 100) / 100 // Round to 2 decimal places
}

// Generate unique ID utility
export function generateId(): string {
  return crypto.randomUUID()
}

// Input sanitization functions
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  return input
    .replace(SECURITY_PATTERNS.SCRIPT_TAG, '') // Remove script tags
    .replace(SECURITY_PATTERNS.HTML_TAGS, '') // Remove HTML tags
    .replace(SECURITY_PATTERNS.JAVASCRIPT_PROTOCOL, '') // Remove javascript: protocols
    .replace(SECURITY_PATTERNS.DATA_PROTOCOL, '') // Remove data: protocols
    .replace(SECURITY_PATTERNS.VBSCRIPT_PROTOCOL, '') // Remove vbscript: protocols
    .replace(SECURITY_PATTERNS.SQL_KEYWORDS, '') // Remove SQL keywords
    .replace(SECURITY_PATTERNS.SQL_COMMENTS, '') // Remove SQL comments
    .trim()
}

export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return ''
  }
  
  return filename
    .replace(SECURITY_PATTERNS.PATH_TRAVERSAL, '') // Remove path traversal
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe characters
    .substring(0, 255) // Limit length
    .trim()
}

export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return ''
  }
  
  return email.toLowerCase().trim()
}

export function sanitizeAmount(amount: string | number): string {
  if (typeof amount === 'number') {
    return amount.toFixed(2)
  }
  
  if (typeof amount !== 'string') {
    return '0.00'
  }
  
  // Remove all non-numeric characters except decimal point
  const cleaned = amount.replace(/[^0-9.]/g, '')
  
  // Ensure only one decimal point
  const parts = cleaned.split('.')
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('')
  }
  
  // Limit to 2 decimal places
  if (parts.length === 2) {
    return parts[0] + '.' + parts[1].substring(0, 2)
  }
  
  return cleaned || '0'
}

// Enhanced validation with comprehensive security checks
export function validateAndSanitizePost(post: Partial<Post>): ValidationResult & { sanitized?: Partial<Post> } {
  const errors: string[] = []
  const sanitized: Partial<Post> = {}

  // Sanitize and validate content
  if (!post.content || typeof post.content !== 'string') {
    errors.push('Post content is required')
  } else {
    const sanitizedContent = sanitizeText(post.content)
    if (sanitizedContent.length === 0) {
      errors.push('Post content cannot be empty after sanitization')
    } else if (sanitizedContent.length > VALIDATION_CONSTANTS.POST_MAX_LENGTH) {
      errors.push(`Post content must be ${VALIDATION_CONSTANTS.POST_MAX_LENGTH} characters or less`)
    } else {
      sanitized.content = sanitizedContent
    }
  }

  // Validate author ID (should be UUID format)
  if (!post.authorId || typeof post.authorId !== 'string') {
    errors.push('Author ID is required')
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(post.authorId)) {
    errors.push('Invalid author ID format')
  } else {
    sanitized.authorId = post.authorId
  }

  // Sanitize and validate author persona
  if (!post.authorPersona || typeof post.authorPersona !== 'string') {
    errors.push('Author persona is required')
  } else {
    const sanitizedPersona = sanitizeText(post.authorPersona)
    if (sanitizedPersona.length === 0) {
      errors.push('Author persona cannot be empty')
    } else {
      sanitized.authorPersona = sanitizedPersona
    }
  }

  // Sanitize attachments if present
  if (post.attachments && Array.isArray(post.attachments)) {
    const sanitizedAttachments: string[] = []
    post.attachments.forEach((attachment, index) => {
      if (typeof attachment === 'string') {
        const sanitizedFilename = sanitizeFilename(attachment)
        if (sanitizedFilename.length > 0) {
          sanitizedAttachments.push(sanitizedFilename)
        } else {
          errors.push(`Attachment ${index + 1} has invalid filename`)
        }
      } else {
        errors.push(`Attachment ${index + 1} must be a string`)
      }
    })
    sanitized.attachments = sanitizedAttachments
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined
  }
}

export function validateAndSanitizeAccount(account: Partial<Account>): ValidationResult & { sanitized?: Partial<Account> } {
  const errors: string[] = []
  const sanitized: Partial<Account> = {}

  // Sanitize and validate name
  if (!account.name || typeof account.name !== 'string') {
    errors.push('Account name is required')
  } else {
    const sanitizedName = sanitizeText(account.name)
    if (sanitizedName.length === 0) {
      errors.push('Account name cannot be empty after sanitization')
    } else if (sanitizedName.length > VALIDATION_CONSTANTS.ACCOUNT_NAME_MAX_LENGTH) {
      errors.push(`Account name must be ${VALIDATION_CONSTANTS.ACCOUNT_NAME_MAX_LENGTH} characters or less`)
    } else {
      sanitized.name = sanitizedName
    }
  }

  // Validate account type
  const validAccountTypes = ['asset', 'liability', 'equity', 'revenue', 'expense']
  if (!account.type || !validAccountTypes.includes(account.type)) {
    errors.push('Account type must be one of: asset, liability, equity, revenue, expense')
  } else {
    sanitized.type = account.type as Account['type']
  }

  // Sanitize and validate category
  if (!account.category || typeof account.category !== 'string') {
    errors.push('Account category is required')
  } else {
    const sanitizedCategory = sanitizeText(account.category)
    if (sanitizedCategory.length === 0) {
      errors.push('Account category cannot be empty after sanitization')
    } else {
      sanitized.category = sanitizedCategory
    }
  }

  // Validate isActive
  if (account.isActive !== undefined) {
    sanitized.isActive = Boolean(account.isActive)
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined
  }
}

export function validateAndSanitizeUser(user: Partial<User>): ValidationResult & { sanitized?: Partial<User> } {
  const errors: string[] = []
  const sanitized: Partial<User> = {}

  // Sanitize and validate name
  if (!user.name || typeof user.name !== 'string') {
    errors.push('User name is required')
  } else {
    const sanitizedName = sanitizeText(user.name)
    if (sanitizedName.length === 0) {
      errors.push('User name cannot be empty after sanitization')
    } else if (sanitizedName.length > VALIDATION_CONSTANTS.USER_NAME_MAX_LENGTH) {
      errors.push(`User name must be ${VALIDATION_CONSTANTS.USER_NAME_MAX_LENGTH} characters or less`)
    } else {
      sanitized.name = sanitizedName
    }
  }

  // Sanitize and validate email
  if (!user.email || typeof user.email !== 'string') {
    errors.push('User email is required')
  } else {
    const sanitizedEmail = sanitizeEmail(user.email)
    if (!SECURITY_PATTERNS.EMAIL.test(sanitizedEmail)) {
      errors.push('User email must be a valid email address')
    } else {
      sanitized.email = sanitizedEmail
    }
  }

  // Validate personas
  if (user.personas && Array.isArray(user.personas)) {
    const sanitizedPersonas: UserPersona[] = []
    user.personas.forEach((persona, index) => {
      const personaValidation = validateAndSanitizeUserPersona(persona)
      if (!personaValidation.isValid) {
        errors.push(...personaValidation.errors.map(error => `Persona ${index + 1}: ${error}`))
      } else if (personaValidation.sanitized) {
        sanitizedPersonas.push(personaValidation.sanitized as UserPersona)
      }
    })
    sanitized.personas = sanitizedPersonas
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined
  }
}

export function validateAndSanitizeUserPersona(persona: Partial<UserPersona>): ValidationResult & { sanitized?: Partial<UserPersona> } {
  const errors: string[] = []
  const sanitized: Partial<UserPersona> = {}

  // Validate ID if present
  if (persona.id) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(persona.id)) {
      errors.push('Invalid persona ID format')
    } else {
      sanitized.id = persona.id
    }
  }

  // Sanitize and validate name
  if (!persona.name || typeof persona.name !== 'string') {
    errors.push('Persona name is required')
  } else {
    const sanitizedName = sanitizeText(persona.name)
    if (sanitizedName.length === 0) {
      errors.push('Persona name cannot be empty after sanitization')
    } else if (sanitizedName.length > VALIDATION_CONSTANTS.PERSONA_NAME_MAX_LENGTH) {
      errors.push(`Persona name must be ${VALIDATION_CONSTANTS.PERSONA_NAME_MAX_LENGTH} characters or less`)
    } else {
      sanitized.name = sanitizedName
    }
  }

  // Sanitize and validate role
  if (!persona.role || typeof persona.role !== 'string') {
    errors.push('Persona role is required')
  } else {
    const sanitizedRole = sanitizeText(persona.role)
    if (sanitizedRole.length === 0) {
      errors.push('Persona role cannot be empty after sanitization')
    } else {
      sanitized.role = sanitizedRole
    }
  }

  // Sanitize avatar if present
  if (persona.avatar && typeof persona.avatar === 'string') {
    const sanitizedAvatar = sanitizeText(persona.avatar)
    if (sanitizedAvatar.length > 0) {
      sanitized.avatar = sanitizedAvatar
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined
  }
}

// Rate limiting utilities
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || []
    
    // Filter out old requests
    const recentRequests = requests.filter(time => time > windowStart)
    
    // Check if under limit
    if (recentRequests.length >= this.maxRequests) {
      return false
    }
    
    // Add current request
    recentRequests.push(now)
    this.requests.set(identifier, recentRequests)
    
    return true
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now()
    const windowStart = now - this.windowMs
    const requests = this.requests.get(identifier) || []
    const recentRequests = requests.filter(time => time > windowStart)
    
    return Math.max(0, this.maxRequests - recentRequests.length)
  }

  getResetTime(identifier: string): number {
    const requests = this.requests.get(identifier) || []
    if (requests.length === 0) return 0
    
    const oldestRequest = Math.min(...requests)
    return oldestRequest + this.windowMs
  }
}

// Error recovery utilities
export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'ignore' | 'redirect'
  label: string
  action: () => void | Promise<void>
}

export function createRecoveryActions(error: Error, context: string): RecoveryAction[] {
  const actions: RecoveryAction[] = []

  // Network errors
  if (error.message.includes('fetch') || error.message.includes('network')) {
    actions.push({
      type: 'retry',
      label: 'Try Again',
      action: () => window.location.reload()
    })
  }

  // Validation errors
  if (error.message.includes('validation') || error.message.includes('required')) {
    actions.push({
      type: 'fallback',
      label: 'Review Form',
      action: () => {
        // Scroll to first error field
        const errorElement = document.querySelector('.border-red-300, .border-error-300')
        errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }

  // Authentication errors
  if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
    actions.push({
      type: 'redirect',
      label: 'Sign In',
      action: () => {
        // In a real app, this would redirect to login
        console.log('Redirect to login')
      }
    })
  }

  // Server errors
  if (error.message.includes('server') || error.message.includes('500')) {
    actions.push({
      type: 'retry',
      label: 'Retry',
      action: () => window.location.reload()
    })
    
    actions.push({
      type: 'fallback',
      label: 'Report Issue',
      action: () => {
        console.log('Report issue:', error.message)
      }
    })
  }

  return actions
}