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
