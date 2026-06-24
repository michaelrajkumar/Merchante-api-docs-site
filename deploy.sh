#!/bin/bash

# MerchantE Docs Deployment Script
# Deploy to merchante-docs-test.site

set -e

echo "🚀 Starting deployment to merchante-docs-test.site..."

# Server details
SERVER="188.190.17.32"
PORT="2574"
USER="root"
DEPLOY_PATH="/var/www/merchant-e-docs-site"
PM2_APP="merchant-docs"

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf deploy-package.tar.gz \
  .next \
  public \
  package.json \
  package-lock.json \
  next.config.mjs \
  postcss.config.js \
  tailwind.config.ts \
  tsconfig.json \
  app \
  components \
  lib \
  types \
  next-env.d.ts

echo "📤 Uploading to server..."
sshpass -p 'x9pAaB1r8h8e' scp -P ${PORT} -o StrictHostKeyChecking=no deploy-package.tar.gz ${USER}@${SERVER}:${DEPLOY_PATH}/

echo "🔧 Deploying on server..."
sshpass -p 'x9pAaB1r8h8e' ssh -p ${PORT} -o StrictHostKeyChecking=no ${USER}@${SERVER} << 'ENDSSH'
cd /var/www/merchant-e-docs-site

# Extract files
echo "📂 Extracting files..."
tar -xzf deploy-package.tar.gz
rm deploy-package.tar.gz

# Install dependencies (production only)
echo "📥 Installing dependencies..."
npm install --production

# Restart PM2 process
echo "🔄 Restarting application..."
pm2 restart merchant-docs || pm2 start npm --name merchant-docs -- start

echo "✅ Deployment complete!"
pm2 list
ENDSSH

# Clean up local package
rm deploy-package.tar.gz

echo ""
echo "✨ Deployment successful!"
echo "🌐 Your site should be live at: http://merchante-docs-test.site"
echo ""
echo "Useful commands:"
echo "  Check status:  ssh -p ${PORT} root@${SERVER} 'pm2 list'"
echo "  View logs:     ssh -p ${PORT} root@${SERVER} 'pm2 logs merchant-docs'"
echo "  Restart:       ssh -p ${PORT} root@${SERVER} 'pm2 restart merchant-docs'"
