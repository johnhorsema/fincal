import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useTransactions } from '../src/composables/useTransactions'
import { usePosts } from '../src/composables/usePosts'
import { validateTransaction } from '../src/utils/validation'
import type { Post, Transaction, TransactionEntry } from '../src/types'

// Mock the database
vi.mock('../db', () => ({
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn() }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValue([]) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn() })
  },
  transactions: {},
  transactionEntries: {},
  posts: {},
  eq: vi.fn(),
  and: vi.fn()
}))

describe('Transaction Creation Integration', () => {
  let transactionComposable: ReturnType<typeof useTransactions>
  let postsComposable: ReturnType<typeof usePosts>

  const mockPost: Post = {
    id: 'post-1',
    content: 'Received $1000 payment from client for consulting services',
    authorId: 'user-1',
    authorPersona: 'Accountant',
    createdAt: new Date('2024-01-15'),
    attachments: [],
    transactionId: undefined
  }

  const mockTransactionData: Omit<Transaction, 'id'> = {
    postId: 'post-1',
    description: 'Client payment for consulting services',
    date: new Date('2024-01-15'),
    status: 'pending',
    createdBy: 'user-1',
    entries: [
      {
        id: 'entry-1',
        transactionId: '', // Will be set when transaction is created
        accountId: 'cash-account',
        debitAmount: 1000,
        creditAmount: undefined
      },
      {
        id: 'entry-2',
        transactionId: '', // Will be set when transaction is created
        accountId: 'revenue-account',
        debitAmount: undefined,
        creditAmount: 1000
      }
    ]
  }

  beforeEach(() => {
    transactionComposable = useTransactions()
    postsComposable = usePosts()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create a valid transaction from post data', async () => {
    // Validate the transaction data first
    const validation = validateTransaction(mockTransactionData)
    expect(validation.isValid).toBe(true)
    expect(validation.totalDebits).toBe(1000)
    expect(validation.totalCredits).toBe(1000)
    expect(validation.balance).toBe(0)

    // Mock successful database operations
    const mockDb = await import('../../server/db')
    vi.mocked(mockDb.db.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined)
    } as any)

    // Create the transaction
    const result = await transactionComposable.createTransaction(mockTransactionData)

    expect(result).toBeDefined()
    expect(result.postId).toBe(mockPost.id)
    expect(result.description).toBe(mockTransactionData.description)
    expect(result.status).toBe('pending')
    expect(result.entries).toHaveLength(2)
  })

  it('should reject unbalanced transaction', async () => {
    const unbalancedTransaction: Omit<Transaction, 'id'> = {
      ...mockTransactionData,
      entries: [
        {
          id: 'entry-1',
          transactionId: '',
          accountId: 'cash-account',
          debitAmount: 1000,
          creditAmount: undefined
        },
        {
          id: 'entry-2',
          transactionId: '',
          accountId: 'revenue-account',
          debitAmount: undefined,
          creditAmount: 500 // Unbalanced
        }
      ]
    }

    await expect(transactionComposable.createTransaction(unbalancedTransaction))
      .rejects.toThrow(/Transaction does not balance/)
  })

  it('should require minimum two entries', async () => {
    const singleEntryTransaction: Omit<Transaction, 'id'> = {
      ...mockTransactionData,
      entries: [
        {
          id: 'entry-1',
          transactionId: '',
          accountId: 'cash-account',
          debitAmount: 1000,
          creditAmount: undefined
        }
      ]
    }

    await expect(transactionComposable.createTransaction(singleEntryTransaction))
      .rejects.toThrow(/Transaction must have at least 2 entries/)
  })

  it('should validate transaction entry amounts', async () => {
    const invalidAmountTransaction: Omit<Transaction, 'id'> = {
      ...mockTransactionData,
      entries: [
        {
          id: 'entry-1',
          transactionId: '',
          accountId: 'cash-account',
          debitAmount: 0, // Invalid amount
          creditAmount: undefined
        },
        {
          id: 'entry-2',
          transactionId: '',
          accountId: 'revenue-account',
          debitAmount: undefined,
          creditAmount: 1000
        }
      ]
    }

    await expect(transactionComposable.createTransaction(invalidAmountTransaction))
      .rejects.toThrow()
  })

  it('should handle transaction with multiple entries', async () => {
    const multiEntryTransaction: Omit<Transaction, 'id'> = {
      ...mockTransactionData,
      description: 'Office supplies purchase with tax',
      entries: [
        {
          id: 'entry-1',
          transactionId: '',
          accountId: 'supplies-account',
          debitAmount: 100,
          creditAmount: undefined
        },
        {
          id: 'entry-2',
          transactionId: '',
          accountId: 'tax-account',
          debitAmount: 10,
          creditAmount: undefined
        },
        {
          id: 'entry-3',
          transactionId: '',
          accountId: 'cash-account',
          debitAmount: undefined,
          creditAmount: 110
        }
      ]
    }

    const validation = validateTransaction(multiEntryTransaction)
    expect(validation.isValid).toBe(true)
    expect(validation.totalDebits).toBe(110)
    expect(validation.totalCredits).toBe(110)
    expect(validation.balance).toBe(0)

    // Mock successful database operations
    const mockDb = await import('../../server/db')
    vi.mocked(mockDb.db.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined)
    } as any)

    const result = await transactionComposable.createTransaction(multiEntryTransaction)
    expect(result.entries).toHaveLength(3)
  })

  it('should calculate transaction totals correctly', () => {
    const transaction: Transaction = {
      id: 'trans-1',
      postId: 'post-1',
      description: 'Test transaction',
      date: new Date(),
      status: 'pending',
      createdBy: 'user-1',
      entries: [
        {
          id: 'entry-1',
          transactionId: 'trans-1',
          accountId: 'account-1',
          debitAmount: 500.50,
          creditAmount: undefined
        },
        {
          id: 'entry-2',
          transactionId: 'trans-1',
          accountId: 'account-2',
          debitAmount: 250.25,
          creditAmount: undefined
        },
        {
          id: 'entry-3',
          transactionId: 'trans-1',
          accountId: 'account-3',
          debitAmount: undefined,
          creditAmount: 750.75
        }
      ]
    }

    const totals = transactionComposable.calculateTransactionTotals(transaction)
    expect(totals.totalDebits).toBe(750.75)
    expect(totals.totalCredits).toBe(750.75)
    expect(totals.balance).toBe(0)
    expect(totals.isBalanced).toBe(true)
  })

  it('should handle floating point precision in balance calculation', () => {
    const transaction: Transaction = {
      id: 'trans-1',
      postId: 'post-1',
      description: 'Precision test',
      date: new Date(),
      status: 'pending',
      createdBy: 'user-1',
      entries: [
        {
          id: 'entry-1',
          transactionId: 'trans-1',
          accountId: 'account-1',
          debitAmount: 0.1 + 0.2, // 0.30000000000000004 in JavaScript
          creditAmount: undefined
        },
        {
          id: 'entry-2',
          transactionId: 'trans-1',
          accountId: 'account-2',
          debitAmount: undefined,
          creditAmount: 0.3
        }
      ]
    }

    const totals = transactionComposable.calculateTransactionTotals(transaction)
    expect(totals.isBalanced).toBe(true) // Should handle floating point precision
    expect(totals.balance).toBe(0)
  })

  it('should validate required transaction fields', async () => {
    const incompleteTransaction = {
      postId: 'post-1',
      // Missing description
      date: new Date(),
      status: 'pending' as const,
      createdBy: 'user-1',
      entries: mockTransactionData.entries
    }

    await expect(transactionComposable.createTransaction(incompleteTransaction as any))
      .rejects.toThrow(/Transaction description is required/)
  })

  it('should prevent future-dated transactions', async () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 1)

    const futureDatedTransaction: Omit<Transaction, 'id'> = {
      ...mockTransactionData,
      date: futureDate
    }

    await expect(transactionComposable.createTransaction(futureDatedTransaction))
      .rejects.toThrow(/Transaction date cannot be in the future/)
  })

  it('should handle transaction status updates', async () => {
    // Mock existing transaction
    transactionComposable.transactionsList.value = [{
      id: 'trans-1',
      postId: 'post-1',
      description: 'Test transaction',
      date: new Date(),
      status: 'pending',
      createdBy: 'user-1',
      entries: []
    }]

    // Mock successful database update
    const mockDb = await import('../../server/db')
    vi.mocked(mockDb.db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    } as any)

    const result = await transactionComposable.approveTransaction('trans-1', 'user-2')
    expect(result?.status).toBe('approved')
    expect(result?.approvedBy).toBe('user-2')
  })
})

