# Deploy to Cloudflare Pages

Target URL: **https://schedule.nsclassical.com**

## 1. Connect GitHub

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Select org **North-Star-Classical** → repo **nscs-sched**

| Setting | Value |
|---------|-------|
| Production branch | `main` |
| Build command | `npm install && npm run build` |
| Build output directory | `dist` |
| Node.js version | 20 |

## 2. Environment variables

Pages → **Settings** → **Environment variables** (Production):

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public key |

Do **not** set `NSCS_TEST_MODE` in production.

## 3. Custom domain

Pages → **Custom domains** → **Set up a custom domain** → `schedule.nsclassical.com`

If DNS is in the same Cloudflare account, the CNAME is added automatically.

Manual DNS (if needed):

| Type | Name | Target |
|------|------|--------|
| CNAME | `schedule` | `<project>.pages.dev` |

## 4. Verify

- [ ] Login screen appears at `https://schedule.nsclassical.com`
- [ ] Invited user can sign in
- [ ] Save plan persists across browsers
- [ ] PDF download works

## 5. Seed production data

After migration SQL is applied:

```bash
node scripts/extract-seed.mjs   # refresh seed JSON from App.jsx
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
```

Then invite users in Supabase Dashboard → Authentication → Users.
