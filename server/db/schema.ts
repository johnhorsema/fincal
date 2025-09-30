import { sqliteTable, text, integer, real, unique } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  personas: text('personas'), // JSON array
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(Date.now()),
})

// Accounts table
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(), // asset, liability, equity, revenue, expense
  category: text('category').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(Date.now()),
}, (table) => ({
  uniqueNameType: unique().on(table.name, table.type),
}))

// Posts table
export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  authorId: text('author_id').notNull().references(() => users.id),
  authorPersona: text('author_persona').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(Date.now()),
  attachments: text('attachments'), // JSON array
  transactionId: text('transaction_id'),
})

// Transactions table
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  postId: text('post_id').notNull().references(() => posts.id),
  description: text('description').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  status: text('status').notNull().default('pending'), // pending, approved, rejected
  createdBy: text('created_by').notNull().references(() => users.id),
  approvedBy: text('approved_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(Date.now()),
})

// Transaction entries table
export const transactionEntries = sqliteTable('transaction_entries', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').notNull().references(() => transactions.id),
  accountId: text('account_id').notNull().references(() => accounts.id),
  debitAmount: real('debit_amount'),
  creditAmount: real('credit_amount'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(Date.now()),
})

// Define relationships
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  createdTransactions: many(transactions, { relationName: 'createdBy' }),
  approvedTransactions: many(transactions, { relationName: 'approvedBy' }),
}))

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [posts.transactionId],
    references: [transactions.id],
  }),
}))

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  post: one(posts, {
    fields: [transactions.postId],
    references: [posts.id],
  }),
  creator: one(users, {
    fields: [transactions.createdBy],
    references: [users.id],
    relationName: 'createdBy',
  }),
  approver: one(users, {
    fields: [transactions.approvedBy],
    references: [users.id],
    relationName: 'approvedBy',
  }),
  entries: many(transactionEntries),
}))

export const accountsRelations = relations(accounts, ({ many }) => ({
  transactionEntries: many(transactionEntries),
}))

export const transactionEntriesRelations = relations(transactionEntries, ({ one }) => ({
  transaction: one(transactions, {
    fields: [transactionEntries.transactionId],
    references: [transactions.id],
  }),
  account: one(accounts, {
    fields: [transactionEntries.accountId],
    references: [accounts.id],
  }),
}))