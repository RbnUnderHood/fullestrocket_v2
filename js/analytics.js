// Farm Analytics: tiny, framework-free overlay that reads existing metrics
// Only the event-listener IIFE remains. No code before or after this point.

(function () {
  // ---- Fun + Facts (helpers) ----
  function dayOfYear(d = new Date()) {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff =
      d - start + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60000;
    return Math.floor(diff / 86400000);
  }
  function strongNum(n, unit = "") {
    if (n == null || Number.isNaN(n)) return "—";
    return `<span class="num">${n}</span>${
      unit ? ` <span class="unit">${unit}</span>` : ""
    }`;
  }

  const EDU_POOL = [
    {
      key: "bagDays",
      line: (N) =>
        `At this rate, a 50 lb feed bag lasts ${strongNum(N, "days")}.`,
      foot: "Assumes current feed rate.",
    },
    {
      key: "cartons",
      line: (N) => `You’ll fill about ${strongNum(N)} egg cartons this month.`,
      foot: "12 eggs per carton.",
    },
    {
      key: "yearDozens",
      line: (N) => `If pace holds, that’s ${strongNum(N)} dozen per year.`,
      foot: "Projection from current lay rate.",
    },
    {
      key: "householdPct",
      line: (N) =>
        `Covers ~${strongNum(N, "%")} of a U.S. household’s yearly eggs.`,
      foot: "Assumes ~750 eggs/household/year.",
    },
    {
      key: "omeletsWeek",
      line: (N) => `This week’s eggs equal ${strongNum(N)} omelets.`,
      foot: "2 eggs per omelet.",
    },
  ];
  const FUN_POOL = [
    {
      key: "cakes",
      line: (N) => `Enough eggs this week for ${strongNum(N)} cakes 🎂.`,
      foot: "3 eggs per cake.",
    },
    {
      key: "childMass",
      line: (N) => `Egg mass ≈ a ${strongNum(N)}-year-old child 🧒.`,
      foot: "Fun equivalence; illustrative only.",
    },
    {
      key: "rabbit",
      line: () => `This week’s egg mass ≈ a rabbit’s weight 🐇.`,
      foot: "Assumes ~2 kg rabbit.",
    },
    {
      key: "breakfasts",
      line: (N) => `Eggs for ${strongNum(N)} full English breakfasts 🍳.`,
      foot: "2 eggs per plate.",
    },
    {
      key: "basketballs",
      line: (N) => `Today’s egg mass ≈ ${strongNum(N)} basketballs 🏀.`,
      foot: "1 ball ≈ 624 g.",
    },
  ];

  function computeFacts(metrics) {
    const out = {};
    const eggsPerDay =
      metrics.eggsPerDay != null
        ? metrics.eggsPerDay
        : metrics.hdp != null && metrics.flockSize != null
        ? (metrics.hdp / 100) * metrics.flockSize
        : metrics.eggs != null
        ? metrics.eggs
        : null;

    const eggsPerWeek = eggsPerDay != null ? eggsPerDay * 7 : null;
    const eggsPerMonth = eggsPerDay != null ? eggsPerDay * 30 : null;
    const dozensPerYear =
      eggsPerDay != null ? Math.round((eggsPerDay * 365) / 12) : null;
    const cartonsPerMonth =
      eggsPerMonth != null ? Math.round(eggsPerMonth / 12) : null;

    // Feed rate
    const feedPerBirdGPerDay =
      metrics.feedPerBirdGPerDay ?? metrics.feedPerBird_g ?? null;
    const feedGPerDay =
      metrics.feedGPerDay != null
        ? metrics.feedGPerDay
        : feedPerBirdGPerDay != null && metrics.flockSize != null
        ? feedPerBirdGPerDay * metrics.flockSize
        : null;
    const lbPerDay = feedGPerDay != null ? feedGPerDay / 453.592 : null;
    const bagDays = lbPerDay ? Math.max(1, Math.round(50 / lbPerDay)) : null;

    // Household coverage
    const eggsPerYear =
      eggsPerDay != null ? Math.round(eggsPerDay * 365) : null;
    const householdPct =
      eggsPerYear != null
        ? Math.min(999, Math.round((eggsPerYear / 750) * 100))
        : null;

    // Fun equivalents
    const omeletsWeek =
      eggsPerWeek != null ? Math.max(0, Math.round(eggsPerWeek / 2)) : null;
    const cakes =
      eggsPerWeek != null ? Math.max(0, Math.round(eggsPerWeek / 3)) : null;

    const gPerEgg = metrics.avgEggWeightG ?? 60;
    const weekEggMassG =
      eggsPerWeek != null ? Math.round(eggsPerWeek * gPerEgg) : null;
    const childYears =
      weekEggMassG != null
        ? Math.max(1, Math.min(12, Math.round(weekEggMassG / 8000)))
        : null;
    const breakfasts =
      eggsPerWeek != null ? Math.max(0, Math.round(eggsPerWeek / 2)) : null;
    const basketballs =
      metrics.eggsToday != null
        ? Math.max(0, Math.round((metrics.eggsToday * gPerEgg) / 624))
        : eggsPerDay != null
        ? Math.max(0, Math.round((eggsPerDay * gPerEgg) / 624))
        : null;

    out.bagDays = bagDays;
    out.cartons = cartonsPerMonth;
    out.yearDozens = dozensPerYear;
    out.householdPct = householdPct;
    out.omeletsWeek = omeletsWeek;

    out.cakes = cakes;
    out.childMass = childYears;
    out.rabbit = weekEggMassG != null ? 1 : null;
    out.breakfasts = breakfasts;
    out.basketballs = basketballs;
    return out;
  }

  function pickDailyPair(facts) {
    const d = dayOfYear();
    const eduIdx = d % EDU_POOL.length;
    const funIdx = d % FUN_POOL.length;
    const edu = EDU_POOL[eduIdx];
    const fun = FUN_POOL[funIdx];
    return { edu, fun, eduVal: facts[edu.key], funVal: facts[fun.key] };
  }

  function renderFunFacts(metrics) {
    const card = document.getElementById("funfactsCard");
    if (!card) return;
    // Respect toggle state
    const toggle = document.getElementById("funfactsToggle");
    const enabled = toggle ? toggle.checked : false;
    if (!enabled) {
      card.hidden = true;
      return;
    }
    const eduLine = document.getElementById("ff-edu-line");
    const funLine = document.getElementById("ff-fun-line");
    const eduFoot = document.getElementById("ff-edu-foot");
    const funFoot = document.getElementById("ff-fun-foot");
    if (!eduLine || !funLine || !eduFoot || !funFoot) return;

    const facts = computeFacts(metrics || {});
    const { edu, fun, eduVal, funVal } = pickDailyPair(facts);
    const hasEdu = eduVal != null && eduVal !== undefined;
    const hasFun = funVal != null && funVal !== undefined;

    if (!hasEdu && !hasFun) {
      eduLine.textContent = "Log today’s feed & eggs to unlock daily facts.";
      eduFoot.textContent = "";
      funLine.textContent = "";
      funFoot.textContent = "";
      card.hidden = false;
      return;
    }
    if (hasEdu) {
      eduLine.innerHTML = edu.line(eduVal);
      eduFoot.textContent = edu.foot || "";
    } else {
      eduLine.textContent = "More data needed.";
      eduFoot.textContent = "";
    }
    if (hasFun) {
      funLine.innerHTML = fun.line(funVal);
      funFoot.textContent = fun.foot || "";
    } else {
      funLine.textContent = "More data needed.";
      funFoot.textContent = "";
    }
    card.hidden = false;
  }
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  // Stage B: math-only core (pure helpers), kept inside the IIFE (no globals except test hooks)
  const MathCore = (() => {
    const KG_TO_LB = 2.2046226218;

    function unitFeedCost(units, bagPrice, bagWeightKg) {
      if (
        !Number.isFinite(bagPrice) ||
        !Number.isFinite(bagWeightKg) ||
        bagPrice <= 0 ||
        bagWeightKg <= 0
      )
        return NaN;
      return units === "imperial"
        ? bagPrice / (bagWeightKg * KG_TO_LB)
        : bagPrice / bagWeightKg;
    }

    function eggsPerBird(layRatePct) {
      return Number.isFinite(layRatePct) ? layRatePct / 100 : NaN;
    }

    function fcrBand(v) {
      if (!Number.isFinite(v)) return null;
      if (v <= 2.1) return "good";
      if (v <= 2.5) return "avg";
      if (v <= 3.0) return "watch";
      return "poor";
    }

    function layBand(v) {
      if (!Number.isFinite(v)) return null;
      if (v >= 80) return "good";
      if (v >= 60) return "avg";
      if (v >= 40) return "watch";
      return "poor";
    }

    function econBand(c) {
      if (!Number.isFinite(c)) return null;
      if (c <= 0.12) return "good";
      if (c <= 0.25) return "avg";
      if (c <= 0.4) return "watch";
      return "poor";
    }

    function scores({ fcr, cpe }) {
      const worstFcr = 3.5;
      const maxCost = 0.5;
      const fcrScore = Number.isFinite(fcr)
        ? clamp01((worstFcr - Math.min(fcr, worstFcr)) / worstFcr)
        : 0;
      const econScore = Number.isFinite(cpe)
        ? clamp01((maxCost - Math.min(cpe, maxCost)) / maxCost)
        : 0;
      return { fcrScore, econScore };
    }

    function derive(d) {
      const unitCost = unitFeedCost(d.units, d.bagPrice, d.bagWeightKg);
      const eggsPerBirdVal = eggsPerBird(d.layRate);
      const bands = {
        fcr: fcrBand(d.fcr),
        lay: layBand(d.layRate),
        econ: econBand(d.cpe),
      };
      const { fcrScore, econScore } = scores({ fcr: d.fcr, cpe: d.cpe });
      return {
        unitCost,
        eggsPerBird: eggsPerBirdVal,
        bands,
        scores: { fcrScore, econScore },
      };
    }

    return {
      version: "stage-b-1",
      derive,
      unitFeedCost,
      eggsPerBird,
      fcrBand,
      layBand,
      econBand,
    };
  })();

  // console-only helpers for QA; do not alter app logic
  if (!MathCore.kgFromLb) MathCore.kgFromLb = (lb) => lb * 0.45359237;
  if (!MathCore.lbFromKg) MathCore.lbFromKg = (kg) => kg * 2.20462262;

  function plausibility(d) {
    const warnings = [];
    const errors = [];

    if (!Number.isFinite(d.layRate)) {
      warnings.push("layRate is missing or not a number");
    } else if (d.layRate < 0 || d.layRate > 100) {
      warnings.push("layRate outside 0–100% range");
    }

    if (Number.isFinite(d.fcr)) {
      if (d.fcr < 1.2) warnings.push("FCR unusually low (<1.2)");
      if (d.fcr > 6) warnings.push("FCR unusually high (>6)");
    }

    if (Number.isFinite(d.avgEggWeightG)) {
      if (d.avgEggWeightG < 35) warnings.push("avgEggWeight very low (<35g)");
      if (d.avgEggWeightG > 80) warnings.push("avgEggWeight very high (>80g)");
    }

    if (Number.isFinite(d.feedPerEggG)) {
      if (d.feedPerEggG < 50)
        warnings.push("feedPerEgg suspiciously low (<50g)");
      if (d.feedPerEggG > 200)
        warnings.push("feedPerEgg suspiciously high (>200g)");
    }

    if (
      (Number.isFinite(d.bagPrice) && d.bagPrice < 0) ||
      (Number.isFinite(d.bagWeightKg) && d.bagWeightKg <= 0)
    ) {
      errors.push("Invalid feed bag price/weight");
    }

    return { warnings, errors };
  }

  window.addEventListener("metrics:updated", (e) => {
    const d = e.detail || {};
    const derived = MathCore.derive(d);
    const {
      units,
      eggs,
      avgEggWeightG,
      bagWeightKg,
      bagPrice,
      fcr,
      feedPerEggG,
      layRate,
      feedPerBird_g,
      cpe,
      cpd,
      alt,
    } = d;

    // Primary headline numbers
    const fcrToShow = Number.isFinite(derived.fcr) ? derived.fcr : fcr;
    setText("aFcr", Number.isFinite(fcrToShow) ? fcrToShow.toFixed(2) : "—");
    const layPct = Number.isFinite(derived.eggsPerBird)
      ? derived.eggsPerBird * 100
      : layRate;
    setText("aLay", Number.isFinite(layPct) ? `${Math.round(layPct)}%` : "—");
    const cpeToShow = Number.isFinite(derived.cpe) ? derived.cpe : cpe;
    setText(
      "aCostEgg",
      Number.isFinite(cpeToShow) ? "$" + cpeToShow.toFixed(3) : "—"
    );

    // Hennput vs Eggput
    setText(
      "aFeedPerEgg",
      Number.isFinite(feedPerEggG) ? `${feedPerEggG.toFixed(0)} g` : "—"
    );
    setText(
      "aFeedPerDozen",
      Number.isFinite(feedPerEggG) ? `${(feedPerEggG * 12).toFixed(0)} g` : "—"
    );
    setText(
      "aFeedPerBird",
      Number.isFinite(feedPerBird_g) ? `${feedPerBird_g.toFixed(0)} g` : "—"
    );

    // Laying power
    const eggsPerBirdOut = Number.isFinite(derived.eggsPerBird)
      ? derived.eggsPerBird
      : Number.isFinite(layRate)
      ? layRate / 100
      : NaN;
    setText(
      "aEggsPerBird",
      Number.isFinite(eggsPerBirdOut) ? eggsPerBirdOut.toFixed(2) : "—"
    );
    setText(
      "aAvgEggW",
      Number.isFinite(avgEggWeightG) ? `${avgEggWeightG.toFixed(0)} g` : "—"
    );
    setText("aEggsCount", Number.isFinite(eggs) ? String(eggs) : "—");

    // Egg-o-nomics
    const cpdToShow = Number.isFinite(derived.cpd) ? derived.cpd : cpd;
    setText(
      "aCostPerDozen",
      Number.isFinite(cpdToShow) ? "$" + cpdToShow.toFixed(2) : "—"
    );
    let unitCost = null;
    if (
      Number.isFinite(bagPrice) &&
      Number.isFinite(bagWeightKg) &&
      bagPrice > 0 &&
      bagWeightKg > 0
    ) {
      const kgToLb = 2.2046226218;
      unitCost =
        units === "imperial"
          ? bagPrice / (bagWeightKg * kgToLb)
          : bagPrice / bagWeightKg;
    }
    setText(
      "aUnitFeedCost",
      Number.isFinite(derived.unitCost || unitCost)
        ? `$${(Number.isFinite(derived.unitCost)
            ? derived.unitCost
            : unitCost
          ).toFixed(2)} / ${units === "imperial" ? "lb" : "kg"}`
        : "—"
    );
    setText(
      "aSavings",
      alt && Number.isFinite(alt.savingsTotal)
        ? `$${alt.savingsTotal.toFixed(2)}`
        : "—"
    );

    // Optional quick notes (if these IDs exist)
    if (document.getElementById("aFcrNote")) {
      setText(
        "aFcrNote",
        Number.isFinite(fcr)
          ? fcr <= 2
            ? "✅ Great efficiency"
            : fcr <= 3
            ? "👍 Solid"
            : "⚠️ Optimize feed"
          : "—"
      );
    }
    if (document.getElementById("aLayNote")) {
      setText(
        "aLayNote",
        Number.isFinite(layRate)
          ? layRate >= 85
            ? "✅ Strong"
            : layRate >= 70
            ? "👍 Average"
            : "⚠️ Low"
          : "—"
      );
    }
    if (document.getElementById("aCostNote")) {
      setText(
        "aCostNote",
        Number.isFinite(cpe)
          ? cpe <= 0.12
            ? "✅ Efficient"
            : cpe <= 0.25
            ? "👍 OK"
            : "⚠️ High cost/egg"
          : "—"
      );
    }

    // Visuals via CSS custom properties
    const worstFcr = 3.5;
    const fcrScoreRaw = Number.isFinite(fcr)
      ? clamp01((worstFcr - Math.min(fcr, worstFcr)) / worstFcr)
      : 0;
    const fcrScore =
      derived && derived.scores && Number.isFinite(derived.scores.fcrScore)
        ? derived.scores.fcrScore
        : fcrScoreRaw;
    const thermo = document.querySelector("#farmAnalytics .a-thermo");
    if (thermo)
      thermo.style.setProperty("--thermo", (fcrScore * 100).toFixed(0) + "%");

    const egg = document.querySelector("#farmAnalytics .pieChart");
    if (egg)
      egg.style.setProperty("--pct", clamp01((Number(layRate) || 0) / 100));

    const maxCost = 0.5; // cap for scoring
    const econScoreRaw = Number.isFinite(cpe)
      ? clamp01((maxCost - Math.min(cpe, maxCost)) / maxCost)
      : 0;
    const econScore =
      derived && derived.scores && Number.isFinite(derived.scores.econScore)
        ? derived.scores.econScore
        : econScoreRaw;
    const coins = document.querySelector("#farmAnalytics .a-coins");
    if (coins)
      coins.style.setProperty("--score", (econScore * 100).toFixed(0) + "%");

    // Color ledger chips by performance bands
    function applyBand(selector, band) {
      const nodes = document.querySelectorAll(selector);
      nodes.forEach((n) => {
        n.classList.remove(
          "metricRow--ok",
          "metricRow--warn",
          "metricRow--neutral"
        );
        n.classList.add(
          band === "good"
            ? "metricRow--ok"
            : band === "avg"
            ? "metricRow--neutral"
            : "metricRow--warn"
        );
      });
    }
    // Hennput/Eggput chips: color by FCR band
    const fcrBand =
      (derived && derived.bands && derived.bands.fcr) ||
      (function (v) {
        if (!Number.isFinite(v)) return null;
        if (v <= 2.1) return "good";
        if (v <= 2.5) return "avg";
        if (v <= 3.0) return "watch";
        return "poor";
      })(fcr);
    if (fcrBand)
      applyBand("#farmAnalytics .a-feed .substats > .metricRow", fcrBand);

    // Laying chips: color by layRate band
    const layBand =
      (derived && derived.bands && derived.bands.lay) ||
      (function (v) {
        if (!Number.isFinite(v)) return null;
        if (v >= 80) return "good";
        if (v >= 60) return "avg";
        if (v >= 40) return "watch";
        return "poor";
      })(layRate);
    if (layBand)
      applyBand("#farmAnalytics .a-laying .substats > .metricRow", layBand);

    // Econ chips: color by cost per egg (cheaper is better)
    const econBand =
      (derived && derived.bands && derived.bands.econ) ||
      (function (c) {
        if (!Number.isFinite(c)) return null;
        if (c <= 0.12) return "good";
        if (c <= 0.25) return "avg";
        if (c <= 0.4) return "watch";
        return "poor";
      })(cpe);
    if (econBand)
      applyBand("#farmAnalytics .a-econ .substats > .metricRow", econBand);

    // ---- Fun + Facts (daily) ----
    try {
      // Initialize Fun + Facts toggle once
      const t = document.getElementById("funfactsToggle");
      if (t && !t.__wired) {
        const saved = localStorage.getItem("ff_enabled");
        const isOn = saved === "1"; // default OFF if missing
        t.checked = isOn;
        t.addEventListener("change", () => {
          localStorage.setItem("ff_enabled", t.checked ? "1" : "0");
          const card = document.getElementById("funfactsCard");
          if (card) card.hidden = !t.checked;
          // re-render facts if turning on
          if (t.checked) {
            try {
              const metrics = {
                eggs: d.eggs,
                avgEggWeightG: d.avgEggWeightG,
                hdp: d.layRate,
                flockSize: d.flockSize,
                feedPerBird_g: d.feedPerBird_g,
              };
              renderFunFacts(metrics);
            } catch (_) {}
          }
        });
        t.__wired = true;
      }
      const metrics = {
        eggs: d.eggs,
        avgEggWeightG: d.avgEggWeightG,
        hdp: d.layRate,
        flockSize: d.flockSize,
        feedPerBird_g: d.feedPerBird_g,
      };
      renderFunFacts(metrics);
    } catch (_) {}

    // ---- Poultry Logger banners ----
    let banner = "";
    if (d.loggerSaved === true && d.loggerVisitIndex) {
      const name = d.flock ? `"${d.flock}"` : "this flock";
      banner = `Saved calculation #${d.loggerVisitIndex} for this visit (Logger entry: ${name})`;
    } else if (d.loggerWarning && d.loggerWarning.type === "duplicate_today") {
      banner = `Already logged flock "${d.loggerWarning.flock}" today. Only one entry per flock per day.`;
    } else if (d.loggerWarning && d.loggerWarning.type === "missing_flock") {
      banner = "Please enter a flock name before saving.";
    }
    const sessionNote = document.getElementById("sessionNote");
    if (sessionNote) {
      if (banner) {
        sessionNote.textContent = banner;
        sessionNote.hidden = false;
        sessionNote.style.background = d.loggerSaved ? "#e6ffe6" : "#fffbe6";
        sessionNote.style.color = d.loggerSaved ? "#225c22" : "#8a5c00";
        // flash Save button confirmation on successful save (no new listeners)
        if (d.loggerSaved) {
          try {
            const btn = document.getElementById("loggerSaveBtn");
            window.__ui?.swapBtnState(btn, {
              text: "Saved! ✔️",
              addClass: "btn-flash--ok",
            });
            // window.__ui.playUiSound('save'); // reserved for later
          } catch (_) {}
        }
      } else {
        sessionNote.textContent = "";
        sessionNote.hidden = true;
        sessionNote.style.background = "";
        sessionNote.style.color = "";
      }
    }

    // Stage B test hooks (no DOM writes): expose math core + latest snapshot
    try {
      const checks = plausibility({ ...d, ...derived });
      // Publish stable hooks for console QA
      window.__math =
        window.__math || Object.freeze({ MathCore, plausibility });
      window.__state = window.__state || {};
      window.__state.latest = { inputs: d, derived, checks };
      if (console && typeof console.debug === "function") {
        console.debug("[FarmAnalytics][StageB]", { derived, checks });
      }
    } catch (err) {
      // Swallow errors to avoid impacting UI; diagnostics only
      if (console && typeof console.debug === "function") {
        console.debug("[FarmAnalytics][StageB:error]", err);
      }
    }
  });
})();
