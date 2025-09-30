import { ref, computed, watch } from 'vue'
import type { User, UserPersona } from '../types'
import { apiClient } from '../api/client'

// Global auth state
const currentUser = ref<User | null>(null)
const currentPersona = ref<UserPersona | null>(null)
const isAuthenticated = computed(() => currentUser.value !== null)

// Storage keys
const USER_STORAGE_KEY = 'social-accounting-current-user'
const PERSONA_STORAGE_KEY = 'social-accounting-current-persona'

/**
 * Authentication composable for managing user state and persona switching
 */
export function useAuth() {
  
  /**
   * Initialize auth state from localStorage
   */
  async function initializeAuth() {
    try {
      // Try to restore user from localStorage
      const storedUserId = localStorage.getItem(USER_STORAGE_KEY)
      const storedPersonaId = localStorage.getItem(PERSONA_STORAGE_KEY)
      
      if (storedUserId) {
        const user = await getUserById(storedUserId)
        if (user) {
          currentUser.value = user
          
          // Restore persona if available
          if (storedPersonaId) {
            const persona = user.personas.find(p => p.id === storedPersonaId)
            if (persona) {
              currentPersona.value = persona
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to initialize auth:', error)
      // Clear invalid stored data
      localStorage.removeItem(USER_STORAGE_KEY)
      localStorage.removeItem(PERSONA_STORAGE_KEY)
    }
  }
  
  /**
   * Mock login function - in a real app this would validate credentials
   */
  async function login(email: string): Promise<boolean> {
    try {
      const user = await getUserByEmail(email)
      if (user) {
        currentUser.value = user
        
        // Auto-select first persona if available
        if (user.personas.length > 0) {
          currentPersona.value = user.personas[0]
        }
        
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }
  
  /**
   * Logout function
   */
  function logout() {
    currentUser.value = null
    currentPersona.value = null
    localStorage.removeItem(USER_STORAGE_KEY)
    localStorage.removeItem(PERSONA_STORAGE_KEY)
  }
  
  /**
   * Switch to a different persona
   */
  function switchPersona(persona: UserPersona) {
    if (!currentUser.value) {
      throw new Error('No user is currently logged in')
    }
    
    // Verify persona belongs to current user
    const userPersona = currentUser.value.personas.find(p => p.id === persona.id)
    if (!userPersona) {
      throw new Error('Persona does not belong to current user')
    }
    
    currentPersona.value = persona
  }
  
  /**
   * Get user by ID from API
   */
  async function getUserById(id: string): Promise<User | null> {
    try {
      const user = await apiClient.request(`/users/${id}`)
      return user
    } catch (error) {
      console.error('Failed to get user by ID:', error)
      return null
    }
  }
  
  /**
   * Get user by email from API
   */
  async function getUserByEmail(email: string): Promise<User | null> {
    try {
      const users = await apiClient.getUsers()
      return users.find((user: User) => user.email === email) || null
    } catch (error) {
      console.error('Failed to get user by email:', error)
      return null
    }
  }
  
  /**
   * Create a new user (for demo purposes)
   */
  async function createUser(userData: { name: string; email: string; personas: UserPersona[] }): Promise<User | null> {
    try {
      const user = await apiClient.createUser(userData)
      return user
    } catch (error) {
      console.error('Failed to create user:', error)
      return null
    }
  }
  
  /**
   * Get all available users (for demo login)
   */
  async function getAllUsers(): Promise<User[]> {
    try {
      return await apiClient.getUsers()
    } catch (error) {
      console.error('Failed to get all users:', error)
      return []
    }
  }
  
  // Watch for changes and persist to localStorage
  watch(currentUser, (user) => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, user.id)
    } else {
      localStorage.removeItem(USER_STORAGE_KEY)
    }
  })
  
  watch(currentPersona, (persona) => {
    if (persona) {
      localStorage.setItem(PERSONA_STORAGE_KEY, persona.id)
    } else {
      localStorage.removeItem(PERSONA_STORAGE_KEY)
    }
  })
  
  return {
    // State
    currentUser: computed(() => currentUser.value),
    currentPersona: computed(() => currentPersona.value),
    isAuthenticated,
    
    // Actions
    initializeAuth,
    login,
    logout,
    switchPersona,
    createUser,
    getAllUsers,
    getUserById,
    getUserByEmail
  }
}