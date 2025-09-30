export interface Post {
  id: string
  content: string
  authorId: string
  authorPersona: string
  createdAt: Date
  attachments?: string[]
  transactionId?: string
}

export interface Transaction {
  id: string
  postId: string
  description: string
  date: Date
  status: 'pending' | 'approved' | 'rejected'
  createdBy: string
  approvedBy?: string
  entries: TransactionEntry[]
}

export interface TransactionEntry {
  id: string
  transactionId: string
  accountId: string
  debitAmount?: number
  creditAmount?: number
}

export interface Account {
  id: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  category: string
  isActive: boolean
}

export interface User {
  id: string
  name: string
  email: string
  personas: UserPersona[]
}

export interface UserPersona {
  id: string
  name: string
  role: string
  avatar?: string
}

export interface ErrorResponse {
  error: string
  message: string
  details?: Record<string, string[]>
  timestamp: Date
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

// Transaction validation interface
export interface TransactionValidation extends ValidationResult {
  totalDebits: number
  totalCredits: number
  balance: number
}