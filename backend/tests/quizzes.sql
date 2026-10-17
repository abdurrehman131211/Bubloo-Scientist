begin;
select set_config('test.owner_id',(select user_id::text from private.studio_members where role='owner'),true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner_id'),'role','authenticated')::text,true);
set local role authenticated;
insert into public.quizzes(id,title,questions,published) values
('00000000-0000-4000-8000-000000000105','QA published quiz','[{"text":"One plus one?","choices":["Two","Three"],"answer":0,"explanation":"One plus one is two."}]',true),
('00000000-0000-4000-8000-000000000106','QA private draft','[{"text":"Private?","choices":["Yes","No"],"answer":0}]',false);
do $$begin
 begin insert into public.quizzes(title,questions) values('Invalid','[{"text":"Bad","choices":["One"],"answer":0}]');raise exception 'Invalid quiz accepted' using errcode='P0002';exception when check_violation then null;end;
 begin insert into public.quizzes(title,questions) values('Invalid answer','[{"text":"Bad","choices":["One","Two"],"answer":7}]');raise exception 'Invalid answer accepted' using errcode='P0002';exception when check_violation then null;end;
end$$;
reset role;
set local role anon;
do $$declare data jsonb; graded jsonb;begin
 if not exists(select 1 from jsonb_array_elements(public.list_published_quizzes()) q where q->>'id'='00000000-0000-4000-8000-000000000105') then raise exception 'Published quiz missing';end if;
 if exists(select 1 from jsonb_array_elements(public.list_published_quizzes()) q where q->>'id'='00000000-0000-4000-8000-000000000106') then raise exception 'Draft listed publicly';end if;
 if public.get_published_quiz('00000000-0000-4000-8000-000000000106') is not null then raise exception 'Draft accessible';end if;
 data:=public.get_published_quiz('00000000-0000-4000-8000-000000000105');
 if data->'questions'->0 ? 'answer' or data->'questions'->0 ? 'explanation' then raise exception 'Answer key exposed';end if;
 graded:=public.grade_published_quiz('00000000-0000-4000-8000-000000000105',1,'[0]');
 if graded->>'score'<>'1' or graded->>'total'<>'1' or graded->'review'->0->>'explanation'<>'One plus one is two.' then raise exception 'Correct answer grading failed';end if;
 if public.grade_published_quiz('00000000-0000-4000-8000-000000000105',1,'[1]')->>'score'<>'0' then raise exception 'Incorrect answer grading failed';end if;
 begin perform public.grade_published_quiz('00000000-0000-4000-8000-000000000106',1,'[0]');raise exception 'Draft graded' using errcode='P0002';exception when invalid_parameter_value then null;end;
 begin perform public.grade_published_quiz('00000000-0000-4000-8000-000000000105',1,'[0.5]');raise exception 'Fractional answer accepted' using errcode='P0002';exception when invalid_parameter_value then null;end;
 begin perform public.grade_published_quiz('00000000-0000-4000-8000-000000000105',1,'[]');raise exception 'Missing answers accepted' using errcode='P0002';exception when invalid_parameter_value then null;end;
 begin perform * from public.quizzes;raise exception 'Direct public quiz table read' using errcode='P0002';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner_id'),'role','authenticated')::text,true);
set local role authenticated;
update public.quizzes set questions='[{"text":"Updated question","choices":["Yes","No"],"answer":1}]' where id='00000000-0000-4000-8000-000000000105';
do $$begin if (select version from public.quizzes where id='00000000-0000-4000-8000-000000000105')<>2 then raise exception 'Version not increased';end if;end$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000107","role":"authenticated","app_metadata":{"role":"owner"}}',true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.quizzes) then raise exception 'Non-admin read answer keys';end if;
 begin insert into public.quizzes(title,questions) values('Forbidden','[{"text":"No","choices":["A","B"],"answer":0}]');raise exception 'Non-admin created quiz' using errcode='P0002';exception when insufficient_privilege then null;end;
 begin perform public.grade_published_quiz('00000000-0000-4000-8000-000000000105',1,'[0]');raise exception 'Stale attempt accepted' using errcode='P0002';exception when invalid_parameter_value then null;end;
end$$;
reset role;
update public.quizzes set published=false where id='00000000-0000-4000-8000-000000000105';
set local role anon;
do $$begin
 if public.get_published_quiz('00000000-0000-4000-8000-000000000105') is not null then raise exception 'Unpublished quiz still accessible';end if;
 begin perform public.grade_published_quiz('00000000-0000-4000-8000-000000000105',2,'[0]');raise exception 'Unpublished attempt graded' using errcode='P0002';exception when invalid_parameter_value then null;end;
end$$;
reset role;
rollback;
select 'Quiz CRUD, RLS, published-only access, answer isolation, grading, validation, versions and unpublish checks passed; all fixtures rolled back' as result;
