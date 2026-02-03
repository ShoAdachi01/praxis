-- Praxis Database Schema
-- Initial migration: profiles, stones, invites

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  display_initial text, -- Single letter (S, M, etc.)
  partner_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Stones (intentions) table
create table public.stones (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  text text not null check (char_length(text) <= 140),
  placed_at timestamptz default now()
);

-- Invites table for partner linking
create table public.invites (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  claimed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Create indexes
create index stones_user_id_idx on public.stones(user_id);
create index stones_placed_at_idx on public.stones(placed_at desc);
create index invites_code_idx on public.invites(code);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.stones enable row level security;
alter table public.invites enable row level security;

-- Profiles policies
-- Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can view their partner's profile
create policy "Users can view partner profile"
  on public.profiles for select
  using (id = (select partner_id from public.profiles where id = auth.uid()));

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Stones policies
-- Users can view their own stones
create policy "Users can view own stones"
  on public.stones for select
  using (auth.uid() = user_id);

-- Users can view partner's stones
create policy "Users can view partner stones"
  on public.stones for select
  using (user_id = (select partner_id from public.profiles where id = auth.uid()));

-- Users can insert their own stones
create policy "Users can insert own stones"
  on public.stones for insert
  with check (auth.uid() = user_id);

-- Invites policies
-- Users can create invites
create policy "Users can create invites"
  on public.invites for insert
  with check (auth.uid() = created_by);

-- Users can view their own invites
create policy "Users can view own invites"
  on public.invites for select
  using (auth.uid() = created_by);

-- Anyone can view unclaimed invites (to claim them)
create policy "Anyone can view unclaimed invites"
  on public.invites for select
  using (claimed_by is null);

-- Users can claim invites
create policy "Users can claim invites"
  on public.invites for update
  using (claimed_by is null)
  with check (auth.uid() = claimed_by);

-- Function to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_initial)
  values (
    new.id,
    new.email,
    upper(left(split_part(coalesce(new.email, ''), '@', 1), 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to link two users as partners
create or replace function public.link_partners(user_a uuid, user_b uuid)
returns void as $$
begin
  update public.profiles set partner_id = user_b where id = user_a;
  update public.profiles set partner_id = user_a where id = user_b;
end;
$$ language plpgsql security definer;

-- Enable realtime for stones table
alter publication supabase_realtime add table public.stones;
