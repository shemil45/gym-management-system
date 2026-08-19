# Membership & Fees Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Membership & Fees settings section (default admission fee, fee-waiver permission, membership start-date behavior) and wire it into the Add Member flow and payment history, without touching renewal behavior.

**Architecture:** Extend the existing `gyms` table with three settings columns and `payments` with one column to preserve the historical admission fee charged. Add a real settings page/action replacing the Phase 1 placeholder at `/admin/settings/membership-fees`. Extend `AddMemberForm` + `createMember` to read the gym defaults, let staff override/waive per the settings, and persist the charged fee on the payment row. The renewal flow (`RecordPaymentForm`/`recordPayment`) is untouched, so admission fee is structurally never charged twice.

**Tech Stack:** Next.js App Router (server actions), Supabase (Postgres + RLS), TypeScript, Tailwind, lucide-react, sonner (toast). No test framework exists in this repo — verification is `npx tsc --noEmit` plus manual smoke testing via the dev server and direct Supabase queries.

**Spec:** `docs/superpowers/specs/2026-08-19-membership-and-fees-design.md`

## Global Constraints

- Do NOT implement renewal behavior (automatic expiry, renew-before/after-expiry) — out of scope.
- Do NOT build a discount engine — no discount field exists in the codebase today; `Total = Plan Amount + Admission Fee` only.
- Do NOT introduce a new permission system — reuse `isStaffRole` / `is_staff_user()` / `getCurrentGymContext().isStaff`.
- Admission fee must never be charged on renewal — achieved by not touching `RecordPaymentForm`/`recordPayment`.
- Changing the gym's default admission fee later must not alter historical payments — achieved by storing the charged amount on `payments.admission_fee_amount` at insert time, never recomputed from the current gym default.
- Match the existing GMS Cloud dark-theme design system (`useAdminTheme`, `#1c1c1c`/`#2a2a2a` dark tokens) for the settings page; match `AddMemberForm`'s existing (non-dark-aware) field styling for the Add Member changes, since that file doesn't use dark tokens today.
- No new UI library — reuse `Input`, `Label`, `Button`, `Select`, `LoadingLinkButton`, and the `ToggleLeft`/`ToggleRight` icon-button toggle pattern already used in `components/plans/PlansManager.tsx`.

---

### Task 1: Database migration — admission fee & membership-defaults columns

