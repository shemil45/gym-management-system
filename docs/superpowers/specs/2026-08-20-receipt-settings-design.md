# Receipt Settings — Design

## Context

GMS only accepts immediate payments (no AR/unpaid invoices). The existing
payment-detail document at `app/invoice/ResultClient.tsx` is labeled
"INVOICE" but is actually a payment receipt. This spec adds gym-level
Receipt Settings and connects them to that existing document — it does not
introduce a new invoice/billing subsystem.

## Data model

### `payments` (new column)

- `receipt_number text unique null` — the new user-facing identifier.
  `invoice_number` (existing, unique, not null-able going forward) is left
  untouched and continues to be the internal lookup/routing key used by
  `/invoice?invoice=...`. Historical rows keep `receipt_number = null`;
  display code falls back to `invoice_number` for those rows.

### `gyms` (new columns — Receipt Settings, tenant-scoped)

- `receipt_prefix text not null default 'REC-'`
- `receipt_next_number integer not null default 1` (check `> 0`)
- `receipt_show_logo boolean not null default true`
- `receipt_show_address boolean not null default true`
- `receipt_show_phone boolean not null default true`
- `receipt_show_email boolean not null default true`
- `receipt_show_gstin boolean not null default true`
- `receipt_footer_message text null`
- `receipt_additional_notes text null`

Column-scoped `GRANT UPDATE (...)` to `authenticated` added for the new
columns, mirroring `20260820120000_gym_profile_settings.sql`. RLS already
covers `gyms` UPDATE via the existing "Staff can update current gym" policy.

### Numbering function

```sql
generate_receipt_number(p_gym_id uuid) returns text
```

`SECURITY DEFINER`, atomically does
`UPDATE gyms SET receipt_next_number = receipt_next_number + 1 WHERE id = p_gym_id RETURNING receipt_prefix, receipt_next_number - 1`,
formats `prefix || lpad(n::text, 6, '0')`, and checks
`user_has_gym_access(p_gym_id)` before mutating. Row-level lock from the
`UPDATE` makes concurrent calls for the same gym safe. Granted `EXECUTE` to
`authenticated`.

Both existing invoice-number generators (`app/admin/finances/payments/actions.ts`
`recordPayment`, and `app/member/plans/actions.ts` `generateInvoiceNumber`
call site) are updated to also call this RPC and persist the result into
the new `receipt_number` column on insert. Their existing
`invoice_number` generation is untouched.

## Settings UI

New page replaces the placeholder at `app/admin/settings/invoice-receipt/`,
following the Gym Profile pattern exactly:

- `page.tsx` (server): auth/staff guard via `getCurrentAdminContext`, loads
  the gym's receipt_* columns + branding fields needed for the "reuses gym
  logo" note.
- `InvoiceReceiptSettings.tsx` (client): form for prefix, next number
  (with a live preview computed from local form state — `prefix +
  next_number.toString().padStart(6, '0')`, never calls the RPC), the five
  show/hide toggles, footer message, additional notes. Gym logo section is
  read-only here with a link to Gym Profile (logo itself is managed there,
  per the spec's "use gym logo from Gym Profile").
- `actions.ts`: `'use server'` `updateReceiptSettings(formData)`, same
  shape as `updateGymProfile` — staff guard, validate `receipt_prefix`
  non-empty and `receipt_next_number >= 1`, update, `revalidatePath`.

## Receipt document changes

`lib/payments/get-payment-result.ts` and the member-portal equivalent in
`app/member/plans/actions.ts` (`getPaymentResult`) both extend their
`payments` select with a `members(member_id, full_name)` and
`gyms(...)` relational select (name, logo_url, address, city, state,
postal_code, country, contact_phone, contact_email, gstin, receipt_show_*,
receipt_footer_message, receipt_additional_notes), plus
`admission_fee_amount` and `receipt_number` from `payments` itself.
`PaymentResult`/`PaymentResultDetails` types grow those fields.

`app/invoice/ResultClient.tsx`:
- Relabel "INVOICE" → "RECEIPT" (header band, PDF), "Invoice:" processing
  copy → "Receipt:", "This is a system generated invoice..." → "...receipt...".
- Header band uses real gym name/logo/address/phone/email/GSTIN, gated by
  the `receipt_show_*` flags; logo fetched client-side and embedded in the
  PDF via `pdf.addImage` (fallback to text-only header if the fetch fails).
- Displayed identifier: `payment.receiptNumber ?? payment.invoiceNumber`.
- New row for `admission_fee_amount` when present and > 0.
- Footer renders `receipt_footer_message`/`receipt_additional_notes` when
  set, falling back to today's static "Thank you for training..." copy
  when unset.
- Route path `/invoice` and query param `?invoice=` are unchanged — internal
  plumbing, not user-facing text.

## Explicitly out of scope

- No unpaid/partial invoice states, no invoice-to-payment relationship, no
  workflow/status beyond the existing `payment_status`.
- No backfill/renumbering of historical `invoice_number` values.
- No fix for the pre-existing plan-name-from-notes regex gap on manually
  recorded payments — unrelated to receipt settings.
- No route/URL renames.
