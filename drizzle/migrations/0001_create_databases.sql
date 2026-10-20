create table public.databases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  parent_id uuid references public.pages(id) on delete set null,
  title text not null default 'Untitled database',
  icon text not null default '🗂️',
  view text not null default 'table',
  created_at timestamptz not null default now()
);

create table public.db_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  database_id uuid not null references public.databases(id) on delete cascade,
  name text not null default 'Field',
  type text not null default 'text',
  options jsonb not null default '[]'::jsonb,
  position double precision not null default extract(epoch from now())
);

create table public.db_rows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  database_id uuid not null references public.databases(id) on delete cascade,
  position double precision not null default extract(epoch from now()),
  created_at timestamptz not null default now()
);

create table public.db_cells (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  row_id uuid not null references public.db_rows(id) on delete cascade,
  field_id uuid not null references public.db_fields(id) on delete cascade,
  value jsonb,
  unique (row_id, field_id)
);

grant select, insert, update, delete on public.databases to authenticated;
grant select, insert, update, delete on public.db_fields to authenticated;
grant select, insert, update, delete on public.db_rows to authenticated;
grant select, insert, update, delete on public.db_cells to authenticated;
grant all on public.databases to service_role;
grant all on public.db_fields to service_role;
grant all on public.db_rows to service_role;
grant all on public.db_cells to service_role;

alter table public.databases enable row level security;
alter table public.db_fields enable row level security;
alter table public.db_rows enable row level security;
alter table public.db_cells enable row level security;

create policy "own databases all" on public.databases for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own db fields all" on public.db_fields for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own db rows all" on public.db_rows for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own db cells all" on public.db_cells for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);