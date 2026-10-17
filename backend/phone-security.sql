begin;
-- Native Auth phone factors prove ownership. Contact/profile text is not proof.
create function private.studio_mfa_satisfied() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
  coalesce(auth.jwt()->>'aal'='aal2',false) or not exists(
   select 1 from auth.mfa_factors where user_id=auth.uid() and factor_type='phone' and status='verified'
  )
 );
$$;
revoke all on function private.studio_mfa_satisfied() from public,anon;
grant execute on function private.studio_mfa_satisfied() to authenticated;
create or replace function private.is_site_editor() returns boolean
language sql stable security invoker set search_path='' as $$
 select coalesce(private.studio_role() in ('owner','admin'),false) and private.studio_mfa_satisfied();
$$;
-- Owner RPCs also need MFA, not only tables protected by RLS.
-- Their existing implementations below retain owner protection and audit logs.
create or replace function private.manage_studio_admin(p_email text,p_action text)
returns void language plpgsql security definer set search_path=''
as $$
declare address text:=lower(trim(p_email)); target_id uuid;
begin
 if auth.uid() is null or private.studio_role() is distinct from 'owner' or not private.studio_mfa_satisfied() then
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

create or replace function private.studio_users()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare members jsonb; events jsonb;
begin
 if auth.uid() is null or private.studio_role() is distinct from 'owner' or not private.studio_mfa_satisfied() then
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

commit;
