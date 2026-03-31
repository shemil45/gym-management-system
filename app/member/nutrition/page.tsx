import { getLatestNutritionPlan } from './actions'
import { hasFitnessProfile } from '../workout/actions'
import NutritionClient from './NutritionClient'

type SavedNutritionPlan = {
    plan_data: unknown
    version: number
}

export default async function NutritionPage() {
    const hasProfile = await hasFitnessProfile()
    const latestPlan = hasProfile ? await getLatestNutritionPlan() : null
    const savedPlan = latestPlan as SavedNutritionPlan | null

    return (
        <NutritionClient
            hasProfile={hasProfile}
            savedPlan={savedPlan?.plan_data ?? null}
            savedVersion={savedPlan?.version ?? null}
        />
    )
}
