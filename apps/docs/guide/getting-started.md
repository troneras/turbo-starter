# Getting Started

Welcome to the CMS Platform documentation! This guide will help you get up and running with the platform.

## Overview

The CMS Platform is a modern, enterprise-grade content management system built for multi-brand, multi-jurisdiction operations. It provides:

- **Multi-tenant architecture** supporting multiple brands and jurisdictions
- **Type-safe development** with TypeScript throughout the stack
- **Atomic deployments** with release management and feature flags
- **Real-time collaboration** capabilities
- **Comprehensive RBAC** (Role-Based Access Control)

## Prerequisites

Before you begin, ensure you have the following installed:

- [Bun](https://bun.sh) (latest version)
- [PostgreSQL](https://www.postgresql.org/) (v14 or higher)
- [Redis](https://redis.io/) (v6 or higher)
- [Docker](https://www.docker.com/) (optional, for containerized services)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/cms-platform
   cd cms-platform
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Start services**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations**
   ```bash
   bun run db:migrate
   ```

5. **Start development servers**
   ```bash
   # Start API server (port 3000)
   bun run dev
   
   # In another terminal, start admin UI (port 3001)
   bun run --filter=admin dev
   ```

## Next Steps

- [Project Structure](/guide/project-structure) - Understand the monorepo layout
- [Local Setup](/guide/local-setup) - Detailed development environment setup
- [API Overview](/api/overview) - Learn about the API architecture