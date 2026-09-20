/**
 * Pure referral-lead rules shared by the public form, the staff views, the
 * conversion path and the reports. Nothing here touches the database, so it
 * is unit-tested directly.
 */

export const REFERRAL_LEAD_VALIDITY_DAYS = 14

export type ReferralStatus = 'pending' | 'converted' | 'expired' | 'cancelled'

/** The columns any status decision needs. */
export type ReferralStatusInput = {
    status: ReferralStatus
    expires_at: string | null
    referred_id: string | null
}

/**
 * Status as the workflow sees it, not as the row last stored it. A pending
 * lead whose `expires_at` has passed is expired even if the daily sweep has
 * not run yet; the conversion guard applies the same rule in SQL.
 */
export function effectiveReferralStatus(row: ReferralStatusInput, now: Date = new Date()): ReferralStatus {
    if (row.status !== 'pending') return row.status
    if (row.referred_id === null && row.expires_at !== null && new Date(row.expires_at).getTime() <= now.getTime()) {
        return 'expired'
    }
    return 'pending'
}

/** Expiry starts at submission, not when the link was shared. */
export function leadExpiryFrom(submittedAt: Date): Date {
    const expires = new Date(submittedAt)
    expires.setDate(expires.getDate() + REFERRAL_LEAD_VALIDITY_DAYS)
    return expires
}

/** Whole days left, never negative; null when there is no expiry. */
export function daysUntilExpiry(expiresAt: string | null, now: Date = new Date()): number | null {
    if (!expiresAt) return null
    const ms = new Date(expiresAt).getTime() - now.getTime()
    return Math.max(0, Math.ceil(ms / 86_400_000))
}

/**
 * Phone as the members table stores it: `+91` followed by ten digits. The
 * form accepts what people type ("98765 43210", "+91 98765-43210",
 * "09876543210") and this decides whether it is one Indian mobile number.
 */
export function normalizeLeadPhone(raw: string): string | null {
    let digits = raw.replace(/\D/g, '')
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2)
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
    if (!/^[6-9]\d{9}$/.test(digits)) return null
    return `+91${digits}`
}

export function normalizeLeadEmail(raw: string): string | null {
    const email = raw.trim().toLowerCase()
    if (email.length > 254) return null
    // Deliberately loose: the member registration re-validates through the
    // auth provider. This only rejects things that cannot be an address.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
    return email
}

export function normalizeLeadName(raw: string): string | null {
    const name = raw.replace(/\s+/g, ' ').trim()
    if (name.length < 2 || name.length > 80) return null
    return name
}

export type LeadFormInput = { fullName: string; phone: string; email: string }
export type LeadFormResult =
    | { ok: true; fullName: string; phone: string; email: string }
    | { ok: false; field: keyof LeadFormInput; message: string }

export function validateLeadForm(input: LeadFormInput): LeadFormResult {
    const fullName = normalizeLeadName(input.fullName ?? '')
    if (!fullName) return { ok: false, field: 'fullName', message: 'Enter your full name.' }
    const phone = normalizeLeadPhone(input.phone ?? '')
    if (!phone) return { ok: false, field: 'phone', message: 'Enter a valid 10-digit mobile number.' }
    const email = normalizeLeadEmail(input.email ?? '')
    if (!email) return { ok: false, field: 'email', message: 'Enter a valid email address.' }
    return { ok: true, fullName, phone, email }
}

/** Path of the public landing page; the host is added by the caller. */
export function referralJoinPath(gymSlug: string, token: string): string {
    return `/join/${encodeURIComponent(gymSlug)}/${encodeURIComponent(token)}`
}

/** Tokens are 20 URL-safe characters; anything else is rejected before a query runs. */
export function isWellFormedReferralToken(value: string): boolean {
    return /^[A-Za-z0-9_-]{20}$/.test(value)
}

export function isWellFormedGymSlug(value: string): boolean {
    return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value)
}
