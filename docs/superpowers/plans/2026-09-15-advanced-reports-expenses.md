# Advanced Reports — Expenses & P&L Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Expenses & P&L area at `/admin/reports/expenses` — P&L statement, by-category breakdown, itemised ledger, CSV export — reusing the Payments area's framework, and flip its landing card live.

**Architecture:** Pure aggregation in `lib/reports/expenses-aggregate.ts` (vitest), a server fetcher `lib/reports/expenses.ts` that pages the `expenses` table and reuses the payments row fetcher for income, a params module, CSV builders + route handler, and server-rendered tables behind a keyed Suspense skeleton. The two shared controls are generalised to a `PeriodQuery` type first.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind 4, date-fns 4, lucide-react, Supabase admin client, vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-advanced-reports-expenses-design.md` (parent: `2026-09-15-advanced-reports-payments-design.md`)

## Global Constraints

- 4-space indent, single quotes, no semicolons; alias `@/*`.
- **No git commits or pushes** — stage with `git add`, leave for review (project rule).
- Net income = (membership revenue + admission fees) − refunded; Net = net income − total expenses; Margin % = net ÷ net income × 100, `null` when net income is 0.
- Expense date = `expense_date`; ledger order `expense_date` desc then `created_at` desc.
- Bucket rule (≤31 day / ≤120 week / else month), presets, previous period, Asia/Kolkata "today" — from `lib/reports/dates.ts`.
- Params: `tab` ∈ `pnl|categories|ledger` (default `pnl`); `preset` default **`year`**; `from`,`to`. Filenames `expenses-<tab>-<from>-<to>.csv`.
- Category order and labels: utilities → Utilities, salary → Salary, equipment → Equipment, maintenance → Maintenance, marketing → Marketing, rent → Rent, other → Other.
- Every query filtered by `gym_id`; export route requires `user && gym && isStaff` (401) then `advanced_reports` (403).
- Impersonation rows: `getImpersonationOwnedIds(gymId, 'expense')`, badged with `SupportDemoBadge`.
- Admin UI at app scale; same palette/classes as the payments tables.

---

### Task 1: Generalise the shared period controls

**Files:**
- Create: `lib/reports/period-params.ts`
- Modify: `components/reports/PeriodPicker.tsx`, `components/reports/ExportCsvButton.tsx`, `app/admin/reports/payments/page.tsx`
- Test: `lib/reports/__tests__/period-params.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // lib/reports/period-params.ts
  export type PeriodQuery = { tab: string; preset: Preset; range: DateRange }
  export function periodSearchParams(query: PeriodQuery): URLSearchParams   // tab, preset, and from/to only when preset === 'custom'
  ```
  `PeriodPicker` props become `{ query: PeriodQuery; basePath: string }`; `ExportCsvButton` props become `{ search: string; basePath: string }` (href = `${basePath}/export?${search}`).

- [ ] **Step 1: Failing test** `lib/reports/__tests__/period-params.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { periodSearchParams } from '@/lib/reports/period-params'

describe('periodSearchParams', () => {
    it('emits tab and preset for presets', () => {
        expect(periodSearchParams({ tab: 'pnl', preset: 'year', range: { from: '2026-01-01', to: '2026-09-15' } }).toString())
            .toBe('tab=pnl&preset=year')
    })
    it('adds from/to for custom', () => {
        expect(periodSearchParams({ tab: 'ledger', preset: 'custom', range: { from: '2026-03-01', to: '2026-03-31' } }).toString())
            .toBe('tab=ledger&preset=custom&from=2026-03-01&to=2026-03-31')
    })
})
```
- [ ] **Step 2:** `npm test -- lib/reports/__tests__/period-params.test.ts` → FAIL (module missing).
- [ ] **Step 3: Implement** `lib/reports/period-params.ts`
```ts
import type { DateRange, Preset } from '@/lib/reports/dates'

/** The part of a report query every period-driven tab shares. */
export type PeriodQuery = { tab: string; preset: Preset; range: DateRange }

export function periodSearchParams(query: PeriodQuery): URLSearchParams {
    const params = new URLSearchParams({ tab: query.tab, preset: query.preset })
    if (query.preset === 'custom') {
        params.set('from', query.range.from)
        params.set('to', query.range.to)
    }
    return params
}
```
- [ ] **Step 4: Retarget the controls.** In `components/reports/PeriodPicker.tsx` replace the import of `toSearchParams, type PaymentsReportQuery` with `periodSearchParams, type PeriodQuery` from `@/lib/reports/period-params`; change the prop type to `query: PeriodQuery`; in `go`, build `const params = periodSearchParams(query)` (keep the `delete('from')/delete('to')` + patch logic). In `components/reports/ExportCsvButton.tsx` change props to `{ search, basePath }: { search: string; basePath: string }` and `const href = \`${basePath}/export?${search}\``; drop the payments-params import. In `app/admin/reports/payments/page.tsx` pass `search={toSearchParams(query).toString()}` to both `ExportCsvButton` usages (the `PeriodPicker` call needs no change — `PaymentsReportQuery` is structurally a `PeriodQuery`).
- [ ] **Step 5: Verify** the new test passes, `npm test` (40), `npx tsc --noEmit -p tsconfig.json`, `npx eslint components/reports app/admin/reports lib/reports` clean. Stage.

---

### Task 2: Expenses params

