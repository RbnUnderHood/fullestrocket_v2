import {
  toMetricUnits,
  computeFcr,
  computeCostPerEgg,
  // optional helpers (safe if tiles aren't in HTML):
  computeLayRate,
  computeFeedPerBirdG,
  costPerDozen,
  computeAltCostScenario,
} from "./compute.js";
import { performanceForFcr } from "./performance.js";

const SHOW_WARNINGS_CARD = false; // we’ll use tile info popovers instead

/* ---------------- Session-only memory (no persistence) ---------------- */
const sessionData = { startTime: Date.now(), calcs: [] };

// ---------------- Boot-time global state (dirty flag for Save gating) ----------------
window.__state = window.__state || {};
// When true, Save must NOT arm; becomes false only immediately after a fresh Cluckulate
if (typeof window.__state.needsRecalc === "undefined")
  window.__state.needsRecalc = true;
// Track the flock name used in the last calculation (trimmed)
if (typeof window.__state.lastCalcFlock === "undefined")
  window.__state.lastCalcFlock = "";

/* ---------------- Tiny helpers ---------------- */
const $ = (sel) => document.querySelector(sel);
const byId = (id) => document.getElementById(id);
const $save = document.getElementById("loggerSaveBtn");
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
// helper: temporary button state swap (text + class), then revert (no-op if missing)
window.__ui = window.__ui || {};
window.__ui.swapBtnState = function swapBtnState(
  btn,
  { text, addClass, duration = 1500 } = {}
) {
  if (!btn) return;
  const originalHTML = btn.innerHTML;
  const originalClass = addClass ? addClass : null;
  const revert = () => {
    if (originalClass) btn.classList.remove(originalClass);
    btn.innerHTML = originalHTML;
  };
  if (addClass) btn.classList.add(addClass);
  if (text) btn.innerHTML = text;
  window.setTimeout(revert, duration);
};

// (optional future) tiny sound hook – not active yet
window.__ui.playUiSound = function playUiSound(/* name */) {
  // intentionally a no-op for now; wire later:
  // const el = document.getElementById('uiSound-'+name); el?.play();
};

// ---- Toggle decorator: Feed prices → switch UI with "clu-chunk" feel ----
(function () {
  // Robust element resolver (first match wins)
  function getPricesCheckbox() {
    return (
      // common ids
      document.getElementById("pricesEnabled") ||
      document.getElementById("feedPrices") ||
      // name/data fallbacks
      document.querySelector('input[type="checkbox"][name*="price"]') ||
      document.querySelector('input[type="checkbox"][data-role="prices"]') ||
      null
    );
  }

  function getWrappingLabel(input) {
    // Prefer <label for="...">; fall back to nearest label ancestor
    if (!input) return null;
    const id = input.getAttribute("id");
    let lab = id ? document.querySelector(`label[for="${id}"]`) : null;
    if (!lab) lab = input.closest("label");
    return lab;
  }

  function ensureToggleUI(input) {
    const label = getWrappingLabel(input);
    if (!label) return;

    // Mark once
    if (label.classList.contains("ui-toggle-wrap")) return;
    label.classList.add("ui-toggle-wrap");

    // Create decorative span immediately after the checkbox for CSS targeting
    const knob = document.createElement("span");
    knob.className = "ui-toggle";
    // Keep it inert; the input remains the interactive control
    knob.setAttribute("aria-hidden", "true");

    // Insert right after input so we can use input + .ui-toggle adjacent selectors
    input.insertAdjacentElement("afterend", knob);

    // Change hook: add/remove an "on" class for CSS (redundant to :checked, but handy)
    const sync = () => {
      knob.classList.toggle("is-on", input.checked);
      // (later) play sound if desired:
      // if (input.checked) window.__ui?.playUiSound?.('clunk-on'); else window.__ui?.playUiSound?.('clunk-off');
    };
    input.addEventListener("change", sync);
    sync();
  }

  // Boot
  const cb = getPricesCheckbox();
  if (cb) ensureToggleUI(cb);
})();

// ---- Conflict-proof, cancellable scroll to actions row ----
(function () {
  let raf = 0,
    pendingTimer = 0,
    cancelling = false;
  const html = document.documentElement,
    body = document.body;

  function prefersReduced() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }
  function actionsRow() {
    return document.querySelector(".actions-row");
  }

  function addNoAnchor() {
    html.classList.add("scrolling-prog");
    body.classList.add("scrolling-prog");
  }
  function remNoAnchor() {
    html.classList.remove("scrolling-prog");
    body.classList.remove("scrolling-prog");
  }

  function now() {
    return performance.now();
  }
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function cancelScrollRuntime() {
    cancelling = true;
    if (raf) cancelAnimationFrame(raf), (raf = 0);
    if (pendingTimer) clearTimeout(pendingTimer), (pendingTimer = 0);
    remNoAnchor();
    setTimeout(() => {
      cancelling = false;
    }, 0);
  }

  function onAnyUserIntentCancel() {
    cancelScrollRuntime();
    window.removeEventListener("wheel", onAnyUserIntentCancel, {
      passive: true,
    });
    window.removeEventListener("touchstart", onAnyUserIntentCancel, {
      passive: true,
    });
    window.removeEventListener("keydown", onAnyUserIntentCancel, true);
  }

  function toY(targetY, durMs) {
    addNoAnchor();
    const startY = window.scrollY || window.pageYOffset;
    const dist = targetY - startY;
    const startT = now();

    const step = () => {
      if (cancelling) return;
      const t = Math.min(1, (now() - startT) / durMs);
      const y = startY + dist * easeInOutQuad(t);
      window.scrollTo(0, y);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        remNoAnchor();
        raf = 0;
      }
    };
    raf = requestAnimationFrame(step);
  }

  function computeTargetY(row, opts) {
    const peek = opts?.peekPx ?? 24,
      pad = opts?.paddingPx ?? 12;
    // Read twice to resist late layout/image shifts:
    const read = () => {
      const rect = row.getBoundingClientRect();
      const yNow = window.scrollY || window.pageYOffset;
      const h = window.innerHeight || document.documentElement.clientHeight;
      return Math.max(0, Math.round(rect.bottom + yNow + pad + peek - h));
    };
    let y = read();
    return new Promise((r) => requestAnimationFrame(() => r(read() || y)));
  }

  window.__ui = window.__ui || {};
  window.__ui.scrollActionsIntoView = function (opts) {
    cancelScrollRuntime();
    const delay = opts && typeof opts.delay === "number" ? opts.delay : 800;
    const dur = opts && typeof opts.duration === "number" ? opts.duration : 450;

    if (prefersReduced()) {
      pendingTimer = setTimeout(() => {
        const row = actionsRow();
        if (!row) return;
        computeTargetY(row, { peekPx: 24, paddingPx: 12 }).then((y) =>
          window.scrollTo(0, y)
        );
      }, delay);
      return;
    }

    window.addEventListener("wheel", onAnyUserIntentCancel, {
      passive: true,
      once: true,
    });
    window.addEventListener("touchstart", onAnyUserIntentCancel, {
      passive: true,
      once: true,
    });
    window.addEventListener("keydown", onAnyUserIntentCancel, true);

    pendingTimer = setTimeout(() => {
      pendingTimer = 0;
      const row = actionsRow();
      if (!row) {
        onAnyUserIntentCancel();
        return;
      }
      computeTargetY(row, { peekPx: 24, paddingPx: 12 }).then((y) =>
        toY(y, dur)
      );
    }, delay);
  };

  window.__ui.cancelScrollActions = cancelScrollRuntime;
})();

