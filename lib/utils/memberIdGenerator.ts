import { createClient } from '@/lib/supabase/server'

/**
 * Generate next member ID in sequence (GYM001, GYM002, etc.)
 */
export async function generateMemberId(): Promise<string> {
    const supabase = await createClient()

    // Get the latest member ID
    const { data: latestMember } = await supabase
        .from('members')
        .select('member_id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (!latestMember) {
        // First member
        return 'GYM001'
    }

    // Extract number from member_id (e.g., "GYM001" -> 1)
    const lastNumber = parseInt(latestMember.member_id.replace('GYM', ''), 10)
    const nextNumber = lastNumber + 1

    // Pad with zeros (e.g., 1 -> "001")
    return `GYM${nextNumber.toString().padStart(3, '0')}`
}

/**
 * Validate member ID format
 */
export function isValidMemberId(memberId: string): boolean {
    return /^GYM\d{3,}$/.test(memberId)
}

/**
 * Generate member ID client-side (for preview, not for actual use)
 */
export function generateMemberIdPreview(lastId: string | null): string {
    if (!lastId) return 'GYM001'

    const lastNumber = parseInt(lastId.replace('GYM', ''), 10)
    const nextNumber = lastNumber + 1

    return `GYM${nextNumber.toString().padStart(3, '0')}`
}
