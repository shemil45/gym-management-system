# Advanced Reports — Members (area 3) design

Date: 2026-09-16. Parent roadmap: `2026-09-15-advanced-reports-roadmap.md`.
Builds on the Payments and Expenses areas (gate, landing, `PeriodQuery`
controls, CSV route pattern, skeletons, `DeltaBadge`). Anything not restated
here is the same as there.

## Goal

Add the third area, **Members**, at `/admin/reports/members`: who joined and
from where, who is due to renew or has lapsed, how well the gym retains
members, what the roster looks like today, and which paying members have
stopped showing up. Each tab exports to CSV; the landing card goes live.

## Decisions taken

- **Effective status** is derived, not read from `members.status`: `frozen`
  and `inactive` come from the column; otherwise `expired` when
  `membership_expiry_date < today` (or null), `expiring` when it is within
  the next 7 days, else `active`. This matches how the member portal
  already reasons (`lib/member/portal-data.ts`).
- **Membership history comes from paid payments** (`membership_start_date`
  / `membership_end_date`). A window is *renewed* when the same member has
  a later paid payment whose `membership_start_date` is ≤ 30 days after the
  window's end.
- Roster is **today only** (no historical snapshot).
- Default period preset: **This month**.

## 1. Routing

| Path | Role |
|---|---|
| `app/admin/reports/members/page.tsx` | Shell immediately; tab body behind keyed `Suspense`. |
| `app/admin/reports/members/loading.tsx` | Shell skeleton. |
| `app/admin/reports/members/export/route.ts` | CSV; staff + `advanced_reports` gate; 401 / 403 / 500. |
| `components/reports/ReportsLanding.tsx` | Members card gets `href`. |

Search params: `tab` ∈ `joins` \| `renewals` \| `retention` \| `roster` \|
`inactive` (default `joins`); `preset` / `from` / `to` as before (default
`month`); `horizon` ∈ `7` \| `15` \| `30` (renewals, default `30`); `lapsed`
∈ `1` (renewals: show lapsed-in-period instead of upcoming); `days` ∈ `7` \|
`14` \| `30` (inactive, default `14`). Invalid values fall back silently.
Filenames: `members-<tab>-<from>-<to>.csv` for period tabs,
`members-renewals-next<horizon>d-<today>.csv` / `members-renewals-lapsed-<from>-<to>.csv`,
`members-roster-<today>.csv`, `members-inactive-<days>d-<today>.csv`.

## 2. Data layer (no migration)

**`lib/reports/members.ts`** (`server-only`). Fetches, all filtered by
`gym_id`, paged past 1,000 rows where a range query can exceed it:

