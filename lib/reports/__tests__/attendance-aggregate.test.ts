import { describe, it, expect } from 'vitest'
import {
    toVisit, footfallBuckets, footfallTotals, footfallKpis, byMember, heatmap,
    visitFrequency, entryMethodRows, byHour, byWeekday, peakSummary, weekStartsIn, activeWeeks, memberSummary,
    segmentOf, segments, firstThirtyDays,
    type CheckInRow, type Visit,
} from '@/lib/reports/attendance-aggregate'
import type { ReportMemberRow } from '@/lib/reports/members-aggregate'

function row(o: Partial<CheckInRow>): CheckInRow & { member_id: string } {
    return { id: Math.random().toString(36).slice(2), member_id: 'm1', check_in_time: '2026-09-15T04:00:00Z', check_out_time: null, entry_method: 'manual', ...o } as CheckInRow & { member_id: string }
}

function visit(o: Partial<Visit>): Visit {
    return { member_id: 'm1', date: '2026-09-15', hour: 10, weekday: 1, minutes: null, entry_method: 'manual', ...o }
}

function member(o: Partial<ReportMemberRow>): ReportMemberRow {
    return {
        id: 'm1', member_code: 'G1', full_name: 'A', phone: '9000000000', status: 'active',
        plan_id: 'p1', plan_name: 'Gold', plan_price: 1000, plan_duration_days: 30,
        membership_start_date: '2026-01-01', membership_expiry_date: '2027-01-01',
        referred_by: null, referrer_name: null, referral_coins_balance: 0, referral_token_created_at: null, referral_link_visits: 0, created_at: '2026-01-01T00:00:00Z', is_demo: false,
        ...o,
    }
}

describe('toVisit', () => {
    it('derives the next IST date, hour, and weekday across a UTC day boundary', () => {
        const v = toVisit(row({ check_in_time: '2026-09-15T20:30:00Z' }))
        expect(v.date).toBe('2026-09-16')
        expect(v.hour).toBe(2)
        expect(v.weekday).toBe(2) // Wed 16 Sep 2026
    })

    it('derives IST date/hour/weekday for a Monday 06:00 IST check-in', () => {
        const v = toVisit(row({ check_in_time: '2026-09-14T00:30:00Z' }))
        expect(v.date).toBe('2026-09-14')
        expect(v.hour).toBe(6)
        expect(v.weekday).toBe(0)
    })

    it('computes minutes from checkout, rounded', () => {
        const v = toVisit(row({ check_in_time: '2026-09-15T04:00:00Z', check_out_time: '2026-09-15T04:45:00Z' }))
        expect(v.minutes).toBe(45)
    })

    it('is null when there is no checkout', () => {
        const v = toVisit(row({ check_out_time: null }))
        expect(v.minutes).toBeNull()
    })

    it('is null when checkout is before checkin', () => {
        const v = toVisit(row({ check_in_time: '2026-09-15T04:00:00Z', check_out_time: '2026-09-15T03:00:00Z' }))
        expect(v.minutes).toBeNull()
    })

    it('defaults a null entry_method to manual', () => {
        const v = toVisit(row({ entry_method: null }))
        expect(v.entry_method).toBe('manual')
    })
})

describe('footfallBuckets', () => {
    const visits: Visit[] = [
        visit({ member_id: 'm1', date: '2026-09-14', hour: 18, weekday: 0, minutes: null, entry_method: 'manual' }),
        visit({ member_id: 'm2', date: '2026-09-14', hour: 7, weekday: 0, minutes: 40, entry_method: 'qr' }),
        visit({ member_id: 'm1', date: '2026-09-16', hour: 18, weekday: 2, minutes: null, entry_method: 'kiosk' }),
    ]
    const range = { from: '2026-09-14', to: '2026-09-16' }

    it('buckets by day: counts, uniques, peak-hour tie earliest wins, avg over checkouts only, empty day', () => {
        const buckets = footfallBuckets(visits, range, 'day')
        expect(buckets.map((b) => b.start)).toEqual(['2026-09-14', '2026-09-15', '2026-09-16'])

        expect(buckets[0]).toMatchObject({ visits: 2, uniqueMembers: 2, days: 1, perDay: 2, peakHour: 7, avgMinutes: 40 })
        expect(buckets[0].byMethod).toMatchObject({ manual: 1, qr: 1, kiosk: 0, fingerprint: 0 })

        expect(buckets[1]).toMatchObject({ visits: 0, uniqueMembers: 0, days: 1, perDay: 0, peakHour: null, avgMinutes: null })
        expect(buckets[1].byMethod).toEqual({ manual: 0, qr: 0, kiosk: 0, fingerprint: 0 })

        expect(buckets[2]).toMatchObject({ visits: 1, uniqueMembers: 1, days: 1, perDay: 1, peakHour: 18, avgMinutes: null })
        expect(buckets[2].byMethod).toMatchObject({ kiosk: 1 })
    })

    it('clips a week bucket to the range for its days count', () => {
        const buckets = footfallBuckets([], { from: '2026-09-16', to: '2026-09-18' }, 'week')
        expect(buckets).toHaveLength(1)
        expect(buckets[0].days).toBe(3)
    })

    it('ignores a visit whose date is outside the range', () => {
        const outOfRange = [...visits, visit({ member_id: 'm3', date: '2026-09-20' })]
        const buckets = footfallBuckets(outOfRange, range, 'day')
        const total = buckets.reduce((s, b) => s + b.visits, 0)
        expect(total).toBe(3)
    })
})

