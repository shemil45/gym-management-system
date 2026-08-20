# Receipt Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add gym-level Receipt Settings (numbering, branding toggles, footer/notes) and connect them to the existing "invoice" payment-detail document, relabeling it as a receipt.

**Architecture:** One new migration adds settings columns to `gyms`, a `receipt_number` column to `payments`, and an atomic numbering function. Two existing payment-insert call sites are updated to call that function. The two existing payment-detail read paths (`lib/payments/get-payment-result.ts` for admin/staff, `app/member/plans/actions.ts#getPaymentResult` for members) are extended to join gym branding + member identity. `app/invoice/ResultClient.tsx` (the existing receipt UI + jsPDF download, reused as-is) is updated to render the new data and relabel INVOICE→RECEIPT. A new Settings page replaces the `invoice-receipt` placeholder, following the Gym Profile settings pattern exactly.

**Tech Stack:** Next.js 16 (App Router, RSC + server actions), Supabase (Postgres + RLS), TypeScript, Tailwind, jsPDF. No test framework is configured in this repo (no jest/vitest/playwright) — verification is via `npx tsc --noEmit`, `npm run lint`, `npm run build`, direct SQL checks against the live Supabase project (`gym-management`, ref `blskfhoboxonvisoalpa`) via the `mcp__supabase__*` tools, and manual browser smoke tests via `npm run dev`.

**Spec:** `docs/superpowers/specs/2026-08-20-receipt-settings-design.md`

## Global Constraints

- Do NOT rename or restructure the existing `/invoice` route or its `?invoice=` query param — internal plumbing, not user-facing.
- Do NOT touch `payments.invoice_number` generation/values — it stays as the internal lookup key. Only add `receipt_number` alongside it.
- Do NOT implement unpaid invoices, partial payments, outstanding balances, invoice status/workflow, or invoice-to-payment relationships (GMS is immediate-payment-only).
- Do NOT regenerate/change a receipt number when viewing or downloading an existing transaction — it is assigned once, at insert time, and read thereafter.
- Follow the exact Gym Profile settings pattern for the new page: server `page.tsx` (auth guard + gym-scoped select) → client form component → `'use server'` action in `actions.ts` → `revalidatePath`.
- Migration file naming: `YYYYMMDDHHMMSS_snake_case_name.sql` (the convention used by every migration after `010_platform_admin_bootstrap.sql`).
- Reuse existing `jsPDF`-based PDF generation in `ResultClient.tsx` — do not add a second PDF library or a server-side PDF pipeline.

---

## Task 1: Database migration — receipt settings columns, receipt_number, numbering function

**Files:**
- Create: `supabase/migrations/20260820150000_receipt_settings.sql`

**Interfaces:**
- Produces: `public.generate_receipt_number(p_gym_id uuid) returns text` — SQL RPC callable via `supabase.rpc('generate_receipt_number', { p_gym_id })`, returns the newly assigned receipt number as text (e.g. `'REC-000001'`). Also produces new columns: `gyms.receipt_prefix text`, `gyms.receipt_next_number integer`, `gyms.receipt_show_logo boolean`, `gyms.receipt_show_address boolean`, `gyms.receipt_show_phone boolean`, `gyms.receipt_show_email boolean`, `gyms.receipt_show_gstin boolean`, `gyms.receipt_footer_message text`, `gyms.receipt_additional_notes text`, `payments.receipt_number text unique`.

- [ ] **Step 1: Write the migration file**

```sql
-- UP
ALTER TABLE public.gyms
    ADD COLUMN receipt_prefix text NOT NULL DEFAULT 'REC-',
    ADD COLUMN receipt_next_number integer NOT NULL DEFAULT 1,
    ADD COLUMN receipt_show_logo boolean NOT NULL DEFAULT true,
    ADD COLUMN receipt_show_address boolean NOT NULL DEFAULT true,
    ADD COLUMN receipt_show_phone boolean NOT NULL DEFAULT true,
    ADD COLUMN receipt_show_email boolean NOT NULL DEFAULT true,
    ADD COLUMN receipt_show_gstin boolean NOT NULL DEFAULT true,
    ADD COLUMN receipt_footer_message text NULL,
    ADD COLUMN receipt_additional_notes text NULL;

ALTER TABLE public.gyms
    ADD CONSTRAINT gyms_receipt_next_number_positive CHECK (receipt_next_number > 0),
    ADD CONSTRAINT gyms_receipt_prefix_not_blank CHECK (btrim(receipt_prefix) <> '');

ALTER TABLE public.payments
    ADD COLUMN receipt_number text NULL;

ALTER TABLE public.payments
    ADD CONSTRAINT payments_receipt_number_unique UNIQUE (receipt_number);

-- Column-scoped grant, mirroring 20260820120000_gym_profile_settings.sql
-- (additive: authenticated already has UPDATE restricted to a specific
-- column set by 20260819160312_membership_fees_settings.sql; this adds
-- the new receipt_* columns to that allow-list without a REVOKE).
GRANT UPDATE (
    receipt_prefix, receipt_next_number, receipt_show_logo,
    receipt_show_address, receipt_show_phone, receipt_show_email,
    receipt_show_gstin, receipt_footer_message, receipt_additional_notes
) ON public.gyms TO authenticated;

CREATE OR REPLACE FUNCTION public.generate_receipt_number(p_gym_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix text;
    v_assigned integer;
BEGIN
    IF NOT public.user_has_gym_access(p_gym_id) THEN
        RAISE EXCEPTION 'Not authorized for gym %', p_gym_id;
    END IF;

    UPDATE public.gyms
    SET receipt_next_number = receipt_next_number + 1
    WHERE id = p_gym_id
    RETURNING receipt_prefix, receipt_next_number - 1
    INTO v_prefix, v_assigned;

    IF v_prefix IS NULL THEN
        RAISE EXCEPTION 'Gym % not found', p_gym_id;
    END IF;

    RETURN v_prefix || lpad(v_assigned::text, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_receipt_number(uuid) TO authenticated;

-- DOWN / rollback
-- REVOKE EXECUTE ON FUNCTION public.generate_receipt_number(uuid) FROM authenticated;
-- DROP FUNCTION IF EXISTS public.generate_receipt_number(uuid);
-- REVOKE UPDATE (receipt_prefix, receipt_next_number, receipt_show_logo, receipt_show_address, receipt_show_phone, receipt_show_email, receipt_show_gstin, receipt_footer_message, receipt_additional_notes) ON public.gyms FROM authenticated;
-- ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_receipt_number_unique;
-- ALTER TABLE public.payments DROP COLUMN IF EXISTS receipt_number;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_receipt_prefix_not_blank;
-- ALTER TABLE public.gyms DROP CONSTRAINT IF EXISTS gyms_receipt_next_number_positive;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_additional_notes;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_footer_message;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_show_gstin;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_show_email;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_show_phone;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_show_address;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_show_logo;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_next_number;
-- ALTER TABLE public.gyms DROP COLUMN IF EXISTS receipt_prefix;
```

