export function solveQuadratic(a: number, b: number, c: number) {
  if (![a, b, c].every(Number.isFinite) || a === 0)
    throw new Error("Invalid quadratic coefficients");
  const discriminant = b * b - 4 * a * c;
  if (!Number.isFinite(discriminant))
    throw new Error("Calculation exceeds numeric limits");
  const square = Math.sqrt(Math.max(0, discriminant));
  const roots = (
    discriminant < 0
      ? []
      : discriminant === 0
        ? [-b / (2 * a)]
        : [(-b + square) / (2 * a), (-b - square) / (2 * a)]
  ).map((root) => (root === 0 ? 0 : root));
  return {
    discriminant,
    square,
    roots,
    realPart: -b / (2 * a),
    imaginaryPart:
      discriminant < 0 ? Math.sqrt(-discriminant) / Math.abs(2 * a) : 0,
  };
}
