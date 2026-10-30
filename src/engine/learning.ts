import {
  analyze,
  coefficients,
  compileFunction,
  fmt,
  normalize,
  safeParse,
  symbolic,
} from "./math";
import type { Step } from "./math";
import { topics } from "../content/knowledge";
import { prepareWorkspaceVisual } from "./visual";
import { explainDerivative, explainIntegral, piLabel } from "./calculusSteps";
import { derivative, isComplex, parse } from "mathjs";
import type { FunctionNode } from "mathjs";

export type Verdict = { valid: boolean | null; message: string };
export type LawAttempt = Verdict & {
  lawId: string;
  title: string;
  source: string;
  output: string;
  preview: string;
  steps: (Step & { visualExpression?: string })[];
  purpose: "solve" | "transform" | "derivative" | "integral" | "measure";
  signNotes?: string[];
};
export const learningLaws = [
  ...topics.map((topic) => ({
    id: topic.id,
    title: topic.title,
    formula: topic.formula,
    condition: topic.when + " " + topic.detail,
  })),
  {
    id: "factor",
    title: "التحليل إلى عوامل",
    formula: "ab+ac=a(b+c)",
    condition: "تعبير جبري قابل للتحليل؛ التحليل يحفظ القيمة ومجموعة الحلول.",
  },
  {
    id: "expand",
    title: "خاصية التوزيع",
    formula: "a(b+c)=ab+ac",
    condition: "توسيع حاصل ضرب دون تغيير قيمة التعبير.",
  },
  {
    id: "cosine",
    title: "قانون جيب التمام",
    formula: "c^2=a^2+b^2-2ab\\cos\\theta",
    condition:
      "ضلعان معلومان والزاوية المحصورة بينهما؛ يصلح للمثلث القائم وغير القائم.",
  },
  {
    id: "partial-x",
    title: "المشتقة الجزئية بالنسبة إلى x",
    formula: "\\frac{\\partial f}{\\partial x}",
    condition:
      "دالة في متغيرين x وy؛ نعامل y كثابت ونشتق بالنسبة إلى x، فنحصل على ميل مقطع السطح الموازي لمحور x.",
  },
  {
    id: "partial-y",
    title: "المشتقة الجزئية بالنسبة إلى y",
    formula: "\\frac{\\partial f}{\\partial y}",
    condition:
      "دالة في متغيرين x وy؛ نعامل x كثابت ونشتق بالنسبة إلى y، فنحصل على ميل مقطع السطح الموازي لمحور y.",
  },
];

export function lawStepVisual(attempt: LawAttempt, index: number) {
  const step = attempt.steps[index];
  if (!step) return null;
  const expression = step.visualExpression ?? step.after;
  try {
    prepareWorkspaceVisual(expression, {});
    return expression;
  } catch {
    return null;
  }
}

function polynomialResidual(equation: string) {
  const sides = normalize(equation).split("=");
  if (sides.length !== 2) throw new Error("Expected two equation sides");
  for (const side of sides) {
    safeParse(side, ["x", "y"]).traverse((node) => {
      if (node.type === "FunctionNode") throw new Error("Not a polynomial");
      if (node.type !== "OperatorNode" || !("op" in node) || !("args" in node))
        return;
      const operator = node as import("mathjs").OperatorNode;
      if (operator.op === "/" || operator.op === "^") {
        const operand = operator.args[1];
        let variable = false;
        operand.traverse((child) => {
          if (child.type === "SymbolNode") variable = true;
        });
        if (variable) throw new Error("Variable denominator or exponent");
        const value = operand.compile().evaluate();
        if (
          typeof value !== "number" ||
          !Number.isFinite(value) ||
          (operator.op === "/"
            ? value === 0
            : !Number.isInteger(value) || value < 0 || value > 12)
        )
          throw new Error("Unsupported polynomial operand");
      } else if (!["+", "-", "*"].includes(operator.op))
        throw new Error("Unsupported polynomial operator");
    });
  }
  return symbolic(`(${sides[0]})-(${sides[1]})`, "expand");
}

function verifyPlaneEquation(before: string, after: string): Verdict {
  const first = polynomialResidual(before),
    second = polynomialResidual(after);
  const difference = symbolic(`(${first})-(${second})`, "expand");
  if (difference === "0")
    return {
      valid: true,
      message:
        "المعادلتان متكافئتان: بعد التوسيع، فرق الطرفين هو نفسه في كلتيهما. تغيير 3² إلى 9 أو نقل الحدود لا يغير نقاط الحل.",
    };
  if (first !== "0" && second !== "0") {
    const ratio = symbolic(`(${first})/(${second})`, "factor");
    let value: unknown;
    try {
      value = safeParse(ratio, []).compile().evaluate();
    } catch {
      value = null;
    }
    if (
      typeof value === "number" &&
      Number.isFinite(value) &&
      value !== 0 &&
      symbolic(`(${first})-(${ratio})*(${second})`, "expand") === "0"
    )
      return {
        valid: true,
        message: `المعادلتان متكافئتان: فرق الطرفين يختلف بعامل ثابت غير صفري (${ratio})، فلا تتغير نقاط الحل.`,
      };
  }
  const coordinates = [0, 1, -1, 3, -3];
  for (const x of coordinates)
    for (const y of coordinates) {
      const atPoint = (expression: string) =>
        symbolic(
          parse(expression)
            .transform((node) =>
              node.type === "SymbolNode" &&
              "name" in node &&
              (node.name === "x" || node.name === "y")
                ? parse(`(${node.name === "x" ? x : y})`)
                : node,
            )
            .toString(),
          "expand",
        );
      const left = atPoint(first),
        right = atPoint(second);
      const nonzero = (value: string) =>
        value !== "0" && Number.isFinite(Number(value)) && Number(value) !== 0;
      if ((left === "0" && nonzero(right)) || (right === "0" && nonzero(left)))
        return {
          valid: false,
          message: `المعادلتان غير متكافئتين: النقطة (${x}, ${y}) تحقق ${left === "0" ? "المعادلة الأصلية" : "المعادلة الجديدة"} ولا تحقق الأخرى. فرق الطرفين عندها: الأصل ${left}، والجديد ${right}. هذه نقطة مضادة، لا مجرد اختلاف في شكل الرسم.`,
        };
    }
  return {
    valid: null,
    message:
      "لم يثبت التكافؤ ولم تُوجد نقطة مضادة في الفحص المحدود. اختلاف المعاملات وحده لا يثبت اختلاف مجموعة الحلول؛ لا نعتمد الرسم كبرهان.",
  };
}

