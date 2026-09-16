import { addDays, addMonths, format, parseISO } from 'date-fns'
import { bucketLabel, bucketStart, daysBetweenInclusive, todayInKolkata, type Bucket, type DateRange } from '@/lib/reports/dates'
import type { ReportMemberRow } from '@/lib/reports/members-aggregate'

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
