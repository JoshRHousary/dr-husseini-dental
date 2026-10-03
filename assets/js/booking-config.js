/* ─────────────────────────────────────────────────────────────────────────────
   Booking backend configuration — THE ONLY FILE YOU EDIT TO GO LIVE.

   mode: "none"      → no backend. The calendar still works and still hands the
                       selection to WhatsApp, exactly as before. Nothing is
                       stored and availability is not checked. Safe default.
   mode: "supabase"  → requests are stored, the clinic is notified, and already
                       booked slots are greyed out on the calendar.

   Setup steps for "supabase" are in backend/README.md. This project needs its
   OWN Supabase project — do not reuse any other client's.

   The anon key below is a PUBLIC key and is safe to ship in the browser, but
   only because the SQL in backend/supabase/schema.sql locks the table down with
   row-level security (anon may INSERT a request and read nothing but the
   date+time of taken slots). Do not apply one without the other.
   ───────────────────────────────────────────────────────────────────────────── */

window.DH_BOOKING = {
  mode: "none",

  supabaseUrl: "",      // e.g. "https://abcdefghijklm.supabase.co"
  supabaseAnonKey: "",  // the "anon / public" key, NOT the service_role key

  table: "appointment_requests",
  slotsView: "booked_slots",

  // Appointment length in minutes — used only to label the request.
  slotMinutes: 30
};
