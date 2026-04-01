import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const memberResult = await supabase
        .from('members')
        .select(`
            *,
            membership_plan:membership_plans(name)
        `)
        .eq('id', id)
        .single()

    const { data: member } = memberResult as unknown as { data: MemberDetail | null; error: unknown }

    if (!member) {
        notFound()
    }

    const initials = member.full_name
        .split(' ')
        .map((name) => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    const infoRows = [
        ['Member ID', member.member_id],
        ['Full Name', member.full_name],
        ['Email', member.email || '-'],
        ['Phone', member.phone],
        ['Gender', member.gender || '-'],
        ['Date of Birth', member.date_of_birth || '-'],
        ['Status', member.status],
        ['Plan', member.membership_plan?.name || '-'],
        ['Start Date', member.membership_start_date || '-'],
        ['Expiry Date', member.membership_expiry_date || '-'],
        ['Emergency Contact', member.emergency_contact_name || '-'],
        ['Emergency Phone', member.emergency_contact_phone || '-'],
        ['Address', member.address || '-'],
    ] as const

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 ring-2 ring-gray-100">
                        <AvatarImage src={member.photo_url || undefined} alt={member.full_name} />
                        <AvatarFallback className="bg-blue-600 text-white text-lg font-semibold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{member.full_name}</h1>
                        <p className="text-sm text-gray-500 mt-1">{member.member_id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/admin/members">
                        <Button variant="outline">Back</Button>
                    </Link>
                    <Link href={`/admin/members/${member.id}/edit`}>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">Edit Member</Button>
                    </Link>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Member Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {infoRows.map(([label, value]) => (
                        <div key={label} className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
                            <p className="text-sm text-gray-900 break-words">{value}</p>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}
