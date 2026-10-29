-- =====================================================================================================
-- 0004 · Roles: Owner, Manager, Delivery agent (no Admin role)
-- Decided 2026-10-29: only the owner (Praveen) has full, admin-level control. The team members who were
-- Admins (the SDEs and the lead, for testing) become Managers, and the Admin role is removed.
-- Order matters: people are moved off the Admin role first, because a staff member's role must exist.
-- Safe to run again (both steps simply find nothing the second time).
-- =====================================================================================================

-- 1. Everyone with the Admin role becomes a Manager (their name, number and title stay the same)
update public.staff_members
set role_id = 'manager'
where role_id = 'admin';

-- 2. Remove the Admin role. (From the panel, built-in roles can't be deleted; this file runs with the
--    database owner's rights, so it can.)
delete from public.panel_roles
where id = 'admin';
