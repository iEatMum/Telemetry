# Referee edge function

Server-side accountability for LOCKED IN. Apple Shortcuts POST telemetry here;
the function adjudicates it against your targets, logs an **unalterable**
`checkpoints` row (service-role only), and texts your accountability partners on
a late/missed verdict.

## Files
- `index.ts` — the Deno HTTP handler (auth, I/O, Twilio).
- `../_shared/adjudicate.ts` — the pure verdict logic (unit-tested under Node).

## Deploy
```bash
# from the repo root, with the Supabase CLI installed + logged in:
supabase functions deploy referee --project-ref ipjawnhcrmkoywycufam

# required secret (pick a long random string; the Shortcut sends the same value):
supabase secrets set SHORTCUTS_WEBHOOK_SECRET="<long-random-string>"

# optional — turns the SMS stub into real texts:
supabase secrets set TWILIO_ACCOUNT_SID="ACxxxx" TWILIO_AUTH_TOKEN="xxxx" TWILIO_FROM="+1XXXXXXXXXX"
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — do
**not** set them yourself, and never ship the service-role key to the client.

Run `0002_checkpoints.sql` (and `0001_phase3_sync.sql`) in the SQL editor first.

## Apple Shortcut payload
`POST https://ipjawnhcrmkoywycufam.supabase.co/functions/v1/referee`

Headers: `x-webhook-secret: <the same secret>`, `Content-Type: application/json`

Body:
```json
{
  "kind": "wake",
  "userId": "<your auth user id (uuid)>",
  "localTime": "06:51",
  "at": "2026-06-14T06:51:00-07:00"
}
```
- `kind`: `wake` (vs `settings.wakeTime`) or `bedtime` (vs `settings.bedTime`).
- `localTime` (`"HH:MM"`) is preferred — it sidesteps timezone guessing. If you
  only send `at` (ISO), the function reads it as UTC.
- `userId` is your Supabase auth user id. Single-tenant: anyone with the secret
  can write for any `userId`, which is fine for one user.

## Verdicts
Deadline semantics — on time/early = `hit`, ≤15 min late = `late`, beyond = `missed`.
`bedtime` handles after-midnight times (00:30 counts as *that* night, not early).

## Smoke test
```bash
curl -i -X POST "https://ipjawnhcrmkoywycufam.supabase.co/functions/v1/referee" \
  -H "x-webhook-secret: <secret>" -H "Content-Type: application/json" \
  -d '{"kind":"wake","userId":"<uuid>","localTime":"07:20"}'
# -> {"ok":true,"kind":"wake","verdict":"missed","target":"06:45","actual":"07:20","notified":true}
```

## Not yet (flagged for a later sprint)
- **Omission detection.** A webhook only fires when you *do* the action, so a
  late tap → `late/missed`, but *never tapping at all* is invisible here. That
  needs a scheduled function (pg_cron / Supabase cron) that sweeps for a missing
  checkpoint after the deadline. Out of scope for Sprint 4.
- `events` raw-telemetry table (the blueprint lists one); raw payload currently
  lands in `checkpoints.detail`.