// Helper: get the flock input element (robust selector list, first-hit wins)
function getFlockEl() {
  return (
    document.querySelector("#flockInput") || // old
    document.querySelector("#flockName") || // common alt
    document.querySelector('input[name="flock"]') || // name-based
    document.querySelector('[data-role="flock"]') || // data-role
    null
  );
}
function getFlockNameTrimmed() {
  const el = getFlockEl();
  return (el?.value || "").trim();
}

// Mark inputs as dirty → require fresh Cluckulate; proactively de‑arm Save UI
function markDirty() {
  try {
    window.__state.needsRecalc = true;
    const btn = document.getElementById("loggerSaveBtn");
    if (btn) {
      btn.classList.remove("btn-primary");
      btn.classList.add("btn-secondary", "btn-outline");
    }
  } catch {}
}

function setDefaultInputs() {
  if (inputs.birdCount) inputs.birdCount.value = 12;
  if (inputs.eggCount) inputs.eggCount.value = 10;
  if (inputs.avgEggWeight) inputs.avgEggWeight.value = 60;
  if (inputs.feedConsumed) inputs.feedConsumed.value = 1.2;
  if (inputs.bagWeight) inputs.bagWeight.value = 22.68; // 50 lb in kg
  if (inputs.bagPrice) inputs.bagPrice.value = 22.5;
  if (inputs.altAmount) inputs.altAmount.value = 0.2;
  if (inputs.altPricePerUnit) inputs.altPricePerUnit.value = 0.5;
  if (inputs.flockName) inputs.flockName.value = "EggForceOne";
}

function autoFocusFirstField() {
  setDefaultInputs();
  try {
    if (!inputs.birdCount.value) {
      // Prevent scroll jump; mobile browsers may still open keyboard (expected)
      inputs.birdCount.focus({ preventScroll: true });
    }
  } catch {}
}

// Safe text setter: does nothing if the element isn't found
function setText(el, value) {
  if (el) el.textContent = value;
}
let userChoseMore = false;

function setMoreCollapsed(collapsed) {
  if (!moreBox || !toggleMoreBtn) return;
  moreBox.hidden = collapsed;
  toggleMoreBtn.textContent = collapsed ? "More details ▾" : "Hide details ▴";
}

function applyMoreDefaultForViewport() {
  if (userChoseMore) return; // respect the user’s choice
  const isMobile = window.matchMedia("(max-width: 480px)").matches;
  setMoreCollapsed(isMobile); // collapsed on mobile, expanded on desktop
}

// Store the last computed values so help popovers can be context-aware
let lastMetrics = null;

// --- Save button conditional emphasis helpers ---
function todayKey() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function isSavedToday(flock) {
  if (!flock) return false;
  try {
    const store = JSON.parse(
      localStorage.getItem("cluckulator.logger") || "{}"
    );
    const tk = todayKey();
    return !!(store[tk] && store[tk][flock]);
  } catch (_) {
    return false;
  }
}
function updateSaveButtonState(inputs) {
  const btn = $save;
  if (!btn) return;
  const flock = (inputs?.flock || "").trim();
  const currentFlock = getFlockNameTrimmed();
  const hasDerived = !!window.__state?.latest?.derived || !!lastMetrics;
  const isFreshCalc =
    !window.__state?.needsRecalc &&
    currentFlock === (window.__state?.lastCalcFlock || "");
  // reset classes
  btn.classList.remove("btn-primary");
  btn.classList.add("btn-secondary", "btn-outline");
  btn.disabled = false; // keep clickable; emphasis conveys readiness
  if (!currentFlock || !hasDerived || !isFreshCalc) return; // not savable → stay outlined
  if (!isSavedToday(currentFlock)) {
    btn.classList.remove("btn-secondary", "btn-outline");
    btn.classList.add("btn-primary");
  } else {
    btn.classList.add("btn-secondary", "btn-outline");
  }
}

function getHelpData(key) {
  const m = lastMetrics;

  const fallback = {
    fcr: {
      title: "What is FCR?",
      body: "FCR (feed conversion ratio) is kg of feed per kg of egg mass. Lower is better.",
    },
    layRate: {
      title: "Lay rate (%)",
      body: "Eggs per hen per day. Mature flocks often range 60–95% depending on age and season.",
    },
    feedPerBird: {
      title: "Feed per bird (g/day)",
      body: "Typical daily intake is about 100–120 g. Much lower or higher may need a closer look.",
    },
    costPerDozen: {
      title: "Cost per dozen",
      body: "Estimated from your cost per egg × 12 (requires Feed prices).",
    },
    costPerEgg: {
      title: "Cost per egg",
      body: "Uses your feed price and feed used this period, divided by eggs collected.",
    },
    costPerEggAlt: {
      title: "Cost per egg (with alt feed)",
      body: "Recomputes cost per egg if some feed is replaced by your alternative feed and its price.",
    },
    feedPerEgg: {
      title: "Feed per egg (g)",
      body: "How many grams of feed went into each egg this period.",
    },
    feedSavings: {
      title: "Feed savings",
      body: "Difference between baseline feed cost and the scenario using your alternative feed.",
    },
    altShare: {
      title: "Alt feed share (%)",
      body: "Percent of total feed that is your alternative feed.",
    },
  };

  if (!m)
    return fallback[key] || { title: "Info", body: "Details coming soon." };

  switch (key) {
    case "fcr": {
      const band = m.bands?.fcr;
      const v = m.fcr;
      let body;
      if (band === "good")
        body = `FCR ${v?.toFixed(
          2
        )} — Good. Lower is better; you’re in a solid range.`;
      else if (band === "avg")
        body = `FCR ${v?.toFixed(
          2
        )} — Average. Room to optimize feed quality, environment, and health.`;
      else if (band === "watch")
        body = `FCR ${v?.toFixed(
          2
        )} — Higher than usual. Check ration balance, temperature, and flock health.`;
      else if (band === "poor")
        body = `FCR ${v?.toFixed(
          2
        )} — High. Investigate nutrition, spillage, parasites, or stress.`;
      else body = fallback.fcr.body;
      return { title: "What is FCR?", body };
    }
    case "layRate": {
      const band = m.bands?.lay;
      const v = m.layRate;
      let body;
      if (band === "good")
        body = `Lay rate ${v?.toFixed(
          0
        )}% — Strong production for a mature flock.`;
      else if (band === "avg")
        body = `Lay rate ${v?.toFixed(
          0
        )}% — Typical outside peak; age and season matter.`;
      else if (band === "watch")
        body = `Lay rate ${v?.toFixed(
          0
        )}% — On the low side. Review lighting hours, nutrition, and comfort.`;
      else if (band === "poor")
        body = `Lay rate ${v?.toFixed(
          0
        )}% — Low for in-lay hens. Check light (12–14 h), diet, and parasites.`;
      else body = fallback.layRate.body;
      return { title: "Lay rate (%)", body };
    }
    case "feedPerBird": {
      const band = m.bands?.feedPerBird;
      const g = m.feedPerBird_g;
      if (g == null) return fallback.feedPerBird;
      let body;
      if (g < 80)
        body = `~${g.toFixed(
          0
        )} g/day — Very low intake. Check feeder access, crowding, or health.`;
      else if (g < 100)
        body = `~${g.toFixed(
          0
        )} g/day — Low end of normal. Watch body condition and production.`;
      else if (g <= 120)
        body = `~${g.toFixed(0)} g/day — Normal intake for many strains.`;
      else if (g <= 150)
        body = `~${g.toFixed(
          0
        )} g/day — On the high side; can be seasonal or due to waste.`;
      else
        body = `~${g.toFixed(
          0
        )} g/day — Very high. Check spillage, ration energy, pests, or temperature.`;
      return { title: "Feed per bird (g/day)", body };
    }
    default:
      return fallback[key] || { title: "Info", body: "Details coming soon." };
  }
}

