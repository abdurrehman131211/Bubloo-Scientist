-- The owner chose this verified email for editor access.
begin;
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
create function private.is_site_editor()
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(
  select 1 from auth.users
  where id=(select auth.uid())
    and lower(email)='bublooscientist2023@gmail.com'
    and email_confirmed_at is not null
 );
$$;
revoke all on function private.is_site_editor() from public,anon;
grant execute on function private.is_site_editor() to authenticated;
create function public.editor_access()
returns boolean language sql stable security invoker set search_path=''
as $$ select private.is_site_editor(); $$;
revoke all on function public.editor_access() from public,anon;
grant execute on function public.editor_access() to authenticated;
drop policy admin_articles on public.articles;
create policy editor_articles on public.articles for all to authenticated
using((select private.is_site_editor())) with check((select private.is_site_editor()));
drop policy admin_read_messages on public.messages;
drop policy admin_delete_messages on public.messages;
create policy editor_read_messages on public.messages for select to authenticated using((select private.is_site_editor()));
create policy editor_delete_messages on public.messages for delete to authenticated using((select private.is_site_editor()));
commit;
