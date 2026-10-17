# Studio-managed quizzes

Open `/admin.html`, sign in as an owner/admin, and choose **Quizzes**.
Create a quiz title and description, then add 1–30 multiple-choice questions.
Each question accepts 2–6 choices, exactly one correct answer and an optional
explanation. Questions and choices can be added/removed; questions can be moved.
Save with Publish off for a private draft. Enable Publish and Save quiz to show
it on the homepage and `/quiz-and-survey/`. Edit and save to update; uncheck
Publish and save to remove it publicly. Delete permanently removes the quiz.

The four-question hard-coded demonstration has been removed. No seed quiz is
published automatically. With no published quizzes, the website displays
"No quizzes are published yet. Check back soon." Connection failures have a
separate unavailable state and never fall back to placeholder questions.

## Database and access

Apply `backend/quizzes.sql` to the existing connected project. `public.quizzes`
contains the full question definitions, answer indexes and explanations, and
enforces length/count/answer constraints. RLS permits CRUD only through the
existing database-backed Studio editor membership check. Anonymous visitors
cannot directly select the table, even for published quizzes. Non-admin
authenticated visitors cannot read answer keys or change quizzes.

The intentionally public RPCs expose only published data:
- `list_published_quizzes()` returns up to 50 quiz summaries, newest first.
- `get_published_quiz(p_id)` returns question text and choices, without answers.
- `grade_published_quiz(p_id,p_version,p_answers)` validates a complete attempt
  and returns score, correct answers and explanations. Draft/unpublished quiz
  attempts are rejected. Question edits increment the version, so attempts using
  an old question set are rejected rather than graded against changed answers.

Public wrappers are SECURITY INVOKER; narrowly scoped published-content helpers
are private-schema SECURITY DEFINER functions with an empty search path and
explicit execute grants. Published answers are intentionally shown after an
attempt; this is a learning quiz feature, not a secure examination system.
Participant names, emails, answers and scores are not stored.

## Frontend and checks

`dist/admin-quizzes.js` is the Studio editor. `dist/quiz.js` loads public data,
links homepage cards to a chosen quiz, checks required answers, submits grading,
shows explanations and supports retrying. User-authored text uses textContent,
never HTML parsing. The page generator and content metadata produce the same
dynamic public quiz page, so rebuilding cannot restore the old placeholder.

- `node backend/tests/public-quizzes.mjs`
- `node backend/tests/studio-ui.mjs`
- `backend/tests/quizzes.sql` passed against the connected database; every test
  quiz and mutation rolled back. Covers owner CRUD, malformed definitions,
  published-only reads, answer isolation, grading, stale versions and unpublish.
- Existing Google sign-in and remembered-session tests also passed.
- Visual browser checks were unavailable in this environment.
- Security advisor reported no database findings. The pre-existing Auth warning
  is [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
