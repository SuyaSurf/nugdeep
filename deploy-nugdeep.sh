#!/bin/bash
set -euo pipefail

echo "=== Nugdeep Deployment Script ==="

# Configuration
SERVER="venservant@158.220.87.109"
PORT="1145"
PEM_KEY="/mnt/c/Users/Son/Pictures/Wedding/venserve.pem"
REMOTE_DIR="~/nugdeep"

# Fix PEM permissions for Windows OpenSSH
rm -f ./venserve.pem
cp "$PEM_KEY" ./venserve.pem
PEM_KEY="C:/dev/nugdeep/venserve.pem"
SSH="/mnt/c/Windows/System32/OpenSSH/ssh.exe"
SCP="/mnt/c/Windows/System32/OpenSSH/scp.exe"

# Build backend using Windows Go with cross-compilation via batch file
echo "Building Go server..."
cd /mnt/c/dev/nugdeep/server
cat > /tmp/build-nugdeep.bat << 'EOFBAT'
@echo off
cd /d C:\dev\nugdeep\server
set CGO_ENABLED=0
set GOOS=linux
set GOARCH=amd64
go build -o ..\nugdeep-api .\cmd\api
EOFBAT
cmd /c /tmp/build-nugdeep.bat
cd /mnt/c/dev/nugdeep
echo "Backend built: nugdeep-api"

# Build frontend
echo "Building Next.js frontend..."
cd /mnt/c/dev/nugdeep/web
"/mnt/c/Program Files/nodejs/npm" run build
echo "Frontend built"

# Create deployment package
echo "Creating deployment package..."
cd /mnt/c/dev/nugdeep
rm -f deploy_nugdeep.tar.gz
tar -czf deploy_nugdeep.tar.gz nugdeep-api web/.next web/public web/package.json web/package-lock.json .env.live
echo "Package created: deploy_nugdeep.tar.gz"

# Upload to server
echo "Uploading to server..."
"$SCP" -i "$PEM_KEY" -P $PORT deploy_nugdeep.tar.gz $SERVER:$REMOTE_DIR/
echo "Upload complete"

# Deploy on server
echo "Deploying on server..."
"$SSH" -i "$PEM_KEY" -p $PORT $SERVER << 'ENDSSH'
cd ~/nugdeep
echo "Extracting..."
rm -rf deploy_extract
mkdir deploy_extract
cd deploy_extract
tar xzf ../deploy_nugdeep.tar.gz
echo "Extracted"

echo "Stopping old backend..."
pkill -f nugdeep-api 2>/dev/null || sudo pkill -f nugdeep-api 2>/dev/null || true
sleep 2

echo "Installing new backend..."
cd ~/nugdeep
mv nugdeep-api nugdeep-api.old 2>/dev/null || true
mv deploy_extract/nugdeep-api .
chmod +x nugdeep-api

echo "Installing new frontend..."
rm -rf web_old
mv web web_old 2>/dev/null || true
mkdir -p web
mv deploy_extract/web/.next web/
mv deploy_extract/web/public web/
cp deploy_extract/web/package.json web/
cp deploy_extract/web/package-lock.json web/
cp .env.live web/.env

echo "Installing node_modules..."
cd ~/nugdeep/web
npm install

echo "Starting backend..."
cd ~/nugdeep
nohup ./nugdeep-api > backend.log 2>&1 &
sleep 3
echo "Backend started"

echo "Starting frontend..."
cd ~/nugdeep/web
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