describe('footfallTotals', () => {
    it('counts unique members once across buckets, not summed', () => {
        const visits: Visit[] = [
            visit({ member_id: 'm1', date: '2026-09-14' }),
            visit({ member_id: 'm2', date: '2026-09-14' }),
            visit({ member_id: 'm1', date: '2026-09-16' }),
        ]
        const range = { from: '2026-09-14', to: '2026-09-16' }
        const buckets = footfallBuckets(visits, range, 'day')
        const totals = footfallTotals(buckets, visits, range)
        expect(totals.visits).toBe(3)
        expect(totals.uniqueMembers).toBe(2)
    })
})

describe('footfallKpis', () => {
    it('computes per-day as visits over inclusive days in range', () => {
        const visits: Visit[] = [
            visit({ member_id: 'm1', date: '2026-09-14' }),
            visit({ member_id: 'm2', date: '2026-09-14' }),
            visit({ member_id: 'm1', date: '2026-09-16' }),
        ]
        const kpis = footfallKpis(visits, { from: '2026-09-14', to: '2026-09-16' })
        expect(kpis).toEqual({ visits: 3, uniqueMembers: 2, perDay: 1 })
    })
})

describe('byMember', () => {
    const members: ReportMemberRow[] = [member({ id: 'm1', full_name: 'Alice' }), member({ id: 'm2', full_name: 'Bob' })]
    const visits: Visit[] = [
        visit({ member_id: 'm1', date: '2026-09-10', minutes: 30 }),
        visit({ member_id: 'm1', date: '2026-09-14', minutes: null }),
        visit({ member_id: 'm2', date: '2026-09-15', minutes: null }),
        visit({ member_id: 'unknown', date: '2026-09-15' }),
    ]

    it('orders most visits desc', () => {
        const rows = byMember(visits, members, '2026-09-16', 'most')
        expect(rows.map((r) => r.member.id)).toEqual(['m1', 'm2'])
        expect(rows[0].visits).toBe(2)
        expect(rows[0].avgMinutes).toBe(30)
    })

    it('orders least visits asc', () => {
        const rows = byMember(visits, members, '2026-09-16', 'least')
        expect(rows.map((r) => r.member.id)).toEqual(['m2', 'm1'])
    })

    it('orders by longest gap (daysSince) desc, and computes daysSince from last visit', () => {
        const rows = byMember(visits, members, '2026-09-16', 'gap')
        expect(rows.map((r) => r.member.id)).toEqual(['m1', 'm2'])
        expect(rows.find((r) => r.member.id === 'm1')?.lastVisit).toBe('2026-09-14')
        expect(rows.find((r) => r.member.id === 'm1')?.daysSince).toBe(2)
        expect(rows.find((r) => r.member.id === 'm2')?.daysSince).toBe(1)
    })

    it('skips unknown member ids and reports null avgMinutes when no checkouts', () => {
        const rows = byMember(visits, members, '2026-09-16', 'most')
        expect(rows.some((r) => r.member.id === 'unknown')).toBe(false)
        const bob = rows.find((r) => r.member.id === 'm2')
        expect(bob?.avgMinutes).toBeNull()
    })

    it('breaks a tie on visits by full_name ascending', () => {
        const tiedMembers: ReportMemberRow[] = [member({ id: 'm1', full_name: 'Zed' }), member({ id: 'm2', full_name: 'Amy' })]
        const tiedVisits: Visit[] = [visit({ member_id: 'm1', date: '2026-09-14' }), visit({ member_id: 'm2', date: '2026-09-15' })]
        const rows = byMember(tiedVisits, tiedMembers, '2026-09-16', 'most')
        expect(rows.map((r) => r.member.full_name)).toEqual(['Amy', 'Zed'])
    })

    it('clamps daysSince at 0 when the last visit is after today', () => {
        const futureVisits: Visit[] = [visit({ member_id: 'm1', date: '2026-09-20' })]
        const rows = byMember(futureVisits, members, '2026-09-16', 'most')
        expect(rows.find((r) => r.member.id === 'm1')?.daysSince).toBe(0)
    })
})

