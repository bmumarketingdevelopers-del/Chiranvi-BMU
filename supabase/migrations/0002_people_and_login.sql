-- =====================================================================================================
-- 0002 · People and login (Step 2 of the backend plan)
--   panel_roles    Owner / Admin / Manager / Delivery agent (+ roles the owner adds), with permissions
--   staff_members  the Chiranvi Panel team, by mobile number (added before they ever log in)
--   customers      one row per customer: the Profile page's details, linked to their login
--   addresses      each customer's saved delivery addresses
-- plus small helper functions the security rules use: who is logged in, are they staff, may they do X.
-- Login itself is Supabase Auth (phone OTP): it keeps the logged-in person's phone number; we match people
-- by the last 10 digits of it. Safe to run again.
-- =====================================================================================================


-- 1. Helper functions -----------------------------------------------------------------------------
-- "security definer": they run with the database owner's rights, so they can look things up that the
-- logged-in person cannot read themselves; "set search_path" stops anyone swapping in look-alike tables.

-- The logged-in person's mobile number, 10 digits ("918754852810" in Supabase Auth → "8754852810").
-- Empty when nobody is logged in.
create or replace function public.current_mobile()
returns text
language sql stable security definer
set search_path = public, auth
as $$
  select right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10)
  from auth.users
  where id = auth.uid();
$$;