describe('Post-to-Transaction Workflow', () => {
  it('should complete full workflow from post creation to transaction approval', async () => {
    const postsComposable = usePosts()
    const transactionComposable = useTransactions()

    // Step 1: Create a post
    const post = await postsComposable.createPost({
      content: 'Received $500 payment from client',
      authorId: 'user-1',
      authorPersona: 'Accountant'
    })

    expect(post.transactionId).toBeUndefined()

    // Step 2: Create transaction from post
    const transactionData: Omit<Transaction, 'id'> = {
      postId: post.id,
      description: post.content,
      date: new Date(),
      status: 'pending',
      createdBy: 'user-1',
      entries: [
        {
          id: 'entry-1',
          transactionId: '',
          accountId: 'cash-account',
          debitAmount: 500,
          creditAmount: undefined
        },
        {
          id: 'entry-2',
          transactionId: '',
          accountId: 'revenue-account',
          debitAmount: undefined,
          creditAmount: 500
        }
      ]
    }

    // Mock successful database operations
    const mockDb = await import('../../server/db')
    vi.mocked(mockDb.db.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined)
    } as any)
    vi.mocked(mockDb.db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined)
      })
    } as any)

    const transaction = await transactionComposable.createTransaction(transactionData)

    // Step 3: Link transaction to post
    const updatedPost = await postsComposable.updatePost(post.id, { 
      transactionId: transaction.id 
    })

    expect(updatedPost.transactionId).toBe(transaction.id)
    expect(transaction.postId).toBe(post.id)
    expect(transaction.status).toBe('pending')

    // Step 4: Approve transaction
    const approvedTransaction = await transactionComposable.approveTransaction(
      transaction.id, 
      'user-2'
    )

    expect(approvedTransaction?.status).toBe('approved')
    expect(approvedTransaction?.approvedBy).toBe('user-2')
  })
})