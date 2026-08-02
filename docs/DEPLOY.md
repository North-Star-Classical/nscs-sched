# Deploy — Netlify (now) → Cloudflare (later)

**Now:** Netlify (`*.netlify.app`)  
**Later:** `https://schedule.nsclassical.com` on Cloudflare Pages (DNS stays in Cloudflare)

---

## Netlify setup (temporary)

### 1. Connect GitHub

1. [Netlify](https://app.netlify.com/) → **Add new site** → **Import an existing project**
2. **GitHub** → org **North-Star-Classical** → repo **nscs-sched**
3. Branch: **`main`**

Netlify reads `netlify.toml` automatically:

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node.js | 20 |

### 2. Environment variables

**Site configuration** → **Environment variables** → **Add a variable** (Production):

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://bnrlcpemxjkisnejqcbq.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon public key |

Do **not** set `NSCS_TEST_MODE`.

Trigger **Deploy site** after saving variables.

### 3. Supabase Auth URLs

**Authentication** → **URL configuration** → add your Netlify URL:

- **Site URL:** `https://YOUR-SITE.netlify.app`
- **Redirect URLs:** `https://YOUR-SITE.netlify.app/**`

Required for magic-link sign-in and password reset emails to redirect back to the app.

(Replace with your actual Netlify subdomain after first deploy.)

### 4. Verify

- [ ] Login screen on `https://YOUR-SITE.netlify.app`
- [ ] Invited user can sign in (password or magic link)
- [ ] Password reset email arrives and update flow works
- [ ] Save plan persists across browsers
- [ ] PDF download works
- [ ] `<meta name="app-version">` shows current version

### 5. CLI deploy (optional)

```bash
netlify login
netlify init          # link this repo to a Netlify site
npm run build         # with .env or exported SUPABASE_* vars
netlify deploy --prod --dir=dist
```

---

## Cloudflare Pages (later — custom domain)

When ready to move `schedule.nsclassical.com`:

1. Deploy to Cloudflare (see below)
2. In **Cloudflare DNS** for `nsclassical.com`:
   - Change `schedule` CNAME from Netlify target → `nscs-sched.pages.dev`
3. Remove or pause the Netlify site (optional)
4. Update Supabase **Site URL** / **Redirect URLs** to `https://schedule.nsclassical.com`

---

## Cloudflare Pages (later)

GitHub Actions deploy is prepared but **disabled** in CI until Cloudflare secrets are added.

### Enable when ready

1. Add GitHub secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
2. Uncomment the `deploy` job in `.github/workflows/ci.yml`
3. Merge / push to `main`

### Cloudflare API token

Dashboard → **My Profile** → **API Tokens** → **Edit Cloudflare Workers** template

### Custom domain on Cloudflare

**Workers & Pages** → **nscs-sched** → **Custom domains** → `schedule.nsclassical.com`

| Type | Name | Target |
|------|------|--------|
| CNAME | `schedule` | `nscs-sched.pages.dev` |

---

## Supabase

Database migrations and seed are already applied. See [supabase/README.md](../supabase/README.md).