- [ ] **Step 2: Apply the migration to the `gym-management` Supabase project**

Use `mcp__supabase__apply_migration` with `name: "receipt_settings"` and the SQL above as `query`. (This runs against the live project referenced in memory: `gym-management` / `blskfhoboxonvisoalpa`.)

- [ ] **Step 3: Verify columns and function exist**

Run via `mcp__supabase__execute_sql`:

```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'gyms' and column_name like 'receipt_%'
order by column_name;

select column_name from information_schema.columns
where table_name = 'payments' and column_name = 'receipt_number';

select proname from pg_proc where proname = 'generate_receipt_number';
```

Expected: 9 `gyms.receipt_*` rows, 1 `payments.receipt_number` row, 1 function row.

- [ ] **Step 4: Sanity-test the numbering function end-to-end**

```sql
-- Pick any existing gym id from your data, e.g.:
select id from public.gyms limit 1;

-- Then, as a one-off manual check (run with a service-role/SQL-editor
-- context that bypasses the auth.uid()-based user_has_gym_access check,
-- e.g. temporarily via execute_sql which runs with elevated privileges):
select public.generate_receipt_number('<that gym id>');
select public.generate_receipt_number('<that gym id>');
-- Expect two different sequential values, e.g. 'REC-000001', 'REC-000002'
-- (or continuing from whatever receipt_next_number currently is).
```

- [ ] **Step 5: Regenerate TypeScript types and commit**

Run `mcp__supabase__generate_typescript_types` and manually diff against `lib/types/database.types.ts` — add the new `gyms` columns (`receipt_prefix: string`, `receipt_next_number: number`, `receipt_show_logo: boolean`, `receipt_show_address: boolean`, `receipt_show_phone: boolean`, `receipt_show_email: boolean`, `receipt_show_gstin: boolean`, `receipt_footer_message: string | null`, `receipt_additional_notes: string | null`) to the `gyms` table's `Row`/`Insert`/`Update` shapes, and `receipt_number: string | null` to `payments`' `Row`/`Insert`/`Update` shapes, at the same locations as the other columns for those tables.

```bash
git add supabase/migrations/20260820150000_receipt_settings.sql lib/types/database.types.ts
git commit -m "Add receipt settings columns and atomic receipt numbering function"
```

---

## Task 2: Wire receipt-number generation into the admin `recordPayment` action

**Files:**
- Modify: `app/admin/finances/payments/actions.ts:14-115`

**Interfaces:**
- Consumes: `public.generate_receipt_number(p_gym_id uuid) returns text` (Task 1), via `supabase.rpc('generate_receipt_number', { p_gym_id: gymId })`.
- Produces: `payments.receipt_number` populated on every admin-recorded payment going forward.

- [ ] **Step 1: Determine the gym id before building the insert payload**

The current code never fetches `gym_id` before insert (it reads it back from the insert result at line 85). Fetch it up front instead, from the member row already being queried in the `renewMembership` branch — but since that branch is conditional, add an unconditional gym lookup. Insert this right after the `if (!memberId || !amount || !paymentMethod)` guard (around line 29):

```ts
        const memberGymResult = await supabase
            .from('members')
            .select('gym_id')
            .eq('id', memberId)
            .single()
        const { data: memberGymRow, error: memberGymError } = memberGymResult as unknown as QueryResult<{ gym_id: string | null } | null>

        if (memberGymError) return { error: getErrorMessage(memberGymError, 'Failed to resolve member') }
        if (!memberGymRow?.gym_id) return { error: 'Member is not linked to a gym' }

        const { data: receiptNumber, error: receiptNumberError } = await supabase.rpc('generate_receipt_number', {
            p_gym_id: memberGymRow.gym_id,
        })

        if (receiptNumberError) return { error: getErrorMessage(receiptNumberError, 'Failed to generate receipt number') }
```

- [ ] **Step 2: Include `receipt_number` in the insert payload**

Modify the `paymentPayload` object (currently lines 70-80):

