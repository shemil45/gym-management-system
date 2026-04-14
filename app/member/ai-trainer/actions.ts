'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

type FitnessProfileRow = {
    goal: string | null
    experience: string | null
    height_cm: number | null
    weight_kg: number | null
    dietary_preference: string | null
    injuries: string | null
}

type MemberContextRow = {
    full_name: string
    status: string
    membership_expiry_date: string | null
}

type ChatHistoryRow = {
    role: 'user' | 'model'
    content: string
}

export async function sendChatMessage(message: string) {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.member || !viewer.gym) return { error: 'Not authenticated' }

    const db = getSupabaseAdmin()

    // Get context
    const [{ data: profile }, { data: member }, { data: history }] = await Promise.all([
        db.from('fitness_profiles').select('*').eq('user_id', viewer.user.id).single(),
        db.from('members').select('full_name, status, membership_expiry_date').eq('id', viewer.member.id).eq('gym_id', viewer.gym.id).single(),
        db.from('chat_messages').select('role, content').eq('user_id', viewer.user.id).order('created_at', { ascending: true }).limit(20),
    ])

    const p = profile as FitnessProfileRow | null
    const m = member as MemberContextRow | null

    const systemInstruction = `You are an expert personal AI trainer and fitness coach for ${m?.full_name || 'this member'} at a gym.

Member profile:
- Goal: ${p?.goal || 'general fitness'}
- Experience: ${p?.experience || 'beginner'}
- Height: ${p?.height_cm ?? 'unknown'} cm, Weight: ${p?.weight_kg ?? 'unknown'} kg
- Dietary preference: ${p?.dietary_preference || 'no restriction'}
- Injuries: ${p?.injuries || 'none'}
- Membership status: ${m?.status || 'inactive'}

Be motivating, concise, and specific. Give practical advice. If asked about exercises, provide proper form cues. Keep responses under 250 words unless more detail is specifically requested.`

    // Build conversation history for Gemini
    const historyItems = ((history as ChatHistoryRow[] | null) || []).map((h) => ({
        role: h.role as 'user' | 'model',
        parts: [{ text: h.content }],
    }))

    // Save user message first
    await db.from('chat_messages').insert({ user_id: viewer.user.id, role: 'user', content: message })

    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction })
        const chat = model.startChat({ history: historyItems })
        const result = await chat.sendMessage(message)
        const reply = result.response.text()

        // Save assistant reply
        await db.from('chat_messages').insert({ user_id: viewer.user.id, role: 'model', content: reply })

        revalidatePath('/member/ai-trainer')
        return { success: true, reply }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        return { error: 'AI response failed: ' + message }
    }
}

export async function getChatHistory() {
    const viewer = await getCurrentGymContext()
    if (!viewer.user) return []

    const { data } = await getSupabaseAdmin()
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('user_id', viewer.user.id)
        .order('created_at', { ascending: true })
        .limit(50)

    return data ?? []
}

export async function clearChatHistory() {
    const viewer = await getCurrentGymContext()
    if (!viewer.user) return { error: 'Not authenticated' }

    await getSupabaseAdmin().from('chat_messages').delete().eq('user_id', viewer.user.id)
    revalidatePath('/member/ai-trainer')
    return { success: true }
}
