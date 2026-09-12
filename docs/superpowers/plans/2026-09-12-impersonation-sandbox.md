# Impersonation Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a platform operator create members, staff, payments and expenses while impersonating a tenant, tag those rows as "Support demo" so the tenant can only view them, and delete everything when the session ends.

**Architecture:** A ledger table (`platform_impersonation_writes`) records every row an impersonation session creates. Server actions consult one server-only module (`lib/platform/impersonation-ledger.ts`) to record writes, decide who may touch a row, and revert a session. Revert runs on explicit Stop, from a 15-minute cron, and lazily from the admin and platform layouts.

**Tech Stack:** Next.js 16 App Router (server actions, RSC), Supabase (Postgres + RLS + service role), TypeScript, Tailwind v4, `@tabler/icons-react`.

**Spec:** `docs/superpowers/specs/2026-09-12-impersonation-sandbox-design.md`

## Global Constraints

- No test runner exists in this repo. Every task's "test" is: `npx tsc --noEmit -p .` clean, `npx eslint <files>` clean, plus the SQL or manual check written into the task. Do not add a test framework.
- Copy strings must be used verbatim from the spec:
  - operator, editing real record: `Existing records are read-only while impersonating.`
  - operator, payment on real member: `While impersonating you can only record payments for members created in this session.`
  - tenant, touching demo row: `This record was created by GMS Cloud support for a demo and is read-only. It will be removed automatically when their session ends.`
  - banner extra line: `Records you create here are removed when the session ends.`
  - badge label: `Support demo`
- Ledger `entity_type` values: `auth_user | profile | member | admin | payment | expense | storage_object`. For `admin`, `entity_id` is the **user_id** (the `admins` row is addressed by `(user_id, gym_id)`). For `storage_object`, `entity_id` is the path inside the `avatars` bucket.
- Migration file name: `supabase/migrations/20260912120000_impersonation_sandbox.sql`. Apply it to Supabase project `blskfhoboxonvisoalpa` with the `mcp__supabase__apply_migration` tool using the same SQL.
- `lib/types/database.types.ts` is hand-maintained (4-space indent). Add new tables/columns there by hand; do not regenerate the whole file.
- Do not commit unless the user asks. Each task ends with a "ready to commit" checkpoint instead of a commit step.
- Existing server actions return `{ error: string }` or `{ success: true, ... }` object literals. Always return a **literal** (`return { error: blocked.error }`), never a variable typed `{ error: string }` — TypeScript's union normalisation breaks otherwise (this bit us already).
- Use 4-space indentation in `.ts/.tsx` under `app/` and `lib/`; 2-space in `components/ui/*` (match the file you are editing).

---

### Task 1: Migration — ledger table, session columns, RPC fix, types

**Files:**
- Create: `supabase/migrations/20260912120000_impersonation_sandbox.sql`
- Modify: `lib/types/database.types.ts` (after the `platform_impersonation_sessions` block, ~line 1039)

**Interfaces:**
- Produces: table `public.platform_impersonation_writes`, columns `platform_impersonation_sessions.reverted_at`, `.revert_error`; `Tables<'platform_impersonation_writes'>` types.

- [ ] **Step 1: Write the migration**

```sql
-- Impersonation sandbox: ledger of rows created during a platform
-- impersonation session, so they can be removed when the session ends.
-- See docs/superpowers/specs/2026-09-12-impersonation-sandbox-design.md

create table if not exists public.platform_impersonation_writes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.platform_impersonation_sessions(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  entity_type text not null check (entity_type in (
    'auth_user', 'profile', 'member', 'admin', 'payment', 'expense', 'storage_object'
  )),
  entity_id text not null,
  created_at timestamptz not null default now(),
  reverted_at timestamptz
);

create index if not exists idx_impersonation_writes_open_session
  on public.platform_impersonation_writes(session_id) where reverted_at is null;
create index if not exists idx_impersonation_writes_open_entity
  on public.platform_impersonation_writes(gym_id, entity_type, entity_id) where reverted_at is null;

alter table public.platform_impersonation_sessions
  add column if not exists reverted_at timestamptz,
  add column if not exists revert_error text;

alter table public.platform_impersonation_writes enable row level security;

-- Platform admins see and manage every ledger row.
create policy "Platform admins manage impersonation writes"
  on public.platform_impersonation_writes
  for all
  using ((select public.is_platform_admin()))
  with check ((select public.is_platform_admin()));

-- Tenant staff may read their own gym's ledger (to render badges and
-- refuse edits). They never write to it; the service role does.
create policy "Gym staff read impersonation writes"
  on public.platform_impersonation_writes
  for select
  using (
    exists (
      select 1 from public.admins
      where admins.user_id = auth.uid()
        and admins.gym_id = platform_impersonation_writes.gym_id
    )
  );

-- The two counter RPCs only accepted gym admins; an impersonating platform
-- operator is not one. Accept the active impersonation gym as well.
create or replace function public.generate_member_id(p_gym_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
    v_prefix text;
    v_padding integer;
    v_assigned integer;
begin
    if auth.uid() is not null
       and not exists (select 1 from public.admins where user_id = auth.uid() and gym_id = p_gym_id)
       and public.current_platform_impersonation_gym_id() is distinct from p_gym_id then
        raise exception 'Not authorized for gym %', p_gym_id;
    end if;

    update public.gyms
    set member_id_next_number = member_id_next_number + 1
    where id = p_gym_id
    returning member_id_prefix, member_id_padding, member_id_next_number - 1
    into v_prefix, v_padding, v_assigned;

    if v_prefix is null then
        raise exception 'Gym % not found', p_gym_id;
    end if;

    return v_prefix || lpad(v_assigned::text, v_padding, '0');
end;
$$;
```

Then open `supabase/migrations/20260820150000_receipt_settings.sql`, copy the whole `create or replace function public.generate_receipt_number(...)` body into the migration below the block above, and change only its guard to the same three-condition form (`and public.current_platform_impersonation_gym_id() is distinct from p_gym_id`). Keep everything else in that function identical.

- [ ] **Step 2: Apply the migration to the project**

Call `mcp__supabase__apply_migration` with `name: "impersonation_sandbox"` and `query` = the file contents.

- [ ] **Step 3: Verify in SQL**

Call `mcp__supabase__execute_sql`:

