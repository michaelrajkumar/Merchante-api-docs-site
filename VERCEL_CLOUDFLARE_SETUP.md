# Vercel + CloudFlare Setup Guide
## MerchantE API Documentation

### Prerequisites
- Domain registered and on CloudFlare
- Git repository (GitHub, GitLab, or Bitbucket)
- Vercel account (sign up at vercel.com)

---

## Setup Steps

### Step 1: Deploy to Vercel (5 minutes)

#### Option A: Via Vercel Dashboard (Easiest)
```
1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure:
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: ./
   - Build Command: npm run build (default)
   - Output Directory: .next (default)
4. Click "Deploy"
5. Wait 2-3 minutes for deployment
```

#### Option B: Via CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (from project directory)
cd /path/to/merchant-e-docs-site
vercel

# Follow prompts:
# - Link to existing project or create new? → Create new
# - Project name? → merchant-e-docs
# - Continue? → Yes

# Production deployment
vercel --prod
```

**Result:** Your site is live at `https://merchant-e-docs-xxx.vercel.app`

---

### Step 2: Add Custom Domain in Vercel (2 minutes)

```
1. Vercel Dashboard → Your Project
2. Settings → Domains
3. Add Domain: docs.merchante.com (or your chosen subdomain)
4. Click "Add"

Vercel will show DNS configuration:
┌────────────────────────────────────────┐
│ Add the following CNAME record:       │
│                                        │
│ Type:  CNAME                          │
│ Name:  docs                           │
│ Value: cname.vercel-dns.com           │
└────────────────────────────────────────┘

Keep this page open for Step 3.
```

---

### Step 3: Configure CloudFlare DNS (3 minutes)

```
1. CloudFlare Dashboard → Select your domain
2. DNS → Records → Add record
3. Configure:
   ┌────────────────────────────────────┐
   │ Type: CNAME                        │
   │ Name: docs                         │
   │ Target: cname.vercel-dns.com       │
   │ Proxy status: DNS only (GRAY 🔴)  │
   │ TTL: Auto                          │
   └────────────────────────────────────┘
4. Click "Save"

CRITICAL: Make sure cloud is GRAY, not ORANGE
```

**Visual Check:**
```
✅ Correct:  docs  →  🔴  →  cname.vercel-dns.com
❌ Wrong:    docs  →  🟠  →  cname.vercel-dns.com
```

---

### Step 4: Verify Domain (1 minute)

```
Back in Vercel:
1. Vercel will automatically detect the DNS change
2. Wait 30 seconds - 5 minutes for verification
3. When verified, you'll see: "✓ Valid Configuration"
4. SSL certificate will be issued automatically (1-2 minutes)
```

**Result:** Your site is now live at `https://docs.merchante.com` 🎉

---

## Configuration Summary

```yaml
Domain:        docs.merchante.com
DNS Provider:  CloudFlare (DNS only mode)
Hosting:       Vercel
CDN:           Vercel Edge Network
SSL:           Automatic (Let's Encrypt via Vercel)
Deployment:    Git push to main branch → Auto-deploy
```

---

## Post-Setup: Git Integration (Recommended)

### Connect GitHub for Auto-Deploy

```
1. Vercel Dashboard → Your Project → Settings → Git
2. Connect to GitHub repository
3. Configure:
   - Production Branch: main
   - Deploy Hooks: Enabled

Now:
  git push origin main  →  Vercel auto-deploys to production
  git push origin dev   →  Vercel creates preview deployment
```

---

## Environment Variables (if needed)

```
Vercel Dashboard → Your Project → Settings → Environment Variables

Add any needed variables:
- NEXT_PUBLIC_API_URL
- API_KEY (if any)
- etc.

Note: Restart deployment after adding variables
```

---

## Monitoring & Analytics

### Vercel Analytics (Built-in)
```
1. Vercel Dashboard → Your Project → Analytics
2. View:
   - Page views
   - Unique visitors
   - Top pages
   - Performance metrics
```

