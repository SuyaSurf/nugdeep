#!/bin/bash
export PATH="/home/venservant/local/bin:/home/venservant/local/lib/go/bin:$PATH"
cd /home/venservant/bammby/web

# Install new dependency
npm install

# Rebuild
npm run build

# Stop existing frontend
pkill -f "standalone/server.js" 2>/dev/null || true

# Restart with live env
set -a
. /home/venservant/bammby/.env.live
set +a
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$CLERK_PUBLISHABLE_KEY"
export NEXT_PUBLIC_API_URL="https://bammby.suya.surf/api"
export NEXT_PUBLIC_WS_URL="wss://bammby.suya.surf/ws"
export PORT=9012
nohup /home/venservant/local/bin/node .next/standalone/server.js > /home/venservant/bammby/frontend.log 2>&1 &
echo "Frontend rebuilt and restarted"