**Files:**
- Create: `supabase/migrations/20260819120000_membership_fees_settings.sql`
- Modify: `lib/types/database.types.ts` (regenerated, not hand-edited)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `Tables<'gyms'>` gains `default_admission_fee: number`, `allow_admission_fee_waiver: boolean`, `allow_custom_membership_start_date: boolean`. `Tables<'payments'>` gains `admission_fee_amount: number | null`. A new RLS `UPDATE` policy on `public.gyms` named `"Staff can update current gym"`. All later tasks depend on these columns existing and on the regenerated types compiling.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260819120000_membership_fees_settings.sql`:

```sql
-- UP
ALTER TABLE public.gyms
    ADD COLUMN default_admission_fee numeric(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN allow_admission_fee_waiver boolean NOT NULL DEFAULT true,
    ADD COLUMN allow_custom_membership_start_date boolean NOT NULL DEFAULT false;

ALTER TABLE public.gyms
    ADD CONSTRAINT gyms_default_admission_fee_non_negative CHECK (default_admission_fee >= 0);

ALTER TABLE public.payments
    ADD COLUMN admission_fee_amount numeric(10,2) NULL;

ALTER TABLE public.payments
    ADD CONSTRAINT payments_admission_fee_amount_non_negative CHECK (admission_fee_amount IS NULL OR admission_fee_amount >= 0);

CREATE POLICY "Staff can update current gym"
    ON public.gyms
    FOR UPDATE
    TO authenticated
    USING (is_staff_user() AND id = current_gym_id())
    WITH CHECK (is_staff_user() AND id = current_gym_id());

-- DOWN / rollback
-- DROP POLICY IF EXISTS "Staff can update current gym" ON public.gyms;
-- ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_admission_fee_amount_non_negative;
-- ALTER TABLE public.payments DROP COLUMN IF EXISTS admission_fee_amount;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_default_admission_fee_non_negative;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS allow_custom_membership_start_date;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS allow_admission_fee_waiver;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS default_admission_fee;
```

- [ ] **Step 2: Apply the migration to the `gym-management` Supabase project**

Use the `mcp__plugin_supabase_supabase__apply_migration` tool with:
- `project_id`: `blskfhoboxonvisoalpa`
- `name`: `membership_fees_settings`
- `query`: the SQL body above (everything from `ALTER TABLE public.gyms` through the `CREATE POLICY` statement — omit the comment-only DOWN section, migrations only need the UP)

- [ ] **Step 3: Verify the columns and policy exist**

Run via `mcp__plugin_supabase_supabase__execute_sql` (project_id `blskfhoboxonvisoalpa`):

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'gyms'
  and column_name in ('default_admission_fee', 'allow_admission_fee_waiver', 'allow_custom_membership_start_date');
```

Expected: 3 rows returned, `default_admission_fee` is `numeric`, the two booleans are `boolean`.

```sql
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'gyms' and cmd = 'UPDATE';
```

Expected: one row, `policyname = 'Staff can update current gym'`.

- [ ] **Step 4: Regenerate TypeScript types**

Use `mcp__plugin_supabase_supabase__generate_typescript_types` with `project_id`: `blskfhoboxonvisoalpa`. Write the returned content to `lib/types/database.types.ts` (overwrite the whole file).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors (this task only adds columns; nothing consumes them yet).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260819120000_membership_fees_settings.sql lib/types/database.types.ts
git commit -m "Add admission-fee and membership-defaults columns to gyms/payments"
```

---

### Task 2: Membership & Fees settings page

**Files:**
- Create: `app/admin/settings/membership-fees/actions.ts`
- Create: `components/settings/MembershipFeesSettings.tsx`
- Modify: `app/admin/settings/membership-fees/page.tsx` (replace the Phase 1 `SettingsPlaceholderPage` boilerplate)

**Interfaces:**
- Consumes: `getCurrentGymContext` from `@/lib/auth/gym-context` (returns `{ user, isStaff, gym, ... }`, `gym.id` is a string); `getCurrentAdminContext` from `@/lib/auth/admin-server` (returns `{ user, profile, gym, ... }`); `isStaffRole` from `@/lib/auth/roles`; `Tables<'gyms'>` / `UpdateTables<'gyms'>` / `QueryResult` from `@/lib/types` (from Task 1's regenerated types).
- Produces: `updateMembershipFeeSettings(formData: FormData): Promise<{ error: string } | { success: true }>` exported from `app/admin/settings/membership-fees/actions.ts`. `MembershipFeesSettings` component with props `{ gym: { default_admission_fee: number; allow_admission_fee_waiver: boolean; allow_custom_membership_start_date: boolean } }`, default export from `components/settings/MembershipFeesSettings.tsx`. Task 3 does not depend on this task, but both read the same `gyms` columns.

- [ ] **Step 1: Write the server action**

Create `app/admin/settings/membership-fees/actions.ts`:

```typescript
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

export async function updateMembershipFeeSettings(formData: FormData) {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to change these settings.' }
    }

    const feeValue = (formData.get('default_admission_fee') as string | null)?.trim()
    const fee = Number(feeValue)

    if (!feeValue || !Number.isFinite(fee) || fee < 0) {
        return { error: 'Default admission fee must be a non-negative number.' }
    }

    const allowWaiver = formData.get('allow_admission_fee_waiver') === 'true'
    const allowCustomStartDate = formData.get('allow_custom_membership_start_date') === 'true'

    const supabase = await createClient()
    const { error } = await supabase
        .from('gyms')
        .update(({
            default_admission_fee: fee,
            allow_admission_fee_waiver: allowWaiver,
            allow_custom_membership_start_date: allowCustomStartDate,
        } satisfies UpdateTables<'gyms'>) as never)
        .eq('id', viewer.gym.id)

    if (error) return { error: getErrorMessage(error, 'Failed to update membership & fee settings') }

    revalidatePath('/admin/settings/membership-fees')
    revalidatePath('/admin/members/add')
    return { success: true }
}
```

- [ ] **Step 2: Write the settings component**

Create `components/settings/MembershipFeesSettings.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Ban, CreditCard, Loader2, Tag, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import LoadingLinkButton from '@/components/ui/loading-link-button'
import { useAdminTheme } from '@/components/layout/AdminThemeContext'
import { updateMembershipFeeSettings } from '@/app/admin/settings/membership-fees/actions'

