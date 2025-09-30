import { describe, it, expect } from 'vitest'
import {
  validatePost,
  validateTransaction,
  validateTransactionEntry,
  validateAccount,
  validateUser,
  validateUserPersona,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  parseAmount,
  generateId,
  VALIDATION_CONSTANTS
} from '../src/utils/validation'
import type { Post, Transaction, TransactionEntry, Account, User, UserPersona } from '../src/types'

describe('Post Validation', () => {
  it('should validate a valid post', () => {
    const validPost: Partial<Post> = {
      content: 'This is a valid post',
      authorId: 'user-123',
      authorPersona: 'Marketing Manager'
    }

    const result = validatePost(validPost)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject post without content', () => {
    const invalidPost: Partial<Post> = {
      authorId: 'user-123',
      authorPersona: 'Marketing Manager'
    }

    const result = validatePost(invalidPost)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Post content is required')
  })

  it('should reject post with empty content', () => {
    const invalidPost: Partial<Post> = {
      content: '   ',
      authorId: 'user-123',
      authorPersona: 'Marketing Manager'
    }

    const result = validatePost(invalidPost)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Post content is required')
  })

  it('should reject post with content too long', () => {
    const invalidPost: Partial<Post> = {
      content: 'a'.repeat(VALIDATION_CONSTANTS.POST_MAX_LENGTH + 1),
      authorId: 'user-123',
      authorPersona: 'Marketing Manager'
    }

    const result = validatePost(invalidPost)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain(`Post content must be ${VALIDATION_CONSTANTS.POST_MAX_LENGTH} characters or less`)
  })

  it('should reject post without author ID', () => {
    const invalidPost: Partial<Post> = {
      content: 'Valid content',
      authorPersona: 'Marketing Manager'
    }

    const result = validatePost(invalidPost)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Author ID is required')
  })

  it('should reject post without author persona', () => {
    const invalidPost: Partial<Post> = {
      content: 'Valid content',
      authorId: 'user-123'
    }

    const result = validatePost(invalidPost)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Author persona is required')
  })

  it('should validate post with attachments', () => {
    const validPost: Partial<Post> = {
      content: 'Post with attachments',
      authorId: 'user-123',
      authorPersona: 'Marketing Manager',
      attachments: ['file1.pdf', 'file2.jpg']
    }

    const result = validatePost(validPost)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject post with empty attachment', () => {
    const invalidPost: Partial<Post> = {
      content: 'Post with invalid attachments',
      authorId: 'user-123',
      authorPersona: 'Marketing Manager',
      attachments: ['file1.pdf', '']
    }

    const result = validatePost(invalidPost)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Attachment 2 cannot be empty')
  })
})

describe('Transaction Entry Validation', () => {
  it('should validate a valid debit entry', () => {
    const validEntry: Partial<TransactionEntry> = {
      accountId: 'account-123',
      debitAmount: 100.50
    }

    const result = validateTransactionEntry(validEntry)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should validate a valid credit entry', () => {
    const validEntry: Partial<TransactionEntry> = {
      accountId: 'account-123',
      creditAmount: 100.50
    }

    const result = validateTransactionEntry(validEntry)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject entry without account ID', () => {
    const invalidEntry: Partial<TransactionEntry> = {
      debitAmount: 100.50
    }

    const result = validateTransactionEntry(invalidEntry)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Account ID is required')
  })

  it('should reject entry without amounts', () => {
    const invalidEntry: Partial<TransactionEntry> = {
      accountId: 'account-123'
    }

    const result = validateTransactionEntry(invalidEntry)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Entry must have either a debit or credit amount')
  })

  it('should reject entry with both debit and credit', () => {
    const invalidEntry: Partial<TransactionEntry> = {
      accountId: 'account-123',
      debitAmount: 100.50,
      creditAmount: 100.50
    }

    const result = validateTransactionEntry(invalidEntry)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Entry cannot have both debit and credit amounts')
  })

  it('should reject entry with amount too small', () => {
    const invalidEntry: Partial<TransactionEntry> = {
      accountId: 'account-123',
      debitAmount: 0.001
    }

    const result = validateTransactionEntry(invalidEntry)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain(`Debit amount must be between ${VALIDATION_CONSTANTS.MIN_AMOUNT} and ${VALIDATION_CONSTANTS.MAX_AMOUNT}`)
  })

  it('should reject entry with amount too large', () => {
    const invalidEntry: Partial<TransactionEntry> = {
      accountId: 'account-123',
      debitAmount: VALIDATION_CONSTANTS.MAX_AMOUNT + 1
    }

    const result = validateTransactionEntry(invalidEntry)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain(`Debit amount must be between ${VALIDATION_CONSTANTS.MIN_AMOUNT} and ${VALIDATION_CONSTANTS.MAX_AMOUNT}`)
  })
})

