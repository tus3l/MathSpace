export function datasetStats(values: number[]) {
  if (!values.length || values.some((value) => !Number.isFinite(value)))
    throw new Error("أدخل قيمة عددية واحدة على الأقل.");
  const sorted = [...values].sort((first, second) => first - second);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const median =
    sorted.length % 2
      ? sorted[Math.floor(sorted.length / 2)]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  const maxCount = Math.max(...counts.values());
  const modes =
    maxCount === 1
      ? []
      : [...counts]
          .filter(([, count]) => count === maxCount)
          .map(([value]) => value);
  return {
    sorted,
    mean,
    median,
    variance,
    deviation: Math.sqrt(variance),
    modes,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}
export function gcdSteps(first: number, second: number) {
  if (
    ![first, second].every(
      (value) => Number.isSafeInteger(value) && value >= 0 && value <= 1e9,
    )
  )
    throw new Error("استخدم أعدادًا صحيحة غير سالبة لا تتجاوز مليارًا.");
  let left = first,
    right = second;
  const steps: {
    left: number;
    right: number;
    quotient: number;
    remainder: number;
  }[] = [];
  while (right) {
    const remainder = left % right;
    steps.push({ left, right, quotient: Math.floor(left / right), remainder });
    left = right;
    right = remainder;
  }
  return {
    gcd: left,
    lcm: left
      ? ((BigInt(first) / BigInt(left)) * BigInt(second)).toString()
      : "0",
    steps,
  };
}
export function combination(total: number, chosen: number) {
  if (
    !Number.isInteger(total) ||
    !Number.isInteger(chosen) ||
    chosen < 0 ||
    total < chosen ||
    total > 30
  )
    throw new Error("يلزم 0 ≤ r ≤ n ≤ 30.");
  let result = 1;
  for (let index = 1; index <= chosen; index++)
    result = (result * (total - chosen + index)) / index;
  return Math.round(result);
}
export function sampledIntervalIsFinite(
  evaluate: (x: number) => number,
  from: number,
  to: number,
) {
  return Array.from(
    { length: 513 },
    (_, index) => from + ((to - from) * index) / 512,
  ).every((point) => Number.isFinite(evaluate(point)));
}
export function riemann(
  evaluate: (x: number) => number,
  from: number,
  to: number,
  count: number,
) {
  if (!sampledIntervalIsFinite(evaluate, from, to)) return NaN;
  const delta = (to - from) / count;
  return Array.from(
    { length: count },
    (_, index) => evaluate(from + (index + 0.5) * delta) * delta,
  ).reduce((sum, value) => sum + value, 0);
}
export function spectrum(samples: number[]) {
  return Array.from(
    { length: Math.floor(samples.length / 2) },
    (_, frequency) => {
      let real = 0,
        imaginary = 0;
      samples.forEach((value, index) => {
        const angle = (2 * Math.PI * frequency * index) / samples.length;
        real += value * Math.cos(angle);
        imaginary -= value * Math.sin(angle);
      });
      return (
        (Math.hypot(real, imaginary) * (frequency === 0 ? 1 : 2)) /
        samples.length
      );
    },
  );
}
