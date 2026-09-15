# Advanced Reports — Payments (v1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tenant admin's basic `/admin/reports` page with a feature-gated Advanced Reports section whose Payments area (day book, period summary, by plan, pending, by staff, CSV export, printable day book) is complete, and whose other areas are shown as "Coming soon".

**Architecture:** A server layout gates `/admin/reports/*` on the `advanced_reports` platform flag. Pure aggregation functions in `lib/reports/payments-aggregate.ts` (unit-tested with vitest) turn narrow `payments` selects into report rows; `lib/reports/payments.ts` does the fetching; server components render tables; small client islands handle the period picker, date pager, print and copy-phone; a route handler streams CSV from the same functions.

**Tech Stack:** Next.js 16 App Router (server components, route handlers), React 19, TypeScript 5, Tailwind 4, date-fns 4, lucide-react, sonner, Supabase admin client, vitest (new dev dependency).

**Spec:** `docs/superpowers/specs/2026-09-15-advanced-reports-payments-design.md` (roadmap: `docs/superpowers/specs/2026-09-15-advanced-reports-roadmap.md`)

## Global Constraints

- Path alias `@/*` → repo root. 4-space indentation, single quotes, no semicolons (match `app/admin/finances/payments/page.tsx`).
- Feature key is exactly `advanced_reports`; resolve only via `gymHasFeature` from `@/lib/gym/features`.
- **Collected** = Σ `amount` where `payment_status === 'paid'`; pending / failed / refunded are never added to collected.
- **Admission fees** = Σ `coalesce(admission_fee_amount, 0)` over paid rows; **Membership revenue** = collected − admission fees; **Coins redeemed** = Σ `referral_coins_used` over paid rows; **Refunded** = Σ `amount` where status `refunded`; **Avg ticket** = collected ÷ paid count, 0 when none.
- Ledger date = `payment_date` (a `date` string); within a day order by `created_at`.
- "Today" = current date in `Asia/Kolkata`.
- Bucket: range ≤ 31 days → `day`; ≤ 120 → `week` (Monday start); else `month`.
- Presets: `week` = Monday of current week → today; `month` = 1st → today; `year` = 1 Jan → today. Previous period = same length ending the day before `from`.
- Search params: `tab` ∈ `daybook|summary|plans|pending|staff` (default `daybook`); `date`; `preset` ∈ `week|month|year|custom` (default `month`); `from`, `to`. Invalid values fall back silently.
- CSV filenames: `payments-<tab>-<from>[-<to>].csv`. Amounts raw numbers, dates ISO.
- Admin UI at app scale: no hero type, no glows, no below-fold CTAs; use `taste-skill` + `ui-ux-pro-max` skills for the visual pass in Tasks 7–10 within that constraint.
- Do **not** commit or push on the user's behalf unless explicitly told to — leave commits for the user (user memory rule). Where a step says "Commit", stage and show `git status` instead.

---

## File map

| File | Responsibility |
|---|---|
| `package.json`, `vitest.config.ts` | test runner |
| `lib/reports/dates.ts` | Asia/Kolkata "today", preset → range, bucket choice, previous range, ISO helpers (pure) |
| `lib/reports/csv.ts` | `toCsv(headers, rows)` (pure) |
| `lib/reports/payments-aggregate.ts` | row types + all rollups (pure) |
| `lib/reports/payments.ts` | server-only fetchers returning aggregate outputs |
| `lib/reports/payments-params.ts` | parse search params → `PaymentsReportQuery` (pure) |
| `app/admin/reports/layout.tsx` | feature gate |
| `app/admin/reports/page.tsx` | landing |
| `app/admin/reports/payments/page.tsx` | report page |
| `app/admin/reports/payments/export/route.ts` | CSV |
| `components/reports/ReportsLocked.tsx`, `ReportsLanding.tsx`, `PeriodPicker.tsx`, `DatePager.tsx`, `ExportCsvButton.tsx` | shared UI |
| `components/reports/payments/PaymentsReport.tsx`, `DayBookTable.tsx`, `PrintButton.tsx`, `SummaryTable.tsx`, `ByPlanTable.tsx`, `PendingTable.tsx`, `CopyPhoneButton.tsx`, `ByStaffTable.tsx` | payments UI |
| **Delete** `components/reports/ReportsDashboard.tsx` | old page |

---

### Task 1: Test runner + date helpers

**Files:**
- Modify: `package.json` (scripts + devDependencies)
- Create: `vitest.config.ts`
- Create: `lib/reports/dates.ts`
- Test: `lib/reports/__tests__/dates.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Bucket = 'day' | 'week' | 'month'
  export type Preset = 'week' | 'month' | 'year' | 'custom'
  export type DateRange = { from: string; to: string }          // ISO YYYY-MM-DD, inclusive
  export function todayInKolkata(now?: Date): string
  export function isIsoDate(value: unknown): value is string     // strict YYYY-MM-DD and a real calendar date
  export function addDaysIso(date: string, days: number): string
  export function rangeForPreset(preset: Exclude<Preset,'custom'>, today: string): DateRange
  export function previousRange(range: DateRange): DateRange
  export function chooseBucket(range: DateRange): Bucket
  export function bucketStart(date: string, bucket: Bucket): string   // day→same; week→Monday; month→1st
  export function bucketLabel(start: string, bucket: Bucket): string  // day 'dd MMM', week 'dd MMM – dd MMM', month 'MMM yyyy'
  export function daysBetweenInclusive(range: DateRange): number
  ```

- [ ] **Step 1: Install vitest and add the script**

Run: `npm install --save-dev vitest@^3`

Edit `package.json` scripts to add `"test": "vitest run"`.

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
    test: {
        include: ['lib/**/__tests__/**/*.test.ts'],
        environment: 'node',
    },
    resolve: {
        alias: { '@': path.resolve(__dirname) },
    },
})
```

- [ ] **Step 2: Write the failing tests**

`lib/reports/__tests__/dates.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
    todayInKolkata, isIsoDate, addDaysIso, rangeForPreset, previousRange,
    chooseBucket, bucketStart, bucketLabel, daysBetweenInclusive,
} from '@/lib/reports/dates'

describe('todayInKolkata', () => {
    it('rolls to the next day after 18:30 UTC', () => {
        expect(todayInKolkata(new Date('2026-09-15T18:29:00Z'))).toBe('2026-09-15')
        expect(todayInKolkata(new Date('2026-09-15T18:31:00Z'))).toBe('2026-09-16')
    })
})

describe('isIsoDate', () => {
    it('accepts real dates only', () => {
        expect(isIsoDate('2026-02-28')).toBe(true)
        expect(isIsoDate('2026-02-30')).toBe(false)
        expect(isIsoDate('2026-9-1')).toBe(false)
        expect(isIsoDate(undefined)).toBe(false)
    })
})

describe('addDaysIso', () => {
    it('crosses month and year boundaries', () => {
        expect(addDaysIso('2026-01-31', 1)).toBe('2026-02-01')
        expect(addDaysIso('2026-01-01', -1)).toBe('2025-12-31')
    })
})

describe('rangeForPreset', () => {
    const today = '2026-09-15' // a Tuesday
    it('week starts on Monday', () => {
        expect(rangeForPreset('week', today)).toEqual({ from: '2026-09-14', to: today })
    })
    it('week on a Monday is a single day', () => {
        expect(rangeForPreset('week', '2026-09-14')).toEqual({ from: '2026-09-14', to: '2026-09-14' })
    })
    it('month and year', () => {
        expect(rangeForPreset('month', today)).toEqual({ from: '2026-09-01', to: today })
        expect(rangeForPreset('year', today)).toEqual({ from: '2026-01-01', to: today })
    })
})

describe('previousRange', () => {
    it('is the same length ending the day before from', () => {
        expect(previousRange({ from: '2026-09-01', to: '2026-09-15' }))
            .toEqual({ from: '2026-08-17', to: '2026-08-31' })
    })
    it('single day → previous day', () => {
        expect(previousRange({ from: '2026-09-15', to: '2026-09-15' }))
            .toEqual({ from: '2026-09-14', to: '2026-09-14' })
    })
})

describe('chooseBucket', () => {
    it('31 days → day, 32 → week, 120 → week, 121 → month', () => {
        expect(chooseBucket({ from: '2026-08-16', to: '2026-09-15' })).toBe('day')
        expect(chooseBucket({ from: '2026-08-15', to: '2026-09-15' })).toBe('week')
        expect(chooseBucket({ from: '2026-05-19', to: '2026-09-15' })).toBe('week')
        expect(chooseBucket({ from: '2026-05-18', to: '2026-09-15' })).toBe('month')
    })
})

describe('bucketStart / bucketLabel', () => {
    it('week snaps to Monday even across a month edge', () => {
        expect(bucketStart('2026-09-01', 'week')).toBe('2026-08-31')
        expect(bucketLabel('2026-08-31', 'week')).toBe('31 Aug – 06 Sep')
    })
    it('month snaps to the 1st', () => {
        expect(bucketStart('2026-12-25', 'month')).toBe('2026-12-01')
        expect(bucketLabel('2026-12-01', 'month')).toBe('Dec 2026')
    })
    it('day', () => {
        expect(bucketStart('2026-09-15', 'day')).toBe('2026-09-15')
        expect(bucketLabel('2026-09-15', 'day')).toBe('15 Sep')
    })
})

describe('daysBetweenInclusive', () => {
    it('counts both ends', () => {
        expect(daysBetweenInclusive({ from: '2026-09-15', to: '2026-09-15' })).toBe(1)
        expect(daysBetweenInclusive({ from: '2026-09-01', to: '2026-09-15' })).toBe(15)
    })
})
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- lib/reports/__tests__/dates.test.ts`
Expected: FAIL — cannot resolve `@/lib/reports/dates`.

- [ ] **Step 4: Implement `lib/reports/dates.ts`**

```ts
import { addDays, differenceInCalendarDays, format, parseISO, startOfMonth, startOfWeek, startOfYear, isValid } from 'date-fns'

export type Bucket = 'day' | 'week' | 'month'
export type Preset = 'week' | 'month' | 'year' | 'custom'
export type DateRange = { from: string; to: string }

const ISO = /^\d{4}-\d{2}-\d{2}$/

function toIso(date: Date): string {
    return format(date, 'yyyy-MM-dd')
}

/** Calendar date in Asia/Kolkata (UTC+05:30, no DST) — matches the DB's CURRENT_DATE helper. */
export function todayInKolkata(now: Date = new Date()): string {
    const shifted = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000)
    return shifted.toISOString().slice(0, 10)
}

export function isIsoDate(value: unknown): value is string {
    if (typeof value !== 'string' || !ISO.test(value)) return false
    const parsed = parseISO(value)
    return isValid(parsed) && toIso(parsed) === value
}

export function addDaysIso(date: string, days: number): string {
    return toIso(addDays(parseISO(date), days))
}

