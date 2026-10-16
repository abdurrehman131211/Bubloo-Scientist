-- Contact API is callable only by the server-side Edge Function.
begin;
revoke insert on public.messages from anon,authenticated;
drop policy submit_message on public.messages;
grant select,insert on public.messages to service_role;
create index messages_email_created on public.messages(lower(email),created_at);
create index messages_created on public.messages(created_at);
create function public.accept_contact(p_name text,p_email text,p_message text)
returns void language plpgsql security invoker set search_path=''
as $$
begin
 -- Serialize the small contact workload so concurrent requests cannot bypass limits.
 perform pg_advisory_xact_lock(72410983822);
 if (select count(*) from public.messages where created_at>now()-interval '1 hour')>=100
 or (select count(*) from public.messages where lower(email)=lower(trim(p_email))
 and created_at>now()-interval '1 hour')>=3 then
 raise exception 'Contact rate limit exceeded' using errcode='P0001';
 end if;
 insert into public.messages(name,email,message) values(trim(p_name),lower(trim(p_email)),trim(p_message));
end;
$$;
revoke all on function public.accept_contact(text,text,text) from public,anon,authenticated;
grant execute on function public.accept_contact(text,text,text) to service_role;
commit;
