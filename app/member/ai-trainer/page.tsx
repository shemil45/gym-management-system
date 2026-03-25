import { getChatHistory } from './actions'
import { hasFitnessProfile } from '../workout/actions'
import AITrainerClient from './AITrainerClient'

export default async function AITrainerPage() {
    const hasProfile = await hasFitnessProfile()
    const history = await getChatHistory()

    return <AITrainerClient hasProfile={hasProfile} initialHistory={history as any[]} />
}
