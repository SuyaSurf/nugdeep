#!/bin/bash
# Restart backend with fixed Redis URL
docker rm -f bammby-api 2>/dev/null || true

docker run -d \
  --name bammby-api \
  --network tovbase_default \
  -p 127.0.0.1:9021:8080 \
  -v /home/venservant/bammby:/bammby \
  -e PORT=8080 \
  -e DATABASE_URL="postgres://postgres:Ot8mQc5coZEsvlc9XjDyqrA6i1oOj@tovbase-postgres-1:5432/bammby" \
  -e REDIS_URL="tovbase-redis-1:6379" \
  -e CLERK_SECRET_KEY="sk_test_placeholder" \
  -e CLERK_PUBLISHABLE_KEY="pk_test_placeholder" \
  -e CLERK_WEBHOOK_SECRET="whsec_placeholder" \
  -e LIVEKIT_API_KEY="placeholder" \
  -e LIVEKIT_API_SECRET="placeholder" \
  -e LIVEKIT_URL="wss://livekit.example.com" \
  -e OPENAI_API_KEY="sk-placeholder" \
  alpine:latest \
  /bammby/bammby-api

echo "Backend restarted on port 9021"
