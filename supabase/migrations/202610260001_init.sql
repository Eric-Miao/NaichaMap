create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

create type public.store_category as enum ('tea_drink', 'beverage', 'coffee');
create type public.store_status as enum ('active', 'pending_review', 'possibly_closed', 'hidden');
create type public.search_fetch_status as enum ('idle', 'fetching', 'succeeded', 'failed');
create type public.correction_issue_type as enum ('not_exists', 'incorrect_info', 'missing_store', 'other');
create type public.correction_status as enum ('pending', 'accepted', 'rejected');

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique check (length(canonical_name) between 1 and 120),
  aliases text[] not null default '{}',
  category public.store_category not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.malls (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (length(provider) between 1 and 40),
  provider_place_id text not null check (length(provider_place_id) between 1 and 160),
  name text not null check (length(name) between 1 and 200),
  address text not null default '',
  location_gcj02_lng double precision not null check (location_gcj02_lng between -180 and 180),
  location_gcj02_lat double precision not null check (location_gcj02_lat between -90 and 90),
  location_wgs84 extensions.geography(Point, 4326) not null,
  boundary_wgs84 extensions.geography(Polygon, 4326),
  last_seen_at timestamptz not null default now(),
  last_verified_at timestamptz,
  manual_lock boolean not null default false,
  unique (provider, provider_place_id)
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (length(provider) between 1 and 40),
  provider_place_id text not null check (length(provider_place_id) between 1 and 160),
  brand_id uuid references public.brands(id) on delete set null,
  name text not null check (length(name) between 1 and 200),
  branch_name text,
  category public.store_category not null,
  address text not null default '',
  mall_id uuid references public.malls(id) on delete set null,
  location_gcj02_lng double precision not null check (location_gcj02_lng between -180 and 180),
  location_gcj02_lat double precision not null check (location_gcj02_lat between -90 and 90),
  location_wgs84 extensions.geography(Point, 4326) not null,
  status public.store_status not null default 'active',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_verified_at timestamptz,
  manual_lock_fields text[] not null default '{}',
  unique (provider, provider_place_id),
  check (manual_lock_fields <@ array[
    'brand_id', 'name', 'branch_name', 'category', 'address', 'mall_id',
    'location_gcj02_lng', 'location_gcj02_lat', 'location_wgs84', 'status'
  ]::text[])
);

create index stores_location_wgs84_gist on public.stores using gist (location_wgs84);
create index malls_location_wgs84_gist on public.malls using gist (location_wgs84);

create table public.search_areas (
  cell_id text primary key check (length(cell_id) between 1 and 120),
  center_wgs84 extensions.geography(Point, 4326) not null,
  radius_meters integer not null default 1000 check (radius_meters between 100 and 5000),
  last_fetched_at timestamptz,
  expires_at timestamptz,
  result_count integer not null default 0 check (result_count >= 0),
  fetch_status public.search_fetch_status not null default 'idle',
  lease_token uuid,
  lease_expires_at timestamptz,
  check (
    (fetch_status = 'fetching' and lease_token is not null and lease_expires_at is not null)
    or fetch_status <> 'fetching'
  )
);

create table public.correction_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete set null,
  issue_type public.correction_issue_type not null,
  details text not null check (length(details) between 1 and 500),
  submitted_store_name text check (submitted_store_name is null or length(submitted_store_name) <= 200),
  submitted_address text check (submitted_address is null or length(submitted_address) <= 300),
  ip_hash text not null check (length(ip_hash) between 1 and 128),
  status public.correction_status not null default 'pending',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index correction_logs_ip_hash_created_at_idx
  on public.correction_logs (ip_hash, created_at desc);

