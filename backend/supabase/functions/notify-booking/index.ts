/* Supabase Edge Function — tells the clinic a new appointment request came in.

   Deploy:  supabase functions deploy notify-booking
   Secrets: supabase secrets set RESEND_API_KEY=... CLINIC_EMAIL=... NOTIFY_KEY=...

   It is called by the trg_notify_new_booking trigger in schema.sql with the new
   row as the JSON body and NOTIFY_KEY as a bearer token. */

const SERVICES: Record<string, string> = {
  cosmetic: "Cosmetic dentistry",
  endodontic: "Endodontics (root canal)",
  implant: "Implants / prosthetics",
  checkup: "Check-up / cleaning",
  other: "Other"
};

Deno.serve(async (req: Request) => {
  const expected = Deno.env.get("NOTIFY_KEY");
  if (!expected || req.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response("forbidden", { status: 403 });
  }

  let row: Record<string, unknown>;
  try {
    row = await req.json();
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("CLINIC_EMAIL");
  if (!apiKey || !to) {
    console.warn("notify-booking: RESEND_API_KEY or CLINIC_EMAIL not set; skipping email");
    return new Response("not configured", { status: 200 });
  }

  const service = SERVICES[String(row.service ?? "")] ?? "—";
  const phone = String(row.phone ?? "");
  // wa.me wants digits only, no + and no leading zero on the national number.
  const waPhone = phone.replace(/\D/g, "").replace(/^0+/, "");

  const html = `
    <h2 style="font-family:Georgia,serif">New appointment request</h2>
    <table style="font-family:system-ui;font-size:15px;border-collapse:collapse">
      <tr><td><b>When</b></td><td>${row.slot_date} at ${String(row.slot_time).slice(0, 5)}</td></tr>
      <tr><td><b>Name</b></td><td>${escapeHtml(String(row.name ?? ""))}</td></tr>
      <tr><td><b>Phone</b></td><td>${escapeHtml(phone)}</td></tr>
      <tr><td><b>Treatment</b></td><td>${service}</td></tr>
      <tr><td><b>Language</b></td><td>${row.lang}</td></tr>
      <tr><td><b>Notes</b></td><td>${escapeHtml(String(row.notes ?? "—"))}</td></tr>
    </table>
    <p><a href="https://wa.me/${waPhone}">Reply on WhatsApp</a></p>
    <p style="color:#666;font-size:13px">Status is <b>pending</b> — the slot is held.
    Set it to <code>confirmed</code> or <code>declined</code> in the Supabase table editor;
    declining frees the slot on the website calendar.</p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Website booking <booking@joshrhousary.github.io>",
      to: [to],
      subject: `Booking request — ${row.slot_date} ${String(row.slot_time).slice(0, 5)}`,
      html
    })
  });

  if (!res.ok) {
    console.error("notify-booking: resend failed", res.status, await res.text());
    return new Response("email failed", { status: 502 });
  }
  return new Response("ok", { status: 200 });
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}
