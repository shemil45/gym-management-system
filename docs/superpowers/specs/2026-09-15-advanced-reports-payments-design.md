# Advanced Reports — Payments (v1) design

Date: 2026-09-15. Parent roadmap: `2026-09-15-advanced-reports-roadmap.md`.

## Goal

Replace the tenant admin's basic `/admin/reports` page (four chart tabs, all
rows loaded client-side, no exports) with an **Advanced Reports** section
gated on the platform flag `advanced_reports`. v1 ships the **Payments** area
in full; the other four areas appear on the landing page as "Coming soon".

## Decisions taken

- Flag off → locked page with an upgrade notice; the sidebar entry stays.
- Landing page + one sub-route per area (`/admin/reports/<area>`).
- Exports: CSV on every table, plus a print stylesheet for the day book.
- UI is built with the `taste-skill` and `ui-ux-pro-max` skills, inside the
  admin-scale conventions already in use (app-density tables, no hero type,
  no glows, no below-fold CTAs).

## 1. Routing and gating

| Path | Role |
|---|---|
| `app/admin/reports/layout.tsx` | Async server layout. Resolves `getCurrentAdminContext()` and `gymHasFeature(gym.id, 'advanced_reports')` once. If **off**, renders `ReportsLocked` and does not render children. If **on**, renders children. |
| `app/admin/reports/page.tsx` | Landing: five area cards. Payments links to `/admin/reports/payments`; Expenses & P&L, Members, Attendance, Referrals are non-interactive cards tagged "Coming soon" with their one-line scope from the roadmap. |
| `app/admin/reports/payments/page.tsx` | The Payments report. All view state lives in search params so views are bookmarkable and only the active tab's data is fetched. |
| `app/admin/reports/payments/export/route.ts` | `GET` → `text/csv` for the same params. Performs the same auth + feature check as the layout; 403 when the flag is off, 401 when unauthenticated. |

Search params for `/admin/reports/payments` and the export route:

| Param | Values | Default |
|---|---|---|
| `tab` | `daybook` \| `summary` \| `plans` \| `pending` \| `staff` | `daybook` |
| `date` | `YYYY-MM-DD` (day book only) | today (Asia/Kolkata) |
| `preset` | `week` \| `month` \| `year` \| `custom` | `month` |
| `from`, `to` | `YYYY-MM-DD` (used when `preset=custom`) | — |

Invalid or missing values fall back to the default silently.

Removed: `components/reports/ReportsDashboard.tsx`. `recharts` stays (used by
`ExpenseDashboard` and the platform portal). `components/layout/AdminSidebar.tsx`
is unchanged.

## 2. Data layer

No migration. Two modules:

**`lib/reports/payments.ts`** (`server-only`). One narrow range query per view
against `payments` via `getSupabaseAdmin()`, always filtered by `gym_id`.
Joins: `member:members(id, member_id, full_name, phone)`,
`membership_plan:membership_plans(name)`, `processor:profiles(full_name)`
(via `processed_by`). Exposes:

- `getDayBook(gymId, date)` → `{ rows, totals }`
- `getPeriodSummary(gymId, range)` → `{ buckets, kpis, previous }`
- `getByPlan(gymId, range)`, `getPending(gymId, range)`, `getByStaff(gymId, range)`
- `resolveRange(params)` → `{ from, to, preset, bucket }` with the
  previous equal-length range.

**`lib/reports/payments-aggregate.ts`** — pure functions over plain row
arrays (bucketing, method / plan / staff rollups, previous-period delta,
CSV serialisation). No DB, no dates from `new Date()` — the caller passes
"today". These are the unit-tested surface.

Definitions (used identically on screen and in CSV):

- **Collected** = Σ `amount` where `payment_status = 'paid'`. Pending, failed
  and refunded rows are displayed but never included in collected.
- **Admission fees** = Σ `coalesce(admission_fee_amount, 0)` over paid rows.
- **Membership revenue** = collected − admission fees.
- **Coins redeemed** = Σ `referral_coins_used` over paid rows.
- **Refunded** = Σ `amount` where `payment_status = 'refunded'`.
- **Avg ticket** = collected ÷ paid txn count (0 when no txns).
- Ledger date = `payment_date`; within a day rows are ordered by `created_at`.
- "Today" = the current date in `Asia/Kolkata`, matching the DB default.
- Bucket granularity for Summary: range ≤ 31 days → daily; ≤ 120 days →
  weekly (Monday start); otherwise monthly.
