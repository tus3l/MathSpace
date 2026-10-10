import { describe, expect, it } from "vitest";
import { compileFunction, mathRequest, safeParse } from "../engine/math";
import {
  deleteMathSelection,
  insertMathKey,
  mathKeyGroups,
  keyboardPreview,
} from "./mathKeyboard";
import { prepareWorkspaceVisual } from "../engine/visual";

describe("mathematical keyboard", () => {
  it("inserts literals at the cursor and replaces selected text", () => {
    const plus = { title: "plus", latex: "+", prefix: "+", fallback: "" };
    expect(insertMathKey("12", 1, 1, plus)).toEqual({
      value: "1+2",
      start: 2,
      end: 2,
    });
    expect(insertMathKey("12", 0, 2, plus).value).toBe("+");
  });
  it("wraps the selection and selects the editable body", () => {
    const root = { title: "root", latex: "", prefix: "sqrt(", suffix: ")" };
    expect(insertMathKey("x+4", 2, 3, root)).toEqual({
      value: "x+sqrt(4)",
      start: 7,
      end: 8,
    });
    expect(insertMathKey("", 0, 0, root).value).toBe("sqrt(x)");
  });
  it("applies calculus to the whole expression and replaces equations with a template", () => {
    const key = mathKeyGroups[4].keys[0];
    expect(insertMathKey("x^2+1", 2, 3, key).value).toBe("derivative(x^2+1)");
    expect(insertMathKey("x=1", 0, 1, key).value).toBe("derivative(x)");
  });
  it("deletes the selection or the preceding character without deleting at the start", () => {
    expect(deleteMathSelection("1234", 1, 3)).toEqual({
      value: "14",
      start: 1,
      end: 1,
    });
    expect(deleteMathSelection("1234", 2, 2).value).toBe("134");
    expect(deleteMathSelection("1234", 0, 0).value).toBe("1234");
  });
  it("enforces the input limit for keyboard edits as well as typing", () => {
    const digit = { title: "one", latex: "1", prefix: "1", fallback: "" };
    expect(() => insertMathKey("1".repeat(250), 250, 250, digit)).toThrow(
      "250",
    );
    expect(insertMathKey("1".repeat(250), 0, 1, digit).value).toHaveLength(250);
  });
  it("uses supported mathematical templates with finite values in their domains", () => {
    for (const group of mathKeyGroups.slice(0, 5)) {
      for (const key of group.keys.filter(
        (item) => item.fallback !== "" && !item.notationOnly,
      )) {
        const value = insertMathKey("", 0, 0, key).value;
        const request = mathRequest(value);
        expect(() => safeParse(request.expression)).not.toThrow();
        expect(Number.isFinite(compileFunction(value)(0.5)), key.title).toBe(
          true,
        );
      }
    }
  });
  it("inserts drawable geometric and matrix templates and selects editable values", () => {
    for (const group of mathKeyGroups.slice(5, 7))
      for (const key of group.keys.filter((item) => item.fallback !== "")) {
        const next = insertMathKey("", 0, 0, key);
        expect(
          () => prepareWorkspaceVisual(next.value, { a: 1, b: 1, c: 0 }),
          key.title,
        ).not.toThrow();
        expect(next.value.slice(next.start, next.end)).toBe(key.fallback);
        expect(keyboardPreview(next.value)).toBeTruthy();
      }
  });
  it("previews notation-only calculus and relations without claiming computation", () => {
    for (const key of mathKeyGroups[4].keys.filter(
      (item) => item.notationOnly,
    )) {
      const value = insertMathKey("x^2+1", 0, 0, key).value;
      expect(keyboardPreview(value)).toBeTruthy();
      expect(() => safeParse(value)).toThrow();
    }
    expect(keyboardPreview("x<=5")).toContain("\\le");
    expect(keyboardPreview("x=2±sqrt(3)")).toContain("\\pm");
    expect(keyboardPreview("∞")).toBe("\\infty");
  });
});
