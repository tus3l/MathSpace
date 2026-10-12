import { describe, expect, it } from "vitest";
import { sampleSurface, surfacePresets } from "./surfaces";

describe("3D surfaces", () => {
  const scope = { a: 2, b: 1.5, c: 2 };
  it("renders every named surface with finite coordinates", () => {
    expect(surfacePresets).toHaveLength(18);
    for (const preset of surfacePresets) {
      const surface = sampleSurface(preset.expression, scope, preset.domain);
      expect(surface.positions.length, preset.title).toBeGreaterThan(0);
      expect(surface.positions.every(Number.isFinite), preset.title).toBe(true);
    }
  });
  it("renders the screenshot equation as an elliptic cylinder, not a height", () => {
    const surface = sampleSurface("(x^2)/(a^2)+(y^2)/(b^2)=1", scope);
    expect(surface.kind).toBe("implicit");
    expect(surface.parameters).toEqual(["a", "b"]);
    for (let index = 0; index < surface.positions.length; index += 3) {
      const [x, y] = surface.positions.slice(index, index + 3);
      expect(Math.abs((x * x) / 4 + (y * y) / 2.25 - 1)).toBeLessThan(0.04);
    }
    expect(
      Math.min(...surface.positions.filter((_, index) => index % 3 === 2)),
    ).toBe(-4);
    expect(
      Math.max(...surface.positions.filter((_, index) => index % 3 === 2)),
    ).toBe(4);
  });
  it("rejects unsafe, malformed and empty surfaces", () => {
    for (const source of [
      "x=y=1",
      "x=",
      "import(1)",
      "x^2+y^2+z^2=-1",
      "u;v",
      "x=x",
    ])
      expect(() => sampleSurface(source, scope)).toThrow();
  });
  it("accepts explicit equations and calculus requests", () => {
    expect(sampleSurface("z=x^2+y^2", scope).kind).toBe("explicit");
    expect(sampleSurface("derivative(x^2)", scope).kind).toBe("explicit");
    expect(() => sampleSurface("u;v;sin(u)", scope, [1, 0, 0, 1])).toThrow();
  });
});
