# Design Document

## Overview

FinCal is a Vue.js-based web application that combines social media functionality with double-entry bookkeeping. The application uses a modern tech stack including Vue 3 with Composition API, Tailwind CSS for styling, Bun as the runtime and package manager, Drizzle ORM for database operations, and better-sqlite3 for local data storage.

The architecture follows a component-based approach with clear separation between the social feed interface and accounting transaction management. The application maintains data integrity through proper validation and implements a workflow that transforms informal social posts into formal accounting entries.

## Architecture

### Frontend Architecture
- **Vue 3 with Composition API**: Provides reactive state management and component composition
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Component Structure**: Modular components for feed, posts, transaction forms, and account management
- **State Management**: Vue's reactive system with composables for shared state

### Backend Architecture
- **Bun Runtime**: Fast JavaScript runtime for server-side operations
- **API Layer**: RESTful endpoints for CRUD operations on posts and transactions
- **Database Layer**: Drizzle ORM with better-sqlite3 for local database operations
- **File Storage**: Local file system for attachment storage

### Database Design
- **Posts Table**: Stores social feed entries with metadata
- **Transactions Table**: Stores accounting transactions with double-entry structure
- **Accounts Table**: Chart of accounts with account types and categories
- **Users Table**: User profiles and persona information
- **Transaction_Entries Table**: Individual debit/credit entries for each transaction

## Components and Interfaces

### Core Components

#### FeedContainer
- Main container component that orchestrates the social feed
- Manages feed state and post creation
- Handles real-time updates and pagination

#### PostCard
- Individual post display component
- Shows author, timestamp, content, and interaction buttons
- Conditionally renders transaction details if post is converted

#### PostComposer
- Text input component for creating new posts
- Persona selection dropdown
- File attachment functionality
- Character count and validation

#### TransactionModal
- Modal component for converting posts to transactions
- Account selection with search/filter
- Debit/credit entry management
- Balance validation and error display

#### AccountSelector
- Searchable dropdown for account selection
- Grouped by account type (Assets, Liabilities, etc.)
- Supports creating new accounts inline

### Data Interfaces

```typescript
interface Post {
  id: string
  content: string
  authorId: string
  authorPersona: string
  createdAt: Date
  attachments?: string[]
  transactionId?: string
}

interface Transaction {
  id: string
  postId: string
  description: string
  date: Date
  status: 'pending' | 'approved' | 'rejected'
  createdBy: string
  approvedBy?: string
  entries: TransactionEntry[]
}

interface TransactionEntry {
  id: string
  transactionId: string
  accountId: string
  debitAmount?: number
  creditAmount?: number
}

interface Account {
  id: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  category: string
  isActive: boolean
}

interface User {
  id: string
  name: string
  email: string
  personas: UserPersona[]
}

interface UserPersona {
  id: string
  name: string
  role: string
  avatar?: string
}
```

## Data Models

### Database Schema (Drizzle ORM)

```typescript
// Posts table
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  authorId: text('author_id').notNull(),
  authorPersona: text('author_persona').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  attachments: text('attachments'), // JSON array
  transactionId: text('transaction_id'),
})

// Transactions table
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull(),
  description: text('description').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  status: text('status').notNull().default('pending'),
  createdBy: text('created_by').notNull(),
  approvedBy: text('approved_by'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
})

// Transaction entries table
export const transactionEntries = sqliteTable('transaction_entries', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull(),
  accountId: text('account_id').notNull(),
  debitAmount: real('debit_amount'),
  creditAmount: real('credit_amount'),
})

// Accounts table
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  category: text('category').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
})

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  personas: text('personas'), // JSON array
})
```

### Validation Rules
- Transaction entries must balance (total debits = total credits)
- Posts have a maximum character limit of 500 characters
- Account names must be unique within their type
- Transaction dates cannot be in the future
- Only approved users can approve transactions

## Error Handling

### Client-Side Error Handling
- Form validation with real-time feedback
- Network error handling with retry mechanisms
- Graceful degradation for offline scenarios
- User-friendly error messages with actionable guidance

### Server-Side Error Handling
- Database constraint violations
- Transaction balance validation
- File upload size and type restrictions
- Authentication and authorization errors

### Error Response Format
```typescript
interface ErrorResponse {
  error: string
  message: string
  details?: Record<string, string[]>
  timestamp: Date
}
```

## Testing Strategy

### Unit Testing
- Component testing with Vue Test Utils
- Business logic testing for transaction validation
- Database operation testing with test database
- Utility function testing

### Integration Testing
- API endpoint testing
- Database integration testing
- File upload/download testing
- Authentication flow testing

### End-to-End Testing
- Complete user workflows (post creation to transaction approval)
- Cross-browser compatibility testing
- Mobile responsiveness testing
- Performance testing under load

### Test Data Management
- Seed data for development and testing
- Factory functions for generating test entities
- Database cleanup between tests
- Mock data for external dependencies

## Security Considerations

### Data Protection
- Input sanitization to prevent XSS attacks
- SQL injection prevention through parameterized queries
- File upload validation and scanning
- Sensitive data encryption at rest

### Access Control
- Role-based permissions for transaction approval
- User authentication and session management
- API endpoint authorization
- Audit logging for financial transactions

### Compliance
- Financial data retention policies
- Audit trail maintenance
- Data backup and recovery procedures
- GDPR compliance for user data