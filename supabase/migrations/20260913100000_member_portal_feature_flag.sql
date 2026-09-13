-- The operational flag seeded as `member_support` never gated anything, and
-- the member help page it named should always be reachable. Repurpose the
-- row as the member-portal kill switch: when it resolves false for a gym,
-- every member of that gym sees the "temporarily unavailable" screen.
--
-- An update rather than delete + insert so existing gym_feature_overrides
-- rows (FK on the flag id) carry over. The key matches the sellable
-- `member_portal` plan feature, so plan entitlements resolve it too.
update public.platform_feature_flags
   set key = 'member_portal',
       description = 'Members of this gym can sign in to the member portal.'
 where key = 'member_support';
