# Bubloo Scientist replica — work in progress

## What is implemented
- Responsive frontend in dist, search, category filters, accessible article dialog, team and contact sections.
- Supabase REST integration with explicit unconfigured/error states.
- Editor login, article draft/publish/edit/delete, and private message listing.
- Database schema in backend/schema.sql: RLS on every exposed table, public published-only reads, administrator writes based on app_metadata.

## Current limits
- Branding is a provisional navy/cyan direction. The attached 223×204 logo could not be downloaded because the host cannot resolve external addresses. The original logo has NOT been substituted or recreated.
- Four preview excerpts are paraphrased from the original site's home page; full article bodies, creative pages, entrepreneurship pages, quizzes and chatbot have NOT been migrated.
- No live Supabase project has been provisioned: cost lookup is unavailable.
- No build, browser QA, database integration tests, deployment or GitHub push has succeeded yet.
- The original Vinext starter is retained outside dist. Hosting uses only dist.

## Local preview
Run: python -m http.server 4173 --directory dist
Open http://localhost:4173
No package installation is required for this static frontend.

## Connect the backend
1. Provision the new project in the Bubloo Scientist organization after confirming current cost.
2. Apply backend/schema.sql.
3. Set supabaseUrl and publishableKey in dist/config.js. Never add a secret/service-role key.
4. Create the editor account in Supabase Auth; assign app_metadata.role=admin through a trusted administrator operation. Refresh/sign in again after role changes.
5. Run anonymous and authenticated policy tests: drafts must be hidden from public/nonadmin users, nonadmins cannot write articles or read messages, admins can manage content.
6. Before public launch, put contact submissions behind server-side rate limiting and bot verification. This draft currently permits direct public inserts with database validation.
7. Add the original logo at dist/logo.png and replace the temporary text wordmark after verifying visual theme.

## Intended delivery
Figma: https://www.figma.com/design/URSxSZeUYE962Yry6zeEhK
Sites project: appgprj_6ad11c282a608191adb012ef919fd3e4
Requested GitHub target: new abdurrehman131211/bubloo-scientist repository.
