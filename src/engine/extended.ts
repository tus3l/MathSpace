import { ConstantNode, parse } from "mathjs";
import type { MathNode } from "mathjs";
import nerdamer from "nerdamer";
import {
  analyze,
  coefficients,
  compileFunction,
  fmt,
  normalize,
  safeParse,
  symbolic,
} from "./math";
import type { Analysis } from "./math";
import { explainIntegral, verifyDerivativePair } from "./calculusSteps";
import { explainStep } from "./explanation";

export const fmtValue = (value: number) =>
  value === Infinity ? "∞" : value === -Infinity ? "-∞" : fmt(value);

function functionRequest(input: string, name: string, usage: string) {
  const normalized = normalize(input).replace(/∞/g, "Infinity");
  if (!new RegExp(`^${name}\\s*\\(`).test(normalized)) return null;
  const node = parse(normalized);
  if (node.type !== "FunctionNode" || !("args" in node))
    throw new Error(`اكتب الصيغة على الصورة ${usage}.`);
  return (node.args as MathNode[]).map((arg) => arg.toString());
}

function argumentsOf(input: string, name: string, usage: string, count: number) {
  const args = functionRequest(input, name, usage);
  if (args && args.length !== count)
    throw new Error(`اكتب الصيغة على الصورة ${usage}.`);
  return args;
}

/** Returns ±Infinity for an infinite bound, otherwise null. */
export function infiniteBound(text: string) {
  const compact = text.replace(/\s+/g, "");
  if (!/^[+-]?(Infinity|∞)$/.test(compact)) return null;
  return compact.startsWith("-") ? -Infinity : Infinity;
}

export function boundValue(
  text: string,
  scope: Record<string, number> = {},
  allowInfinite = false,
) {
  const infinite = infiniteBound(text);
  if (infinite !== null) {
    if (!allowInfinite) throw new Error("∞ غير مسموح في هذا الموضع.");
    return infinite;
  }
  const value: unknown = safeParse(text, Object.keys(scope))
    .compile()
    .evaluate(scope);
  if (typeof value !== "number" || !Number.isFinite(value))
    throw new Error("الحدود يجب أن تكون أعدادًا حقيقية منتهية أو ∞.");
  return value;
}

export function definiteIntegralRequest(input: string) {
  const args = argumentsOf(
    input,
    "definiteIntegral",
    "definiteIntegral(f, a, b)",
    3,
  );
  return args ? { expression: args[0], from: args[1], to: args[2] } : null;
}

export function limitRequest(input: string) {
  const args = argumentsOf(input, "limit", "limit(f, x, a)", 3);
  if (!args) return null;
  if (args[1].trim() !== "x") throw new Error("استخدم x متغيرًا للنهاية.");
  return { expression: args[0], target: args[2] };
}

export function sumRequest(input: string) {
  const args = argumentsOf(input, "sum", "sum(f, n, a, b)", 4);
  if (!args) return null;
  const variable = args[1].trim();
  if (!/^[a-df-z]$/.test(variable))
    throw new Error("متغير المجموع يجب أن يكون حرفًا واحدًا مثل n أو k.");
  return { expression: args[0], variable, from: args[2], to: args[3] };
}

/** NaN: undefined on that side; null: values did not settle. */
type OneSided = number | null;
function oneSided(
  evaluate: (x: number) => number,
  target: number,
  side: 1 | -1,
  symbolicValue: number | null,
): OneSided {
  const finite = Number.isFinite(target);
  const xs = finite
    ? [1e-1, 1e-2, 1e-3, 1e-4, 1e-5].map(
        (h) => target + side * h * Math.max(1, Math.abs(target)),
      )
    : [1e2, 1e3, 1e4, 1e5, 1e6].map((x) => Math.sign(target) * x);
  const [p, q, r] = xs.map(evaluate).slice(-3);
  if (![p, q, r].every(Number.isFinite)) return NaN;
  const anchor = finite ? evaluate(target) : NaN;
  if (Number.isFinite(anchor) && Math.abs(r - anchor) <= 1e-2 * (1 + Math.abs(anchor)))
    return anchor;
  if (
    Math.abs(r - q) <= 1e-3 * (1 + Math.abs(r)) &&
    Math.abs(q - p) <= 1e-2 * (1 + Math.abs(r))
  )
    return r;
  if (
    Math.abs(r) > 1e3 &&
    Math.abs(q) >= 2 * Math.abs(p) &&
    Math.abs(r) >= 2 * Math.abs(q) &&
    Math.sign(p) === Math.sign(r) &&
    Math.sign(q) === Math.sign(r)
  )
    return Math.sign(r) * Infinity;
  if (symbolicValue !== null) {
    if (
      !Number.isFinite(symbolicValue) &&
      Math.sign(r) === Math.sign(symbolicValue) &&
      Math.abs(r) > Math.abs(q) &&
      Math.abs(q) > Math.abs(p)
    )
      return symbolicValue;
    const [dp, dq, dr] = [p, q, r].map((value) => Math.abs(value - symbolicValue));
    // Slow but monotone approach towards the symbolic value (e.g. √h rates).
    if (dr < dq && dq < dp && dr <= 0.05 * (1 + Math.abs(symbolicValue)))
      return symbolicValue;
  }
  return null;
}

