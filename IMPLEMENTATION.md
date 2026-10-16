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
Editor access is restricted to the owner's chosen address: bublooscientist2023@gmail.com.
The database checks the authenticated account ID, exact email, and email confirmation directly in auth.users.
User-editable metadata and claimed administrator roles cannot grant access.

Visit /admin.html, enter that email, choose a password of at least 12 characters, and click Create my editor account.
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
