# Advanced Reports — Referrals (area 5) design

Date: 2026-09-16. Parent roadmap: `2026-09-15-advanced-reports-roadmap.md`.
Builds on areas 1–4 (gate, landing, `PeriodQuery` controls, `ReportNavigation`
instant tabs, CSV route pattern, skeletons, `DeltaBadge`, `CopyPhoneButton`).
Anything not restated here is the same as there.

## Goal

Add the fifth and last area, **Referrals**, at `/admin/reports/referrals`:
how the referral programme performs over time, who the best referrers are,
and every referral with its status. Three tabs, CSV each; landing card goes
live. With this area shipped the section's roadmap is complete.

## Decisions taken

- The area needs **both** `advanced_reports` (section gate) and the
  `referrals` feature. When `referrals` is off the page renders a quiet
  panel ("Referrals aren't enabled for this gym") instead of tabs; the
  export route returns 403.
- **Coins issued** is derived: conversions × `REFERRER_BONUS_COINS` (500,
  exported from `lib/payments/settle-member-payment.ts` as a named constant
  — the report imports it, no second copy). **Coins redeemed** = Σ
  `referral_coins_used` over paid payments in the period. Coins are worth
  ₹1 each (`redemption value` = coins redeemed).
- **Outstanding coin balance** = Σ `members.referral_coins_balance` as of
  today (a liability figure, no period).
- Leaderboard follows the period picker; "current balance" is today.
- Default period preset: **This year**.

## 1. Routing

| Path | Role |
|---|---|
| `app/admin/reports/referrals/page.tsx` | Checks `gymHasFeature(gym.id, 'referrals')`; off → `ReferralsOff` panel; on → shell + keyed `Suspense` inside `ReportNavigationProvider area="referrals"`. |
| `app/admin/reports/referrals/loading.tsx` | Shell skeleton. |
| `app/admin/reports/referrals/export/route.ts` | CSV; staff + `advanced_reports` + `referrals` → else 401/403; 500 on failure. |
| `components/reports/ReportsLanding.tsx` | Referrals card gets `href`. |

Search params: `tab` ∈ `overview` \| `leaderboard` \| `list` (default
`overview`); `preset` / `from` / `to` (default `year`); `status` ∈ `all` \|
`pending` \| `applied` \| `expired` (list tab, default `all`). Filenames:
`referrals-<tab>-<from>-<to>.csv`.

## 2. Data layer (no migration)

**`lib/reports/referrals.ts`** (`server-only`):

- referrals for a range by `created_at` (IST bounds, paged, `gym_id`),
  select `id, referrer_id, referred_id, referral_code, status, created_at,
  applied_at, referrer:members!referrer_id(full_name, member_id, phone),
  referred:members!referred_id(full_name, member_id)` — **column hints**,
  never constraint names (two FKs to the same table).
