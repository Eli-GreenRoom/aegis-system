# GreenRoom Stages — Setup

> One-time setup. Run in order. Owner: Eli.
> Estimated time end-to-end: ~45 minutes if accounts already exist.

---

## 0. Prereqs

- Node 20+ installed (`node -v`)
- npm 10+ (no pnpm, no yarn)
- Git installed and configured
- Cursor (or VS Code) installed
- A Google account with access to the existing Aegis sheets
- Card on file for Vercel + Neon (free tiers cover dev)

---

## 1. GitHub

1. Use the `Eli-GreenRoom` GitHub account.
2. Create repo: **`aegis-system`** — private. (Will be renamed `greenroom-stages` after
   rebrand Phase D — see `GREENROOM_STAGES_REBRAND.md` §Phase A.5.)
3. From the repo root locally:
   ```bash
   cd C:\Users\user\Desktop\aegis-system
   git init
   git add .
   git commit -m "chore: initial scaffold"
   git branch -M main
   git remote add origin git@github.com:Eli-GreenRoom/aegis-system.git
   git push -u origin main
   ```
4. Set git identity for this repo:
   ```bash
   git config user.name "Eli-GreenRoom"
   git config user.email "elieabdo360@gmail.com"
   ```

---

## 2. Neon (Postgres)

1. Sign in at <https://neon.tech>.
2. Create project: **`aegis-system`**, region **`eu-central-1`** (Frankfurt —
   closest to Lebanon).
3. Default DB name: `aegis`. Note the **pooled** connection string.
4. Save it as `DATABASE_URL` (Phase 5 below).

---

## 3. Vercel Blob

1. Sign in at <https://vercel.com>.
2. Project will be created in step 4 — come back here AFTER the project exists.
3. In project → **Storage** → **Create Database** → **Blob**.
4. Name: `aegis-archive`. Copy the `BLOB_READ_WRITE_TOKEN`.

---

## 4. Vercel Project + Domain

1. From the GitHub repo, click **Import** in Vercel.
2. Framework: **Next.js** (auto-detected).
3. Root: `./`. Build command: default. Install command: `npm install`.
4. **Don't deploy yet** — env vars first. Open the new project →
   Settings → Environment Variables, paste in everything from `.env.example`
   except `BETTER_AUTH_URL`, which differs per environment:
   - Preview / Dev: `http://localhost:3000`
   - Production: `https://logistics.aegisfestival.com`
5. Hit **Deploy**.
6. Settings → **Domains** → Add `logistics.aegisfestival.com`. Vercel will give
   you a `CNAME` to set on your DNS provider for `aegisfestival.com`.
   (Note: this is a **subdomain**, so a CNAME on `logistics` pointing to
   `cname.vercel-dns.com` is correct.)
7. Enable **HTTPS** (Vercel does it automatically via Let's Encrypt).

---

## 5. Anthropic

1. Go to <https://console.anthropic.com> → API Keys.
2. Create key named `greenroom-stages-prod`. Copy as `ANTHROPIC_API_KEY`.
3. Note: AI calls will use `claude-sonnet-4-6` for parsing and chat. Budget
   alerts at $50/mo to start; tune up after Phase 4.

---

## 6. Resend (transactional email)

1. Sign up at <https://resend.com> with `logistics@aegisfestival.com`.
2. **Domains** → Add `aegisfestival.com`. Add the SPF/DKIM/DMARC records to your
   DNS. Wait for "Verified" (usually < 10 min).
3. **API Keys** → create `greenroom-stages-prod`. Copy as `RESEND_API_KEY`.
4. Set `EMAIL_FROM=Aegis Logistics <logistics@aegisfestival.com>`.

---

## 7. Generate auth secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the hex string into `BETTER_AUTH_SECRET`.

---

## 8. Local `.env.local`

Copy `.env.example` → `.env.local` and fill in every value:

```
DATABASE_URL=postgresql://...neon...
ANTHROPIC_API_KEY=sk-ant-...
BETTER_AUTH_SECRET=...64hex...
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
RESEND_API_KEY=re_...
EMAIL_FROM=Aegis Logistics <logistics@aegisfestival.com>
NEXT_PUBLIC_APP_NAME=GreenRoom Stages
```

---

## 9. Bootstrap

```bash
npm install
npm run db:generate
npm run db:migrate
npm run dev
```

Open <http://localhost:3000>. Create the first user (Eli) via the sign-up form,
then promote to `owner` in the DB:

```sql
UPDATE "user" SET role = 'owner' WHERE email = 'logistics@aegisfestival.com';
```

(Or run `npm run seed:owner` once that script exists in Phase 1.)

---

## 10. Cursor setup

1. Open `C:\Users\user\Desktop\aegis-system` in Cursor.
2. Cursor will read `.cursorrules` and `AGENT.md` automatically.
3. Recommended Cursor settings:
   - **Auto-run terminal commands**: off (review first)
   - **Composer model**: Claude Sonnet 4.6
   - **Format on save**: on
4. First prompt to give Cursor:
   > Read `AGENT.md`, `HANDOFF.md`, and `docs/DATA-MODEL.md`. Don't write any
   > code yet. Confirm you understand the brand rules, the stack, and Phase 1
   > acceptance criteria.

---

## 11. Verify deploy

- `https://logistics.aegisfestival.com/api/health` → `{ ok: true }`
- Sign in with `logistics@aegisfestival.com`
- Settings → Profile shows your name + role `owner`
- Storage check: upload a test file in any module, refresh, file persists

---

## 12. Day-2 ops

| Task            | Where                                                   | Frequency      |
| --------------- | ------------------------------------------------------- | -------------- |
| Logs            | Vercel → Project → Logs                                 | as needed      |
| DB inspect      | `npm run db:studio`                                     | as needed      |
| Backups         | nightly cron exports DB to Blob (Phase 7)               | auto           |
| Add team member | Dashboard → Settings → Team                             | on demand      |
| Rotate API keys | Anthropic + Resend consoles, then Vercel envs, redeploy | every 6 months |

---

## Troubleshooting

- **Vercel build fails on `drizzle-kit`** — ensure `drizzle-kit` is in
  `devDependencies`, and DB env vars are set in Vercel.
- **`BETTER_AUTH_URL mismatch`** — preview deploys need their own
  `BETTER_AUTH_URL`; set per-environment in Vercel.
- **Blob 401 on read** — store is private; you must serve via the
  `/api/documents/[id]` proxy that calls `getAppSession()` first.
- **Domain stuck on "Configuring"** — DNS propagation; allow up to 24h. Check
  with `nslookup logistics.aegisfestival.com`.
