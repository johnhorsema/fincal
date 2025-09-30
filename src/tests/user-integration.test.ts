import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '../db/connection'
import { users } from '../db/schema'
import { useAuth } from '../composables/useAuth'
import { eq } from 'drizzle-orm'
import type { User, UserPersona } from '../types'

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

describe('User Management Integration Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    // Clear test data
    await db.delete(users)
  })

  afterEach(async () => {
    // Clean up test data
    await db.delete(users)
  })

  it('should create user with personas and authenticate', async () => {
    const { createUser, login, currentUser, currentPersona } = useAuth()
    
    const testPersonas: UserPersona[] = [
      { id: 'persona-1', name: 'Test Accountant', role: 'accountant' },
      { id: 'persona-2', name: 'Test Marketing', role: 'marketing' }
    ]
    
    // Create user
    const newUser = await createUser({
      name: 'Test User',
      email: 'test@example.com',
      personas: testPersonas
    })
    
    expect(newUser).toBeTruthy()
    expect(newUser?.name).toBe('Test User')
    expect(newUser?.email).toBe('test@example.com')
    expect(newUser?.personas).toHaveLength(2)
    
    // Login with created user
    const loginSuccess = await login('test@example.com')
    expect(loginSuccess).toBe(true)
    
    // Verify authentication state
    expect(currentUser.value).toBeTruthy()
    expect(currentUser.value?.name).toBe('Test User')
    expect(currentPersona.value).toBeTruthy()
    expect(currentPersona.value?.name).toBe('Test Accountant') // First persona auto-selected
  })

  it('should switch personas correctly', async () => {
    const { createUser, login, switchPersona, currentPersona } = useAuth()
    
    const testPersonas: UserPersona[] = [
      { id: 'persona-1', name: 'Accountant', role: 'accountant' },
      { id: 'persona-2', name: 'Marketing', role: 'marketing' },
      { id: 'persona-3', name: 'Sales', role: 'sales' }
    ]
    
    // Create and login user
    await createUser({
      name: 'Multi Persona User',
      email: 'multi@example.com',
      personas: testPersonas
    })
    
    await login('multi@example.com')
    
    // Initial persona should be first one
    expect(currentPersona.value?.name).toBe('Accountant')
    
    // Switch to marketing persona
    switchPersona(testPersonas[1])
    expect(currentPersona.value?.name).toBe('Marketing')
    expect(currentPersona.value?.role).toBe('marketing')
    
    // Switch to sales persona
    switchPersona(testPersonas[2])
    expect(currentPersona.value?.name).toBe('Sales')
    expect(currentPersona.value?.role).toBe('sales')
  })

  it('should handle persona validation correctly', async () => {
    const { createUser, login, switchPersona } = useAuth()
    
    const testPersonas: UserPersona[] = [
      { id: 'persona-1', name: 'Valid Persona', role: 'accountant' }
    ]
    
    // Create and login user
    await createUser({
      name: 'Validation User',
      email: 'validation@example.com',
      personas: testPersonas
    })
    
    await login('validation@example.com')
    
    // Try to switch to invalid persona (not belonging to user)
    const invalidPersona: UserPersona = {
      id: 'invalid-id',
      name: 'Invalid Persona',
      role: 'invalid'
    }
    
    expect(() => switchPersona(invalidPersona)).toThrow('Persona does not belong to current user')
  })

  it('should persist and restore authentication state', async () => {
    const { createUser, login, initializeAuth, currentUser, currentPersona } = useAuth()
    
    const testPersonas: UserPersona[] = [
      { id: 'persona-1', name: 'Persistent Accountant', role: 'accountant' },
      { id: 'persona-2', name: 'Persistent Marketing', role: 'marketing' }
    ]
    
    // Create and login user
    const newUser = await createUser({
      name: 'Persistent User',
      email: 'persistent@example.com',
      personas: testPersonas
    })
    
    await login('persistent@example.com')
    
    // Mock localStorage to return the user and persona IDs
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'social-accounting-current-user') {
        return newUser?.id || null
      }
      if (key === 'social-accounting-current-persona') {
        return testPersonas[0].id
      }
      return null
    })
    
    // Create new auth instance to test restoration
    const { 
      initializeAuth: newInitAuth, 
      currentUser: newCurrentUser, 
      currentPersona: newCurrentPersona 
    } = useAuth()
    
    // Initialize should restore state
    await newInitAuth()
    
    expect(newCurrentUser.value).toBeTruthy()
    expect(newCurrentUser.value?.name).toBe('Persistent User')
    expect(newCurrentPersona.value).toBeTruthy()
    expect(newCurrentPersona.value?.name).toBe('Persistent Accountant')
  })

  it('should handle logout correctly', async () => {
    const { createUser, login, logout, currentUser, currentPersona, isAuthenticated } = useAuth()
    
    // Create and login user
    await createUser({
      name: 'Logout User',
      email: 'logout@example.com',
      personas: [{ id: 'persona-1', name: 'Test', role: 'accountant' }]
    })
    
    await login('logout@example.com')
    
    // Verify logged in
    expect(isAuthenticated.value).toBe(true)
    expect(currentUser.value).toBeTruthy()
    expect(currentPersona.value).toBeTruthy()
    
    // Logout
    logout()
    
    // Verify logged out
    expect(isAuthenticated.value).toBe(false)
    expect(currentUser.value).toBe(null)
    expect(currentPersona.value).toBe(null)
    
    // Verify localStorage cleared
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('social-accounting-current-user')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('social-accounting-current-persona')
  })

  it('should handle database errors gracefully', async () => {
    const { login, getUserByEmail } = useAuth()
    
    // Try to login with non-existent user
    const loginSuccess = await login('nonexistent@example.com')
    expect(loginSuccess).toBe(false)
    
    // Try to get non-existent user
    const user = await getUserByEmail('nonexistent@example.com')
    expect(user).toBe(null)
  })

  it('should validate user data correctly', async () => {
    const { createUser } = useAuth()
    
    // Test with empty personas array
    const userWithNoPersonas = await createUser({
      name: 'No Personas User',
      email: 'nopersonas@example.com',
      personas: []
    })
    
    expect(userWithNoPersonas).toBeTruthy()
    expect(userWithNoPersonas?.personas).toHaveLength(0)
    
    // Test with multiple personas
    const userWithPersonas = await createUser({
      name: 'Multi Personas User',
      email: 'multipersonas@example.com',
      personas: [
        { id: 'p1', name: 'Persona 1', role: 'accountant' },
        { id: 'p2', name: 'Persona 2', role: 'marketing' },
        { id: 'p3', name: 'Persona 3', role: 'sales' }
      ]
    })
    
    expect(userWithPersonas).toBeTruthy()
    expect(userWithPersonas?.personas).toHaveLength(3)
  })
})