### CloudFlare Analytics (Optional)
```
CloudFlare Dashboard → Analytics

Available metrics:
- DNS queries
- Requests
- Bandwidth
- Threats blocked
```

### UptimeRobot (Free Monitoring)
```
1. Sign up at uptimerobot.com
2. Add monitor:
   - Type: HTTPS
   - URL: https://docs.merchante.com
   - Interval: 5 minutes
3. Get alerts via email/SMS
```

---

## Troubleshooting

### Domain Not Verifying
```
Problem: Domain stuck on "Pending"

Solutions:
1. Check DNS propagation: https://dnschecker.org
2. Verify CNAME target is correct: cname.vercel-dns.com
3. Ensure CloudFlare cloud is GRAY (DNS only)
4. Wait up to 48 hours (usually < 5 minutes)
5. Try removing and re-adding domain in Vercel
```

### SSL Certificate Issues
```
Problem: "Not Secure" warning

Solutions:
1. Wait 5-10 minutes after domain verification
2. Vercel auto-issues SSL via Let's Encrypt
3. Check Vercel Dashboard → Domains → SSL status
4. If stuck, click "Refresh" next to SSL status
```

### CloudFlare Orange Cloud Mode Issues
```
Problem: Using orange cloud causes errors

Solution: Switch to gray cloud (DNS only)
1. CloudFlare → DNS
2. Click orange cloud icon to make it gray
3. Wait 5 minutes for changes to propagate
```

---

## Deployment Commands

```bash
# View deployment logs
vercel logs

# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Remove deployment
vercel rm [deployment-name]

# Pull environment variables
vercel env pull

# Check domain configuration
vercel domains ls
```

---

## Performance Tips

### 1. Enable Vercel Analytics
```
In your Next.js project:
npm install @vercel/analytics

In app/layout.tsx:
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 2. Optimize Images
```
Already using Next.js Image component ✓
Vercel automatically optimizes images
```

### 3. Edge Functions (Optional)
```
For API routes that need to be fast globally:
// app/api/example/route.ts
export const runtime = 'edge';
```

---

## Security Checklist

```
✅ SSL/HTTPS enabled (automatic via Vercel)
✅ Security headers configured in next.config.mjs
✅ Environment variables secured in Vercel
✅ Git repository is private (if needed)
✅ CloudFlare DNS DNSSEC enabled (optional)
✅ Vercel DDoS protection (automatic)
```

---

## Cost Breakdown

```yaml
Vercel Pro:           $20/month
CloudFlare:           $0 (Free tier)
Domain:               ~$12/year
UptimeRobot:          $0 (Free tier)
─────────────────────────────────────
Total Monthly:        $21/month
Total Yearly:         $264/year
```

---

## Support Resources

```
Vercel Documentation:   https://vercel.com/docs
CloudFlare Docs:        https://developers.cloudflare.com
Next.js Docs:           https://nextjs.org/docs

Community:
- Vercel Discord:       https://vercel.com/discord
- Next.js Discussions:  https://github.com/vercel/next.js/discussions
```

---

## Quick Reference

### DNS Record
```
Type:   CNAME
Name:   docs (or @ for root)
Target: cname.vercel-dns.com
Proxy:  🔴 DNS only (GRAY cloud)
```

### Deployment
```
Auto:   git push origin main
Manual: vercel --prod
```

### Monitoring
```
Uptime:      uptimerobot.com
Analytics:   Vercel Dashboard
Logs:        vercel logs
```

---

## Next Steps After Setup

1. ✅ Test all pages: docs.merchante.com
2. ✅ Set up monitoring (UptimeRobot)
3. ✅ Configure Git auto-deploy
4. ✅ Add environment variables (if any)
5. ✅ Test deployment workflow
6. ✅ Update DNS for other subdomains if needed

---

**Setup Complete! 🎉**

Your MerchantE API documentation is now:
- Live on Vercel
- Using CloudFlare DNS
- Auto-deploying from Git
- Globally distributed via CDN
- Secured with SSL
- Ready for production traffic
