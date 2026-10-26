begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_extension('postgis', 'PostGIS is enabled');
select has_table('public', 'brands', 'brands exists');
select has_table('public', 'malls', 'malls exists');
select has_table('public', 'stores', 'stores exists');
select has_table('public', 'search_areas', 'search_areas exists');
select has_table('public', 'correction_logs', 'correction_logs exists');

select has_type('public', 'store_category', 'store category enum exists');
select has_type('public', 'store_status', 'store status enum exists');
select has_type('public', 'correction_issue_type', 'correction issue enum exists');
select has_type('public', 'correction_status', 'correction status enum exists');
select has_type('public', 'search_fetch_status', 'search status enum exists');

select is(
  (select array_agg(enumlabel::text order by enumsortorder) from pg_enum join pg_type on pg_type.oid = enumtypid where typname = 'store_category'),
  array['tea_drink', 'beverage', 'coffee']::text[],
  'store categories are constrained'
);
select is(
  (select array_agg(enumlabel::text order by enumsortorder) from pg_enum join pg_type on pg_type.oid = enumtypid where typname = 'store_status'),
  array['active', 'pending_review', 'possibly_closed', 'hidden']::text[],
  'store statuses are constrained'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'stores'
      and indexdef ilike '%using gist (location_wgs84)%'
  ),
  'stores location has a GiST index'
);
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.stores'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) ilike '%provider, provider_place_id%'
  ),
  'store provider identity is unique'
);
select has_index('public', 'stores', 'stores_brand_id_idx', 'store brand foreign key is indexed');
select has_index('public', 'stores', 'stores_mall_id_idx', 'store mall foreign key is indexed');
select has_index('public', 'correction_logs', 'correction_logs_store_id_idx', 'correction store foreign key is indexed');

select ok(not has_table_privilege('anon', 'public.brands', 'select'), 'anon cannot read brands');
select ok(not has_table_privilege('anon', 'public.malls', 'select'), 'anon cannot read malls');
select ok(not has_table_privilege('anon', 'public.stores', 'select'), 'anon cannot read stores');
select ok(not has_table_privilege('anon', 'public.search_areas', 'select'), 'anon cannot read search areas');
select ok(not has_table_privilege('anon', 'public.correction_logs', 'insert'), 'anon cannot insert corrections directly');
select ok(not has_table_privilege('authenticated', 'public.stores', 'update'), 'authenticated cannot mutate stores');

select ok(to_regprocedure('public.nearby_stores(double precision,double precision,integer)') is not null, 'nearby_stores exists');
select ok(to_regprocedure('public.claim_search_area(text,double precision,double precision,timestamp with time zone)') is not null, 'claim_search_area exists');
select ok(to_regprocedure('public.finish_search_area(text,uuid,integer,boolean)') is not null, 'finish_search_area exists');
select ok(to_regprocedure('public.submit_correction(uuid,correction_issue_type,text,text,text,text)') is not null, 'submit_correction exists');

select ok(
  not has_function_privilege('anon', 'public.nearby_stores(double precision,double precision,integer)', 'execute'),
  'anon cannot execute nearby search'
);
select ok(
  not has_function_privilege('authenticated', 'public.nearby_stores(double precision,double precision,integer)', 'execute'),
  'authenticated cannot execute nearby search'
);

insert into public.stores (
  provider, provider_place_id, name, category, address,
  location_gcj02_lng, location_gcj02_lat, location_wgs84, manual_lock_fields
) values (
  'test', 'locked-store', '人工店名', 'tea_drink', '原地址',
  121.47, 31.23, extensions.st_setsrid(extensions.st_makepoint(121.47, 31.23), 4326)::extensions.geography,
  array['name', 'address']
);

update public.stores
set name = '接口店名', address = '接口地址', last_seen_at = now()
where provider = 'test' and provider_place_id = 'locked-store';

select is(
  (select name from public.stores where provider = 'test' and provider_place_id = 'locked-store'),
  '人工店名',
  'manual lock preserves the store name'
);
select is(
  (select address from public.stores where provider = 'test' and provider_place_id = 'locked-store'),
  '原地址',
  'manual lock preserves the address'
);

select is(
  (select count(*) from (
    select * from public.claim_search_area('test-cell', 121.47, 31.23, '2026-10-26 00:00:00+00')
    union all
    select * from public.claim_search_area('test-cell', 121.47, 31.23, '2026-10-26 00:00:01+00')
  ) claims where should_fetch),
  1::bigint,
  'only one immediate claim receives the fetch lease'
);

select ok(
  (select should_fetch from public.claim_search_area('test-cell', 121.47, 31.23, '2026-10-26 00:00:31+00')),
  'an expired lease can be reclaimed'
);

select ok(
  (select accepted from public.submit_correction(null, 'other', '第一次', null, null, 'same-hash')),
  'first correction is accepted'
);
select ok(
  not (select accepted from public.submit_correction(null, 'other', '第二次', null, null, 'same-hash')),
  'second correction inside five minutes is rejected'
);
select is(
  (select count(*) from public.correction_logs where ip_hash = 'same-hash'),
  1::bigint,
  'rate limiting inserts only one correction row'
);

select * from finish();
rollback;
