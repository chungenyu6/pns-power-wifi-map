-- 003: rate-limit on the visitor's real IP, not one they can make up.
-- Run once in Supabase → SQL Editor (after 002). Safe to re-run.
--
-- Before: the 6-per-10-minutes limit used the first entry of X-Forwarded-For. Proxies append to
-- that header instead of replacing it, so a visitor who sends their own X-Forwarded-For gets a
-- fresh limit on every request (tested 2026-10-14: 7 fake IPs, all 7 accepted).
-- Now: prefer CF-Connecting-IP, which Cloudflare (in front of every *.supabase.co project) sets
-- itself and overwrites if a visitor sends one. If it's ever missing, fall back to the old
-- behavior, so this can't make things worse.

create or replace function public.request_ip()
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    nullif(btrim(current_setting('request.headers', true)::json ->> 'cf-connecting-ip'), ''),
    nullif(btrim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), ''),
    'unknown'
  );
$$;

-- Which header the limit is using right now. Returns only the header's name, never an IP.
-- Lets anyone check the fix: select ... or POST /rest/v1/rpc/rate_limit_ip_source
create or replace function public.rate_limit_ip_source()
returns text
language sql
stable
set search_path = public
as $$
  select case
    when nullif(btrim(current_setting('request.headers', true)::json ->> 'cf-connecting-ip'), '') is not null then 'cf-connecting-ip'
    when nullif(btrim(current_setting('request.headers', true)::json ->> 'x-forwarded-for'), '') is not null then 'x-forwarded-for'
    else 'none'
  end;
$$;

revoke all on function public.request_ip() from public, anon, authenticated;
revoke all on function public.rate_limit_ip_source() from public;
grant execute on function public.rate_limit_ip_source() to anon, authenticated;

-- Same trigger as schema.sql, with the IP from request_ip().
create or replace function public.reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.created_at := now();
  new.ip_hash := md5(public.request_ip() || 'sip-and-charge');
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