function symbolicLimit(
  expression: string,
  target: number,
  scope: Record<string, number>,
) {
  try {
    const substituted = parse(normalize(expression))
      .transform((node) =>
        node.type === "SymbolNode" &&
        "name" in node &&
        typeof node.name === "string" &&
        Object.hasOwn(scope, node.name)
          ? new ConstantNode(scope[node.name])
          : node,
      )
      .toString();
    const text = nerdamer(
      `limit(${substituted},x,${target === Infinity ? "Infinity" : target === -Infinity ? "-Infinity" : target})`,
    ).toString();
    if (/limit\(/.test(text)) return null;
    if (text === "Inf") return { text: "∞", value: Infinity };
    if (text === "-Inf") return { text: "-∞", value: -Infinity };
    const value: unknown = safeParse(text, []).compile().evaluate();
    return typeof value === "number" && Number.isFinite(value)
      ? { text, value }
      : null;
  } catch {
    return null;
  }
}

const close = (first: number, second: number, tolerance = 1e-3) =>
  first === second ||
  (Number.isFinite(first) &&
    Number.isFinite(second) &&
    Math.abs(first - second) <= tolerance * (1 + Math.abs(first)));

export type LimitResult = {
  status: "exists" | "differs" | "unknown";
  value: number;
  exact: string | null;
  left: OneSided;
  right: OneSided;
  oneSidedOnly: boolean;
};

/** Numeric one-sided estimates decide existence; a symbolic value is shown only when it agrees with them. */
export function evaluateLimit(
  expression: string,
  target: number,
  scope: Record<string, number> = {},
  variables = ["x"],
): LimitResult {
  if (Number.isNaN(target)) throw new Error("نقطة النهاية غير صالحة.");
  safeParse(expression, variables);
  const compiled = compileFunction(expression);
  const evaluate = (x: number) => compiled(x, scope);
  const finite = Number.isFinite(target);
  const symbolicValue = symbolicLimit(expression, target, scope);
  const side = (direction: 1 | -1) =>
    oneSided(evaluate, target, direction, symbolicValue?.value ?? null);
  const right = finite || target < 0 ? side(1) : NaN;
  const left = finite || target > 0 ? side(-1) : NaN;
  const defined = [left, right].filter(
    (value): value is number | null => !Number.isNaN(value),
  );
  if (!defined.length)
    throw new Error("الدالة غير معرّفة قرب نقطة النهاية.");
  const base = {
    left,
    right,
    exact: null,
    oneSidedOnly: finite && defined.length === 1,
  };
  if (defined.some((value) => value === null))
    return { ...base, status: "unknown", value: NaN };
  const [first, second] = defined as number[];
  if (second !== undefined && !close(first, second, 1e-2))
    return { ...base, status: "differs", value: NaN };
  const value = second === undefined ? first : (first + second) / 2;
  if (symbolicValue && close(symbolicValue.value, value, 1e-2))
    return {
      ...base,
      status: "exists",
      value: symbolicValue.value,
      exact: symbolicValue.text,
    };
  return { ...base, status: "exists", value };
}

export function definiteIntegral(
  expression: string,
  from: number,
  to: number,
  scope: Record<string, number> = {},
  variables = ["x"],
) {
  if (Number.isNaN(from) || Number.isNaN(to))
    throw new Error("حدود التكامل يجب أن تكون أعدادًا حقيقية.");
  safeParse(expression, variables);
  const evaluate = compileFunction(expression);
  const improper = !Number.isFinite(from) || !Number.isFinite(to);
  const sampleFrom = Number.isFinite(from) ? from : Number.isFinite(to) ? to - 1000 : -1000;
  const sampleTo = Number.isFinite(to) ? to : Number.isFinite(from) ? from + 1000 : 1000;
  const count = improper ? 20000 : 2000,
    width = (sampleTo - sampleFrom) / count;
  let total = 0;
  for (let index = 0; index <= count; index++) {
    const value = evaluate(sampleFrom + index * width, scope);
    if (!Number.isFinite(value))
      throw new Error(
        "الدالة غير معرّفة عند نقطة داخل فترة التكامل؛ التكامل المعتل عند نقطة داخلية خارج نطاق الحساب الحالي.",
      );
    total += value * (index === 0 || index === count ? 1 : index % 2 ? 4 : 2);
  }
  const numeric = (total * width) / 3;
  let antiderivative: string | null = null;
  try {
    const explained = explainIntegral(expression);
    if (explained.verified) antiderivative = explained.result;
  } catch {
    antiderivative = null;
  }
  try {
    antiderivative ??= symbolic(expression, "integral", variables);
  } catch {
    antiderivative = null;
  }
  if (improper) {
    if (!antiderivative || !verifyDerivativePair(antiderivative, expression))
      throw new Error(
        "التكامل المعتل يحتاج دالة أصلية متحققًا منها، ولم يجدها المحرك لهذه الدالة.",
      );
    const primitive = compileFunction(antiderivative);
    const edge = (bound: number) => {
      if (Number.isFinite(bound)) {
        const value = primitive(bound, scope);
        if (!Number.isFinite(value))
          throw new Error("الدالة الأصلية غير معرّفة عند حد التكامل.");
        return value;
      }
      const limit = evaluateLimit(antiderivative!, bound, scope, variables);
      if (limit.status !== "exists")
        throw new Error("لم يمكن تحديد نهاية الدالة الأصلية عند ∞؛ التكامل غير محسوم.");
      return limit.value;
    };
    const upper = edge(to),
      lower = edge(from);
    const value = upper - lower;
    if (Number.isNaN(value))
      throw new Error("التكامل متباعد: الصورة ∞ − ∞ غير معرّفة.");
    return { value, antiderivative, upper, lower, improper };
  }
  try {
    if (!antiderivative) throw new Error("No antiderivative");
    const primitive = compileFunction(antiderivative);
    const upper = primitive(to, scope),
      lower = primitive(from, scope);
    // Reject antiderivatives that jump inside the interval (e.g. log|x| across 0).
    if (
      Number.isFinite(upper - lower) &&
      Math.abs(upper - lower - numeric) <= 1e-4 * (1 + Math.abs(numeric))
    )
      return { value: upper - lower, antiderivative, upper, lower, improper };
  } catch {
    /* Fall back to the numeric estimate. */
  }
  return { value: numeric, antiderivative: null, upper: NaN, lower: NaN, improper };
}

export type SeriesResult = {
  status: "exact" | "converges" | "diverges" | "unknown";
  value: number;
  terms: { index: number; value: number }[];
  partials: { count: number; value: number }[];
};

export function evaluateSum(
  expression: string,
  variable: string,
  from: number,
  to: number,
  scope: Record<string, number> = {},
): SeriesResult {
  if (!Number.isInteger(from) || !(Number.isInteger(to) || to === Infinity))
    throw new Error("حدود المجموع يجب أن تكون أعدادًا صحيحة، والحد العلوي قد يكون ∞.");
  const code = safeParse(expression, [variable, ...Object.keys(scope)]).compile();
  const term = (index: number) => {
    const value: unknown = code.evaluate({ ...scope, [variable]: index });
    if (typeof value !== "number" || !Number.isFinite(value))
      throw new Error(`الحد عند ${variable} = ${index} غير معرّف.`);
    return value;
  };
  const last = to === Infinity ? from + 99999 : to;
  if (last - from >= 100000)
    throw new Error("عدد الحدود أكبر من 100000؛ استخدم ∞ للمتسلسلات اللانهائية.");
  const terms: SeriesResult["terms"] = [];
  const partials: SeriesResult["partials"] = [];
  let total = 0;
  for (let index = from; index <= last; index++) {
    const value = term(index);
    total += value;
    if (terms.length < 60) terms.push({ index, value });
    const count = index - from + 1;
    if ([10, 100, 1000, 10000, 100000].includes(count))
      partials.push({ count, value: total });
  }
  if (to !== Infinity) return { status: "exact", value: total, terms, partials };
  const [, , previous, , final] = partials.map((item) => item.value);
  const tail = Math.abs(term(last));
  if (Math.abs(final - partials[3].value) <= 1e-9 * (1 + Math.abs(final)))
    return { status: "converges", value: final, terms, partials };
  if (tail > 1e-3 && Math.abs(final) > Math.abs(previous))
    return { status: "diverges", value: Math.sign(final) * Infinity, terms, partials };
  return { status: "unknown", value: final, terms, partials };
}

type Relation = "<" | "<=" | ">" | ">=" | "!=";
export type InequalityInterval = {
  from: number;
  to: number;
  includeFrom: boolean;
  includeTo: boolean;
};

export function inequalityParts(input: string) {
  const parts = normalize(input)
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/≠/g, "!=")
    .split(/(<=|>=|!=|<|>)/);
  if (parts.length === 1) return null;
  if (parts.length !== 3 || parts.some((part) => !part.trim()) || /=/.test(parts[0] + parts[2]))
    throw new Error("اكتب متباينة واحدة بطرفين، مثل x^2-4 < 0.");
  return { left: parts[0], relation: parts[1] as Relation, right: parts[2] };
}

