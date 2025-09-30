import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db, accounts, transactionEntries, eq, and, like, desc, count } from '../../db'
import { generateId } from '../../../src/utils/validation'
import type { Account } from '../../../src/types'

const accountsRouter = new Hono()

// Account types and categories
const ACCOUNT_TYPES = {
  asset: 'Assets',
  liability: 'Liabilities', 
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses'
} as const

const ACCOUNT_CATEGORIES = {
  asset: ['Current Assets', 'Fixed Assets', 'Investments'],
  liability: ['Current Liabilities', 'Long-term Liabilities'],
  equity: ['Owner\'s Equity', 'Retained Earnings'],
  revenue: ['Sales Revenue', 'Service Revenue', 'Other Income'],
  expense: ['Operating Expenses', 'Cost of Goods Sold', 'Administrative Expenses']
} as const

// GET /api/accounts - Get all accounts
accountsRouter.get('/', async (c) => {
  try {
    const type = c.req.query('type')
    const active = c.req.query('active')
    const search = c.req.query('search')
    
    let query = db.select().from(accounts)
    
    // Apply filters
    const conditions = []
    if (type && type in ACCOUNT_TYPES) {
      conditions.push(eq(accounts.type, type))
    }
    if (active !== undefined) {
      conditions.push(eq(accounts.isActive, active === 'true'))
    }
    if (search) {
      conditions.push(like(accounts.name, `%${search}%`))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const result = await query.orderBy(accounts.type, accounts.name)

    const formattedAccounts = result.map(account => ({
      id: account.id,
      name: account.name,
      type: account.type,
      category: account.category,
      isActive: account.isActive
    }))

    // Group by type if requested
    const groupBy = c.req.query('groupBy')
    if (groupBy === 'type') {
      const grouped = formattedAccounts.reduce((acc, account) => {
        if (!acc[account.type]) {
          acc[account.type] = []
        }
        acc[account.type].push(account)
        return acc
      }, {} as Record<string, Account[]>)

      return c.json({
        data: grouped,
        count: formattedAccounts.length
      })
    }

    return c.json({
      data: formattedAccounts,
      count: formattedAccounts.length
    })
  } catch (error) {
    console.error('Error fetching accounts:', error)
    throw new HTTPException(500, { message: 'Failed to fetch accounts' })
  }
})

// GET /api/accounts/types - Get account types and categories
accountsRouter.get('/types', (c) => {
  return c.json({
    data: {
      types: ACCOUNT_TYPES,
      categories: ACCOUNT_CATEGORIES
    }
  })
})

// GET /api/accounts/:id - Get a single account
accountsRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const result = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new HTTPException(404, { message: 'Account not found' })
    }

    const account = result[0]
    
    // Get usage count (number of transaction entries)
    const usageResult = await db
      .select({ count: count() })
      .from(transactionEntries)
      .where(eq(transactionEntries.accountId, id))

    const usageCount = usageResult[0]?.count || 0

    return c.json({
      data: {
        id: account.id,
        name: account.name,
        type: account.type,
        category: account.category,
        isActive: account.isActive,
        usageCount
      }
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error fetching account:', error)
    throw new HTTPException(500, { message: 'Failed to fetch account' })
  }
})

// POST /api/accounts - Create a new account
accountsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()
    
    // Validate required fields
    const validation = validateAccount(body)
    if (!validation.isValid) {
      throw new HTTPException(400, { 
        message: 'Validation failed',
        cause: validation.errors.join(', ')
      })
    }

    // Check for duplicate name within the same type
    const existing = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.name, body.name),
        eq(accounts.type, body.type)
      ))
      .limit(1)

    if (existing.length > 0) {
      throw new HTTPException(400, { 
        message: `Account "${body.name}" already exists in ${ACCOUNT_TYPES[body.type as keyof typeof ACCOUNT_TYPES]}` 
      })
    }

    const accountId = generateId()
    const now = Date.now()

    const newAccount = {
      id: accountId,
      name: body.name.trim(),
      type: body.type,
      category: body.category,
      isActive: body.isActive !== undefined ? body.isActive : true,
      createdAt: now
    }

    await db.insert(accounts).values(newAccount)

    return c.json({
      data: {
        id: accountId,
        name: newAccount.name,
        type: newAccount.type,
        category: newAccount.category,
        isActive: newAccount.isActive
      }
    }, 201)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error creating account:', error)
    throw new HTTPException(500, { message: 'Failed to create account' })
  }
})

