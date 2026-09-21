import 'server-only'

import { randomBytes } from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { gymHasFeature } from '@/lib/gym/features'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { REFERRER_BONUS_COINS } from '@/lib/payments/settle-member-payment'
import type { InsertTables, QueryResult, Tables } from '@/lib/types'
import {
    effectiveReferralStatus,
    isWellFormedGymSlug,
    isWellFormedReferralToken,
    leadExpiryFrom,
    referralJoinPath,
    validateLeadForm,
    type LeadFormInput,
    type ReferralStatus,
} from '@/lib/referrals/lead'

/**
 * Everything that touches the database on behalf of the referral workflow.
 * Every function takes the tenant from a trusted source (the viewer's gym,
 * or the token's owner) and never from request input.
 */

// ─── Referral link ───────────────────────────────────────────────────────────

const TOKEN_BYTES = 15 // 15 bytes -> 20 base64url characters

function newToken(): string {
    return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function appBaseUrl(): string {
    const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '')
    if (configured) return configured
    const vercel = process.env.VERCEL_URL?.trim()
    return vercel ? `https://${vercel}` : 'http://localhost:3000'
}

/**
 * The member's referral link, issuing a token the first time. `gymId` must
 * come from the caller's resolved context; the query is scoped to it so a
 * member row from another gym can never be touched.
 */
export async function getOrCreateReferralLink(memberRowId: string, gymId: string): Promise<{ url: string; token: string } | null> {
    const db = getSupabaseAdmin()
    const memberResult = await db
        .from('members')
        .select('id, referral_token, gym:gyms!members_gym_id_fkey(slug)')
        .eq('id', memberRowId)
        .eq('gym_id', gymId)
        .maybeSingle()
    const { data: member } = memberResult as unknown as QueryResult<{
        id: string
        referral_token: string | null
        gym: { slug: string | null } | { slug: string | null }[] | null
    } | null>
    if (!member) return null
    const gym = Array.isArray(member.gym) ? member.gym[0] ?? null : member.gym
    if (!gym?.slug) return null

    let token = member.referral_token
    if (!token) {
        // Retry on the (astronomically unlikely) unique collision rather
        // than surface it to the member.
        for (let attempt = 0; attempt < 3 && !token; attempt += 1) {
            const candidate = newToken()
            const { data, error } = await db
                .from('members')
                .update({ referral_token: candidate, referral_token_created_at: new Date().toISOString() })
                .eq('id', member.id)
                .eq('gym_id', gymId)
                .is('referral_token', null)
                .select('referral_token')
            const rows = (data ?? []) as { referral_token: string | null }[]
            // Zero rows with no error: a concurrent request issued the token
            // first (the `is null` guard did not match); read theirs back.
            if (!error && rows.length === 0) break
            if (!error) token = rows[0]?.referral_token ?? null
        }
        if (!token) {
            const again = await db.from('members').select('referral_token').eq('id', member.id).eq('gym_id', gymId).maybeSingle()
            token = (again.data as { referral_token: string | null } | null)?.referral_token ?? null
        }
    }
    if (!token) return null

    return { token, url: `${appBaseUrl()}${referralJoinPath(gym.slug, token)}` }
}

export type ReferralLinkContext = {
    gym: {
        id: string
        name: string
        slug: string
        logoUrl: string | null
        /** For the confirmation screen's Contact / Directions actions. */
        contactPhone: string | null
        address: string | null
    }
    referrer: { id: string; fullName: string }
}

export type ResolveLinkResult =
    | { ok: true; context: ReferralLinkContext }
    | { ok: false; reason: 'not-found' | 'program-off' | 'referrer-inactive' }

/**
 * Resolves a landing URL to its gym and referrer. The token owns the gym:
 * the slug in the URL must match the token's gym, which stops a link from
 * gym A ever rendering (or submitting) under gym B.
 */