export function verifyTransition(before: string, after: string): Verdict {
  try {
    const circleEquation = (input: string) => {
      const normalized = normalize(input);
      if (normalized.includes("=")) return normalized;
      const node = parse(normalized);
      if (node.type !== "FunctionNode") return normalized;
      const call = node as FunctionNode;
      if (call.fn.toString() !== "circle" || call.args.length !== 1)
        return normalized;
      const radius: unknown = safeParse(call.args[0].toString(), [])
        .compile()
        .evaluate();
      if (typeof radius !== "number" || !Number.isFinite(radius) || radius <= 0)
        throw new Error("Invalid circle radius");
      return `x^2+y^2=(${radius})^2`;
    };
    before = circleEquation(before);
    after = circleEquation(after);
    if (normalize(before).includes("=") !== normalize(after).includes("="))
      return {
        valid: null,
        message: "لا تقارن معادلة بتعبير منفرد؛ اكتب طرفي الخطوة.",
      };
    if (before.includes("=")) {
      if (
        [before, after].some((equation) =>
          normalize(equation)
            .split("=")
            .some((side) => {
              let hasY = false;
              safeParse(side, ["x", "y"]).traverse((node) => {
                if (
                  node.type === "SymbolNode" &&
                  "name" in node &&
                  node.name === "y"
                )
                  hasY = true;
              });
              return hasY;
            }),
        )
      )
        return verifyPlaneEquation(before, after);
      const first = coefficients(before),
        second = coefficients(after);
      const firstScale = Math.max(...first.map(Math.abs));
      const secondScale = Math.max(...second.map(Math.abs));
      const pivot = first.findIndex((value) => value !== 0);
      const otherPivot = second.findIndex((value) => value !== 0);
      let valid =
        pivot === -1 || otherPivot === -1
          ? pivot === otherPivot
          : first.every((value, index) => {
              const left = (value / firstScale) * Math.sign(first[pivot]),
                right =
                  (second[index] / secondScale) * Math.sign(second[otherPivot]);
              return left === 0 || right === 0
                ? left === right
                : Math.abs(left - right) <=
                    1e-12 * Math.max(Math.abs(left), Math.abs(right));
            });
      if (!valid) {
        const firstAnalysis = analyze(before),
          secondAnalysis = analyze(after);
        if (firstAnalysis.roots.length && secondAnalysis.roots.length)
          valid =
            firstAnalysis.roots.length === secondAnalysis.roots.length &&
            firstAnalysis.roots.every((root) =>
              secondAnalysis.roots.some(
                (other) =>
                  Math.abs(root - other) <=
                  1e-10 * Math.max(Math.abs(root), Math.abs(other), 1e-100),
              ),
            );
      }
      return {
        valid,
        message: valid
          ? "الخطوة تحفظ مجموعة الحلول، بما فيها الجذور المركبة. هذا تحقق من التكافؤ، وليس إثباتًا للعملية التي قصدتها."
          : `بدأ الخطأ هنا: تغيرت مجموعة الحلول. قبل الخطوة: ${analyze(before).result}؛ بعدها: ${analyze(after).result}. أجرِ العملية نفسها على الطرفين وتجنب القسمة على صفر؛ لا تُعتمد الخطوات التالية بناءً على هذا التحويل.`,
      };
    }
    safeParse(before, ["x"]);
    safeParse(after, ["x"]);
    const difference = symbolic(`(${before})-(${after})`, "simplify");
    if (difference === "0")
      return {
        valid: true,
        message:
          "التعبيران متكافئان رمزيًا حيث يكون التعبير الأصلي معرفًا؛ لا تُلغِ قيود المجال.",
      };
    if (Number.isFinite(Number(difference)) && Number(difference) !== 0)
      return {
        valid: false,
        message: `الخطوة غير مكافئة: الفرق الرمزي بين التعبيرين يساوي ${difference} وليس صفرًا. راجع الحد الذي أضفته أو حذفته.`,
      };
    return {
      valid: null,
      message:
        "لم يُثبت المحرك التكافؤ الرمزي. اختلاف الصيغة وحده لا يثبت الخطأ، وأخذ عينات من الرسم ليس برهانًا.",
    };
  } catch {
    return {
      valid: null,
      message:
        "هذه الخطوة خارج نطاق التحقق الحالي؛ لا يمكن اعتمادها صحيحة أو خاطئة تلقائيًا.",
    };
  }
}

