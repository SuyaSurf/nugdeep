#!/bin/bash
set -euo pipefail

cd ~
export PATH="$HOME/local/bin:$PATH"

# ── Install Go 1.26 locally ─────────────────────────────────────────────
if [ ! -f ~/local/bin/go ]; then
    echo "Installing Go..."
    mkdir -p ~/local/bin ~/local/lib
    curl -fsSL https://go.dev/dl/go1.26.0.linux-amd64.tar.gz -o /tmp/go.tar.gz
    tar -C ~/local/lib -xzf /tmp/go.tar.gz
    ln -sf ~/local/lib/go/bin/go ~/local/bin/go
    rm -f /tmp/go.tar.gz
fi

# ── Install Node.js 22 locally ──────────────────────────────────────────
if [ ! -f ~/local/bin/node ]; then
    echo "Installing Node.js..."
    curl -fsSL https://nodejs.org/dist/v22.15.0/node-v22.15.0-linux-x64.tar.xz -o /tmp/node.tar.xz
    tar -C ~/local --strip-components=1 -xf /tmp/node.tar.xz
    rm -f /tmp/node.tar.xz
fi

echo "Go: $(go version)"
echo "Node: $(node -v)"

# ── Ensure bammby PostgreSQL DB exists ──────────────────────────────────
if ! docker exec tovbase-postgres-1 psql -U postgres -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='bammby'" | grep -q 1; then
    echo "Creating bammby database..."
    docker exec tovbase-postgres-1 psql -U postgres -d postgres -c "CREATE DATABASE bammby;"
fi

echo "Database ready."

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

# ── Run migrations ──────────────────────────────────────────────────────
echo "Running migrations..."
cd ~/bammby/server
export DATABASE_URL="postgres://postgres:postgres@127.0.0.1:5432/bammby"
./bammby-api migrate up || true

echo "=== Build complete ==="
