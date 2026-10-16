begin;
create table private.studio_members (
 email text primary key check(email=lower(trim(email)) and length(email)<=254),
 role text not null check(role in ('owner','admin')),
 user_id uuid unique references auth.users(id) on delete restrict,
 granted_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create unique index one_studio_owner on private.studio_members(role) where role='owner';
alter table private.studio_members enable row level security;
create policy no_direct_member_access on private.studio_members for all to anon,authenticated using(false) with check(false);
revoke all on private.studio_members from public,anon,authenticated;
insert into private.studio_members(email,role,user_id)
select lower(email),'owner',id from auth.users
where lower(email)='bublooscientist2023@gmail.com' and email_confirmed_at is not null;
do $$begin if not exists(select 1 from private.studio_members where role='owner') then raise exception 'Verified owner account required';end if;end$$;
create table private.studio_access_events(
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references auth.users(id) on delete set null,
 email text not null,
 action text not null check(action in ('grant_admin','revoke_admin')),
 created_at timestamptz not null default now()
);
alter table private.studio_access_events enable row level security;
create policy no_direct_event_access on private.studio_access_events for all to anon,authenticated using(false) with check(false);
revoke all on private.studio_access_events from public,anon,authenticated;
create function private.studio_role()
returns text language sql stable security definer set search_path=''
as $$
 select m.role from private.studio_members m join auth.users u
 on (m.user_id=u.id or (m.user_id is null and m.email=lower(u.email)))
 where u.id=(select auth.uid()) and u.email_confirmed_at is not null
 order by (m.role='owner') desc limit 1;
$$;
revoke all on function private.studio_role() from public,anon;
grant execute on function private.studio_role() to authenticated;
create or replace function private.is_site_editor()
returns boolean language sql stable security invoker set search_path=''
as $$ select coalesce(private.studio_role() in ('owner','admin'),false); $$;
create function private.manage_studio_admin(p_email text,p_action text)
returns void language plpgsql security definer set search_path=''
as $$
declare address text:=lower(trim(p_email)); target_id uuid;
begin
 if auth.uid() is null or private.studio_role() is distinct from 'owner' then
  raise exception 'Only the owner can manage administrators' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(72410983823);
 if address is null or length(address)>254 or address !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
  raise exception 'Enter a valid email address' using errcode='22023';
 end if;
 if exists(select 1 from private.studio_members where email=address and role='owner') then
  raise exception 'Owner access cannot be changed here' using errcode='22023';
 end if;
 if p_action='grant' then
  select id into target_id from auth.users where lower(email)=address;
  if target_id is null then raise exception 'Create the account first' using errcode='22023'; end if;
  if exists(select 1 from private.studio_members where user_id=target_id and role='owner') then
   raise exception 'Owner access cannot be changed here' using errcode='22023';
  end if;
  insert into private.studio_members(email,role,user_id,granted_by)
  values(address,'admin',target_id,auth.uid())
  on conflict(email) do nothing;
  if found then insert into private.studio_access_events(actor_id,email,action) values(auth.uid(),address,'grant_admin');end if;
 elsif p_action='revoke' then
  delete from private.studio_members where email=address and role='admin';
  if found then insert into private.studio_access_events(actor_id,email,action) values(auth.uid(),address,'revoke_admin');end if;
 else raise exception 'Invalid action' using errcode='22023';
 end if;
end;
$$;
revoke all on function private.manage_studio_admin(text,text) from public,anon;
grant execute on function private.manage_studio_admin(text,text) to authenticated;
create function private.studio_users()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare members jsonb; events jsonb;
begin
 if auth.uid() is null or private.studio_role() is distinct from 'owner' then
  raise exception 'Only the owner can view administrator access' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'email',m.email,'role',m.role,'registered',u.id is not null,
  'verified',u.email_confirmed_at is not null,'created_at',m.created_at
 ) order by (m.role='owner') desc,m.created_at),'[]'::jsonb) into members
 from private.studio_members m left join auth.users u
 on (u.id=m.user_id or (m.user_id is null and lower(u.email)=m.email));
 select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc),'[]'::jsonb) into events
 from (select email,action,created_at from private.studio_access_events order by created_at desc limit 20) e;
 return jsonb_build_object('users',members,'events',events);
end;
$$;
revoke all on function private.studio_users() from public,anon;
grant execute on function private.studio_users() to authenticated;
create function public.studio_role()
returns text language sql stable security invoker set search_path=''
as $$select private.studio_role();$$;
create function public.studio_users()
returns jsonb language sql stable security invoker set search_path=''
as $$select private.studio_users();$$;
create function public.manage_studio_admin(p_email text,p_action text)
returns void language sql security invoker set search_path=''
as $$select private.manage_studio_admin(p_email,p_action);$$;
revoke all on function public.studio_role(),public.studio_users(),public.manage_studio_admin(text,text) from public,anon;
grant execute on function public.studio_role(),public.studio_users(),public.manage_studio_admin(text,text) to authenticated;
commit;