// PUT /api/accounts/:id - Update an account
accountsRouter.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    // Check if account exists
    const existingAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1)

    if (existingAccount.length === 0) {
      throw new HTTPException(404, { message: 'Account not found' })
    }

    // Validate updates
    const updates: any = {}
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        throw new HTTPException(400, { message: 'Account name cannot be empty' })
      }
      updates.name = body.name.trim()
    }

    if (body.type !== undefined) {
      if (!(body.type in ACCOUNT_TYPES)) {
        throw new HTTPException(400, { message: 'Invalid account type' })
      }
      updates.type = body.type
    }

    if (body.category !== undefined) {
      if (typeof body.category !== 'string' || body.category.trim().length === 0) {
        throw new HTTPException(400, { message: 'Account category cannot be empty' })
      }
      updates.category = body.category
    }

    if (body.isActive !== undefined) {
      updates.isActive = Boolean(body.isActive)
    }

    if (Object.keys(updates).length === 0) {
      throw new HTTPException(400, { message: 'No valid updates provided' })
    }

    // Check for duplicate name if name or type is being updated
    if (updates.name || updates.type) {
      const name = updates.name || existingAccount[0].name
      const type = updates.type || existingAccount[0].type

      const duplicate = await db
        .select()
        .from(accounts)
        .where(and(
          eq(accounts.name, name),
          eq(accounts.type, type),
          eq(accounts.id, id) // Exclude current account
        ))
        .limit(1)

      if (duplicate.length > 0) {
        throw new HTTPException(400, { 
          message: `Account "${name}" already exists in ${ACCOUNT_TYPES[type as keyof typeof ACCOUNT_TYPES]}` 
        })
      }
    }

    await db
      .update(accounts)
      .set(updates)
      .where(eq(accounts.id, id))

    // Return updated account
    const updatedAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1)

    const account = updatedAccount[0]
    return c.json({
      data: {
        id: account.id,
        name: account.name,
        type: account.type,
        category: account.category,
        isActive: account.isActive
      }
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error updating account:', error)
    throw new HTTPException(500, { message: 'Failed to update account' })
  }
})

// PATCH /api/accounts/:id/toggle - Toggle account active status
accountsRouter.patch('/:id/toggle', async (c) => {
  try {
    const id = c.req.param('id')

    const existingAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1)

    if (existingAccount.length === 0) {
      throw new HTTPException(404, { message: 'Account not found' })
    }

    const newStatus = !existingAccount[0].isActive

    await db
      .update(accounts)
      .set({ isActive: newStatus })
      .where(eq(accounts.id, id))

    return c.json({
      message: `Account ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: newStatus }
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error toggling account status:', error)
    throw new HTTPException(500, { message: 'Failed to toggle account status' })
  }
})

// DELETE /api/accounts/:id - Delete an account
accountsRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    // Check if account exists
    const existingAccount = await db
      .select()
      .from(accounts)
      .where(eq(accounts.id, id))
      .limit(1)

    if (existingAccount.length === 0) {
      throw new HTTPException(404, { message: 'Account not found' })
    }

    // Check if account is used in any transactions
    const usageResult = await db
      .select({ count: count() })
      .from(transactionEntries)
      .where(eq(transactionEntries.accountId, id))

    const usageCount = usageResult[0]?.count || 0

    if (usageCount > 0) {
      throw new HTTPException(400, { 
        message: `Cannot delete account. It is used in ${usageCount} transaction(s). Consider deactivating it instead.` 
      })
    }

    await db.delete(accounts).where(eq(accounts.id, id))

    return c.json({ message: 'Account deleted successfully' })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error deleting account:', error)
    throw new HTTPException(500, { message: 'Failed to delete account' })
  }
})

// Validation function
function validateAccount(account: any) {
  const errors: string[] = []

  if (!account.name?.trim()) {
    errors.push('Account name is required')
  }

  if (!account.type || !(account.type in ACCOUNT_TYPES)) {
    errors.push('Valid account type is required')
  }

  if (!account.category?.trim()) {
    errors.push('Account category is required')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export { accountsRouter }