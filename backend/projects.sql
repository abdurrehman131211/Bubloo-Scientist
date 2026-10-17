-- Project records are private drafts until an administrator publishes them.
create or replace function private.valid_project_images(value jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare item jsonb;
begin
 if jsonb_typeof(value) is distinct from 'array' then return false; end if;
 if jsonb_array_length(value)>12 or octet_length(value::text)>24000 then return false; end if;
 for item in select * from jsonb_array_elements(value) loop
  if jsonb_typeof(item) is distinct from 'object'
   or coalesce(item->>'id','') !~ '^[a-f0-9-]{36}$'
   or coalesce(item->>'path','') !~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp|gif)$'
   or length(coalesce(item->>'alt',''))>300 or length(coalesce(item->>'caption',''))>500
  then return false; end if;
 end loop;
 return true;
end $$;
revoke all on function private.valid_project_images(jsonb) from public, anon;
grant execute on function private.valid_project_images(jsonb) to authenticated;

create table public.projects (
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 1 and 200),
 category text not null default 'Science' check(length(trim(category)) between 1 and 100),
 summary text not null check(length(trim(summary)) between 1 and 1000),
 details text not null check(length(trim(details)) between 1 and 100000),
 status text not null default 'planned' check(status in ('planned','in_progress','completed')),
 images jsonb not null default '[]'::jsonb check(private.valid_project_images(images)),
 repo_url text check(repo_url is null or (length(repo_url)<=2000 and repo_url ~ '^https?://[^[:space:]]+$')),
 demo_url text check(demo_url is null or (length(demo_url)<=2000 and demo_url ~ '^https?://[^[:space:]]+$')),
 published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
revoke all on public.projects from anon,authenticated;
grant select on public.projects to anon;
grant select,insert,update,delete on public.projects to authenticated;
create policy "Published projects are public" on public.projects for select to anon,authenticated using(published);
create policy "Editors read all projects" on public.projects for select to authenticated using((select private.is_site_editor()));
create policy "Editors create projects" on public.projects for insert to authenticated with check((select private.is_site_editor()));
create policy "Editors update projects" on public.projects for update to authenticated using((select private.is_site_editor())) with check((select private.is_site_editor()));
create policy "Editors delete projects" on public.projects for delete to authenticated using((select private.is_site_editor()));
create index projects_published_updated_idx on public.projects(updated_at desc) where published;
create or replace function private.touch_project() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at=now(); return new; end $$;
revoke all on function private.touch_project() from public,anon;
grant execute on function private.touch_project() to authenticated;
create trigger projects_updated before update on public.projects for each row execute function private.touch_project();

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('project-images','project-images',true,5242880,array['image/jpeg','image/png','image/webp','image/gif']);
create policy "Editors upload project images" on storage.objects for insert to authenticated
with check(bucket_id='project-images' and (storage.foldername(name))[1]=(select auth.uid())::text and (select private.is_site_editor()));
create policy "Editors read project image metadata" on storage.objects for select to authenticated
using(bucket_id='project-images' and (select private.is_site_editor()));
create policy "Editors delete own project images" on storage.objects for delete to authenticated
using(bucket_id='project-images' and (storage.foldername(name))[1]=(select auth.uid())::text and (select private.is_site_editor()));
