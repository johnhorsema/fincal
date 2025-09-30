import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db, users, posts, transactions, eq, desc, count } from '../../db'
import { generateId } from '../../utils/validation'
import type { User, UserPersona } from '../../types'

const usersRouter = new Hono()

// GET /api/users - Get all users
usersRouter.get('/', async (c) => {
  try {
    const result = await db
      .select()
      .from(users)
      .orderBy(users.name)

    const formattedUsers = result.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      personas: user.personas ? JSON.parse(user.personas) : []
    }))

    return c.json({
      data: formattedUsers,
      count: formattedUsers.length
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    throw new HTTPException(500, { message: 'Failed to fetch users' })
  }
})

// GET /api/users/:id - Get a single user
usersRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    const user = result[0]
    
    // Get user statistics
    const postsResult = await db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.authorId, id))

    const transactionsResult = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.createdBy, id))

    const postsCount = postsResult[0]?.count || 0
    const transactionsCount = transactionsResult[0]?.count || 0

    return c.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        personas: user.personas ? JSON.parse(user.personas) : [],
        stats: {
          postsCount,
          transactionsCount
        }
      }
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error fetching user:', error)
    throw new HTTPException(500, { message: 'Failed to fetch user' })
  }
})

// POST /api/users - Create a new user
usersRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()
    
    // Validate required fields
    const validation = validateUser(body)
    if (!validation.isValid) {
      throw new HTTPException(400, { 
        message: 'Validation failed',
        cause: validation.errors.join(', ')
      })
    }

    // Check for duplicate email
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1)

    if (existing.length > 0) {
      throw new HTTPException(400, { message: 'Email already exists' })
    }

    const userId = generateId()
    const now = Date.now()

    // Validate personas if provided
    let personas: UserPersona[] = []
    if (body.personas && Array.isArray(body.personas)) {
      personas = body.personas.map((persona: any) => ({
        id: persona.id || generateId(),
        name: persona.name,
        role: persona.role,
        avatar: persona.avatar || undefined
      }))
    }

    const newUser = {
      id: userId,
      name: body.name.trim(),
      email: body.email.toLowerCase().trim(),
      personas: personas.length > 0 ? JSON.stringify(personas) : null,
      createdAt: now
    }

    await db.insert(users).values(newUser)

    return c.json({
      data: {
        id: userId,
        name: newUser.name,
        email: newUser.email,
        personas: personas
      }
    }, 201)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error creating user:', error)
    throw new HTTPException(500, { message: 'Failed to create user' })
  }
})

// PUT /api/users/:id - Update a user
usersRouter.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (existingUser.length === 0) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // Validate updates
    const updates: any = {}
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        throw new HTTPException(400, { message: 'Name cannot be empty' })
      }
      updates.name = body.name.trim()
    }

    if (body.email !== undefined) {
      if (!isValidEmail(body.email)) {
        throw new HTTPException(400, { message: 'Invalid email format' })
      }
      
      // Check for duplicate email (excluding current user)
      const duplicate = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email.toLowerCase().trim()))
        .limit(1)

      if (duplicate.length > 0 && duplicate[0].id !== id) {
        throw new HTTPException(400, { message: 'Email already exists' })
      }
      
      updates.email = body.email.toLowerCase().trim()
    }

    if (body.personas !== undefined) {
      if (Array.isArray(body.personas)) {
        const personas = body.personas.map((persona: any) => ({
          id: persona.id || generateId(),
          name: persona.name,
          role: persona.role,
          avatar: persona.avatar || undefined
        }))
        updates.personas = JSON.stringify(personas)
      } else {
        updates.personas = null
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new HTTPException(400, { message: 'No valid updates provided' })
    }

    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))

    // Return updated user
    const updatedUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    const user = updatedUser[0]
    return c.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        personas: user.personas ? JSON.parse(user.personas) : []
      }
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error updating user:', error)
    throw new HTTPException(500, { message: 'Failed to update user' })
  }
})

// POST /api/users/:id/personas - Add a persona to a user
usersRouter.post('/:id/personas', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (existingUser.length === 0) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // Validate persona data
    if (!body.name || !body.role) {
      throw new HTTPException(400, { message: 'Persona name and role are required' })
    }

    const user = existingUser[0]
    const currentPersonas: UserPersona[] = user.personas ? JSON.parse(user.personas) : []

    // Check for duplicate persona name
    if (currentPersonas.some(p => p.name === body.name)) {
      throw new HTTPException(400, { message: 'Persona name already exists for this user' })
    }

    const newPersona: UserPersona = {
      id: generateId(),
      name: body.name,
      role: body.role,
      avatar: body.avatar || undefined
    }

    const updatedPersonas = [...currentPersonas, newPersona]

    await db
      .update(users)
      .set({ personas: JSON.stringify(updatedPersonas) })
      .where(eq(users.id, id))

    return c.json({
      data: newPersona,
      message: 'Persona added successfully'
    }, 201)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error adding persona:', error)
    throw new HTTPException(500, { message: 'Failed to add persona' })
  }
})

// DELETE /api/users/:id/personas/:personaId - Remove a persona from a user
usersRouter.delete('/:id/personas/:personaId', async (c) => {
  try {
    const id = c.req.param('id')
    const personaId = c.req.param('personaId')

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (existingUser.length === 0) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    const user = existingUser[0]
    const currentPersonas: UserPersona[] = user.personas ? JSON.parse(user.personas) : []

    // Find and remove the persona
    const personaIndex = currentPersonas.findIndex(p => p.id === personaId)
    if (personaIndex === -1) {
      throw new HTTPException(404, { message: 'Persona not found' })
    }

    const updatedPersonas = currentPersonas.filter(p => p.id !== personaId)

    await db
      .update(users)
      .set({ personas: JSON.stringify(updatedPersonas) })
      .where(eq(users.id, id))

    return c.json({ message: 'Persona removed successfully' })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error removing persona:', error)
    throw new HTTPException(500, { message: 'Failed to remove persona' })
  }
})

// DELETE /api/users/:id - Delete a user
usersRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (existingUser.length === 0) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // Check if user has posts or transactions
    const postsResult = await db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.authorId, id))

    const transactionsResult = await db
      .select({ count: count() })
      .from(transactions)
      .where(eq(transactions.createdBy, id))

    const postsCount = postsResult[0]?.count || 0
    const transactionsCount = transactionsResult[0]?.count || 0

    if (postsCount > 0 || transactionsCount > 0) {
      throw new HTTPException(400, { 
        message: `Cannot delete user. They have ${postsCount} post(s) and ${transactionsCount} transaction(s).` 
      })
    }

    await db.delete(users).where(eq(users.id, id))

    return c.json({ message: 'User deleted successfully' })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error deleting user:', error)
    throw new HTTPException(500, { message: 'Failed to delete user' })
  }
})

// Validation functions
function validateUser(user: any) {
  const errors: string[] = []

  if (!user.name?.trim()) {
    errors.push('Name is required')
  }

  if (!user.email?.trim()) {
    errors.push('Email is required')
  } else if (!isValidEmail(user.email)) {
    errors.push('Invalid email format')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export { usersRouter }