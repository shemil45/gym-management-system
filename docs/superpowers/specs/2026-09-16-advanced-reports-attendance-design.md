# Advanced Reports — Attendance (area 4) design

Date: 2026-09-16. Parent roadmap: `2026-09-15-advanced-reports-roadmap.md`.
Builds on areas 1–3 (gate, landing, `PeriodQuery` controls, `ReportNavigation`
instant tabs, CSV route pattern, skeletons, `DeltaBadge`, `CopyPhoneButton`).
Anything not restated here is the same as there.

## Goal

Add the fourth area, **Attendance**, at `/admin/reports/attendance`: how
busy the gym is over time, who actually shows up, and when. Three tabs, CSV
each; landing card goes live.

## Decisions taken

- All times are Asia/Kolkata: a check-in's **date**, **hour** (0–23) and
  **weekday** (Mon…Sun) are derived from `check_in_time` in IST.
- **Duration** (minutes) = `check_out_time − check_in_time`, only for rows
  with a check-out; averages ignore rows without one.
- Heat map rows = hours with activity, padded to at least 06:00–22:00.
- Default period preset: **This month**.

## 1. Routing

| Path | Role |
|---|---|
| `app/admin/reports/attendance/page.tsx` | Shell immediately; body behind keyed `Suspense`, inside `ReportNavigationProvider area="attendance"`. |
| `app/admin/reports/attendance/loading.tsx` | Shell skeleton. |
| `app/admin/reports/attendance/export/route.ts` | CSV; staff + `advanced_reports`; 401 / 403 / 500. |
| `components/reports/ReportsLanding.tsx` | Attendance card gets `href`. |

Search params: `tab` ∈ `footfall` \| `members` \| `heatmap` (default
`footfall`); `preset` / `from` / `to` (default `month`); `sort` ∈ `most` \|
`least` \| `gap` (members tab, default `most`). Filenames:
`attendance-<tab>-<from>-<to>.csv`.

## 2. Data layer (no migration)

**`lib/reports/attendance.ts`** (`server-only`): one paged range query on
`check_ins` (`id, member_id, check_in_time, check_out_time, entry_method`,
`gym_id` filtered, `check_in_time` ≥ `${from}T00:00:00+05:30` and
< `${to + 1 day}T00:00:00+05:30` (exclusive upper bound, exact for
microsecond timestamps), ordered `check_in_time asc, id asc`) plus the
member roster from `fetchMembers` (members area) for names / phones / plans
/ demo flags. Previous-period KPIs from a second check-ins query. Exposes
`getFootfall(gymId, query)`, `getByMember(gymId, query)`,
`getHeatmap(gymId, query)`.

**`lib/reports/attendance-aggregate.ts`** — pure, unit-tested:

```ts
export type EntryMethod = 'manual' | 'qr' | 'kiosk' | 'fingerprint'
export const ENTRY_METHODS: EntryMethod[]; export const ENTRY_METHOD_LABELS
export type CheckInRow = { id: string; member_id: string | null; check_in_time: string; check_out_time: string | null; entry_method: EntryMethod | null }
export type Visit = { member_id: string; date: string; hour: number; weekday: number /* 0=Mon … 6=Sun */; minutes: number | null; entry_method: EntryMethod }
export function toVisit(row: CheckInRow & { member_id: string }): Visit  // IST date/hour/weekday; minutes rounded, null if no checkout or negative; null entry_method defaults to manual
export type FootfallBucket = { start: string; label: string; visits: number; uniqueMembers: number; days: number; perDay: number; peakHour: number | null; byMethod: Record<EntryMethod, number>; avgMinutes: number | null }
export function footfallBuckets(visits: Visit[], range: DateRange, bucket: Bucket): FootfallBucket[]
export function footfallTotals(buckets: FootfallBucket[], visits: Visit[], range: DateRange): Omit<FootfallBucket,'start'|'label'>   // uniqueMembers over the whole range, not summed
export type FootfallKpis = { visits: number; uniqueMembers: number; perDay: number }
export function footfallKpis(visits: Visit[], range: DateRange): FootfallKpis
export type MemberAttendanceRow = { member: ReportMemberRow; visits: number; avgMinutes: number | null; lastVisit: string | null; daysSince: number | null }
export type MemberSort = 'most' | 'least' | 'gap'
export function byMember(visits: Visit[], members: ReportMemberRow[], today: string, sort: MemberSort): MemberAttendanceRow[]
   // one row per member with ≥1 visit in range (members not found in roster are skipped); most: visits desc; least: visits asc; gap: daysSince desc
export type Heatmap = { hours: number[]; cells: number[][] /* [hourIndex][weekday] */; rowTotals: number[]; colTotals: number[]; max: number; busiest: { hour: number; weekday: number; count: number } | null }
export function heatmap(visits: Visit[]): Heatmap    // hours = [min(6, earliest)… max(22, latest)] inclusive
```

