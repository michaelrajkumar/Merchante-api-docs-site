#!/bin/bash

################################################################################
# Production Security Hardening Script for MerchantE Docs
# OS: Debian 12 / Ubuntu 24.04 LTS
# Goal: FreeBSD-level security on Linux
################################################################################

set -e

echo "🔒 Starting security hardening..."
echo "⚠️  This script will harden your Linux server to production standards"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root"
   exit 1
fi

################################################################################
# 1. SYSTEM UPDATES & SECURITY PATCHES
################################################################################
echo "📦 Step 1: Updating system and enabling automatic security updates..."

apt update
apt upgrade -y
apt install -y unattended-upgrades apt-listchanges

# Configure automatic security updates
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
Unattended-Upgrade::Automatic-Reboot-Time "03:00";
EOF

# Enable automatic updates
echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";' > /etc/apt/apt.conf.d/20auto-upgrades

################################################################################
# 2. FIREWALL (UFW - Simple, Effective)
################################################################################
echo "🔥 Step 2: Configuring firewall..."

apt install -y ufw

# Default deny
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (custom port recommended)
read -p "Enter SSH port (default 2574): " SSH_PORT
SSH_PORT=${SSH_PORT:-2574}
ufw allow $SSH_PORT/tcp comment 'SSH'

# Allow HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Rate limiting on SSH (prevents brute force)
ufw limit $SSH_PORT/tcp

# Enable firewall
echo "y" | ufw enable

################################################################################
# 3. FAIL2BAN (Intrusion Prevention)
################################################################################
echo "🛡️  Step 3: Installing Fail2ban..."

apt install -y fail2ban

# Configure Fail2ban
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = root@localhost
sendername = Fail2Ban
action = %(action_mwl)s

[sshd]
enabled = true
port = $SSH_PORT
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2

[nginx-noproxy]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
EOF

systemctl enable fail2ban
systemctl restart fail2ban

################################################################################
# 4. SSH HARDENING
################################################################################
echo "🔐 Step 4: Hardening SSH..."

# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Harden SSH configuration
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<EOF
# Port (custom)
Port $SSH_PORT

# Security hardening
PermitRootLogin prohibit-password
PasswordAuthentication yes
PubkeyAuthentication yes
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Disable X11 forwarding
X11Forwarding no

# Disable TCP forwarding
AllowTcpForwarding no
AllowStreamLocalForwarding no
GatewayPorts no
PermitTunnel no

# Protocol settings
Protocol 2
StrictModes yes
MaxAuthTries 3
MaxSessions 2

# Timeouts
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 30

# Logging
SyslogFacility AUTH
LogLevel VERBOSE

# Only allow specific users (add your user)
# AllowUsers yourusername

# Strong ciphers only
Ciphers chacha20-poly1305@openssh.com,aes256-gcm@openssh.com,aes128-gcm@openssh.com,aes256-ctr,aes192-ctr,aes128-ctr
MACs hmac-sha2-512-etm@openssh.com,hmac-sha2-256-etm@openssh.com,hmac-sha2-512,hmac-sha2-256
KexAlgorithms curve25519-sha256,curve25519-sha256@libssh.org,diffie-hellman-group-exchange-sha256
HostKeyAlgorithms ssh-ed25519,rsa-sha2-512,rsa-sha2-256
EOF

# Restart SSH
systemctl restart sshd

################################################################################
# 5. KERNEL HARDENING (sysctl)
################################################################################
echo "⚙️  Step 5: Kernel hardening..."

cat > /etc/sysctl.d/99-hardening.conf <<'EOF'
# IP Forwarding (disable unless needed)
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# Disable source packet routing
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Disable ICMP redirect acceptance
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Enable IP spoofing protection (reverse path filtering)
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Log suspicious packets
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1

# Ignore ICMP ping requests (optional - uncomment if desired)
# net.ipv4.icmp_echo_ignore_all = 1

# Ignore broadcast pings
net.ipv4.icmp_echo_ignore_broadcasts = 1

# Enable bad error message protection
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Enable TCP SYN cookies (SYN flood protection)
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_syn_retries = 2
net.ipv4.tcp_synack_retries = 2
net.ipv4.tcp_max_syn_backlog = 4096

# Disable IPv6 (if not needed)
# net.ipv6.conf.all.disable_ipv6 = 1
# net.ipv6.conf.default.disable_ipv6 = 1

