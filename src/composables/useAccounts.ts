import { ref, computed } from 'vue'
import { apiClient, ApiError } from '../api/client'
import type { Account } from '../types'

// Account types for grouping
export const ACCOUNT_TYPES = {
  asset: 'Assets',
  liability: 'Liabilities', 
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses'
} as const

export type AccountType = keyof typeof ACCOUNT_TYPES

// Common account categories by type
export const ACCOUNT_CATEGORIES = {
  asset: ['Current Assets', 'Fixed Assets', 'Investments'],
  liability: ['Current Liabilities', 'Long-term Liabilities'],
  equity: ['Owner\'s Equity', 'Retained Earnings'],
  revenue: ['Sales Revenue', 'Service Revenue', 'Other Income'],
  expense: ['Operating Expenses', 'Cost of Goods Sold', 'Administrative Expenses']
} as const

export function useAccounts() {
  const accountsList = ref<Account[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed properties for grouping accounts
  const accountsByType = computed(() => {
    const grouped: Record<AccountType, Account[]> = {
      asset: [],
      liability: [],
      equity: [],
      revenue: [],
      expense: []
    }

    accountsList.value.forEach((account: Account) => {
      if (account.type in grouped) {
        grouped[account.type as AccountType].push(account)
      }
    })

    return grouped
  })

  const activeAccounts = computed(() => 
    accountsList.value.filter((account: Account) => account.isActive)
  )

  // CRUD Operations
  async function fetchAccounts(filters?: {
    type?: AccountType
    active?: boolean
    search?: string
  }) {
    loading.value = true
    error.value = null
    
    try {
      const result = await apiClient.getAccounts(filters)
      
      // Handle both array and grouped responses
      if (Array.isArray(result)) {
        accountsList.value = result
      } else {
        // If grouped, flatten the results
        accountsList.value = Object.values(result).flat()
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch accounts'
      error.value = errorMessage
      console.error('Error fetching accounts:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchAccountsGrouped() {
    loading.value = true
    error.value = null
    
    try {
      const result = await apiClient.getAccounts({ groupBy: 'type' })
      
      if (!Array.isArray(result)) {
        // Update local state with flattened results
        accountsList.value = Object.values(result).flat()
        return result as Record<string, Account[]>
      }
      
      return {}
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch grouped accounts'
      error.value = errorMessage
      console.error('Error fetching grouped accounts:', err)
      return {}
    } finally {
      loading.value = false
    }
  }

  async function createAccount(accountData: Omit<Account, 'id'>) {
    loading.value = true
    error.value = null

    try {
      const newAccount = await apiClient.createAccount(accountData)
      
      // Add to local state
      accountsList.value.push(newAccount)

      return newAccount
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to create account'
      error.value = errorMessage
      console.error('Error creating account:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateAccount(id: string, updates: Partial<Omit<Account, 'id'>>) {
    loading.value = true
    error.value = null

    try {
      const updatedAccount = await apiClient.updateAccount(id, updates)

      // Update local state
      const index = accountsList.value.findIndex((a: Account) => a.id === id)
      if (index !== -1) {
        accountsList.value[index] = updatedAccount
      }

      return updatedAccount
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update account'
      error.value = errorMessage
      console.error('Error updating account:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteAccount(id: string) {
    loading.value = true
    error.value = null

    try {
      await apiClient.deleteAccount(id)
      
      // Remove from local state
      accountsList.value = accountsList.value.filter((a: Account) => a.id !== id)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete account'
      error.value = errorMessage
      console.error('Error deleting account:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function toggleAccountStatus(id: string) {
    loading.value = true
    error.value = null

    try {
      const result = await apiClient.toggleAccountStatus(id)
      
      // Update local state
      const index = accountsList.value.findIndex((a: Account) => a.id === id)
      if (index !== -1) {
        accountsList.value[index].isActive = result.isActive
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to toggle account status'
      error.value = errorMessage
      console.error('Error toggling account status:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchAccount(id: string) {
    loading.value = true
    error.value = null

    try {
      const account = await apiClient.getAccount(id)
      
      // Update local state if account exists
      const existingIndex = accountsList.value.findIndex((a: Account) => a.id === id)
      if (existingIndex !== -1) {
        accountsList.value[existingIndex] = account
      } else {
        accountsList.value.push(account)
      }

      return account
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch account'
      error.value = errorMessage
      console.error('Error fetching account:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchAccountTypes() {
    try {
      return await apiClient.getAccountTypes()
    } catch (err) {
      console.error('Error fetching account types:', err)
      // Return fallback data
      return {
        types: ACCOUNT_TYPES,
        categories: ACCOUNT_CATEGORIES
      }
    }
  }

  // Search and filter functions
  function searchAccounts(query: string) {
    if (!query.trim()) return accountsList.value

    const searchTerm = query.toLowerCase()
    return accountsList.value.filter((account: Account) =>
      account.name.toLowerCase().includes(searchTerm) ||
      account.category.toLowerCase().includes(searchTerm) ||
      ACCOUNT_TYPES[account.type as AccountType].toLowerCase().includes(searchTerm)
    )
  }

  function getAccountsByType(type: AccountType) {
    return accountsList.value.filter((account: Account) => account.type === type)
  }

  // Clear error
  function clearError() {
    error.value = null
  }

  return {
    // State
    accountsList,
    loading,
    error,
    
    // Computed
    accountsByType,
    activeAccounts,
    
    // Methods
    fetchAccounts,
    fetchAccountsGrouped,
    fetchAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    toggleAccountStatus,
    fetchAccountTypes,
    searchAccounts,
    getAccountsByType,
    clearError,
    
    // Constants
    ACCOUNT_TYPES,
    ACCOUNT_CATEGORIES
  }
}