'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Loader2, Mail, Phone, UserPlus, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { cancelLead } from '@/app/admin/members/referrals/actions'
import type { ReferralLead } from '@/lib/referrals/server'
import { daysUntilExpiry, type ReferralStatus } from '@/lib/referrals/lead'
import { DEMO_READONLY_MESSAGE } from '@/lib/platform/impersonation-messages'

type Filter = 'pending' | 'converted' | 'expired' | 'cancelled' | 'all'

const FILTERS: { id: Filter; label: string }[] = [
    { id: 'pending', label: 'Pending' },
    { id: 'converted', label: 'Converted' },
    { id: 'expired', label: 'Expired' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'all', label: 'All' },
]

const STATUS_STYLES: Record<ReferralStatus, string> = {
    pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    converted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    expired: 'bg-gray-100 text-gray-600 dark:bg-neutral-800 dark:text-neutral-400',
    cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const STATUS_LABEL: Record<ReferralStatus, string> = {
    pending: 'Pending',
    converted: 'Converted',
    expired: 'Expired',
    cancelled: 'Cancelled',
}

function formatDate(value: string | null) {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatPhone(value: string) {
    const digits = value.replace(/\D/g, '')
    if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
    return value
}

function isFilter(value: string | undefined): value is Filter {
    return FILTERS.some((f) => f.id === value)
}

export default function ReferralLeadsTable({
    leads,
    highlightId,
    initialStatus,
    readOnly,
}: {
    leads: ReferralLead[]
    highlightId: string | null
    initialStatus?: string
    readOnly: boolean
}) {
    const { isDark } = useAdminTheme()
    const router = useRouter()
    const { confirm, dialog } = useConfirmDialog()
    const [filter, setFilter] = useState<Filter>(() => {
        if (isFilter(initialStatus)) return initialStatus
        // Opening a specific lead shows whatever list it lives in.
        const target = highlightId ? leads.find((lead) => lead.id === highlightId) : null
        return target ? target.status : 'pending'
    })
    const [busyId, setBusyId] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    const counts = useMemo(() => {
        const c: Record<Filter, number> = { pending: 0, converted: 0, expired: 0, cancelled: 0, all: leads.length }
        for (const lead of leads) c[lead.status] += 1
        return c
    }, [leads])

    const visible = useMemo(() => (filter === 'all' ? leads : leads.filter((lead) => lead.status === filter)), [leads, filter])

    async function handleCancel(lead: ReferralLead) {
        if (readOnly) {
            toast.error(DEMO_READONLY_MESSAGE)
            return
        }
        const ok = await confirm({
            title: 'Cancel this referral?',
            description: `${lead.referredName} will no longer be able to be registered through this referral. The record is kept for reporting.`,
            confirmLabel: 'Cancel referral',
            cancelLabel: 'Keep it',
            tone: 'danger',
        })
        if (!ok) return
        setBusyId(lead.id)
        const result = await cancelLead(lead.id)
        setBusyId(null)
        if ('error' in result) {
            toast.error(result.error)
            return
        }
        toast.success('Referral cancelled')
        startTransition(() => router.refresh())
    }

    function handleComplete(lead: ReferralLead) {
        if (readOnly) {
            toast.error(DEMO_READONLY_MESSAGE)
            return
        }
        setBusyId(lead.id)
        router.push(`/admin/members/add?lead=${lead.id}`)
    }

    const card = isDark ? 'bg-[#171717] ring-[#2a2a2a]' : 'bg-white ring-slate-100'
    const border = isDark ? 'border-[#2a2a2a]' : 'border-slate-100'
    const muted = isDark ? 'text-gray-400' : 'text-slate-500'
    const strong = isDark ? 'text-gray-100' : 'text-slate-900'

    return (
        <div className="space-y-4">
            <div>
                <Link
                    href="/admin/members"
                    className={`inline-flex items-center gap-1 rounded text-xs transition-colors ${
                        isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Members
                </Link>
                <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className={`text-3xl font-semibold tracking-tight ${strong}`}>Referral leads</h1>
                        <p className={`mt-1 text-sm ${muted}`}>
                            People who signed up through a member&apos;s referral link. Complete their registration when they visit.
                        </p>
                    </div>
                </div>
            </div>

            <div className={`flex flex-wrap gap-1 rounded-lg border p-0.5 ${border} w-fit`} role="group" aria-label="Status">
                {FILTERS.map((option) => {
                    const active = filter === option.id
                    return (
                        <button
                            key={option.id}
                            type="button"
                            onClick={() => setFilter(option.id)}
                            aria-pressed={active}
                            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors ${
                                active
                                    ? isDark
                                        ? 'bg-white text-neutral-900'
                                        : 'bg-gray-900 text-white'
                                    : isDark
                                      ? 'text-neutral-300 hover:bg-neutral-800'
                                      : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {option.label}
                            <span className={`tabular-nums ${active ? 'opacity-70' : muted}`}>{counts[option.id]}</span>
                        </button>
                    )
                })}
            </div>

            <div className={`overflow-hidden rounded-lg shadow-[0_14px_32px_rgba(15,23,42,0.07)] ring-1 ${card}`}>
                {visible.length === 0 ? (
                    <div className={`px-4 py-16 text-center text-sm ${muted}`}>
                        {filter === 'pending'
                            ? 'No pending referral leads. When a friend fills in a member’s referral link, they appear here.'
                            : `No ${filter === 'all' ? '' : filter + ' '}referral leads.`}
                    </div>
                ) : (
                    <>
                        {/* Mobile cards */}
                        <div className={`lg:hidden divide-y ${isDark ? 'divide-[#2a2a2a]' : 'divide-slate-100'}`}>
                            {visible.map((lead) => (
                                <LeadCard
                                    key={lead.id}
                                    lead={lead}
                                    highlighted={lead.id === highlightId}
                                    busy={busyId === lead.id}
                                    isDark={isDark}
                                    onComplete={() => handleComplete(lead)}
                                    onCancel={() => handleCancel(lead)}
                                />
                            ))}
                        </div>

                        {/* Desktop table */}
                        <div className="hidden overflow-x-auto lg:block">
                            <table className="w-full">
                                <thead>
                                    <tr className={isDark ? 'border-b border-[#2a2a2a] bg-[#171717]' : 'border-b border-gray-100 bg-gray-50/60'}>
                                        {['Name', 'Contact', 'Referred by', 'Submitted', 'Expires', 'Status', ''].map((label, i) => (
                                            <th
                                                key={label || i}
                                                className={`px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 ${
                                                    i === 0 ? 'pl-5' : ''
                                                } ${i === 6 ? 'pr-5 text-right' : ''}`}
                                            >
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className={isDark ? 'divide-y divide-[#2a2a2a]' : 'divide-y divide-gray-100'}>
                                    {visible.map((lead) => {
                                        const daysLeft = daysUntilExpiry(lead.expiresAt)
                                        const highlighted = lead.id === highlightId
                                        return (
                                            <tr
                                                key={lead.id}
                                                className={
                                                    highlighted
                                                        ? isDark
                                                            ? 'bg-blue-950/30'
                                                            : 'bg-blue-50/60'
                                                        : isDark
                                                          ? 'hover:bg-[#1c1c1c]'
                                                          : 'hover:bg-slate-50'
                                                }
                                            >
                                                <td className={`py-3 pl-5 pr-3 text-sm font-medium ${strong}`}>{lead.referredName}</td>
                                                <td className={`px-3 py-3 text-sm ${muted}`}>
                                                    <div className="tabular-nums">{formatPhone(lead.referredPhone)}</div>
                                                    {lead.referredEmail ? <div className="text-xs">{lead.referredEmail}</div> : null}
                                                </td>
                                                <td className={`px-3 py-3 text-sm ${muted}`}>
                                                    <div className={strong}>{lead.referrerName}</div>
                                                    <div className="text-xs">{lead.referrerCode}</div>
                                                </td>
                                                <td className={`px-3 py-3 text-sm whitespace-nowrap ${muted}`}>{formatDate(lead.submittedAt)}</td>
                                                <td className={`px-3 py-3 text-sm whitespace-nowrap ${muted}`}>
                                                    {formatDate(lead.expiresAt)}
                                                    {lead.status === 'pending' && daysLeft !== null ? (
                                                        <div className="text-xs">{daysLeft === 0 ? 'Today' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`}</div>
                                                    ) : null}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <StatusPill status={lead.status} />
                                                    {lead.status === 'converted' && lead.convertedMemberCode ? (
                                                        <div className={`mt-1 text-xs ${muted}`}>
                                                            Member{' '}
                                                            {lead.convertedMemberId ? (
                                                                <Link href={`/admin/members/${lead.convertedMemberId}`} className="underline">
                                                                    {lead.convertedMemberCode}
                                                                </Link>
                                                            ) : (
                                                                lead.convertedMemberCode
                                                            )}
                                                        </div>
                                                    ) : null}
                                                </td>
                                                <td className="py-3 pl-3 pr-5 text-right">
                                                    <Actions
                                                        lead={lead}
                                                        busy={busyId === lead.id}
                                                        isDark={isDark}
                                                        onComplete={() => handleComplete(lead)}
                                                        onCancel={() => handleCancel(lead)}
                                                    />
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
            {dialog}
        </div>
    )
}