```ts
        const paymentPayload: InsertTables<'payments'> = {
            member_id: memberId,
            amount,
            payment_method: paymentMethod as InsertTables<'payments'>['payment_method'],
            payment_status: paymentStatus as InsertTables<'payments'>['payment_status'],
            payment_date: paymentDate,
            invoice_number: invoiceNumber,
            receipt_number: receiptNumber,
            notes,
            membership_start_date: membershipStartDate,
            membership_end_date: membershipEndDate,
        }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `app/admin/finances/payments/actions.ts` (requires Task 1's type regeneration to already be committed).

- [ ] **Step 4: Commit**

```bash
git add app/admin/finances/payments/actions.ts
git commit -m "Generate receipt numbers for admin-recorded payments"
```

---

## Task 3: Wire receipt-number generation into the member self-serve purchase flow

**Files:**
- Modify: `app/member/plans/actions.ts` (the `createRazorpayOrder`/free-plan insert path and the `verifyRazorpayPayment` paid-plan insert path — locate via the `invoice_number: context.invoiceNumber` occurrences found at lines 155 and 282 in exploration)

**Interfaces:**
- Consumes: `public.generate_receipt_number(p_gym_id uuid) returns text` (Task 1), `PurchaseContext.gymId` (existing field, already present per exploration at line 16).
- Produces: `payments.receipt_number` populated for both the free-plan-immediate-paid path and the Razorpay-paid path.

- [ ] **Step 1: Read the two insert call sites**

Read `app/member/plans/actions.ts` in full to find the exact surrounding code for both inserts (the free-plan path around line ~150 and the pending-Razorpay-order path around line ~280), since line numbers in this plan are from an earlier exploration pass and must be re-confirmed against the current file before editing.

- [ ] **Step 2: Add a receipt-number lookup before each insert**

At each of the two insert sites, before constructing the insert payload, add (using the request-scoped Supabase client already in scope at that point — check whether the surrounding function uses `supabaseAdmin` or a user-scoped client; `generate_receipt_number` is `SECURITY DEFINER` so it works via either, but must be called with `.rpc(...)` on whichever client is already imported in that function):

```ts
        const { data: receiptNumber, error: receiptNumberError } = await supabaseAdmin.rpc('generate_receipt_number', {
            p_gym_id: context.gymId,
        })
        if (receiptNumberError) {
            return { error: receiptNumberError.message || 'Failed to generate receipt number' }
        }
```

Adjust the client variable name to match what's actually in scope at each call site.

- [ ] **Step 3: Add `receipt_number: receiptNumber` to both insert payloads**

Both payloads currently include `invoice_number: context.invoiceNumber,` (lines 155 and 282 per exploration) — add `receipt_number: receiptNumber,` immediately after that line in both places.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `app/member/plans/actions.ts`.

- [ ] **Step 5: Commit**

```bash
git add app/member/plans/actions.ts
git commit -m "Generate receipt numbers for member self-serve plan purchases"
```

---

## Task 4: Extend payment-result read paths with member, gym-branding, and receipt data

**Files:**
- Modify: `lib/payments/get-payment-result.ts` (admin/staff viewer path)
- Modify: `app/member/plans/actions.ts` — `getPaymentResult` function (member viewer path)

**Interfaces:**
- Produces: `PaymentResult['payment']` (in `lib/payments/get-payment-result.ts`) and `PaymentResultDetails['payment']` (in `app/member/plans/actions.ts`) both grow these fields:
  - `receiptNumber: string | null`
  - `admissionFeeAmount: number | null`
  - `memberDisplayId: string` (the human-readable `members.member_id` code)
  - `memberFullName: string`
  - `gym: { name: string; logoUrl: string | null; address: string | null; city: string | null; state: string | null; postalCode: string | null; country: string | null; contactPhone: string | null; contactEmail: string | null; gstin: string | null; showLogo: boolean; showAddress: boolean; showPhone: boolean; showEmail: boolean; showGstin: boolean; footerMessage: string | null; additionalNotes: string | null }`
- Consumes downstream by: Task 6 (`ResultClient.tsx`).

- [ ] **Step 1: Extend the admin/staff query in `lib/payments/get-payment-result.ts`**

Replace the `.select(...)` at line 37 and the `payment` destructure/return (lines 35-77):

```ts
        let paymentQuery = supabaseAdmin
            .from('payments')
            .select(`
                member_id, amount, invoice_number, receipt_number, admission_fee_amount,
                membership_start_date, membership_end_date, payment_date, payment_method,
                payment_status, razorpay_order_id, razorpay_payment_id, notes,
                members ( member_id, full_name ),
                gyms:gym_id ( name, logo_url, address, city, state, postal_code, country, contact_phone, contact_email, gstin,
                    receipt_show_logo, receipt_show_address, receipt_show_phone, receipt_show_email, receipt_show_gstin,
                    receipt_footer_message, receipt_additional_notes )
            `)
            .eq('gym_id', viewer.gym.id)
            .eq('invoice_number', invoiceNumber)
