# Projects

Open `/admin.html`, sign in, and select **Projects**. Admins can create and edit projects, preview the write-up, save drafts, publish, unpublish and delete.

Each project has a title, category, summary, detailed plain-text write-up, progress (Planned / In progress / Completed), up to 12 pictures, and optional demo and source-code links. Use captions, alt text and **Insert in details** to place images. **Make cover** moves a picture to the first position.

Publishing and progress are independent. Leave the publish checkbox unchecked to save a private record. Published projects appear at `/projects/`; the three most recently updated also appear on the homepage. Each detail has a shareable `/projects/?project=UUID` address. No sample projects are published.

Project records use RLS: public users can select published rows only, and the existing MFA-aware editor check protects draft access and all writes. Public projects and links are rendered as text with only HTTP/HTTPS outbound links. Admin authentication and permissions reuse the existing Studio flow.

Pictures use the public `project-images` storage bucket with admin-only uploads under their user ID, image MIME restrictions and a 5 MB limit. Uploaded image URLs are public even for drafts. Removing a picture or deleting a project unlinks it; it does not delete the stored file automatically.

Schema: `backend/projects.sql`. Verification: `backend/tests/projects.sql` runs inside a transaction and rolls back fixtures; `node backend/tests/public-projects.mjs` and `node backend/tests/studio-ui.mjs` exercise the shipped UI scripts.
