# Database Configuration

This directory contains the database configuration, schema, migrations, and utilities for the Social Accounting Feed application.

## Structure

```
src/db/
├── connection.ts       # Database connection and configuration
├── schema.ts          # Drizzle ORM schema definitions
├── utils.ts           # Database utility functions
├── migrate.ts         # Migration runner script
├── index.ts           # Main exports
├── migrations/        # Migration files
│   ├── 0000_initial_schema.sql
│   └── meta/          # Migration metadata
└── README.md          # This file
```

## Database Schema

The application uses SQLite with the following tables:

- **users**: User accounts and personas
- **accounts**: Chart of accounts for double-entry bookkeeping
- **posts**: Social feed entries
- **transactions**: Accounting transactions linked to posts
- **transaction_entries**: Individual debit/credit entries for transactions

## Usage

### Initialize Database
```bash
npm run db:init
```

### Seed with Sample Data
```bash
npm run db:seed
```

### Reset Database (clear and reseed)
```bash
npm run db:reset
```

### View Database Statistics
```bash
npm run db:stats
```

### Generate New Migrations
```bash
npm run db:generate
```

### Run Migrations
```bash
npm run db:migrate
```

### Open Drizzle Studio
```bash
npm run db:studio
```

## Key Features

### Schema Validation
- Foreign key constraints ensure data integrity
- Unique constraints prevent duplicate accounts
- Proper indexing for performance

### Transaction Balance Validation
- Built-in validation ensures debits equal credits
- Utility functions for currency formatting
- Timestamp handling for consistent dates

### Development Utilities
- Database seeding for development/testing
- Statistics and health check functions
- Migration management
- Test utilities

## Environment Variables

- `DATABASE_URL`: Path to SQLite database file (default: `./database.sqlite`)

## Testing

Run database tests:
```bash
npm run test:db
```

The test suite covers:
- Database initialization
- Schema validation
- Transaction balance validation
- Utility functions
- Data seeding and statistics