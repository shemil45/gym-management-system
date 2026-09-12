import 'server-only'

import { cache } from 'react'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getCurrentAuthResolution } from '@/lib/auth/gym-context'
import type { InsertTables, QueryResult, Tables } from '@/lib/types'

/**
 * Impersonation sandbox ledger.
 *
 * Every row a platform operator creates while impersonating a tenant is
 * written here, so it can be removed when the session ends and so the tenant
 * can be shown - and stopped from touching - support-created data in the
 * meantime. See docs/superpowers/specs/2026-09-12-impersonation-sandbox-design.md.
 *
 * Service-role throughout: the ledger is platform data that tenant RLS only
 * exposes read-only.
 */

export type ImpersonationEntityType = Tables<'platform_impersonation_writes'>['entity_type']

export const IMPERSONATION_READONLY_MESSAGE = 'Existing records are read-only while impersonating.'
export const IMPERSONATION_PAYMENT_MESSAGE =
    'While impersonating you can only record payments for members created in this session.'
export const DEMO_READONLY_MESSAGE =
    'This record was created by GMS Cloud support for a demo and is read-only. It will be removed automatically when their session ends.'

const ENTITY_TYPES: ImpersonationEntityType[] = [
    'auth_user',
    'profile',
    'member',
    'admin',
    'payment',
    'expense',
    'storage_object',
]

type LedgerRow = Pick<Tables<'platform_impersonation_writes'>, 'id' | 'gym_id' | 'entity_type' | 'entity_id'>

/** The caller's active impersonation session, if any. Request-cached. */
export const getActiveImpersonation = cache(async (): Promise<{ sessionId: string; gymId: string } | null> => {
    const { activeImpersonation } = await getCurrentAuthResolution()
    if (!activeImpersonation) return null
    return { sessionId: activeImpersonation.id, gymId: activeImpersonation.gym_id }
})

export async function recordImpersonationWrite(
    sessionId: string,
    gymId: string,
    entityType: ImpersonationEntityType,
    entityId: string,
): Promise<void> {
    const payload: InsertTables<'platform_impersonation_writes'> = {
        session_id: sessionId,
        gym_id: gymId,
        entity_type: entityType,
        entity_id: entityId,
    }
    const { error } = await getSupabaseAdmin().from('platform_impersonation_writes').insert(payload as never)
    if (error) throw new Error(`Could not record impersonation write: ${error.message}`)
}