export function rangeForPreset(preset: Exclude<Preset, 'custom'>, today: string): DateRange {
    const day = parseISO(today)
    const start =
        preset === 'week' ? startOfWeek(day, { weekStartsOn: 1 })
        : preset === 'month' ? startOfMonth(day)
        : startOfYear(day)
    return { from: toIso(start), to: today }
}

export function daysBetweenInclusive(range: DateRange): number {
    return differenceInCalendarDays(parseISO(range.to), parseISO(range.from)) + 1
}

export function previousRange(range: DateRange): DateRange {
    const length = daysBetweenInclusive(range)
    const to = addDaysIso(range.from, -1)
    return { from: addDaysIso(to, -(length - 1)), to }
}

export function chooseBucket(range: DateRange): Bucket {
    const days = daysBetweenInclusive(range)
    if (days <= 31) return 'day'
    if (days <= 120) return 'week'
    return 'month'
}

export function bucketStart(date: string, bucket: Bucket): string {
    const day = parseISO(date)
    if (bucket === 'day') return date
    if (bucket === 'week') return toIso(startOfWeek(day, { weekStartsOn: 1 }))
    return toIso(startOfMonth(day))
}

export function bucketLabel(start: string, bucket: Bucket): string {
    const day = parseISO(start)
    if (bucket === 'day') return format(day, 'dd MMM')
    if (bucket === 'week') return `${format(day, 'dd MMM')} – ${format(addDays(day, 6), 'dd MMM')}`
    return format(day, 'MMM yyyy')
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- lib/reports/__tests__/dates.test.ts`
Expected: PASS (all).

- [ ] **Step 6: Stage**

`git add package.json package-lock.json vitest.config.ts lib/reports` then `git status`. (No commit — user commits.)

---

### Task 2: CSV serialiser

**Files:**
- Create: `lib/reports/csv.ts`
- Test: `lib/reports/__tests__/csv.test.ts`

**Interfaces:**
- Produces: `export type CsvCell = string | number | null | undefined`; `export function toCsv(headers: string[], rows: CsvCell[][]): string` — CRLF line endings, UTF-8 BOM prefix (Excel), RFC 4180 quoting.

- [ ] **Step 1: Failing tests**

`lib/reports/__tests__/csv.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { toCsv } from '@/lib/reports/csv'

describe('toCsv', () => {
    it('writes a BOM, header row and CRLF endings', () => {
        expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('﻿a,b\r\n1,x')
    })
    it('quotes commas, quotes and newlines', () => {
        expect(toCsv(['n'], [['a,b'], ['say "hi"'], ['line\nbreak']]))
            .toBe('﻿n\r\n"a,b"\r\n"say ""hi"""\r\n"line\nbreak"')
    })
    it('renders null/undefined as empty and numbers raw', () => {
        expect(toCsv(['a', 'b', 'c'], [[null, undefined, 1234.5]])).toBe('﻿a,b,c\r\n,,1234.5')
    })
})
```

- [ ] **Step 2: Run** `npm test -- lib/reports/__tests__/csv.test.ts` — expect FAIL (module missing).

- [ ] **Step 3: Implement `lib/reports/csv.ts`**

```ts
export type CsvCell = string | number | null | undefined

function escapeCell(cell: CsvCell): string {
    if (cell === null || cell === undefined) return ''
    const text = typeof cell === 'number' ? String(cell) : cell
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(headers: string[], rows: CsvCell[][]): string {
    const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','))
    return `﻿${lines.join('\r\n')}`
}
```

- [ ] **Step 4: Run** the test file — expect PASS.
- [ ] **Step 5: Stage** `git add lib/reports/csv.ts lib/reports/__tests__/csv.test.ts`.

---

### Task 3: Payment aggregation (pure)

**Files:**
- Create: `lib/reports/payments-aggregate.ts`
- Test: `lib/reports/__tests__/payments-aggregate.test.ts`

**Interfaces:**
- Consumes: `Bucket`, `DateRange`, `bucketStart`, `bucketLabel`, `daysBetweenInclusive`, `previousRange` from Task 1.
- Produces:
  ```ts
  export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'online'
  export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded'
  export const PAYMENT_METHODS: PaymentMethod[]          // fixed order: cash, upi, card, bank_transfer, online
  export const METHOD_LABELS: Record<PaymentMethod, string>

  /** One payment as fetched for reports. Joins are flattened to plain strings. */
  export type ReportPaymentRow = {
      id: string
      amount: number
      admission_fee_amount: number | null
      referral_coins_used: number
      payment_method: PaymentMethod
      payment_status: PaymentStatus
      payment_date: string        // YYYY-MM-DD
      created_at: string          // ISO timestamp
      receipt_number: string | null
      invoice_number: string | null
      notes: string | null
      member_name: string | null
      member_code: string | null  // members.member_id
      member_phone: string | null
      plan_name: string | null
      processor_name: string | null
      is_demo: boolean
  }

  export type MethodTotals = Record<PaymentMethod, number>
  export type DayBookTotals = { collected: number; paidCount: number; byMethod: MethodTotals; pendingCount: number; pendingAmount: number; refundedCount: number; refundedAmount: number }
  export function dayBookTotals(rows: ReportPaymentRow[]): DayBookTotals
  export function sortForDayBook(rows: ReportPaymentRow[]): ReportPaymentRow[]      // created_at asc

  export type SummaryBucket = { start: string; label: string; txns: number; collected: number; byMethod: MethodTotals; admissionFees: number; membershipRevenue: number; coinsRedeemed: number; refunded: number }
  export type SummaryKpis = { collected: number; txns: number; avgTicket: number }
  export function summarise(rows: ReportPaymentRow[], range: DateRange, bucket: Bucket): SummaryBucket[]   // every bucket in range, empty ones included, ascending
  export function kpis(rows: ReportPaymentRow[]): SummaryKpis
  export function deltaPercent(current: number, previous: number): number | null   // null when previous === 0

  export type PlanRow = { plan: string; txns: number; revenue: number; share: number; avgTicket: number }   // share 0..100
  export function byPlan(rows: ReportPaymentRow[]): PlanRow[]        // paid only, revenue desc, "No plan" for null

  export function pendingRows(rows: ReportPaymentRow[]): ReportPaymentRow[]   // status pending|failed, payment_date desc then created_at desc
  export function pendingTotals(rows: ReportPaymentRow[]): { count: number; amount: number }

  export type StaffRow = { staff: string; txns: number; collected: number; cash: number }
  export function byStaff(rows: ReportPaymentRow[]): StaffRow[]      // paid only, collected desc, "Unassigned" for null
  ```

- [ ] **Step 1: Failing tests**

`lib/reports/__tests__/payments-aggregate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import {
    dayBookTotals, sortForDayBook, summarise, kpis, deltaPercent, byPlan,
    pendingRows, pendingTotals, byStaff, type ReportPaymentRow,
} from '@/lib/reports/payments-aggregate'

function row(overrides: Partial<ReportPaymentRow>): ReportPaymentRow {
    return {
        id: overrides.id ?? Math.random().toString(36).slice(2),
        amount: 1000,
        admission_fee_amount: null,
        referral_coins_used: 0,
        payment_method: 'cash',
        payment_status: 'paid',
        payment_date: '2026-09-15',
        created_at: '2026-09-15T04:00:00Z',
        receipt_number: null,
        invoice_number: null,
        notes: null,
        member_name: 'A',
        member_code: 'GYM001',
        member_phone: '9999999999',
        plan_name: 'Monthly',
        processor_name: 'Staff One',
        is_demo: false,
        ...overrides,
    }
}

describe('dayBookTotals', () => {
    it('collects only paid rows and splits by method', () => {
        const t = dayBookTotals([
            row({ amount: 500, payment_method: 'cash' }),
            row({ amount: 700, payment_method: 'upi' }),
            row({ amount: 300, payment_status: 'pending' }),
            row({ amount: 200, payment_status: 'failed' }),
            row({ amount: 100, payment_status: 'refunded' }),
        ])
        expect(t.collected).toBe(1200)
        expect(t.paidCount).toBe(2)
        expect(t.byMethod).toEqual({ cash: 500, upi: 700, card: 0, bank_transfer: 0, online: 0 })
        expect(t.pendingCount).toBe(2)
        expect(t.pendingAmount).toBe(500)
        expect(t.refundedCount).toBe(1)
        expect(t.refundedAmount).toBe(100)
    })
})

describe('sortForDayBook', () => {
    it('orders by created_at ascending without mutating', () => {
        const a = row({ id: 'a', created_at: '2026-09-15T09:00:00Z' })
        const b = row({ id: 'b', created_at: '2026-09-15T03:00:00Z' })
        const input = [a, b]
        expect(sortForDayBook(input).map((r) => r.id)).toEqual(['b', 'a'])
        expect(input[0].id).toBe('a')
    })
})

