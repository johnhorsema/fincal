import type { Post, Transaction, Account, User, ErrorResponse } from '../types'

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// API client class
class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  // Generic request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T; count?: number }> {
    const url = `${this.baseUrl}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json()
        throw new ApiError(errorData.message, response.status, errorData)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // Network or other errors
      throw new ApiError(
        error instanceof Error ? error.message : 'Network error occurred',
        0,
        { error: 'NetworkError', message: 'Failed to connect to server', timestamp: new Date() }
      )
    }
  }

  // Posts API
  async getPosts(): Promise<Post[]> {
    const response = await this.request<Post[]>('/posts')
    return response.data
  }

  async getPost(id: string): Promise<Post> {
    const response = await this.request<Post>(`/posts/${id}`)
    return response.data
  }

  async createPost(postData: {
    content: string
    authorId: string
    authorPersona: string
    attachments?: string[]
  }): Promise<Post> {
    const response = await this.request<Post>('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    })
    return response.data
  }

  async updatePost(id: string, updates: Partial<Post>): Promise<Post> {
    const response = await this.request<Post>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    return response.data
  }

  async deletePost(id: string): Promise<void> {
    await this.request(`/posts/${id}`, {
      method: 'DELETE',
    })
  }

  async checkPostFinancialSuggestion(id: string): Promise<{
    postId: string
    suggestsFinancial: boolean
    matchedKeywords: string[]
  }> {
    const response = await this.request<{
      postId: string
      suggestsFinancial: boolean
      matchedKeywords: string[]
    }>(`/posts/${id}/suggest-financial`)
    return response.data
  }

  // Transactions API
  async getTransactions(filters?: {
    status?: 'pending' | 'approved' | 'rejected'
    userId?: string
  }): Promise<Transaction[]> {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.userId) params.append('userId', filters.userId)
    
    const endpoint = params.toString() ? `/transactions?${params}` : '/transactions'
    const response = await this.request<Transaction[]>(endpoint)
    return response.data
  }

  async getTransaction(id: string): Promise<Transaction> {
    const response = await this.request<Transaction>(`/transactions/${id}`)
    return response.data
  }

  async createTransaction(transactionData: Omit<Transaction, 'id'>): Promise<Transaction> {
    const response = await this.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    })
    return response.data
  }

  async updateTransaction(id: string, updates: Partial<Omit<Transaction, 'id' | 'entries'>>): Promise<Transaction> {
    const response = await this.request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    return response.data
  }

  async approveTransaction(id: string, approvedBy: string): Promise<void> {
    await this.request(`/transactions/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ approvedBy }),
    })
  }

  async rejectTransaction(id: string): Promise<void> {
    await this.request(`/transactions/${id}/reject`, {
      method: 'PATCH',
    })
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.request(`/transactions/${id}`, {
      method: 'DELETE',
    })
  }

  // Accounts API
  async getAccounts(filters?: {
    type?: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
    active?: boolean
    search?: string
    groupBy?: 'type'
  }): Promise<Account[] | Record<string, Account[]>> {
    const params = new URLSearchParams()
    if (filters?.type) params.append('type', filters.type)
    if (filters?.active !== undefined) params.append('active', filters.active.toString())
    if (filters?.search) params.append('search', filters.search)
    if (filters?.groupBy) params.append('groupBy', filters.groupBy)
    
    const endpoint = params.toString() ? `/accounts?${params}` : '/accounts'
    const response = await this.request<Account[] | Record<string, Account[]>>(endpoint)
    return response.data
  }

  async getAccount(id: string): Promise<Account & { usageCount: number }> {
    const response = await this.request<Account & { usageCount: number }>(`/accounts/${id}`)
    return response.data
  }

  async createAccount(accountData: Omit<Account, 'id'>): Promise<Account> {
    const response = await this.request<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(accountData),
    })
    return response.data
  }

  async updateAccount(id: string, updates: Partial<Omit<Account, 'id'>>): Promise<Account> {
    const response = await this.request<Account>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    return response.data
  }

  async toggleAccountStatus(id: string): Promise<{ isActive: boolean }> {
    const response = await this.request<{ isActive: boolean }>(`/accounts/${id}/toggle`, {
      method: 'PATCH',
    })
    return response.data
  }

  async deleteAccount(id: string): Promise<void> {
    await this.request(`/accounts/${id}`, {
      method: 'DELETE',
    })
  }

  async getAccountTypes(): Promise<{
    types: Record<string, string>
    categories: Record<string, string[]>
  }> {
    const response = await this.request<{
      types: Record<string, string>
      categories: Record<string, string[]>
    }>('/accounts/types')
    return response.data
  }

  // Users API
  async getUsers(): Promise<User[]> {
    const response = await this.request<User[]>('/users')
    return response.data
  }

  async getUser(id: string): Promise<User & { stats: { postsCount: number; transactionsCount: number } }> {
    const response = await this.request<User & { stats: { postsCount: number; transactionsCount: number } }>(`/users/${id}`)
    return response.data
  }

  async createUser(userData: Omit<User, 'id'>): Promise<User> {
    const response = await this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
    return response.data
  }

  async updateUser(id: string, updates: Partial<Omit<User, 'id'>>): Promise<User> {
    const response = await this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    return response.data
  }

  async addUserPersona(id: string, persona: Omit<User['personas'][0], 'id'>): Promise<User['personas'][0]> {
    const response = await this.request<User['personas'][0]>(`/users/${id}/personas`, {
      method: 'POST',
      body: JSON.stringify(persona),
    })
    return response.data
  }

  async removeUserPersona(userId: string, personaId: string): Promise<void> {
    await this.request(`/users/${userId}/personas/${personaId}`, {
      method: 'DELETE',
    })
  }

  async deleteUser(id: string): Promise<void> {
    await this.request(`/users/${id}`, {
      method: 'DELETE',
    })
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    const response = await this.request<{ status: string; timestamp: string; version: string }>('/health')
    return response.data
  }
}

// Custom error class for API errors
export class ApiError extends Error {
  public status: number
  public details: ErrorResponse

  constructor(message: string, status: number, details: ErrorResponse) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  get isServerError(): boolean {
    return this.status >= 500
  }
}

// Create and export a default instance
export const apiClient = new ApiClient()

// Export the class for custom instances
export { ApiClient }

// Utility functions for common API patterns
export const apiUtils = {
  // Retry wrapper for network errors
  async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        // Don't retry client errors (4xx)
        if (error instanceof ApiError && error.isClientError) {
          throw error
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
      }
    }

    throw lastError!
  },

  // Batch operations helper
  async batchOperation<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    batchSize: number = 5
  ): Promise<R[]> {
    const results: R[] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(operation))
      results.push(...batchResults)
    }
    
    return results
  },

  // Cache wrapper (simple in-memory cache)
  createCache<T>(ttlMs: number = 5 * 60 * 1000) {
    const cache = new Map<string, { data: T; expires: number }>()

    return {
      get(key: string): T | null {
        const entry = cache.get(key)
        if (!entry || Date.now() > entry.expires) {
          cache.delete(key)
          return null
        }
        return entry.data
      },

      set(key: string, data: T): void {
        cache.set(key, {
          data,
          expires: Date.now() + ttlMs
        })
      },

      clear(): void {
        cache.clear()
      }
    }
  }
}