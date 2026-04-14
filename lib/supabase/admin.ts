import { createClient as createAdminClient } from '@supabase/supabase-js'

export function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase admin client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
    }

    return createAdminClient(supabaseUrl, serviceRoleKey)
}

export async function findAuthUserByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
        return null
    }

    const admin = getSupabaseAdmin()
    let page = 1

    while (true) {
        const { data, error } = await admin.auth.admin.listUsers({
            page,
            perPage: 200,
        })

        if (error) {
            throw error
        }

        const users = data.users ?? []
        const match = users.find((user) => user.email?.toLowerCase() === normalizedEmail) ?? null

        if (match || users.length < 200) {
            return match
        }

        page += 1
    }
}