// ---------------- Poultry Logger (Stage C) ----------------
// Tiny helper module with localStorage/sessionStorage persistence
const LoggerCore = (() => {
  const LS_KEY = "cluckulator.logger";
  const VS_KEY = "cluckulator.logger.visitIndex";

  const todayKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const load = () => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
    } catch (_) {
      return {};
    }
  };

  const saveStore = (obj) => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
    } catch (_) {}
  };

  const nextVisitIndex = () => {
    let n = 0;
    try {
      n = Number(sessionStorage.getItem(VS_KEY)) || 0;
    } catch (_) {}
    n += 1;
    try {
      sessionStorage.setItem(VS_KEY, String(n));
    } catch (_) {}
    return n;
  };

  function saveEntry({ flock, snapshot }) {
    const key = todayKey();
    const name = (flock || "").trim();
    if (!name) {
      return { saved: false, warning: { type: "missing_flock" } };
    }
    const store = load();
    const dayBucket = store[key] || {};
    if (dayBucket[name]) {
      return {
        saved: false,
        warning: { type: "duplicate_today", flock: name },
      };
    }
    dayBucket[name] = {
      at: Date.now(),
      snapshot: snapshot && {
        fcr: snapshot.fcr,
        cpe: snapshot.cpe,
        layRate: snapshot.layRate,
        eggs: snapshot.eggs,
        feedPerEggG: snapshot.feedPerEggG,
      },
    };
    store[key] = dayBucket;
    saveStore(store);
    return { saved: true, visitIndex: nextVisitIndex(), flock: name };
  }

  return { saveEntry, todayKey, load };
})();

/* -------- Single popover element & handlers (no extra HTML needed) -------- */
let helpEl;
function ensureHelpPopover() {
  if (helpEl) return helpEl;
  helpEl = document.createElement("div");
  helpEl.id = "helpPopover";
  helpEl.className = "hidden";
  helpEl.innerHTML = `<h4></h4><p></p>`;
  document.body.appendChild(helpEl);
  return helpEl;
}

function openHelp(btn) {
  const data = getHelpData(btn.dataset.helpKey);
  if (!data) return;
  const el = ensureHelpPopover();
  el.querySelector("h4").textContent = data.title;
  el.querySelector("p").textContent = data.body;
  el.classList.remove("hidden");

  const r = btn.getBoundingClientRect();
  const top = window.scrollY + r.bottom + 8;
  const left = Math.min(
    window.scrollX + r.left,
    window.scrollX + window.innerWidth - el.offsetWidth - 12
  );
  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
}
function closeHelp() {
  if (helpEl) helpEl.classList.add("hidden");
  if (toggleMoreBtn) {
    toggleMoreBtn.addEventListener("click", () => {
      userChoseMore = true;
      setMoreCollapsed(!moreBox.hidden);
    });
  }
}

// Delegated events for all ".info" buttons
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".info");
  if (btn) {
    e.preventDefault();
    const wasOpen = helpEl && !helpEl.classList.contains("hidden");
    closeHelp();
    if (!wasOpen) openHelp(btn);
    return;
  }
  if (helpEl && !helpEl.contains(e.target)) closeHelp();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeHelp();
});

/* ---------------- Performance banding (broad, breed-agnostic) ---------------- */
// FCR bands (kg feed / kg eggs)
function bandFcr(fcr) {
  if (fcr == null || !isFinite(fcr)) return null;
  if (fcr <= 2.1) return "good";
  if (fcr <= 2.5) return "avg";
  if (fcr <= 3.0) return "watch";
  return "poor";
}

// Lay rate bands (% per hen per day, mature in-lay)
function bandLay(layRate) {
  if (layRate == null || !isFinite(layRate)) return null;
  if (layRate >= 80) return "good";
  if (layRate >= 60) return "avg";
  if (layRate >= 40) return "watch";
  return "poor";
}

// Feed per bird bands (g/day)
function bandFeedPerBird(g) {
  if (g == null || !isFinite(g)) return null;
  if (g < 80) return "poor"; // too low
  if (g < 100) return "watch"; // low
  if (g <= 120) return "good"; // normal
  if (g <= 150) return "watch"; // high
  return "poor"; // very high
}

// Apply/removes classes on a tile
function setTileBand(tileEl, band) {
  if (!tileEl) return;
  tileEl.classList.remove("band-good", "band-avg", "band-watch", "band-poor");
  if (band) tileEl.classList.add("band-" + band);
}

/* ---------------- Units ---------------- */
const unitRadios = document.querySelectorAll('input[name="units"]');
function currentUnits() {
  const r = Array.from(unitRadios).find((x) => x.checked);
  return r ? r.value : "imperial";
}

/* ---------------- Inputs & UI refs ---------------- */
const inputs = {
  flockName: byId("flockName"),
  birdCount: byId("birdCount"),
  eggCount: byId("eggCount"),
  avgEggWeight: byId("avgEggWeight"),
  feedConsumed: byId("feedConsumed"),
  bagWeight: byId("bagWeight"),
  bagPrice: byId("bagPrice"),
  notes: byId("notes"),
};

const AVG_PRICE_PER_LB = 0.45; // $/lb typical
const AVG_PRICE_PER_KG = 0.99; // ≈ 0.45 * 2.2046
const DEF_BAG_LB = 50;
const DEF_BAG_KG = 25;
const toggleMoreBtn = byId("toggleMore");
const moreBox = byId("moreMetrics");

