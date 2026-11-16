create table public.pin_attempts (id bigint generated always as identity primary key, at timestamptz not null default now());
alter table public.pin_attempts enable row level security;
-- keine Policies: nur die Function (Service-Role) liest und schreibt
create index pin_attempts_at on public.pin_attempts (at);
