# Impersonation sandbox: temporary records for platform operators

**Date:** 2026-09-12
**Status:** Draft for review

## Problem

A platform operator impersonating a tenant needs to demonstrate and test the
admin (add a member, record a payment, add an expense) without leaving
anything behind in the tenant's real data. Today:

- Adding a member or recording a payment during impersonation fails with
  `Not authorized for gym …` because `generate_member_id` and
  `generate_receipt_number` only accept users in `admins`.
- Nothing distinguishes rows an operator created from the tenant's own.
- Nothing removes them afterwards. Impersonation sessions only end when the
  operator clicks Stop; a session that times out (`expires_at`) is never
  closed.

## Goals

1. An impersonating operator can create members, staff, payments, and
   expenses in the tenant's workspace.
2. Everything the operator created is removed when the session ends -
   immediately on an explicit stop, and shortly after a timeout.
3. The tenant can see those rows while the session is live (clearly marked
   as support-created) but cannot edit, delete, or transact against them.
4. The operator cannot edit or delete the tenant's real records.
5. Cleanup is idempotent and survives partial failure.

## Non-goals

- Reverting edits or deletes of pre-existing records. Those are refused
  during impersonation instead (option A in the design discussion).
- Rolling back the `member_id` / receipt-number counters. A gap in numbering
  is harmless.
- A tenant-facing banner announcing the support session. Rows are tagged
  individually instead.

## Data model

### New table `platform_impersonation_writes` (the ledger)

| column        | type        | notes                                                                  |
| ------------- | ----------- | ---------------------------------------------------------------------- |
| `id`          | uuid pk     |                                                                        |
| `session_id`  | uuid        | fk `platform_impersonation_sessions(id)` on delete cascade             |
| `gym_id`      | uuid        | fk `gyms(id)` on delete cascade                                        |
| `entity_type` | text        | `auth_user` \| `profile` \| `member` \| `admin` \| `payment` \| `expense` \| `storage_object` |
| `entity_id`   | text        | uuid, or the storage path for `storage_object`                         |
| `created_at`  | timestamptz | default now()                                                          |
| `reverted_at` | timestamptz | null until cleaned up                                                  |

Indexes: `(session_id) where reverted_at is null`, `(gym_id, entity_type, entity_id) where reverted_at is null`.

RLS: platform admins full access; tenant staff may `select` rows for their
own gym (needed to render the badge and to refuse edits); no tenant writes.

### `platform_impersonation_sessions` gains

- `reverted_at timestamptz` - set when the ledger for the session is empty
  of un-reverted rows.
- `revert_error text` - last failure message, cleared on success.

### RPC fix

`generate_member_id(p_gym_id)` and `generate_receipt_number(p_gym_id)`
extend their guard to:

```sql
IF auth.uid() IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND gym_id = p_gym_id)
   AND public.current_platform_impersonation_gym_id() IS DISTINCT FROM p_gym_id THEN
    RAISE EXCEPTION 'Not authorized for gym %', p_gym_id;
END IF;
```

All of the above ships as one migration, `supabase/migrations/20260912120000_impersonation_sandbox.sql`.

## Server-side module: `lib/platform/impersonation-ledger.ts`

Server-only. Uses the service-role client.

```ts
getActiveImpersonation(): Promise<{ sessionId, gymId } | null>
// From getCurrentAuthResolution().activeImpersonation. Request-cached.

recordImpersonationWrite(sessionId, gymId, entityType, entityId): Promise<void>

isImpersonationOwned(gymId, entityType, entityId): Promise<{ sessionId } | null>
// True when an un-reverted ledger row exists for this entity.

revertImpersonationSession(sessionId): Promise<{ ok: boolean; error?: string; counts }>
sweepExpiredImpersonations(): Promise<number>
```

### Revert algorithm

1. Load un-reverted ledger rows for the session.
2. Delete in dependency order, each step skipping rows that no longer exist:
   1. `payments` (ledgered, plus any payment whose `member_id` is a ledgered member)
   2. `members`
   3. `admins`
   4. `profiles`
   5. `auth.users` via `auth.admin.deleteUser` - only ids ledgered as `auth_user`, i.e. accounts the session created rather than reused
   6. `expenses`
   7. storage objects (`avatars` bucket)
3. Mark each ledger row `reverted_at` as it succeeds.
4. On any failure: write `revert_error` on the session, stop, return `ok: false`. Remaining rows stay for the next sweep.
5. On success: set `ended_at` (if null) and `reverted_at`, clear `revert_error`, insert `platform_audit_logs` row `action = 'impersonation.reverted'` with per-type counts.

The function is idempotent: running it on an already-reverted session is a no-op.

### Sweep

`sweepExpiredImpersonations()` selects sessions where
`expires_at < now() and reverted_at is null` and reverts each. Sessions with
`ended_at` set but `reverted_at` null (an earlier failed revert) are included.