const issuesEl = byId("issues");
const resultsBox = byId("results");
const fcrValue = byId("fcrValue");
const feedPerEgg = byId("feedPerEgg");
const costPerEgg = byId("costPerEgg");
const ratingEl = byId("rating");
const sessionNote = byId("sessionNote");
const sessionCounter = byId("sessionCounter");
const inputSummary = byId("inputSummary");

// optional tiles (safe if missing)
const layRateEl = byId("layRate");
const feedPerBirdEl = byId("feedPerBird");
const costPerDozenEl = byId("costPerDozen");

// tile wrappers (for hide/show and coloring)
const tileCostPerEgg = byId("tileCostPerEgg");
const tileCostPerDozen = byId("tileCostPerDozen");
const tileFeedSavings = byId("tileFeedSavings");
const tileCostPerEggAlt = byId("tileCostPerEggAlt");
const tileAltShare = byId("tileAltShare");

// Tile containers (closest .metric for coloring)
const tileFcr = fcrValue ? fcrValue.closest(".metric") : null;
const tilePerf = ratingEl ? ratingEl.closest(".metric") : null;
const tileLay = layRateEl ? layRateEl.closest(".metric") : null;
const tileFeedBird = feedPerBirdEl ? feedPerBirdEl.closest(".metric") : null;

// unit labels
const eggWeightUnit = byId("eggWeightUnit");
const feedConsumedUnit = byId("feedConsumedUnit");
const bagWeightUnit = byId("bagWeightUnit");

const pricesEnabled = byId("pricesEnabled");
const pricesBox = byId("pricesBox");
const notesEnabled = byId("notesEnabled");
const notesBox = byId("notesBox");

// Alternative feed inputs
const altEnabled = byId("altEnabled");
const altBox = byId("altBox");
const altAmount = byId("altAmount");
const altPricePerUnit = byId("altPricePerUnit");
const altName = byId("altName");
const altAmountUnit = byId("altAmountUnit");
const altPriceUnit = byId("altPriceUnit");

// Alternative feed tiles (safe if missing)
const costPerEggAltEl = byId("costPerEggAlt");
const feedSavingsEl = byId("feedSavings");
const altShareEl = byId("altShare");

/* ---------------- Startup ---------------- */
setDefaultValues("imperial");
autoFocusFirstField();
attachListeners();
refreshSessionCounter();

/* ---------------- Functions ---------------- */
function setDefaultValues(units) {
  updateUnitLabels(units);
  setPlaceholders(units); // <-- placeholders, not values
  refreshSessionCounter();
}

function setPlaceholders(units) {
  inputs.flockName.placeholder = "e.g., ‘Layer Barn A’";
  inputs.birdCount.placeholder = "e.g., 25 birds";
  inputs.eggCount.placeholder = "e.g., 22 eggs";
  inputs.bagPrice.placeholder = "$ e.g., 22.50";
  const altName = byId("altName");
  if (altName) altName.placeholder = "e.g., alfalfa meal / kitchen greens";

  if (units === "imperial") {
    inputs.avgEggWeight.placeholder = "e.g., 2.1 oz";
    inputs.feedConsumed.placeholder = "e.g., 26.5 lb";
    inputs.bagWeight.placeholder = "e.g., 50 lb";
    const altAmt = byId("altAmount");
    const altPpu = byId("altPricePerUnit");
    if (altAmt) altAmt.placeholder = "e.g., 2.5 lb";
    if (altPpu) altPpu.placeholder = "$ per lb (e.g., 0.20)";
  } else {
    inputs.avgEggWeight.placeholder = "e.g., 60 g";
    inputs.feedConsumed.placeholder = "e.g., 12 kg";
    inputs.bagWeight.placeholder = "e.g., 25 kg";
    const altAmt = byId("altAmount");
    const altPpu = byId("altPricePerUnit");
    if (altAmt) altAmt.placeholder = "e.g., 1 kg";
    if (altPpu) altPpu.placeholder = "$ per kg (e.g., 0.44)";
  }
}

function onUnitsChange() {
  const u = currentUnits();
  updateUnitLabels(u);
  setPlaceholders(u); // update placeholders on toggle
}

// Snapshot the latest inputs/state in the same shape used for analytics dispatch
function collectInputs() {
  // Mirror the detail payload built in onCalculate's dispatch
  const units = currentUnits();
  const birds = +inputs.birdCount.value || 0;
  const eggs = +inputs.eggCount.value || 0;
  const metric = toMetricUnits(units, {
    feedConsumed: inputs.feedConsumed.value,
    avgEggWeight: inputs.avgEggWeight.value,
    bagWeight: inputs.bagWeight.value,
    altAmount: altEnabled && altEnabled.checked ? altAmount.value : 0,
    altPricePerUnit:
      altEnabled && altEnabled.checked ? altPricePerUnit.value : "",
  });
  const { fcr, feedPerEggG } = computeFcr({
    feedConsumedKg: metric.feedConsumedKg,
    eggCount: eggs,
    avgEggWeightG: metric.avgEggWeightG,
  });
  const cpe = computeCostPerEgg({
    bagPrice: inputs.bagPrice.value,
    bagWeightKg: metric.bagWeightKg,
    eggCount: eggs,
    feedConsumedKg: metric.feedConsumedKg,
  });
  const layRate = computeLayRate(eggs, birds);
  const feedPerBird_g = computeFeedPerBirdG(metric.feedConsumedKg, birds);
  const cpd = costPerDozen(cpe);
  // Optional alt scenario
  const { costPerEggAlt, savingsTotal, altSharePct } = computeAltCostScenario({
    feedConsumedKg: metric.feedConsumedKg,
    eggCount: eggs,
    bagPrice: inputs.bagPrice.value,
    bagWeightKg: metric.bagWeightKg,
    altAmountKg: metric.altAmountKg,
    altPricePerKg: metric.altPricePerKg,
  });
  const alt = {
    costPerEggAlt: typeof costPerEggAlt !== "undefined" ? costPerEggAlt : null,
    savingsTotal: typeof savingsTotal !== "undefined" ? savingsTotal : null,
    altSharePct: typeof altSharePct !== "undefined" ? altSharePct : null,
  };
  return {
    units,
    eggs,
    avgEggWeightG: metric.avgEggWeightG ?? null,
    feedConsumedKg: metric.feedConsumedKg ?? null,
    bagWeightKg: metric.bagWeightKg ?? null,
    bagPrice: Number((inputs && inputs.bagPrice && inputs.bagPrice.value) || 0),
    fcr,
    feedPerEggG: typeof feedPerEggG !== "undefined" ? feedPerEggG : null,
    layRate,
    feedPerBird_g,
    cpe,
    cpd,
    alt,
    flock: getFlockNameTrimmed(),
  };
}