```sql
select column_name from information_schema.columns
where table_name = 'platform_impersonation_writes' order by ordinal_position;
select column_name from information_schema.columns
where table_name = 'platform_impersonation_sessions' and column_name in ('reverted_at','revert_error');
select pg_get_functiondef('public.generate_member_id(uuid)'::regprocedure) ilike '%current_platform_impersonation_gym_id%' as member_id_fixed,
       pg_get_functiondef('public.generate_receipt_number(uuid)'::regprocedure) ilike '%current_platform_impersonation_gym_id%' as receipt_fixed;
```

Expected: 7 columns; 2 rows; `true, true`.

- [ ] **Step 4: Add the types**

In `lib/types/database.types.ts`, add `reverted_at: string | null` and `revert_error: string | null` to the `Row`, and `reverted_at?: string | null` / `revert_error?: string | null` to `Insert` and `Update` of `platform_impersonation_sessions`. Then insert directly after that block:

```ts
            platform_impersonation_writes: {
                Row: {
                    id: string
                    session_id: string
                    gym_id: string
                    entity_type: 'auth_user' | 'profile' | 'member' | 'admin' | 'payment' | 'expense' | 'storage_object'
                    entity_id: string
                    created_at: string
                    reverted_at: string | null
                }
                Insert: {
                    id?: string
                    session_id: string
                    gym_id: string
                    entity_type: 'auth_user' | 'profile' | 'member' | 'admin' | 'payment' | 'expense' | 'storage_object'
                    entity_id: string
                    created_at?: string
                    reverted_at?: string | null
                }
                Update: {
                    id?: string
                    session_id?: string
                    gym_id?: string
                    entity_type?: 'auth_user' | 'profile' | 'member' | 'admin' | 'payment' | 'expense' | 'storage_object'
                    entity_id?: string
                    created_at?: string
                    reverted_at?: string | null
                }
            }
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p .`
Expected: no output.

- [ ] **Step 6: Checkpoint** — ready to commit as "Add impersonation write ledger and open counter RPCs to impersonators".

---

### Task 2: Ledger module

**Files:**
- Create: `lib/platform/impersonation-ledger.ts`

**Interfaces:**
- Consumes: `getCurrentAuthResolution()` from `@/lib/auth/gym-context` (returns `{ activeImpersonation: { id, gym_id, ... } | null }`), `getSupabaseAdmin()` from `@/lib/supabase/admin`.
- Produces (all exported):
  - `type ImpersonationEntityType = 'auth_user' | 'profile' | 'member' | 'admin' | 'payment' | 'expense' | 'storage_object'`
  - `getActiveImpersonation(): Promise<{ sessionId: string; gymId: string } | null>`
  - `recordImpersonationWrite(sessionId: string, gymId: string, entityType: ImpersonationEntityType, entityId: string): Promise<void>` — throws on failure.
  - `isImpersonationOwned(gymId: string, entityType: ImpersonationEntityType, entityId: string): Promise<{ sessionId: string } | null>`
  - `getImpersonationOwnedIds(gymId: string, entityType: ImpersonationEntityType): Promise<Set<string>>`
  - `releaseImpersonationWrite(gymId, entityType, entityId): Promise<void>` — marks reverted (used when the operator deletes their own row).
  - `revertImpersonationSession(sessionId: string): Promise<{ ok: true; counts: Record<ImpersonationEntityType, number> } | { ok: false; error: string }>`
  - `sweepExpiredImpersonations(): Promise<number>`
  - `DEMO_READONLY_MESSAGE`, `IMPERSONATION_READONLY_MESSAGE`, `IMPERSONATION_PAYMENT_MESSAGE` string constants.

- [ ] **Step 1: Write the module**

