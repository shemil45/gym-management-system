import { addDays, addMonths, format, parseISO } from 'date-fns'
import { addDaysIso, bucketLabel, bucketStart, daysBetweenInclusive, todayInKolkata, type Bucket, type DateRange } from '@/lib/reports/dates'
import { effectiveStatus, istDate, type ReportMemberRow } from '@/lib/reports/members-aggregate'

export type EntryMethod = 'manual' | 'qr' | 'kiosk' | 'fingerprint'

export const ENTRY_METHODS: EntryMethod[] = ['manual', 'qr', 'kiosk', 'fingerprint']

export const ENTRY_METHOD_LABELS: Record<EntryMethod, string> = {
    manual: 'Manual',
    qr: 'QR',
    kiosk: 'Kiosk',
    fingerprint: 'Fingerprint',
}

export type CheckInRow = {
    id: string
    member_id: string | null
    check_in_time: string
    check_out_time: string | null
    entry_method: EntryMethod | null
}

export type Visit = {
    member_id: string
    date: string
    hour: number
    weekday: number // 0=Mon … 6=Sun
    minutes: number | null
    entry_method: EntryMethod
}

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000

function shiftToIst(iso: string): Date {
    return new Date(new Date(iso).getTime() + IST_OFFSET_MS)
}

export function toVisit(row: CheckInRow & { member_id: string }): Visit {
    const shifted = shiftToIst(row.check_in_time)
    const date = todayInKolkata(new Date(row.check_in_time))
    const hour = shifted.getUTCHours()
    const weekday = (shifted.getUTCDay() + 6) % 7
    let minutes: number | null = null
    if (row.check_out_time) {
        const diffMs = new Date(row.check_out_time).getTime() - new Date(row.check_in_time).getTime()
        const rounded = Math.round(diffMs / 60000)
        minutes = rounded >= 0 ? rounded : null
    }
    return { member_id: row.member_id, date, hour, weekday, minutes, entry_method: row.entry_method ?? 'manual' }
}

function emptyMethodCounts(): Record<EntryMethod, number> {
    return { manual: 0, qr: 0, kiosk: 0, fingerprint: 0 }
}

function nextBucketStart(start: string, bucket: Bucket): string {
    const day = parseISO(start)
    const next = bucket === 'day' ? addDays(day, 1) : bucket === 'week' ? addDays(day, 7) : addMonths(day, 1)
    return format(next, 'yyyy-MM-dd')
}

type FootfallAggregate = {
    visits: number
    uniqueMembers: number
    days: number
    perDay: number
    peakHour: number | null
    byMethod: Record<EntryMethod, number>
    avgMinutes: number | null
}

function aggregateVisits(visits: Visit[], days: number): FootfallAggregate {
    const visitsCount = visits.length
    const uniqueMembers = new Set(visits.map((v) => v.member_id)).size
    const perDay = days > 0 ? visitsCount / days : 0

    const hourCounts = new Map<number, number>()
    for (const v of visits) hourCounts.set(v.hour, (hourCounts.get(v.hour) ?? 0) + 1)
    let peakHour: number | null = null
    let peakCount = 0
    for (const hour of [...hourCounts.keys()].sort((a, b) => a - b)) {
        const count = hourCounts.get(hour) as number
        if (count > peakCount) { peakCount = count; peakHour = hour }
    }

    const byMethod = emptyMethodCounts()
    for (const v of visits) byMethod[v.entry_method] += 1

    const withMinutes = visits.filter((v): v is Visit & { minutes: number } => v.minutes !== null)
    const avgMinutes = withMinutes.length ? withMinutes.reduce((s, v) => s + v.minutes, 0) / withMinutes.length : null

    return { visits: visitsCount, uniqueMembers, days, perDay, peakHour, byMethod, avgMinutes }
}

// ─── Footfall ────────────────────────────────────────────────────────────────

export type FootfallBucket = {
    start: string
    label: string
    visits: number
    uniqueMembers: number
    days: number
    perDay: number
    peakHour: number | null
    byMethod: Record<EntryMethod, number>
    avgMinutes: number | null
}