function prefillAverageFeedPrice(units) {
  if (!pricesEnabled || !pricesEnabled.checked) return;
  const hasW = inputs.bagWeight.value !== "";
  const hasP = inputs.bagPrice.value !== "";
  if (units === "imperial") {
    if (!hasW) inputs.bagWeight.value = DEF_BAG_LB;
    if (!hasP)
      inputs.bagPrice.value = (DEF_BAG_LB * AVG_PRICE_PER_LB).toFixed(2);
  } else {
    if (!hasW) inputs.bagWeight.value = DEF_BAG_KG;
    if (!hasP)
      inputs.bagPrice.value = (DEF_BAG_KG * AVG_PRICE_PER_KG).toFixed(2);
  }
}

function updatePlaceholders(units) {
  inputs.avgEggWeight.placeholder =
    units === "imperial" ? "e.g., 2.1 oz" : "e.g., 60 g";
  inputs.feedConsumed.placeholder =
    units === "imperial" ? "e.g., 26.5 lb" : "e.g., 12 kg";
  inputs.bagWeight.placeholder =
    units === "imperial" ? "e.g., 50 lb" : "e.g., 25 kg";
  if (altAmount)
    altAmount.placeholder =
      units === "imperial" ? "e.g., 2.5 lb" : "e.g., 1 kg";
  if (altPricePerUnit)
    altPricePerUnit.placeholder =
      units === "imperial" ? "$ per lb (e.g., 0.20)" : "$ per kg (e.g., 0.99)";
}

function attachListeners() {
  const calcBtn = byId("btnCalc");
  // Support new IDs (#exportBtn, #printBtn) with fallback to legacy ones
  const exportBtn = byId("exportBtn") || byId("btnExportSession");
  const printBtn = byId("printBtn") || byId("btnPrint");
  // Feed prices toggle
  if (pricesEnabled && pricesBox) {
    pricesBox.hidden = !pricesEnabled.checked;
    // Reflect state on container for CSS fallbacks (hide note when on)
    const feedPricesSection = pricesEnabled.closest(".feed-prices");
    if (feedPricesSection) {
      feedPricesSection.classList.toggle("prices-on", !!pricesEnabled.checked);
    }
    if (pricesEnabled.checked) prefillAverageFeedPrice(currentUnits());
    pricesEnabled.addEventListener("change", () => {
      pricesBox.hidden = !pricesEnabled.checked;
      if (feedPricesSection) {
        feedPricesSection.classList.toggle(
          "prices-on",
          !!pricesEnabled.checked
        );
      }
      if (pricesEnabled.checked) prefillAverageFeedPrice(currentUnits());
    });
  }

  // Notes toggle
  if (notesEnabled && notesBox) {
    notesBox.hidden = !notesEnabled.checked;
    notesEnabled.addEventListener("change", () => {
      notesBox.hidden = !notesEnabled.checked;
    });
  }

  if (calcBtn) calcBtn.addEventListener("click", onCalculate);
  if (exportBtn) exportBtn.addEventListener("click", exportSessionCsv);
  unitRadios.forEach((r) => r.addEventListener("change", onUnitsChange));
  if (printBtn) printBtn.addEventListener("click", onPrint);

  // Update Save button state when flock name changes
  const flockInput = getFlockEl();
  if (flockInput && typeof flockInput.addEventListener === "function") {
    flockInput.addEventListener("input", () => {
      try {
        const latest = window.__state?.latest?.inputs || {};
        const merged = { ...latest, flock: getFlockNameTrimmed() };
        updateSaveButtonState(merged);
      } catch (_) {}
    });
  }

  // Mark dirty on any relevant input change (including flock)
  [
    "#birdCount",
    "#eggCount",
    "#avgEggWeight",
    "#feedConsumed",
    "#bagWeight",
    "#bagPrice",
    "#altAmount",
    "#altPricePerUnit",
    "#altName",
    "#notes",
  ].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.addEventListener("input", markDirty, { passive: true });
  });
  const flockEl = getFlockEl();
  flockEl?.addEventListener("input", markDirty, { passive: true });
  ["#pricesEnabled", "#notesEnabled", "#altEnabled"].forEach((sel) => {
    const el = document.querySelector(sel);
    if (el) el.addEventListener("change", markDirty, { passive: true });
  });

  // Alternative feed toggle (init + live)
  if (altEnabled && altBox) {
    altBox.hidden = !altEnabled.checked; // initialize on load
    altEnabled.addEventListener("change", () => {
      altBox.hidden = !altEnabled.checked;
    });
  }
  // Feed prices panel (closed by default)
  if (pricesEnabled && pricesBox) {
    pricesBox.hidden = !pricesEnabled.checked; // unchecked => hidden
    pricesEnabled.addEventListener("change", () => {
      pricesBox.hidden = !pricesEnabled.checked;
    });
  }

  // Wire Poultry Logger Save button (if present)
  (function wireLoggerSave() {
    const btn = document.getElementById("loggerSaveBtn");
    if (!btn) return;
    if (btn.__wired) return;
    btn.__wired = true;
    btn.addEventListener("click", () => {
      const d = collectInputs();
      const snapshot = {
        fcr: d.fcr,
        cpe: d.cpe,
        layRate: d.layRate,
        eggs: d.eggs,
        feedPerEggG: d.feedPerEggG,
      };
      const result = LoggerCore.saveEntry({ flock: d.flock, snapshot });
      const payload = {
        ...d,
        loggerSaved: !!result.saved,
        loggerVisitIndex: result.visitIndex || null,
        loggerWarning: result.warning || null,
      };
      try {
        window.dispatchEvent(
          new CustomEvent("metrics:updated", { detail: payload })
        );
      } catch (_) {}

      // After success, update the local session note with a friendly message.
      if (result && result.saved === true) {
        try {
          const store = LoggerCore.load && LoggerCore.load();
          const today = LoggerCore.todayKey();
          const todayBucket = (store && store[today]) || {};
          const count = Object.keys(todayBucket).length;
          const flockName = result.flock || d.flock || "Unnamed";
          const el = document.getElementById("sessionNote");
          if (el) {
            el.textContent = `You have logged and saved ${count} flocks today, the last one was "${flockName}". Don’t forget to export!`;
            el.hidden = false;
            // Match the green styling used for loggerSaved banners
            el.style.background = "#e6ffe6";
            el.style.color = "#225c22";
          }
        } catch (_) {}
        // Refresh Save button appearance after a save
        try {
          updateSaveButtonState({ flock: d.flock || "" });
        } catch (_) {}
      }
    });
  })();
  // Initialize Save button state once on load
  try {
    updateSaveButtonState({ flock: getFlockNameTrimmed() });
  } catch (_) {}
}

function onPrint(e) {
  e?.preventDefault?.();
  if (resultsBox.hidden) {
    alert("Calculate first, then Print.");
    return;
  }
  window.focus();
  window.print();
}

function updateUnitLabels(units) {
  updatePlaceholders(units); // no more tiny unit notes
}

