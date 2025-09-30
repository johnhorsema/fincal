import { describe, it, expect } from 'vitest'
import { usePosts } from '../src/composables/usePosts'

describe('Feed Core Functionality', () => {
  it('should create posts with proper validation', async () => {
    const { createPost, suggestsFinancialActivity } = usePosts()
    
    // Test post creation
    const postData = {
      content: 'Just paid $500 for office supplies',
      authorId: 'user1',
      authorPersona: 'Marketing Manager'
    }
    
    const post = await createPost(postData)
    
    expect(post.id).toBeDefined()
    expect(post.content).toBe(postData.content)
    expect(post.authorId).toBe(postData.authorId)
    expect(post.authorPersona).toBe(postData.authorPersona)
    expect(post.createdAt).toBeInstanceOf(Date)
  })
  
  it('should detect financial content', () => {
    const { suggestsFinancialActivity } = usePosts()
    
    expect(suggestsFinancialActivity('Just paid $500 for supplies')).toBe(true)
    expect(suggestsFinancialActivity('Received invoice for services')).toBe(true)
    expect(suggestsFinancialActivity('Had lunch with client')).toBe(false)
  })
  
  it('should validate post length', async () => {
    const { createPost } = usePosts()
    
    const longContent = 'a'.repeat(501)
    const postData = {
      content: longContent,
      authorId: 'user1',
      authorPersona: 'Marketing Manager'
    }
    
    await expect(createPost(postData)).rejects.toThrow('Post content cannot exceed 500 characters')
  })
  
  it('should reject empty posts', async () => {
    const { createPost } = usePosts()
    
    const postData = {
      content: '   ',
      authorId: 'user1',
      authorPersona: 'Marketing Manager'
    }
    
    await expect(createPost(postData)).rejects.toThrow('Post content cannot be empty')
  })
})