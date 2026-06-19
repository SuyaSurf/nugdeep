#!/bin/bash
set -euo pipefail

cd ~
mkdir -p local/bin local/lib

# Install Go
if [ ! -f local/bin/go ]; then
    echo "Installing Go..."
    curl -fsSL https://go.dev/dl/go1.24.5.linux-amd64.tar.gz -o /tmp/go.tar.gz
    tar -C local/lib -xzf /tmp/go.tar.gz
    ln -sf local/lib/go/bin/go local/bin/go
    rm -f /tmp/go.tar.gz
fi
local/bin/go version

# Install Node.js
if [ ! -f local/bin/node ]; then
    echo "Installing Node.js..."
    curl -fsSL https://nodejs.org/dist/v22.15.0/node-v22.15.0-linux-x64.tar.xz -o /tmp/node.tar.xz
    tar -C local --strip-components=1 -xf /tmp/node.tar.xz
    rm -f /tmp/node.tar.xz
fi
local/bin/node -v

echo "=== Toolchain ready ==="
