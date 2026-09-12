'use server'

import { createClient } from '@/lib/supabase/server'
import type { InsertTables, QueryResult } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { assertActiveSubscription } from '@/lib/billing/gate'
import {
    DEMO_READONLY_MESSAGE,
    IMPERSONATION_READONLY_MESSAGE,
    getActiveImpersonation,
    isImpersonationOwned,
    recordImpersonationWrite,
    releaseImpersonationWrite,
} from '@/lib/platform/impersonation-ledger'

async function gate(): Promise<{ error: string } | { gymId: string }> {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to manage expenses.' }
    }
    const lapsed = await assertActiveSubscription(viewer.gym.id)
    if (lapsed) return { error: lapsed.error }
    return { gymId: viewer.gym.id }
}

export type ExpenseCategory =
    | 'utilities'
    | 'salary'
    | 'equipment'
    | 'maintenance'
    | 'marketing'
    | 'rent'
    | 'other'

export async function addExpense(formData: FormData) {
    const gated = await gate()
    if ('error' in gated) return { error: gated.error }

    const supabase = await createClient()

    const category = formData.get('category') as ExpenseCategory
    const amount = parseFloat(formData.get('amount') as string)
    const description = formData.get('description') as string
    const expense_date =
        (formData.get('expense_date') as string) ||
        new Date().toISOString().split('T')[0]

    if (!category || !amount || !description) {
        return { error: 'Category, amount, and description are required' }
    }

    const expensePayload: InsertTables<'expenses'> = {
        category,
        amount,
        description,
        expense_date,
    }

    let createdExpenseId: string | null = null

    try {
        const insertResult = await supabase.from('expenses').insert(expensePayload as never).select('id').single()
        const { data: inserted, error } = insertResult as unknown as QueryResult<{ id: string } | null>

        if (error) return { error: (error as { message: string }).message }

        createdExpenseId = inserted?.id ?? null

        const impersonation = await getActiveImpersonation(gated.gymId)
        if (impersonation && inserted) {
            await recordImpersonationWrite(impersonation.sessionId, gated.gymId, 'expense', inserted.id)
        }

        revalidatePath('/admin/finances/expenses')
        return { success: true }
    } catch (err: unknown) {
        if (createdExpenseId) await supabase.from('expenses').delete().eq('id', createdExpenseId)
        return { error: err instanceof Error ? err.message : 'Failed to add expense' }
    }
}

export async function deleteExpense(id: string) {
    const gated = await gate()
    if ('error' in gated) return { error: gated.error }

    try {
        const impersonation = await getActiveImpersonation(gated.gymId)
        const owner = await isImpersonationOwned(gated.gymId, 'expense', id)
        if (impersonation) {
            if (!owner || owner.sessionId !== impersonation.sessionId) return { error: IMPERSONATION_READONLY_MESSAGE }
        } else if (owner) {
            return { error: DEMO_READONLY_MESSAGE }
        }

        const supabase = await createClient()
        const deleteResult = await supabase.from('expenses').delete().eq('id', id).select('id')
        const { data: deletedRows, error } = deleteResult as unknown as QueryResult<{ id: string }[] | null>
        if (error) return { error: (error as { message: string }).message }
        if (!deletedRows || deletedRows.length === 0) {
            return { error: 'Nothing was deleted.' }
        }
        if (owner) await releaseImpersonationWrite(gated.gymId, 'expense', id)
        revalidatePath('/admin/finances/expenses')
        return { success: true }
    } catch (err: unknown) {
        return { error: err instanceof Error ? err.message : 'Failed to delete expense' }
    }
}
