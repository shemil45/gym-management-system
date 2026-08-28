insert into public.platform_admins (user_id, role)
select source.user_id, 'owner'::public.platform_role
from (
  select a.user_id
  from public.admins a
  where a.role = 'owner'
  order by a.created_at asc
  limit 1
) source
where not exists (
  select 1
  from public.platform_admins
)
on conflict (user_id) do nothing;
