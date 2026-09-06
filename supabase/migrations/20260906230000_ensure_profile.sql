-- Repair path for a missing profile row.
--
-- on_auth_user_created creates public.users when an account is created, and
-- deleting from auth.users cascades the profile away. But the reverse is not
-- true: deleting only the public.users row (easy to do by hand in the table
-- editor) leaves an auth account with no profile.
--
-- That state is quietly broken. getCurrentUser() finds nothing, requireUser()
-- bounces to /login, and the user cannot get past it — while signing up again
-- does nothing either, because the auth account still exists and Supabase
-- deliberately stays silent about already-registered addresses.
--
-- So the invariant gets a second enforcement point: the trigger creates the
-- profile, and this recreates it on read if it ever goes missing.

create function public.ensure_profile()
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile    public.users%rowtype;
  auth_email text;
begin
  select * into profile from public.users where id = auth.uid();
  if found then
    return profile;
  end if;

  -- SECURITY DEFINER is what lets this read auth.users and write a row the
  -- caller has no INSERT privilege for (revoked in 20260906180000).
  select u.email into auth_email from auth.users u where u.id = auth.uid();
  if auth_email is null then
    return null;   -- no session, or the account is gone: nothing to repair
  end if;

  insert into public.users (id, email)
  values (auth.uid(), auth_email)
  on conflict (id) do nothing;

  select * into profile from public.users where id = auth.uid();
  return profile;
end;
$$;

revoke execute on function public.ensure_profile() from public, anon;
grant execute on function public.ensure_profile() to authenticated;
