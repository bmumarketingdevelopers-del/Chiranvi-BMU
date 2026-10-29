-- =====================================================================================================
-- 0001 · Common setup (Step 1 of the backend plan)
-- The base every later table uses:
--   1. set_updated_at(): a trigger function that fills "updated_at" on every change, for all tables
--   2. app_settings: site-wide settings the Chiranvi Panel changes (product rows, free delivery amount …)
--   3. activity_log: who changed what in the panel, and when
-- Run once in Supabase → SQL Editor (or by our migration script). Safe to run again: everything uses
-- "if not exists" / "or replace".
-- =====================================================================================================


-- 1. updated_at, filled in automatically ------------------------------------------------------------
-- Every table gets created_at and updated_at columns. Instead of the code remembering to set
-- updated_at, the database does it: this function runs just before a row is changed and stamps the time.
-- Each table switches it on with one line:  create trigger … before update … execute function set_updated_at();
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- 2. app_settings: one row per site-wide setting ---------------------------------------------------
-- key   = the setting's name, e.g. 'product_rows' or 'free_delivery_from_paise'
-- value = its value as JSON, so one table can hold any shape (a number, a list, an object)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,                                   -- a short note on what the setting does
  updated_by uuid,                                    -- the staff member's login id (filled from Step 2 on)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- Security (RLS = Row Level Security): with it on, nobody can read or change a row unless a rule allows it.
-- Rule here: everyone (logged in or not) may READ the settings, because the website needs them
-- (e.g. the order of "You may also like"). Nobody may change them from the browser yet; from Step 2 a rule
-- lets panel staff change them. Our server code with the secret key can always change them.
alter table public.app_settings enable row level security;

-- Two doors must both be open for the browser to read: the table permission (GRANT, below) and the row
-- rule (POLICY). This project gives no table permissions by default, so we grant reading only.
-- anon = visitors not logged in; authenticated = logged-in customers and staff.
grant select on public.app_settings to anon, authenticated;

drop policy if exists "Anyone can read settings" on public.app_settings;
create policy "Anyone can read settings"
  on public.app_settings for select
  using (true);

-- The starting values (the same as the website uses today). "on conflict do nothing": never overwrite a
-- value the panel has already changed if this file is run again.
insert into public.app_settings (key, value, description) values
  ('free_delivery_from_paise', '50000', 'Orders from this amount (in paise: 50000 = ₹500) get free delivery'),
  ('delivery_fee_paise', '3000', 'Delivery fee below the free delivery amount (in paise: 3000 = ₹30)'),
  ('order_cutoff_hour', '21', 'Orders until this hour (24 h clock) are delivered the next morning'),
  ('product_rows', '{
      "fastSelling": ["a2-desi-ghee", "fresh-cow-paneer", "batter-powder", "desi-white-butter", "a2-desi-milk"],
      "youMayAlsoLike": {
        "instant-noodles": ["other-flavour", "other-flavour", "same-flavour:pasta", "same-flavour:macaroni", "a2-desi-milk"],
        "pasta": ["other-flavour", "other-flavour", "same-flavour:instant-noodles", "same-flavour:macaroni", "a2-desi-ghee"],
        "macaroni": ["other-flavour", "other-flavour", "same-flavour:pasta", "same-flavour:instant-noodles", "a2-desi-milk"]
      }
    }', 'The five products under each product page: Fast selling, and You may also like on noodles / pasta / macaroni pages')
on conflict (key) do nothing;


-- 3. activity_log: a diary of changes made in the panel ---------------------------------------------
-- One row per action, e.g. "Praveen changed the price of A2 Milk from ₹105 to ₹110".
-- Only our server code writes here (with the secret key); the panel will read it from Step 2 on.
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),     -- a unique id made by the database
  actor_id uuid,                                      -- who did it (login id), empty for automatic jobs
  actor_name text,                                    -- their name at that time, e.g. 'Praveen'
  action text not null,                               -- what happened, e.g. 'product.price_changed'
  target_table text,                                  -- which table it touched, e.g. 'products'
  target_id text,                                     -- which row, e.g. 'a2-desi-milk'
  details jsonb,                                      -- the before/after values, e.g. {"from":10500,"to":11000}
  created_at timestamptz not null default now()
);

-- Newest first is how the panel will show it, so the database keeps an index (a sorted list) for that
create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);

-- RLS on, and no rules yet: nobody can read or write it from a browser. Only the server (secret key).
alter table public.activity_log enable row level security;
