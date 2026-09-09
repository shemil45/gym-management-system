-- =============================================
-- Per-gym directory counts
--
-- The Platform Portal shows two numbers per gym: how many members, how many
-- staff. It was getting them by selecting EVERY row of public.members and
-- public.admins, unfiltered and unlimited, and counting them in Node. That
-- runs on the tenants directory, the dashboard, the billing overview and the
-- notification tray, so a platform with 300 gyms averaging 500 members was
-- moving 150k rows across the wire to produce 300 integers.
--
-- Worse than slow, it was fragile: PostgREST caps unbounded selects, so past
-- that cap the counts would quietly come back WRONG rather than fail.
--
-- Counting in the database fixes both. The per-gym counts are scalar
-- subqueries rather than two left joins onto one row set: joining members and
-- admins in the same query multiplies them together (500 members x 10 staff =
-- 5000 intermediate rows per gym) and needs count(distinct) to undo the
-- damage. Each subquery below is served by an existing index whose leading
-- column is gym_id (idx_members_gym_status, idx_admins_gym_id).
--
-- Driven from gyms rather than from members, so a gym with nobody in it still
-- gets a row that says 0 instead of dropping out of the directory.
-- =============================================

create or replace view public.gym_directory_counts
with (security_invoker = true) as
select
  g.id as gym_id,
  (select count(*) from public.members m where m.gym_id = g.id) as member_count,
  (select count(*) from public.admins  a where a.gym_id = g.id) as staff_count
from public.gyms g;

comment on view public.gym_directory_counts is
  'Member and staff counts per gym for the Platform Portal directory. Read with the service role only; see the grants below.';

-- This view aggregates across every tenant, which is precisely what tenant
-- RLS exists to prevent, so it is not part of the public API surface. Only
-- the service role reads it, from lib/platform/data.ts, behind a platform
-- session check. security_invoker keeps the underlying table policies in
-- force for any role that is not exempt from them, so the revoke below and
-- the view's own semantics both have to fail before anything leaks.
revoke all on public.gym_directory_counts from anon, authenticated;
grant select on public.gym_directory_counts to service_role;
