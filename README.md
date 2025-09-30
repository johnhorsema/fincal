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