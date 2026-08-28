CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (
    notification_type IN (
      'payment_reminder',
      'membership_expiring',
      'membership_expired',
      'payment_received',
      'welcome_new_member',
      'referral_reward_earned'
    )
  ),
  message text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  sent_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS notification_logs_member_id_idx
  ON public.notification_logs(member_id);

CREATE INDEX IF NOT EXISTS notification_logs_type_sent_at_idx
  ON public.notification_logs(notification_type, sent_at DESC);
