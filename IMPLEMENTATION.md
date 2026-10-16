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
No editor account exists yet. Create your account with a password you choose in:
https://supabase.com/dashboard/project/kmruzyadvdngqsszsphw/auth/users

Then run this in Supabase SQL Editor, replacing the UUID with that exact account ID:

    update auth.users
    set raw_app_meta_data = coalesce(raw_app_meta_data,'{}'::jsonb) || '{"role":"admin"}'::jsonb
    where id = 'YOUR-ACCOUNT-UUID'::uuid;

Sign in at /admin.html. Account creation and this role assignment happen in the trusted dashboard, never in public browser code.
Sessions stay in memory; sign in again after reload or token expiry.

## Reproduce backend setup
Apply these in order to a new project:
1. backend/schema.sql
2. backend/contact.sql
3. backend/privileges.sql
Deploy backend/functions/contact/index.ts as the contact Edge Function with JWT verification enabled.
Update dist/config.js with that project's public keys and URL.

## Validation
- node --check passes for the frontend scripts.
- node backend/tests/contact.mjs checks validation, honeypot, method restrictions, and rate-limit responses with a mocked upstream.
- backend/tests/access.sql passed against the live database: public visibility, private message protection, administrator writes, and contact limits. Test fixtures were rolled back.
- End-to-end HTTP/browser checks are unverified because the host's network access is blocked.

## Remaining work
- Apply the supplied logo and verify the theme: attachment download remains blocked.
- Migrate full articles and remaining original pages. The database is intentionally not populated with invented content.
- Create the editor account as above.
- Deploy the frontend. Sites source-server DNS remains blocked.
- Add CAPTCHA if needed for stronger abuse resistance; email/global submission limits are already active.

## Run locally
python -m http.server 4173 --directory dist

Open http://localhost:4173. No dependency installation is needed.

Figma: https://www.figma.com/design/URSxSZeUYE962Yry6zeEhK
GitHub: https://github.com/abdurrehman131211/Bubloo-Scientist