**Files:**
- Create: `lib/reports/expenses-params.ts`
- Test: `lib/reports/__tests__/expenses-params.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ExpensesTab = 'pnl' | 'categories' | 'ledger'
  export const EXPENSES_TABS: { id: ExpensesTab; label: string }[]   // P&L statement / By category / Ledger
  export type ExpensesReportQuery = { tab: ExpensesTab; preset: Preset; range: DateRange; previous: DateRange; bucket: Bucket }
  export function parseExpensesParams(raw: RawParams, today: string): ExpensesReportQuery
  export function expensesExportFilename(query: ExpensesReportQuery): string
  ```
  (`RawParams` re-exported from `payments-params`.)

- [ ] **Step 1: Failing test**
```ts
import { describe, it, expect } from 'vitest'
import { parseExpensesParams, expensesExportFilename } from '@/lib/reports/expenses-params'
import { periodSearchParams } from '@/lib/reports/period-params'

const today = '2026-09-15'

describe('parseExpensesParams', () => {
    it('defaults to pnl and this year', () => {
        const q = parseExpensesParams({}, today)
        expect(q.tab).toBe('pnl')
        expect(q.preset).toBe('year')
        expect(q.range).toEqual({ from: '2026-01-01', to: today })
        expect(q.bucket).toBe('month')
        expect(q.previous.to).toBe('2025-12-31')
    })
    it('falls back on junk and bad custom ranges', () => {
        expect(parseExpensesParams({ tab: 'x', preset: 'decade' }, today)).toMatchObject({ tab: 'pnl', preset: 'year' })
        expect(parseExpensesParams({ preset: 'custom', from: '2026-09-10', to: '2026-09-01' }, today).preset).toBe('year')
    })
    it('accepts a custom range and round-trips it', () => {
        const q = parseExpensesParams({ tab: 'ledger', preset: 'custom', from: '2026-09-01', to: '2026-09-15' }, today)
        expect(q.bucket).toBe('day')
        expect(periodSearchParams(q).toString()).toBe('tab=ledger&preset=custom&from=2026-09-01&to=2026-09-15')
        expect(expensesExportFilename(q)).toBe('expenses-ledger-2026-09-01-2026-09-15.csv')
    })
})
```
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement**
```ts
import { chooseBucket, isIsoDate, previousRange, rangeForPreset, type Bucket, type DateRange, type Preset } from '@/lib/reports/dates'
import type { RawParams } from '@/lib/reports/payments-params'

export type { RawParams }

export type ExpensesTab = 'pnl' | 'categories' | 'ledger'

export const EXPENSES_TABS: { id: ExpensesTab; label: string }[] = [
    { id: 'pnl', label: 'P&L statement' },
    { id: 'categories', label: 'By category' },
    { id: 'ledger', label: 'Ledger' },
]

export type ExpensesReportQuery = { tab: ExpensesTab; preset: Preset; range: DateRange; previous: DateRange; bucket: Bucket }

const TABS = new Set<string>(EXPENSES_TABS.map((tab) => tab.id))
const PRESETS = new Set<string>(['week', 'month', 'year', 'custom'])
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

export function parseExpensesParams(raw: RawParams, today: string): ExpensesReportQuery {
    const tabValue = first(raw.tab)
    const tab: ExpensesTab = tabValue && TABS.has(tabValue) ? (tabValue as ExpensesTab) : 'pnl'
    const presetValue = first(raw.preset)
    let preset: Preset = presetValue && PRESETS.has(presetValue) ? (presetValue as Preset) : 'year'
    const from = first(raw.from)
    const to = first(raw.to)
    let range: DateRange
    if (preset === 'custom' && isIsoDate(from) && isIsoDate(to) && from <= to) {
        range = { from, to }
    } else {
        preset = preset === 'custom' ? 'year' : preset
        range = rangeForPreset(preset, today)
    }
    return { tab, preset, range, previous: previousRange(range), bucket: chooseBucket(range) }
}

export function expensesExportFilename(query: ExpensesReportQuery): string {
    return `expenses-${query.tab}-${query.range.from}-${query.range.to}.csv`
}
```
- [ ] **Step 4:** run → PASS. Stage.

---

### Task 3: Expense aggregation (pure)

**Files:**
- Create: `lib/reports/expenses-aggregate.ts`
- Test: `lib/reports/__tests__/expenses-aggregate.test.ts`

**Interfaces:**
- Consumes: `ReportPaymentRow` (payments-aggregate), `bucketStart`, `bucketLabel`, `Bucket`, `DateRange` (dates), `addDays/addMonths/parseISO/format` (date-fns).
- Produces:
  ```ts
  export type ExpenseCategory = 'utilities' | 'salary' | 'equipment' | 'maintenance' | 'marketing' | 'rent' | 'other'
  export const EXPENSE_CATEGORIES: ExpenseCategory[]
  export const CATEGORY_LABELS: Record<ExpenseCategory, string>
  export type ReportExpenseRow = { id: string; amount: number; category: ExpenseCategory; description: string; expense_date: string; created_at: string; receipt_url: string | null; adder_name: string | null; is_demo: boolean }
  export type CategoryTotals = Record<ExpenseCategory, number>
  export type PnlBucket = { start: string; label: string; membershipRevenue: number; admissionFees: number; refunded: number; netIncome: number; byCategory: CategoryTotals; totalExpenses: number; net: number; margin: number | null }
  export function pnlBuckets(payments: ReportPaymentRow[], expenses: ReportExpenseRow[], range: DateRange, bucket: Bucket): PnlBucket[]
  export function pnlTotals(buckets: PnlBucket[]): Omit<PnlBucket, 'start' | 'label'>
  export type PnlKpis = { netIncome: number; totalExpenses: number; net: number }
  export function pnlKpis(payments: ReportPaymentRow[], expenses: ReportExpenseRow[]): PnlKpis
  export type CategoryRow = { category: ExpenseCategory; label: string; entries: number; total: number; share: number; avg: number; previous: number; delta: number | null }
  export function byCategory(current: ReportExpenseRow[], previous: ReportExpenseRow[]): CategoryRow[]   // omit categories with 0 entries in both; total desc
  export function sortLedger(rows: ReportExpenseRow[]): ReportExpenseRow[]   // expense_date desc, created_at desc
  export function ledgerTotals(rows: ReportExpenseRow[]): { count: number; amount: number }
  export function marginPercent(net: number, netIncome: number): number | null
  ```

