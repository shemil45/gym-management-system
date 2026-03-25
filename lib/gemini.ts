import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)

export const geminiFlash = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

export async function generateJSON<T>(prompt: string): Promise<T> {
    const result = await geminiFlash.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7,
        },
    })
    const text = result.response.text()
    return JSON.parse(text) as T
}

export async function generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const model = systemInstruction
        ? genAI.getGenerativeModel({ model: 'gemini-1.5-flash', systemInstruction })
        : geminiFlash

    const result = await model.generateContent(prompt)
    return result.response.text()
}
