import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')?.trim().toUpperCase()

    if (!code) {
        return NextResponse.json({ valid: false, name: null })
    }

    // Use admin client to bypass RLS — we only expose name, not sensitive data
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data } = await supabase
        .from('members')
        .select('full_name')
        .eq('member_id', code)
        .single() as { data: { full_name: string } | null, error: unknown }

    if (data) {
        return NextResponse.json({ valid: true, name: data.full_name })
    }

    return NextResponse.json({ valid: false, name: null })
}