```ts
import 'server-only'

import { cache } from 'react'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { getCurrentAuthResolution } from '@/lib/auth/gym-context'
import type { InsertTables, QueryResult, Tables } from '@/lib/types'

/**
 * Impersonation sandbox ledger.
 *
 * Every row a platform operator creates while impersonating a tenant is
 * written here, so it can be removed when the session ends and so the tenant
 * can be shown - and stopped from touching - support-created data in the
 * meantime. See docs/superpowers/specs/2026-09-12-impersonation-sandbox-design.md.
 *
 * Service-role throughout: the ledger is platform data that tenant RLS only
 * exposes read-only.
 */

export type ImpersonationEntityType = Tables<'platform_impersonation_writes'>['entity_type']

export const IMPERSONATION_READONLY_MESSAGE = 'Existing records are read-only while impersonating.'
export const IMPERSONATION_PAYMENT_MESSAGE =
    'While impersonating you can only record payments for members created in this session.'
export const DEMO_READONLY_MESSAGE =
    'This record was created by GMS Cloud support for a demo and is read-only. It will be removed automatically when their session ends.'

const ENTITY_TYPES: ImpersonationEntityType[] = [
    'auth_user',
    'profile',
    'member',
    'admin',
    'payment',
    'expense',
    'storage_object',
]

type LedgerRow = Pick<Tables<'platform_impersonation_writes'>, 'id' | 'gym_id' | 'entity_type' | 'entity_id'>

/** The caller's active impersonation session, if any. Request-cached. */
export const getActiveImpersonation = cache(async (): Promise<{ sessionId: string; gymId: string } | null> => {
    const { activeImpersonation } = await getCurrentAuthResolution()
    if (!activeImpersonation) return null
    return { sessionId: activeImpersonation.id, gymId: activeImpersonation.gym_id }
})

export async function recordImpersonationWrite(
    sessionId: string,
    gymId: string,
    entityType: ImpersonationEntityType,
    entityId: string,
): Promise<void> {
    const payload: InsertTables<'platform_impersonation_writes'> = {
        session_id: sessionId,
        gym_id: gymId,
        entity_type: entityType,
        entity_id: entityId,
    }
    const { error } = await getSupabaseAdmin().from('platform_impersonation_writes').insert(payload as never)
    if (error) throw new Error(`Could not record impersonation write: ${error.message}`)
}

export async function isImpersonationOwned(
    gymId: string,
    entityType: ImpersonationEntityType,
    entityId: string,
): Promise<{ sessionId: string } | null> {
    const result = await getSupabaseAdmin()
        .from('platform_impersonation_writes')
        .select('session_id')
        .eq('gym_id', gymId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .is('reverted_at', null)
        .limit(1)
        .maybeSingle()
    const { data } = result as unknown as QueryResult<{ session_id: string } | null>
    return data ? { sessionId: data.session_id } : null
}

/** Ids of every un-reverted row of one type for a gym. One query per list page. */
export async function getImpersonationOwnedIds(
    gymId: string,
    entityType: ImpersonationEntityType,
): Promise<Set<string>> {
    const result = await getSupabaseAdmin()
        .from('platform_impersonation_writes')
        .select('entity_id')
        .eq('gym_id', gymId)
        .eq('entity_type', entityType)
        .is('reverted_at', null)
    const { data } = result as unknown as QueryResult<{ entity_id: string }[] | null>
    return new Set((data ?? []).map((row) => row.entity_id))
}

/** The operator deleted their own demo row themselves; nothing left to revert. */
export async function releaseImpersonationWrite(
    gymId: string,
    entityType: ImpersonationEntityType,
    entityId: string,
): Promise<void> {
    await getSupabaseAdmin()
        .from('platform_impersonation_writes')
        .update({ reverted_at: new Date().toISOString() } as never)
        .eq('gym_id', gymId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .is('reverted_at', null)
}

function emptyCounts(): Record<ImpersonationEntityType, number> {
    return { auth_user: 0, profile: 0, member: 0, admin: 0, payment: 0, expense: 0, storage_object: 0 }
}

/**
 * Deletes everything a session created, in dependency order, and closes the
 * session. Idempotent: rows already reverted are skipped, rows the tenant
 * cannot have touched (they are read-only to the tenant) are simply gone.
 *
 * Stops at the first failure and records it on the session; the next sweep
 * or a manual retry resumes from whatever is still un-reverted.
 */
export async function revertImpersonationSession(
    sessionId: string,
): Promise<{ ok: true; counts: Record<ImpersonationEntityType, number> } | { ok: false; error: string }> {
    const db = getSupabaseAdmin()
    const counts = emptyCounts()

    const sessionResult = await db
        .from('platform_impersonation_sessions')
        .select('id, gym_id, ended_at, reverted_at')
        .eq('id', sessionId)
        .maybeSingle()
    const { data: session } = sessionResult as unknown as QueryResult<
        Pick<Tables<'platform_impersonation_sessions'>, 'id' | 'gym_id' | 'ended_at' | 'reverted_at'> | null
    >
    if (!session) return { ok: false, error: 'Impersonation session not found.' }
    if (session.reverted_at) return { ok: true, counts }

    const rowsResult = await db
        .from('platform_impersonation_writes')
        .select('id, gym_id, entity_type, entity_id')
        .eq('session_id', sessionId)
        .is('reverted_at', null)
    const { data: rows, error: rowsError } = rowsResult as unknown as QueryResult<LedgerRow[] | null>
    if (rowsError) return await fail(sessionId, `Could not load ledger: ${rowsError.message}`)

    const byType = (type: ImpersonationEntityType) => (rows ?? []).filter((row) => row.entity_type === type)
    const now = () => new Date().toISOString()

    async function markReverted(ids: string[]) {
        if (ids.length === 0) return
        const { error } = await db
            .from('platform_impersonation_writes')
            .update({ reverted_at: now() } as never)
            .in('id', ids)
        if (error) throw new Error(`Could not mark ledger rows reverted: ${error.message}`)
    }

    try {
        // 1. Payments: ledgered ones, plus any pointing at a ledgered member.
        const memberIds = byType('member').map((row) => row.entity_id)
        const paymentRows = byType('payment')
        if (paymentRows.length > 0) {
            const { error } = await db.from('payments').delete().in('id', paymentRows.map((row) => row.entity_id))
            if (error) throw new Error(`payments: ${error.message}`)
        }
        if (memberIds.length > 0) {
            const { error } = await db.from('payments').delete().in('member_id', memberIds)
            if (error) throw new Error(`member payments: ${error.message}`)
        }
        counts.payment = paymentRows.length
        await markReverted(paymentRows.map((row) => row.id))

        // 2. Members
        if (memberIds.length > 0) {
            const { error } = await db.from('members').delete().in('id', memberIds)
            if (error) throw new Error(`members: ${error.message}`)
        }
        counts.member = memberIds.length
        await markReverted(byType('member').map((row) => row.id))

        // 3. Admin memberships (entity_id is the user_id)
        const adminRows = byType('admin')
        for (const row of adminRows) {
            const { error } = await db.from('admins').delete().eq('user_id', row.entity_id).eq('gym_id', row.gym_id)
            if (error) throw new Error(`admins: ${error.message}`)
        }
        counts.admin = adminRows.length
        await markReverted(adminRows.map((row) => row.id))

        // 4. Profiles
        const profileRows = byType('profile')
        if (profileRows.length > 0) {
            const { error } = await db.from('profiles').delete().in('id', profileRows.map((row) => row.entity_id))
            if (error) throw new Error(`profiles: ${error.message}`)
        }
        counts.profile = profileRows.length
        await markReverted(profileRows.map((row) => row.id))

        // 5. Auth users the session created (never reused ones)
        const authRows = byType('auth_user')
        for (const row of authRows) {
            const { error } = await db.auth.admin.deleteUser(row.entity_id)
            // "User not found" means it is already gone - fine.
            if (error && !/not found/i.test(error.message)) throw new Error(`auth user: ${error.message}`)
        }
        counts.auth_user = authRows.length
        await markReverted(authRows.map((row) => row.id))

        // 6. Expenses
        const expenseRows = byType('expense')
        if (expenseRows.length > 0) {
            const { error } = await db.from('expenses').delete().in('id', expenseRows.map((row) => row.entity_id))
            if (error) throw new Error(`expenses: ${error.message}`)
        }
        counts.expense = expenseRows.length
        await markReverted(expenseRows.map((row) => row.id))

        // 7. Storage objects
        const storageRows = byType('storage_object')
        if (storageRows.length > 0) {
            const { error } = await db.storage.from('avatars').remove(storageRows.map((row) => row.entity_id))
            if (error) throw new Error(`storage: ${error.message}`)
        }
        counts.storage_object = storageRows.length
        await markReverted(storageRows.map((row) => row.id))
    } catch (err: unknown) {
        return await fail(sessionId, err instanceof Error ? err.message : 'Revert failed')
    }

    const { error: closeError } = await db
        .from('platform_impersonation_sessions')
        .update({
            ended_at: session.ended_at ?? now(),
            reverted_at: now(),
            revert_error: null,
        } as never)
        .eq('id', sessionId)
    if (closeError) return await fail(sessionId, `Could not close session: ${closeError.message}`)

    // Direct insert rather than recordAudit(): this also runs from cron, where
    // there is no request and no platform session.
    await db.from('platform_audit_logs').insert({
        action: 'impersonation.reverted',
        entity_type: 'impersonation_session',
        entity_id: sessionId,
        gym_id: session.gym_id,
        metadata: { counts },
    } as never)

    return { ok: true, counts }
}

async function fail(sessionId: string, error: string): Promise<{ ok: false; error: string }> {
    await getSupabaseAdmin()
        .from('platform_impersonation_sessions')
        .update({ revert_error: error } as never)
        .eq('id', sessionId)
    console.error('[impersonation] revert failed', { sessionId, error })
    return { ok: false, error }
}

/**
 * Reverts every session that has timed out or was ended without a successful
 * revert. Returns how many sessions it processed. Safe to call on every
 * request: when nothing is pending it is one indexed query.
 */
export async function sweepExpiredImpersonations(): Promise<number> {
    const db = getSupabaseAdmin()
    const nowIso = new Date().toISOString()
    const result = await db
        .from('platform_impersonation_sessions')
        .select('id')
        .is('reverted_at', null)
        .or(`expires_at.lt.${nowIso},ended_at.not.is.null`)
        .limit(20)
    const { data } = result as unknown as QueryResult<{ id: string }[] | null>
    let processed = 0
    for (const session of data ?? []) {
        await revertImpersonationSession(session.id)
        processed += 1
    }
    return processed
}

export { ENTITY_TYPES as IMPERSONATION_ENTITY_TYPES }
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npx eslint lib/platform/impersonation-ledger.ts`
Expected: clean. If `Tables<'platform_impersonation_writes'>['entity_type']` fails, Task 1 Step 4 was not applied.

