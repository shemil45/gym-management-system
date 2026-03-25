import { getLatestNutritionPlan } from './actions'
import { hasFitnessProfile } from '../workout/actions'
import NutritionClient from './NutritionClient'

export default async function NutritionPage() {
    const hasProfile = await hasFitnessProfile()
    const latestPlan = hasProfile ? await getLatestNutritionPlan() : null

    return (
        <NutritionClient
            hasProfile={hasProfile}
            savedPlan={latestPlan ? (latestPlan as any).plan_data : null}
            savedVersion={latestPlan ? (latestPlan as any).version : null}
        />
    )
}