- [ ] **Step 1: Failing test**
```ts
import { describe, it, expect } from 'vitest'
import { pnlBuckets, pnlTotals, pnlKpis, byCategory, sortLedger, ledgerTotals, marginPercent, type ReportExpenseRow } from '@/lib/reports/expenses-aggregate'
import type { ReportPaymentRow } from '@/lib/reports/payments-aggregate'

function pay(o: Partial<ReportPaymentRow>): ReportPaymentRow {
    return { id: Math.random().toString(36).slice(2), amount: 1000, admission_fee_amount: null, referral_coins_used: 0, payment_method: 'cash', payment_status: 'paid', payment_date: '2026-09-15', created_at: '2026-09-15T04:00:00Z', receipt_number: null, invoice_number: null, notes: null, member_name: 'A', member_code: 'G1', member_phone: null, plan_name: null, processor_name: null, is_demo: false, ...o }
}
function exp(o: Partial<ReportExpenseRow>): ReportExpenseRow {
    return { id: Math.random().toString(36).slice(2), amount: 300, category: 'rent', description: 'x', expense_date: '2026-09-15', created_at: '2026-09-15T04:00:00Z', receipt_url: null, adder_name: 'S1', is_demo: false, ...o }
}

describe('marginPercent', () => {
    it('is null at zero income, else net/income*100', () => {
        expect(marginPercent(50, 0)).toBeNull()
        expect(marginPercent(250, 1000)).toBe(25)
        expect(marginPercent(-100, 1000)).toBe(-10)
    })
})

describe('pnlBuckets', () => {
    it('nets refunds, splits fees, sums categories, handles income-only and expense-only buckets', () => {
        const buckets = pnlBuckets(
            [pay({ payment_date: '2026-09-13', amount: 1500, admission_fee_amount: 500 }), pay({ payment_date: '2026-09-13', amount: 200, payment_status: 'refunded' }), pay({ payment_date: '2026-09-13', amount: 999, payment_status: 'pending' })],
            [exp({ expense_date: '2026-09-14', amount: 300, category: 'rent' }), exp({ expense_date: '2026-09-14', amount: 100, category: 'utilities' })],
            { from: '2026-09-13', to: '2026-09-15' }, 'day',
        )
        expect(buckets.map((b) => b.start)).toEqual(['2026-09-13', '2026-09-14', '2026-09-15'])
        expect(buckets[0]).toMatchObject({ membershipRevenue: 1000, admissionFees: 500, refunded: 200, netIncome: 1300, totalExpenses: 0, net: 1300, margin: 100 })
        expect(buckets[1]).toMatchObject({ netIncome: 0, totalExpenses: 400, net: -400, margin: null })
        expect(buckets[1].byCategory).toMatchObject({ rent: 300, utilities: 100, salary: 0 })
        expect(buckets[2]).toMatchObject({ netIncome: 0, totalExpenses: 0, net: 0, margin: null })
    })
    it('ignores rows outside the range and buckets by month', () => {
        const buckets = pnlBuckets([pay({ payment_date: '2025-12-31' })], [exp({ expense_date: '2026-02-10' })], { from: '2026-01-01', to: '2026-03-31' }, 'month')
        expect(buckets.map((b) => b.label)).toEqual(['Jan 2026', 'Feb 2026', 'Mar 2026'])
        expect(buckets[0].netIncome).toBe(0)
        expect(buckets[1].totalExpenses).toBe(300)
    })
})

describe('pnlTotals / pnlKpis', () => {
    it('totals buckets and recomputes margin from totals', () => {
        const buckets = pnlBuckets([pay({ amount: 1000 })], [exp({ amount: 250 })], { from: '2026-09-15', to: '2026-09-15' }, 'day')
        expect(pnlTotals(buckets)).toMatchObject({ netIncome: 1000, totalExpenses: 250, net: 750, margin: 75 })
        expect(pnlKpis([pay({ amount: 1000 }), pay({ amount: 100, payment_status: 'refunded' })], [exp({ amount: 250 })])).toEqual({ netIncome: 900, totalExpenses: 250, net: 650 })
    })
})

describe('byCategory', () => {
    it('groups, shares, averages, compares with previous, omits empty categories', () => {
        const rows = byCategory(
            [exp({ category: 'rent', amount: 700 }), exp({ category: 'rent', amount: 500 }), exp({ category: 'salary', amount: 800 })],
            [exp({ category: 'rent', amount: 500 }), exp({ category: 'equipment', amount: 50 })],
        )
        expect(rows.map((r) => r.category)).toEqual(['rent', 'salary', 'equipment'])
        expect(rows[0]).toEqual({ category: 'rent', label: 'Rent', entries: 2, total: 1200, share: 60, avg: 600, previous: 500, delta: 140 })
        expect(rows[1].delta).toBeNull()
        expect(rows[2]).toMatchObject({ entries: 0, total: 0, previous: 50, delta: -100 })
    })
})

describe('ledger', () => {
    it('sorts newest first and totals', () => {
        const rows = sortLedger([exp({ id: 'a', expense_date: '2026-09-01' }), exp({ id: 'b', expense_date: '2026-09-10', created_at: '2026-09-10T01:00:00Z' }), exp({ id: 'c', expense_date: '2026-09-10', created_at: '2026-09-10T05:00:00Z' })])
        expect(rows.map((r) => r.id)).toEqual(['c', 'b', 'a'])
        expect(ledgerTotals(rows)).toEqual({ count: 3, amount: 900 })
    })
})
```
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** `lib/reports/expenses-aggregate.ts`
```ts
import { addDays, addMonths, format, parseISO } from 'date-fns'
import { bucketLabel, bucketStart, type Bucket, type DateRange } from '@/lib/reports/dates'
import type { ReportPaymentRow } from '@/lib/reports/payments-aggregate'

export type ExpenseCategory = 'utilities' | 'salary' | 'equipment' | 'maintenance' | 'marketing' | 'rent' | 'other'

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['utilities', 'salary', 'equipment', 'maintenance', 'marketing', 'rent', 'other']
export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
    utilities: 'Utilities', salary: 'Salary', equipment: 'Equipment', maintenance: 'Maintenance', marketing: 'Marketing', rent: 'Rent', other: 'Other',
}

export type ReportExpenseRow = {
    id: string
    amount: number
    category: ExpenseCategory
    description: string
    expense_date: string
    created_at: string
    receipt_url: string | null
    adder_name: string | null
    is_demo: boolean
}

export type CategoryTotals = Record<ExpenseCategory, number>

function emptyCategoryTotals(): CategoryTotals {
    return { utilities: 0, salary: 0, equipment: 0, maintenance: 0, marketing: 0, rent: 0, other: 0 }
}

export function marginPercent(net: number, netIncome: number): number | null {
    return netIncome === 0 ? null : (net / netIncome) * 100
}

// ─── P&L ─────────────────────────────────────────────────────────────────────

export type PnlBucket = {
    start: string
    label: string
    membershipRevenue: number
    admissionFees: number
    refunded: number
    netIncome: number
    byCategory: CategoryTotals
    totalExpenses: number
    net: number
    margin: number | null
}

function nextBucketStart(start: string, bucket: Bucket): string {
    const day = parseISO(start)
    const next = bucket === 'day' ? addDays(day, 1) : bucket === 'week' ? addDays(day, 7) : addMonths(day, 1)
    return format(next, 'yyyy-MM-dd')
}

function finalise(bucket: Omit<PnlBucket, 'netIncome' | 'net' | 'margin'>): PnlBucket {
    const netIncome = bucket.membershipRevenue + bucket.admissionFees - bucket.refunded
    const net = netIncome - bucket.totalExpenses
    return { ...bucket, netIncome, net, margin: marginPercent(net, netIncome) }
}

export function pnlBuckets(payments: ReportPaymentRow[], expenses: ReportExpenseRow[], range: DateRange, bucket: Bucket): PnlBucket[] {
    const acc = new Map<string, Omit<PnlBucket, 'netIncome' | 'net' | 'margin'>>()
    for (let start = bucketStart(range.from, bucket); start <= range.to; start = nextBucketStart(start, bucket)) {
        acc.set(start, { start, label: bucketLabel(start, bucket), membershipRevenue: 0, admissionFees: 0, refunded: 0, byCategory: emptyCategoryTotals(), totalExpenses: 0 })
    }
    for (const row of payments) {
        if (row.payment_date < range.from || row.payment_date > range.to) continue
        const target = acc.get(bucketStart(row.payment_date, bucket))
        if (!target) continue
        if (row.payment_status === 'refunded') { target.refunded += row.amount; continue }
        if (row.payment_status !== 'paid') continue
        const fee = row.admission_fee_amount ?? 0
        target.admissionFees += fee
        target.membershipRevenue += row.amount - fee
    }
    for (const row of expenses) {
        if (row.expense_date < range.from || row.expense_date > range.to) continue
        const target = acc.get(bucketStart(row.expense_date, bucket))
        if (!target) continue
        target.byCategory[row.category] += row.amount
        target.totalExpenses += row.amount
    }
    return [...acc.values()].map(finalise)
}

export function pnlTotals(buckets: PnlBucket[]): Omit<PnlBucket, 'start' | 'label'> {
    const sum = buckets.reduce(
        (t, b) => {
            for (const c of EXPENSE_CATEGORIES) t.byCategory[c] += b.byCategory[c]
            return {
                ...t,
                membershipRevenue: t.membershipRevenue + b.membershipRevenue,
                admissionFees: t.admissionFees + b.admissionFees,
                refunded: t.refunded + b.refunded,
                totalExpenses: t.totalExpenses + b.totalExpenses,
            }
        },
        { membershipRevenue: 0, admissionFees: 0, refunded: 0, byCategory: emptyCategoryTotals(), totalExpenses: 0 },
    )
    const full = finalise({ start: '', label: '', ...sum })
    return {
        membershipRevenue: full.membershipRevenue,
        admissionFees: full.admissionFees,
        refunded: full.refunded,
        netIncome: full.netIncome,
        byCategory: full.byCategory,
        totalExpenses: full.totalExpenses,
        net: full.net,
        margin: full.margin,
    }
}

export type PnlKpis = { netIncome: number; totalExpenses: number; net: number }

export function pnlKpis(payments: ReportPaymentRow[], expenses: ReportExpenseRow[]): PnlKpis {
    const paid = payments.filter((p) => p.payment_status === 'paid').reduce((s, p) => s + p.amount, 0)
    const refunded = payments.filter((p) => p.payment_status === 'refunded').reduce((s, p) => s + p.amount, 0)
    const netIncome = paid - refunded
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    return { netIncome, totalExpenses, net: netIncome - totalExpenses }
}

// ─── By category ─────────────────────────────────────────────────────────────

export type CategoryRow = {
    category: ExpenseCategory
    label: string
    entries: number
    total: number
    share: number
    avg: number
    previous: number
    delta: number | null
}

export function byCategory(current: ReportExpenseRow[], previous: ReportExpenseRow[]): CategoryRow[] {
    const entries = emptyCategoryTotals()
    const totals = emptyCategoryTotals()
    const prev = emptyCategoryTotals()
    for (const row of current) { entries[row.category] += 1; totals[row.category] += row.amount }
    for (const row of previous) prev[row.category] += row.amount
    const grand = EXPENSE_CATEGORIES.reduce((s, c) => s + totals[c], 0)
    return EXPENSE_CATEGORIES
        .filter((c) => entries[c] > 0 || prev[c] > 0)
        .map((c) => ({
            category: c,
            label: CATEGORY_LABELS[c],
            entries: entries[c],
            total: totals[c],
            share: grand ? (totals[c] / grand) * 100 : 0,
            avg: entries[c] ? totals[c] / entries[c] : 0,
            previous: prev[c],
            delta: prev[c] === 0 ? null : ((totals[c] - prev[c]) / prev[c]) * 100,
        }))
        .sort((a, b) => b.total - a.total)
}

// ─── Ledger ──────────────────────────────────────────────────────────────────

export function sortLedger(rows: ReportExpenseRow[]): ReportExpenseRow[] {
    return [...rows].sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at))
}

export function ledgerTotals(rows: ReportExpenseRow[]): { count: number; amount: number } {
    return { count: rows.length, amount: rows.reduce((s, r) => s + r.amount, 0) }
}
```
- [ ] **Step 4:** run → PASS; `npx eslint lib/reports` clean. Stage.

