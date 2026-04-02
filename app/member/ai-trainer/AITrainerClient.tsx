'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Send, MessageSquare, Trash2, Bot, User } from 'lucide-react'
import { sendChatMessage, clearChatHistory } from './actions'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'

interface Message {
    role: 'user' | 'model'
    content: string
    created_at?: string
}

interface Props {
    hasProfile: boolean
    initialHistory: Message[]
}

const SUGGESTIONS = [
    'What should I eat before the gym?',
    'How many calories should I consume to lose weight?',
    'Can you suggest a good chest workout?',
    'How do I improve my running endurance?',
]

// Lightweight markdown → HTML converter for chat bubbles
function renderMarkdown(text: string): string {
    return text
        // Bold: **text** or __text__
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic: *text* or _text_ (not preceded by another *)
        .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
        // Bullet lines: lines starting with * or - or •
        .replace(/^[\*\-•] (.+)/gm, '<li class="ml-4 list-disc">$1</li>')
        // Wrap consecutive <li> blocks in <ul>
        .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="space-y-1 my-1">${match}</ul>`)
        // Headings: ### ## #
        .replace(/^### (.+)$/gm, '<p class="font-bold text-gray-900 mt-2">$1</p>')
        .replace(/^## (.+)$/gm, '<p class="font-bold text-gray-900 mt-2">$1</p>')
        .replace(/^# (.+)$/gm, '<p class="font-bold text-gray-900 mt-2">$1</p>')
        // Double newlines → paragraph break
        .replace(/\n\n/g, '<br/><br/>')
        // Single newlines → line break
        .replace(/\n/g, '<br/>')
}

export default function AITrainerClient({ hasProfile, initialHistory }: Props) {
    const { confirm, dialog } = useConfirmDialog()
    const [messages, setMessages] = useState<Message[]>(initialHistory)
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async (text?: string) => {
        const msg = text || input.trim()
        if (!msg || loading) return

        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: msg }])
        setLoading(true)

        const result = await sendChatMessage(msg)
        setLoading(false)

        if (result?.error) {
            toast.error(result.error)
            setMessages(prev => prev.slice(0, -1))
        } else {
            setMessages(prev => [...prev, { role: 'model', content: result.reply! }])
        }
    }

    const handleClear = async () => {
        const confirmed = await confirm({
            title: 'Clear chat history?',
            description: 'This will remove your current AI trainer conversation.',
            confirmLabel: 'Clear',
            tone: 'danger',
        })
        if (!confirmed) return
        await clearChatHistory()
        setMessages([])
        toast.success('Chat cleared')
    }

    if (!hasProfile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg">
                    <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Setup Required</h1>
                    <p className="text-sm text-gray-500 mt-1 max-w-xs">Complete your fitness profile so AI knows your goals.</p>
                </div>
                <Link href="/member/fitness-profile" className="inline-flex items-center gap-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 transition-colors">
                    Complete Fitness Profile →
                </Link>
            </div>
        )
    }

    return (
        <>
            {dialog}
            <div className="flex flex-col h-[calc(100vh-7rem)]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900">AI Personal Trainer</h1>
                        <p className="text-xs text-gray-400">Powered by Gemini · Context-aware</p>
                    </div>
                </div>
                {messages.length > 0 && (
                    <button onClick={handleClear} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 className="h-3.5 w-3.5" /> Clear
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 [&::-webkit-scrollbar]:hidden">
                {messages.length === 0 && (
                    <div className="space-y-4">
                        <div className="text-center py-6">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 mx-auto mb-3">
                                <Bot className="h-7 w-7 text-white" />
                            </div>
                            <p className="text-sm font-semibold text-gray-800">Hey! I&apos;m your AI trainer 👋</p>
                            <p className="text-xs text-gray-400 mt-1">I know your fitness goals and current plan. Ask me anything!</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {SUGGESTIONS.map(s => (
                                <button key={s} onClick={() => sendMessage(s)}
                                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-xs text-gray-600 hover:border-violet-300 hover:bg-violet-50 transition-all">
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.role === 'model' ? 'bg-gradient-to-br from-violet-500 to-purple-700' : 'bg-gray-800'}`}>
                            {m.role === 'model' ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />}
                        </div>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            m.role === 'model'
                                ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
                                : 'bg-violet-500 text-white rounded-tr-sm whitespace-pre-wrap'
                        }`}>
                            {m.role === 'model'
                                ? <span dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                                : m.content
                            }
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-700">
                            <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="rounded-2xl rounded-tl-sm bg-white border border-gray-200 px-4 py-3">
                            <div className="flex gap-1 items-center h-4">
                                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                                <span className="h-2 w-2 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                        placeholder="Ask your trainer anything…"
                        disabled={loading}
                        className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-50"
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={loading || !input.trim()}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-40 transition-colors"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </button>
                </div>
            </div>
            </div>
        </>
    )
}
