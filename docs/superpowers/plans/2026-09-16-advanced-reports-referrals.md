# Advanced Reports — Referrals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Referrals area at `/admin/reports/referrals` — Overview, Leaderboard, Referrals list — with CSV export, double-gated on `advanced_reports` + `referrals`; flip its landing card live and mark the roadmap complete.

**Architecture:** Pure logic in `lib/reports/referrals-aggregate.ts` (vitest) over `ReportReferralRow`, paid payment rows and the member roster; `lib/reports/referrals.ts` fetches (tenant-scoped, paged, column-hint embeds) and reuses `fetchPaymentRows` / `fetchMembers`; params module with a `status` param; CSV + route; server tables behind keyed Suspense inside `ReportNavigationProvider` (`'referrals'` area). The bonus constant is exported from `lib/payments/settle-member-payment.ts` and imported — no second copy.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4, date-fns 4, Supabase admin client, vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-advanced-reports-referrals-design.md`

## Global Constraints

- 4-space indent, single quotes, no semicolons; alias `@/*`. **No git commits/pushes/stash** — stage only.
- IST dates from `created_at` / `applied_at`. Created counted by `created_at`, converted by `applied_at` (any creation date), pending/expired = created in bucket with that current status. Conversion % null when created = 0. Coins issued = converted × bonus; redeemed = Σ `referral_coins_used` over paid payments by `payment_date`. Outstanding balance = Σ `referral_coins_balance` over all members. Days to convert = applied date − created date.
- Leaderboard: referrals created in range grouped by referrer; converted = those with `applied_at` set; sort converted desc, referrals desc, name asc; unknown referrers skipped; balance = member's current balance.
- Params: `tab` ∈ `overview|leaderboard|list` (default `overview`); `preset` default `year`; `status` ∈ `all|pending|applied|expired` (list tab only, default `all`). Filenames `referrals-<tab>-<from>-<to>.csv`.
- Embeds on `referrals` use **column hints** `members!referrer_id` / `members!referred_id` (two FKs to members; constraint-name hints fail — see memory). Every query `.eq('gym_id', gymId)`.
- Page: if `!gymHasFeature(gym.id, 'referrals')` render `ReferralsOff`; export route requires staff (401) + `advanced_reports` (403) + `referrals` (403).
- Same table classes; `ReportTabs` + `ReportNavigationProvider`; `StatusChips` is the only new client component.

---

### Task 1: Constant export, member balance field, params, aggregation (TDD)

**Files:**
- Modify: `lib/payments/settle-member-payment.ts` — `export const REFERRER_BONUS_COINS = 500` (was `const`). No other change.
- Modify: `lib/reports/members-aggregate.ts` `ReportMemberRow` gains `referral_coins_balance: number`; `lib/reports/members.ts` select adds `referral_coins_balance` and maps it (`toNumber`); update member fixture helpers in `lib/reports/__tests__/members-aggregate.test.ts` and `lib/reports/__tests__/attendance-aggregate.test.ts` (and `members-csv.test.ts` / `attendance-csv.test.ts` if they build members) with `referral_coins_balance: 0`.
- Create: `lib/reports/referrals-params.ts`, `lib/reports/referrals-aggregate.ts`
- Tests: `lib/reports/__tests__/referrals-params.test.ts`, `lib/reports/__tests__/referrals-aggregate.test.ts`

**Interfaces (params):**
```ts
export type ReferralsTab = 'overview' | 'leaderboard' | 'list'
export const REFERRALS_TABS: { id: ReferralsTab; label: string }[]   // Overview / Leaderboard / Referrals
export type ListStatus = 'all' | 'pending' | 'applied' | 'expired'
export const LIST_STATUSES: { id: ListStatus; label: string }[]     // All / Pending / Applied / Expired
export type ReferralsReportQuery = { tab: ReferralsTab; preset: Preset; range: DateRange; previous: DateRange; bucket: Bucket; status: ListStatus; today: string }
export function parseReferralsParams(raw: RawParams, today: string): ReferralsReportQuery
export function referralsSearchParams(q: ReferralsReportQuery): URLSearchParams   // tab + period; + status only on list (omit when 'all')
export function referralsExportFilename(q: ReferralsReportQuery): string
```
**Interfaces (aggregate):** exactly the block in spec §2 (import `ReportPaymentRow` from payments-aggregate, `ReportMemberRow` from members-aggregate, date helpers from dates.ts).

Tests (real assertions):
- params: defaults (overview / year / all); junk fallback; `status` emitted only on list and only when not `all`; filename.
- `overviewBuckets` (month buckets over Jan–Mar): referral A created Dec 20 (outside), applied Jan 5 → Jan converted 1, created 0; referral B created Jan 10 pending → Jan created 1, pending 1; referral C created Feb 1 expired → Feb expired 1; conversion Jan = null (created 0) even though converted 1; Feb conversion 0; coins issued Jan = bonus; payments with `referral_coins_used` 200 on Jan 15 (paid) and 300 on Jan 20 (pending status) → Jan coinsRedeemed 200.
- `overviewTotals` sums; conversion from totals.
- `overviewKpis` over the range; `outstandingBalance` sums member balances.
- `leaderboard`: two referrers; converted/conversion; sort ties broken by referrals then name; referrer not in roster skipped; balance from member row.
- `referralList`: created in range only; status filter; newest first; `daysToConvert` (applied − created in IST days) and null when pending.

- [ ] Write tests → FAIL → implement → PASS; `npm test` (131 + new), tsc, `npx eslint lib/reports lib/payments` clean. Stage.

---

### Task 2: Fetcher + CSV + route

**Files:** `lib/reports/referrals.ts`, `lib/reports/referrals-csv.ts`, `lib/reports/__tests__/referrals-csv.test.ts`, `app/admin/reports/referrals/export/route.ts`

**Fetcher:**
```ts
export type OverviewReport = { buckets: OverviewBucket[]; totals: ReturnType<typeof overviewTotals>; kpis: OverviewKpis; previous: OverviewKpis; outstanding: number }
export type LeaderboardReport = { rows: LeaderRow[] }
export type ListReport = { rows: ListRow[]; status: ListStatus }
export async function fetchReferrals(gymId: string, range: DateRange): Promise<ReportReferralRow[]>
   // two paged queries: created_at in IST range, and applied_at in IST range; merge by id; select with column hints per Global Constraints
export async function getOverview(gymId, query): Promise<OverviewReport>   // referrals (current + previous), fetchPaymentRows (current + previous), fetchMembers — all in parallel
export async function getLeaderboard(gymId, query): Promise<LeaderboardReport>
export async function getReferralList(gymId, query): Promise<ListReport>
```
`bonus` = `REFERRER_BONUS_COINS` imported from `@/lib/payments/settle-member-payment`.
**CSV:** `overviewCsv` (Bucket start, Period, Created, Converted, Pending, Expired, Conversion %, Coins issued, Coins redeemed, Value), `leaderboardCsv` (Rank, Referrer, Referrer ID, Phone, Referrals, Converted, Conversion %, Coins earned, Balance), `listCsv` (Date, Referrer, Referrer ID, Referred, Referred ID, Code, Status, Applied on, Days to convert). Round percentages 2 dp.
**Route:** mirror the attendance route, adding the `referrals` feature check (403 "Referrals are not enabled for this gym") after the `advanced_reports` check.

- [ ] TDD CSV; write fetcher + route; `npm test`, tsc, `npx eslint app/admin/reports lib/reports`; PostgREST smoke test of the referrals select (keys from `.env`; expect 200 — a 400 means the embed hint is wrong). Stage.

---

### Task 3: UI

**Files:** `components/reports/referrals/*` per spec §4; `components/reports/ReportSkeleton.tsx` (+`ReferralsTabSkeleton` overview KPIs(5 cards: reuse `KpiStripSkeleton` + one extra card or a 5-col grid) + 9 cols / leaderboard 8 / list 7, `ReferralsShellSkeleton`); `components/reports/ReportNavigation.tsx` (`'referrals'`); `app/admin/reports/referrals/{page,loading}.tsx`; `components/reports/ReportsLanding.tsx` (Referrals `href`).

- `ReferralsReport.tsx`: copy `AttendanceReport.tsx` (title "Referrals").
- `ReferralsOff.tsx`: quiet panel like `ReportsLocked` — "Referrals aren't enabled for this gym" + one line ("Turn on referrals in the platform portal to track them here.").
- `OverviewKpis.tsx`: four `DeltaBadge` cards (none inverted) + the outstanding-balance card (`n coins · ₹n`, caption "as of today"). `OverviewTable.tsx`: 9 columns; conversion `x.x%`/—; value `formatCurrency`; total row; empty state per spec.
- `LeaderboardTable.tsx`: 8 columns incl. rank; `CopyPhoneButton`; demo badge; footer.
- `StatusChips.tsx` (`'use client'`, `aria-pressed`, navigates via `useReportNavigation().navigate` with `referralsSearchParams({ ...query, status })`). `ReferralListTable.tsx`: 7 columns; status pill colours amber/emerald/gray; footer count.
- Page: `getCurrentAdminContext` → if `!gymHasFeature(gym.id,'referrals')` return `<ReferralsOff />` (still inside the shell? No — render the panel alone, like the locked layout does). Otherwise `TabBody` switch; controls = `PeriodPicker` (+ `StatusChips` on list) + `ExportCsvButton`; provider + `ReportBody`; Suspense keyed on `referralsSearchParams(query).toString()`.
- [ ] Verify `npm test`, tsc, `npx eslint app/admin/reports components/reports lib/reports`, `npm run build` (both referrals routes). Stage.

---

### Task 4: Roadmap complete + hand-off

- Flip `## 5. Referrals  — coming soon (needs `referrals` flag)` → `## 5. Referrals  — shipped (branch worktree-advanced-reports)`; change the roadmap's status line at the top to say all five areas are shipped.
- `components/reports/ReportsLanding.tsx`: with all five live, remove the now-dead "Coming soon" branch only if no area lacks an `href` (keep the code path if you prefer — but there must be no stale blurb text).
- Hand-off: overview numbers vs a known referral; leaderboard for This year; list status chips; referrals-off panel when the flag is off; CSV per tab.
- `git add -A`, `git status --short`. No commit.