export async function resolveReferralLink(gymSlug: string, token: string): Promise<ResolveLinkResult> {
    if (!isWellFormedGymSlug(gymSlug) || !isWellFormedReferralToken(token)) return { ok: false, reason: 'not-found' }

    const db = getSupabaseAdmin()
    const result = await db
        .from('members')
        .select('id, full_name, status, gym_id, gym:gyms!members_gym_id_fkey(id, name, slug, logo_url, is_active, platform_status, contact_phone, address, city, state, postal_code)')
        .eq('referral_token', token)
        .maybeSingle()
    const { data: member } = result as unknown as QueryResult<{
        id: string
        full_name: string
        status: string | null
        gym_id: string
        gym: GymRow | GymRow[] | null
    } | null>
    type GymRow = {
        id: string
        name: string
        slug: string | null
        logo_url: string | null
        is_active: boolean
        platform_status: string
        contact_phone: string | null
        address: string | null
        city: string | null
        state: string | null
        postal_code: string | null
    }

    if (!member) return { ok: false, reason: 'not-found' }
    const gym = Array.isArray(member.gym) ? member.gym[0] ?? null : member.gym
    if (!gym || gym.slug !== gymSlug || gym.id !== member.gym_id) return { ok: false, reason: 'not-found' }
    if (!gym.is_active || gym.platform_status !== 'active') return { ok: false, reason: 'program-off' }
    if (!(await gymHasFeature(gym.id, 'referrals'))) return { ok: false, reason: 'program-off' }
    if (member.status !== 'active') return { ok: false, reason: 'referrer-inactive' }

    return {
        ok: true,
        context: {
            gym: {
                id: gym.id,
                name: gym.name,
                slug: gym.slug,
                logoUrl: gym.logo_url,
                contactPhone: gym.contact_phone?.trim() || null,
                address: [gym.address, gym.city, gym.state, gym.postal_code].map((part) => part?.trim()).filter(Boolean).join(', ') || null,
            },
            referrer: { id: member.id, fullName: member.full_name },
        },
    }
}

/** Best-effort funnel counter; a failure here must never affect the page. */
export async function recordReferralLinkVisit(referrerId: string): Promise<void> {
    try {
        const db = getSupabaseAdmin()
        const { data } = await db.from('members').select('referral_link_visits').eq('id', referrerId).maybeSingle()
        const visits = (data as { referral_link_visits: number } | null)?.referral_link_visits ?? 0
        await db.from('members').update({ referral_link_visits: visits + 1 }).eq('id', referrerId)
    } catch (error) {
        console.warn('[referrals] Could not record link visit', { referrerId, error })
    }
}

// ─── Lead submission ─────────────────────────────────────────────────────────

export type SubmitLeadResult =
    | { ok: true; outcome: 'created'; expiresAt: string }
    | { ok: false; kind: 'validation'; field: keyof LeadFormInput; message: string }
    | { ok: false; kind: 'already-member' }
    /** A pending, unexpired lead already exists for this phone or email at this gym. */
    | { ok: false; kind: 'already-referred'; referrerName: string; expiresAt: string | null }
    | { ok: false; kind: 'link-invalid' }
    | { ok: false; kind: 'error'; message: string }

type ExistingLead = {
    id: string
    status: ReferralStatus
    expires_at: string | null
    referred_id: string | null
    referrer_id: string
    referred_phone: string | null
    referred_email: string | null
    referrer: { full_name: string } | { full_name: string }[] | null
}

/**
 * Creates the lead. Duplicate handling, in order — phone and email are each
 * checked, so reusing either one is caught:
 *
 *  1. Same phone or email already belongs to a member of this gym: no lead;
 *     the visitor is told they are already a member of the gym.
 *  2. A *pending, unexpired* lead exists for the same phone or email in this
 *     gym: no lead; the visitor is told who already referred them. The first
 *     referral stands while it is open, so a lead cannot be hijacked by
 *     re-submitting under another link. Once it expires or is cancelled, a
 *     fresh submission starts over.
 *  3. Otherwise a new pending lead with a 14-day expiry from now.
 *
 * The partial unique indexes on (gym, phone) and (gym, email) for pending
 * leads make step 2/3 race-safe; a lost race is reported as step 2.
 */
