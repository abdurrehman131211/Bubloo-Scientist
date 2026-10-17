begin;
-- Allow Google to authenticate a visitor before checking Studio membership.
-- These server-managed provider fields are set by Supabase Auth before INSERT.
-- /signup accepts only email/phone and cannot choose this Google provider.
-- No Studio membership, profile or content permission is granted here.
create or replace function private.require_studio_provisioning()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.raw_app_meta_data->>'provider'='google'
    and new.raw_app_meta_data->'providers' @> '["google"]'::jsonb then
  return new;
 end if;
 delete from private.studio_provisioning
 where id=new.id and email=lower(new.email) and expires_at>now();
 if not found then
  raise exception 'Registration is closed. Ask the site owner to create your account.' using errcode='42501';
 end if;
 return new;
end;$$;
revoke all on function private.require_studio_provisioning() from public,anon,authenticated;
commit;
