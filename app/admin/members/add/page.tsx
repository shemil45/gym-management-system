import { createClient } from '@/lib/supabase/server'
import AddMemberForm from '@/components/forms/AddMemberForm'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import type { QueryResult, Tables } from '@/lib/types'

type GymFeeSettings = Pick<Tables<'gyms'>, 'default_admission_fee' | 'allow_admission_fee_waiver' | 'allow_custom_membership_start_date'>

export default async function AddMemberPage() {
    const supabase = await createClient()
    const { gym } = await getCurrentAdminContext()

    const { data: plans } = await supabase
        .from('membership_plans')
        .select('id, name, duration_days, price')
        .order('price')

    let gymSettings = { defaultAdmissionFee: 0, allowAdmissionFeeWaiver: true, allowCustomStartDate: false }
    if (gym) {
        const gymResult = await supabase
            .from('gyms')
            .select('default_admission_fee, allow_admission_fee_waiver, allow_custom_membership_start_date')
            .eq('id', gym.id)
            .single()
        const { data: gymRow } = gymResult as unknown as QueryResult<GymFeeSettings | null>
        if (gymRow) {
            gymSettings = {
                defaultAdmissionFee: gymRow.default_admission_fee,
                allowAdmissionFeeWaiver: gymRow.allow_admission_fee_waiver,
                allowCustomStartDate: gymRow.allow_custom_membership_start_date,
            }
        }
    }

    return <AddMemberForm plans={plans || []} gymSettings={gymSettings} />
}
