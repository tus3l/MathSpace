import { mathRequest, normalize, safeParse, symbolic } from "./math";

export const surfacePresets = [
  { title: "المستوى", expression: "z=a*x+b*y+c" },
  { title: "المكافئ الدائري", expression: "z=(x^2+y^2)/a^2" },
  { title: "المكافئ الزائدي", expression: "z=x^2/a^2-y^2/b^2" },
  { title: "السطح الجيبي", expression: "z=a*sin(x)" },
  { title: "سطح متموج", expression: "z=a*sin(x)*cos(y)" },
  { title: "الكرة", expression: "x^2+y^2+z^2=a^2" },
  { title: "الإهليلج", expression: "x^2/a^2+y^2/b^2+z^2/c^2=1" },
  { title: "المخروط الدائري", expression: "x^2+y^2=z^2" },
  { title: "الأسطوانة الدائرية", expression: "x^2+y^2=a^2" },
  { title: "القطع المكافئ الأسطواني", expression: "y=x^2/a" },
  { title: "القطع الزائد الأسطواني", expression: "x^2/a^2-y^2/b^2=1" },
  {
    title: "القطع الزائد أحادي الورقة",
    expression: "x^2/a^2+y^2/b^2-z^2/c^2=1",
  },
  {
    title: "القطع الزائد ثنائي الورقة",
    expression: "z^2/c^2-x^2/a^2-y^2/b^2=1",
  },
  {
    title: "سطح ديني",
    expression:
      "a*cos(u)*sin(v); a*sin(u)*sin(v); a*(cos(v)+log(tan(v/2)))+b*u",
    domain: [0, 4 * Math.PI, 0.15, 1.5],
  },
  {
    title: "زجاجة كلاين",
    expression:
      "(a+cos(u/2)*sin(v)-sin(u/2)*sin(2*v))*cos(u); (a+cos(u/2)*sin(v)-sin(u/2)*sin(2*v))*sin(u); sin(u/2)*sin(v)+cos(u/2)*sin(2*v)",
    domain: [0, 2 * Math.PI, 0, 2 * Math.PI],
  },
  { title: "سطح الموجة", expression: "z=a*cos(sqrt(x^2+y^2))" },
  { title: "سطح غاوسي", expression: "z=a*exp(-(x^2+y^2)/b^2)" },
  { title: "سطح لوجستي", expression: "z=a/(1+exp(-b*(x+y)))" },
];

