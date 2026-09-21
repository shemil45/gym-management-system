# Referral leads workflow

Replaces "friend tells the desk a code" with "member shares a link, friend
submits three fields, staff completes registration from the lead".

## Lifecycle

```
Member opens /member/referrals ──► referral_token issued (members.referral_token)
Member shares /join/<gym-slug>/<token>   (Copy / Share / WhatsApp)
Friend submits name + mobile + email ──► referrals row, source='link', status PENDING
                                          expires_at = submitted_at + 14 days
Gym notified                           ──► gym_notifications row (header bell) + WhatsApp to gym contact (best effort)
Staff: Members → Referral leads → Complete Registration
       /admin/members/add?lead=<id> prefilled ──► createMember converts: PENDING → CONVERTED, referred_id set, referrer credited
Otherwise: PENDING → EXPIRED (14 days) or PENDING → CANCELLED (staff)
```

Expired and cancelled rows are never deleted.

## Schema (migration `20260920100000_referral_leads_workflow.sql`)

`referrals` is extended, not replaced: a lead is a referral whose
`referred_id` is still null.

- New columns: `referred_name`, `referred_phone`, `referred_email`,
  `submitted_at`, `expires_at`, `cancelled_at`, `cancelled_by`,
  `source ('link' | 'staff')`.
- Status set is now `pending | converted | expired | cancelled`. The old
  `applied` value (referrer credited) was renamed `converted`; `applied_at`
  keeps its name and is the conversion timestamp.
- Partial unique indexes on `(gym_id, referred_phone)` and
  `(gym_id, referred_email)` for pending leads make duplicate submissions
  race-safe.
- `members.referral_token` (unique, random 20-char base64url),
  `referral_token_created_at`, `referral_link_visits`.
- `gym_notifications`: in-app notices for staff, RLS staff-of-gym read/update,
  written by the service role.
- `expire_referral_leads()`: flips overdue pending leads to `expired`.

## Expiry

Enforced in three places, none of which depend on the others:

1. **Read path**: `effectiveReferralStatus()` treats a pending lead whose
   `expires_at` has passed as expired. Every list, the report, and the
   Add Member prefill use it.
2. **Conversion**: `convertReferralLead` is one conditional `UPDATE … WHERE
   status='pending' AND referred_id IS NULL AND expires_at > now()`. Zero rows
   means expired / already converted / cancelled / other gym — the member is
   still created but the referral is not converted and the referrer is not
   credited. This is also the lock against two staff converting the same
   lead.
3. **Stored status**: `expire_referral_leads()` runs from the daily
   `check-expiring-memberships` cron, lazily when the leads page loads, and
   before every lead submission (so an expired lead does not hold the
   phone/email unique slot).

## Duplicate handling (`submitReferralLead`)

Phone and email are each checked (both against members and against open
leads), so reusing either one is caught. In order:

1. Phone or email already belongs to a **member of this gym** → no lead;
   the visitor sees "You are already an existing member of [gym]". Only
   the referring gym's members count: being a member elsewhere is fine.
2. A **pending, unexpired lead** exists for the same phone or email in this
   gym → no new lead; the visitor lands on the same confirmation screen,
   which names who referred them (when it was another member) and shows the
   existing referral's real expiry date and days left — the expiry is never
   reset. The first referral stands while it is open, so re-submitting under
   another member's link cannot reassign it. After expiry/cancellation a
   fresh submission starts a new lead.
3. Otherwise → new pending lead, 14 days from now.

Staff-side: when staff register someone through the plain Add Member form
(not via Complete Registration), `createMember` looks up an open link lead
by phone (either stored spelling) or email and converts it, crediting the
lead's referrer, with a toast saying so. If staff also picked a *different*
"Referred by" member, the save is refused so one join never credits two
people. A duplicate email within the gym is still rejected outright.

## Tenant isolation

- The URL slug is checked against the token owner's gym; a token from gym A
  under gym B's slug is "not found".
- `getReferralLead`, `listReferralLeads`, `cancelReferralLead`,
  `convertReferralLead`, `checkLeadConvertible`, `getOrCreateReferralLink`
  all filter by the viewer's gym id from server context, never from input.
- The public form posts no gym id, member id, or referral id; only the
  three fields plus a honeypot.
- The unscoped `/api/referral-lookup` endpoint was removed.

## Analytics

- "Referrals started" (`created`) = leads submitted via link + referrals
  recorded at the desk. Generated links are **not** referrals; they appear
  only as the first funnel stage (`linksGenerated`, from
  `members.referral_token_created_at`).
- New Overview figures: leads via link, pending, expired, cancelled; funnel
  is Links generated → Referrals started → Converted.
- Referral list status chips: Pending / Converted / Expired / Cancelled;
  list shows Source and Expires.

## Fallback

The desk-side "Referred by" picker on Add Member stays for walk-ins who
never used a link (`source='staff'`, converted and credited on save). The
member's ID is still shown on the referral page as a front-desk code.
