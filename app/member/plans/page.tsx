import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult } from '@/lib/types'
import PlansClient from './PlansClient'
import { getCurrentMemberContext } from '@/lib/auth/member-server'

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
    const { user, member } = await getCurrentMemberContext()

    if (!user) redirect('/login')

    // Get all active plans
    const plansResult = await supabase
        .from('membership_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true })
    const { data: plans } = plansResult as unknown as QueryResult<ActivePlan[] | null>

    const memberPlanData = member as MemberPlanData | null

    return (
        <PlansClient
            plans={plans || []}
            currentPlanId={memberPlanData?.membership_plan_id ?? null}
            membershipExpiry={memberPlanData?.membership_expiry_date ?? null}
            memberStatus={memberPlanData?.status ?? 'inactive'}
            referralCoinsBalance={memberPlanData?.referral_coins_balance ?? 0}
        />
    )
}
