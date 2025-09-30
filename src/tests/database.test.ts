import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { 
  db, 
  initializeDatabase, 
  seedDatabase, 
  clearDatabase, 
  getDatabaseStats,
  closeDatabase,
  validateTransactionBalance,
  generateId,
  formatCurrency
} from '../db'

describe('Database Configuration', () => {
  beforeAll(async () => {
    // Initialize database for testing
    await initializeDatabase()
  })

  afterAll(async () => {
    // Clean up
    await clearDatabase()
    closeDatabase()
  })

  it('should initialize database successfully', async () => {
    const result = await initializeDatabase()
    expect(result).toBe(true)
  })

  it('should seed database with initial data', async () => {
    await clearDatabase()
    await seedDatabase()
    
    const stats = await getDatabaseStats()
    expect(stats.users).toBeGreaterThan(0)
    expect(stats.accounts).toBeGreaterThan(0)
  })

  it('should validate transaction balance correctly', () => {
    const balancedEntries = [
      { debitAmount: 100, creditAmount: 0 },
      { debitAmount: 0, creditAmount: 100 }
    ]
    
    const unbalancedEntries = [
      { debitAmount: 100, creditAmount: 0 },
      { debitAmount: 0, creditAmount: 50 }
    ]
    
    expect(validateTransactionBalance(balancedEntries)).toBe(true)
    expect(validateTransactionBalance(unbalancedEntries)).toBe(false)
  })

  it('should generate unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    
    expect(id1).toBeDefined()
    expect(id2).toBeDefined()
    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it('should format currency correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
    expect(formatCurrency(0)).toBe('$0.00')
    expect(formatCurrency(-500)).toBe('-$500.00')
  })

  it('should get database statistics', async () => {
    const stats = await getDatabaseStats()
    
    expect(stats).toHaveProperty('users')
    expect(stats).toHaveProperty('accounts')
    expect(stats).toHaveProperty('posts')
    expect(stats).toHaveProperty('transactions')
    expect(stats).toHaveProperty('transactionEntries')
    
    expect(typeof stats.users).toBe('number')
    expect(typeof stats.accounts).toBe('number')
    expect(typeof stats.posts).toBe('number')
    expect(typeof stats.transactions).toBe('number')
    expect(typeof stats.transactionEntries).toBe('number')
  })
})