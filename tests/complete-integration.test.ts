import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../src/App.vue'
import Home from '../src/views/Home.vue'
import { initializeDatabase, closeDatabase } from '../server/db/connection'
import { app } from '../server/api/server'
import { generateId } from '../src/utils/validation'

// Mock router for testing
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/transactions', component: () => import('../views/Transactions.vue') },
    { path: '/accounts', component: () => import('../views/Accounts.vue') },
    { path: '/user-demo', component: () => import('../views/UserDemo.vue') }
  ]
})

describe('Complete Application Integration', () => {
  let testServer: { port: number; fetch: typeof app.fetch }

  beforeAll(async () => {
    // Initialize database
    await initializeDatabase(true)
    
    // Initialize test server
    testServer = {
      port: 3001,
      fetch: app.fetch
    }
  })

  afterAll(async () => {
    closeDatabase()
  })

  describe('Application Bootstrap', () => {
    it('should mount the main App component successfully', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router]
        }
      })

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('#app').exists()).toBe(true)
    })

    it('should have all required routes configured', () => {
      const routes = router.getRoutes()
      const routePaths = routes.map(route => route.path)
      
      expect(routePaths).toContain('/')
      expect(routePaths).toContain('/transactions')
      expect(routePaths).toContain('/accounts')
      expect(routePaths).toContain('/user-demo')
    })
  })

  describe('API Server Integration', () => {
    it('should have API server running and responding', async () => {
      const response = await testServer.fetch(new Request('http://localhost/health'))
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.status).toBe('ok')
    })

    it('should handle CORS properly', async () => {
      const response = await testServer.fetch(new Request('http://localhost/api/posts', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST'
        }
      }))
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
    })
  })

  describe('Database Integration', () => {
    it('should have database initialized with proper schema', async () => {
      const response = await testServer.fetch(new Request('http://localhost/api/accounts'))
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.data).toBeInstanceOf(Array)
      expect(data.data.length).toBeGreaterThan(0) // Should have seeded accounts
    })

    it('should maintain data consistency across operations', async () => {
      // Create a user
      const userData = {
        name: 'Integration Test User',
        email: `test-${Date.now()}@example.com`,
        personas: [{ name: 'Tester', role: 'QA' }]
      }

      const userResponse = await testServer.fetch(new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      }))

      expect(userResponse.status).toBe(201)
      const user = (await userResponse.json()).data

      // Create a post
      const postData = {
        content: 'Integration test post - paid $100 for supplies',
        authorId: user.id,
        authorPersona: 'Tester',
        attachments: []
      }

      const postResponse = await testServer.fetch(new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      }))

      expect(postResponse.status).toBe(201)
      const post = (await postResponse.json()).data

      // Get accounts for transaction
      const accountsResponse = await testServer.fetch(new Request('http://localhost/api/accounts'))
      const accounts = (await accountsResponse.json()).data
      const cashAccount = accounts.find((a: any) => a.type === 'asset')
      const expenseAccount = accounts.find((a: any) => a.type === 'expense')

      expect(cashAccount).toBeTruthy()
      expect(expenseAccount).toBeTruthy()

      // Create a transaction
      const transactionData = {
        postId: post.id,
        description: 'Office supplies purchase',
        date: new Date().toISOString(),
        status: 'pending',
        createdBy: user.id,
        entries: [
          {
            accountId: expenseAccount.id,
            debitAmount: 100.00
          },
          {
            accountId: cashAccount.id,
            creditAmount: 100.00
          }
        ]
      }

      const transactionResponse = await testServer.fetch(new Request('http://localhost/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      }))

      expect(transactionResponse.status).toBe(201)
      const transaction = (await transactionResponse.json()).data

      // Verify the post is linked to the transaction
      const updatedPostResponse = await testServer.fetch(new Request(`http://localhost/api/posts/${post.id}`))
      const updatedPost = (await updatedPostResponse.json()).data
      
      expect(updatedPost.transactionId).toBe(transaction.id)
    })
  })

  describe('Component Integration', () => {
    it('should render Home view with all components', async () => {
      await router.push('/')
      await router.isReady()

      const wrapper = mount(Home, {
        global: {
          plugins: [router]
        }
      })

      // Check for main sections
      expect(wrapper.find('h1').text()).toContain('Social Feed')
      expect(wrapper.text()).toContain('Share updates and convert them to accounting transactions')
      
      // Check for sidebar components
      expect(wrapper.text()).toContain('Quick Stats')
      expect(wrapper.text()).toContain('Quick Actions')
      expect(wrapper.text()).toContain('Recent Activity')
    })

    it('should handle navigation between views', async () => {
      const wrapper = mount(App, {
        global: {
          plugins: [router]
        }
      })

      // Start at home
      await router.push('/')
      await router.isReady()
      expect(router.currentRoute.value.path).toBe('/')

      // Navigate to transactions
      await router.push('/transactions')
      await router.isReady()
      expect(router.currentRoute.value.path).toBe('/transactions')

      // Navigate to accounts
      await router.push('/accounts')
      await router.isReady()
      expect(router.currentRoute.value.path).toBe('/accounts')
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      // Try to get a non-existent post
      const response = await testServer.fetch(new Request('http://localhost/api/posts/non-existent-id'))
      expect(response.status).toBe(404)
      
      const error = await response.json()
      expect(error).toHaveProperty('error')
      expect(error).toHaveProperty('message')
      expect(error).toHaveProperty('timestamp')
    })

    it('should validate input properly', async () => {
      // Try to create a post with invalid data
      const invalidPost = {
        content: '', // Empty content
        authorId: 'invalid-id', // Invalid UUID
        authorPersona: ''
      }

      const response = await testServer.fetch(new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidPost)
      }))

      expect(response.status).toBe(400)
      
      const error = await response.json()
      expect(error.category).toBe('validation')
    })

    it('should handle security threats', async () => {
      // Try to create a post with XSS attempt
      const maliciousPost = {
        content: '<script>alert("xss")</script>Malicious content',
        authorId: generateId(),
        authorPersona: 'Hacker'
      }

      const response = await testServer.fetch(new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maliciousPost)
      }))

      // Should either sanitize or reject
      if (response.status === 201) {
        const post = (await response.json()).data
        expect(post.content).not.toContain('<script>')
      } else {
        expect(response.status).toBe(400)
      }
    })
  })

  describe('Performance Integration', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        testServer.fetch(new Request('http://localhost/api/accounts'))
      )

      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })

    it('should respect rate limiting', async () => {
      // Make many requests quickly to trigger rate limiting
      const requests = Array.from({ length: 150 }, () => 
        testServer.fetch(new Request('http://localhost/health'))
      )

      const responses = await Promise.allSettled(requests)
      
      // Some requests should be rate limited
      const rateLimited = responses.some(result => 
        result.status === 'fulfilled' && result.value.status === 429
      )
      
      expect(rateLimited).toBe(true)
    })
  })

  describe('Complete User Workflow', () => {
    it('should support complete post-to-transaction workflow', async () => {
      // 1. Create a user
      const userData = {
        name: 'Workflow Test User',
        email: `workflow-${Date.now()}@example.com`,
        personas: [{ name: 'Manager', role: 'Management' }]
      }

      const userResponse = await testServer.fetch(new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      }))

      const user = (await userResponse.json()).data

      // 2. Create a financial post
      const postData = {
        content: 'Just paid $250 for new office equipment from TechStore',
        authorId: user.id,
        authorPersona: 'Manager',
        attachments: ['receipt.pdf']
      }

      const postResponse = await testServer.fetch(new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      }))

      const post = (await postResponse.json()).data

      // 3. Check if post suggests financial activity
      const suggestionResponse = await testServer.fetch(
        new Request(`http://localhost/api/posts/${post.id}/suggest-financial`)
      )
      const suggestion = (await suggestionResponse.json()).data
      expect(suggestion.suggestsFinancial).toBe(true)

      // 4. Get accounts for transaction creation
      const accountsResponse = await testServer.fetch(new Request('http://localhost/api/accounts'))
      const accounts = (await accountsResponse.json()).data
      
      const cashAccount = accounts.find((a: any) => a.type === 'asset' && a.name.includes('Cash'))
      const equipmentAccount = accounts.find((a: any) => a.type === 'asset' && a.name.includes('Equipment'))
      
      expect(cashAccount).toBeTruthy()
      expect(equipmentAccount).toBeTruthy()

      // 5. Create transaction from post
      const transactionData = {
        postId: post.id,
        description: 'Office equipment purchase from TechStore',
        date: new Date().toISOString(),
        status: 'pending',
        createdBy: user.id,
        entries: [
          {
            accountId: equipmentAccount.id,
            debitAmount: 250.00
          },
          {
            accountId: cashAccount.id,
            creditAmount: 250.00
          }
        ]
      }

      const transactionResponse = await testServer.fetch(new Request('http://localhost/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      }))

      expect(transactionResponse.status).toBe(201)
      const transaction = (await transactionResponse.json()).data

      // 6. Verify transaction is properly linked to post
      const linkedPostResponse = await testServer.fetch(new Request(`http://localhost/api/posts/${post.id}`))
      const linkedPost = (await linkedPostResponse.json()).data
      expect(linkedPost.transactionId).toBe(transaction.id)

      // 7. Approve the transaction
      const approvalResponse = await testServer.fetch(
        new Request(`http://localhost/api/transactions/${transaction.id}/approve`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvedBy: user.id })
        })
      )

      expect(approvalResponse.status).toBe(200)
      const approvedTransaction = (await approvalResponse.json()).data
      expect(approvedTransaction.status).toBe('approved')
      expect(approvedTransaction.approvedBy).toBe(user.id)

      // 8. Verify complete workflow by fetching all related data
      const finalPostResponse = await testServer.fetch(new Request(`http://localhost/api/posts/${post.id}`))
      const finalPost = (await finalPostResponse.json()).data

      const finalTransactionResponse = await testServer.fetch(
        new Request(`http://localhost/api/transactions/${transaction.id}`)
      )
      const finalTransaction = (await finalTransactionResponse.json()).data

      // Verify all data is consistent
      expect(finalPost.transactionId).toBe(finalTransaction.id)
      expect(finalTransaction.status).toBe('approved')
      expect(finalTransaction.entries).toHaveLength(2)
      expect(finalTransaction.entries[0].debitAmount + finalTransaction.entries[1].creditAmount).toBe(500) // Balanced
    })
  })
})