export type SurfaceScope = { a: number; b: number; c: number };
type Point3 = [number, number, number];
export function sampleSurface(
  input: string,
  scope: SurfaceScope,
  domain = [0, 2 * Math.PI, 0, 2 * Math.PI],
) {
  const expression = normalize(input);
  const coordinates = expression.split(";");
  const positions: number[] = [];
  const parameters = new Set<string>();
  function compile(source: string, variables: string[]) {
    const node = safeParse(source, [...variables, "a", "b", "c"]);
    node.traverse((child) => {
      if (child.type === "SymbolNode") {
        const name = (child as unknown as { name: string }).name;
        if (["a", "b", "c"].includes(name)) parameters.add(name);
      }
    });
    const code = node.compile();
    return (values: Record<string, number>) => {
      try {
        const result: unknown = code.evaluate({ ...scope, ...values });
        return typeof result === "number" && Number.isFinite(result)
          ? result
          : NaN;
      } catch {
        return NaN;
      }
    };
  }
  function triangle(first: Point3, second: Point3, third: Point3) {
    if ([...first, ...second, ...third].every(Number.isFinite))
      positions.push(...first, ...second, ...third);
  }
  let kind: "explicit" | "implicit" | "parametric";
  if (coordinates.length > 1) {
    if (coordinates.length !== 3)
      throw new Error(
        "التمثيل البارامتري يحتاج ثلاثة تعبيرات تفصلها ; للإحداثيات x وy وz.",
      );
    if (
      domain.length !== 4 ||
      !domain.every(Number.isFinite) ||
      domain[0] >= domain[1] ||
      domain[2] >= domain[3]
    )
      throw new Error(
        "يجب أن تكون حدود u وv منتهية، والحد الأدنى أصغر من الأعلى.",
      );
    kind = "parametric";
    const evaluate = coordinates.map((source) => compile(source, ["u", "v"]));
    const point = (column: number, row: number): Point3 => {
      const values = {
        u: domain[0] + (column / 64) * (domain[1] - domain[0]),
        v: domain[2] + (row / 64) * (domain[3] - domain[2]),
      };
      return evaluate.map((fn) => fn(values)) as Point3;
    };
    for (let row = 0; row < 64; row++)
      for (let column = 0; column < 64; column++) {
        const first = point(column, row),
          second = point(column + 1, row),
          third = point(column, row + 1),
          fourth = point(column + 1, row + 1);
        triangle(first, second, third);
        triangle(second, fourth, third);
      }
  } else {
    const sides = expression.split("=");
    if (sides.length > 2 || sides.some((side) => !side.trim()))
      throw new Error("اكتب معادلة ذات طرفين وعلامة مساواة واحدة.");
    const explicit =
      sides.length === 1 ||
      (sides[0].trim() === "z" && !/\bz\b/.test(sides[1]));
    if (explicit) {
      kind = "explicit";
      const request = mathRequest(sides.length === 1 ? expression : sides[1]);
      const evaluate = compile(
        request.operation
          ? symbolic(request.expression, request.operation)
          : request.expression,
        ["x", "y"],
      );
      const point = (column: number, row: number): Point3 => {
        const x = -4 + (column / 60) * 8,
          y = -4 + (row / 60) * 8;
        const z = evaluate({ x, y });
        return [x, y, Math.abs(z) <= 12 ? z : NaN];
      };
      for (let row = 0; row < 60; row++)
        for (let column = 0; column < 60; column++) {
          const first = point(column, row),
            second = point(column + 1, row),
            third = point(column, row + 1),
            fourth = point(column + 1, row + 1);
          triangle(first, second, third);
          triangle(second, fourth, third);
        }
    } else {
      kind = "implicit";
      const evaluate = compile(`(${sides[0]})-(${sides[1]})`, ["x", "y", "z"]);
      const resolution = 28,
        step = 8 / resolution;
      const corners = [
        [0, 0, 0],
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 1],
      ];
      const tetrahedra = [
        [0, 1, 2, 6],
        [0, 2, 3, 6],
        [0, 3, 7, 6],
        [0, 7, 4, 6],
        [0, 4, 5, 6],
        [0, 5, 1, 6],
      ];
      const edges = [
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 2],
        [1, 3],
        [2, 3],
      ];
      const values = new Float64Array((resolution + 1) ** 3);
      const offset = (column: number, row: number, layer: number) =>
        (layer * (resolution + 1) + row) * (resolution + 1) + column;
      for (let layer = 0; layer <= resolution; layer++)
        for (let row = 0; row <= resolution; row++)
          for (let column = 0; column <= resolution; column++)
            values[offset(column, row, layer)] = evaluate({
              x: -4 + column * step,
              y: -4 + row * step,
              z: -4 + layer * step,
            });
      for (let layer = 0; layer < resolution; layer++)
        for (let row = 0; row < resolution; row++)
          for (let column = 0; column < resolution; column++) {
            const points = corners.map(
              ([dx, dy, dz]) =>
                [
                  -4 + (column + dx) * step,
                  -4 + (row + dy) * step,
                  -4 + (layer + dz) * step,
                ] as Point3,
            );
            const samples = corners.map(
              ([dx, dy, dz]) =>
                values[offset(column + dx, row + dy, layer + dz)],
            );
            if (!samples.every(Number.isFinite)) continue;
            for (const tetrahedron of tetrahedra) {
              const intersections: Point3[] = [];
              for (const [start, end] of edges) {
                const first = tetrahedron[start],
                  second = tetrahedron[end];
                if (samples[first] < 0 === samples[second] < 0) continue;
                const ratio =
                  samples[first] / (samples[first] - samples[second]);
                intersections.push(
                  points[first].map(
                    (value, axis) =>
                      value + ratio * (points[second][axis] - value),
                  ) as Point3,
                );
              }
              if (intersections.length === 3)
                triangle(intersections[0], intersections[1], intersections[2]);
              if (intersections.length === 4) {
                triangle(intersections[0], intersections[1], intersections[2]);
                triangle(intersections[1], intersections[3], intersections[2]);
              }
            }
          }
    }
  }
  if (!positions.length)
    throw new Error(
      "لا يوجد سطح حقيقي قابل للرسم ضمن المجال [-4,4]. تحقق من المعادلة والمعاملات.",
    );
  return {
    positions,
    parameters: [...parameters] as (keyof SurfaceScope)[],
    kind,
  };
}
