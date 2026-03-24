import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CompleteProfileForm from './CompleteProfileForm'

export default async function CompleteProfilePage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if the member profile is already complete
    const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (member) {
        // Find role to redirect appropriately
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single() as any
        
        if (profile?.role === 'admin') {
            redirect('/admin/dashboard')
        } else {
            redirect('/member/dashboard')
        }
    }

    return (
        <div className="min-h-screen bg-[#f4f6fa] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
            <div className="max-w-3xl w-full">
                <div className="mb-8 select-none">
                    <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
                    <p className="text-gray-600 mt-2 text-sm max-w-xl">
                        Welcome to Gym Management! Before you can access the member dashboard, please complete to provide a few more details to set up your account.
                    </p>
                </div>
                
                <CompleteProfileForm />
            </div>
        </div>
    )
}
