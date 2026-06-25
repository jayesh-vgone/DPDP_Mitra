# Deployment Guide — EduPrivacy AI (Vercel + Render + Supabase)

> **Scope:** Frontend → Vercel, Backend → Render, Database → Supabase (already provisioned).
> This document covers the full deployment setup and the results of a codebase audit
> run on 2026-06-25. Follow the steps in order; each section lists exactly which
> environment variables to set and why.

---

## Table of Contents
1. [Pre-flight: Things to have ready](#1-pre-flight-things-to-have-ready)
2. [Code changes made during this audit](#2-code-changes-made-during-this-audit)
3. [Render (backend) setup](#3-render-backend-setup)
4. [Vercel (frontend) setup](#4-vercel-frontend-setup)
5. [Post-deploy wiring](#5-post-deploy-wiring)
6. [Environment variable reference](#6-environment-variable-reference)
7. [CORS and session-cookie behaviour](#7-cors-and-session-cookie-behaviour)
8. [Database connection](#8-database-connection)
9. [Things that will break if you skip them](#9-things-that-will-break-if-you-skip-them)
10. [Known gaps and deferred items](#10-known-gaps-and-deferred-items)

---

## 1. Pre-flight: Things to have ready

| What | Where to get it |
|------|----------------|
| Supabase direct connection string | Supabase dashboard → Project Settings → Database → **Connection string** tab → **URI** mode. Ensure the string uses **port 5432** (direct), NOT the 6543 pooler. It ends with `?sslmode=require` — keep that. |
| Groq API key | console.groq.com → API Keys |
| Cohere API key | cohere.com → API Keys |
| Resend API key | resend.com → API Keys (leave unset for now — see §10) |
| Vercel account | vercel.com |
| Render account | render.com |

---

## 2. Code changes made during this audit

These are already applied in the repo. Listed here so you know what changed and why.

### 2a. `backend/middleware/auth.py` — `/internal-audit` added to SKIP_PREFIXES
**Severity: production-breaking if not fixed.**

The JWT middleware (`AuthMiddleware`) runs on every request in production (`APP_ENV=production`). Routes that use first-party session-cookie auth (not Bearer-token JWT) must be in `SKIP_PREFIXES`, otherwise the middleware returns `401` before the route's own `Depends(get_session_user)` ever runs.

The `/internal-audit` prefix was missing from the list. All other session-auth routes were correctly listed (`/chat`, `/conversations`, `/assessment`, `/profile`, `/action-items`). Added `/internal-audit` to match the rest.

### 2b. `render.yaml` — Render-managed Postgres removed; Supabase is the database
The previous `render.yaml` had a `databases:` block that would spin up a new Render-managed Postgres on Blueprint deploy. Since the database is already on Supabase, that block was removed and `DATABASE_URL` changed from `fromDatabase:` to `sync: false` (meaning: set it manually in the Render dashboard).

Also added missing env vars: `EMAIL_VERIFICATION_ENABLED`, `RESEND_API_KEY`.

---

## 3. Render (backend) setup

### 3a. Create the service

1. Log in to Render → **New → Blueprint**.
2. Connect your GitHub repo. Render will find `render.yaml` at the root and configure the `dpdp-backend` web service automatically.
3. Click **Apply Blueprint**.

### 3b. Set secret environment variables

After the Blueprint is applied, go to the **dpdp-backend** service → **Environment** tab. The `render.yaml` marks the following as `sync: false` — they must be set here manually:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Supabase direct connection string (see §8) |
| `GROQ_API_KEY` | Your Groq API key |
| `COHERE_API_KEY` | Your Cohere API key |
| `CORS_ORIGINS` | Your Vercel URL once known, e.g. `https://eduprivacy.vercel.app` |
| `RESEND_API_KEY` | Leave unset for now (email verification is disabled — see §10) |

Click **Save Changes** — Render will trigger a redeploy automatically.

### 3c. Region selection

Render does not have an India region. **Select Singapore (`sgp`) as the closest available region.** This is a known data-residency gap documented in §10 — this deployment is for MVP/demo use, not production institutional data.

### 3d. Run DB bootstrap and seeds (first deploy only)

After the first successful deploy, open the Render **Shell** tab for `dpdp-backend` and run the following in order. These are idempotent — safe to re-run if you're unsure whether they've been applied to the Supabase instance.

```bash
# Apply any pending schema migrations
python scripts/migrate_phase5.py
python scripts/migrate_phase6a.py
python scripts/migrate_admin_questions.py
python scripts/migrate_action_items.py
python scripts/migrate_institution_details.py
python scripts/migrate_internal_audit.py
python scripts/migrate_email_otp.py
python scripts/migrate_doc_types.py

# Seed reference data (idempotent)
python scripts/seed_institutions.py
python scripts/seed_questions.py
python scripts/seed_admin.py
```

> **Note:** If you've been running locally against this same Supabase instance, many
> of these will already be applied. The scripts use `ADD COLUMN IF NOT EXISTS` / `ON
> CONFLICT DO NOTHING` patterns — running them again is safe.

### 3e. Verify the health endpoint

Once deployed:
```
GET https://<your-service>.onrender.com/health
```
Should return:
```json
{"status": "ok", "service": "DPDP Mitra API", "version": "2.0.0"}
```

---

## 4. Vercel (frontend) setup

### 4a. Create the project

1. Log in to Vercel → **Add New → Project**.
2. Import your GitHub repo.
3. Set **Root Directory** to `frontend` (Vercel should auto-detect Next.js from `package.json`).
4. Build command: `npm run build` (auto-detected).
5. Output directory: `.next` (auto-detected for Next.js).

### 4b. Set environment variables

In the Vercel project settings → **Environment Variables**:

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` | Use the proxy path, not the Render URL directly. See §7. |

> `NEXT_PUBLIC_*` variables are **baked into the build at compile time**. Changing this
> variable requires a new deploy — just updating the Vercel env var is not enough, you
> must trigger a redeploy.

### 4c. Update `vercel.json` with the actual Render URL

`frontend/vercel.json` currently contains a placeholder:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://REPLACE-WITH-YOUR-BACKEND.onrender.com/:path*"
    }
  ]
}
```

Replace `REPLACE-WITH-YOUR-BACKEND` with your actual Render service hostname (e.g. `dpdp-backend-xxxx`). Commit and push — Vercel will automatically redeploy.

### 4d. Dev command note

`package.json` runs `next dev --turbo` (Turbopack) for local development. Turbopack is **only used for `npm run dev`** — the production build uses the standard Next.js compiler (`next build`), which is what Vercel runs. No Turbopack config bleeds into production.

---

## 5. Post-deploy wiring

After both Render and Vercel are deployed:

1. **Add the Vercel URL to `CORS_ORIGINS` on Render:**
   Render dashboard → dpdp-backend → Environment → set `CORS_ORIGINS=https://your-app.vercel.app`.
   This is a precaution; with the `/api` proxy in `vercel.json`, preflight requests never leave the browser, but setting it is correct defensive practice.

2. **Test the auth flow end-to-end:**
   - Register a new account
   - Confirm the session cookie is scoped to `vercel.app` (not `onrender.com`) — the proxy keeps it first-party
   - Log out and log back in

3. **Warm-start note:** Render free tier spins down after ~15 minutes of inactivity. First request after idle takes ~60 seconds. This is expected behaviour on the free plan.

---

## 6. Environment variable reference

### Backend (`render.yaml` / Render dashboard)

| Variable | Secret? | Value for production |
|---|---|---|
| `APP_ENV` | No | `production` |
| `DATABASE_URL` | **Yes** | Supabase direct URI (port 5432, `?sslmode=require`) |
| `GROQ_API_KEY` | **Yes** | From console.groq.com |
| `COHERE_API_KEY` | **Yes** | From cohere.com |
| `RESEND_API_KEY` | **Yes** | From resend.com — leave unset until domain verified |
| `CORS_ORIGINS` | No | `https://your-app.vercel.app` |
| `COOKIE_SECURE` | No | `true` |
| `COOKIE_SAMESITE` | No | `none` |
| `JWT_SECRET` | **Yes** | Auto-generated by Render (`generateValue: true`) |
| `LLM_PROVIDER` | No | `groq` |
| `STT_PROVIDER` | No | `groq` |
| `TTS_PROVIDER` | No | `browser` |
| `EMBEDDING_PROVIDER` | No | `cohere` |
| `EMAIL_VERIFICATION_ENABLED` | No | `false` (see §10) |

### Frontend (Vercel project settings)

| Variable | Secret? | Value |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | No | `/api` |

---

## 7. CORS and session-cookie behaviour

### Recommended: Vercel `/api` rewrite-proxy (what `vercel.json` implements)

```
Browser → https://your-app.vercel.app/api/auth/login
   → Vercel proxy → https://dpdp-backend.onrender.com/auth/login
```

**Effect on cookies:**
- The browser sees `vercel.app/api/...` as same-origin. No CORS preflight is triggered.
- `Set-Cookie` from the backend response is forwarded to the browser by Vercel's proxy, and the browser scopes it to `vercel.app` — first-party, no cross-site restrictions.
- Vercel forwards the `Cookie` header on all subsequent proxied requests, so the session cookie reaches the backend correctly.
- `COOKIE_SAMESITE=none` with this setup is more permissive than needed (you could use `lax`), but it is not harmful.

**Effect on CORS:**
- The browser never sends a request with `Origin: https://your-app.vercel.app` to the backend — Vercel's server does. No CORS middleware intervention required. Setting `CORS_ORIGINS` is still good defensive practice.

### Alternative: direct backend calls (skip the proxy)

If you set `NEXT_PUBLIC_API_URL=https://dpdp-backend.onrender.com` in Vercel:
- Browser sends requests directly to `onrender.com` — cross-origin.
- **CORS:** `CORS_ORIGINS` must include `https://your-app.vercel.app`.
- **Cookies:** Must be `SameSite=None; Secure` — the `render.yaml` already sets this correctly.
- **Warning:** Safari blocks third-party cookies by default; cross-origin session cookie auth will not work for Safari users with this approach. The proxy avoids this entirely.

**The proxy is strongly recommended.**

---

## 8. Database connection

### Which connection string to use

Supabase offers two connection endpoints:

| Type | Port | When to use |
|---|---|---|
| **Direct** (what we use) | **5432** | Long-running processes with a persistent connection pool (asyncpg, this backend) |
| Pooler (pgbouncer) | 6543 | Serverless/stateless functions that open a new connection on every request |

The backend uses asyncpg with `min_size=2, max_size=10` — always use the **direct** connection (port 5432). Using the transaction-mode pooler (6543) with asyncpg can break prepared statements and session-scoped features.

### Where to find the connection string

Supabase dashboard → your project → **Project Settings** → **Database** → **Connection string** tab → select **URI** mode → ensure **Display connection pooler** is **OFF** (or choose the "Session mode" entry if the UI shows both). Copy the URI — it looks like:

```
postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres?sslmode=require
```

Paste this as `DATABASE_URL` in the Render dashboard.

### Connection limit

Pool is `min_size=2, max_size=10`. Supabase free tier allows ~60 direct connections. Fine for a single backend instance. If you ever run multiple Render instances or move to a serverless deployment, switch to the session-mode pooler (port 5432 on the pooler host — a `.env`-only change).

---

## 9. Things that will break if you skip them

| What | Symptom if skipped | Section |
|---|---|---|
| Add `DATABASE_URL` in Render dashboard | Backend starts but crashes on first DB request | §3b |
| Update `vercel.json` with real Render URL | All API calls from the frontend return 404 | §4c |
| Set `APP_ENV=production` on Render | JWT middleware runs in dev-bypass mode in production; `dev-user-001` can access any account | §6 |
| Set `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none` on Render | Session cookies not sent cross-origin; login appears to succeed but every subsequent request is 401 | §7 |
| `/internal-audit` in `SKIP_PREFIXES` (already fixed in code) | All `/internal-audit/*` requests return 401 in production | §2a |
| Redeploy after changing `NEXT_PUBLIC_API_URL` | Old build still points at `localhost:8000` | §4b |

---

## 10. Known gaps and deferred items

### Data residency — Render has no India region

Render's nearest available region is Singapore. All user data (conversations, assessments, session tokens) processed by the Render backend passes through Singapore servers before being stored in Supabase.

**This deployment is suitable for MVP and demo purposes only.** For production institutional data under DPDP Act obligations, the architecture must migrate to a provider with an India-region presence. The planned solution is Phase 10: migrate to E2E Networks VM, Mumbai with self-hosted LLM (Sarvam 30B via Ollama), STT (Sarvam Saaras v3), and TTS (Sarvam Bulbul v3). That migration is a `.env`-only swap if the provider interfaces remain unchanged.

### Email OTP verification — currently disabled

`EMAIL_VERIFICATION_ENABLED=false` in `render.yaml`. The full OTP flow (registration blocks until email verified; login blocks unverified accounts) is implemented and working, but the Resend `from` address (`noreply@eduprivacy.ai`) uses a placeholder domain that hasn't been verified in Resend.

To re-enable once a domain is verified:
1. Verify the domain in the Resend dashboard.
2. Update `_FROM_ADDRESS` in `backend/providers/email_sender.py` to use the verified domain.
3. Set `RESEND_API_KEY` in the Render dashboard.
4. Change `EMAIL_VERIFICATION_ENABLED` to `true` in the Render dashboard (or in `render.yaml` before the next deploy).
5. No migration required — the `users.email_verified` column and `email_otps` table are already live in Supabase.

### Render free tier cold starts

The free plan spins down the service after ~15 minutes of inactivity. First request after spin-down takes approximately 60 seconds. This is expected. Upgrade to a paid plan to eliminate cold starts.

### Vercel preview deployments and CORS

Vercel auto-generates unique URLs for every branch deploy (e.g. `eduprivacy-git-feature-xyz.vercel.app`). These preview URLs are not known in advance and therefore cannot be added to `CORS_ORIGINS` proactively. With the `/api` proxy approach this is not a problem (no CORS headers needed). If you ever switch to direct backend calls, you'll need to either wildcard the CORS origin (not recommended for production) or add preview URLs manually.
