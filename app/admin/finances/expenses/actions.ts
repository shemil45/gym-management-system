'use server'

import { createClient } from '@/lib/supabase/server'
import type { InsertTables } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { getCurrentGymContext } from '@/lib/auth/gym-context'
import { assertActiveSubscription } from '@/lib/billing/gate'

async function gate(): Promise<{ error: string } | null> {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to manage expenses.' }
    }
    return assertActiveSubscription(viewer.gym.id)
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
    const blocked = await gate()
    if (blocked) return { error: blocked.error }

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

    const { error } = await supabase.from('expenses').insert(expensePayload as never)

    if (error) return { error: error.message }

    revalidatePath('/admin/finances/expenses')
    return { success: true }
}

export async function deleteExpense(id: string) {
    const blocked = await gate()
    if (blocked) return { error: blocked.error }

    const supabase = await createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/finances/expenses')
    return { success: true }
}
