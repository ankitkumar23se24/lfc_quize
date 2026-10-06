// Configurable: a correct answer decays linearly from full points to (minFactor * points) over the time limit.
export const scoringConfig = { minFactor: 0.5 };
export function calculateScore({ correct, points, elapsedMs, limitMs }) {
  if (!correct) return 0;
  const ratio = Math.min(Math.max(elapsedMs / limitMs, 0), 1);
  return Math.round(points * (1 - (1 - scoringConfig.minFactor) * ratio));
}
