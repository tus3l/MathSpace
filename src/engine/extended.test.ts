import { describe, expect, it } from "vitest";
import { analyze } from "./math";
import {
  definiteIntegral,
  evaluateLimit,
  evaluateSum,
  solveInequality,
} from "./extended";
import { prepareWorkspaceVisual, resolveVisualInput } from "./visual";

const scope = { a: 1, b: 1, c: 0 };

describe("limits", () => {
  it("finds removable, infinite and one-sided limits and rejects mismatches", () => {
    expect(evaluateLimit("sin(x)/x", 0)).toMatchObject({ status: "exists", value: 1 });
    expect(evaluateLimit("(x^2-1)/(x-1)", 1).value).toBe(2);
    expect(evaluateLimit("(1+1/x)^x", Infinity)).toMatchObject({ exact: "e" });
    expect(evaluateLimit("1/x^2", 0).value).toBe(Infinity);
    expect(evaluateLimit("sqrt(x)", 0)).toMatchObject({ value: 0, oneSidedOnly: true });
    expect(evaluateLimit("x*log(x)", 0).value).toBeCloseTo(0, 6);
    // nerdamer returns 0 here; the one-sided values must override it.
    expect(evaluateLimit("abs(x)/x", 0).status).toBe("differs");
    expect(evaluateLimit("floor(x)", 1).status).toBe("differs");
    expect(evaluateLimit("1/x", 0).status).toBe("differs");
    expect(evaluateLimit("sin(1/x)", 0).status).toBe("unknown");
  });
  it("analyzes and draws limit requests", () => {
    expect(analyze("limit(sin(x)/x,x,0)").result).toBe("= 1");
    expect(analyze("limit(abs(x)/x,x,0)").result).toContain("غير موجودة");
    expect(analyze("limit(1/x,x,∞)").result).toBe("= 0");
    const visual = prepareWorkspaceVisual("limit(a*sin(x)/x,x,0)", { ...scope, a: 2 });
    expect(visual.kind).toBe("نهاية");
    expect(visual.points[0]).toMatchObject({ x: 0, y: 2 });
  });
});

describe("sums", () => {
  it("adds finite sums and judges infinite series cautiously", () => {
    expect(evaluateSum("n", "n", 1, 10).value).toBe(55);
    expect(evaluateSum("n", "n", 5, 1).value).toBe(0);
    expect(evaluateSum("2^(-n)", "n", 0, Infinity)).toMatchObject({ status: "converges" });
    expect(evaluateSum("2^(-n)", "n", 0, Infinity).value).toBeCloseTo(2, 9);
    expect(evaluateSum("n", "n", 1, Infinity).status).toBe("diverges");
    expect(evaluateSum("1/n", "n", 1, Infinity).status).toBe("unknown");
    expect(() => evaluateSum("n", "n", 1.5, 3)).toThrow();
    expect(analyze("sum(k^2,k,1,3)").result).toBe("= 14");
    expect(prepareWorkspaceVisual("sum(n,n,1,10)", scope).points).toHaveLength(10);
  });
});

describe("inequalities and ±", () => {
  it("solves linear and quadratic inequalities with sign tables", () => {
    expect(solveInequality("x^2-4<0")!.text).toBe("(-2, 2)");
    expect(solveInequality("x^2-4>=0")!.text).toBe("(-∞, -2] ∪ [2, ∞)");
    expect(solveInequality("2*x+1<=5")!.text).toBe("(-∞, 2]");
    expect(solveInequality("x!=3")!.text).toBe("(-∞, 3) ∪ (3, ∞)");
    expect(solveInequality("x^2+1<0")!.text).toBe("∅");
    expect(solveInequality("x^2>=0")!.text).toBe("ℝ");
    expect(solveInequality("x^2<=0")!.text).toBe("{0}");
    expect(solveInequality("x^2 = 4")).toBeNull();
    expect(analyze("x^2-4<0").result).toBe("x ∈ (-2, 2)");
    expect(analyze("x^3<0").supported).toBe(false);
    const visual = prepareWorkspaceVisual("x^2-a<0", { ...scope, a: 4 });
    expect(visual.parameters).toEqual(["a"]);
    expect(visual.segments[0]).toMatchObject({ from: { x: -2 }, to: { x: 2 } });
    expect(resolveVisualInput("x<=a", { a: 3 })).toBe("x<=3");
  });
  it("splits ± into two cases", () => {
    expect(analyze("x=2±sqrt(3)").result).toBe("x = 3.732051  أو  x = 0.267949");
    expect(analyze("±3").result).toBe("3  أو  -3");
    const visual = prepareWorkspaceVisual("x^2±1", scope);
    expect(visual.expressions).toEqual(["x^2+1"]);
    expect(visual.alternate).toBe("x^2-1");
  });
});

describe("improper integrals", () => {
  it("uses verified antiderivatives and limits at infinity", () => {
    expect(definiteIntegral("1/x^2", 1, Infinity).value).toBeCloseTo(1, 9);
    expect(definiteIntegral("exp(-x)", 0, Infinity).value).toBeCloseTo(1, 9);
    expect(definiteIntegral("1/x", 1, Infinity).value).toBe(Infinity);
    expect(analyze("definiteIntegral(1/x^2,1,∞)").result).toBe("= 1");
    expect(analyze("definiteIntegral(1/x,1,∞)").result).toContain("متباعد");
    expect(prepareWorkspaceVisual("definiteIntegral(exp(-x),0,∞)", scope).area).toMatchObject({ from: 0, to: 20 });
  });
});
