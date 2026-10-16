begin;
revoke all on public.articles,public.messages from anon,authenticated;
grant select on public.articles to anon,authenticated;
grant insert,update,delete on public.articles to authenticated;
grant select,delete on public.messages to authenticated;
grant all on public.articles,public.messages to service_role;
commit;
