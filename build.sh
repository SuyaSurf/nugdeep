#!/bin/bash
set -euo pipefail

cd ~
export PATH="$HOME/local/bin:$PATH"

# ── Build Go server ─────────────────────────────────────────────────────
echo "Building Go server..."
cd ~/bammby/server
export CGO_ENABLED=0
export GOOS=linux
export GOARCH=amd64
go build -o ~/bammby/bammby-api ./cmd/api
echo "Go binary built."

# ── Build Next.js frontend ──────────────────────────────────────────────
echo "Building Next.js frontend..."
cd ~/bammby/web
npm ci
npm run build
echo "Frontend built."

# ── Create bammby database ─────────────────────────────────────────────
echo "Creating database if needed..."
if ! docker exec tovbase-postgres-1 psql -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='bammby'" | grep -q 1; then
    docker exec tovbase-postgres-1 psql -U postgres -d postgres -c "CREATE DATABASE bammby;"
    echo "Database created."
else
    echo "Database already exists."
fi

# ── Run migrations ──────────────────────────────────────────────────────
echo "Running migrations..."
cd ~/bammby/server
export DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5432/bammby"
~/bammby/bammby-api migrate up || true

echo "=== Build complete ==="
