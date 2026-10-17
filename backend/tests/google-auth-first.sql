begin;
-- No persistent accounts, passwords or grants: every fixture rolls back.
insert into public.messages(id,name,email,message) values('00000000-0000-4000-8000-000000000093','Private QA message','private-qa@example.invalid','Private QA message content');
insert into public.articles(id,title,category,excerpt,body,published) values('00000000-0000-4000-8000-000000000094','Private QA draft','Physics','QA draft','QA draft',false);
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values
('00000000-0000-4000-8000-000000000091','google-unregistered@example.invalid',now(),'{"provider":"google","providers":["google"],"role":"owner"}');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000091","role":"authenticated","app_metadata":{"role":"owner"}}',true);
set local role authenticated;
do $$begin
 if public.studio_role() is not null or public.editor_access() then raise exception 'Google login granted admin access';end if;
 if exists(select 1 from public.articles where not published) then raise exception 'Google visitor saw drafts';end if;
 if exists(select 1 from public.messages where id='00000000-0000-4000-8000-000000000093') then raise exception 'Visitor read messages';end if;
 begin insert into public.articles(title,category,excerpt,body) values('Denied','Physics','Denied','Denied');raise exception 'Visitor wrote an article' using errcode='P0002';exception when insufficient_privilege then null;end;
 begin insert into public.studio_profiles(user_id,phone) values(auth.uid(),'+123');raise exception 'Visitor wrote a Studio profile' using errcode='P0002';exception when insufficient_privilege then null;end;
 begin perform public.manage_studio_admin('google-unregistered@example.invalid','grant');raise exception 'Visitor granted admin access' using errcode='P0002';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- User-editable metadata cannot mimic Google's server-managed provider.
do $$begin
 begin insert into auth.users(id,email,raw_app_meta_data,raw_user_meta_data) values('00000000-0000-4000-8000-000000000092','blocked-signup@example.invalid','{"provider":"email","providers":["email"]}','{"provider":"google","providers":["google"]}');raise exception 'Password signup spoofed Google' using errcode='P0002';exception when insufficient_privilege then null;end;
end$$;
rollback;
select 'Google authentication allowed; unregistered Studio access and password signup denied; fixtures rolled back' as result;
