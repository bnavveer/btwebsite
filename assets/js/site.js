/* Bay Transport Inc. — site behaviour. No dependencies. */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Toast ---------- */
  const toastEl = $("[data-toast]");
  let toastTimer;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2600);
  }

  /* ---------- Mobile navigation ---------- */
  const navToggle = $("[data-nav-toggle]");
  const nav = $("#site-nav");
  if (navToggle && nav) {
    const setOpen = (open) => {
      navToggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    };
    navToggle.addEventListener("click", () => setOpen(navToggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  }

  /* ---------- Highlight the section in view ---------- */
  const navLinks = $$(".site-nav a[href^='#']");
  if ("IntersectionObserver" in window && navLinks.length) {
    const byId = new Map(navLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = byId.get(entry.target.id);
        if (!link || !entry.isIntersecting) return;
        navLinks.forEach((a) => a.removeAttribute("aria-current"));
        link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    byId.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- Open / closed status (Pacific time) ---------- */
  // Hours from the current website: 7:00 am to 5:00 pm. Index 0 = Sunday.
  const HOURS = [[7, 17], [7, 17], [7, 17], [7, 17], [7, 17], [7, 17], [7, 17]];
  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const fmtHour = (h) => `${((h + 11) % 12) + 1} ${h < 12 ? "am" : "pm"}`;

  function pacificNow() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
  }

  function openStatus() {
    const { day, minutes } = pacificNow();
    const today = HOURS[day];
    if (today && minutes >= today[0] * 60 && minutes < today[1] * 60) {
      return { open: true, short: `Open until ${fmtHour(today[1])}`, long: `Open now until ${fmtHour(today[1])} Pacific. Call and a person picks up.` };
    }
    for (let i = 0; i < 7; i++) {
      const d = (day + i) % 7;
      const hours = HOURS[d];
      if (!hours) continue;
      if (i === 0 && minutes >= hours[0] * 60) continue;
      const when = i === 0 ? "today" : i === 1 ? "tomorrow" : DAY_NAMES[d];
      return { open: false, short: `Closed, opens ${fmtHour(hours[0])}`, long: `Closed right now. The office opens ${when} at ${fmtHour(hours[0])} Pacific. Quote requests sent tonight are answered then.` };
    }
    return { open: false, short: "Closed", long: "The office is closed." };
  }

  function renderStatus() {
    const s = openStatus();
    $$("[data-open-status]").forEach((el) => {
      el.textContent = s.short;
      el.classList.toggle("is-open", s.open);
      el.classList.toggle("is-closed", !s.open);
    });
    $$("[data-open-status-long]").forEach((el) => {
      el.textContent = s.long;
      el.classList.toggle("is-open", s.open);
    });
  }
  renderStatus();
  setInterval(renderStatus, 60 * 1000);

  /* ---------- Copy credential numbers ---------- */
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  }

  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = btn.dataset.copy;
      const label = btn.closest(".cred-row")?.querySelector("dt")?.textContent || "Number";
      if (await copyText(value)) {
        btn.textContent = "Copied";
        btn.classList.add("is-copied");
        toast(`${label} ${value} copied`);
        setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("is-copied"); }, 1800);
      } else {
        toast(`Couldn't copy. Select ${value} and copy it by hand.`);
      }
    });
  });

  /* ---------- Draw the lanes when the map scrolls into view ---------- */
  const map = $(".lane-map");
  if (map) {
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          map.classList.add("is-drawn");
          io.disconnect();
        }
      }, { threshold: 0.35 });
      io.observe(map);
    } else {
      map.classList.add("is-drawn");
    }
  }

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Quote form ---------- */
  const form = $("[data-quote-form]");
  if (!form) return;

  const steps = $$("[data-step]", form);
  const progress = $$("[data-progress]", form);
  const btnBack = $("[data-back]", form);
  const btnNext = $("[data-next]", form);
  const btnSubmit = $("[data-submit]", form);
  const navBar = $("[data-nav]", form);
  const done = $("[data-done]", form);
  const submitError = $("[data-submit-error]", form);
  const review = $("[data-review]", form);
  const DRAFT_KEY = "bt-quote-draft";
  let current = 1;

  const todayISO = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };
  const pickupDate = $("#pickup-date", form);
  const deliveryDate = $("#delivery-date", form);
  pickupDate.min = todayISO();
  deliveryDate.min = todayISO();
  pickupDate.addEventListener("change", () => { deliveryDate.min = pickupDate.value || todayISO(); });

  function showStep(n, focus = true) {
    current = n;
    steps.forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
    progress.forEach((p) => {
      const i = Number(p.dataset.progress);
      p.classList.toggle("is-current", i === n);
      p.classList.toggle("is-done", i < n);
      if (i === n) p.setAttribute("aria-current", "step"); else p.removeAttribute("aria-current");
    });
    btnBack.hidden = n === 1;
    btnNext.hidden = n === steps.length;
    btnSubmit.hidden = n !== steps.length;
    submitError.hidden = true;
    if (n === steps.length) renderReview();
    if (focus) {
      const step = steps[n - 1];
      const first = step.querySelector("input:not([type=hidden]):not([tabindex='-1']), textarea");
      // Only bring the form back up if its top has scrolled out from under the header.
      if (form.getBoundingClientRect().top < $("[data-header]").offsetHeight) {
        form.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      }
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 250);
    }
  }

  function setFieldError(input, message) {
    const field = input.closest(".field");
    if (!field) return;
    const err = field.querySelector(".field-error");
    field.classList.toggle("has-error", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
    if (err) {
      if (message) err.textContent = message;
      err.hidden = !message;
      if (!err.id) err.id = `${input.id}-error`;
      if (message) input.setAttribute("aria-describedby", err.id); else input.removeAttribute("aria-describedby");
    }
  }

  function validateStep(n) {
    let firstBad = null;
    const flag = (el, msg) => { setFieldError(el, msg); if (msg && !firstBad) firstBad = el; };

    if (n === 1) {
      const chosen = form.querySelector("input[name=service]:checked");
      const err = form.querySelector("[data-error-for=service]");
      err.hidden = Boolean(chosen);
      if (!chosen) firstBad = form.querySelector("input[name=service]");
    }
    if (n === 2) {
      const zip = /^\d{5}$/;
      const pz = $("#pickup-zip", form), dz = $("#delivery-zip", form);
      flag(pz, zip.test(pz.value.trim()) ? "" : "Enter a 5-digit ZIP code.");
      flag(pickupDate, !pickupDate.value ? "Choose a pickup date."
        : pickupDate.value < todayISO() ? "Pickup can't be in the past." : "");
      flag(dz, zip.test(dz.value.trim()) ? "" : "Enter a 5-digit ZIP code.");
      flag(deliveryDate, deliveryDate.value && pickupDate.value && deliveryDate.value < pickupDate.value
        ? "Delivery can't be before pickup." : "");
    }
    if (n === 3) {
      const commodity = $("#commodity", form);
      const weight = $("#weight", form);
      const pallets = $("#pallets", form);
      const num = (v) => v.trim() === "" || /^\d[\d,]*$/.test(v.trim());
      flag(commodity, commodity.value.trim() ? "" : "Tell us what the freight is.");
      flag(weight, num(weight.value) ? "" : "Enter the weight as a number, like 38000.");
      flag(pallets, num(pallets.value) ? "" : "Enter the pallet count as a number.");
    }
    if (n === 4) {
      const name = $("#name", form), email = $("#email", form);
      flag(name, name.value.trim() ? "" : "Enter your name.");
      flag(email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? "" : "Enter an email address like name@company.com.");
    }
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  function collect() {
    const data = new FormData(form);
    const get = (k) => (data.get(k) || "").toString().trim();
    return {
      service: get("service"),
      pickup_zip: get("pickup_zip"),
      pickup_date: get("pickup_date"),
      delivery_zip: get("delivery_zip"),
      delivery_date: get("delivery_date"),
      commodity: get("commodity"),
      weight_lbs: get("weight_lbs"),
      pallets: get("pallets"),
      special: data.getAll("special").join(", "),
      notes: get("notes"),
      name: get("name"),
      company: get("company"),
      email: get("email"),
      phone: get("phone"),
      website: get("website"),
    };
  }

  const prettyDate = (iso) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  function summaryRows(q) {
    return [
      ["Service", q.service],
      ["Pickup", `${q.pickup_zip} on ${prettyDate(q.pickup_date)}`],
      ["Delivery", q.delivery_date ? `${q.delivery_zip} by ${prettyDate(q.delivery_date)}` : q.delivery_zip],
      ["Freight", q.commodity],
      ["Weight", q.weight_lbs ? `${q.weight_lbs} lbs` : ""],
      ["Pallets", q.pallets],
      ["Special", q.special],
      ["Notes", q.notes],
    ].filter(([, v]) => v);
  }

  function renderReview() {
    const q = collect();
    const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    review.innerHTML = `<h4>Your shipment</h4><dl>${summaryRows(q)
      .map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
  }

  /* Draft is a per-visitor convenience only; the form works without storage. */
  function saveDraft() {
    try {
      const { website, ...q } = collect();
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ q, step: current }));
    } catch { /* storage unavailable */ }
  }
  function loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const { q } = JSON.parse(raw);
      Object.entries(q).forEach(([k, v]) => {
        if (k === "special") {
          const set = new Set(v.split(", ").filter(Boolean));
          $$("input[name=special]", form).forEach((c) => { c.checked = set.has(c.value); });
        } else if (k === "service") {
          const r = form.querySelector(`input[name=service][value="${CSS.escape(v)}"]`);
          if (r) r.checked = true;
        } else {
          const el = form.elements[k];
          if (el && "value" in el && v) el.value = v;
        }
      });
      if (pickupDate.value && pickupDate.value < todayISO()) pickupDate.value = "";
    } catch { /* ignore a broken draft */ }
  }
  function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }

  form.addEventListener("input", saveDraft);
  form.addEventListener("change", (e) => {
    saveDraft();
    if (e.target.name === "service") form.querySelector("[data-error-for=service]").hidden = true;
    const field = e.target.closest(".field.has-error");
    if (field) setFieldError(e.target, "");
  });

  btnNext.addEventListener("click", () => { if (validateStep(current)) showStep(current + 1); });
  btnBack.addEventListener("click", () => showStep(current - 1));

  // Enter in a text field moves forward instead of submitting early.
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "checkbox" && current < steps.length) {
      e.preventDefault();
      btnNext.click();
    }
  });

  function mailBody(q) {
    const lines = summaryRows(q).map(([k, v]) => `${k}: ${v}`);
    lines.push("", `Name: ${q.name}`);
    if (q.company) lines.push(`Company: ${q.company}`);
    lines.push(`Email: ${q.email}`);
    if (q.phone) lines.push(`Phone: ${q.phone}`);
    lines.push("", "Sent from the quote form on baytransportinc.com");
    return lines.join("\n");
  }

  function finish(title, body) {
    steps.forEach((s) => { s.hidden = true; });
    navBar.hidden = true;
    $(".quote-progress", form).hidden = true;
    $("[data-done-title]", form).textContent = title;
    $("[data-done-body]", form).textContent = body;
    done.hidden = false;
    done.focus();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validateStep(current)) return;
    const q = collect();
    if (q.website) return; // honeypot filled: quietly drop bot submissions

    const endpoint = form.dataset.endpoint;
    const subject = `Quote request: ${q.service}, ${q.pickup_zip} to ${q.delivery_zip}`;

    if (endpoint) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "Sending…";
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...q, _subject: subject }),
        });
        if (!res.ok) throw new Error(String(res.status));
        clearDraft();
        finish("Quote request sent", `Dispatch will reply to ${q.email}. For anything urgent, call (510) 475-6100.`);
      } catch {
        submitError.textContent = "The request didn't go through. Check your connection and try again, or call (510) 475-6100.";
        submitError.hidden = false;
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Send quote request";
      }
      return;
    }

    // No form service configured: hand off to the visitor's email app.
    const href = `mailto:${form.dataset.mailto}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody(q))}`;
    window.location.href = href;
    clearDraft();
    finish("Almost done: press send in your email app",
      `Your email app should open with the quote request filled in, addressed to ${form.dataset.mailto}. If nothing opened, email that address or call (510) 475-6100.`);
  });

  $("[data-restart]", form).addEventListener("click", () => {
    form.reset();
    clearDraft();
    done.hidden = true;
    navBar.hidden = false;
    $(".quote-progress", form).hidden = false;
    review.innerHTML = "";
    showStep(1);
  });

  loadDraft();
  showStep(1, false);
})();
