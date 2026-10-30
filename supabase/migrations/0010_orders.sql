-- =====================================================================================================
-- 0010 · Orders (Step 8 of the backend plan)
--   orders        one row per order placed with "Pay now" on the cart page (one-time items, or a milk plan)
--   order_items   the products in each order, with the price paid for each
--   place_order() the only way to create an order: the database fills in who ordered (from the login),
--                 the order number, the time and the promised delivery, so the browser can't fake them
-- Rules: a customer sees only their own orders; staff see / change / delete them according to their role
-- (Orders → View / Edit / Delete). Staff can only change an order's step (Packed, Out for delivery …),
-- never its money or customer. Razorpay is not connected yet: every order is "not_charged" until it is.
-- Money in paise. Safe to run again.
-- =====================================================================================================


-- 1. orders ------------------------------------------------------------------------------------------
-- Website order numbers continue as CF-60001, CF-60002 … (the old browser-only orders used CF-1xxxx–9xxxx)
create sequence if not exists public.order_number_seq start 60001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('CF-' || nextval('public.order_number_seq')),
  customer_mobile text not null check (customer_mobile ~ '^\d{10}$'),        -- the login number
  customer_id uuid references public.customers (id) on delete set null,
  customer_code text,                                  -- 'CUS-4C5XKOU' at the time of the order
  customer_name text not null default '',              -- their name at the time of the order
  area text not null default '',                       -- the delivery address's area (panel: Location)
  status text not null default 'placed'
    check (status in ('placed', 'packed', 'out-for-delivery', 'delivered', 'cancelled')),
  status_changed_at jsonb not null default '{}'::jsonb, -- when each step was reached, e.g. {"placed": 1761800000000}
  total_paise integer not null check (total_paise >= 0),  -- what the customer pays (after coupon, with delivery)
  delivery_fee_paise integer not null default 0 check (delivery_fee_paise >= 0),
  coupon_code text,
  coupon_discount_paise integer check (coupon_discount_paise is null or coupon_discount_paise >= 0),
  payment_method text not null check (payment_method in ('UPI', 'Net banking', 'Card')),
  payment_status text not null default 'not_charged'
    check (payment_status in ('not_charged', 'paid', 'failed', 'refunded')),
  deliver_to text not null,                            -- 'Priya Raman · 12, 4th Cross, Jayanagar …'
  delivery_mobile text check (delivery_mobile is null or delivery_mobile ~ '^\d{10}$'),
  subscription jsonb,                                  -- a milk plan's details (plan, bottles a day …), else empty
  placed_at timestamptz not null default now(),
  promised_at timestamptz not null,                    -- the next morning by 7 AM (India time)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- My Orders (a customer's own, newest first), the panel's list (newest first), and its status filter
create index if not exists orders_customer_mobile_placed_at_idx on public.orders (customer_mobile, placed_at desc);
create index if not exists orders_placed_at_idx on public.orders (placed_at desc);
create index if not exists orders_status_placed_at_idx on public.orders (status, placed_at desc);
create index if not exists orders_customer_id_idx on public.orders (customer_id);


-- 2. order_items --------------------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,   -- order removed: its items go too
  position integer not null,                           -- the order of the lines, as in the cart
  product_id text not null,                            -- the pack's Product ID, e.g. 'a2-desi-ghee-1-litre'
  name text not null,
  pack_size text not null default '',
  quantity integer not null check (quantity > 0),
  price_paise integer not null check (price_paise >= 0),  -- the price of one, as paid
  item jsonb not null,                                 -- the whole cart line as the website showed it (picture …)
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on public.order_items (order_id, position);


-- 3. place_order(): "Pay now" ---------------------------------------------------------------------------
-- details: the checkout as the website sends it (amounts in rupees, as the website shows them):
--   {items: [cart lines], total, deliveryFee, couponCode, couponDiscount, deliverTo, deliveryMobile, area,
--    paymentMethod, subscription}
-- Returns the order number, the times and the name the order was saved with.
create or replace function public.place_order(details jsonb)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  mobile text := public.current_mobile();
  customer public.customers;
  new_order public.orders;
  line jsonb;
  line_position integer := 0;
  placed timestamptz := now();
begin
  if auth.uid() is null or coalesce(mobile, '') !~ '^\d{10}$' then
    raise exception 'Log in to place an order';
  end if;
  if jsonb_typeof(details -> 'items') is distinct from 'array' or jsonb_array_length(details -> 'items') = 0 then
    raise exception 'The order has no items';
  end if;
  if jsonb_array_length(details -> 'items') > 50 then
    raise exception 'Too many items in one order';
  end if;
  if coalesce(trim(details ->> 'deliverTo'), '') = '' then
    raise exception 'Choose a delivery address';
  end if;

  select * into customer from public.customers where mobile_number = mobile;

  insert into public.orders (
    customer_mobile, customer_id, customer_code, customer_name, area, total_paise, delivery_fee_paise,
    coupon_code, coupon_discount_paise, payment_method, deliver_to, delivery_mobile, subscription,
    placed_at, promised_at, status_changed_at)
  values (
    mobile,
    customer.id,
    customer.customer_code,
    -- The profile's name, or the name on the delivery address (before the profile is saved)
    coalesce(nullif(trim(concat_ws(' ', customer.first_name, customer.last_name)), ''), split_part(details ->> 'deliverTo', ' · ', 1)),
    coalesce(nullif(details ->> 'area', ''), customer.location, ''),
    round((details ->> 'total')::numeric * 100),
    round(coalesce((details ->> 'deliveryFee')::numeric, 0) * 100),
    nullif(details ->> 'couponCode', ''),
    case when details ->> 'couponDiscount' is not null then round((details ->> 'couponDiscount')::numeric * 100) end,
    coalesce(details ->> 'paymentMethod', 'UPI'),
    trim(details ->> 'deliverTo'),
    nullif(details ->> 'deliveryMobile', ''),
    case when jsonb_typeof(details -> 'subscription') = 'object' then details -> 'subscription' end,
    placed,
    -- The next day by 7 AM, India time
    (((placed at time zone 'Asia/Kolkata')::date + 1) + time '07:00') at time zone 'Asia/Kolkata',
    jsonb_build_object('placed', floor(extract(epoch from placed) * 1000)::bigint))
  returning * into new_order;

  for line in select value from jsonb_array_elements(details -> 'items') loop
    line_position := line_position + 1;
    if coalesce((line ->> 'quantity')::numeric, 0) < 1 or coalesce((line ->> 'price')::numeric, -1) < 0 then
      raise exception 'Check the quantities in your cart';
    end if;
    insert into public.order_items (order_id, position, product_id, name, pack_size, quantity, price_paise, item)
    values (new_order.id, line_position, coalesce(line ->> 'productId', ''), coalesce(line ->> 'name', ''),
            coalesce(line ->> 'packSize', ''), (line ->> 'quantity')::integer, round((line ->> 'price')::numeric * 100), line);
  end loop;

  return jsonb_build_object(
    'orderNumber', new_order.order_number,
    'placedAt', floor(extract(epoch from new_order.placed_at) * 1000)::bigint,
    'promisedAt', floor(extract(epoch from new_order.promised_at) * 1000)::bigint,
    'customerName', new_order.customer_name,
    'customerCode', new_order.customer_code,
    'area', new_order.area);
end;
$$;


-- 4. Permissions and rules ------------------------------------------------------------------------------
-- Orders are made only by place_order() (no insert from the browser). Staff may change only the step.
grant select, delete on public.orders to authenticated;
grant update (status, status_changed_at) on public.orders to authenticated;
grant select on public.order_items to authenticated;
revoke execute on function public.place_order(jsonb) from public, anon;
grant execute on function public.place_order(jsonb) to authenticated;

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Own or staff read orders" on public.orders;
create policy "Own or staff read orders" on public.orders for select
  using (customer_mobile = (select public.current_mobile()) or (select public.has_permission('orders', 'view')));
drop policy if exists "Staff move orders along" on public.orders;
create policy "Staff move orders along" on public.orders for update
  using ((select public.has_permission('orders', 'edit'))) with check ((select public.has_permission('orders', 'edit')));
drop policy if exists "Staff delete orders" on public.orders;
create policy "Staff delete orders" on public.orders for delete
  using ((select public.has_permission('orders', 'delete')));

-- An order's items: whoever may see the order (the orders rule above decides)
drop policy if exists "Read items of visible orders" on public.order_items;
create policy "Read items of visible orders" on public.order_items for select
  using (order_id in (select id from public.orders));