function validate() {
  const issues = [];
  const birds = +inputs.birdCount.value || 0;
  const eggs = +inputs.eggCount.value || 0;

  if (birds < 1) issues.push("Bird count must be at least 1.");
  if (eggs < 0) issues.push("Egg count cannot be negative.");

  const avgEggW = +inputs.avgEggWeight.value || 0;
  if (currentUnits() === "imperial") {
    if (avgEggW < 1.2 || avgEggW > 3.0)
      issues.push("Avg egg weight looks unusual for oz (typical ~2.1).");
  } else {
    if (avgEggW < 40 || avgEggW > 80)
      issues.push("Avg egg weight looks unusual for grams (typical ~60).");
  }

  const feed = +inputs.feedConsumed.value || 0;
  if (feed <= 0) issues.push("Enter total feed consumed for the period.");

  if (altEnabled && altEnabled.checked) {
    const altAmt = +altAmount.value || 0;
    const altPrice =
      altPricePerUnit.value === "" ? null : +altPricePerUnit.value;
    if (altAmt < 0) issues.push("Alt feed amount cannot be negative.");
    if (altAmt > feed)
      issues.push("Alt feed amount cannot exceed total feed consumed.");
    if (altPrice != null && altPrice < 0)
      issues.push("Alt feed price cannot be negative.");
  }

  showIssues(issues);
  return issues.length === 0;
}

function showIssues(list) {
  if (!list.length) {
    issuesEl.hidden = true;
    issuesEl.innerHTML = "";
    return;
  }
  issuesEl.hidden = false;
  issuesEl.innerHTML =
    "<ul>" + list.map((li) => `<li>${li}</li>`).join("") + "</ul>";
}

function buildInputSummary(units, birds, eggs) {
  const unitEggW = units === "imperial" ? "oz" : "g";
  const unitFeed = units === "imperial" ? "lb" : "kg";

  const rows = [
    // Flock row only if provided
    ...(getFlockNameTrimmed() ? [["Flock", getFlockNameTrimmed()]] : []),

    ["Units", units === "imperial" ? "Imperial" : "Metric"],
    ["Birds", birds],
    ["Eggs", eggs],
    ["Avg egg weight", `${inputs.avgEggWeight.value || "—"} ${unitEggW}`],
    ["Feed consumed", `${inputs.feedConsumed.value || "—"} ${unitFeed}`],
  ];

  if ((+inputs.bagWeight.value || 0) > 0) {
    rows.push(["Bag weight", `${inputs.bagWeight.value} ${unitFeed}`]);
  }
  if ((+inputs.bagPrice.value || 0) > 0) {
    rows.push(["Bag price", `$${(+inputs.bagPrice.value).toFixed(2)}`]);
  }
  if ((inputs.notes.value || "").trim()) {
    rows.push(["Notes", inputs.notes.value.trim()]);
  }

  if (!inputSummary) return; // Add this guard
  inputSummary.innerHTML = rows
    .map(
      ([k, v]) =>
        `<div class="row"><span class="k">${esc(k)}</span><span class="v">${esc(
          v
        )}</span></div>`
    )
    .join("");
}

function collectWarnings({ layRate, feedPerBird_g }) {
  const warns = [];
  if (feedPerBird_g != null) {
    if (feedPerBird_g < 80)
      warns.push(
        "Feed per bird appears very low (<80 g/day). Check feeder access, crowding, or health."
      );
    if (feedPerBird_g > 150)
      warns.push(
        "Feed per bird appears very high (>150 g/day). Check spillage, pests, ration energy, or temperature."
      );
  }
  if (layRate != null && layRate < 40) {
    warns.push(
      "Lay rate under 40% is low for mature in-lay hens. Review lighting (12–14 h), nutrition, and parasites."
    );
  }
  return warns;
}

