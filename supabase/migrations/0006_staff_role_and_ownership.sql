-- =====================================================================================================
-- 0006 · Staff role and transferring ownership
--   1. A new built-in "Staff" role below Manager (normal staff): a Manager the owner no longer wants as
--      Manager is moved back to Staff. Starts with View on Dashboard, Orders, Pause requests and
--      Deliveries; the owner can tick more on Roles & permissions.
--   2. Only one owner, ever: the database refuses a second owner row.
--   3. transfer_ownership(): the owner hands the business to another mobile number. Allowed only for the
--      owner, and only if they confirmed their password in the last 10 minutes (so someone using the
--      owner's unlocked phone can't do it). In one step: the old owner becomes a Manager and the new
--      number becomes the Owner (added to the team if new). Written to the activity log.
-- Safe to run again.
-- =====================================================================================================

-- 1. Staff role ----------------------------------------------------------------------------------
insert into public.panel_roles (id, name, is_built_in, has_panel_access, permissions)
select 'staff', 'Staff', true, true, jsonb_object_agg(m, jsonb_build_object(
  'view', m in ('dashboard', 'orders', 'pause-requests', 'deliveries'),
  'create', false, 'edit', false, 'delete', false, 'export', false))
from unnest(array['dashboard','orders','subscriptions','pause-requests','customers','leads','payments','refunds',
                  'products','deliveries','routes','reports','coupons','staff','roles']) as m
on conflict (id) do nothing;


-- 2. Only one owner ---------------------------------------------------------------------------------
create unique index if not exists staff_members_only_one_owner
  on public.staff_members (role_id)
  where role_id = 'owner';


-- 3. Transfer ownership ---------------------------------------------------------------------------

-- Did the logged-in person confirm their password in the last 10 minutes? Supabase writes how the
-- current login was made into the login token ("amr": e.g. [{"method": "password", "timestamp": …}]).
create or replace function public.has_recent_password_check()
returns boolean
language sql stable
as $$
  select exists (
    select 1
    from jsonb_array_elements(coalesce(auth.jwt() -> 'amr', '[]'::jsonb)) as method
    where method ->> 'method' = 'password'
      and (method ->> 'timestamp')::bigint > extract(epoch from now()) - 600
  );
$$;

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

  -- The old owner stays on the team as a Manager (the new owner can remove them later)
  update public.staff_members set role_id = 'manager', title = 'Former owner' where id = old_owner.id;

  -- The new number becomes the Owner (added if they are not on the team yet)
  insert into public.staff_members (mobile_number, name, role_id, title, is_active)
  values (new_owner_mobile, coalesce(nullif(trim(new_owner_name), ''), 'New owner'), 'owner', 'Owner', true)
  on conflict (mobile_number) do update
    set role_id = 'owner',
        title = 'Owner',
        is_active = true,
        name = coalesce(nullif(trim(excluded.name), ''), public.staff_members.name);

  insert into public.activity_log (actor_id, actor_name, action, target_table, target_id, details)
  values (auth.uid(), old_owner.name, 'ownership.transferred', 'staff_members', new_owner_mobile,
          jsonb_build_object('from', old_owner.mobile_number, 'to', new_owner_mobile));
end;
$$;

grant execute on function public.has_recent_password_check() to authenticated;
grant execute on function public.transfer_ownership(text, text) to authenticated;