const polynomialText = (a: number, b: number, c: number) =>
  (
    [
      [a, "x^2"],
      [b, "x"],
      [c, ""],
    ] as [number, string][]
  )
    .filter(([value]) => value !== 0)
    .map(([value, power], index) => {
      const magnitude = Math.abs(value);
      const body =
        power && magnitude === 1
          ? power
          : `${fmt(magnitude)}${power ? "*" + power : ""}`;
      return `${value < 0 ? (index ? " - " : "-") : index ? " + " : ""}${body}`;
    })
    .join("") || "0";

export function intervalText(intervals: InequalityInterval[]) {
  if (!intervals.length) return "∅";
  return intervals
    .map((interval) =>
      interval.from === interval.to
        ? `{${fmt(interval.from)}}`
        : interval.from === -Infinity && interval.to === Infinity
          ? "ℝ"
          : `${interval.includeFrom ? "[" : "("}${fmtValue(interval.from)}, ${fmtValue(interval.to)}${interval.includeTo ? "]" : ")"}`,
    )
    .join(" ∪ ");
}

export function solveInequality(input: string) {
  const parts = inequalityParts(input);
  if (!parts) return null;
  const [c, b, a] = coefficients(`${parts.left}=${parts.right}`);
  const roots: number[] = [];
  if (a !== 0) {
    const discriminant = b * b - 4 * a * c;
    if (Math.abs(discriminant) < 1e-12) roots.push(-b / (2 * a));
    else if (discriminant > 0)
      roots.push(
        ...[(-b - Math.sqrt(discriminant)) / (2 * a), (-b + Math.sqrt(discriminant)) / (2 * a)].sort(
          (first, second) => first - second,
        ),
      );
  } else if (b !== 0) roots.push(-c / b);
  const polynomial = (x: number) => a * x * x + b * x + c;
  const satisfies = (value: number) =>
    parts.relation === "<"
      ? value < 0
      : parts.relation === "<="
        ? value <= 0
        : parts.relation === ">"
          ? value > 0
          : parts.relation === ">="
            ? value >= 0
            : value !== 0;
  const bounds = [-Infinity, ...roots, Infinity];
  const signs = bounds.slice(0, -1).map((start, index) => {
    const end = bounds[index + 1];
    const test =
      start === -Infinity && end === Infinity
        ? 0
        : start === -Infinity
          ? end - 1
          : end === Infinity
            ? start + 1
            : (start + end) / 2;
    return { from: start, to: end, test, value: polynomial(test) };
  });
  const intervals: InequalityInterval[] = [];
  const extend = (interval: InequalityInterval) => {
    const previous = intervals.at(-1);
    if (previous && previous.to === interval.from && (previous.includeTo || interval.includeFrom))
      Object.assign(previous, { to: interval.to, includeTo: interval.includeTo });
    else intervals.push(interval);
  };
  signs.forEach((piece, index) => {
    if (satisfies(piece.value))
      extend({ from: piece.from, to: piece.to, includeFrom: false, includeTo: false });
    const root = roots[index];
    if (root !== undefined && satisfies(0)) {
      const previous = intervals.at(-1);
      if (previous && previous.to === root) previous.includeTo = true;
      else intervals.push({ from: root, to: root, includeFrom: true, includeTo: true });
    }
  });
  return {
    ...parts,
    coefficients: [a, b, c] as const,
    expression: polynomialText(a, b, c),
    roots,
    signs,
    intervals,
    text: intervalText(intervals),
  };
}

