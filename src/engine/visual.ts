import { ConstantNode, parse } from "mathjs";
import type { FunctionNode, MathNode } from "mathjs";
import { contours } from "d3-contour";
import {
  compileFunction,
  fmt,
  mathRequest,
  normalize,
  safeParse,
  symbolic,
} from "./math";

export type VisualPoint = {
  x: number;
  y: number;
  label?: string;
  color?: string;
};
export type VisualSegment = {
  from: VisualPoint;
  to: VisualPoint;
  color?: string;
  arrow?: boolean;
};
export type WorkspaceVisual = {
  expressions: string[];
  points: VisualPoint[];
  segments: VisualSegment[];
  parameters: VisualParameter[];
  kind: string;
  description: string;
  operation: "derivative" | "integral" | null;
};

export function resolveVisualInput(
  input: string,
  scope: Record<string, number>,
) {
  return normalize(input)
    .split("=")
    .map((side) =>
      parse(side)
        .transform((node) =>
          node.type === "SymbolNode" &&
          "name" in node &&
          typeof node.name === "string" &&
          Object.hasOwn(scope, node.name)
            ? new ConstantNode(scope[node.name])
            : node,
        )
        .toString(),
    )
    .join("=");
}

export function visualInputParameters(input: string): VisualParameter[] {
  const parameters = new Set<VisualParameter>();
  for (const side of normalize(input).split("="))
    parse(side).traverse((node) => {
      if (
        node.type === "SymbolNode" &&
        "name" in node &&
        visualParameters.includes(node.name as VisualParameter)
      )
        parameters.add(node.name as VisualParameter);
    });
  return [...parameters];
}

