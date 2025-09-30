import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { app } from '../api/server'
import { db, users, accounts, posts, transactions, transactionEntries } from '../db'
import { generateId } from '../utils/validation'

// Test server instance
let testServer: { port: number; fetch: typeof app.fetch }

// Test data
const testUser = {
  id: generateId(),
  name: 'Test User',
  email: 'test@example.com',
  personas: JSON.stringify([
    { id: generateId(), name: 'Accountant', role: 'Finance' },
    { id: generateId(), name: 'Manager', role: 'Management' }
  ])
}

const testAccount = {
  id: generateId(),
  name: 'Test Cash Account',
  type: 'asset',
  category: 'Current Assets',
  isActive: true
}

const testAccount2 = {
  id: generateId(),
  name: 'Test Revenue Account',
  type: 'revenue',
  category: 'Sales Revenue',
  isActive: true
}

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Initialize test server
    testServer = {
      port: 3001,
      fetch: app.fetch
    }

    // Set up test data
    await db.insert(users).values({
      ...testUser,
      createdAt: Date.now()
    })

    await db.insert(accounts).values([
      { ...testAccount, createdAt: Date.now() },
      { ...testAccount2, createdAt: Date.now() }
    ])
  })

  afterAll(async () => {
    // Clean up test data
    await db.delete(transactionEntries)
    await db.delete(transactions)
    await db.delete(posts)
    await db.delete(accounts)
    await db.delete(users)
  })

  beforeEach(async () => {
    // Clean up posts and transactions before each test
    await db.delete(transactionEntries)
    await db.delete(transactions)
    await db.delete(posts)
  })

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await testServer.fetch(new Request('http://localhost/health'))
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('status', 'ok')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('version')
    })
  })

  describe('Posts API', () => {
    it('should create a new post', async () => {
      const postData = {
        content: 'Test post content',
        authorId: testUser.id,
        authorPersona: 'Accountant',
        attachments: []
      }

      const response = await testServer.fetch(new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      }))

      expect(response.status).toBe(201)
      
      const result = await response.json()
      expect(result.data).toMatchObject({
        content: postData.content,
        authorId: postData.authorId,
        authorPersona: postData.authorPersona
      })
      expect(result.data).toHaveProperty('id')
      expect(result.data).toHaveProperty('createdAt')
    })

    it('should get all posts', async () => {
      // Create a test post first
      await db.insert(posts).values({
        id: generateId(),
        content: 'Test post for retrieval',
        authorId: testUser.id,
        authorPersona: 'Manager',
        createdAt: Date.now(),
        attachments: null,
        transactionId: null
      })

      const response = await testServer.fetch(new Request('http://localhost/api/posts'))
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.data).toBeInstanceOf(Array)
      expect(result.data.length).toBeGreaterThan(0)
      expect(result).toHaveProperty('count')
    })

    it('should get a single post', async () => {
      const postId = generateId()
      await db.insert(posts).values({
        id: postId,
        content: 'Test post for single retrieval',
        authorId: testUser.id,
        authorPersona: 'Accountant',
        createdAt: Date.now(),
        attachments: null,
        transactionId: null
      })

      const response = await testServer.fetch(new Request(`http://localhost/api/posts/${postId}`))
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.data).toMatchObject({
        id: postId,
        content: 'Test post for single retrieval',
        authorId: testUser.id
      })
    })

    it('should update a post', async () => {
      const postId = generateId()
      await db.insert(posts).values({
        id: postId,
        content: 'Original content',
        authorId: testUser.id,
        authorPersona: 'Manager',
        createdAt: Date.now(),
        attachments: null,
        transactionId: null
      })

      const updates = { content: 'Updated content' }
      const response = await testServer.fetch(new Request(`http://localhost/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }))

      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.data.content).toBe('Updated content')
    })

    it('should check financial suggestion for post', async () => {
      const postId = generateId()
      await db.insert(posts).values({
        id: postId,
        content: 'Paid $100 for office supplies',
        authorId: testUser.id,
        authorPersona: 'Accountant',
        createdAt: Date.now(),
        attachments: null,
        transactionId: null
      })

      const response = await testServer.fetch(new Request(`http://localhost/api/posts/${postId}/suggest-financial`))
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.data.suggestsFinancial).toBe(true)
      expect(result.data.matchedKeywords).toContain('paid')
      expect(result.data.matchedKeywords).toContain('$')
    })

    it('should validate post creation', async () => {
      const invalidPost = {
        content: '', // Empty content should fail
        authorId: testUser.id,
        authorPersona: 'Accountant'
      }

      const response = await testServer.fetch(new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPost)
      }))

      expect(response.status).toBe(400)
    })
  })

  describe('Transactions API', () => {
    let testPostId: string

    beforeEach(async () => {
      // Create a test post for transaction creation
      testPostId = generateId()
      await db.insert(posts).values({
        id: testPostId,
        content: 'Test post for transaction',
        authorId: testUser.id,
        authorPersona: 'Accountant',
        createdAt: Date.now(),
        attachments: null,
        transactionId: null
      })
    })

    it('should create a new transaction', async () => {
      const transactionData = {
        postId: testPostId,
        description: 'Test transaction',
        date: new Date().toISOString(),
        status: 'pending',
        createdBy: testUser.id,
        entries: [
          {
            accountId: testAccount.id,
            debitAmount: 100.00
          },
          {
            accountId: testAccount2.id,
            creditAmount: 100.00
          }
        ]
      }

      const response = await testServer.fetch(new Request('http://localhost/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      }))

      expect(response.status).toBe(201)
      
      const result = await response.json()
      expect(result.data).toMatchObject({
        postId: testPostId,
        description: 'Test transaction',
        status: 'pending',
        createdBy: testUser.id
      })
      expect(result.data.entries).toHaveLength(2)
    })

    it('should get all transactions', async () => {
      // Create a test transaction first
      const transactionId = generateId()
      await db.insert(transactions).values({
        id: transactionId,
        postId: testPostId,
        description: 'Test transaction for retrieval',
        date: Date.now(),
        status: 'pending',
        createdBy: testUser.id,
        approvedBy: null,
        createdAt: Date.now()
      })

      const response = await testServer.fetch(new Request('http://localhost/api/transactions'))
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.data).toBeInstanceOf(Array)
      expect(result.data.length).toBeGreaterThan(0)
    })

    it('should approve a transaction', async () => {
      const transactionId = generateId()
      await db.insert(transactions).values({
        id: transactionId,
        postId: testPostId,
        description: 'Test transaction for approval',
        date: Date.now(),
        status: 'pending',
        createdBy: testUser.id,
        approvedBy: null,
        createdAt: Date.now()
      })

      const response = await testServer.fetch(new Request(`http://localhost/api/transactions/${transactionId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvedBy: testUser.id })
      }))

      expect(response.status).toBe(200)
    })

    it('should reject a transaction', async () => {
      const transactionId = generateId()
      await db.insert(transactions).values({
        id: transactionId,
        postId: testPostId,
        description: 'Test transaction for rejection',
        date: Date.now(),
        status: 'pending',
        createdBy: testUser.id,
        approvedBy: null,
        createdAt: Date.now()
      })

      const response = await testServer.fetch(new Request(`http://localhost/api/transactions/${transactionId}/reject`, {
        method: 'PATCH'
      }))

      expect(response.status).toBe(200)
    })

    it('should validate transaction balance', async () => {
      const unbalancedTransaction = {
        postId: testPostId,
        description: 'Unbalanced transaction',
        date: new Date().toISOString(),
        status: 'pending',
        createdBy: testUser.id,
        entries: [
          {
            accountId: testAccount.id,
            debitAmount: 100.00
          },
          {
            accountId: testAccount2.id,
            creditAmount: 50.00 // Unbalanced!
          }
        ]
      }

      const response = await testServer.fetch(new Request('http://localhost/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unbalancedTransaction)
      }))

      expect(response.status).toBe(400)
    })
  })

  describe('Accounts API', () => {
    it('should get all accounts', async () => {
      const response = await testServer.fetch(new Request('http://localhost/api/accounts'))
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.data).toBeInstanceOf(Array)
      expect(result.data.length).toBeGreaterThanOrEqual(2) // Our test accounts
    })

    it('should get accounts grouped by type', async () => {
      const response = await testServer.fetch(new Request('http://localhost/api/accounts?groupBy=type'))
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.data).toHaveProperty('asset')
      expect(result.data).toHaveProperty('revenue')
      expect(result.data.asset).toBeInstanceOf(Array)
      expect(result.data.revenue).toBeInstanceOf(Array)
    })

    it('should create a new account', async () => {
      const accountData = {
        name: 'Test Expense Account',
        type: 'expense',
        category: 'Operating Expenses',
        isActive: true
      }

      const response = await testServer.fetch(new Request('http://localhost/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      }))

      expect(response.status).toBe(201)
      
      const result = await response.json()
      expect(result.data).toMatchObject(accountData)
      expect(result.data).toHaveProperty('id')
    })

    it('should get account types and categories', async () => {
      const response = await testServer.fetch(new Request('http://localhost/api/accounts/types'))
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.data).toHaveProperty('types')
      expect(result.data).toHaveProperty('categories')
      expect(result.data.types).toHaveProperty('asset')
      expect(result.data.categories).toHaveProperty('asset')
    })

    it('should prevent duplicate account names within same type', async () => {
      const duplicateAccount = {
        name: testAccount.name, // Same name as existing account
        type: testAccount.type, // Same type as existing account
        category: 'Current Assets',
        isActive: true
      }

      const response = await testServer.fetch(new Request('http://localhost/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateAccount)
      }))

      expect(response.status).toBe(400)
    })
  })

  describe('Users API', () => {
    it('should get all users', async () => {
      const response = await testServer.fetch(new Request('http://localhost/api/users'))
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.data).toBeInstanceOf(Array)
      expect(result.data.length).toBeGreaterThanOrEqual(1) // Our test user
    })

    it('should get a single user with stats', async () => {
      const response = await testServer.fetch(new Request(`http://localhost/api/users/${testUser.id}`))
      expect(response.status).toBe(200)
      
      const result = await response.json()
      expect(result.data).toMatchObject({
        id: testUser.id,
        name: testUser.name,
        email: testUser.email
      })
      expect(result.data).toHaveProperty('personas')
      expect(result.data).toHaveProperty('stats')
      expect(result.data.stats).toHaveProperty('postsCount')
      expect(result.data.stats).toHaveProperty('transactionsCount')
    })

    it('should create a new user', async () => {
      const userData = {
        name: 'New Test User',
        email: 'newuser@example.com',
        personas: [
          { name: 'Developer', role: 'Engineering' }
        ]
      }

      const response = await testServer.fetch(new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      }))

      expect(response.status).toBe(201)
      
      const result = await response.json()
      expect(result.data).toMatchObject({
        name: userData.name,
        email: userData.email
      })
      expect(result.data.personas).toHaveLength(1)
      expect(result.data.personas[0]).toMatchObject({
        name: 'Developer',
        role: 'Engineering'
      })
    })

    it('should add a persona to a user', async () => {
      const personaData = {
        name: 'Sales Rep',
        role: 'Sales'
      }

      const response = await testServer.fetch(new Request(`http://localhost/api/users/${testUser.id}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personaData)
      }))

      expect(response.status).toBe(201)
      
      const result = await response.json()
      expect(result.data).toMatchObject(personaData)
      expect(result.data).toHaveProperty('id')
    })

    it('should prevent duplicate email addresses', async () => {
      const duplicateUser = {
        name: 'Duplicate User',
        email: testUser.email, // Same email as existing user
        personas: []
      }

      const response = await testServer.fetch(new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicateUser)
      }))

      expect(response.status).toBe(400)
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent resources', async () => {
      const response = await testServer.fetch(new Request('http://localhost/api/posts/non-existent-id'))
      expect(response.status).toBe(404)
      
      const result = await response.json()
      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('message')
      expect(result).toHaveProperty('timestamp')
    })

    it('should return 400 for invalid JSON', async () => {
      const response = await testServer.fetch(new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      }))

      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent endpoints', async () => {
      const response = await testServer.fetch(new Request('http://localhost/api/non-existent'))
      expect(response.status).toBe(404)
    })
  })
})