describe('heatmap', () => {
    it('pads to hours 06..22 with all-zero cells and a null busiest when there are no visits', () => {
        const h = heatmap([])
        expect(h.hours[0]).toBe(6)
        expect(h.hours[h.hours.length - 1]).toBe(22)
        expect(h.hours).toHaveLength(17)
        expect(h.cells.every((row) => row.every((c) => c === 0))).toBe(true)
        expect(h.busiest).toBeNull()
        expect(h.max).toBe(0)
    })

    it('extends the upper bound to a later hour with a visit', () => {
        const h = heatmap([visit({ hour: 23, weekday: 5 })])
        expect(h.hours[h.hours.length - 1]).toBe(23)
    })

    it('extends the lower bound to an earlier hour with a visit', () => {
        const h = heatmap([visit({ hour: 5, weekday: 0 })])
        expect(h.hours[0]).toBe(5)
    })

    it('finds the busiest cell (earliest hour on tie) and totals rows/cols', () => {
        const visits: Visit[] = [
            visit({ hour: 18, weekday: 5 }),
            visit({ hour: 18, weekday: 5 }),
            visit({ hour: 7, weekday: 5, member_id: 'm2' }),
            visit({ hour: 7, weekday: 5, member_id: 'm3' }),
        ]
        const h = heatmap(visits)
        expect(h.busiest).toEqual({ hour: 7, weekday: 5, count: 2 })
        expect(h.max).toBe(2)
        const hourIndex18 = h.hours.indexOf(18)
        const hourIndex7 = h.hours.indexOf(7)
        expect(h.cells[hourIndex18][5]).toBe(2)
        expect(h.cells[hourIndex7][5]).toBe(2)
        expect(h.rowTotals[hourIndex18]).toBe(2)
        expect(h.colTotals[5]).toBe(4)
    })

    it('resolves a tie across weekdays at the same hour to the earliest weekday', () => {
        const visits: Visit[] = [
            visit({ hour: 18, weekday: 5, member_id: 'm1' }),
            visit({ hour: 18, weekday: 2, member_id: 'm2' }),
        ]
        const h = heatmap(visits)
        expect(h.busiest).toEqual({ hour: 18, weekday: 2, count: 1 })
    })
})

// ═══ Analytics layer ═════════════════════════════════════════════════════════

const sep = { from: '2026-09-01', to: '2026-09-30' } // 30 days: Tue 1 Sep … Wed 30 Sep

describe('visitFrequency / entryMethodRows', () => {
    it('buckets members by visits and sums to the unique-member count', () => {
        const visits = [
            ...Array.from({ length: 1 }, () => visit({ member_id: 'a' })),
            ...Array.from({ length: 3 }, () => visit({ member_id: 'b' })),
            ...Array.from({ length: 5 }, () => visit({ member_id: 'c' })),
            ...Array.from({ length: 9 }, () => visit({ member_id: 'd' })),
        ]
        const buckets = visitFrequency(visits)
        expect(buckets.map((b) => [b.id, b.members])).toEqual([['1', 1], ['2-3', 1], ['4-7', 1], ['8+', 1]])
        expect(buckets.reduce((s, b) => s + b.members, 0)).toBe(footfallKpis(visits, sep).uniqueMembers)
        expect(buckets.reduce((s, b) => s + b.share, 0)).toBeCloseTo(100)
    })
    it('method rows reconcile with the footfall totals', () => {
        const visits = [visit({ entry_method: 'qr' }), visit({ entry_method: 'qr' }), visit({ entry_method: 'kiosk' })]
        const totals = footfallTotals([], visits, sep)
        const rows = entryMethodRows(totals.byMethod)
        expect(rows[0]).toMatchObject({ method: 'qr', visits: 2, share: (2 / 3) * 100 })
        expect(rows.reduce((s, r) => s + r.visits, 0)).toBe(totals.visits)
    })
})

