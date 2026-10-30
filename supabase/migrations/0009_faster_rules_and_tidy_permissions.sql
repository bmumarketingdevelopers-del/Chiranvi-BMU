-- =====================================================================================================
-- 0009 · Faster security rules, a few indexes, tidier permissions
-- Nothing changes in what anyone can see or do; the same questions are answered with less work.
--   1. current_mobile() reads the phone from the login token instead of looking it up in auth.users
--   2. has_permission() finds the person's role and permissions in one lookup instead of four
--   3. Every rule asks "who is logged in / may they do X" once per query, not once per row:
--      written as (select …), the database works the answer out first and reuses it for every row
--   4. addresses: one reading rule instead of two overlapping ones (both were checked on every read)
--   5. Indexes for "my Notify me requests" and "history of this product" in the activity log
--   6. Permissions nobody uses are taken away (TRUNCATE skips the rules entirely); the two owner
--      functions can't be called by visitors who are not logged in; fixed search_path on the rest
-- Safe to run again.
-- =====================================================================================================


-- 1. current_mobile(): from the login token ---------------------------------------------------------
-- Supabase puts the phone number in the login token ("phone": "918754852810"). Only if it is missing do
-- we fall back to auth.users, as before. Not logged in: empty, as before.
create or replace function public.current_mobile()
returns text
language sql stable security definer
set search_path = public, auth
as $$
  select case
    when auth.uid() is null then null
    else right(regexp_replace(coalesce(
      nullif(auth.jwt() ->> 'phone', ''),
      (select phone from auth.users where id = auth.uid()),
      ''), '\D', '', 'g'), 10)
  end;
$$;