- [ ] **Step 3: Smoke-test the sweep against real data**

Call `mcp__supabase__execute_sql`: `select count(*) from platform_impersonation_sessions where reverted_at is null and (expires_at < now() or ended_at is not null);` Note the number — those historical sessions will be closed (with zero ledger rows) the first time the sweep runs. That is expected and harmless.

- [ ] **Step 4: Checkpoint** — ready to commit as "Add the impersonation ledger module".

---

### Task 3: Ledger member creation; ignore referral codes while impersonating

**Files:**
- Modify: `app/admin/members/actions.ts` — `createMember` (lines ~36–378)

**Interfaces:**
- Consumes: `getActiveImpersonation`, `recordImpersonationWrite` from Task 2.

- [ ] **Step 1: Import and resolve the session once**

Add to imports:

```ts
import { getActiveImpersonation, recordImpersonationWrite } from '@/lib/platform/impersonation-ledger'
```

Directly after the `canAddMember` entitlement check inside the `try` (after `if (!entitlement.ok) { return { error: entitlement.reason } }`), add:

```ts
        const impersonation = await getActiveImpersonation()
        const ledger = impersonation
            ? (type: Parameters<typeof recordImpersonationWrite>[2], id: string) =>
                  recordImpersonationWrite(impersonation.sessionId, viewer.gym!.id, type, id)
            : null
```

- [ ] **Step 2: Ignore referral codes during impersonation**

Change the referral resolution so the lookup only runs for real staff:

```ts
        // Referral codes credit a real member's coin balance, which cannot be
        // undone when a demo session ends - so operators do not get them.
        const rawCode = impersonation ? undefined : (formData.get('referral_code') as string | null)?.trim().toUpperCase()
```

(Keep the rest of that block unchanged; with `rawCode` undefined it is skipped.)

- [ ] **Step 3: Ledger each created thing right after it is created**

After `createdNewAuthUser = true; createdUserId = createUserResult.data.user.id` add:

```ts
            if (ledger) await ledger('auth_user', createdUserId)
```

After `createdProfile = true` add:

```ts
            if (ledger) await ledger('profile', createdUserId)
```

After `createdMemberId = member.id` add:

```ts
        if (ledger) {
            await ledger('member', member.id)
            if (uploadedPhotoPath) await ledger('storage_object', uploadedPhotoPath)
        }
```

The initial payment insert has no `.select()`; change it to return the id and ledger it:

```ts
        const paymentInsertResult = await supabase
            .from('payments')
            .insert(paymentPayload as never)
            .select('id')
            .single()
        const { data: initialPayment, error: paymentError } = paymentInsertResult as unknown as QueryResult<{ id: string } | null>
```

Replace the old `const { error: paymentError } = await supabase.from('payments').insert(...)` with the block above, keep the existing `if (paymentError) { ...cleanup... }` unchanged, and after it add:

```ts
        if (ledger && initialPayment) await ledger('payment', initialPayment.id)
```

Because `ledger()` throws on failure, the existing `catch` block's cleanup (deletes member, profile, auth user, photo) already undoes a partially created member when the ledger insert fails — that is the "row can never exist without a ledger entry" guarantee from the spec. No extra code needed.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npx eslint app/admin/members/actions.ts`
Expected: clean.

- [ ] **Step 5: Manual check**

Impersonate a gym from `/platform/tenants/<id>`, add a member with a photo and a paid plan. Then `mcp__supabase__execute_sql`:

```sql
select entity_type, entity_id from platform_impersonation_writes
where reverted_at is null order by created_at;
```

Expected: `auth_user`, `profile`, `member`, `storage_object`, `payment` rows (auth_user/profile only if the email was new). If `Not authorized for gym` still appears, Task 1 was not applied to the project.

- [ ] **Step 6: Checkpoint** — ready to commit as "Ledger members created during impersonation".

---

### Task 4: Ledger staff creation

**Files:**
- Modify: `app/admin/staff/actions.ts` — `createStaff` (lines ~24–192)

- [ ] **Step 1: Import and resolve**

```ts
import { getActiveImpersonation, recordImpersonationWrite } from '@/lib/platform/impersonation-ledger'
```

After the `canAddStaff` check:

