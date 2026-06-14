# Strava edge function

Auto-verifies the Morning Run. When you finish a run on Strava, Strava pings
this function; it fetches the activity, writes a `verified: true, source:
'strava'` row into `runs`, and ticks off the **Morning Run** on that day's
checklist. The Sprint-3 sync engine then brings both down to the app — **no
client changes required**.

## Files
- `index.ts` — Deno handler: webhook validation, OAuth callback, activity events.
- `../_shared/strava.ts` — pure activity → run mapping (unit-tested under Node).

## One-time setup
1. **Create a Strava API application** (https://www.strava.com/settings/api).
   Set the *Authorization Callback Domain* to your functions host
   (`ipjawnhcrmkoywycufam.functions.supabase.co`). Note the Client ID + Secret.
2. **Run the migration** `0003_strava.sql` (after `0001`/`0002`).
3. **Deploy + secrets:**
   ```bash
   supabase functions deploy strava --project-ref ipjawnhcrmkoywycufam
   supabase secrets set STRAVA_CLIENT_ID="123456" STRAVA_CLIENT_SECRET="xxxx" \
     STRAVA_VERIFY_TOKEN="<any-random-string>"
   ```
   `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.

## Connect your Strava account (gets the tokens)
Open this URL in a browser (logged into Strava), with `state` = your Supabase
auth user id:
```
https://www.strava.com/oauth/authorize?client_id=<ID>&response_type=code&scope=activity:read_all&approval_prompt=auto&state=<YOUR_USER_UUID>&redirect_uri=https://ipjawnhcrmkoywycufam.functions.supabase.co/functions/v1/strava
```
Approve → you land back on the function → "Strava connected ✅". Tokens are now
stored and auto-refreshed.

## Subscribe the webhook (one time)
```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=<ID> -F client_secret=<SECRET> \
  -F callback_url=https://ipjawnhcrmkoywycufam.functions.supabase.co/functions/v1/strava \
  -F verify_token=<STRAVA_VERIFY_TOKEN>
```
Strava immediately GETs the callback with a challenge; the function echoes it and
the subscription activates. After that, every new activity is POSTed here.

## Mapping (see `_shared/strava.ts`)
- `distance` m → `miles` (÷ 1609.344, 2 dp) · `moving_time` s → `minutes` (÷ 60, 1 dp)
- `start_date_local` → `date` (`YYYY-MM-DD`) · `name` → note · `gear.name` → shoe
- `workout_type` → Race/Workout/Long, else Easy (or Long if ≥ 10 mi)
- Run id = `st_<activityId base36>` → idempotent; re-deliveries never duplicate
- Non-run sports (Ride, Swim, …) are ignored

## Notes / limits
- **Webhook events are unauthenticated** (Strava signs nothing). We mitigate by
  only acting on a known `owner_id` and by idempotent upserts.
- Tokens are **service-role only** — never exposed to the client.
- A *manually-entered* run isn't overwritten by Strava unless it happens to share
  the derived id (it won't — manual ids are uuid/base-36, Strava ids are `st_…`).