```

Update the `PaymentResult` type (lines 6-24) to add the new fields listed in **Interfaces** above (as siblings of `invoiceNumber` etc., inside the `payment` object).

Update the return block (lines 61-77) to shape the joined rows (Supabase returns `members`/`gyms` as an object here since both are to-one relations via a foreign key):

```ts
        const member = payment.members as { member_id: string; full_name: string } | null
        const gym = payment.gyms as {
            name: string; logo_url: string | null; address: string | null; city: string | null
            state: string | null; postal_code: string | null; country: string | null
            contact_phone: string | null; contact_email: string | null; gstin: string | null
            receipt_show_logo: boolean; receipt_show_address: boolean; receipt_show_phone: boolean
            receipt_show_email: boolean; receipt_show_gstin: boolean
            receipt_footer_message: string | null; receipt_additional_notes: string | null
        } | null

        return {
            success: true,
            payment: {
                amount: finalAmount,
                coinsUsed,
                invoiceNumber: payment.invoice_number,
                receiptNumber: payment.receipt_number,
                admissionFeeAmount: payment.admission_fee_amount,
                membershipEndDate: payment.membership_end_date,
                membershipStartDate: payment.membership_start_date,
                originalPrice,
                paymentDate: payment.payment_date,
                paymentMethod: payment.payment_method,
                paymentStatus: payment.payment_status,
                planName: planNameMatch?.[1] || 'Membership Plan',
                razorpayOrderId: payment.razorpay_order_id,
                razorpayPaymentId: payment.razorpay_payment_id,
                memberDisplayId: member?.member_id ?? '-',
                memberFullName: member?.full_name ?? '-',
                gym: {
                    name: gym?.name ?? '',
                    logoUrl: gym?.logo_url ?? null,
                    address: gym?.address ?? null,
                    city: gym?.city ?? null,
                    state: gym?.state ?? null,
                    postalCode: gym?.postal_code ?? null,
                    country: gym?.country ?? null,
                    contactPhone: gym?.contact_phone ?? null,
                    contactEmail: gym?.contact_email ?? null,
                    gstin: gym?.gstin ?? null,
                    showLogo: gym?.receipt_show_logo ?? true,
                    showAddress: gym?.receipt_show_address ?? true,
                    showPhone: gym?.receipt_show_phone ?? true,
                    showEmail: gym?.receipt_show_email ?? true,
                    showGstin: gym?.receipt_show_gstin ?? true,
                    footerMessage: gym?.receipt_footer_message ?? null,
                    additionalNotes: gym?.receipt_additional_notes ?? null,
                },
            },
        }
```

- [ ] **Step 2: Mirror the same change in `app/member/plans/actions.ts#getPaymentResult`**

