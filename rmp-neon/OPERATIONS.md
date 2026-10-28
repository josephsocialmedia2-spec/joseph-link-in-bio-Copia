# REAL MEDIA PRO — Operational truth (28 October 2026)

This file documents actual system state, not a claim of live social publishing.

## Existing infrastructure

- Static authenticated dashboard: https://josephsocialmedia2-spec.github.io/joseph-link-in-bio-Copia/rmp-neon/
- Live project: Neon `rough-mouse-11909259`; branch `br-rough-shadow-b927u5ww`; database `real_media_pro`; schema `rmp`.
- Six app tables: `posts`, `accounts`, `quotas`, `settings`, `events`, `admin_users`.
- Exactly **63 READY rows** counted in Neon on 28 October: 21 per platform, dates October 28 through November 3.
- Published posts: 0. Social OAuth verified by official API: 0/3. The database remains `enabled=false`, `rights_verified=false`, `live_test_verified=false`.
- Facebook target candidate: `Josephmalafronte`, page ID `911947508677134`; not yet API verified.
- Instagram target candidate: `realmediaproagency`; do not confuse with the similar `realmediaproageency` identifier seen in a different portfolio. Not yet API verified.
- LinkedIn organization/page destination: **not confirmed**. Do not auto-select a similarly named LinkedIn profile.
- Verified normalized MP4: SHA256 `eede47a5ded2c52e344c5f834aa6a6be958674531fd552aa8c306058dace9fc1`, H.264 540x960, AAC, 17.5667s. Hash recorded in Neon settings, but rights are NOT certified and no public media URL is registered.
- New private Neon bucket `rmp-approved-video` is empty. Original Supabase data and video objects must remain unchanged.

## Deployed worker and CI

- Workflow: [rmp-neon-publisher.yml](../.github/workflows/rmp-neon-publisher.yml).
- Neon database adapter: [neon/run_worker.py](../campagne/immobiliare/social-quotidiano/rmp-isolato/neon/run_worker.py).
- Original fail-closed official social publisher: [worker.py](../campagne/immobiliare/social-quotidiano/rmp-isolato/worker.py).
- Europe/Rome schedule: [schedule.py](../campagne/immobiliare/social-quotidiano/rmp-isolato/schedule.py).
- Offline tests: [test_schedule.py](../campagne/immobiliare/social-quotidiano/rmp-isolato/tests/test_schedule.py).
- Workflow supports GitHub Actions scheduling at UTC candidates for 10:00, 16:00 and 20:00 local time, DST-aware due filtering. GitHub Actions does not guarantee execution at the exact minute; late jobs beyond 45 minutes are not automatically published.
- **Default scheduled behavior is SAFE SUSPENSION**, not publishing. When `vars.RMP_LIVE_PUBLISH` is unset or not `YES`, cron ticks exit with a suspension message and make no social API calls.
- Offline tests and code smoke test have passed, including duplicate IDs per slot, DST boundaries, media SHA mismatch rejection and no-secret fail-closed checks. Offline success is **not** live OAuth or live publish evidence.

## Gates before any social post

1. Establish rights to publish the approved exact MP4 and certify `rights_verified` through a protected administrative process.
2. Approve secure HTTPS video hosting and verify SHA against Neon settings; do not put proprietary media or tokens on GitHub Pages.
3. Obtain official platform OAuth grants for each exact Facebook, Instagram and LinkedIn identity, plus expiry and remote identity checks.
4. Establish real quotas and latest verified usage; `UNKNOWN` always blocks publishing.
5. Provision `RMP_NEON_DATABASE_URL` privately in GitHub Actions secrets and other dedicated social/media secrets. Never commit tokens or database passwords.
6. Perform controlled real posts and verify remote IDs/permalinks for all three platforms.
7. Only after successful tests and all gates, enable the database `enabled` flag and GitHub `RMP_LIVE_PUBLISH=YES` through authorized secure channels.
8. Continuously monitor errors, duplicates, due windows and quota thresholds.

**Live publishing remains DISABLED until every mandatory precondition is truly satisfied.**
