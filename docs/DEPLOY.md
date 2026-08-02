# Deploy to Cloudflare Pages

Target URL: **https://schedule.nsclassical.com**

## Recommended: GitHub Actions deploy

Every push to `main` runs tests, builds with Supabase credentials, and deploys `dist/` to Cloudflare Pages via Wrangler (see `.github/workflows/ci.yml`).

### 1. Create a Cloudflare API token

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → profile → **My Profile** → **API Tokens**
2. **Create Token** → **Edit Cloudflare Workers** template (includes Pages)
3. Permissions needed:
   - **Account** → **Cloudflare Pages** → **Edit**
   - **Account** → **Account Settings** → **Read**
4. Copy the token

Find your **Account ID** on any zone overview page (right sidebar) or Workers & Pages overview.

### 2. Add GitHub repository secrets

Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `SUPABASE_URL` | `https://bnrlcpemxjkisnejqcbq.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon public key |

Set from CLI (run locally — do not commit values):

```bash
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set SUPABASE_URL --body "$(grep SUPABASE_URL .env | cut -d= -f2-)"
gh secret set SUPABASE_ANON_KEY --body "$(grep SUPABASE_ANON_KEY .env | cut -d= -f2-)"
```

### 3. First deploy

Merge to `main` (or push this branch). The **deploy** job creates the Pages project `nscs-sched` on first run if it does not exist.

Check: **GitHub Actions** → latest workflow → **deploy** job → deployment URL (`nscs-sched.pages.dev`).

### 4. Custom domain

Cloudflare Dashboard → **Workers & Pages** → **nscs-sched** → **Custom domains** → **Set up a custom domain** → `schedule.nsclassical.com`

If `nsclassical.com` DNS is in the same Cloudflare account, the CNAME is added automatically.

Manual DNS (if needed):

| Type | Name | Target |
|------|------|--------|
| CNAME | `schedule` | `nscs-sched.pages.dev` |

### 5. Verify production

- [ ] Login screen at `https://schedule.nsclassical.com` (or `*.pages.dev` before DNS)
- [ ] Invited Supabase user can sign in
- [ ] Save plan persists across browsers
- [ ] PDF download works
- [ ] Page source shows `<meta name="app-version" content="1.2.x">`

---

## Alternative: Cloudflare Git integration

Connect the repo in the dashboard instead of GitHub Actions:

| Setting | Value |
|---------|-------|
| Production branch | `main` |
| Build command | `npm install && npm run build` |
| Build output directory | `dist` |
| Node.js version | 20 |

**Environment variables** (Production):

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public key |

Do **not** set `NSCS_TEST_MODE` in production.

If using Git integration, disable the `deploy` job in `.github/workflows/ci.yml` to avoid double deploys.

---

## Manual deploy (local)

Requires `wrangler login` once:

```bash
cp .env.example .env   # fill SUPABASE_URL + SUPABASE_ANON_KEY
npm run deploy
```

Or:

```bash
SUPABASE_URL=... SUPABASE_ANON_KEY=... npm run build
npx wrangler pages deploy dist --project-name=nscs-sched
```

---

## Supabase (already done)

Migrations and seed should be applied before first production use. See [supabase/README.md](../supabase/README.md).
