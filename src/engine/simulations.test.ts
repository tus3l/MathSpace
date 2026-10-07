import { expect, it } from "vitest";
import { searchTopics, topics } from "../content/knowledge";
import {
  combination,
  datasetStats,
  gcdSteps,
  riemann,
  spectrum,
} from "./simulations";
it("computes population statistics without altering data", () => {
  const values = [6, 2, 4];
  expect(datasetStats(values).mean).toBe(4);
  expect(datasetStats(values).variance).toBeCloseTo(8 / 3);
  expect(values).toEqual([6, 2, 4]);
});
it("calculates Euclidean steps and combinatorial counts", () => {
  expect(gcdSteps(48, 18).gcd).toBe(6);
  expect(gcdSteps(48, 18).lcm).toBe("144");
  expect(gcdSteps(999999937, 1000000000).lcm).toBe("999999937000000000");
  expect(combination(5, 2)).toBe(10);
  expect(() => combination(3, 4)).toThrow();
});
it("converges numerically for midpoint sums", () => {
  expect(riemann((x) => x * x, 0, 2, 1000)).toBeCloseTo(8 / 3, 5);
  expect(riemann((x) => 1 / x, -1, 1, 8)).toBeNaN();
});
it("extracts the actual discrete frequency spectrum", () => {
  const samples = Array.from(
    { length: 128 },
    (_, index) => 2 * Math.sin((3 * 2 * Math.PI * index) / 128),
  );
  expect(spectrum(samples)[3]).toBeCloseTo(2, 8);
  expect(spectrum(samples)[2]).toBeCloseTo(0, 8);
});
it("searches mathematical concepts in Arabic and English", () => {
  expect(
    searchTopics("قانون الدائرة").some((topic) => topic.id === "circle"),
  ).toBe(true);
  expect(searchTopics("quadratic")[0].id).toBe("quadratic");
  expect(searchTopics("sin").some((topic) => topic.id === "unit-circle")).toBe(
    true,
  );
  expect(
    topics.every((topic) =>
      topic.related.every((id) => topics.some((other) => other.id === id)),
    ),
  ).toBe(true);
});
