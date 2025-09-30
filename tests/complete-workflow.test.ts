import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { initializeDatabase, closeDatabase } from '../server/db/connection'
import { app } from '../server/api/server'
import { generateId } from '../src/utils/validation'
import FeedContainer from '../src/components/feed/FeedContainer.vue'
import PostComposer from '../src/components/feed/PostComposer.vue'
import PostCard from '../src/components/feed/PostCard.vue'
import TransactionModal from '../src/components/feed/TransactionModal.vue'

describe('Complete User Workflow Integration', () => {
  let testServer: { port: number; fetch: typeof app.fetch }
  let testUser: any
  let testAccounts: any[]

  beforeAll(async () => {
    // Initialize database and server
    await initializeDatabase(true)
    testServer = { port: 3001, fetch: app.fetch }

    // Create test user
    const userData = {
      name: 'Workflow Test User',
      email: `workflow-${Date.now()}@example.com`,
      personas: [
        { name: 'Manager', role: 'Management' },
        { name: 'Accountant', role: 'Finance' }
      ]
    }

    const userResponse = await testServer.fetch(new Request('http://localhost/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    }))

    testUser = (await userResponse.json()).data

    // Get test accounts
    const accountsResponse = await testServer.fetch(new Request('http://localhost/api/accounts'))
    testAccounts = (await accountsResponse.json()).data
  })

  afterAll(async () => {
    closeDatabase()
  })

  describe('End-to-End User Journey', () => {
    it('should complete full workflow: post creation → financial detection → transaction creation → approval', async () => {
      // Step 1: User creates a financial post
      const postData = {
        content: 'Just purchased new laptops for the team - paid $3,500 to TechSupplier Inc. Invoice #INV-2024-001',
        authorId: testUser.id,
        authorPersona: 'Manager',
        attachments: ['invoice-inv-2024-001.pdf', 'receipt.pdf']
      }

      const postResponse = await testServer.fetch(new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      }))

      expect(postResponse.status).toBe(201)
      const post = (await postResponse.json()).data

      // Verify post was created correctly
      expect(post.content).toBe(postData.content)
      expect(post.authorId).toBe(testUser.id)
      expect(post.authorPersona).toBe('Manager')
      expect(post.attachments).toEqual(['invoice-inv-2024-001.pdf', 'receipt.pdf'])
      expect(post.transactionId).toBeNull()

      // Step 2: System detects financial activity
      const suggestionResponse = await testServer.fetch(
        new Request(`http://localhost/api/posts/${post.id}/suggest-financial`)
      )
      expect(suggestionResponse.status).toBe(200)
      
      const suggestion = (await suggestionResponse.json()).data
      expect(suggestion.suggestsFinancial).toBe(true)
      expect(suggestion.matchedKeywords).toContain('paid')
      expect(suggestion.matchedKeywords).toContain('$')

      // Step 3: User converts post to transaction
      const equipmentAccount = testAccounts.find(a => 
        a.type === 'asset' && a.name.toLowerCase().includes('equipment')
      )
      const cashAccount = testAccounts.find(a => 
        a.type === 'asset' && a.name.toLowerCase().includes('cash')
      )

      expect(equipmentAccount).toBeTruthy()
      expect(cashAccount).toBeTruthy()

      const transactionData = {
        postId: post.id,
        description: 'Purchase of laptops for team - TechSupplier Inc.',
        date: new Date().toISOString(),
        status: 'pending',
        createdBy: testUser.id,
        entries: [
          {
            accountId: equipmentAccount.id,
            debitAmount: 3500.00
          },
          {
            accountId: cashAccount.id,
            creditAmount: 3500.00
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

      // Verify transaction was created correctly
      expect(transaction.postId).toBe(post.id)
      expect(transaction.description).toBe(transactionData.description)
      expect(transaction.status).toBe('pending')
      expect(transaction.createdBy).toBe(testUser.id)
      expect(transaction.entries).toHaveLength(2)

      // Verify transaction balance
      const totalDebits = transaction.entries
        .filter((e: any) => e.debitAmount)
        .reduce((sum: number, e: any) => sum + e.debitAmount, 0)
      const totalCredits = transaction.entries
        .filter((e: any) => e.creditAmount)
        .reduce((sum: number, e: any) => sum + e.creditAmount, 0)
      
      expect(totalDebits).toBe(3500.00)
      expect(totalCredits).toBe(3500.00)
      expect(totalDebits).toBe(totalCredits)

      // Step 4: Verify post is linked to transaction
      const linkedPostResponse = await testServer.fetch(new Request(`http://localhost/api/posts/${post.id}`))
      const linkedPost = (await linkedPostResponse.json()).data
      expect(linkedPost.transactionId).toBe(transaction.id)

      // Step 5: Accountant reviews and approves transaction
      const approvalResponse = await testServer.fetch(
        new Request(`http://localhost/api/transactions/${transaction.id}/approve`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvedBy: testUser.id })
        })
      )

      expect(approvalResponse.status).toBe(200)
      const approvedTransaction = (await approvalResponse.json()).data
      expect(approvedTransaction.status).toBe('approved')
      expect(approvedTransaction.approvedBy).toBe(testUser.id)

      // Step 6: Verify complete workflow by checking final state
      const finalPostResponse = await testServer.fetch(new Request(`http://localhost/api/posts/${post.id}`))
      const finalPost = (await finalPostResponse.json()).data

      const finalTransactionResponse = await testServer.fetch(
        new Request(`http://localhost/api/transactions/${transaction.id}`)
      )
      const finalTransaction = (await finalTransactionResponse.json()).data

      // Final verification
      expect(finalPost.transactionId).toBe(finalTransaction.id)
      expect(finalTransaction.status).toBe('approved')
      expect(finalTransaction.postId).toBe(finalPost.id)
      expect(finalTransaction.entries).toHaveLength(2)

      // Verify audit trail
      expect(finalTransaction.createdBy).toBe(testUser.id)
      expect(finalTransaction.approvedBy).toBe(testUser.id)
      expect(new Date(finalTransaction.createdAt)).toBeInstanceOf(Date)
    })

    it('should handle transaction rejection and resubmission workflow', async () => {
      // Create a post
      const postData = {
        content: 'Paid $150 for office supplies - need to categorize this expense',
        authorId: testUser.id,
        authorPersona: 'Manager',
        attachments: []
      }

      const postResponse = await testServer.fetch(new Request('http://localhost/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      }))

      const post = (await postResponse.json()).data

      // Create transaction with incorrect categorization
      const suppliesAccount = testAccounts.find(a => 
        a.type === 'expense' && a.name.toLowerCase().includes('supplies')
      )
      const cashAccount = testAccounts.find(a => 
        a.type === 'asset' && a.name.toLowerCase().includes('cash')
      )

      const transactionData = {
        postId: post.id,
        description: 'Office supplies purchase',
        date: new Date().toISOString(),
        status: 'pending',
        createdBy: testUser.id,
        entries: [
          {
            accountId: suppliesAccount.id,
            debitAmount: 150.00
          },
          {
            accountId: cashAccount.id,
            creditAmount: 150.00
          }
        ]
      }

      const transactionResponse = await testServer.fetch(new Request('http://localhost/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      }))

      const transaction = (await transactionResponse.json()).data

      // Reject the transaction
      const rejectionResponse = await testServer.fetch(
        new Request(`http://localhost/api/transactions/${transaction.id}/reject`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            rejectedBy: testUser.id,
            rejectionReason: 'Incorrect account categorization - should be office expenses'
          })
        })
      )

      expect(rejectionResponse.status).toBe(200)
      const rejectedTransaction = (await rejectionResponse.json()).data
      expect(rejectedTransaction.status).toBe('rejected')

      // Update transaction with correct categorization
      const officeExpenseAccount = testAccounts.find(a => 
        a.type === 'expense' && a.name.toLowerCase().includes('office')
      )

      const updatedTransactionData = {
        description: 'Office supplies purchase - corrected categorization',
        entries: [
          {
            accountId: officeExpenseAccount.id,
            debitAmount: 150.00
          },
          {
            accountId: cashAccount.id,
            creditAmount: 150.00
          }
        ]
      }

      const updateResponse = await testServer.fetch(
        new Request(`http://localhost/api/transactions/${transaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedTransactionData)
        })
      )

      expect(updateResponse.status).toBe(200)
      const updatedTransaction = (await updateResponse.json()).data
      expect(updatedTransaction.status).toBe('pending') // Reset to pending after update

      // Approve the corrected transaction
      const approvalResponse = await testServer.fetch(
        new Request(`http://localhost/api/transactions/${transaction.id}/approve`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvedBy: testUser.id })
        })
      )

      expect(approvalResponse.status).toBe(200)
      const approvedTransaction = (await approvalResponse.json()).data
      expect(approvedTransaction.status).toBe('approved')
    })

    it('should handle multiple posts and transactions in feed view', async () => {
      // Create multiple posts with different financial scenarios
      const scenarios = [
        {
          content: 'Received payment from client ABC Corp - $2,500 for consulting services',
          isFinancial: true,
          amount: 2500,
          type: 'revenue'
        },
        {
          content: 'Team meeting scheduled for next week to discuss Q4 planning',
          isFinancial: false,
          amount: 0,
          type: null
        },
        {
          content: 'Paid monthly rent for office space - $1,800 to Property Management LLC',
          isFinancial: true,
          amount: 1800,
          type: 'expense'
        },
        {
          content: 'New employee onboarding completed successfully',
          isFinancial: false,
          amount: 0,
          type: null
        }
      ]

      const createdPosts = []

      // Create all posts
      for (const scenario of scenarios) {
        const postData = {
          content: scenario.content,
          authorId: testUser.id,
          authorPersona: 'Manager',
          attachments: []
        }

        const response = await testServer.fetch(new Request('http://localhost/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        }))

        const post = (await response.json()).data
        createdPosts.push({ ...post, scenario })
      }

      // Verify financial detection for each post
      for (const post of createdPosts) {
        const suggestionResponse = await testServer.fetch(
          new Request(`http://localhost/api/posts/${post.id}/suggest-financial`)
        )
        const suggestion = (await suggestionResponse.json()).data
        
        expect(suggestion.suggestsFinancial).toBe(post.scenario.isFinancial)
      }

      // Create transactions for financial posts
      const financialPosts = createdPosts.filter(p => p.scenario.isFinancial)
      
      for (const post of financialPosts) {
        let debitAccount, creditAccount
        
        if (post.scenario.type === 'revenue') {
          // Revenue: Debit Cash, Credit Revenue
          debitAccount = testAccounts.find(a => a.type === 'asset' && a.name.includes('Cash'))
          creditAccount = testAccounts.find(a => a.type === 'revenue')
        } else if (post.scenario.type === 'expense') {
          // Expense: Debit Expense, Credit Cash
          debitAccount = testAccounts.find(a => a.type === 'expense')
          creditAccount = testAccounts.find(a => a.type === 'asset' && a.name.includes('Cash'))
        }

        const transactionData = {
          postId: post.id,
          description: `Transaction for: ${post.content.substring(0, 50)}...`,
          date: new Date().toISOString(),
          status: 'pending',
          createdBy: testUser.id,
          entries: [
            {
              accountId: debitAccount.id,
              debitAmount: post.scenario.amount
            },
            {
              accountId: creditAccount.id,
              creditAmount: post.scenario.amount
            }
          ]
        }

        const transactionResponse = await testServer.fetch(new Request('http://localhost/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData)
        }))

        expect(transactionResponse.status).toBe(201)
      }

      // Verify feed shows all posts with correct transaction links
      const feedResponse = await testServer.fetch(new Request('http://localhost/api/posts'))
      const feedPosts = (await feedResponse.json()).data

      // Should have at least our created posts
      expect(feedPosts.length).toBeGreaterThanOrEqual(createdPosts.length)

      // Verify financial posts have transaction links
      for (const originalPost of createdPosts) {
        const feedPost = feedPosts.find((p: any) => p.id === originalPost.id)
        expect(feedPost).toBeTruthy()

        if (originalPost.scenario.isFinancial) {
          expect(feedPost.transactionId).toBeTruthy()
        } else {
          expect(feedPost.transactionId).toBeNull()
        }
      }
    })

    it('should maintain data consistency across concurrent operations', async () => {
      // Create multiple posts concurrently
      const concurrentPosts = Array.from({ length: 5 }, (_, i) => ({
        content: `Concurrent post ${i + 1} - paid $${(i + 1) * 100} for various expenses`,
        authorId: testUser.id,
        authorPersona: 'Manager',
        attachments: []
      }))

      const postPromises = concurrentPosts.map(postData =>
        testServer.fetch(new Request('http://localhost/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData)
        }))
      )

      const postResponses = await Promise.all(postPromises)
      const posts = await Promise.all(
        postResponses.map(response => response.json().then(data => data.data))
      )

      // Verify all posts were created successfully
      expect(posts).toHaveLength(5)
      posts.forEach((post, index) => {
        expect(post.content).toBe(concurrentPosts[index].content)
        expect(post.authorId).toBe(testUser.id)
      })

      // Create transactions for all posts concurrently
      const expenseAccount = testAccounts.find(a => a.type === 'expense')
      const cashAccount = testAccounts.find(a => a.type === 'asset' && a.name.includes('Cash'))

      const transactionPromises = posts.map((post, index) =>
        testServer.fetch(new Request('http://localhost/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: post.id,
            description: `Transaction for concurrent post ${index + 1}`,
            date: new Date().toISOString(),
            status: 'pending',
            createdBy: testUser.id,
            entries: [
              {
                accountId: expenseAccount.id,
                debitAmount: (index + 1) * 100
              },
              {
                accountId: cashAccount.id,
                creditAmount: (index + 1) * 100
              }
            ]
          })
        }))
      )

      const transactionResponses = await Promise.all(transactionPromises)
      const transactions = await Promise.all(
        transactionResponses.map(response => response.json().then(data => data.data))
      )

      // Verify all transactions were created successfully
      expect(transactions).toHaveLength(5)
      transactions.forEach((transaction, index) => {
        expect(transaction.postId).toBe(posts[index].id)
        expect(transaction.status).toBe('pending')
        expect(transaction.entries).toHaveLength(2)
      })

      // Verify posts are linked to transactions
      const updatedPostsResponse = await testServer.fetch(new Request('http://localhost/api/posts'))
      const updatedPosts = (await updatedPostsResponse.json()).data

      posts.forEach(originalPost => {
        const updatedPost = updatedPosts.find((p: any) => p.id === originalPost.id)
        expect(updatedPost.transactionId).toBeTruthy()
      })
    })
  })
})