-- Fix: users_update_own caused "42P17 infinite recursion detected in policy for
-- relation users".
--
-- The original WITH CHECK pinned is_admin / is_paid by sub-selecting their
-- stored values out of public.users. That sub-select is itself subject to the
-- policies on public.users, so evaluating the policy re-entered the policy.
-- Every UPDATE failed — including the legitimate notify_email toggle, not just
-- the privilege escalation it was meant to stop.
--
-- Column privileges are the right owner for "which columns may be written":
-- they are checked before RLS, cannot recurse, and make escalation impossible
-- rather than merely rejected. With them in place the policy only has to answer
-- "is this your row".

drop policy users_update_own on public.users;

-- Supabase grants these table-wide by default. A user has no business
-- inserting or deleting profile rows at all: on_auth_user_created inserts
-- (SECURITY DEFINER, so it is unaffected), and deletion cascades from
-- auth.users.
revoke insert, update, delete on public.users from authenticated, anon;

-- The single column a user owns.
grant update (notify_email) on public.users to authenticated;

create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
