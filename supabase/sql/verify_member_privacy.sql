-- Read-only verification with real authenticated roles; changes are rolled back.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',coalesce((select auth_user_id::text from public.members where member_role<>'admin' and auth_user_id is not null limit 1),'00000000-0000-0000-0000-000000000001'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare changed integer; begin
 if public.eo_is_admin() then raise exception 'Nonadmin role incorrectly elevated'; end if;
 if exists(select 1 from public.change_logs) then raise exception 'Historical contact data exposed'; end if;
 if exists(select 1 from public.members where auth_user_id is distinct from auth.uid()) then raise exception 'Other members private rows are visible'; end if;
 if exists(select 1 from jsonb_array_elements(public.eo_member_directory()) item where item->>'auth_user_id' is distinct from auth.uid()::text and (item ? 'email' or item ? 'phone' or item ? 'memo')) then raise exception 'Directory exposes contact fields'; end if;
 if exists(select 1 from pg_policies where schemaname='public' and tablename='members' and cmd in ('UPDATE','INSERT','DELETE') and coalesce(qual,with_check) not like '%eo_is_admin%') then raise exception 'Member writes are not restricted'; end if;
 update public.members set member_role='admin';
 get diagnostics changed = row_count;
 if changed<>0 then raise exception 'Ordinary member could change roles'; end if;
 begin
   insert into public.members(name,auth_user_id,member_role,status) values('privacy verification',auth.uid(),'admin','active');
   raise exception 'Ordinary member could insert privileged row';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select auth_user_id::text from public.members where member_role='admin' and auth_user_id is not null limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare own public.members; result jsonb; begin
 if not public.eo_is_admin() then raise exception 'Existing admin lost access'; end if;
 if jsonb_array_length(public.eo_member_directory())<>(select count(*) from public.members) then raise exception 'Admin directory incomplete'; end if;
 select * into own from public.members where auth_user_id=auth.uid();
 result=public.eo_update_my_profile(own.name,own.phone);
 if result->>'id'<>own.id::text or result->>'member_role'<>own.member_role then raise exception 'Self profile update failed'; end if;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.eo_member_directory()','execute') then raise exception 'Anonymous directory access'; end if;
 if not (select relrowsecurity from pg_class where oid='public.members'::regclass) then raise exception 'RLS disabled'; end if;
end $$;
rollback;
select 'PASS: ordinary member isolation, admin access, write restrictions and anonymous denial' as privacy_verification;
