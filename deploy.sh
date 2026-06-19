#!/bin/bash
set -euo pipefail

echo "=== Bammby Deployment Script ==="

# Install Go 1.24
if ! command -v go &>/dev/null; then
    echo "Installing Go..."
    curl -fsSL https://go.dev/dl/go1.24.5.linux-amd64.tar.gz -o /tmp/go.tar.gz
    tar -C /tmp -xzf /tmp/go.tar.gz
    mkdir -p ~/local/bin
    cp /tmp/go/bin/go ~/local/bin/go
    export PATH="$HOME/local/bin:$PATH"
    echo 'export PATH="$HOME/local/bin:$PATH"' >> ~/.bashrc
    rm -f /tmp/go.tar.gz
fi

# Install Node.js 22 (LTS)
if ! command -v node &>/dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://nodejs.org/dist/v22.15.0/node-v22.15.0-linux-x64.tar.xz -o /tmp/node.tar.xz
    tar -C /tmp -xf /tmp/node.tar.xz
    cp -r /tmp/node-v22.15.0-linux-x64/* ~/local/
    rm -rf /tmp/node-v22.15.0-linux-x64 /tmp/node.tar.xz
fi

export PATH="$HOME/local/bin:$PATH"

# Verify
echo "Go version: $(go version)"
echo "Node version: $(node -v)"

# Check PostgreSQL and Redis
if ! command -v psql &>/dev/null; then
    echo "WARNING: PostgreSQL client not found. Please ask admin to install postgresql-server"
fi
if ! command -v redis-cli &>/dev/null; then
    echo "WARNING: Redis client not found. Please ask admin to install redis"
fi

echo "=== Setup complete ==="
