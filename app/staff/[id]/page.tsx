import { redirect } from 'next/navigation'

export default async function StaffDetailRedirectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    redirect(`/admin/staff/${id}`)
}
