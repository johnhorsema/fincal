import { ref, computed } from 'vue'
import { apiClient, ApiError } from '../api/client'
import type { Post } from '../types'

export function usePosts() {
  const posts = ref<Post[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Computed property for posts in reverse chronological order
  const sortedPosts = computed(() => {
    return [...posts.value].sort((a: Post, b: Post) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  })

  // Fetch all posts
  const fetchPosts = async () => {
    try {
      isLoading.value = true
      error.value = null

      const fetchedPosts = await apiClient.getPosts()
      posts.value = fetchedPosts

      return fetchedPosts
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch posts'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Create a new post
  const createPost = async (postData: {
    content: string
    authorId: string
    authorPersona: string
    attachments?: string[]
  }) => {
    try {
      isLoading.value = true
      error.value = null

      const newPost = await apiClient.createPost(postData)
      
      // Add to local state
      posts.value.unshift(newPost)

      return newPost
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to create post'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Update a post (for linking transactions)
  const updatePost = async (postId: string, updates: Partial<Post>) => {
    try {
      isLoading.value = true
      error.value = null

      const updatedPost = await apiClient.updatePost(postId, updates)
      
      // Update local state
      const postIndex = posts.value.findIndex((p: Post) => p.id === postId)
      if (postIndex !== -1) {
        posts.value[postIndex] = updatedPost
      }

      return updatedPost
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update post'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Delete a post
  const deletePost = async (postId: string) => {
    try {
      isLoading.value = true
      error.value = null

      await apiClient.deletePost(postId)
      
      // Remove from local state
      posts.value = posts.value.filter(p => p.id !== postId)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete post'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get a single post by ID
  const getPost = (postId: string) => {
    return posts.value.find((p: Post) => p.id === postId)
  }

  // Fetch a single post from API
  const fetchPost = async (postId: string) => {
    try {
      isLoading.value = true
      error.value = null

      const post = await apiClient.getPost(postId)
      
      // Update local state if post exists
      const existingIndex = posts.value.findIndex(p => p.id === postId)
      if (existingIndex !== -1) {
        posts.value[existingIndex] = post
      } else {
        posts.value.push(post)
      }

      return post
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch post'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Check if post content suggests financial activity
  const suggestsFinancialActivity = async (postId: string): Promise<boolean> => {
    try {
      const suggestion = await apiClient.checkPostFinancialSuggestion(postId)
      return suggestion.suggestsFinancial
    } catch (err) {
      console.warn('Failed to check financial suggestion:', err)
      // Fallback to local check
      const post = getPost(postId)
      if (post) {
        return suggestsFinancialActivityLocal(post.content)
      }
      return false
    }
  }

  // Local financial activity check (fallback)
  const suggestsFinancialActivityLocal = (content: string): boolean => {
    const financialKeywords = [
      'paid', 'received', 'invoice', 'expense', 'revenue', 'cost', 'bill',
      'purchase', 'sale', 'deposit', 'withdrawal', 'transfer', 'payment',
      '$', '€', '£', 'USD', 'EUR', 'GBP', 'money', 'cash', 'credit', 'debit'
    ]
    
    const lowerContent = content.toLowerCase()
    return financialKeywords.some(keyword => lowerContent.includes(keyword))
  }

  // Clear error
  const clearError = () => {
    error.value = null
  }

  // Refresh posts
  const refreshPosts = async () => {
    return fetchPosts()
  }

  return {
    posts: sortedPosts,
    isLoading,
    error,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    getPost,
    fetchPost,
    suggestsFinancialActivity,
    suggestsFinancialActivityLocal,
    clearError,
    refreshPosts
  }
}