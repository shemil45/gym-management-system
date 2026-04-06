import { notFound } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import LoadingLinkButton from '@/components/ui/loading-link-button'
import { formatRoleLabel, type StaffRole } from '@/lib/auth/roles'
import {
    ArrowLeft,
    Calendar,
    Mail,
    Pencil,
    Phone,
    ShieldCheck,
    User,
} from 'lucide-react'

type StaffDetail = {
    id: string
    full_name: string
    phone: string | null
    photo_url: string | null
    role: StaffRole
    created_at: string
}

type AuthUserEmail = string | null

function getSupabaseAdmin() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

function formatDate(value: string | null) {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    })
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
                className="admin-detail-row flex items-start gap-3 border-t border-slate-100 py-3.5 transition-colors first:border-t-0 active:bg-slate-50"
            >
                {inner}
            </a>
        )
    }

    return (
        <div className="admin-detail-row flex items-start gap-3 border-t border-slate-100 py-3.5 first:border-t-0">
            {inner}
        </div>
    )
}

export default async function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const admin = getSupabaseAdmin()

    const profileResult = await supabase
        .from('profiles')
        .select('id, full_name, phone, photo_url, role, created_at')
        .eq('id', id)
        .neq('role', 'member')
        .single()

    const staff = profileResult.data as StaffDetail | null

    if (!staff) notFound()

    let email: AuthUserEmail = null
    const authUserResult = await admin.auth.admin.getUserById(id)
    if (!authUserResult.error) {
        email = authUserResult.data.user?.email ?? null
    }

    const initials = staff.full_name
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    return (
        <div className="space-y-4 pb-10">
            <div className="flex items-center justify-between">
                <LoadingLinkButton
                    href="/admin/staff"
                    loadingText="Going back..."
                    variant="ghost"
                    className="flex h-9 items-center gap-1.5 rounded-xl px-2 text-slate-600 hover:bg-slate-100"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">Staff</span>
                </LoadingLinkButton>

                <LoadingLinkButton
                    href={`/admin/staff/${staff.id}/edit`}
                    loadingText="Opening..."
                    className="flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                </LoadingLinkButton>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 px-4 py-4 shadow-[0_8px_24px_rgba(59,130,246,0.35)]">
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/5" />
                <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/5" />

                <div className="relative flex items-center gap-4">
                    <div className="shrink-0 rounded-full ring-2 ring-white/30">
                        <Avatar className="h-14 w-14">
                            <AvatarImage src={staff.photo_url || undefined} alt={staff.full_name} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-300 to-violet-400 text-base font-bold text-white">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-lg font-bold text-white">{staff.full_name}</h1>
                        <p className="text-xs font-medium capitalize text-blue-200">{formatRoleLabel(staff.role)}</p>
                    </div>
                </div>
            </div>

            <div className="admin-detail-card rounded-2xl bg-white px-4 shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
                <p className="admin-detail-card-header border-b border-slate-100 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Staff Info
                </p>
                <div className="admin-detail-card-body">
                    <InfoRow icon={User} label="Full Name" value={staff.full_name} />
                    <InfoRow icon={ShieldCheck} label="Role" value={formatRoleLabel(staff.role)} />
                    <InfoRow icon={Phone} label="Phone" value={staff.phone || '—'} href={staff.phone ? `tel:${staff.phone}` : undefined} />
                    <InfoRow icon={Mail} label="Email" value={email || '—'} href={email ? `mailto:${email}` : undefined} />
                    <InfoRow icon={Calendar} label="Created" value={formatDate(staff.created_at)} />
                </div>
            </div>
        </div>
    )
}