```ts
    const impersonation = await getActiveImpersonation()
    const ledger = impersonation
        ? (type: Parameters<typeof recordImpersonationWrite>[2], id: string) =>
              recordImpersonationWrite(impersonation.sessionId, viewer.gym!.id, type, id)
        : null
```

- [ ] **Step 2: Ledger inside the try**

After `createdNewAuthUser = true` / `createdUserId = ...` in the `else` branch:

```ts
            if (ledger) await ledger('auth_user', createdUserId)
```

After `finalUploadedPhotoPath = fileName` (the photo upload branch):

```ts
            if (ledger) await ledger('storage_object', fileName)
```

After `createdProfile = true`:

```ts
            if (ledger) await ledger('profile', createdUserId)
```

After the `admins` upsert succeeds (after `if (membershipError) { throw membershipError }`):

```ts
        if (ledger) await ledger('admin', createdUserId)
```

The existing `catch` removes photo, profile and auth user on any throw, so a failed ledger insert rolls back. But the `admins` upsert is *not* undone by the catch today; add that so a ledger failure after the upsert cannot leave a stray staff row. Inside the `catch`, before the photo removal:

```ts
        if (createdUserId) {
            await admin.from('admins').delete().eq('user_id', createdUserId).eq('gym_id', viewer.gym.id)
        }
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npx eslint app/admin/staff/actions.ts`
Expected: clean.

- [ ] **Step 4: Manual check**

While impersonating, add a staff account with a new email. SQL: `select entity_type from platform_impersonation_writes where reverted_at is null and entity_type in ('admin','profile','auth_user');` Expected: all three.

- [ ] **Step 5: Checkpoint** — ready to commit as "Ledger staff created during impersonation".

---

### Task 5: Payments and expenses — ledger and impersonation rules

**Files:**
- Modify: `app/admin/finances/payments/actions.ts` — `recordPayment`
- Modify: `app/admin/finances/expenses/actions.ts` — `addExpense`, `deleteExpense`

- [ ] **Step 1: recordPayment — imports**

```ts
import {
    DEMO_READONLY_MESSAGE,
    IMPERSONATION_PAYMENT_MESSAGE,
    getActiveImpersonation,
    isImpersonationOwned,
    recordImpersonationWrite,
} from '@/lib/platform/impersonation-ledger'
```

- [ ] **Step 2: recordPayment — rules, after the subscription gate**

Directly after `const lapsed = await assertActiveSubscription(memberGymRow.gym_id); if (lapsed) return { error: lapsed.error }` add:

```ts
        // Demo members belong to the session that made them: the operator may
        // pay against those and nothing else; the tenant may not pay against
        // them at all (it would move a row that is about to be deleted).
        const impersonation = await getActiveImpersonation()
        const owner = await isImpersonationOwned(memberGymRow.gym_id, 'member', memberId)
        if (impersonation) {
            if (!owner || owner.sessionId !== impersonation.sessionId) {
                return { error: IMPERSONATION_PAYMENT_MESSAGE }
            }
        } else if (owner) {
            return { error: DEMO_READONLY_MESSAGE }
        }
```

- [ ] **Step 3: recordPayment — ledger the payment**

Change the insert's `.select('gym_id')` to `.select('id, gym_id')`, update the cast to `QueryResult<{ id: string; gym_id: string } | null>`, and after `if (paymentError) return { error: ... }` add:

```ts
        if (impersonation && insertedPayment) {
            await recordImpersonationWrite(impersonation.sessionId, memberGymRow.gym_id, 'payment', insertedPayment.id)
        }
```

- [ ] **Step 4: expenses — imports and rules**

Imports:

```ts
import {
    DEMO_READONLY_MESSAGE,
    IMPERSONATION_READONLY_MESSAGE,
    getActiveImpersonation,
    isImpersonationOwned,
    recordImpersonationWrite,
    releaseImpersonationWrite,
} from '@/lib/platform/impersonation-ledger'
```

Change the existing `gate()` helper to also return the viewer so the actions can reach the gym id:

```ts
async function gate(): Promise<{ error: string } | { gymId: string }> {
    const viewer = await getCurrentGymContext()
    if (!viewer.user || !viewer.isStaff || !viewer.gym) {
        return { error: 'You do not have permission to manage expenses.' }
    }
    const lapsed = await assertActiveSubscription(viewer.gym.id)
    if (lapsed) return { error: lapsed.error }
    return { gymId: viewer.gym.id }
}
```

`addExpense`:

```ts
export async function addExpense(formData: FormData) {
    const gated = await gate()
    if ('error' in gated) return { error: gated.error }

    const supabase = await createClient()
    // ...existing parsing and validation unchanged...

    const insertResult = await supabase.from('expenses').insert(expensePayload as never).select('id').single()
    const { data: inserted, error } = insertResult as unknown as QueryResult<{ id: string } | null>

    if (error) return { error: error.message }

    const impersonation = await getActiveImpersonation()
    if (impersonation && inserted) {
        await recordImpersonationWrite(impersonation.sessionId, gated.gymId, 'expense', inserted.id)
    }

    revalidatePath('/admin/finances/expenses')
    return { success: true }
}
```

(Add `QueryResult` to the existing `import type { InsertTables } from '@/lib/types'`.)

`deleteExpense`:

```ts
export async function deleteExpense(id: string) {
    const gated = await gate()
    if ('error' in gated) return { error: gated.error }

    const impersonation = await getActiveImpersonation()
    const owner = await isImpersonationOwned(gated.gymId, 'expense', id)
    if (impersonation) {
        if (!owner || owner.sessionId !== impersonation.sessionId) return { error: IMPERSONATION_READONLY_MESSAGE }
    } else if (owner) {
        return { error: DEMO_READONLY_MESSAGE }
    }

    const supabase = await createClient()
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) return { error: error.message }
    if (owner) await releaseImpersonationWrite(gated.gymId, 'expense', id)
    revalidatePath('/admin/finances/expenses')
    return { success: true }
}
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npx eslint app/admin/finances`
Expected: clean.

- [ ] **Step 6: Manual check**

Impersonating: record a payment for a *real* member → toast shows the `While impersonating you can only record payments…` message. Record one for the demo member → succeeds; SQL shows a `payment` ledger row. Add an expense → `expense` ledger row. Delete that expense → ledger row gets `reverted_at`.

