# MerchantE API Documentation Site

A comprehensive API documentation portal for MerchantE Solutions, featuring interactive API testing capabilities with a modern, Stripe-inspired design.

## Author

**Michael David**
Email: michael.and.mary@gmail.com

## About

This Next.js application provides interactive API documentation for MerchantE Solutions' suite of payment and merchant management APIs. Built with Next.js 14 and Swagger UI React, it offers a seamless developer experience with real-time API testing capabilities.

### Documented APIs

- **Payment Gateway** - Core payment processing operations
- **Account Updater** - Automatic card account updates
- **Partner Portal** - Partner management and configuration
- **Sub-Merchant** - Sub-merchant onboarding and management
- **Split Funding** - Payment splitting and distribution
- **Hosted Payments** - Hosted payment page solutions
- **Batch Processing** - Bulk transaction processing
- **Reporting** - Transaction reporting and analytics

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Modern, responsive styling
- **Swagger UI React** - Interactive API testing
- **YAML** - OpenAPI specification format

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18.17 or higher)
- **npm** (v9 or higher) or **yarn**
- **Git**

### Clone the Repository

```bash
# Clone the repository
git clone https://github.com/michaelrajkumar/Merchante-api-docs-site.git

# Navigate to the project directory
cd Merchante-api-docs-site
```

### Installation

1. **Install dependencies:**

```bash
npm install
```

or if you prefer yarn:

```bash
yarn install
```

2. **Set up environment variables (optional):**

Create a `.env.local` file in the root directory:

```bash
# Optional: Allowlist for proxy requests (comma-separated hosts)
PROXY_ALLOWLIST=api.sandbox.merchante.com,api.merchante.com

# Optional: Inject authentication header into proxied requests
PROXY_API_KEY_HEADER=Authorization
PROXY_API_KEY_VALUE=Bearer YOUR_API_TOKEN

# Optional: Inject multiple headers as JSON
PROXY_INJECT_HEADERS_JSON={"X-Custom-Header":"value"}
```

### Run Development Server

Start the development server:

```bash
npm run dev
```

or:

```bash
yarn dev
```

The application will be available at:
- **Home:** http://localhost:3000
- **Payment Gateway API:** http://localhost:3000/api-reference/payment-gateway
- **Account Updater API:** http://localhost:3000/api-reference/account-updater
- **Partner Portal API:** http://localhost:3000/api-reference/partner-portal

## Deployment

### Option 1: Deploy to Vercel (Recommended)

Vercel is the recommended platform for Next.js applications.

1. **Install Vercel CLI:**

```bash
npm install -g vercel
```

2. **Login to Vercel:**

```bash
vercel login
```

3. **Deploy to production:**

```bash
vercel --prod
```

4. **Set environment variables in Vercel:**

Go to your project settings on Vercel dashboard and add the environment variables from `.env.local`.

#### Using the Deploy Script

You can also use the included deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```

For production deployment:

```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

### Option 2: Deploy to Cloudflare Pages

1. **Build the application:**

```bash
npm run build
```

2. **Deploy using Cloudflare Pages:**

```bash
npx wrangler pages deploy out
```

or follow the Cloudflare Pages dashboard deployment workflow.

See `VERCEL_CLOUDFLARE_SETUP.md` for detailed Cloudflare deployment instructions.

### Option 3: Self-Hosted Deployment

1. **Build the application:**

```bash
npm run build
```

2. **Start the production server:**

```bash
npm start
```

The application will run on port 3000 by default. Use a process manager like PM2 for production:

```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start npm --name "merchante-docs" -- start

# Save PM2 configuration
pm2 save

# Set up PM2 to start on system boot
pm2 startup
```

### Option 4: Docker Deployment

1. **Create a Dockerfile:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

2. **Build and run:**

```bash
docker build -t merchante-docs .
docker run -p 3000:3000 merchante-docs
```

## Project Structure

