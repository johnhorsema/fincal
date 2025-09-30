#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { startServer } from './api/server'

async function main() {
  try {
    console.log('🚀 Starting production server...')
    
    const { port, fetch } = await startServer()
    
    serve({
      fetch,
      port
    })
    
    console.log(`✅ Production server running at http://localhost:${port}`)
    console.log(`📊 Health check: http://localhost:${port}/health`)
    console.log(`📝 API endpoints: http://localhost:${port}/api/*`)
    
    // Log server startup info
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'production'}`)
    console.log(`📦 Process ID: ${process.pid}`)
    console.log(`💾 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`)
    
  } catch (error) {
    console.error('❌ Failed to start production server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`\n📡 Received ${signal}. Shutting down gracefully...`)
  
  // Perform cleanup operations
  console.log('🧹 Cleaning up resources...')
  
  // Close database connections, stop timers, etc.
  // Add any cleanup logic here
  
  console.log('👋 Server shutdown complete')
  process.exit(0)
}

// Register signal handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

main()