describe('summarise', () => {
    it('emits every day bucket including empty ones, with fee split', () => {
        const buckets = summarise(
            [
                row({ payment_date: '2026-09-14', amount: 1500, admission_fee_amount: 500, referral_coins_used: 50 }),
                row({ payment_date: '2026-09-14', amount: 200, payment_status: 'refunded' }),
            ],
            { from: '2026-09-13', to: '2026-09-15' },
            'day',
        )
        expect(buckets.map((b) => b.start)).toEqual(['2026-09-13', '2026-09-14', '2026-09-15'])
        expect(buckets[1]).toMatchObject({
            label: '14 Sep', txns: 1, collected: 1500, admissionFees: 500, membershipRevenue: 1000,
            coinsRedeemed: 50, refunded: 200,
        })
        expect(buckets[0].txns).toBe(0)
    })
    it('week buckets start on Monday and cover the range', () => {
        const buckets = summarise(
            [row({ payment_date: '2026-09-02' })],
            { from: '2026-09-01', to: '2026-09-20' },
            'week',
        )
        expect(buckets.map((b) => b.start)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14'])
        expect(buckets[0].collected).toBe(1000)
    })
    it('month buckets cross a year boundary', () => {
        const buckets = summarise([], { from: '2025-11-15', to: '2026-02-10' }, 'month')
        expect(buckets.map((b) => b.label)).toEqual(['Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026'])
    })
})

describe('kpis / deltaPercent', () => {
    it('avg ticket is 0 with no paid rows', () => {
        expect(kpis([row({ payment_status: 'pending' })])).toEqual({ collected: 0, txns: 0, avgTicket: 0 })
        expect(kpis([row({ amount: 300 }), row({ amount: 500 })])).toEqual({ collected: 800, txns: 2, avgTicket: 400 })
    })
    it('delta is null when previous is zero', () => {
        expect(deltaPercent(100, 0)).toBeNull()
        expect(deltaPercent(150, 100)).toBe(50)
        expect(deltaPercent(50, 100)).toBe(-50)
    })
})

describe('byPlan', () => {
    it('groups paid rows, sorts by revenue, computes share', () => {
        const rows = byPlan([
            row({ plan_name: 'Monthly', amount: 1000 }),
            row({ plan_name: 'Yearly', amount: 3000 }),
            row({ plan_name: null, amount: 1000 }),
            row({ plan_name: 'Monthly', amount: 1000, payment_status: 'pending' }),
        ])
        expect(rows.map((r) => r.plan)).toEqual(['Yearly', 'Monthly', 'No plan'])
        expect(rows[0]).toEqual({ plan: 'Yearly', txns: 1, revenue: 3000, share: 60, avgTicket: 3000 })
    })
})

describe('pending', () => {
    it('keeps pending and failed, newest first', () => {
        const rows = pendingRows([
            row({ id: 'p1', payment_status: 'pending', payment_date: '2026-09-10', amount: 100 }),
            row({ id: 'f1', payment_status: 'failed', payment_date: '2026-09-12', amount: 200 }),
            row({ id: 'ok', payment_status: 'paid' }),
            row({ id: 'r', payment_status: 'refunded' }),
        ])
        expect(rows.map((r) => r.id)).toEqual(['f1', 'p1'])
        expect(pendingTotals(rows)).toEqual({ count: 2, amount: 300 })
    })
})

describe('byStaff', () => {
    it('groups paid rows by processor with a cash column', () => {
        const rows = byStaff([
            row({ processor_name: 'S1', amount: 500, payment_method: 'cash' }),
            row({ processor_name: 'S1', amount: 500, payment_method: 'upi' }),
            row({ processor_name: null, amount: 100 }),
            row({ processor_name: 'S1', amount: 999, payment_status: 'failed' }),
        ])
        expect(rows).toEqual([
            { staff: 'S1', txns: 2, collected: 1000, cash: 500 },
            { staff: 'Unassigned', txns: 1, collected: 100, cash: 100 },
        ])
    })
})
```

- [ ] **Step 2: Run** `npm test -- lib/reports/__tests__/payments-aggregate.test.ts` — expect FAIL.

- [ ] **Step 3: Implement `lib/reports/payments-aggregate.ts`**

```ts
import { addDays, addMonths, parseISO, format } from 'date-fns'
import { bucketLabel, bucketStart, type Bucket, type DateRange } from '@/lib/reports/dates'

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank_transfer' | 'online'
export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded'

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'upi', 'card', 'bank_transfer', 'online']
export const METHOD_LABELS: Record<PaymentMethod, string> = {
    cash: 'Cash', upi: 'UPI', card: 'Card', bank_transfer: 'Bank transfer', online: 'Online',
}

export type ReportPaymentRow = {
    id: string
    amount: number
    admission_fee_amount: number | null
    referral_coins_used: number
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    payment_date: string
    created_at: string
    receipt_number: string | null
    invoice_number: string | null
    notes: string | null
    member_name: string | null
    member_code: string | null
    member_phone: string | null
    plan_name: string | null
    processor_name: string | null
    is_demo: boolean
}

export type MethodTotals = Record<PaymentMethod, number>

function emptyMethodTotals(): MethodTotals {
    return { cash: 0, upi: 0, card: 0, bank_transfer: 0, online: 0 }
}

const isPaid = (row: ReportPaymentRow) => row.payment_status === 'paid'
const sum = (rows: ReportPaymentRow[], pick: (row: ReportPaymentRow) => number) =>
    rows.reduce((total, row) => total + pick(row), 0)

// ─── Day book ────────────────────────────────────────────────────────────────

export type DayBookTotals = {
    collected: number
    paidCount: number
    byMethod: MethodTotals
    pendingCount: number
    pendingAmount: number
    refundedCount: number
    refundedAmount: number
}

export function dayBookTotals(rows: ReportPaymentRow[]): DayBookTotals {
    const paid = rows.filter(isPaid)
    const pending = rows.filter((row) => row.payment_status === 'pending' || row.payment_status === 'failed')
    const refunded = rows.filter((row) => row.payment_status === 'refunded')
    const byMethod = emptyMethodTotals()
    for (const row of paid) byMethod[row.payment_method] += row.amount
    return {
        collected: sum(paid, (row) => row.amount),
        paidCount: paid.length,
        byMethod,
        pendingCount: pending.length,
        pendingAmount: sum(pending, (row) => row.amount),
        refundedCount: refunded.length,
        refundedAmount: sum(refunded, (row) => row.amount),
    }
}

export function sortForDayBook(rows: ReportPaymentRow[]): ReportPaymentRow[] {
    return [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export type SummaryBucket = {
    start: string
    label: string
    txns: number
    collected: number
    byMethod: MethodTotals
    admissionFees: number
    membershipRevenue: number
    coinsRedeemed: number
    refunded: number
}

function nextBucketStart(start: string, bucket: Bucket): string {
    const day = parseISO(start)
    const next = bucket === 'day' ? addDays(day, 1) : bucket === 'week' ? addDays(day, 7) : addMonths(day, 1)
    return format(next, 'yyyy-MM-dd')
}

export function summarise(rows: ReportPaymentRow[], range: DateRange, bucket: Bucket): SummaryBucket[] {
    const buckets = new Map<string, SummaryBucket>()
    for (let start = bucketStart(range.from, bucket); start <= range.to; start = nextBucketStart(start, bucket)) {
        buckets.set(start, {
            start, label: bucketLabel(start, bucket), txns: 0, collected: 0, byMethod: emptyMethodTotals(),
            admissionFees: 0, membershipRevenue: 0, coinsRedeemed: 0, refunded: 0,
        })
    }
    for (const row of rows) {
        const target = buckets.get(bucketStart(row.payment_date, bucket))
        if (!target) continue
        if (row.payment_status === 'refunded') {
            target.refunded += row.amount
            continue
        }
        if (!isPaid(row)) continue
        const fee = row.admission_fee_amount ?? 0
        target.txns += 1
        target.collected += row.amount
        target.byMethod[row.payment_method] += row.amount
        target.admissionFees += fee
        target.membershipRevenue += row.amount - fee
        target.coinsRedeemed += row.referral_coins_used
    }
    return [...buckets.values()]
}

export type SummaryKpis = { collected: number; txns: number; avgTicket: number }

export function kpis(rows: ReportPaymentRow[]): SummaryKpis {
    const paid = rows.filter(isPaid)
    const collected = sum(paid, (row) => row.amount)
    return { collected, txns: paid.length, avgTicket: paid.length ? collected / paid.length : 0 }
}

export function deltaPercent(current: number, previous: number): number | null {
    if (previous === 0) return null
    return ((current - previous) / previous) * 100
}

// ─── By plan ─────────────────────────────────────────────────────────────────

export type PlanRow = { plan: string; txns: number; revenue: number; share: number; avgTicket: number }

export function byPlan(rows: ReportPaymentRow[]): PlanRow[] {
    const paid = rows.filter(isPaid)
    const total = sum(paid, (row) => row.amount)
    const groups = new Map<string, { txns: number; revenue: number }>()
    for (const row of paid) {
        const key = row.plan_name ?? 'No plan'
        const group = groups.get(key) ?? { txns: 0, revenue: 0 }
        group.txns += 1
        group.revenue += row.amount
        groups.set(key, group)
    }
    return [...groups.entries()]
        .map(([plan, group]) => ({
            plan, txns: group.txns, revenue: group.revenue,
            share: total ? (group.revenue / total) * 100 : 0,
            avgTicket: group.revenue / group.txns,
        }))
        .sort((a, b) => b.revenue - a.revenue)
}

// ─── Pending ─────────────────────────────────────────────────────────────────

export function pendingRows(rows: ReportPaymentRow[]): ReportPaymentRow[] {
    return rows
        .filter((row) => row.payment_status === 'pending' || row.payment_status === 'failed')
        .sort((a, b) => b.payment_date.localeCompare(a.payment_date) || b.created_at.localeCompare(a.created_at))
}

export function pendingTotals(rows: ReportPaymentRow[]): { count: number; amount: number } {
    return { count: rows.length, amount: sum(rows, (row) => row.amount) }
}

// ─── By staff ────────────────────────────────────────────────────────────────

export type StaffRow = { staff: string; txns: number; collected: number; cash: number }

export function byStaff(rows: ReportPaymentRow[]): StaffRow[] {
    const groups = new Map<string, StaffRow>()
    for (const row of rows.filter(isPaid)) {
        const key = row.processor_name ?? 'Unassigned'
        const group = groups.get(key) ?? { staff: key, txns: 0, collected: 0, cash: 0 }
        group.txns += 1
        group.collected += row.amount
        if (row.payment_method === 'cash') group.cash += row.amount
        groups.set(key, group)
    }
    return [...groups.values()].sort((a, b) => b.collected - a.collected)
}
```

- [ ] **Step 4: Run** the test file — expect PASS.
- [ ] **Step 5: Stage** `git add lib/reports/payments-aggregate.ts lib/reports/__tests__/payments-aggregate.test.ts`.

---

### Task 4: Search-param parsing

**Files:**
- Create: `lib/reports/payments-params.ts`
- Test: `lib/reports/__tests__/payments-params.test.ts`

**Interfaces:**
- Consumes: Task 1 (`isIsoDate`, `rangeForPreset`, `previousRange`, `chooseBucket`, `Preset`, `DateRange`, `Bucket`).
- Produces:
  ```ts
  export type PaymentsTab = 'daybook' | 'summary' | 'plans' | 'pending' | 'staff'
  export const PAYMENTS_TABS: { id: PaymentsTab; label: string }[]
  export type RawParams = Record<string, string | string[] | undefined>
  export type PaymentsReportQuery = {
      tab: PaymentsTab
      date: string                 // day book date
      preset: Preset
      range: DateRange
      previous: DateRange
      bucket: Bucket
  }
  export function parsePaymentsParams(raw: RawParams, today: string): PaymentsReportQuery
  export function toSearchParams(query: PaymentsReportQuery): URLSearchParams   // round-trips the query (used by picker/export links)
  export function exportFilename(query: PaymentsReportQuery): string
  ```

- [ ] **Step 1: Failing tests**

`lib/reports/__tests__/payments-params.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parsePaymentsParams, toSearchParams, exportFilename } from '@/lib/reports/payments-params'

const today = '2026-09-15'

describe('parsePaymentsParams', () => {
    it('defaults to day book today and this month', () => {
        const q = parsePaymentsParams({}, today)
        expect(q.tab).toBe('daybook')
        expect(q.date).toBe(today)
        expect(q.preset).toBe('month')
        expect(q.range).toEqual({ from: '2026-09-01', to: today })
        expect(q.previous).toEqual({ from: '2026-08-17', to: '2026-08-31' })
        expect(q.bucket).toBe('day')
    })
    it('ignores junk', () => {
        const q = parsePaymentsParams({ tab: 'nope', date: '2026-13-01', preset: 'decade' }, today)
        expect(q.tab).toBe('daybook')
        expect(q.date).toBe(today)
        expect(q.preset).toBe('month')
    })
    it('custom range needs both ends in order, else falls back to month', () => {
        expect(parsePaymentsParams({ preset: 'custom', from: '2026-03-01', to: '2026-09-15' }, today).bucket).toBe('month')
        expect(parsePaymentsParams({ preset: 'custom', from: '2026-09-15', to: '2026-09-01' }, today).preset).toBe('month')
        expect(parsePaymentsParams({ preset: 'custom', from: '2026-09-01' }, today).preset).toBe('month')
    })
    it('takes the first value of an array param', () => {
        expect(parsePaymentsParams({ tab: ['staff', 'plans'] }, today).tab).toBe('staff')
    })
})

describe('toSearchParams / exportFilename', () => {
    it('round-trips a day book query', () => {
        const q = parsePaymentsParams({ tab: 'daybook', date: '2026-09-10' }, today)
        expect(toSearchParams(q).toString()).toBe('tab=daybook&date=2026-09-10')
        expect(exportFilename(q)).toBe('payments-daybook-2026-09-10.csv')
    })
    it('round-trips a custom summary query', () => {
        const q = parsePaymentsParams({ tab: 'summary', preset: 'custom', from: '2026-09-01', to: '2026-09-15' }, today)
        expect(toSearchParams(q).toString()).toBe('tab=summary&preset=custom&from=2026-09-01&to=2026-09-15')
        expect(exportFilename(q)).toBe('payments-summary-2026-09-01-2026-09-15.csv')
    })
    it('presets keep only the preset', () => {
        const q = parsePaymentsParams({ tab: 'plans', preset: 'week' }, today)
        expect(toSearchParams(q).toString()).toBe('tab=plans&preset=week')
    })
})
```

- [ ] **Step 2: Run** — expect FAIL.

- [ ] **Step 3: Implement `lib/reports/payments-params.ts`**

```ts
import {
    chooseBucket, isIsoDate, previousRange, rangeForPreset,
    type Bucket, type DateRange, type Preset,
} from '@/lib/reports/dates'

export type PaymentsTab = 'daybook' | 'summary' | 'plans' | 'pending' | 'staff'

export const PAYMENTS_TABS: { id: PaymentsTab; label: string }[] = [
    { id: 'daybook', label: 'Day book' },
    { id: 'summary', label: 'Summary' },
    { id: 'plans', label: 'By plan' },
    { id: 'pending', label: 'Pending' },
    { id: 'staff', label: 'By staff' },
]

export type RawParams = Record<string, string | string[] | undefined>

export type PaymentsReportQuery = {
    tab: PaymentsTab
    date: string
    preset: Preset
    range: DateRange
    previous: DateRange
    bucket: Bucket
}

const TABS = new Set<string>(PAYMENTS_TABS.map((tab) => tab.id))
const PRESETS = new Set<string>(['week', 'month', 'year', 'custom'])

function first(value: string | string[] | undefined): string | undefined {
    return Array.isArray(value) ? value[0] : value
}

export function parsePaymentsParams(raw: RawParams, today: string): PaymentsReportQuery {
    const tabValue = first(raw.tab)
    const tab: PaymentsTab = tabValue && TABS.has(tabValue) ? (tabValue as PaymentsTab) : 'daybook'

    const dateValue = first(raw.date)
    const date = isIsoDate(dateValue) ? dateValue : today

    const presetValue = first(raw.preset)
    let preset: Preset = presetValue && PRESETS.has(presetValue) ? (presetValue as Preset) : 'month'

    const from = first(raw.from)
    const to = first(raw.to)
    let range: DateRange
    if (preset === 'custom' && isIsoDate(from) && isIsoDate(to) && from <= to) {
        range = { from, to }
    } else {
        preset = preset === 'custom' ? 'month' : preset
        range = rangeForPreset(preset, today)
    }

    return { tab, date, preset, range, previous: previousRange(range), bucket: chooseBucket(range) }
}

export function toSearchParams(query: PaymentsReportQuery): URLSearchParams {
    const params = new URLSearchParams({ tab: query.tab })
    if (query.tab === 'daybook') {
        params.set('date', query.date)
        return params
    }
    params.set('preset', query.preset)
    if (query.preset === 'custom') {
        params.set('from', query.range.from)
        params.set('to', query.range.to)
    }
    return params
}

export function exportFilename(query: PaymentsReportQuery): string {
    if (query.tab === 'daybook') return `payments-daybook-${query.date}.csv`
    return `payments-${query.tab}-${query.range.from}-${query.range.to}.csv`
}
```

- [ ] **Step 4: Run** — expect PASS.
- [ ] **Step 5: Stage** the two files.

---

### Task 5: Server fetchers

**Files:**
- Create: `lib/reports/payments.ts`

**Interfaces:**
- Consumes: `getSupabaseAdmin` (`@/lib/supabase/admin`), `getImpersonationOwnedIds` (`@/lib/platform/impersonation-ledger`), Task 3 types/functions, Task 4 `PaymentsReportQuery`.
- Produces:
  ```ts
  export type DayBookReport = { rows: ReportPaymentRow[]; totals: DayBookTotals }
  export type SummaryReport = { buckets: SummaryBucket[]; kpis: SummaryKpis; previous: SummaryKpis }
  export type PlanReport = { rows: PlanRow[]; total: { txns: number; revenue: number } }
  export type PendingReport = { rows: ReportPaymentRow[]; totals: { count: number; amount: number } }
  export type StaffReport = { rows: StaffRow[]; total: { txns: number; collected: number; cash: number } }
  export function getDayBook(gymId: string, date: string): Promise<DayBookReport>
  export function getPeriodSummary(gymId: string, query: PaymentsReportQuery): Promise<SummaryReport>
  export function getByPlan(gymId: string, range: DateRange): Promise<PlanReport>
  export function getPending(gymId: string, range: DateRange): Promise<PendingReport>
  export function getByStaff(gymId: string, range: DateRange): Promise<StaffReport>
  ```
- No unit tests (DB-bound); verified via the page and export in Tasks 8–11 and `next build`.

- [ ] **Step 1: Implement `lib/reports/payments.ts`**

```ts
import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getImpersonationOwnedIds } from '@/lib/platform/impersonation-ledger'
import type { DateRange } from '@/lib/reports/dates'
import type { PaymentsReportQuery } from '@/lib/reports/payments-params'
import {
    byPlan, byStaff, dayBookTotals, kpis, pendingRows, pendingTotals, sortForDayBook, summarise,
    type DayBookTotals, type PlanRow, type ReportPaymentRow, type StaffRow, type SummaryBucket, type SummaryKpis,
} from '@/lib/reports/payments-aggregate'

