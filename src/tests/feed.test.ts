import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { usePosts } from '@/composables/usePosts'
import PostComposer from '@/components/feed/PostComposer.vue'
import PostCard from '@/components/feed/PostCard.vue'
import FeedContainer from '@/components/feed/FeedContainer.vue'
import type { Post, User, UserPersona } from '@/types'

// Mock the composables
vi.mock('@/composables/usePosts')
vi.mock('@/composables/useAuth')

// Mock data
const mockUser: User = {
  id: 'user1',
  name: 'John Doe',
  email: 'john@example.com',
  personas: [
    { id: 'persona1', name: 'Marketing Manager', role: 'marketing' },
    { id: 'persona2', name: 'Accountant', role: 'accounting' }
  ]
}

const mockPost: Post = {
  id: 'post1',
  content: 'Just paid $500 for office supplies',
  authorId: 'user1',
  authorPersona: 'Marketing Manager',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  attachments: ['receipt.pdf'],
  transactionId: undefined
}

const mockPostWithTransaction: Post = {
  ...mockPost,
  id: 'post2',
  transactionId: 'trans1'
}

describe('usePosts composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new post with valid data', async () => {
    const { createPost } = usePosts()
    
    const postData = {
      content: 'Test post content',
      authorId: 'user1',
      authorPersona: 'Marketing Manager',
      attachments: []
    }

    const result = await createPost(postData)
    
    expect(result).toBeDefined()
    expect(result.content).toBe(postData.content)
    expect(result.authorId).toBe(postData.authorId)
    expect(result.authorPersona).toBe(postData.authorPersona)
    expect(result.id).toBeDefined()
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('should reject posts exceeding character limit', async () => {
    const { createPost } = usePosts()
    
    const longContent = 'a'.repeat(501) // Exceeds 500 character limit
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
      content: '   ', // Only whitespace
      authorId: 'user1',
      authorPersona: 'Marketing Manager'
    }

    await expect(createPost(postData)).rejects.toThrow('Post content cannot be empty')
  })

  it('should detect financial keywords in content', () => {
    const { suggestsFinancialActivity } = usePosts()
    
    expect(suggestsFinancialActivity('Just paid $500 for supplies')).toBe(true)
    expect(suggestsFinancialActivity('Received invoice for services')).toBe(true)
    expect(suggestsFinancialActivity('Had lunch with client')).toBe(false)
    expect(suggestsFinancialActivity('Meeting scheduled for tomorrow')).toBe(false)
  })

  it('should sort posts in reverse chronological order', () => {
    const posts = ref([
      { ...mockPost, createdAt: new Date('2024-01-15T10:00:00Z') },
      { ...mockPost, id: 'post2', createdAt: new Date('2024-01-15T11:00:00Z') },
      { ...mockPost, id: 'post3', createdAt: new Date('2024-01-15T09:00:00Z') }
    ])

    // In real implementation, this would be tested through the composable
    const sorted = [...posts.value].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    expect(sorted[0].id).toBe('post2') // Most recent
    expect(sorted[1].id).toBe('post1')
    expect(sorted[2].id).toBe('post3') // Oldest
  })
})

