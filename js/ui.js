import { toMetricUnits, computeFcr, computeCostPerEgg } from "./compute.js";
import { performanceForFcr } from "./performance.js";

// Session-only memory for return incentive
const sessionData = {
  startTime: Date.now(),
  calcs: [], // push one object per calculation for this visit
};

const $ = (sel) => document.querySelector(sel);
const byId = (id) => document.getElementById(id);

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const unitRadios = document.querySelectorAll('input[name="units"]');
const inputs = {
  flockName: byId("flockName"),
  date: byId("date"),
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

const eggWeightUnit = byId("eggWeightUnit");
const feedConsumedUnit = byId("feedConsumedUnit");
const bagWeightUnit = byId("bagWeightUnit");

byId("btnCalc").addEventListener("click", onCalculate);
byId("btnExportSession").addEventListener("click", exportSessionCsv);
unitRadios.forEach((r) => r.addEventListener("change", onUnitsChange));
const printBtn = byId("btnPrint");
if (printBtn) {
  printBtn.addEventListener("click", onPrint);
}

// Defaults: US-first (imperial)
setDefaultValues("imperial");

function currentUnits() {
  const checked = Array.from(unitRadios).find((r) => r.checked);
  return checked ? checked.value : "imperial";
}

function setDefaultValues(units) {
  const today = new Date().toISOString().slice(0, 10);
  inputs.date.value = today;

  if (units === "imperial") {
    inputs.avgEggWeight.value = 2.1; // oz
    inputs.feedConsumed.value = 26.5; // lb, example
    inputs.bagWeight.value = 50; // lb
  } else {
    inputs.avgEggWeight.value = 60; // g
    inputs.feedConsumed.value = 12; // kg
    inputs.bagWeight.value = 25; // kg
  }
  updateUnitLabels(units);
  refreshSessionCounter();
}

function onUnitsChange() {
  const u = currentUnits();
  updateUnitLabels(u);
  // Do not auto-convert user-entered values to avoid surprise.
  // We keep what they typed; only labels change.
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

  // 130% spillover guidance
  if (birds > 0 && eggs > birds * 1.3) {
    issues.push(
      "Eggs exceed 130% of flock size. If you collected across ~30 hours, that can happen; otherwise, double-check."
    );
  } else if (birds > 0 && eggs > birds) {
    issues.push(
      "Note: >100% suggests yesterday’s eggs were included (spillover)."
    );
  }

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
    ["Date", inputs.date.value || "—"],
    ["Flock", inputs.flockName.value || "—"],
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

  resultsBox.hidden = false;

  // Session hook: remember this calc for CSV export
  const row = {
    timestamp: new Date().toISOString(),
    date: inputs.date.value,
    flock: (inputs.flockName.value || "").trim(),
    units,
    birdCount: birds,
    eggCount: eggs,
    avgEggWeight_input: +inputs.avgEggWeight.value || 0,
    feedConsumed_input: +inputs.feedConsumed.value || 0,
    // metric equivalents
    eggWeight_g: metric.avgEggWeightG,
    feedConsumed_kg: metric.feedConsumedKg,
    // results
    eggMass_kg: eggMassKg || 0,
    fcr: fcr ?? "",
    feedPerEgg_g: feedPerEggG ?? "",
    costPerEgg_usd: cpe || cpe === 0 ? +cpe.toFixed(4) : "",
    // bag context
    bagWeight_input: +inputs.bagWeight.value || "",
    bagPrice_usd: +inputs.bagPrice.value || "",
    // notes
    notes: (inputs.notes.value || "").replace(/\s+/g, " ").trim(),
  };

  sessionData.calcs.push(row);
  sessionNote.hidden = false;
  sessionNote.textContent = `Saved calculation #${
    sessionData.calcs.length
  } for this visit${
    row.flock ? ` (flock: ${row.flock})` : ""
  }. Don’t forget to export before leaving.`;
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
    "date",
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
      // escape commas/quotes in notes etc.
      if (typeof v === "string" && /[",\n]/.test(v)) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
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
function onPrint(e) {
  e?.preventDefault?.();

  // Helpful guard: make sure user calculated first
  if (resultsBox.hidden) {
    alert("Calculate first, then Print.");
    return;
  }

  // Focus the window and print
  window.focus();
  // Breadcrumb for debugging; you’ll see this in Console when you click Print
  console.log("[FCR] print requested");
  window.print();
}

// init
(function init() {
  // already defaulted to imperial in setDefaultValues()
})();
