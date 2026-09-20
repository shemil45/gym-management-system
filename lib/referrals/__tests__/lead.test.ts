import { describe, it, expect } from 'vitest'
import {
    daysUntilExpiry,
    effectiveReferralStatus,
    isWellFormedGymSlug,
    isWellFormedReferralToken,
    leadExpiryFrom,
    normalizeLeadEmail,
    normalizeLeadPhone,
    referralJoinPath,
    validateLeadForm,
} from '@/lib/referrals/lead'

const NOW = new Date('2026-09-20T10:00:00Z')

describe('effectiveReferralStatus', () => {
    it('keeps a pending lead pending before expiry', () => {
        expect(effectiveReferralStatus({ status: 'pending', expires_at: '2026-10-04T10:00:00Z', referred_id: null }, NOW)).toBe('pending')
    })
    it('treats a pending lead past expires_at as expired even if the sweep has not run', () => {
        expect(effectiveReferralStatus({ status: 'pending', expires_at: '2026-09-20T09:59:59Z', referred_id: null }, NOW)).toBe('expired')
    })
    it('never expires a staff-recorded referral (no expiry, member attached)', () => {
        expect(effectiveReferralStatus({ status: 'pending', expires_at: null, referred_id: 'm1' }, NOW)).toBe('pending')
    })
    it('passes terminal statuses through unchanged', () => {
        expect(effectiveReferralStatus({ status: 'converted', expires_at: '2020-01-01T00:00:00Z', referred_id: 'm1' }, NOW)).toBe('converted')
        expect(effectiveReferralStatus({ status: 'cancelled', expires_at: '2099-01-01T00:00:00Z', referred_id: null }, NOW)).toBe('cancelled')
    })
})

describe('leadExpiryFrom', () => {
    it('is 14 days after submission, not after sharing', () => {
        expect(leadExpiryFrom(new Date('2026-09-10T08:00:00Z')).toISOString()).toBe('2026-09-24T08:00:00.000Z')
    })
})

describe('daysUntilExpiry', () => {
    it('rounds up and floors at zero', () => {
        expect(daysUntilExpiry('2026-09-21T09:00:00Z', NOW)).toBe(1)
        expect(daysUntilExpiry('2026-09-19T09:00:00Z', NOW)).toBe(0)
        expect(daysUntilExpiry(null, NOW)).toBeNull()
    })
})

describe('normalizeLeadPhone', () => {
    it('accepts the usual Indian mobile spellings and stores +91 + 10 digits', () => {
        expect(normalizeLeadPhone('98765 43210')).toBe('+919876543210')
        expect(normalizeLeadPhone('+91 98765-43210')).toBe('+919876543210')
        expect(normalizeLeadPhone('09876543210')).toBe('+919876543210')
    })
    it('rejects numbers that are not a 10-digit mobile', () => {
        expect(normalizeLeadPhone('12345')).toBeNull()
        expect(normalizeLeadPhone('1234567890')).toBeNull()
        expect(normalizeLeadPhone('')).toBeNull()
    })
})

describe('normalizeLeadEmail', () => {
    it('lowercases and trims', () => {
        expect(normalizeLeadEmail('  Arjun@Example.com ')).toBe('arjun@example.com')
    })
    it('rejects non-addresses', () => {
        expect(normalizeLeadEmail('arjun')).toBeNull()
        expect(normalizeLeadEmail('a b@example.com')).toBeNull()
    })
})

describe('validateLeadForm', () => {
    it('returns normalized values when everything is valid', () => {
        expect(validateLeadForm({ fullName: '  Arjun   Kumar ', phone: '98765 43210', email: 'ARJUN@example.com' })).toEqual({
            ok: true, fullName: 'Arjun Kumar', phone: '+919876543210', email: 'arjun@example.com',
        })
    })
    it('names the first failing field', () => {
        expect(validateLeadForm({ fullName: 'A', phone: '9876543210', email: 'a@b.co' })).toMatchObject({ ok: false, field: 'fullName' })
        expect(validateLeadForm({ fullName: 'Arjun', phone: '12', email: 'a@b.co' })).toMatchObject({ ok: false, field: 'phone' })
        expect(validateLeadForm({ fullName: 'Arjun', phone: '9876543210', email: 'nope' })).toMatchObject({ ok: false, field: 'email' })
    })
})

describe('link shape', () => {
    it('builds the join path and validates its parts', () => {
        expect(referralJoinPath('flex-gym', 'abcdefghijklmnopqrst')).toBe('/join/flex-gym/abcdefghijklmnopqrst')
        expect(isWellFormedReferralToken('abcdefghijklmnopqrst')).toBe(true)
        expect(isWellFormedReferralToken('short')).toBe(false)
        expect(isWellFormedReferralToken('abcdefghijklmnopqrs/')).toBe(false)
        expect(isWellFormedGymSlug('flex-gym-2')).toBe(true)
        expect(isWellFormedGymSlug('Flex Gym')).toBe(false)
    })
})
