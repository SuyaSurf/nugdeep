#!/bin/bash
set -euo pipefail
export PATH="$HOME/local/bin:$PATH"
cd ~/nugdeep

echo "Extracting..."
rm -rf deploy_frontend_extract
mkdir deploy_frontend_extract
cd deploy_frontend_extract
tar xzf ../deploy_frontend.tar.gz
echo "Extracted OK"

echo "Killing old frontend..."
fuser -k 9012/tcp 2>/dev/null || true
sleep 1

echo "Copying new build..."
cd ~/nugdeep
rm -rf web_standalone_old
mv web_standalone web_standalone_old 2>/dev/null || true
mv deploy_frontend_extract web_standalone

echo "Setting up env..."
cp .env.live web_standalone/.env

echo "Starting frontend..."
cd web_standalone
nohup node server.js > frontend.log 2>&1 &
sleep 3
cat frontend.log | tail -20
echo "Done"
