#!/bin/sh
set -e

echo " Waiting for database to be ready..."
until pg_isready -h postgres -U ${DB_USER:-loqano} -d ${DB_NAME:-loqano_db}; do
  echo " Database is unavailable - sleeping"
  sleep 2
done

echo " Database is ready!"

echo "Running Prisma db push..."
pnpm prisma db push --accept-data-loss

echo "Starting WebSocket server..."
exec "$@"