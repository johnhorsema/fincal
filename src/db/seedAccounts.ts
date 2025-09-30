import { db, accounts } from './index'

export const DEFAULT_ACCOUNTS = [
  // Assets
  { name: 'Cash', type: 'asset', category: 'Current Assets' },
  { name: 'Checking Account', type: 'asset', category: 'Current Assets' },
  { name: 'Savings Account', type: 'asset', category: 'Current Assets' },
  { name: 'Accounts Receivable', type: 'asset', category: 'Current Assets' },
  { name: 'Inventory', type: 'asset', category: 'Current Assets' },
  { name: 'Office Equipment', type: 'asset', category: 'Fixed Assets' },
  { name: 'Computer Equipment', type: 'asset', category: 'Fixed Assets' },
  { name: 'Furniture & Fixtures', type: 'asset', category: 'Fixed Assets' },

  // Liabilities
  { name: 'Accounts Payable', type: 'liability', category: 'Current Liabilities' },
  { name: 'Credit Card Payable', type: 'liability', category: 'Current Liabilities' },
  { name: 'Sales Tax Payable', type: 'liability', category: 'Current Liabilities' },
  { name: 'Payroll Liabilities', type: 'liability', category: 'Current Liabilities' },
  { name: 'Bank Loan', type: 'liability', category: 'Long-term Liabilities' },

  // Equity
  { name: 'Owner\'s Equity', type: 'equity', category: 'Owner\'s Equity' },
  { name: 'Retained Earnings', type: 'equity', category: 'Retained Earnings' },

  // Revenue
  { name: 'Sales Revenue', type: 'revenue', category: 'Sales Revenue' },
  { name: 'Service Revenue', type: 'revenue', category: 'Service Revenue' },
  { name: 'Interest Income', type: 'revenue', category: 'Other Income' },

  // Expenses
  { name: 'Office Supplies', type: 'expense', category: 'Operating Expenses' },
  { name: 'Rent Expense', type: 'expense', category: 'Operating Expenses' },
  { name: 'Utilities Expense', type: 'expense', category: 'Operating Expenses' },
  { name: 'Marketing Expense', type: 'expense', category: 'Operating Expenses' },
  { name: 'Travel Expense', type: 'expense', category: 'Operating Expenses' },
  { name: 'Professional Services', type: 'expense', category: 'Administrative Expenses' },
  { name: 'Insurance Expense', type: 'expense', category: 'Administrative Expenses' },
  { name: 'Depreciation Expense', type: 'expense', category: 'Administrative Expenses' }
] as const

export async function seedAccounts() {
  try {
    // Check if accounts already exist
    const existingAccounts = await db.select().from(accounts).limit(1)
    if (existingAccounts.length > 0) {
      console.log('Accounts already seeded, skipping...')
      return
    }

    console.log('Seeding default accounts...')
    
    const accountsToInsert = DEFAULT_ACCOUNTS.map(account => ({
      id: crypto.randomUUID(),
      name: account.name,
      type: account.type,
      category: account.category,
      isActive: true,
      createdAt: Date.now()
    }))

    await db.insert(accounts).values(accountsToInsert)
    
    console.log(`Successfully seeded ${accountsToInsert.length} accounts`)
  } catch (error) {
    console.error('Error seeding accounts:', error)
    throw error
  }
}

export async function clearAccounts() {
  try {
    await db.delete(accounts)
    console.log('All accounts cleared')
  } catch (error) {
    console.error('Error clearing accounts:', error)
    throw error
  }
}