import { compileFunction, mathRequest, safeParse, symbolic } from "./math";

export const visualParameters = ["a", "b", "c"] as const;
export type VisualParameter = (typeof visualParameters)[number];

export function prepareVisualExpression(
  input: string,
  scope: Record<string, number>,
) {
  const request = mathRequest(input);
  const source = request.expression.replace(/^y\s*=\s*/, "");
  const sides = source.split("=");
  if (sides.length > 2 || sides.some((side) => !side.trim()))
    throw new Error(
      "اكتب تعبيرًا أو معادلة بطرفين كاملين وعلامة مساواة واحدة.",
    );
  if (request.operation && sides.length !== 1)
    throw new Error("طبّق الاشتقاق أو التكامل على تعبير، وليس على معادلة.");
  const variables = ["x", ...visualParameters];
  const parameters = new Set<VisualParameter>();
  const expressions = sides.map((side) => {
    const node = safeParse(side, variables);
    node.traverse((child) => {
      if (child.type === "SymbolNode" && "name" in child)
        for (const name of visualParameters)
          if (child.name === name) parameters.add(name);
    });
    const expression = request.operation
      ? symbolic(side, request.operation, variables)
      : side;
    safeParse(expression, variables);
    const evaluate = compileFunction(expression);
    if (
      !Array.from({ length: 161 }, (_, index) => -8 + index / 10).some((x) =>
        Number.isFinite(evaluate(x, scope)),
      )
    )
      throw new Error(
        "لا توجد قيم حقيقية لأحد طرفي التعبير ضمن مجال الرسم من -8 إلى 8.",
      );
    return expression;
  });
  return {
    expressions,
    parameters: [...parameters],
    operation: request.operation,
  };
}

export function interpolateGraphValue(
  previous: number,
  next: number,
  progress: number,
) {
  if (progress >= 1 || !Number.isFinite(previous) || !Number.isFinite(next))
    return next;
  return previous + (next - previous) * Math.max(0, progress);
}

export function sampleGraph(
  evaluate: (x: number) => number,
  from: number,
  to: number,
) {
  const count = 2048;
  const values = Array.from({ length: count + 1 }, (_, index) =>
    evaluate(from + ((to - from) * index) / count),
  );
  return (x: number) => {
    if (x < from || x > to) return NaN;
    const position = ((x - from) / (to - from)) * count;
    const index = Math.floor(position);
    if (index === count) return values[count];
    const left = values[index],
      right = values[index + 1];
    if (!Number.isFinite(left) || !Number.isFinite(right)) return NaN;
    return interpolateGraphValue(left, right, position - index);
  };
}
