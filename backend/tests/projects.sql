begin;
insert into public.projects(id,title,summary,details,published) values
 ('00000000-0000-4000-8000-000000000071','QA public project','Summary','Full project details',true),
 ('00000000-0000-4000-8000-000000000072','QA private project','Draft summary','Private details',false);
set local role anon;
do $$ begin
 if (select count(*) from public.projects where id in ('00000000-0000-4000-8000-000000000071','00000000-0000-4000-8000-000000000072'))<>1 then raise exception 'Draft leaked'; end if;
 begin
  insert into public.projects(title,summary,details) values('Unauthorized','Summary','Details');
  raise exception 'Anonymous write allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000099","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
do $$ declare changed integer; begin
 if exists(select 1 from public.projects where id='00000000-0000-4000-8000-000000000072') then raise exception 'Nonmember draft access'; end if;
 begin
  insert into public.projects(title,summary,details) values('Unauthorized','Summary','Details');
  raise exception 'Nonmember insert allowed';
 exception when insufficient_privilege then null; end;
 update public.projects set title='Changed' where id='00000000-0000-4000-8000-000000000071';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Nonmember update allowed'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"0da16fdc-4bdc-4262-b679-83475fd9594e","role":"authenticated","aal":"aal2"}',true);
set local role authenticated;
do $$ declare project_id uuid; begin
 if not exists(select 1 from public.projects where id='00000000-0000-4000-8000-000000000072') then raise exception 'Editor cannot read drafts'; end if;
 insert into public.projects(title,category,summary,details) values('Editor project','Physics','Summary','Detailed explanation') returning id into project_id;
 update public.projects set published=true,status='completed' where id=project_id;
 if not exists(select 1 from public.projects where id=project_id and published and status='completed') then raise exception 'Editor save failed'; end if;
 begin
  update public.projects set repo_url='javascript:alert(1)' where id=project_id;
  raise exception 'Unsafe link allowed';
 exception when check_violation then null; end;
 begin
  update public.projects set images='[{"path":"bad"}]' where id=project_id;
  raise exception 'Invalid images allowed';
 exception when check_violation then null; end;
 delete from public.projects where id=project_id;
 if exists(select 1 from public.projects where id=project_id) then raise exception 'Editor delete failed'; end if;
end $$;
reset role;
rollback;
