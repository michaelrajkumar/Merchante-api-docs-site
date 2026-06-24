# MerchantE API Docs (Stripe-style)

This is a Next.js site that renders interactive, Stripe-like API reference pages (with **Try it out**) from OpenAPI specs using **Swagger UI**.

## What’s included

- Stripe-like shell (header + docs landing page)
- `/api-reference/[api]` route for each API
- Swagger UI–based interactive API reference (request builder, responses)
- A built-in **proxy API** at `/api/proxy` to avoid CORS issues in the browser

## Run locally

```bash
cd merchant-e-docs-site
npm install
npm run dev
```

Then open:
- Home: `http://localhost:3000/`
- Payment Gateway API Reference: `http://localhost:3000/api-reference/payment-gateway`

### Stripe-style reference layout

The Payment Gateway reference is rendered in a **Stripe-style 3-column layout**:
- Left: endpoint list
- Center: human-readable docs + field tables
- Right: Swagger UI “Try it out” panel (single operation)

Deep links look like:
`/api-reference/payment-gateway/sale`, `/refund`, `/void`, etc.

## Add the remaining 7 APIs

1. Drop each OpenAPI file into:

```
public/openapi/
```

2. Wire it in `lib/apis.ts` by setting `specUrl` for each API key.

## Configure the Try-it Proxy (recommended)

Swagger UI runs in the browser. This project routes all “Try it out” requests through a server-side proxy so you don’t need CORS enabled on upstream environments.

### Environment variables (`.env.local`)

```bash
# Optional allowlist (comma-separated hosts). If unset, all hosts are allowed (dev-friendly).
PROXY_ALLOWLIST=api.sandbox.example.com,api.example.com

# Optional: inject a single header into every proxied request
PROXY_API_KEY_HEADER=Authorization
PROXY_API_KEY_VALUE=Bearer <token>

# Optional: inject multiple headers as a JSON object
PROXY_INJECT_HEADERS_JSON={"X-Example":"value"}
```

> Tip: If your upstream supports CORS and you’re OK with browser-side auth, you can remove the request interceptor from `ApiRefClient.tsx` and call the API directly.

## Notes

- The Payment Gateway spec is already included at `public/openapi/payment-gateway.yaml`.
- The other APIs are scaffolded in the UI and marked “soon” until you add their specs.