---

### Task 4: Server fetcher

**Files:**
- Modify: `lib/reports/payments.ts` — rename `fetchRows` to `fetchPaymentRows` and **export** it (update its five internal call sites).
- Create: `lib/reports/expenses.ts`

**Interfaces:**
- Produces:
  ```ts
  export type PnlReport = { buckets: PnlBucket[]; totals: ReturnType<typeof pnlTotals>; kpis: PnlKpis; previous: PnlKpis }
  export type CategoryReport = { rows: CategoryRow[]; total: number; previousTotal: number }
  export type LedgerReport = { rows: ReportExpenseRow[]; totals: { count: number; amount: number } }
  export function getPnl(gymId: string, query: ExpensesReportQuery): Promise<PnlReport>
  export function getByCategory(gymId: string, query: ExpensesReportQuery): Promise<CategoryReport>
  export function getLedger(gymId: string, range: DateRange): Promise<LedgerReport>
  ```

- [ ] **Step 1:** In `lib/reports/payments.ts` rename `async function fetchRows` → `export async function fetchPaymentRows` and update the five callers in that file.
- [ ] **Step 2: Implement** `lib/reports/expenses.ts`
```ts
import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getImpersonationOwnedIds } from '@/lib/platform/impersonation-ledger'
import type { DateRange } from '@/lib/reports/dates'
import type { ExpensesReportQuery } from '@/lib/reports/expenses-params'
import { fetchPaymentRows } from '@/lib/reports/payments'
import {
    byCategory, ledgerTotals, pnlBuckets, pnlKpis, pnlTotals, sortLedger,
    type CategoryRow, type PnlBucket, type PnlKpis, type ReportExpenseRow,
} from '@/lib/reports/expenses-aggregate'

const SELECT = 'id, amount, category, description, expense_date, created_at, receipt_url, adder:profiles!expenses_added_by_fkey(full_name)'

type RawRow = {
    id: string
    amount: number | string
    category: ReportExpenseRow['category']
    description: string
    expense_date: string
    created_at: string
    receipt_url: string | null
    adder: { full_name: string } | { full_name: string }[] | null
}

const PAGE_SIZE = 1000

function toNumber(value: number | string | null | undefined): number {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? '0'))
    return Number.isFinite(parsed) ? parsed : 0
}

export async function fetchExpenseRows(gymId: string, range: DateRange): Promise<ReportExpenseRow[]> {
    const db = getSupabaseAdmin()
    const fetchPage = (from: number, to: number) =>
        db.from('expenses').select(SELECT).eq('gym_id', gymId)
            .gte('expense_date', range.from).lte('expense_date', range.to)
            .order('expense_date', { ascending: true }).order('created_at', { ascending: true }).order('id', { ascending: true })
            .range(from, to)

    const [firstPage, demoIds] = await Promise.all([fetchPage(0, PAGE_SIZE - 1), getImpersonationOwnedIds(gymId, 'expense')])
    if (firstPage.error) throw new Error(`Expenses report query failed: ${firstPage.error.message}`)
    const raw: RawRow[] = [...((firstPage.data ?? []) as unknown as RawRow[])]
    let page = 1
    let lastSize = raw.length
    while (lastSize === PAGE_SIZE) {
        const result = await fetchPage(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        if (result.error) throw new Error(`Expenses report query failed: ${result.error.message}`)
        const rows = (result.data ?? []) as unknown as RawRow[]
        raw.push(...rows)
        lastSize = rows.length
        page += 1
    }

    return raw.map((row) => {
        const adder = Array.isArray(row.adder) ? row.adder[0] ?? null : row.adder
        return {
            id: row.id,
            amount: toNumber(row.amount),
            category: row.category,
            description: row.description,
            expense_date: row.expense_date,
            created_at: row.created_at,
            receipt_url: row.receipt_url,
            adder_name: adder?.full_name ?? null,
            is_demo: demoIds.has(row.id),
        }
    })
}

export type PnlReport = { buckets: PnlBucket[]; totals: ReturnType<typeof pnlTotals>; kpis: PnlKpis; previous: PnlKpis }
export type CategoryReport = { rows: CategoryRow[]; total: number; previousTotal: number }
export type LedgerReport = { rows: ReportExpenseRow[]; totals: { count: number; amount: number } }

export async function getPnl(gymId: string, query: ExpensesReportQuery): Promise<PnlReport> {
    const [payments, expenses, prevPayments, prevExpenses] = await Promise.all([
        fetchPaymentRows(gymId, query.range), fetchExpenseRows(gymId, query.range),
        fetchPaymentRows(gymId, query.previous), fetchExpenseRows(gymId, query.previous),
    ])
    const buckets = pnlBuckets(payments, expenses, query.range, query.bucket)
    return { buckets, totals: pnlTotals(buckets), kpis: pnlKpis(payments, expenses), previous: pnlKpis(prevPayments, prevExpenses) }
}

export async function getByCategory(gymId: string, query: ExpensesReportQuery): Promise<CategoryReport> {
    const [current, previous] = await Promise.all([fetchExpenseRows(gymId, query.range), fetchExpenseRows(gymId, query.previous)])
    const rows = byCategory(current, previous)
    return { rows, total: current.reduce((s, r) => s + r.amount, 0), previousTotal: previous.reduce((s, r) => s + r.amount, 0) }
}

export async function getLedger(gymId: string, range: DateRange): Promise<LedgerReport> {
    const rows = sortLedger(await fetchExpenseRows(gymId, range))
    return { rows, totals: ledgerTotals(rows) }
}
```
- [ ] **Step 3: Verify** `npx tsc --noEmit -p tsconfig.json`, `npx eslint lib/reports`, `npm test` (unchanged count) clean. Stage.