export async function submitReferralLead(gymSlug: string, token: string, input: LeadFormInput): Promise<SubmitLeadResult> {
    const link = await resolveReferralLink(gymSlug, token)
    if (!link.ok) return { ok: false, kind: 'link-invalid' }
    const { gym, referrer } = link.context

    const form = validateLeadForm(input)
    if (!form.ok) return { ok: false, kind: 'validation', field: form.field, message: form.message }

    const db = getSupabaseAdmin()

    // Expired-but-unswept leads still hold the (gym, phone) unique slot; sweep
    // first so a person whose earlier lead lapsed can submit again.
    await expireReferralLeads().catch((error) => console.warn('[referrals] Pre-submit sweep failed', error))

    // Two exact-match queries rather than one `or` filter: the values are
    // user input and PostgREST's filter grammar treats commas and brackets
    // as syntax.
    // Member phones exist in two spellings (`+91XXXXXXXXXX` from the form,
    // bare ten digits from imports), so both are checked.
    const [byPhone, byEmail] = await Promise.all([
        db.from('members').select('id').eq('gym_id', gym.id).in('phone', [form.phone, form.phone.slice(3)]).limit(1),
        db.from('members').select('id').eq('gym_id', gym.id).eq('email', form.email).limit(1),
    ])
    if (byPhone.error || byEmail.error) return { ok: false, kind: 'error', message: 'Could not check your details right now.' }
    if ((byPhone.data ?? []).length > 0 || (byEmail.data ?? []).length > 0) return { ok: false, kind: 'already-member' }

    const now = new Date()
    const existing = await findActiveLead(gym.id, form.phone, form.email)

    if (existing) return { ok: false, kind: 'already-referred', referrerName: referrerNameOf(existing), expiresAt: existing.expires_at }

    const expiresAt = leadExpiryFrom(now).toISOString()
    const payload: InsertTables<'referrals'> = {
        gym_id: gym.id,
        referrer_id: referrer.id,
        referred_id: null,
        referral_code: null,
        status: 'pending',
        source: 'link',
        referred_name: form.fullName,
        referred_phone: form.phone,
        referred_email: form.email,
        submitted_at: now.toISOString(),
        expires_at: expiresAt,
    }
    const insert = await db.from('referrals').insert(payload as never).select('id').single()
    const { data: created, error: insertError } = insert as unknown as QueryResult<{ id: string } | null>

    if (insertError || !created) {
        // Unique violation: someone submitted the same phone/email between
        // our check and our insert. Report it as the existing referral.
        const raced = await findActiveLead(gym.id, form.phone, form.email)
        if (raced) return { ok: false, kind: 'already-referred', referrerName: referrerNameOf(raced), expiresAt: raced.expires_at }
        console.error('[referrals] Lead insert failed', { gymId: gym.id, error: insertError })
        return { ok: false, kind: 'error', message: 'Could not save your details right now. Please try again.' }
    }

    await notifyGymOfLead({ gymId: gym.id, referralId: created.id, referredName: form.fullName, referrerName: referrer.fullName })

    return { ok: true, outcome: 'created', expiresAt }
}

export type MatchedLead = { id: string; referrerId: string; referrerName: string }

/**
 * The open link lead, if any, for a person staff are registering from the
 * plain Add Member form. Phone is matched in both stored spellings so a
 * desk-typed `+91…` finds a lead either way.
 */
export async function findActiveLeadForRegistration(gymId: string, phone: string, email: string): Promise<MatchedLead | null> {
    const digits = phone.replace(/\D/g, '')
    const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits
    const candidates = local.length === 10 ? [`+91${local}`, local] : [phone]
    for (const candidate of candidates) {
        const lead = await findActiveLead(gymId, candidate, email)
        if (lead) return { id: lead.id, referrerId: lead.referrer_id, referrerName: referrerNameOf(lead) }
    }
    return null
}

async function findActiveLead(gymId: string, phone: string, email: string): Promise<ExistingLead | null> {
    const db = getSupabaseAdmin()
    const base = () => db
        .from('referrals')
        .select('id, status, expires_at, referred_id, referrer_id, referred_phone, referred_email, referrer:members!referrals_referrer_id_fkey(full_name)')
        .eq('gym_id', gymId)
        .eq('status', 'pending')
        .is('referred_id', null)
        .order('submitted_at', { ascending: false })
        .limit(5)
    const [byPhone, byEmail] = await Promise.all([base().eq('referred_phone', phone), base().eq('referred_email', email)])
    const rows = [...((byPhone.data ?? []) as unknown as ExistingLead[]), ...((byEmail.data ?? []) as unknown as ExistingLead[])]
        .filter((row) => effectiveReferralStatus(row) === 'pending')
    return rows[0] ?? null
}

function referrerNameOf(lead: ExistingLead): string {
    const referrer = Array.isArray(lead.referrer) ? lead.referrer[0] ?? null : lead.referrer
    return referrer?.full_name ?? 'a member'
}

// ─── Gym notification ────────────────────────────────────────────────────────

