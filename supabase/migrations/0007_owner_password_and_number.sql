-- =====================================================================================================
-- 0007 · Owner PIN / password, and changing the owner's number
--   1. password_kind on the owner's team row: 'pin' or 'password' once they have set one (empty: not set
--      yet, so the panel asks them to set it before their profile opens). The secret itself is kept by
--      Supabase Auth, scrambled; this column only says which kind they chose.
--   2. change_owner_mobile(): the owner changes their own login number. Like transferring ownership it
--      needs a password check from the last 10 minutes. The new number has no password yet, so
--      password_kind is cleared (they set one again after logging in with the new number).
--   3. A guard on staff_members: the owner's number and the owner role can only change through
--      change_owner_mobile() or transfer_ownership(), never by a plain update from the browser.
-- Safe to run again.
-- =====================================================================================================

alter table public.staff_members
  add column if not exists password_kind text check (password_kind is null or password_kind in ('pin', 'password'));


-- The guard -------------------------------------------------------------------------------------------
-- The two functions below set "chiranvi.owner_change" = 'allowed' for their own transaction only.
create or replace function public.guard_owner_row()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('chiranvi.owner_change', true), '') = 'allowed' then
    return new;
  end if;
  if old.role_id = 'owner' and (new.mobile_number <> old.mobile_number or new.role_id <> 'owner') then
    raise exception 'The owner''s number and role change only through "Change number" with your password';
  end if;
  if new.role_id = 'owner' and old.role_id <> 'owner' then
    raise exception 'Someone becomes the owner only through a transfer with the owner''s password';
  end if;
  return new;
end;
$$;

drop trigger if exists staff_members_guard_owner on public.staff_members;
create trigger staff_members_guard_owner
  before update on public.staff_members
  for each row execute function public.guard_owner_row();


-- Changing the owner's own number -----------------------------------------------------------------
create or replace function public.change_owner_mobile(new_mobile text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  owner_row public.staff_members;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can change the owner''s number';
  end if;
  if not public.has_recent_password_check() then
    raise exception 'Confirm with your password first';
  end if;
  if new_mobile !~ '^\d{10}$' then
    raise exception 'Enter a 10-digit mobile number';
  end if;
  if exists (select 1 from public.staff_members where mobile_number = new_mobile) then
    raise exception 'That number belongs to someone on the team';
  end if;

  select * into owner_row from public.staff_members where role_id = 'owner';
  perform set_config('chiranvi.owner_change', 'allowed', true);
  update public.staff_members set mobile_number = new_mobile, password_kind = null where id = owner_row.id;

  insert into public.activity_log (actor_id, actor_name, action, target_table, target_id, details)
  values (auth.uid(), owner_row.name, 'owner.number_changed', 'staff_members', new_mobile,
          jsonb_build_object('from', owner_row.mobile_number, 'to', new_mobile));
end;
$$;

grant execute on function public.change_owner_mobile(text) to authenticated;


-- transfer_ownership() again, now opening the guard for its own changes ---------------------------
create or replace function public.transfer_ownership(new_owner_mobile text, new_owner_name text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  old_owner public.staff_members;
begin
  if not public.is_owner() then
    raise exception 'Only the owner can transfer ownership';
  end if;
  if not public.has_recent_password_check() then
    raise exception 'Confirm with your password first';
  end if;
  if new_owner_mobile !~ '^\d{10}$' then
    raise exception 'Enter a 10-digit mobile number';
  end if;

  select * into old_owner from public.staff_members where role_id = 'owner';
  if old_owner.mobile_number = new_owner_mobile then
    raise exception 'That number is already the owner';
  end if;

  perform set_config('chiranvi.owner_change', 'allowed', true);
  -- The old owner stays on the team as a Manager (the new owner can remove them later)
  update public.staff_members set role_id = 'manager', title = 'Former owner', password_kind = null where id = old_owner.id;

  -- The new number becomes the Owner (added if they are not on the team yet); they set their own PIN or
  -- password the first time they open their profile
  insert into public.staff_members (mobile_number, name, role_id, title, is_active, password_kind)
  values (new_owner_mobile, coalesce(nullif(trim(new_owner_name), ''), 'New owner'), 'owner', 'Owner', true, null)
  on conflict (mobile_number) do update
    set role_id = 'owner',
        title = 'Owner',
        is_active = true,
        password_kind = null,
        name = coalesce(nullif(trim(excluded.name), ''), public.staff_members.name);

  insert into public.activity_log (actor_id, actor_name, action, target_table, target_id, details)
  values (auth.uid(), old_owner.name, 'ownership.transferred', 'staff_members', new_owner_mobile,
          jsonb_build_object('from', old_owner.mobile_number, 'to', new_owner_mobile));
end;
$$;