---

### Task 5: CSV builders + export route

**Files:**
- Create: `lib/reports/expenses-csv.ts`, `app/admin/reports/expenses/export/route.ts`
- Test: `lib/reports/__tests__/expenses-csv.test.ts`

- [ ] **Step 1: Failing test**
```ts
import { describe, it, expect } from 'vitest'
import { pnlCsv, categoryCsv, ledgerCsv } from '@/lib/reports/expenses-csv'

describe('expenses csv', () => {
    it('pnl has bucket start, income lines, categories, totals', () => {
        const bucket = { start: '2026-09-01', label: 'Sep 2026', membershipRevenue: 1000, admissionFees: 500, refunded: 200, netIncome: 1300, byCategory: { utilities: 100, salary: 0, equipment: 0, maintenance: 0, marketing: 0, rent: 300, other: 0 }, totalExpenses: 400, net: 900, margin: 69.23 }
        const csv = pnlCsv({ buckets: [bucket], totals: { ...bucket }, kpis: { netIncome: 1300, totalExpenses: 400, net: 900 }, previous: { netIncome: 0, totalExpenses: 0, net: 0 } })
        const lines = csv.split('\r\n')
        expect(lines[0]).toBe('﻿Bucket start,Period,Membership revenue,Admission fees,Refunds,Net income,Utilities,Salary,Equipment,Maintenance,Marketing,Rent,Other,Total expenses,Net,Margin %')
        expect(lines[1]).toBe('2026-09-01,Sep 2026,1000,500,200,1300,100,0,0,0,0,300,0,400,900,69.23')
    })
    it('category and ledger rows', () => {
        expect(categoryCsv({ rows: [{ category: 'rent', label: 'Rent', entries: 2, total: 1000, share: 50, avg: 500, previous: 500, delta: 100 }], total: 2000, previousTotal: 500 }).split('\r\n')[1]).toBe('Rent,2,1000,50,500,500,100')
        expect(ledgerCsv({ rows: [{ id: 'e', amount: 300, category: 'rent', description: 'Sept, rent', expense_date: '2026-09-01', created_at: '', receipt_url: 'https://x/r.pdf', adder_name: 'S1', is_demo: false }], totals: { count: 1, amount: 300 } }).split('\r\n')[1]).toBe('2026-09-01,Rent,"Sept, rent",300,S1,https://x/r.pdf')
    })
})
```
- [ ] **Step 2:** run → FAIL.
- [ ] **Step 3: Implement** `lib/reports/expenses-csv.ts`
```ts
import { toCsv } from '@/lib/reports/csv'
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from '@/lib/reports/expenses-aggregate'
import type { CategoryReport, LedgerReport, PnlReport } from '@/lib/reports/expenses'

export function pnlCsv(report: PnlReport): string {
    return toCsv(
        ['Bucket start', 'Period', 'Membership revenue', 'Admission fees', 'Refunds', 'Net income', ...EXPENSE_CATEGORIES.map((c) => CATEGORY_LABELS[c]), 'Total expenses', 'Net', 'Margin %'],
        report.buckets.map((b) => [b.start, b.label, b.membershipRevenue, b.admissionFees, b.refunded, b.netIncome, ...EXPENSE_CATEGORIES.map((c) => b.byCategory[c]), b.totalExpenses, b.net, b.margin]),
    )
}

export function categoryCsv(report: CategoryReport): string {
    return toCsv(['Category', 'Entries', 'Total', 'Share %', 'Avg per entry', 'Previous period', 'Change %'], report.rows.map((r) => [r.label, r.entries, r.total, r.share, r.avg, r.previous, r.delta]))
}

export function ledgerCsv(report: LedgerReport): string {
    return toCsv(['Date', 'Category', 'Description', 'Amount', 'Added by', 'Receipt URL'], report.rows.map((r) => [r.expense_date, CATEGORY_LABELS[r.category], r.description, r.amount, r.adder_name, r.receipt_url]))
}
```
- [ ] **Step 4:** run → PASS.
- [ ] **Step 5: Route** `app/admin/reports/expenses/export/route.ts`
```ts
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { gymHasFeature } from '@/lib/gym/features'
import { todayInKolkata } from '@/lib/reports/dates'
import { expensesExportFilename, parseExpensesParams, type RawParams } from '@/lib/reports/expenses-params'
import { getByCategory, getLedger, getPnl } from '@/lib/reports/expenses'
import { categoryCsv, ledgerCsv, pnlCsv } from '@/lib/reports/expenses-csv'

export async function GET(request: Request) {
    const { user, gym, isStaff } = await getCurrentAdminContext()
    if (!user || !gym || !isStaff) return new Response('Unauthorized', { status: 401 })
    if (!(await gymHasFeature(gym.id, 'advanced_reports'))) return new Response('Advanced reports are not enabled for this gym', { status: 403 })

    const raw: RawParams = Object.fromEntries(new URL(request.url).searchParams.entries())
    const query = parseExpensesParams(raw, todayInKolkata())

    try {
        let csv: string
        switch (query.tab) {
            case 'pnl': csv = pnlCsv(await getPnl(gym.id, query)); break
            case 'categories': csv = categoryCsv(await getByCategory(gym.id, query)); break
            case 'ledger': csv = ledgerCsv(await getLedger(gym.id, query.range)); break
        }
        return new Response(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${expensesExportFilename(query)}"`,
                'Cache-Control': 'no-store',
            },
        })
    } catch (error) {
        console.error('[reports/expenses/export]', error)
        return new Response('Export failed', { status: 500 })
    }
}
```
- [ ] **Step 6: Verify** `npm test`, tsc, `npx eslint app/admin/reports lib/reports` clean. Stage.

---

### Task 6: UI — shell, tables, skeleton, page, loading, landing card

**Files:**
- Create: `components/reports/expenses/ExpensesReport.tsx`, `PnlKpis.tsx`, `PnlTable.tsx`, `ByCategoryTable.tsx`, `LedgerTable.tsx`
- Modify: `components/reports/ReportSkeleton.tsx` (add `ExpensesTabSkeleton`), `components/reports/ReportsLanding.tsx` (Expenses card `href`)
- Create: `app/admin/reports/expenses/page.tsx`, `app/admin/reports/expenses/loading.tsx`

Copy the class strings from the payments tables (`th`, `td`, `num`, `numStrong`, thead/tfoot tints, focus rings) so the two areas look identical.

- [ ] **Step 1: `ExpensesReport.tsx`** — same markup as `PaymentsReport.tsx` with: title "Expenses & P&L", `aria-label="Expense reports"`, tabs from `EXPENSES_TABS`, links to `/admin/reports/expenses?${periodSearchParams({ ...query, tab: tab.id })}`, props `{ query: ExpensesReportQuery; controls; children }` (no `kpis` prop — KPIs render inside the body).

- [ ] **Step 2: `PnlKpis.tsx`** — three cards (Net income, Total expenses, Net) using `formatCurrency` and `deltaPercent` from `payments-aggregate` with the same `Delta` rendering as `KpiStrip.tsx` (copy that component's `Delta`; do not import it — it is not exported). Net card colours its value emerald when ≥ 0 and rose when < 0.

- [ ] **Step 3: `PnlTable.tsx`**
Columns: Period | Membership | Admission | Refunds | Net income | 7 category columns | Total expenses | Net | Margin. Net cell coloured like the KPI. Margin renders `—` when `null`, else `x.x%`. Total row from `report.totals`. Empty state (`buckets.every(b => b.netIncome === 0 && b.totalExpenses === 0 && b.refunded === 0)`) → single quiet row "No income or expenses in this period" and no tfoot. `overflow-x-auto` wrapper; `whitespace-nowrap` on all cells.

- [ ] **Step 4: `ByCategoryTable.tsx`**
Columns: Category | Entries | Total | Share | Avg per entry | Previous | Change. Change uses the same Delta rendering (`—` when null). Total row: entries sum, `report.total`, 100%, avg = total/entries (0 when none), `report.previousTotal`, delta of totals. Empty state "No expenses in this period".

- [ ] **Step 5: `LedgerTable.tsx`**
Columns: Date (`formatDate(row.expense_date, 'dd MMM yyyy')`) | Category (badge using the payments status-pill style with neutral colours) | Description (`max-w-md truncate`, `title`) | Amount (`numStrong`) | Added by (or —) | Receipt (`<a href target="_blank" rel="noopener noreferrer" aria-label="Open receipt">` with lucide `ExternalLink` icon when `receipt_url`, else —). `SupportDemoBadge` after the description when `is_demo`. Footer: `{count} entries` + total. Empty state "No expenses in this period".

- [ ] **Step 6: Skeleton** — add to `ReportSkeleton.tsx`:
```tsx
export function ExpensesTabSkeleton({ tab }: { tab: 'pnl' | 'categories' | 'ledger' }) {
    switch (tab) {
        case 'pnl': return <><KpiStripSkeleton /><TableSkeleton columns={12} rows={6} /></>
        case 'categories': return <TableSkeleton columns={7} rows={5} />
        case 'ledger': return <TableSkeleton columns={6} rows={8} />
    }
}
export function ExpensesShellSkeleton()  // copy of PaymentsShellSkeleton with 3 tab bones and <ExpensesTabSkeleton tab="pnl" />
```

- [ ] **Step 7: Page + loading**
`app/admin/reports/expenses/loading.tsx` renders `<ExpensesShellSkeleton />`.
`app/admin/reports/expenses/page.tsx`:
```tsx
import { Suspense } from 'react'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { todayInKolkata } from '@/lib/reports/dates'
import { parseExpensesParams, type ExpensesReportQuery, type RawParams } from '@/lib/reports/expenses-params'
import { periodSearchParams } from '@/lib/reports/period-params'
import { getByCategory, getLedger, getPnl } from '@/lib/reports/expenses'
import ExpensesReport from '@/components/reports/expenses/ExpensesReport'
import PnlKpis from '@/components/reports/expenses/PnlKpis'
import PnlTable from '@/components/reports/expenses/PnlTable'
import ByCategoryTable from '@/components/reports/expenses/ByCategoryTable'
import LedgerTable from '@/components/reports/expenses/LedgerTable'
import PeriodPicker from '@/components/reports/PeriodPicker'
import ExportCsvButton from '@/components/reports/ExportCsvButton'
import { ExpensesTabSkeleton } from '@/components/reports/ReportSkeleton'