describe('Transaction Validation', () => {
  it('should validate a balanced transaction', () => {
    const validTransaction: Partial<Transaction> = {
      description: 'Office supplies purchase',
      date: new Date('2024-01-15'),
      createdBy: 'user-123',
      entries: [
        {
          id: 'entry-1',
          transactionId: 'trans-1',
          accountId: 'supplies-account',
          debitAmount: 100.00
        },
        {
          id: 'entry-2',
          transactionId: 'trans-1',
          accountId: 'cash-account',
          creditAmount: 100.00
        }
      ]
    }

    const result = validateTransaction(validTransaction)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.totalDebits).toBe(100.00)
    expect(result.totalCredits).toBe(100.00)
    expect(result.balance).toBe(0)
  })

  it('should reject unbalanced transaction', () => {
    const invalidTransaction: Partial<Transaction> = {
      description: 'Unbalanced transaction',
      date: new Date('2024-01-15'),
      createdBy: 'user-123',
      entries: [
        {
          id: 'entry-1',
          transactionId: 'trans-1',
          accountId: 'supplies-account',
          debitAmount: 100.00
        },
        {
          id: 'entry-2',
          transactionId: 'trans-1',
          accountId: 'cash-account',
          creditAmount: 90.00
        }
      ]
    }

    const result = validateTransaction(invalidTransaction)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Transaction does not balance. Debits: $100.00, Credits: $90.00')
    expect(result.totalDebits).toBe(100.00)
    expect(result.totalCredits).toBe(90.00)
    expect(result.balance).toBe(10.00)
  })

  it('should reject transaction without description', () => {
    const invalidTransaction: Partial<Transaction> = {
      date: new Date('2024-01-15'),
      createdBy: 'user-123',
      entries: []
    }

    const result = validateTransaction(invalidTransaction)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Transaction description is required')
  })

  it('should reject transaction with future date', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)

    const invalidTransaction: Partial<Transaction> = {
      description: 'Future transaction',
      date: futureDate,
      createdBy: 'user-123',
      entries: []
    }

    const result = validateTransaction(invalidTransaction)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Transaction date cannot be in the future')
  })

  it('should reject transaction with insufficient entries', () => {
    const invalidTransaction: Partial<Transaction> = {
      description: 'Single entry transaction',
      date: new Date('2024-01-15'),
      createdBy: 'user-123',
      entries: [
        {
          id: 'entry-1',
          transactionId: 'trans-1',
          accountId: 'supplies-account',
          debitAmount: 100.00
        }
      ]
    }

    const result = validateTransaction(invalidTransaction)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain(`Transaction must have at least ${VALIDATION_CONSTANTS.MIN_TRANSACTION_ENTRIES} entries`)
  })
})

describe('Account Validation', () => {
  it('should validate a valid account', () => {
    const validAccount: Partial<Account> = {
      name: 'Cash',
      type: 'asset',
      category: 'Current Assets'
    }

    const result = validateAccount(validAccount)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject account without name', () => {
    const invalidAccount: Partial<Account> = {
      type: 'asset',
      category: 'Current Assets'
    }

    const result = validateAccount(invalidAccount)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Account name is required')
  })

  it('should reject account with invalid type', () => {
    const invalidAccount: Partial<Account> = {
      name: 'Cash',
      type: 'invalid' as any,
      category: 'Current Assets'
    }

    const result = validateAccount(invalidAccount)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Account type must be one of: asset, liability, equity, revenue, expense')
  })

  it('should reject account without category', () => {
    const invalidAccount: Partial<Account> = {
      name: 'Cash',
      type: 'asset'
    }

    const result = validateAccount(invalidAccount)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Account category is required')
  })
})