- members: `id, member_id, full_name, phone, status, membership_plan_id,
  membership_start_date, membership_expiry_date, referred_by, created_at,
  plan:membership_plans(name, price, duration_days),
  referrer:members!referred_by(full_name)` (column hint — the
  constraint-name hint fails on a self-referencing FK)`
- paid payments, fetched as **all history up to today** (not the selected
  range) so renewal detection can see a renewal paid after the selected
  period (`fetchPaymentRows` from `payments.ts`, which already carries
  `member_code`, `plan_name`, `amount`, `payment_date`, and the raw
  `membership_start_date` / `membership_end_date` must be added to
  `ReportPaymentRow` for this area — see plan Task 1)
- latest check-in per member: `check_ins` `member_id, check_in_time`
  ordered desc, reduced to first per member. Unlike the payment fetch, this
  one **is bounded to the last N days** (`today − days`); members with no
  row in that window are "no visit in N days"
- impersonation ids for `'member'`, badged "demo".

Exposes `getJoins(gymId, query)`, `getRenewals(gymId, query, today)`,
`getRetention(gymId, query)`, `getRoster(gymId, today)`,
`getInactive(gymId, days, today)`.

**`lib/reports/members-aggregate.ts`** — pure, unit-tested:

```ts
export type EffectiveStatus = 'active' | 'expiring' | 'expired' | 'frozen' | 'inactive'
export function effectiveStatus(m: { status; membership_expiry_date }, today: string): EffectiveStatus
export type ReportMemberRow = { id, member_code, full_name, phone, status, plan_name, plan_price, plan_duration_days, membership_start_date, membership_expiry_date, referrer_name, created_at, is_demo }
export type MembershipWindow = { member_id, start: string, end: string, amount, payment_date, plan_name }
```

Definitions:

- **Join date** = `members.created_at` (Asia/Kolkata calendar date).
  Source = `Referral` when `referred_by` is set (with referrer name), else
  `Walk-in`. **First payment** = earliest paid payment for that member
  (amount + date), or "—".
- **Renewals due (horizon h)** = effective status `active`/`expiring` with
  `today ≤ expiry ≤ today + h`, ordered by expiry asc. **Days left** =
  expiry − today.
- **Lapsed in period** = membership windows (from paid payments) whose
  `end` falls in the range and that were not renewed, joined to the member;
  one row per member (latest window), ordered by end desc. Exclude members
  whose current `membership_expiry_date` is ≥ today (they came back).
- **Retention bucket** = windows whose `end` falls in the bucket:
  `ended`, `renewed` (per the 30-day rule, using *all* paid payments of
  those members, not only in-range ones), `retention % = renewed ÷ ended ×
  100` (null when ended is 0), `churned = ended − renewed`. KPI strip:
  retention %, ended, renewed with Δ vs previous period. **Churned list** =
  members of unrenewed windows in the range (one row per member, latest
  window) — member, phone, plan, ended on, last payment.
- **Roster** = counts by effective status over all members, plus plan
  distribution over members with effective status `active` or `expiring`:
  plan (or "No plan"), members, share %, price, duration (days),
  **monthly value** = price × 30 ÷ duration_days (0 when duration is 0),
  ordered by members desc. Total row.
- **Inactive (N days)** = effective status `active`/`expiring` with no
  check-in in the last N days (a visit exactly N days ago counts as
  inactive), sorted with no-visit members first, then by oldest visit.
  **Days since** = today − last visit, or "no visit in N days".
- Last payment (renewals, churned) = latest paid payment by `payment_date`.

## 3. Tabs

| Tab | Columns | Footer / KPIs |
|---|---|---|
| **New joins** | join date, member (name + ID), phone (copy), plan, source, first payment (amount · date) | KPIs: joins, referral share %, Δ joins vs previous. Footer count. |
| **Renewals due** | member, phone (copy), plan, expiry, days left (or "overdue by n" in lapsed mode), last payment (amount · date) | Horizon chips 7 / 15 / 30 and a "Lapsed in period" toggle (which shows the period picker). Footer count. |
| **Retention** | per bucket: period, ended, renewed, retention %, churned; then a "Churned members" list: member, phone, plan, ended on, last payment | KPIs: retention %, ended, renewed (Δ vs previous). Total row (retention from totals). |
| **Roster** | status cards (active, expiring, expired, frozen, inactive, total); plan table: plan, members, share %, price, duration, monthly value | Total row. "As of today" label. |
| **Inactive** | member, phone (copy), plan, expiry, last visit, days since | N chips 7 / 14 / 30. Footer count. |

Demo badge on member rows from the impersonation ledger. Empty state per
table: one quiet row. CSV is a superset of on-screen columns (adds
`Member ID`, `Referrer`, raw dates).

## 4. Components

```
components/reports/members/
  MembersReport.tsx        tab shell (title "Members", tabs above)
  JoinsTable.tsx  JoinsKpis.tsx
  RenewalsTable.tsx  RenewalsControls.tsx (client: horizon chips + lapsed toggle)
  RetentionTable.tsx  RetentionKpis.tsx  ChurnedTable.tsx
  RosterCards.tsx  PlanDistributionTable.tsx
  InactiveTable.tsx  DaysChips.tsx (client)
components/reports/ReportSkeleton.tsx   + MembersTabSkeleton, MembersShellSkeleton
```

`RenewalsControls` and `DaysChips` are small client islands that write
`horizon` / `lapsed` / `days` to the URL, following `PeriodPicker`.

## 5. Error handling, testing, verification

As the other areas. Unit tests for `members-aggregate.ts`: effective status
at each boundary (expiry today, +7, +8, null, frozen overrides), renewal
detection at 30/31 days, lapsed excludes returned members, retention
buckets with null %, roster monthly value and share, inactive ordering
with never-visited first, first/last payment selection. CSV builders
tested. `npm test`, `tsc`, scoped eslint, `next build` clean. Visual check
on the user.

## 6. Out of scope

Historical roster snapshots, member editing/messaging from the report,
cohort curves, SMS/WhatsApp actions, predicted churn.
