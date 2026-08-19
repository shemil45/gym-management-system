'use server'

import { createClient } from '@/lib/supabase/server'
import type { UpdateTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'

function getErrorMessage(error: unknown, fallback: string) {
    return error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : fallback
}

function trimmedOrNull(value: FormDataEntryValue | null) {
    const trimmed = (value as string | null)?.trim()
    return trimmed || null
}

export async function updateReceiptSettings(formData: FormData) {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to change these settings.' }
    }

    const receiptPrefix = (formData.get('receipt_prefix') as string | null)?.trim()
    if (!receiptPrefix) {
        return { error: 'Receipt prefix is required.' }
    }

    const nextNumberRaw = formData.get('receipt_next_number') as string | null
    const receiptNextNumber = nextNumberRaw ? parseInt(nextNumberRaw, 10) : NaN
    if (!Number.isInteger(receiptNextNumber) || receiptNextNumber < 1) {
        return { error: 'Next receipt number must be a positive whole number.' }
    }

    const supabase = await createClient()

    const { error } = await supabase
        .from('gyms')
        .update(({
            receipt_prefix: receiptPrefix,
            receipt_next_number: receiptNextNumber,
            receipt_show_logo: formData.get('receipt_show_logo') === 'true',
            receipt_show_address: formData.get('receipt_show_address') === 'true',
            receipt_show_phone: formData.get('receipt_show_phone') === 'true',
            receipt_show_email: formData.get('receipt_show_email') === 'true',
            receipt_show_gstin: formData.get('receipt_show_gstin') === 'true',
            receipt_footer_message: trimmedOrNull(formData.get('receipt_footer_message')),
            receipt_additional_notes: trimmedOrNull(formData.get('receipt_additional_notes')),
        } satisfies UpdateTables<'gyms'>) as never)
        .eq('id', viewer.gym.id)

    if (error) return { error: getErrorMessage(error, 'Failed to update receipt settings') }

    revalidatePath('/admin/settings/invoice-receipt')
    return { success: true }
}
