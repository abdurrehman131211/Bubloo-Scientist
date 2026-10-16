-- Access lifecycle tests. All accounts, grants, articles and events roll back.
begin;
select set_config('test.owner_id',(select user_id::text from private.studio_members where role='owner'),true);
select set_config('test.owner_email',(select email from private.studio_members where role='owner'),true);
insert into private.studio_provisioning(id,email) values ('00000000-0000-4000-8000-000000000071','studio-admin-test@example.invalid'),('00000000-0000-4000-8000-000000000072','studio-unverified-test@example.invalid');
insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data) values
 ('00000000-0000-4000-8000-000000000071','studio-admin-test@example.invalid',now(),'{"studio_provisioned":true}'),
 ('00000000-0000-4000-8000-000000000072','studio-unverified-test@example.invalid',null,'{"studio_provisioned":true}');
insert into public.articles(id,title,category,excerpt,body,published)
 values('00000000-0000-4000-8000-000000000073','Users access test','Physics','Test','Test',false);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner_id'),'role','authenticated')::text,true);
set local role authenticated;
select public.manage_studio_admin(' STUDIO-ADMIN-TEST@example.invalid ','grant');
select public.manage_studio_admin('studio-unverified-test@example.invalid','grant');

do $$begin
 if public.studio_role()<>'owner' then raise exception 'Owner role lost';end if;
 begin
  perform public.manage_studio_admin(current_setting('test.owner_email'),'revoke');
  raise exception 'Owner removal allowed' using errcode='P0002';
 exception when sqlstate '22023' then null;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000071","role":"authenticated","app_metadata":{"role":"owner"}}',true);
set local role authenticated;
do $$declare changed integer;begin
 if public.studio_role()<>'admin' or not public.editor_access() then raise exception 'Verified admin not recognized';end if;
 update public.articles set title='Allowed admin edit' where id='00000000-0000-4000-8000-000000000073';
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Admin edit denied';end if;
 begin
  perform public.manage_studio_admin('unauthorized@example.invalid','grant');
  raise exception 'Admin escalation allowed' using errcode='P0002';
 exception when insufficient_privilege then null;end;
 begin
  perform public.studio_users();
  raise exception 'Admin users listing allowed' using errcode='P0002';
 exception when insufficient_privilege then null;end;
 begin
  insert into private.studio_members(email,role) values('direct@example.invalid','owner');
  raise exception 'Direct membership write allowed' using errcode='P0002';
 exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000072","role":"authenticated"}',true);
set local role authenticated;
do $$begin if public.editor_access() or public.studio_role() is not null then raise exception 'Unverified admin received access';end if;end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner_id'),'role','authenticated')::text,true);
set local role authenticated;
select public.manage_studio_admin('studio-admin-test@example.invalid','revoke');

do $$begin if public.studio_role()<>'owner' then raise exception 'Owner was changed';end if;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000071","role":"authenticated","app_metadata":{"role":"owner"}}',true);
set local role authenticated;
do $$declare changed integer;begin
 if public.editor_access() then raise exception 'Removed admin retained access';end if;
 update public.articles set title='Forbidden edit' where id='00000000-0000-4000-8000-000000000073';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Removed admin edited content';end if;
end$$;
reset role;
rollback;
select 'Owner/admin lifecycle, verification, escalation and immediate revocation tests passed' as result;