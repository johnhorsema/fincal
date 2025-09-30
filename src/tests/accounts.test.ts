import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useAccounts, ACCOUNT_TYPES, ACCOUNT_CATEGORIES } from '@/composables/useAccounts'
import { initializeDatabase, closeDatabase, db, accounts } from '@/db'
import type { Account } from '@/types'

describe('Account Management', () => {
  beforeEach(async () => {
    await initializeDatabase()
  })

  afterEach(async () => {
    await closeDatabase()
  })

  describe('useAccounts composable', () => {
    it('should initialize with empty accounts list', () => {
      const { accountsList, loading, error } = useAccounts()
      
      expect(accountsList.value).toEqual([])
      expect(loading.value).toBe(false)
      expect(error.value).toBeNull()
    })

    it('should validate account data correctly', () => {
      const { validateAccount } = useAccounts()

      // Valid account
      const validAccount = {
        name: 'Cash',
        type: 'asset' as const,
        category: 'Current Assets',
        isActive: true
      }
      
      const validResult = validateAccount(validAccount)
      expect(validResult.isValid).toBe(true)
      expect(validResult.errors).toEqual([])

      // Invalid account - missing name
      const invalidAccount = {
        name: '',
        type: 'asset' as const,
        category: 'Current Assets',
        isActive: true
      }
      
      const invalidResult = validateAccount(invalidAccount)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors).toContain('Account name is required')
    })

    it('should create a new account successfully', async () => {
      const { createAccount, fetchAccounts, accountsList } = useAccounts()

      const newAccount = {
        name: 'Cash',
        type: 'asset' as const,
        category: 'Current Assets',
        isActive: true
      }

      const accountId = await createAccount(newAccount)
      expect(accountId).toBeDefined()
      expect(typeof accountId).toBe('string')

      await fetchAccounts()
      expect(accountsList.value).toHaveLength(1)
      expect(accountsList.value[0]).toMatchObject(newAccount)
    })

    it('should prevent duplicate account names within the same type', async () => {
      const { createAccount } = useAccounts()

      const account1 = {
        name: 'Cash',
        type: 'asset' as const,
        category: 'Current Assets',
        isActive: true
      }

      const account2 = {
        name: 'Cash',
        type: 'asset' as const,
        category: 'Current Assets',
        isActive: true
      }

      await createAccount(account1)
      
      await expect(createAccount(account2)).rejects.toThrow(
        'Account "Cash" already exists in Assets'
      )
    })

    it('should allow same account names in different types', async () => {
      const { createAccount, fetchAccounts, accountsList } = useAccounts()

      const assetAccount = {
        name: 'Equipment',
        type: 'asset' as const,
        category: 'Fixed Assets',
        isActive: true
      }

      const expenseAccount = {
        name: 'Equipment',
        type: 'expense' as const,
        category: 'Operating Expenses',
        isActive: true
      }

      await createAccount(assetAccount)
      await createAccount(expenseAccount)

      await fetchAccounts()
      expect(accountsList.value).toHaveLength(2)
    })

    it('should update an existing account', async () => {
      const { createAccount, updateAccount, fetchAccounts, accountsList } = useAccounts()

      const newAccount = {
        name: 'Cash',
        type: 'asset' as const,
        category: 'Current Assets',
        isActive: true
      }

      const accountId = await createAccount(newAccount)
      
      await updateAccount(accountId, {
        name: 'Petty Cash',
        category: 'Current Assets'
      })

      await fetchAccounts()
      const updatedAccount = accountsList.value.find(a => a.id === accountId)
      expect(updatedAccount?.name).toBe('Petty Cash')
      expect(updatedAccount?.category).toBe('Current Assets')
    })

    it('should toggle account status', async () => {
      const { createAccount, toggleAccountStatus, fetchAccounts, accountsList } = useAccounts()

      const newAccount = {
        name: 'Cash',
        type: 'asset' as const,
        category: 'Current Assets',
        isActive: true
      }

      const accountId = await createAccount(newAccount)
      
      await toggleAccountStatus(accountId)
      await fetchAccounts()
      
      const toggledAccount = accountsList.value.find(a => a.id === accountId)
      expect(toggledAccount?.isActive).toBe(false)

      await toggleAccountStatus(accountId)
      await fetchAccounts()
      
      const reactivatedAccount = accountsList.value.find(a => a.id === accountId)
      expect(reactivatedAccount?.isActive).toBe(true)
    })

    it('should delete an account', async () => {
      const { createAccount, deleteAccount, fetchAccounts, accountsList } = useAccounts()

      const newAccount = {
        name: 'Cash',
        type: 'asset' as const,
        category: 'Current Assets',
        isActive: true
      }

      const accountId = await createAccount(newAccount)
      await fetchAccounts()
      expect(accountsList.value).toHaveLength(1)

      await deleteAccount(accountId)
      await fetchAccounts()
      expect(accountsList.value).toHaveLength(0)
    })

    it('should search accounts correctly', async () => {
      const { createAccount, searchAccounts, fetchAccounts } = useAccounts()

      const accounts = [
        { name: 'Cash', type: 'asset' as const, category: 'Current Assets', isActive: true },
        { name: 'Accounts Receivable', type: 'asset' as const, category: 'Current Assets', isActive: true },
        { name: 'Office Supplies', type: 'expense' as const, category: 'Operating Expenses', isActive: true }
      ]

      for (const account of accounts) {
        await createAccount(account)
      }
      await fetchAccounts()

      // Search by name
      const cashResults = searchAccounts('Cash')
      expect(cashResults).toHaveLength(1)
      expect(cashResults[0].name).toBe('Cash')

      // Search by category
      const currentAssetResults = searchAccounts('Current')
      expect(currentAssetResults).toHaveLength(2)

      // Search by type
      const assetResults = searchAccounts('asset')
      expect(assetResults).toHaveLength(2)
    })

    it('should group accounts by type correctly', async () => {
      const { createAccount, fetchAccounts, accountsByType } = useAccounts()

      const testAccounts = [
        { name: 'Cash', type: 'asset' as const, category: 'Current Assets', isActive: true },
        { name: 'Equipment', type: 'asset' as const, category: 'Fixed Assets', isActive: true },
        { name: 'Accounts Payable', type: 'liability' as const, category: 'Current Liabilities', isActive: true },
        { name: 'Sales Revenue', type: 'revenue' as const, category: 'Sales Revenue', isActive: true }
      ]

      for (const account of testAccounts) {
        await createAccount(account)
      }
      await fetchAccounts()

      expect(accountsByType.value.asset).toHaveLength(2)
      expect(accountsByType.value.liability).toHaveLength(1)
      expect(accountsByType.value.revenue).toHaveLength(1)
      expect(accountsByType.value.equity).toHaveLength(0)
      expect(accountsByType.value.expense).toHaveLength(0)
    })

    it('should filter active accounts correctly', async () => {
      const { createAccount, toggleAccountStatus, fetchAccounts, activeAccounts } = useAccounts()

      const account1 = {
        name: 'Cash',
        type: 'asset' as const,
        category: 'Current Assets',
        isActive: true
      }

      const account2 = {
        name: 'Old Equipment',
        type: 'asset' as const,
        category: 'Fixed Assets',
        isActive: true
      }

      const id1 = await createAccount(account1)
      const id2 = await createAccount(account2)
      
      await toggleAccountStatus(id2) // Deactivate second account
      await fetchAccounts()

      expect(activeAccounts.value).toHaveLength(1)
      expect(activeAccounts.value[0].name).toBe('Cash')
    })
  })

  describe('Account constants', () => {
    it('should have correct account types', () => {
      expect(ACCOUNT_TYPES).toEqual({
        asset: 'Assets',
        liability: 'Liabilities',
        equity: 'Equity',
        revenue: 'Revenue',
        expense: 'Expenses'
      })
    })

    it('should have account categories for each type', () => {
      expect(ACCOUNT_CATEGORIES.asset).toContain('Current Assets')
      expect(ACCOUNT_CATEGORIES.asset).toContain('Fixed Assets')
      expect(ACCOUNT_CATEGORIES.liability).toContain('Current Liabilities')
      expect(ACCOUNT_CATEGORIES.equity).toContain('Owner\'s Equity')
      expect(ACCOUNT_CATEGORIES.revenue).toContain('Sales Revenue')
      expect(ACCOUNT_CATEGORIES.expense).toContain('Operating Expenses')
    })
  })

  describe('Database integration', () => {
    it('should persist accounts to database', async () => {
      const { createAccount } = useAccounts()

      const newAccount = {
        name: 'Test Account',
        type: 'asset' as const,
        category: 'Current Assets',
        isActive: true
      }

      await createAccount(newAccount)

      // Query database directly
      const dbAccounts = await db.select().from(accounts)
      expect(dbAccounts).toHaveLength(1)
      expect(dbAccounts[0].name).toBe('Test Account')
      expect(dbAccounts[0].type).toBe('asset')
    })

    it('should enforce unique constraint on name and type', async () => {
      // Insert directly to database
      const account1 = {
        id: 'test-1',
        name: 'Cash',
        type: 'asset',
        category: 'Current Assets',
        isActive: true,
        createdAt: Date.now()
      }

      await db.insert(accounts).values(account1)

      // Try to insert duplicate
      const account2 = {
        id: 'test-2',
        name: 'Cash',
        type: 'asset',
        category: 'Current Assets',
        isActive: true,
        createdAt: Date.now()
      }

      await expect(db.insert(accounts).values(account2)).rejects.toThrow()
    })
  })
})