Apply the equivalent `.select()` extension and return-shape change to the member-portal `getPaymentResult` function (the one selecting `amount, invoice_number, membership_start_date, ...` around line 466 per exploration), and add the matching fields to the `PaymentResultDetails` success-branch type (around lines 48-60 per exploration). Keep field names identical (`receiptNumber`, `admissionFeeAmount`, `memberDisplayId`, `memberFullName`, `gym: {...}`) so `ResultClient.tsx` can consume a single shared shape regardless of which path supplied it.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors only in `app/invoice/ResultClient.tsx` (not yet updated to consume the new fields — that's Task 6) and nowhere else.

- [ ] **Step 4: Commit**

```bash
git add lib/payments/get-payment-result.ts app/member/plans/actions.ts
git commit -m "Join member identity and gym receipt branding into payment-result queries"
```

---

## Task 5: Receipt Settings page (Settings → Invoice & Receipt)

**Files:**
- Create: `app/admin/settings/invoice-receipt/actions.ts`
- Create: `components/settings/InvoiceReceiptSettings.tsx`
- Modify: `app/admin/settings/invoice-receipt/page.tsx` (replace placeholder entirely)

**Interfaces:**
- Consumes: `getCurrentAdminContext` (`lib/auth/admin-server.ts`), `isStaffRole` (`lib/auth/roles.ts`), `createClient` (`lib/supabase/server.ts`) — same imports `gym-profile/page.tsx` and `actions.ts` use.
- Produces: `updateReceiptSettings(formData: FormData): Promise<{ error: string } | { success: true }>`, exported from `app/admin/settings/invoice-receipt/actions.ts`.

- [ ] **Step 1: Write the server action**

`app/admin/settings/invoice-receipt/actions.ts`:

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import type { QueryResult, UpdateTables } from '@/lib/types'
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
```

(`QueryResult` import above is unused if no `.select()` follows the update — drop it if `tsc`/eslint flags it as unused; `gym-profile/actions.ts` uses it because it does a follow-up `.select('id')`, which isn't needed here since we don't need the row back.)

- [ ] **Step 2: Write the client form component**

`components/settings/InvoiceReceiptSettings.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { updateReceiptSettings } from '@/app/admin/settings/invoice-receipt/actions'

interface InvoiceReceiptSettingsProps {
    gym: {
        receipt_prefix: string
        receipt_next_number: number
        receipt_show_logo: boolean
        receipt_show_address: boolean
        receipt_show_phone: boolean
        receipt_show_email: boolean
        receipt_show_gstin: boolean
        receipt_footer_message: string | null
        receipt_additional_notes: string | null
        logo_url: string | null
    }
}

export default function InvoiceReceiptSettings({ gym }: InvoiceReceiptSettingsProps) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()

    const [prefix, setPrefix] = useState(gym.receipt_prefix)
    const [nextNumber, setNextNumber] = useState(String(gym.receipt_next_number))
    const [showLogo, setShowLogo] = useState(gym.receipt_show_logo)
    const [showAddress, setShowAddress] = useState(gym.receipt_show_address)
    const [showPhone, setShowPhone] = useState(gym.receipt_show_phone)
    const [showEmail, setShowEmail] = useState(gym.receipt_show_email)
    const [showGstin, setShowGstin] = useState(gym.receipt_show_gstin)
    const [footerMessage, setFooterMessage] = useState(gym.receipt_footer_message ?? '')
    const [additionalNotes, setAdditionalNotes] = useState(gym.receipt_additional_notes ?? '')

    const parsedNextNumber = parseInt(nextNumber, 10)
    const previewNumber = `${prefix || 'REC-'}${String(Number.isFinite(parsedNextNumber) && parsedNextNumber > 0 ? parsedNextNumber : 1).padStart(6, '0')}`

    const handleSave = () => {
        const formData = new FormData()
        formData.set('receipt_prefix', prefix)
        formData.set('receipt_next_number', nextNumber)
        formData.set('receipt_show_logo', String(showLogo))
        formData.set('receipt_show_address', String(showAddress))
        formData.set('receipt_show_phone', String(showPhone))
        formData.set('receipt_show_email', String(showEmail))
        formData.set('receipt_show_gstin', String(showGstin))
        formData.set('receipt_footer_message', footerMessage)
        formData.set('receipt_additional_notes', additionalNotes)

        startTransition(async () => {
            const result = await updateReceiptSettings(formData)
            if ('error' in result) {
                toast.error(result.error)
                return
            }
            toast.success('Receipt settings saved')
            router.refresh()
        })
    }

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <Link href="/admin/settings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
                <ArrowLeft className="h-4 w-4" /> Back to settings
            </Link>

            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <Receipt className="h-5 w-5" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-slate-950">Invoice &amp; Receipt</h1>
                    <p className="text-sm text-slate-500">Receipt numbering, branding, and content.</p>
                </div>
            </div>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Receipt numbering</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label htmlFor="receipt_prefix">Receipt prefix</Label>
                        <Input id="receipt_prefix" value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={20} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="receipt_next_number">Next receipt number</Label>
                        <Input
                            id="receipt_next_number"
                            type="number"
                            min={1}
                            value={nextNumber}
                            onChange={(e) => setNextNumber(e.target.value)}
                        />
                    </div>
                </div>
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-500">Next generated receipt number will look like</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{previewNumber}</p>
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Receipt branding</h2>
                <p className="text-xs text-slate-500">
                    Gym logo is managed on the{' '}
                    <Link href="/admin/settings/gym-profile" className="font-medium text-slate-700 underline underline-offset-2">
                        Gym Profile
                    </Link>{' '}
                    page{gym.logo_url ? '.' : ' — no logo uploaded yet.'}
                </p>
                <div className="space-y-3">
                    {([
                        ['Show gym logo', showLogo, setShowLogo],
                        ['Show gym address', showAddress, setShowAddress],
                        ['Show gym phone', showPhone, setShowPhone],
                        ['Show gym email', showEmail, setShowEmail],
                        ['Show GSTIN', showGstin, setShowGstin],
                    ] as const).map(([label, value, setter]) => (
                        <div key={label} className="flex items-center justify-between">
                            <Label className="text-sm font-normal text-slate-700">{label}</Label>
                            <Switch checked={value} onCheckedChange={setter} />
                        </div>
                    ))}
                </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-900">Receipt content</h2>
                <div className="space-y-1.5">
                    <Label htmlFor="receipt_footer_message">Receipt footer message</Label>
                    <Input
                        id="receipt_footer_message"
                        value={footerMessage}
                        onChange={(e) => setFooterMessage(e.target.value)}
                        placeholder="Thank you for training with us!"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="receipt_additional_notes">Additional notes</Label>
                    <textarea
                        id="receipt_additional_notes"
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                        placeholder="This is a system generated receipt and does not require a physical signature."
                    />
                </div>
            </section>

            <Button onClick={handleSave} disabled={pending} className="w-full sm:w-auto">
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {pending ? 'Saving...' : 'Save receipt settings'}
            </Button>
        </div>
    )
}
```

Before writing this file, check `components/ui/` for an existing `Switch` component (shadcn) — if `components/ui/switch.tsx` doesn't exist, run `npx shadcn@latest add switch` (matches `shadcn` already in `devDependencies`) instead of hand-rolling one.

- [ ] **Step 3: Replace the placeholder page**

`app/admin/settings/invoice-receipt/page.tsx` (full replacement):

```tsx
import { redirect } from 'next/navigation'
import InvoiceReceiptSettings from '@/components/settings/InvoiceReceiptSettings'
import { getCurrentAdminContext } from '@/lib/auth/admin-server'
import { isStaffRole } from '@/lib/auth/roles'
import { createClient } from '@/lib/supabase/server'
import type { QueryResult, Tables } from '@/lib/types'

type ReceiptSettingsFields = Pick<Tables<'gyms'>,
    'receipt_prefix' | 'receipt_next_number' | 'receipt_show_logo' | 'receipt_show_address' |
    'receipt_show_phone' | 'receipt_show_email' | 'receipt_show_gstin' |
    'receipt_footer_message' | 'receipt_additional_notes' | 'logo_url'>

