#!/bin/bash
export PATH="/home/venservant/local/bin:/home/venservant/local/lib/go/bin:$PATH"

# Stop existing container if running
docker rm -f bammby-api 2>/dev/null || true

# Run backend on tovbase_default network with port 9020 exposed
docker run -d \
  --name bammby-api \
  --network tovbase_default \
  -p 127.0.0.1:9020:8080 \
  -v /home/venservant/bammby:/bammby \
  -e PORT=8080 \
  -e DATABASE_URL="postgres://postgres:Ot8mQc5coZEsvlc9XjDyqrA6i1oOj@tovbase-postgres-1:5432/bammby" \
  -e REDIS_URL="redis://tovbase-redis-1:6379/1" \
  -e CLERK_SECRET_KEY="sk_test_placeholder" \
  -e CLERK_PUBLISHABLE_KEY="pk_test_placeholder" \
  -e CLERK_WEBHOOK_SECRET="whsec_placeholder" \
  -e LIVEKIT_API_KEY="placeholder" \
  -e LIVEKIT_API_SECRET="placeholder" \
  -e LIVEKIT_URL="wss://livekit.example.com" \
  -e OPENAI_API_KEY="sk-placeholder" \
  alpine:latest \
  /bammby/bammby-api

echo "Backend container started on port 9020"
