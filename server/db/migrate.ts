#!/usr/bin/env node

/**
 * Database migration runner script
 * Usage: node src/db/migrate.ts [command]
 * Commands:
 *   - migrate: Run pending migrations
 *   - seed: Seed database with initial data
 *   - reset: Clear database and run migrations
 *   - stats: Show database statistics
 */

import { initializeDatabase, seedDatabase, clearDatabase, getDatabaseStats, closeDatabase } from './index'

async function main() {
  const command = process.argv[2] || 'migrate'
  
  try {
    switch (command) {
      case 'migrate':
        console.log('Running database migrations...')
        await initializeDatabase()
        break
        
      case 'seed':
        console.log('Seeding database...')
        await initializeDatabase()
        await seedDatabase()
        break
        
      case 'reset':
        console.log('Resetting database...')
        await clearDatabase()
        await initializeDatabase()
        await seedDatabase()
        break
        
      case 'stats':
        console.log('Database statistics:')
        const stats = await getDatabaseStats()
        console.table(stats)
        break
        
      default:
        console.error(`Unknown command: ${command}`)
        console.log('Available commands: migrate, seed, reset, stats')
        process.exit(1)
    }
    
    console.log(`Command '${command}' completed successfully`)
  } catch (error) {
    console.error(`Command '${command}' failed:`, error)
    process.exit(1)
  } finally {
    closeDatabase()
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { main }