export function expandPlusMinus(input: string) {
  const normalized = normalize(input);
  const index = normalized.indexOf("±");
  if (index < 0) return null;
  if (normalized.includes("±", index + 1))
    throw new Error("استخدم ± مرة واحدة في المدخل.");
  return (["+", "-"] as const).map(
    (sign) => normalized.slice(0, index) + sign + normalized.slice(index + 1),
  ) as [string, string];
}

const step = (
  before: string,
  operation: string,
  after: string,
  reason: string,
  rule: string,
) => explainStep({ before, operation, after, rule }, reason);

const sideText = (value: OneSided) =>
  value === null ? "لم تستقر" : Number.isNaN(value) ? "غير معرّفة" : fmtValue(value);

/** Handles ±, inequalities, limits, sums and definite integrals; returns null for other inputs. */
export function analyzeExtended(input: string, base: Analysis): Analysis | null {
  const branches = expandPlusMinus(input);
  if (branches) {
    const [plus, minus] = branches.map((branch) => analyze(branch));
    if (!plus.supported || !minus.supported)
      throw new Error("إحدى حالتي ± خارج نطاق التحليل.");
    return {
      ...base,
      kind: `${plus.kind} (حالتا ±)`,
      goal: plus.goal,
      method: "فصل ± إلى حالتين",
      methodReason:
        "الرمز ± يختصر مسألتين: واحدة بالجمع وأخرى بالطرح. نحل كل حالة وحدها ثم نجمع النتائج.",
      steps: [
        step(
          base.input,
          "فصل ± إلى حالتين",
          `${branches[0]}   |   ${branches[1]}`,
          "نكتب المسألة مرة بإشارة + ومرة بإشارة −؛ كل حالة مسألة مستقلة.",
          "الرمز ±",
        ),
        ...plus.steps,
        ...minus.steps,
      ],
      roots: [...new Set([...plus.roots, ...minus.roots])].sort(
        (first, second) => first - second,
      ),
      graph: plus.graph,
      result:
        plus.result === minus.result
          ? plus.result
          : `${plus.result}  أو  ${minus.result}`,
      hints: [`حالة +: ${branches[0]}`, `حالة −: ${branches[1]}`],
      related: plus.related,
    };
  }
  const inequality = solveInequality(input);
  if (inequality) {
    const [a, b] = inequality.coefficients;
    const relation = { "<": "<", "<=": "≤", ">": ">", ">=": "≥", "!=": "≠" }[
      inequality.relation
    ];
    const oneSide = `${inequality.expression} ${relation} 0`;
    const signText = inequality.signs
      .map(
        (piece) =>
          `(${fmtValue(piece.from)}, ${fmtValue(piece.to)}): ${piece.value > 0 ? "+" : piece.value < 0 ? "−" : "0"}`,
      )
      .join("   ");
    const result = `x ∈ ${inequality.text}`;
    return {
      ...base,
      kind: a ? "متباينة تربيعية" : b ? "متباينة خطية" : "متباينة ثابتة",
      goal: "إيجاد كل قيم x التي تحقق المتباينة",
      method: "جدول الإشارات",
      methodReason:
        "ننقل الحدود إلى طرف واحد؛ إشارة كثير الحدود لا تتغير إلا عند جذوره، فنختبر نقطة من كل فترة.",
      roots: inequality.roots,
      graph: inequality.expression,
      result,
      related: ["quadratic", "functions"],
      hints: [
        "انقل كل الحدود إلى طرف واحد.",
        "أوجد جذور الطرف الناتج.",
        "اختبر إشارة كل فترة بين الجذور.",
      ],
      steps: [
        step(
          base.input,
          "نقل الحدود إلى طرف واحد",
          oneSide,
          "نطرح الطرف الأيمن من الطرفين؛ الطرح لا يعكس اتجاه المتباينة، بخلاف الضرب في عدد سالب.",
          "خاصية الطرح للمتباينة",
        ),
        step(
          `${inequality.expression} = 0`,
          "إيجاد الجذور",
          inequality.roots.length
            ? inequality.roots.map((root) => `x = ${fmt(root)}`).join("  أو  ")
            : "لا توجد جذور حقيقية",
          "كثير الحدود متصل، فلا تتغير إشارته إلا عند جذوره؛ الجذور تقسم محور x إلى فترات.",
          "الجذور تفصل الفترات",
        ),
        step(
          oneSide,
          "اختبار الإشارة في كل فترة",
          signText,
          "نعوض نقطة اختبار من داخل كل فترة؛ الإشارة ثابتة في الفترة كلها.",
          "جدول الإشارات",
        ),
        step(
          signText,
          "اختيار الفترات المحققة",
          result,
          inequality.relation === "<=" || inequality.relation === ">="
            ? "نأخذ الفترات ذات الإشارة المطلوبة، ونضم الجذور لأن العلاقة تسمح بالمساواة."
            : inequality.relation === "!="
              ? "كل قيمة تحقق المتباينة إلا الجذور التي يصبح عندها الطرفان متساويين."
              : "نأخذ الفترات ذات الإشارة المطلوبة، ونستبعد الجذور لأن المتباينة تامة.",
          "حل المتباينة",
        ),
      ],
    };
  }
  const limit = limitRequest(input);
  if (limit) {
    const target = boundValue(limit.target, {}, true);
    const result = evaluateLimit(limit.expression, target);
    const notation = `lim[x→${fmtValue(target)}] ${limit.expression}`;
    const finite = Number.isFinite(target);
    const sides = finite
      ? `يسار: ${sideText(result.left)}   يمين: ${sideText(result.right)}`
      : `عند x كبيرة ${target > 0 ? "موجبة" : "سالبة"}: ${sideText(target > 0 ? result.left : result.right)}`;
    const direct = finite ? compileFunction(limit.expression)(target) : NaN;
    const verdict =
      result.status === "exists"
        ? result.exact && result.exact !== fmtValue(result.value)
          ? `= ${result.exact} ≈ ${fmtValue(result.value)}`
          : `${result.exact ? "=" : "≈"} ${fmtValue(result.value)}`
        : result.status === "differs"
          ? "النهاية غير موجودة: النهايتان من الجهتين مختلفتان"
          : "لم يمكن الحسم: القيم لا تستقر قرب النقطة (قد تتذبذب)";
    return {
      ...base,
      kind: "نهاية",
      goal: `معرفة القيمة التي تقترب منها الدالة عندما x → ${fmtValue(target)}`,
      method: "الاقتراب العددي من الجهتين مع تحقق رمزي",
      methodReason:
        "نحسب قيم الدالة عند نقاط تقترب من الهدف من كل جهة. القيمة الرمزية من المحرك تُعرض فقط إذا طابقت هذه القيم.",
      graph: limit.expression,
      result: verdict,
      related: ["limits", "functions"],
      hints: [
        "جرّب التعويض المباشر أولًا.",
        "إذا ظهرت 0/0 فبسّط أو اقترب عدديًا.",
        "النهاية موجودة فقط إذا تساوت النهايتان من الجهتين.",
        ...(result.oneSidedOnly
          ? ["الدالة معرّفة في جهة واحدة فقط من النقطة، فالنهاية تُحسب من تلك الجهة."]
          : []),
      ],
      steps: [
        ...(finite
          ? [
              step(
                notation,
                "التعويض المباشر",
                Number.isFinite(direct)
                  ? `f(${fmt(target)}) = ${fmt(direct)}`
                  : `f(${fmt(target)}) غير معرّفة`,
                Number.isFinite(direct)
                  ? "قيمة الدالة عند النقطة معروفة، لكن النهاية تتعلق بالقيم القريبة منها؛ نتحقق بالاقتراب."
                  : "التعويض المباشر لا يعطي عددًا (مثل 0/0 أو قسمة على صفر)، فنقترب من النقطة بدل التعويض.",
                "التعويض المباشر",
              ),
            ]
          : []),
        step(
          notation,
          finite ? "الاقتراب من الجهتين" : "الاقتراب من ما لا نهاية",
          sides,
          finite
            ? "نحسب f عند x = a ± 0.1، ± 0.01، … حتى ± 0.00001 ونراقب استقرار القيم."
            : "نحسب f عند x = 10²، 10³، … حتى 10⁶ ونراقب استقرار القيم.",
          "النهاية من جهة واحدة",
        ),
        step(
          sides,
          "الحكم على النهاية",
          verdict,
          result.status === "exists"
            ? `القيم تستقر عند العدد نفسه${finite && !result.oneSidedOnly ? " من الجهتين" : ""}${result.exact ? "، وطابقتها قيمة رمزية من المحرك" : "؛ القيمة تقريب عددي"}.`
            : result.status === "differs"
              ? "تقترب الدالة من قيمتين مختلفتين من اليسار واليمين، فلا توجد نهاية واحدة."
              : "لا نعلن قيمة لم تستقر عدديًا ولم يتحقق منها المحرك الرمزي.",
          "تعريف النهاية",
        ),
      ],
    };
  }
  const series = sumRequest(input);
  if (series) {
    const from = boundValue(series.from),
      to = boundValue(series.to, {}, true);
    const result = evaluateSum(series.expression, series.variable, from, to);
    const notation = `Σ[${series.variable}=${fmt(from)}→${fmtValue(to)}] ${series.expression}`;
    const written = result.terms.length
      ? `${result.terms
          .slice(0, 4)
          .map((term) => fmt(term.value))
          .join(" + ")}${to - from + 1 > 4 ? " + …" : ""}`
      : "لا حدود: الحد الأدنى أكبر من الأعلى";
    const partials = result.partials
      .map((item) => `S${item.count} = ${fmt(item.value)}`)
      .join("   ");
    const verdict =
      result.status === "exact"
        ? `= ${fmt(result.value)}`
        : result.status === "converges"
          ? `≈ ${fmt(result.value)}`
          : result.status === "diverges"
            ? "المتسلسلة متباعدة: حدودها لا تقترب من الصفر"
            : `لم يمكن الحسم: المجاميع الجزئية ما زالت تتغير (S100000 ≈ ${fmt(result.value)})`;
    const infinite = to === Infinity;
    return {
      ...base,
      kind: infinite ? "متسلسلة لانهائية" : "مجموع منتهٍ",
      goal: "حساب مجموع الحدود",
      method: infinite ? "المجاميع الجزئية" : "الجمع المباشر للحدود",
      methodReason: infinite
        ? "نحسب مجاميع جزئية متزايدة الطول؛ نعلن قيمة فقط إذا استقرت، ونعلن التباعد إذا لم تقترب الحدود من الصفر."
        : "عدد الحدود منتهٍ، فنعوض كل قيمة صحيحة ونجمع النواتج.",
      graph: "",
      result: verdict,
      related: ["functions"],
      hints: [
        `عوّض ${series.variable} = ${fmt(from)}، ثم القيمة التالية، وهكذا.`,
        ...(infinite ? ["إذا لم يقترب الحد العام من الصفر فالمتسلسلة متباعدة."] : []),
      ],
      steps: [
        step(
          notation,
          "كتابة الحدود",
          written,
          `نعوض قيم ${series.variable} الصحيحة من ${fmt(from)} إلى ${fmtValue(to)} في صيغة الحد العام.`,
          "تعريف المجموع",
        ),
        infinite
          ? step(
              written,
              "حساب المجاميع الجزئية",
              partials,
              "Sₙ هو مجموع أول n حدًا؛ نراقب هل تستقر هذه القيم كلما زاد n.",
              "تقارب المتسلسلات",
            )
          : step(
              written,
              "جمع الحدود",
              verdict,
              `نجمع ${Math.max(0, to - from + 1)} حدًا.`,
              "الجمع",
            ),
        ...(infinite
          ? [
              step(
                partials,
                "الحكم على التقارب",
                verdict,
                result.status === "converges"
                  ? "المجاميع الجزئية استقرت ضمن دقة الحساب؛ القيمة تقريب عددي."
                  : result.status === "diverges"
                    ? "الحد العام لا يقترب من الصفر والمجاميع تكبر، وهذا يكفي للتباعد (اختبار الحد النوني)."
                    : "الحدود تصغر لكن المجاميع لم تستقر؛ لا نعلن تقاربًا أو تباعدًا دون برهان.",
                "تقارب المتسلسلات",
              ),
            ]
          : []),
      ],
    };
  }
  const definite = definiteIntegralRequest(input);
  if (definite) {
    const from = boundValue(definite.from, {}, true),
      to = boundValue(definite.to, {}, true);
    const result = definiteIntegral(definite.expression, from, to);
    const integral = `∫[${fmtValue(from)}, ${fmtValue(to)}] ${definite.expression} dx`;
    const base2 = {
      ...base,
      kind: result.improper ? "تكامل معتل" : "تكامل محدد",
      goal: `حساب المساحة الموقّعة تحت المنحنى من x = ${fmtValue(from)} إلى x = ${fmtValue(to)}`,
      graph: definite.expression,
      related: ["integral", "functions"],
      hints: [
        "المساحة فوق محور x تُحسب موجبة، وتحته سالبة.",
        "عكس حدّي التكامل يعكس إشارة الناتج.",
      ],
    };
    if (!result.antiderivative) {
      const approximate = `≈ ${fmt(result.value)}`;
      return {
        ...base2,
        method: "تقريب عددي بقاعدة سمبسون",
        methodReason:
          "لم نجد دالة أصلية متحققًا منها على هذه الفترة، لذلك نعرض قيمة تقريبية لا قيمة دقيقة.",
        result: approximate,
        steps: [
          step(
            integral,
            "تقريب عددي (سمبسون، 2000 جزء)",
            approximate,
            "نقسم الفترة إلى أجزاء صغيرة ونقرّب المنحنى في كل جزء بقطع مكافئ ثم نجمع المساحات.",
            "قاعدة سمبسون",
          ),
        ],
      };
    }
    const diverges = !Number.isFinite(result.value);
    const verdict = diverges
      ? `التكامل متباعد (${fmtValue(result.value)})`
      : `= ${fmt(result.value)}`;
    const edge = (value: number) =>
      Number.isFinite(value) ? `F(${fmt(value)})` : `lim F(x→${fmtValue(value)})`;
    return {
      ...base2,
      method: "المبرهنة الأساسية للتفاضل والتكامل",
      methodReason: result.improper
        ? "نجد دالة أصلية متحققًا منها، ونستبدل الحد اللانهائي بنهاية F عنده."
        : "نجد دالة أصلية F ثم نحسب F(b) − F(a). تحققنا من الناتج بمقارنته بتقريب عددي مستقل.",
      result: verdict,
      steps: [
        step(
          integral,
          "إيجاد دالة أصلية",
          `F(x) = ${result.antiderivative}`,
          "نبحث عن دالة مشتقتها تساوي الدالة تحت التكامل؛ ثابت التكامل يُختصر عند الطرح.",
          "التكامل غير المحدد",
        ),
        step(
          `${edge(to)} - ${edge(from)}`,
          result.improper ? "التعويض بالحدين مع نهاية عند ∞" : "التعويض بحدّي التكامل",
          `${fmtValue(result.upper)} - (${fmtValue(result.lower)}) ${diverges ? "→" : "="} ${fmtValue(result.value)}`,
          result.improper
            ? "التكامل المعتل يُعرّف بنهاية التكامل المحدد عندما يذهب الحد إلى ما لا نهاية؛ إن كانت النهاية لانهائية فالتكامل متباعد."
            : "التكامل المحدد يساوي التغير الكلي في الدالة الأصلية بين الحدين.",
          "المبرهنة الأساسية للتفاضل والتكامل",
        ),
      ],
    };
  }
  return null;
}