const SELECT = [
    'id', 'amount', 'admission_fee_amount', 'referral_coins_used', 'payment_method', 'payment_status',
    'payment_date', 'created_at', 'receipt_number', 'invoice_number', 'notes',
    'member:members(full_name, member_id, phone)',
    'membership_plan:membership_plans(name)',
    'processor:profiles!payments_processed_by_fkey(full_name)',
].join(', ')

type RawRow = {
    id: string
    amount: number | string
    admission_fee_amount: number | string | null
    referral_coins_used: number | string | null
    payment_method: ReportPaymentRow['payment_method']
    payment_status: ReportPaymentRow['payment_status']
    payment_date: string
    created_at: string
    receipt_number: string | null
    invoice_number: string | null
    notes: string | null
    member: { full_name: string; member_id: string; phone: string } | { full_name: string; member_id: string; phone: string }[] | null
    membership_plan: { name: string } | { name: string }[] | null
    processor: { full_name: string } | { full_name: string }[] | null
}

function one<T>(value: T | T[] | null): T | null {
    return Array.isArray(value) ? value[0] ?? null : value
}

function toNumber(value: number | string | null | undefined): number {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'))
    return Number.isFinite(parsed) ? parsed : 0
}

async function fetchRows(gymId: string, range: DateRange): Promise<ReportPaymentRow[]> {
    const db = getSupabaseAdmin()
    const [result, demoIds] = await Promise.all([
        db.from('payments').select(SELECT).eq('gym_id', gymId)
            .gte('payment_date', range.from).lte('payment_date', range.to)
            .order('payment_date', { ascending: true }).order('created_at', { ascending: true }),
        getImpersonationOwnedIds(gymId, 'payment'),
    ])
    if (result.error) throw new Error(`Payments report query failed: ${result.error.message}`)

    return ((result.data ?? []) as unknown as RawRow[]).map((row) => {
        const member = one(row.member)
        return {
            id: row.id,
            amount: toNumber(row.amount),
            admission_fee_amount: row.admission_fee_amount === null ? null : toNumber(row.admission_fee_amount),
            referral_coins_used: toNumber(row.referral_coins_used),
            payment_method: row.payment_method,
            payment_status: row.payment_status,
            payment_date: row.payment_date,
            created_at: row.created_at,
            receipt_number: row.receipt_number,
            invoice_number: row.invoice_number,
            notes: row.notes,
            member_name: member?.full_name ?? null,
            member_code: member?.member_id ?? null,
            member_phone: member?.phone ?? null,
            plan_name: one(row.membership_plan)?.name ?? null,
            processor_name: one(row.processor)?.full_name ?? null,
            is_demo: demoIds.has(row.id),
        }
    })
}

export type DayBookReport = { rows: ReportPaymentRow[]; totals: DayBookTotals }
export type SummaryReport = { buckets: SummaryBucket[]; kpis: SummaryKpis; previous: SummaryKpis }
export type PlanReport = { rows: PlanRow[]; total: { txns: number; revenue: number } }
export type PendingReport = { rows: ReportPaymentRow[]; totals: { count: number; amount: number } }
export type StaffReport = { rows: StaffRow[]; total: { txns: number; collected: number; cash: number } }

export async function getDayBook(gymId: string, date: string): Promise<DayBookReport> {
    const rows = sortForDayBook(await fetchRows(gymId, { from: date, to: date }))
    return { rows, totals: dayBookTotals(rows) }
}

export async function getPeriodSummary(gymId: string, query: PaymentsReportQuery): Promise<SummaryReport> {
    const [current, previous] = await Promise.all([fetchRows(gymId, query.range), fetchRows(gymId, query.previous)])
    return { buckets: summarise(current, query.range, query.bucket), kpis: kpis(current), previous: kpis(previous) }
}

export async function getByPlan(gymId: string, range: DateRange): Promise<PlanReport> {
    const rows = byPlan(await fetchRows(gymId, range))
    return { rows, total: rows.reduce((t, r) => ({ txns: t.txns + r.txns, revenue: t.revenue + r.revenue }), { txns: 0, revenue: 0 }) }
}

export async function getPending(gymId: string, range: DateRange): Promise<PendingReport> {
    const rows = pendingRows(await fetchRows(gymId, range))
    return { rows, totals: pendingTotals(rows) }
}