Definitions:

- **Visits** = check-in rows in range. **Unique members** = distinct
  `member_id`. **Days** in a bucket = calendar days of the bucket that fall
  inside the range. **Per day** = visits ÷ days (1 dp on screen).
- **Peak hour** = hour with the most visits in the bucket (earliest on tie);
  null when no visits.
- **Avg duration** = mean minutes over visits with a check-out; null when
  none.
- **Weekday labels**: Mon Tue Wed Thu Fri Sat Sun.
- **Days since** (by member) = today − last visit date.

## 3. Tabs

| Tab | Columns | Footer / KPIs |
|---|---|---|
| **Footfall** | period, visits, unique members, per day, peak hour (`18:00`), manual, QR, kiosk, fingerprint, avg duration (`42 min` or —) | KPIs visits / unique members / per day with Δ vs previous. Total row (unique members = distinct over the range). Empty state when no visits. |
| **By member** | member (name + ID), phone (copy), plan, visits, avg duration, last visit, days since | Sort chips Most visits / Least visits / Longest gap. Footer: members count · visits total. Demo badge. |
| **Heat map** | rows = hours (`06:00`…), columns Mon…Sun + Total; each cell shows the count with a background alpha proportional to `count / max` (gray scale, dark-mode aware); a Total row | Caption "Busiest: Sat 18:00 · 37 visits". Empty state when no visits. |

CSV: footfall (Bucket start + on-screen columns, raw numbers, including a
`Days` column), members
(Member, Member ID, Phone, Plan, Visits, Avg minutes, Last visit, Days
since), heatmap (Hour, Mon…Sun, Total; then a Total row).

## 4. Components

```
components/reports/attendance/
  AttendanceReport.tsx     shell (title "Attendance", ReportTabs)
  FootfallKpis.tsx  FootfallTable.tsx
  ByMemberTable.tsx  SortChips.tsx (client)
  HeatmapTable.tsx
components/reports/ReportSkeleton.tsx   + AttendanceTabSkeleton, AttendanceShellSkeleton
components/reports/ReportNavigation.tsx  area union gains 'attendance'
```

## 5. Testing, verification, out of scope

Unit tests: `toVisit` IST boundaries (a 20:30Z check-in is the next IST
date; hour/weekday), negative/missing duration → null; footfall buckets
incl. an empty bucket, days clipped to the range, peak-hour tie, method
split, avg over checked-out rows only; totals' distinct unique members;
`byMember` sorts and skips unknown members; heat map hour padding
(06–22 minimum, expands to 23 / 5 when there are visits), busiest cell,
totals. CSV builders. `npm test`, `tsc`, scoped eslint, `next build`,
and the PostgREST smoke test of the check-ins select. Visual on the user.

Out of scope: per-staff manual-entry audit, capacity/occupancy curves,
member-facing streaks, kiosk device analytics.
