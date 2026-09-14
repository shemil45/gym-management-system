'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import { Gift, Loader2, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { searchReferrers, type ReferrerMatch } from '@/app/admin/members/actions'

/**
 * "Referred by" as a search-and-confirm control.
 *
 * The box only searches; the form never sees what was typed. A referrer is
 * committed by picking a result, which swaps the box for a chip and writes the
 * member ID to a hidden `referral_code` input. Clearing the chip removes it.
 */
export default function ReferrerPicker({ disabled }: { disabled: boolean }) {
    const { isDark } = useAdminTheme()
    const listId = useId()
    const [query, setQuery] = useState('')
    const [matches, setMatches] = useState<ReferrerMatch[]>([])
    const [searching, setSearching] = useState(false)
    const [open, setOpen] = useState(false)
    const [picked, setPicked] = useState<ReferrerMatch | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    // Debounced search; a stale response must not overwrite a newer one.
    useEffect(() => {
        const term = query.trim()
        if (term.length < 2) {
            setMatches([])
            setSearching(false)
            return
        }
        let cancelled = false
        setSearching(true)
        const timer = setTimeout(async () => {
            try {
                const rows = await searchReferrers(term)
                if (!cancelled) setMatches(rows)
            } catch {
                if (!cancelled) setMatches([])
            } finally {
                if (!cancelled) setSearching(false)
            }
        }, 250)
        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [query])

    // Click outside closes the list without clearing what was typed.
    useEffect(() => {
        if (!open) return
        const onPointerDown = (event: PointerEvent) => {
            if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [open])

    const pick = (match: ReferrerMatch) => {
        setPicked(match)
        setQuery('')
        setMatches([])
        setOpen(false)
    }

    const clear = () => setPicked(null)

    return (
        <div className="space-y-1.5" ref={wrapperRef}>
            <Label htmlFor={`${listId}-input`} className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-orange-500" />
                Referred By
            </Label>

            {picked ? (
                <>
                    <input type="hidden" name="referral_code" value={picked.memberId} />
                    <div
                        className={`flex h-10 items-center gap-2.5 rounded-md border px-2.5 ${
                            isDark ? 'border-[#2a2a2a] bg-[#161616]' : 'border-gray-300 bg-white'
                        }`}
                    >
                        <Avatar match={picked} isDark={isDark} />
                        <div className="min-w-0 flex-1 leading-tight">
                            <p className={`truncate text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                                {picked.fullName}
                            </p>
                            <p className="text-[11px] text-gray-400">{picked.memberId}</p>
                        </div>
                        <button
                            type="button"
                            onClick={clear}
                            disabled={disabled}
                            aria-label="Remove referrer"
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                                isDark ? 'text-gray-400 hover:bg-[#222222] hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                            }`}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <p className="text-xs text-gray-400">Referrer confirmed — they earn credits once this member is saved.</p>
                </>
            ) : (
                <>
                    <div className="relative">
                        <Input
                            id={`${listId}-input`}
                            value={query}
                            onChange={(event) => {
                                setQuery(event.target.value)
                                setOpen(true)
                            }}
                            onFocus={() => setOpen(true)}
                            placeholder="Search by member ID or name"
                            disabled={disabled}
                            autoComplete="off"
                            role="combobox"
                            aria-expanded={open && matches.length > 0}
                            aria-controls={listId}
                            aria-autocomplete="list"
                            className="h-10 border-gray-300 text-sm pr-9"
                        />
                        {searching ? (
                            <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                        ) : null}

                        {open && query.trim().length >= 2 ? (
                            <ul
                                id={listId}
                                role="listbox"
                                className={`absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-md border py-1 shadow-lg ${
                                    isDark ? 'border-[#2a2a2a] bg-[#161616]' : 'border-gray-200 bg-white'
                                }`}
                            >
                                {matches.length === 0 && !searching ? (
                                    <li className="px-3 py-2 text-sm text-gray-400">No active member matches</li>
                                ) : null}
                                {matches.map((match) => (
                                    <li key={match.id} role="option" aria-selected={false}>
                                        <button
                                            type="button"
                                            onClick={() => pick(match)}
                                            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left ${
                                                isDark ? 'hover:bg-[#222222]' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <Avatar match={match} isDark={isDark} />
                                            <span className="min-w-0 flex-1 leading-tight">
                                                <span className={`block truncate text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                                                    {match.fullName}
                                                </span>
                                                <span className="block text-[11px] text-gray-400">{match.memberId}</span>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </div>
                    <p className="text-xs text-gray-400">Optional — pick the member who referred them</p>
                </>
            )}
        </div>
    )
}

function Avatar({ match, isDark }: { match: ReferrerMatch; isDark: boolean }) {
    if (match.photoUrl) {
        return (
            <Image
                src={match.photoUrl}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
        )
    }
    return (
        <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                isDark ? 'bg-[#2a2a2a] text-gray-200' : 'bg-gray-100 text-gray-600'
            }`}
        >
            {match.fullName.trim().charAt(0).toUpperCase() || '?'}
        </span>
    )
}
