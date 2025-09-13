// All calculations in METRIC internally.
// We convert inputs to metric first; UI can be imperial or metric.

const KG_PER_LB = 0.45359237;
const G_PER_OZ  = 28.349523125;

export function toMetricUnits(units, { feedConsumed, avgEggWeight, bagWeight }) {
  // feedConsumed: lb or kg -> kg
  // avgEggWeight: oz or g -> g
  // bagWeight:    lb or kg -> kg
  const metric = {
    feedConsumedKg: 0,
    avgEggWeightG: 0,
    bagWeightKg: 0
  };

  if (units === 'imperial') {
    metric.feedConsumedKg = (Number(feedConsumed) || 0) * KG_PER_LB;
    metric.avgEggWeightG  = (Number(avgEggWeight)  || 0) * G_PER_OZ;
    metric.bagWeightKg    = (Number(bagWeight)     || 0) * KG_PER_LB;
  } else {
    metric.feedConsumedKg = Number(feedConsumed) || 0;
    metric.avgEggWeightG  = Number(avgEggWeight) || 0;
    metric.bagWeightKg    = Number(bagWeight)    || 0;
  }

  return metric;
}

/**
 * computeFcr:
 *  eggMassKg = eggCount * (avgEggWeightG / 1000)
 *  FCR = feedConsumedKg / eggMassKg
 *  feedPerEggG = (feedConsumedKg * 1000) / eggCount
 */
export function computeFcr({ feedConsumedKg, eggCount, avgEggWeightG }) {
  const eggMassKg = (Number(eggCount) || 0) * (Number(avgEggWeightG) || 0) / 1000;
  const fcr = eggMassKg > 0 ? feedConsumedKg / eggMassKg : null;
  const feedPerEggG = (Number(eggCount) || 0) > 0
    ? (feedConsumedKg * 1000) / Number(eggCount)
    : null;

  return { fcr, eggMassKg, feedPerEggG };
}

/**
 * computeCostPerEgg (optional)
 * If bag price+weight provided, infer feed cost per kg and then per egg.
 */
export function computeCostPerEgg({ bagPrice, bagWeightKg, eggCount, feedConsumedKg }) {
  const price = Number(bagPrice) || 0;
  const weightKg = Number(bagWeightKg) || 0;
  const eggs = Number(eggCount) || 0;

  if (price > 0 && weightKg > 0 && eggs > 0) {
    const costPerKg = price / weightKg;
    const totalCost = costPerKg * feedConsumedKg;
    return totalCost / eggs;
  }
  return null;
}