describe('byHour / byWeekday / peakSummary', () => {
    it('counts the days of each weekday in the range so per-day is fair', () => {
        const rows = byWeekday([], sep)
        // September 2026 has five Tuesdays and Wednesdays, four of everything else.
        expect(rows.map((r) => r.days)).toEqual([4, 5, 5, 4, 4, 4, 4])
    })
    it('finds the busiest hour, the busiest weekday per day, and the weekday/weekend split', () => {
        const visits = [
            visit({ date: '2026-09-05', weekday: 5, hour: 18 }), visit({ date: '2026-09-05', weekday: 5, hour: 18 }), // Saturday
            visit({ date: '2026-09-12', weekday: 5, hour: 7 }),
            visit({ date: '2026-09-07', weekday: 0, hour: 18 }), // Monday
        ]
        const peaks = peakSummary(visits, sep)
        expect(peaks.busiestHour).toEqual({ hour: 18, visits: 3 })
        expect(peaks.busiestWeekday).toMatchObject({ weekday: 5, visits: 3, perDay: 0.75 })
        expect(peaks.weekdayVisits + peaks.weekendVisits).toBe(visits.length)
        expect(peaks.weekendPerDay).toBeCloseTo(3 / 8)
        expect(peaks.weekdayPerDay).toBeCloseTo(1 / 22)
        expect(byHour(visits).reduce((s, h) => s + h.visits, 0)).toBe(visits.length)
        expect(byHour(visits)[0].hour).toBe(6)
    })
    it('reconciles the hour chart with the heat map row totals', () => {
        const visits = [visit({ hour: 9, weekday: 0 }), visit({ hour: 9, weekday: 3 }), visit({ hour: 21, weekday: 6 })]
        const hm = heatmap(visits)
        for (const h of byHour(visits)) expect(h.visits).toBe(hm.rowTotals[hm.hours.indexOf(h.hour)])
    })
})

describe('member summary, consistency, segments', () => {
    const today = '2026-09-30'
    it('weeks in a range and members who visited in each', () => {
        expect(weekStartsIn(sep)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'])
        const visits = [visit({ member_id: 'a', date: '2026-09-02' }), visit({ member_id: 'a', date: '2026-09-10' }), visit({ member_id: 'b', date: '2026-09-02' })]
        expect(activeWeeks(visits, sep).get('a')).toBe(2)
        expect(activeWeeks(visits, sep).get('b')).toBe(1)
    })
    it('summarises gaps from the same rows the table shows', () => {
        const members = [member({ id: 'a' }), member({ id: 'b' }), member({ id: 'c' })]
        const visits = [
            visit({ member_id: 'a', date: '2026-09-29' }),
            visit({ member_id: 'b', date: '2026-09-15' }),
            visit({ member_id: 'c', date: '2026-08-31' }), // in the first ISO week but before the range
            visit({ member_id: 'c', date: '2026-09-01' }),
        ]
        const rows = byMember(visits, members, today, 'most')
        const summary = memberSummary(rows, visits, sep)
        expect(summary).toMatchObject({ members: 3, gap7: 2, gap14: 2, gap30: 0, everyWeek: 0, weeksInPeriod: 5 })
        expect(summary.avgVisits).toBeCloseTo(4 / 3)
    })
    it('segments by visits per week, with dormant active members counted from the roster', () => {
        // 30-day range → 4.29 weeks: 13 visits ≈ 3.0/wk, 5 ≈ 1.2/wk, 2 ≈ 0.5/wk.
        expect(segmentOf(13, sep)).toBe('power')
        expect(segmentOf(5, sep)).toBe('regular')
        expect(segmentOf(2, sep)).toBe('occasional')
        const members = [member({ id: 'p' }), member({ id: 'o' }), member({ id: 'sleeper' }), member({ id: 'gone', status: 'inactive' })]
        const visits = [...Array.from({ length: 13 }, () => visit({ member_id: 'p' })), visit({ member_id: 'o' })]
        const rows = byMember(visits, members, today, 'most')
        expect(segments(rows, members, sep, today).map((s) => [s.id, s.members])).toEqual([['power', 1], ['regular', 0], ['occasional', 1], ['dormant', 1]])
    })
})

describe('firstThirtyDays', () => {
    it('averages week 1–4 visits for members whose first 28 days sit inside the range', () => {
        const members = [
            member({ id: 'early', created_at: '2026-09-01T00:00:00Z' }),   // qualifies: 1 Sep + 27 = 28 Sep
            member({ id: 'late', created_at: '2026-09-10T00:00:00Z' }),    // does not: would need to 7 Oct
            member({ id: 'old', created_at: '2026-08-01T00:00:00Z' }),
        ]
        const visits = [
            visit({ member_id: 'early', date: '2026-09-01' }), visit({ member_id: 'early', date: '2026-09-03' }), // week 1
            visit({ member_id: 'early', date: '2026-09-20' }), // week 3
            visit({ member_id: 'early', date: '2026-09-29' }), // day 28 → outside the window
            visit({ member_id: 'late', date: '2026-09-11' }),
        ]
        expect(firstThirtyDays(visits, members, sep)).toEqual({ cohort: 1, weeks: [2, 0, 1, 0] })
        expect(firstThirtyDays(visits, members, { from: '2026-09-20', to: '2026-09-30' })).toEqual({ cohort: 0, weeks: [0, 0, 0, 0] })
    })
})