- [ ] **Step 7: Checkpoint** — ready to commit as "Sandbox payments and expenses during impersonation".

---

### Task 6: Read-only rules for updates and deletes (members, staff, notification settings)

**Files:**
- Modify: `app/admin/members/actions.ts` — `updateMember`, `deleteMember`
- Modify: `app/admin/staff/actions.ts` — `updateStaff`
- Modify: `app/admin/settings/notifications/actions.ts` — `updateNotificationSettings`

- [ ] **Step 1: Shared guard in the ledger module**

Append to `lib/platform/impersonation-ledger.ts`:

```ts
/**
 * Who may change an existing row. Operators may only touch rows their own
 * session created; tenants may not touch demo rows at all. Returns the
 * refusal message, or null when the write may proceed, plus whether the row
 * is a demo row (callers that delete need to release the ledger entry).
 */
export async function checkMutationAllowed(
    gymId: string,
    entityType: ImpersonationEntityType,
    entityId: string,
): Promise<{ error: string; owned: boolean } | { error: null; owned: boolean }> {
    const [impersonation, owner] = await Promise.all([
        getActiveImpersonation(),
        isImpersonationOwned(gymId, entityType, entityId),
    ])
    if (impersonation) {
        if (!owner || owner.sessionId !== impersonation.sessionId) {
            return { error: IMPERSONATION_READONLY_MESSAGE, owned: Boolean(owner) }
        }
        return { error: null, owned: true }
    }
    if (owner) return { error: DEMO_READONLY_MESSAGE, owned: true }
    return { error: null, owned: false }
}
```

- [ ] **Step 2: updateMember / deleteMember**

Add to the members actions import: `checkMutationAllowed, releaseImpersonationWrite` from `@/lib/platform/impersonation-ledger`.

In `updateMember`, after `if (!memberId) { return { error: 'Member ID is required' } }`:

```ts
        const allowed = await checkMutationAllowed(viewer.gym.id, 'member', memberId)
        if (allowed.error) return { error: allowed.error }
```

In `deleteMember`, after the same `memberId` guard:

```ts
        const allowed = await checkMutationAllowed(viewer.gym.id, 'member', memberId)
        if (allowed.error) return { error: allowed.error }
```

And at the end of `deleteMember`'s success path (just before its `revalidatePath('/admin/members')`):

```ts
        if (allowed.owned) await releaseImpersonationWrite(viewer.gym.id, 'member', memberId)
```

- [ ] **Step 3: updateStaff**

Import `checkMutationAllowed`. After `updateStaff` parses `const id = ...` and validates it exists (find the `if (!id ...)` guard), add:

```ts
    const allowed = await checkMutationAllowed(viewer.gym.id, 'admin', id)
    if (allowed.error) return { error: allowed.error }
```

(`id` in `updateStaff` is the user_id, matching the ledger convention for `admin`.)

- [ ] **Step 4: updateNotificationSettings**

Import `getActiveImpersonation, IMPERSONATION_READONLY_MESSAGE`. After the subscription gate:

```ts
    // Edits the gym row itself; there is no demo version of that.
    if (await getActiveImpersonation()) return { error: IMPERSONATION_READONLY_MESSAGE }
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npx eslint app/admin/members/actions.ts app/admin/staff/actions.ts app/admin/settings/notifications/actions.ts lib/platform/impersonation-ledger.ts`
Expected: clean.

- [ ] **Step 6: Manual check**

Impersonating: edit a real member → `Existing records are read-only while impersonating.`; edit the demo member → saves. Log in as the tenant: edit the demo member → `This record was created by GMS Cloud support…`.

- [ ] **Step 7: Checkpoint** — ready to commit as "Make existing rows read-only to impersonators and demo rows read-only to tenants".

---

### Task 7: Suppress notifications to demo members

**Files:**
- Modify: `lib/notifications/service.ts` — `sendMemberWhatsAppNotification` (~line 361)

- [ ] **Step 1: Add the skip**

Import `isImpersonationOwned` from `@/lib/platform/impersonation-ledger`. Immediately after the existing lapsed-subscription skip block, add:

```ts
        // Demo members created by a support session have made-up numbers and
        // will be deleted; never message them.
        if (await isImpersonationOwned(member.gym_id, 'member', memberId)) {
            console.info('[notifications] Skipping notification for impersonation demo member', {
                memberId,
                notificationType,
                source,
            })

            return {
                success: true,
                status: 'skipped',
                message: 'This member is a support demo record.',
                memberId,
                notificationType,
                reason: 'impersonation_demo',
            }
        }
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npx eslint lib/notifications/service.ts`
Expected: clean.

- [ ] **Step 3: Manual check**

Create a demo member while impersonating (Task 3 flow). The success toast must not mention a WhatsApp failure, and `select status, error_message from notification_logs order by created_at desc limit 1` must not show a row for that member.

- [ ] **Step 4: Checkpoint** — ready to commit as "Never notify impersonation demo members".

---

### Task 8: Revert on Stop, cron sweep, lazy sweep

**Files:**
- Modify: `app/platform/actions.ts` — `stopImpersonation` (~line 196)
- Create: `app/api/cron/impersonation-cleanup/route.ts`
- Modify: `vercel.json`
- Modify: `app/admin/layout.tsx`, `app/platform/(portal)/layout.tsx`

- [ ] **Step 1: stopImpersonation reverts before ending**

Import `revertImpersonationSession` from `@/lib/platform/impersonation-ledger`. Replace the body of the `if (session.admin) { ... }` block with:

```ts
    if (session.admin) {
        const service = getSupabaseAdmin()

        // Revert first so the operator never lands on a tenant page that still
        // lists their demo rows. A failed revert still ends the session; the
        // error is stored on it and surfaced in the portal.
        if (session.impersonation) {
            await revertImpersonationSession(session.impersonation.id)
        }

        await service
            .from('platform_impersonation_sessions')
            .update({ ended_at: new Date().toISOString() } as never)
            .eq('platform_admin_id', session.admin.id)
            .is('ended_at', null)

        await recordAudit({
            action: 'tenant.impersonation.stop',
            entityType: 'gym',
            entityId: session.impersonation?.gym_id ?? null,
            gymId: session.impersonation?.gym_id ?? null,
        })
    }
```

- [ ] **Step 2: Cron route**

