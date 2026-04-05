import { redirect } from 'next/navigation'

export default async function EditStaffRedirectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    redirect(`/admin/staff/${id}/edit`)
}
