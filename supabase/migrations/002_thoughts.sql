-- Thoughts table for reflections on stones
create table public.thoughts (
  id uuid default gen_random_uuid() primary key,
  stone_id uuid references public.stones(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  text text not null check (char_length(text) <= 280),
  created_at timestamptz default now()
);

-- Indexes
create index thoughts_stone_id_idx on public.thoughts(stone_id);
create index thoughts_created_at_idx on public.thoughts(created_at desc);

-- Enable RLS
alter table public.thoughts enable row level security;

-- RLS Policies: Can view thoughts on own stones and partner's stones
create policy "Users can view thoughts on accessible stones"
  on public.thoughts for select
  using (
    stone_id in (
      select id from public.stones
      where user_id = auth.uid()
         or user_id = (select partner_id from public.profiles where id = auth.uid())
    )
  );

-- Can insert thoughts on accessible stones
create policy "Users can insert thoughts on accessible stones"
  on public.thoughts for insert
  with check (
    auth.uid() = user_id
    and stone_id in (
      select id from public.stones
      where user_id = auth.uid()
         or user_id = (select partner_id from public.profiles where id = auth.uid())
    )
  );

-- Enable realtime
alter publication supabase_realtime add table public.thoughts;
