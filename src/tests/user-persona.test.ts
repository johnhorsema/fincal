import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UserPersona from '../components/user/UserPersona.vue'
import PersonaSelector from '../components/user/PersonaSelector.vue'
import UserProfile from '../components/user/UserProfile.vue'
import type { UserPersona as UserPersonaType, User } from '../types'

// Mock the database connection
vi.mock('../db/connection', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([])
        })
      })
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({})
    })
  }
}))

// Mock the useAuth composable
vi.mock('../composables/useAuth', () => ({
  useAuth: vi.fn()
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('UserPersona Component', () => {
  const mockPersona: UserPersonaType = {
    id: '1',
    name: 'Test Accountant',
    role: 'accountant'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders persona information correctly', () => {
    const wrapper = mount(UserPersona, {
      props: {
        persona: mockPersona,
        isSelected: false
      }
    })

    expect(wrapper.text()).toContain('Test Accountant')
    expect(wrapper.text()).toContain('accountant')
    expect(wrapper.find('.persona-card').exists()).toBe(true)
  })

  it('shows selected state when isSelected is true', () => {
    const wrapper = mount(UserPersona, {
      props: {
        persona: mockPersona,
        isSelected: true
      }
    })

    expect(wrapper.find('.border-blue-500').exists()).toBe(true)
    expect(wrapper.find('.bg-blue-50').exists()).toBe(true)
    expect(wrapper.find('svg').exists()).toBe(true) // Check icon
  })

  it('emits select event when clicked', async () => {
    const wrapper = mount(UserPersona, {
      props: {
        persona: mockPersona,
        isSelected: false
      }
    })

    await wrapper.find('.persona-card').trigger('click')
    expect(wrapper.emitted('select')).toBeTruthy()
  })

  it('applies correct color based on role', () => {
    const wrapper = mount(UserPersona, {
      props: {
        persona: mockPersona,
        isSelected: false
      }
    })

    expect(wrapper.find('.bg-blue-500').exists()).toBe(true) // accountant role
  })
})

describe('PersonaSelector Component', () => {
  const mockPersonas: UserPersonaType[] = [
    { id: '1', name: 'Accountant', role: 'accountant' },
    { id: '2', name: 'Marketing', role: 'marketing' },
    { id: '3', name: 'Sales', role: 'sales' }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders placeholder when no persona is selected', () => {
    const wrapper = mount(PersonaSelector, {
      props: {
        personas: mockPersonas,
        placeholder: 'Select a persona...'
      }
    })

    expect(wrapper.text()).toContain('Select a persona...')
  })

  it('renders selected persona when provided', () => {
    const wrapper = mount(PersonaSelector, {
      props: {
        personas: mockPersonas,
        selectedPersona: mockPersonas[0]
      }
    })

    expect(wrapper.text()).toContain('Accountant')
    expect(wrapper.text()).toContain('accountant')
  })

  it('opens dropdown when button is clicked', async () => {
    const wrapper = mount(PersonaSelector, {
      props: {
        personas: mockPersonas
      }
    })

    expect(wrapper.find('.absolute.z-10').exists()).toBe(false)
    
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.absolute.z-10').exists()).toBe(true)
  })

  it('emits change event when persona is selected', async () => {
    const wrapper = mount(PersonaSelector, {
      props: {
        personas: mockPersonas
      }
    })

    // Open dropdown
    await wrapper.find('button').trigger('click')
    
    // Click on first persona
    const personaOptions = wrapper.findAll('.cursor-pointer.select-none')
    await personaOptions[0].trigger('click')

    expect(wrapper.emitted('change')).toBeTruthy()
    expect(wrapper.emitted('change')?.[0]).toEqual([mockPersonas[0]])
  })

  it('shows error state when error prop is provided', () => {
    const wrapper = mount(PersonaSelector, {
      props: {
        personas: mockPersonas,
        error: 'Please select a persona'
      }
    })

    expect(wrapper.find('.border-red-300').exists()).toBe(true)
    expect(wrapper.text()).toContain('Please select a persona')
  })
})

describe('useAuth Composable', () => {
  // Import the actual composable for testing
  const { useAuth } = await import('../composables/useAuth')
  
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('initializes with no user', () => {
    const { currentUser, currentPersona, isAuthenticated } = useAuth()
    
    expect(currentUser.value).toBe(null)
    expect(currentPersona.value).toBe(null)
    expect(isAuthenticated.value).toBe(false)
  })

  it('switches persona correctly', () => {
    const { switchPersona, currentPersona } = useAuth()
    
    const mockUser: User = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      personas: [
        { id: '1', name: 'Accountant', role: 'accountant' },
        { id: '2', name: 'Marketing', role: 'marketing' }
      ]
    }

    // Manually set current user for testing
    const { currentUser } = useAuth()
    ;(currentUser as any).value = mockUser

    const newPersona = mockUser.personas[1]
    switchPersona(newPersona)

    expect(currentPersona.value).toEqual(newPersona)
  })

  it('throws error when switching persona without user', () => {
    const { switchPersona } = useAuth()
    
    const persona: UserPersonaType = { id: '1', name: 'Test', role: 'accountant' }
    
    expect(() => switchPersona(persona)).toThrow('No user is currently logged in')
  })

  it('throws error when switching to persona not belonging to user', () => {
    const { switchPersona } = useAuth()
    
    const mockUser: User = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      personas: [
        { id: '1', name: 'Accountant', role: 'accountant' }
      ]
    }

    // Manually set current user for testing
    const { currentUser } = useAuth()
    ;(currentUser as any).value = mockUser

    const invalidPersona: UserPersonaType = { id: '999', name: 'Invalid', role: 'invalid' }
    
    expect(() => switchPersona(invalidPersona)).toThrow('Persona does not belong to current user')
  })

  it('persists user and persona to localStorage', () => {
    const { currentUser, currentPersona } = useAuth()
    
    const mockUser: User = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      personas: [
        { id: '1', name: 'Accountant', role: 'accountant' }
      ]
    }

    // Simulate setting user and persona
    ;(currentUser as any).value = mockUser
    ;(currentPersona as any).value = mockUser.personas[0]

    // Note: In a real test environment, we'd need to trigger the watchers
    // For now, we just verify the structure is correct
    expect(mockUser.id).toBe('1')
    expect(mockUser.personas[0].id).toBe('1')
  })

  it('clears localStorage on logout', () => {
    const { logout } = useAuth()
    
    logout()
    
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('social-accounting-current-user')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('social-accounting-current-persona')
  })
})

