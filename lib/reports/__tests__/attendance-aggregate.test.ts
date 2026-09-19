import { describe, it, expect } from 'vitest'
import {
    toVisit, footfallBuckets, footfallTotals, footfallKpis, byMember, heatmap,
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
        referred_by: null, referrer_name: null, referral_coins_balance: 0, created_at: '2026-01-01T00:00:00Z', is_demo: false,
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
