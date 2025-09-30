#!/usr/bin/env node

/**
 * Production Readiness Check Script
 * Validates that the application is ready for production deployment
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class ProductionChecker {
  constructor() {
    this.checks = []
    this.warnings = []
    this.errors = []
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = {
      info: '✓',
      warn: '⚠',
      error: '✗'
    }[type]
    
    console.log(`${prefix} [${timestamp}] ${message}`)
    
    if (type === 'warn') this.warnings.push(message)
    if (type === 'error') this.errors.push(message)
  }

  async checkFileExists(filePath, required = true) {
    const exists = fs.existsSync(filePath)
    if (exists) {
      this.log(`File exists: ${filePath}`)
    } else {
      const message = `Missing file: ${filePath}`
      this.log(message, required ? 'error' : 'warn')
    }
    return exists
  }

  async checkPackageJson() {
    this.log('Checking package.json configuration...')
    
    const packagePath = path.join(process.cwd(), 'package.json')
    if (!await this.checkFileExists(packagePath)) return false
    
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
    
    // Check required fields
    const requiredFields = ['name', 'version', 'description', 'scripts']
    for (const field of requiredFields) {
      if (!packageJson[field]) {
        this.log(`Missing required field in package.json: ${field}`, 'error')
      }
    }
    
    // Check required scripts
    const requiredScripts = ['build', 'start', 'test']
    for (const script of requiredScripts) {
      if (!packageJson.scripts[script]) {
        this.log(`Missing required script in package.json: ${script}`, 'error')
      }
    }
    
    // Check for production dependencies
    const prodDeps = packageJson.dependencies || {}
    const devDeps = packageJson.devDependencies || {}
    
    // Warn about dev dependencies that might be needed in production
    const potentialProdDeps = ['vue', 'vue-router', 'drizzle-orm', 'better-sqlite3', 'hono']
    for (const dep of potentialProdDeps) {
      if (devDeps[dep] && !prodDeps[dep]) {
        this.log(`Dependency ${dep} is in devDependencies but might be needed in production`, 'warn')
      }
    }
    
    return true
  }

  async checkEnvironmentFiles() {
    this.log('Checking environment configuration...')
    
    await this.checkFileExists('.env.example')
    
    // Check for production environment variables
    const envExample = fs.existsSync('.env.example') 
      ? fs.readFileSync('.env.example', 'utf8') 
      : ''
    
    const requiredEnvVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'PORT'
    ]
    
    for (const envVar of requiredEnvVars) {
      if (!envExample.includes(envVar)) {
        this.log(`Missing environment variable example: ${envVar}`, 'warn')
      }
    }
  }

  async checkBuildConfiguration() {
    this.log('Checking build configuration...')
    
    // Check Vite config
    const viteConfigExists = await this.checkFileExists('vite.config.ts')
    if (viteConfigExists) {
      const viteConfig = fs.readFileSync('vite.config.ts', 'utf8')
      
      // Check for production optimizations
      if (!viteConfig.includes('minify')) {
        this.log('Vite config missing minification settings', 'warn')
      }
      
      if (!viteConfig.includes('rollupOptions')) {
        this.log('Vite config missing bundle optimization settings', 'warn')
      }
    }
    
    // Check TypeScript config
    const tsConfigExists = await this.checkFileExists('tsconfig.json')
    if (tsConfigExists) {
      const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'))
      
      if (!tsConfig.compilerOptions?.strict) {
        this.log('TypeScript strict mode not enabled', 'warn')
      }
    }
  }

  async checkDatabaseConfiguration() {
    this.log('Checking database configuration...')
    
    // Check database files
    await this.checkFileExists('src/db/schema.ts')
    await this.checkFileExists('src/db/connection.ts')
    await this.checkFileExists('drizzle.config.ts')
    
    // Check migrations directory
    const migrationsDir = 'src/db/migrations'
    if (fs.existsSync(migrationsDir)) {
      const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))
      if (migrations.length === 0) {
        this.log('No database migrations found', 'warn')
      } else {
        this.log(`Found ${migrations.length} database migrations`)
      }
    }
  }

  async checkSecurityConfiguration() {
    this.log('Checking security configuration...')
    
    // Check for security utilities
    await this.checkFileExists('src/utils/securityMonitor.ts')
    
    // Check API server for security middleware
    const serverPath = 'src/api/server.ts'
    if (fs.existsSync(serverPath)) {
      const serverCode = fs.readFileSync(serverPath, 'utf8')
      
      const securityFeatures = [
        'cors',
        'rateLimit',
        'sanitize',
        'helmet',
        'xss',
        'csrf'
      ]
      
      for (const feature of securityFeatures) {
        if (serverCode.toLowerCase().includes(feature.toLowerCase())) {
          this.log(`Security feature found: ${feature}`)
        } else {
          this.log(`Security feature missing: ${feature}`, 'warn')
        }
      }
    }
  }

  async checkTestCoverage() {
    this.log('Checking test configuration...')
    
    // Check for test files
    const testDir = 'src/tests'
    if (fs.existsSync(testDir)) {
      const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.test.ts'))
      this.log(`Found ${testFiles.length} test files`)
      
      if (testFiles.length === 0) {
        this.log('No test files found', 'error')
      }
    } else {
      this.log('Test directory not found', 'error')
    }
    
    // Check for test configuration
    await this.checkFileExists('vitest.config.ts')
  }

  async runTests() {
    this.log('Running test suite...')
    
    try {
      execSync('npm run test:run', { stdio: 'pipe' })
      this.log('All tests passed')
    } catch (error) {
      this.log('Some tests failed', 'error')
      console.log(error.stdout?.toString())
    }
  }

  async checkBuildProcess() {
    this.log('Testing build process...')
    
    try {
      // Clean previous build
      if (fs.existsSync('dist')) {
        fs.rmSync('dist', { recursive: true })
      }
      
      // Run build
      execSync('npm run build', { stdio: 'pipe' })
      
      // Check build output
      if (fs.existsSync('dist')) {
        const distFiles = fs.readdirSync('dist')
        this.log(`Build successful - ${distFiles.length} files generated`)
        
        // Check for essential files
        const essentialFiles = ['index.html', 'assets']
        for (const file of essentialFiles) {
          if (distFiles.includes(file)) {
            this.log(`Essential build file found: ${file}`)
          } else {
            this.log(`Essential build file missing: ${file}`, 'error')
          }
        }
        
        // Check bundle sizes
        const assetsDir = path.join('dist', 'assets')
        if (fs.existsSync(assetsDir)) {
          const assets = fs.readdirSync(assetsDir)
          const jsFiles = assets.filter(f => f.endsWith('.js'))
          const cssFiles = assets.filter(f => f.endsWith('.css'))
          
          this.log(`Generated ${jsFiles.length} JS files and ${cssFiles.length} CSS files`)
          
          // Check for large bundles
          for (const file of jsFiles) {
            const filePath = path.join(assetsDir, file)
            const stats = fs.statSync(filePath)
            const sizeKB = Math.round(stats.size / 1024)
            
            if (sizeKB > 500) {
              this.log(`Large JS bundle detected: ${file} (${sizeKB}KB)`, 'warn')
            } else {
              this.log(`JS bundle size OK: ${file} (${sizeKB}KB)`)
            }
          }
        }
      } else {
        this.log('Build failed - no dist directory created', 'error')
      }
    } catch (error) {
      this.log('Build process failed', 'error')
      console.log(error.stdout?.toString())
    }
  }

  async checkDocumentation() {
    this.log('Checking documentation...')
    
    const docFiles = ['README.md', 'CHANGELOG.md', 'LICENSE']
    for (const file of docFiles) {
      await this.checkFileExists(file, file === 'README.md')
    }
    
    // Check README content
    if (fs.existsSync('README.md')) {
      const readme = fs.readFileSync('README.md', 'utf8')
      const requiredSections = ['installation', 'usage', 'development']
      
      for (const section of requiredSections) {
        if (readme.toLowerCase().includes(section)) {
          this.log(`README section found: ${section}`)
        } else {
          this.log(`README section missing: ${section}`, 'warn')
        }
      }
    }
  }

  async checkPerformance() {
    this.log('Checking performance configuration...')
    
    // Check for performance utilities
    await this.checkFileExists('src/utils/performance.ts')
    
    // Check for lazy loading
    const srcFiles = this.getAllFiles('src', '.vue', '.ts')
    let lazyLoadingFound = false
    
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8')
      if (content.includes('defineAsyncComponent') || content.includes('lazy')) {
        lazyLoadingFound = true
        break
      }
    }
    
    if (lazyLoadingFound) {
      this.log('Lazy loading implementation found')
    } else {
      this.log('No lazy loading implementation found', 'warn')
    }
  }

  getAllFiles(dir, ...extensions) {
    const files = []
    
    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir)
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          traverse(fullPath)
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath)
        }
      }
    }
    
    traverse(dir)
    return files
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: this.checks.length,
        warnings: this.warnings.length,
        errors: this.errors.length,
        status: this.errors.length === 0 ? 'READY' : 'NOT_READY'
      },
      warnings: this.warnings,
      errors: this.errors,
      recommendations: this.generateRecommendations()
    }
    
    // Write report to file
    fs.writeFileSync('production-readiness-report.json', JSON.stringify(report, null, 2))
    
    return report
  }

  generateRecommendations() {
    const recommendations = []
    
    if (this.errors.length > 0) {
      recommendations.push('Fix all errors before deploying to production')
    }
    
    if (this.warnings.length > 5) {
      recommendations.push('Address warnings to improve production readiness')
    }
    
    recommendations.push('Run performance tests under production load')
    recommendations.push('Set up monitoring and alerting for production environment')
    recommendations.push('Configure automated backups for production database')
    recommendations.push('Set up CI/CD pipeline for automated deployments')
    
    return recommendations
  }

  async runAllChecks() {
    this.log('Starting production readiness check...')
    
    await this.checkPackageJson()
    await this.checkEnvironmentFiles()
    await this.checkBuildConfiguration()
    await this.checkDatabaseConfiguration()
    await this.checkSecurityConfiguration()
    await this.checkTestCoverage()
    await this.checkDocumentation()
    await this.checkPerformance()
    
    // Run tests and build (optional, can be skipped with --skip-build flag)
    if (!process.argv.includes('--skip-tests')) {
      await this.runTests()
    }
    
    if (!process.argv.includes('--skip-build')) {
      await this.checkBuildProcess()
    }
    
    const report = await this.generateReport()
    
    this.log('\n=== PRODUCTION READINESS REPORT ===')
    this.log(`Status: ${report.summary.status}`)
    this.log(`Warnings: ${report.summary.warnings}`)
    this.log(`Errors: ${report.summary.errors}`)
    
    if (report.summary.errors > 0) {
      this.log('\nErrors that must be fixed:')
      report.errors.forEach(error => this.log(`  - ${error}`, 'error'))
    }
    
    if (report.summary.warnings > 0) {
      this.log('\nWarnings to consider:')
      report.warnings.forEach(warning => this.log(`  - ${warning}`, 'warn'))
    }
    
    this.log('\nRecommendations:')
    report.recommendations.forEach(rec => this.log(`  - ${rec}`))
    
    this.log(`\nDetailed report saved to: production-readiness-report.json`)
    
    // Exit with error code if not ready
    if (report.summary.status !== 'READY') {
      process.exit(1)
    }
  }
}

// Run the checker
if (require.main === module) {
  const checker = new ProductionChecker()
  checker.runAllChecks().catch(error => {
    console.error('Production check failed:', error)
    process.exit(1)
  })
}

module.exports = ProductionChecker