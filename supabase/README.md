# Supabase setup

## 1. Create project

Create a project at [supabase.com](https://supabase.com) (region: `us-east-1` recommended for Illinois).

## 2. Run migration

Open **SQL Editor** and run [`migrations/001_plans.sql`](migrations/001_plans.sql).

## 3. Auth (invite-only)

**Authentication → Providers → Email**

- Enable Email
- Disable **Allow new users to sign up**

Invite schedulers via **Authentication → Users → Invite user**.

## 4. API keys

**Project Settings → API**

- `SUPABASE_URL` → Project URL
- `SUPABASE_ANON_KEY` → anon public key

Add these to Cloudflare Pages build environment variables and local `.env` (see `.env.example`).

Never commit the `service_role` key.

## 5. Seed initial plan

After first deploy (or locally with credentials):

```bash
npm run seed
```

Or insert manually via SQL using exported plan JSON.
