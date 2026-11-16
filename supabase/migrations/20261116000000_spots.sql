create table public.spots (
  id text primary key,
  map text not null,
  side text not null check (side in ('t','ct')),
  type text not null check (type in ('smoke','molly')),
  name text not null check (length(trim(name)) > 0),
  label text check (label is null or length(label) <= 14),
  x real not null check (x between 0 and 100),
  y real not null check (y between 0 and 100),
  stand_path text,
  aim_path text,
  text text,
  video_id text,
  start_s int,
  end_s int,
  updated_at timestamptz not null default now()
);
alter table public.spots enable row level security;
create policy "spots lesen" on public.spots for select using (true);
insert into storage.buckets (id, name, public) values ('lineups', 'lineups', true);
