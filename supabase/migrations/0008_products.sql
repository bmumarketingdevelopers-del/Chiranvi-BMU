-- =====================================================================================================
-- 0008 · Products (Step 7 of the backend plan)
--   product_pages      the website's product pages (/products/<slug>): every text, pack, price and picture,
--                      as one JSON document per page (the same shape as components/product/product-page-data.ts).
--                      Filled once from the code's 34 starting pages; after that the Chiranvi Panel edits them.
--   product_cards      the cards on Products & pricing: stock, switched on/off, Best Sellers place, photo,
--                      and (for products without a page) the price. Money in paise.
--   product_categories categories the owner added on Products & pricing (the standard four are built in)
--   restock_requests   "Notify me": a customer asked to be told when a sold-out product is back
-- Rules: everyone (even not logged in) can read published products; staff change them according to their
-- role (Products & pricing → View / Create / Edit / Delete); PRICES change only by the owner, checked by
-- the database itself. Safe to run again.
-- =====================================================================================================

-- 1. product_pages ---------------------------------------------------------------------------------
create table if not exists public.product_pages (
  slug text primary key,                              -- the page address, e.g. 'a2-desi-milk'
  page jsonb not null,                                -- the whole page (texts, packs, prices, pictures …)
  sort_order integer not null default 1000,           -- the order on All products (starting pages first)
  is_starting_page boolean not null default false,    -- one of the pages the website started with (in the code)
  is_changed boolean not null default false,          -- a starting page edited in the panel ("Restore original")
  is_hidden boolean not null default false,           -- a starting page deleted in the panel (can be restored)
  updated_by text,                                    -- who changed it last (name)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists product_pages_set_updated_at on public.product_pages;
create trigger product_pages_set_updated_at
  before update on public.product_pages
  for each row execute function public.set_updated_at();


-- 2. product_cards ---------------------------------------------------------------------------------
create table if not exists public.product_cards (
  product_id text primary key,                        -- e.g. 'a2-desi-milk' or 'kapti-wheat-atta-5-kg'
  name text not null,
  category text not null default 'Others',
  pack_size text not null default '',
  price_paise integer not null default 0 check (price_paise >= 0),
  original_price_paise integer check (original_price_paise is null or original_price_paise >= 0),
  subscription_price_paise integer check (subscription_price_paise is null or subscription_price_paise >= 0),
  stock text not null default 'in' check (stock in ('in', 'low', 'out')),
  is_visible boolean not null default true,           -- false: switched off, the website shows Sold out
  show_on_best_sellers boolean not null default false,
  best_seller_order integer,
  units_per_day integer not null default 0,
  image_source text,
  image_width integer,
  image_height integer,
  out_of_stock_reported_by text,
  out_of_stock_reported_at timestamptz,
  sort_order integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists product_cards_set_updated_at on public.product_cards;
create trigger product_cards_set_updated_at
  before update on public.product_cards
  for each row execute function public.set_updated_at();


-- 3. product_categories ----------------------------------------------------------------------------
create table if not exists public.product_categories (
  name text primary key,
  created_at timestamptz not null default now()
);


-- 4. restock_requests ("Notify me") --------------------------------------------------------------
create table if not exists public.restock_requests (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.product_cards (product_id) on delete cascade,
  mobile_number text not null check (mobile_number ~ '^\d{10}$'),
  created_at timestamptz not null default now(),
  unique (product_id, mobile_number)                  -- once per customer per product
);


-- 5. Prices change only by the owner ---------------------------------------------------------------
-- On a page: the packs (sizes and prices), the milk price, crossed-out price, 500 ml price and plans.
create or replace function public.guard_page_prices()
returns trigger
language plpgsql
as $$
begin
  if public.is_owner() or current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if (new.page -> 'packs') is distinct from (old.page -> 'packs')
     or (new.page -> 'price') is distinct from (old.page -> 'price')
     or (new.page -> 'originalPrice') is distinct from (old.page -> 'originalPrice')
     or (new.page -> 'halfLitrePrice') is distinct from (old.page -> 'halfLitrePrice')
     or (new.page -> 'plans') is distinct from (old.page -> 'plans') then
    raise exception 'Prices are changed only by the owner';
  end if;
  return new;
end;
$$;

drop trigger if exists product_pages_guard_prices on public.product_pages;
create trigger product_pages_guard_prices
  before update on public.product_pages
  for each row execute function public.guard_page_prices();

-- On a card: its three prices
create or replace function public.guard_card_prices()
returns trigger
language plpgsql
as $$
begin
  if public.is_owner() or current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.price_paise is distinct from old.price_paise
     or new.original_price_paise is distinct from old.original_price_paise
     or new.subscription_price_paise is distinct from old.subscription_price_paise then
    raise exception 'Prices are changed only by the owner';
  end if;
  return new;
end;
$$;

drop trigger if exists product_cards_guard_prices on public.product_cards;
create trigger product_cards_guard_prices
  before update on public.product_cards
  for each row execute function public.guard_card_prices();


-- 6. Permissions and rules ---------------------------------------------------------------------------
grant select on public.product_pages, public.product_cards, public.product_categories to anon, authenticated;
grant insert, update, delete on public.product_pages, public.product_cards, public.product_categories to authenticated;
grant select, insert, delete on public.restock_requests to authenticated;

alter table public.product_pages enable row level security;
alter table public.product_cards enable row level security;
alter table public.product_categories enable row level security;
alter table public.restock_requests enable row level security;

-- product_pages: everyone reads the pages that are shown (not deleted, not drafts); staff read all
drop policy if exists "Read shown pages" on public.product_pages;
create policy "Read shown pages" on public.product_pages for select
  using ((not is_hidden and coalesce(page ->> 'status', 'published') = 'published') or public.has_permission('products', 'view'));
drop policy if exists "Staff add pages" on public.product_pages;
create policy "Staff add pages" on public.product_pages for insert
  with check (public.has_permission('products', 'create'));
drop policy if exists "Staff edit pages" on public.product_pages;
create policy "Staff edit pages" on public.product_pages for update
  using (public.has_permission('products', 'edit')) with check (public.has_permission('products', 'edit'));
drop policy if exists "Staff delete pages" on public.product_pages;
create policy "Staff delete pages" on public.product_pages for delete
  using (public.has_permission('products', 'delete'));

-- product_cards: everyone reads them (the website shows stock and Sold out); staff change per role
drop policy if exists "Read cards" on public.product_cards;
create policy "Read cards" on public.product_cards for select using (true);
drop policy if exists "Staff add cards" on public.product_cards;
create policy "Staff add cards" on public.product_cards for insert
  with check (public.has_permission('products', 'create'));
drop policy if exists "Staff edit cards" on public.product_cards;
create policy "Staff edit cards" on public.product_cards for update
  using (public.has_permission('products', 'edit')) with check (public.has_permission('products', 'edit'));
drop policy if exists "Staff delete cards" on public.product_cards;
create policy "Staff delete cards" on public.product_cards for delete
  using (public.has_permission('products', 'delete'));

-- product_categories: everyone reads; staff who can add products add categories
drop policy if exists "Read categories" on public.product_categories;
create policy "Read categories" on public.product_categories for select using (true);
drop policy if exists "Staff add categories" on public.product_categories;
create policy "Staff add categories" on public.product_categories for insert
  with check (public.has_permission('products', 'create'));

-- restock_requests: a logged-in customer asks for themselves; staff see who is waiting and clear the list
drop policy if exists "Customer asks to be notified" on public.restock_requests;
create policy "Customer asks to be notified" on public.restock_requests for insert
  with check (mobile_number = public.current_mobile());
drop policy if exists "Own or staff read" on public.restock_requests;
create policy "Own or staff read" on public.restock_requests for select
  using (mobile_number = public.current_mobile() or public.has_permission('products', 'view'));
drop policy if exists "Staff clear" on public.restock_requests;
create policy "Staff clear" on public.restock_requests for delete
  using (public.has_permission('products', 'edit'));
