'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getOnboardingProgress } from '@/lib/gym/features'

export type SetupState = { error: string | null; success: string | null }

/** Reserved because they collide with real or planned platform hostnames. */
const RESERVED_SUBDOMAINS = new Set([
    'www', 'app', 'api', 'admin', 'platform', 'member', 'members', 'staff',
    'billing', 'support', 'help', 'docs', 'status', 'mail', 'cdn', 'assets',
    'login', 'auth', 'dashboard', 'gym', 'gms',
])

function normalizeSubdomain(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
}

/** Owner-or-manager only: onboarding decides what the whole gym can use. */
async function requireGymOwner() {
    const context = await getCurrentGymContext()

    if (!context.user || !context.gym) {
        return { error: 'Sign in to your gym to continue.' as const, gymId: null }
    }

    if (context.role !== 'owner' && context.role !== 'admin' && context.role !== 'manager') {
        return { error: 'Only an owner or manager can change setup.' as const, gymId: null }
    }

    return { error: null, gymId: context.gym.id }
}

export async function saveContactDetails(
    _prev: SetupState,
    formData: FormData,
): Promise<SetupState> {
    const { error: authError, gymId } = await requireGymOwner()
    if (authError || !gymId) return { error: authError, success: null }

    const email = String(formData.get('contact_email') ?? '').trim()
    const phone = String(formData.get('contact_phone') ?? '').trim()

    if (!email && !phone) {
        return { error: 'Enter an email or a phone number.', success: null }
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { error: 'That email address does not look right.', success: null }
    }

    const db = getSupabaseAdmin()
    const { error } = await db
        .from('gyms')
        .update({
            ...(email ? { contact_email: email } : {}),
            ...(phone ? { contact_phone: phone } : {}),
        } as never)
        .eq('id', gymId)

    if (error) return { error: error.message, success: null }

    revalidatePath('/admin/setup')
    revalidatePath('/admin', 'layout')
    return { error: null, success: 'Contact details saved.' }
}

export async function claimSubdomain(_prev: SetupState, formData: FormData): Promise<SetupState> {
    const { error: authError, gymId } = await requireGymOwner()
    if (authError || !gymId) return { error: authError, success: null }

    const raw = String(formData.get('subdomain') ?? '')
    const subdomain = normalizeSubdomain(raw)

    if (subdomain.length < 3) {
        return { error: 'Pick at least 3 characters (letters, numbers and dashes).', success: null }
    }

    if (subdomain.length > 40) {
        return { error: 'Keep it to 40 characters or fewer.', success: null }
    }

    if (RESERVED_SUBDOMAINS.has(subdomain)) {
        return { error: `"${subdomain}" is reserved. Try something closer to your gym's name.`, success: null }
    }

    const db = getSupabaseAdmin()

    // Check availability before writing so the owner gets a useful message
    // instead of a raw unique-constraint violation.
    const existing = await db
        .from('gyms')
        .select('id')
        .eq('subdomain', subdomain)
        .neq('id', gymId)
        .maybeSingle()

    if (existing.data) {
        return { error: `"${subdomain}" is already taken. Try another.`, success: null }
    }

    const { error } = await db.from('gyms').update({ subdomain } as never).eq('id', gymId)

    if (error) {
        // The unique index is still the authority; a racing claim lands here.
        return {
            error: error.code === '23505' ? `"${subdomain}" was just taken. Try another.` : error.message,
            success: null,
        }
    }

    revalidatePath('/admin/setup')
    revalidatePath('/admin', 'layout')
    return { error: null, success: `Claimed ${subdomain}.gmscloud.app` }
}

/**
 * Flips onboarding_status once every gate is satisfied, lifting the basic-tier
 * cap. Re-checks the gates server-side rather than trusting the button state.
 */
export async function finishOnboarding(_prev: SetupState, _formData: FormData): Promise<SetupState> {
    const { error: authError, gymId } = await requireGymOwner()
    if (authError || !gymId) return { error: authError, success: null }

    const progress = await getOnboardingProgress(gymId)

    if (progress.complete) {
        return { error: null, success: 'Setup is already complete.' }
    }

    if (progress.remaining > 0) {
        const missing = progress.items.filter((item) => !item.done).map((item) => item.label)
        return { error: `Still needed: ${missing.join(', ')}.`, success: null }
    }

    const db = getSupabaseAdmin()
    const { error } = await db
        .from('gyms')
        .update({
            onboarding_status: 'completed',
            onboarding_completed_at: new Date().toISOString(),
        } as never)
        .eq('id', gymId)

    if (error) return { error: error.message, success: null }

    revalidatePath('/admin', 'layout')
    revalidatePath('/admin/setup')
    return { error: null, success: 'Setup complete. Every feature on your plan is now available.' }
}
