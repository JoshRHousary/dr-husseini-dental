/* Booking persistence adapter.

   Keeps booking.js free of any one vendor: it calls enabled()/fetchTaken()/submit()
   and the adapter decides whether that means a real backend or a no-op. With
   mode "none" every call resolves to the old WhatsApp-only behaviour, so the page
   is never broken by a missing or misconfigured backend.

   Config lives in assets/js/booking-config.js. */

(function () {
  const cfg = window.DH_BOOKING || { mode: "none" };

  const isSupabase =
    cfg.mode === "supabase" && !!cfg.supabaseUrl && !!cfg.supabaseAnonKey;

  function restUrl(path) {
    return `${cfg.supabaseUrl.replace(/\/+$/, "")}/rest/v1/${path}`;
  }

  function headers(extra) {
    return Object.assign(
      {
        apikey: cfg.supabaseAnonKey,
        Authorization: `Bearer ${cfg.supabaseAnonKey}`,
        "Content-Type": "application/json"
      },
      extra || {}
    );
  }

  /* Taken slots for a date range, as a Set of "YYYY-MM-DD HH:MM" keys.
     Reads the booked_slots view, which exposes date+time only — never patient
     data. A failure here must not block booking, so it degrades to "nothing is
     known to be taken" and the clinic resolves conflicts on WhatsApp. */
  async function fetchTaken(fromISO, toISO) {
    if (!isSupabase) return { ok: true, taken: new Set(), degraded: false };
    try {
      const q = `${encodeURIComponent(cfg.slotsView)}?select=slot_date,slot_time&slot_date=gte.${fromISO}&slot_date=lte.${toISO}`;
      const res = await fetch(restUrl(q), { headers: headers() });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const rows = await res.json();
      const taken = new Set(
        rows.map(r => `${r.slot_date} ${String(r.slot_time).slice(0, 5)}`)
      );
      return { ok: true, taken, degraded: false };
    } catch (err) {
      console.warn("[booking] availability lookup failed:", err.message);
      return { ok: false, taken: new Set(), degraded: true };
    }
  }

  /* Store one appointment request.
     payload: { slot_date, slot_time, name, phone, service, notes, lang } */
  async function submit(payload) {
    if (!isSupabase) return { ok: true, stored: false };
    try {
      const res = await fetch(restUrl(encodeURIComponent(cfg.table)), {
        method: "POST",
        headers: headers({ Prefer: "return=representation" }),
        body: JSON.stringify([payload])
      });
      if (!res.ok) {
        const body = await res.text();
        // 23505 = unique violation: somebody took that slot in the meantime.
        if (res.status === 409 || body.includes("23505")) {
          return { ok: false, stored: false, reason: "slot_taken" };
        }
        throw new Error(`${res.status} ${body.slice(0, 200)}`);
      }
      const rows = await res.json();
      return { ok: true, stored: true, id: rows && rows[0] && rows[0].id };
    } catch (err) {
      console.warn("[booking] submit failed:", err.message);
      return { ok: false, stored: false, reason: "network" };
    }
  }

  /* Contact page message. payload: { name, phone, message, lang } */
  async function submitContact(payload) {
    if (!isSupabase) return { ok: true, stored: false };
    try {
      const res = await fetch(restUrl("contact_messages"), {
        method: "POST",
        headers: headers({ Prefer: "return=minimal" }),
        body: JSON.stringify([payload])
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(res.status + ' ' + body.slice(0, 200));
      }
      return { ok: true, stored: true };
    } catch (err) {
      console.warn("[contact] submit failed:", err.message);
      return { ok: false, stored: false, reason: "network" };
    }
  }

  window.DH_BOOKING_API = {
    enabled: () => isSupabase,
    fetchTaken,
    submit,
    submitContact
  };
})();
