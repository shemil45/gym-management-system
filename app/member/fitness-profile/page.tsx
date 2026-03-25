import { redirect } from 'next/navigation'
import { getFitnessProfile } from './actions'
import FitnessProfileForm from './FitnessProfileForm'

export default async function FitnessProfilePage() {
    const profile = await getFitnessProfile()

    return (
        <div className="max-w-2xl mx-auto lg:max-w-none space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Fitness Profile</h1>
                <p className="text-sm text-gray-500 mt-1">This helps AI generate personalised workout and nutrition plans for you.</p>
            </div>
            <FitnessProfileForm existing={profile} />
        </div>
    )
}
