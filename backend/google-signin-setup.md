# Enable Google sign-in for the Studio

The frontend supports Google sign-in using Supabase Auth and S256 PKCE. The
Google provider was disabled when checked on 17 October 2026. This document
contains setup values, never OAuth secrets.

1. In Google Cloud Console, configure the OAuth consent screen for Bubloo
   Scientist and create an OAuth client with application type **Web application**.
2. Add this authorized JavaScript origin:
   `https://bubloo-scientist.vercel.app`
3. Add this authorized redirect URI (Google returns to Supabase first):
   `https://kmruzyadvdngqsszsphw.supabase.co/auth/v1/callback`
4. In Supabase project `kmruzyadvdngqsszsphw`, open Authentication > Sign In /
   Providers > Google, enter the Google client ID and secret, enable Google,
   and save. Enter the secret directly into Supabase; do not put it in source,
   browser config, GitHub, screenshots, or chat.
5. In Authentication > URL Configuration, set Site URL to
   `https://bubloo-scientist.vercel.app` and add this exact Redirect URL:
   `https://bubloo-scientist.vercel.app/admin.html`
6. If the Google consent screen is in Testing mode, add approved administrators
   as Google test users. Publish the consent screen when appropriate.
7. Return to /admin.html and reload. The Google button checks provider
   availability automatically. Select the Google account with the exact email
   already approved in Users. Verify on a real admin account, then test that
   an unapproved Google account cannot enter the Studio.

Google sign-in does not provision administrators. The owner must first create
or approve an existing account in Users. Supabase automatically links a Google
identity to an existing user with the same verified email. Apply backend/google-auth-first.sql after provisioning.sql. The registration
trigger permits Google Auth accounts to authenticate first, while public password
registration stays closed. A Google Auth account is not a Studio registration.
The database membership helper and RLS reject all accounts without admin access.
After authentication, approved admins enter; other users see "Not registered"
and their new local session is revoked. No public admin allowlist is exposed.
Neither the allowlist nor a privileged key is exposed to the login page.

The callback validates Auth's current user, a verified matching Google identity,
and the current database role before storing tokens. Rejected callback sessions
are revoked locally; other devices are not signed out. Remember me applies to
Google and password sign-in. A return to the same browser/tab is required for
the PKCE verifier. No implicit-flow tokens from URL fragments are accepted.

Verification: `node backend/tests/google-signin.mjs`. Full Google consent and
callback testing requires the Google provider setup above and was not possible
while it was disabled.

References:
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/auth-identity-linking
- https://supabase.com/docs/guides/auth/sessions/pkce-flow
