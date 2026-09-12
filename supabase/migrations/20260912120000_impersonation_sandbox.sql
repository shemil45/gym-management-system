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
    IF auth.uid() IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM public.admins WHERE user_id = auth.uid() AND gym_id = p_gym_id
       )
       AND public.current_platform_impersonation_gym_id() IS DISTINCT FROM p_gym_id THEN
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
