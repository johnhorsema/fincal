# FinCal

A social accounting application. Users can create short text entries in a social feed format and convert these entries into proper double-entry bookkeeping transactions.

## Tech Stack

- **Runtime**: Bun
- **Frontend**: Vue 3 with Composition API
- **Styling**: Tailwind CSS
- **Database**: SQLite with Drizzle ORM
- **Build Tool**: Vite
- **Testing**: Vitest
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Bun >= 1.0.0

### Installation

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build for production
bun run build

# Run tests
bun run test
```

### Database Setup

```bash
# Generate database migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio
```

## Production Deployment

### Quick Start Production Build with Database Seeding

For a complete production setup with database initialization and seeding:

```bash
# 1. Install dependencies
bun install

# 2. Build the application for production
bun run build:prod

# 3. Initialize database and seed with default accounts
bun run db:reset

# 4. Start the production server
bun run start
```

### Step-by-Step Production Setup

#### 1. Environment Configuration

Create a production environment file:

```bash
# Copy the example environment file
cp .env.example .env

# Edit the environment variables for production
# Set NODE_ENV=production
# Configure DATABASE_URL if using external database
# Set PORT for the server (default: 3000)
```

#### 2. Database Preparation

Choose one of the following database setup options:

**Option A: Fresh Database with Seeding (Recommended for new deployments)**
```bash
# Reset database and seed with default accounts
bun run db:reset
```

**Option B: Migrate Existing Database**
```bash
# Run only pending migrations (preserves existing data)
bun run db:migrate
```

**Option C: Seed Database Only**
```bash
# Add default accounts to existing database
bun run db:seed
```

**Option D: Custom Database Operations**
```bash
# Initialize database without seeding
node server/db/migrate.ts migrate

# Seed database with default accounts
node server/db/migrate.ts seed

# View database statistics
node server/db/migrate.ts stats
```

#### 3. Production Build

```bash
# Build with production optimizations
bun run build:prod

# Or use the standard build command
bun run build
```

#### 4. Production Server

```bash
# Start the production server
bun run start

# The server will be available at http://localhost:3000
# Health check: http://localhost:3000/health
# API endpoints: http://localhost:3000/api/*
```

### Production Readiness Check

Before deploying to production, run the comprehensive readiness check:

```bash
# Run full production readiness check
node scripts/production-check.js

# Skip tests and build validation (faster check)
node scripts/production-check.js --skip-tests --skip-build
```

This will validate:
- Package configuration
- Environment setup
- Build configuration
- Database setup
- Security configuration
- Test coverage
- Documentation completeness
- Performance optimizations

### Database Seeding Details

The application includes a comprehensive chart of accounts for double-entry bookkeeping:

**Default Account Categories:**
- **Assets**: Cash, Checking Account, Savings Account, Accounts Receivable, Inventory, Office Equipment, Computer Equipment, Furniture & Fixtures
- **Liabilities**: Accounts Payable, Credit Card Payable, Sales Tax Payable, Payroll Liabilities, Bank Loan
- **Equity**: Owner's Equity, Retained Earnings
- **Revenue**: Sales Revenue, Service Revenue, Interest Income
- **Expenses**: Office Supplies, Rent Expense, Utilities Expense, Marketing Expense, Travel Expense, Professional Services, Insurance Expense, Depreciation Expense

### Monitoring and Maintenance

```bash
# Check database statistics
bun run db:stats

# View database in GUI
bun run db:studio

# Run tests to verify functionality
bun run test:run

# Run integration tests
bun run test:integration
```

### Troubleshooting

**Database Issues:**
- If database is corrupted: `bun run db:reset`
- If migrations fail: Check `server/db/migrations/` directory
- If seeding fails: Ensure database is properly migrated first

**Build Issues:**
- Clear node_modules: `rm -rf node_modules && bun install`
- Clear build cache: `rm -rf dist && bun run build`

**Server Issues:**
- Check port availability (default: 3000)
- Verify environment variables are set
- Check database file permissions

## Project Structure

```
src/
├── components/          # Vue components
├── views/              # Vue route components
├── db/                 # Database schema and connection
├── types/              # TypeScript type definitions
├── tests/              # Test files
└── main.ts             # Application entry point
```

## Features

- Social feed interface for posting business activities
- Convert posts to accounting transactions
- Double-entry bookkeeping validation
- User personas and approval workflows
- Responsive design with Tailwind CSS