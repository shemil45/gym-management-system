import { getLatestWorkoutPlan, hasFitnessProfile } from './actions'
import WorkoutClient from './WorkoutClient'

type SavedWorkoutPlan = {
    plan_data: unknown
    version: number
}

export default async function WorkoutPage() {
    const hasProfile = await hasFitnessProfile()
    const latestPlan = hasProfile ? await getLatestWorkoutPlan() : null
    const savedPlan = latestPlan as SavedWorkoutPlan | null

    return (
        <WorkoutClient
            hasProfile={hasProfile}
            savedPlan={savedPlan?.plan_data ?? null}
            savedVersion={savedPlan?.version ?? null}
        />
    )
}
