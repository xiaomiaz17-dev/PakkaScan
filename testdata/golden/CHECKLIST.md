# Golden set — manual runner (Phase 1 intelligence)

**PII files stay offline:** `C:\Temp\PakkaScan-Golden\` (do not commit scans with real CNICs).

## How to run (manual)

1. Sign in on production or local.
2. Upload the file for each case (or use granted rental/bayana credit).
3. Record: verdict, risk label/score, key flags, CNIC district if shown.
4. Mark **PASS** if actual matches **Expect**; else **FAIL** + note.

## Cases

| ID | Type | File (local name) | Expect (summary) | Actual | PASS/FAIL | Notes |
|----|------|-------------------|------------------|--------|-----------|-------|
| G01 | Bayana | | High-ish risk or caution if under-declaration / weak PoA | | | |
| G02 | Tenancy complete | | PROCEED or CAUTION; rent+term+parties present | | | |
| G03 | Tenancy thin | | Flags: deposit and/or notice and/or rent missing | | | |
| G04 | CNIC known district | | District label e.g. Lahore / Karachi if code in table | | | |
| G05 | CNIC unknown district | | No wrong city; soft unknown OK | | | |
| G06 | Blank template | | BLANK OR TEMPLATE / incomplete | | | |
| G07 | Future same-day date | | Must NOT flag same calendar day as future (F7) | | | |
| G08 | CRITICAL risk | | Hero must not stay soft PROCEED WITH CAUTION (F5) | | | |
| G09 | Multi-doc mismatch | | CRITICAL / DO NOT PROCEED if wired | | | |
| G10 | Clean bayana | | Lower risk than G01; no invented CNIC | | | |

## After each intelligence PR

- Re-run G02–G05 at minimum.
- If FAIL: fix rule or update Expect (never silent).

## Automation later

`npm run golden` (not yet) — compare JSON fixtures to pipeline output.
