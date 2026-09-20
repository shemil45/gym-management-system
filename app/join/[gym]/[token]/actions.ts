'use server'

import { submitReferralLead, type SubmitLeadResult } from '@/lib/referrals/server'

/**
 * Public, unauthenticated. The gym and referrer come from the URL token,
 * which the server resolves; nothing in the form names either.
 */
export async function submitLead(gymSlug: string, token: string, formData: FormData): Promise<SubmitLeadResult> {
    // Honeypot: real browsers leave this hidden field empty. Bots that fill
    // it get a success screen and no row.
    const trap = (formData.get('website') as string | null) ?? ''
    if (trap.trim()) return { ok: true, outcome: 'created', expiresAt: new Date().toISOString() }

    const read = (key: string) => {
        const value = formData.get(key)
        return typeof value === 'string' ? value.slice(0, 254) : ''
    }
    return submitReferralLead(String(gymSlug), String(token), {
        fullName: read('full_name'),
        phone: read('phone'),
        email: read('email'),
    })
}
