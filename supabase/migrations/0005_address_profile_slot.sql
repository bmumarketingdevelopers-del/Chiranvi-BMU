-- =====================================================================================================
-- 0005 · Addresses that come from the Profile page
-- A customer's address book starts with the two addresses typed on their Profile page: the primary one
-- ("Home", the default) and the secondary one ("Other"). Saving the Profile again updates those two rows.
-- profile_slot marks them: 'primary', 'secondary', or empty for addresses the customer added themselves.
-- Safe to run again.
-- =====================================================================================================

alter table public.addresses
  add column if not exists profile_slot text check (profile_slot is null or profile_slot in ('primary', 'secondary'));

-- At most one 'primary' and one 'secondary' row per customer
create unique index if not exists addresses_one_profile_slot_per_customer
  on public.addresses (customer_id, profile_slot)
  where profile_slot is not null;