export async function getByStaff(gymId: string, range: DateRange): Promise<StaffReport> {
    const rows = byStaff(await fetchRows(gymId, range))
    return {
        rows,
        total: rows.reduce(
            (t, r) => ({ txns: t.txns + r.txns, collected: t.collected + r.collected, cash: t.cash + r.cash }),
            { txns: 0, collected: 0, cash: 0 },
        ),
    }
}
```

Note on the `processor:profiles!payments_processed_by_fkey(full_name)` hint: `payments` has exactly one FK to `profiles` (`payments_processed_by_fkey`, see `schema.sql:1325`), so the plain `profiles(full_name)` form would also work; the explicit hint is kept so a future second FK does not break the join.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors in `lib/reports/*`.

- [ ] **Step 3: Stage** `git add lib/reports/payments.ts`.

---

### Task 6: Feature gate layout, locked panel, landing page; delete old dashboard

**Files:**
- Create: `app/admin/reports/layout.tsx`
- Create: `components/reports/ReportsLocked.tsx`
- Create: `components/reports/ReportsLanding.tsx`
- Create: `app/admin/reports/error.tsx`
- Modify: `app/admin/reports/page.tsx` (replace whole file)
- Delete: `components/reports/ReportsDashboard.tsx`

**Interfaces:**
- Consumes: `getCurrentAdminContext` (`@/lib/auth/admin-server`), `gymHasFeature` (`@/lib/gym/features`).
- Produces: `REPORT_AREAS` in `ReportsLanding.tsx`:
  ```ts
  export type ReportArea = { id: string; title: string; blurb: string; href?: string }   // href absent → coming soon
  ```

- [ ] **Step 1: Delete the old dashboard**

Run: `git rm components/reports/ReportsDashboard.tsx`

- [ ] **Step 2: `components/reports/ReportsLocked.tsx`**

```tsx
import { Lock } from 'lucide-react'

export default function ReportsLocked({ gymName }: { gymName: string }) {
    return (
        <div className="mx-auto max-w-3xl">
            <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900">
                <div className="rounded-lg bg-gray-100 p-2 text-gray-600 dark:bg-neutral-800 dark:text-neutral-300">
                    <Lock className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                    <h1 className="text-base font-semibold text-gray-900 dark:text-white">Advanced reports are not included in your plan</h1>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">
                        Day books, period summaries, plan and staff breakdowns and CSV exports for {gymName} are available on plans that include advanced reports. Contact the platform team to enable them.
                    </p>
                </div>
            </div>
        </div>
    )
}
```

- [ ] **Step 3: `app/admin/reports/layout.tsx`**

```tsx
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { gymHasFeature } from '@/lib/gym/features'
import ReportsLocked from '@/components/reports/ReportsLocked'

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
    const { gym } = await getCurrentAdminContext()
    // The admin layout already redirects viewers without a gym; this is belt and braces.
    if (!gym) return null

    const enabled = await gymHasFeature(gym.id, 'advanced_reports')
    if (!enabled) return <ReportsLocked gymName={gym.name} />

    return <>{children}</>
}
```

- [ ] **Step 4: `components/reports/ReportsLanding.tsx`**

```tsx
import Link from 'next/link'
import { ArrowRight, BarChart2, CreditCard, Receipt, UserCheck, Users, Gift } from 'lucide-react'

export type ReportArea = { id: string; title: string; blurb: string; href?: string }

export const REPORT_AREAS: ReportArea[] = [
    { id: 'payments', title: 'Payments', blurb: 'Day book, period summary, collections by plan and staff, pending follow-ups, CSV export.', href: '/admin/reports/payments' },
    { id: 'expenses', title: 'Expenses & P&L', blurb: 'Expenses by category and a monthly profit and loss statement.' },
    { id: 'members', title: 'Members', blurb: 'New joins, expiring and lapsed members, churn and retention, plan distribution.' },
    { id: 'attendance', title: 'Attendance', blurb: 'Daily footfall, per-member attendance, hour × weekday heat table.' },
    { id: 'referrals', title: 'Referrals', blurb: 'Referrer leaderboard, conversions, coins issued and redeemed.' },
]

const ICONS: Record<string, React.ReactNode> = {
    payments: <CreditCard className="h-5 w-5" aria-hidden="true" />,
    expenses: <Receipt className="h-5 w-5" aria-hidden="true" />,
    members: <Users className="h-5 w-5" aria-hidden="true" />,
    attendance: <UserCheck className="h-5 w-5" aria-hidden="true" />,
    referrals: <Gift className="h-5 w-5" aria-hidden="true" />,
}

export default function ReportsLanding() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <BarChart2 className="h-5 w-5 text-gray-500 dark:text-neutral-400" aria-hidden="true" />
                <div>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Reports</h1>
                    <p className="text-sm text-gray-600 dark:text-neutral-400">Detailed, exportable views of your gym&apos;s data.</p>
                </div>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {REPORT_AREAS.map((area) => {
                    const body = (
                        <>
                            <div className="flex items-center justify-between">
                                <span className="rounded-lg bg-gray-100 p-2 text-gray-700 dark:bg-neutral-800 dark:text-neutral-200">{ICONS[area.id]}</span>
                                {area.href
                                    ? <ArrowRight className="h-4 w-4 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-gray-700 dark:group-hover:text-white" aria-hidden="true" />
                                    : <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:border-neutral-700 dark:text-neutral-400">Coming soon</span>}
                            </div>
                            <h2 className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">{area.title}</h2>
                            <p className="mt-1 text-sm text-gray-600 dark:text-neutral-400">{area.blurb}</p>
                        </>
                    )
                    const className = 'block h-full rounded-xl border border-gray-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900'
                    return (
                        <li key={area.id}>
                            {area.href
                                ? <Link href={area.href} className={`group ${className} transition hover:border-gray-400 dark:hover:border-neutral-500`}>{body}</Link>
                                : <div aria-disabled="true" className={`${className} opacity-70`}>{body}</div>}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
```

- [ ] **Step 5: Replace `app/admin/reports/page.tsx`**

```tsx
import ReportsLanding from '@/components/reports/ReportsLanding'

export default function ReportsPage() {
    return <ReportsLanding />
}
```

- [ ] **Step 6: `app/admin/reports/error.tsx`** (there is no admin-level error boundary yet; this one scopes to the reports section)

```tsx
'use client'

export default function ReportsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="mx-auto max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <p className="font-semibold">This report could not be loaded.</p>
            <p className="mt-1 text-rose-700/80 dark:text-rose-300/80">{error.digest ? `Reference ${error.digest}` : 'Please try again.'}</p>
            <button type="button" onClick={reset} className="mt-3 rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium hover:bg-rose-100 dark:border-rose-800 dark:hover:bg-rose-900/40">Retry</button>
        </div>
    )
}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint app/admin/reports components/reports lib/reports`
Expected: clean. Also `grep -rn "ReportsDashboard" app components lib` → no matches.

- [ ] **Step 8: Stage** `git add -A app/admin/reports components/reports` and confirm `git status` shows the deletion.

---

### Task 7: Shared controls — PeriodPicker, DatePager, ExportCsvButton

**Files:**
- Create: `components/reports/PeriodPicker.tsx` (client)
- Create: `components/reports/DatePager.tsx` (client)
- Create: `components/reports/ExportCsvButton.tsx` (server)

**Interfaces:**
- Consumes: Task 4 `PaymentsReportQuery`, `toSearchParams`, `Preset`; Task 1 `addDaysIso`.
- Produces:
  ```tsx
  <PeriodPicker query={PaymentsReportQuery} basePath="/admin/reports/payments" />
  <DatePager query={PaymentsReportQuery} basePath="/admin/reports/payments" today={string} />
  <ExportCsvButton query={PaymentsReportQuery} basePath="/admin/reports/payments" />
  ```
  Each control pushes a new URL built from `toSearchParams(query)` with its own key changed; nothing else on the page holds state.

- [ ] **Step 1: `components/reports/PeriodPicker.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toSearchParams, type PaymentsReportQuery } from '@/lib/reports/payments-params'
import type { Preset } from '@/lib/reports/dates'

const PRESETS: { id: Exclude<Preset, 'custom'>; label: string }[] = [
    { id: 'week', label: 'This week' },
    { id: 'month', label: 'This month' },
    { id: 'year', label: 'This year' },
]

export default function PeriodPicker({ query, basePath }: { query: PaymentsReportQuery; basePath: string }) {
    const router = useRouter()
    const [from, setFrom] = useState(query.range.from)
    const [to, setTo] = useState(query.range.to)

    const go = (patch: Record<string, string>) => {
        const params = toSearchParams(query)
        params.delete('from')
        params.delete('to')
        for (const [key, value] of Object.entries(patch)) params.set(key, value)
        router.push(`${basePath}?${params.toString()}`)
    }

    const chip = 'rounded-md px-2.5 py-1 text-xs font-medium transition'
    const on = 'bg-gray-900 text-white dark:bg-white dark:text-neutral-900'
    const off = 'text-gray-600 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800'

    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-neutral-700" role="group" aria-label="Period">
                {PRESETS.map((preset) => (
                    <button key={preset.id} type="button" onClick={() => go({ preset: preset.id })}
                        className={`${chip} ${query.preset === preset.id ? on : off}`} aria-pressed={query.preset === preset.id}>
                        {preset.label}
                    </button>
                ))}
            </div>
            <form
                className="flex items-center gap-1.5"
                onSubmit={(event) => { event.preventDefault(); if (from && to && from <= to) go({ preset: 'custom', from, to }) }}
            >
                <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="From"
                    className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                <span className="text-xs text-gray-400">to</span>
                <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="To"
                    className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                <button type="submit" className={`${chip} ${query.preset === 'custom' ? on : off} border border-gray-200 dark:border-neutral-700`}>Apply</button>
            </form>
        </div>
    )
}
```

- [ ] **Step 2: `components/reports/DatePager.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { addDaysIso } from '@/lib/reports/dates'
import { toSearchParams, type PaymentsReportQuery } from '@/lib/reports/payments-params'

export default function DatePager({ query, basePath, today }: { query: PaymentsReportQuery; basePath: string; today: string }) {
    const router = useRouter()
    const go = (date: string) => {
        const params = toSearchParams(query)
        params.set('date', date)
        router.push(`${basePath}?${params.toString()}`)
    }
    const button = 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'

    return (
        <div className="flex items-center gap-1.5">
            <button type="button" className={button} onClick={() => go(addDaysIso(query.date, -1))} aria-label="Previous day">
                <ChevronLeft className="h-4 w-4" />
            </button>
            <input type="date" value={query.date} max={today} onChange={(e) => e.target.value && go(e.target.value)} aria-label="Day"
                className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
            <button type="button" className={button} onClick={() => go(addDaysIso(query.date, 1))} disabled={query.date >= today} aria-label="Next day">
                <ChevronRight className="h-4 w-4" />
            </button>
            {query.date !== today && (
                <button type="button" onClick={() => go(today)} className="ml-1 text-xs font-medium text-gray-600 underline-offset-2 hover:underline dark:text-neutral-300">Today</button>
            )}
        </div>
    )
}
```

- [ ] **Step 3: `components/reports/ExportCsvButton.tsx`**

```tsx
import { Download } from 'lucide-react'
import { toSearchParams, type PaymentsReportQuery } from '@/lib/reports/payments-params'

export default function ExportCsvButton({ query, basePath }: { query: PaymentsReportQuery; basePath: string }) {
    const href = `${basePath}/export?${toSearchParams(query).toString()}`
    return (
        <a href={href} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
        </a>
    )
}
```

- [ ] **Step 4: Lint** `npx eslint components/reports` — clean. **Stage.**

---

### Task 8: Payments page shell + Day book tab (with print)

**Files:**
- Create: `app/admin/reports/payments/page.tsx`
- Create: `components/reports/payments/PaymentsReport.tsx`
- Create: `components/reports/payments/DayBookTable.tsx`
- Create: `components/reports/payments/PrintButton.tsx` (client)

**Interfaces:**
- Consumes: Tasks 1, 4, 5, 7; `formatCurrency` (`@/lib/utils/currency`), `SupportDemoBadge` (`@/components/platform/SupportDemoBadge`).
- Produces:
  ```tsx
  <PaymentsReport query today gymName controls={ReactNode} kpis={ReactNode?}>{table}</PaymentsReport>
  <DayBookTable report={DayBookReport} date={string} gymName={string} />
  ```
  The page renders one table per `query.tab`; Tasks 9–11 fill the remaining branches.

- [ ] **Step 1: `components/reports/payments/PrintButton.tsx`**

```tsx
'use client'

import { Printer } from 'lucide-react'

export default function PrintButton() {
    return (
        <button type="button" onClick={() => window.print()}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 print:hidden dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Print
        </button>
    )
}
```

- [ ] **Step 2: `components/reports/payments/PaymentsReport.tsx`**

```tsx
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { PAYMENTS_TABS, toSearchParams, type PaymentsReportQuery } from '@/lib/reports/payments-params'

type Props = {
    query: PaymentsReportQuery
    controls: React.ReactNode
    kpis?: React.ReactNode
    children: React.ReactNode
}

export default function PaymentsReport({ query, controls, kpis, children }: Props) {
    return (
        <div className="space-y-5">
            <div className="print:hidden">
                <Link href="/admin/reports" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white">
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Reports
                </Link>
                <h1 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Payments</h1>
            </div>

            <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 print:hidden dark:border-neutral-700" aria-label="Payment reports">
                {PAYMENTS_TABS.map((tab) => {
                    const params = toSearchParams({ ...query, tab: tab.id })
                    const active = tab.id === query.tab
                    return (
                        <Link key={tab.id} href={`/admin/reports/payments?${params.toString()}`}
                            aria-current={active ? 'page' : undefined}
                            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm ${active ? 'border-gray-900 font-medium text-gray-900 dark:border-white dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white'}`}>
                            {tab.label}
                        </Link>
                    )
                })}
            </nav>

            <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">{controls}</div>
            {kpis}
            {children}
        </div>
    )
}
```

- [ ] **Step 3: `components/reports/payments/DayBookTable.tsx`**

```tsx
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { METHOD_LABELS, PAYMENT_METHODS } from '@/lib/reports/payments-aggregate'
import type { DayBookReport } from '@/lib/reports/payments'
import SupportDemoBadge from '@/components/platform/SupportDemoBadge'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'
const num = `${td} text-right tabular-nums`

const STATUS_CLASS: Record<string, string> = {
    paid: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    failed: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    refunded: 'bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-neutral-300',
}

function timeOf(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}

export default function DayBookTable({ report, date, gymName }: { report: DayBookReport; date: string; gymName: string }) {
    const { rows, totals } = report
    return (
        <section className="rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900 print:border-0">
            <header className="hidden print:block px-3 pt-3">
                <p className="text-base font-semibold">{gymName} — Payments day book</p>
                <p className="text-sm">{formatDate(date, 'EEEE, dd MMM yyyy')}</p>
            </header>

            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 dark:border-neutral-700">
                        <tr>
                            <th className={th}>#</th><th className={th}>Time</th><th className={th}>Receipt</th><th className={th}>Member</th>
                            <th className={th}>Plan</th><th className={`${th} text-right`}>Amount</th><th className={`${th} text-right`}>Admission</th>
                            <th className={`${th} text-right`}>Coins</th><th className={th}>Method</th><th className={th}>Status</th><th className={th}>Collected by</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {rows.length === 0 && (
                            <tr><td colSpan={11} className={`${td} py-8 text-center text-gray-500 dark:text-neutral-400`}>No payments on this day</td></tr>
                        )}
                        {rows.map((row, index) => (
                            <tr key={row.id}>
                                <td className={`${td} text-gray-400`}>{index + 1}</td>
                                <td className={`${td} tabular-nums`}>{timeOf(row.created_at)}</td>
                                <td className={`${td} font-mono text-xs`}>{row.receipt_number ?? row.invoice_number ?? '—'}</td>
                                <td className={td}>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-gray-900 dark:text-white">{row.member_name ?? 'Unknown'}</span>
                                        {row.is_demo && <SupportDemoBadge />}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-neutral-400">{row.member_code}</div>
                                </td>
                                <td className={td}>{row.plan_name ?? '—'}</td>
                                <td className={`${num} font-medium`}>{formatCurrency(row.amount)}</td>
                                <td className={num}>{row.admission_fee_amount ? formatCurrency(row.admission_fee_amount) : '—'}</td>
                                <td className={num}>{row.referral_coins_used || '—'}</td>
                                <td className={td}>{METHOD_LABELS[row.payment_method]}</td>
                                <td className={td}><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[row.payment_status]}`}>{row.payment_status}</span></td>
                                <td className={td}>{row.processor_name ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <footer className="border-t border-gray-200 px-3 py-3 dark:border-neutral-700">
                <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {PAYMENT_METHODS.map((method) => (
                        <div key={method}>
                            <dt className="text-xs text-gray-500 dark:text-neutral-400">{METHOD_LABELS[method]}</dt>
                            <dd className="tabular-nums text-gray-900 dark:text-white">{formatCurrency(totals.byMethod[method])}</dd>
                        </div>
                    ))}
                    <div className="ml-auto text-right">
                        <dt className="text-xs text-gray-500 dark:text-neutral-400">Collected · {totals.paidCount} txn{totals.paidCount === 1 ? '' : 's'}</dt>
                        <dd className="text-base font-semibold tabular-nums text-gray-900 dark:text-white">{formatCurrency(totals.collected)}</dd>
                    </div>
                </dl>
                {(totals.pendingCount > 0 || totals.refundedCount > 0) && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
                        Not counted: {totals.pendingCount} pending/failed ({formatCurrency(totals.pendingAmount)}), {totals.refundedCount} refunded ({formatCurrency(totals.refundedAmount)}).
                    </p>
                )}
            </footer>
        </section>
    )
}
```

- [ ] **Step 4: `app/admin/reports/payments/page.tsx`** (day book branch only; other branches added in Tasks 9–11)

```tsx
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { todayInKolkata } from '@/lib/reports/dates'
import { parsePaymentsParams, type RawParams } from '@/lib/reports/payments-params'
import { getDayBook } from '@/lib/reports/payments'
import PaymentsReport from '@/components/reports/payments/PaymentsReport'
import DayBookTable from '@/components/reports/payments/DayBookTable'
import PrintButton from '@/components/reports/payments/PrintButton'
import DatePager from '@/components/reports/DatePager'
import ExportCsvButton from '@/components/reports/ExportCsvButton'

const BASE = '/admin/reports/payments'

export default async function PaymentsReportPage({ searchParams }: { searchParams: Promise<RawParams> }) {
    const { gym } = await getCurrentAdminContext()
    if (!gym) return null

    const today = todayInKolkata()
    const query = parsePaymentsParams(await searchParams, today)

    if (query.tab === 'daybook') {
        const report = await getDayBook(gym.id, query.date)
        return (
            <PaymentsReport
                query={query}
                controls={<>
                    <DatePager query={query} basePath={BASE} today={today} />
                    <div className="flex gap-2"><PrintButton /><ExportCsvButton query={query} basePath={BASE} /></div>
                </>}
            >
                <DayBookTable report={report} date={query.date} gymName={gym.name} />
            </PaymentsReport>
        )
    }

    return <PaymentsReport query={query} controls={null}><p className="text-sm text-gray-500">Coming in the next task.</p></PaymentsReport>
}
```

- [ ] **Step 5: Print stylesheet**

The admin shell (sidebar, header) must hide when printing. Check `app/admin/layout.tsx` for the wrapper; add `print:hidden` to the sidebar/header wrappers **only if** they don't already have it, and ensure the main content area has `print:p-0`. Keep the edit minimal and note the exact lines touched in the task report.

- [ ] **Step 6: Verify** `npx tsc --noEmit -p tsconfig.json && npx eslint app/admin/reports components/reports` clean; `npm run build` succeeds. **Stage.**

---

### Task 9: Summary tab (KPI strip + bucket table)

**Files:**
- Create: `components/reports/payments/SummaryTable.tsx`
- Create: `components/reports/payments/KpiStrip.tsx`
- Modify: `app/admin/reports/payments/page.tsx` (add `summary` branch)

**Interfaces:**
- Consumes: Task 5 `getPeriodSummary`, `SummaryReport`; Task 3 `deltaPercent`, `PAYMENT_METHODS`, `METHOD_LABELS`; Task 7 `PeriodPicker`, `ExportCsvButton`.
- Produces: `<KpiStrip current={SummaryKpis} previous={SummaryKpis} />`, `<SummaryTable report={SummaryReport} />`.

- [ ] **Step 1: `components/reports/payments/KpiStrip.tsx`**

```tsx
import { formatCurrency } from '@/lib/utils/currency'
import { deltaPercent, type SummaryKpis } from '@/lib/reports/payments-aggregate'

function Delta({ current, previous }: { current: number; previous: number }) {
    const delta = deltaPercent(current, previous)
    if (delta === null) return <span className="text-xs text-gray-400">— vs prev</span>
    const up = delta >= 0
    return (
        <span className={`text-xs font-medium tabular-nums ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {up ? '+' : ''}{delta.toFixed(1)}% vs prev
        </span>
    )
}

export default function KpiStrip({ current, previous }: { current: SummaryKpis; previous: SummaryKpis }) {
    const items = [
        { label: 'Collected', value: formatCurrency(current.collected), cur: current.collected, prev: previous.collected },
        { label: 'Transactions', value: String(current.txns), cur: current.txns, prev: previous.txns },
        { label: 'Avg ticket', value: formatCurrency(current.avgTicket), cur: current.avgTicket, prev: previous.avgTicket },
    ]
    return (
        <dl className="grid gap-3 sm:grid-cols-3">
            {items.map((item) => (
                <div key={item.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
                    <dt className="text-xs text-gray-500 dark:text-neutral-400">{item.label}</dt>
                    <dd className="mt-0.5 text-xl font-semibold tabular-nums text-gray-900 dark:text-white">{item.value}</dd>
                    <Delta current={item.cur} previous={item.prev} />
                </div>
            ))}
        </dl>
    )
}
```

- [ ] **Step 2: `components/reports/payments/SummaryTable.tsx`**

```tsx
import { formatCurrency } from '@/lib/utils/currency'
import { METHOD_LABELS, PAYMENT_METHODS } from '@/lib/reports/payments-aggregate'
import type { SummaryReport } from '@/lib/reports/payments'

const th = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400 whitespace-nowrap'
const td = 'px-3 py-2 text-right text-sm tabular-nums text-gray-800 dark:text-neutral-200 whitespace-nowrap'

export default function SummaryTable({ report }: { report: SummaryReport }) {
    const { buckets } = report
    const total = buckets.reduce((t, b) => ({
        txns: t.txns + b.txns, collected: t.collected + b.collected, admissionFees: t.admissionFees + b.admissionFees,
        membershipRevenue: t.membershipRevenue + b.membershipRevenue, coinsRedeemed: t.coinsRedeemed + b.coinsRedeemed, refunded: t.refunded + b.refunded,
        byMethod: Object.fromEntries(PAYMENT_METHODS.map((m) => [m, t.byMethod[m] + b.byMethod[m]])) as typeof b.byMethod,
    }), { txns: 0, collected: 0, admissionFees: 0, membershipRevenue: 0, coinsRedeemed: 0, refunded: 0, byMethod: { cash: 0, upi: 0, card: 0, bank_transfer: 0, online: 0 } })

    const cells = (b: typeof total) => [
        b.txns, formatCurrency(b.collected), ...PAYMENT_METHODS.map((m) => formatCurrency(b.byMethod[m])),
        formatCurrency(b.admissionFees), formatCurrency(b.membershipRevenue), b.coinsRedeemed, formatCurrency(b.refunded),
    ]

    return (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <table className="min-w-full">
                <thead className="border-b border-gray-200 dark:border-neutral-700">
                    <tr>
                        <th className={`${th} text-left`}>Period</th><th className={th}>Txns</th><th className={th}>Collected</th>
                        {PAYMENT_METHODS.map((m) => <th key={m} className={th}>{METHOD_LABELS[m]}</th>)}
                        <th className={th}>Admission fees</th><th className={th}>Membership</th><th className={th}>Coins</th><th className={th}>Refunded</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {buckets.every((b) => b.txns === 0 && b.refunded === 0) && (
                        <tr><td colSpan={11} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-neutral-400">No payments in this period</td></tr>
                    )}
                    {buckets.map((b) => (
                        <tr key={b.start}>
                            <td className={`${td} text-left font-medium text-gray-900 dark:text-white`}>{b.label}</td>
                            {cells(b).map((cell, i) => <td key={i} className={td}>{cell}</td>)}
                        </tr>
                    ))}
                </tbody>
                <tfoot className="border-t border-gray-200 font-semibold dark:border-neutral-700">
                    <tr>
                        <td className={`${td} text-left`}>Total</td>
                        {cells(total).map((cell, i) => <td key={i} className={td}>{cell}</td>)}
                    </tr>
                </tfoot>
            </table>
        </section>
    )
}
```

- [ ] **Step 3: Add the `summary` branch to `app/admin/reports/payments/page.tsx`** (before the fallback):

```tsx
    if (query.tab === 'summary') {
        const report = await getPeriodSummary(gym.id, query)
        return (
            <PaymentsReport
                query={query}
                controls={<><PeriodPicker query={query} basePath={BASE} /><ExportCsvButton query={query} basePath={BASE} /></>}
                kpis={<KpiStrip current={report.kpis} previous={report.previous} />}
            >
                <SummaryTable report={report} />
            </PaymentsReport>
        )
    }
```
Add imports: `getPeriodSummary` from `@/lib/reports/payments`, `PeriodPicker` from `@/components/reports/PeriodPicker`, `KpiStrip`, `SummaryTable`.

- [ ] **Step 4: Verify** typecheck + eslint clean. **Stage.**

---

### Task 10: By plan, Pending (with copy phone), By staff tabs

**Files:**
- Create: `components/reports/payments/ByPlanTable.tsx`
- Create: `components/reports/payments/PendingTable.tsx`
- Create: `components/reports/payments/CopyPhoneButton.tsx` (client)
- Create: `components/reports/payments/ByStaffTable.tsx`
- Modify: `app/admin/reports/payments/page.tsx` (add three branches, remove fallback)

**Interfaces:**
- Consumes: Task 5 `getByPlan`, `getPending`, `getByStaff` and their report types; Task 7 controls.
- Produces: `<ByPlanTable report={PlanReport} />`, `<PendingTable report={PendingReport} />`, `<ByStaffTable report={StaffReport} />`.

- [ ] **Step 1: `CopyPhoneButton.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'

export default function CopyPhoneButton({ phone, name }: { phone: string; name: string }) {
    const [copied, setCopied] = useState(false)
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(phone)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch {
            toast.error('Failed to copy phone number')
        }
    }
    return (
        <button type="button" onClick={copy} aria-label={`Copy phone number for ${name}`} title="Copy phone number"
            className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 dark:text-neutral-300 dark:hover:text-white">
            <span className="tabular-nums">{phone}</span>
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    )
}
```

- [ ] **Step 2: `ByPlanTable.tsx`**

```tsx
import { formatCurrency } from '@/lib/utils/currency'
import type { PlanReport } from '@/lib/reports/payments'

const th = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-right text-sm tabular-nums text-gray-800 dark:text-neutral-200'

export default function ByPlanTable({ report }: { report: PlanReport }) {
    return (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <table className="min-w-full">
                <thead className="border-b border-gray-200 dark:border-neutral-700">
                    <tr><th className={`${th} text-left`}>Plan</th><th className={th}>Txns</th><th className={th}>Revenue</th><th className={th}>Share</th><th className={th}>Avg ticket</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {report.rows.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-neutral-400">No payments in this period</td></tr>}
                    {report.rows.map((row) => (
                        <tr key={row.plan}>
                            <td className={`${td} text-left font-medium text-gray-900 dark:text-white`}>{row.plan}</td>
                            <td className={td}>{row.txns}</td>
                            <td className={td}>{formatCurrency(row.revenue)}</td>
                            <td className={td}>{row.share.toFixed(1)}%</td>
                            <td className={td}>{formatCurrency(row.avgTicket)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="border-t border-gray-200 font-semibold dark:border-neutral-700">
                    <tr><td className={`${td} text-left`}>Total</td><td className={td}>{report.total.txns}</td><td className={td}>{formatCurrency(report.total.revenue)}</td><td className={td}>100%</td><td className={td}>{formatCurrency(report.total.txns ? report.total.revenue / report.total.txns : 0)}</td></tr>
                </tfoot>
            </table>
        </section>
    )
}
```

- [ ] **Step 3: `PendingTable.tsx`**

```tsx
import { formatCurrency } from '@/lib/utils/currency'
import { formatDate } from '@/lib/utils/date'
import { METHOD_LABELS } from '@/lib/reports/payments-aggregate'
import type { PendingReport } from '@/lib/reports/payments'
import SupportDemoBadge from '@/components/platform/SupportDemoBadge'
import CopyPhoneButton from '@/components/reports/payments/CopyPhoneButton'

const th = 'px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-sm text-gray-800 dark:text-neutral-200'

export default function PendingTable({ report }: { report: PendingReport }) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="border-b border-gray-200 dark:border-neutral-700">
                        <tr><th className={th}>Date</th><th className={th}>Member</th><th className={th}>Phone</th><th className={th}>Plan</th><th className={`${th} text-right`}>Amount</th><th className={th}>Method</th><th className={th}>Status</th><th className={th}>Notes</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {report.rows.length === 0 && <tr><td colSpan={8} className={`${td} py-8 text-center text-gray-500 dark:text-neutral-400`}>Nothing pending in this period</td></tr>}
                        {report.rows.map((row) => (
                            <tr key={row.id}>
                                <td className={`${td} whitespace-nowrap`}>{formatDate(row.payment_date, 'dd MMM yyyy')}</td>
                                <td className={td}>
                                    <div className="flex items-center gap-1.5"><span className="font-medium text-gray-900 dark:text-white">{row.member_name ?? 'Unknown'}</span>{row.is_demo && <SupportDemoBadge />}</div>
                                    <div className="text-xs text-gray-500 dark:text-neutral-400">{row.member_code}</div>
                                </td>
                                <td className={td}>{row.member_phone ? <CopyPhoneButton phone={row.member_phone} name={row.member_name ?? 'member'} /> : '—'}</td>
                                <td className={td}>{row.plan_name ?? '—'}</td>
                                <td className={`${td} text-right tabular-nums font-medium`}>{formatCurrency(row.amount)}</td>
                                <td className={td}>{METHOD_LABELS[row.payment_method]}</td>
                                <td className={td}><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.payment_status === 'failed' ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>{row.payment_status}</span></td>
                                <td className={`${td} max-w-xs truncate text-gray-500 dark:text-neutral-400`} title={row.notes ?? undefined}>{row.notes ?? '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <footer className="flex justify-between border-t border-gray-200 px-3 py-3 text-sm dark:border-neutral-700">
                <span className="text-gray-500 dark:text-neutral-400">{report.totals.count} outstanding</span>
                <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{formatCurrency(report.totals.amount)}</span>
            </footer>
        </section>
    )
}
```

- [ ] **Step 4: `ByStaffTable.tsx`**

```tsx
import { formatCurrency } from '@/lib/utils/currency'
import type { StaffReport } from '@/lib/reports/payments'

const th = 'px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400'
const td = 'px-3 py-2 text-right text-sm tabular-nums text-gray-800 dark:text-neutral-200'

export default function ByStaffTable({ report }: { report: StaffReport }) {
    return (
        <section className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <table className="min-w-full">
                <thead className="border-b border-gray-200 dark:border-neutral-700">
                    <tr><th className={`${th} text-left`}>Collected by</th><th className={th}>Txns</th><th className={th}>Collected</th><th className={th}>Cash handled</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    {report.rows.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-500 dark:text-neutral-400">No payments in this period</td></tr>}
                    {report.rows.map((row) => (
                        <tr key={row.staff}>
                            <td className={`${td} text-left font-medium text-gray-900 dark:text-white`}>{row.staff}</td>
                            <td className={td}>{row.txns}</td>
                            <td className={td}>{formatCurrency(row.collected)}</td>
                            <td className={td}>{formatCurrency(row.cash)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="border-t border-gray-200 font-semibold dark:border-neutral-700">
                    <tr><td className={`${td} text-left`}>Total</td><td className={td}>{report.total.txns}</td><td className={td}>{formatCurrency(report.total.collected)}</td><td className={td}>{formatCurrency(report.total.cash)}</td></tr>
                </tfoot>
            </table>
        </section>
    )
}
```

- [ ] **Step 5: Finish `page.tsx`** — replace the "Coming in the next task" fallback with:

```tsx
    const controls = <><PeriodPicker query={query} basePath={BASE} /><ExportCsvButton query={query} basePath={BASE} /></>

    if (query.tab === 'plans') {
        const report = await getByPlan(gym.id, query.range)
        return <PaymentsReport query={query} controls={controls}><ByPlanTable report={report} /></PaymentsReport>
    }
    if (query.tab === 'pending') {
        const report = await getPending(gym.id, query.range)
        return <PaymentsReport query={query} controls={controls}><PendingTable report={report} /></PaymentsReport>
    }
    const report = await getByStaff(gym.id, query.range)
    return <PaymentsReport query={query} controls={controls}><ByStaffTable report={report} /></PaymentsReport>
```
(and lift the `controls` const above the `summary` branch so it is reused there too). Add the imports.

- [ ] **Step 6: Verify** typecheck + eslint + `npm run build`. **Stage.**

---

### Task 11: CSV export route

**Files:**
- Create: `lib/reports/payments-csv.ts` (pure: report → headers + rows)
- Test: `lib/reports/__tests__/payments-csv.test.ts`
- Create: `app/admin/reports/payments/export/route.ts`

**Interfaces:**
- Consumes: Tasks 2–5; `getCurrentAdminContext`, `gymHasFeature`.
- Produces:
  ```ts
  export function dayBookCsv(report: DayBookReport): string
  export function summaryCsv(report: SummaryReport): string
  export function planCsv(report: PlanReport): string
  export function pendingCsv(report: PendingReport): string
  export function staffCsv(report: StaffReport): string
  ```

- [ ] **Step 1: Failing test**

`lib/reports/__tests__/payments-csv.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { dayBookCsv, summaryCsv, planCsv, pendingCsv, staffCsv } from '@/lib/reports/payments-csv'
import type { ReportPaymentRow } from '@/lib/reports/payments-aggregate'

const row: ReportPaymentRow = {
    id: 'p1', amount: 1500, admission_fee_amount: 500, referral_coins_used: 50, payment_method: 'upi', payment_status: 'paid',
    payment_date: '2026-09-15', created_at: '2026-09-15T04:05:00Z', receipt_number: 'R-1', invoice_number: null, notes: 'a, note',
    member_name: 'Asha', member_code: 'GYM001', member_phone: '9999999999', plan_name: 'Monthly', processor_name: 'S1', is_demo: false,
}

describe('payments csv builders', () => {
    it('day book has one line per row plus header, raw numbers', () => {
        const csv = dayBookCsv({ rows: [row], totals: { collected: 1500, paidCount: 1, byMethod: { cash: 0, upi: 1500, card: 0, bank_transfer: 0, online: 0 }, pendingCount: 0, pendingAmount: 0, refundedCount: 0, refundedAmount: 0 } })
        const lines = csv.split('\r\n')
        expect(lines[0]).toBe('﻿Date,Time,Receipt,Member,Member ID,Plan,Amount,Admission fee,Coins used,Method,Status,Collected by,Notes')
        expect(lines[1]).toBe('2026-09-15,09:35,R-1,Asha,GYM001,Monthly,1500,500,50,upi,paid,S1,"a, note"')
        expect(lines).toHaveLength(2)
    })
    it('summary emits buckets with method columns', () => {
        const bucket = { start: '2026-09-15', label: '15 Sep', txns: 1, collected: 1500, byMethod: { cash: 0, upi: 1500, card: 0, bank_transfer: 0, online: 0 }, admissionFees: 500, membershipRevenue: 1000, coinsRedeemed: 50, refunded: 0 }
        const csv = summaryCsv({ buckets: [bucket], kpis: { collected: 1500, txns: 1, avgTicket: 1500 }, previous: { collected: 0, txns: 0, avgTicket: 0 } })
        expect(csv.split('\r\n')[1]).toBe('2026-09-15,15 Sep,1,1500,0,1500,0,0,0,500,1000,50,0')
    })
    it('plan, pending, staff', () => {
        expect(planCsv({ rows: [{ plan: 'Monthly', txns: 1, revenue: 1500, share: 100, avgTicket: 1500 }], total: { txns: 1, revenue: 1500 } }).split('\r\n')[1]).toBe('Monthly,1,1500,100,1500')
        expect(pendingCsv({ rows: [{ ...row, payment_status: 'pending' }], totals: { count: 1, amount: 1500 } }).split('\r\n')[1]).toBe('2026-09-15,Asha,GYM001,9999999999,Monthly,1500,upi,pending,"a, note"')
        expect(staffCsv({ rows: [{ staff: 'S1', txns: 1, collected: 1500, cash: 0 }], total: { txns: 1, collected: 1500, cash: 0 } }).split('\r\n')[1]).toBe('S1,1,1500,0')
    })
})
```

- [ ] **Step 2: Run** — expect FAIL.

- [ ] **Step 3: Implement `lib/reports/payments-csv.ts`**

```ts
import { toCsv } from '@/lib/reports/csv'
import { PAYMENT_METHODS, METHOD_LABELS } from '@/lib/reports/payments-aggregate'
import type { DayBookReport, PendingReport, PlanReport, StaffReport, SummaryReport } from '@/lib/reports/payments'

function timeInKolkata(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' })
}

export function dayBookCsv(report: DayBookReport): string {
    return toCsv(
        ['Date', 'Time', 'Receipt', 'Member', 'Member ID', 'Plan', 'Amount', 'Admission fee', 'Coins used', 'Method', 'Status', 'Collected by', 'Notes'],
        report.rows.map((r) => [
            r.payment_date, timeInKolkata(r.created_at), r.receipt_number ?? r.invoice_number, r.member_name, r.member_code, r.plan_name,
            r.amount, r.admission_fee_amount, r.referral_coins_used, r.payment_method, r.payment_status, r.processor_name, r.notes,
        ]),
    )
}

export function summaryCsv(report: SummaryReport): string {
    return toCsv(
        ['Bucket start', 'Period', 'Txns', 'Collected', ...PAYMENT_METHODS.map((m) => METHOD_LABELS[m]), 'Admission fees', 'Membership revenue', 'Coins redeemed', 'Refunded'],
        report.buckets.map((b) => [
            b.start, b.label, b.txns, b.collected, ...PAYMENT_METHODS.map((m) => b.byMethod[m]),
            b.admissionFees, b.membershipRevenue, b.coinsRedeemed, b.refunded,
        ]),
    )
}

export function planCsv(report: PlanReport): string {
    return toCsv(['Plan', 'Txns', 'Revenue', 'Share %', 'Avg ticket'], report.rows.map((r) => [r.plan, r.txns, r.revenue, r.share, r.avgTicket]))
}

export function pendingCsv(report: PendingReport): string {
    return toCsv(
        ['Date', 'Member', 'Member ID', 'Phone', 'Plan', 'Amount', 'Method', 'Status', 'Notes'],
        report.rows.map((r) => [r.payment_date, r.member_name, r.member_code, r.member_phone, r.plan_name, r.amount, r.payment_method, r.payment_status, r.notes]),
    )
}

export function staffCsv(report: StaffReport): string {
    return toCsv(['Collected by', 'Txns', 'Collected', 'Cash handled'], report.rows.map((r) => [r.staff, r.txns, r.collected, r.cash]))
}
```

- [ ] **Step 4: Run** — expect PASS. (If the `Time` assertion fails on a machine whose ICU lacks `Asia/Kolkata`, the environment is wrong, not the code — Node ≥ 18 ships full ICU.)

- [ ] **Step 5: `app/admin/reports/payments/export/route.ts`**

```ts
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { gymHasFeature } from '@/lib/gym/features'
import { todayInKolkata } from '@/lib/reports/dates'
import { exportFilename, parsePaymentsParams, type RawParams } from '@/lib/reports/payments-params'
import { getByPlan, getByStaff, getDayBook, getPending, getPeriodSummary } from '@/lib/reports/payments'
import { dayBookCsv, pendingCsv, planCsv, staffCsv, summaryCsv } from '@/lib/reports/payments-csv'

export async function GET(request: Request) {
    const { gym } = await getCurrentAdminContext()
    if (!gym) return new Response('Unauthorized', { status: 401 })
    if (!(await gymHasFeature(gym.id, 'advanced_reports'))) return new Response('Advanced reports are not enabled for this gym', { status: 403 })

    const raw: RawParams = Object.fromEntries(new URL(request.url).searchParams.entries())
    const query = parsePaymentsParams(raw, todayInKolkata())

    try {
        let csv: string
        switch (query.tab) {
            case 'daybook': csv = dayBookCsv(await getDayBook(gym.id, query.date)); break
            case 'summary': csv = summaryCsv(await getPeriodSummary(gym.id, query)); break
            case 'plans': csv = planCsv(await getByPlan(gym.id, query.range)); break
            case 'pending': csv = pendingCsv(await getPending(gym.id, query.range)); break
            case 'staff': csv = staffCsv(await getByStaff(gym.id, query.range)); break
        }
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${exportFilename(query)}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (error) {
        console.error('[reports/payments/export]', error)
        return new Response('Export failed', { status: 500 })
    }
}
```

- [ ] **Step 6: Verify** `npm test`, typecheck, eslint, `npm run build` all clean. **Stage.**

---

### Task 12: Visual pass and final verification

**Files:** any of the components created in Tasks 6–10 (styling only — no logic changes).

- [ ] **Step 1: Invoke the design skills** `taste-skill:redesign-existing-projects` (audit mode) and `ui-ux-pro-max:ui-ux-pro-max` on `components/reports/**`, constrained by: admin app scale, no hero type, no glows, no below-fold CTAs, keep existing Tailwind tokens (`gray`/`neutral` palette, `rounded-xl` cards, `text-sm` tables). Apply only changes that survive those constraints; keep all `aria-*`, `print:` classes and data-shape props untouched.

- [ ] **Step 2: Full verification**

Run, in order, and paste outputs in the task report:
```
npm test
npx tsc --noEmit -p tsconfig.json
npx eslint .
npm run build
```
All must be clean.

- [ ] **Step 3: Update the roadmap** — in `docs/superpowers/specs/2026-09-15-advanced-reports-roadmap.md` change `## 1. Payments  — v1 (in progress)` to `## 1. Payments  — shipped (branch worktree-advanced-reports)`.

- [ ] **Step 4: Hand-off note for the user's manual check** (the agent cannot log in): landing cards; locked state after toggling `advanced_reports` off for the gym in the platform portal; each of the five tabs with a preset and a custom range; day-book prev/next/Today; print preview of the day book (sidebar hidden); one CSV per tab opens in Excel with correct columns.

- [ ] **Step 5: Stage everything** `git add -A` and show `git status`. Do not commit — the user commits.