Open `app/api/cron/billing-lifecycle/route.ts` and copy its secret check exactly (lines ~24–35). Create `app/api/cron/impersonation-cleanup/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { sweepExpiredImpersonations } from '@/lib/platform/impersonation-ledger'

/**
 * Closes impersonation sessions that timed out without an explicit Stop and
 * removes everything they created. Runs every 15 minutes (vercel.json); the
 * admin and platform layouts also sweep lazily so demo rows rarely outlive a
 * session by more than a page load.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    // <paste the CRON_SECRET / authorization check from billing-lifecycle here, unchanged>

    const processed = await sweepExpiredImpersonations()
    return NextResponse.json({ ok: true, processed })
}
```

- [ ] **Step 3: Schedule it**

`vercel.json` — add to `crons`:

```json
    {
      "path": "/api/cron/impersonation-cleanup",
      "schedule": "*/15 * * * *"
    }
```

- [ ] **Step 4: Lazy sweep in both layouts**

In `app/admin/layout.tsx`, import `sweepExpiredImpersonations` and add, right after the `requireActiveSubscription(...)` call:

```ts
    // Timed-out support sessions are cleaned up here as well as by cron, so
    // the tenant does not see demo rows for up to 15 minutes after a timeout.
    // Never awaited past a short budget and never allowed to fail the page.
    await Promise.race([
        sweepExpiredImpersonations().catch((err) => console.error('[impersonation] lazy sweep failed', err)),
        new Promise((resolve) => setTimeout(resolve, 1500)),
    ])
```

Do the same in `app/platform/(portal)/layout.tsx` after its session check (find `requirePlatformSession` or equivalent at the top of the component and add the block after it).

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npx eslint app/platform/actions.ts app/api/cron/impersonation-cleanup/route.ts app/admin/layout.tsx "app/platform/(portal)/layout.tsx"`
Expected: clean.

- [ ] **Step 6: Manual check — Stop**

Impersonate, create a member + expense, click **Exit impersonation**. SQL:

```sql
select reverted_at, revert_error from platform_impersonation_sessions order by started_at desc limit 1;
select count(*) from platform_impersonation_writes where reverted_at is null;
select action, metadata from platform_audit_logs where action = 'impersonation.reverted' order by created_at desc limit 1;
```

Expected: `reverted_at` set, `revert_error` null; `0`; an audit row with counts. Confirm in the tenant's member list the demo member is gone and in Supabase Auth the demo user is gone.

- [ ] **Step 7: Manual check — timeout**

Impersonate, create a member, then in SQL `update platform_impersonation_sessions set expires_at = now() - interval '1 minute' where id = '<session id>'`. Load `/admin/dashboard` as the tenant. Same checks as Step 6 — the lazy sweep should have run. Then `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/impersonation-cleanup` → `{"ok":true,"processed":0}`.

- [ ] **Step 8: Checkpoint** — ready to commit as "Revert impersonation sessions on stop, on timeout, and lazily".

---

### Task 9: "Support demo" badges and disabled controls

**Files:**
- Create: `components/platform/SupportDemoBadge.tsx`
- Modify: `app/admin/members/page.tsx` + `components/tables/MembersTable.tsx`
- Modify: `app/admin/members/[id]/page.tsx`
- Modify: `app/admin/staff/page.tsx` + `components/staff/StaffDirectory.tsx`
- Modify: `app/admin/staff/[id]/page.tsx`
- Modify: `app/admin/finances/payments/page.tsx` + `components/tables/PaymentsTable.tsx`
- Modify: `app/admin/finances/expenses/page.tsx` + `components/financial/ExpenseDashboard.tsx`
- Modify: `components/layout/ImpersonationBanner.tsx`, `app/admin/layout.tsx`

**Interfaces:**
- Produces: `SupportDemoBadge` component; each list component gains a `demoIds: string[]` prop and each detail page a `isDemo` flag.

- [ ] **Step 1: Badge component**

```tsx
import { IconTool } from '@tabler/icons-react'
import { DEMO_READONLY_MESSAGE } from '@/lib/platform/impersonation-ledger'

/**
 * Marks a row created by a platform operator during a support session. The
 * tenant can look but not touch; the row disappears when the session ends.
 */
