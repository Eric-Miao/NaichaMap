-- Mall association only needs malls near the current search cell. The bbox
-- query in the repository uses these two columns; without this index it still
-- works but scans the table.
create index if not exists malls_location_gcj02_idx
  on public.malls (location_gcj02_lng, location_gcj02_lat);