describe('User Validation', () => {
  it('should validate a valid user', () => {
    const validUser: Partial<User> = {
      name: 'John Doe',
      email: 'john@example.com',
      personas: [
        {
          id: 'persona-1',
          name: 'Accountant',
          role: 'Finance'
        }
      ]
    }

    const result = validateUser(validUser)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject user without name', () => {
    const invalidUser: Partial<User> = {
      email: 'john@example.com'
    }

    const result = validateUser(invalidUser)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('User name is required')
  })

  it('should reject user with invalid email', () => {
    const invalidUser: Partial<User> = {
      name: 'John Doe',
      email: 'invalid-email'
    }

    const result = validateUser(invalidUser)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('User email must be a valid email address')
  })

  it('should validate user personas', () => {
    const invalidUser: Partial<User> = {
      name: 'John Doe',
      email: 'john@example.com',
      personas: [
        {
          id: 'persona-1',
          name: '',
          role: 'Finance'
        }
      ]
    }

    const result = validateUser(invalidUser)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Persona 1: Persona name is required')
  })
})

describe('User Persona Validation', () => {
  it('should validate a valid persona', () => {
    const validPersona: Partial<UserPersona> = {
      name: 'Marketing Manager',
      role: 'Marketing'
    }

    const result = validateUserPersona(validPersona)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject persona without name', () => {
    const invalidPersona: Partial<UserPersona> = {
      role: 'Marketing'
    }

    const result = validateUserPersona(invalidPersona)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Persona name is required')
  })

  it('should reject persona without role', () => {
    const invalidPersona: Partial<UserPersona> = {
      name: 'Marketing Manager'
    }

    const result = validateUserPersona(invalidPersona)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Persona role is required')
  })
})

describe('Currency Formatting', () => {
  it('should format currency correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
    expect(formatCurrency(0)).toBe('$0.00')
    expect(formatCurrency(0.99)).toBe('$0.99')
    expect(formatCurrency(1000000)).toBe('$1,000,000.00')
  })

  it('should format currency with different currency codes', () => {
    expect(formatCurrency(1234.56, 'EUR')).toBe('€1,234.56')
    expect(formatCurrency(1234.56, 'GBP')).toBe('£1,234.56')
  })
})

describe('Date Formatting', () => {
  const testDate = new Date('2024-01-15T10:30:00Z')

  it('should format date correctly', () => {
    const formatted = formatDate(testDate)
    expect(formatted).toMatch(/Jan 15, 2024/)
  })

  it('should format date time correctly', () => {
    const formatted = formatDateTime(testDate)
    expect(formatted).toMatch(/Jan 15, 2024/)
    expect(formatted).toMatch(/\d{1,2}:\d{2}/)
  })

  it('should format relative time correctly', () => {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    expect(formatRelativeTime(new Date(now.getTime() - 30 * 1000))).toBe('just now')
    expect(formatRelativeTime(oneMinuteAgo)).toBe('1 minute ago')
    expect(formatRelativeTime(oneHourAgo)).toBe('1 hour ago')
    expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago')
  })
})

describe('Amount Parsing', () => {
  it('should parse valid amounts', () => {
    expect(parseAmount('123.45')).toBe(123.45)
    expect(parseAmount('$123.45')).toBe(123.45)
    expect(parseAmount('1,234.56')).toBe(1234.56)
    expect(parseAmount('$1,234.56')).toBe(1234.56)
    expect(parseAmount('0')).toBe(0)
    expect(parseAmount('0.01')).toBe(0.01)
  })

  it('should handle invalid amounts', () => {
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('-123')).toBeNull()
    expect(parseAmount('123.456')).toBe(123.46) // Rounds to 2 decimal places
  })
})

describe('ID Generation', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    
    expect(id1).toBeTruthy()
    expect(id2).toBeTruthy()
    expect(id1).not.toBe(id2)
    expect(typeof id1).toBe('string')
    expect(typeof id2).toBe('string')
  })
})