const BASE = '/admin/reports/expenses'

async function TabBody({ gymId, query }: { gymId: string; query: ExpensesReportQuery }) {
    switch (query.tab) {
        case 'pnl': {
            const report = await getPnl(gymId, query)
            return <><PnlKpis current={report.kpis} previous={report.previous} /><PnlTable report={report} /></>
        }
        case 'categories':
            return <ByCategoryTable report={await getByCategory(gymId, query)} />
        case 'ledger':
            return <LedgerTable report={await getLedger(gymId, query.range)} />
    }
}

export default async function ExpensesReportPage({ searchParams }: { searchParams: Promise<RawParams> }) {
    const { gym } = await getCurrentAdminContext()
    if (!gym) return null

    const query = parseExpensesParams(await searchParams, todayInKolkata())
    const search = periodSearchParams(query).toString()
    const periodKey = `${query.preset}:${query.range.from}:${query.range.to}`

    return (
        <ExpensesReport
            query={query}
            controls={<><PeriodPicker key={periodKey} query={query} basePath={BASE} /><ExportCsvButton search={search} basePath={BASE} /></>}
        >
            <Suspense key={search} fallback={<div className="space-y-5 animate-pulse"><ExpensesTabSkeleton tab={query.tab} /></div>}>
                <TabBody gymId={gym.id} query={query} />
            </Suspense>
        </ExpensesReport>
    )
}
```

- [ ] **Step 8: Landing card** — in `ReportsLanding.tsx` add `href: '/admin/reports/expenses'` to the `expenses` entry.

- [ ] **Step 9: Verify** `npm test`, `npx tsc --noEmit -p tsconfig.json`, `npx eslint app/admin/reports components/reports lib/reports`, `npm run build` (routes `/admin/reports/expenses` and `/admin/reports/expenses/export` present). Stage.

---

### Task 7: Roadmap + hand-off

- [ ] **Step 1:** In `docs/superpowers/specs/2026-09-15-advanced-reports-roadmap.md` change `## 2. Expenses & Profit / Loss  — coming soon` to `## 2. Expenses & Profit / Loss  — shipped (branch worktree-advanced-reports)`.
- [ ] **Step 2:** Write the manual-check note: landing card live; P&L with This year / This month / custom; net vs refunds line reconciles with the payments Summary for the same range; By category previous-period deltas; Ledger receipt links open in a new tab; one CSV per tab.
- [ ] **Step 3:** `git add -A`, `git status --short`. No commit.
