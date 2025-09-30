import { ref, computed } from 'vue'
import { apiClient, ApiError } from '../api/client'
import type { User, UserPersona } from '../types'

export function useUsers() {
  const usersList = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Computed properties
  const activeUsers = computed(() => 
    usersList.value.filter((user: User) => user.personas && user.personas.length > 0)
  )

  // CRUD Operations
  async function fetchUsers() {
    loading.value = true
    error.value = null
    
    try {
      const fetchedUsers = await apiClient.getUsers()
      usersList.value = fetchedUsers

      return fetchedUsers
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch users'
      error.value = errorMessage
      console.error('Error fetching users:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchUser(id: string) {
    loading.value = true
    error.value = null

    try {
      const user = await apiClient.getUser(id)
      
      // Update local state if user exists
      const existingIndex = usersList.value.findIndex((u: User) => u.id === id)
      if (existingIndex !== -1) {
        usersList.value[existingIndex] = user
      } else {
        usersList.value.push(user)
      }

      return user
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to fetch user'
      error.value = errorMessage
      console.error('Error fetching user:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createUser(userData: Omit<User, 'id'>) {
    loading.value = true
    error.value = null

    try {
      const newUser = await apiClient.createUser(userData)

      // Add to local state
      usersList.value.push(newUser)

      return newUser
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to create user'
      error.value = errorMessage
      console.error('Error creating user:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateUser(id: string, updates: Partial<Omit<User, 'id'>>) {
    loading.value = true
    error.value = null

    try {
      const updatedUser = await apiClient.updateUser(id, updates)

      // Update local state
      const index = usersList.value.findIndex((u: User) => u.id === id)
      if (index !== -1) {
        usersList.value[index] = updatedUser
      }

      return updatedUser
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to update user'
      error.value = errorMessage
      console.error('Error updating user:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteUser(id: string) {
    loading.value = true
    error.value = null

    try {
      await apiClient.deleteUser(id)
      
      // Remove from local state
      usersList.value = usersList.value.filter((u: User) => u.id !== id)
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to delete user'
      error.value = errorMessage
      console.error('Error deleting user:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Persona management
  async function addUserPersona(userId: string, persona: Omit<UserPersona, 'id'>) {
    loading.value = true
    error.value = null

    try {
      const newPersona = await apiClient.addUserPersona(userId, persona)

      // Update local state
      const userIndex = usersList.value.findIndex((u: User) => u.id === userId)
      if (userIndex !== -1) {
        if (!usersList.value[userIndex].personas) {
          usersList.value[userIndex].personas = []
        }
        usersList.value[userIndex].personas.push(newPersona)
      }

      return newPersona
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to add persona'
      error.value = errorMessage
      console.error('Error adding persona:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function removeUserPersona(userId: string, personaId: string) {
    loading.value = true
    error.value = null

    try {
      await apiClient.removeUserPersona(userId, personaId)

      // Update local state
      const userIndex = usersList.value.findIndex((u: User) => u.id === userId)
      if (userIndex !== -1 && usersList.value[userIndex].personas) {
        usersList.value[userIndex].personas = usersList.value[userIndex].personas.filter(
          (p: UserPersona) => p.id !== personaId
        )
      }
    } catch (err) {
      const errorMessage = err instanceof ApiError ? err.message : 'Failed to remove persona'
      error.value = errorMessage
      console.error('Error removing persona:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Utility functions
  function getUser(id: string) {
    return usersList.value.find((u: User) => u.id === id)
  }

  function getUserPersonas(userId: string): UserPersona[] {
    const user = getUser(userId)
    return user?.personas || []
  }

  function getUserPersona(userId: string, personaId: string): UserPersona | undefined {
    const personas = getUserPersonas(userId)
    return personas.find((p: UserPersona) => p.id === personaId)
  }

  function searchUsers(query: string) {
    if (!query.trim()) return usersList.value

    const searchTerm = query.toLowerCase()
    return usersList.value.filter((user: User) =>
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      user.personas.some((persona: UserPersona) => 
        persona.name.toLowerCase().includes(searchTerm) ||
        persona.role.toLowerCase().includes(searchTerm)
      )
    )
  }

  // Clear error
  function clearError() {
    error.value = null
  }

  return {
    // State
    usersList,
    loading,
    error,
    
    // Computed
    activeUsers,
    
    // Methods
    fetchUsers,
    fetchUser,
    createUser,
    updateUser,
    deleteUser,
    addUserPersona,
    removeUserPersona,
    getUser,
    getUserPersonas,
    getUserPersona,
    searchUsers,
    clearError
  }
}