# Phone + password with WhatsApp verification

## Current activation status and costs

The code and database protections are installed. Phone authentication was
disabled when checked on 17 October 2026; no messaging account, paid add-on,
subscription, or test delivery was activated by this implementation.

This feature uses **Supabase Advanced MFA (Phone)** plus Twilio or Twilio Verify
with WhatsApp delivery. The Supabase Phone MFA guide currently lists **$75/month
for the first project**, with separate pricing for additional projects. Confirm
plan eligibility, current pricing, base-plan requirements, and messaging charges
before enabling it. Twilio/WhatsApp delivery is billed separately. An existing
personal WhatsApp account alone cannot deliver application verification codes.

Official setup and pricing references:
- https://supabase.com/docs/guides/auth/auth-mfa/phone
- https://supabase.com/docs/guides/platform/manage-your-usage/advanced-mfa-phone
- https://supabase.com/docs/guides/auth/phone-login
- https://www.twilio.com/docs/verify/whatsapp

## Provider setup (owner action)

1. Review and approve any applicable plan/add-on costs in the Supabase dashboard
   before activating Advanced MFA Phone. Enable phone-factor enrollment and
   verification in Authentication > Multi-Factor Authentication.
2. Configure Twilio or Twilio Verify for an approved WhatsApp sender / Verify
   WhatsApp channel. Complete the provider's required business/sender onboarding
   and authentication-template configuration. Trial/sandbox accounts may restrict
   recipients and are not a production replacement.
3. In Supabase Authentication > Sign In / Providers > Phone, enable the Phone
   provider and enter the matching Twilio configuration directly there. Select
   Twilio or Twilio Verify with WhatsApp support. Keep keys/tokens out of chat,
   browser config and GitHub. Ensure phone confirmations remain enabled.
4. Configure native Auth rate limits and provider spending limits. Use a six-digit
   MFA code (the UI accepts six to eight digits). Delivery/challenge requests use
   `channel: whatsapp`; the implementation does not fall back silently to SMS.
5. Reload the Studio. Phone/password and profile setup are unavailable while the
   public provider-readiness check reports that Phone/Twilio is not configured.
   MFA enrollment errors are handled separately if the paid factor capability
   has not been enabled.

## Admin enrollment

Sign in with email/password or Google. Open **Profile > Phone sign-in & WhatsApp
security**. The contact number is prefilled but is not considered verified.
Use international format, for example `+923001234567`. Google-only accounts need
to set an account password in Profile before using phone/password sign-in.

Click Verify & enable WhatsApp and enter the code sent to that number. Native
Auth factor verification upgrades the session to AAL2. The link-phone Edge
Function validates the session with Auth, checks its signed AAL/user ID and
current admin access, and accepts only an owned, verified native phone factor.
It then attaches that verified number to the same Auth account. Neither a phone
nor another user ID supplied in the request can override this lookup. The UI
updates the private profile contact number after linking.

Phone/password sign-in uses the same existing account password. It sends a
WhatsApp challenge only after successful authentication and membership checks.
No pending password-only session is persisted. After verification succeeds, the
user enters the Studio and Remember me works as before.

**Security applies to all sign-in methods once a verified phone factor exists:**
new email, Google and phone sign-ins must reach AAL2 before entering the Studio.
This prevents bypassing WhatsApp verification via another sign-in option. A
remembered AAL2 session can resume without sending a code on every page load.

Keep email/Google access available while testing enrollment. There is no unsafe
in-app bypass for a lost verification number. Recovery / removal of verified
factors requires the owner's Supabase Auth recovery procedure. Replacing a
number must be verified again; old verified factors are not silently removed.

## Deployment and verification

Apply `backend/phone-security.sql` after the existing user/quiz schema. It adds a
database-backed MFA helper and updates `private.is_site_editor`, so existing RLS
policies on articles, messages, profiles, quizzes and storage enforce AAL2 for
phone-enrolled members. Owner user-management RPCs are also gated. The role
lookup remains available for sign-in bootstrap, but it alone grants no content
access. Existing accounts without phone factors keep their prior login behavior.

Deploy `backend/functions/link-phone/index.ts` and the updated create-admin Edge
Function with JWT verification enabled. The latter now checks editor_access as
well as the owner role, so its privileged API cannot bypass MFA.

Automated checks:
- `node backend/tests/phone-auth.mjs`
- `node backend/tests/link-phone.mjs`
- `node backend/tests/studio-ui.mjs`
- `node backend/tests/create-admin.mjs`
- `backend/tests/phone-security.sql`: tested against the connected database with
  all fixture changes rolled back. No real factor was enrolled or code sent.

Tests cover international format, profile-only numbers, verified factors,
membership, mandatory WhatsApp channel, code errors, AAL upgrades, no workspace
or persistence before OTP, link tampering, password-only RPC/RLS denial and
continued access for existing non-enrolled accounts. Live WhatsApp delivery and
real provider enrollment remain unverified pending provider activation. Visual
browser checks were unavailable. The pre-existing Auth advisor warning is
[disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
