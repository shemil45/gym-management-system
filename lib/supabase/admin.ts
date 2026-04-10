import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

export function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
    }

    return createAdminClient<Database>(supabaseUrl, serviceRoleKey)
}