export default function SupportDemoBadge({ className = '' }: { className?: string }) {
    return (
        <span
            title={DEMO_READONLY_MESSAGE}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-violet-700 ring-1 ring-inset ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/25 ${className}`}
        >
            <IconTool size={10} stroke={2} />
            Support demo
        </span>
    )
}
```

`DEMO_READONLY_MESSAGE` lives in a `server-only` module; a client component cannot import it. Move the three message constants into a new plain module `lib/platform/impersonation-messages.ts` (no `server-only`), re-export them from the ledger module, and import the badge's tooltip from the messages module instead.

- [ ] **Step 2: Pass demo ids into each list**

Pattern, shown for members; repeat for staff (`'admin'`, ids are `user_id`), payments (`'payment'`), expenses (`'expense'`):

`app/admin/members/page.tsx` — import `getImpersonationOwnedIds` and `getCurrentGymContext`; before rendering:

```ts
    const { gym } = await getCurrentGymContext()
    const demoIds = gym ? Array.from(await getImpersonationOwnedIds(gym.id, 'member')) : []
```

and pass `demoIds={demoIds}` to `<MembersTable ... />`.

`components/tables/MembersTable.tsx` — add `demoIds?: string[]` to `MembersTableProps`, `const demo = useMemo(() => new Set(demoIds), [demoIds])` inside the component, then:

- next to the member name cell: `{demo.has(member.id) ? <SupportDemoBadge className="ml-2" /> : null}`
- the Edit `Link` and Delete `button` for that row: render them `disabled` with `title={DEMO_READONLY_MESSAGE}` when `demo.has(member.id)`. For the `Link`-wrapped Edit button, render a plain disabled `<button>` instead of the `Link` in that case.

Do the equivalent in `StaffDirectory` (badge next to the name; the row's view/edit navigation stays, edit link on the detail page is what gets disabled), `PaymentsTable` (badge next to the member name in the row; there are no per-row edit controls), and `ExpenseDashboard` (badge in the description cell for both the mobile card and the desktop table; disable both Delete buttons).

- [ ] **Step 3: Detail pages**

`app/admin/members/[id]/page.tsx`: compute `const isDemo = Boolean(await isImpersonationOwned(gym.id, 'member', member.id))`, render `<SupportDemoBadge />` beside the name in the profile card, and replace the Edit `LoadingLinkButton` with a disabled `<button title={DEMO_READONLY_MESSAGE}>` when `isDemo`. Same in `app/admin/staff/[id]/page.tsx` with `'admin'` and `staff.user_id`.

Note on the operator: while impersonating, the operator *should* be able to edit their own demo rows and *not* real ones. The disabled state above is computed for the tenant's view. Add `const impersonation = await getActiveImpersonation()` to each page and invert: when `impersonation` is set, disable controls for rows **not** in `demoIds` (title `Read-only while impersonating`) and enable them for rows that are. Pass `readOnlyMode: 'tenant' | 'operator'` alongside `demoIds` so the client components can pick the right rows to disable:

```ts
    disabled = readOnlyMode === 'operator' ? !demo.has(id) : demo.has(id)
    title = readOnlyMode === 'operator' ? 'Read-only while impersonating' : DEMO_READONLY_MESSAGE
```

- [ ] **Step 4: Banner line**

In `components/layout/ImpersonationBanner.tsx`, inside the `<div>` holding the two `<p>` tags, add after the second paragraph:

```tsx
                    <p className={urgent ? 'mt-1 text-sm text-red-100/75' : 'mt-1 text-sm text-amber-100/75'}>
                        Records you create here are removed when the session ends.
                    </p>
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npx eslint components app/admin`
Expected: clean.

- [ ] **Step 6: Manual check**

As tenant with an active support session on the gym: every list shows the badge on demo rows only; edit/delete controls on those rows are disabled with the tooltip; real rows unaffected. As operator: the inverse. Banner shows the extra line.

- [ ] **Step 7: Checkpoint** — ready to commit as "Tag support-demo rows and disable their controls".

---

### Task 10: Platform portal — pending cleanup notice and retry

**Files:**
- Modify: `app/platform/(portal)/tenants/[id]/page.tsx`
- Modify: `app/platform/actions.ts` — new `retryImpersonationCleanup` action

- [ ] **Step 1: Action**

In `app/platform/actions.ts`:

```ts
export async function retryImpersonationCleanup(sessionId: string): Promise<{ error: string | null }> {
    await requireCapability('impersonate')
    const result = await revertImpersonationSession(sessionId)
    revalidatePath('/platform/tenants', 'layout')
    return { error: result.ok ? null : result.error }
}
```

(Check `requireCapability`'s exact signature at the top of the file and match it.)

- [ ] **Step 2: Notice on the tenant page**

Query, next to the existing tenant fetches:

```ts
    const pendingResult = await getSupabaseAdmin()
        .from('platform_impersonation_sessions')
        .select('id, started_at, revert_error')
        .eq('gym_id', tenant.id)
        .is('reverted_at', null)
        .not('revert_error', 'is', null)
        .order('started_at', { ascending: false })
    const pendingCleanup = (pendingResult.data ?? []) as { id: string; started_at: string; revert_error: string }[]
```

Render above the audit feed, only when non-empty, using the page's existing `.p-*` card classes (this portal uses `platform.css`, which is unlayered — reuse its classes rather than fighting them with Tailwind):

```tsx
            {pendingCleanup.length > 0 ? (
                <section className="p-card">
                    <h2 className="p-card-title">Support session cleanup needed</h2>
                    <ul>
                        {pendingCleanup.map((s) => (
                            <li key={s.id} className="flex items-center justify-between gap-4 py-2">
                                <div>
                                    <p className="text-[13px]">Session started {new Date(s.started_at).toLocaleString('en-IN')}</p>
                                    <p className="text-[12px] text-[var(--p-danger)]">{s.revert_error}</p>
                                </div>
                                <form action={retryImpersonationCleanup.bind(null, s.id)}>
                                    <button type="submit" className="p-btn p-btn-secondary">Retry cleanup</button>
                                </form>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
```

Look up the real class names for a card, its title, and a secondary button in `app/platform/platform.css` before writing this and substitute them.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit -p . && npx eslint "app/platform/(portal)/tenants/[id]/page.tsx" app/platform/actions.ts`
Expected: clean.

- [ ] **Step 4: Manual check**

Force a failure: impersonate, create a member, then in SQL insert a bogus ledger row `insert into platform_impersonation_writes (session_id, gym_id, entity_type, entity_id) values ('<session>', '<gym>', 'storage_object', 'does-not-exist/x.png')` — actually Supabase storage `remove` of a missing path does not error, so instead temporarily revoke: `update platform_impersonation_writes set entity_type = 'member', entity_id = 'not-a-uuid' where entity_id = 'does-not-exist/x.png'`. Stop the session → the tenant page shows the notice with a Postgres uuid error. Delete that bogus row in SQL, click **Retry cleanup** → notice disappears, session has `reverted_at`.

- [ ] **Step 5: Checkpoint** — ready to commit as "Surface failed impersonation cleanups in the portal with a retry".

---

## Self-review

**Spec coverage**
- Data model, RPC fix, RLS → Task 1
- Ledger module, revert order, sweep, audit → Task 2 (+ `checkMutationAllowed` in Task 6)
- createMember rules + referral ignore → Task 3; createStaff → Task 4; recordPayment/addExpense/deleteExpense → Task 5; update/delete member, updateStaff, notification settings → Task 6
- Notification suppression → Task 7
- Stop / cron / lazy sweep → Task 8
- Badges, disabled controls, banner line → Task 9
- Portal revert status + retry → Task 10
- Failure handling: ledger-insert failure rolls back via existing catch blocks (Tasks 3–4 note this; Task 4 adds the missing `admins` rollback); partial revert retry (Task 2 `fail()` + Task 10)

**Type consistency**
- `getActiveImpersonation` returns `{ sessionId, gymId }` everywhere.
- `isImpersonationOwned` returns `{ sessionId } | null` everywhere.
- `checkMutationAllowed` returns `{ error, owned }` and is used with `.error` / `.owned` in Task 6.
- `admin` ledger ids are user_ids in Tasks 2, 4, 6, 9.
- Message constants are moved to `lib/platform/impersonation-messages.ts` in Task 9 Step 1; the server modules re-export them, so imports written in Tasks 5–7 keep working.
