import { describe, expect, it } from "vitest";
import { compileFunction } from "./math";
import {
  interpolateGraphValue,
  sampleGraph,
  prepareVisualExpression,
  prepareWorkspaceVisual,
  resolveVisualInput,
  visualInputParameters,
} from "./visual";

describe("animated visual expressions", () => {
  const scope = { a: 3, b: 2, c: 0 };
  it("automatically represents conics, vertical lines, vectors, matrices and geometric inputs", () => {
    const circle = prepareWorkspaceVisual("x^2+y^2=9", scope);
    expect(circle.segments.length).toBeGreaterThan(100);
    for (const segment of circle.segments) expect(segment.from.x ** 2 + segment.from.y ** 2).toBeCloseTo(9, 1);
    const vertical = prepareWorkspaceVisual("x=5", scope);
    expect(vertical.segments.every((segment) => segment.from.x === 5)).toBe(true);
    expect(prepareWorkspaceVisual("vector(a,4)", scope).points[0]).toMatchObject({ x: 3, y: 4 });
    expect(prepareWorkspaceVisual("[[0,-1],[1,0]]", scope).points[0]).toMatchObject({ x: 0, y: 1 });
    expect(prepareWorkspaceVisual("triangle(3,4,90)", scope).segments).toHaveLength(3);
    expect(prepareWorkspaceVisual("circle(a)", scope).parameters).toEqual(["a"]);
    expect(visualInputParameters("circle(a)")).toEqual(["a"]);
    expect(resolveVisualInput("a*x^2+b*x+c=0", scope)).toBe("3 * x ^ 2 + 2 * x + 0=0");
    expect(() => prepareWorkspaceVisual("triangle(3,4,180)", scope)).toThrow();
    expect(() => prepareWorkspaceVisual("[[import(1),0],[0,1]]", scope)).toThrow();
    expect(() => prepareWorkspaceVisual("x^2+y^2=-1", scope)).toThrow();
    expect(prepareWorkspaceVisual("x=x", scope).kind).toBe("هوية متطابقة");
    expect(prepareWorkspaceVisual("x=x", scope).segments).toHaveLength(0);
  });
  it("supports function families, constants, parameterized expressions and both sides of equations", () => {
    for (const input of [
      "sin(x)",
      "exp(x)",
      "sqrt(x)",
      "abs(x)",
      "1/x",
      "3",
      "y=log(x)",
      "a*sin(b*x)+c",
    ]) {
      expect(prepareVisualExpression(input, scope).expressions).toHaveLength(1);
    }
    expect(prepareVisualExpression("x^2=2*x+3", scope).expressions).toEqual([
      "x^2",
      "2*x+3",
    ]);
    expect(prepareVisualExpression("a*x^2+b*x+c", scope).parameters).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
  it("keeps errors explicit for invalid input or expressions without real values in the viewport", () => {
    for (const input of [
      "x=",
      "x=1=2",
      "import(1)",
      "z+x",
      "1/0",
      "sqrt(-1)",
      "x=sqrt(-1)",
      "derivative(x=1)",
    ]) {
      expect(() => prepareVisualExpression(input, scope), input).toThrow();
    }
  });
  it("preserves symbolic parameters in calculus so their animation changes the result", () => {
    const derivative = prepareVisualExpression("derivative(a*x^2)", scope);
    expect(derivative.parameters).toEqual(["a"]);
    const evaluate = compileFunction(derivative.expressions[0]);
    expect(evaluate(2, { a: 3 })).toBe(12);
    expect(evaluate(2, { a: 5 })).toBe(20);
    const integral = prepareVisualExpression("integral(a*x)", scope);
    expect(compileFunction(integral.expressions[0])(2, { a: 3 })).toBe(6);
  });
  it("interpolates once to the exact new value without cycling or overshoot", () => {
    expect(interpolateGraphValue(4, 12, 0)).toBe(4);
    expect(interpolateGraphValue(4, 12, 0.5)).toBe(8);
    expect(interpolateGraphValue(4, 12, 1)).toBe(12);
    expect(interpolateGraphValue(4, 12, 2)).toBe(12);
    expect(interpolateGraphValue(12, 4, 0.5)).toBe(8);
  });
  it("captures the current shape so rapid edits start at its visible position", () => {
    const first = compileFunction("x^2");
    const second = compileFunction("3*x^2");
    const captured = sampleGraph(
      (x) => interpolateGraphValue(first(x), second(x), 0.5),
      -8,
      8,
    );
    expect(captured(2)).toBe(8);
    expect(interpolateGraphValue(captured(2), 20, 0)).toBe(8);
    expect(interpolateGraphValue(captured(2), 20, 1)).toBe(20);
  });
  it("preserves domain gaps instead of drawing invalid intermediate values", () => {
    expect(interpolateGraphValue(4, NaN, 0.5)).toBeNaN();
    expect(interpolateGraphValue(NaN, 4, 0.5)).toBe(4);
    const sample = sampleGraph(compileFunction("1/x"), -8, 8);
    expect(sample(0)).toBeNaN();
    expect(sample(9)).toBeNaN();
    expect(sample(2)).toBe(0.5);
    expect(sampleGraph(compileFunction("sqrt(x)"), -8, 8)(-1)).toBeNaN();
  });
});