async function notifyGymOfLead(input: { gymId: string; referralId: string; referredName: string; referrerName: string }) {
    const db = getSupabaseAdmin()
    const href = `/admin/members/referrals?lead=${input.referralId}`
    const notification: InsertTables<'gym_notifications'> = {
        gym_id: input.gymId,
        type: 'referral_lead',
        title: 'New referral lead',
        body: `${input.referredName} was referred by ${input.referrerName}.`,
        href,
        referral_id: input.referralId,
    }
    const { error } = await db.from('gym_notifications').insert(notification as never)
    if (error) console.error('[referrals] Could not write gym notification', { gymId: input.gymId, error: error.message })

    // The gym's WhatsApp contact, if any, gets the same notice through the
    // existing Twilio sender. Delivery failures are logged, never surfaced:
    // the lead is already saved and shown in the admin.
    try {
        const { data } = await db.from('gyms').select('name, contact_phone').eq('id', input.gymId).maybeSingle()
        const gym = data as { name: string; contact_phone: string | null } | null
        if (gym?.contact_phone && process.env.TWILIO_ACCOUNT_SID) {
            await sendWhatsAppMessage(
                gym.contact_phone,
                `New referral lead at ${gym.name}: ${input.referredName} was referred by ${input.referrerName}. Open ${appBaseUrl()}${href} to complete their registration.`,
            )
        }
    } catch (error) {
        console.warn('[referrals] Gym WhatsApp notice failed', { gymId: input.gymId, error })
    }
}

// ─── Staff views ─────────────────────────────────────────────────────────────

export type ReferralLead = {
    id: string
    status: ReferralStatus
    source: 'link' | 'staff'
    referredName: string
    referredPhone: string
    referredEmail: string | null
    referrerId: string
    referrerName: string
    referrerCode: string
    submittedAt: string
    expiresAt: string | null
    convertedAt: string | null
    cancelledAt: string | null
    convertedMemberId: string | null
    convertedMemberCode: string | null
}

type LeadRow = Pick<
    Tables<'referrals'>,
    'id' | 'status' | 'source' | 'referred_id' | 'referred_name' | 'referred_phone' | 'referred_email' | 'submitted_at' | 'expires_at' | 'applied_at' | 'cancelled_at' | 'referrer_id' | 'created_at'
> & {
    referrer: { full_name: string; member_id: string } | { full_name: string; member_id: string }[] | null
    referred: { id: string; full_name: string; member_id: string } | { id: string; full_name: string; member_id: string }[] | null
}

const LEAD_SELECT = [
    'id', 'status', 'source', 'referred_id', 'referred_name', 'referred_phone', 'referred_email',
    'submitted_at', 'expires_at', 'applied_at', 'cancelled_at', 'referrer_id', 'created_at',
    'referrer:members!referrals_referrer_id_fkey(full_name, member_id)',
    'referred:members!referrals_referred_id_fkey(id, full_name, member_id)',
].join(', ')

function one<T>(value: T | T[] | null): T | null {
    return Array.isArray(value) ? value[0] ?? null : value
}

function toLead(row: LeadRow): ReferralLead {
    const referrer = one(row.referrer)
    const referred = one(row.referred)
    return {
        id: row.id,
        status: effectiveReferralStatus(row),
        source: row.source,
        referredName: row.referred_name ?? referred?.full_name ?? 'Unknown',
        referredPhone: row.referred_phone ?? '',
        referredEmail: row.referred_email,
        referrerId: row.referrer_id,
        referrerName: referrer?.full_name ?? 'Unknown',
        referrerCode: referrer?.member_id ?? '',
        submittedAt: row.submitted_at ?? row.created_at,
        expiresAt: row.expires_at,
        convertedAt: row.applied_at,
        cancelledAt: row.cancelled_at,
        convertedMemberId: referred?.id ?? row.referred_id,
        convertedMemberCode: referred?.member_id ?? null,
    }
}

/** Link-sourced referrals for one gym, newest first. */
export async function listReferralLeads(gymId: string): Promise<ReferralLead[]> {
    const db = getSupabaseAdmin()
    // Lazy sweep so the stored status matches what the page shows, without
    // depending on the daily cron having run.
    await expireReferralLeads().catch((error) => console.warn('[referrals] Lazy sweep failed', error))
    const result = await db
        .from('referrals')
        .select(LEAD_SELECT)
        .eq('gym_id', gymId)
        .eq('source', 'link')
        .order('submitted_at', { ascending: false })
        .limit(500)
    if (result.error) throw new Error(`Could not load referral leads: ${result.error.message}`)
    return ((result.data ?? []) as unknown as LeadRow[]).map(toLead)
}

