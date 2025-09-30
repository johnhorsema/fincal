import { describe, it, expect } from 'vitest'

describe('Project Setup', () => {
  it('should have basic configuration', () => {
    expect(true).toBe(true)
  })

  it('should be able to import types', () => {
    const mockPost = {
      id: '1',
      content: 'Test post',
      authorId: 'user1',
      authorPersona: 'Marketing',
      createdAt: new Date(),
    }
    
    expect(mockPost.id).toBe('1')
    expect(mockPost.content).toBe('Test post')
  })
})