create function public.protect_store_manual_fields()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if 'brand_id' = any(old.manual_lock_fields) then new.brand_id := old.brand_id; end if;
  if 'name' = any(old.manual_lock_fields) then new.name := old.name; end if;
  if 'branch_name' = any(old.manual_lock_fields) then new.branch_name := old.branch_name; end if;
  if 'category' = any(old.manual_lock_fields) then new.category := old.category; end if;
  if 'address' = any(old.manual_lock_fields) then new.address := old.address; end if;
  if 'mall_id' = any(old.manual_lock_fields) then new.mall_id := old.mall_id; end if;
  if 'location_gcj02_lng' = any(old.manual_lock_fields) then new.location_gcj02_lng := old.location_gcj02_lng; end if;
  if 'location_gcj02_lat' = any(old.manual_lock_fields) then new.location_gcj02_lat := old.location_gcj02_lat; end if;
  if 'location_wgs84' = any(old.manual_lock_fields) then new.location_wgs84 := old.location_wgs84; end if;
  if 'status' = any(old.manual_lock_fields) then new.status := old.status; end if;
  return new;
end;
$$;

create trigger protect_store_manual_fields_before_update
before update on public.stores
for each row execute function public.protect_store_manual_fields();

create function public.protect_locked_mall()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if old.manual_lock then
    new.name := old.name;
    new.address := old.address;
    new.location_gcj02_lng := old.location_gcj02_lng;
    new.location_gcj02_lat := old.location_gcj02_lat;
    new.location_wgs84 := old.location_wgs84;
    new.boundary_wgs84 := old.boundary_wgs84;
  end if;
  return new;
end;
$$;

create trigger protect_locked_mall_before_update
before update on public.malls
for each row execute function public.protect_locked_mall();

create function public.nearby_stores(
  p_lng double precision,
  p_lat double precision,
  p_radius_m integer default 1000
)
returns table (
  store_id uuid,
  provider text,
  provider_place_id text,
  name text,
  branch_name text,
  category public.store_category,
  address text,
  mall_id uuid,
  mall_name text,
  mall_address text,
  longitude double precision,
  latitude double precision,
  distance_m double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    s.id,
    s.provider,
    s.provider_place_id,
    s.name,
    s.branch_name,
    s.category,
    s.address,
    s.mall_id,
    m.name,
    m.address,
    extensions.st_x(s.location_wgs84::extensions.geometry),
    extensions.st_y(s.location_wgs84::extensions.geometry),
    extensions.st_distance(
      s.location_wgs84,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
    )
  from public.stores s
  left join public.malls m on m.id = s.mall_id
  where s.status = 'active'
    and p_lng between -180 and 180
    and p_lat between -90 and 90
    and p_radius_m between 1 and 5000
    and extensions.st_dwithin(
      s.location_wgs84,
      extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
      p_radius_m
    )
  order by 13, s.id;
$$;

create function public.claim_search_area(
  p_cell_id text,
  p_center_lng double precision,
  p_center_lat double precision,
  p_now timestamptz default now()
)
returns table (
  should_fetch boolean,
  lease_token uuid,
  has_stale_data boolean
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_area public.search_areas%rowtype;
  v_token uuid;
  v_has_stale boolean;
begin
  if p_cell_id is null or length(p_cell_id) not between 1 and 120 then
    raise exception 'invalid cell id';
  end if;
  if p_center_lng not between -180 and 180 or p_center_lat not between -90 and 90 then
    raise exception 'invalid coordinates';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_cell_id, 0));
  select * into v_area from public.search_areas where cell_id = p_cell_id for update;

  if not found then
    v_token := gen_random_uuid();
    insert into public.search_areas (
      cell_id, center_wgs84, fetch_status, lease_token, lease_expires_at
    ) values (
      p_cell_id,
      extensions.st_setsrid(extensions.st_makepoint(p_center_lng, p_center_lat), 4326)::extensions.geography,
      'fetching', v_token, p_now + interval '30 seconds'
    );
    return query select true, v_token, false;
    return;
  end if;

  v_has_stale := v_area.last_fetched_at is not null and v_area.result_count > 0;

  if v_area.fetch_status = 'succeeded' and v_area.expires_at > p_now then
    return query select false, null::uuid, v_has_stale;
    return;
  end if;

  if v_area.fetch_status = 'fetching' and v_area.lease_expires_at > p_now then
    return query select false, null::uuid, v_has_stale;
    return;
  end if;

  v_token := gen_random_uuid();
  update public.search_areas
  set center_wgs84 = extensions.st_setsrid(extensions.st_makepoint(p_center_lng, p_center_lat), 4326)::extensions.geography,
      fetch_status = 'fetching',
      lease_token = v_token,
      lease_expires_at = p_now + interval '30 seconds'
  where cell_id = p_cell_id;

  return query select true, v_token, v_has_stale;
