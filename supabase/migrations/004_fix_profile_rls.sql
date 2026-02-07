-- Fix: RLS recursive subquery on profiles table
--
-- The "Users can view partner profile" policy contains:
--   using (id = (select partner_id from public.profiles where id = auth.uid()))
--
-- This subquery on profiles triggers the same RLS policies, creating a
-- recursive/circular evaluation that causes the query to hang indefinitely.
--
-- Fix: use a SECURITY DEFINER function to look up partner_id, bypassing RLS
-- for the inner lookup.

-- Helper function to get the current user's partner_id without going through RLS
create or replace function public.get_my_partner_id()
returns uuid as $$
  select partner_id from public.profiles where id = auth.uid();
$$ language sql security definer stable;

-- Drop the recursive policy
drop policy if exists "Users can view partner profile" on public.profiles;

-- Recreate using the helper function (no more recursion)
create policy "Users can view partner profile"
  on public.profiles for select
  using (id = public.get_my_partner_id());

-- Also fix the partner stones policy to use the same helper for consistency
-- (this one wasn't recursive since it queries profiles from stones,
--  but using the helper is cleaner and avoids nested RLS evaluation)
drop policy if exists "Users can view partner stones" on public.stones;

create policy "Users can view partner stones"
  on public.stones for select
  using (user_id = public.get_my_partner_id());