export function footfallBuckets(visits: Visit[], range: DateRange, bucket: Bucket): FootfallBucket[] {
    const starts: string[] = []
    for (let start = bucketStart(range.from, bucket); start <= range.to; start = nextBucketStart(start, bucket)) {
        starts.push(start)
    }
    const byStart = new Map<string, Visit[]>(starts.map((start) => [start, []]))
    for (const v of visits) {
        if (v.date < range.from || v.date > range.to) continue
        const key = bucketStart(v.date, bucket)
        const list = byStart.get(key)
        if (!list) continue
        list.push(v)
    }
    return starts.map((start) => {
        const next = nextBucketStart(start, bucket)
        const clippedFrom = start > range.from ? start : range.from
        const nextMinus1 = format(addDays(parseISO(next), -1), 'yyyy-MM-dd')
        const clippedTo = nextMinus1 < range.to ? nextMinus1 : range.to
        const days = daysBetweenInclusive({ from: clippedFrom, to: clippedTo })
        const aggregate = aggregateVisits(byStart.get(start) ?? [], days)
        return { start, label: bucketLabel(start, bucket), ...aggregate }
    })
}

export function footfallTotals(buckets: FootfallBucket[], visits: Visit[], range: DateRange): Omit<FootfallBucket, 'start' | 'label'> {
    void buckets
    const inRange = visits.filter((v) => v.date >= range.from && v.date <= range.to)
    return aggregateVisits(inRange, daysBetweenInclusive(range))
}

export type FootfallKpis = { visits: number; uniqueMembers: number; perDay: number }

export function footfallKpis(visits: Visit[], range: DateRange): FootfallKpis {
    const inRange = visits.filter((v) => v.date >= range.from && v.date <= range.to)
    const days = daysBetweenInclusive(range)
    return {
        visits: inRange.length,
        uniqueMembers: new Set(inRange.map((v) => v.member_id)).size,
        perDay: days > 0 ? inRange.length / days : 0,
    }
}

// ─── By member ───────────────────────────────────────────────────────────────

export type MemberAttendanceRow = {
    member: ReportMemberRow
    visits: number
    avgMinutes: number | null
    lastVisit: string | null
    daysSince: number | null
}

export type MemberSort = 'most' | 'least' | 'gap'

export function byMember(visits: Visit[], members: ReportMemberRow[], today: string, sort: MemberSort): MemberAttendanceRow[] {
    const byId = new Map(members.map((m) => [m.id, m]))
    const grouped = new Map<string, Visit[]>()
    for (const v of visits) {
        if (!byId.has(v.member_id)) continue
        const list = grouped.get(v.member_id)
        if (list) list.push(v)
        else grouped.set(v.member_id, [v])
    }

    const rows: MemberAttendanceRow[] = [...grouped.entries()].map(([memberId, memberVisits]) => {
        const member = byId.get(memberId) as ReportMemberRow
        const withMinutes = memberVisits.filter((v): v is Visit & { minutes: number } => v.minutes !== null)
        const avgMinutes = withMinutes.length ? withMinutes.reduce((s, v) => s + v.minutes, 0) / withMinutes.length : null
        const lastVisit = memberVisits.reduce((latest, v) => (v.date > latest ? v.date : latest), memberVisits[0].date)
        const daysSince = Math.max(0, daysBetweenInclusive({ from: lastVisit, to: today }) - 1)
        return { member, visits: memberVisits.length, avgMinutes, lastVisit, daysSince }
    })

    const byName = (a: MemberAttendanceRow, b: MemberAttendanceRow) => a.member.full_name.localeCompare(b.member.full_name)

    switch (sort) {
        case 'most': return rows.sort((a, b) => b.visits - a.visits || byName(a, b))
        case 'least': return rows.sort((a, b) => a.visits - b.visits || byName(a, b))
        case 'gap': return rows.sort((a, b) => (b.daysSince ?? -1) - (a.daysSince ?? -1) || byName(a, b))
    }
}

// ─── Heat map ────────────────────────────────────────────────────────────────

export type Heatmap = {
    hours: number[]
    cells: number[][] // [hourIndex][weekday]
    rowTotals: number[]
    colTotals: number[]
    max: number
    busiest: { hour: number; weekday: number; count: number } | null
}

