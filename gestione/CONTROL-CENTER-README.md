# CASE247 — Control Center

Branch: feature/case247-control-center-20261115
Base: main · backup before changes: backup/gestione-control-center-pre-20261115

## Scope
Enhances the EXISTING /gestione/ page via three namespaced files:
- index.html: inserts the root element after the existing header; links control-center.css and control-center.js.
- control-center.js: renders a left navigation, overview, branch index, project links, weekly agenda, and CRM status.
- control-center.css: responsive interface using the already deployed shared green palette (#08754f / #14885e).
- cc-branches-snapshot.json: dated read-only fallback; the browser refreshes branch names from GitHub API using pagination (100 records/page) and caches the last valid result. No personal token.
The previous dashboard is still rendered after this control center. Its functions have not been removed.

## Calendar and storage
Monday to Saturday. Monday-Friday 09:30–12:30 shown as reserved acquisition block, not a fabricated Calendar appointment.
Afternoon and Saturday blocks are editable *suggestions*. Operator tasks can be created, modified, deleted, rescheduled and prioritized (P1/P2/P3/P4), with a warning on acquisition conflicts. Saved records live in localStorage on the CURRENT device only. JSON export/import and ICS export allow manual transfer to another device or calendar; these are **not** cross-device synchronization.
Do not enter client or other personal data in this public static page.

## GitHub
Branches read from the current repository using the anonymous GitHub REST API with pagination. Rate limits/errors use last cached or checked snapshot, clearly marked not real-time. Branch details fetch a selected commit/compare on demand; production Pages is not assumed to exist for a feature branch. Pull request count is queried separately; failures never result in invented numbers.

## CRM — secure local link (full private integration still pending)
The supplied OneDrive URL was not copied or hashed, and must not be published as a share link in the GitHub Pages source. The intended original .xlsm needs authorized retrieval and private Drive storage. The dashboard displays an explicit "not connected" state and links only to the authenticated Drive/OneDrive homepages. VBA cannot execute in a browser.
A backend with real authentication/authorization is required before CRM links, confidential data, shared calendar writes, or client-level KPI reporting can be enabled.

## Verification
CI: node --check gestione/control-center.js; node --test tests/control-center.test.cjs.
Manual end-to-end acceptance should include desktop/mobile viewport and GitHub Pages after merge, branch refresh, clipboard, date validation, save/reload, import/export, external navigation and CRM protection.
Do not report these manual/browser checks as passed until actually executed.

## Release
Review PR, run CI, merge only when approved and all existing checks remain green. Pages deploy must be inspected separately from commit/PR state. This branch's code is NOT automatically the published website.

## Acquisition click-to-Excel (2026-11-15)

- Monday-Friday 09:30–12:30 fixed acquisition slot is a real anchor link, keyboard-accessible, opening the configured Excel workbook.
- The first click on each new browser/device prompts once for the authorized HTTPS OneDrive/Google Drive workbook URL, stores it **only in that browser's localStorage**, then navigates to the Excel file.
- Following clicks open the same authorized workbook directly in a new tab; no landing on the generic OneDrive homepage.
- The source repository, Pages HTML and JSON backups do not contain the user's private sharing URL.
- CRM panel provides "Apri CRM Excel", "Collega / modifica CRM" and "Dissocia CRM"; invalid protocols/hosts are rejected.
- This is an authenticated provider link, *not* copying the workbook to Google Drive nor implementing server-side access control. Actual access still depends on the user's OneDrive/Drive permissions.
- The existing restricted acquisition scheduling block, conflict detector and current-block indicator are aligned at 09:30.
