-- Fix: Thoughts RLS policies use a raw subquery into profiles to look up
-- partner_id, which triggers RLS evaluation on profiles (same recursive
-- issue fixed for profiles/stones in 004_fix_profile_rls.sql).
--
-- Replace with the get_my_partner_id() helper that bypasses RLS.

-- Fix SELECT policy
drop policy if exists "Users can view thoughts on accessible stones" on public.thoughts;

create policy "Users can view thoughts on accessible stones"
  on public.thoughts for select
  using (
    stone_id in (
      select id from public.stones
      where user_id = auth.uid()
         or user_id = public.get_my_partner_id()
    )
  );

-- Fix INSERT policy
drop policy if exists "Users can insert thoughts on accessible stones" on public.thoughts;

create policy "Users can insert thoughts on accessible stones"
  on public.thoughts for insert
  with check (
    auth.uid() = user_id
    and stone_id in (
      select id from public.stones
      where user_id = auth.uid()
         or user_id = public.get_my_partner_id()
    )
  );