## Enforcement in server actions

Every mutating tenant action resolves `getActiveImpersonation()` once.

### While impersonating

| action                       | behaviour                                                                                     |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `createMember`               | allowed; ledger `auth_user` (if created), `profile` (if created), `member`, `payment` (admission fee, if any), `storage_object` (photo). Referral codes are ignored - they credit a real member's balance. |
| `createStaff`                | allowed; ledger `auth_user` (if created), `profile` (if created), `admin`, `storage_object`.  |
| `recordPayment`              | allowed only when the member is impersonation-owned by *this* session; ledger `payment`. Otherwise refused: *"While impersonating you can only record payments for members created in this session."* |
| `addExpense`                 | allowed; ledger `expense`.                                                                    |
| `updateMember`, `updateStaff`| allowed only for entities owned by this session; otherwise refused: *"Existing records are read-only while impersonating."* |
| `deleteMember`, `deleteExpense` | allowed only for entities owned by this session; performs the delete and marks the ledger row reverted. Otherwise refused as above. |
| `updateNotificationSettings` | refused (edits the gym row).                                                                  |
| Subscription/billing actions | unchanged (already role-gated).                                                               |

The subscription gate (`lib/billing/gate.ts`) and `canAddMember`/`canAddStaff`
keep their existing impersonation exemption.

### While not impersonating (tenant staff)

| action                                            | behaviour                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `updateMember`, `deleteMember`, `updateStaff`, `deleteExpense` | refused when the target is impersonation-owned: *"This record was created by GMS Cloud support for a demo and is read-only. It will be removed automatically when their session ends."* |
| `recordPayment`                                   | refused when the member is impersonation-owned, same message.                              |

### Notifications

`sendMemberWhatsAppNotification` skips (reason `impersonation_demo`) when the
member is impersonation-owned, so no message reaches a demo phone number.

## UI

### Badges

A `SupportDemoBadge` component (small pill, "Support demo", neutral tone with
a tooltip carrying the read-only explanation) rendered on ledgered rows in:

- Members list and member detail header
- Staff list and staff detail header
- Payments list
- Expenses list

The pages already fetch these lists; each additionally fetches the set of
un-reverted ledger ids for the gym (`entity_type in (...)`) and passes a
`Set<string>` down. One query per page, not per row.

### Disabled actions

For badged rows, the tenant's Edit / Delete / Record payment controls render
disabled with the same tooltip. The server refusal is the real guard; this
only avoids a dead click.

For the impersonating operator, controls on rows they own stay enabled.
Controls on the tenant's real rows render disabled with *"Read-only while
impersonating"*.

### Impersonation banner

One extra line: *"Records you create here are removed when the session ends."*

### Platform portal

Tenant detail (`/platform/tenants/[id]`) session list shows `reverted_at`
or `revert_error` per session, and a "Retry cleanup" button that calls
`revertImpersonationSession` for sessions with an error.

## Triggers

| trigger                                  | where                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| Operator clicks Stop / End session       | `stopImpersonation` action: revert first, then mark ended, then redirect. If revert fails the session is still ended and the error is surfaced in the portal. |
| Timeout                                  | `GET /api/cron/impersonation-cleanup`, every 15 min via `vercel.json`, `CRON_SECRET` bearer like the existing crons. |
| Lazy sweep                               | `app/platform/(portal)/layout.tsx` and `app/admin/layout.tsx` call `sweepExpiredImpersonations()` without awaiting the result beyond a short timeout; failures are logged, never rendered. |

## Failure handling

- Ledger insert failing inside a creating action: the action fails and rolls
  back what it created (the actions already have this cleanup path), so a
  row can never exist without a ledger entry.
- Revert partial failure: recorded on the session; next sweep or manual
  retry resumes from the remaining rows.
- Auth user deletion failing after the profile is gone: the `auth_user`
  ledger row stays un-reverted and is retried; the orphaned auth account is
  harmless in the meantime (no profile, no gym access).

## Testing

1. Apply the migration to the Supabase project; confirm `generate_member_id`
   succeeds for an impersonating user and still fails for an unrelated user.
2. Impersonate a gym. Add a member with a photo and admission fee, add an
   expense, add a staff account. Confirm badges appear in every list when
   viewed as the tenant, and the tenant's edit/delete/pay controls are
   disabled and the actions refuse.
3. As the operator, confirm editing a real member is refused and editing the
   demo member works.
4. Stop the session. Confirm all rows, the auth users, and the avatar object
   are gone; the session has `reverted_at`; an audit entry exists.
5. Start a new session, create a member, set `expires_at` to the past in
   SQL, hit the cron route with the secret. Same checks. Then repeat but load
   the admin as the tenant instead of calling the cron - the lazy sweep should
   clean up before the page renders.
6. Simulate a failure (temporarily rename the avatar path) and confirm the
   session shows `revert_error`, retry succeeds after fixing.
