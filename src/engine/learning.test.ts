import { describe, expect, it } from "vitest";
import {
  diagnoseSolution,
  suggestLaws,
  tryLaw,
  verifyFinal,
  verifyTransition,
} from "./learning";
import { analyze } from "./math";

describe("advisor diagnosis of laws, applications and signs", () => {
  it("separates an unsuitable law from a wrong application and suggests a fitting law", () => {
    const source = "2x+5=15";
    const quadratic = tryLaw(source, "quadratic");
    const unsuitable = diagnoseSolution(
      source,
      quadratic,
      [],
      verifyFinal(source, "", quadratic),
    );
    expect(unsuitable.category).toBe("law-unsuitable");
    expect(unsuitable.explanation).toContain("a ≠ 0");
    expect(unsuitable.alternatives.map((item) => item.lawId)).toContain(
      "balance",
    );
    const balance = tryLaw(source, "balance");
    const wrongStep = verifyTransition(source, "2x=20");
    const misapplied = diagnoseSolution(
      source,
      balance,
      [wrongStep],
      verifyFinal(source, "", balance),
    );
    expect(misapplied.category).toBe("application-error");
    expect(misapplied.title).toContain("مناسب");
    expect(misapplied.explanation).toContain("فلا داعي لتغييره");
    const wrongFinal = diagnoseSolution(
      source,
      balance,
      [],
      verifyFinal(source, "x=10", balance),
    );
    expect(wrongFinal.category).toBe("application-error");
  });

  it("accepts several correct methods without marking alternatives as wrong", () => {
    const source = "x^2+5x+6=0";
    const methods = suggestLaws(source).map((item) => item.lawId);
    expect(methods).toEqual(expect.arrayContaining(["quadratic", "factor"]));
    const factor = tryLaw(source, "factor");
    const correct = diagnoseSolution(
      source,
      factor,
      [],
      verifyFinal(source, "-2,-3", factor),
    );
    expect(correct.category).toBe("correct");
    expect(correct.explanation).toContain("اختلاف الطريقة لا يعني الخطأ");
    expect(correct.alternatives.map((item) => item.lawId)).toContain(
      "quadratic",
    );
  });

  it("explains derivative and integral attempts step by step and catches reversed signs", () => {
    const cosine = tryLaw("cos(x)", "derivative");
    expect(cosine.valid).toBe(true);
    expect(cosine.output).toContain("sin");
    expect(cosine.signNotes?.[0]).toContain("−sin");
    expect(verifyFinal("cos(x)", "-sin(x)", cosine).valid).toBe(true);
    const reversed = verifyFinal("cos(x)", "sin(x)", cosine);
    expect(reversed.valid).toBe(false);
    expect(reversed.message).toContain("الإشارة معكوسة");
    const sine = tryLaw("sin(x)", "integral");
    expect(sine.steps.length).toBeGreaterThan(2);
    expect(verifyFinal("sin(x)", "-cos(x)+C", sine).valid).toBe(true);
    const wrongIntegral = verifyFinal("sin(x)", "cos(x)+C", sine);
    expect(wrongIntegral.valid).toBe(false);
    expect(wrongIntegral.message).toContain("الإشارة معكوسة");
    expect(
      verifyFinal("tan(x)", "sec(x)^2", tryLaw("tan(x)", "derivative")).valid,
    ).toBe(true);
    const diagnosis = diagnoseSolution("cos(x)", cosine, [], reversed);
    expect(diagnosis.title).toContain("مناسب");
    expect(diagnosis.alternatives.map((item) => item.lawId)).not.toContain(
      "integral",
    );
  });

  it("routes two-variable functions to partial derivatives and verifies answers", () => {
    const ordinary = tryLaw("x^2*y", "derivative");
    expect(ordinary.valid).toBe(false);
    expect(ordinary.message).toContain("المشتقة الجزئية");
    const diagnosis = diagnoseSolution("x^2*y", ordinary, [], {
      valid: null,
      message: "",
    });
    expect(diagnosis.category).toBe("law-unsuitable");
    expect(diagnosis.alternatives.map((item) => item.lawId)).toEqual(
      expect.arrayContaining(["partial-x", "partial-y"]),
    );
    const partial = tryLaw("z = x^2*y + sin(y)", "partial-y");
    expect(partial.valid).toBe(true);
    expect(partial.steps[0].operation).toContain("تثبيت x");
    expect(verifyFinal(partial.source, "x^2+cos(y)", partial).valid).toBeNull();
    expect(verifyFinal(partial.source, "2*x*y", partial).valid).toBe(false);
    expect(tryLaw("sin(x)", "partial-y").valid).toBe(false);
  });

  it("shows step-by-step calculus in the workspace analysis", () => {
    const derivative = analyze("derivative(cos(x))");
    expect(derivative.steps[0].reason).toContain("إشارة سالبة");
    expect(derivative.hints[0]).toContain("−sin");
    const integral = analyze("∫ sin(x) dx");
    expect(integral.result).toBe("-cos(x) + C");
    expect(integral.steps.at(-1)?.operation).toBe("إضافة ثابت التكامل");
  });
});
