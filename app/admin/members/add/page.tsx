import { createClient } from '@/lib/supabase/server'
import AddMemberForm from '@/components/forms/AddMemberForm'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { gymHasFeature } from '@/lib/gym/features'
import { getReferralLead } from '@/lib/referrals/server'
import type { QueryResult, Tables } from '@/lib/types'

type GymFeeSettings = Pick<Tables<'gyms'>, 'default_admission_fee' | 'allow_admission_fee_waiver' | 'allow_custom_membership_start_date'>

type Props = { searchParams: Promise<{ lead?: string }> }

export default async function AddMemberPage({ searchParams }: Props) {
    const supabase = await createClient()
    const { gym } = await getCurrentAdminContext()
    const { lead: leadParam } = await searchParams

    const { data: plans } = await supabase
        .from('membership_plans')
        .select('id, name, duration_days, price')
        .order('price')

    let gymSettings = { defaultAdmissionFee: 0, allowAdmissionFeeWaiver: true, allowCustomStartDate: false }
    let referralsEnabled = false
    if (gym) {
        const [gymResult, referralsOn] = await Promise.all([
            supabase
                .from('gyms')
                .select('default_admission_fee, allow_admission_fee_waiver, allow_custom_membership_start_date')
                .eq('id', gym.id)
                .single(),
            gymHasFeature(gym.id, 'referrals'),
        ])
        referralsEnabled = referralsOn
        const { data: gymRow } = gymResult as unknown as QueryResult<GymFeeSettings | null>
        if (gymRow) {
            gymSettings = {
                defaultAdmissionFee: gymRow.default_admission_fee,
                allowAdmissionFeeWaiver: gymRow.allow_admission_fee_waiver,
                allowCustomStartDate: gymRow.allow_custom_membership_start_date,
            }
        }
    }

    // Completing a referral lead: the lead is looked up within this gym only,
    // and only a pending one prefills the form. Anything else falls through
    // to a plain registration with a notice, never a silent conversion.
    let lead: React.ComponentProps<typeof AddMemberForm>['lead'] = null
    if (gym && referralsEnabled && leadParam) {
        const row = await getReferralLead(gym.id, leadParam)
        if (row && row.source === 'link') {
            lead = {
                id: row.id,
                status: row.status,
                fullName: row.referredName,
                phone: row.referredPhone,
                email: row.referredEmail ?? '',
                referrerName: row.referrerName,
                expiresAt: row.expiresAt,
            }
        } else {
            lead = { id: leadParam, status: 'missing', fullName: '', phone: '', email: '', referrerName: '', expiresAt: null }
        }
    }

    return <AddMemberForm plans={plans || []} gymSettings={gymSettings} referralsEnabled={referralsEnabled} lead={lead} />
}
