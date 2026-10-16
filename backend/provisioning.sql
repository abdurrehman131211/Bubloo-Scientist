begin;
-- Auth's admin API applies app_metadata AFTER inserting the user. Authorize
-- the insert with a short-lived, server-only reservation for its random UUID.
create table private.studio_provisioning(
 id uuid primary key,
 email text not null check(email=lower(trim(email)) and length(email)<=254),
 expires_at timestamptz not null default now()+interval '5 minutes'
);
alter table private.studio_provisioning enable row level security;
create policy no_client_provisioning on private.studio_provisioning for all to anon,authenticated using(false) with check(false);
revoke all on private.studio_provisioning from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,delete on private.studio_provisioning to service_role;
create function public.prepare_studio_account(p_id uuid,p_email text)
returns void language sql security invoker set search_path='' as $$
 delete from private.studio_provisioning where expires_at<now();
 insert into private.studio_provisioning(id,email) values(p_id,lower(trim(p_email)));
$$;
create function public.cancel_studio_account(p_id uuid)
returns void language sql security invoker set search_path='' as $$
 delete from private.studio_provisioning where id=p_id;
$$;
revoke all on function public.prepare_studio_account(uuid,text),public.cancel_studio_account(uuid) from public,anon,authenticated;
grant execute on function public.prepare_studio_account(uuid,text),public.cancel_studio_account(uuid) to service_role;
-- Trigger-only definer: Auth inserts have no user JWT/auth.uid(). The matching
-- reservation is created exclusively by the service role after owner validation.
create or replace function private.require_studio_provisioning()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from private.studio_provisioning where id=new.id and email=lower(new.email) and expires_at>now();
 if not found then
  raise exception 'Registration is closed. Ask the site owner to create your account.' using errcode='42501';
 end if;
 return new;
end;$$;
revoke all on function private.require_studio_provisioning() from public,anon,authenticated;
commit;
