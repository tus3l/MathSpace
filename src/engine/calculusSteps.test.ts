import { describe, expect, it } from "vitest";
import { compileFunction } from "./math";
import {
  explainDerivative,
  explainIntegral,
  piLabel,
  signIntervals,
  sliceExpression,
  verifyDerivativePair,
} from "./calculusSteps";

const at = (expression: string, x: number, scope = {}) =>
  compileFunction(expression)(x, scope);

describe("explained calculus with sign reasoning", () => {
  it("derives sin, cos and tan with correct signs and explains them", () => {
    const sine = explainDerivative("sin(x)");
    expect(sine.verified).toBe(true);
    expect(at(sine.result, 0)).toBeCloseTo(1);
    expect(sine.signNotes.join(" ")).toContain("cos");
    const cosine = explainDerivative("cos(x)");
    expect(cosine.verified).toBe(true);
    expect(at(cosine.result, Math.PI / 2)).toBeCloseTo(-1);
    expect(cosine.steps[0].reason).toContain("إشارة سالبة");
    expect(cosine.signNotes[0]).toContain("−sin");
    const tangent = explainDerivative("tan(x)");
    expect(tangent.verified).toBe(true);
    expect(at(tangent.result, 0)).toBeCloseTo(1);
    expect(at(tangent.result, 1)).toBeCloseTo(1 / Math.cos(1) ** 2);
    expect(tangent.signNotes[0]).toContain("sec²");
  });

  it("integrates sin and cos with the correct sign and verifies by differentiation", () => {
    const sine = explainIntegral("sin(x)");
    expect(sine.verified).toBe(true);
    expect(sine.display).toContain("+ C");
    expect(at(sine.result, 0)).toBeCloseTo(-1);
    expect(
      sine.steps.some((step) => step.operation === "التحقق بالاشتقاق"),
    ).toBe(true);
    expect(sine.signNotes[0]).toContain("−cos");
    const cosine = explainIntegral("cos(x)");
    expect(at(cosine.result, Math.PI / 2)).toBeCloseTo(1);
    expect(explainIntegral("tan(x)").result).toContain("abs");
    expect(explainIntegral("1/x").result).toContain("abs");
    expect(at(explainIntegral("sec(x)^2").result, 1)).toBeCloseTo(Math.tan(1));
  });

  it("explains every rule with chain, product and quotient steps and matches numeric derivatives", () => {
    for (const input of [
      "x^3 - 4*x + 7",
      "sin(2*x+1)",
      "cos(-3*x)",
      "x^2*sin(x)",
      "sin(x)/x",
      "exp(-x^2)",
      "sqrt(x^2+1)",
      "log(x^2+1)",
      "2^x",
      "-cos(x)",
      "atan(x)",
    ]) {
      const explained = explainDerivative(input);
      expect(explained.verified, input).toBe(true);
      expect(explained.steps.length, input).toBeGreaterThan(0);
      for (const step of explained.steps)
        expect(
          step.before && step.after && step.rule && step.reason,
          input,
        ).toBeTruthy();
    }
    expect(explainDerivative("sin(2*x)").steps[0].reason).toContain(
      "قاعدة السلسلة",
    );
    expect(explainDerivative("cos(-3*x)").steps[0].reason).toContain("تنقلب");
    expect(explainDerivative("x^2*sin(x)").steps[0].operation).toBe(
      "قاعدة الضرب",
    );
    expect(explainDerivative("sin(x)/x").steps[0].rule).toContain("u′v − uv′");
  });

  it("integrates sums, linear substitutions and falls back honestly when no basic rule applies", () => {
    for (const input of [
      "3*x^2 + 2*x - 5",
      "sin(3*x)",
      "cos(2*x+1)",
      "exp(2*x)",
      "1/(2*x+1)",
      "x*exp(x)",
      "x*sin(x)",
    ]) {
      const explained = explainIntegral(input);
      expect(explained.verified, input).toBe(true);
      expect(verifyDerivativePair(explained.result, input), input).toBe(true);
    }
    const parts = explainIntegral("x*sin(x)");
    expect(parts.steps[0].operation).toBe("إيجاد دالة أصلية بمحرك رمزي");
    expect(explainIntegral("sin(3*x)").steps[0].reason).toContain("نقسم على 3");
    expect(() => explainIntegral("import(1)")).toThrow();
  });

  it("computes partial derivatives holding the other variable constant", () => {
    const byX = explainDerivative("x^2*y + sin(x*y)", "x");
    expect(byX.partial).toBe(true);
    expect(byX.verified).toBe(true);
    expect(byX.constants).toContain("y");
    expect(byX.steps[0].operation).toContain("تثبيت y");
    expect(at(byX.result, 1, { y: 2 })).toBeCloseTo(4 + 2 * Math.cos(2));
    const byY = explainDerivative("x^2*y + sin(x*y)", "y");
    expect(at(byY.result, 1, { y: 2 })).toBeCloseTo(1 + Math.cos(2));
    expect(explainDerivative("a*x^2").constants).toContain("a");
    const slice = sliceExpression("x^2*y", "y", 1);
    expect(at(slice, 2)).toBe(2);
    expect(at(sliceExpression("x^2*y", "x", 2), 3)).toBe(18);
  });

  it("detects a wrong derivative by counterexample", () => {
    expect(verifyDerivativePair("cos(x)", "sin(x)")).toBe(false);
    expect(verifyDerivativePair("cos(x)", "-sin(x)")).toBe(true);
  });

  it("reports sign intervals and critical points for trigonometric derivatives", () => {
    const { intervals, zeros } = signIntervals("-sin(x)", -Math.PI, Math.PI);
    expect(zeros.some((zero) => Math.abs(zero) < 1e-6)).toBe(true);
    expect(intervals.find((item) => item.from >= -1e-6)?.sign).toBe(-1);
    expect(intervals.find((item) => item.to <= 1e-6)?.sign).toBe(1);
    const tangent = signIntervals("sec(x)^2", -3, 3);
    expect(tangent.intervals.every((item) => item.sign === 1)).toBe(true);
    expect(tangent.zeros).toHaveLength(0);
    expect(piLabel(Math.PI / 2)).toBe("π/2");
    expect(piLabel(-Math.PI)).toBe("−π");
    expect(piLabel((3 * Math.PI) / 4)).toBe("3π/4");
  });
});
