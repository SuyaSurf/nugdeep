#!/bin/bash
set -euo pipefail
cd ~/nugdeep

echo "=== Extracting package ==="
rm -rf deploy_extract
mkdir deploy_extract
cd deploy_extract
tar xzf ../deploy.tar.gz
echo "Extracted"

echo "=== Installing backend binary ==="
cd ~/nugdeep
mv nugdeep-api nugdeep-api.old 2>/dev/null || true
mv deploy_extract/nugdeep-api .
chmod +x nugdeep-api

echo "=== Moving env files ==="
mv backend.env .deploy_backend_env
mv frontend.env .env.live

echo "=== Restarting backend Docker container ==="
sudo docker rm -f nugdeep-api 2>/dev/null || true
sudo docker run -d \
  --name nugdeep-api \
  --network tovbase_default \
  -p 127.0.0.1:9021:8080 \
  --restart unless-stopped \
  -v /home/venservant/nugdeep:/nugdeep \
  --env-file ~/nugdeep/.deploy_backend_env \
  alpine:latest /nugdeep/nugdeep-api
sleep 3
echo "Backend started"

echo "=== Installing frontend ==="
cd ~/nugdeep
rm -rf web_old
mv web web_old 2>/dev/null || true
mkdir -p web
mv deploy_extract/web/.next web/
mv deploy_extract/web/public web/
mv deploy_extract/web/scripts web/
cp deploy_extract/web/package.json web/
cp deploy_extract/web/package-lock.json web/
cp ~/nugdeep/.env.live web/.env

echo "=== Installing node_modules ==="
cd ~/nugdeep/web
npm ci --omit=dev 2>/dev/null || npm install

echo "=== Restarting frontend ==="
fuser -k 9012/tcp 2>/dev/null || true
sleep 2
PORT=9012 nohup npm start > ~/nugdeep/web/frontend.log 2>&1 &
sleep 5
echo "Frontend started"

echo "=== Verifying ==="
curl -s -o /dev/null -w 'Frontend HTTP: %{http_code}\n' http://127.0.0.1:9012/
sudo docker ps --filter name=nugdeep-api --format 'Backend: {{.Status}}'

echo "=== Cleaning up ==="
cd ~/nugdeep
rm -rf deploy_extract deploy.tar.gz nugdeep-api.old remote-deploy.sh
echo "=== Deployment complete ==="
