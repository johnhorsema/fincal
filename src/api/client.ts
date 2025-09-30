import type { User, Account, Transaction, Post } from '../types'

// Frontend API client - no server imports
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isNetworkError(): boolean {
    return this.status === 0 || this.status >= 500
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500
  }

  get isServerError(): boolean {
    return this.status >= 500
  }
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.message || `HTTP ${response.status}`,
        response.status,
        errorData.code,
        errorData
      )
    }

    return response.json()
  }

  // Transaction methods
  async getTransactions(filters?: any): Promise<Transaction[]> {
    const params = filters ? `?${new URLSearchParams(filters).toString()}` : ''
    return this.request<Transaction[]>(`/transactions${params}`)
  }

  async getTransaction(id: string): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/${id}`)
  }

  async createTransaction(data: Partial<Transaction>): Promise<Transaction> {
    return this.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTransaction(id: string): Promise<void> {
    return this.request<void>(`/transactions/${id}`, {
      method: 'DELETE',
    })
  }

  async approveTransaction(id: string, approvedBy: string): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approvedBy }),
    })
  }

  async rejectTransaction(id: string): Promise<Transaction> {
    return this.request<Transaction>(`/transactions/${id}/reject`, {
      method: 'POST',
    })
  }

  // Account methods
  async getAccounts(options?: any): Promise<Account[] | Record<string, Account[]>> {
    const params = options ? `?${new URLSearchParams(options).toString()}` : ''
    return this.request<Account[] | Record<string, Account[]>>(`/accounts${params}`)
  }

  async getAccount(id: string): Promise<Account> {
    return this.request<Account>(`/accounts/${id}`)
  }

  async getAccountTypes(): Promise<string[]> {
    return this.request<string[]>('/accounts/types')
  }

  async toggleAccountStatus(id: string): Promise<Account> {
    return this.request<Account>(`/accounts/${id}/toggle`, {
      method: 'POST',
    })
  }

  async createAccount(data: Partial<Account>): Promise<Account> {
    return this.request<Account>('/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateAccount(id: string, data: Partial<Account>): Promise<Account> {
    return this.request<Account>(`/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteAccount(id: string): Promise<void> {
    return this.request<void>(`/accounts/${id}`, {
      method: 'DELETE',
    })
  }

  // Post methods
  async getPosts(): Promise<Post[]> {
    return this.request<Post[]>('/posts')
  }

  async getPost(id: string): Promise<Post> {
    return this.request<Post>(`/posts/${id}`)
  }

  async checkPostFinancialSuggestion(postId: string): Promise<any> {
    return this.request<any>(`/posts/${postId}/financial-suggestion`)
  }

  async createPost(data: Partial<Post>): Promise<Post> {
    return this.request<Post>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updatePost(id: string, data: Partial<Post>): Promise<Post> {
    return this.request<Post>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deletePost(id: string): Promise<void> {
    return this.request<void>(`/posts/${id}`, {
      method: 'DELETE',
    })
  }

  // User methods
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/users')
  }

  async getUser(id: string): Promise<User> {
    return this.request<User>(`/users/${id}`)
  }

  async addUserPersona(userId: string, persona: any): Promise<any> {
    return this.request<any>(`/users/${userId}/personas`, {
      method: 'POST',
      body: JSON.stringify(persona),
    })
  }

  async removeUserPersona(userId: string, personaId: string): Promise<void> {
    return this.request<void>(`/users/${userId}/personas/${personaId}`, {
      method: 'DELETE',
    })
  }

  async createUser(data: Partial<User>): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateUser(id: string, data: Partial<User>): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteUser(id: string): Promise<void> {
    return this.request<void>(`/users/${id}`, {
      method: 'DELETE',
    })
  }
}

export const apiClient = new ApiClient()