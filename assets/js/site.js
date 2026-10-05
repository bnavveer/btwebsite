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

  /* ---------- Stable hero height on phones ----------
     Mobile browsers resize the viewport whenever their address bar hides or shows. The hero is
     locked to the height measured at load, and only re-measured when the width changes (rotation). */
  const lockHero = () => {
    const bar = $(".mobile-bar");
    const barH = bar && getComputedStyle(bar).display !== "none" ? bar.offsetHeight : 0;
    document.documentElement.style.setProperty("--hero-h", `${window.innerHeight - barH}px`);
  };
  let lockedWidth = window.innerWidth;
  lockHero();
  window.addEventListener("resize", () => {
    if (window.innerWidth !== lockedWidth) { lockedWidth = window.innerWidth; lockHero(); }
  });

  /* ---------- Header: solid once the hero scrolls away ---------- */
  const header = $("[data-header]");
  const onScroll = () => {
    const scrolled = window.scrollY > 24;
    document.body.classList.toggle("has-scrolled", scrolled);
    if (header) header.classList.toggle("is-solid", window.scrollY > window.innerHeight * 0.6 - 72);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile navigation ---------- */
  const navToggle = $("[data-nav-toggle]");
  const nav = $("#site-nav");
  if (navToggle && nav) {
    const setOpen = (open) => {
      navToggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      header?.classList.toggle("menu-open", open);
    };
    navToggle.addEventListener("click", () => setOpen(navToggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  }

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Hero: the dithered photo "develops" from coarse pixels ---------- */
  const resolveBox = $("[data-resolve]");
  function developHero() {
    if (!resolveBox || reduceMotion) return;
    const img = resolveBox.querySelector("img");
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    const run = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !ctx) return;
      canvas.width = w; canvas.height = h;
      ctx.imageSmoothingEnabled = false;
      (img.closest("picture") || img).after(canvas);
      const small = document.createElement("canvas");
      const sctx = small.getContext("2d");
      const blocks = [72, 48, 32, 22, 15, 10, 6, 4];
      let i = 0;
      const step = () => {
        if (i >= blocks.length) {
          canvas.style.opacity = "0";
          setTimeout(() => canvas.remove(), 400);
          return;
        }
        const b = blocks[i++];
        small.width = Math.max(1, Math.round(w / b));
        small.height = Math.max(1, Math.round(h / b));
        sctx.imageSmoothingEnabled = true;
        sctx.drawImage(img, 0, 0, small.width, small.height);
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(small, 0, 0, w, h);
        setTimeout(step, i < 3 ? 110 : 85);
      };
      step();
    };
    if (img.complete && img.naturalWidth) run(); else img.addEventListener("load", run, { once: true });
  }

  /* ---------- Entrance: the original logo assembles from pixel squares ---------- */
  const intro = $("[data-intro]");
  const root = document.documentElement;
  if (intro && root.classList.contains("intro-on")) {
    const canvas = $("[data-intro-canvas]", intro);
    const sharp = $("[data-intro-logo]", intro);
    const ctx = canvas.getContext("2d");
    const timers = [];
    let finished = false, raf = 0;

    const finish = (immediate) => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      try { sessionStorage.setItem("bt-intro", "1"); } catch { /* storage unavailable */ }
      intro.classList.add("is-out");
      developHero();
      setTimeout(() => {
        cancelAnimationFrame(raf);
        root.classList.remove("intro-on");
        intro.remove();
      }, immediate ? 450 : 900);
    };
    ["click", "keydown", "wheel", "touchstart"].forEach((ev) => window.addEventListener(ev, () => finish(true), { once: true, passive: true }));

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = innerWidth, H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const logo = new Image();
    logo.onload = () => {
      // Lay the logo out exactly where the sharp copy sits, then sample it on a grid.
      const box = sharp.getBoundingClientRect();
      const COLS = Math.round(Math.min(150, Math.max(90, box.width / 4.2)));
      const cell = box.width / COLS;
      const ROWS = Math.round(box.height / cell);
      const off = document.createElement("canvas");
      off.width = COLS * 4; off.height = ROWS * 4;
      const octx = off.getContext("2d");
      octx.drawImage(logo, 0, 0, off.width, off.height);
      const data = octx.getImageData(0, 0, off.width, off.height).data;
      const cells = [];
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const i = ((r * 4 + 2) * off.width + (c * 4 + 2)) * 4;
          if (data[i + 3] < 120) continue;
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.max(W, H) * (0.4 + Math.random() * 0.45);
          cells.push({
            x: box.left + c * cell, y: box.top + r * cell,
            sx: W / 2 + Math.cos(angle) * dist, sy: H / 2 + Math.sin(angle) * dist,
            color: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
            delay: Math.random() * 420 + (c / COLS) * 260,
          });
        }
      }
      const DUR = 700;
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      const t0 = performance.now();
      const draw = (now) => {
        const t = now - t0;
        ctx.clearRect(0, 0, W, H);
        let done = true;
        for (const p of cells) {
          const k = Math.min(1, Math.max(0, (t - p.delay) / DUR));
          if (k < 1) done = false;
          const e = ease(k);
          ctx.globalAlpha = Math.min(1, k * 3);
          ctx.fillStyle = p.color;
          const s = Math.max(1, cell * (0.4 + 0.6 * e) - 0.6);
          ctx.fillRect(p.sx + (p.x - p.sx) * e, p.sy + (p.y - p.sy) * e, s, s);
        }
        ctx.globalAlpha = 1;
        if (!done && !finished) raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    };
    logo.src = sharp.src;

    // Pixels settle, then the crisp logo resolves in place, the reflector tape sweeps, and the page lifts.
    timers.push(setTimeout(() => intro.classList.add("is-sharp"), 1300));
    timers.push(setTimeout(() => intro.classList.add("is-tape"), 1750));
    timers.push(setTimeout(() => finish(false), 2550));
    // Never trap anyone behind the intro
    timers.push(setTimeout(() => finish(true), 5000));
  } else {
    developHero();
  }

  /* ---------- Hero lens: reveal the full-colour photo under the cursor ---------- */
  const poster = $(".poster");
  const lens = $("[data-lens]");
  if (poster && lens && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const ring = document.createElement("div");
    ring.className = "poster__ring";
    poster.insertBefore(ring, $(".poster__foot", poster));
    let loaded = false;
    const setRadius = () => poster.style.setProperty("--lr", `${Math.round(Math.min(220, Math.max(130, innerWidth * 0.11)))}px`);
    setRadius();
    window.addEventListener("resize", setRadius);
    poster.addEventListener("pointerenter", () => {
      if (!loaded) { lens.style.backgroundImage = `url("${lens.dataset.src}")`; loaded = true; }
    });
    poster.addEventListener("pointermove", (e) => {
      const r = poster.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      poster.style.setProperty("--lx", `${x}px`);
      poster.style.setProperty("--ly", `${y}px`);
      poster.style.setProperty("--lxp", `${x}px`);
      poster.style.setProperty("--lyp", `${y}px`);
      // Keep the lens off the text and buttons at the bottom
      const overUI = e.target.closest(".poster__foot a, .poster__foot button, .poster__title");
      poster.classList.toggle("is-lensing", !overUI);
    });
    poster.addEventListener("pointerleave", () => poster.classList.remove("is-lensing"));
  }

  /* ---------- Road: the truck drives the mile markers as you scroll ---------- */
  const road = $("[data-road]");
  if (road) {
    const items = $$(".milemarkers__list li");
    const truck = $(".road__truck", road);
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = road.getBoundingClientRect();
      const vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.55)));
      road.style.setProperty("--p", p.toFixed(4));
      const front = truck.getBoundingClientRect().right - 20;
      items.forEach((li) => {
        const post = li.querySelector(".post");
        li.classList.toggle("is-passed", post.getBoundingClientRect().left <= front);
      });
    };
    const onScrollRoad = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", onScrollRoad, { passive: true });
    window.addEventListener("resize", onScrollRoad);
    update();
  }

  /* ---------- Print buttons ---------- */
  $$("[data-print]").forEach((b) => b.addEventListener("click", () => window.print()));

  /* ---------- Capabilities sub-navigation: mark the section in view ---------- */
  /* ---------- Horizontal scrollers: arrows, progress bar, drag with the mouse ---------- */
  $$("[data-scroller]").forEach((track) => {
    const nav = $(`[data-scroller-nav="${track.id}"]`);
    const bar = $(`[data-scroller-progress="${track.id}"] span`);
    const buttons = nav ? $$("[data-dir]", nav) : [];
    const step = () => {
      const item = track.querySelector("li");
      return item ? item.getBoundingClientRect().width + 16 : track.clientWidth * 0.8;
    };

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const at = track.scrollLeft;
      buttons.forEach((b) => {
        b.disabled = Number(b.dataset.dir) < 0 ? at <= 2 : at >= max - 2;
      });
      if (bar) {
        const visible = track.clientWidth / track.scrollWidth;
        bar.style.width = `${Math.max(visible, 0.12) * 100}%`;
        bar.style.transform = `translateX(${max > 0 ? (at / max) * ((1 / Math.max(visible, 0.12)) - 1) * 100 : 0}%)`;
      }
    };

    buttons.forEach((b) => b.addEventListener("click", () => {
      track.scrollBy({ left: Number(b.dataset.dir) * step(), behavior: reduceMotion ? "auto" : "smooth" });
    }));
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();

    // Mouse drag (touch already scrolls natively)
    let startX = 0, startLeft = 0, moved = false, down = false;
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      down = true; moved = false;
      startX = e.clientX; startLeft = track.scrollLeft;
    });
    window.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 4) { moved = true; track.classList.add("is-dragging"); }
      if (moved) track.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", () => {
      if (!down) return;
      down = false;
      if (moved) {
        track.classList.remove("is-dragging");
        // Let snap settle on the nearest card
        const s = step();
        track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
    track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  });

  const subLinks = $$(".subnav a[href^='#']");
  if ("IntersectionObserver" in window && subLinks.length) {
    const byId = new Map(subLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = byId.get(entry.target.id);
        if (!link || !entry.isIntersecting) return;
        subLinks.forEach((a) => a.removeAttribute("aria-current"));
        link.setAttribute("aria-current", "true");
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
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
      const label = btn.closest(".creds__row")?.querySelector("dt")?.textContent || "Number";
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
