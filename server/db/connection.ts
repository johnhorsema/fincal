import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

// Database configuration
const DB_PATH = process.env.DATABASE_URL || './database.sqlite'
const MIGRATIONS_FOLDER = './src/db/migrations'

// Ensure database directory exists
const dbDir = dirname(DB_PATH)
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true })
}

// Create database connection
let sqlite: Database.Database
let db: ReturnType<typeof drizzle>

try {
  sqlite = new Database(DB_PATH)
  
  // Enable foreign key constraints
  sqlite.pragma('foreign_keys = ON')
  
  // Enable WAL mode for better performance
  sqlite.pragma('journal_mode = WAL')
  
  // Set busy timeout for concurrent access
  sqlite.pragma('busy_timeout = 5000')
  
  // Create drizzle instance
  db = drizzle(sqlite, { schema })
  
  console.log(`Database connection established successfully at ${DB_PATH}`)
} catch (error) {
  console.error('Failed to connect to database:', error)
  throw error
}

// Migration function
export async function runMigrations() {
  try {
    console.log('Starting database migrations...')
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
    console.log('Database migrations completed successfully')
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }
}

// Initialize database with migrations
export async function initializeDatabase(seedData = false) {
  try {
    console.log('Initializing database...')
    await runMigrations()
    
    // Seed default accounts if requested
    if (seedData) {
      const { seedAccounts } = await import('./seedAccounts')
      await seedAccounts()
    }
    
    // Verify database structure
    const tables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all()
    
    console.log('Database tables:', tables.map((t: any) => t.name).join(', '))
    return true
  } catch (error) {
    console.error('Database initialization failed:', error)
    return false
  }
}

// Graceful shutdown
export function closeDatabase() {
  try {
    sqlite.close()
    console.log('Database connection closed')
  } catch (error) {
    console.error('Error closing database:', error)
  }
}

// Health check function
export function checkDatabaseHealth(): boolean {
  try {
    const result = sqlite.prepare('SELECT 1 as health').get() as { health: number } | undefined
    return Boolean(result && result.health === 1)
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

export { db, sqlite }
export default db