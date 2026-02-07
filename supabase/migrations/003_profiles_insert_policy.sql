-- Allow users to insert their own profile row.
-- This is a fallback for when the handle_new_user() trigger
-- doesn't fire (e.g. auth provider edge cases). Mirrors the
-- pattern used for stones INSERT policy in 001_initial_schema.sql.
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
