# Advanced Reports — Members Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Members area at `/admin/reports/members` — New joins, Renewals due / lapsed, Retention with churned list, Roster (today), Inactive — with CSV export, reusing the section framework; flip its landing card live.

**Architecture:** Pure logic in `lib/reports/members-aggregate.ts` (vitest) over three row types (members, membership windows from paid payments, latest check-ins); `lib/reports/members.ts` fetches with tenant scoping and paging; params module handles the three control kinds (period / horizon+lapsed / days); tables are server components behind a keyed Suspense; two tiny client chips components write URL params.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4, date-fns 4, lucide-react, Supabase admin client, vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-advanced-reports-members-design.md`

## Global Constraints

- 4-space indent, single quotes, no semicolons; alias `@/*`. **No git commits/pushes** — stage only.
- Effective status: `frozen`/`inactive` from column; else `expired` if expiry null or `< today`; `expiring` if `today ≤ expiry ≤ today+7`; else `active`.
- Renewed = a later paid payment by the same member with `membership_start_date ≤ window.end + 30 days` (and `> window.start`). Lapsed excludes members whose current `membership_expiry_date ≥ today`.
- Retention % = renewed ÷ ended × 100, null when ended = 0. Monthly value = price × 30 ÷ duration_days (0 when duration 0). Days since last visit: `today − last visit`; never-visited sorts first.
- Params: `tab` ∈ `joins|renewals|retention|roster|inactive` (default `joins`); `preset` default `month`; `horizon` ∈ 7|15|30 (default 30); `lapsed` = `1`; `days` ∈ 7|14|30 (default 14). Filenames per spec §1.
- Every query filtered by `gym_id`; export route `user && gym && isStaff` → 401, flag → 403. Impersonation ids for `'member'`.
- Same table classes as payments/expenses; admin scale; no new client components beyond `RenewalsControls` and `DaysChips`.

---

### Task 1: Extend payment rows with membership windows + Members params

**Files:**
- Modify: `lib/reports/payments-aggregate.ts` (`ReportPaymentRow` gains `member_id: string`, `membership_start_date: string | null`, `membership_end_date: string | null`)
- Modify: `lib/reports/payments.ts` (SELECT adds `member_id, membership_start_date, membership_end_date`; `RawRow` + mapping)
- Modify test helpers: `lib/reports/__tests__/payments-aggregate.test.ts` (`row()` defaults), `lib/reports/__tests__/payments-csv.test.ts` (`row` literal), `lib/reports/__tests__/expenses-aggregate.test.ts` (`pay()` defaults) — add `member_id: 'm1', membership_start_date: null, membership_end_date: null`.
- Create: `lib/reports/members-params.ts`
- Test: `lib/reports/__tests__/members-params.test.ts`

**Interfaces:**
```ts
export type MembersTab = 'joins' | 'renewals' | 'retention' | 'roster' | 'inactive'
export const MEMBERS_TABS: { id: MembersTab; label: string }[]   // New joins / Renewals due / Retention / Roster / Inactive
export type Horizon = 7 | 15 | 30
export type InactiveDays = 7 | 14 | 30
export type MembersReportQuery = {
    tab: MembersTab; preset: Preset; range: DateRange; previous: DateRange; bucket: Bucket
    horizon: Horizon; lapsed: boolean; days: InactiveDays; today: string
}
export function parseMembersParams(raw: RawParams, today: string): MembersReportQuery
export function membersSearchParams(query: MembersReportQuery): URLSearchParams
   // joins/retention: tab, preset[, from, to]; renewals: tab, horizon, lapsed=1 + preset[, from,to] when lapsed; roster: tab; inactive: tab, days
export function membersExportFilename(query: MembersReportQuery): string
```

- [ ] **Step 1: Failing test** `lib/reports/__tests__/members-params.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { parseMembersParams, membersSearchParams, membersExportFilename } from '@/lib/reports/members-params'

const today = '2026-09-16'

describe('parseMembersParams', () => {
    it('defaults', () => {
        const q = parseMembersParams({}, today)
        expect(q).toMatchObject({ tab: 'joins', preset: 'month', horizon: 30, lapsed: false, days: 14, today })
        expect(q.range).toEqual({ from: '2026-09-01', to: today })
    })
    it('parses horizon, lapsed, days and rejects junk', () => {
        expect(parseMembersParams({ tab: 'renewals', horizon: '15', lapsed: '1' }, today)).toMatchObject({ tab: 'renewals', horizon: 15, lapsed: true })
        expect(parseMembersParams({ tab: 'inactive', days: '30' }, today)).toMatchObject({ days: 30 })
        expect(parseMembersParams({ tab: 'nope', horizon: '9', days: '2', lapsed: 'yes' }, today)).toMatchObject({ tab: 'joins', horizon: 30, days: 14, lapsed: false })
    })
})

describe('membersSearchParams / filename', () => {
    it('joins keeps period only', () => {
        const q = parseMembersParams({ tab: 'joins', preset: 'year' }, today)
        expect(membersSearchParams(q).toString()).toBe('tab=joins&preset=year')
        expect(membersExportFilename(q)).toBe('members-joins-2026-01-01-2026-09-16.csv')
    })
    it('renewals upcoming vs lapsed', () => {
        const up = parseMembersParams({ tab: 'renewals', horizon: '7' }, today)
        expect(membersSearchParams(up).toString()).toBe('tab=renewals&horizon=7')
        expect(membersExportFilename(up)).toBe('members-renewals-next7d-2026-09-16.csv')
        const lapsed = parseMembersParams({ tab: 'renewals', lapsed: '1', preset: 'custom', from: '2026-08-01', to: '2026-08-31' }, today)
        expect(membersSearchParams(lapsed).toString()).toBe('tab=renewals&horizon=30&lapsed=1&preset=custom&from=2026-08-01&to=2026-08-31')
        expect(membersExportFilename(lapsed)).toBe('members-renewals-lapsed-2026-08-01-2026-08-31.csv')
    })
    it('roster and inactive', () => {
        expect(membersSearchParams(parseMembersParams({ tab: 'roster' }, today)).toString()).toBe('tab=roster')
        expect(membersExportFilename(parseMembersParams({ tab: 'roster' }, today))).toBe('members-roster-2026-09-16.csv')
        const inactive = parseMembersParams({ tab: 'inactive', days: '7' }, today)
        expect(membersSearchParams(inactive).toString()).toBe('tab=inactive&days=7')
        expect(membersExportFilename(inactive)).toBe('members-inactive-7d-2026-09-16.csv')
    })
})
```
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** `lib/reports/members-params.ts`
```ts
import { chooseBucket, isIsoDate, previousRange, rangeForPreset, type Bucket, type DateRange, type Preset } from '@/lib/reports/dates'
import type { RawParams } from '@/lib/reports/payments-params'

export type { RawParams }
export type MembersTab = 'joins' | 'renewals' | 'retention' | 'roster' | 'inactive'
export const MEMBERS_TABS: { id: MembersTab; label: string }[] = [
    { id: 'joins', label: 'New joins' },
    { id: 'renewals', label: 'Renewals due' },
    { id: 'retention', label: 'Retention' },
    { id: 'roster', label: 'Roster' },
    { id: 'inactive', label: 'Inactive' },
]
export type Horizon = 7 | 15 | 30
export type InactiveDays = 7 | 14 | 30
export const HORIZONS: Horizon[] = [7, 15, 30]
export const INACTIVE_DAYS: InactiveDays[] = [7, 14, 30]

export type MembersReportQuery = {
    tab: MembersTab
    preset: Preset
    range: DateRange
    previous: DateRange
    bucket: Bucket
    horizon: Horizon
    lapsed: boolean
    days: InactiveDays
    today: string
}

const TABS = new Set<string>(MEMBERS_TABS.map((t) => t.id))
const PRESETS = new Set<string>(['week', 'month', 'year', 'custom'])
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
function pick<T extends number>(value: string | undefined, allowed: T[], fallback: T): T {
    const n = Number(value)
    return (allowed as number[]).includes(n) ? (n as T) : fallback
}

export function parseMembersParams(raw: RawParams, today: string): MembersReportQuery {
    const tabValue = first(raw.tab)
    const tab: MembersTab = tabValue && TABS.has(tabValue) ? (tabValue as MembersTab) : 'joins'
    const presetValue = first(raw.preset)
    let preset: Preset = presetValue && PRESETS.has(presetValue) ? (presetValue as Preset) : 'month'
    const from = first(raw.from)
    const to = first(raw.to)
    let range: DateRange
    if (preset === 'custom' && isIsoDate(from) && isIsoDate(to) && from <= to) range = { from, to }
    else { preset = preset === 'custom' ? 'month' : preset; range = rangeForPreset(preset, today) }
    return {
        tab, preset, range, previous: previousRange(range), bucket: chooseBucket(range),
        horizon: pick(first(raw.horizon), HORIZONS, 30),
        lapsed: first(raw.lapsed) === '1',
        days: pick(first(raw.days), INACTIVE_DAYS, 14),
        today,
    }
}

function periodInto(params: URLSearchParams, q: MembersReportQuery) {
    params.set('preset', q.preset)
    if (q.preset === 'custom') { params.set('from', q.range.from); params.set('to', q.range.to) }
}

export function membersSearchParams(q: MembersReportQuery): URLSearchParams {
    const params = new URLSearchParams({ tab: q.tab })
    switch (q.tab) {
        case 'joins':
        case 'retention':
            periodInto(params, q); break
        case 'renewals':
            params.set('horizon', String(q.horizon))
            if (q.lapsed) { params.set('lapsed', '1'); periodInto(params, q) }
            break
        case 'inactive':
            params.set('days', String(q.days)); break
        case 'roster':
            break
    }
    return params
}

export function membersExportFilename(q: MembersReportQuery): string {
    switch (q.tab) {
        case 'renewals': return q.lapsed ? `members-renewals-lapsed-${q.range.from}-${q.range.to}.csv` : `members-renewals-next${q.horizon}d-${q.today}.csv`
        case 'roster': return `members-roster-${q.today}.csv`
        case 'inactive': return `members-inactive-${q.days}d-${q.today}.csv`
        default: return `members-${q.tab}-${q.range.from}-${q.range.to}.csv`
    }
}
```
- [ ] **Step 4: Extend `ReportPaymentRow`.** In `payments-aggregate.ts` add the three fields to the type; in `payments.ts` add `'member_id', 'membership_start_date', 'membership_end_date'` to `SELECT`, to `RawRow` (`member_id: string`, dates `string | null`), and copy them through in the mapping. Add `member_id: 'm1', membership_start_date: null, membership_end_date: null` to the three test fixtures listed above.
- [ ] **Step 5: Verify** `npm test` (52 + 4 = 56), tsc, `npx eslint lib/reports`. Stage.

---

### Task 2: Members aggregation (pure)

**Files:**
- Create: `lib/reports/members-aggregate.ts`
- Test: `lib/reports/__tests__/members-aggregate.test.ts`

**Interfaces:**
```ts
export type EffectiveStatus = 'active' | 'expiring' | 'expired' | 'frozen' | 'inactive'
export const STATUS_LABELS: Record<EffectiveStatus, string>
export type ReportMemberRow = { id: string; member_code: string; full_name: string; phone: string; status: 'active'|'inactive'|'frozen'|'expired'; plan_name: string | null; plan_price: number; plan_duration_days: number; membership_start_date: string | null; membership_expiry_date: string | null; referrer_name: string | null; created_at: string; is_demo: boolean }
export type MembershipWindow = { member_id: string; start: string; end: string; amount: number; payment_date: string; plan_name: string | null }
export type PaymentStub = { member_id: string; amount: number; payment_date: string; membership_start_date: string | null; membership_end_date: string | null; plan_name: string | null }   // from ReportPaymentRow (paid only)
export function effectiveStatus(m: Pick<ReportMemberRow,'status'|'membership_expiry_date'>, today: string): EffectiveStatus
export function windowsFrom(payments: PaymentStub[]): MembershipWindow[]           // paid rows with both dates, sorted by start asc
export function isRenewed(window: MembershipWindow, all: MembershipWindow[]): boolean   // another window of same member, start > window.start and start ≤ addDays(end,30)
export function latestPayment(payments: PaymentStub[], memberId: string): PaymentStub | null
export function firstPayment(payments: PaymentStub[], memberId: string): PaymentStub | null
export type JoinRow = { member: ReportMemberRow; joinDate: string; source: 'referral' | 'walk-in'; firstPayment: PaymentStub | null }
export function joins(members: ReportMemberRow[], payments: PaymentStub[], range: DateRange): JoinRow[]   // created_at (IST date) in range, newest first
export type JoinKpis = { joins: number; referralShare: number }
export function joinKpis(rows: JoinRow[]): JoinKpis
export type RenewalRow = { member: ReportMemberRow; expiry: string; daysLeft: number; lastPayment: PaymentStub | null }
export function renewalsDue(members, payments, today, horizon): RenewalRow[]   // effective active|expiring, today ≤ expiry ≤ today+horizon, expiry asc
export type LapsedRow = { member: ReportMemberRow; endedOn: string; overdueDays: number; lastPayment: PaymentStub | null }
export function lapsed(members, windows, payments, range, today): LapsedRow[]   // per spec; one row per member (latest window); end desc
export type RetentionBucket = { start: string; label: string; ended: number; renewed: number; retention: number | null; churned: number }
export function retentionBuckets(windows, range, bucket): RetentionBucket[]
export function retentionTotals(buckets): Omit<RetentionBucket,'start'|'label'>
export function churned(members, windows, payments, range): LapsedRow[]   // unrenewed windows ending in range, one per member (latest), end desc — no "came back" exclusion
export type RosterCounts = Record<EffectiveStatus, number> & { total: number }
export function rosterCounts(members, today): RosterCounts
export type PlanRow = { plan: string; members: number; share: number; price: number; durationDays: number; monthlyValue: number }
export function planDistribution(members, today): PlanRow[]   // active|expiring only; members desc
export type InactiveRow = { member: ReportMemberRow; lastVisit: string | null; daysSince: number | null; expiry: string | null }
export function inactive(members, lastVisits: Map<string,string>, today, days): InactiveRow[]   // active|expiring, lastVisit null or < today−days+1; never first then oldest
```
Helpers: `istDate(iso: string): string` = calendar date in Asia/Kolkata of a timestamp (use `todayInKolkata(new Date(iso))` from `dates.ts`).

- [ ] **Step 1: Failing test** — write `lib/reports/__tests__/members-aggregate.test.ts` covering, with small fixtures built by `member(o)` / `stub(o)` helpers:
  - `effectiveStatus`: expiry today → `expiring`; today+7 → `expiring`; today+8 → `active`; yesterday → `expired`; null → `expired`; `frozen`/`inactive` override regardless of expiry.
  - `windowsFrom` drops rows missing either date, sorts by start.
  - `isRenewed`: next window starting exactly end+30 → true; end+31 → false; a window starting before `window.start` doesn't count.
  - `joins`: uses IST date of `created_at` (`'2026-09-15T20:00:00Z'` counts as 2026-09-16), source referral when `referrer_name` set, `firstPayment` is the earliest paid stub; newest first; `joinKpis` referralShare = 50 for 1 of 2.
  - `renewalsDue`: horizon 7 includes expiry today and today+7, excludes today+8 and yesterday and frozen; `daysLeft`; sorted by expiry.
  - `lapsed`: window ended in range and not renewed → row with `overdueDays`; excluded when member's `membership_expiry_date ≥ today`; renewed windows excluded; one row per member.
  - `retentionBuckets`/`retentionTotals`: two windows ending in a month, one renewed → ended 2, renewed 1, retention 50, churned 1; empty bucket retention null; totals recompute.
  - `churned`: same fixture → 1 row, includes a member who came back (no exclusion).
  - `rosterCounts` + `planDistribution`: counts each status; plan share/monthly value (price 3000, 90 days → 1000); "No plan" bucket.
  - `inactive`: never-visited first, then oldest visit; visit at today−13 with days 14 → excluded; today−14 → included with daysSince 14; expired members excluded.
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** `lib/reports/members-aggregate.ts` per the interfaces above. Use `addDaysIso`, `daysBetweenInclusive`, `bucketStart`, `bucketLabel`, `todayInKolkata` from `dates.ts`; reuse the `nextBucketStart` pattern from `expenses-aggregate.ts` (copy the 5-line function; a shared export can come later). `daysSince = daysBetweenInclusive({from:lastVisit,to:today}) − 1`; `daysLeft = daysBetweenInclusive({from:today,to:expiry}) − 1`; `overdueDays = daysBetweenInclusive({from:end,to:today}) − 1`.
- [ ] **Step 4:** run → PASS; `npx eslint lib/reports` clean. Stage.

---

### Task 3: Server fetcher

**Files:**
- Create: `lib/reports/members.ts`

```ts
export type JoinsReport = { rows: JoinRow[]; kpis: JoinKpis; previous: JoinKpis }
export type RenewalsReport = { mode: 'upcoming'; rows: RenewalRow[]; horizon: Horizon } | { mode: 'lapsed'; rows: LapsedRow[] }
export type RetentionReport = { buckets: RetentionBucket[]; totals: ReturnType<typeof retentionTotals>; previous: ReturnType<typeof retentionTotals>; churned: LapsedRow[] }
export type RosterReport = { counts: RosterCounts; plans: PlanRow[]; asOf: string }
export type InactiveReport = { rows: InactiveRow[]; days: InactiveDays }
export async function getJoins(gymId, query): Promise<JoinsReport>
export async function getRenewals(gymId, query): Promise<RenewalsReport>
export async function getRetention(gymId, query): Promise<RetentionReport>
export async function getRoster(gymId, today): Promise<RosterReport>
export async function getInactive(gymId, query): Promise<InactiveReport>
```
- `fetchMembers(gymId)` — all members of the gym (paged), mapped to `ReportMemberRow` with `plan:membership_plans(name, price, duration_days)` and `referrer:members!members_referred_by_fkey(full_name)`; `is_demo` from ledger `'member'`.
- `fetchPaidStubs(gymId, range?)` — `fetchPaymentRows` over a wide range (for joins/retention/renewals/lapsed use `{ from: '2000-01-01', to: query.range.to }` capped by today for "all history"; document why: renewal detection needs every window) filtered to `payment_status === 'paid'`, mapped to `PaymentStub` (`member_id` is on `ReportPaymentRow` since Task 1).
- `fetchLastVisits(gymId, since)` — `check_ins` `member_id, check_in_time` where `check_in_time ≥ since` ordered desc, paged, reduced to `Map<member_id, IST date>` keeping the first (latest) per member.
- Joins: previous KPIs from the previous range using the same members/payments arrays.
- Verify tsc + eslint. Stage.

---

### Task 4: CSV builders + export route

**Files:** `lib/reports/members-csv.ts`, `lib/reports/__tests__/members-csv.test.ts`, `app/admin/reports/members/export/route.ts`

Builders: `joinsCsv` (Join date, Member, Member ID, Phone, Plan, Source, Referrer, First payment, First payment date), `renewalsCsv` (upcoming: Member, Member ID, Phone, Plan, Expiry, Days left, Last payment, Last payment date; lapsed: … Ended on, Overdue days …), `retentionCsv` (Bucket start, Period, Ended, Renewed, Retention %, Churned — then a blank line and the churned list with header Member, Member ID, Phone, Plan, Ended on, Last payment, Last payment date), `rosterCsv` (status counts rows `Status, Members` then blank line then Plan, Members, Share %, Price, Duration days, Monthly value), `inactiveCsv` (Member, Member ID, Phone, Plan, Expiry, Last visit, Days since). Round percentages to 2 dp. Tests assert header lines and one data row each. Route mirrors the expenses route with a 5-arm switch.

---

### Task 5: UI

**Files:** `components/reports/members/*` per spec §4, `components/reports/ReportSkeleton.tsx` (+`MembersTabSkeleton`, `MembersShellSkeleton`), `app/admin/reports/members/{page,loading}.tsx`, `components/reports/ReportsLanding.tsx` (Members `href`).

- `MembersReport.tsx`: shell like `ExpensesReport` (title "Members", tabs from `MEMBERS_TABS`, links via `membersSearchParams({ ...query, tab })`).
- `RenewalsControls.tsx` (`'use client'`): horizon chips 7/15/30 (aria-pressed) + "Lapsed in period" toggle button; writes `horizon` / `lapsed` via `membersSearchParams` and `router.push`. When `lapsed`, the page also renders `PeriodPicker`.
- `DaysChips.tsx` (`'use client'`): 7/14/30 chips writing `days`.
- Tables per spec §3 with the shared class constants; `CopyPhoneButton` reused from `components/reports/payments/CopyPhoneButton` (import it; do not duplicate); `DeltaBadge` for KPIs; demo badge; empty states; footers.
- `RosterCards.tsx`: six small cards (active, expiring, expired, frozen, inactive, total) with an "As of {date}" caption; `PlanDistributionTable` with total row.
- Page: `TabBody` switch; controls per tab: joins/retention → `PeriodPicker` + export; renewals → `RenewalsControls` (+ `PeriodPicker` when lapsed) + export; roster → export only; inactive → `DaysChips` + export. Suspense keyed on `membersSearchParams(query).toString()`.
- Skeletons: joins 6 cols, renewals 6, retention KPIs + 5 cols + 6-col list, roster 6 cards + 6 cols, inactive 6.
- Verify `npm test`, tsc, scoped eslint, `npm run build` (routes `/admin/reports/members`, `/admin/reports/members/export`). Stage.

---

### Task 6: Roadmap + hand-off

- Flip `## 3. Members  — coming soon` → `## 3. Members  — shipped (branch worktree-advanced-reports)`.
- Hand-off note: joins source column; renewals horizon chips + lapsed toggle; retention numbers reconcile with a known renewal; roster counts match the members page; inactive respects the N chips; CSV per tab.
- `git add -A`, `git status --short`. No commit.