-- 2. panel_roles ---------------------------------------------------------------------------------
-- permissions: for every panel page, which actions are allowed, as JSON, e.g.
--   {"orders": {"view": true, "create": true, "edit": true, "delete": false, "export": true}, ...}
-- (the same grid as the Roles & permissions page). The owner role always may do everything.
create table if not exists public.panel_roles (
  id text primary key,                                -- 'owner', 'admin', 'manager', 'delivery-agent', or made by the owner
  name text not null,
  is_built_in boolean not null default false,         -- the four starting roles cannot be deleted
  has_panel_access boolean not null default true,     -- false: no panel (delivery agents use the delivery app)
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists panel_roles_set_updated_at on public.panel_roles;
create trigger panel_roles_set_updated_at
  before update on public.panel_roles
  for each row execute function public.set_updated_at();


-- 3. staff_members -------------------------------------------------------------------------------
create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  mobile_number text not null unique check (mobile_number ~ '^\d{10}$'),  -- exactly 10 digits
  name text not null,
  role_id text not null references public.panel_roles (id),               -- must be an existing role
  title text,                                                             -- e.g. 'Hub manager'
  is_active boolean not null default true,                                -- false: access switched off
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists staff_members_set_updated_at on public.staff_members;
create trigger staff_members_set_updated_at
  before update on public.staff_members
  for each row execute function public.set_updated_at();


-- More helpers, now that the tables exist ----------------------------------------------------------

-- The logged-in person's role id if they are active staff ('owner', 'manager' …), otherwise empty
create or replace function public.current_staff_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select role_id from public.staff_members
  where mobile_number = public.current_mobile() and is_active;
$$;

-- Is the logged-in person the owner?
create or replace function public.is_owner()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce(public.current_staff_role() = 'owner', false);
$$;

-- May the logged-in person do this action on this panel page? e.g. has_permission('orders', 'edit')
-- The owner: always. Other staff: what their role's grid says (and only if the role has panel access).
create or replace function public.has_permission(module text, action text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select case
    when public.is_owner() then true
    else coalesce((
      select (r.permissions -> module ->> action)::boolean and r.has_panel_access
      from public.panel_roles r
      where r.id = public.current_staff_role()
    ), false)
  end;
$$;


-- 4. customers -----------------------------------------------------------------------------------
-- The Profile page's details. user_id links to their Supabase login (set when they first sign in).
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  customer_code text not null unique,                 -- 'CUS-3KJ2Q9T', made from the login number (as today)
  mobile_number text not null unique check (mobile_number ~ '^\d{10}$'),   -- the login number
  secondary_mobile text check (secondary_mobile is null or secondary_mobile ~ '^\d{10}$'),
  first_name text not null default '',
  last_name text not null default '',
  email text,
  primary_address text,                               -- the Profile page's two address lines
  secondary_address text,
  location text,                                      -- Bengaluru area from the area picker, or typed for "Others"
  pincode text check (pincode is null or pincode ~ '^\d{6}$'),
  date_of_birth date,
  family_size text,
  preferred_plan_type text,
  profile_completed_at timestamptz,                   -- when they first saved the Profile (empty: new customer)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();


-- 5. addresses -----------------------------------------------------------------------------------
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,  -- customer removed: their addresses go too
  label text not null default 'Home',                 -- Home / Work / Other
  name text not null,                                 -- who receives it
  mobile_number text not null check (mobile_number ~ '^\d{10}$'),  -- can be someone else's (delivery contact)
  house_and_street text not null,
  area text not null,
  city text not null default 'Bengaluru',
  pincode text not null check (pincode ~ '^\d{6}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists addresses_customer_id_idx on public.addresses (customer_id);
-- At most one default address per customer
create unique index if not exists addresses_one_default_per_customer on public.addresses (customer_id) where is_default;

drop trigger if exists addresses_set_updated_at on public.addresses;
create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();


-- 6. Permissions (GRANT) and rules (RLS) -----------------------------------------------------------
-- Visitors who are not logged in (anon) get nothing here. Logged-in people (authenticated) get the
-- table doors, and the rules below decide which rows.
grant select, insert, update, delete on public.panel_roles, public.staff_members, public.customers, public.addresses to authenticated;
grant execute on function public.current_mobile(), public.current_staff_role(), public.is_owner(), public.has_permission(text, text) to authenticated;

alter table public.panel_roles enable row level security;
alter table public.staff_members enable row level security;
alter table public.customers enable row level security;
alter table public.addresses enable row level security;

-- panel_roles: staff can read the roles (the panel needs its own permissions); only the owner changes
-- them, and the built-in roles cannot be deleted.
drop policy if exists "Staff read roles" on public.panel_roles;
create policy "Staff read roles" on public.panel_roles for select
  using (public.current_staff_role() is not null);
drop policy if exists "Owner adds roles" on public.panel_roles;
create policy "Owner adds roles" on public.panel_roles for insert
  with check (public.is_owner());
drop policy if exists "Owner edits roles" on public.panel_roles;
create policy "Owner edits roles" on public.panel_roles for update
  using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Owner deletes added roles" on public.panel_roles;
create policy "Owner deletes added roles" on public.panel_roles for delete
  using (public.is_owner() and not is_built_in);

-- staff_members: a person can see their own row (so the website knows to show "Chiranvi Panel");
-- staff with Staff → View see the team; only the owner adds, changes or removes people.
drop policy if exists "See own staff row or the team" on public.staff_members;
create policy "See own staff row or the team" on public.staff_members for select
  using (mobile_number = public.current_mobile() or public.has_permission('staff', 'view'));
drop policy if exists "Owner adds staff" on public.staff_members;
create policy "Owner adds staff" on public.staff_members for insert
  with check (public.is_owner());
drop policy if exists "Owner edits staff" on public.staff_members;
create policy "Owner edits staff" on public.staff_members for update
  using (public.is_owner()) with check (public.is_owner());
drop policy if exists "Owner removes staff" on public.staff_members;
create policy "Owner removes staff" on public.staff_members for delete
  using (public.is_owner() and role_id <> 'owner');                -- the owner row itself is never deleted

-- customers: a customer sees and edits only their own row, and can only create it for their own login
-- number; staff with Customers → View / Edit see or change all; only the owner deletes a customer.
drop policy if exists "Customer or staff reads" on public.customers;
create policy "Customer or staff reads" on public.customers for select
  using (user_id = auth.uid() or public.has_permission('customers', 'view'));
drop policy if exists "Customer creates own profile" on public.customers;
create policy "Customer creates own profile" on public.customers for insert
  with check ((user_id = auth.uid() and mobile_number = public.current_mobile()) or public.has_permission('customers', 'create'));
drop policy if exists "Customer or staff edits" on public.customers;
create policy "Customer or staff edits" on public.customers for update
  using (user_id = auth.uid() or public.has_permission('customers', 'edit'))
  with check (user_id = auth.uid() or public.has_permission('customers', 'edit'));
drop policy if exists "Owner deletes customers" on public.customers;
create policy "Owner deletes customers" on public.customers for delete
  using (public.is_owner());

-- addresses: a customer manages only the addresses in their own book; staff with Customers → View read them.
drop policy if exists "Customer manages own addresses" on public.addresses;
create policy "Customer manages own addresses" on public.addresses for all
  using (customer_id in (select id from public.customers where user_id = auth.uid()))
  with check (customer_id in (select id from public.customers where user_id = auth.uid()));
drop policy if exists "Staff read addresses" on public.addresses;
create policy "Staff read addresses" on public.addresses for select
  using (public.has_permission('customers', 'view'));


-- 7. Starting roles (the same as the panel's built-in roles today) ---------------------------------
-- Letters per page: V view, C create, E edit, D delete, X export.
create or replace function pg_temp.grid(letters jsonb)
returns jsonb language sql as $$
  select jsonb_object_agg(m, jsonb_build_object(
    'view', position('V' in coalesce(letters ->> m, '')) > 0,
    'create', position('C' in coalesce(letters ->> m, '')) > 0,
    'edit', position('E' in coalesce(letters ->> m, '')) > 0,
    'delete', position('D' in coalesce(letters ->> m, '')) > 0,
    'export', position('X' in coalesce(letters ->> m, '')) > 0))
  from unnest(array['dashboard','orders','subscriptions','pause-requests','customers','leads','payments','refunds',
                    'products','deliveries','routes','reports','coupons','staff','roles']) as m;
$$;

insert into public.panel_roles (id, name, is_built_in, has_panel_access, permissions) values
  ('owner', 'Owner', true, true, pg_temp.grid('{"dashboard":"VCEDX","orders":"VCEDX","subscriptions":"VCEDX","pause-requests":"VCEDX","customers":"VCEDX","leads":"VCEDX","payments":"VCEDX","refunds":"VCEDX","products":"VCEDX","deliveries":"VCEDX","routes":"VCEDX","reports":"VCEDX","coupons":"VCEDX","staff":"VCEDX","roles":"VCEDX"}')),
  ('admin', 'Admin', true, true, pg_temp.grid('{"dashboard":"VCEDX","orders":"VCEDX","subscriptions":"VCEDX","pause-requests":"VCEDX","customers":"VCEDX","leads":"VCEDX","payments":"VCEDX","refunds":"VCEDX","products":"VCEDX","deliveries":"VCEDX","routes":"VCEDX","reports":"VCEDX","coupons":"VCEDX"}')),
  ('manager', 'Manager', true, true, pg_temp.grid('{"dashboard":"VX","orders":"VCEX","subscriptions":"VCEX","pause-requests":"VE","customers":"VCEX","leads":"VCEX","payments":"VX","refunds":"VCE","products":"VE","deliveries":"VCEDX","routes":"VCEDX","reports":"VX","staff":"V","coupons":"VCE"}')),
  ('delivery-agent', 'Delivery agent', true, false, pg_temp.grid('{}'))
on conflict (id) do nothing;                          -- never overwrite roles the owner has changed


-- 8. Settings: staff with Products → Edit may now change the site settings (e.g. product rows) ------
grant update on public.app_settings to authenticated;
drop policy if exists "Staff edit settings" on public.app_settings;
create policy "Staff edit settings" on public.app_settings for update
  using (public.has_permission('products', 'edit')) with check (public.has_permission('products', 'edit'));
