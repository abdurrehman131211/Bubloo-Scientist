-- Apply to a new Supabase project. RLS protects all exposed tables.
begin;
create table public.articles (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(title) between 1 and 200),
 category text not null check(category in ('Physics','Chemistry','Biology','Technology','Book reviews')),
 excerpt text not null check(length(excerpt) between 1 and 1000),
 body text not null check(length(body) between 1 and 100000),
 published boolean not null default false,
 created_at timestamptz not null default now()
);
create index articles_public_listing on public.articles(published,created_at desc);
alter table public.articles enable row level security;
grant select on public.articles to anon, authenticated;
grant insert,update,delete on public.articles to authenticated;
create policy published_articles on public.articles for select to anon,authenticated using(published=true);
create policy admin_articles on public.articles for all to authenticated
using ((select auth.jwt()->'app_metadata'->>'role')='admin')
with check ((select auth.jwt()->'app_metadata'->>'role')='admin');
create table public.messages (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 100),
 email text not null check(length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 message text not null check(length(message) between 10 and 4000),
 created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
grant insert on public.messages to anon,authenticated;
grant select,delete on public.messages to authenticated;
create policy submit_message on public.messages for insert to anon,authenticated with check(true);
create policy admin_read_messages on public.messages for select to authenticated
using ((select auth.jwt()->'app_metadata'->>'role')='admin');
create policy admin_delete_messages on public.messages for delete to authenticated
using ((select auth.jwt()->'app_metadata'->>'role')='admin');
commit;
