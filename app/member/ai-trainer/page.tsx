import { getChatHistory } from './actions'
import { hasFitnessProfile } from '../workout/actions'
import AITrainerClient from './AITrainerClient'

type ChatMessage = {
    role: 'user' | 'model'
    content: string
    created_at?: string
}

export default async function AITrainerPage() {
    const hasProfile = await hasFitnessProfile()
    const history = await getChatHistory()

    return <AITrainerClient hasProfile={hasProfile} initialHistory={history as ChatMessage[]} />
}
