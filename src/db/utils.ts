import { db } from './connection'
import { users, accounts, posts, transactions, transactionEntries } from './schema'
import { eq, and, desc, asc } from 'drizzle-orm'

// Utility functions for database operations

/**
 * Generate a unique ID for database records
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Get current timestamp in milliseconds
 */
export function getCurrentTimestamp(): number {
  return Date.now()
}

/**
 * Validate transaction balance (debits must equal credits)
 */
export function validateTransactionBalance(entries: Array<{ debitAmount?: number; creditAmount?: number }>): boolean {
  const totalDebits = entries.reduce((sum, entry) => sum + (entry.debitAmount || 0), 0)
  const totalCredits = entries.reduce((sum, entry) => sum + (entry.creditAmount || 0), 0)
  
  // Allow for small floating point differences
  const difference = Math.abs(totalDebits - totalCredits)
  return difference < 0.01
}

/**
 * Format currency amount for display
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

/**
 * Seed initial data for development/testing
 */
export async function seedDatabase() {
  try {
    console.log('Seeding database with initial data...')
    
    // Create default user
    const defaultUser = {
      id: generateId(),
      name: 'Demo User',
      email: 'demo@example.com',
      personas: JSON.stringify([
        { id: generateId(), name: 'Accountant', role: 'accountant' },
        { id: generateId(), name: 'Marketing', role: 'marketing' },
        { id: generateId(), name: 'Sales', role: 'sales' }
      ]),
      createdAt: getCurrentTimestamp()
    }
    
    await db.insert(users).values(defaultUser).onConflictDoNothing()
    
    // Create default chart of accounts
    const defaultAccounts = [
      // Assets
      { id: generateId(), name: 'Cash', type: 'asset', category: 'Current Assets' },
      { id: generateId(), name: 'Accounts Receivable', type: 'asset', category: 'Current Assets' },
      { id: generateId(), name: 'Inventory', type: 'asset', category: 'Current Assets' },
      { id: generateId(), name: 'Equipment', type: 'asset', category: 'Fixed Assets' },
      
      // Liabilities
      { id: generateId(), name: 'Accounts Payable', type: 'liability', category: 'Current Liabilities' },
      { id: generateId(), name: 'Credit Card', type: 'liability', category: 'Current Liabilities' },
      { id: generateId(), name: 'Long-term Debt', type: 'liability', category: 'Long-term Liabilities' },
      
      // Equity
      { id: generateId(), name: 'Owner Equity', type: 'equity', category: 'Owner Equity' },
      { id: generateId(), name: 'Retained Earnings', type: 'equity', category: 'Owner Equity' },
      
      // Revenue
      { id: generateId(), name: 'Sales Revenue', type: 'revenue', category: 'Operating Revenue' },
      { id: generateId(), name: 'Service Revenue', type: 'revenue', category: 'Operating Revenue' },
      
      // Expenses
      { id: generateId(), name: 'Office Supplies', type: 'expense', category: 'Operating Expenses' },
      { id: generateId(), name: 'Marketing Expenses', type: 'expense', category: 'Operating Expenses' },
      { id: generateId(), name: 'Rent Expense', type: 'expense', category: 'Operating Expenses' },
    ].map(account => ({
      ...account,
      isActive: true,
      createdAt: getCurrentTimestamp()
    }))
    
    for (const account of defaultAccounts) {
      await db.insert(accounts).values(account).onConflictDoNothing()
    }
    
    console.log('Database seeded successfully')
  } catch (error) {
    console.error('Failed to seed database:', error)
    throw error
  }
}

/**
 * Clear all data from database (for testing)
 */
export async function clearDatabase() {
  try {
    console.log('Clearing database...')
    
    // Delete in reverse order of dependencies
    await db.delete(transactionEntries)
    await db.delete(transactions)
    await db.delete(posts)
    await db.delete(accounts)
    await db.delete(users)
    
    console.log('Database cleared successfully')
  } catch (error) {
    console.error('Failed to clear database:', error)
    throw error
  }
}

/**
 * Get database statistics
 */
export async function getDatabaseStats() {
  try {
    const stats = {
      users: await db.select().from(users).then(rows => rows.length),
      accounts: await db.select().from(accounts).then(rows => rows.length),
      posts: await db.select().from(posts).then(rows => rows.length),
      transactions: await db.select().from(transactions).then(rows => rows.length),
      transactionEntries: await db.select().from(transactionEntries).then(rows => rows.length),
    }
    
    return stats
  } catch (error) {
    console.error('Failed to get database stats:', error)
    throw error
  }
}