export default async function InvoiceReceiptSettingsPage() {
    const { user, profile, gym } = await getCurrentAdminContext()

    if (!user) redirect('/login')
    if (!profile || !isStaffRole(profile.role) || !gym) redirect('/member/dashboard')

    const supabase = await createClient()
    const gymResult = await supabase
        .from('gyms')
        .select('receipt_prefix, receipt_next_number, receipt_show_logo, receipt_show_address, receipt_show_phone, receipt_show_email, receipt_show_gstin, receipt_footer_message, receipt_additional_notes, logo_url')
        .eq('id', gym.id)
        .single()
    const { data: receiptSettings } = gymResult as unknown as QueryResult<ReceiptSettingsFields | null>

    return (
        <InvoiceReceiptSettings
            gym={{
                receipt_prefix: receiptSettings?.receipt_prefix ?? 'REC-',
                receipt_next_number: receiptSettings?.receipt_next_number ?? 1,
                receipt_show_logo: receiptSettings?.receipt_show_logo ?? true,
                receipt_show_address: receiptSettings?.receipt_show_address ?? true,
                receipt_show_phone: receiptSettings?.receipt_show_phone ?? true,
                receipt_show_email: receiptSettings?.receipt_show_email ?? true,
                receipt_show_gstin: receiptSettings?.receipt_show_gstin ?? true,
                receipt_footer_message: receiptSettings?.receipt_footer_message ?? null,
                receipt_additional_notes: receiptSettings?.receipt_additional_notes ?? null,
                logo_url: receiptSettings?.logo_url ?? null,
            }}
        />
    )
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors in the three new/changed files.

- [ ] **Step 5: Manual smoke test**

Run `npm run dev`, sign in as staff, visit `/admin/settings/invoice-receipt`, change the prefix/next-number/toggles/footer/notes, confirm the live preview updates as you type, click Save, confirm the toast, refresh the page, confirm values persisted.

- [ ] **Step 6: Commit**

```bash
git add app/admin/settings/invoice-receipt/ components/settings/InvoiceReceiptSettings.tsx
git commit -m "Add Receipt Settings page under Settings > Invoice & Receipt"
```

---

## Task 6: Update the receipt document (`ResultClient.tsx`) to use the new data and relabel Invoice → Receipt

**Files:**
- Modify: `app/invoice/ResultClient.tsx` (full file — types, PDF generation, JSX)

**Interfaces:**
- Consumes: the extended `PaymentResult`/`PaymentResultDetails` shape from Task 4 (`receiptNumber`, `admissionFeeAmount`, `memberDisplayId`, `memberFullName`, `gym: {...}`).

- [ ] **Step 1: Extend the local `PaymentResult` type (lines 16-29)**

```ts
type PaymentResult = {
    amount: number
    coinsUsed: number
    invoiceNumber: string
    receiptNumber: string | null
    admissionFeeAmount: number | null
    membershipEndDate: string | null
    membershipStartDate: string | null
    originalPrice: number
    paymentDate: string
    paymentMethod: string
    paymentStatus: 'paid' | 'pending' | 'failed' | 'refunded'
    planName: string
    razorpayOrderId: string | null
    razorpayPaymentId: string | null
    memberDisplayId: string
    memberFullName: string
    gym: {
        name: string
        logoUrl: string | null
        address: string | null
        city: string | null
        state: string | null
        postalCode: string | null
        country: string | null
        contactPhone: string | null
        contactEmail: string | null
        gstin: string | null
        showLogo: boolean
        showAddress: boolean
        showPhone: boolean
        showEmail: boolean
        showGstin: boolean
        footerMessage: string | null
        additionalNotes: string | null
    }
}
```

- [ ] **Step 2: Add a display-number helper and an address-line formatter near the other formatters (after line 77)**

```ts
function displayReceiptNumber(payment: PaymentResult) {
    return payment.receiptNumber || payment.invoiceNumber
}

function formatGymAddressLine(gym: PaymentResult['gym']) {
    const parts = [gym.address, gym.city, gym.state, gym.postalCode, gym.country].filter(Boolean)
    return parts.join(', ')
}
```

- [ ] **Step 3: Update the "Invoice:" processing-state copy (line 403)**

```tsx
                                    Receipt: {processingInvoiceNumber}
```

- [ ] **Step 4: Update `statusCopy` messages (lines 115-132)** — replace "invoice" with "receipt" in the two occurrences (`'Your invoice is ready...'` → `'Your receipt is ready. Download or view it below.'`, `'...open the invoice details below.'` → `'...open the receipt details below.'`, `'...view or download the invoice below.'` → `'...view or download the receipt below.'`).

- [ ] **Step 5: Rewrite the PDF header/branding block in `handleDownload` (lines 200-227) to use gym data and logo, and rename INVOICE → RECEIPT**

```ts
            /* ── HEADER ────────────────────────────────────────────── */
            pdf.setFillColor(15, 23, 42)            // #0f172a  slate-900
            pdf.rect(0, 0, pageW, 48, 'F')

            let logoDrawn = false
            if (payment.gym.showLogo && payment.gym.logoUrl) {
                try {
                    const response = await fetch(payment.gym.logoUrl)
                    const blob = await response.blob()
                    const dataUrl: string = await new Promise((resolve, reject) => {
                        const reader = new FileReader()
                        reader.onloadend = () => resolve(reader.result as string)
                        reader.onerror = reject
                        reader.readAsDataURL(blob)
                    })
                    pdf.addImage(dataUrl, mL, 10, 14, 14)
                    logoDrawn = true
                } catch {
                    logoDrawn = false
                }
            }
            const brandTextX = logoDrawn ? mL + 18 : mL

            // Left column – branding
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(14)
            pdf.setFont('helvetica', 'bold')
            pdf.text(payment.gym.name || 'Gym', brandTextX, 18)

            pdf.setFontSize(8.5)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(148, 163, 184)         // slate-400
            let brandY = 27
            if (payment.gym.showAddress) {
                const addressLine = formatGymAddressLine(payment.gym)
                if (addressLine) {
                    pdf.text(addressLine, brandTextX, brandY, { maxWidth: 110 })
                    brandY += 7
                }
            }
            if (payment.gym.showEmail && payment.gym.contactEmail) {
                pdf.text(payment.gym.contactEmail, brandTextX, brandY)
                brandY += 7
            }
            if (payment.gym.showPhone && payment.gym.contactPhone) {
                pdf.text(payment.gym.contactPhone, brandTextX, brandY)
                brandY += 7
            }
            if (payment.gym.showGstin && payment.gym.gstin) {
                pdf.text(`GSTIN: ${payment.gym.gstin}`, brandTextX, brandY)
            }

            // Right column – receipt meta
            pdf.setTextColor(255, 255, 255)
            pdf.setFontSize(16)
            pdf.setFont('helvetica', 'bold')
            pdf.text('RECEIPT', pageW - mR, 18, { align: 'right' })

            pdf.setFontSize(8.5)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(16, 185, 129)          // emerald-500
            pdf.text(displayReceiptNumber(payment), pageW - mR, 27, { align: 'right' })
            pdf.setTextColor(148, 163, 184)
            pdf.text(formatDate(payment.paymentDate), pageW - mR, 34, { align: 'right' })
```

- [ ] **Step 6: Insert an admission-fee row into the PDF table, after the plan row block (after line 283, before the coins-discount `if` at line 286)**

```ts
            // Admission fee row (only if present and > 0)
            if (payment.admissionFeeAmount && payment.admissionFeeAmount > 0) {
                y += 14
                pdf.setFillColor(255, 255, 255)
                pdf.setDrawColor(226, 232, 240)
                pdf.rect(mL, y, bodyW, 12, 'F')
                pdf.rect(mL, y, bodyW, 12)
                pdf.setFontSize(8.5)
                pdf.setFont('helvetica', 'normal')
                pdf.setTextColor(71, 85, 105)
                pdf.text('Admission Fee', mL + 4, y + 8)
                pdf.setFont('helvetica', 'bold')
                pdf.setTextColor(15, 23, 42)
                pdf.text(formatPdfCurrency(payment.admissionFeeAmount), pageW - mR - 4, y + 8, { align: 'right' })
            } else {
                y -= 0
            }
```

Note: the existing code below this point does `y += 14` unconditionally before drawing the coins-discount row when there's no discount (line 300) — leave that logic exactly as-is; this new block only adds height when an admission fee exists, using its own `y +=`/no-op branch so it doesn't disturb the existing coins-discount vertical rhythm. Re-read lines 284-302 before editing to confirm exact placement so the total-box `y` computed afterward still lines up (add the same `14`-unit row height contributed by this block into the later `y += 32` cascade only if an admission fee row was actually drawn — track this with a local `admissionFeeRowDrawn` boolean and add an extra `14` to the subsequent spacing when true).

- [ ] **Step 7: Replace the footer block in the PDF (lines 359-373)**

```ts
            /* ── FOOTER ───────────────────────────────────────────── */
            y += 28
            pdf.setDrawColor(226, 232, 240)
            pdf.line(mL, y, pageW - mR, y)

            y += 8
            pdf.setFontSize(9)
            pdf.setFont('helvetica', 'bold')
            pdf.setTextColor(15, 23, 42)
            pdf.text(payment.gym.footerMessage || `Thank you for training with ${payment.gym.name || 'us'}!`, pageW / 2, y, { align: 'center' })

            pdf.setFontSize(8)
            pdf.setFont('helvetica', 'normal')
            pdf.setTextColor(100, 116, 139)
            pdf.text(
                payment.gym.additionalNotes || 'This is a system generated receipt and does not require a physical signature.',
                pageW / 2, y + 7, { align: 'center', maxWidth: bodyW }
            )
```

- [ ] **Step 8: Update the PDF filename (line 375)**

```ts
            pdf.save(`${displayReceiptNumber(payment)}.pdf`)
```

- [ ] **Step 9: Make `handleDownload` async-image-fetch safe** — the function signature at line 190 is already `async`; confirm the `try { ... } finally { setDownloading(false) }` wraps the new `await fetch(...)` calls added in Step 5 (it does, since they're inside the existing `try` block).

- [ ] **Step 10: Update the on-screen header band JSX (lines 460-476)**

```tsx
                    <div className="bg-[#0f172a] px-5 py-5 sm:px-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            {/* Branding */}
                            <div className="flex items-start gap-3">
                                {payment.gym.showLogo && payment.gym.logoUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={payment.gym.logoUrl}
                                        alt={payment.gym.name}
                                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                                    />
                                )}
                                <div>
                                    <p className="text-base font-bold text-white">{payment.gym.name || 'Gym'}</p>
                                    {payment.gym.showAddress && formatGymAddressLine(payment.gym) && (
                                        <p className="mt-1 text-xs text-slate-400">{formatGymAddressLine(payment.gym)}</p>
                                    )}
                                    {payment.gym.showEmail && payment.gym.contactEmail && (
                                        <p className="text-xs text-slate-400">{payment.gym.contactEmail}</p>
                                    )}
                                    {payment.gym.showPhone && payment.gym.contactPhone && (
                                        <p className="text-xs text-slate-400">{payment.gym.contactPhone}</p>
                                    )}
                                    {payment.gym.showGstin && payment.gym.gstin && (
                                        <p className="text-xs text-slate-400">GSTIN: {payment.gym.gstin}</p>
                                    )}
                                </div>
                            </div>
                            {/* Receipt meta — left on mobile, right on desktop */}
                            <div className="sm:text-right">
                                <p className="text-base font-bold text-white">RECEIPT</p>
                                <p className="mt-0.5 font-mono text-xs text-emerald-400">{displayReceiptNumber(payment)}</p>
                                <p className="text-xs text-slate-400">{formatDate(payment.paymentDate)}</p>
                            </div>
                        </div>
                    </div>
```

(`img` is used instead of `next/image` here deliberately, matching the fact that this is a receipt document meant to be visually stable for PDF/print parity — `next/image` optimization isn't needed for a small logo thumbnail. If ESLint's `@next/next/no-img-element` blocks the build, keep the inline disable comment shown above.)

- [ ] **Step 11: Add a Member Information block into the on-screen card**, right after the "Info fields" block (after line 499, before the "Line-items table" comment at line 501):

```tsx
                        {/* ── Member information ────────────────────── */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:gap-10">
                            <div>
                                <p className="text-xs text-slate-500">Member</p>
                                <p className="mt-0.5 font-semibold text-slate-900">{payment.memberFullName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500">Member ID</p>
                                <p className="mt-0.5 font-semibold text-slate-900">{payment.memberDisplayId}</p>
                            </div>
                        </div>
```

- [ ] **Step 12: Add an admission-fee row into the on-screen table**, both the mobile block (after the plan row `div`, before the `{hasDiscount && (` block at line 520) and the desktop `<tbody>` (after the plan `<tr>`, before the `{hasDiscount && (` block at line 567):

Mobile version:
```tsx
                                {payment.admissionFeeAmount !== null && payment.admissionFeeAmount > 0 && (
                                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-slate-100 px-4 py-3">
                                        <span className="text-sm text-slate-700">Admission Fee</span>
                                        <span className="justify-self-end whitespace-nowrap text-right text-sm font-semibold text-slate-900">
                                            {formatCurrency(payment.admissionFeeAmount)}
                                        </span>
                                    </div>
                                )}
```

Desktop version:
```tsx
                                    {payment.admissionFeeAmount !== null && payment.admissionFeeAmount > 0 && (
                                        <tr>
                                            <td className="px-4 py-3 text-sm text-slate-700" colSpan={2}>Admission Fee</td>
                                            <td className="w-24 pl-4 pr-5 py-3 text-right text-sm font-semibold text-slate-900 sm:w-auto">
                                                {formatCurrency(payment.admissionFeeAmount)}
                                            </td>
                                        </tr>
                                    )}
```

- [ ] **Step 13: Update the on-screen footer note (lines 613-616)**

```tsx
                        <div className="border-t border-slate-100 pt-4 text-center">
                            <p className="text-sm font-semibold text-slate-800">
                                {payment.gym.footerMessage || `Thank you for training with ${payment.gym.name || 'us'}!`}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {payment.gym.additionalNotes || 'This is a system generated receipt and does not require a physical signature.'}
                            </p>
                        </div>
```

- [ ] **Step 14: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors in `app/invoice/ResultClient.tsx`.

- [ ] **Step 15: Manual smoke test**

Run `npm run dev`. As staff: record a cash payment with an admission fee for a member via `/admin/finances/payments`, click the resulting row, confirm on `/invoice`:
- Header shows "RECEIPT" (not "INVOICE"), gym name/logo/address/phone/email/GSTIN per the settings toggles.
- Receipt number shown is `REC-00000N` format (new payment) and matches what's in the DB (`select receipt_number from payments order by created_at desc limit 1;` via `mcp__supabase__execute_sql`).
- Member name + Member ID shown.
- Admission Fee row shown when the recorded payment had one, hidden otherwise.
- Footer shows the configured footer message/notes from Task 5's settings save (or the default copy if unset).
- Click "Download PDF" — confirm it downloads, opens, and shows the same data with the logo embedded (or a clean text-only header if no logo/fetch fails).
- Re-open the same transaction (navigate away and back) — confirm the receipt number is identical (not regenerated).
- Open a payment recorded before this change (if any exist) — confirm it still renders using its `invoice_number` as the shown identifier and doesn't error.

- [ ] **Step 16: Commit**

```bash
git add app/invoice/ResultClient.tsx
git commit -m "Relabel invoice document as receipt and render gym branding, member info, admission fee, and configured footer"
```

---

## Task 7: Full-app verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 2: Full lint**

Run: `npm run lint`
Expected: clean (or only pre-existing warnings unrelated to touched files).

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Supabase advisors check**

Run `mcp__supabase__get_advisors` with `type: "security"` and `type: "performance"`.
Expected: no new findings introduced by the `receipt_settings` migration (e.g. no missing-RLS warnings on `gyms`/`payments` — both already have RLS enabled from migration 008, this migration only adds columns/a function, not new tables).

- [ ] **Step 5: End-to-end regression pass on unrelated payment functionality**

Manually verify, via `npm run dev`: the payments list page (`/admin/finances/payments`) still loads and filters correctly; member self-serve plan purchase (`/member/plans`) still completes a Razorpay (or free-plan) purchase end-to-end and lands on `/invoice?portal=member&...` showing a correct receipt; member's own payment history page still loads. None of these flows should show any behavioral change beyond the relabeled receipt document.

- [ ] **Step 6: Final commit (if any verification fixups were needed) and summary**

```bash
git status
git log --oneline -8
```

Confirm all Task 1–6 commits are present and the working tree is clean.
