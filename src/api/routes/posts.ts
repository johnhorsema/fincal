import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db, posts, users, eq, desc, and } from '../../db'
import { validateAndSanitizePost, generateId } from '../../utils/validation'
import type { Post } from '../../types'

const postsRouter = new Hono()

// GET /api/posts - Get all posts
postsRouter.get('/', async (c) => {
  try {
    const result = await db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        authorPersona: posts.authorPersona,
        createdAt: posts.createdAt,
        attachments: posts.attachments,
        transactionId: posts.transactionId,
        authorName: users.name,
        authorEmail: users.email
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .orderBy(desc(posts.createdAt))

    const formattedPosts = result.map(row => ({
      id: row.id,
      content: row.content,
      authorId: row.authorId,
      authorPersona: row.authorPersona,
      createdAt: new Date(row.createdAt),
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
      transactionId: row.transactionId || undefined,
      author: {
        name: row.authorName,
        email: row.authorEmail
      }
    }))

    return c.json({
      data: formattedPosts,
      count: formattedPosts.length
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    throw new HTTPException(500, { message: 'Failed to fetch posts' })
  }
})

// GET /api/posts/:id - Get a single post
postsRouter.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const result = await db
      .select({
        id: posts.id,
        content: posts.content,
        authorId: posts.authorId,
        authorPersona: posts.authorPersona,
        createdAt: posts.createdAt,
        attachments: posts.attachments,
        transactionId: posts.transactionId,
        authorName: users.name,
        authorEmail: users.email
      })
      .from(posts)
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new HTTPException(404, { message: 'Post not found' })
    }

    const row = result[0]
    const post = {
      id: row.id,
      content: row.content,
      authorId: row.authorId,
      authorPersona: row.authorPersona,
      createdAt: new Date(row.createdAt),
      attachments: row.attachments ? JSON.parse(row.attachments) : [],
      transactionId: row.transactionId || undefined,
      author: {
        name: row.authorName,
        email: row.authorEmail
      }
    }

    return c.json({ data: post })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error fetching post:', error)
    throw new HTTPException(500, { message: 'Failed to fetch post' })
  }
})

