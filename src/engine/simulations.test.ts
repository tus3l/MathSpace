import { expect, it } from "vitest";
import { searchTopics, topics } from "../content/knowledge";
import { academicTopics, supplementaryTopics } from "../content/academicLaws";
import katex from "katex";
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
  expect(searchTopics("مكلورين")[0].id).toBe("maclaurin");
  expect(searchTopics("تشبيشيف").map((topic) => topic.id)).toEqual([
    "chebyshev-polynomials",
    "chebyshev-inequality",
  ]);
  expect(searchTopics("هودج").map((topic) => topic.id)).toEqual([
    "hodge",
    "hodge-conjecture",
  ]);
  expect(searchTopics("sin").some((topic) => topic.id === "unit-circle")).toBe(
    true,
  );
  expect(
    topics.every((topic) =>
      topic.related.every((id) => topics.some((other) => other.id === id)),
    ),
  ).toBe(true);
});
it("renders reference laws with unique IDs, complete entries and no fake experiments", () => {
  expect(new Set(topics.map((topic) => topic.id)).size).toBe(topics.length);
  expect(
    academicTopics.filter((topic) => topic.category === "حساب المتجهات"),
  ).toHaveLength(14);
  const coverage = {
    "حساب المتجهات": 14,
    "المستقيمات والمستويات": 9,
    "التفاضل متعدد المتغيرات": 14,
    "المجالات المتجهة": 11,
    "التكاملات المتعددة": 13,
    "التكاملات الخطية والسطحية": 9,
    "الجبر الخطي والمصفوفات": 10,
    "التفاضل والتكامل": 13,
    "المعادلات التفاضلية": 11,
    "الاحتمالات والإحصاء والطرق العددية": 11,
  };
  expect(academicTopics).toHaveLength(115);
  for (const [category, count] of Object.entries(coverage))
    expect(
      academicTopics.filter((topic) => topic.category === category),
    ).toHaveLength(count);
  expect(
    academicTopics.some(
      (topic) =>
        topic.view === "three" || topic.category === "الأسطح ثلاثية الأبعاد",
    ),
  ).toBe(false);
  for (const topic of academicTopics) {
    expect(topic.view).toBe("library");
    for (const field of [
      topic.formula,
      topic.detail,
      topic.why,
      topic.example,
      topic.mistakes,
    ])
      expect(field.trim().length).toBeGreaterThan(0);
    expect(() =>
      katex.renderToString(topic.formula, { throwOnError: true }),
    ).not.toThrow();
  }
  expect(searchTopics("ماكلوران")[0].id).toBe("maclaurin");
  expect(searchTopics("المسافة متخالفين")[0].id).toBe("skew-lines-distance");
  expect(searchTopics("السلسلة متعددة")[0].id).toBe("multivariable-chain");
  expect(searchTopics("ستوكس")[0].id).toBe("stokes-theorem");
  expect(searchTopics("التباين العينة")[0].id).toBe("sample-variance");
  expect(searchTopics("سمبسون")[0].id).toBe("simpson-rule");
});
it("renders additional method references with valid formulas and searchable titles", () => {
  expect(supplementaryTopics).toHaveLength(55);
  for (const id of [
    "integration-substitution",
    "partial-fractions",
    "trigonometric-integrals",
    "improper-infinite",
    "improper-singularity",
    "higher-derivatives",
    "implicit-derivative",
    "vector-field",
    "vector-triple-product",
    "bernoulli-ode",
    "riccati-ode",
    "variation-parameters",
    "frobenius-method",
    "laplace-transform",
    "laplace-convolution",
    "fourier-transform",
    "trig-identities",
    "logarithm-laws",
    "exponent-laws",
    "runge-kutta-4",
    "de-morgan",
    "space-curve-tangent",
    "solid-volumes",
  ])
    expect(
      supplementaryTopics.some((topic) => topic.id === id),
      id,
    ).toBe(true);
  expect(new Set(topics.map((topic) => topic.id)).size).toBe(topics.length);
  for (const topic of supplementaryTopics) {
    expect(topic.view).toBe("library");
    expect(topic.detail.length).toBeGreaterThan(0);
    expect(topic.why.length).toBeGreaterThan(0);
    expect(topic.example.length).toBeGreaterThan(0);
    expect(topic.mistakes.length).toBeGreaterThan(0);
    expect(
      () => katex.renderToString(topic.formula, { throwOnError: true }),
      topic.id,
    ).not.toThrow();
    expect(
      searchTopics(topic.title).some((result) => result.id === topic.id),
    ).toBe(true);
  }
});
