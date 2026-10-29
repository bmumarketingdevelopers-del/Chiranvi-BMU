-- =====================================================================================================
-- 0003 · Starting team (the Chiranvi Panel's people today)
--   Owner: Praveen, the real Chiranvi owner. While the SDE team builds and tests, the owner row uses
--          Hariprasath's test number 8754852810; at handover we change it to Praveen's own number
--          (update public.staff_members set mobile_number = '…' where role_id = 'owner').
--   Admins: the SDE team, for testing. Praveen removes them after handover and adds his real managers.
-- "on conflict do nothing": running this again never changes people already there.
-- =====================================================================================================

insert into public.staff_members (mobile_number, name, role_id, title) values
  ('8754852810', 'Praveen', 'owner', 'Owner'),
  ('9442687998', 'Hariprasath', 'admin', 'SDE (testing)'),
  ('6363032102', 'Vinoth', 'admin', 'Lead (testing)'),
  ('9008129581', 'Tushara', 'admin', 'SDE (testing)'),
  ('9945686287', 'Harisha', 'admin', 'SDE (testing)'),
  ('9345709139', 'Dhanush', 'admin', 'SDE (testing)')
on conflict (mobile_number) do nothing;
