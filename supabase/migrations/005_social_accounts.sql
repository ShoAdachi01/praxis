-- Social accounts: stores OAuth tokens for connected platforms (X/Twitter, etc.)
-- Tokens are hidden from the client via the my_social_connections view.

create table public.social_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  provider text not null,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  auto_publish boolean default false not null,
  provider_user_id text,
  provider_username text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

create index social_accounts_user_id_idx on public.social_accounts(user_id);
alter table public.social_accounts enable row level security;

-- Users can read their own rows (view hides sensitive columns)
create policy "Users can view own social accounts"
  on public.social_accounts for select
  using (auth.uid() = user_id);

-- Users can toggle auto_publish on their own rows
create policy "Users can update own social accounts"
  on public.social_accounts for update
  using (auth.uid() = user_id);

-- No INSERT/DELETE from client — Edge Functions use service_role

-- Safe view: hides access_token and refresh_token from client
create view public.my_social_connections as
select id, user_id, provider, auto_publish, provider_username, created_at, updated_at
from public.social_accounts
where user_id = auth.uid();

-- Auto-update updated_at
create or replace function public.update_social_accounts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger social_accounts_updated_at
  before update on public.social_accounts
  for each row execute procedure public.update_social_accounts_updated_at();