```
merchant-e-docs-site/
├── app/                          # Next.js app router
│   ├── api-reference/           # API documentation pages
│   │   ├── [api]/              # Dynamic API route
│   │   ├── payment-gateway/    # Payment Gateway docs
│   │   ├── account-updater/    # Account Updater docs
│   │   └── ...                 # Other API docs
│   ├── api/                    # API routes
│   │   └── proxy/              # CORS proxy for API testing
│   ├── openapi/                # OpenAPI spec routes
│   └── page.tsx                # Homepage
├── components/                  # React components
│   ├── SiteHeader.tsx          # Main navigation
│   ├── LeftNav.tsx             # API sidebar navigation
│   ├── TryItOutAccordion.tsx   # Swagger UI wrapper
│   └── ...                     # Other components
├── lib/                        # Utility functions
│   ├── apis.ts                 # API configuration
│   ├── paymentGateway.ts       # Payment Gateway helpers
│   └── ...                     # Other helpers
├── public/                     # Static assets
│   └── openapi/                # OpenAPI YAML specifications
│       ├── payment-gateway.yaml
│       ├── account-updater.yaml
│       └── ...                 # Other API specs
├── types/                      # TypeScript type definitions
├── .gitignore                  # Git ignore rules
├── next.config.mjs             # Next.js configuration
├── package.json                # Project dependencies
├── tailwind.config.ts          # Tailwind CSS configuration
└── tsconfig.json               # TypeScript configuration
```

## Features

### Interactive API Testing

Each API endpoint includes a "Try it out" panel powered by Swagger UI, allowing developers to:
- Test API endpoints directly from the browser
- View request/response examples
- Understand endpoint parameters and schemas
- Copy code samples in multiple languages

### Built-in CORS Proxy

The application includes a server-side proxy (`/api/proxy`) to handle API requests, eliminating CORS issues when testing endpoints from the browser.

### Stripe-Style Layout

The documentation features a three-column layout:
- **Left:** Endpoint navigation
- **Center:** Human-readable documentation with parameter tables
- **Right:** Interactive "Try it out" panel with Swagger UI

### Code Samples

Each endpoint includes code samples in multiple programming languages:
- cURL
- JavaScript/Node.js
- Python
- PHP
- Java
- C#

## Adding New APIs

1. **Add the OpenAPI specification:**

Place your OpenAPI YAML file in `public/openapi/`:

```bash
public/openapi/your-new-api.yaml
```

2. **Register the API:**

Update `lib/apis.ts` to include your new API:

```typescript
export const apiConfigs: Record<string, ApiConfig> = {
  'your-new-api': {
    title: 'Your New API',
    description: 'Description of your API',
    specUrl: '/openapi/your-new-api',
  },
  // ... existing APIs
};
```

3. **Create the API page:**

Create a new page at `app/api-reference/your-new-api/page.tsx`.

## Configuration

### Environment Variables

- `PROXY_ALLOWLIST` - Comma-separated list of allowed API hosts
- `PROXY_API_KEY_HEADER` - Header name for API authentication
- `PROXY_API_KEY_VALUE` - API key or token value
- `PROXY_INJECT_HEADERS_JSON` - Additional headers as JSON object

### Security

For production deployments, use the security hardening script:

```bash
chmod +x production-security-hardening.sh
./production-security-hardening.sh
```

## Troubleshooting

### Build Errors

If you encounter build errors:

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Port Already in Use

If port 3000 is already in use:

```bash
# Use a different port
PORT=3001 npm run dev
```

### Swagger UI Not Loading

Ensure the OpenAPI specification is valid YAML and accessible at the configured `specUrl`.

## Support

For issues or questions, please contact:
- **Email:** michael.and.mary@gmail.com
- **GitHub Issues:** https://github.com/michaelrajkumar/Merchante-api-docs-site/issues

## License

Copyright © 2025 Michael David. All rights reserved.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- API testing powered by [Swagger UI](https://swagger.io/tools/swagger-ui/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