function onCalculate() {
  if (!validate()) return;

  const units = currentUnits();
  const birds = +inputs.birdCount.value || 0;
  const eggs = +inputs.eggCount.value || 0;

  // Safety: ensure reasonable defaults for bag weight/price even if Feed prices UI is off
  // Only fill if empty; respects user-entered values.
  try {
    const hasW = inputs.bagWeight.value !== "";
    const hasP = inputs.bagPrice.value !== "";
    if (!hasW || !hasP) {
      if (units === "imperial") {
        if (!hasW) inputs.bagWeight.value = DEF_BAG_LB;
        if (!hasP)
          inputs.bagPrice.value = (DEF_BAG_LB * AVG_PRICE_PER_LB).toFixed(2);
      } else {
        if (!hasW) inputs.bagWeight.value = DEF_BAG_KG;
        if (!hasP)
          inputs.bagPrice.value = (DEF_BAG_KG * AVG_PRICE_PER_KG).toFixed(2);
      }
    }
  } catch (_) {}

  buildInputSummary(units, birds, eggs);

  const metric = toMetricUnits(units, {
    feedConsumed: inputs.feedConsumed.value,
    avgEggWeight: inputs.avgEggWeight.value,
    bagWeight: inputs.bagWeight.value,
    altAmount: altEnabled && altEnabled.checked ? altAmount.value : 0,
    altPricePerUnit:
      altEnabled && altEnabled.checked ? altPricePerUnit.value : "",
  });

  // core calcs
  const { fcr, eggMassKg, feedPerEggG } = computeFcr({
    feedConsumedKg: metric.feedConsumedKg,
    eggCount: eggs,
    avgEggWeightG: metric.avgEggWeightG,
  });

  const cpe = computeCostPerEgg({
    bagPrice: inputs.bagPrice.value,
    bagWeightKg: metric.bagWeightKg,
    eggCount: eggs,
    feedConsumedKg: metric.feedConsumedKg,
  });

  // alt-feed scenario (compute first, display later)
  const { costPerEggAlt, savingsTotal, altSharePct } = computeAltCostScenario({
    feedConsumedKg: metric.feedConsumedKg,
    eggCount: eggs,
    bagPrice: inputs.bagPrice.value,
    bagWeightKg: metric.bagWeightKg,
    altAmountKg: metric.altAmountKg,
    altPricePerKg: metric.altPricePerKg,
  });

  // Present (safe setters)
  setText(fcrValue, fcr != null && isFinite(fcr) ? fcr.toFixed(2) : "—");
  setText(
    feedPerEgg,
    feedPerEggG != null && isFinite(feedPerEggG)
      ? `${feedPerEggG.toFixed(0)} g`
      : "—"
  );
  setText(costPerEgg, cpe || cpe === 0 ? `$${cpe.toFixed(3)}` : "—");

  const perf = performanceForFcr(fcr) || {};
  setText(ratingEl, perf.label || "—");

  // ----- Show/hide tiles based on toggles -----
  const pricesOn = !!(pricesEnabled && pricesEnabled.checked);
  const altOn = !!(altEnabled && altEnabled.checked);

  // Cost tiles (baseline) depend on Feed prices
  if (tileCostPerEgg) tileCostPerEgg.hidden = !pricesOn;
  if (tileCostPerDozen) tileCostPerDozen.hidden = !pricesOn;

  // Feed savings (default grid) depends on Alt feed
  if (tileFeedSavings) tileFeedSavings.hidden = !altOn;

  // Expanded alt-dependent tiles
  if (tileCostPerEggAlt) tileCostPerEggAlt.hidden = !altOn;
  if (tileAltShare) tileAltShare.hidden = !altOn;

  // ---- Extra metrics (lay rate, feed/bird, cost/dozen) ----
  const layRate = computeLayRate(eggs, birds);
  const feedPerBird_g = computeFeedPerBirdG(metric.feedConsumedKg, birds);
  const cpd = costPerDozen(cpe);

  // Hide/show cost tiles depending on Feed prices toggle
  const costEggTile = costPerEgg?.closest(".metric");
  const costDozenTile = costPerDozenEl?.closest(".metric");
  if (pricesEnabled && !pricesEnabled.checked) {
    if (costEggTile) costEggTile.hidden = true;
    if (costDozenTile) costDozenTile.hidden = true;
  } else {
    if (costEggTile) costEggTile.hidden = false;
    if (costDozenTile) costDozenTile.hidden = false;
  }

  setText(
    layRateEl,
    layRate != null && isFinite(layRate) ? `${layRate.toFixed(0)}%` : "—"
  );
  setText(
    feedPerBirdEl,
    feedPerBird_g != null && isFinite(feedPerBird_g)
      ? `${feedPerBird_g.toFixed(0)} g`
      : "—"
  );
  setText(costPerDozenEl, cpd || cpd === 0 ? `$${cpd.toFixed(2)}` : "—");

  // ---- Color the tiles by band ----
  setTileBand(tileFcr, bandFcr(fcr));
  setTileBand(tilePerf, bandFcr(fcr)); // performance mirrors FCR
  setTileBand(tileLay, bandLay(layRate));
  setTileBand(tileFeedBird, bandFeedPerBird(feedPerBird_g));
  // Save for popovers
  lastMetrics = {
    fcr,
    layRate,
    feedPerBird_g,
    cpe, // cost per egg
    cpd, // cost per dozen
    bands: {
      fcr: bandFcr(fcr),
      lay: bandLay(layRate),
      feedPerBird: bandFeedPerBird(feedPerBird_g),
    },
  };

  // ---- New results card bodies (content-only render) ----
  try {
    const eggonomicsBody = document.getElementById("card-eggonomics");
    if (eggonomicsBody) {
      const pEgg = cpe;
      const pDozen = typeof cpe === "number" ? cpe * 12 : null;
      const stats = eggonomicsBody.querySelector("#card-eggonomics-stats");
      if (stats) {
        const dozenMarkup =
          pDozen || pDozen === 0
            ? `<span class="num">$${pDozen.toFixed(
                2
              )}</span> <span class="unit">/ dozen</span>`
            : "—";
        const eggMarkup =
          pEgg || pEgg === 0
            ? `<span class="num">$${pEgg.toFixed(
                3
              )}</span> <span class="unit">per egg</span>`
            : "—";
        stats.innerHTML = `<div class="stat-primary">${dozenMarkup}</div>
        <div class="stat-secondary">${eggMarkup}</div>`;
      }

      // Hide legacy fields in this card to avoid duplicate displays
      const legacyCostEgg = eggonomicsBody.querySelector("#aCostEgg");
      if (legacyCostEgg) legacyCostEgg.hidden = true;
      const legacyCpdRow = eggonomicsBody
        .querySelector("#aCostPerDozen")
        ?.closest(".metricRow");
      if (legacyCpdRow) legacyCpdRow.hidden = true;
    }

    const henEggBody = document.getElementById("card-hen-eggput");
    if (henEggBody) {
      const fcrText = fcr != null && isFinite(fcr) ? fcr.toFixed(2) : "—";
      const stats = henEggBody.querySelector("#card-hen-eggput-stats");
      if (stats) {
        stats.innerHTML = `<div class="stat-primary"><span class="stat-chip">FCR ${fcrText}</span></div>
        <div class="stat-secondary">Feed Conversion Ratio (kg feed per kg egg mass)</div>`;
      }
    }
  } catch {}

  // On successful Cluckulate: mark clean and remember flock snapshot
  try {
    window.__state.needsRecalc = false;
    window.__state.lastCalcFlock = getFlockNameTrimmed();
  } catch {}
  // Broadcast metrics for the analytics cards
  try {
    window.dispatchEvent(
      new CustomEvent("metrics:updated", {
        detail: {
          units, // "metric" | "imperial"
          flockSize: birds,
          eggs, // total eggs in the session if available
          avgEggWeightG: (metric && metric.avgEggWeightG) ?? null,
          feedConsumedKg: (metric && metric.feedConsumedKg) ?? null,
          bagWeightKg: (metric && metric.bagWeightKg) ?? null,
          bagPrice: Number(
            (inputs && inputs.bagPrice && inputs.bagPrice.value) || 0
          ),
          // core computed outputs (already in scope above)
          fcr,
          feedPerEggG: typeof feedPerEggG !== "undefined" ? feedPerEggG : null,
          layRate,
          feedPerBird_g,
          cpe, // $/egg
          cpd, // $/dozen
          // optional alt-scenario if present in this file
          alt:
            typeof costPerEggAlt !== "undefined" ||
            typeof savingsTotal !== "undefined" ||
            typeof altSharePct !== "undefined"
              ? {
                  costPerEggAlt:
                    typeof costPerEggAlt !== "undefined" ? costPerEggAlt : null,
                  savingsTotal:
                    typeof savingsTotal !== "undefined" ? savingsTotal : null,
                  altSharePct:
                    typeof altSharePct !== "undefined" ? altSharePct : null,
                }
              : null,
        },
      })
    );
  } catch {}

  // Tint "i" buttons red if attention warranted
  const infoFcr = tileFcr?.querySelector(".info");

  // After analytics picks up the event and publishes __state.latest,
  // schedule a microtask to refresh Save button state
  queueMicrotask(() => {
    try {
      const latest = window.__state?.latest?.inputs || {};
      const merged = {
        ...latest,
        flock: getFlockNameTrimmed() || latest.flock || "",
      };
      updateSaveButtonState(merged);
    } catch (_) {}
  });
  const infoLay = tileLay?.querySelector(".info");
  const infoBird = tileFeedBird?.querySelector(".info");
  infoFcr?.classList.toggle(
    "info--alert",
    lastMetrics.bands.fcr === "watch" || lastMetrics.bands.fcr === "poor"
  );
  infoLay?.classList.toggle(
    "info--alert",
    lastMetrics.bands.lay === "watch" || lastMetrics.bands.lay === "poor"
  );
  infoBird?.classList.toggle(
    "info--alert",
    lastMetrics.bands.feedPerBird === "watch" ||
      lastMetrics.bands.feedPerBird === "poor"
  );

  // ---- Alternative feed tiles ----
  setText(
    costPerEggAltEl,
    typeof costPerEggAlt !== "undefined" &&
      (costPerEggAlt || costPerEggAlt === 0)
      ? `$${costPerEggAlt.toFixed(3)}`
      : "—"
  );
  setText(
    feedSavingsEl,
    typeof savingsTotal !== "undefined" && (savingsTotal || savingsTotal === 0)
      ? `$${savingsTotal.toFixed(2)}`
      : "—"
  );
  setText(
    altShareEl,
    typeof altSharePct !== "undefined" && (altSharePct || altSharePct === 0)
      ? `${altSharePct.toFixed(0)}%`
      : "—"
  );

  resultsBox.hidden = false;
  applyMoreDefaultForViewport(); // collapse on mobile, expand on desktop (unless user toggled)

  // After metrics dispatch, guide focus to the actions row with a slight delay
  try {
    window.__ui?.scrollActionsIntoView({ delay: 800, duration: 450 });
  } catch {}

  // spillover guidance
  const ratio = birds > 0 ? eggs / birds : 0;
  if (ratio > 1.3) {
    alert(
      "Heads up: eggs are more than 130% of bird count. Double-check values; enter average eggs collected per day."
    );
  }

  // Save row + message
  const row = {
    timestamp: new Date().toISOString(),
    flock: getFlockNameTrimmed(),
    units,
    birdCount: birds,
    eggCount: eggs,
    avgEggWeight_input: +inputs.avgEggWeight.value || 0,
    feedConsumed_input: +inputs.feedConsumed.value || 0,
    eggWeight_g: metric.avgEggWeightG,
    feedConsumed_kg: metric.feedConsumedKg,
    eggMass_kg: eggMassKg || 0,
    fcr: fcr ?? "",
    feedPerEgg_g: feedPerEggG ?? "",
    costPerEgg_usd: cpe || cpe === 0 ? +cpe.toFixed(4) : "",
    bagWeight_input: +inputs.bagWeight.value || "",
    bagPrice_usd: +inputs.bagPrice.value || "",
    notes: (inputs.notes?.value || "").replace(/\s+/g, " ").trim(),
  };
  // No longer recording session rows on Calculate; Save handles logging.
}

