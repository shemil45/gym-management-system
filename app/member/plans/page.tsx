import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'
import PlansClient from './PlansClient'

type MemberPlanData = {
    id: string
    membership_plan_id: string | null
    membership_expiry_date: string | null
    status: string
    referral_coins_balance: number
}

type ActivePlan = {
    id: string
    name: string
    price: number
    duration_days: number
    description: string | null
    features: string[] | null
    is_active: boolean
}

export default async function PlansPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    // Get current member record
    const memberResult = await supabase
        .from('members')
        .select('id, membership_plan_id, membership_expiry_date, status, referral_coins_balance')
        .eq('user_id', user.id)
        .single()
    const { data: member } = memberResult as unknown as QueryResult<MemberPlanData | null>

    // Get all active plans
    const plansResult = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })
    const { data: plans } = plansResult as unknown as QueryResult<ActivePlan[] | null>

    return (
        <PlansClient
            plans={plans || []}
            currentPlanId={member?.membership_plan_id ?? null}
            membershipExpiry={member?.membership_expiry_date ?? null}
            memberStatus={member?.status ?? 'inactive'}
            referralCoinsBalance={member?.referral_coins_balance ?? 0}
        />
    )
}
