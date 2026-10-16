# Bubloo Scientist

Responsive science website with eight additional content pages, a new interactive quiz, and a Supabase backend.

## Preview

```sh
python -m http.server 4173 --directory dist
```

Open http://localhost:4173. No npm installation required.

## Editor

Visit /admin.html. Access is restricted to the verified account for the owner's chosen email. Use Create my editor account to choose a password and confirm your email. See [IMPLEMENTATION.md](IMPLEMENTATION.md).

## Content

The database contains four clearly labeled summaries linked to the original articles. Page descriptions are rewritten from accessible original pages. Complete content and image migration requires a WordPress export XML and original assets. A conversion tool is included:

```sh
python scripts/import-wordpress.py export.xml output.sql
```

Review the generated SQL before applying. New imported posts are marked as original content.

## Backend and checks

Supabase provides published articles, verified-owner editing, and private rate-limited contact submissions. Database access tests, contact-handler tests and script syntax checks passed. Security advisor reports no findings. Browser and end-to-end HTTP tests remain unverified because this host's network is blocked.

## Pending

Complete WordPress migration, owner password/email verification, and frontend deployment. Sites publishing remains blocked by source-server DNS.

The uploaded original logo is integrated in the responsive header and footer across all nine public pages.
