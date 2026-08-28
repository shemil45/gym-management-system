import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Check, Lock } from 'lucide-react'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getGymFeatureState, getOnboardingProgress } from '@/lib/gym/features'
import { ContactForm, FinishForm, SubdomainForm } from './SetupForms'

export const metadata = { title: 'Finish setup' }
export const dynamic = 'force-dynamic'

function Step({
    index,
    title,
    description,
    done,
    children,
}: {
    index: number
    title: string
    description: string
    done: boolean
    children?: React.ReactNode
}) {
    return (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-start gap-3">
                <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}
                >
                    {done ? <Check className="h-3.5 w-3.5" /> : index}
                </span>
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-gray-900">
                        {title}
                        <span className="sr-only">{done ? ' (complete)' : ' (outstanding)'}</span>
                    </h2>
                    <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{description}</p>
                </div>
            </div>
            {children ? <div className="pl-9">{children}</div> : null}
        </section>
    )
}

export default async function SetupPage() {
    const context = await getCurrentGymContext()

    if (!context.user || !context.gym) redirect('/admin/login')

    const gymId = context.gym.id
    const db = getSupabaseAdmin()

    const [gymResult, progress, featureState] = await Promise.all([
        db.from('gyms').select('contact_email, contact_phone, subdomain, trial_ends_at').eq('id', gymId).maybeSingle(),
        getOnboardingProgress(gymId),
        getGymFeatureState(gymId),
    ])

    const gym = gymResult.data as {
        contact_email: string | null
        contact_phone: string | null
        subdomain: string | null
        trial_ends_at: string | null
    } | null

    const contactDone = Boolean(gym?.contact_email) && Boolean(gym?.contact_phone)
    const subdomainDone = Boolean(gym?.subdomain)

    return (
        <div className="mx-auto w-full max-w-2xl">
            <header className="mb-6">
                <h1 className="text-xl font-bold tracking-tight text-gray-900">
                    {progress.complete ? 'Setup complete' : 'Finish setting up your gym'}
                </h1>
                <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-gray-600">
                    {progress.complete
                        ? 'Everything on your plan is unlocked. You can still change any of these details below.'
                        : 'You can already add members, run check-ins and take payments. These last details unlock the rest of your plan.'}
                </p>
            </header>

            {!progress.complete && featureState.gatedByOnboarding.length > 0 ? (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                    <div>
                        <p className="text-xs font-semibold text-amber-900">
                            Waiting on setup: {featureState.gatedByOnboarding.join(', ')}
                        </p>
                        <p className="mt-0.5 text-xs leading-relaxed text-amber-800">
                            Your plan includes these. They switch on the moment setup is finished.
                        </p>
                    </div>
                </div>
            ) : null}

            <div className="flex flex-col gap-4">
                <Step
                    index={1}
                    title="How we reach you"
                    description="Billing notices and account alerts go here."
                    done={contactDone}
                >
                    <ContactForm
                        defaultEmail={gym?.contact_email ?? ''}
                        defaultPhone={gym?.contact_phone ?? ''}
                    />
                </Step>

                <Step
                    index={2}
                    title="Your web address"
                    description="Members use this to reach your gym on GMS Cloud."
                    done={subdomainDone}
                >
                    <SubdomainForm defaultValue={gym?.subdomain ?? ''} />
                </Step>

                <Step
                    index={3}
                    title="Unlock your plan"
                    description={
                        progress.complete
                            ? 'Done. Everything on your plan is available.'
                            : 'Available once the steps above are done.'
                    }
                    done={progress.complete}
                >
                    {progress.complete ? (
                        <Link
                            href="/admin/dashboard"
                            className="inline-flex items-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        >
                            Go to dashboard
                        </Link>
                    ) : (
                        <FinishForm ready={progress.remaining === 0} />
                    )}
                </Step>
            </div>

            <p className="mt-5 text-xs text-gray-500">
                Branding, address and tax details are optional and live in{' '}
                <Link href="/admin/settings/gym-profile" className="font-medium underline">
                    gym profile settings
                </Link>
                .
            </p>
        </div>
    )
}
