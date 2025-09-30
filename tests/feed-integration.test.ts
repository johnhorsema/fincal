import { describe, it, expect, beforeEach } from 'vitest'
import { usePosts } from '../src/composables/usePosts'
import type { Post } from '../src/types'

describe('Feed Integration Tests', () => {
  let posts: Post[]
  
  beforeEach(() => {
    posts = []
  })

  it('should handle complete post lifecycle', async () => {
    const { createPost, updatePost, getPost, suggestsFinancialActivity } = usePosts()
    
    // Create a financial post
    const postData = {
      content: 'Just paid $500 for office supplies from Staples',
      authorId: 'user1',
      authorPersona: 'Marketing Manager',
      attachments: ['receipt.pdf']
    }
    
    const post = await createPost(postData)
    
    // Verify post creation
    expect(post.id).toBeDefined()
    expect(post.content).toBe(postData.content)
    expect(post.attachments).toEqual(['receipt.pdf'])
    expect(suggestsFinancialActivity(post.content)).toBe(true)
    
    // Update post with transaction
    const updatedPost = await updatePost(post.id, {
      transactionId: 'trans_123'
    })
    
    expect(updatedPost.transactionId).toBe('trans_123')
    
    // Retrieve post
    const retrievedPost = getPost(post.id)
    expect(retrievedPost?.transactionId).toBe('trans_123')
  })
  
  it('should handle multiple posts with proper sorting', async () => {
    const { createPost, posts } = usePosts()
    
    // Create posts with slight delays to ensure different timestamps
    const post1 = await createPost({
      content: 'First post',
      authorId: 'user1',
      authorPersona: 'Manager'
    })
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 10))
    
    const post2 = await createPost({
      content: 'Second post',
      authorId: 'user1', 
      authorPersona: 'Manager'
    })
    
    // Verify posts are sorted by creation date (newest first)
    expect(posts.value.length).toBe(2)
    expect(posts.value[0].id).toBe(post2.id) // Newest first
    expect(posts.value[1].id).toBe(post1.id) // Older second
  })
  
  it('should validate financial content detection', () => {
    const { suggestsFinancialActivity } = usePosts()
    
    const financialPhrases = [
      'paid $100',
      'received invoice',
      'expense report',
      'revenue increased',
      'cost analysis',
      'bill payment',
      'purchase order',
      'sale completed',
      'deposit made',
      'withdrawal processed',
      'transfer funds',
      'payment received',
      'money transfer',
      'cash flow',
      'credit card',
      'debit account'
    ]
    
    const nonFinancialPhrases = [
      'meeting scheduled',
      'project update',
      'team lunch',
      'client call',
      'presentation ready',
      'deadline approaching'
    ]
    
    financialPhrases.forEach(phrase => {
      expect(suggestsFinancialActivity(phrase)).toBe(true)
    })
    
    nonFinancialPhrases.forEach(phrase => {
      expect(suggestsFinancialActivity(phrase)).toBe(false)
    })
  })
})