import { ref, computed } from 'vue'
import { apiClient, ApiError } from '../api/client'
import type { Transaction } from '../types'

export function useTransactions() {
  const transactionsList = ref<Transaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed properties
  const pendingTransactions = computed(() => 
    transactionsList.value.filter((t: Transaction) => t.status === 'pending')
  )

  const approvedTransactions = computed(() => 
    transactionsList.value.filter((t: Transaction) => t.status === 'approved')
  )

  const rejectedTransactions = computed(() => 
    transactionsList.value.filter((t: Transaction) => t.status === 'rejected')
  )

  // CRUD Operations
  async function fetchTransactions(filters?: {
    status?: 'pending' | 'approved' | 'rejected'
    userId?: string
  }) {
    loading.value = true
    error.value = null
    
    try {
      const fetchedTransactions = await apiClient.getTransactions(filters)
      transactionsList.value = fetchedTransactions

      return fetchedTransactions
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch transactions'
      error.value = errorMessage
      console.error('Error fetching transactions:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchTransaction(id: string) {
    loading.value = true
    error.value = null

    try {
      const transaction = await apiClient.getTransaction(id)
      
      // Update local state if transaction exists
      const existingIndex = transactionsList.value.findIndex((t: Transaction) => t.id === id)
      if (existingIndex !== -1) {
        transactionsList.value[existingIndex] = transaction
      } else {
        transactionsList.value.push(transaction)
      }

      return transaction
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch transaction'
      error.value = errorMessage
      console.error('Error fetching transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createTransaction(transactionData: Omit<Transaction, 'id'>) {
    loading.value = true
    error.value = null

    try {
      const newTransaction = await apiClient.createTransaction(transactionData)

      // Add to local state
      transactionsList.value.push(newTransaction)

      return newTransaction
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to create transaction'
      error.value = errorMessage
      console.error('Error creating transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id' | 'entries'>>) {
    loading.value = true
    error.value = null

    try {
      const updatedTransaction = await apiClient.updateTransaction(id, updates)

      // Update local state
      const index = transactionsList.value.findIndex((t: Transaction) => t.id === id)
      if (index !== -1) {
        transactionsList.value[index] = { 
          ...transactionsList.value[index], 
          ...updatedTransaction 
        }
      }

      return transactionsList.value[index]
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update transaction'
      error.value = errorMessage
      console.error('Error updating transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function approveTransaction(id: string, approvedBy: string) {
    loading.value = true
    error.value = null

    try {
      await apiClient.approveTransaction(id, approvedBy)

      // Update local state
      const index = transactionsList.value.findIndex((t: Transaction) => t.id === id)
      if (index !== -1) {
        transactionsList.value[index].status = 'approved'
        transactionsList.value[index].approvedBy = approvedBy
      }

      return transactionsList.value[index]
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to approve transaction'
      error.value = errorMessage
      console.error('Error approving transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function rejectTransaction(id: string) {
    loading.value = true
    error.value = null

    try {
      await apiClient.rejectTransaction(id)

      // Update local state
      const index = transactionsList.value.findIndex((t: Transaction) => t.id === id)
      if (index !== -1) {
        transactionsList.value[index].status = 'rejected'
      }

      return transactionsList.value[index]
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to reject transaction'
      error.value = errorMessage
      console.error('Error rejecting transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteTransaction(id: string) {
    loading.value = true
    error.value = null

    try {
      await apiClient.deleteTransaction(id)
      
      // Remove from local state
      transactionsList.value = transactionsList.value.filter((t: Transaction) => t.id !== id)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete transaction'
      error.value = errorMessage
      console.error('Error deleting transaction:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Get a single transaction by ID
  function getTransaction(id: string) {
    return transactionsList.value.find((t: Transaction) => t.id === id)
  }

  // Get transaction by post ID
  function getTransactionByPostId(postId: string) {
    return transactionsList.value.find((t: Transaction) => t.postId === postId)
  }

  // Get transactions by status
  function getTransactionsByStatus(status: 'pending' | 'approved' | 'rejected') {
    return transactionsList.value.filter((t: Transaction) => t.status === status)
  }

  // Get transactions by user
  function getTransactionsByUser(userId: string) {
    return transactionsList.value.filter((t: Transaction) => t.createdBy === userId)
  }

  // Calculate transaction totals
  function calculateTransactionTotals(transaction: Transaction) {
    const totalDebits = transaction.entries.reduce((sum, entry) => 
      sum + (entry.debitAmount || 0), 0
    )
    const totalCredits = transaction.entries.reduce((sum, entry) => 
      sum + (entry.creditAmount || 0), 0
    )
    const balance = Math.abs(totalDebits - totalCredits)
    
    return {
      totalDebits: Math.round(totalDebits * 100) / 100,
      totalCredits: Math.round(totalCredits * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      isBalanced: balance < 0.01
    }
  }

  // Clear error
  function clearError() {
    error.value = null
  }

  return {
    // State
    transactionsList,
    loading,
    error,
    
    // Computed
    pendingTransactions,
    approvedTransactions,
    rejectedTransactions,
    
    // Methods
    fetchTransactions,
    fetchTransaction,
    createTransaction,
    updateTransaction,
    approveTransaction,
    rejectTransaction,
    deleteTransaction,
    getTransaction,
    getTransactionByPostId,
    getTransactionsByStatus,
    getTransactionsByUser,
    calculateTransactionTotals,
    clearError
  }
}