#!/bin/bash
set -euo pipefail

echo "=== Nugdeep Deployment Script ==="

# Configuration
SERVER="venservant@158.220.87.109"
PORT="1145"
PEM_KEY="C:\\Users\\Son\\Pictures\\Wedding\\venserve.pem"
REMOTE_DIR="~/nugdeep"

# Build backend
echo "Building Go server..."
cd c:/dev/nugdeep/server
export CGO_ENABLED=0
export GOOS=linux
export GOARCH=amd64
go build -o ../nugdeep-api ./cmd/api
echo "Backend built: nugdeep-api"

# Build frontend
echo "Building Next.js frontend..."
cd c:/dev/nugdeep/web
npm run build
echo "Frontend built"

# Create deployment package
echo "Creating deployment package..."
cd c:/dev/nugdeep
rm -f deploy_nugdeep.tar.gz
tar -czf deploy_nugdeep.tar.gz nugdeep-api web/.next web/public web/package.json web/package-lock.json .env.live
echo "Package created: deploy_nugdeep.tar.gz"

# Upload to server
echo "Uploading to server..."
scp -i "$PEM_KEY" -P $PORT deploy_nugdeep.tar.gz $SERVER:$REMOTE_DIR/
echo "Upload complete"

# Deploy on server
echo "Deploying on server..."
ssh -i "$PEM_KEY" -p $PORT $SERVER << 'ENDSSH'
cd ~/nugdeep
echo "Extracting..."
rm -rf deploy_extract
mkdir deploy_extract
cd deploy_extract
tar xzf ../deploy_nugdeep.tar.gz
echo "Extracted"

echo "Stopping old backend..."
pkill -f nugdeep-api || true
sleep 2

echo "Installing new backend..."
cd ~/nugdeep
mv nugdeep-api nugdeep-api.old || true
mv deploy_extract/nugdeep-api .
chmod +x nugdeep-api

echo "Installing new frontend..."
rm -rf web_old
mv web web_old 2>/dev/null || true
mv deploy_extract/.next web/
mv deploy_extract/public web/
cp deploy_extract/package.json web/
cp deploy_extract/package-lock.json web/
cp .env.live web/.env

echo "Starting backend..."
nohup ./nugdeep-api > backend.log 2>&1 &
sleep 3
echo "Backend started"

echo "Starting frontend..."
cd web
nohup npm start > frontend.log 2>&1 &
sleep 3
echo "Frontend started"

echo "Cleaning up..."
cd ~/nugdeep
rm -rf deploy_extract deploy_nugdeep.tar.gz

echo "=== Deployment complete ==="
echo "Backend log: tail -20 ~/nugdeep/backend.log"
echo "Frontend log: tail -20 ~/nugdeep/web/frontend.log"
ENDSSH

echo "=== Deployment finished ==="