function refreshSessionCounter() {
  const n = sessionData.calcs.length;
  sessionCounter.textContent = n ? `Session calculations: ${n}` : "";
}

function exportSessionCsv() {
  // Export today's logs from LoggerCore store
  const store = (LoggerCore.load && LoggerCore.load()) || {};
  const today = LoggerCore.todayKey();
  const bucket = store[today] || {};
  const flocks = Object.keys(bucket);
  if (!flocks.length) {
    alert(
      "No saved logs for today yet. Click Save after entering a flock name."
    );
    return;
  }

  // Define CSV columns (stable order)
  const header = [
    "date",
    "flock",
    "timestamp_ms",
    "fcr",
    "cpe",
    "layRate",
    "eggs",
    "feedPerEggG",
  ];

  const rows = [];
  flocks.forEach((name) => {
    const entry = bucket[name] || {};
    const s = entry.snapshot || {};
    rows.push({
      date: today,
      flock: name,
      timestamp_ms: entry.at || "",
      fcr: s.fcr ?? "",
      cpe: s.cpe ?? "",
      layRate: s.layRate ?? "",
      eggs: s.eggs ?? "",
      feedPerEggG: s.feedPerEggG ?? "",
    });
  });

  // Harden values and build CSV (with BOM and CRLF)
  const escapeVal = (v) => {
    if (v == null) return "";
    let s = String(v);
    // Excel formula injection guard
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = ["\uFEFF" + header.join(",")];
  rows.forEach((r) => {
    lines.push(header.map((k) => escapeVal(r[k])).join(","));
  });
  const content = lines.join("\r\n");

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cluckulator_logs_${today}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  // flash Export confirmation (light success tint)
  try {
    const exportBtnEl = document.querySelector("#btnExportSession, #exportBtn");
    window.__ui?.swapBtnState(exportBtnEl, {
      text: "All logs exported ✅",
      addClass: "btn-flash--white",
      duration: 3000,
    });
  } catch (_) {}
}
// SETTINGS TOGGLE (footer cog)
document.addEventListener("click", (e) => {
  const btn = e.target.closest('[data-action="toggle-settings"]');
  if (!btn) return;
  const card = document.querySelector("#settingsCard");
  if (card) card.toggleAttribute("hidden");
});
/* boot once DOM is ready */
// Persist unit toggle (localStorage) and restore on load
function initUnitPersistence() {
  const LS_KEY = "cluck.units"; // value: 'imperial' or 'metric'
  const imperial = document.querySelector(
    'input[name="units"][value="imperial"]'
  );
  const metric = document.querySelector('input[name="units"][value="metric"]');

  // Apply stored value on boot
  try {
    const stored = localStorage.getItem(LS_KEY);
    if ((stored === "imperial" || stored === "metric") && imperial && metric) {
      if (stored === "imperial") imperial.checked = true;
      if (stored === "metric") metric.checked = true;
      // ensure UI updates
      imperial.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } catch {}

  // Save on change (without duplicating onUnitsChange wiring above)
  function persist(value) {
    if (!value) return;
    try {
      localStorage.setItem(LS_KEY, value);
    } catch {}
    // changing units affects math → mark dirty so user re‑Cluckulates
    markDirty();
  }
  imperial?.addEventListener(
    "change",
    () => imperial.checked && persist("imperial")
  );
  metric?.addEventListener("change", () => metric.checked && persist("metric"));
}

function boot() {
  initUnitPersistence();
  setDefaultValues(currentUnits()); // sets labels + placeholders
  applyMoreDefaultForViewport();
  autoFocusFirstField && autoFocusFirstField();
}
if (document.readyState !== "loading") {
  boot();
} else {
  document.addEventListener("DOMContentLoaded", boot);
}

function saveEntry(today, flock, payload) {
  const logger = readLogger();
  if (!logger.byDay) logger.byDay = {};
  if (!logger.byDay[today]) logger.byDay[today] = {};
  if (!logger.byDay[today][flock]) {
    logger.visitCounter = (logger.visitCounter || 0) + 1;
    payload.loggerVisitIndex = logger.visitCounter;
    logger.byDay[today][flock] = payload;
    writeLogger(logger);
    return logger.visitCounter;
  }
  return null;
}

// QA helper: listen once for the next metrics update (dev only, no behavior change)
if (!window.__tapOnce) {
  window.__tapOnce = (() => {
    let live = false;
    return () => {
      if (live) return "already listening";
      live = true;
      const fn = (e) => {
        console.log("metrics:updated →", e.detail);
      };
      window.addEventListener("metrics:updated", fn, { once: true });
      return "listening… now click Cluckulate or Save";
    };
  })();
}
