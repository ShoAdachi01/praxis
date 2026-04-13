-- Claiming an invite currently happens in multiple client-side steps:
-- 1. read invite
-- 2. link partners via RPC
-- 3. update invites.claimed_by from the client
--
-- Step 3 can fail under RLS even after the partner link succeeds, leaving the
-- system in a partially-linked state. Make the claim operation atomic and run
-- it server-side instead.

create or replace function public.claim_invite(invite_code text)
returns public.invites
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  invite_row public.invites%rowtype;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  select *
  into invite_row
  from public.invites
  where code = upper(trim(invite_code))
    and claimed_by is null
  for update;

  if not found then
    raise exception 'invalid or already used invite';
  end if;

  if invite_row.created_by = current_user_id then
    raise exception 'cannot use your own invite';
  end if;

  perform public.link_partners(current_user_id, invite_row.created_by);

  update public.invites
  set claimed_by = current_user_id
  where id = invite_row.id
  returning *
  into invite_row;

  return invite_row;
end;
$$;
