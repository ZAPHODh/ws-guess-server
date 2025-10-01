# WebSocket Server - Loqano

Separate WebSocket backend server for the Loqano guessing game multiplayer functionality.

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your database connection and configuration.

3. Generate Prisma client:
```bash
pnpm prisma:generate
```

4. Build the server:
```bash
pnpm run build
```

5. Start the server:
```bash
pnpm start
```

## Development

For development with automatic rebuilding:
```bash
pnpm run dev
```

## Environment Variables

- `DB_PRISMA_URL`: PostgreSQL connection string
- `WS_PORT`: WebSocket server port (default: 3001)
- `FRONTEND_URL`: Frontend URL for CORS (default: http://localhost:3000)
- `NODE_ENV`: Environment (development/production)

## Architecture

The server follows a modular approach with:

- **Types**: TypeScript interfaces for type safety
- **Handlers**: Organized by feature (lobby, game, chat, admin)
- **Utils**: Database operations and utility functions
- **WebSocket Server**: Main Socket.io server setup

## Features

- Real-time multiplayer lobbies
- Game management (start, rounds, scoring)
- Chat system with reactions
- Admin controls (kick, host transfer, settings)
- Automatic lobby cleanup
- TypeScript for type safety