function StatusPill({ status }: { status: ReferralStatus }) {
    return (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{STATUS_LABEL[status]}</span>
    )
}

function Actions({
    lead,
    busy,
    isDark,
    onComplete,
    onCancel,
}: {
    lead: ReferralLead
    busy: boolean
    isDark: boolean
    onComplete: () => void
    onCancel: () => void
}) {
    if (lead.status !== 'pending') {
        return <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>{lead.status === 'expired' ? 'Cannot be completed' : '—'}</span>
    }
    return (
        <div className="flex items-center justify-end gap-2">
            <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={onCancel}
                className={`h-9 rounded-lg px-2.5 text-xs ${isDark ? 'text-gray-300 hover:bg-[#222222] hover:text-white' : 'text-slate-600 hover:bg-slate-100'}`}
            >
                <XCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Cancel
            </Button>
            <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={onComplete}
                className="h-9 rounded-lg bg-blue-600 px-3 text-xs text-white hover:bg-blue-700"
            >
                {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <UserPlus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />}
                Complete Registration
            </Button>
        </div>
    )
}

function LeadCard({
    lead,
    highlighted,
    busy,
    isDark,
    onComplete,
    onCancel,
}: {
    lead: ReferralLead
    highlighted: boolean
    busy: boolean
    isDark: boolean
    onComplete: () => void
    onCancel: () => void
}) {
    const muted = isDark ? 'text-gray-400' : 'text-slate-500'
    const strong = isDark ? 'text-gray-100' : 'text-slate-900'
    const daysLeft = daysUntilExpiry(lead.expiresAt)
    return (
        <div className={`px-4 py-3 ${highlighted ? (isDark ? 'bg-blue-950/30' : 'bg-blue-50/60') : ''}`}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className={`truncate text-sm font-semibold ${strong}`}>{lead.referredName}</p>
                    <p className={`mt-0.5 text-xs ${muted}`}>Referred by {lead.referrerName}</p>
                </div>
                <StatusPill status={lead.status} />
            </div>
            <div className={`mt-2 space-y-1 text-xs ${muted}`}>
                <p className="flex items-center gap-1.5 tabular-nums">
                    <Phone className="h-3 w-3" aria-hidden="true" /> {formatPhone(lead.referredPhone)}
                </p>
                {lead.referredEmail ? (
                    <p className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" aria-hidden="true" /> {lead.referredEmail}
                    </p>
                ) : null}
                <p>
                    Submitted {formatDate(lead.submittedAt)} · Expires {formatDate(lead.expiresAt)}
                    {lead.status === 'pending' && daysLeft !== null ? ` (${daysLeft === 0 ? 'today' : `${daysLeft}d left`})` : ''}
                </p>
            </div>
            <div className="mt-3">
                <Actions lead={lead} busy={busy} isDark={isDark} onComplete={onComplete} onCancel={onCancel} />
            </div>
        </div>
    )
}
