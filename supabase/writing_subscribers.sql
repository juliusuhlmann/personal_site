create table if not exists writing_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table writing_subscribers enable row level security;
