-- Ananas.rs Price Tracker — initial schema
-- Tables: users (mirrors auth.users), tracked_products, price_history
-- Security model: RLS everywhere; is_admin bypasses every policy and every limit.

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------

create table public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text        not null,
  is_admin     boolean     not null default false,
  is_paid      boolean     not null default false,
  notify_email boolean     not null default true,
  created_at   timestamptz not null default now()
);

comment on column public.users.is_admin is
  'Bypasses RLS and the free-plan tracking limit. Set manually via the SQL editor.';
comment on column public.users.is_paid is
  'Single entitlement flag. A payment provider (Paddle / Lemon Squeezy) webhook
   flips this later; provider-specific ids belong in a future subscriptions
   table, so wiring a processor never has to alter this one.';

-- Every auth.users row gets a public.users row. SECURITY DEFINER so the insert
-- happens with owner rights and needs no INSERT policy for end users.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- tracked_products
-- ---------------------------------------------------------------------------

create table public.tracked_products (
  id            bigint generated always as identity primary key,
  user_id       uuid        not null references public.users (id) on delete cascade,
  product_name  text        not null,
  ananas_url    text        not null,
  current_price numeric(12, 2),
  target_price  numeric(12, 2),
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  -- tracking the same product twice is never intentional
  unique (user_id, ananas_url)
);

create index tracked_products_user_id_idx on public.tracked_products (user_id);
-- the scraper's only query: every active row, oldest-touched first
create index tracked_products_active_idx on public.tracked_products (is_active)
  where is_active;

-- ---------------------------------------------------------------------------
-- price_history
-- ---------------------------------------------------------------------------

create table public.price_history (
  id                  bigint generated always as identity primary key,
  tracked_product_id  bigint      not null references public.tracked_products (id) on delete cascade,
  price               numeric(12, 2) not null,
  scraped_at          timestamptz not null default now()
);

-- serves both the sparkline (newest N) and "what was the previous price"
create index price_history_product_time_idx
  on public.price_history (tracked_product_id, scraped_at desc);

-- ---------------------------------------------------------------------------
-- Entitlement helpers
--
-- Both are SECURITY DEFINER and read public.users directly. That is deliberate:
-- calling them from a policy ON public.users would otherwise recurse through
-- that same policy.
-- ---------------------------------------------------------------------------

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.is_admin from public.users u where u.id = auth.uid()), false);
$$;

create function public.free_plan_limit()
returns integer
language sql
immutable
as $$
  select 3;
$$;

comment on function public.free_plan_limit is
  'How many products a user on the free plan may track. Single source of truth —
   the DB trigger and the web app both read it.';

-- The tracking limit is an invariant of the data, not of the UI, so the table
-- owns it. The web app checks it first only to produce a friendlier message.
create function public.enforce_tracking_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner   public.users%rowtype;
  tracked integer;
begin
  select * into owner from public.users where id = new.user_id;

  if owner.is_admin or owner.is_paid then
    return new;
  end if;

  select count(*) into tracked
  from public.tracked_products
  where user_id = new.user_id and is_active;

  if tracked >= public.free_plan_limit() then
    raise exception 'free_plan_limit_reached'
      using hint = 'Besplatan nalog moze da prati najvise '
                   || public.free_plan_limit() || ' proizvoda.';
  end if;

  return new;
end;
$$;

create trigger tracked_products_enforce_limit
  before insert on public.tracked_products
  for each row execute function public.enforce_tracking_limit();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.users            enable row level security;
alter table public.tracked_products enable row level security;
alter table public.price_history    enable row level security;

-- users --------------------------------------------------------------------

create policy users_select_own on public.users
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- A user may edit their notification preference. is_admin and is_paid are
-- privilege columns: the WITH CHECK below pins them to their stored values, so
-- a user cannot promote themselves by updating their own row.
create policy users_update_own on public.users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and is_admin = (select u.is_admin from public.users u where u.id = (select auth.uid()))
    and is_paid  = (select u.is_paid  from public.users u where u.id = (select auth.uid()))
  );

-- tracked_products ----------------------------------------------------------

create policy tracked_products_select on public.tracked_products
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy tracked_products_insert on public.tracked_products
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy tracked_products_update on public.tracked_products
  for update to authenticated
  using (user_id = (select auth.uid()) or public.is_admin())
  with check (user_id = (select auth.uid()) or public.is_admin());

create policy tracked_products_delete on public.tracked_products
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

-- price_history -------------------------------------------------------------
-- Read-only for end users. Only the scraper (service_role, which bypasses RLS)
-- ever writes here.

create policy price_history_select on public.price_history
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.tracked_products tp
      where tp.id = tracked_product_id
        and tp.user_id = (select auth.uid())
    )
  );