export function heatmap(visits: Visit[]): Heatmap {
    let minHour = 6
    let maxHour = 22
    for (const v of visits) {
        if (v.hour < minHour) minHour = v.hour
        if (v.hour > maxHour) maxHour = v.hour
    }
    const hours: number[] = []
    for (let h = minHour; h <= maxHour; h++) hours.push(h)

    const cells: number[][] = hours.map(() => [0, 0, 0, 0, 0, 0, 0])
    for (const v of visits) {
        const hourIndex = hours.indexOf(v.hour)
        if (hourIndex === -1) continue
        cells[hourIndex][v.weekday] += 1
    }

    const rowTotals = cells.map((row) => row.reduce((s, c) => s + c, 0))
    const colTotals = [0, 0, 0, 0, 0, 0, 0]
    for (const row of cells) for (let w = 0; w < 7; w++) colTotals[w] += row[w]

    let max = 0
    let busiest: { hour: number; weekday: number; count: number } | null = null
    for (let hi = 0; hi < hours.length; hi++) {
        for (let w = 0; w < 7; w++) {
            const count = cells[hi][w]
            if (count > max) {
                max = count
                busiest = { hour: hours[hi], weekday: w, count }
            }
        }
    }

    return { hours, cells, rowTotals, colTotals, max, busiest }
}

// ═══ Analytics layer ═════════════════════════════════════════════════════════
//
// Computed from the `Visit[]` (and, on By member, the roster) the tabs
// already fetch. Nothing here fetches, and nothing claims a capacity or
// operating-hours figure the database does not hold: these are relative
// measures of when and how often members come in.

