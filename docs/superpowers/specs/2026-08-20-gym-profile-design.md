# Gym Profile Settings — Design

Date: 2026-08-20
Status: Approved

## Goal

Implement the Gym Profile settings page (`/admin/settings/gym-profile`) as the single source of truth for gym/business information — name, logo, contact details, address, and GSTIN — stored at the gym/tenant level. Other features (receipts, reports, etc.) will read from this data later; this task only builds the settings page and persistence, not any consumer.

## Data model

The `gyms` table already carries most of the requested fields, used today only by the platform (super-admin) portal and displayed read-only via `AdminHeader`/`MemberHeader`'s `gym_name` prop — none of it is currently editable by gym staff:

| Requested field | Existing column | Type | Nullable |
|---|---|---|---|
| Gym Name | `name` | text | NOT NULL |
| Gym Logo | `logo_url` | text | nullable |
| Phone | `contact_phone` | text | nullable |
| Email | `contact_email` | text | nullable |
| City | `city` | text | nullable |
| State | `state` | text | nullable |
| Country | `country` | text | nullable, default `'IN'` |

New columns needed on `gyms` (none of these exist today):

| Requested field | New column | Type | Nullable |
|---|---|---|---|
| Website | `website` | text | nullable |
| Address | `address` | text | nullable |
| PIN/ZIP Code | `postal_code` | text | nullable |
| GSTIN | `gstin` | text | nullable |

No new table — extends `gyms`, consistent with the Membership & Fees settings that already added columns there. `business_name` (a separate, platform-portal-only field used for SaaS billing/legal name) is untouched and not conflated with the tenant-facing `name`.

### RLS / grants

The `gyms` row-level UPDATE policy (`"Staff can update current gym"`, `is_staff_user() AND id = current_gym_id()`) already covers any column — RLS is row-scoped, not column-scoped. What needs widening is the column-scoped `GRANT UPDATE (...)` added when that policy was activated (`20260819160500_gyms_column_scoped_grant.sql`), which currently only lists the 3 Membership & Fees columns. A new migration adds an additional `GRANT UPDATE (...)` (grants are additive, no `REVOKE` needed) covering:

`name, logo_url, contact_phone, contact_email, website, address, city, state, postal_code, country, gstin`

## Settings UI — `/admin/settings/gym-profile`

Replaces the Phase 1 `SettingsPlaceholderPage` boilerplate, following the exact structural pattern established by `MembershipFeesSettings.tsx`: dark/light theme via `useAdminTheme`, existing `Input`/`Label`/`Button`/`LoadingLinkButton` components, a back link to `/admin/settings`.

Server component (`page.tsx`) fetches the gym row via `getCurrentAdminContext()` + a `gyms` select (same shape as the Membership & Fees page), passes it to a client component `GymProfileSettings`.

Three cards, matching the spec's grouping:

1. **Basic Information** — logo upload (avatar-style circular preview + Upload/Capture buttons, reusing the exact pattern from `AddMemberForm`'s photo upload: `createImagePreviewUrl`, `uploadCompressedAvatar(file, 'gym-logo', { onStatusChange })`, `removeUploadedAvatar` on rollback), Gym Name (required, inline validation), Phone, Email, Website (all optional, freeform text — no format enforcement beyond trimming).
2. **Address** — Address, City, State, PIN/ZIP Code, Country (all optional freeform text).
3. **Business** — GSTIN (optional freeform text).

One server action, `updateGymProfile(formData)` in `app/admin/settings/gym-profile/actions.ts`:
- Requires `viewer.isStaff` (same gate as `updateMembershipFeeSettings`).
- Validates `name` is non-empty after trimming (the only required field).
- Updates the 11 profile columns for `viewer.gym.id` in one `.update(...).eq('id', ...).select('id').maybeSingle()` call, returning an error if zero rows matched (same silent-no-op guard added to the Membership & Fees action during its final review).
- If a new logo was uploaded and the update succeeds, and there was a previous `logo_url` pointing at a different `avatars` path, delete the old object (mirrors `updateMember`'s old-photo cleanup in `app/admin/members/actions.ts`).
- `revalidatePath('/admin/settings/gym-profile')`.

Logo upload path: client compresses/uploads directly to the public `avatars` bucket (already open to any authenticated user per `005_allow_authenticated_avatar_uploads.sql` — no new storage policy needed) under a `gym-logo-<uuid>.<ext>` path, then submits the resulting public URL via the form; the server action swaps `gyms.logo_url` and removes the previous object if it was also gym-logo-prefixed (never deletes a member/staff avatar by mistake — old-path removal is gated on the path starting with `gym-logo-`).

## Out of scope (explicitly)

- Any consumer of this data (receipts, reports, invoices) — future work, not touched.
- `business_name` / platform-portal gym profile fields — untouched.
- Strict format validation for website/GSTIN — freeform text per user decision.
- New storage bucket or provider — reuses the existing `avatars` bucket.

## Verification plan

- `npx tsc --noEmit` clean.
- Manual/DB: set all fields including logo, refresh, confirm persistence.
- Manual/DB: leave Gym Name empty, confirm validation blocks save.
- Manual/DB: confirm `AdminHeader`/`MemberHeader` (which already reads `gym.name`) reflects a renamed gym without any code change there — proves single-source-of-truth reuse already works end-to-end for at least one consumer.
- Regression: Membership & Fees settings and other admin pages unaffected.
