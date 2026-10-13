-- 850 Sip & Charge Map: community reports.
-- Run once in the Supabase dashboard → SQL Editor. Safe to re-run.
--
-- Rules:
--   * Anyone can submit a report (no account).
--   * Quick taps only (open / Wi-Fi works / outlets) are public right away.
--   * Reports with a comment or a Wi-Fi password stay hidden until approved
--     (Table Editor → reports → set status to 'approved').
--   * Visitors can never read pending/rejected rows, edit, or delete anything.

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  shop_slug text not null check (shop_slug ~ '^[a-z0-9-]{1,80}$'),
  is_open boolean,
  wifi_works boolean,
  outlets text check (outlets in ('plenty', 'some', 'none')),
  wifi_password text check (char_length(wifi_password) between 1 and 64),
  comment text check (char_length(comment) between 1 and 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  ip_hash text,
  constraint report_has_content check (
    is_open is not null or wifi_works is not null or outlets is not null
    or wifi_password is not null or comment is not null
  )
);

create index if not exists reports_shop_recent on public.reports (shop_slug, created_at desc);
create index if not exists reports_status_recent on public.reports (status, created_at desc);

-- Server decides status, timestamp and rate limits; whatever the browser sends for these is ignored.
create or replace function public.reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ip text := coalesce(
    split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1),
    'unknown'
  );
begin
  new.created_at := now();
  new.ip_hash := md5(ip || 'sip-and-charge');
  new.comment := nullif(btrim(new.comment), '');
  new.wifi_password := nullif(btrim(new.wifi_password), '');
  new.status := case when new.comment is null and new.wifi_password is null then 'approved' else 'pending' end;

  if (select count(*) from public.reports
      where ip_hash = new.ip_hash and created_at > now() - interval '10 minutes') >= 6 then
    raise exception 'Too many reports. Try again in a few minutes.';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_before_insert on public.reports;
create trigger reports_before_insert
  before insert on public.reports
  for each row execute function public.reports_before_insert();

alter table public.reports enable row level security;

drop policy if exists "anyone can submit" on public.reports;
create policy "anyone can submit" on public.reports
  for insert to anon, authenticated
  with check (true);

drop policy if exists "approved reports are public" on public.reports;
create policy "approved reports are public" on public.reports
  for select to anon, authenticated
  using (status = 'approved');

-- Explicit grants (Supabase stopped exposing new tables to the API by default in Oct 2026).
-- Column-level: visitors can't set status/ip_hash, and can't read ip_hash.
revoke all on public.reports from anon, authenticated;
grant insert (shop_slug, is_open, wifi_works, outlets, wifi_password, comment) on public.reports to anon, authenticated;
grant select (id, created_at, shop_slug, is_open, wifi_works, outlets, wifi_password, comment) on public.reports to anon, authenticated;