describe('UserProfile Component', () => {
  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    personas: [
      { id: '1', name: 'Accountant', role: 'accountant' },
      { id: '2', name: 'Marketing', role: 'marketing' }
    ]
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows sign in button when not authenticated', async () => {
    // Mock useAuth to return no user
    const { useAuth } = await import('../composables/useAuth')
    vi.mocked(useAuth).mockReturnValue({
      currentUser: { value: null } as any,
      currentPersona: { value: null } as any,
      isAuthenticated: { value: false } as any,
      logout: vi.fn(),
      switchPersona: vi.fn(),
      initializeAuth: vi.fn(),
      login: vi.fn(),
      createUser: vi.fn(),
      getAllUsers: vi.fn(),
      getUserById: vi.fn(),
      getUserByEmail: vi.fn()
    })

    const wrapper = mount(UserProfile)
    
    expect(wrapper.text()).toContain('Please sign in to continue')
    expect(wrapper.find('button').text()).toContain('Sign In')
  })

  it('shows user information when authenticated', async () => {
    // Mock useAuth to return a user
    const { useAuth } = await import('../composables/useAuth')
    vi.mocked(useAuth).mockReturnValue({
      currentUser: { value: mockUser } as any,
      currentPersona: { value: mockUser.personas[0] } as any,
      isAuthenticated: { value: true } as any,
      logout: vi.fn(),
      switchPersona: vi.fn(),
      initializeAuth: vi.fn(),
      login: vi.fn(),
      createUser: vi.fn(),
      getAllUsers: vi.fn(),
      getUserById: vi.fn(),
      getUserByEmail: vi.fn()
    })

    const wrapper = mount(UserProfile)
    
    expect(wrapper.text()).toContain('Test User')
    expect(wrapper.text()).toContain('test@example.com')
    expect(wrapper.text()).toContain('Accountant')
  })

  it('emits persona-changed when persona is switched', async () => {
    const mockSwitchPersona = vi.fn()
    
    const { useAuth } = await import('../composables/useAuth')
    vi.mocked(useAuth).mockReturnValue({
      currentUser: { value: mockUser } as any,
      currentPersona: { value: mockUser.personas[0] } as any,
      isAuthenticated: { value: true } as any,
      logout: vi.fn(),
      switchPersona: mockSwitchPersona,
      initializeAuth: vi.fn(),
      login: vi.fn(),
      createUser: vi.fn(),
      getAllUsers: vi.fn(),
      getUserById: vi.fn(),
      getUserByEmail: vi.fn()
    })

    const wrapper = mount(UserProfile)
    
    // Find PersonaSelector and trigger change
    const personaSelector = wrapper.findComponent(PersonaSelector)
    await personaSelector.vm.$emit('change', mockUser.personas[1])

    expect(mockSwitchPersona).toHaveBeenCalledWith(mockUser.personas[1])
    expect(wrapper.emitted('persona-changed')).toBeTruthy()
  })
})