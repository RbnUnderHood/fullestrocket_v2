// Map FCR (kg feed / kg egg mass) to a friendly rating.
// These are broad, conservative bands; adjust after you see real user data.
export function performanceForFcr(fcr) {
  if (fcr == null || !isFinite(fcr)) return { label: '—', desc: 'No eggs collected today' };

  if (fcr <= 2.0) return { label: 'Excellent', desc: 'Outstanding efficiency' };
  if (fcr <= 2.2) return { label: 'Good',      desc: 'Solid performance' };
  if (fcr <= 2.5) return { label: 'Average',   desc: 'Room to improve' };
  return { label: 'Poor', desc: 'Investigate nutrition, health, season' };
}
