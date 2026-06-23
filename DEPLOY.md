# Deploying EduPrivacy AI (DPDP Mitra)

This guide deploys the app as **two services**:

| Piece | Platform | What it is |
|-------|----------|------------|
| Frontend | **Vercel** | The Next.js app in `frontend/` |
| Backend | **Render** | The FastAPI app in `backend/` (Web Service) |
| Database | **Render** | Managed PostgreSQL **16** with the `pgvector` extension |

```
Browser
  │  https://<your-app>.vercel.app
  ▼
Vercel (Next.js)  ──/api/*  rewrite (proxy)──►  Render Web Service (FastAPI)
                                                      │
                                                      ▼
                                            Render PostgreSQL + pgvector
```

The **recommended** setup proxies API calls through Vercel (`/api/*` → Render) so the
session cookie stays **first-party** — this avoids the single most common failure mode of
split deployments (cross-site cookies being silently dropped). A direct cross-origin
alternative is documented at the end.

---

## 0. What was already prepared for you

These deployment files/changes are already in the repo — you don't need to write them:

- **`render.yaml`** — Render Blueprint (backend Web Service + Postgres + env vars).
- **`frontend/vercel.json`** — Vercel rewrite proxying `/api/*` to the backend (you edit one URL).
- **`backend/scripts/bootstrap_db.py`** — applies the full schema (`db/init.sql`) to a fresh DB.
- **`backend/db/init.sql`** — complete schema (all tables incl. `action_items`, institution
  detail/verification columns) — a fresh DB needs only this, no migrations.
- **Production-safe cookies** — `COOKIE_SECURE` / `COOKIE_SAMESITE` are env-driven
  (`backend/config.py`), so cross-site auth can be enabled without code changes.
- **Auth middleware** — first-party routes skip the reserved JWT gate, so the app works
  with `APP_ENV=production` (it authenticates via session cookies, not JWT).

---

## 1. Prerequisites

