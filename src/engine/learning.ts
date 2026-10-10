import {
  analyze,
  coefficients,
  fmt,
  normalize,
  safeParse,
  symbolic,
} from "./math";
import type { Step } from "./math";
import { topics } from "../content/knowledge";
import { prepareWorkspaceVisual } from "./visual";
import { derivative, isComplex, parse } from "mathjs";
import type { FunctionNode } from "mathjs";

export type Verdict = { valid: boolean | null; message: string };
export type LawAttempt = Verdict & {
  lawId: string;
  title: string;
  source: string;
  output: string;
  preview: string;
  steps: Step[];
  purpose: "solve" | "transform" | "derivative" | "integral" | "measure";
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
];

export function verifyTransition(before: string, after: string): Verdict {
  try {
    if (normalize(before).includes("=") !== normalize(after).includes("="))
      return {
        valid: null,
        message: "لا تقارن معادلة بتعبير منفرد؛ اكتب طرفي الخطوة.",
      };
    if (before.includes("=")) {
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

export function tryLaw(source: string, lawId: string): LawAttempt {
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
        const result =
          lawId === "triangle"
            ? Math.abs(first.x * second.y - first.y * second.x) / 2
            : Math.hypot(first.x - second.x, first.y - second.y);
        const reason =
          lawId === "triangle"
            ? "المساحة نصف القاعدة في الارتفاع العمودي؛ الارتفاع هو b sin(θ)، وليس الضلع المائل."
            : lawId === "pythagoras"
              ? "الزاوية المحصورة قائمة والضلع المقابل هو الوتر؛ مجموع مربعي الضلعين يساوي مربع الوتر."
              : "المعطيات توفر ضلعين والزاوية المحصورة. نصحح مجموع المربعين بالحد -2ab cos(θ)؛ في القائمة يساوي هذا الحد صفرًا.";
        return make(fmt(result), source, reason, "measure");
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
    if (["derivative", "integral"].includes(lawId)) {
      const expression = normalize(source).replace(/^y\s*=\s*/, "");
      if (expression.includes("="))
        return reject(
          "الاشتقاق والتكامل هنا يُطبَّقان على دالة، لا يحلان المعادلة ولا يحفظان مجموعة جذورها. اكتب الدالة المراد دراستها.",
        );
      const result = symbolic(expression, lawId as "derivative" | "integral", [
        "x",
      ]);
      const reason =
        lawId === "derivative"
          ? "نحسب معدل تغير الدالة حيث تكون قابلة للاشتقاق؛ منحنى المشتقة والمماس يوضحان تغير الميل، وليس حل المعادلة الأصلية."
          : "نحسب دالة أصلية ونضيف C. الرسم يعرض C=0 ومستطيلات لمساحة موقعة تقريبية؛ الاشتقاق يعيد الدالة الأصلية حيث يكون معرفًا.";
      return make(
        result + (lawId === "integral" ? " + C" : ""),
        result,
        reason,
        lawId as "derivative" | "integral",
      );
    }
    if (lawId === "pythagoras")
      return reject(
        "يلزم إثبات وجود مثلث قائم وتحديد الضلعين والوتر، أو نقطتين لحساب المسافة. المعادلة وحدها لا تثبت هذه المعطيات؛ لا يمكن اعتماد فيثاغورس هنا.",
        null,
      );
    return reject(
      `شروط التطبيق: ${law.condition} لم تُثبت هذه المعطيات في المسألة الحالية؛ يمكن تسجيل المحاولة، لكن التطبيق الآلي لهذا القانون غير مدعوم هنا.`,
      null,
    );
  } catch {
    return reject(
      "لم يتمكن المحرك من تطبيق هذا القانون على الصيغة الحالية. راجع المتغيرات والمجال والشروط؛ لا توجد نتيجة معتمدة لهذه المحاولة.",
      null,
    );
  }
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
    const value = Number(normalize(answer));
    if (!Number.isFinite(value))
      return { valid: null, message: "اكتب القيمة العددية للقياس الذي طبقته." };
    const valid =
      Math.abs(value - Number(attempt.output)) <=
      1e-6 * Math.max(1, Math.abs(Number(attempt.output)));
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
      if (
        differentiated.includes("C") ||
        constantRate === 0
      )
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
      return verifyTransition(
        normalize(source).replace(/^y\s*=\s*/, ""),
        differentiated,
      );
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
    return verifyTransition(attempt.preview, answer);
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
