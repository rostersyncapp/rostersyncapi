-- Supabase DB Webhook Migration: reference_rosters auto-sync trigger

-- 1. Create the trigger function
create or replace function public.on_roster_changed()
returns trigger
security definer
language plpgsql
as $$
declare
  payload jsonb;
  webhook_url text;
  webhook_secret text;
  signature text;
begin
  -- Configurable webhook target and shared secret key
  webhook_url := coalesce(
    (select decrypted_secret from vault.decrypted_secrets where name = 'ROSTER_WEBHOOK_URL' limit 1),
    'https://rostersync-worker.rymacmini.workers.dev/v1/webhooks/roster-change'
  );
  webhook_secret := coalesce(
    (select decrypted_secret from vault.decrypted_secrets where name = 'ROSTER_WEBHOOK_SECRET' limit 1),
    'my-webhook-secret-key'
  );

  -- Construct payload structure mimicking Supabase DB webhooks
  payload := jsonb_build_object(
    'type', tg_op,
    'table', tg_table_name,
    'schema', tg_table_schema,
    'record', case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    'old_record', case when tg_op = 'INSERT' then null else to_jsonb(old) end
  );

  -- Generate HMAC-SHA256 signature of the payload using the secret key
  signature := extensions.hmac(payload::text, webhook_secret, 'sha256');

  -- Asynchronously post to Cloudflare Worker via pg_net
  perform net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Supabase-Signature', signature
    ),
    body := payload
  );

  return new;
end;
$$;

-- 2. Bind the trigger to the reference_rosters table
drop trigger if exists tr_on_roster_changed on public.reference_rosters;
create trigger tr_on_roster_changed
after insert or update on public.reference_rosters
for each row
execute function public.on_roster_changed();
