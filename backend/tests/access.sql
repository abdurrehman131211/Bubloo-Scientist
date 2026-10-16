-- Transactional access tests. Fixtures are rolled back.
begin;
insert into auth.users(id,email,email_confirmed_at) select '00000000-0000-4000-8000-000000000099','bublooscientist2023@gmail.com',now() where not exists(select 1 from auth.users where lower(email)='bublooscientist2023@gmail.com');
insert into public.articles(id,title,category,excerpt,body,published)
values('00000000-0000-4000-8000-000000000001','Policy test public','Physics','Test','Test',true),
('00000000-0000-4000-8000-000000000002','Policy test draft','Physics','Test','Test',false);
set local role anon;
do $$begin
 if (select count(*) from public.articles where id in ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'))<>1 then raise exception 'Public article visibility failed';end if;
 begin
  perform count(*) from public.messages;
  raise exception 'Anonymous message read unexpectedly allowed';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.messages(name,email,message) values('Test','test@example.invalid','Test message fixture');
  raise exception 'Anonymous direct message insert unexpectedly allowed';
 exception when insufficient_privilege then null;end;
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"role":"authenticated","app_metadata":{}}',true);
do $$declare changed integer;begin
 update public.articles set title='Forbidden' where id='00000000-0000-4000-8000-000000000001';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Nonadmin article update allowed';end if;
 if (select count(*) from public.messages)<>0 then raise exception 'Nonadmin messages exposed';end if;
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('role','authenticated','sub',(select id::text from auth.users where lower(email)='bublooscientist2023@gmail.com'))::text,true);
set local role authenticated;
do $$declare changed integer;begin
 if (select count(*) from public.articles where id in ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002'))<>2 then raise exception 'Admin draft visibility failed';end if;
 update public.articles set title='Admin permitted' where id='00000000-0000-4000-8000-000000000002';
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Admin update denied';end if;
end$$;
reset role;
set local role service_role;
select public.accept_contact('Policy Test','policy-test@example.invalid','Contact policy test fixture one');
select public.accept_contact('Policy Test','policy-test@example.invalid','Contact policy test fixture two');
select public.accept_contact('Policy Test','policy-test@example.invalid','Contact policy test fixture three');
do $$begin
 begin
  perform public.accept_contact('Policy Test','policy-test@example.invalid','Contact policy test fixture four');
  raise exception 'Rate limit failed' using errcode='P0002';
 exception when sqlstate 'P0001' then null;end;
end$$;
reset role;
rollback;
select 'Access and contact rate limit tests passed' as result;
