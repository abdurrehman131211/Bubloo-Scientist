# Bubloo Scientist implementation status

## Connected backend
- Project: Bubloo Scientist Website (kmruzyadvdngqsszsphw).
- Region: ap-south-1. Creation cost quoted by Supabase: $0/month.
- Frontend configuration uses the public publishable key. A legacy public anon JWT is used only for the contact Edge Function gateway; no server secret is committed.
- Articles use row-level security: visitors read published articles; only administrators manage drafts and content.
- Messages are private. Direct public inserts are revoked.
- The deployed contact Edge Function validates submissions and uses a server-only database operation. Limits: 3 messages per normalized email per hour and 100 total per hour.
- Security advisor: no findings at implementation time.

## Editor account
The verified account for bublooscientist2023@gmail.com is the protected owner. Additional administrators are managed from Studio > Users.
The database checks current private membership and email verification directly. Owner identity is bound to the existing authenticated account ID; pending admin grants activate only for the approved, verified email.
User-editable metadata and claimed administrator roles cannot grant access.

Visit /admin.html and choose the Set up account tab. Enter that email, choose and confirm a password of at least 12 characters, then click Create editor account.
Verify your email, then return and sign in. No password is stored in the source code.
If Supabase's confirmation link redirects to its default localhost URL, return to the deployed editor after confirmation;
configure Auth URL settings with the final deployed origin once hosting is available.
Sessions stay in memory; sign in again after reload or token expiry.

## Reproduce backend setup
Apply these in order to a new project:
1. backend/schema.sql
2. backend/contact.sql
3. backend/privileges.sql
4. backend/editor.sql
5. backend/article_sources.sql
6. backend/users.sql
Deploy backend/functions/contact/index.ts as the contact Edge Function with JWT verification enabled.
Update dist/config.js with that project's public keys and URL.

## Validation
- node --check passes for the frontend scripts.
- node backend/tests/contact.mjs checks validation, honeypot, method restrictions, and rate-limit responses with a mocked upstream.
- backend/tests/access.sql passed against the live database: public visibility, private message protection, administrator writes, and contact limits. Test fixtures were rolled back.
- End-to-end HTTP/browser checks are unverified because the host's network access is blocked.

## Content and pages
- Added /creative-2/, /skills/, /explore/, /learning/, /about-us/, /blog-2/, /contact/, /quiz-and-survey/.
- Page descriptions are rewritten from the original website; they are not full archival copies.
- Four live editorial article summaries include explicit source links and summary labels.
- The quiz is newly written for the replica, not migrated from the original site.
- To migrate complete articles, export WordPress Tools > Export > All content.
- Run python scripts/import-wordpress.py export.xml output.sql, review, then apply the SQL.
- Images and original page layouts still need a separate asset migration.
- Run python scripts/build-pages.py after changing content/pages.json or the shared header.

## Remaining work
- The original uploaded logo is integrated into the responsive header and footer on all nine public pages. Browser visual QA remains unverified.
- Import the complete WordPress archive; current live articles are labeled summaries.
- The owner must choose their editor password and verify the email as above.
- Deploy the frontend. Sites source-server DNS remains blocked.
- Add CAPTCHA if needed for stronger abuse resistance; email/global submission limits are already active.

## Run locally
python -m http.server 4173 --directory dist

Open http://localhost:4173. No dependency installation is needed.

Figma: https://www.figma.com/design/URSxSZeUYE962Yry6zeEhK
GitHub: https://github.com/abdurrehman131211/Bubloo-Scientist

## Redesigned Admin Studio
- Dedicated admin.css keeps the main website unchanged.
- Separate sign-in/setup and authenticated workspace layouts.
- Overview shows actual published, draft and message counts.
- Articles has search, status filtering, edit and delete controls.
- Editor includes draft/publish controls, source details, word count and a plain-text preview.
- Messages has its own inbox view; navigation adapts to mobile screens.
- Unsaved drafts warn before being discarded or leaving the page.
- Script syntax and control/asset checks passed. Browser visual and end-to-end interaction checks remain unverified due to browser tooling failures.

## Owner-managed Users
- The owner can add administrator access by email, view account verification/setup status, and remove administrator access.
- Added administrators can manage articles and contact messages but cannot list team access or grant/revoke roles.
- Owner access cannot be removed or demoted through the UI or its RPCs.
- No invitation email is sent. Approved teammates open /admin.html, use Set up account, verify their email, then sign in.
- Removing access does not delete the Auth account. Database role checks take effect on subsequent requests, even with an existing access token.
- Owner-only access history records the last 20 grant/revoke events.
- Membership and audit tables are private, deny direct client access, and are accessed through checked private functions. Public RPC wrappers use SECURITY INVOKER.
- backend/tests/users.sql passed against the live database; fixtures were rolled back. It tests owner protection, pending activation, verification, forbidden escalation, direct-write denial, and immediate revocation.
- Browser visual/end-to-end checks remain unverified.
- Supabase's security advisor reports breached-password protection disabled. Configure this in Auth settings if supported by the project's plan: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