-- 2. has_permission(): one lookup ----------------------------------------------------------------
-- Same answers as before: the owner always; other active staff what their role's grid says (and only if
-- the role has panel access); everyone else no.
create or replace function public.has_permission(module text, action text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((
    select case
      when s.role_id = 'owner' then true
      else coalesce((r.permissions -> module ->> action)::boolean, false) and r.has_panel_access
    end
    from public.staff_members s
    left join public.panel_roles r on r.id = s.role_id
    where s.mobile_number = public.current_mobile() and s.is_active
  ), false);
$$;


-- 3. The rules, each worked out once per query ------------------------------------------------------

-- app_settings
drop policy if exists "Staff edit settings" on public.app_settings;
create policy "Staff edit settings" on public.app_settings for update
  using ((select public.has_permission('products', 'edit')))
  with check ((select public.has_permission('products', 'edit')));

-- panel_roles
drop policy if exists "Staff read roles" on public.panel_roles;
create policy "Staff read roles" on public.panel_roles for select
  using ((select public.current_staff_role()) is not null);
drop policy if exists "Owner adds roles" on public.panel_roles;
create policy "Owner adds roles" on public.panel_roles for insert
  with check ((select public.is_owner()));
drop policy if exists "Owner edits roles" on public.panel_roles;
create policy "Owner edits roles" on public.panel_roles for update
  using ((select public.is_owner())) with check ((select public.is_owner()));
drop policy if exists "Owner deletes added roles" on public.panel_roles;
create policy "Owner deletes added roles" on public.panel_roles for delete
  using ((select public.is_owner()) and not is_built_in);

-- staff_members
drop policy if exists "See own staff row or the team" on public.staff_members;
create policy "See own staff row or the team" on public.staff_members for select
  using (mobile_number = (select public.current_mobile()) or (select public.has_permission('staff', 'view')));
drop policy if exists "Owner adds staff" on public.staff_members;
create policy "Owner adds staff" on public.staff_members for insert
  with check ((select public.is_owner()));
drop policy if exists "Owner edits staff" on public.staff_members;
create policy "Owner edits staff" on public.staff_members for update
  using ((select public.is_owner())) with check ((select public.is_owner()));
drop policy if exists "Owner removes staff" on public.staff_members;
create policy "Owner removes staff" on public.staff_members for delete
  using ((select public.is_owner()) and role_id <> 'owner');

-- customers
drop policy if exists "Customer or staff reads" on public.customers;
create policy "Customer or staff reads" on public.customers for select
  using (user_id = (select auth.uid()) or (select public.has_permission('customers', 'view')));
drop policy if exists "Customer creates own profile" on public.customers;
create policy "Customer creates own profile" on public.customers for insert
  with check ((user_id = (select auth.uid()) and mobile_number = (select public.current_mobile()))
              or (select public.has_permission('customers', 'create')));
drop policy if exists "Customer or staff edits" on public.customers;
create policy "Customer or staff edits" on public.customers for update
  using (user_id = (select auth.uid()) or (select public.has_permission('customers', 'edit')))
  with check (user_id = (select auth.uid()) or (select public.has_permission('customers', 'edit')));
drop policy if exists "Owner deletes customers" on public.customers;
create policy "Owner deletes customers" on public.customers for delete
  using ((select public.is_owner()));

-- addresses (4. one reading rule; the customer's own changes keep their own rules)
drop policy if exists "Customer manages own addresses" on public.addresses;
drop policy if exists "Staff read addresses" on public.addresses;
drop policy if exists "Customer or staff reads addresses" on public.addresses;
create policy "Customer or staff reads addresses" on public.addresses for select
  using (customer_id in (select id from public.customers where user_id = (select auth.uid()))
         or (select public.has_permission('customers', 'view')));
drop policy if exists "Customer adds own addresses" on public.addresses;
create policy "Customer adds own addresses" on public.addresses for insert
  with check (customer_id in (select id from public.customers where user_id = (select auth.uid())));
drop policy if exists "Customer edits own addresses" on public.addresses;
create policy "Customer edits own addresses" on public.addresses for update
  using (customer_id in (select id from public.customers where user_id = (select auth.uid())))
  with check (customer_id in (select id from public.customers where user_id = (select auth.uid())));
drop policy if exists "Customer deletes own addresses" on public.addresses;
create policy "Customer deletes own addresses" on public.addresses for delete
  using (customer_id in (select id from public.customers where user_id = (select auth.uid())));

-- product_pages
drop policy if exists "Read shown pages" on public.product_pages;
create policy "Read shown pages" on public.product_pages for select
  using ((not is_hidden and coalesce(page ->> 'status', 'published') = 'published')
         or (select public.has_permission('products', 'view')));
drop policy if exists "Staff add pages" on public.product_pages;
create policy "Staff add pages" on public.product_pages for insert
  with check ((select public.has_permission('products', 'create')));
drop policy if exists "Staff edit pages" on public.product_pages;
create policy "Staff edit pages" on public.product_pages for update
  using ((select public.has_permission('products', 'edit'))) with check ((select public.has_permission('products', 'edit')));
drop policy if exists "Staff delete pages" on public.product_pages;
create policy "Staff delete pages" on public.product_pages for delete
  using ((select public.has_permission('products', 'delete')));

-- product_cards
drop policy if exists "Staff add cards" on public.product_cards;
create policy "Staff add cards" on public.product_cards for insert
  with check ((select public.has_permission('products', 'create')));
drop policy if exists "Staff edit cards" on public.product_cards;
create policy "Staff edit cards" on public.product_cards for update
  using ((select public.has_permission('products', 'edit'))) with check ((select public.has_permission('products', 'edit')));
drop policy if exists "Staff delete cards" on public.product_cards;
create policy "Staff delete cards" on public.product_cards for delete
  using ((select public.has_permission('products', 'delete')));

-- product_categories
drop policy if exists "Staff add categories" on public.product_categories;
create policy "Staff add categories" on public.product_categories for insert
  with check ((select public.has_permission('products', 'create')));

-- restock_requests
drop policy if exists "Customer asks to be notified" on public.restock_requests;
create policy "Customer asks to be notified" on public.restock_requests for insert
  with check (mobile_number = (select public.current_mobile()));
drop policy if exists "Own or staff read" on public.restock_requests;
create policy "Own or staff read" on public.restock_requests for select
  using (mobile_number = (select public.current_mobile()) or (select public.has_permission('products', 'view')));
drop policy if exists "Staff clear" on public.restock_requests;
create policy "Staff clear" on public.restock_requests for delete
  using ((select public.has_permission('products', 'edit')));


-- 5. Indexes ---------------------------------------------------------------------------------------
-- "My Notify me requests": the existing (product_id, mobile_number) index starts with the product
create index if not exists restock_requests_mobile_number_idx on public.restock_requests (mobile_number);
-- The activity log by what was changed (e.g. a product's history) and by who did it
create index if not exists activity_log_target_idx on public.activity_log (target_table, target_id);
create index if not exists activity_log_actor_id_idx on public.activity_log (actor_id);


-- 6. Permissions ------------------------------------------------------------------------------------
-- TRUNCATE empties a whole table without asking the rules; TRIGGER and REFERENCES are only for building
-- tables. Our app never needs them from the browser.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;

-- Only logged-in people may call the two owner functions (the functions still check it is the owner)
revoke execute on function public.transfer_ownership(text, text), public.change_owner_mobile(text) from public, anon;

-- A fixed search_path, like the other functions, so nobody can swap in look-alike tables
alter function public.set_updated_at() set search_path = public;
alter function public.guard_owner_row() set search_path = public;
alter function public.guard_card_prices() set search_path = public;
alter function public.guard_page_prices() set search_path = public;
alter function public.has_recent_password_check() set search_path = public;
