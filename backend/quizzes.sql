begin;
create function private.valid_quiz_questions(items jsonb)
returns boolean language plpgsql immutable security invoker set search_path='' as $$
declare q jsonb; choice jsonb; correct numeric;
begin
 if items is null or jsonb_typeof(items)<>'array' then return false;end if;
 if jsonb_array_length(items) not between 1 and 30 or octet_length(items::text)>100000 then return false;end if;
 for q in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(q)<>'object' or jsonb_typeof(q->'text') is distinct from 'string' or length(trim(q->>'text')) not between 1 and 2000 then return false;end if;
  if jsonb_typeof(q->'choices') is distinct from 'array' then return false;end if;
  if jsonb_array_length(q->'choices') not between 2 and 6 then return false;end if;
  for choice in select value from jsonb_array_elements(q->'choices') loop
   if jsonb_typeof(choice)<>'string' or length(trim(choice#>>'{}')) not between 1 and 300 then return false;end if;
  end loop;
  if jsonb_typeof(q->'answer') is distinct from 'number' then return false;end if;
  correct:=(q->>'answer')::numeric;
  if correct<>trunc(correct) or correct<0 or correct>=jsonb_array_length(q->'choices') then return false;end if;
  if q ? 'explanation' and (jsonb_typeof(q->'explanation')<>'string' or length(q->>'explanation')>2000) then return false;end if;
 end loop;
 return true;
end;$$;
revoke all on function private.valid_quiz_questions(jsonb) from public,anon;
grant execute on function private.valid_quiz_questions(jsonb) to authenticated;
create table public.quizzes(
 id uuid primary key default gen_random_uuid(),
 title text not null check(length(trim(title)) between 1 and 200),
 description text not null default '' check(length(description)<=2000),
 questions jsonb not null check(private.valid_quiz_questions(questions)),
 published boolean not null default false,
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index quizzes_published_created on public.quizzes(published,created_at desc);
alter table public.quizzes enable row level security;
revoke all on public.quizzes from public,anon,authenticated;
grant select,insert,update,delete on public.quizzes to authenticated;
grant all on public.quizzes to service_role;
create policy studio_manage_quizzes on public.quizzes for all to authenticated
using((select private.is_site_editor())) with check((select private.is_site_editor()));
create function private.bump_quiz_version() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 new.updated_at:=now();new.version:=old.version+case when new.questions is distinct from old.questions then 1 else 0 end;return new;
end;$$;
revoke all on function private.bump_quiz_version() from public,anon,authenticated;
create trigger quiz_edited before update on public.quizzes for each row execute function private.bump_quiz_version();

-- Intentionally public, read-only helpers: expose only published content and
-- remove answers/explanations from question payloads until an attempt is graded.
create function private.list_published_quizzes() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc),'[]'::jsonb)
 from(select id,title,description,jsonb_array_length(questions) as question_count,created_at
 from public.quizzes where published order by created_at desc limit 50) q;
$$;
create function private.get_published_quiz(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',id,'title',title,'description',description,'version',version,
 'questions',(select jsonb_agg(jsonb_build_object('text',q->>'text','choices',q->'choices') order by n)
 from jsonb_array_elements(questions) with ordinality as x(q,n)))
 from public.quizzes where id=p_id and published;
$$;
create function private.grade_published_quiz(p_id uuid,p_version integer,p_answers jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare quiz public.quizzes; q jsonb; i integer:=0; chosen numeric; score integer:=0; correct boolean; review jsonb:='[]';
begin
 select * into quiz from public.quizzes where id=p_id and published;
 if not found or p_version is distinct from quiz.version then raise exception 'Quiz changed or is unavailable' using errcode='22023';end if;
 if p_answers is null or jsonb_typeof(p_answers)<>'array' then raise exception 'Answer every question' using errcode='22023';end if;
 if jsonb_array_length(p_answers)<>jsonb_array_length(quiz.questions) then raise exception 'Answer every question' using errcode='22023';end if;
 for q in select value from jsonb_array_elements(quiz.questions) loop
  if jsonb_typeof(p_answers->i)<>'number' then raise exception 'Invalid answer' using errcode='22023';end if;
  chosen:=(p_answers->>i)::numeric;
  if chosen<>trunc(chosen) or chosen<0 or chosen>=jsonb_array_length(q->'choices') then raise exception 'Invalid answer' using errcode='22023';end if;
  correct:=chosen=(q->>'answer')::integer;if correct then score:=score+1;end if;
  review:=review||jsonb_build_array(jsonb_build_object('correct',correct,'answer',(q->>'answer')::integer,'explanation',coalesce(q->>'explanation','')));
  i:=i+1;
 end loop;
 return jsonb_build_object('score',score,'total',i,'review',review);
end;$$;
create function public.list_published_quizzes() returns jsonb language sql stable security invoker set search_path='' as $$select private.list_published_quizzes();$$;
create function public.get_published_quiz(p_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select private.get_published_quiz(p_id);$$;
create function public.grade_published_quiz(p_id uuid,p_version integer,p_answers jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.grade_published_quiz(p_id,p_version,p_answers);$$;
grant usage on schema private to anon,authenticated;
revoke all on function private.list_published_quizzes(),private.get_published_quiz(uuid),private.grade_published_quiz(uuid,integer,jsonb),public.list_published_quizzes(),public.get_published_quiz(uuid),public.grade_published_quiz(uuid,integer,jsonb) from public;
grant execute on function private.list_published_quizzes(),private.get_published_quiz(uuid),private.grade_published_quiz(uuid,integer,jsonb),public.list_published_quizzes(),public.get_published_quiz(uuid),public.grade_published_quiz(uuid,integer,jsonb) to anon,authenticated;
commit;
