# Advanced Reports — Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Attendance area at `/admin/reports/attendance` — Footfall, By member, Heat map — with CSV export, on the existing section framework; flip its landing card live.

**Architecture:** Pure logic in `lib/reports/attendance-aggregate.ts` (vitest) over `Visit` rows derived from `check_ins` in IST; `lib/reports/attendance.ts` fetches (tenant-scoped, paged) and reuses `fetchMembers` from the members area; params module with a `sort` param; CSV builders + route; server tables behind keyed Suspense inside `ReportNavigationProvider` (area union gains `'attendance'`).

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind 4, date-fns 4, Supabase admin client, vitest.

**Spec:** `docs/superpowers/specs/2026-09-16-advanced-reports-attendance-design.md`

## Global Constraints

- 4-space indent, single quotes, no semicolons; alias `@/*`. **No git commits/pushes/stash** — stage only.
- IST for date/hour/weekday (`weekday` 0=Mon … 6=Sun). Duration minutes only with a check-out, rounded, null if negative/missing.
- Per day = visits ÷ days-in-bucket-within-range. Peak hour = most visits, earliest on tie, null when none. Avg duration over checked-out visits only, null when none. Totals' unique members = distinct over the whole range.
- Heat map hours = [min(6, earliest hour) … max(22, latest hour)] inclusive; `cells[hourIndex][weekday]`; busiest = max cell (earliest hour then earliest weekday on tie), null when no visits.
- Params: `tab` ∈ `footfall|members|heatmap` (default `footfall`); `preset` default `month`; `sort` ∈ `most|least|gap` (default `most`). Filenames `attendance-<tab>-<from>-<to>.csv`.
- Every query filtered by `gym_id`; check-ins bounded by `${from}T00:00:00+05:30` … `${to}T23:59:59.999+05:30`; export route `user && gym && isStaff` → 401, flag → 403.
- Same table classes; `ReportTabs` + `ReportNavigationProvider` for instant switching; `SortChips` is the only new client component.

---

### Task 1: Params + aggregation (pure, TDD)

**Files:**
- Create: `lib/reports/attendance-params.ts`, `lib/reports/attendance-aggregate.ts`
- Tests: `lib/reports/__tests__/attendance-params.test.ts`, `lib/reports/__tests__/attendance-aggregate.test.ts`

**Interfaces (params):**
```ts
export type AttendanceTab = 'footfall' | 'members' | 'heatmap'
export const ATTENDANCE_TABS: { id: AttendanceTab; label: string }[]   // Footfall / By member / Heat map
export type MemberSort = 'most' | 'least' | 'gap'
export const MEMBER_SORTS: { id: MemberSort; label: string }[]        // Most visits / Least visits / Longest gap
export type AttendanceReportQuery = { tab: AttendanceTab; preset: Preset; range: DateRange; previous: DateRange; bucket: Bucket; sort: MemberSort; today: string }
export function parseAttendanceParams(raw: RawParams, today: string): AttendanceReportQuery
export function attendanceSearchParams(q: AttendanceReportQuery): URLSearchParams   // tab + period (all tabs); + sort only on members
export function attendanceExportFilename(q: AttendanceReportQuery): string
```
Implement by copying the shape of `lib/reports/expenses-params.ts` (period parsing) and adding `sort` (fallback `most`).

**Interfaces (aggregate):** exactly the block in spec §2. Helpers: IST date via `todayInKolkata(new Date(iso))`; IST hour = `(utcHours*60 + utcMinutes + 330) / 60 | 0` mod 24 (or shift the Date by +5:30 and read `getUTCHours()`); weekday from the shifted date (`getUTCDay()` mapped so Mon=0); minutes = `Math.round((out − in) / 60000)`, null if no checkout or < 0. Bucket iteration: reuse the `nextBucketStart` pattern; days in bucket = `daysBetweenInclusive({ from: max(bucketStart, range.from), to: min(nextStart−1, range.to) })`.

Tests (each a real assertion):
- params: defaults; junk fallback; `sort` parsed only on members and emitted only there; filename.
- `toVisit`: `'2026-09-15T20:30:00Z'` → date `2026-09-16`, hour `2`, weekday for Wed 16 Sep 2026 = 2; `'2026-09-14T00:30:00Z'` (Mon 06:00 IST) → weekday 0, hour 6; checkout 45 min → minutes 45; no checkout → null; checkout before checkin → null.
- `footfallBuckets`: 3-day range with visits on day 1 (two members, hours 18 and 7, one checked out 40 min) and day 3 (one visit hour 18): day 1 visits 2, unique 2, perDay 2, peakHour 7 (hours 18 and 7 tie 1–1 → earliest wins); avgMinutes 40; day 2 all zero, peakHour null, avgMinutes null; method split counts.
- week buckets clipped: range Wed–Fri inside one week → one bucket with `days` 3.
- `footfallTotals`: unique members distinct across buckets (same member on two days counts once).
- `footfallKpis`: perDay = visits / daysBetweenInclusive(range).
- `byMember`: most/least/gap orders; unknown member ids skipped; `daysSince` from last visit date; avgMinutes null when no checkouts.
- `heatmap`: no visits → hours 6…22, cells all zero, busiest null; visit at hour 23 → hours extend to 23; visit at 5 → start at 5; busiest cell and totals; tie → earliest hour.

