import { parse, derivative, simplify } from "mathjs";
import type { MathNode } from "mathjs";
import nerdamer from "nerdamer";
import { solveQuadratic } from "./calculation";
import { recommendQuadratic } from "./advisor";
import { explainStep } from "./explanation";
import type { ExplainedStep } from "./explanation";

export type Step = ExplainedStep;
export type Analysis = {
  input: string;
  kind: string;
  goal: string;
  method: string;
  methodReason: string;
  methods: { name: string; reason: string; recommended: boolean }[];
  steps: Step[];
  roots: number[];
  graph: string;
  hints: string[];
  result: string;
  supported: boolean;
  related: string[];
};
const functions = new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "sinh",
  "cosh",
  "sqrt",
  "abs",
  "exp",
  "log",
  "log10",
  "floor",
  "ceil",
  "sec",
  "csc",
  "cot",
]);
export const fmt = (value: number) =>
  !Number.isFinite(value)
    ? "غير معرّف"
    : value !== 0 && (Math.abs(value) < 1e-6 || Math.abs(value) >= 1e10)
      ? value.toExponential(4)
      : String(Number(value.toFixed(6)));
export function normalize(input: string) {
  return input
    .trim()
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/٫/g, ".")
    .replace(/\\(?:sin|cos|tan|log|ln|exp|sqrt|pi)\b/g, (name) => name.slice(1))
    .replace(/\\int\b/g, "∫")
    .replace(/\b(?:sin|cos|tan|asin|acos|atan|sqrt|log|log10|ln|exp|abs)\b(?=\s*\()/gi, (name) => name.toLowerCase())
    .replace(/(?:جيب التمام|جتا|كوساين)(?=\s*\()/g, "cos")
    .replace(/(?:جيب|جا|ساين)(?=\s*\()/g, "sin")
    .replace(/(?:الظل|ظل|ظا|تان)(?=\s*\()/g, "tan")
    .replace(/\bln(?=\s*\()/g, "log")
    .replace(/√\s*(?=\()/g, "sqrt")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/π/g, "pi")
    .replace(/θ/g, "theta")
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/");
}
export function mathRequest(input: string) {
  const normalized = normalize(input);
  const integral = normalized.match(/^(?:integral|integrate|int)\((.+)\)$/i)
    || normalized.match(/^∫\s*(.+?)\s*d\s*x$/);
  if (integral)
    return { expression: integral[1].replace(/,\s*x\s*$/, ""), operation: "integral" as const };
  const derived = normalized.match(/^(?:derivative|diff)\((.+)\)$/i)
    || normalized.match(/^d\s*\/\s*d\s*x\s*(.+)$/);
  if (derived)
    return { expression: derived[1].replace(/,\s*x\s*$/, ""), operation: "derivative" as const };
  return { expression: normalized, operation: null };
}
export function safeParse(
  input: string,
  variables = ["x", "y", "a", "b", "c", "theta", "n"],
) {
  const expression = normalize(input);
  if (!expression || expression.length > 250)
    throw new Error("اكتب تعبيرًا رياضيًا لا يتجاوز 250 حرفًا.");
  const node = parse(expression);
  let count = 0;
  node.traverse((child) => {
    if (++count > 150) throw new Error("التعبير أكبر من حدود هذه التجربة.");
    if (
      child.type === "ConstantNode" &&
      !Number.isFinite(Number((child as unknown as { value: number }).value))
    )
      throw new Error("القيمة العددية خارج النطاق المدعوم.");
    if (
      ![
        "OperatorNode",
        "ConstantNode",
        "SymbolNode",
        "FunctionNode",
        "ParenthesisNode",
      ].includes(child.type)
    )
      throw new Error("هذا النوع من التعبيرات غير مدعوم.");
    if (
      child.type === "SymbolNode" &&
      ![...variables, "pi", "e", ...functions].includes(
        (child as unknown as { name: string }).name,
      )
    )
      throw new Error("استخدم متغيرات التجربة والدوال الرياضية المعروفة فقط.");
    if (
      child.type === "FunctionNode" &&
      !functions.has((child as unknown as { fn: { name: string } }).fn.name)
    )
      throw new Error("الدالة غير مدعومة.");
    if (
      child.type === "OperatorNode" &&
      !["+", "-", "*", "/", "^"].includes(
        (child as unknown as { op: string }).op,
      )
    )
      throw new Error("العملية غير مدعومة.");
  });
  return node;
}
export function compileFunction(input: string) {
  const request = mathRequest(input);
  const expression = request.operation ? symbolic(request.expression, request.operation) : request.expression;
  const code = safeParse(expression).compile();
  return (x: number, scope: Record<string, number> = {}) => {
    try {
      const value: unknown = code.evaluate({ ...scope, x });
      return typeof value === "number" && Number.isFinite(value) ? value : NaN;
    } catch {
      return NaN;
    }
  };
}
type Polynomial = [number, number, number];
function polynomial(node: MathNode): Polynomial {
  const typed = node as unknown as {
    type: string;
    value: number;
    name: string;
    content: MathNode;
    op: string;
    args: MathNode[];
  };
  if (typed.type === "ParenthesisNode") return polynomial(typed.content);
  if (typed.type === "ConstantNode") return [Number(typed.value), 0, 0];
  if (typed.type === "SymbolNode" && typed.name === "x") return [0, 1, 0];
  if (typed.type !== "OperatorNode") throw new Error("not polynomial");
  const left = polynomial(typed.args[0]);
  if (typed.args.length === 1)
    return left.map((value) =>
      typed.op === "-" ? -value : value,
    ) as Polynomial;
  const right = polynomial(typed.args[1]);
  if (typed.op === "+" || typed.op === "-")
    return left.map(
      (value, index) => value + (typed.op === "+" ? 1 : -1) * right[index],
    ) as Polynomial;
  if (typed.op === "/" && right[1] === 0 && right[2] === 0 && right[0] !== 0)
    return left.map((value) => value / right[0]) as Polynomial;
  if (typed.op === "*") {
    const product = Array(5).fill(0) as number[];
    left.forEach((value, index) =>
      right.forEach((other, otherIndex) => {
        product[index + otherIndex] += value * other;
      }),
    );
    if (product[3] || product[4]) throw new Error("degree too high");
    return product.slice(0, 3) as Polynomial;
  }
  if (typed.op === "^" && right[1] === 0 && right[2] === 0) {
    if (right[0] === 0) return [1, 0, 0];
    if (right[0] === 1) return left;
    if (right[0] === 2 && left[2] === 0)
      return [left[0] ** 2, 2 * left[0] * left[1], left[1] ** 2];
  }
  throw new Error("unsupported polynomial");
}
export function coefficients(input: string): Polynomial {
  const sides = normalize(input).split("=");
  if (sides.length > 2) throw new Error("استخدم علامة مساواة واحدة.");
  const left = polynomial(safeParse(sides[0], ["x"]));
  const right = polynomial(safeParse(sides[1] || "0", ["x"]));
  return left.map((value, index) => value - right[index]) as Polynomial;
}
function step(
  before: string,
  operation: string,
  after: string,
  reason: string,
  rule: string,
): Step {
  return explainStep({ before, operation, after, rule }, reason);
}
export function analyze(input: string): Analysis {
  const normalized = normalize(input);
  const base: Analysis = {
    input: normalized,
    kind: "تعبير رياضي",
    goal: "فهم البنية الرياضية وربطها بالرسم",
    method: "تحليل التعبير",
    methodReason: "",
    methods: [],
    steps: [],
    roots: [],
    graph: "",
    hints: [],
    result: "",
    supported: true,
    related: ["functions"],
  };
  try {
    const request = mathRequest(input);
    if (request.operation) {
      safeParse(request.expression, ["x"]);
      const calculated = symbolic(request.expression, request.operation);
      safeParse(calculated, ["x"]);
      const integral = request.operation === "integral";
      base.kind = integral ? "تكامل غير محدد" : "مشتقة";
      base.method = integral ? "إيجاد دالة أصلية" : "قواعد الاشتقاق";
      base.goal = integral ? "إيجاد دالة مشتقتها تساوي التعبير الأصلي" : "حساب معدل التغير";
      base.methodReason = integral
        ? "نحسب دالة أصلية بالنسبة إلى x ونضيف ثابت التكامل C. الرسم يعرض الدالة الأصلية عند C = 0، ويُراعى مجال الدالة الأصلية."
        : "نحسب المشتقة بالنسبة إلى x. الرسم يعرض دالة المشتقة حيث تكون معرفة.";
      base.graph = calculated;
      base.result = calculated + (integral ? " + C" : "");
      base.steps = [step(normalized, base.method, base.result, base.methodReason,
        integral ? "التكامل غير المحدد" : "قواعد الاشتقاق")];
      base.related = [integral ? "integral" : "derivative", "functions"];
      return base;
    }
    if (/^y\s*=/.test(normalized) || !normalized.includes("=")) {
      const expression = normalized.replace(/^y\s*=\s*/, "");
      const node = safeParse(expression, ["x"]);
      const hasX =
        node.filter(
          (child) =>
            child.type === "SymbolNode" &&
            (child as unknown as { name: string }).name === "x",
        ).length > 0;
      if (!hasX) {
        const value = compileFunction(expression)(0);
        if (!Number.isFinite(value))
          throw new Error("التعبير غير معرف في الأعداد الحقيقية.");
        base.kind = "تعبير عددي";
        base.result = fmt(value);
        base.steps = [
          step(
            expression,
            "حساب القيمة",
            fmt(value),
            "نطبق ترتيب العمليات: الأقواس، ثم الأسس، ثم الضرب والقسمة، ثم الجمع والطرح.",
            "ترتيب العمليات",
          ),
        ];
        return base;
      }
      base.graph = expression;
      base.kind = "دالة في متغير واحد";
      base.method = "الرسم ومعدل التغير";
      base.methodReason =
        "الرسم يربط كل قيمة للمتغير x بقيمة الدالة، والمشتقة تصف ميل المنحنى محليًا.";
      const derived = derivative(expression, "x").toString();
      const simplified = simplify(expression).toString();
      base.steps = [
        step(
          expression,
          "تبسيط التعبير",
          simplified,
          "نكتب تعبيرًا مكافئًا دون تغيير قيم الدالة حيث تكون معرفة.",
          "التبسيط",
        ),
        step(
          simplified,
          "حساب المشتقة",
          derived,
          "نطبق قواعد الاشتقاق على تركيب الدالة للحصول على معدل التغير اللحظي.",
          "قواعد الاشتقاق",
        ),
      ];
      base.result = `f'(x) = ${derived}`;
      base.related = ["functions", "derivative"];
      base.hints = [
        "حدد المتغير المستقل.",
        "قارن قيم الدالة عند قيم متجاورة من x.",
        "ميل المماس هو قيمة المشتقة.",
      ];
      return base;
    }
    const [constant, linear, quadratic] = coefficients(normalized);
    base.graph = `${quadratic}*x^2+(${linear})*x+(${constant})`;
    base.related = ["quadratic", "balance", "functions"];
    if (quadratic === 0) {
      base.kind = "معادلة خطية";
      base.method = "عزل المتغير";
      base.methodReason =
        "أعلى قوة للمتغير هي 1؛ العمليات المتساوية على الطرفين تعزل x وتحافظ على الحل.";
      if (linear === 0) {
        base.result =
          Math.abs(constant) < 1e-12
            ? "كل الأعداد الحقيقية تحقق المعادلة"
            : "لا يوجد حل";
        base.steps = [
          step(
            normalized,
            "جمع الحدود المتشابهة",
            `${fmt(constant)} = 0`,
            Math.abs(constant) < 1e-12
              ? "الطرفان متساويان مهما كانت قيمة x."
              : "الطرفان ثابتان وغير متساويين، فلا يمكن لأي x تحقيق المساواة.",
            "مساواة الثوابت",
          ),
        ];
        return base;
      }
      const root = -constant / linear;
      base.roots = [root];
      base.result = `x = ${fmt(root)}`;
      base.steps = [
        step(
          normalized,
          "جمع حدود المتغير والثوابت",
          `${fmt(linear)}x + (${fmt(constant)}) = 0`,
          "نطرح الطرف الأيمن من الطرفين ونجمع الحدود المتشابهة.",
          "حفظ المساواة",
        ),
        step(
          `${fmt(linear)}x + (${fmt(constant)}) = 0`,
          "طرح الثابت من الطرفين",
          `${fmt(linear)}x = ${fmt(-constant)}`,
          `نطرح ${fmt(constant)} من الطرفين، لذلك يصبح الطرف الأيمن ${fmt(-constant)}.`,
          "خاصية الطرح للمساواة",
        ),
        step(
          `${fmt(linear)}x = ${fmt(-constant)}`,
          "القسمة على معامل x",
          base.result,
          `نقسم الطرفين على ${fmt(linear)}، وهو عدد غير صفري، لعزل المتغير.`,
          "خاصية القسمة للمساواة",
        ),
      ];
      base.hints = [
        "حدد معامل x والحد الثابت.",
        "اطرح الحد الثابت من الطرفين.",
        "اقسم الطرفين على معامل x.",
      ];
      return base;
    }
    base.kind = "معادلة تربيعية";
    base.goal = "إيجاد الجذور وفهم تقاطع المنحنى مع محور x";
    const calculation = solveQuadratic(quadratic, linear, constant);
    const { discriminant } = calculation;
    const recommendation = recommendQuadratic(
      quadratic,
      linear,
      constant,
      discriminant,
    );
    const { difference, easy } = recommendation;
    base.method = recommendation.method;
    base.methodReason = recommendation.methodReason;
    base.methods = recommendation.methods;
    base.hints = [
      "حدد a وb وc بعد كتابة المعادلة على الصورة ax² + bx + c = 0.",
      difference
        ? "لاحظ غياب الحد الخطي: هل ترى فرقًا بين مربعين؟"
        : "احسب المميز b² - 4ac.",
      easy
        ? `ابحث عن عاملين مرتبطين بالحد الثابت ${fmt(constant)}.`
        : "إشارة المميز تحدد عدد الجذور الحقيقية.",
    ];
    base.steps.push(
      step(
        normalized,
        "تحديد المعاملات",
        `a = ${fmt(quadratic)}, b = ${fmt(linear)}, c = ${fmt(constant)}`,
        "نجمع الحدود في طرف واحد، ثم نقرأ معاملات x² وx والحد الثابت.",
        "الصورة القياسية",
      ),
    );
    base.steps.push(
      step(
        "D = b^2 - 4ac",
        "حساب المميز",
        `D = (${fmt(linear)})^2 - 4(${fmt(quadratic)})(${fmt(constant)}) = ${fmt(discriminant)}`,
        "المميز هو الجزء تحت الجذر في القانون العام: موجب لجذرين حقيقيين، صفر لجذر مكرر، وسالب دون جذور حقيقية.",
        "مميز المعادلة التربيعية",
      ),
    );
    if (discriminant < 0) {
      const real = calculation.realPart,
        imaginary = calculation.imaginaryPart;
      base.result = `x = ${fmt(real)} ± ${fmt(imaginary)}i`;
      base.steps.push(
        step(
          normalized,
          "تطبيق القانون العام",
          base.result,
          "المميز سالب؛ نستخدم √(-1) = i. لا يقطع الرسم الحقيقي محور x.",
          "الأعداد المركبة",
        ),
      );
    } else {
      const first = calculation.roots[0],
        second = calculation.roots[1] ?? first;
      base.roots = calculation.roots;
      base.result = base.roots.map((root) => `x = ${fmt(root)}`).join("  أو  ");
      if (easy || difference) {
        const factorTerm = (root: number) =>
          root === 0
            ? "(x)"
            : `(x ${root < 0 ? "+" : "-"} ${fmt(Math.abs(root))})`;
        const factor = `${quadratic === 1 ? "" : fmt(quadratic)}${factorTerm(first)}${factorTerm(second)} = 0`;
        const reason = difference
          ? "نستخدم a² - b² = (a-b)(a+b) بعد إخراج المعامل الرئيسي."
          : `العاملان يعيدان الحدود الأصلية عند الضرب: مجموع الجذرين ${fmt(-linear / quadratic)} وحاصل ضربهما ${fmt(constant / quadratic)}.`;
        base.steps.push(
          step(
            normalized,
            "كتابة حاصل ضرب عوامل",
            factor,
            reason,
            difference ? "فرق بين مربعين" : "تحليل ثلاثي الحدود",
          ),
        );
        base.steps.push(
          step(
            factor,
            "مساواة كل عامل بالصفر",
            base.result,
            "إذا كان حاصل ضرب عددين صفرًا، فلا بد أن يكون أحدهما صفرًا.",
            "خاصية حاصل الضرب الصفري",
          ),
        );
      } else
        base.steps.push(
          step(
            "x = (-b ± sqrt(D))/(2a)",
            "التعويض في القانون العام",
            base.result,
            "نعوض المعاملات والمميز ثم نقسم على 2a. علامة ± تولد الجذرين.",
            "القانون العام",
          ),
        );
    }
    return base;
  } catch {
    return {
      ...base,
      supported: false,
      kind: "مسألة خارج نطاق التحليل الحالي",
      method: "لم أستطع تحديد طريقة واحدة مناسبة لهذه المسألة.",
      methodReason:
        "المحلل التعليمي الحالي يدعم المعادلات الخطية والتربيعية في x والدوال الحقيقية في متغير واحد. لا يتم توليد خطوات غير متحقق منها.",
      result: "جرّب معادلة خطية أو تربيعية، أو افتح موضوعًا مرتبطًا.",
      related: ["functions", "quadratic", "derivative"],
    };
  }
}
export function checkStep(before: string, after: string) {
  try {
    const first = analyze(before),
      second = analyze(after);
    if (
      !before.includes("=") ||
      !after.includes("=") ||
      !first.supported ||
      !second.supported
    )
      return {
        valid: null,
        message: "لا يمكن التحقق من هذه الخطوة ضمن المعادلات المدعومة.",
      };
    if (!first.roots.length || !second.roots.length)
      return {
        valid: null,
        message:
          "هذه المقارنة تحتاج معالجة خاصة للحلول المركبة أو المعادلات المتطابقة.",
      };
    const valid =
      first.roots.length === second.roots.length &&
      first.roots.every((root) =>
        second.roots.some((other) => Math.abs(root - other) < 1e-7),
      );
    return {
      valid,
      message: valid
        ? "الخطوة تحافظ على مجموعة الحلول. تذكّر تنفيذ العملية نفسها على الطرفين."
        : `تغيرت مجموعة الحلول، لذلك الخطوة غير مكافئة. عند نقل حد بإضافة أو طرح، يجب تغيير إشارته لأننا نجري العملية نفسها على الطرفين. الحل المرجعي: ${first.result}.`,
    };
  } catch {
    return {
      valid: null,
      message: "تعذر قراءة الخطوة. تأكد من صياغة المعادلتين.",
    };
  }
}
export function symbolic(
  expression: string,
  operation: "simplify" | "expand" | "factor" | "derivative" | "integral",
) {
  const normalized = normalize(expression);
  safeParse(normalized, ["x", "y"]);
  if (operation === "derivative") return derivative(normalized, "x").toString();
  if (operation === "simplify") return simplify(normalized).toString();
  const result =
    operation === "integral"
      ? nerdamer.integrate(normalized, "x").toString()
      : nerdamer(`${operation}(${normalized})`).toString();
  if (/integrate\(/.test(result))
    throw new Error("لم يتمكن المحرك من إيجاد تكامل رمزي لهذا التعبير.");
  return result;
}
