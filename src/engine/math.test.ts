import { describe, expect, it } from "vitest";
import { solveQuadratic } from "./calculation";
import { fmt } from "./math";
import { explainStep } from "./explanation";
import {
  analyze,
  checkStep,
  coefficients,
  compileFunction,
  safeParse,
  symbolic,
} from "./math";

describe("rule-based mathematical engine", () => {
  it("factors a quadratic and explains every operation", () => {
    const result = analyze("x² + 5x + 6 = 0");
    expect(result.roots.sort()).toEqual([-2, -3].sort());
    expect(result.method).toBe("التحليل إلى عوامل");
    expect(
      result.steps.every(
        (step) => step.reason && step.rule && step.before && step.after,
      ),
    ).toBe(true);
  });
  it("recognizes difference of squares", () => {
    const result = analyze("x² - 4 = 0");
    expect(result.method).toBe("فرق بين مربعين");
    expect(result.roots).toEqual([2, -2]);
    expect(result.steps[2].after).toBe("(x - 2)(x + 2) = 0");
  });
  it("solves both sides and handles degenerate equations", () => {
    expect(analyze("2x + 5 = 15").roots).toEqual([5]);
    expect(coefficients("2x + 5 = x + 9")).toEqual([-4, 1, 0]);
    expect(analyze("x=x").result).toContain("كل الأعداد");
    expect(analyze("x=x+1").result).toBe("لا يوجد حل");
  });
  it("uses the formula for irrational roots and handles complex roots", () => {
    expect(analyze("x^2-2x-1=0").method).toBe("القانون العام");
    expect(analyze("x^2+1=0").result).toContain("i");
    expect(analyze("x^2=0").roots).toEqual([0]);
    expect(analyze("1e-13*x^2=1").kind).toBe("معادلة تربيعية");
    expect(solveQuadratic(1, 0, -1e-24).roots).toHaveLength(2);
    expect(fmt(1e-12)).not.toBe("0");
    expect(() =>
      explainStep({
        before: "x",
        operation: "unknown",
        after: "x",
        rule: "unknown",
      }),
    ).toThrow();
  });
  it("rejects unsupported problems without inventing steps", () => {
    expect(analyze("sin(x)=x").supported).toBe(false);
    expect(analyze("x^3+1=0").steps).toHaveLength(0);
  });
  it("detects the requested sign mistake and accepts correct operations", () => {
    expect(checkStep("2x+5=15", "2x=20").valid).toBe(false);
    expect(checkStep("2x+5=15", "2x=10").valid).toBe(true);
  });
  it("parses safely and returns gaps for undefined real values", () => {
    expect(() => safeParse("x=5")).toThrow();
    expect(() => safeParse("import(1)")).toThrow();
    expect(() => safeParse("1e400")).toThrow();
    expect(compileFunction("sqrt(x)")(-1)).toBeNaN();
    expect(compileFunction("2x+3")(4)).toBe(11);
  });
  it("performs actual symbolic calculus and expansion", () => {
    expect(compileFunction(symbolic("x^3", "derivative"))(2)).toBe(12);
    expect(compileFunction(symbolic("2*x", "integral"))(3)).toBe(9);
    expect(compileFunction(symbolic("(x+2)^2", "expand"))(3)).toBe(25);
  });
});
