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

/* ---------------- Tiny helpers ---------------- */
const $ = (sel) => document.querySelector(sel);
const byId = (id) => document.getElementById(id);
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function autoFocusFirstField() {
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
  const exportBtn = byId("btnExportSession");
  const printBtn = byId("btnPrint");
  // Feed prices toggle
  if (pricesEnabled && pricesBox) {
    pricesBox.hidden = !pricesEnabled.checked;
    if (pricesEnabled.checked) prefillAverageFeedPrice(currentUnits());
    pricesEnabled.addEventListener("change", () => {
      pricesBox.hidden = !pricesEnabled.checked;
      if (pricesEnabled.checked) prefillAverageFeedPrice(currentUnits());
      else {
        inputs.bagWeight.value = "";
        inputs.bagPrice.value = "";
      }
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
    ...(inputs.flockName.value.trim()
      ? [["Flock", inputs.flockName.value.trim()]]
      : []),

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

  // Tint "i" buttons red if attention warranted
  const infoFcr = tileFcr?.querySelector(".info");
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
    flock: (inputs.flockName.value || "").trim(),
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
  sessionData.calcs.push(row);
  refreshSessionCounter();
  const n = sessionData.calcs.length;
  sessionNote.hidden = false;
  sessionNote.textContent = `Saved calculation #${n} for this visit${
    row.flock ? ` (flock: ${row.flock})` : ""
  }.`;
}

function refreshSessionCounter() {
  const n = sessionData.calcs.length;
  sessionCounter.textContent = n ? `Session calculations: ${n}` : "";
}

function exportSessionCsv() {
  if (!sessionData.calcs.length) {
    alert("No calculations this session yet. Do one, then export.");
    return;
  }

  const header = [
    "timestamp",
    "flock",
    "units",
    "birdCount",
    "eggCount",
    "avgEggWeight_input",
    "feedConsumed_input",
    "eggWeight_g",
    "feedConsumed_kg",
    "eggMass_kg",
    "fcr",
    "feedPerEgg_g",
    "costPerEgg_usd",
    "bagWeight_input",
    "bagPrice_usd",
    "notes",
  ];

  const lines = [header.join(",")];
  sessionData.calcs.forEach((r) => {
    const vals = header.map((k) => {
      const v = r[k] ?? "";
      return typeof v === "string" && /[\",\n]/.test(v)
        ? `"${v.replace(/"/g, '""')}"`
        : v;
    });
    lines.push(vals.join(","));
  });

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `fcr_session_${date}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
/* boot once DOM is ready */
function boot() {
  setDefaultValues(currentUnits()); // sets labels + placeholders
  applyMoreDefaultForViewport();
  autoFocusFirstField && autoFocusFirstField();
}
if (document.readyState !== "loading") {
  boot();
} else {
  document.addEventListener("DOMContentLoaded", boot);
}