end;
$$;

create function public.finish_search_area(
  p_cell_id text,
  p_lease_token uuid,
  p_result_count integer,
  p_success boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_updated integer;
begin
  update public.search_areas
  set result_count = case when p_success then greatest(p_result_count, 0) else result_count end,
      last_fetched_at = case when p_success then now() else last_fetched_at end,
      expires_at = case when p_success then now() + interval '30 days' else expires_at end,
      fetch_status = case when p_success then 'succeeded'::public.search_fetch_status else 'failed'::public.search_fetch_status end,
      lease_token = null,
      lease_expires_at = null
  where cell_id = p_cell_id
    and lease_token = p_lease_token
    and fetch_status = 'fetching';

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create function public.submit_correction(
  p_store_id uuid,
  p_issue_type public.correction_issue_type,
  p_details text,
  p_submitted_store_name text,
  p_submitted_address text,
  p_ip_hash text
)
returns table (
  accepted boolean,
  retry_after_seconds integer,
  correction_id uuid
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_last_created_at timestamptz;
  v_id uuid;
  v_retry integer;
begin
  if p_ip_hash is null or length(p_ip_hash) not between 1 and 128 then
    raise exception 'invalid ip hash';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_ip_hash, 1));
  select created_at into v_last_created_at
  from public.correction_logs
  where ip_hash = p_ip_hash
  order by created_at desc
  limit 1;

  if v_last_created_at > now() - interval '5 minutes' then
    v_retry := greatest(1, ceil(extract(epoch from (v_last_created_at + interval '5 minutes' - now())))::integer);
    return query select false, v_retry, null::uuid;
    return;
  end if;

  insert into public.correction_logs (
    store_id, issue_type, details, submitted_store_name, submitted_address, ip_hash
  ) values (
    p_store_id, p_issue_type, p_details, p_submitted_store_name, p_submitted_address, p_ip_hash
  ) returning id into v_id;

  return query select true, 0, v_id;
end;
$$;

alter table public.brands enable row level security;
alter table public.malls enable row level security;
alter table public.stores enable row level security;
alter table public.search_areas enable row level security;
alter table public.correction_logs enable row level security;

revoke all on table public.brands, public.malls, public.stores, public.search_areas, public.correction_logs from anon, authenticated;
grant select, insert, update, delete on table public.brands, public.malls, public.stores, public.search_areas, public.correction_logs to service_role;

revoke execute on function public.nearby_stores(double precision, double precision, integer) from public, anon, authenticated;
revoke execute on function public.claim_search_area(text, double precision, double precision, timestamptz) from public, anon, authenticated;
revoke execute on function public.finish_search_area(text, uuid, integer, boolean) from public, anon, authenticated;
revoke execute on function public.submit_correction(uuid, public.correction_issue_type, text, text, text, text) from public, anon, authenticated;

grant execute on function public.nearby_stores(double precision, double precision, integer) to service_role;
grant execute on function public.claim_search_area(text, double precision, double precision, timestamptz) to service_role;
grant execute on function public.finish_search_area(text, uuid, integer, boolean) to service_role;
grant execute on function public.submit_correction(uuid, public.correction_issue_type, text, text, text, text) to service_role;
