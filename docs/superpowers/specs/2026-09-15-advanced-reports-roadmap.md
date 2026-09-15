# Advanced Reports — roadmap

Status: agreed inventory, 2026-09-15. Each area below becomes its own spec +
plan when it is picked up. The tenant admin's old `/admin/reports` page
(charts only, all rows loaded client-side) is retired in favour of this
section; areas not yet built are shown as "Coming soon".

Gating: the whole section resolves through the platform flag
`advanced_reports` (`lib/gym/features.ts`). Per-area sub-flags are not
planned; the Referrals area additionally requires the `referrals` flag.

Source data available to every area (tenant tables):
`payments`, `expenses`, `members`, `membership_plans`, `check_ins`,
`referrals`, `notification_logs`.

## Cross-cutting (built with area 1, reused by the rest)

- Shared period picker: Today / This week / This month / This year /
  custom range, with previous-period comparison.
- Server-side aggregation: narrow range selects aggregated in server code
  (`lib/reports/*-aggregate.ts`, pure and unit-tested). Never ship raw rows
  to the client. Move an area to a SQL RPC only if a tenant exceeds ~50k rows.
- Every table exportable to CSV; day book and P&L printable.
- One route family `/admin/reports/<area>` with a section landing page.

## 1. Payments  — shipped (branch worktree-advanced-reports)

- Day book: every transaction for one day in time order — receipt /
  invoice no., member, plan, amount, admission-fee split, coins used,
  method, status, collected by (`processed_by`). Footer totals by method
  (cash / UPI / card / bank / online) for drawer reconciliation.
- Period summary (week / month / year / custom): one row per day (or per
  week / month when zoomed out) — collected amount, count, method split,
  admission-fee vs membership revenue, coins redeemed. Previous-period
  comparison.
- Collections by plan: revenue and count per membership plan.
- Pending / failed: unpaid or failed rows with member contact, doubling as
  a follow-up list.
- Staff collections: amount and count per `processed_by`.

## 2. Expenses & Profit / Loss  — shipped (branch worktree-advanced-reports)

- Expenses by category for the period, with itemised list.
- P&L statement: payments income minus expenses per month, net margin.

## 3. Members  — coming soon

- New joins in period, with source (referral vs walk-in).
- Expiring in next 7 / 15 / 30 days and lapsed-in-period, with contact and
  last payment.
- Churn / retention: of members expired in period, how many renewed within
  30 days.
- Plan distribution and status roster snapshot on any date.
- Inactive members: active membership but no check-in in N days.

## 4. Attendance  — coming soon

- Daily footfall table: unique members, total visits, peak hour,
  entry-method split.
- Per-member attendance: visits in period, average duration where
  `check_out_time` exists, last visit; sortable.
- Hour × weekday heat table.

## 5. Referrals  — coming soon (needs `referrals` flag)

- Referrer leaderboard, conversions, coins issued vs redeemed.
