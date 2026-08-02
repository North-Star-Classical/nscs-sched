# NSCS Schedule Planner — AYE 2027

Schedule planning tool for North Star Classical Christian School's first full K–12 year.

**Production:** Netlify (temporary) → [schedule.nsclassical.com](https://schedule.nsclassical.com) on Cloudflare later  
**Repository:** [github.com/North-Star-Classical/nscs-sched](https://github.com/North-Star-Classical/nscs-sched) (private)

Authenticated users share schedules via **Supabase** (Postgres + invite-only Auth). The app ships as a static build in `dist/index.html`.

## Quick start (developers)

```bash
git clone https://github.com/North-Star-Classical/nscs-sched.git
cd nscs-sched
npm install
cp .env.example .env   # add SUPABASE_URL + SUPABASE_ANON_KEY for production builds
npm run build
npm run test:all
```

Open `dist/index.html` locally (or serve with `python3 -m http.server` in `dist/`).

## Project layout

```
src/App.jsx            Main schedule UI (~1,900 lines)
src/storage.js         Supabase / in-memory persistence adapter
src/auth.js            Invite-only login gate
src/bootstrap.js       Build-time config injection
scripts/build.mjs      JSX → dist/index.html
scripts/seed.mjs       Seed default plan to Supabase (service role)
supabase/migrations/   SQL schema + RLS policies
dist/                  Built output (index.html for Cloudflare Pages)
test/                  Smoke + 41-check e2e suite
docs/DEPLOY.md         Cloudflare Pages + custom domain setup
```

## Architecture

- **UI:** React 18 (single component), Tailwind 2, html2pdf
- **Auth:** Supabase Auth — email/password, invite-only (disable public sign-up)
- **Data:** `plans` + `plan_autosaves` tables with RLS (authenticated read/write)
- **Deploy:** Netlify from `main` now; Cloudflare Pages for custom domain later — see [docs/DEPLOY.md](docs/DEPLOY.md)
- **Data:** `plans`, `plan_blocks`, `plan_teachers`, `plan_autosaves` (Supabase Postgres + RLS)
- **Version:** `meta name="app-version"` in HTML + `package.json` (currently 1.2.1)

## Deploy

See [docs/DEPLOY.md](docs/DEPLOY.md) for Cloudflare Pages, `schedule.nsclassical.com`, and seeding production data.

## Supabase setup

See [supabase/README.md](supabase/README.md) — run migration SQL, disable public signup, invite users.

## Tests

```bash
npm run test:all   # builds in test mode (no Supabase required), 41 checks
```

CI runs the same suite on push to `main` via GitHub Actions.