1. The code pushed to a **GitHub repo** (Vercel and Render both deploy from Git).
2. A **[Render](https://render.com)** account.
3. A **[Vercel](https://vercel.com)** account.
4. API keys (free tiers):
   - **`GROQ_API_KEY`** — https://console.groq.com (LLM + speech-to-text). **Required.**
   - **`COHERE_API_KEY`** — https://cohere.com (RAG embeddings). **Required** if you want
     grounded chat answers; the backend validates providers at startup, so it must be set.
5. (Optional, for grounded chat) the DPDP Act PDF present at `backend/docs/dpdp_act.pdf`
   committed to the repo, so `ingest_dpdp.py` can build embeddings.

> **Note on cost:** Render's **free** Postgres expires after **30 days** and the **free**
> Web Service **spins down after ~15 min idle** (first request then cold-starts in ~1 min).
> Fine for a demo; pick paid plans for anything real.

---

## 2. Deploy the backend + database on Render

### 2.1 Create the Blueprint

1. In Render: **New → Blueprint**.
2. Connect your GitHub repo. Render detects **`render.yaml`** at the repo root.
3. Review the plan — it creates:
   - `dpdp-postgres` (PostgreSQL 16)
   - `dpdp-backend` (Python Web Service, root dir `backend/`)
4. Click **Apply**. The `DATABASE_URL` is wired into the backend automatically
   (`fromDatabase` in `render.yaml`), and `JWT_SECRET` is auto-generated.

### 2.2 Set the secret env vars

The Blueprint marks three values as `sync: false` (not in git). In the **dpdp-backend**
service → **Environment**, add:

| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | your Groq key |
| `COHERE_API_KEY` | your Cohere key |
| `CORS_ORIGINS` | your Vercel URL, e.g. `https://eduprivacy.vercel.app` (you'll know it after step 3; can be set/updated later) |

Already set for you by the Blueprint (no action needed): `APP_ENV=production`,
`COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`, `LLM_PROVIDER=groq`, `STT_PROVIDER=groq`,
`TTS_PROVIDER=browser`, `EMBEDDING_PROVIDER=cohere`, `PYTHON_VERSION=3.11.9`.

Save → the service redeploys.

### 2.3 Bootstrap the schema and seed data (one-off, **run from your own machine**)

The backend starts fine against an empty database, but tables must exist before requests
succeed.

> ⚠️ **Render's in-dashboard Shell is a paid feature.** On the **free** plan you can't open
> a shell on the service. The workaround — **no code changes, no paid plan** — is to run the
> same one-off scripts **locally against the database's External Connection URL** over the
> public internet. The scripts already read `DATABASE_URL` from the environment, so this is
> just a matter of pointing them at the remote DB.

**Steps:**

1. In Render → **`dpdp-postgres`** → **Connections**, copy the **External Database URL**
   (it looks like `postgresql://USER:PASS@HOST.oregon-postgres.render.com/DB`).
2. On the same page, under **Access Control**, allow your current IP (or temporarily
   `0.0.0.0/0`) so your laptop can connect. *Tighten or remove this rule when you're done.*
3. From the repo's **`backend/`** directory, using the same local Python environment you've
   run the project with (`pip install -r requirements.txt` if you haven't), point
   `DATABASE_URL` at that external URL and run the setup. **Append `?sslmode=require`** —
   Render's external endpoint requires TLS and `asyncpg` honors the `sslmode` DSN parameter.

   **Windows (PowerShell):**
   ```powershell
   cd backend
   $env:DATABASE_URL = "postgresql://USER:PASS@HOST.render.com/DB?sslmode=require"
   $env:ADMIN_EMAIL = "you@example.com"; $env:ADMIN_PASSWORD = "a-strong-password"
   $env:COHERE_API_KEY = "your_cohere_key"   # only needed for the optional ingest step
   python scripts/bootstrap_db.py
   python scripts/seed_institutions.py
   python scripts/seed_questions.py
   python scripts/seed_admin.py
   python scripts/ingest_dpdp.py             # OPTIONAL: RAG embeddings (needs the PDF too)
   ```

   **macOS / Linux (bash):**
   ```bash
   cd backend
   export DATABASE_URL="postgresql://USER:PASS@HOST.render.com/DB?sslmode=require"
   python scripts/bootstrap_db.py
   python scripts/seed_institutions.py
   python scripts/seed_questions.py
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' python scripts/seed_admin.py
   COHERE_API_KEY=your_cohere_key python scripts/ingest_dpdp.py   # OPTIONAL
   ```

- `bootstrap_db.py` runs `CREATE EXTENSION IF NOT EXISTS vector` / `uuid-ossp` — Render's
  default DB user is permitted to do this.
- All seed scripts are **idempotent** (safe to re-run).
- If you skip `seed_admin.py` it falls back to `admin@dpdp.in` / `admin12345` — **change
  this for any real deployment** by passing `ADMIN_EMAIL` / `ADMIN_PASSWORD` as shown.
- This connects to the same managed DB the backend uses, so once it completes the live app
  has its schema + seed data immediately — nothing to restart.

> **Paid-plan alternative:** if you have Render's Shell, open the **dpdp-backend** service →
> **Shell** and run the exact same `python scripts/*.py` commands there instead — using the
> service's built-in internal `DATABASE_URL` (no external URL, no `?sslmode=require`, no
> Access Control change needed).

### 2.4 Verify the backend

Open `https://<your-backend>.onrender.com/health` → expect `{"status":"ok",...}`.

Copy the backend URL — you need it for the frontend in the next step.

---

## 3. Deploy the frontend on Vercel

### 3.1 Point the proxy at your backend

Edit **`frontend/vercel.json`** and replace the placeholder host with your real Render URL:

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://dpdp-backend.onrender.com/:path*" }
  ]
}
```

Commit and push this change.

### 3.2 Create the Vercel project

1. In Vercel: **Add New → Project**, import the same GitHub repo.
2. **Root Directory: `frontend`** (important — this is a monorepo; click *Edit* and select it).
3. Framework preset: **Next.js** (auto-detected). Leave build/output settings default.
4. **Environment Variables** — add:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `/api` |

   > `/api` makes the app call its own Vercel origin, which the `vercel.json` rewrite
   > forwards to Render. Because the browser sees a same-origin request, the session
   > cookie is first-party and "just works".
   >
   > `NEXT_PUBLIC_*` vars are baked in at **build time** — if you change this later you must
   > **redeploy** (not just restart).

5. **Deploy.** Note the resulting URL, e.g. `https://eduprivacy.vercel.app`.

### 3.3 Finish CORS (only matters for the direct approach)

With the proxy, requests are same-origin and CORS is irrelevant — you can leave
`CORS_ORIGINS` as-is. (If you later switch to the direct approach, set `CORS_ORIGINS` on
Render to your exact Vercel URL and redeploy.)

---

## 4. Verification checklist

Visit `https://<your-app>.vercel.app` and confirm:

- [ ] `/login` and `/register` render with the indigo/light theme.
- [ ] **Register** with a seeded invite code (e.g. `SUNRISE-2024`) → lands on the blank
      Dashboard with the "Take an assessment" CTA.
- [ ] **Refresh the page → you stay logged in.** (This is the cross-site-cookie smoke test —
      if you get bounced to `/login` on refresh, see Troubleshooting → "401 after login".)
- [ ] Run an **assessment** → Dashboard shows the donut, category table, and an
      auto-generated **Action Queue**.
- [ ] **Chat Copilot** returns a DPDP answer (grounded with section citations only if you
      ran `ingest_dpdp.py`).
- [ ] **Admin** console at `/admin/login` works with your seeded admin credentials.
- [ ] Toggle **dark mode** — theme is legible.

---

## 5. The two networking approaches

### A) Vercel rewrite proxy — **recommended** (what this guide uses)
- `frontend/vercel.json` rewrites `/api/*` → Render; `NEXT_PUBLIC_API_URL=/api`.
- Browser sees same-origin → session cookie is **first-party** → no CORS, survives
  Safari/Chrome third-party-cookie restrictions.
- Caveat: very large request bodies (e.g. long voice clips) pass through Vercel's proxy and
  may hit platform limits; if that bites, use approach B for `/voice`.

### B) Direct cross-origin — alternative
- `NEXT_PUBLIC_API_URL=https://<backend>.onrender.com` (no `vercel.json` proxy needed).
- Backend **must** have `COOKIE_SAMESITE=none`, `COOKIE_SECURE=true` (already set by the
  Blueprint) **and** `CORS_ORIGINS=https://<your-app>.vercel.app`.
- The session cookie is then **third-party**: works in Chrome/Firefox today, **blocked by
  Safari** and being phased out in Chrome. Prefer approach A.
- The most robust long-term variant of B is custom subdomains of one parent domain
  (`app.example.com` + `api.example.com`) so the cookie is same-site with `SameSite=Lax`.

---

## 6. Troubleshooting

**Login succeeds but every page bounces me back to `/login` (401 on refresh).**
The session cookie isn't being stored/sent. Check: (1) you're on the **proxy** approach with
`NEXT_PUBLIC_API_URL=/api` and `vercel.json` pointing at the right backend; or (2) on the
direct approach, that the backend has `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`, and
`CORS_ORIGINS` exactly matches your Vercel origin. In your browser devtools → Application →
Cookies, confirm a `dpdp_session` cookie exists for the Vercel domain.

**CORS error in the browser console.** Only happens on the direct approach. `CORS_ORIGINS`
must list the **exact** scheme+host (`https://eduprivacy.vercel.app`, no trailing slash).
The proxy approach has no CORS at all.

**`relation "users" does not exist` / 500s on every API call.** You didn't run
`bootstrap_db.py` (+ seeds). Re-run step 2.3 (from your machine against the External DB URL).

**`extension "vector" is not available`.** The DB plan/region doesn't include pgvector.
Render's managed Postgres supports it on all plans/regions — make sure you created the DB
via this Blueprint (Postgres **16**) and re-run `bootstrap_db.py`.

**First request after idle takes ~1 minute.** Expected on Render's **free** Web Service
(cold start after spin-down). Upgrade the plan to keep it warm.

**Backend deploy fails at startup with a provider error.** The lifespan validates providers
eagerly — set `GROQ_API_KEY` and `COHERE_API_KEY` (or temporarily set
`EMBEDDING_PROVIDER=mock` / `LLM_PROVIDER=mock` to boot without keys, with degraded chat).

**Chat answers aren't citing DPDP sections.** You haven't ingested embeddings — run
`python scripts/ingest_dpdp.py` (locally against the External DB URL, as in step 2.3; needs
`backend/docs/dpdp_act.pdf` and a valid `COHERE_API_KEY`). Embeddings persist in Postgres, so
this is a one-off.

**`asyncpg` can't connect to the external DB / SSL or timeout errors.** Make sure you (a)
appended `?sslmode=require` to the External URL, and (b) allowed your IP under the DB's
**Access Control** in Render. The *internal* `DATABASE_URL` (the one the deployed backend
uses) is **not** reachable from your laptop — you must use the **External** URL for step 2.3.

**I changed `NEXT_PUBLIC_API_URL` but nothing changed.** It's compiled in at build time —
trigger a **Redeploy** in Vercel.

---

## 7. Updating after the initial deploy

- **Code changes:** push to GitHub. Vercel and Render both auto-deploy on push to the
  connected branch.
- **Schema changes:** re-run `python scripts/bootstrap_db.py` locally against the External DB
  URL (as in step 2.3 — it's idempotent; `CREATE TABLE IF NOT EXISTS` won't alter existing
  tables, so for column additions on an existing DB run the relevant `scripts/migrate_*.py`
  the same way).
- **Rotating secrets:** update them in the Render dashboard → the service redeploys.
- **Changing the Vercel/backend URL:** update `vercel.json` (backend host) and/or
  `NEXT_PUBLIC_API_URL`, then redeploy the affected service.
