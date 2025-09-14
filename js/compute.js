// js/compute.js

// --- constants ---
export const KG_PER_LB = 0.45359237;
export const G_PER_OZ = 28.349523125;

// --- unit conversion ---
// Supports optional alternative-feed fields (altAmount, altPricePerUnit)
export function toMetricUnits(
  units,
  { feedConsumed, avgEggWeight, bagWeight, altAmount, altPricePerUnit }
) {
  const m = {
    feedConsumedKg: 0,
    avgEggWeightG: 0,
    bagWeightKg: 0,
    altAmountKg: 0,
    altPricePerKg: null,
  };

  if (units === "imperial") {
    m.feedConsumedKg = (Number(feedConsumed) || 0) * KG_PER_LB;
    m.avgEggWeightG = (Number(avgEggWeight) || 0) * G_PER_OZ;
    m.bagWeightKg = (Number(bagWeight) || 0) * KG_PER_LB;
    m.altAmountKg = (Number(altAmount) || 0) * KG_PER_LB;

    if (
      altPricePerUnit !== undefined &&
      altPricePerUnit !== null &&
      altPricePerUnit !== ""
    ) {
      const perLb = Number(altPricePerUnit);
      m.altPricePerKg = isFinite(perLb) ? perLb / KG_PER_LB : null; // $/lb -> $/kg
    }
  } else {
    m.feedConsumedKg = Number(feedConsumed) || 0;
    m.avgEggWeightG = Number(avgEggWeight) || 0;
    m.bagWeightKg = Number(bagWeight) || 0;
    m.altAmountKg = Number(altAmount) || 0;

    if (
      altPricePerUnit !== undefined &&
      altPricePerUnit !== null &&
      altPricePerUnit !== ""
    ) {
      const perKg = Number(altPricePerUnit);
      m.altPricePerKg = isFinite(perKg) ? perKg : null; // already $/kg
    }
  }

  return m;
}

// --- FCR + helpers ---
export function computeFcr({ feedConsumedKg, eggCount, avgEggWeightG }) {
  const feedKg = Number(feedConsumedKg) || 0;
  const eggs = Number(eggCount) || 0;
  const eggG = Number(avgEggWeightG) || 0;

  const eggMassKg = eggs > 0 && eggG > 0 ? (eggs * eggG) / 1000 : 0;
  const fcr = eggMassKg > 0 ? feedKg / eggMassKg : null;
  const feedPerEggG = eggs > 0 ? (feedKg * 1000) / eggs : null;

  return { fcr, eggMassKg, feedPerEggG };
}

export function computeCostPerEgg({
  bagPrice,
  bagWeightKg,
  eggCount,
  feedConsumedKg,
}) {
  const price = Number(bagPrice) || 0;
  const weight = Number(bagWeightKg) || 0;
  const eggs = Number(eggCount) || 0;
  const feedKg = Number(feedConsumedKg) || 0;

  if (price <= 0 || weight <= 0 || eggs <= 0 || feedKg <= 0) return null;

  const costPerKg = price / weight;
  const totalCost = costPerKg * feedKg;
  return totalCost / eggs; // $/egg
}

// --- Alternative feed cost scenario ---
export function computeAltCostScenario({
  feedConsumedKg,
  eggCount,
  bagPrice,
  bagWeightKg,
  altAmountKg,
  altPricePerKg,
}) {
  const totalKg = Number(feedConsumedKg) || 0;
  const eggs = Number(eggCount) || 0;

  // Need baseline bag price/weight to compare
  const basePrice = Number(bagPrice) || 0;
  const baseWKg = Number(bagWeightKg) || 0;
  const baseCostPerKg =
    basePrice > 0 && baseWKg > 0 ? basePrice / baseWKg : null;

  const altKg = Math.max(0, Math.min(Number(altAmountKg) || 0, totalKg));
  const baseKgPortion = Math.max(totalKg - altKg, 0);

  const baselineTotal = baseCostPerKg != null ? baseCostPerKg * totalKg : null;

  // If no baseline cost info, we can only compute share
  if (baseCostPerKg == null) {
    return {
      costPerEggAlt: null,
      savingsTotal: null,
      altSharePct: totalKg ? (altKg / totalKg) * 100 : null,
    };
  }

  // If no alt price, treat all kg at baseline cost (no savings)
  if (!(altPricePerKg >= 0)) {
    const altScenarioTotal = baseCostPerKg * totalKg;
    const costPerEggAlt = eggs > 0 ? altScenarioTotal / eggs : null;
    return {
      costPerEggAlt,
      savingsTotal: null,
      altSharePct: totalKg ? (altKg / totalKg) * 100 : null,
    };
  }

  const altScenarioTotal =
    baseKgPortion * baseCostPerKg + altKg * Number(altPricePerKg);
  const savingsTotal =
    baselineTotal != null ? baselineTotal - altScenarioTotal : null;
  const costPerEggAlt = eggs > 0 ? altScenarioTotal / eggs : null;
  const altSharePct = totalKg ? (altKg / totalKg) * 100 : null;

  return { costPerEggAlt, savingsTotal, altSharePct };
}

// --- Extra metrics (ONE definition each) ---
export function computeLayRate(eggCount, birdCount) {
  const birds = Number(birdCount) || 0;
  const eggs = Number(eggCount) || 0;
  if (birds <= 0) return null;
  return (eggs / birds) * 100;
}

export function computeFeedPerBirdG(feedConsumedKg, birdCount) {
  const birds = Number(birdCount) || 0;
  const feedKg = Number(feedConsumedKg) || 0;
  if (birds <= 0) return null;
  return (feedKg * 1000) / birds;
}

export function costPerDozen(costPerEgg) {
  if (costPerEgg == null) return null; // null/undefined → no value
  const c = Number(costPerEgg);
  if (!isFinite(c)) return null;
  return c * 12;
}
