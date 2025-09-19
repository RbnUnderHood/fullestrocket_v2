// Farm Analytics: tiny, framework-free overlay that reads existing metrics
(function () {
  function parseNumber(text) {
    if (!text) return null;
    const m = String(text)
      .replace(/,/g, "")
      .match(/[0-9]+(?:\.[0-9]+)?/);
    return m ? Number(m[0]) : null;
  }

  function findMetricValue(labelIncludes) {
    const tiles = document.querySelectorAll(
      "#metricsGrid .metric, #moreMetrics .metric"
    );

    for (const tile of tiles) {
      const lab = tile.querySelector(".metric__label");
      const val = tile.querySelector(".metric__value");
      if (!lab || !val) continue;
      if (lab.textContent.toLowerCase().includes(labelIncludes.toLowerCase())) {
        return parseNumber(val.textContent);
      }
    }
    return null;
  }

  function renderAnalyticsStrip() {
    const fcr = findMetricValue("FCR") ?? null;
    const lay = findMetricValue("Lay rate") ?? null; // %
    const cost = findMetricValue("Cost per egg") ?? null; // dollars

    // Texts
    const aFcr = document.getElementById("aFcr");
    if (aFcr) aFcr.textContent = fcr ? fcr.toFixed(2) : "—";

    const aLay = document.getElementById("aLay");
    if (aLay) aLay.textContent = lay ? lay.toFixed(0) + "%" : "—";

    const aCost = document.getElementById("aCostEgg");
    if (aCost) aCost.textContent = cost ? "$" + cost.toFixed(3) : "—";

    // Notes
    const aFcrNote = document.getElementById("aFcrNote");
    if (aFcrNote)
      aFcrNote.textContent = fcr
        ? fcr <= 2
          ? "✅ Great efficiency"
          : fcr <= 3
          ? "👍 Solid"
          : "⚠️ Feed optimization needed"
        : "—";

    const aLayNote = document.getElementById("aLayNote");
    if (aLayNote)
      aLayNote.textContent = lay
        ? lay >= 90
          ? "✅ Happy hens!"
          : lay >= 70
          ? "🙂 Keep it up"
          : "⚠️ Check stress & feed"
        : "—";

    const aCostNote = document.getElementById("aCostNote");
    if (aCostNote)
      aCostNote.textContent = cost
        ? cost <= 0.2
          ? "✅ Low cost"
          : cost <= 0.35
          ? "💡 Cost-aware"
          : "💸 Cost cutting time"
        : "—";

    // Visuals via CSS Vars
    // FCR thermometer (lower better; clamp at 3.5)
    const worstFcr = 3.5;
    const fcrScore =
      fcr == null
        ? 0
        : Math.max(
            0,
            Math.min(1, (worstFcr - Math.min(fcr, worstFcr)) / worstFcr)
          );
    const thermo = document.querySelector("#farmAnalytics .a-thermo");
    if (thermo)
      thermo.style.setProperty("--thermo", (fcrScore * 100).toFixed(0) + "%");

    // Egg ring 0..1
    const egg = document.querySelector("#farmAnalytics .pieChart");
    if (egg)
      egg.style.setProperty(
        "--pct",
        Math.max(0, Math.min(1, (lay || 0) / 100))
      );

    // Coins score (cheaper better; clamp at $0.50/egg)
    const maxCost = 0.5;
    const econScore =
      cost == null
        ? 0
        : Math.max(
            0,
            Math.min(1, (maxCost - Math.min(cost, maxCost)) / maxCost)
          );
    const coins = document.querySelector("#farmAnalytics .a-coins");
    if (coins)
      coins.style.setProperty("--score", (econScore * 100).toFixed(0) + "%");
  }

  // Observe metrics grid for changes, and render on load
  function attachObserver() {
    const grid = document.getElementById("metricsGrid");
    if (!grid) {
      setTimeout(attachObserver, 200);
      return;
    }
    const obs = new MutationObserver(renderAnalyticsStrip);
    obs.observe(grid, { childList: true, subtree: true, characterData: true });
    renderAnalyticsStrip();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachObserver);
  } else {
    attachObserver();
  }
})();

(function () {
  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  window.addEventListener("metrics:updated", (e) => {
    const d = e.detail || {};
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
    setText("aFcr", Number.isFinite(fcr) ? fcr.toFixed(2) : "—");
    setText("aLay", Number.isFinite(layRate) ? Math.round(layRate) + "%" : "—");
    setText("aCostEgg", Number.isFinite(cpe) ? "$" + cpe.toFixed(3) : "—");

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
    setText(
      "aEggsPerBird",
      Number.isFinite(layRate) ? (layRate / 100).toFixed(2) : "—"
    );
    setText(
      "aAvgEggW",
      Number.isFinite(avgEggWeightG) ? `${avgEggWeightG.toFixed(0)} g` : "—"
    );
    setText("aEggsCount", Number.isFinite(eggs) ? String(eggs) : "—");

    // Egg-o-nomics
    setText("aCostPerDozen", Number.isFinite(cpd) ? "$" + cpd.toFixed(2) : "—");
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
      Number.isFinite(unitCost)
        ? `$${unitCost.toFixed(2)} / ${units === "imperial" ? "lb" : "kg"}`
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
    const fcrScore = Number.isFinite(fcr)
      ? clamp01((worstFcr - Math.min(fcr, worstFcr)) / worstFcr)
      : 0;
    const thermo = document.querySelector("#farmAnalytics .a-thermo");
    if (thermo)
      thermo.style.setProperty("--thermo", (fcrScore * 100).toFixed(0) + "%");

    const egg = document.querySelector("#farmAnalytics .pieChart");
    if (egg)
      egg.style.setProperty("--pct", clamp01((Number(layRate) || 0) / 100));

    const maxCost = 0.5; // cap for scoring
    const econScore = Number.isFinite(cpe)
      ? clamp01((maxCost - Math.min(cpe, maxCost)) / maxCost)
      : 0;
    const coins = document.querySelector("#farmAnalytics .a-coins");
    if (coins)
      coins.style.setProperty("--score", (econScore * 100).toFixed(0) + "%");

    // Color ledger chips by performance bands
    (function () {
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
      const fcrBand = (function (v) {
        if (!Number.isFinite(v)) return null;
        if (v <= 2.1) return "good";
        if (v <= 2.5) return "avg";
        if (v <= 3.0) return "watch";
        return "poor";
      })(fcr);
      if (fcrBand)
        applyBand("#farmAnalytics .a-feed .substats > .metricRow", fcrBand);

      // Laying chips: color by layRate band
      const layBand = (function (v) {
        if (!Number.isFinite(v)) return null;
        if (v >= 80) return "good";
        if (v >= 60) return "avg";
        if (v >= 40) return "watch";
        return "poor";
      })(layRate);
      if (layBand)
        applyBand("#farmAnalytics .a-laying .substats > .metricRow", layBand);

      // Econ chips: color by cost per egg (cheaper is better)
      const econBand = (function (c) {
        if (!Number.isFinite(c)) return null;
        if (c <= 0.12) return "good";
        if (c <= 0.25) return "avg";
        if (c <= 0.4) return "watch";
        return "poor";
      })(cpe);
      if (econBand)
        applyBand("#farmAnalytics .a-econ .substats > .metricRow", econBand);
    })();
  });
})();
