-- Keep contact details server-side: administrators or the row's own account only.
begin;
alter table public.members add column if not exists auth_user_id uuid,
  add column if not exists email text,
  add column if not exists member_role text not null default 'associate';

-- Bind existing records only when a unique authenticated email matches.
update public.members m set auth_user_id=u.id
from auth.users u
where m.auth_user_id is null and nullif(trim(m.email),'') is not null
  and lower(trim(m.email))=lower(trim(u.email))
  and (select count(*) from public.members other where lower(trim(other.email))=lower(trim(m.email)))=1;
do $$ begin
  if not exists(select 1 from public.members where member_role='admin' and auth_user_id is not null) then
    raise exception 'No linked administrator exists; migration stopped without changing access';
  end if;
end $$;

create or replace function public.eo_is_admin() returns boolean
language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.members m where m.auth_user_id=auth.uid() and m.member_role='admin'); $$;
revoke all on function public.eo_is_admin() from public,anon;
grant execute on function public.eo_is_admin() to authenticated;

alter table public.members enable row level security;
do $$ declare item record; begin
  for item in select policyname from pg_policies where schemaname='public' and tablename='members' loop
    execute format('drop policy %I on public.members',item.policyname);
  end loop;
end $$;
revoke all on public.members from anon;
grant select,insert,update,delete on public.members to authenticated;
create policy eo_members_read on public.members for select to authenticated
  using (auth_user_id=(select auth.uid()) or (select public.eo_is_admin()));
create policy eo_members_insert on public.members for insert to authenticated with check ((select public.eo_is_admin()));
create policy eo_members_update on public.members for update to authenticated
  using ((select public.eo_is_admin())) with check ((select public.eo_is_admin()));
create policy eo_members_delete on public.members for delete to authenticated using ((select public.eo_is_admin()));

create or replace function public.eo_member_directory() returns jsonb
language sql stable security definer set search_path=''
as $$
  select coalesce(jsonb_agg(case when public.eo_is_admin() or m.auth_user_id=auth.uid()
    then to_jsonb(m) else jsonb_build_object('id',m.id,'name',m.name,'status',m.status,'member_role',m.member_role) end order by m.name),'[]'::jsonb)
  from public.members m where auth.uid() is not null;
$$;
revoke all on function public.eo_member_directory() from public,anon;
grant execute on function public.eo_member_directory() to authenticated;

create or replace function public.eo_update_my_profile(p_name text,p_phone text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result public.members; begin
  if auth.uid() is null or length(trim(coalesce(p_name,''))) not between 1 and 100 or length(coalesce(p_phone,''))>40 then raise exception 'Invalid profile'; end if;
  update public.members set name=trim(p_name),phone=trim(coalesce(p_phone,'')) where auth_user_id=auth.uid() returning * into result;
  if result.id is null then raise exception 'Linked member not found'; end if;
  return to_jsonb(result);
end $$;
revoke all on function public.eo_update_my_profile(text,text) from public,anon;
grant execute on function public.eo_update_my_profile(text,text) to authenticated;

create or replace function public.eo_register_member(p_name text,p_department text,p_phone text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result public.members; account_email text; begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select email into account_email from auth.users where id=auth.uid();
  select * into result from public.members where auth_user_id=auth.uid();
  if result.id is null then
    if length(trim(coalesce(p_name,''))) not between 1 and 100 then raise exception 'Invalid name'; end if;
    insert into public.members(name,department,phone,email,auth_user_id,member_role,status)
    values(trim(p_name),left(coalesce(p_department,''),100),left(coalesce(p_phone,''),40),account_email,auth.uid(),'associate','active') returning * into result;
  end if;
  return to_jsonb(result);
end $$;
revoke all on function public.eo_register_member(text,text,text) from public,anon;
grant execute on function public.eo_register_member(text,text,text) to authenticated;
-- Historical audit actors contain account emails. Keep those records admin-only.
do $$ declare item record; begin
  if to_regclass('public.change_logs') is not null then
    alter table public.change_logs enable row level security;
    revoke all on public.change_logs from anon;
    for item in select policyname from pg_policies where schemaname='public' and tablename='change_logs' and cmd in ('SELECT','ALL') loop
      execute format('drop policy %I on public.change_logs',item.policyname);
    end loop;
    create policy eo_change_logs_read on public.change_logs for select to authenticated using ((select public.eo_is_admin()));
    if not exists(select 1 from pg_policies where schemaname='public' and tablename='change_logs' and policyname='eo_change_logs_insert') then
      create policy eo_change_logs_insert on public.change_logs for insert to authenticated with check ((select auth.uid()) is not null);
    end if;
  end if;
end $$;
notify pgrst,'reload schema';
commit;
