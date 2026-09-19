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
