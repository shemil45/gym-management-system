# Membership & Fees Settings — Design

Date: 2026-08-19
Status: Approved

## Goal

Implement the **Membership & Fees** settings section (gym-level default admission fee, fee-waiver permission, membership start-date behavior) and wire it into the Add Member flow and payment history. Explicitly excludes renewal-behavior settings (automatic expiry, renewal-before/after-expiry).

## Data model

### `gyms` table — new columns

| Column | Type | Default | Notes |
|---|---|---|---|
| `default_admission_fee` | `numeric(10,2)` | `0` | `CHECK (default_admission_fee >= 0)`. One-time fee charged on initial admission only. |
| `allow_admission_fee_waiver` | `boolean` | `true` | Gates whether staff can edit/waive the admission fee in Add Member. When `false`, the field is locked to the configured default. |
| `allow_custom_membership_start_date` | `boolean` | `false` | When `false` (current behavior), membership always starts on the registration/payment date. When `true`, staff may pick a different start date in Add Member. |

Rationale: extends the existing `gyms` table rather than introducing a `gym_settings` table, consistent with existing gym-level config columns (`timezone`, `country`, `logo_url`, etc.). One row per gym, no per-user duplication.

### `payments` table — new column

| Column | Type | Default | Notes |
|---|---|---|---|
| `admission_fee_amount` | `numeric(10,2)` | `NULL` | The admission fee actually charged in this transaction. Set only on the initial-admission payment created by `createMember`. `NULL` on renewal/other payments. Captured once at insert time — never recalculated from the gym's current default, so changing the gym default later does not alter historical payments. |

`payments.amount` remains the total charged (plan price + admission fee for the initial payment); it is not decomposed retroactively.

### RLS

`gyms` currently has only a `SELECT` policy (`Users can read accessible gyms`, `USING (user_has_gym_access(id))`). Add:

```sql
CREATE POLICY "Staff can update current gym"
    ON public.gyms
    FOR UPDATE
    TO authenticated
    USING (is_staff_user() AND id = current_gym_id())
    WITH CHECK (is_staff_user() AND id = current_gym_id());
```

This matches the `is_staff_user()` / `current_gym_id()` pattern used by other staff-managed tables (e.g. `admins`). No new authorization concept — this task does not introduce a permission system; the existing `isStaffRole` gate (already enforced in `getCurrentGymContext()` / admin layout) is reused for who can reach these actions at all, and the `allow_admission_fee_waiver` setting is a business-rule flag, not an auth mechanism.

## Settings UI — `/admin/settings/membership-fees`

Replaces the Phase 1 `SettingsPlaceholderPage` boilerplate with real content, matching the dark/light theme pattern used in `AccountSettings.tsx` / `SettingsHub.tsx` (`useAdminTheme`, `#1c1c1c`/`#2a2a2a` dark tokens, existing `Input`/`Label`/`Button` components).

Server component (`page.tsx`) fetches the gym's current settings via `getCurrentGymContext()` + a `gyms` row query, passes them to a client component `MembershipFeesSettings`.

Three cards:
1. **Fees** — Default Admission Fee currency input (₹ prefix, like `AddMemberForm`'s amount field), helper text "One-time fee charged when a member joins — not applied to renewals.", inline validation (must be a non-negative number), Save button with loading state, toast success/error.
2. **Membership Defaults** — explanation text "New memberships start on the payment/registration date by default." + toggle "Allow staff to pick a different start date during Add Member" (reuses the `ToggleLeft`/`ToggleRight` icon-button toggle pattern from `PlansManager.tsx` — no new UI library/component).
3. **Fee Options** — toggle "Allow staff to waive admission fee" with helper text explaining that when off, staff must use the configured default with no override.

One server action, `updateMembershipFeeSettings(formData)` in `app/admin/settings/membership-fees/actions.ts`:
- Requires `viewer.isStaff` (same gate as other admin actions).
- Validates the fee is a finite number `>= 0`.
- Updates the three `gyms` columns for `viewer.gym.id`.
- `revalidatePath('/admin/settings/membership-fees')` and `revalidatePath('/admin/members/add')`.

## Add Member integration

`app/admin/members/add/page.tsx` additionally fetches the gym's `default_admission_fee`, `allow_admission_fee_waiver`, `allow_custom_membership_start_date` and passes them to `AddMemberForm` as a `gymSettings` prop.

`AddMemberForm`:
- Payment section becomes three read/derived fields: **Plan Amount** (readonly, from selected plan), **Admission Fee**, **Total**.
- Admission Fee input:
  - Initialized to `gymSettings.defaultAdmissionFee` whenever the form loads / plan changes.
  - If `allow_admission_fee_waiver` is `false`: rendered readonly/disabled, always equal to the gym default. No waive control.
  - If `true`: editable numeric input (min 0) plus a "Waive fee" toggle/checkbox that zeroes it (re-enabling the input restores the last non-zero value or lets staff retype).
- **Total** = Plan Amount + Admission Fee (no discount subtraction — no discount field exists anywhere in the current codebase, so per the task's own instruction not to build a discount system, this task does not add one; the formula degrades to `Plan + Admission Fee` today and is written as a simple sum so a future discount field would slot in without restructuring).
- Start Date: only shown as an editable date field when `allow_custom_membership_start_date` is `true`; defaults to today. When the setting is `false`, no field is shown and creation always uses today's date (current behavior, unchanged).
- Overriding the fee for one member never writes back to `gyms.default_admission_fee` — it only affects the form state / the resulting payment row.

`app/admin/members/actions.ts` `createMember`:
- Reads `admission_fee` (numeric, defaults to `0` if absent/invalid) and `membership_start_date` (only honored if the gym's `allow_custom_membership_start_date` is true; otherwise falls back to today, same as current behavior) from `formData`.
- Computes `payments.amount = plan.price + admissionFee`.
- Sets `payments.admission_fee_amount = admissionFee`.
- No other renewal/payment code path is touched, so admission fee is structurally never charged on renewal (`RecordPaymentForm` / `recordPayment` continue to have no admission-fee concept).

## Out of scope (explicitly)

- Renewal behavior (auto-expiry, renew-before/after-expiry) — not touched.
- A general discount engine — not built; existing flow has no discount field today.
- A new/finer permission system — reuses `isStaffRole` / `is_staff_user()`.
- Gym Profile settings (separate placeholder page, untouched).

## Verification plan

- `npx tsc --noEmit` clean.
- Manual: set a default admission fee, refresh settings page, confirm it persists.
- Manual: Add Member — confirm fee auto-populates, total recalculates live, waiving works when enabled, field locks when disabled.
- Manual: confirm a created member's payment row has the correct `admission_fee_amount` and `amount`.
- Manual: change the gym default afterward, confirm the earlier payment's `admission_fee_amount`/`amount` are unchanged.
- Manual: `RecordPaymentForm` (renewal) flow unaffected — no admission fee appears.
- Manual: toggle "allow custom start date" on/off and confirm the Add Member date field appears/disappears and behaves correctly.
- Regression: Plans, Payments, Members list/detail pages still load and function.
