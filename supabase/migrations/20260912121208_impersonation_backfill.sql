-- Sessions that ended before the sandbox existed have nothing to revert;
-- mark them so the first sweep does not emit an audit row for each.
update public.platform_impersonation_sessions
set reverted_at = ended_at
where ended_at is not null and reverted_at is null;
