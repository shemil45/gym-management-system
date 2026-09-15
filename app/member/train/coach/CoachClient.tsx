'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { IconArrowUp, IconMessageCircle, IconTrash } from '@tabler/icons-react'
import { cn } from '@/lib/utils/cn'
import { Screen } from '@/components/member/ui'
import { clearChatHistory, sendChatMessage } from '@/app/member/ai-trainer/actions'

/*
  Coach chat.

  One thread per member, persisted server-side so it survives reloads and the
  coach can remember what was said. The composer is pinned above the bottom
  nav (same slot the checkout bar uses) so it stays reachable while the thread
  scrolls behind it.

  Optimistic send: the member's bubble appears immediately, a typing row holds
  the coach's place, and a failed send marks the bubble instead of dropping it.

  The send is plain state, not a transition: React 19 entangles navigations
  with an in-flight async transition, which would freeze the bottom nav until
  Gemini answered.
*/

export type CoachMessage = {
    id: string
    role: 'user' | 'model'
    content: string
    failed?: boolean
}

const SUGGESTIONS = [
    'How do I keep my back safe on deadlifts?',
    'What can I swap for barbell squats?',
    'What should I eat after training?',
    'Is it fine to train on sore legs?',
]

export default function CoachClient({
    firstName,
    hasProfile,
    initial,
}: {
    firstName: string
    hasProfile: boolean
    initial: CoachMessage[]
}) {
    const [messages, setMessages] = useState<CoachMessage[]>(initial)
    const [draft, setDraft] = useState('')
    const [sending, setSending] = useState(false)
    const [clearing, setClearing] = useState(false)
    const endRef = useRef<HTMLDivElement>(null)
    const nextId = useRef(0)

    useEffect(() => {
        endRef.current?.scrollIntoView({ block: 'end' })
    }, [messages.length, sending])

    function send(text: string) {
        const content = text.trim()
        if (!content || sending) return
        const id = `u-${nextId.current++}`
        setMessages((prev) => [...prev, { id, role: 'user', content }])
        setDraft('')
        setSending(true)

        void (async () => {
            try {
                const result = await sendChatMessage(content)
                if ('error' in result) {
                    setMessages((prev) =>
                        prev.map((m) => (m.id === id ? { ...m, failed: true } : m)),
                    )
                    toast.error('The coach did not answer', { description: result.error })
                    return
                }
                setMessages((prev) => [
                    ...prev,
                    { id: `m-${nextId.current++}`, role: 'model', content: result.reply ?? '' },
                ])
            } catch (error) {
                setMessages((prev) =>
                    prev.map((m) => (m.id === id ? { ...m, failed: true } : m)),
                )
                toast.error('Could not reach the coach', {
                    description: error instanceof Error ? error.message : 'Please try again.',
                })
            } finally {
                setSending(false)
            }
        })()
    }

    async function clear() {
        if (clearing) return
        setClearing(true)
        try {
            const result = await clearChatHistory()
            if ('error' in result) {
                toast.error('Could not clear the chat', { description: result.error })
                return
            }
            setMessages([])
        } finally {
            setClearing(false)
        }
    }

    const empty = messages.length === 0

    return (
        <Screen title="Coach" className="pb-24 lg:pb-28">
            {/* Header row: who this is and the one destructive control. */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[13px] text-[var(--m-ink-3)]">
                    Answers use your training profile
                    {hasProfile ? '' : ', which you have not filled in yet'}.
                    {hasProfile ? null : (
                        <>
                            {' '}
                            <Link
                                href="/member/train/profile"
                                className="font-medium text-[var(--m-ink)] underline underline-offset-2"
                            >
                                Fill it in
                            </Link>
                        </>
                    )}
                </p>
                {empty ? null : (
                    <button
                        type="button"
                        onClick={clear}
                        disabled={clearing}
                        aria-label="Clear conversation"
                        className="m-tap flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--m-ink-3)] disabled:opacity-45"
                    >
                        <IconTrash size={18} stroke={1.8} />
                    </button>
                )}
            </div>

            {empty ? (
                <div className="flex flex-col items-center px-4 pt-8 text-center">
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[var(--m-surface-2)] text-[var(--m-ink-3)]">
                        <IconMessageCircle size={26} stroke={1.6} />
                    </span>
                    <p className="text-[15.5px] font-semibold tracking-[-0.01em]">
                        Hi {firstName}, what are we working on?
                    </p>
                    <p className="mt-1.5 max-w-[34ch] text-[13.5px] leading-relaxed text-[var(--m-ink-2)]">
                        Ask about form, exercise swaps, rest days or what to eat. Short questions
                        get the best answers.
                    </p>
                    <div className="mt-6 flex w-full flex-col gap-2">
                        {SUGGESTIONS.map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => send(s)}
                                className="m-tap m-card min-h-11 px-4 py-3 text-left text-[13.5px] font-medium text-[var(--m-ink-2)]"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <ol className="flex flex-col gap-2.5">
                    {messages.map((m) => (
                        <li
                            key={m.id}
                            className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                        >
                            <div
                                className={cn(
                                    'max-w-[85%] whitespace-pre-wrap rounded-[18px] px-4 py-2.5 text-[14.5px] leading-relaxed',
                                    m.role === 'user'
                                        ? 'rounded-br-[6px] bg-[var(--m-ink)] text-[var(--m-bg)]'
                                        : 'm-card rounded-bl-[6px]',
                                    m.failed && 'opacity-60',
                                )}
                            >
                                {m.content}
                                {m.failed ? (
                                    <span className="mt-1 block text-[12px] opacity-80">
                                        Not sent
                                    </span>
                                ) : null}
                            </div>
                        </li>
                    ))}
                    {sending ? (
                        <li className="flex justify-start" aria-live="polite">
                            <div className="m-card flex h-10 items-center gap-1 rounded-[18px] rounded-bl-[6px] px-4">
                                <Dot delay={0} />
                                <Dot delay={150} />
                                <Dot delay={300} />
                            </div>
                        </li>
                    ) : null}
                </ol>
            )}
            <div ref={endRef} />

            {/* Composer, pinned. */}
            <form
                className="m-confirmbar z-30 border-t border-[var(--m-line)] bg-[var(--m-bg)]/90 px-5 py-3 backdrop-blur-xl lg:mx-0 lg:rounded-[var(--m-r-core)] lg:border"
                onSubmit={(e) => {
                    e.preventDefault()
                    send(draft)
                }}
            >
                <div className="mx-auto flex w-full max-w-[720px] items-end gap-2 lg:max-w-none">
                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                send(draft)
                            }
                        }}
                        rows={1}
                        placeholder="Ask the coach"
                        aria-label="Message"
                        className="max-h-32 min-h-12 flex-1 resize-none rounded-[var(--m-r-control)] border border-[var(--m-line)] bg-[var(--m-surface)] px-3.5 py-3 text-[15px] text-[var(--m-ink)] placeholder:text-[var(--m-ink-3)]"
                    />
                    <button
                        type="submit"
                        disabled={sending || !draft.trim()}
                        aria-label="Send"
                        className="m-tap flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--m-ink)] text-[var(--m-bg)] disabled:opacity-45"
                    >
                        <IconArrowUp size={20} stroke={2.2} />
                    </button>
                </div>
            </form>
        </Screen>
    )
}

function Dot({ delay }: { delay: number }) {
    return (
        <span
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--m-ink-3)]"
            style={{ animationDelay: `${delay}ms` }}
        />
    )
}