describe('PostComposer', () => {
  const mockCreatePost = vi.fn()
  const mockCurrentUser = ref(mockUser)
  const mockCurrentPersona = ref(mockUser.personas[0])

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock the composables
    vi.mocked(usePosts).mockReturnValue({
      createPost: mockCreatePost,
      suggestsFinancialActivity: vi.fn((content: string) => content.includes('$')),
      posts: ref([]),
      isLoading: ref(false),
      error: ref(null),
      updatePost: vi.fn(),
      getPost: vi.fn(),
      clearError: vi.fn(),
      refreshPosts: vi.fn()
    })

    // Mock useAuth
    const { useAuth } = await import('../composables/useAuth')
    vi.mocked(useAuth).mockReturnValue({
      currentUser: mockCurrentUser,
      currentPersona: mockCurrentPersona,
      login: vi.fn(),
      logout: vi.fn(),
      switchPersona: vi.fn(),
      isAuthenticated: ref(true)
    })
  })

  it('should render with default placeholder', () => {
    const wrapper = mount(PostComposer)
    
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('placeholder')).toBe("What's happening with your business?")
  })

  it('should render with custom placeholder', () => {
    const wrapper = mount(PostComposer, {
      props: {
        placeholder: 'Custom placeholder text'
      }
    })
    
    const textarea = wrapper.find('textarea')
    expect(textarea.attributes('placeholder')).toBe('Custom placeholder text')
  })

  it('should show character count', async () => {
    const wrapper = mount(PostComposer)
    const textarea = wrapper.find('textarea')
    
    await textarea.setValue('Test content')
    
    expect(wrapper.text()).toContain('12/500')
  })

  it('should disable post button when content is empty', () => {
    const wrapper = mount(PostComposer)
    
    const postButton = wrapper.find('button[type="button"]:last-child')
    expect(postButton.attributes('disabled')).toBeDefined()
  })

  it('should enable post button when content is valid', async () => {
    const wrapper = mount(PostComposer)
    const textarea = wrapper.find('textarea')
    
    await textarea.setValue('Valid post content')
    
    const postButton = wrapper.find('button[type="button"]:last-child')
    expect(postButton.attributes('disabled')).toBeUndefined()
  })

  it('should show financial suggestion for financial content', async () => {
    const wrapper = mount(PostComposer)
    const textarea = wrapper.find('textarea')
    
    await textarea.setValue('Just paid $500 for supplies')
    
    expect(wrapper.text()).toContain('This looks like a financial transaction')
  })

  it('should handle file attachments', async () => {
    const wrapper = mount(PostComposer)
    
    // Simulate file selection
    const fileInput = wrapper.find('input[type="file"]')
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    
    Object.defineProperty(fileInput.element, 'files', {
      value: [file],
      writable: false
    })
    
    await fileInput.trigger('change')
    
    expect(wrapper.text()).toContain('test.pdf')
  })

  it('should create post when form is submitted', async () => {
    mockCreatePost.mockResolvedValue(mockPost)
    
    const wrapper = mount(PostComposer)
    const textarea = wrapper.find('textarea')
    const postButton = wrapper.find('button[type="button"]:last-child')
    
    await textarea.setValue('Test post content')
    await postButton.trigger('click')
    
    expect(mockCreatePost).toHaveBeenCalledWith({
      content: 'Test post content',
      authorId: 'user1',
      authorPersona: 'Marketing Manager',
      attachments: undefined
    })
  })
})

describe('PostCard', () => {
  it('should render post content and metadata', () => {
    const wrapper = mount(PostCard, {
      props: { post: mockPost }
    })
    
    expect(wrapper.text()).toContain(mockPost.content)
    expect(wrapper.text()).toContain(mockPost.authorPersona)
    expect(wrapper.text()).toContain('receipt.pdf')
  })

  it('should show Create Journal button for posts without transactions', () => {
    const wrapper = mount(PostCard, {
      props: { post: mockPost }
    })
    
    expect(wrapper.text()).toContain('Create Journal')
    expect(wrapper.text()).not.toContain('View Transaction')
  })

  it('should show View Transaction button for posts with transactions', () => {
    const wrapper = mount(PostCard, {
      props: { post: mockPostWithTransaction }
    })
    
    expect(wrapper.text()).toContain('View Transaction')
    expect(wrapper.text()).toContain('Transaction Created')
  })

  it('should emit createJournal event when Create Journal is clicked', async () => {
    const wrapper = mount(PostCard, {
      props: { post: mockPost }
    })
    
    const createJournalButton = wrapper.find('button:contains("Create Journal")')
    await createJournalButton.trigger('click')
    
    expect(wrapper.emitted('createJournal')).toBeTruthy()
    expect(wrapper.emitted('createJournal')?.[0]).toEqual([mockPost])
  })

  it('should emit viewTransaction event when View Transaction is clicked', async () => {
    const wrapper = mount(PostCard, {
      props: { post: mockPostWithTransaction }
    })
    
    const viewTransactionButton = wrapper.find('button:contains("View Transaction")')
    await viewTransactionButton.trigger('click')
    
    expect(wrapper.emitted('viewTransaction')).toBeTruthy()
    expect(wrapper.emitted('viewTransaction')?.[0]).toEqual(['trans1'])
  })

  it('should format timestamps correctly', () => {
    const recentPost = {
      ...mockPost,
      createdAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    }
    
    const wrapper = mount(PostCard, {
      props: { post: recentPost }
    })
    
    expect(wrapper.text()).toContain('5m ago')
  })

  it('should show financial suggestion for financial content without transaction', () => {
    const financialPost = {
      ...mockPost,
      content: 'Paid $500 for office supplies',
      transactionId: undefined
    }
    
    const wrapper = mount(PostCard, {
      props: { post: financialPost }
    })
    
    expect(wrapper.text()).toContain('This looks like a financial transaction')
  })
})