- For the Overview, conversions are counted by **`applied_at`** in the
  bucket, so a second query fetches referrals with `applied_at` in range
  (a referral created last year and applied this month counts as this
  month's conversion). Union the two result sets by id.
- paid payments in range via `fetchPaymentRows` for `referral_coins_used`.
- members via `fetchMembers` for balances and leaderboard identity.
- Previous-period KPIs from the same three fetches over `query.previous`.

Exposes `getOverview(gymId, query)`, `getLeaderboard(gymId, query)`,
`getReferralList(gymId, query)`.

**`lib/reports/referrals-aggregate.ts`** — pure, unit-tested:

```ts
export type ReferralStatus = 'pending' | 'applied' | 'expired'
export type ReportReferralRow = { id: string; referrer_id: string; referred_id: string; code: string | null; status: ReferralStatus; created_at: string; applied_at: string | null; referrer_name: string | null; referrer_code: string | null; referrer_phone: string | null; referred_name: string | null; referred_code: string | null }
export type OverviewBucket = { start: string; label: string; created: number; converted: number; pending: number; expired: number; conversion: number | null; coinsIssued: number; coinsRedeemed: number }
export function overviewBuckets(referrals, payments: ReportPaymentRow[], range, bucket, bonus: number): OverviewBucket[]
export function overviewTotals(buckets): Omit<OverviewBucket,'start'|'label'>
export type OverviewKpis = { referrals: number; conversions: number; coinsIssued: number; coinsRedeemed: number }
export function overviewKpis(referrals, payments, range, bonus): OverviewKpis
export function outstandingBalance(members: ReportMemberRow[]): number   // needs referral_coins_balance on ReportMemberRow (add in Task 1)
export type LeaderRow = { member: ReportMemberRow; referrals: number; converted: number; conversion: number | null; coinsEarned: number; balance: number }
export function leaderboard(referrals, members, range, bonus): LeaderRow[]   // referrals created in range grouped by referrer; converted = those with applied_at (any time); sort converted desc, referrals desc, name asc; referrers not in roster skipped
export type ListStatus = 'all' | ReferralStatus
export type ListRow = ReportReferralRow & { daysToConvert: number | null }
export function referralList(referrals, range, status: ListStatus): ListRow[]   // created in range, filtered by status, newest first
```

Definitions (IST dates from timestamps):

- **Created** = referrals with `created_at` date in the bucket. **Converted**
  = referrals with `applied_at` date in the bucket (regardless of when
  created). **Pending** = created in the bucket and status `pending` now.
  **Expired** = created in the bucket and status `expired` now.
- **Conversion %** = converted ÷ created × 100 (null when created = 0) —
  on the Overview this is a period ratio, not a cohort rate; the Leaderboard
  uses the cohort form (converted among the referrer's referrals created in
  range).
- **Coins issued** = converted × bonus. **Coins redeemed** = Σ
  `referral_coins_used` over paid payments with `payment_date` in bucket.
- **Days to convert** = `applied_at` date − `created_at` date; null when not
  applied.

## 3. Tabs

| Tab | Columns | Footer / KPIs |
|---|---|---|
| **Overview** | period, created, converted, pending, expired, conversion %, coins issued, coins redeemed, value (₹) | KPI strip: referrals, conversions, coins issued, coins redeemed (Δ vs previous) + "Outstanding balance" card (today, no Δ, `n coins · ₹n`). Total row. Empty state when created = converted = redeemed = 0. |
| **Leaderboard** | rank, referrer (name + ID), phone (copy), referrals, converted, conversion %, coins earned, current balance | Footer: referrers count. Empty state. Demo badge. |
| **Referrals** | date, referrer, referred member, code, status pill, applied on, days to convert | Status chips All / Pending / Applied / Expired. Footer count. Empty state. |

CSV: overview (Bucket start + on-screen columns), leaderboard (Rank,
Referrer, Referrer ID, Phone, Referrals, Converted, Conversion %, Coins
earned, Balance), list (Date, Referrer, Referrer ID, Referred, Referred ID,
Code, Status, Applied on, Days to convert).

## 4. Components

```
components/reports/referrals/
  ReferralsReport.tsx   ReferralsOff.tsx
  OverviewKpis.tsx  OverviewTable.tsx
  LeaderboardTable.tsx
  ReferralListTable.tsx  StatusChips.tsx (client)
components/reports/ReportSkeleton.tsx   + ReferralsTabSkeleton, ReferralsShellSkeleton
components/reports/ReportNavigation.tsx  area union gains 'referrals'
```

## 5. Testing, verification, out of scope

Unit tests: bucket counting by created vs applied dates (a referral created
before the range and applied inside it counts as converted but not
created); pending/expired by current status; conversion null at zero;
coins issued/redeemed; outstanding balance; leaderboard grouping, cohort
conversion, sorting incl. name tiebreak, unknown referrer skipped; list
filtering and `daysToConvert`; CSV builders. `npm test`, `tsc`, scoped
eslint, `next build`, PostgREST smoke test of the referrals select
(column hints). Visual on the user.

Out of scope: editing referrals, coin adjustments, referral links/QR
analytics, per-plan attribution.