export function tryLaw(
  source: string,
  lawId: string,
  allowSubstitute = true,
): LawAttempt {
  const law = learningLaws.find((item) => item.id === lawId);
  const analysis = analyze(source);
  const base: LawAttempt = {
    lawId,
    title: law?.title || lawId,
    source,
    output: "",
    preview: "",
    steps: [],
    purpose: "transform",
    valid: null,
    message: "",
  };
  const reject = (
    message: string,
    valid: boolean | null = false,
  ): LawAttempt => ({ ...base, valid, message });
  const make = (
    output: string,
    preview: string,
    reason: string,
    purpose: LawAttempt["purpose"] = "transform",
  ): LawAttempt => ({
    ...base,
    valid: true,
    output,
    preview,
    purpose,
    message: reason,
    steps: [
      {
        before: source,
        after: output,
        visualExpression:
          purpose === "measure" ||
          purpose === "derivative" ||
          purpose === "integral"
            ? preview
            : undefined,
        operation: base.title,
        rule: base.title,
        reason,
      },
    ],
  });
  try {
    if (!law) return reject("القانون غير معروف.", null);
    if (
      [
        "pythagoras",
        "triangle",
        "cosine",
        "circle",
        "vectors",
        "matrix",
      ].includes(lawId)
    ) {
      let visual;
      try {
        visual = prepareWorkspaceVisual(source, {});
      } catch {
        return reject(
          `يلزم توفر المعطيات: ${law.condition} لم تُثبت هذه المعطيات هنا؛ لا تُعتمد نتيجة بلا شروط.`,
          null,
        );
      }
      if (
        visual.kind === "مثلث بضلعين وزاوية" &&
        ["triangle", "cosine", "pythagoras"].includes(lawId)
      ) {
        const [origin, first, second] = visual.points;
        const firstLength = Math.hypot(first.x - origin.x, first.y - origin.y);
        const secondLength = Math.hypot(
          second.x - origin.x,
          second.y - origin.y,
        );
        const dot =
          (first.x - origin.x) * (second.x - origin.x) +
          (first.y - origin.y) * (second.y - origin.y);
        if (
          lawId === "pythagoras" &&
          Math.abs(dot) > 1e-10 * firstLength * secondLength
        )
          return reject(
            "الزاوية المحصورة ليست قائمة؛ لا يجوز حساب الضلع المقابل بجمع المربعين. حد -2ab cos(θ) غير صفري. استخدم قانون جيب التمام.",
          );
        const squared =
          firstLength ** 2 +
          secondLength ** 2 -
          (lawId === "cosine" ? 2 * dot : 0);
        const result =
          lawId === "triangle"
            ? Math.abs(first.x * second.y - first.y * second.x) / 2
            : Math.sqrt(Math.max(0, squared));
        const reference =
          lawId === "triangle"
            ? (firstLength * Math.abs(second.y)) / 2
            : Math.hypot(first.x - second.x, first.y - second.y);
        if (
          !Number.isFinite(result) ||
          Math.abs(result - reference) >
            1e-10 * Math.max(1, Math.abs(reference))
        )
          return reject(
            "نتيجة التعويض في القانون لا تطابق القياس الهندسي المستقل؛ لا يمكن اعتماد التطبيق.",
            null,
          );
        const reason =
          lawId === "triangle"
            ? "المساحة نصف القاعدة في الارتفاع العمودي؛ الارتفاع هو b sin(θ)، وليس الضلع المائل."
            : lawId === "pythagoras"
              ? "الزاوية المحصورة قائمة والضلع المقابل هو الوتر؛ مجموع مربعي الضلعين يساوي مربع الوتر."
              : "المعطيات توفر ضلعين والزاوية المحصورة. نصحح مجموع المربعين بالحد -2ab cos(θ)؛ في القائمة يساوي هذا الحد صفرًا.";
        const applied = make(fmt(result), source, reason, "measure");
        applied.steps = [
          {
            before: source,
            after: `a=${fmt(firstLength)}, b=${fmt(secondLength)}`,
            operation: "قراءة الضلعين والزاوية",
            rule: base.title,
            reason: visual.description,
            visualExpression: source,
          },
          {
            before: law.formula,
            after:
              lawId === "triangle"
                ? `A=(${fmt(firstLength)})*(${fmt(Math.abs(second.y))})/2`
                : `c^2=${fmt(firstLength ** 2)}+${fmt(secondLength ** 2)}${lawId === "cosine" ? `-(${fmt(2 * dot)})` : ""}`,
            operation: "التعويض في القانون المختار",
            rule: base.title,
            reason,
          },
          {
            before: lawId === "triangle" ? "A=bh/2" : `c^2=${fmt(squared)}`,
            after: `${lawId === "triangle" ? "A" : "c"}=${fmt(result)}`,
            operation:
              lawId === "triangle"
                ? "حساب المساحة والتحقق"
                : "أخذ الجذر الموجب والتحقق",
            rule: base.title,
            reason: `النتيجة ${fmt(result)} تطابق القياس المستقل من الإحداثيات. ${lawId === "triangle" ? "نستخدم الارتفاع العمودي لا الضلع المائل." : "الطول غير سالب؛ ننقل متجه الضلع المقابل إلى الأصل لإظهار مقداره دون تغيير طوله."}`,
            visualExpression:
              lawId === "triangle"
                ? source
                : `vector(${first.x - second.x},${first.y - second.y})`,
          },
        ];
        return applied;
      }
      if (visual.kind === "متجه" && ["vectors", "pythagoras"].includes(lawId)) {
        const point = visual.points[0];
        return make(
          fmt(Math.hypot(point.x, point.y)),
          source,
          "المركبتان على محورين متعامدين؛ مقدار المتجه من فيثاغورس، ويختلف عن مجموع المركبتين.",
          "measure",
        );
      }
      if (lawId === "circle" && /^circle\s*\(/.test(source)) {
        const radius = Number(
          safeParse((parse(source) as FunctionNode).args[0].toString(), [])
            .compile()
            .evaluate(),
        );
        if (!Number.isFinite(radius) || radius <= 0)
          return reject("لم يُحدد نصف قطر موجب عددي.", null);
        return make(
          fmt(Math.PI * radius ** 2),
          source,
          `نصف القطر ${fmt(radius)} موجب؛ المساحة πr² = ${fmt(Math.PI * radius ** 2)}، والمحيط 2πr = ${fmt(2 * Math.PI * radius)}. النتيجة المطلوبة هنا هي المساحة.`,
          "measure",
        );
      }
      if (lawId === "matrix" && visual.kind === "تحويل مصفوفي") {
        const [first, second] = visual.points;
        return make(
          fmt(first.x * second.y - first.y * second.x),
          source,
          "أعمدة المصفوفة هي صور متجهي الوحدة؛ المحدد يعطي عامل المساحة الموقّع، ولا يمثل طولًا أو مساحة مطلقة.",
          "measure",
        );
      }
      return reject(
        `هذا القانون يتطلب: ${law.condition} التمثيل الحالي (${visual.kind}) لا يثبت شروط تطبيقه.`,
        visual.kind === "مثلث بضلعين وزاوية" || visual.kind === "متجه"
          ? false
          : null,
      );
    }
    if (["quadratic", "difference", "balance"].includes(lawId)) {
      const [c, b, a] = coefficients(source);
      if (!source.includes("="))
        return reject("هذا تطبيق لحل معادلة؛ أضف الطرف الآخر وعلامة المساواة.");
      if (lawId === "quadratic") {
        if (a === 0)
          return reject(
            "القانون العام يشترط a ≠ 0؛ هذه ليست معادلة تربيعية، والقسمة على 2a غير معرفة. استخدم توازن المعادلة.",
          );
        const discriminant = b * b - 4 * a * c;
        const reason = `المعامل الرئيسي a = ${fmt(a)} غير صفري، إذن القانون مناسب. المميز = ${fmt(discriminant)}؛ ${discriminant < 0 ? "الجذور مركبة ولا تظهر كتقاطعات حقيقية" : "الجذور هي تقاطعات المنحنى مع محور x"}.`;
        const result = make(analysis.result, analysis.graph, reason, "solve");
        result.steps = [
          {
            before: source,
            after: `${a}*x^2+(${b})*x+(${c})=0`,
            operation: "الصورة القياسية",
            rule: "توازن المعادلة",
            reason: "نطرح الطرف الأيمن من الطرفين.",
          },
          {
            before: `a=${a}, b=${b}, c=${c}`,
            after: `D=${discriminant}`,
            operation: "حساب المميز",
            rule: "D=b²-4ac",
            reason: "المميز يحدد طبيعة الجذور.",
          },
          {
            before: "x=(-b±sqrt(D))/(2a)",
            after: analysis.result,
            operation: "التعويض في القانون العام",
            rule: base.title,
            reason,
          },
        ];
        return result;
      }
      if (lawId === "balance") {
        if (a !== 0 || b === 0)
          return reject(
            "عزل x بهذه الطريقة يتطلب معادلة خطية بمعامل x غير صفري. استخدم القانون العام للتربيعية.",
          );
        return {
          ...make(
            `x=${fmt(-c / b)}`,
            analysis.graph,
            "نجمع أو نطرح المقدار نفسه من الطرفين ثم نقسم على معامل x غير الصفري.",
            "solve",
          ),
          steps: analysis.steps,
        };
      }
      if (a === 0 || b !== 0 || c / a >= 0)
        return reject(
          "فرق المربعين في هذا التطبيق يتطلب حدًا تربيعيًا دون حد خطي، وثابتًا سالبًا بعد القسمة على a. هذه الشروط غير متحققة؛ جرّب التحليل أو القانون العام.",
        );
      return {
        ...make(
          analysis.result,
          analysis.graph,
          "بعد القسمة على a تصبح المعادلة x²-k²=0؛ حاصل الضرب الصفري يعطي الجذرين.",
          "solve",
        ),
        steps: analysis.steps,
      };
    }
    if (["factor", "expand", "square"].includes(lawId)) {
      const sides = normalize(source)
        .replace(/^y\s*=\s*/, "")
        .split("=");
      if (sides.length > 2 || sides.some((side) => !side.trim()))
        return reject("اكتب طرفي المعادلة كاملين.", null);
      if (lawId === "square") {
        let matches = false;
        for (const side of sides)
          safeParse(side, ["x"]).traverse((node) => {
            if (
              node.type !== "OperatorNode" ||
              !("op" in node) ||
              node.op !== "^" ||
              !("args" in node)
            )
              return;
            const args = node.args as ReturnType<typeof safeParse>[];
            const inner =
              args[0].type === "ParenthesisNode" && "content" in args[0]
                ? args[0].content
                : args[0];
            if (
              args[1].toString() === "2" &&
              inner &&
              typeof inner === "object" &&
              "op" in inner &&
              inner.op === "+"
            )
              matches = true;
          });
        if (!matches)
          return reject(
            "لم أجد مربع مجموع في التعبير. لا يجوز حذف الحد الأوسط 2ab أو تطبيق الصيغة على تعبير لا يطابقها.",
          );
      }
      const results = sides.map((side) =>
        symbolic(side, lawId === "factor" ? "factor" : "expand", ["x"]),
      );
      return make(
        results.join("="),
        results.length === 2 ? `(${results[0]})-(${results[1]})` : results[0],
        "العملية الرمزية تحفظ التعبير ومجموعة الحلول على المجال الأصلي. تطابق المنحنيين يوضح التكافؤ، ولا يعني أن كل الجذور استُخرجت.",
      );
    }
    if (["derivative", "integral", "partial-x", "partial-y"].includes(lawId)) {
      const partialLaw = lawId.startsWith("partial");
      const expression = normalize(source).replace(
        partialLaw ? /^z\s*=\s*/ : /^y\s*=\s*/,
        "",
      );
      if (expression.includes("="))
        return reject(
          partialLaw
            ? "الاشتقاق الجزئي هنا يُطبَّق على دالة مثل z = f(x,y)، لا على معادلة ضمنية أو معادلة مطلوب حلها."
            : "الاشتقاق والتكامل هنا يُطبَّقان على دالة، لا يحلان المعادلة ولا يحفظان مجموعة جذورها. اكتب الدالة المراد دراستها.",
        );
      const twoVariables = /\by\b/.test(expression);
      if (!partialLaw && twoVariables)
        return reject(
          `الدالة تعتمد على x وy معًا؛ ${lawId === "derivative" ? "المشتقة العادية d/dx هنا غير محددة" : "التكامل أحادي المتغير هنا غير محدد"} دون بيان المتغير الذي يبقى ثابتًا. استخدم المشتقة الجزئية ∂/∂x أو ∂/∂y من المكتبة.`,
        );
      if (partialLaw && !twoVariables)
        return reject(
          `الدالة في متغير واحد x؛ ${lawId === "partial-y" ? "مشتقتها الجزئية بالنسبة إلى y صفر لأن y غير موجود، وهذا لا يصف تغيرها." : "لا يوجد متغير آخر يُثبَّت."} القانون المناسب هو المشتقة العادية d/dx.`,
        );
      const variable = lawId === "partial-y" ? "y" : "x";
      const explained =
        lawId === "integral"
          ? explainIntegral(expression)
          : explainDerivative(expression, variable);
      const reason = partialLaw
        ? `نشتق بالنسبة إلى ${variable} ونعامل ${variable === "x" ? "y" : "x"} كثابت. على السطح z = f(x,y) يمثل الناتج ميل المقطع الموازي لمحور ${variable}.`
        : lawId === "derivative"
          ? "نحسب معدل تغير الدالة حيث تكون قابلة للاشتقاق؛ منحنى المشتقة والمماس يوضحان تغير الميل، وليس حل المعادلة الأصلية."
          : "نحسب دالة أصلية ونضيف C. الرسم يعرض C=0 ومستطيلات لمساحة موقعة تقريبية؛ الاشتقاق يعيد الدالة الأصلية حيث يكون معرفًا.";
      const applied = make(
        explained.display,
        explained.result,
        explained.verified
          ? reason
          : `${reason} لم يكتمل التحقق العددي من الناتج؛ راجعه قبل اعتماده.`,
        lawId === "integral" ? "integral" : "derivative",
      );
      applied.steps = explained.steps.map((step, index, all) =>
        index === all.length - 1
          ? { ...step, visualExpression: explained.result }
          : step,
      );
      applied.signNotes = explained.signNotes;
      return applied;
    }
    if (["plane-general", "plane-normal"].includes(lawId)) {
      const plane = planeCoefficients(source);
      if (plane) {
        const sign = Math.sign(plane.find((value) => value !== 0)!);
        const [A, B, C, D] = plane.map((value) => value * sign || 0);
        const term = (value: number, name: string) =>
          value === 0 ? "" : `${value < 0 ? "-" : "+"}${Math.abs(value) === 1 ? "" : fmt(Math.abs(value))}${name}`;
        const general =
          `${term(A, "x")}${term(B, "y")}${term(C, "z")}${D === 0 ? "" : `${D < 0 ? "-" : "+"}${fmt(Math.abs(D))}`}`.replace(
            /^\+/,
            "",
          ) + "=0";
        const normal = `(${fmt(A)}, ${fmt(B)}, ${fmt(C)})`;
        const reason = `المعادلة خطية في x وy وz ومعاملاتها ليست كلها صفرًا، إذن هي مستوى. المتجه العمودي n = ${normal}، والمسافة من الأصل |D|/‖n‖ = ${fmt(Math.abs(D) / Math.hypot(A, B, C))}.`;
        const result = make(general, "", reason);
        result.steps = [
          {
            before: source,
            after: general,
            operation: "نقل كل الحدود إلى طرف واحد",
            rule: "توازن المعادلة",
            reason: "نطرح الطرف الأيمن من الطرفين فنحصل على Ax+By+Cz+D=0.",
          },
          {
            before: `A=${fmt(A)}, B=${fmt(B)}, C=${fmt(C)}, D=${fmt(D)}`,
            after: `n=${normal}`,
            operation: "قراءة المتجه العمودي",
            rule: base.title,
            reason,
          },
        ];
        return result;
      }
    }
    const unsupported =
      lawId === "pythagoras"
        ? "يلزم إثبات وجود مثلث قائم وتحديد الضلعين والوتر، أو نقطتين لحساب المسافة. المعادلة وحدها لا تثبت هذه المعطيات؛ لا يمكن اعتماد فيثاغورس هنا."
        : `شروط «${law.title}»: ${law.condition} هذه الشروط غير متحققة في المسألة الحالية.`;
    const substitute = allowSubstitute
      ? suggestLaws(source, lawId)[0]
      : undefined;
    if (substitute)
      return {
        ...substitute,
        message: `${unsupported} لذلك حُلّت المسألة بقانون تحققت شروطه: «${substitute.title}». ${substitute.message}`,
      };
    return reject(
      `${unsupported} لم يجد المحرك قانونًا بديلًا تتحقق شروطه آليًا لحلها.`,
      null,
    );
  } catch {
    return reject(
      "لم يتمكن المحرك من تطبيق هذا القانون على الصيغة الحالية. راجع المتغيرات والمجال والشروط؛ لا توجد نتيجة معتمدة لهذه المحاولة.",
      null,
    );
  }
}

/** Returns [A,B,C,D] when the source is a linear equation in x, y, z that mentions z. */
function planeCoefficients(source: string) {
  const expression = normalize(source);
  if (!/\bz\b|\dz\b/.test(expression)) return null;
  const sides = expression.split("=");
  if (sides.length !== 2 || sides.some((side) => !side.trim())) return null;
  try {
    const [left, right] = sides.map((side) => parse(side).compile());
    const f = (x: number, y: number, z: number) => {
      const value = Number(left.evaluate({ x, y, z })) - Number(right.evaluate({ x, y, z }));
      return Number.isFinite(value) ? value : NaN;
    };
    const D = f(0, 0, 0);
    const A = f(1, 0, 0) - D;
    const B = f(0, 1, 0) - D;
    const C = f(0, 0, 1) - D;
    if (![A, B, C, D].every(Number.isFinite) || (A === 0 && B === 0 && C === 0))
      return null;
    for (const [x, y, z] of [
      [1.7, -2.3, 0.9],
      [-3.1, 0.4, 2.6],
    ]) {
      const expected = A * x + B * y + C * z + D;
      if (Math.abs(f(x, y, z) - expected) > 1e-9 * Math.max(1, Math.abs(expected)))
        return null;
    }
    const round = (value: number) => Math.round(value * 1e9) / 1e9;
    return [A, B, C, D].map(round) as [number, number, number, number];
  } catch {
    return null;
  }
}

function compareAnswer(
  expected: string,
  answer: string,
  attempt: LawAttempt,
  kind: "derivative" | "integral",
): Verdict {
  let expectedValue: ReturnType<typeof compileFunction>,
    answerValue: ReturnType<typeof compileFunction>;
  try {
    expectedValue = compileFunction(expected);
    answerValue = compileFunction(answer);
  } catch {
    return {
      valid: null,
      message: "تعذر قراءة الإجابة؛ اكتبها بدلالة x (وy في الاشتقاق الجزئي).",
    };
  }
  const scope = { y: 0.65, a: 1.4, b: 0.6, c: -0.45 };
  let agreements = 0,
    negated = true,
    counterexample: { x: number; expected: number; answer: number } | null =
      null;
  for (const x of [-2.7, -1.9, -1.1, -0.4, 0.3, 0.8, 1.3, 2.2, 3.1]) {
    const correct = expectedValue(x, scope),
      given = answerValue(x, scope);
    if (!Number.isFinite(correct) || !Number.isFinite(given)) continue;
    const tolerance = 1e-6 * Math.max(1, Math.abs(correct));
    if (Math.abs(correct + given) > tolerance) negated = false;
    if (Math.abs(correct - given) <= tolerance) agreements += 1;
    else counterexample ??= { x, expected: correct, answer: given };
  }
  const subject = kind === "integral" ? "مشتقة إجابتك" : "إجابتك";
  const reference =
    kind === "integral" ? "الدالة تحت التكامل" : "المشتقة الصحيحة";
  if (counterexample) {
    const where = `عند x = ${piLabel(counterexample.x)}${/\by\b/.test(expected) ? " وy = 0.65" : ""} تعطي ${subject} ${fmt(counterexample.answer)}، بينما ${reference} ${fmt(counterexample.expected)}.`;
    return {
      valid: false,
      message: negated
        ? `الإشارة معكوسة: ${where} ${attempt.signNotes?.[0] ?? (kind === "integral" ? "اشتقاق الدالة الأصلية يجب أن يعيد الدالة تحت التكامل بالإشارة نفسها." : "قارن إشارة إجابتك بإشارة ميل المنحنى.")}`
        : `الإجابة غير صحيحة: ${where} هذه نقطة مضادة تكفي لنفي التكافؤ.${kind === "integral" ? " اشتقاق الدالة الأصلية يجب أن يعيد الدالة تحت التكامل." : ""}`,
    };
  }
  return agreements >= 5
    ? {
        valid: null,
        message: `${subject} تطابق ${reference} عند كل النقاط المفحوصة؛ يبدو أنها صيغة مكافئة، لكن المحرك لم يثبت التكافؤ رمزيًا.`,
      }
    : {
        valid: null,
        message:
          "لم تتوفر نقاط كافية معرّفة للمقارنة؛ لا يمكن الحكم على الإجابة تلقائيًا.",
      };
}

const candidateLaws = [
  "balance",
  "quadratic",
  "factor",
  "difference",
  "derivative",
  "integral",
  "partial-x",
  "partial-y",
  "pythagoras",
  "cosine",
  "triangle",
  "circle",
  "vectors",
  "matrix",
];

/** Laws whose conditions are verified for this exact problem; several may be valid at once. */
export function suggestLaws(source: string, exclude?: string) {
  const equation = normalize(source)
    .replace(/^[yz]\s*=\s*/, "")
    .includes("=");
  return candidateLaws
    .filter((id) => id !== exclude)
    .map((id) => tryLaw(source, id, false))
    .filter(
      (attempt) =>
        attempt.valid === true &&
        (equation
          ? attempt.purpose === "solve" ||
            (attempt.lawId === "factor" && /\)\s*\*?\s*\(/.test(attempt.output))
          : attempt.purpose !== "solve" && attempt.purpose !== "transform"),
    );
}

export type Diagnosis = {
  category:
    | "law-unsuitable"
    | "application-error"
    | "correct"
    | "applicable"
    | "unverified"
    | "incomplete";
  title: string;
  explanation: string;
  alternatives: { lawId: string; title: string; message: string }[];
};

export function diagnoseSolution(
  source: string,
  attempt: LawAttempt | undefined,
  steps: Verdict[],
  final: Verdict,
  fitting: LawAttempt[] = suggestLaws(source, attempt?.lawId),
): Diagnosis {
  const goal = (item: LawAttempt) =>
    item.lawId === "factor" ? "solve" : item.purpose;
  const alternatives = fitting
    .filter((item) => !attempt?.valid || goal(item) === goal(attempt))
    .slice(0, 4)
    .map(({ lawId, title, message }) => ({ lawId, title, message }));
  const names = alternatives.map((item) => `«${item.title}»`).join("، ");
  const firstError = steps.findIndex((step) => step.valid === false);
  if (attempt && attempt.valid === false)
    return {
      category: "law-unsuitable",
      title: `«${attempt.title}» غير مناسب لهذه المسألة`,
      explanation: `${attempt.message} المشكلة في اختيار القانون، وليست خطأً حسابيًا: شرط تطبيقه غير متحقق في المسألة الحالية.${alternatives.length ? ` القانون المناسب: «${alternatives[0].title}»؛ ${alternatives[0].message}` : " لا يوجد في المكتبة تطبيق آلي بديل متحقق لهذه المسألة."}`,
      alternatives,
    };
  if (firstError !== -1)
    return {
      category: "application-error",
      title: attempt?.valid
        ? `«${attempt.title}» مناسب، لكن تطبيقه فيه خطأ`
        : `خطأ في الخطوة ${firstError + 1}`,
      explanation: `بدأ الخطأ في خطوتك ${firstError + 1}: ${steps[firstError].message}${attempt?.valid ? " شروط القانون متحققة، فلا داعي لتغييره؛ صحّح هذه الخطوة وتابع بالقانون نفسه." : ""}`,
      alternatives,
    };
  if (final.valid === false)
    return {
      category: "application-error",
      title: attempt?.valid
        ? `«${attempt.title}» مناسب، لكن الناتج النهائي خاطئ`
        : "الناتج النهائي غير صحيح",
      explanation: `${final.message}${attempt?.valid ? " القانون نفسه صالح هنا؛ الخطأ في التطبيق، فراجع التعويض والإشارات." : ""}`,
      alternatives,
    };
  if (final.valid === true)
    return {
      category: "correct",
      title: "الحل صحيح",
      explanation: alternatives.length
        ? `${final.message} توجد طرق صحيحة أخرى لهذه المسألة: ${names}. اختلاف الطريقة لا يعني الخطأ؛ كل طريقة تحققت شروطها توصل إلى النتيجة نفسها.`
        : final.message,
      alternatives,
    };
  if (attempt?.valid === true)
    return {
      category: "applicable",
      title: `«${attempt.title}» مناسب لهذه المسألة`,
      explanation: `${attempt.message} أدخل خطواتك أو نتيجتك النهائية ليراجع المستشار تطبيقك.${alternatives.length ? ` يمكن الحل أيضًا بـ ${names}.` : ""}`,
      alternatives,
    };
  if (attempt)
    return {
      category: "unverified",
      title: `تعذر الحكم على «${attempt.title}» تلقائيًا`,
      explanation: `${attempt.message}${alternatives.length ? ` القوانين التي تحققت شروطها هنا: ${names}.` : ""}`,
      alternatives,
    };
  return {
    category: "incomplete",
    title: "اختر قانونًا أو أدخل خطوة لمراجعتها",
    explanation: alternatives.length
      ? `القوانين التي تحققت شروطها على المسألة الحالية: ${names}.`
      : "لم يجد المحرك قانونًا مدعومًا تتحقق شروطه آليًا على هذه المسألة.",
    alternatives,
  };
}

export function verifyFinal(
  source: string,
  answer: string,
  attempt?: LawAttempt,
): Verdict {
  if (!answer.trim())
    return {
      valid: null,
      message:
        "لم تدخل نتيجة نهائية بعد؛ نجاح تطبيق القانون لا يعني اكتمال حل الطالب.",
    };
  if (attempt?.valid && attempt.purpose === "measure") {
    let value: unknown;
    try {
      value = safeParse(answer, []).compile().evaluate();
    } catch {
      return {
        valid: null,
        message: "اكتب قياسًا عدديًا أو تعبيرًا مثل sqrt(13).",
      };
    }
    if (typeof value !== "number" || !Number.isFinite(value))
      return {
        valid: null,
        message: "القياس يجب أن يكون عددًا حقيقيًا منتهيًا.",
      };
    const expected = Number(attempt.output);
    const tolerance =
      expected === 0
        ? 0
        : Math.abs(expected) < 1e-6
          ? 5e-5 * Math.abs(expected)
          : 1e-6 * Math.max(1, Math.abs(expected));
    const valid = Math.abs(value - expected) <= tolerance;
    return {
      valid,
      message: valid
        ? `القياس صحيح ضمن دقة العرض. ${attempt.message}`
        : `القياس غير صحيح؛ راجع التعويض ووحدات الطول والمساحة. النتيجة المرجعية ${attempt.output}. ${attempt.message}`,
    };
  }
  if (attempt?.valid && attempt.purpose === "integral") {
    try {
      const expression = normalize(answer);
      const node = safeParse(expression, ["x", "C"]);
      let hasConstant = false;
      node.traverse((child) => {
        if (
          child.type === "SymbolNode" &&
          "name" in child &&
          child.name === "C"
        )
          hasConstant = true;
      });
      if (!hasConstant)
        return {
          valid: false,
          message:
            "هذه ليست عائلة الحل الكاملة؛ أضف ثابت التكامل C المستقل عن x.",
        };
      const differentiated = symbolic(expression, "derivative", ["x", "C"]);
      const constantRate = Number(
        symbolic(derivative(node, "C").toString(), "simplify", ["x", "C"]),
      );
      if (differentiated.includes("C") || constantRate === 0)
        return {
          valid: false,
          message:
            "يجب أن يكون C ثابتًا حرًا مضافًا مستقلًا عن x، وليس معاملًا يغيّر المشتقة أو حدًا يُلغى من النتيجة.",
        };
      if (!Number.isFinite(constantRate))
        return {
          valid: null,
          message:
            "هذه صيغة غير خطية لثابت التكامل؛ يلزم التحقق من مجال الثابت وهل تولّد جميع الدوال الأصلية. اختلاف كتابتها عن + C وحده لا يثبت الخطأ.",
        };
      const integrand = normalize(source).replace(/^y\s*=\s*/, "");
      const verdict = verifyTransition(integrand, differentiated);
      return verdict.valid !== null
        ? verdict
        : compareAnswer(integrand, differentiated, attempt, "integral");
    } catch {
      return {
        valid: null,
        message:
          "لم يتمكن المحرك من التحقق من الدالة الأصلية. راجع المجال وثابت التكامل.",
      };
    }
  }
  if (
    attempt?.valid &&
    (attempt.purpose === "derivative" ||
      (attempt.purpose === "transform" && !source.includes("=")))
  ) {
    const verdict = verifyTransition(attempt.preview, answer);
    return verdict.valid !== null || attempt.purpose !== "derivative"
      ? verdict
      : compareAnswer(attempt.preview, answer, attempt, "derivative");
  }
  const analysis = analyze(source);
  if (!source.includes("=") || !analysis.supported)
    return {
      valid: null,
      message:
        "التحقق النهائي التلقائي متاح لقائمة جذور معادلة خطية أو تربيعية. الحالات الأخرى تحتاج مراجعة إضافية.",
    };
  const expected = analysis.roots.map((root) => ({ re: root, im: 0 }));
  if (!expected.length) {
    try {
      const [c, b, a] = coefficients(source),
        discriminant = b * b - 4 * a * c;
      if (a !== 0 && discriminant < 0)
        expected.push(
          { re: -b / (2 * a), im: Math.sqrt(-discriminant) / Math.abs(2 * a) },
          { re: -b / (2 * a), im: -Math.sqrt(-discriminant) / Math.abs(2 * a) },
        );
    } catch {
      return { valid: null, message: "تعذر حساب الجذور المرجعية." };
    }
    if (!expected.length)
      return {
        valid: null,
        message:
          "المعادلات المتطابقة أو عديمة الحل تحتاج صياغة نهائية مختلفة عن قائمة الجذور.",
      };
  }
  const roots = normalize(answer)
    .split(/[,،;]/)
    .map((part) => part.trim().replace(/^x\s*=\s*/, ""));
  try {
    const parsed = roots.map((part) => {
      const value: unknown = safeParse(part, ["i"]).compile().evaluate();
      if (typeof value === "number" && Number.isFinite(value))
        return { re: value, im: 0 };
      if (
        isComplex(value) &&
        Number.isFinite(value.re) &&
        Number.isFinite(value.im)
      )
        return { re: value.re, im: value.im };
      throw new Error("invalid root");
    });
    const values = parsed.filter(
      (value, index) =>
        !parsed
          .slice(0, index)
          .some((other) => other.re === value.re && other.im === value.im),
    );
    const near = (value: number, root: number) =>
      Math.abs(value - root) <=
      (root === 0
        ? 0
        : Math.abs(root) < 1e-6
          ? Math.abs(root) * 5e-5
          : 1e-6 * Math.max(1, Math.abs(root)));
    const valid =
      values.length === expected.length &&
      expected.every((root) =>
        values.some(
          (value) => near(value.re, root.re) && near(value.im, root.im),
        ),
      );
    return {
      valid,
      message: valid
        ? "النتيجة صحيحة: القيم تحقق المعادلة الأصلية وجميع جذورها مذكورة."
        : `النتيجة لا تحقق جميع حلول المسألة الأصلية: يوجد جذر خاطئ أو مفقود. الحل المرجعي: ${analysis.result}. عُد إلى آخر خطوة صحيحة وأعد التعويض.`,
    };
  } catch {
    return {
      valid: null,
      message:
        "اكتب جميع قيم x مفصولة بفاصلة، مثل -2,-3 أو i,-i؛ لا تُدخل المعادلة غير المحلولة بوصفها نتيجة نهائية.",
    };
  }
}
