#!/bin/bash

################################################################################
# Production Deployment Script - Hardened Server
# For use with security-hardened Linux server
################################################################################

set -e

echo "🚀 Starting production deployment..."

# Configuration
read -p "Enter server IP: " SERVER
read -p "Enter SSH port (default 2574): " SSH_PORT
SSH_PORT=${SSH_PORT:-2574}
read -p "Enter SSH user (default root): " SSH_USER
SSH_USER=${SSH_USER:-root}

DEPLOY_PATH="/var/www/merchant-e-docs-site"
APP_USER="merchant-docs"
PM2_APP="merchant-docs"

echo ""
echo "Configuration:"
echo "  Server: $SERVER"
echo "  SSH Port: $SSH_PORT"
echo "  SSH User: $SSH_USER"
echo "  Deploy Path: $DEPLOY_PATH"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf deploy-package.tar.gz \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='deploy*.sh' \
  --exclude='*.tar.gz' \
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
scp -P ${SSH_PORT} deploy-package.tar.gz ${SSH_USER}@${SERVER}:/tmp/

echo "🔧 Deploying on server..."
ssh -p ${SSH_PORT} ${SSH_USER}@${SERVER} bash <<ENDSSH
set -e

# Create directory if it doesn't exist
mkdir -p ${DEPLOY_PATH}

# Extract files
echo "📂 Extracting files..."
cd ${DEPLOY_PATH}
tar -xzf /tmp/deploy-package.tar.gz
rm /tmp/deploy-package.tar.gz

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    npm install -g pm2
fi

# Install production dependencies
echo "📥 Installing dependencies..."
npm ci --production --prefer-offline --no-audit

# Create app user if doesn't exist
if ! id "${APP_USER}" &>/dev/null; then
    useradd -r -s /bin/bash -d ${DEPLOY_PATH} -m ${APP_USER} || true
fi

# Set ownership
chown -R ${APP_USER}:${APP_USER} ${DEPLOY_PATH}

# PM2 ecosystem file
cat > ${DEPLOY_PATH}/ecosystem.config.js <<'EOF'
module.exports = {
  apps: [{
    name: '${PM2_APP}',
    script: 'npm',
    args: 'start',
    cwd: '${DEPLOY_PATH}',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/${PM2_APP}-error.log',
    out_file: '/var/log/pm2/${PM2_APP}-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF

# Create log directory
mkdir -p /var/log/pm2
chown -R ${APP_USER}:${APP_USER} /var/log/pm2

# Start/restart with PM2 as app user
echo "🔄 Restarting application..."
su - ${APP_USER} -c "cd ${DEPLOY_PATH} && pm2 delete ${PM2_APP} 2>/dev/null || true"
su - ${APP_USER} -c "cd ${DEPLOY_PATH} && pm2 start ecosystem.config.js"
su - ${APP_USER} -c "pm2 save"

# Setup PM2 startup (as root)
pm2 startup systemd -u ${APP_USER} --hp ${DEPLOY_PATH}

echo "✅ Deployment complete!"
su - ${APP_USER} -c "pm2 list"
ENDSSH

# Clean up local package
rm deploy-package.tar.gz

echo ""
echo "✨ Deployment successful!"
echo "🌐 Your site should be live at: https://your-domain.com"
echo ""
echo "Useful commands:"
echo "  Check status:  ssh -p ${SSH_PORT} ${SSH_USER}@${SERVER} 'su - ${APP_USER} -c \"pm2 list\"'"
echo "  View logs:     ssh -p ${SSH_PORT} ${SSH_USER}@${SERVER} 'su - ${APP_USER} -c \"pm2 logs ${PM2_APP}\"'"
echo "  Restart:       ssh -p ${SSH_PORT} ${SSH_USER}@${SERVER} 'su - ${APP_USER} -c \"pm2 restart ${PM2_APP}\"'"
echo ""
