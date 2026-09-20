import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/admin'

/**
 * Members who currently hold a live membership: not frozen, not inactive,
 * and not past their expiry. This is `effectiveStatus` (members-aggregate)
 * reduced to a single `count: exact, head: true` query — no rows come back —
 * for callers that need the number and nothing else. The Members report
 * itself still walks the full roster, because it needs the rows.
 *
 * Null when the count fails, so a caller can show "—" rather than break.
 */
export async function countActiveMembers(gymId: string, today: string): Promise<number | null> {
    const result = await getSupabaseAdmin()
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('gym_id', gymId)
        .in('status', ['active', 'expired'])
        .gte('membership_expiry_date', today)
    return result.error ? null : result.count ?? null
}
