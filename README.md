# Badel Group Platform

Padel tournament platform with Clerk authentication, Neon Postgres database, and Vercel deployment.

## Stack

- **Next.js 15** — App Router, Server Actions
- **Clerk** — Authentication (Visitor + Admin roles)
- **Neon Postgres** — Database via Drizzle ORM
- **Vercel** — Hosting
- **Tailwind CSS** — Badel Group branding (dark orange + logo)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `DATABASE_URL` | Vercel → Storage → Neon Postgres |

### 3. Database

Run the migration SQL in `drizzle/0000_init.sql` against your Neon database, then seed:

```bash
npm run db:seed
```

### 4. Create an admin user

1. Sign up at `/sign-up`
2. In [Clerk Dashboard](https://dashboard.clerk.com) → Users → select user
3. Edit **Public metadata**: `{ "role": "admin" }`
4. Sign in and visit `/admin`

### 5. Run locally

```bash
npm run dev
```

## Deploy to Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com/new)
3. Add environment variables (Clerk keys + `DATABASE_URL`)
4. Deploy

## Pages

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Homepage |
| `/gallery` | Public | Tournament photos |
| `/results` | Public | Past winners |
| `/sponsors` | Public | Sponsor tiers |
| `/signup` | Public | Tournament registration |
| `/sign-in` | Public | Clerk sign in |
| `/admin` | Admin only | Manage platform |