interface MembershipFeesSettingsProps {
    gym: {
        default_admission_fee: number
        allow_admission_fee_waiver: boolean
        allow_custom_membership_start_date: boolean
    }
}

function ToggleRow({
    label,
    description,
    checked,
    onChange,
    disabled,
}: {
    label: string
    description: string
    checked: boolean
    onChange: (next: boolean) => void
    disabled?: boolean
}) {
    const { isDark } = useAdminTheme()
    return (
        <div className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                <p className={`mt-0.5 text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{description}</p>
            </div>
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    checked
                        ? isDark
                            ? 'border-[#10b981]/30 bg-[#10b981]/10 text-[#8df0c9] hover:bg-[#10b981]/20'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        : isDark
                            ? 'border-[#2a2a2a] bg-[#161616] text-zinc-400 hover:bg-[#222222]'
                            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
            >
                {checked ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                {checked ? 'On' : 'Off'}
            </button>
        </div>
    )
}

export default function MembershipFeesSettings({ gym }: MembershipFeesSettingsProps) {
    const { isDark } = useAdminTheme()
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const [fee, setFee] = useState(String(gym.default_admission_fee))
    const [allowWaiver, setAllowWaiver] = useState(gym.allow_admission_fee_waiver)
    const [allowCustomStartDate, setAllowCustomStartDate] = useState(gym.allow_custom_membership_start_date)
    const [feeTouched, setFeeTouched] = useState(false)

    const feeNumber = Number(fee)
    const feeError = feeTouched && (fee.trim() === '' || !Number.isFinite(feeNumber) || feeNumber < 0)
        ? 'Enter a valid amount of 0 or more'
        : null

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setFeeTouched(true)
        if (fee.trim() === '' || !Number.isFinite(feeNumber) || feeNumber < 0) return

        const fd = new FormData()
        fd.append('default_admission_fee', fee)
        fd.append('allow_admission_fee_waiver', String(allowWaiver))
        fd.append('allow_custom_membership_start_date', String(allowCustomStartDate))

        startTransition(async () => {
            const result = await updateMembershipFeeSettings(fd)
            if ('error' in result) toast.error(result.error)
            else { toast.success('Membership & fee settings saved'); router.refresh() }
        })
    }

    const cardClass = `rounded-xl p-6 ${
        isDark
            ? 'border border-[#2a2a2a] bg-[#1c1c1c] shadow-[0_18px_40px_rgba(0,0,0,0.24)]'
            : 'border border-gray-200 bg-white shadow-sm'
    }`

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <LoadingLinkButton
                    href="/admin/settings"
                    loadingText="Going back..."
                    variant="ghost"
                    className={`mb-3 flex h-9 items-center gap-1.5 rounded-xl px-2 ${
                        isDark ? 'text-zinc-300 hover:bg-[#242424] hover:text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="text-sm font-medium">Settings</span>
                </LoadingLinkButton>
                <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Membership & Fees</h1>
                <p className={`mt-0.5 text-sm ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    Admission fees and default membership terms.
                </p>
            </div>

            <div className={cardClass}>
                <div className="mb-4 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <Tag className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fees</h2>
                </div>

                <div className="max-w-xs space-y-1.5">
                    <Label className={`text-xs font-medium ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
                        Default Admission Fee
                    </Label>
                    <div className="relative">
                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>₹</span>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={fee}
                            onChange={(e) => { setFee(e.target.value); setFeeTouched(true) }}
                            disabled={pending}
                            className={`h-10 pl-7 text-sm ${
                                feeError
                                    ? 'border-red-400 focus:ring-red-400'
                                    : isDark ? 'border-[#2a2a2a] bg-[#161616] text-white' : 'border-gray-300'
                            }`}
                        />
                    </div>
                    {feeError ? (
                        <p className="text-[11px] text-red-500 flex items-center gap-1"><span>⚠</span> {feeError}</p>
                    ) : (
                        <p className={`text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                            One-time fee charged when a member joins. Not applied to renewals.
                        </p>
                    )}
                </div>
            </div>

            <div className={cardClass}>
                <div className="mb-1 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-[#10b981]/15' : 'bg-blue-50'}`}>
                        <CreditCard className={`h-4 w-4 ${isDark ? 'text-[#10b981]' : 'text-blue-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Membership Defaults</h2>
                </div>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
                    New memberships start on the payment/registration date by default.
                </p>
                <div className={`mt-2 divide-y ${isDark ? 'divide-[#2a2a2a]' : 'divide-gray-100'}`}>
                    <ToggleRow
                        label="Allow staff to pick a different start date"
                        description="When on, staff can override the membership start date during Add Member."
                        checked={allowCustomStartDate}
                        onChange={setAllowCustomStartDate}
                        disabled={pending}
                    />
                </div>
            </div>

            <div className={cardClass}>
                <div className="mb-1 flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isDark ? 'bg-amber-500/15' : 'bg-amber-50'}`}>
                        <Ban className={`h-4 w-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    </div>
                    <h2 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fee Options</h2>
                </div>
                <div className={`mt-2 divide-y ${isDark ? 'divide-[#2a2a2a]' : 'divide-gray-100'}`}>
                    <ToggleRow
                        label="Allow staff to waive admission fee"
                        description="When off, staff must use the configured default with no edit or waive option."
                        checked={allowWaiver}
                        onChange={setAllowWaiver}
                        disabled={pending}
                    />
                </div>
            </div>

            <div>
                <Button
                    type="submit"
                    disabled={pending}
                    className={`h-10 px-6 font-semibold shadow-sm ${
                        isDark ? 'bg-[#10b981] hover:bg-[#0ea271] text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                >
                    {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>
            </div>
        </form>
    )
}
```

- [ ] **Step 3: Replace the placeholder page**

Replace the full contents of `app/admin/settings/membership-fees/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'
import MembershipFeesSettings from '@/components/settings/MembershipFeesSettings'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult, Tables } from '@/lib/types'

type GymFeeSettings = Pick<Tables<'gyms'>, 'default_admission_fee' | 'allow_admission_fee_waiver' | 'allow_custom_membership_start_date'>

export default async function MembershipFeesSettingsPage() {
    const { user, profile, gym } = await getCurrentAdminContext()

    if (!user) redirect('/login')
    if (!profile || !isStaffRole(profile.role) || !gym) redirect('/member/dashboard')

    const supabase = await createClient()
    const gymResult = await supabase
        .from('gyms')
        .select('default_admission_fee, allow_admission_fee_waiver, allow_custom_membership_start_date')
        .eq('id', gym.id)
        .single()
    const { data: gymSettings } = gymResult as unknown as QueryResult<GymFeeSettings | null>

    return (
        <MembershipFeesSettings
            gym={{
                default_admission_fee: gymSettings?.default_admission_fee ?? 0,
                allow_admission_fee_waiver: gymSettings?.allow_admission_fee_waiver ?? true,
                allow_custom_membership_start_date: gymSettings?.allow_custom_membership_start_date ?? false,
            }}
        />
    )
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run `npm run dev`, log in as staff, open `/admin/settings/membership-fees`:
- Confirm the page shows the three cards (Fees, Membership Defaults, Fee Options) instead of the old placeholder.
- Set Default Admission Fee to `500`, toggle both switches, click Save Changes. Expect a success toast.
- Refresh the page (full reload, not just client nav). Expect the fee still reads `500` and both toggles retain their new state — this confirms persistence.
- Try clearing the fee field and saving. Expect an inline validation message and no toast/success.

- [ ] **Step 6: Commit**

```bash
git add app/admin/settings/membership-fees/actions.ts app/admin/settings/membership-fees/page.tsx components/settings/MembershipFeesSettings.tsx
git commit -m "Implement Membership & Fees settings page"
```

---

### Task 3: Add Member — admission fee + start date integration

**Files:**
- Modify: `app/admin/members/add/page.tsx`
- Modify: `components/forms/AddMemberForm.tsx`
- Modify: `app/admin/members/actions.ts` (`createMember` only)

**Interfaces:**
- Consumes: `Tables<'gyms'>` / `QueryResult` from `@/lib/types` (Task 1); `getCurrentAdminContext` from `@/lib/auth/admin-server`.
- Produces: `AddMemberForm` gains a required prop `gymSettings: { defaultAdmissionFee: number; allowAdmissionFeeWaiver: boolean; allowCustomStartDate: boolean }`. The submitted `FormData` gains fields `admission_fee` (string, always present) and `membership_start_date` (string, present only when `allowCustomStartDate` is true). `createMember` writes `payments.admission_fee_amount` and computes `payments.amount = plan.price + admissionFee`.

- [ ] **Step 1: Fetch gym settings in the Add Member page**

Replace the full contents of `app/admin/members/add/page.tsx` with:

```tsx
import { createClient } from '@/lib/supabase/server'
import AddMemberForm from '@/components/forms/AddMemberForm'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import type { QueryResult, Tables } from '@/lib/types'

type GymFeeSettings = Pick<Tables<'gyms'>, 'default_admission_fee' | 'allow_admission_fee_waiver' | 'allow_custom_membership_start_date'>

export default async function AddMemberPage() {
    const supabase = await createClient()
    const { gym } = await getCurrentAdminContext()

    const { data: plans } = await supabase
        .from('membership_plans')
        .select('id, name, duration_days, price')
        .order('price')

    let gymSettings = { defaultAdmissionFee: 0, allowAdmissionFeeWaiver: true, allowCustomStartDate: false }
    if (gym) {
        const gymResult = await supabase
            .from('gyms')
            .select('default_admission_fee, allow_admission_fee_waiver, allow_custom_membership_start_date')
            .eq('id', gym.id)
            .single()
        const { data: gymRow } = gymResult as unknown as QueryResult<GymFeeSettings | null>
        if (gymRow) {
            gymSettings = {
                defaultAdmissionFee: gymRow.default_admission_fee,
                allowAdmissionFeeWaiver: gymRow.allow_admission_fee_waiver,
                allowCustomStartDate: gymRow.allow_custom_membership_start_date,
            }
        }
    }

    return <AddMemberForm plans={plans || []} gymSettings={gymSettings} />
}
```

- [ ] **Step 2: Update `AddMemberForm` props and state**

In `components/forms/AddMemberForm.tsx`, replace the props interface and the top of the component (originally lines 24–43):

```tsx
interface AddMemberFormProps {
    plans: { id: string; name: string; duration_days: number; price: number }[]
    gymSettings: {
        defaultAdmissionFee: number
        allowAdmissionFeeWaiver: boolean
        allowCustomStartDate: boolean
    }
}

export default function AddMemberForm({ plans, gymSettings }: AddMemberFormProps) {
    const router = useRouter()
    const { isDark } = useAdminTheme()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cameraInputRef = useRef<HTMLInputElement>(null)

    const [loading, setLoading] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [phone, setPhone] = useState('+91')
    const [gender, setGender] = useState<'male' | 'female' | 'other'>('male')
    const [photoPreview, setPhotoPreview] = useState<string | null>(null)
    const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [admissionFee, setAdmissionFee] = useState(String(gymSettings.defaultAdmissionFee))
    const [admissionFeeWaived, setAdmissionFeeWaived] = useState(false)
    const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
    const [photoError, setPhotoError] = useState<string | null>(null)
    const [loadingMessage, setLoadingMessage] = useState('')
```

- [ ] **Step 3: Add computed totals and submit the new fields**

Immediately before the `handleSubmit` function (originally line 83), add:

```tsx
    const planAmountNumber = Number(paymentAmount) || 0
    const admissionFeeNumber = admissionFeeWaived ? 0 : (Number(admissionFee) || 0)
    const totalAmount = planAmountNumber + admissionFeeNumber

```

Inside `handleSubmit`, right after `formData.append('gender', gender)` (originally line 97), add:

```tsx
            formData.set('admission_fee', String(admissionFeeNumber))
            if (gymSettings.allowCustomStartDate) {
                formData.set('membership_start_date', startDate)
            }
```

- [ ] **Step 4: Replace the Payment Information section**

Replace the entire `{/* ── Payment Information (divider section) ── */}` block (originally lines 379–421) with:

```tsx
                    {/* ── Payment Information (divider section) ── */}
                    <div className="border-t border-gray-200 pt-5 space-y-4">
                        <h2 className="text-base font-bold text-gray-900">Payment Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {/* Plan Amount */}
                            <div className="space-y-1.5">
                                <Label htmlFor="payment_amount" className="text-sm font-medium text-gray-700">Plan Amount</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₹</span>
                                    <Input
                                        id="payment_amount"
                                        name="payment_amount"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={paymentAmount}
                                        readOnly
                                        disabled={loading}
                                        className="h-10 pl-7 border-gray-300 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-gray-700">
                                    Payment Method <span className="text-red-500">*</span>
                                </Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={loading}>
                                    <SelectTrigger className="h-10 border-gray-300 text-sm text-gray-700">
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="upi">UPI</SelectItem>
                                        <SelectItem value="card">Card</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Admission Fee */}
                            <div className="space-y-1.5">
                                <Label htmlFor="admission_fee" className="text-sm font-medium text-gray-700">
                                    Admission Fee <span className="text-gray-400 font-normal">(one-time)</span>
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₹</span>
                                    <Input
                                        id="admission_fee"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={admissionFeeWaived ? '0' : admissionFee}
                                        onChange={(e) => setAdmissionFee(e.target.value)}
                                        readOnly={!gymSettings.allowAdmissionFeeWaiver || admissionFeeWaived}
                                        disabled={loading || !gymSettings.allowAdmissionFeeWaiver}
                                        className="h-10 pl-7 border-gray-300 text-sm"
                                    />
                                </div>
                                {gymSettings.allowAdmissionFeeWaiver ? (
                                    <label className="flex items-center gap-2 pt-1 text-xs text-gray-600 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={admissionFeeWaived}
                                            onChange={(e) => setAdmissionFeeWaived(e.target.checked)}
                                            disabled={loading}
                                            className="h-3.5 w-3.5 accent-blue-600"
                                        />
                                        Waive admission fee for this member
                                    </label>
                                ) : (
                                    <p className="text-xs text-gray-400">Set by your gym&apos;s Membership &amp; Fees settings.</p>
                                )}
                            </div>

                            {/* Total */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium text-gray-700">Total Due</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">₹</span>
                                    <Input
                                        type="number"
                                        readOnly
                                        disabled
                                        value={totalAmount.toFixed(2)}
                                        className="h-10 pl-7 border-gray-300 text-sm font-semibold text-gray-900 bg-gray-50"
                                    />
                                </div>
                                <p className="text-xs text-gray-400">Plan amount + admission fee</p>
                            </div>

                            {gymSettings.allowCustomStartDate ? (
                                <div className="space-y-1.5">
                                    <Label htmlFor="membership_start_date_input" className="text-sm font-medium text-gray-700">
                                        Membership Start Date
                                    </Label>
                                    <Input
                                        id="membership_start_date_input"
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        disabled={loading}
                                        className="h-10 border-gray-300 text-sm text-gray-500"
                                    />
                                    <p className="text-xs text-gray-400">Defaults to today. Change only if this membership should start on a different date.</p>
                                </div>
                            ) : null}
                        </div>
                    </div>
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Update `createMember` to compute and persist the admission fee**

In `app/admin/members/actions.ts`:

Change the import line (originally line 4) to include `Tables`:

```typescript
import type { InsertTables, QueryResult, Tables, UpdateTables } from '@/lib/types'
```

After the existing field-parsing block (originally lines 83–89, ending with the `paymentMethod` line), add:

```tsx
        const admissionFeeValue = (formData.get('admission_fee') as string | null)?.trim()
        const admissionFee = admissionFeeValue && Number.isFinite(Number(admissionFeeValue)) && Number(admissionFeeValue) >= 0
            ? Number(admissionFeeValue)
            : 0
        const requestedStartDate = (formData.get('membership_start_date') as string | null)?.trim() || null
```

Replace the plan-fetch block's immediately following start-date logic. Originally:

```typescript
        // Start date is set automatically to the creation date.
        const startDate = new Date()
        const expiryDate = new Date(startDate)
        expiryDate.setDate(expiryDate.getDate() + plan.duration_days)
```

Replace with:

```typescript
        const gymSettingsResult = await supabase
            .from('gyms')
            .select('allow_custom_membership_start_date')
            .eq('id', viewer.gym.id)
            .single()
        const { data: gymSettingsRow } = gymSettingsResult as unknown as QueryResult<Pick<Tables<'gyms'>, 'allow_custom_membership_start_date'> | null>
        const allowCustomStartDate = gymSettingsRow?.allow_custom_membership_start_date ?? false

        // Start date defaults to today unless the gym allows staff to override it.
        const startDate = allowCustomStartDate && requestedStartDate ? new Date(requestedStartDate) : new Date()
        if (Number.isNaN(startDate.getTime())) {
            return { error: 'Membership start date is invalid.' }
        }
        const expiryDate = new Date(startDate)
        expiryDate.setDate(expiryDate.getDate() + plan.duration_days)
```

Replace the payment payload block. Originally:

```typescript
        // Create initial payment record
        const paymentPayload: InsertTables<'payments'> = {
            gym_id: viewer.gym.id,
            member_id: member.id,
            amount: Number(paymentAmountValue),
            payment_method: paymentMethod,
            payment_date: new Date().toISOString().split('T')[0],
            notes: 'Initial membership fee',
        }
```

Replace with:

```typescript
        // Create initial payment record
        const planAmount = Number(paymentAmountValue)
        const totalAmount = planAmount + admissionFee

        const paymentPayload: InsertTables<'payments'> = {
            gym_id: viewer.gym.id,
            member_id: member.id,
            amount: totalAmount,
            admission_fee_amount: admissionFee,
            payment_method: paymentMethod,
            payment_date: new Date().toISOString().split('T')[0],
            notes: 'Initial membership fee',
        }
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Manual verification**

With the dev server running and default admission fee set to `500` (from Task 2's verification), `allow_admission_fee_waiver` on, `allow_custom_membership_start_date` off:
- Open `/admin/members/add`, pick a plan. Confirm Admission Fee auto-fills to `500` and Total Due = plan price + 500.
- Change Admission Fee to `250`. Confirm Total Due updates live. No "Membership Start Date" field should be visible (setting is off).
- Check "Waive admission fee for this member". Confirm the field shows `0` (readonly while checked) and Total Due drops to just the plan price.
- Submit the form (fill required fields). Confirm member creation succeeds and you land on the member detail page.

- [ ] **Step 9: Verify the persisted payment row**

Run via `mcp__plugin_supabase_supabase__execute_sql` (project_id `blskfhoboxonvisoalpa`), substituting the member's email or name:

```sql
select p.amount, p.admission_fee_amount, m.full_name
from public.payments p
join public.members m on m.id = p.member_id
order by p.created_at desc
limit 1;
```

Expected: `admission_fee_amount` matches what was charged for that member (e.g. `0` if waived), and `amount` equals plan price + that admission fee.

- [ ] **Step 10: Verify historical payments are immune to later default changes**

In the Membership & Fees settings page, change Default Admission Fee to a new value (e.g. `999`) and save. Re-run the query from Step 9 for the same payment row. Expected: `amount` and `admission_fee_amount` are unchanged from Step 9 — only new members created after this point pick up `999`.

- [ ] **Step 11: Verify renewals are unaffected**

Open `/admin/finances/payments/record` (the renewal/record-payment flow) and confirm there is no admission fee field or any reference to it — this flow was not modified, so this should already be true; the check is to catch an accidental cross-edit.

- [ ] **Step 12: Commit**

```bash
git add app/admin/members/add/page.tsx components/forms/AddMemberForm.tsx app/admin/members/actions.ts
git commit -m "Integrate admission fee and start-date defaults into Add Member"
```

---

### Task 4: End-to-end regression pass

**Files:** none (verification only; fix forward in the relevant file from Tasks 1–3 if something fails).

**Interfaces:**
- Consumes: everything from Tasks 1–3.
- Produces: confidence that existing Plans/Payments/Members/Settings features still work and every spec requirement is satisfiable end-to-end.

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Start the dev server and smoke-test unrelated admin pages**

Run: `npm run dev`, then as staff visit and confirm each loads without error: `/admin/dashboard`, `/admin/members`, `/admin/plans`, `/admin/finances/payments`, `/admin/finances/expenses`, `/admin/settings`.

- [ ] **Step 3: Re-check the fee-waiver-disabled path**

In `/admin/settings/membership-fees`, turn "Allow staff to waive admission fee" off and save. Open `/admin/members/add`. Confirm the Admission Fee field is now disabled/readonly and shows the configured default with no checkbox to waive it.

- [ ] **Step 4: Re-check the custom-start-date-enabled path**

In `/admin/settings/membership-fees`, turn "Allow staff to pick a different start date" on and save. Open `/admin/members/add`. Confirm a "Membership Start Date" field appears, defaulted to today, editable. Create a member with a past date and confirm (via the member detail page or an `execute_sql` check on `members.membership_start_date`/`membership_expiry_date`) the dates reflect the chosen start date plus the plan's duration.

- [ ] **Step 5: Confirm advisories are unaffected**

Run `mcp__plugin_supabase_supabase__get_advisors` with `project_id` `blskfhoboxonvisoalpa` and `type` `security`. Confirm no new advisories were introduced by this migration (the pre-existing RLS-disabled advisory for `fitness_profiles`/`workout_plans`/`nutrition_plans`/`chat_messages` is unrelated and out of scope for this task — do not fix it here, just confirm nothing new appeared).

- [ ] **Step 6: Final commit (only if Steps 1–5 required fixes)**

If any step above required a code fix, stage and commit it with a message describing the specific regression fixed. If everything passed as implemented in Tasks 1–3, no commit is needed here.