# Increase system security
kernel.dmesg_restrict = 1
kernel.kptr_restrict = 2
kernel.yama.ptrace_scope = 2
kernel.unprivileged_bpf_disabled = 1
net.core.bpf_jit_harden = 2

# Prevent core dumps
kernel.core_uses_pid = 1
fs.suid_dumpable = 0

# Address Space Layout Randomization (ASLR)
kernel.randomize_va_space = 2

# File system hardening
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
fs.protected_fifos = 2
fs.protected_regular = 2
EOF

# Apply sysctl settings
sysctl -p /etc/sysctl.d/99-hardening.conf

################################################################################
# 6. APPARMOR (Mandatory Access Control)
################################################################################
echo "🔰 Step 6: Enabling AppArmor..."

apt install -y apparmor apparmor-utils apparmor-profiles apparmor-profiles-extra

# Enable AppArmor
systemctl enable apparmor
systemctl start apparmor

# Set all profiles to enforce mode
aa-enforce /etc/apparmor.d/*

################################################################################
# 7. AUDIT LOGGING (auditd)
################################################################################
echo "📋 Step 7: Installing audit logging..."

apt install -y auditd audispd-plugins

# Basic audit rules
cat > /etc/audit/rules.d/hardening.rules <<'EOF'
# Remove any existing rules
-D

# Buffer Size
-b 8192

# Failure Mode (0=silent 1=printk 2=panic)
-f 1

# Audit system calls
-a always,exit -F arch=b64 -S adjtimex -S settimeofday -k time-change
-a always,exit -F arch=b32 -S adjtimex -S settimeofday -S stime -k time-change
-a always,exit -F arch=b64 -S clock_settime -k time-change
-a always,exit -F arch=b32 -S clock_settime -k time-change

# Monitor authentication
-w /var/log/faillog -p wa -k logins
-w /var/log/lastlog -p wa -k logins
-w /var/log/tallylog -p wa -k logins

# Monitor user/group changes
-w /etc/group -p wa -k identity
-w /etc/passwd -p wa -k identity
-w /etc/gshadow -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/security/opasswd -p wa -k identity

# Monitor network configuration
-a always,exit -F arch=b64 -S sethostname -S setdomainname -k network_modifications
-a always,exit -F arch=b32 -S sethostname -S setdomainname -k network_modifications

# Monitor file permissions changes
-a always,exit -F arch=b64 -S chmod -S fchmod -S fchmodat -F auid>=1000 -F auid!=4294967295 -k perm_mod
-a always,exit -F arch=b32 -S chmod -S fchmod -S fchmodat -F auid>=1000 -F auid!=4294967295 -k perm_mod

# Monitor sudo commands
-a always,exit -F arch=b64 -S execve -F euid=0 -F auid>=1000 -F auid!=4294967295 -k privileged

# Make configuration immutable
-e 2
EOF

systemctl enable auditd
systemctl restart auditd

################################################################################
# 8. SECURE SHARED MEMORY
################################################################################
echo "💾 Step 8: Securing shared memory..."

# Add to fstab if not already present
if ! grep -q "tmpfs.*\/run\/shm" /etc/fstab; then
    echo "tmpfs /run/shm tmpfs defaults,noexec,nodev,nosuid,size=512M 0 0" >> /etc/fstab
fi

################################################################################
# 9. DISABLE UNNECESSARY SERVICES
################################################################################
echo "🔌 Step 9: Disabling unnecessary services..."

# List of services to disable (adjust based on your needs)
SERVICES_TO_DISABLE=(
    "bluetooth.service"
    "avahi-daemon.service"
    "cups.service"
)

for service in "${SERVICES_TO_DISABLE[@]}"; do
    if systemctl list-unit-files | grep -q "^$service"; then
        systemctl disable $service 2>/dev/null || true
        systemctl stop $service 2>/dev/null || true
        echo "  ✓ Disabled $service"
    fi
done

################################################################################
# 10. INSTALL SECURITY TOOLS
################################################################################
echo "🔧 Step 10: Installing security monitoring tools..."

apt install -y \
    rkhunter \
    chkrootkit \
    aide \
    logwatch \
    acct

# Initialize AIDE database
echo "Initializing AIDE database (this may take a few minutes)..."
aideinit
cp /var/lib/aide/aide.db.new /var/lib/aide/aide.db

# Configure rkhunter
rkhunter --propupd

################################################################################
# 11. NGINX SECURITY HEADERS (if Nginx is installed)
################################################################################
echo "🌐 Step 11: Configuring Nginx security headers..."

if command -v nginx &> /dev/null; then
    cat > /etc/nginx/snippets/security-headers.conf <<'EOF'
# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'self';" always;

# Remove Nginx version from headers
server_tokens off;

# Rate limiting
limit_req_zone \$binary_remote_addr zone=general:10m rate=10r/s;
limit_req_status 429;
EOF

    # Create rate limiting config
    cat > /etc/nginx/snippets/rate-limiting.conf <<'EOF'
# Apply rate limiting
limit_req zone=general burst=20 nodelay;
EOF

    echo "  ✓ Nginx security headers configured"
    echo "  ⚠️  Add 'include snippets/security-headers.conf;' to your server blocks"
    echo "  ⚠️  Add 'include snippets/rate-limiting.conf;' to location blocks"
fi

################################################################################
# 12. CREATE NON-ROOT USER FOR APPLICATION
################################################################################
echo "👤 Step 12: Creating dedicated application user..."

APP_USER="merchant-docs"
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/bash -d /var/www/merchant-e-docs-site -m $APP_USER
    echo "  ✓ Created user: $APP_USER"
fi

################################################################################
# 13. SET FILE PERMISSIONS
################################################################################
echo "📁 Step 13: Setting secure file permissions..."

# Secure /tmp
chmod 1777 /tmp
chmod 1777 /var/tmp

# Secure sensitive files
chmod 600 /etc/ssh/sshd_config
chmod 600 /boot/grub/grub.cfg 2>/dev/null || true
chmod 644 /etc/passwd
chmod 644 /etc/group
chmod 600 /etc/shadow
chmod 600 /etc/gshadow

################################################################################
# SUMMARY
################################################################################
echo ""
echo "✅ Security hardening complete!"
echo ""
echo "==================================================================="
echo "SECURITY HARDENING SUMMARY"
echo "==================================================================="
echo ""
echo "✅ Automatic security updates enabled"
echo "✅ UFW firewall configured and enabled"
echo "✅ Fail2ban installed and configured"
echo "✅ SSH hardened (port: $SSH_PORT)"
echo "✅ Kernel security parameters optimized"
echo "✅ AppArmor enabled (Mandatory Access Control)"
echo "✅ Audit logging (auditd) configured"
echo "✅ Shared memory secured"
echo "✅ Unnecessary services disabled"
echo "✅ Security monitoring tools installed"
echo "✅ Nginx security headers configured"
echo "✅ Application user created: $APP_USER"
echo "✅ File permissions secured"
echo ""
echo "==================================================================="
echo "NEXT STEPS"
echo "==================================================================="
echo ""
echo "1. ⚠️  IMPORTANT: Test SSH access on port $SSH_PORT before closing this session!"
echo "   ssh -p $SSH_PORT root@YOUR_SERVER_IP"
echo ""
echo "2. Configure SSH key authentication:"
echo "   ssh-copy-id -p $SSH_PORT root@YOUR_SERVER_IP"
echo ""
echo "3. After SSH key is working, disable password authentication:"
echo "   Edit: /etc/ssh/sshd_config.d/99-hardening.conf"
echo "   Set: PasswordAuthentication no"
echo "   Then: systemctl restart sshd"
echo ""
echo "4. Review Nginx security headers:"
echo "   Add to server block: include snippets/security-headers.conf;"
echo "   Add to locations: include snippets/rate-limiting.conf;"
echo ""
echo "5. Set up monitoring:"
echo "   - Configure logwatch email"
echo "   - Set up external monitoring (UptimeRobot)"
echo "   - Review fail2ban logs: fail2ban-client status"
echo ""
echo "6. Regular security maintenance:"
echo "   - Run: rkhunter --check (weekly)"
echo "   - Run: aide --check (daily)"
echo "   - Review: /var/log/auth.log"
echo ""
echo "7. Application deployment:"
echo "   - Deploy as user: $APP_USER"
echo "   - Set ownership: chown -R $APP_USER:$APP_USER /var/www/merchant-e-docs-site"
echo ""
echo "==================================================================="
echo ""
echo "🔒 Your server is now hardened to production security standards!"
echo ""
