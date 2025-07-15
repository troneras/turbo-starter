# CMS Platform API

A high-performance REST API built with Fastify for multi-brand translation management.

## Features

- 🚀 **Fast**: Built with Fastify for maximum performance
- 🔒 **Secure**: JWT authentication, rate limiting, and security headers
- 📝 **Documented**: Auto-generated OpenAPI/Swagger documentation
- 🗄️ **Type-safe**: Full TypeScript support with Drizzle ORM
- 🎯 **Structured**: Clean architecture with separation of concerns
- 📊 **Observable**: Structured logging with Pino
- 🔄 **Background Jobs**: Worker process for async operations

## Project Structure

```
src/
├── server.ts              # Server startup/bootstrap
├── app.ts                 # Fastify instance creation, plugin registration
├── worker.ts              # Background jobs processor
├── plugins/
│   ├── external/          # Infrastructure plugins
│   │   ├── db.ts         # PostgreSQL + Drizzle ORM
│   │   ├── redis.ts      # Redis connection
│   │   ├── env.ts        # Environment configuration
│   │   ├── auth.ts       # JWT authentication
│   │   ├── security.ts   # Security plugins (helmet, cors, rate-limit)
│   │   └── swagger.ts    # API documentation
│   └── app/              # Business logic plugins
├── routes/
│   ├── api/              # API endpoints
│   ├── webhooks/         # Webhook endpoints
│   ├── health/           # Health check endpoints
│   └── home.ts           # Welcome route
└── lib/
    ├── config.ts         # Configuration schema
    ├── logger.ts         # Logger setup
    └── utils.ts          # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL
- Redis
- Bun package manager

### Installation

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
```

### Development

```bash
# Run in development mode with hot reload
bun run dev

# The API will be available at http://localhost:3000
# Swagger documentation at http://localhost:3000/documentation
```

### Production

```bash
# Build the application
bun run build

# Start the server
bun run start

# Start the worker (in a separate process)
node dist/worker.js
```

## API Endpoints

### Health Checks

- `GET /health/liveness` - Check if the app is running
- `GET /health/readiness` - Check if the app is ready to serve traffic

### Authentication

- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - Logout (invalidate token)

### Brands

- `GET /api/brands` - List all brands
- `GET /api/brands/:id` - Get brand by ID
- `POST /api/brands` - Create new brand
- `PUT /api/brands/:id` - Update brand
- `DELETE /api/brands/:id` - Delete brand

### Translations

- `GET /api/translations` - List translations with filters
- `GET /api/translations/:id` - Get translation by ID
- `POST /api/translations` - Create new translation
- `PUT /api/translations/:id` - Update translation
- `POST /api/translations/bulk` - Bulk import translations

### Releases

- `GET /api/releases` - List releases
- `GET /api/releases/:id` - Get release details
- `POST /api/releases` - Create new release
- `POST /api/releases/:id/deploy` - Deploy release
- `POST /api/releases/:id/rollback` - Rollback release

## Environment Variables

```bash
# Node environment
NODE_ENV=development

# Server configuration
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cms_platform

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3001

# Rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

## Testing

```bash
# Run tests
bun test

# Run tests in watch mode
bun test:watch
```

## Type Checking

```bash
# Check types
bun run check-types
```

## License

MIT
