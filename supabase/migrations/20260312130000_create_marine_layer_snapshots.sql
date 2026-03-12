create table if not exists public.marine_layer_snapshots (
  id bigserial primary key,
  station_id text not null,
  "timestamp" timestamptz not null,
  bbox jsonb not null default '{}'::jsonb,
  temperature_points jsonb not null default '[]'::jsonb,
  salinity_points jsonb not null default '[]'::jsonb,
  wave_points jsonb not null default '[]'::jsonb,
  current_vectors jsonb not null default '[]'::jsonb,
  source text not null default 'Copernicus Marine',
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint marine_layer_snapshots_station_time_unique unique (station_id, "timestamp")
);

create index if not exists idx_marine_layer_snapshots_station_timestamp_desc
  on public.marine_layer_snapshots (station_id, "timestamp" desc);

alter table public.marine_layer_snapshots enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marine_layer_snapshots'
      and policyname = 'marine_layer_snapshots_select_public'
  ) then
    create policy marine_layer_snapshots_select_public
      on public.marine_layer_snapshots
      for select
      to anon, authenticated
      using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'marine_layer_snapshots'
      and policyname = 'marine_layer_snapshots_service_role_all'
  ) then
    create policy marine_layer_snapshots_service_role_all
      on public.marine_layer_snapshots
      for all
      to service_role
      using (true)
      with check (true);
  end if;
end
$$;
