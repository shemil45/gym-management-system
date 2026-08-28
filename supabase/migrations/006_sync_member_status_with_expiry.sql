CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.current_membership_business_date()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT timezone('Asia/Kolkata', now())::date;
$$;

CREATE OR REPLACE FUNCTION public.sync_member_statuses(reference_date date DEFAULT public.current_membership_business_date())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  synced_count integer;
BEGIN
  UPDATE public.members
  SET status = CASE
    WHEN membership_expiry_date IS NULL THEN 'inactive'
    WHEN membership_expiry_date < reference_date THEN 'expired'
    ELSE 'active'
  END
  WHERE status IS DISTINCT FROM CASE
    WHEN membership_expiry_date IS NULL THEN 'inactive'
    WHEN membership_expiry_date < reference_date THEN 'expired'
    ELSE 'active'
  END;

  GET DIAGNOSTICS synced_count = ROW_COUNT;
  RETURN synced_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_member_status_from_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.status := CASE
    WHEN NEW.membership_expiry_date IS NULL THEN 'inactive'
    WHEN NEW.membership_expiry_date < public.current_membership_business_date() THEN 'expired'
    ELSE 'active'
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_member_status_before_write ON public.members;

CREATE TRIGGER sync_member_status_before_write
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_member_status_from_expiry();

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'sync-member-status-daily';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;
END;
$$;

SELECT cron.schedule(
  'sync-member-status-daily',
  '30 18 * * *',
  $$SELECT public.sync_member_statuses();$$
);

SELECT public.sync_member_statuses();

REVOKE ALL ON FUNCTION public.current_membership_business_date() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_member_statuses(date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_member_status_from_expiry() FROM PUBLIC, anon, authenticated;
