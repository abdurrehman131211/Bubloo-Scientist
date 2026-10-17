# Bubloo Scientist

Production: https://bubloo-scientist.vercel.app/
Studio: https://bubloo-scientist.vercel.app/admin.html
Repository: https://github.com/abdurrehman131211/Bubloo-Scientist
Supabase project: kmruzyadvdngqsszsphw

## Account management
Public registration is closed in the interface and at the Auth database insert boundary. Only the existing owner can manage administrators in Users. Create a new account accepts an email and an initial password of at least 12 characters. The create-admin Edge Function validates the caller through Auth and checks their current owner role, then reserves a random account UUID through a service-only RPC before calling Auth Admin. A trigger consumes the matching reservation when Auth inserts the user; reservations expire after five minutes. User or app metadata cannot authorize registration. A reservation is needed because Auth applies custom app_metadata after inserting the user.

Account creation confirms the supplied email administratively; it does not verify mailbox ownership. The owner must verify the intended recipient and share credentials privately. New admins should change the initial password in Profile. No invitation email is sent automatically. Add existing account never changes its password and requires an existing Auth account. The protected owner cannot be removed from the UI. Membership is checked fresh against the database; removing access blocks subsequent data writes even with an unexpired token.

## Profile and remembered sign-in
Profile is available in the top bar and sidebar: picture, display name, private phone number, bio, email change requests and password changes. Phone is a contact field, not a verified sign-in factor. Profiles have self-only RLS, including ownership checks on updates. Avatar image URLs are public; profile details are private. Email changes use Supabase Auth confirmation, and user-ID-bound membership survives an email change. Configure production Auth Site URL/redirect URLs and custom SMTP for reliable email delivery. Confirmation delivery has not been tested here.

Remember me is checked by default. Browser storage contains access/refresh tokens, never passwords. Refresh happens before authenticated requests and when returning to the tab. Concurrent refreshes share an operation and Web Locks coordinate tabs where supported. Unchecking Remember me uses tab session storage. Signout clears browser tokens and revokes the refresh session. Global signout revokes refresh sessions; already-issued access tokens on other devices expire normally.

## Article pictures
Upload up to 12 JPG, PNG, WebP or GIF pictures per article, up to 5 MB each. Add alt text and captions, choose the first image as cover, and use Insert in article to position pictures in plain text with [[image:UUID]] markers. Other images appear after the body. Preview and public readers share a safe DOM renderer with no HTML parsing. Only editors upload article images; avatar uploads are limited to 2 MB. SVG and HTML uploads are excluded. Removing a picture unlinks it; orphan uploads are not automatically garbage-collected.

## Backend setup
The connected project already has schema.sql, editor.sql, privileges.sql, contact.sql, article_sources.sql and users.sql.
Apply studio-settings.sql followed by provisioning.sql. Deploy backend/functions/create-admin/index.ts as create-admin with verify_jwt enabled. provisioning.sql supersedes the initial metadata guard in studio-settings.sql with a service-only reservation guard. Only public keys are in frontend config; privileged keys stay in the Edge Function environment. Contact validation and rate limits remain active.

## Verification
- node backend/tests/contact.mjs
- node backend/tests/session.mjs
- node backend/tests/create-admin.mjs
- backend/tests/settings.sql and users.sql passed in the connected database with all fixtures rolled back.
- Shipped frontend JavaScript syntax passed. DOM smoke checks passed startup, login, profile load/save, preview, selector contracts and safe image rendering.
- Visual browser checks were unavailable because the browser runtime could not launch. Full live Auth account creation and email delivery remain unverified. Automatic approval review blocked creating a persistent QA administrator; no such account was created.
- Security advisor reports no database findings. Existing Auth warning: leaked-password protection is disabled. https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- The local command service disconnected before commit. Sources were recovered through GitHub, the same changes reapplied, and resulting scripts checked for syntax and smoke-tested again before committing.

## Content and local preview
The supplied logo, eight content pages and four source-linked editorial summaries are integrated. Full original articles/assets still require a WordPress export.
Run python -m http.server 4173 --directory dist.
Run python scripts/build-pages.py after editing content/pages.json or the shared header.
Vercel deploys the dist frontend from main.

## Google sign-in
The Studio supports Google OAuth with S256 PKCE, verified matching Google email, current server-side admin membership validation, callback URL cleanup, and remembered sessions. No public signup or admin allowlist lookup was added. Google was disabled in Supabase on 17 October 2026; activation requires Google OAuth credentials and the exact redirect URLs in backend/google-signin-setup.md. The UI keeps password sign-in available and explains when Google is unavailable. Full Google consent/callback testing remains pending provider setup. Run node backend/tests/google-signin.mjs and node backend/tests/studio-ui.mjs for the automated checks.