/** One lead, scoped to the gym; null when it belongs elsewhere or does not exist. */
export async function getReferralLead(gymId: string, leadId: string): Promise<ReferralLead | null> {
    if (!/^[0-9a-f-]{36}$/i.test(leadId)) return null
    const db = getSupabaseAdmin()
    const result = await db.from('referrals').select(LEAD_SELECT).eq('gym_id', gymId).eq('id', leadId).maybeSingle()
    const row = result.data as unknown as LeadRow | null
    return row ? toLead(row) : null
}

export async function countPendingReferralLeads(gymId: string): Promise<number> {
    const db = getSupabaseAdmin()
    const { count } = await db
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .eq('status', 'pending')
        .is('referred_id', null)
        .gt('expires_at', new Date().toISOString())
    return count ?? 0
}

// ─── Conversion and cancellation ─────────────────────────────────────────────

export type ClaimLeadResult = { ok: true; referrerId: string } | { ok: false; reason: 'not-found' | 'expired' | 'not-pending' }

/**
 * Re-validates a lead the registration form claims to be converting. Called
 * before any member is created so a stale or foreign lead fails fast.
 */
export async function checkLeadConvertible(gymId: string, leadId: string): Promise<ClaimLeadResult> {
    const lead = await getReferralLead(gymId, leadId)
    if (!lead || lead.source !== 'link') return { ok: false, reason: 'not-found' }
    if (lead.status === 'expired') return { ok: false, reason: 'expired' }
    if (lead.status !== 'pending') return { ok: false, reason: 'not-pending' }
    return { ok: true, referrerId: lead.referrerId }
}

/**
 * Attaches the new member and marks the lead converted in one conditional
 * update. The WHERE clause is the lock: only a pending, unexpired lead of
 * this gym flips, so two staff converting the same lead, or a conversion
 * after expiry, cannot both succeed. Returns the referrer to credit, or
 * null when nothing was converted.
 */
export async function convertReferralLead(gymId: string, leadId: string, memberRowId: string): Promise<{ referrerId: string } | null> {
    const db = getSupabaseAdmin()
    const nowIso = new Date().toISOString()
    const result = await db
        .from('referrals')
        .update({ referred_id: memberRowId, status: 'converted', applied_at: nowIso })
        .eq('id', leadId)
        .eq('gym_id', gymId)
        .eq('status', 'pending')
        .is('referred_id', null)
        .gt('expires_at', nowIso)
        .select('referrer_id')
    const rows = (result.data ?? []) as { referrer_id: string }[]
    if (result.error || rows.length !== 1) return null
    return { referrerId: rows[0].referrer_id }
}

/** Pays the referrer's bonus once for a conversion. */
export async function creditReferrerBonus(gymId: string, referrerId: string): Promise<void> {
    if (!(await gymHasFeature(gymId, 'referrals'))) return
    const db = getSupabaseAdmin()
    const { data } = await db.from('members').select('referral_coins_balance').eq('id', referrerId).eq('gym_id', gymId).maybeSingle()
    const balance = (data as { referral_coins_balance: number } | null)?.referral_coins_balance
    if (balance === undefined) return
    await db.from('members').update({ referral_coins_balance: (balance || 0) + REFERRER_BONUS_COINS }).eq('id', referrerId).eq('gym_id', gymId)
}

export type CancelLeadResult = { ok: true } | { ok: false; reason: 'not-found' | 'not-pending' }

export async function cancelReferralLead(gymId: string, leadId: string, cancelledBy: string): Promise<CancelLeadResult> {
    const lead = await getReferralLead(gymId, leadId)
    if (!lead || lead.source !== 'link') return { ok: false, reason: 'not-found' }
    if (lead.status !== 'pending') return { ok: false, reason: 'not-pending' }

    const db = getSupabaseAdmin()
    const result = await db
        .from('referrals')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: cancelledBy })
        .eq('id', leadId)
        .eq('gym_id', gymId)
        .eq('status', 'pending')
        .is('referred_id', null)
        .select('id')
    if (result.error) throw new Error(`Could not cancel referral: ${result.error.message}`)
    const rows = (result.data ?? []) as { id: string }[]
    return rows.length === 1 ? { ok: true } : { ok: false, reason: 'not-pending' }
}

/** Stored-status sweep; the read path never depends on it. */
export async function expireReferralLeads(): Promise<number> {
    const db = getSupabaseAdmin()
    const { data, error } = await db.rpc('expire_referral_leads' as never)
    if (error) throw new Error(`expire_referral_leads failed: ${error.message}`)
    return typeof data === 'number' ? data : 0
}
