# Advanced Reports — Expenses & P&L (area 2) design

Date: 2026-09-15. Parent roadmap: `2026-09-15-advanced-reports-roadmap.md`.
Builds on the Payments area: `2026-09-15-advanced-reports-payments-design.md`
(gate, landing, period picker, CSV route pattern, skeletons, definitions).
Anything not restated here is the same as there.

## Goal

Add the second area, **Expenses & P&L**, at `/admin/reports/expenses`: an
accounting view of income versus spend for a period — a profit-and-loss
statement, an expense breakdown by category, and an itemised expense ledger
— each exportable to CSV. The landing card for this area goes live.

## Decisions taken

- Income is **net of refunds**: `paid − refunded`, with refunds shown as their
  own line so the statement reconciles with the payments report's Collected.
- Three tabs; no charts (the operational `/admin/finances/expenses` page
  already has them).
- Period picker default is **This year** for this area (payments defaults to
  This month).

## 1. Routing

| Path | Role |
|---|---|
| `app/admin/reports/expenses/page.tsx` | Shell renders immediately; tab body streams behind a keyed `Suspense` with a per-tab skeleton (same structure as the payments page). |
| `app/admin/reports/expenses/loading.tsx` | Shell skeleton. |
| `app/admin/reports/expenses/export/route.ts` | `GET` → CSV; staff + `advanced_reports` gate; 401 / 403 / 500 as payments. |
| `components/reports/ReportsLanding.tsx` | Expenses card gets `href: '/admin/reports/expenses'`. |

Search params: `tab` ∈ `pnl` \| `categories` \| `ledger` (default `pnl`);
`preset` ∈ `week` \| `month` \| `year` \| `custom` (default **`year`**);
`from`, `to`. Invalid values fall back silently. Filenames:
`expenses-<tab>-<from>-<to>.csv`.

The gate in `app/admin/reports/layout.tsx` already covers this route.

## 2. Data layer (no migration)

**`lib/reports/expenses.ts`** (`server-only`). Fetches expenses for a range
with paging past the 1,000-row cap (same loop as payments), joined with
`adder:profiles!expenses_added_by_fkey(full_name)`, and reuses the payments
fetcher's rows for income. Exposes:

- `getPnl(gymId, query)` → `{ buckets, totals, kpis, previous }`
- `getByCategory(gymId, query)` → `{ rows, total, previousTotal }`
- `getLedger(gymId, range)` → `{ rows, totals }`

**`lib/reports/expenses-aggregate.ts`** — pure, unit-tested:

```ts
export type ExpenseCategory = 'utilities' | 'salary' | 'equipment' | 'maintenance' | 'marketing' | 'rent' | 'other'
export const EXPENSE_CATEGORIES: ExpenseCategory[]   // fixed order above
export const CATEGORY_LABELS: Record<ExpenseCategory, string>
export type ReportExpenseRow = { id, amount, category, description, expense_date, created_at, receipt_url, adder_name, is_demo }
```

Definitions (used identically on screen and in CSV):

- **Membership revenue**, **Admission fees**, **Refunded** — exactly as the
  payments spec (paid rows; refunded rows by status).
- **Gross income** = membership revenue + admission fees (= Collected).
- **Net income** = gross income − refunded.
- **Total expenses** = Σ expense `amount` in the bucket / period.
- **Net** = net income − total expenses.
- **Margin %** = net ÷ net income × 100; `null` when net income is 0.
- Expense date = `expense_date`; ledger order = `expense_date` desc, then
  `created_at` desc.
- Bucket rule, presets, previous period, "today" — as payments.
- Impersonation-sandbox expenses (`getImpersonationOwnedIds(gym.id, 'expense')`)
  are counted and badged "demo".

## 3. Tabs

| Tab | Columns | Footer / KPIs |
|---|---|---|
| **P&L statement** (default) | period, membership revenue, admission fees, refunds, net income, one column per expense category (7), total expenses, net, margin % | KPI strip: net income, total expenses, net — each with Δ% vs previous period (hidden when previous is 0). Total row (margin computed from totals). Empty state when there is neither income nor expense in any bucket. |
| **By category** | category, entries, total, share %, avg per entry, previous period, Δ% | Total row (share 100%). Categories with zero entries in both periods are omitted; "No expenses in this period" when none. |
| **Ledger** | date, category, description, amount, added by (or "—"), receipt (external link icon when `receipt_url`) | Count + total. Demo badge on sandbox rows. |

Every tab: period picker + Export CSV. CSV is a superset of on-screen
columns (adds `Bucket start` on P&L; `Receipt URL` on ledger).

## 4. Components

```
components/reports/expenses/
  ExpensesReport.tsx     tab bar shell (same shape as PaymentsReport; tabs P&L / By category / Ledger)
  PnlTable.tsx
  PnlKpis.tsx
  ByCategoryTable.tsx
  LedgerTable.tsx
components/reports/ReportSkeleton.tsx   + ExpensesTabSkeleton(tab)
```

`PaymentsReport` and `ExpensesReport` are kept as two small components
rather than one generic shell (two callers, different tab sets and back
links; a shared abstraction would be premature).

## 5. Error handling, testing, verification

As payments: page throws → `app/admin/reports/error.tsx`; export route
401/403/500. Unit tests for `expenses-aggregate.ts` (net income with and
without refunds, margin null at zero income, category rollup with omitted
empty categories and previous-period delta, ledger ordering, P&L bucketing
with an expense-only and an income-only bucket) and the CSV builders.
`npm test`, `tsc`, scoped eslint, `next build` clean. Visual check is on the
user.

## 6. Out of scope

Charts, expense editing from the report, budget targets, per-staff expense
rollup, PDF.
