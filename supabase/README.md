# Supabase setup

## 1. Create project

Create a project at [supabase.com](https://supabase.com) (region: `us-east-1` recommended for Illinois).

## 2. Run migration

Open **SQL Editor** and run migrations in order:

1. [`migrations/001_plans.sql`](migrations/001_plans.sql) — plans + autosaves
2. [`migrations/002_blocks_teachers_tables.sql`](migrations/002_blocks_teachers_tables.sql) — `plan_blocks` + `plan_teachers` (migrates existing JSON data)

## 3. Auth (invite-only)

**Authentication → Providers → Email**

- Enable Email
- Enable **Confirm email** (recommended for magic links)
- Disable **Allow new users to sign up**

**Authentication → URL configuration**

- **Site URL:** your deployed app URL (e.g. `https://nscschedule.netlify.app`)
- **Redirect URLs:** same URL with wildcard, e.g. `https://nscschedule.netlify.app/**`

Magic links and password reset emails redirect back to the app using this URL.

Invite schedulers via **Authentication → Users → Invite user**.

Sign-in options in the app:

- Email + password
- Magic link (one-time email link)
- Forgot password → reset link → set new password

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
