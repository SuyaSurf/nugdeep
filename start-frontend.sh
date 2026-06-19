#!/bin/bash
export PATH="/home/venservant/local/bin:/home/venservant/local/lib/go/bin:$PATH"
cd /home/venservant/bammby/web

# Kill any existing Next.js process
pkill -f "next start" 2>/dev/null || true

export NEXT_PUBLIC_API_URL="https://bammby.suya.surf/api"
export NEXT_PUBLIC_WS_URL="wss://bammby.suya.surf/ws"
export PORT=9012

nohup npx next start -p 9012 > /home/venservant/bammby/frontend.log 2>&1 &
echo "Frontend started on port 9012"
