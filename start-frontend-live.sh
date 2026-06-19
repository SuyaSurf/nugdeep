#!/bin/bash
set -euo pipefail
export PATH="/home/venservant/local/bin:/home/venservant/local/lib/go/bin:$PATH"
set -a
. /home/venservant/bammby/.env.live
set +a
cd /home/venservant/bammby/web
export NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="$CLERK_PUBLISHABLE_KEY"
export NEXT_PUBLIC_API_URL="https://bammby.suya.surf/api"
export NEXT_PUBLIC_WS_URL="wss://bammby.suya.surf/ws"
export PORT=9012
nohup /home/venservant/local/bin/node .next/standalone/server.js > /home/venservant/bammby/frontend.log 2>&1 &
echo "frontend started"
