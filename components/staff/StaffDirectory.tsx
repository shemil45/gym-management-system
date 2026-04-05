'use client'

import Link from 'next/link'
import { startTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatRoleLabel } from '@/lib/auth/roles'
import { Loader2, Plus, Phone } from 'lucide-react'

type StaffMember = {
    id: string
    full_name: string
    role: string
    phone: string | null
    photo_url: string | null
}

function getRoleBadgeClass(role: string) {
    const palette: Record<string, string> = {
        admin: 'border-red-200 bg-red-50 text-red-700',
        owner: 'border-amber-200 bg-amber-50 text-amber-700',
        manager: 'border-blue-200 bg-blue-50 text-blue-700',
        receptionist: 'border-cyan-200 bg-cyan-50 text-cyan-700',
        trainer: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        house_keeper: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
    }

    return palette[role] ?? 'border-slate-200 bg-slate-50 text-slate-700'
}

export default function StaffDirectory({ staff }: { staff: StaffMember[] }) {
    const router = useRouter()
    const [navigatingStaffId, setNavigatingStaffId] = useState<string | null>(null)

    const handleViewStaff = (id: string) => {
        if (navigatingStaffId) return
        setNavigatingStaffId(id)
        startTransition(() => {
            router.push(`/admin/staff/${id}`)
        })
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Staff</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Everyone in `profiles` except members.
                    </p>
                </div>

                <Button
                    asChild
                    className="h-12 w-12 shrink-0 rounded-full bg-blue-600 p-0 text-white shadow-[0_8px_16px_rgba(15,91,225,0.2)] hover:bg-blue-700 sm:h-12 sm:w-auto sm:rounded-2xl sm:px-4"
                >
                    <Link href="/admin/staff/add">
                        <Plus className="h-5 w-5" />
                        <span className="ml-1 hidden sm:inline">+ Add Staff</span>
                    </Link>
                </Button>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)] ring-1 ring-slate-100">
                <div className="divide-y divide-slate-100 lg:hidden">
                    {staff.length === 0 ? (
                        <div className="px-4 py-16 text-center text-sm text-slate-400">No staff found</div>
                    ) : (
                        staff.map((member) => {
                            const initials = member.full_name
                                .split(' ')
                                .map((part) => part[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()

                            return (
                                <div
                                    key={member.id}
                                    onClick={() => handleViewStaff(member.id)}
                                    className={`relative cursor-pointer px-4 py-4 transition-colors ${
                                        navigatingStaffId === member.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                                    }`}
                                >
                                    {navigatingStaffId === member.id ? (
                                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                        </div>
                                    ) : null}

                                    <div className={`flex items-start gap-3 ${navigatingStaffId === member.id ? 'opacity-40' : ''}`}>
                                        <Avatar className="h-12 w-12 shrink-0 ring-2 ring-slate-100">
                                            <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-semibold text-white">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <p className="truncate text-[15px] font-semibold text-slate-900">{member.full_name}</p>
                                                <Badge variant="outline" className={`capitalize ${getRoleBadgeClass(member.role)}`}>
                                                    {formatRoleLabel(member.role)}
                                                </Badge>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                                                <Phone className="h-4 w-4 text-slate-400" />
                                                <span>{member.phone || 'No phone added'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="hidden lg:block">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/70">
                                <th className="w-16 py-3 pl-6 pr-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Photo</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Name</th>
                                <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Role</th>
                                <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Phone</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {staff.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-16 text-center text-sm text-slate-400">
                                        No staff found
                                    </td>
                                </tr>
                            ) : (
                                staff.map((member) => {
                                    const initials = member.full_name
                                        .split(' ')
                                        .map((part) => part[0])
                                        .join('')
                                        .slice(0, 2)
                                        .toUpperCase()

                                    return (
                                        <tr
                                            key={member.id}
                                            onClick={() => handleViewStaff(member.id)}
                                            className={`cursor-pointer transition-colors ${
                                                navigatingStaffId === member.id ? 'bg-blue-50/60 opacity-60' : 'hover:bg-slate-50/70'
                                            }`}
                                        >
                                            <td className="py-3 pl-6 pr-3">
                                                <Avatar className="h-10 w-10 ring-2 ring-slate-100">
                                                    <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-xs font-semibold text-white">
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                            </td>
                                            <td className="px-3 py-4 text-sm font-medium text-slate-900">{member.full_name}</td>
                                            <td className="px-3 py-4">
                                                <Badge variant="outline" className={`capitalize ${getRoleBadgeClass(member.role)}`}>
                                                    {formatRoleLabel(member.role)}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500">
                                                {navigatingStaffId === member.id ? (
                                                    <span className="inline-flex items-center gap-2 text-blue-500">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Opening...
                                                    </span>
                                                ) : (
                                                    member.phone || 'No phone added'
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