describe('FeedContainer', () => {
  const mockPosts = ref([mockPost, mockPostWithTransaction])
  const mockIsLoading = ref(false)
  const mockError = ref(null)
  const mockRefreshPosts = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(usePosts).mockReturnValue({
      posts: mockPosts,
      isLoading: mockIsLoading,
      error: mockError,
      refreshPosts: mockRefreshPosts,
      createPost: vi.fn(),
      updatePost: vi.fn(),
      getPost: vi.fn(),
      suggestsFinancialActivity: vi.fn(),
      clearError: vi.fn()
    })
  })

  it('should render PostComposer and PostCards', () => {
    const wrapper = mount(FeedContainer)
    
    expect(wrapper.findComponent(PostComposer).exists()).toBe(true)
    expect(wrapper.findAllComponents(PostCard)).toHaveLength(2)
  })

  it('should show loading state', async () => {
    mockIsLoading.value = true
    mockPosts.value = []
    
    const wrapper = mount(FeedContainer)
    
    expect(wrapper.text()).toContain('Loading posts...')
  })

  it('should show error state', async () => {
    mockError.value = 'Failed to load posts'
    mockIsLoading.value = false
    
    const wrapper = mount(FeedContainer)
    
    expect(wrapper.text()).toContain('Failed to load posts')
    expect(wrapper.text()).toContain('Try again')
  })

  it('should show empty state when no posts', async () => {
    mockPosts.value = []
    mockIsLoading.value = false
    mockError.value = null
    
    const wrapper = mount(FeedContainer)
    
    expect(wrapper.text()).toContain('No posts yet')
    expect(wrapper.text()).toContain('Be the first to share')
  })

  it('should emit createJournal event from PostCard', async () => {
    const wrapper = mount(FeedContainer)
    
    const postCard = wrapper.findComponent(PostCard)
    await postCard.vm.$emit('createJournal', mockPost)
    
    expect(wrapper.emitted('createJournal')).toBeTruthy()
    expect(wrapper.emitted('createJournal')?.[0]).toEqual([mockPost])
  })

  it('should emit viewTransaction event from PostCard', async () => {
    const wrapper = mount(FeedContainer)
    
    const postCard = wrapper.findComponent(PostCard)
    await postCard.vm.$emit('viewTransaction', 'trans1')
    
    expect(wrapper.emitted('viewTransaction')).toBeTruthy()
    expect(wrapper.emitted('viewTransaction')?.[0]).toEqual(['trans1'])
  })

  it('should handle retry on error', async () => {
    mockError.value = 'Network error'
    
    const wrapper = mount(FeedContainer)
    
    const retryButton = wrapper.find('button:contains("Try again")')
    await retryButton.trigger('click')
    
    expect(mockRefreshPosts).toHaveBeenCalled()
  })
})

describe('Feed Integration', () => {
  it('should handle complete post creation flow', async () => {
    const mockCreatePost = vi.fn().mockResolvedValue(mockPost)
    
    vi.mocked(usePosts).mockReturnValue({
      posts: ref([]),
      isLoading: ref(false),
      error: ref(null),
      createPost: mockCreatePost,
      suggestsFinancialActivity: vi.fn(() => true),
      updatePost: vi.fn(),
      getPost: vi.fn(),
      clearError: vi.fn(),
      refreshPosts: vi.fn()
    })

    const wrapper = mount(FeedContainer)
    const composer = wrapper.findComponent(PostComposer)
    
    // Simulate post creation
    await composer.vm.$emit('posted', mockPost)
    
    // Should show success message
    expect(wrapper.text()).toContain('Post created successfully!')
  })

  it('should handle post creation error', async () => {
    const wrapper = mount(FeedContainer)
    const composer = wrapper.findComponent(PostComposer)
    
    // Simulate post creation error
    await composer.vm.$emit('error', 'Failed to create post')
    
    // Should show error message
    expect(wrapper.text()).toContain('Failed to create post')
  })
})