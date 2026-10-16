begin;
select set_config('test.owner_id',(select user_id::text from private.studio_members where role='owner'),true);
-- Public signup cannot grant itself trusted app metadata through editable data.
do $$begin
 begin
  insert into auth.users(id,email,raw_user_meta_data) values('00000000-0000-4000-8000-000000000081','blocked@example.invalid','{"studio_provisioned":true}');
  raise exception 'Public signup allowed' using errcode='P0002';
 exception when insufficient_privilege then null;end;
end$$;
insert into private.studio_provisioning(id,email) values ('00000000-0000-4000-8000-000000000082','profile-test@example.invalid'),('00000000-0000-4000-8000-000000000083','outsider-test@example.invalid');
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values
('00000000-0000-4000-8000-000000000082','profile-test@example.invalid',now(),'{"studio_provisioned":true}'),
('00000000-0000-4000-8000-000000000083','outsider-test@example.invalid',now(),'{"studio_provisioned":true}');
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner_id'),'role','authenticated')::text,true);
set local role authenticated;
select public.manage_studio_admin('profile-test@example.invalid','grant');
do $$begin
 begin perform public.manage_studio_admin('nonexistent@example.invalid','grant');raise exception 'Pending account granted' using errcode='P0002';
 exception when invalid_parameter_value then null;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000082","role":"authenticated"}',true);
set local role authenticated;
insert into public.studio_profiles(user_id,display_name,phone) values(auth.uid(),'Private profile','+123456789');
insert into storage.objects(bucket_id,name) values('article-images',auth.uid()::text||'/00000000-0000-4000-8000-000000000084.png');
do $$begin
 if (select count(*) from public.studio_profiles)<>1 then raise exception 'Own profile missing';end if;
 begin insert into public.studio_profiles(user_id) values('00000000-0000-4000-8000-000000000083');raise exception 'Other profile writable' using errcode='P0002';exception when insufficient_privilege then null;end;
 begin update public.studio_profiles set user_id='00000000-0000-4000-8000-000000000083';raise exception 'Profile ownership transferable' using errcode='P0002';exception when insufficient_privilege then null;end;
 begin insert into storage.objects(bucket_id,name) values('studio-avatars','other-user/pic.png');raise exception 'Other avatar writable' using errcode='P0002';exception when insufficient_privilege then null;end;
 begin perform public.manage_studio_admin('outsider-test@example.invalid','grant');raise exception 'Admin could manage accounts' using errcode='P0002';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- Changing the email preserves membership by user ID and syncs the team list.
update auth.users set email='profile-renamed@example.invalid' where id='00000000-0000-4000-8000-000000000082';
do $$begin
 if not exists(select 1 from private.studio_members where email='profile-renamed@example.invalid' and user_id='00000000-0000-4000-8000-000000000082') then raise exception 'Membership email not synced';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000083","role":"authenticated","app_metadata":{"role":"owner"}}',true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.studio_profiles) then raise exception 'Private phone disclosed';end if;
 begin insert into storage.objects(bucket_id,name) values('article-images',auth.uid()::text||'/00000000-0000-4000-8000-000000000085.png');raise exception 'Outsider could upload' using errcode='P0002';exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role anon;
do $$begin
 begin perform * from public.studio_profiles;raise exception 'Anon profile exposed' using errcode='P0002';exception when insufficient_privilege then null;end;
end$$;
reset role;
rollback;
