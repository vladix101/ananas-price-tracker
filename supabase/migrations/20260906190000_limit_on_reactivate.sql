-- "Stop tracking" flips is_active to false rather than deleting, so price
-- history survives. That opens a hole in the free-plan limit: the row already
-- exists, so tracking the product again is an UPDATE, and a BEFORE INSERT
-- trigger never sees it. A user at the limit with one paused product could
-- reactivate it and end up with four.
--
-- The limit is "how many products are active", so the guard has to run wherever
-- a row can *become* active — insert or update.

create or replace function public.enforce_tracking_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner   public.users%rowtype;
  tracked integer;
begin
  -- Paused rows do not count against anything.
  if not new.is_active then
    return new;
  end if;

  -- An update that leaves an already-active row active changes nothing about
  -- the count (renames, price refreshes, target_price edits all land here).
  if tg_op = 'UPDATE' and old.is_active then
    return new;
  end if;

  select * into owner from public.users where id = new.user_id;

  if owner.is_admin or owner.is_paid then
    return new;
  end if;

  select count(*) into tracked
  from public.tracked_products
  where user_id = new.user_id
    and is_active
    and id <> new.id;   -- never count the row being written

  if tracked >= public.free_plan_limit() then
    -- The app turns this code into a message; it calls free_plan_limit()
    -- itself for the number, so the copy lives in one place and this text
    -- stays a developer-facing detail.
    raise exception 'free_plan_limit_reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger tracked_products_enforce_limit on public.tracked_products;

create trigger tracked_products_enforce_limit
  before insert or update of is_active, user_id on public.tracked_products
  for each row execute function public.enforce_tracking_limit();
