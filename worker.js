// Cloudflare Worker: serves the static site and handles the first-visit form.
// Only /api/* runs this code (see run_worker_first in wrangler.jsonc); every other path is a static file.
//
// Email goes out through Resend (https://resend.com). Set these in Cloudflare (Workers > aurora-lj > Settings > Variables):
//   RESEND_API_KEY  secret, from Resend
//   VISIT_FROM      e.g. "Aurora Ljubljana <visits@auroracoworking.com>" (the domain must be verified in Resend)
//   VISIT_TO        where requests go, default info@auroracoworking.com
// Without RESEND_API_KEY the endpoint answers 503 and the page falls back to opening the visitor's email app.

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const clean = (v, max = 300) => String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, max);
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/first-visit") return env.ASSETS.fetch(request);
    if (request.method !== "POST") return json({ error: "method" }, 405);

    let d;
    try { d = await request.json(); } catch { return json({ error: "bad json" }, 400); }
    if (d.company_website) return json({ ok: true }); // honeypot: pretend it worked

    const v = {
      name: clean(d.name, 120), email: clean(d.email, 200), phone: clean(d.phone, 40),
      date: clean(d.date, 10), time: clean(d.time, 40), plan: clean(d.plan, 40), work: clean(d.work, 300), lang: clean(d.lang, 2),
    };
    if (!v.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email) || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return json({ error: "invalid" }, 422);

    if (!env.RESEND_API_KEY || !env.VISIT_FROM) return json({ error: "mail not configured" }, 503);

    const rows = [["Name", v.name], ["Email", v.email], ["Phone", v.phone], ["Day", v.date], ["Time", v.time], ["Interested in", v.plan], ["Works on", v.work], ["Language", v.lang]]
      .filter(([, x]) => x);
    const text = rows.map(([k, x]) => `${k}: ${x}`).join("\n");
    const html = `<h2>New first visit ☕</h2><table cellpadding="6">${rows.map(([k, x]) => `<tr><td><b>${k}</b></td><td>${esc(x)}</td></tr>`).join("")}</table><p>Reply to this email to confirm the visit.</p>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.VISIT_FROM,
        to: [env.VISIT_TO || "info@auroracoworking.com"],
        reply_to: v.email,
        subject: `First visit: ${v.name}, ${v.date} (${v.time})`,
        text, html,
      }),
    });
    if (!res.ok) return json({ error: "send failed" }, 502);
    return json({ ok: true });
  },
};
