import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db, transactions, transactionEntries, posts, accounts, users, eq, desc, and } from '../../db'
import { validateTransaction, generateId } from '../../utils/validation'
import type { Transaction, TransactionEntry } from '../../types'

const transactionsRouter = new Hono()

// GET /api/transactions - Get all transactions
transactionsRouter.get('/', async (c) => {
  try {
    const status = c.req.query('status')
    const userId = c.req.query('userId')
    
    let query = db
      .select({
        id: transactions.id,
        postId: transactions.postId,
        description: transactions.description,
        date: transactions.date,
        status: transactions.status,
        createdBy: transactions.createdBy,
        approvedBy: transactions.approvedBy,
        createdAt: transactions.createdAt,
        creatorName: users.name,
        approverName: users.name
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.createdBy, users.id))

    // Apply filters
    const conditions = []
    if (status) {
      conditions.push(eq(transactions.status, status))
    }
    if (userId) {
      conditions.push(eq(transactions.createdBy, userId))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const transactionsResult = await query.orderBy(desc(transactions.createdAt))

    // Get all transaction entries
    const entriesResult = await db
      .select({
        id: transactionEntries.id,
        transactionId: transactionEntries.transactionId,
        accountId: transactionEntries.accountId,
        debitAmount: transactionEntries.debitAmount,
        creditAmount: transactionEntries.creditAmount,
        accountName: accounts.name,
        accountType: accounts.type
      })
      .from(transactionEntries)
      .leftJoin(accounts, eq(transactionEntries.accountId, accounts.id))

    // Group entries by transaction ID
    const entriesByTransaction = entriesResult.reduce((acc, entry) => {
      if (!acc[entry.transactionId]) {
        acc[entry.transactionId] = []
      }
      acc[entry.transactionId].push({
        id: entry.id,
        transactionId: entry.transactionId,
        accountId: entry.accountId,
        debitAmount: entry.debitAmount || undefined,
        creditAmount: entry.creditAmount || undefined,
        account: {
          name: entry.accountName,
          type: entry.accountType
        }
      })
      return acc
    }, {} as Record<string, any[]>)

    const formattedTransactions = transactionsResult.map(row => ({
      id: row.id,
      postId: row.postId,
      description: row.description,
      date: new Date(row.date),
      status: row.status,
      createdBy: row.createdBy,
      approvedBy: row.approvedBy || undefined,
      entries: entriesByTransaction[row.id] || [],
      creator: {
        name: row.creatorName
      }
    }))

    return c.json({
      data: formattedTransactions,
      count: formattedTransactions.length
    })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    throw new HTTPException(500, { message: 'Failed to fetch transactions' })
  }
})

// GET /api/transactions/:id - Get a single transaction
transactionsRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const transactionResult = await db
      .select({
        id: transactions.id,
        postId: transactions.postId,
        description: transactions.description,
        date: transactions.date,
        status: transactions.status,
        createdBy: transactions.createdBy,
        approvedBy: transactions.approvedBy,
        createdAt: transactions.createdAt,
        creatorName: users.name
      })
      .from(transactions)
      .leftJoin(users, eq(transactions.createdBy, users.id))
      .where(eq(transactions.id, id))
      .limit(1)

    if (transactionResult.length === 0) {
      throw new HTTPException(404, { message: 'Transaction not found' })
    }

    // Get transaction entries
    const entriesResult = await db
      .select({
        id: transactionEntries.id,
        transactionId: transactionEntries.transactionId,
        accountId: transactionEntries.accountId,
        debitAmount: transactionEntries.debitAmount,
        creditAmount: transactionEntries.creditAmount,
        accountName: accounts.name,
        accountType: accounts.type
      })
      .from(transactionEntries)
      .leftJoin(accounts, eq(transactionEntries.accountId, accounts.id))
      .where(eq(transactionEntries.transactionId, id))

    const row = transactionResult[0]
    const transaction = {
      id: row.id,
      postId: row.postId,
      description: row.description,
      date: new Date(row.date),
      status: row.status,
      createdBy: row.createdBy,
      approvedBy: row.approvedBy || undefined,
      entries: entriesResult.map(entry => ({
        id: entry.id,
        transactionId: entry.transactionId,
        accountId: entry.accountId,
        debitAmount: entry.debitAmount || undefined,
        creditAmount: entry.creditAmount || undefined,
        account: {
          name: entry.accountName,
          type: entry.accountType
        }
      })),
      creator: {
        name: row.creatorName
      }
    }

    return c.json({ data: transaction })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error fetching transaction:', error)
    throw new HTTPException(500, { message: 'Failed to fetch transaction' })
  }
})

