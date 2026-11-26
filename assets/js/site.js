// Aurora Coworking Ljubljana: small page behaviours (no framework, no build).
(() => {
  // Nav border once the page scrolls.
  const nav = document.querySelector(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("scrolled", scrollY > 8);
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Fade sections in as they scroll into view.
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add("in"));

  // ---- Members honeycomb: equal circles packed like an Apple Watch home screen ----
  const honey = document.querySelector("[data-honeycomb]");
  if (honey) {
    const items = [...honey.children];
    const caption = document.querySelector(".honey-caption");
    const hubIndex = items.findIndex((li) => li.classList.contains("hub"));
    honey.classList.add("honey");
    const layout = () => {
      const w = honey.parentElement.clientWidth;
      // Row lengths alternate so every row sits half a step off the one above; the hub lands in the centre either way.
      const rows = w >= 640 ? [4, 5, 4] : [3, 2, 3, 2, 3];
      const gap = w >= 640 ? 16 : 10;
      const widest = Math.max(...rows);
      const s = Math.floor(Math.min(w >= 640 ? 118 : 96, (w - gap * (widest - 1)) / widest));
      const step = s + gap, rowH = step * 0.87;
      const width = widest * s + (widest - 1) * gap;
      let i = 0;
      const hub = { x: 0, y: 0 }, pos = [];
      rows.forEach((n, r) => {
        for (let k = 0; k < n && i < items.length; k++, i++) {
          const x = width / 2 + (k - (n - 1) / 2) * step - s / 2, y = r * rowH;
          pos.push({ x, y });
          if (i === hubIndex) Object.assign(hub, { x, y });
        }
      });
      items.forEach((li, j) => {
        const p = pos[j] || { x: 0, y: 0 };
        li.style.setProperty("--s", s + "px");
        li.style.setProperty("--x", p.x + "px");
        li.style.setProperty("--y", p.y + "px");
        li.style.setProperty("--d", (Math.hypot(p.x - hub.x, p.y - hub.y) / step) * 0.07 + "s"); // pop out from the centre
      });
      honey.style.width = width + "px";
      honey.style.height = (rows.length - 1) * rowH + s + "px";
    };
    layout();
    new ResizeObserver(layout).observe(honey.parentElement);
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { honey.classList.add("in"); io.disconnect(); } }, { threshold: 0.25 });
      io.observe(honey);
    } else honey.classList.add("in");

    // Name + project under the comb. On touch, the first tap shows the name and the second opens the link.
    const show = (a) => {
      if (!caption) return;
      if (!a) { caption.innerHTML = caption.dataset.default; return; }
      const name = a.querySelector("span")?.textContent || "";
      const proj = a.querySelector("small")?.textContent;
      caption.innerHTML = `<b>${name}</b>${proj ? `<span class="proj">${proj}</span>` : ""}`;
    };
    honey.addEventListener("pointerover", (e) => { const a = e.target.closest("a"); if (a && e.pointerType !== "touch") show(a); });
    honey.addEventListener("pointerleave", () => { if (!honey.querySelector("a.active")) show(null); });
    honey.addEventListener("focusin", (e) => show(e.target.closest("a")));
    honey.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (!a || !matchMedia("(hover: none)").matches || a.classList.contains("active")) return;
      e.preventDefault();
      honey.querySelectorAll("a.active").forEach((x) => x.classList.remove("active"));
      a.classList.add("active");
      show(a);
    });
  }

  // ---- First-visit form ----
  const form = document.getElementById("visit-form");
  if (!form) return;
  const lang = document.documentElement.lang === "sl" ? "sl" : "en";
  const T = {
    en: { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], name: "Please tell us your name.", email: "Please add an email we can reply to.", date: "Pick a day.", viaMail: "Your email app opened with the request filled in. Press send and we will confirm.", sending: "Sending…" },
    sl: { day: ["ned", "pon", "tor", "sre", "čet", "pet", "sob"], name: "Prosimo, vpiši ime.", email: "Prosimo, vpiši e-naslov, da ti lahko odgovorimo.", date: "Izberi dan.", viaMail: "Odprl se je tvoj e-poštni program z izpolnjenim sporočilom. Klikni pošlji in potrdili bomo termin.", sending: "Pošiljam…" },
  }[lang];

  // Next 10 weekdays, starting tomorrow.
  const daysEl = form.querySelector("[data-days]");
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const d = new Date(); d.setHours(12, 0, 0, 0);
  let added = 0;
  while (added < 10) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) continue;
    const label = document.createElement("label");
    label.className = "chip";
    label.innerHTML = `<input type="radio" name="date" value="${iso(d)}"${added === 0 ? " checked" : ""}><span>${T.day[wd]}<small>${d.getDate()}. ${d.getMonth() + 1}.</small></span>`;
    daysEl.appendChild(label);
    added++;
  }

  // "Try it first" on a plan card pre-selects that plan.
  document.querySelectorAll("[data-plan]").forEach((a) => a.addEventListener("click", () => {
    const v = a.dataset.plan === "fixed" ? "Fixed desk" : "Flex";
    const input = form.querySelector(`input[name=plan][value="${v}"]`);
    if (input) input.checked = true;
  }));

  const err = form.querySelector(".form-error");
  const btn = form.querySelector("button[type=submit]");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    const data = Object.fromEntries(new FormData(form));
    if (!data.name || !data.name.trim()) return fail(T.name, "v-name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email || "")) return fail(T.email, "v-email");
    if (!data.date) return fail(T.date);
    data.lang = lang;

    const label = btn.textContent;
    btn.disabled = true; btn.textContent = T.sending;
    try {
      const res = await fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) throw new Error(String(res.status));
      done(data);
    } catch {
      // No mail service configured (or offline): hand the request to the visitor's email app.
      location.href = mailto(data);
      done(data, true);
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  });

  function fail(msg, id) {
    err.textContent = msg;
    if (id) document.getElementById(id)?.focus();
  }

  function prettyDate(s) {
    const [y, m, dd] = s.split("-").map(Number);
    return new Date(y, m - 1, dd).toLocaleDateString(lang === "sl" ? "sl-SI" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
  }

  function mailto(x) {
    const body = [
      `Name: ${x.name}`, `Email: ${x.email}`, x.phone ? `Phone: ${x.phone}` : "",
      `Day: ${prettyDate(x.date)}`, `Time: ${x.time}`, `Interested in: ${x.plan}`, x.work ? `Works on: ${x.work}` : "",
    ].filter(Boolean).join("\n");
    return `mailto:info@auroracoworking.com?subject=${encodeURIComponent("First visit: " + x.name)}&body=${encodeURIComponent(body)}`;
  }

  function done(x, viaMail) {
    form.querySelector("[data-step=form]").hidden = true;
    const ok = form.querySelector("[data-step=done]");
    ok.hidden = false;
    if (viaMail) ok.querySelector("p").textContent = T.viaMail;
    ok.querySelector("[data-when]").textContent = prettyDate(x.date);
    ok.querySelector("[data-ics]").href = ics(x);
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // A calendar file for the visit (local time, Ljubljana).
  function ics(x) {
    const day = x.date.replace(/-/g, "");
    const [s, e] = /After|popold/i.test(x.time) ? ["130000", "150000"] : /Whole|cel/i.test(x.time) ? ["090000", "170000"] : ["093000", "113000"];
    const lines = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Aurora Coworking Ljubljana//First visit//EN", "BEGIN:VEVENT",
      `UID:${Date.now()}@lj.auroracoworking.com`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART;TZID=Europe/Ljubljana:${day}T${s}`, `DTEND;TZID=Europe/Ljubljana:${day}T${e}`,
      "SUMMARY:First visit at Aurora Coworking Ljubljana ☕", "LOCATION:Železna cesta 14\\, level 1\\, 1000 Ljubljana",
      "DESCRIPTION:Coffee is on us. https://maps.app.goo.gl/CS66RaU6LTbjLimk7", "END:VEVENT", "END:VCALENDAR",
    ];
    return "data:text/calendar;charset=utf-8," + encodeURIComponent(lines.join("\r\n"));
  }
})();