export function prepareWorkspaceVisual(
  input: string,
  scope: Record<string, number>,
): WorkspaceVisual {
  const source = normalize(input);
  if (!source || source.length > 250)
    throw new Error("اكتب تعبيرًا رياضيًا لا يتجاوز 250 حرفًا.");
  const base: WorkspaceVisual = {
    expressions: [],
    points: [],
    segments: [],
    parameters: [],
    kind: "رسم دالة",
    description:
      "الرسم يأخذ عينات من القيم الحقيقية؛ ليس إثباتًا، والفجوات تعني قيمًا غير معرفة.",
    operation: null,
  };
  const readValue = (text: string) => {
    const node = safeParse(text, [...visualParameters]);
    node.traverse((child) => {
      if (
        child.type === "SymbolNode" &&
        "name" in child &&
        visualParameters.includes(child.name as VisualParameter) &&
        !base.parameters.includes(child.name as VisualParameter)
      )
        base.parameters.push(child.name as VisualParameter);
    });
    const value: unknown = node.compile().evaluate(scope);
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new Error("المعطيات يجب أن تكون أعدادًا حقيقية منتهية.");
    return value;
  };
  const parsed = !source.includes("=") ? parse(source) : null;
  const functionName =
    parsed?.type === "FunctionNode" ? (parsed as FunctionNode).fn.name : "";
  if (
    parsed?.type === "ArrayNode" ||
    ["vector", "point", "triangle", "angle", "circle"].includes(functionName)
  ) {
    const name = functionName || "array";
    const args =
      parsed && "args" in parsed
        ? (parsed.args as MathNode[])
        : parsed && "items" in parsed
          ? (parsed.items as MathNode[])
          : [];
    if (name === "circle") {
      if (args.length !== 1) throw new Error("circle(r) يتطلب نصف قطر واحدًا.");
      const radius = readValue(args[0].toString());
      if (radius <= 0) throw new Error("نصف القطر يجب أن يكون موجبًا.");
      const circle = prepareWorkspaceVisual(`x^2+y^2=(${radius})^2`, scope);
      return {
        ...circle,
        parameters: base.parameters,
        description: `نصف القطر ${fmt(radius)}؛ المساحة ${fmt(Math.PI * radius ** 2)} والمحيط ${fmt(2 * Math.PI * radius)}.`,
      };
    }
    if (
      name === "array" &&
      args.length === 2 &&
      args.every((node) => node.type === "ArrayNode")
    ) {
      const matrix = args.map((node) =>
        "items" in node
          ? (node.items as MathNode[]).map((item) => readValue(item.toString()))
          : [],
      );
      if (matrix.some((row) => row.length !== 2))
        throw new Error("التمثيل يدعم مصفوفة 2×2 فقط.");
      const transform = (x: number, y: number) => ({
        x: matrix[0][0] * x + matrix[0][1] * y,
        y: matrix[1][0] * x + matrix[1][1] * y,
      });
      for (let index = -4; index <= 4; index++) {
        base.segments.push(
          {
            from: transform(index, -4),
            to: transform(index, 4),
            color: "#249b8d",
          },
          {
            from: transform(-4, index),
            to: transform(4, index),
            color: "#7770ce",
          },
        );
      }
      base.points = [
        { ...transform(1, 0), label: "A e1" },
        { ...transform(0, 1), label: "A e2" },
      ];
      base.kind = "تحويل مصفوفي";
      base.description = `الشبكة هي صورة الإحداثيات بالمصفوفة. المحدد ${fmt(matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0])} يقيس عامل المساحة الموقّع؛ الصفر يعني انهيار المساحة.`;
      return base;
    }
    const values = args.map((node) => readValue(node.toString()));
    if (["array", "vector", "point"].includes(name)) {
      if (values.length !== 2)
        throw new Error("اكتب مركبتين، مثل vector(3,4) أو point(2,3).");
      const [x, y] = values;
      base.points = [{ x, y, label: `(${fmt(x)}, ${fmt(y)})` }];
      if (name !== "point")
        base.segments = [{ from: { x: 0, y: 0 }, to: { x, y }, arrow: true }];
      base.kind = name === "point" ? "نقطة إحداثية" : "متجه";
      base.description = `الإحداثيات (${fmt(x)}, ${fmt(y)})؛ المسافة من الأصل ${fmt(Math.hypot(x, y))} من فيثاغورس على المحورين المتعامدين.`;
      return base;
    }
    if (name === "triangle") {
      if (values.length !== 3)
        throw new Error(
          "triangle(a,b,angle) يتطلب ضلعين والزاوية المحصورة بالدرجات.",
        );
      const [first, second, degrees] = values;
      if (first <= 0 || second <= 0 || degrees <= 0 || degrees >= 180)
        throw new Error("الضلعان موجبان والزاوية بين 0 و180 درجة.");
      const radians = (degrees * Math.PI) / 180;
      base.points = [
        { x: 0, y: 0, label: "A" },
        { x: first, y: 0, label: "B" },
        {
          x: second * Math.cos(radians),
          y: second * Math.sin(radians),
          label: "C",
        },
      ];
      base.segments = base.points.map((point, index) => ({
        from: point,
        to: base.points[(index + 1) % 3],
      }));
      base.kind = "مثلث بضلعين وزاوية";
      base.description = `الزاوية المحصورة ${fmt(degrees)}°؛ طول الضلع المقابل ${fmt(Math.hypot(first - base.points[2].x, base.points[2].y))}؛ المساحة ${fmt((first * second * Math.sin(radians)) / 2)}. ${degrees === 90 ? "زاوية قائمة: يمكن تطبيق فيثاغورس على الضلع المقابل." : "لا تُفترض زاوية قائمة؛ قانون جيب التمام يحسب الضلع المقابل."}`;
      return base;
    }
    if (name === "angle") {
      if (values.length !== 1)
        throw new Error("angle(60) يتطلب زاوية بالدرجات.");
      const radians = (values[0] * Math.PI) / 180;
      base.segments = [
        { from: { x: 0, y: 0 }, to: { x: 4, y: 0 } },
        {
          from: { x: 0, y: 0 },
          to: { x: 4 * Math.cos(radians), y: 4 * Math.sin(radians) },
        },
      ];
      for (let index = 0; index < 40; index++)
        base.segments.push({
          from: {
            x: Math.cos((radians * index) / 40),
            y: Math.sin((radians * index) / 40),
          },
          to: {
            x: Math.cos((radians * (index + 1)) / 40),
            y: Math.sin((radians * (index + 1)) / 40),
          },
          color: "#e28e4e",
        });
      base.kind = "زاوية";
      base.description = `الزاوية ${fmt(values[0])}° = ${fmt(radians)} راديان. تغييرها يدير الشعاع.`;
      return base;
    }
  }
  const sides = source.split("=");
  if (sides.length === 2) {
    const node = safeParse(`(${sides[0]})-(${sides[1]})`, [
      "x",
      "y",
      ...visualParameters,
    ]);
    let implicit = /^x\s*$/.test(sides[0]);
    node.traverse((child) => {
      if (child.type !== "SymbolNode" || !("name" in child)) return;
      if (child.name === "y" && !/^y\s*=/.test(source)) implicit = true;
      if (
        visualParameters.includes(child.name as VisualParameter) &&
        !base.parameters.includes(child.name as VisualParameter)
      )
        base.parameters.push(child.name as VisualParameter);
    });
    if (implicit) {
      if (
        symbolic(node.toString(), "simplify", [
          "x",
          "y",
          ...visualParameters,
        ]) === "0"
      ) {
        base.kind = "هوية متطابقة";
        base.description =
          "الفرق بين الطرفين يساوي صفرًا رمزيًا حيث يكون التعبير الأصلي معرفًا؛ الحل ليس منحنى منفردًا. لا تُرسم حدود النافذة بوصفها حلولًا.";
        return base;
      }
      const code = node.compile();
      const evaluate = (x: number, y: number) => {
        try {
          const value: unknown = code.evaluate({ ...scope, x, y });
          return typeof value === "number" && Number.isFinite(value)
            ? value
            : NaN;
        } catch {
          return NaN;
        }
      };
      const resolution = 100,
        delta = 16 / resolution;
      const samples = Array.from({ length: resolution + 1 }, (_, row) =>
        Array.from({ length: resolution + 1 }, (_, column) =>
          evaluate(-8 + column * delta, -8 + row * delta),
        ),
      );
      const boundary = contours()
        .size([resolution + 1, resolution + 1])
        .thresholds([0])(samples.flat())[0];
      const project = (point: number[]) => ({
        x: -8 + (point[0] - 0.5) * delta,
        y: -8 + (point[1] - 0.5) * delta,
      });
      const isOnCurve = (point: VisualPoint) => {
        const residual = evaluate(point.x, point.y);
        const variation =
          Math.abs(
            evaluate(point.x + delta, point.y) -
              evaluate(point.x - delta, point.y),
          ) +
          Math.abs(
            evaluate(point.x, point.y + delta) -
              evaluate(point.x, point.y - delta),
          );
        return (
          Number.isFinite(residual) &&
          Number.isFinite(variation) &&
          Math.abs(residual) <= variation * 0.15 + 1e-10
        );
      };
      for (const polygon of boundary.coordinates)
        for (const ring of polygon) {
          for (let index = 0; index + 1 < ring.length; index++) {
            const from = project(ring[index]),
              to = project(ring[index + 1]);
            if (
              isOnCurve(from) &&
              isOnCurve(to) &&
              isOnCurve({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 })
            )
              base.segments.push({ from, to });
          }
        }
      if (!base.segments.length)
        throw new Error(
          "لم تُرصد نقاط للمعادلة داخل [-8,8]×[-8,8]. قد تقع خارج النافذة أو تحتاج تمثيلًا أدق؛ هذا لا يثبت عدم وجود حلول.",
        );
      base.kind = "منحنى ضمني في x وy";
      base.description =
        "كل نقطة تقرّب مساواة الطرفين. الرسم الضمني بأخذ عينات داخل [-8,8]×[-8,8]؛ قد يفوّت تفاصيل صغيرة أو نقاطًا منفردة، ولا يثبت صحة حل.";
      return base;
    }
  }
  const prepared = prepareVisualExpression(source, scope);
  return {
    ...base,
    ...prepared,
    kind:
      prepared.expressions.length === 2
        ? "طرفا المعادلة"
        : prepared.operation === "derivative"
          ? "منحنى المشتقة"
          : prepared.operation === "integral"
            ? "دالة أصلية؛ C=0"
            : "رسم دالة",
  };
}

