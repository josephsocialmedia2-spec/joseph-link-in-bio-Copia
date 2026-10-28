# REAL MEDIA PRO — Neon Free migration staging (not connected)

The existing Supabase projects are untouched; this directory contains **only new
GitHub source code**, and the old 402 restrictions have not been removed.

## Provider
Neon Free (as of 28 October 2026): 1 GB of **PostgreSQL data** and up to
5 GB of **Object Storage** per project, subject to service quotas.
Do not copy Supabase media into database bytea columns. Use the service's
Object Storage for binary videos and images; keep the media private unless its
rights and approved public-hosting configuration have been verified.

Official pricing: https://neon.com/pricing
Neon currently requires connection to user's account; OAuth/authorization must
be completed by the owner via the Neon app. No credentials in chat.

## Migration sequence — keep DISABLED until signed off

1. Connect the Neon app in ChatGPT and verify **Free** account/plan and quotas.
2. Create a brand-new Neon project named `real-media-pro-social`, EU region
   if offered, with zero paid resources.
3. Apply `schema.sql` **only** to this Neon PostgreSQL instance.
   Verify settings flags default to FALSE; accounts unverified, quota UNKNOWN.
4. Populate the initial schedule through the Neon backend:
   `python neon/seed.py --days 7` from the parent project folder, with
   `RMP_NEON_DATABASE_URL` only in protected GitHub Actions secrets.
   `psycopg[binary]==3.3.6` from requirements-neon.txt.
5. The staging PostgreSQL adapter in `neon/run_worker.py` now reuses the worker's
   fail-closed social API code and replaces direct Supabase REST access with
   server-only, parameterized PostgreSQL queries and atomic conditional claims.
   **Offline syntax/dry-run tests only; no real Neon database or live API test.**
   Existing `worker.py` remains Supabase-specific and must not be run against Neon.
6. Rebuild dashboard auth safely using a Neon-backed authenticated API.
   GitHub Pages JavaScript must NEVER include a PostgreSQL connection string,
   OAuth client secret or social-platform token. The published dashboard
   remains connected to the restricted Supabase until an authenticated backend
   is finished.
7. Upload only the approved normalized video
   `VID-20261027-WA0006_SOCIAL_540x960.mp4`, SHA-256
   `eede47a5ded2c52e344c5f834aa6a6be958674531fd552aa8c306058dace9fc1`,
   AFTER rights certification and media hosting configuration. The exact file
   is available in the working artifacts, not copied to this public GitHub repo.
   **Do not** attempt to transfer inaccessible media from Supabase at HTTP 402.
8. Verify Facebook, Instagram, LinkedIn official OAuth and account identity,
   service quotas and data transfer, media-host HTTPS availability, automated
   retry/claim logic, live publish, remote permalink verification.
   Only then merge/test/activate a **separate** Neon workflow on main.
9. Keep old Supabase projects and all 177 source files unchanged, including
   all 62 original MP4 videos.

## Initial status
- PostgreSQL schema: STAGED IN GITHUB, not applied.
- Seed generator: STAGED IN GITHUB, not run against any Neon database.
- Neon project/database: NOT CREATED, connection pending.
- Neon worker: STAGING ADAPTER IMPLEMENTED, not integration-tested. Dashboard: NOT MIGRATED.
- OAuth social/live publications/scheduler: NOT ACTIVE.
- No additional costs.

## Actual Neon deployment — 28 October 2026
- Organisation `org-shiny-poetry-87921624`, plan `free`, owner verified by connected provider.
- Project `rough-mouse-11909259`, branch `br-rough-shadow-b927u5ww` (`production`), database `real_media_pro`, region `aws-eu-central-1`, compute 0.25 CU.
- Six `rmp` schema tables created successfully using a transaction; 1 settings row disabled, 3 unverified social accounts, 5 UNKNOWN quotas.
- 63 original posts migrated from read-only query on Supabase isolated project into Neon, all READY; distinct dates 7, exact timezone mismatch 0, required-link matches 63.
- Neon branchable storage reports `enabled: true`, with **no video uploaded**.
- Neon Auth reports **not enabled** (HTTP 404); therefore authenticated web dashboard remains incomplete. The published old dashboard still connects to restricted Supabase, not Neon.
- Social OAuth, rights, secrets, live API publishing unverified. **No scheduler or publishing activated.** Old Supabase projects untouched.
- CI offline tests: https://github.com/josephsocialmedia2-spec/joseph-link-in-bio-Copia/actions/runs/40645174974 passed prior to connecting Neon. SQL applied to Neon directly from the staged file; adapter not live-tested.
