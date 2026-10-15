# Dairy Store

Next.js + React + TypeScript + Tailwind CSS + Supabase starter for a dairy products e-commerce website.

## Stack
- Next.js App Router
- React
- TypeScript
- Tailwind CSS v4
- Supabase (database + authentication)

## Structure
- `app/` — routes, pages and API endpoints
- `components/` — reusable UI, layout and product components
- `lib/` — infrastructure/helpers such as Supabase clients
- `services/` — business/data-access operations
- `hooks/` — reusable React hooks
- `store/` — client-side application state
- `types/` — shared TypeScript types
- `validations/` — input validation schemas
- `supabase/` — database migrations and seed files
- `public/` — static assets

## Start

1. Copy `.env.example` to `.env.local` and add your Supabase project values.
2. Run `npm install`.
3. Run `npm run dev`.

Do not commit `.env.local` or any Supabase service-role secret.
