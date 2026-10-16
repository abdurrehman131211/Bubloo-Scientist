begin;
-- Only the server-side provisioning endpoint can mark a new Auth account.
-- Public signup cannot supply raw_app_meta_data; user metadata is never trusted.
create or replace function private.require_studio_provisioning()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if coalesce(new.raw_app_meta_data->>'studio_provisioned','false') <> 'true' then
  raise exception 'Registration is closed. Ask the site owner to create your account.' using errcode='42501';
 end if;
 return new;
end;$$;
revoke all on function private.require_studio_provisioning() from public,anon,authenticated;
create trigger studio_registration_closed before insert on auth.users
for each row execute function private.require_studio_provisioning();

-- Bind existing pending memberships before email addresses can change.
update private.studio_members m set user_id=u.id from auth.users u
where m.user_id is null and m.email=lower(u.email);
create or replace function private.sync_studio_email()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 update private.studio_members set email=lower(new.email) where user_id=new.id;
 return new;
end;$$;
revoke all on function private.sync_studio_email() from public,anon,authenticated;
create trigger studio_email_changed after update of email on auth.users
for each row when(old.email is distinct from new.email) execute function private.sync_studio_email();

alter table public.articles add column images jsonb not null default '[]'::jsonb
check(jsonb_typeof(images)='array' and jsonb_array_length(images)<=12 and octet_length(images::text)<=24000);
create table public.studio_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(length(display_name)<=100),
 phone text not null default '' check(length(phone)<=40),
 bio text not null default '' check(length(bio)<=1000),
 avatar_path text not null default '' check(length(avatar_path)<=300)
);
alter table public.studio_profiles enable row level security;
revoke all on public.studio_profiles from public,anon,authenticated;
grant select,insert,update on public.studio_profiles to authenticated;
grant all on public.studio_profiles to service_role;
create policy own_profile_select on public.studio_profiles for select to authenticated
using(user_id=(select auth.uid()) and (select private.is_site_editor()));
create policy own_profile_insert on public.studio_profiles for insert to authenticated
with check(user_id=(select auth.uid()) and (select private.is_site_editor()) and (avatar_path='' or avatar_path like user_id::text||'/%'));
create policy own_profile_update on public.studio_profiles for update to authenticated
using(user_id=(select auth.uid()) and (select private.is_site_editor()))
with check(user_id=(select auth.uid()) and (select private.is_site_editor()) and (avatar_path='' or avatar_path like user_id::text||'/%'));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('article-images','article-images',true,5242880,array['image/jpeg','image/png','image/webp','image/gif']),
('studio-avatars','studio-avatars',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy studio_image_insert on storage.objects for insert to authenticated
with check(bucket_id='article-images' and (select private.is_site_editor()) and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy studio_image_select on storage.objects for select to authenticated
using(bucket_id='article-images' and (select private.is_site_editor()));
create policy studio_image_delete on storage.objects for delete to authenticated
using(bucket_id='article-images' and (select private.is_site_editor()) and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatar_insert on storage.objects for insert to authenticated
with check(bucket_id='studio-avatars' and (select private.is_site_editor()) and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatar_select on storage.objects for select to authenticated
using(bucket_id='studio-avatars' and (select private.is_site_editor()) and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy avatar_delete on storage.objects for delete to authenticated
using(bucket_id='studio-avatars' and (select private.is_site_editor()) and (storage.foldername(name))[1]=(select auth.uid())::text);
create or replace function private.manage_studio_admin(p_email text,p_action text)
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

commit;
