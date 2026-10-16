# Bubloo Scientist

Responsive website draft with a connected Supabase backend and editor interface.

## Run locally

```sh
python -m http.server 4173 --directory dist
```

Open http://localhost:4173. No npm installation required.

## Backend

The Bubloo Scientist Website Supabase project is active. Public articles, administrator content management, and private contact messages use row-level security. Contact submissions go through the deployed Edge Function, with validation and email/global hourly limits. Only public browser keys are committed; service credentials remain server-side.

## Verification

Database access and rate-limit tests passed. The security advisor reports no findings. JavaScript syntax checks and contact-handler unit tests passed. End-to-end HTTP/browser tests remain unverified due to host network restrictions.

## Still pending

- Create your editor account using the dashboard instructions in [IMPLEMENTATION.md](IMPLEMENTATION.md).
- Apply the supplied logo and migrate complete articles and remaining pages.
- Publish the frontend after the Sites source connection is available.

See [IMPLEMENTATION.md](IMPLEMENTATION.md) for setup and backend reproduction instructions.

[Figma wireframes](https://www.figma.com/design/URSxSZeUYE962Yry6zeEhK)
