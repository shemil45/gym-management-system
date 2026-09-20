'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { Tables } from '@/lib/types'

export type GymNotificationItem = Pick<Tables<'gym_notifications'>, 'id' | 'type' | 'title' | 'body' | 'href' | 'read_at' | 'created_at'>

/**
 * In-app notices for the gym's staff (the header bell). All reads and writes
 * are scoped to the viewer's gym from context; ids from the client only
 * narrow within it.
 */

async function staffGym() {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) return null
    return viewer.gym.id
}

export async function fetchGymNotifications(limit = 20): Promise<{ items: GymNotificationItem[]; unread: number }> {
    const gymId = await staffGym()
    if (!gymId) return { items: [], unread: 0 }

    const db = getSupabaseAdmin()
    const [listResult, unreadResult] = await Promise.all([
        db
            .from('gym_notifications')
            .select('id, type, title, body, href, read_at, created_at')
            .eq('gym_id', gymId)
            .order('created_at', { ascending: false })
            .limit(limit),
        db
            .from('gym_notifications')
            .select('id', { count: 'exact', head: true })
            .eq('gym_id', gymId)
            .is('read_at', null),
    ])
    return {
        items: (listResult.data ?? []) as GymNotificationItem[],
        unread: unreadResult.count ?? 0,
    }
}

export async function markGymNotificationRead(id: string): Promise<void> {
    const gymId = await staffGym()
    if (!gymId || typeof id !== 'string') return
    await getSupabaseAdmin()
        .from('gym_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('gym_id', gymId)
        .eq('id', id)
        .is('read_at', null)
}

export async function markAllGymNotificationsRead(): Promise<void> {
    const gymId = await staffGym()
    if (!gymId) return
    await getSupabaseAdmin()
        .from('gym_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('gym_id', gymId)
        .is('read_at', null)
    revalidatePath('/admin', 'layout')
}

/** Used by the leads page when it is opened from a notification link. */
export async function markGymNotificationsReadForReferral(referralId: string): Promise<void> {
    const gymId = await staffGym()
    if (!gymId || typeof referralId !== 'string') return
    await getSupabaseAdmin()
        .from('gym_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('gym_id', gymId)
        .eq('referral_id', referralId)
        .is('read_at', null)
}