export async function isImpersonationOwned(
    gymId: string,
    entityType: ImpersonationEntityType,
    entityId: string,
): Promise<{ sessionId: string } | null> {
    const result = await getSupabaseAdmin()
        .from('platform_impersonation_writes')
        .select('session_id')
        .eq('gym_id', gymId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .is('reverted_at', null)
        .limit(1)
        .maybeSingle()
    const { data } = result as unknown as QueryResult<{ session_id: string } | null>
    return data ? { sessionId: data.session_id } : null
}

/** Ids of every un-reverted row of one type for a gym. One query per list page. */
export async function getImpersonationOwnedIds(
    gymId: string,
    entityType: ImpersonationEntityType,
): Promise<Set<string>> {
    const result = await getSupabaseAdmin()
        .from('platform_impersonation_writes')
        .select('entity_id')
        .eq('gym_id', gymId)
        .eq('entity_type', entityType)
        .is('reverted_at', null)
    const { data } = result as unknown as QueryResult<{ entity_id: string }[] | null>
    return new Set((data ?? []).map((row) => row.entity_id))
}

/** The operator deleted their own demo row themselves; nothing left to revert. */
export async function releaseImpersonationWrite(
    gymId: string,
    entityType: ImpersonationEntityType,
    entityId: string,
): Promise<void> {
    await getSupabaseAdmin()
        .from('platform_impersonation_writes')
        .update({ reverted_at: new Date().toISOString() } as never)
        .eq('gym_id', gymId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .is('reverted_at', null)
}

function emptyCounts(): Record<ImpersonationEntityType, number> {
    return { auth_user: 0, profile: 0, member: 0, admin: 0, payment: 0, expense: 0, storage_object: 0 }
}

/**
 * Deletes everything a session created, in dependency order, and closes the
 * session. Idempotent: rows already reverted are skipped, rows the tenant
 * cannot have touched (they are read-only to the tenant) are simply gone.
 *
 * Stops at the first failure and records it on the session; the next sweep
 * or a manual retry resumes from whatever is still un-reverted.
 */
export async function revertImpersonationSession(
    sessionId: string,
): Promise<{ ok: true; counts: Record<ImpersonationEntityType, number> } | { ok: false; error: string }> {
    const db = getSupabaseAdmin()
    const counts = emptyCounts()

    const sessionResult = await db
        .from('platform_impersonation_sessions')
        .select('id, gym_id, ended_at, reverted_at')
        .eq('id', sessionId)
        .maybeSingle()
    const { data: session } = sessionResult as unknown as QueryResult<
        Pick<Tables<'platform_impersonation_sessions'>, 'id' | 'gym_id' | 'ended_at' | 'reverted_at'> | null
    >
    if (!session) return { ok: false, error: 'Impersonation session not found.' }
    if (session.reverted_at) return { ok: true, counts }

    const rowsResult = await db
        .from('platform_impersonation_writes')
        .select('id, gym_id, entity_type, entity_id')
        .eq('session_id', sessionId)
        .is('reverted_at', null)
    const { data: rows, error: rowsError } = rowsResult as unknown as QueryResult<LedgerRow[] | null>
    if (rowsError) return await fail(sessionId, `Could not load ledger: ${(rowsError as { message: string }).message}`)

    const byType = (type: ImpersonationEntityType) => (rows ?? []).filter((row) => row.entity_type === type)
    const now = () => new Date().toISOString()

    async function markReverted(ids: string[]) {
        if (ids.length === 0) return
        const { error } = await db
            .from('platform_impersonation_writes')
            .update({ reverted_at: now() } as never)
            .in('id', ids)
        if (error) throw new Error(`Could not mark ledger rows reverted: ${error.message}`)
    }

    try {
        // 1. Payments: ledgered ones, plus any pointing at a ledgered member.
        const memberIds = byType('member').map((row) => row.entity_id)
        const paymentRows = byType('payment')
        if (paymentRows.length > 0) {
            const { error } = await db.from('payments').delete().in('id', paymentRows.map((row) => row.entity_id))
            if (error) throw new Error(`payments: ${error.message}`)
        }
        if (memberIds.length > 0) {
            const { error } = await db.from('payments').delete().in('member_id', memberIds)
            if (error) throw new Error(`member payments: ${error.message}`)
        }
        counts.payment = paymentRows.length
        await markReverted(paymentRows.map((row) => row.id))

        // 2. Members
        if (memberIds.length > 0) {
            const { error } = await db.from('members').delete().in('id', memberIds)
            if (error) throw new Error(`members: ${error.message}`)
        }
        counts.member = memberIds.length
        await markReverted(byType('member').map((row) => row.id))

        // 3. Admin memberships (entity_id is the user_id)
        const adminRows = byType('admin')
        for (const row of adminRows) {
            const { error } = await db.from('admins').delete().eq('user_id', row.entity_id).eq('gym_id', row.gym_id)
            if (error) throw new Error(`admins: ${error.message}`)
        }
        counts.admin = adminRows.length
        await markReverted(adminRows.map((row) => row.id))

        // 4. Profiles
        const profileRows = byType('profile')
        if (profileRows.length > 0) {
            const { error } = await db.from('profiles').delete().in('id', profileRows.map((row) => row.entity_id))
            if (error) throw new Error(`profiles: ${error.message}`)
        }
        counts.profile = profileRows.length
        await markReverted(profileRows.map((row) => row.id))

        // 5. Auth users the session created (never reused ones)
        const authRows = byType('auth_user')
        for (const row of authRows) {
            const { error } = await db.auth.admin.deleteUser(row.entity_id)
            // "User not found" means it is already gone - fine.
            if (error && !/not found/i.test(error.message)) throw new Error(`auth user: ${error.message}`)
        }
        counts.auth_user = authRows.length
        await markReverted(authRows.map((row) => row.id))

        // 6. Expenses
        const expenseRows = byType('expense')
        if (expenseRows.length > 0) {
            const { error } = await db.from('expenses').delete().in('id', expenseRows.map((row) => row.entity_id))
            if (error) throw new Error(`expenses: ${error.message}`)
        }
        counts.expense = expenseRows.length
        await markReverted(expenseRows.map((row) => row.id))

        // 7. Storage objects
        const storageRows = byType('storage_object')
        if (storageRows.length > 0) {
            const { error } = await db.storage.from('avatars').remove(storageRows.map((row) => row.entity_id))
            if (error) throw new Error(`storage: ${error.message}`)
        }
        counts.storage_object = storageRows.length
        await markReverted(storageRows.map((row) => row.id))
    } catch (err: unknown) {
        return await fail(sessionId, err instanceof Error ? err.message : 'Revert failed')
    }

    const { error: closeError } = await db
        .from('platform_impersonation_sessions')
        .update({
            ended_at: session.ended_at ?? now(),
            reverted_at: now(),
            revert_error: null,
        } as never)
        .eq('id', sessionId)
    if (closeError) return await fail(sessionId, `Could not close session: ${closeError.message}`)

    // Direct insert rather than recordAudit(): this also runs from cron, where
    // there is no request and no platform session.
    await db.from('platform_audit_logs').insert({
        action: 'impersonation.reverted',
        entity_type: 'impersonation_session',
        entity_id: sessionId,
        gym_id: session.gym_id,
        metadata: { counts },
    } as never)

    return { ok: true, counts }
}

async function fail(sessionId: string, error: string): Promise<{ ok: false; error: string }> {
    await getSupabaseAdmin()
        .from('platform_impersonation_sessions')
        .update({ revert_error: error } as never)
        .eq('id', sessionId)
    console.error('[impersonation] revert failed', { sessionId, error })
    return { ok: false, error }
}

/**
 * Reverts every session that has timed out or was ended without a successful
 * revert. Returns how many sessions it processed. Safe to call on every
 * request: when nothing is pending it is one indexed query.
 */
export async function sweepExpiredImpersonations(): Promise<number> {
    const db = getSupabaseAdmin()
    const nowIso = new Date().toISOString()
    const result = await db
        .from('platform_impersonation_sessions')
        .select('id')
        .is('reverted_at', null)
        .or(`expires_at.lt.${nowIso},ended_at.not.is.null`)
        .limit(20)
    const { data } = result as unknown as QueryResult<{ id: string }[] | null>
    let processed = 0
    for (const session of data ?? []) {
        await revertImpersonationSession(session.id)
        processed += 1
    }
    return processed
}

export { ENTITY_TYPES as IMPERSONATION_ENTITY_TYPES }
