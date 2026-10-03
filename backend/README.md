# Booking backend

The site is a static multi-page build and stays that way. The only server-side
piece is appointment storage + clinic notification, and the site works without
it — with `mode: "none"` the calendar still hands the selection to WhatsApp,
exactly as it did before this backend existed.

**This project gets its own Supabase project.** Do not reuse any other client's
project, keys, or database.

## What it gives you

| With `mode: "none"` | With `mode: "supabase"` |
| --- | --- |
| Selection opens WhatsApp | Request is stored first, then opens WhatsApp |
| Nothing recorded | Name, phone, treatment, notes, language recorded |
| Every slot always selectable | Slots already held are greyed out |
| No notification | Clinic gets an email per request |
| Nothing to set up | Steps below (~20 minutes) |

## Setup

### 1. Create the project
1. <https://supabase.com/dashboard> → **New project**. Name it `dr-husseini-dental`.
2. Pick the region closest to Lebanon (`eu-central-1`, Frankfurt).
3. Save the database password somewhere safe — it is not needed by the website.

### 2. Create the schema
Open **SQL Editor** → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
It is safe to run more than once.

This creates:
- `appointment_requests` — the requests, with row-level security on.
- `booked_slots` — a view exposing **only** `slot_date` and `slot_time`, so the
  public calendar can grey out taken slots without exposing any patient data.
- A unique index on `(slot_date, slot_time)` for `pending`/`confirmed` rows, so
  two people cannot hold the same slot. Setting a row to `declined` or
  `cancelled` frees that slot again.

### 3. Point the site at it
**Settings → API**, copy the Project URL and the **`anon` / `public`** key —
*not* `service_role`, which must never appear in the browser.

Edit `assets/js/booking-config.js`:

```js
window.DH_BOOKING = {
  mode: "supabase",
  supabaseUrl: "https://xxxxxxxxxxxx.supabase.co",
  supabaseAnonKey: "eyJhbGciOi...",
  table: "appointment_requests",
  slotsView: "booked_slots",
  slotMinutes: 30
};
```

The anon key is public by design and safe to ship **only because** the RLS
policies from step 2 are in place: anon can insert a `pending` request for a date
within the next 180 days and can read nothing else. Never set `mode: "supabase"`
without having run `schema.sql`.

### 4. Clinic notification email (optional but recommended)
1. Sign up at <https://resend.com>, verify the clinic's sending domain, create an
   API key.
2. Replace `SITE-DOMAIN-TBD` in
   `supabase/functions/notify-booking/index.ts` with the verified domain.
3. Deploy and set secrets:
   ```sh
   supabase link --project-ref <your-project-ref>
   supabase functions deploy notify-booking
   supabase secrets set RESEND_API_KEY=re_xxx CLINIC_EMAIL=clinic@example.com NOTIFY_KEY=$(openssl rand -hex 24)
   ```
4. Tell Postgres where to call, using the same `NOTIFY_KEY` (SQL Editor):
   ```sql
   alter database postgres set app.notify_url =
     'https://<project-ref>.functions.supabase.co/notify-booking';
   alter database postgres set app.notify_key = '<the NOTIFY_KEY from step 3>';
   ```
   Until these are set the trigger is a no-op — requests still save, they just
   do not email.

### 5. Check it
1. Open `booking.html`, pick a date and time, fill the form, submit.
2. **Table Editor → appointment_requests** — the row should be there as `pending`.
3. Reload `booking.html` — that time should now be greyed out.
4. Set the row's `status` to `declined` and reload — the slot should come back.

## Running the clinic day to day

Supabase's **Table Editor** is the whole admin interface — no separate dashboard
was built:

- `pending` → a request nobody has answered yet. The slot is held.
- `confirmed` → the clinic agreed. The slot stays held.
- `declined` / `cancelled` → the slot is released on the website immediately.

If the clinic would rather work from a real admin screen than the table editor,
that is a separate, small piece of work — say so and it gets built.

## Deliberate limits

- **The calendar is still a request, not a confirmation.** Opening hours,
  holidays, and per-treatment appointment lengths are not modelled; the clinic
  confirms on WhatsApp. Wiring real opening hours needs the clinic's actual
  schedule, which is still outstanding (see `CLAUDE.md`).
- **No patient login, no medical records.** Only what the form collects. Keep it
  that way unless there is a reason to do otherwise — the moment this stores
  clinical detail it becomes a very different compliance problem.
- **Availability lookup fails soft.** If Supabase is unreachable the calendar
  shows every slot as free rather than blocking booking, and the clinic resolves
  the clash on WhatsApp.