// POST /api/transactions - Create a new transaction
transactionsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json()
    
    // Validate transaction data
    const validation = validateTransaction(body)
    if (!validation.isValid) {
      throw new HTTPException(400, { 
        message: 'Validation failed',
        cause: validation.errors.join(', ')
      })
    }

    // Verify post exists
    const postExists = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.id, body.postId))
      .limit(1)

    if (postExists.length === 0) {
      throw new HTTPException(400, { message: 'Invalid post ID' })
    }

    // Verify user exists
    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, body.createdBy))
      .limit(1)

    if (userExists.length === 0) {
      throw new HTTPException(400, { message: 'Invalid user ID' })
    }

    // Verify all accounts exist
    for (const entry of body.entries) {
      const accountExists = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.id, entry.accountId))
        .limit(1)

      if (accountExists.length === 0) {
        throw new HTTPException(400, { message: `Invalid account ID: ${entry.accountId}` })
      }
    }

    const transactionId = generateId()
    const now = Date.now()

    // Create transaction
    const newTransaction = {
      id: transactionId,
      postId: body.postId,
      description: body.description,
      date: new Date(body.date).getTime(),
      status: body.status || 'pending',
      createdBy: body.createdBy,
      approvedBy: body.approvedBy || null,
      createdAt: now
    }

    await db.insert(transactions).values(newTransaction)

    // Create transaction entries
    const entryInserts = body.entries.map((entry: any) => ({
      id: generateId(),
      transactionId: transactionId,
      accountId: entry.accountId,
      debitAmount: entry.debitAmount || null,
      creditAmount: entry.creditAmount || null,
      createdAt: now
    }))

    if (entryInserts.length > 0) {
      await db.insert(transactionEntries).values(entryInserts)
    }

    // Update the post to link to this transaction
    await db
      .update(posts)
      .set({ transactionId: transactionId })
      .where(eq(posts.id, body.postId))

    // Return the created transaction
    const createdTransaction = {
      id: transactionId,
      postId: body.postId,
      description: body.description,
      date: new Date(body.date),
      status: body.status || 'pending',
      createdBy: body.createdBy,
      approvedBy: body.approvedBy || undefined,
      entries: body.entries.map((entry: any, index: number) => ({
        ...entry,
        id: entryInserts[index].id,
        transactionId: transactionId
      }))
    }

    return c.json({ data: createdTransaction }, 201)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error creating transaction:', error)
    throw new HTTPException(500, { message: 'Failed to create transaction' })
  }
})

// PUT /api/transactions/:id - Update a transaction
transactionsRouter.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    // Check if transaction exists
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1)

    if (existingTransaction.length === 0) {
      throw new HTTPException(404, { message: 'Transaction not found' })
    }

    // Don't allow editing approved transactions
    if (existingTransaction[0].status === 'approved') {
      throw new HTTPException(400, { message: 'Cannot edit approved transactions' })
    }

    const updates: any = {}
    if (body.description !== undefined) updates.description = body.description
    if (body.date !== undefined) updates.date = new Date(body.date).getTime()
    if (body.status !== undefined) updates.status = body.status
    if (body.approvedBy !== undefined) updates.approvedBy = body.approvedBy

    if (Object.keys(updates).length === 0) {
      throw new HTTPException(400, { message: 'No valid updates provided' })
    }

    await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))

    // Return updated transaction
    const updatedTransaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1)

    const transaction = updatedTransaction[0]
    return c.json({
      data: {
        id: transaction.id,
        postId: transaction.postId,
        description: transaction.description,
        date: new Date(transaction.date),
        status: transaction.status,
        createdBy: transaction.createdBy,
        approvedBy: transaction.approvedBy || undefined
      }
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error updating transaction:', error)
    throw new HTTPException(500, { message: 'Failed to update transaction' })
  }
})

// PATCH /api/transactions/:id/approve - Approve a transaction
transactionsRouter.patch('/:id/approve', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json()

    if (!body.approvedBy) {
      throw new HTTPException(400, { message: 'approvedBy is required' })
    }

    // Verify user exists
    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, body.approvedBy))
      .limit(1)

    if (userExists.length === 0) {
      throw new HTTPException(400, { message: 'Invalid approver ID' })
    }

    const result = await db
      .update(transactions)
      .set({ 
        status: 'approved',
        approvedBy: body.approvedBy
      })
      .where(and(
        eq(transactions.id, id),
        eq(transactions.status, 'pending')
      ))

    return c.json({ message: 'Transaction approved successfully' })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error approving transaction:', error)
    throw new HTTPException(500, { message: 'Failed to approve transaction' })
  }
})

// PATCH /api/transactions/:id/reject - Reject a transaction
transactionsRouter.patch('/:id/reject', async (c) => {
  try {
    const id = c.req.param('id')

    await db
      .update(transactions)
      .set({ status: 'rejected' })
      .where(and(
        eq(transactions.id, id),
        eq(transactions.status, 'pending')
      ))

    return c.json({ message: 'Transaction rejected successfully' })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error rejecting transaction:', error)
    throw new HTTPException(500, { message: 'Failed to reject transaction' })
  }
})

// DELETE /api/transactions/:id - Delete a transaction
transactionsRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    // Check if transaction exists
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1)

    if (existingTransaction.length === 0) {
      throw new HTTPException(404, { message: 'Transaction not found' })
    }

    // Don't allow deleting approved transactions
    if (existingTransaction[0].status === 'approved') {
      throw new HTTPException(400, { message: 'Cannot delete approved transactions' })
    }

    // Delete transaction entries first (foreign key constraint)
    await db.delete(transactionEntries).where(eq(transactionEntries.transactionId, id))
    
    // Delete the transaction
    await db.delete(transactions).where(eq(transactions.id, id))
    
    // Unlink from post
    await db
      .update(posts)
      .set({ transactionId: null })
      .where(eq(posts.id, existingTransaction[0].postId))

    return c.json({ message: 'Transaction deleted successfully' })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error deleting transaction:', error)
    throw new HTTPException(500, { message: 'Failed to delete transaction' })
  }
})

export { transactionsRouter }