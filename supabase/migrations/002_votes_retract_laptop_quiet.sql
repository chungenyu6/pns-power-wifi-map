-- 002: let people take back a vote, and add "good for working?" / "quiet enough?" votes.
-- Run once in Supabase → SQL Editor (after schema.sql). Safe to re-run.

alter table public.reports add column if not exists client_token uuid;
alter table public.reports add column if not exists laptop_ok boolean;
alter table public.reports add column if not exists quiet boolean;

-- A report must still say something.
alter table public.reports drop constraint if exists report_has_content;
alter table public.reports add constraint report_has_content check (
  is_open is not null or wifi_works is not null or outlets is not null
  or laptop_ok is not null or quiet is not null
  or wifi_password is not null or comment is not null
);

grant insert (client_token, laptop_ok, quiet) on public.reports to anon, authenticated;
grant select (laptop_ok, quiet) on public.reports to anon, authenticated;
-- client_token is never readable: it's the secret that proves "this vote is mine".

-- Delete my own vote (not tips/passwords) within a day, using the token my browser kept.
create or replace function public.retract_vote(p_id bigint, p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from public.reports
  where id = p_id
    and client_token = p_token
    and comment is null
    and wifi_password is null
    and created_at > now() - interval '1 day';
  get diagnostics n = row_count;
  return n > 0;
end;
$$;

revoke all on function public.retract_vote(bigint, uuid) from public;
grant execute on function public.retract_vote(bigint, uuid) to anon, authenticated;
