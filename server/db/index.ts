// Database exports
export { db, sqlite, runMigrations, initializeDatabase, checkDatabaseHealth, closeDatabase } from './connection'
export * from './schema'
export * from './utils'

// Re-export commonly used Drizzle functions
export { eq, and, or, not, isNull, isNotNull, desc, asc, like, ilike } from 'drizzle-orm'