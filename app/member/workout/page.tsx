import { getLatestWorkoutPlan, hasFitnessProfile } from './actions'
import WorkoutClient from './WorkoutClient'

export default async function WorkoutPage() {
    const hasProfile = await hasFitnessProfile()
    const latestPlan = hasProfile ? await getLatestWorkoutPlan() : null

    return (
        <WorkoutClient
            hasProfile={hasProfile}
            savedPlan={latestPlan?.plan_data ?? null}
            savedVersion={latestPlan?.version ?? null}
        />
    )
}