export const WEEKDAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const formatHourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`

// ─── Visit frequency ─────────────────────────────────────────────────────────

export type FrequencyBucketId = '1' | '2-3' | '4-7' | '8+'

export const FREQUENCY_BUCKETS: { id: FrequencyBucketId; label: string; min: number; max: number }[] = [
    { id: '1', label: '1 visit', min: 1, max: 1 },
    { id: '2-3', label: '2–3 visits', min: 2, max: 3 },
    { id: '4-7', label: '4–7 visits', min: 4, max: 7 },
    { id: '8+', label: '8+ visits', min: 8, max: Number.POSITIVE_INFINITY },
]

export type FrequencyBucket = { id: FrequencyBucketId; label: string; members: number; share: number }

/** How many visits each member made in the selected period, bucketed.
 *  Members sum to the period's unique-member count. */
export function visitFrequency(visits: Visit[]): FrequencyBucket[] {
    const perMember = new Map<string, number>()
    for (const v of visits) perMember.set(v.member_id, (perMember.get(v.member_id) ?? 0) + 1)
    const total = perMember.size
    return FREQUENCY_BUCKETS.map((b) => {
        const members = [...perMember.values()].filter((n) => n >= b.min && n <= b.max).length
        return { id: b.id, label: b.label, members, share: total ? (members / total) * 100 : 0 }
    })
}

// ─── Entry method ────────────────────────────────────────────────────────────

export type EntryMethodRow = { method: EntryMethod; label: string; visits: number; share: number }

/** The existing per-method counts as rows with a share, largest first. */
export function entryMethodRows(byMethod: Record<EntryMethod, number>): EntryMethodRow[] {
    const total = ENTRY_METHODS.reduce((s, m) => s + byMethod[m], 0)
    return ENTRY_METHODS
        .map((method) => ({ method, label: ENTRY_METHOD_LABELS[method], visits: byMethod[method], share: total ? (byMethod[method] / total) * 100 : 0 }))
        .sort((a, b) => b.visits - a.visits)
}

// ─── Peak periods ────────────────────────────────────────────────────────────

export type HourRow = { hour: number; label: string; visits: number }

/** Visits per hour of day, over the same 06:00–22:00 span the heat map uses,
 *  widened when visits fall outside it. */
export function byHour(visits: Visit[]): HourRow[] {
    let minHour = 6
    let maxHour = 22
    for (const v of visits) {
        if (v.hour < minHour) minHour = v.hour
        if (v.hour > maxHour) maxHour = v.hour
    }
    const counts = new Map<number, number>()
    for (const v of visits) counts.set(v.hour, (counts.get(v.hour) ?? 0) + 1)
    const rows: HourRow[] = []
    for (let h = minHour; h <= maxHour; h++) rows.push({ hour: h, label: formatHourLabel(h), visits: counts.get(h) ?? 0 })
    return rows
}

export type WeekdayRow = { weekday: number; label: string; visits: number; days: number; perDay: number }

function countWeekdays(range: DateRange): number[] {
    const days = [0, 0, 0, 0, 0, 0, 0]
    for (let d = parseISO(range.from); d <= parseISO(range.to); d = addDays(d, 1)) days[(d.getDay() + 6) % 7] += 1
    return days
}

/** Visits per weekday, with the number of such days in the range so a
 *  period containing five Saturdays and four Sundays compares fairly. */
export function byWeekday(visits: Visit[], range: DateRange): WeekdayRow[] {
    const days = countWeekdays(range)
    const counts = [0, 0, 0, 0, 0, 0, 0]
    for (const v of visits) if (v.date >= range.from && v.date <= range.to) counts[v.weekday] += 1
    return counts.map((count, weekday) => ({
        weekday, label: WEEKDAY_LABELS[weekday], visits: count, days: days[weekday],
        perDay: days[weekday] ? count / days[weekday] : 0,
    }))
}

export type PeakSummary = {
    busiestHour: { hour: number; visits: number } | null
    busiestWeekday: { weekday: number; visits: number; perDay: number } | null
    /** Mon–Fri vs Sat–Sun, as visits per day of that kind. */
    weekdayPerDay: number
    weekendPerDay: number
    weekdayVisits: number
    weekendVisits: number
}

export function peakSummary(visits: Visit[], range: DateRange): PeakSummary {
    const hours = byHour(visits)
    const busiestHourRow = hours.reduce<HourRow | null>((best, row) => (row.visits > (best?.visits ?? 0) ? row : best), null)
    const weekdays = byWeekday(visits, range)
    const busiest = weekdays.reduce<WeekdayRow | null>((best, row) => (row.perDay > (best?.perDay ?? 0) ? row : best), null)
    const week = weekdays.slice(0, 5)
    const weekend = weekdays.slice(5)
    const sum = (rows: WeekdayRow[], key: 'visits' | 'days') => rows.reduce((s, r) => s + r[key], 0)
    const weekDays = sum(week, 'days')
    const weekendDays = sum(weekend, 'days')
    return {
        busiestHour: busiestHourRow ? { hour: busiestHourRow.hour, visits: busiestHourRow.visits } : null,
        busiestWeekday: busiest ? { weekday: busiest.weekday, visits: busiest.visits, perDay: busiest.perDay } : null,
        weekdayVisits: sum(week, 'visits'),
        weekendVisits: sum(weekend, 'visits'),
        weekdayPerDay: weekDays ? sum(week, 'visits') / weekDays : 0,
        weekendPerDay: weekendDays ? sum(weekend, 'visits') / weekendDays : 0,
    }
}

// ─── By member: summary, consistency, segments ───────────────────────────────

export type MemberSummary = {
    members: number
    avgVisits: number
    gap7: number
    gap14: number
    gap30: number
    /** Members with a visit in every ISO week the period touches. */
    everyWeek: number
    weeksInPeriod: number
}

/** ISO-week starts (Mondays) the range touches. */
export function weekStartsIn(range: DateRange): string[] {
    const starts: string[] = []
    for (let s = bucketStart(range.from, 'week'); s <= range.to; s = format(addDays(parseISO(s), 7), 'yyyy-MM-dd')) starts.push(s)
    return starts
}

/** Distinct weeks in which each member visited. */
export function activeWeeks(visits: Visit[], range: DateRange): Map<string, number> {
    const weeks = new Map<string, Set<string>>()
    for (const v of visits) {
        if (v.date < range.from || v.date > range.to) continue
        const set = weeks.get(v.member_id) ?? new Set<string>()
        set.add(bucketStart(v.date, 'week'))
        weeks.set(v.member_id, set)
    }
    return new Map([...weeks.entries()].map(([id, set]) => [id, set.size]))
}

export function memberSummary(rows: MemberAttendanceRow[], visits: Visit[], range: DateRange): MemberSummary {
    const weeksInPeriod = weekStartsIn(range).length
    const weeks = activeWeeks(visits, range)
    const totalVisits = rows.reduce((s, r) => s + r.visits, 0)
    return {
        members: rows.length,
        avgVisits: rows.length ? totalVisits / rows.length : 0,
        gap7: rows.filter((r) => (r.daysSince ?? 0) >= 7).length,
        gap14: rows.filter((r) => (r.daysSince ?? 0) >= 14).length,
        gap30: rows.filter((r) => (r.daysSince ?? 0) >= 30).length,
        everyWeek: rows.filter((r) => (weeks.get(r.member.id) ?? 0) >= weeksInPeriod).length,
        weeksInPeriod,
    }
}

export type Segment = 'power' | 'regular' | 'occasional' | 'dormant'

/**
 * Segment rules, in visits per week so they mean the same thing whatever the
 * period length. Stated in the UI verbatim; there is no score behind them.
 * The thresholds are a starting point — the live data is too thin (a handful
 * of visiting members) to tune them from, so they are deliberately simple.
 */
export const SEGMENT_RULES: { id: Segment; label: string; rule: string; minPerWeek: number }[] = [
    { id: 'power', label: 'Power', rule: '3 or more visits a week', minPerWeek: 3 },
    { id: 'regular', label: 'Regular', rule: '1 to 3 visits a week', minPerWeek: 1 },
    { id: 'occasional', label: 'Occasional', rule: 'Visited, but under once a week', minPerWeek: 0 },
    { id: 'dormant', label: 'Dormant', rule: 'Active membership, no visit in the period', minPerWeek: -1 },
]

export type SegmentRow = { id: Segment; label: string; rule: string; members: number; share: number }

export function segmentOf(visitsInPeriod: number, range: DateRange): Exclude<Segment, 'dormant'> {
    const perWeek = visitsInPeriod / (daysBetweenInclusive(range) / 7)
    if (perWeek >= 3) return 'power'
    if (perWeek >= 1) return 'regular'
    return 'occasional'
}

/**
 * Members who visited, by visits-per-week rule, plus active or expiring
 * members with no visit at all as Dormant. Shares are of the whole
 * (visitors + dormant), so the four rows describe the active base.
 */
export function segments(rows: MemberAttendanceRow[], members: ReportMemberRow[], range: DateRange, today: string): SegmentRow[] {
    const visited = new Set(rows.map((r) => r.member.id))
    const counts: Record<Segment, number> = { power: 0, regular: 0, occasional: 0, dormant: 0 }
    for (const r of rows) counts[segmentOf(r.visits, range)] += 1
    for (const m of members) {
        if (visited.has(m.id)) continue
        const status = effectiveStatus(m, today)
        if (status === 'active' || status === 'expiring') counts.dormant += 1
    }
    const total = Object.values(counts).reduce((s, n) => s + n, 0)
    return SEGMENT_RULES.map((s) => ({ id: s.id, label: s.label, rule: s.rule, members: counts[s.id], share: total ? (counts[s.id] / total) * 100 : 0 }))
}

// ─── By member: first 30 days ────────────────────────────────────────────────

export type OnboardingReport = {
    /** Members whose first four weeks fall entirely inside the fetched range. */
    cohort: number
    /** Average visits in week 1, 2, 3 and 4 after joining. */
    weeks: number[]
}

/**
 * Average visits in each of the first four weeks after joining, for members
 * who joined early enough in the selected range that all 28 days are inside
 * it — the report only holds this period's visits, so anyone whose first
 * month straddles the range edge is left out rather than under-counted.
 */
export function firstThirtyDays(visits: Visit[], members: ReportMemberRow[], range: DateRange): OnboardingReport {
    const latestJoin = addDaysIso(range.to, -27)
    const cohort = members.filter((m) => {
        const joined = istDate(m.created_at)
        return joined >= range.from && joined <= latestJoin
    })
    const weeks = [0, 0, 0, 0]
    if (cohort.length === 0) return { cohort: 0, weeks }
    const byMember = new Map<string, Visit[]>()
    for (const v of visits) {
        const list = byMember.get(v.member_id)
        if (list) list.push(v)
        else byMember.set(v.member_id, [v])
    }
    for (const m of cohort) {
        const joined = istDate(m.created_at)
        for (const v of byMember.get(m.id) ?? []) {
            const day = daysBetweenInclusive({ from: joined, to: v.date }) - 1
            if (day < 0 || day > 27) continue
            weeks[Math.floor(day / 7)] += 1
        }
    }
    return { cohort: cohort.length, weeks: weeks.map((n) => n / cohort.length) }
}
