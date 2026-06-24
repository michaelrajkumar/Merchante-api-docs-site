# Project Context

## About
Merchant e-Docs site - API documentation portal for MerchantE Solutions.
Built with Next.js 14, Tailwind CSS, and Swagger UI for interactive API testing.

## Tech Stack
- Next.js 14 (App Router)
- Tailwind CSS for styling
- Swagger UI React for interactive "Try it out" panels
- TypeScript
- YAML parsing for OpenAPI specs

## APIs Documented
- Payment Gateway
- Account Updater
- Partner Portal

## Project Structure
- `app/` - Next.js app router pages
- `app/api-reference/` - API documentation pages
- `components/` - Reusable UI components
- `lib/` - Utility functions and API helpers
- `public/` - Static assets including OpenAPI YAML specs

## Notes
- Swagger UI (~100MB with dependencies) is intentionally kept for interactive API testing
- The redundant `swagger-ui` package in package.json can be removed (swagger-ui-react includes it)
- More APIs to be added

## Owner
Muthuswamy D.
