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
    const egg = document.querySelector("#farmAnalytics .a-egg");
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