// POST /api/posts - Create a new post
postsRouter.post('/', async (c) => {
  try {
    // Get sanitized body from middleware or parse JSON
    let body = c.get('sanitizedBody')
    if (!body) {
      body = await c.req.json()
    }
    
    // Validate and sanitize input
    const validation = validateAndSanitizePost(body)
    if (!validation.isValid) {
      throw new HTTPException(400, { 
        message: 'Validation failed',
        cause: {
          errors: validation.errors,
          details: validation.errors.reduce((acc, error, index) => {
            acc[`error_${index}`] = error
            return acc
          }, {} as Record<string, string>)
        }
      })
    }

    const sanitizedData = validation.sanitized!

    // Verify user exists
    const userExists = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, sanitizedData.authorId!))
      .limit(1)

    if (userExists.length === 0) {
      throw new HTTPException(400, { 
        message: 'Invalid author ID',
        cause: 'The specified author does not exist'
      })
    }

    const postId = generateId()
    const now = Date.now()

    const newPost = {
      id: postId,
      content: sanitizedData.content!,
      authorId: sanitizedData.authorId!,
      authorPersona: sanitizedData.authorPersona!,
      createdAt: now,
      attachments: sanitizedData.attachments ? JSON.stringify(sanitizedData.attachments) : null,
      transactionId: null
    }

    await db.insert(posts).values(newPost)

    // Return the created post
    const createdPost = {
      id: postId,
      content: newPost.content,
      authorId: newPost.authorId,
      authorPersona: newPost.authorPersona,
      createdAt: new Date(now),
      attachments: sanitizedData.attachments || [],
      transactionId: undefined
    }

    return c.json({ data: createdPost }, 201)
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error creating post:', error)
    throw new HTTPException(500, { 
      message: 'Failed to create post',
      cause: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// PUT /api/posts/:id - Update a post
postsRouter.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    // Validate ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new HTTPException(400, { 
        message: 'Invalid post ID format',
        cause: 'Post ID must be a valid UUID'
      })
    }

    // Get sanitized body
    let body = c.get('sanitizedBody')
    if (!body) {
      body = await c.req.json()
    }

    // Check if post exists
    const existingPost = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1)

    if (existingPost.length === 0) {
      throw new HTTPException(404, { message: 'Post not found' })
    }

    // Validate and sanitize updates
    const updates: any = {}
    const errors: string[] = []

    if (body.content !== undefined) {
      if (typeof body.content !== 'string') {
        errors.push('Content must be a string')
      } else {
        const sanitizedContent = body.content.trim()
        if (sanitizedContent.length === 0) {
          errors.push('Content cannot be empty')
        } else if (sanitizedContent.length > 500) {
          errors.push('Content cannot exceed 500 characters')
        } else {
          updates.content = sanitizedContent
        }
      }
    }

    if (body.attachments !== undefined) {
      if (!Array.isArray(body.attachments)) {
        errors.push('Attachments must be an array')
      } else {
        const sanitizedAttachments = body.attachments.filter((att: any) => 
          typeof att === 'string' && att.trim().length > 0
        )
        updates.attachments = JSON.stringify(sanitizedAttachments)
      }
    }

    if (body.transactionId !== undefined) {
      if (body.transactionId !== null && typeof body.transactionId !== 'string') {
        errors.push('Transaction ID must be a string or null')
      } else if (body.transactionId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.transactionId)) {
        errors.push('Invalid transaction ID format')
      } else {
        updates.transactionId = body.transactionId
      }
    }

    if (errors.length > 0) {
      throw new HTTPException(400, { 
        message: 'Validation failed',
        cause: {
          errors,
          details: errors.reduce((acc, error, index) => {
            acc[`error_${index}`] = error
            return acc
          }, {} as Record<string, string>)
        }
      })
    }

    if (Object.keys(updates).length === 0) {
      throw new HTTPException(400, { 
        message: 'No valid updates provided',
        cause: 'At least one field must be provided for update'
      })
    }

    await db
      .update(posts)
      .set(updates)
      .where(eq(posts.id, id))

    // Return updated post
    const updatedPost = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1)

    const post = updatedPost[0]
    return c.json({
      data: {
        id: post.id,
        content: post.content,
        authorId: post.authorId,
        authorPersona: post.authorPersona,
        createdAt: new Date(post.createdAt),
        attachments: post.attachments ? JSON.parse(post.attachments) : [],
        transactionId: post.transactionId || undefined
      }
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error updating post:', error)
    throw new HTTPException(500, { 
      message: 'Failed to update post',
      cause: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// DELETE /api/posts/:id - Delete a post
postsRouter.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')

    // Check if post exists
    const existingPost = await db
      .select()
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1)

    if (existingPost.length === 0) {
      throw new HTTPException(404, { message: 'Post not found' })
    }

    // Check if post has associated transaction
    if (existingPost[0].transactionId) {
      throw new HTTPException(400, { 
        message: 'Cannot delete post with associated transaction. Delete the transaction first.' 
      })
    }

    await db.delete(posts).where(eq(posts.id, id))

    return c.json({ message: 'Post deleted successfully' })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error deleting post:', error)
    throw new HTTPException(500, { message: 'Failed to delete post' })
  }
})

// GET /api/posts/:id/suggest-financial - Check if post suggests financial activity
postsRouter.get('/:id/suggest-financial', async (c) => {
  try {
    const id = c.req.param('id')
    
    const result = await db
      .select({ content: posts.content })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1)

    if (result.length === 0) {
      throw new HTTPException(404, { message: 'Post not found' })
    }

    const content = result[0].content.toLowerCase()
    const financialKeywords = [
      'paid', 'received', 'invoice', 'expense', 'revenue', 'cost', 'bill',
      'purchase', 'sale', 'deposit', 'withdrawal', 'transfer', 'payment',
      '$', '€', '£', 'USD', 'EUR', 'GBP', 'money', 'cash', 'credit', 'debit'
    ]
    
    const suggestsFinancial = financialKeywords.some(keyword => 
      content.includes(keyword)
    )

    return c.json({
      data: {
        postId: id,
        suggestsFinancial,
        matchedKeywords: financialKeywords.filter(keyword => content.includes(keyword))
      }
    })
  } catch (error) {
    if (error instanceof HTTPException) throw error
    console.error('Error checking financial suggestion:', error)
    throw new HTTPException(500, { message: 'Failed to check financial suggestion' })
  }
})

export { postsRouter }