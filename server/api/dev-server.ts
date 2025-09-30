#!/usr/bin/env node

import { serve } from '@hono/node-server'
import { startServer } from './server'

async function main() {
  try {
    console.log('Starting development API server...')
    
    const { port, fetch } = await startServer()
    
    serve({
      fetch,
      port
    })
    
    console.log(`🚀 API server running at http://localhost:${port}`)
    console.log(`📊 Health check: http://localhost:${port}/health`)
    console.log(`📝 API endpoints: http://localhost:${port}/api/*`)
    
  } catch (error) {
    console.error('Failed to start development server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down API server...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down API server...')
  process.exit(0)
})

main()