- [ ] Write both test files → run → FAIL → implement both modules → run → PASS; `npx eslint lib/reports` clean. Stage.

---

### Task 2: Fetcher + CSV + route

**Files:**
- Create: `lib/reports/attendance.ts`, `lib/reports/attendance-csv.ts`, `lib/reports/__tests__/attendance-csv.test.ts`, `app/admin/reports/attendance/export/route.ts`

**Fetcher:**
```ts
export type FootfallReport = { buckets: FootfallBucket[]; totals: ReturnType<typeof footfallTotals>; kpis: FootfallKpis; previous: FootfallKpis }
export type ByMemberReport = { rows: MemberAttendanceRow[]; sort: MemberSort; totalVisits: number }
export type HeatmapReport = Heatmap
export async function fetchCheckIns(gymId: string, range: DateRange): Promise<CheckInRow[]>   // paged 1000, IST bounds, order check_in_time asc, id asc
export async function getFootfall(gymId, query): Promise<FootfallReport>     // current + previous check-ins in parallel
export async function getByMember(gymId, query): Promise<ByMemberReport>     // check-ins + fetchMembers (export it from members.ts if not already) in parallel
export async function getHeatmap(gymId, query): Promise<HeatmapReport>
```
**CSV:** `footfallCsv` (Bucket start, Period, Visits, Unique members, Days, Per day, Peak hour, Manual, QR, Kiosk, Fingerprint, Avg minutes), `byMemberCsv` (Member, Member ID, Phone, Plan, Visits, Avg minutes, Last visit, Days since), `heatmapCsv` (Hour, Mon, Tue, Wed, Thu, Fri, Sat, Sun, Total + final Total row). Per day / avg minutes rounded 2 dp. Tests assert header + one row each.
**Route:** mirror `app/admin/reports/members/export/route.ts` with a 3-arm switch.

- [ ] TDD the CSV module; write fetcher + route; `npm test`, tsc, `npx eslint app/admin/reports lib/reports`. Run the PostgREST smoke test with the publishable key from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `..._PUBLISHABLE_KEY`): `curl -s -o /dev/null -w "%{http_code}" "$URL/rest/v1/check_ins?select=id,member_id,check_in_time,check_out_time,entry_method&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"` must print 200. Stage.

---

### Task 3: UI

**Files:** `components/reports/attendance/*` per spec §4; `components/reports/ReportSkeleton.tsx` (+`AttendanceTabSkeleton` footfall KPIs + 10 cols / members 7 cols / heatmap 9 cols, `AttendanceShellSkeleton`); `components/reports/ReportNavigation.tsx` (`ReportArea` gains `'attendance'`, `skeletonFor` case); `app/admin/reports/attendance/{page,loading}.tsx`; `components/reports/ReportsLanding.tsx` (Attendance `href`).

- `AttendanceReport.tsx`: copy `MembersReport.tsx` (title "Attendance", `ReportTabs` from `ATTENDANCE_TABS` + `attendanceSearchParams`).
- `FootfallKpis.tsx` (visits / unique members / per day, `DeltaBadge`, none inverted); `FootfallTable.tsx` (10 columns per spec §3; `peakHour` → `HH:00`; `avgMinutes` → `n min` / —; total row; empty state).
- `SortChips.tsx` (`'use client'`, chips from `MEMBER_SORTS`, `aria-pressed`, navigates via `useReportNavigation().navigate` with `attendanceSearchParams({ ...query, sort })`).
- `ByMemberTable.tsx` (7 columns; `CopyPhoneButton`; demo badge; footer "n members · m visits").
- `HeatmapTable.tsx`: `<table>` with hour rows and Mon…Sun + Total columns; cell style `backgroundColor: rgba(17,24,39,alpha)` light / `rgba(255,255,255,alpha)` dark where `alpha = 0.08 + 0.72 * count / max` (0 when count 0) — implement with a CSS variable `--heat` set inline and classes `bg-[rgb(17_24_39/var(--heat))] dark:bg-[rgb(255_255_255/var(--heat))]`; numbers `tabular-nums`; total row + total column; caption with busiest; empty state.
- Page: `TabBody` switch; controls = `PeriodPicker` (+ `SortChips` on members) + `ExportCsvButton`; wrap in `ReportNavigationProvider area="attendance"` and `ReportBody`; Suspense keyed on `attendanceSearchParams(query).toString()`.
- [ ] Verify `npm test`, tsc, `npx eslint app/admin/reports components/reports lib/reports`, `npm run build` (both attendance routes). Stage.

---

### Task 4: Roadmap + hand-off

- Flip `## 4. Attendance  — coming soon` → `## 4. Attendance  — shipped (branch worktree-advanced-reports)`.
- Hand-off: footfall totals vs the check-ins page for a day; peak hour sanity; by-member sort chips; heat map shading in light and dark; CSV per tab.
- `git add -A`, `git status --short`. No commit.