- Presets: `week` = Monday of the current week → today; `month` = 1st → today;
  `year` = 1 Jan → today. Previous period = the same length ending the day
  before `from`.
- Impersonation-sandbox rows (`getImpersonationOwnedIds(gym.id, 'payment')`)
  are counted and badged "demo", exactly as the payments list does.

Rationale for aggregating in TypeScript: per-gym payment volumes are in the
thousands; a year's narrow select is a few hundred KB at most. The fetch pages
past PostgREST's 1,000-row cap (`.range()` in a loop) so a full year of data
is never silently truncated. A SQL RPC is the upgrade path if a tenant ever
exceeds ~50k payments (noted in roadmap).

## 3. Tabs

| Tab | Control | Columns | Footer / KPIs |
|---|---|---|---|
| **Day book** (default) | Single date input with ‹ › day arrows; default today | #, time (`created_at`, local), receipt no. (falls back to invoice no.), member (name + member ID), plan, amount, admission fee, coins used, method, status, collected by | Totals by method for paid rows + paid txn count. Pending / refunded rows listed below the totals as a one-line note with count and amount. **Print** button → `window.print()` with a `@media print` stylesheet: gym name + date header, table only, no chrome. |
| **Summary** | Period picker | One row per bucket: period label, txns, collected, cash, UPI, card, bank transfer, online, admission fees, membership revenue, coins redeemed, refunded | KPI strip above the table: collected, txns, avg ticket — each with Δ% vs previous period (hidden when previous is zero). Total row. |
| **By plan** | Period picker | plan (or "No plan"), txns, revenue, share %, avg ticket | Total row |
| **Pending** | Period picker | date, member (name + ID), phone with copy button, plan, amount, method, status (`pending` / `failed`), notes | Count + outstanding amount |
| **By staff** | Period picker | collected by (or "Unassigned"), txns, collected, cash handled | Total row |

Every tab shows an **Export CSV** button linking to the export route with the
current params. Filenames: `payments-<tab>-<from>[-<to>].csv`, e.g.
`payments-daybook-2026-09-15.csv`, `payments-summary-2026-09-01-2026-09-15.csv`.
CSV columns are a superset of the on-screen columns — every visible column
plus the machine-useful extras `Date`, `Member ID`, `Notes` (day book /
pending) and `Bucket start` (summary); amounts are raw numbers (no currency
symbol); dates ISO.

Empty state per tab: a single quiet row "No payments in this period".

## 4. Components

```
components/reports/
  ReportsLanding.tsx        area cards (server)
  ReportsLocked.tsx         flag-off panel (server)
  PeriodPicker.tsx          client; preset chips + custom from/to; writes URL params
  DatePager.tsx             client; day book date input + prev/next
  ExportCsvButton.tsx       anchor to export route (server)
  payments/
    PaymentsReport.tsx      tab bar + KPI strip + active table (server)
    DayBookTable.tsx        server + print styles; Print button is a tiny client island
    SummaryTable.tsx
    ByPlanTable.tsx
    PendingTable.tsx        copy-phone button is a client island (clipboard + sonner toast)
    ByStaffTable.tsx
```

Tables are server-rendered; client islands only where interaction needs it.
Theme via `useAdminTheme` where a client island needs it; otherwise Tailwind
`dark:` classes as the rest of the admin does.

## 5. Error handling

- Unauthenticated / no gym → the admin layout already redirects; the export
  route returns 401.
- Flag off → layout renders `ReportsLocked`; export route returns 403.
- Bad params → defaults (never a 400 for the page; the export route also
  falls back).
- Query error → the page throws; a new `app/admin/reports/error.tsx`
  boundary shows a retry panel. The export route returns 500 with a short
  plain-text body.

## 6. Testing and verification

- Add `vitest` as a dev dependency with `"test": "vitest run"`.
- Unit tests for `payments-aggregate.ts`: status exclusion, method rollup,
  admission-fee / membership split, plan and staff rollups with null keys,
  bucket selection at 31 / 120-day edges, weekly buckets crossing a month,
  monthly buckets crossing a year, previous-period range math, avg ticket
  with zero txns, CSV escaping (commas, quotes, newlines).
- `next build` and `eslint` clean.
- Visual check is on the user (no admin login available to the agent):
  landing cards, locked state (toggle the flag in the platform portal), each
  tab, print preview of the day book, and one CSV download per tab.

## 7. Out of scope

The other four areas (cards only), per-area sub-flags, PDF export, scheduled
or emailed reports, RPC-based aggregation, a gym-level timezone setting.