export const visualParameters = ["a", "b", "c"] as const;
export type VisualParameter = (typeof visualParameters)[number];

export function prepareVisualExpression(
  input: string,
  scope: Record<string, number>,
) {
  const request = mathRequest(input);
  const source = request.expression.replace(/^y\s*=\s*/, "");
  const sides = source.split("=");
  if (sides.length > 2 || sides.some((side) => !side.trim()))
    throw new Error(
      "اكتب تعبيرًا أو معادلة بطرفين كاملين وعلامة مساواة واحدة.",
    );
  if (request.operation && sides.length !== 1)
    throw new Error("طبّق الاشتقاق أو التكامل على تعبير، وليس على معادلة.");
  const variables = ["x", ...visualParameters];
  const parameters = new Set<VisualParameter>();
  const expressions = sides.map((side) => {
    const node = safeParse(side, variables);
    node.traverse((child) => {
      if (child.type === "SymbolNode" && "name" in child)
        for (const name of visualParameters)
          if (child.name === name) parameters.add(name);
    });
    const expression = request.operation
      ? symbolic(side, request.operation, variables)
      : side;
    safeParse(expression, variables);
    const evaluate = compileFunction(expression);
    if (
      !Array.from({ length: 161 }, (_, index) => -8 + index / 10).some((x) =>
        Number.isFinite(evaluate(x, scope)),
      )
    )
      throw new Error(
        "لا توجد قيم حقيقية لأحد طرفي التعبير ضمن مجال الرسم من -8 إلى 8.",
      );
    return expression;
  });
  return {
    expressions,
    parameters: [...parameters],
    operation: request.operation,
  };
}

export function interpolateGraphValue(
  previous: number,
  next: number,
  progress: number,
) {
  if (progress >= 1 || !Number.isFinite(previous) || !Number.isFinite(next))
    return next;
  return previous + (next - previous) * Math.max(0, progress);
}

export function sampleGraph(
  evaluate: (x: number) => number,
  from: number,
  to: number,
) {
  const count = 2048;
  const values = Array.from({ length: count + 1 }, (_, index) =>
    evaluate(from + ((to - from) * index) / count),
  );
  return (x: number) => {
    if (x < from || x > to) return NaN;
    const position = ((x - from) / (to - from)) * count;
    const index = Math.floor(position);
    if (index === count) return values[count];
    const left = values[index],
      right = values[index + 1];
    if (!Number.isFinite(left) || !Number.isFinite(right)) return NaN;
    return interpolateGraphValue(left, right, position - index);
  };
}
