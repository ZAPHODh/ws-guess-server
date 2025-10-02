# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@10.7.1

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy prisma schema FIRST
COPY prisma/schema.prisma ./prisma/

# Generate Prisma Client AFTER copying schema
RUN pnpm prisma generate

# Copy source code
COPY . .

# Build TypeScript
RUN pnpm build

# Production stage
FROM node:20-alpine

# Install pnpm and postgresql-client (for pg_isready)
RUN npm install -g pnpm@10.7.1 && \
    apk add --no-cache postgresql-client

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies + prisma
RUN pnpm install --prod --frozen-lockfile && pnpm add -D prisma

# Copy prisma schema
COPY prisma/schema.prisma ./prisma/

# Generate Prisma Client in production stage too
RUN pnpm prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose WebSocket port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use entrypoint
ENTRYPOINT ["/entrypoint.sh"]

# Start the server
CMD ["pnpm", "start"]