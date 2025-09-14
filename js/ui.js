import {
  toMetricUnits,
  computeFcr,
  computeCostPerEgg,
  // the next three are optional; safe if you didn't add their tiles:
  computeLayRate,
  computeFeedPerBirdG,
  costPerDozen,
} from "./compute.js";
import { performanceForFcr } from "./performance.js";

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

const eggWeightUnit = byId("eggWeightUnit");
const feedConsumedUnit = byId("feedConsumedUnit");
const bagWeightUnit = byId("bagWeightUnit");

/* ---------------- Startup ---------------- */
setDefaultValues("imperial");
attachListeners();
refreshSessionCounter();

/* ---------------- Functions ---------------- */
function setDefaultValues(units) {
  if (units === "imperial") {
    inputs.avgEggWeight.value = 2.1; // oz
    inputs.feedConsumed.value = 26.5; // lb
    inputs.bagWeight.value = 50; // lb
  } else {
    inputs.avgEggWeight.value = 60; // g
    inputs.feedConsumed.value = 12; // kg
    inputs.bagWeight.value = 25; // kg
  }
  updateUnitLabels(units);
}

function attachListeners() {
  const calcBtn = byId("btnCalc");
  const exportBtn = byId("btnExportSession");
  const printBtn = byId("btnPrint");

  if (calcBtn) calcBtn.addEventListener("click", onCalculate);
  if (exportBtn) exportBtn.addEventListener("click", exportSessionCsv);
  unitRadios.forEach((r) => r.addEventListener("change", onUnitsChange));
  if (printBtn) printBtn.addEventListener("click", onPrint);
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

function onUnitsChange() {
  updateUnitLabels(currentUnits());
}

function updateUnitLabels(units) {
  eggWeightUnit.textContent =
    units === "imperial" ? "oz (default 2.1)" : "g (default 60)";
  feedConsumedUnit.textContent = units === "imperial" ? "lb" : "kg";
  bagWeightUnit.textContent = units === "imperial" ? "lb" : "kg";
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
    ["Flock", inputs.flockName.value || "—"],
    ["Units", units === "imperial" ? "Imperial" : "Metric"],
    ["Birds", birds],
    ["Eggs", eggs],
    ["Avg egg weight", `${inputs.avgEggWeight.value || "—"} ${unitEggW}`],
    ["Feed consumed", `${inputs.feedConsumed.value || "—"} ${unitFeed}`],
  ];
  if ((+inputs.bagWeight.value || 0) > 0)
    rows.push(["Bag weight", `${inputs.bagWeight.value} ${unitFeed}`]);
  if ((+inputs.bagPrice.value || 0) > 0)
    rows.push(["Bag price", `$${(+inputs.bagPrice.value).toFixed(2)}`]);
  if ((inputs.notes.value || "").trim())
    rows.push(["Notes", inputs.notes.value.trim()]);

  inputSummary.innerHTML = rows
    .map(
      ([k, v]) =>
        `<div class="row"><span class="k">${esc(k)}</span><span class="v">${esc(
          v
        )}</span></div>`
    )
    .join("");
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
  });

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

  // Present
  fcrValue.textContent = fcr ? fcr.toFixed(2) : "—";
  feedPerEgg.textContent = feedPerEggG ? `${feedPerEggG.toFixed(0)} g` : "—";
  costPerEgg.textContent = cpe || cpe === 0 ? `$${cpe.toFixed(3)}` : "—";

  const perf = performanceForFcr(fcr);
  ratingEl.textContent = perf.label;

  // Optional tiles (render only if present)
  try {
    if (typeof computeLayRate === "function" && layRateEl) {
      const layRate = computeLayRate(eggs, birds);
      layRateEl.textContent =
        layRate || layRate === 0 ? `${layRate.toFixed(0)}%` : "—";
    }
    if (typeof computeFeedPerBirdG === "function" && feedPerBirdEl) {
      const feedPerBird_g = computeFeedPerBirdG(metric.feedConsumedKg, birds);
      feedPerBirdEl.textContent =
        feedPerBird_g || feedPerBird_g === 0
          ? `${feedPerBird_g.toFixed(0)} g`
          : "—";
    }
    if (typeof costPerDozen === "function" && costPerDozenEl) {
      const cpd = costPerDozen(cpe);
      costPerDozenEl.textContent =
        cpd || cpd === 0 ? `$${cpd.toFixed(2)}` : "—";
    }
  } catch {}

  resultsBox.hidden = false;

  // 130% / 100% guidance (non-blocking)
  const ratio = birds > 0 ? eggs / birds : 0;
  if (ratio > 1.3) {
    alert(
      "Heads up: eggs are more than 130% of bird count. Double-check values or split across multiple days."
    );
  } else if (ratio > 1.0) {
    sessionNote.hidden = false;
    sessionNote.textContent = `Saved calculation #${
      sessionData.calcs.length + 1
    } for this visit. Note: >100% can occur with multi-day collections.`;
  }

  // Session row
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
    notes: (inputs.notes.value || "").replace(/\s+/g, " ").trim(),
  };
  sessionData.calcs.push(row);
  refreshSessionCounter();
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
      return typeof v === "string" && /[",\n]/.test(v)
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
