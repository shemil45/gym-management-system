import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import LoadingLinkButton from '@/components/ui/loading-link-button'
import {
    User,
    Phone,
    Mail,
    Calendar,
    MapPin,
    ShieldAlert,
    CreditCard,
    Clock,
    BadgeCheck,
    ArrowLeft,
    Pencil,
} from 'lucide-react'

type MemberDetail = {
    id: string
    member_id: string
    full_name: string
    email: string | null
    phone: string
    gender: 'male' | 'female' | 'other' | null
    date_of_birth: string | null
    status: string
    photo_url: string | null
    membership_start_date: string | null
    membership_expiry_date: string | null
    emergency_contact_name: string | null
    emergency_contact_phone: string | null
    address: string | null
    membership_plan: { name: string } | null
}

function formatDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
    active: { label: 'Active', dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    inactive: { label: 'Inactive', dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-600' },
    frozen: { label: 'Frozen', dot: 'bg-sky-400', bg: 'bg-sky-50', text: 'text-sky-700' },
    expired: { label: 'Expired', dot: 'bg-red-400', bg: 'bg-red-50', text: 'text-red-600' },
}

function InfoRow({
    icon: Icon,
    label,
    value,
    href,
}: {
    icon: React.ElementType
    label: string
    value: string
    href?: string
}) {
    const inner = (
        <>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <Icon className="h-4 w-4 text-slate-500" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
                <p className={`mt-0.5 break-words text-sm font-medium ${href ? 'text-blue-600' : 'text-slate-800'}`}>
                    {value}
                </p>
            </div>
        </>
    )

    if (href) {
        return (
            <a
                href={href}
                className="flex items-start gap-3 py-3.5 transition-colors active:bg-slate-50"
            >
                {inner}
            </a>
        )
    }

    return <div className="flex items-start gap-3 py-3.5">{inner}</div>
}

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: member } = (await supabase
        .from('members')
        .select('*, membership_plan:membership_plans(name)')
        .eq('id', id)
        .single()) as unknown as { data: MemberDetail | null; error: unknown }

    if (!member) notFound()

    const initials = member.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    const status = STATUS_CONFIG[member.status] ?? STATUS_CONFIG.inactive

    return (
        <div className="space-y-4 pb-10">
            {/* ── Nav row (stays in layout padding bounds) ── */}
            <div className="flex items-center justify-between">
                <LoadingLinkButton
                    href="/admin/members"
                    loadingText="Going back..."
                    variant="ghost"
                    className="flex h-9 items-center gap-1.5 rounded-xl px-2 text-slate-600 hover:bg-slate-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">Members</span>
                </LoadingLinkButton>

                <LoadingLinkButton
                    href={`/admin/members/${member.id}/edit`}
                    loadingText="Opening..."
                    className="flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                </LoadingLinkButton>
            </div>

            {/* ── Profile card ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 px-4 py-4 shadow-[0_8px_24px_rgba(59,130,246,0.35)]">
                {/* Decorative circles */}
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
                <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/5" />

                <div className="relative flex items-center gap-4">
                    {/* Avatar */}
                    <div className="shrink-0 rounded-full ring-2 ring-white/30">
                        <Avatar className="h-14 w-14">
                            <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-300 to-violet-400 text-base font-bold text-white">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Name + ID + status */}
                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-lg font-bold text-white">{member.full_name}</h1>
                        <p className="text-xs font-medium text-blue-200">{member.member_id}</p>
                        <span
                            className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full ${status.bg} px-2.5 py-0.5 text-xs font-semibold ${status.text}`}
                        >
                            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                            {status.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Personal info ── */}
            <div className="rounded-2xl bg-white px-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
                <p className="border-b border-slate-100 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Personal Info
                </p>
                <div className="divide-y divide-slate-50">
                    <InfoRow icon={User} label="Full Name" value={member.full_name} />
                    <InfoRow icon={Phone} label="Phone" value={member.phone} href={`tel:${member.phone}`} />
                    <InfoRow icon={Mail} label="Email" value={member.email || '—'} href={member.email ? `mailto:${member.email}` : undefined} />
                    <InfoRow
                        icon={User}
                        label="Gender"
                        value={member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : '—'}
                    />
                    <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(member.date_of_birth)} />
                    {member.address && (
                        <InfoRow icon={MapPin} label="Address" value={member.address} />
                    )}
                </div>
            </div>

            {/* ── Membership info ── */}
            <div className="rounded-2xl bg-white px-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
                <p className="border-b border-slate-100 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Membership
                </p>
                <div className="divide-y divide-slate-50">
                    <InfoRow icon={BadgeCheck} label="Member ID" value={member.member_id} />
                    <InfoRow icon={CreditCard} label="Plan" value={member.membership_plan?.name || '—'} />
                    <InfoRow icon={Clock} label="Start Date" value={formatDate(member.membership_start_date)} />
                    <InfoRow icon={Clock} label="Expiry Date" value={formatDate(member.membership_expiry_date)} />
                </div>
            </div>

            {/* ── Emergency contact ── */}
            {(member.emergency_contact_name || member.emergency_contact_phone) && (
                <div className="rounded-2xl bg-white px-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
                    <p className="border-b border-slate-100 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Emergency Contact
                    </p>
                    <div className="divide-y divide-slate-50">
                        {member.emergency_contact_name && (
                            <InfoRow icon={ShieldAlert} label="Contact Name" value={member.emergency_contact_name} />
                        )}
                        {member.emergency_contact_phone && (
                            <InfoRow icon={Phone} label="Contact Phone" value={member.emergency_contact_phone} href={`tel:${member.emergency_contact_phone}`} />
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
