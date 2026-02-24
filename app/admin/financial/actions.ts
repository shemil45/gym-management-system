'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ExpenseCategory =
    | 'utilities'
    | 'salary'
    | 'equipment'
    | 'maintenance'
    | 'marketing'
    | 'rent'
    | 'other'

export async function addExpense(formData: FormData) {
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

    const { error } = await supabase.from('expenses').insert({
        category,
        amount,
        description,
        expense_date,
    })

    if (error) return { error: error.message }

    revalidatePath('/admin/financial')
    return { success: true }
}

export async function deleteExpense(id: string) {
    const supabase = await createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) return { error: error.message }
    revalidatePath('/admin/financial')
    return { success: true }
}
