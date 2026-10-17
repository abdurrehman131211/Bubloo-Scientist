begin;
select set_config('test.owner_id',(select user_id::text from private.studio_members where role='owner'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner_id'),'role','authenticated','aal','aal1')::text,true);
set local role authenticated;
do $$begin if not public.editor_access() then raise exception 'Existing owner without phone factor lost access';end if;end$$;
reset role;
-- A temporary native factor changes only this transaction; no code is sent.
insert into auth.mfa_factors(id,user_id,factor_type,status,phone,created_at,updated_at)
values('00000000-0000-4000-8000-000000000121',current_setting('test.owner_id')::uuid,'phone','verified','+15550000121',now(),now());
insert into public.articles(id,title,category,excerpt,body,published) values('00000000-0000-4000-8000-000000000122','MFA private draft','Physics','MFA test','MFA test',false);
set local role authenticated;
do $$begin
 if public.studio_role()<>'owner' then raise exception 'Bootstrap membership unavailable';end if;
 if public.editor_access() then raise exception 'Password-only session bypassed MFA';end if;
 if exists(select 1 from public.articles where id='00000000-0000-4000-8000-000000000122') then raise exception 'AAL1 read a draft';end if;
 begin insert into public.articles(title,category,excerpt,body) values('Forbidden','Physics','No','No');raise exception 'AAL1 wrote an article' using errcode='P0002';exception when insufficient_privilege then null;end;
 begin perform public.studio_users();raise exception 'AAL1 read team access' using errcode='P0002';exception when insufficient_privilege then null;end;
 begin perform public.manage_studio_admin('mfa-forbidden@example.invalid','grant');raise exception 'AAL1 managed users' using errcode='P0002';exception when insufficient_privilege then null;end;
 begin insert into public.studio_profiles(user_id) values(auth.uid());raise exception 'AAL1 wrote profile' using errcode='P0002';exception when insufficient_privilege then null;end;
 begin insert into public.quizzes(title,questions) values('Forbidden','[{"text":"No","choices":["A","B"],"answer":0}]');raise exception 'AAL1 wrote quiz' using errcode='P0002';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner_id'),'role','authenticated','aal','aal2')::text,true);
set local role authenticated;
do $$declare changed integer;begin
 if not public.editor_access() then raise exception 'Verified owner denied';end if;
 update public.articles set title='MFA verified edit' where id='00000000-0000-4000-8000-000000000122';get diagnostics changed=row_count;
 if changed<>1 then raise exception 'AAL2 edit denied';end if;
 perform public.studio_users();
end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000123","role":"authenticated","aal":"aal2","app_metadata":{"role":"owner"}}',true);
set local role authenticated;
do $$begin if public.editor_access() then raise exception 'AAL2 granted non-member admin access';end if;end$$;
reset role;
rollback;
select 'MFA preserves existing login, blocks AAL1 tables/owner RPCs, allows verified member AAL2 and rejects outsiders; all fixtures rolled back' as result;
