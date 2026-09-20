/**
 * Live end-to-end check of the referral lead workflow against the real
 * Supabase project. Not part of `vitest run` (no .test suffix); run with:
 *
 *   npx vitest run --config vitest.live.config.ts
 *
 * Creates a lead for a throwaway phone/email, converts it the way
 * `createMember` does, and cleans up everything it created.
 */
import { describe, it, expect, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import {
    cancelReferralLead,
    checkLeadConvertible,
    convertReferralLead,
    creditReferrerBonus,
    expireReferralLeads,
    getOrCreateReferralLink,
    getReferralLead,
    listReferralLeads,
    resolveReferralLink,
    submitReferralLead,
} from '@/lib/referrals/server'
import { fetchReferrals } from '@/lib/reports/referrals'
import { overviewKpis } from '@/lib/reports/referrals-aggregate'

const GYM_A = '8c9e1319-bb2c-40e8-8ad1-abe331a79383' // Mirza Gym, slug fitgym-default
const GYM_A_SLUG = 'fitgym-default'
const GYM_B_SLUG = 'flex-gym-2'
const REFERRER = 'a0000000-0000-4000-8000-000000000105' // Vishnu Raj, balance 0
const STAFF_USER = '5ee867cf-7f8d-4273-ab38-ff36ae8fbfe2' // an admin of Mirza Gym (cancelled_by references auth.users)
const STAMP = Date.now().toString().slice(-5)
const PHONE = `+919${STAMP}0001`
const EMAIL = `e2e-${STAMP}@example.test`

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const created: { members: string[]; referrals: string[] } = { members: [], referrals: [] }

afterAll(async () => {
    // Notifications first: deleting a referral nulls their referral_id.
    if (created.referrals.length) await db.from('gym_notifications').delete().in('referral_id', created.referrals)
    for (const id of created.referrals) await db.from('referrals').delete().eq('id', id)
    for (const id of created.members) await db.from('members').delete().eq('id', id)
    await db.from('members').update({ referral_coins_balance: 0 }).eq('id', REFERRER)
})

describe('referral lead workflow (live)', () => {
    let token = ''
    let leadId = ''

    it('1-3. member gets a link that identifies the right gym and referrer', async () => {
        const link = await getOrCreateReferralLink(REFERRER, GYM_A)
        expect(link).not.toBeNull()
        token = link!.token
        expect(link!.url).toContain(`/join/${GYM_A_SLUG}/${token}`)
        // Idempotent: same token on the second call.
        expect((await getOrCreateReferralLink(REFERRER, GYM_A))!.token).toBe(token)

        const resolved = await resolveReferralLink(GYM_A_SLUG, token)
        expect(resolved.ok).toBe(true)
        if (resolved.ok) {
            expect(resolved.context.gym.id).toBe(GYM_A)
            expect(resolved.context.referrer.id).toBe(REFERRER)
        }
    })

    it('16. the link cannot be used under another gym or with a bad token', async () => {
        expect(await resolveReferralLink(GYM_B_SLUG, token)).toEqual({ ok: false, reason: 'not-found' })
        expect(await resolveReferralLink(GYM_A_SLUG, 'AAAAAAAAAAAAAAAAAAAA')).toEqual({ ok: false, reason: 'not-found' })
        expect(await resolveReferralLink(GYM_A_SLUG, '../x')).toEqual({ ok: false, reason: 'not-found' })
        const submit = await submitReferralLead(GYM_B_SLUG, token, { fullName: 'Nope', phone: PHONE, email: EMAIL })
        expect(submit).toEqual({ ok: false, kind: 'link-invalid' })
    })

    it('4-6. submitting creates a PENDING lead with 14-day expiry and notifies the gym', async () => {
        const result = await submitReferralLead(GYM_A_SLUG, token, { fullName: '  E2E   Friend ', phone: PHONE.slice(3), email: EMAIL.toUpperCase() })
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.outcome).toBe('created')

        const leads = await listReferralLeads(GYM_A)
        const lead = leads.find((l) => l.referredPhone === PHONE)!
        expect(lead).toBeDefined()
        leadId = lead.id
        created.referrals.push(leadId)
        expect(lead.status).toBe('pending')
        expect(lead.referredName).toBe('E2E Friend')
        expect(lead.referredEmail).toBe(EMAIL)
        expect(lead.referrerId).toBe(REFERRER)
        const days = (new Date(lead.expiresAt!).getTime() - new Date(lead.submittedAt).getTime()) / 86_400_000
        expect(days).toBeCloseTo(14, 3)

        const { data: notes } = await db.from('gym_notifications').select('gym_id, title, body, href, read_at').eq('referral_id', leadId)
        expect(notes).toHaveLength(1)
        expect(notes![0]).toMatchObject({ gym_id: GYM_A, title: 'New referral lead', read_at: null })
        expect(notes![0].body).toContain('E2E Friend was referred by Vishnu Raj')
        expect(notes![0].href).toBe(`/admin/members/referrals?lead=${leadId}`)
    })

    it('17. a second submission for the same phone or email is refused, naming the referrer', async () => {
        // Age the open lead so the renewal is observable.
        await db.from('referrals').update({ expires_at: new Date(Date.now() + 3 * 86_400_000).toISOString() }).eq('id', leadId)
        const byPhone = await submitReferralLead(GYM_A_SLUG, token, { fullName: 'E2E Friend Again', phone: PHONE, email: `other-${STAMP}@example.test` })
        expect(byPhone).toMatchObject({ ok: false, kind: 'already-referred', referrerName: 'Vishnu Raj' })
        const renewed = byPhone.ok === false && byPhone.kind === 'already-referred' ? byPhone.expiresAt : null
        expect(renewed).toBeTruthy()
        // Expiry restarted: 14 days from now, not the 3 that were left.
        expect((new Date(renewed!).getTime() - Date.now()) / 86_400_000).toBeCloseTo(14, 1)
        const { data: row } = await db.from('referrals').select('expires_at, referred_name, referrer_id').eq('id', leadId).single()
        expect(row!.expires_at).toBe(renewed!.replace('Z', '+00:00'))
        expect(row!.referred_name).toBe('E2E Friend Again')
        expect(row!.referrer_id).toBe(REFERRER)
        const byEmail = await submitReferralLead(GYM_A_SLUG, token, { fullName: 'E2E Friend Again', phone: `+919${STAMP}0009`, email: EMAIL })
        expect(byEmail).toMatchObject({ ok: false, kind: 'already-referred', referrerName: 'Vishnu Raj' })
        const { data: rows } = await db.from('referrals').select('id').eq('gym_id', GYM_A).eq('status', 'pending').or(`referred_phone.eq.${PHONE},referred_email.eq.${EMAIL}`)
        expect(rows).toHaveLength(1)
        expect(rows![0].id).toBe(leadId)
    })

    it('17b. an existing member of the gym is not turned into a lead', async () => {
        const result = await submitReferralLead(GYM_A_SLUG, token, { fullName: 'Arjun Again', phone: '9847100101', email: `arjun-${STAMP}@example.test` })
        expect(result).toEqual({ ok: false, kind: 'already-member' })
    })

    it('15/16. a lead of gym A cannot be read, cancelled or converted as gym B', async () => {
        const gymB = 'f2ecc943-be4a-45d9-9b3a-d4a8aaabbdfe'
        expect(await getReferralLead(gymB, leadId)).toBeNull()
        expect(await checkLeadConvertible(gymB, leadId)).toEqual({ ok: false, reason: 'not-found' })
        expect(await cancelReferralLead(gymB, leadId, '00000000-0000-0000-0000-000000000000')).toEqual({ ok: false, reason: 'not-found' })
        expect(await convertReferralLead(gymB, leadId, REFERRER)).toBeNull()
        const { data } = await db.from('referrals').select('status, referred_id').eq('id', leadId).single()
        expect(data).toEqual({ status: 'pending', referred_id: null })
    })

    it('8-12. completing registration converts the lead exactly once and credits the referrer', async () => {
        const check = await checkLeadConvertible(GYM_A, leadId)
        expect(check).toEqual({ ok: true, referrerId: REFERRER })

        // Stand in for the member row `createMember` inserts.
        const { data: member, error } = await db
            .from('members')
            .insert({ gym_id: GYM_A, member_id: `E2E${STAMP}`, full_name: 'E2E Friend', phone: PHONE, email: EMAIL, status: 'active', referred_by: REFERRER })
            .select('id')
            .single()
        expect(error).toBeNull()
        created.members.push(member!.id)

        const before = (await db.from('members').select('referral_coins_balance').eq('id', REFERRER).single()).data!.referral_coins_balance

        const [first, second] = await Promise.all([
            convertReferralLead(GYM_A, leadId, member!.id),
            convertReferralLead(GYM_A, leadId, member!.id),
        ])
        // Exactly one of two concurrent conversions wins.
        expect([first, second].filter(Boolean)).toHaveLength(1)
        await creditReferrerBonus(GYM_A, REFERRER)

        const after = (await db.from('members').select('referral_coins_balance').eq('id', REFERRER).single()).data!.referral_coins_balance
        expect(after - before).toBe(500)

        const lead = await getReferralLead(GYM_A, leadId)
        expect(lead).toMatchObject({ status: 'converted', convertedMemberId: member!.id, convertedMemberCode: `E2E${STAMP}` })
        expect(lead!.convertedAt).not.toBeNull()
        expect(await checkLeadConvertible(GYM_A, leadId)).toEqual({ ok: false, reason: 'not-pending' })
    })

    it('13. the report counts the lead as started and converted', async () => {
        const today = new Date().toISOString().slice(0, 10)
        const rows = await fetchReferrals(GYM_A, { from: today, to: today })
        const mine = rows.find((r) => r.id === leadId)!
        expect(mine).toMatchObject({ status: 'converted', source: 'link', referred_name: 'E2E Friend' })
        const kpis = overviewKpis(rows, [], { from: today, to: today }, 500)
        expect(kpis.leads).toBeGreaterThanOrEqual(1)
        expect(kpis.conversions).toBeGreaterThanOrEqual(1)
    })

    it('14-15. an unconverted lead expires after 14 days and can no longer be converted', async () => {
        const phone = `+919${STAMP}0002`
        const result = await submitReferralLead(GYM_A_SLUG, token, { fullName: 'Late Friend', phone, email: `late-${STAMP}@example.test` })
        expect(result.ok).toBe(true)
        const { data: row } = await db.from('referrals').select('id').eq('gym_id', GYM_A).eq('referred_phone', phone).single()
        const lateId = row!.id
        created.referrals.push(lateId)

        // Backdate: submitted 15 days ago, so expires_at is yesterday.
        const submitted = new Date(Date.now() - 15 * 86_400_000)
        const expires = new Date(submitted.getTime() + 14 * 86_400_000)
        await db.from('referrals').update({ submitted_at: submitted.toISOString(), expires_at: expires.toISOString() }).eq('id', lateId)

        // Read path: expired before any sweep ran (status column still says pending).
        expect((await db.from('referrals').select('status').eq('id', lateId).single()).data!.status).toBe('pending')
        expect((await getReferralLead(GYM_A, lateId))!.status).toBe('expired')
        expect(await checkLeadConvertible(GYM_A, lateId)).toEqual({ ok: false, reason: 'expired' })
        expect(await convertReferralLead(GYM_A, lateId, REFERRER)).toBeNull()
        expect(await cancelReferralLead(GYM_A, lateId, STAFF_USER)).toEqual({ ok: false, reason: 'not-pending' })

        // Sweep: stored status catches up.
        expect(await expireReferralLeads()).toBeGreaterThanOrEqual(1)
        expect((await db.from('referrals').select('status').eq('id', lateId).single()).data!.status).toBe('expired')

        // The slot is free again: the same person can submit a fresh lead.
        const fresh = await submitReferralLead(GYM_A_SLUG, token, { fullName: 'Late Friend', phone, email: `late-${STAMP}@example.test` })
        expect(fresh.ok && fresh.outcome).toBe('created')
        const { data: freshRows } = await db.from('referrals').select('id').eq('gym_id', GYM_A).eq('referred_phone', phone).eq('status', 'pending')
        expect(freshRows).toHaveLength(1)
        created.referrals.push(freshRows![0].id)

        // Staff can cancel the fresh one; the record stays.
        expect(await cancelReferralLead(GYM_A, freshRows![0].id, STAFF_USER)).toEqual({ ok: true })
        expect((await getReferralLead(GYM_A, freshRows![0].id))!.status).toBe('cancelled')
    })
})
