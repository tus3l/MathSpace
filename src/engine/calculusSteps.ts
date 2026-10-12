import { derivative, parse, simplify } from "mathjs";
import type {
  FunctionNode,
  MathNode,
  OperatorNode,
  ParenthesisNode,
  SymbolNode,
} from "mathjs";
import nerdamer from "nerdamer";
import type { ExplainedStep } from "./explanation";
import { fmt, normalize, safeParse } from "./math";

export type CalculusOperation = "derivative" | "integral";
export type CalculusExplanation = {
  source: string;
  variable: string;
  operation: CalculusOperation;
  partial: boolean;
  result: string;
  display: string;
  steps: ExplainedStep[];
  signNotes: string[];
  constants: string[];
  verified: boolean;
};

const allowed = ["x", "y", "a", "b", "c"];
const sampleScope = { x: 0.8, y: 0.65, a: 1.4, b: 0.6, c: -0.45 };
const samplePoints = [
  -3.3, -2.6, -1.9, -1.2, -0.7, -0.3, 0.4, 0.9, 1.4, 2.1, 2.8, 3.5,
];

const wrap = (text: string) =>
  /^[\w.]+$/.test(text) || /^\w+\([^()]*\)$/.test(text) ? text : `(${text})`;

function tidy(text: string) {
  try {
    return simplify(text).toString();
  } catch {
    return text;
  }
}

function dependsOn(node: MathNode, variable: string) {
  return (
    node.filter(
      (child) =>
        child.type === "SymbolNode" && (child as SymbolNode).name === variable,
    ).length > 0
  );
}

function constantValue(text: string) {
  try {
    const value: unknown = parse(text).compile().evaluate({});
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function evaluator(text: string, variable: string) {
  const code = safeParse(text, allowed).compile();
  return (value: number) => {
    try {
      const result: unknown = code.evaluate({
        ...sampleScope,
        [variable]: value,
      });
      return typeof result === "number" && Number.isFinite(result)
        ? result
        : NaN;
    } catch {
      return NaN;
    }
  };
}

/** Numerically checks that `rate` is the derivative of `primitive`; disagreement at a defined point is a counterexample. */
export function verifyDerivativePair(
  primitive: string,
  rate: string,
  variable = "x",
) {
  const outer = evaluator(primitive, variable),
    inner = evaluator(rate, variable);
  let agreements = 0;
  for (const point of samplePoints) {
    const expected = inner(point);
    if (!Number.isFinite(expected) || Math.abs(expected) > 1e4) continue;
    const step = 1e-5 * Math.max(1, Math.abs(point));
    const left = outer(point - step),
      right = outer(point + step);
    if (!Number.isFinite(left) || !Number.isFinite(right)) continue;
    const numeric = (right - left) / (2 * step);
    if (Math.abs(numeric - expected) > 1e-4 * Math.max(1, Math.abs(expected)))
      return false;
    agreements += 1;
  }
  return agreements >= 4;
}

const trigDerivativeNotes: Record<string, string> = {
  sin: "لماذا تكون مشتقة sin هي cos دون إشارة سالبة؟ ميل منحنى sin عند كل نقطة يساوي قيمة cos هناك: عند x = 0 يصعد sin بأكبر ميل 1 = cos(0)، وعند x = π/2 يبلغ قمته فيصبح الميل 0 = cos(π/2)، وعند x = π يهبط بميل −1 = cos(π). حيث يتزايد sin يكون cos موجبًا، فلا حاجة لإشارة سالبة.",
  cos: "لماذا تظهر الإشارة السالبة في (cos x)′ = −sin x؟ على الفترة (0, π) يتناقص cos من 1 إلى −1، أي أن ميله سالب، بينما sin موجب هناك. لكي تطابق المشتقة إشارة الميل يجب أن تكون −sin. مثال: عند x = π/2 ميل cos يساوي −1 = −sin(π/2). على دائرة الوحدة تتحرك النقطة (cos t, sin t) عكس عقارب الساعة بسرعة (−sin t, cos t)، فيتناقص الإحداثي الأفقي حين تكون النقطة فوق المحور.",
  tan: "لماذا مشتقة tan موجبة دائمًا؟ tan = sin/cos، وبقاعدة القسمة: (cos·cos − sin·(−sin))/cos² = (cos² + sin²)/cos² = 1/cos² = sec². الإشارة السالبة في قاعدة القسمة تلغي الإشارة السالبة في مشتقة cos، فيبقى مربع موجب. لذلك tan متزايد على كل فترة بين خطوط التقارب x = π/2 + kπ، حيث cos = 0 والدالة غير معرّفة.",
  cot: "cot = cos/sin، وبقاعدة القسمة: (−sin·sin − cos·cos)/sin² = −1/sin² = −csc². الإشارتان لا تلغيان بعضهما هنا، فتبقى المشتقة سالبة: cot متناقص على كل فترة بين x = kπ.",
  sec: "sec = 1/cos، فمشتقتها −(cos)′/cos² = −(−sin)/cos² = sec·tan. الإشارة السالبة في قاعدة المقلوب تلغي الإشارة السالبة في مشتقة cos.",
  csc: "csc = 1/sin، فمشتقتها −(sin)′/sin² = −cos/sin² = −csc·cot. تبقى إشارة سالبة واحدة من قاعدة المقلوب لأن مشتقة sin موجبة.",
  acos: "arccos متناقصة لأنها معكوس جزء cos المتناقص على [0, π]، لذلك مشتقتها سالبة: −1/√(1 − u²).",
  cosh: "على خلاف cos، مشتقة cosh هي sinh بلا إشارة سالبة: cosh = (eˣ + e⁻ˣ)/2، ومشتقة e⁻ˣ هي −e⁻ˣ، فينتج (eˣ − e⁻ˣ)/2 = sinh.",
};

const derivativeTable: Record<
  string,
  { outer: (u: string) => string; rule: string; reason: string }
> = {
  sin: {
    outer: (u) => `cos(${u})`,
    rule: "مشتقة الجيب",
    reason: "ميل sin عند كل نقطة يساوي قيمة cos عندها.",
  },
  cos: {
    outer: (u) => `-sin(${u})`,
    rule: "مشتقة جيب التمام",
    reason:
      "تظهر إشارة سالبة لأن cos يتناقص حيث sin موجب، فالميل يجب أن يكون −sin.",
  },
  tan: {
    outer: (u) => `sec(${u})^2`,
    rule: "مشتقة الظل",
    reason:
      "من قاعدة القسمة على sin/cos تلغي الإشارتان السالبتان بعضهما فيبقى 1/cos² = sec²، وهي موجبة حيث tan معرّف.",
  },
  sec: {
    outer: (u) => `sec(${u})*tan(${u})`,
    rule: "مشتقة القاطع",
    reason: "sec = 1/cos؛ قاعدة المقلوب ومشتقة cos تعطيان sin/cos².",
  },
  csc: {
    outer: (u) => `-csc(${u})*cot(${u})`,
    rule: "مشتقة قاطع التمام",
    reason: "csc = 1/sin؛ قاعدة المقلوب تضيف إشارة سالبة.",
  },
  cot: {
    outer: (u) => `-csc(${u})^2`,
    rule: "مشتقة ظل التمام",
    reason: "cot = cos/sin متناقص على كل فترة تعريف، فمشتقته سالبة.",
  },
  exp: {
    outer: (u) => `exp(${u})`,
    rule: "مشتقة الدالة الأسية",
    reason: "معدل تغير eᵘ يساوي قيمته نفسها.",
  },
  log: {
    outer: (u) => `1/(${u})`,
    rule: "مشتقة اللوغاريتم الطبيعي",
    reason: "ln معرّف عندما يكون داخله موجبًا؛ ميله 1/u يقل كلما كبرت u.",
  },
  log10: {
    outer: (u) => `1/((${u})*log(10))`,
    rule: "مشتقة اللوغاريتم العشري",
    reason: "log₁₀u = ln u / ln 10، فنقسم على ln 10. يشترط u > 0.",
  },
  sqrt: {
    outer: (u) => `1/(2*sqrt(${u}))`,
    rule: "مشتقة الجذر التربيعي",
    reason: "√u = u^(1/2)، فقاعدة القوة تعطي 1/(2√u). يشترط u > 0.",
  },
  asin: {
    outer: (u) => `1/sqrt(1-(${u})^2)`,
    rule: "مشتقة معكوس الجيب",
    reason: "معرّفة عندما |u| < 1، وموجبة لأن arcsin متزايدة.",
  },
  acos: {
    outer: (u) => `-1/sqrt(1-(${u})^2)`,
    rule: "مشتقة معكوس جيب التمام",
    reason: "arccos متناقصة، فتظهر الإشارة السالبة. يشترط |u| < 1.",
  },
  atan: {
    outer: (u) => `1/(1+(${u})^2)`,
    rule: "مشتقة معكوس الظل",
    reason: "موجبة دائمًا لأن arctan متزايدة على كل الأعداد الحقيقية.",
  },
  sinh: {
    outer: (u) => `cosh(${u})`,
    rule: "مشتقة الجيب الزائدي",
    reason: "sinh = (eᵘ − e⁻ᵘ)/2 ومشتقتها (eᵘ + e⁻ᵘ)/2 = cosh.",
  },
  cosh: {
    outer: (u) => `sinh(${u})`,
    rule: "مشتقة جيب التمام الزائدي",
    reason: "cosh = (eᵘ + e⁻ᵘ)/2 ومشتقتها sinh، دون إشارة سالبة.",
  },
  abs: {
    outer: (u) => `(${u})/abs(${u})`,
    rule: "مشتقة القيمة المطلقة",
    reason: "الميل 1 حيث u > 0 و−1 حيث u < 0، وغير معرّف عند u = 0.",
  },
};

function explainDerivativeTree(root: MathNode, variable: string) {
  const steps: ExplainedStep[] = [];
  const notes = new Set<string>();
  const constants = new Set<string>();
  root.traverse((child) => {
    const name = (child as SymbolNode).name;
    if (child.type === "SymbolNode" && !["pi", "e", variable].includes(name))
      constants.add(name);
  });
  const partial = variable !== "x" || dependsOn(root, "y");
  const operator = partial ? `∂/∂${variable}` : `d/d${variable}`;
  const of = (node: MathNode) => `${operator}[${node.toString()}]`;
  const reserve = () => steps.push({} as ExplainedStep) - 1;
  function visit(node: MathNode): string {
    if (!dependsOn(node, variable)) return "0";
    if (node.type === "ParenthesisNode")
      return visit((node as ParenthesisNode).content);
    if (node.type === "SymbolNode") return "1";
    if (node.type === "OperatorNode") {
      const typed = node as OperatorNode;
      const [first, second] = typed.args;
      if (typed.args.length === 1) {
        const inner = visit(first);
        if (typed.op === "+") return inner;
        const result = tidy(`-${wrap(inner)}`);
        steps.push({
          before: of(node),
          operation: "إخراج الإشارة السالبة",
          after: `-${operator}[${first.toString()}] = ${result}`,
          rule: "مشتقة الثابت المضروب",
          reason:
            "الإشارة السالبة تعني الضرب في −1: انعكاس المنحنى حول محور x يعكس ميله، فتبقى −1 أمام المشتقة.",
        });
        return result;
      }
      if (typed.op === "+" || typed.op === "-") {
        const index = reserve();
        const left = visit(first),
          right = visit(second);
        const result = tidy(`${wrap(left)} ${typed.op} ${wrap(right)}`);
        steps[index] = {
          before: of(node),
          operation: "اشتقاق كل حد على حدة",
          after: `${of(first)} ${typed.op} ${of(second)} = ${result}`,
          rule: "قاعدة المجموع والفرق",
          reason:
            typed.op === "-"
              ? "معدل تغير الفرق هو فرق معدلات التغير؛ إشارة الطرح بين الحدين تبقى كما هي."
              : "معدل تغير المجموع هو مجموع معدلات التغير.",
        };
        return result;
      }
      if (typed.op === "*" || typed.op === "/") {
        const firstVaries = dependsOn(first, variable),
          secondVaries = dependsOn(second, variable);
        if (typed.op === "/" && !secondVaries) {
          const index = reserve();
          const inner = visit(first);
          const result = tidy(`${wrap(inner)} / ${wrap(second.toString())}`);
          steps[index] = {
            before: of(node),
            operation: "إخراج المقام الثابت",
            after: `${of(first)} / ${wrap(second.toString())} = ${result}`,
            rule: "مشتقة الثابت المضروب",
            reason:
              "القسمة على ثابت تصغّر القيم والميل بالنسبة نفسها، فيبقى الثابت خارج المشتقة.",
          };
          return result;
        }
        if (typed.op === "*" && firstVaries !== secondVaries) {
          const [factor, varying] = firstVaries
            ? [second, first]
            : [first, second];
          const index = reserve();
          const inner = visit(varying);
          const result = tidy(`${wrap(factor.toString())} * ${wrap(inner)}`);
          const value = constantValue(factor.toString());
          steps[index] = {
            before: of(node),
            operation: "إخراج المعامل الثابت",
            after: `${wrap(factor.toString())} · ${of(varying)} = ${result}`,
            rule: "مشتقة الثابت المضروب",
            reason: `المعامل ${factor.toString()} يمدّ القيم والميل بالنسبة نفسها، فيبقى خارج المشتقة.${value !== null && value < 0 ? " المعامل سالب، لذلك ينعكس اتجاه الميل وتتغير الإشارة." : ""}${partial && !/^[\d.]+$/.test(factor.toString()) ? " في الاشتقاق الجزئي يُعامل كثابت لأنه لا يعتمد على متغير الاشتقاق." : ""}`,
          };
          return result;
        }
        const index = reserve();
        const left = visit(first),
          right = visit(second);
        const u = first.toString(),
          v = second.toString();
        if (typed.op === "*") {
          const result = tidy(
            `${wrap(left)} * ${wrap(v)} + ${wrap(u)} * ${wrap(right)}`,
          );
          steps[index] = {
            before: of(node),
            operation: "قاعدة الضرب",
            after: `${wrap(left)}·${wrap(v)} + ${wrap(u)}·${wrap(right)} = ${result}`,
            rule: "(uv)′ = u′v + uv′",
            reason:
              "العاملان يتغيران معًا؛ نجمع أثر تغير كل عامل بينما نثبّت الآخر.",
          };
          return result;
        }
        const result = tidy(
          `(${wrap(left)} * ${wrap(v)} - ${wrap(u)} * ${wrap(right)}) / ${wrap(v)}^2`,
        );
        steps[index] = {
          before: of(node),
          operation: "قاعدة القسمة",
          after: `(${wrap(left)}·${wrap(v)} − ${wrap(u)}·${wrap(right)}) / ${wrap(v)}² = ${result}`,
          rule: "(u/v)′ = (u′v − uv′)/v²",
          reason:
            "تظهر إشارة الطرح لأن زيادة المقام تُصغّر قيمة الكسر، فأثر تغير المقام عكسي. القانون معرّف حيث المقام لا يساوي صفرًا.",
        };
        return result;
      }
      if (typed.op === "^") {
        const baseVaries = dependsOn(first, variable),
          exponentVaries = dependsOn(second, variable);
        if (baseVaries && !exponentVaries) {
          const index = reserve();
          const inner = visit(first);
          const n = second.toString();
          const outer = `${wrap(n)} * ${wrap(first.toString())}^(${n} - 1)`;
          const chain = first.type !== "SymbolNode";
          const result = tidy(chain ? `${outer} * ${wrap(inner)}` : outer);
          const exponent = constantValue(n);
          steps[index] = {
            before: of(node),
            operation: chain ? "قاعدة القوة مع السلسلة" : "قاعدة القوة",
            after: `${n}·${wrap(first.toString())}^(${n}−1)${chain ? ` · ${wrap(inner)}` : ""} = ${result}`,
            rule: "(uⁿ)′ = n·uⁿ⁻¹·u′",
            reason: `ينزل الأس ${n} معاملًا ويقل الأس بمقدار 1.${exponent !== null && exponent < 0 ? " الأس سالب، لذلك يظهر معامل سالب: الدالة تتناقص كلما كبر المقدار داخلها." : ""}${chain ? ` الداخل ليس المتغير وحده، فنضرب في مشتقته ${inner} (قاعدة السلسلة).` : ""}${exponent !== null && !Number.isInteger(exponent) ? " الأس كسري، فالنتيجة معرّفة حيث الأساس موجب." : ""}`,
          };
          return result;
        }
        if (!baseVaries && exponentVaries) {
          const index = reserve();
          const inner = visit(second);
          const base = first.toString();
          const natural = base === "e";
          const outer = natural
            ? node.toString()
            : `${node.toString()} * log(${base})`;
          const chain = second.type !== "SymbolNode";
          const result = tidy(chain ? `${outer} * ${wrap(inner)}` : outer);
          steps[index] = {
            before: of(node),
            operation: "مشتقة الدالة الأسية",
            after: `${natural ? node.toString() : `${node.toString()}·ln(${base})`}${chain ? ` · ${wrap(inner)}` : ""} = ${result}`,
            rule: natural ? "(eᵘ)′ = eᵘ·u′" : "(aᵘ)′ = aᵘ·ln(a)·u′",
            reason: `معدل تغير الدالة الأسية يتناسب مع قيمتها${natural ? "" : `، ومعامل التناسب ln(${base})`}.${chain ? ` نضرب في مشتقة الأس ${inner} (قاعدة السلسلة).` : ""}`,
          };
          return result;
        }
      }
      throw new Error("Unsupported derivative operator");
    }
    if (node.type === "FunctionNode") {
      const typed = node as FunctionNode;
      const name = typed.fn.name;
      const entry = derivativeTable[name];
      if (!entry || typed.args.length !== 1)
        throw new Error("Unsupported function");
      const [argument] = typed.args;
      const chain = argument.type !== "SymbolNode";
      const index = reserve();
      const inner = visit(argument);
      const outer = entry.outer(argument.toString());
      const result = tidy(chain ? `${outer} * ${wrap(inner)}` : outer);
      const innerValue = constantValue(inner);
      if (trigDerivativeNotes[name]) notes.add(trigDerivativeNotes[name]);
      steps[index] = {
        before: of(node),
        operation: chain ? `${entry.rule} مع قاعدة السلسلة` : entry.rule,
        after: chain ? `${outer} · ${wrap(inner)} = ${result}` : result,
        rule: chain ? `${entry.rule}، (f(u))′ = f′(u)·u′` : entry.rule,
        reason: `${entry.reason}${chain ? ` قاعدة السلسلة: الداخل u = ${argument.toString()}، فنشتق الدالة الخارجية مع إبقاء u كما هي ثم نضرب في u′ = ${inner}.` : ""}${chain && innerValue !== null && innerValue < 0 ? " u′ سالب، فيعكس اتجاه الحركة وتنقلب إشارة الناتج." : ""}`,
      };
      return result;
    }
    throw new Error("Unsupported derivative node");
  }
  const result = visit(root);
  return { result, steps, notes: [...notes], constants: [...constants] };
}

const integralNotes: Record<string, string> = {
  sin: "لماذا ∫sin x dx = −cos x + C؟ نبحث عن دالة مشتقتها sin. مشتقة cos هي −sin (بإشارة معكوسة)، فنعكسها مرة أخرى: (−cos x)′ = −(−sin x) = sin x. الإشارة السالبة في الناتج تلغي الإشارة السالبة في مشتقة cos. بالرسم: على [0, π] يكون sin ≥ 0 فتتراكم المساحة وتتزايد الدالة الأصلية −cos من −1 إلى 1، والمساحة = (−cos π) − (−cos 0) = 2.",
  cos: "لماذا ∫cos x dx = sin x + C دون إشارة سالبة؟ لأن (sin x)′ = cos x مباشرة. على [−π/2, π/2] يكون cos ≥ 0، فتتزايد الدالة الأصلية sin هناك، وحيث cos < 0 تتناقص.",
  tan: "∫tan x dx = −ln|cos x| + C: نكتب tan = sin/cos، والبسط sin يساوي سالب مشتقة المقام لأن (cos)′ = −sin، لذلك تظهر إشارة سالبة أمام اللوغاريتم. الصيغة معرّفة حيث cos x ≠ 0.",
  cot: "∫cot x dx = ln|sin x| + C لأن البسط cos هو مشتقة المقام sin مباشرة، فلا تظهر إشارة سالبة.",
  "sec^2":
    "∫sec² x dx = tan x + C لأن (tan x)′ = sec² x، وهي موجبة فتتزايد الدالة الأصلية بين خطوط التقارب.",
  "csc^2":
    "∫csc² x dx = −cot x + C لأن (cot x)′ = −csc² x؛ نعكس الإشارة لنسترجع csc² الموجبة.",
  reciprocal:
    "∫(1/x) dx = ln|x| + C: نكتب القيمة المطلقة لأن 1/x معرّف للقيم السالبة أيضًا، بينما ln x معرّف للقيم الموجبة فقط؛ (ln|x|)′ = 1/x على الجانبين.",
};

function explainIntegralTree(root: MathNode, variable: string) {
  const steps: ExplainedStep[] = [];
  const notes = new Set<string>();
  const of = (node: MathNode) => `∫ ${wrap(node.toString())} d${variable}`;
  const reserve = () => steps.push({} as ExplainedStep) - 1;
  const slope = (node: MathNode) => {
    try {
      const rate = derivative(node, variable);
      if (dependsOn(rate, variable)) return null;
      const text = simplify(rate).toString();
      return text === "0" ? null : text;
    } catch {
      return null;
    }
  };
  const linearNote = (inner: MathNode, rate: string) =>
    inner.type === "SymbolNode"
      ? ""
      : ` الداخل خطي u = ${inner.toString()} وميله ${rate}؛ نقسم على ${rate} لأن الاشتقاق بقاعدة السلسلة سيضرب في ${rate}.${(constantValue(rate) ?? 1) < 0 ? " الميل سالب، فتنقلب إشارة الناتج." : ""}`;
  const divide = (text: string, rate: string, inner: MathNode) =>
    inner.type === "SymbolNode" ? text : `(${text}) / ${wrap(rate)}`;
  function visit(node: MathNode): string {
    if (!dependsOn(node, variable)) {
      const result = tidy(`${wrap(node.toString())} * ${variable}`);
      steps.push({
        before: of(node),
        operation: "تكامل ثابت",
        after: result,
        rule: "∫k dx = kx",
        reason: `الدالة ${variable} مضروبة في ${node.toString()} ميلها ثابت يساوي ${node.toString()}.`,
      });
      return result;
    }
    if (node.type === "ParenthesisNode")
      return visit((node as ParenthesisNode).content);
    if (node.type === "SymbolNode") {
      const result = `${variable}^2/2`;
      steps.push({
        before: of(node),
        operation: "قاعدة القوة للتكامل",
        after: result,
        rule: "∫xⁿ dx = xⁿ⁺¹/(n+1)",
        reason: `نرفع الأس من 1 إلى 2 ونقسم عليه، لأن مشتقة ${variable}²/2 هي ${variable}.`,
      });
      return result;
    }
    if (node.type === "OperatorNode") {
      const typed = node as OperatorNode;
      const [first, second] = typed.args;
      if (typed.args.length === 1) {
        const inner = visit(first);
        return typed.op === "-" ? tidy(`-${wrap(inner)}`) : inner;
      }
      if (typed.op === "+" || typed.op === "-") {
        const index = reserve();
        const left = visit(first),
          right = visit(second);
        const result = tidy(`${wrap(left)} ${typed.op} ${wrap(right)}`);
        steps[index] = {
          before: of(node),
          operation: "تكامل كل حد على حدة",
          after: `${of(first)} ${typed.op} ${of(second)} = ${result}`,
          rule: "خطية التكامل",
          reason:
            "التكامل خطي لأن الاشتقاق خطي: إذا كانت F′ = f وG′ = g فإن (F ± G)′ = f ± g، فتبقى الإشارة بين الحدين.",
        };
        return result;
      }
      if (typed.op === "*" || typed.op === "/") {
        const firstVaries = dependsOn(first, variable),
          secondVaries = dependsOn(second, variable);
        if (
          (typed.op === "*" && firstVaries !== secondVaries) ||
          (typed.op === "/" && !secondVaries)
        ) {
          const [factor, varying] =
            typed.op === "/"
              ? [`1/${wrap(second.toString())}`, first]
              : firstVaries
                ? [second.toString(), first]
                : [first.toString(), second];
          const index = reserve();
          const inner = visit(varying);
          const result = tidy(`${wrap(factor)} * ${wrap(inner)}`);
          steps[index] = {
            before: of(node),
            operation: "إخراج المعامل الثابت",
            after: `${wrap(factor)} · ${of(varying)} = ${result}`,
            rule: "∫k·f dx = k∫f dx",
            reason:
              "المعامل الثابت يمرّ عبر التكامل لأنه يمرّ عبر الاشتقاق دون تغيير.",
          };
          return result;
        }
        const rate = typed.op === "/" ? slope(second) : null;
        if (typed.op === "/" && !firstVaries && rate) {
          const result = tidy(
            `${wrap(first.toString())} * ${wrap(divide(`log(abs(${second.toString()}))`, rate, second))}`,
          );
          notes.add(integralNotes.reciprocal);
          steps.push({
            before: of(node),
            operation: "تكامل المقلوب",
            after: result,
            rule: "∫(1/u) du = ln|u|",
            reason: `مشتقة ln|u| هي 1/u على جانبي الصفر.${linearNote(second, rate)} الصيغة معرّفة حيث ${second.toString()} ≠ 0.`,
          });
          return result;
        }
      }
      if (typed.op === "^") {
        const exponent = constantValue(second.toString());
        const rate = slope(first);
        if (!dependsOn(second, variable) && rate !== null) {
          if (exponent === -1) {
            const result = tidy(
              divide(`log(abs(${first.toString()}))`, rate, first),
            );
            notes.add(integralNotes.reciprocal);
            steps.push({
              before: of(node),
              operation: "تكامل المقلوب",
              after: result,
              rule: "∫u⁻¹ du = ln|u|",
              reason: `الأس −1 استثناء من قاعدة القوة لأن القسمة على n+1 = 0 غير معرّفة.${linearNote(first, rate)}`,
            });
            return result;
          }
          const n = second.toString();
          if (
            first.type === "FunctionNode" &&
            exponent === 2 &&
            ["sec", "csc"].includes((first as FunctionNode).fn.name)
          ) {
            const inner = (first as FunctionNode).args[0];
            const innerRate = slope(inner);
            if (innerRate) {
              const secant = (first as FunctionNode).fn.name === "sec";
              const result = tidy(
                divide(
                  `${secant ? "" : "-"}${secant ? "tan" : "cot"}(${inner.toString()})`,
                  innerRate,
                  inner,
                ),
              );
              notes.add(integralNotes[secant ? "sec^2" : "csc^2"]);
              steps.push({
                before: of(node),
                operation: secant ? "تكامل sec²" : "تكامل csc²",
                after: result,
                rule: secant ? "∫sec² u du = tan u" : "∫csc² u du = −cot u",
                reason: `${secant ? "(tan u)′ = sec² u." : "(cot u)′ = −csc² u، لذلك نعكس الإشارة."}${linearNote(inner, innerRate)}`,
              });
              return result;
            }
          }
          if (dependsOn(first, variable)) {
            const result = tidy(
              divide(
                `${wrap(first.toString())}^(${n} + 1) / (${n} + 1)`,
                rate,
                first,
              ),
            );
            steps.push({
              before: of(node),
              operation: "قاعدة القوة للتكامل",
              after: result,
              rule: "∫uⁿ du = uⁿ⁺¹/(n+1)، n ≠ −1",
              reason: `نرفع الأس ${n} بمقدار 1 ثم نقسم على الأس الجديد، لأن اشتقاق الناتج ينزل الأس ويعيد uⁿ.${linearNote(first, rate)}${exponent !== null && !Number.isInteger(exponent) ? " الأس كسري، فالصيغة معرّفة حيث الأساس غير سالب." : ""}`,
            });
            return result;
          }
        }
        const exponentRate = slope(second);
        const base = constantValue(first.toString());
        if (
          !dependsOn(first, variable) &&
          exponentRate &&
          (first.toString() === "e" ||
            (base !== null && base > 0 && base !== 1))
        ) {
          const natural = first.toString() === "e";
          const result = tidy(
            divide(
              natural
                ? node.toString()
                : `${node.toString()} / log(${first.toString()})`,
              exponentRate,
              second,
            ),
          );
          steps.push({
            before: of(node),
            operation: "تكامل الدالة الأسية",
            after: result,
            rule: natural ? "∫eᵘ du = eᵘ" : "∫aᵘ du = aᵘ/ln a",
            reason: `مشتقة الدالة الأسية تعيد الدالة نفسها${natural ? "" : ` مضروبة في ln ${first.toString()}، فنقسم عليه`}.${linearNote(second, exponentRate)}`,
          });
          return result;
        }
      }
      throw new Error("Unsupported integral operator");
    }
    if (node.type === "FunctionNode") {
      const typed = node as FunctionNode;
      const name = typed.fn.name;
      const [inner] = typed.args;
      const rate = typed.args.length === 1 ? slope(inner) : null;
      const table: Record<string, [string, string, string]> = {
        sin: [
          "-cos",
          "∫sin u du = −cos u",
          "(−cos u)′ = sin u؛ الإشارة السالبة تلغي سالب مشتقة cos.",
        ],
        cos: [
          "sin",
          "∫cos u du = sin u",
          "(sin u)′ = cos u مباشرة، فلا إشارة سالبة.",
        ],
        exp: ["exp", "∫eᵘ du = eᵘ", "الدالة الأسية مشتقة نفسها."],
        tan: [
          "-log(abs(cos",
          "∫tan u du = −ln|cos u|",
          "tan = sin/cos والبسط سالب مشتقة المقام.",
        ],
        cot: [
          "log(abs(sin",
          "∫cot u du = ln|sin u|",
          "cot = cos/sin والبسط مشتقة المقام.",
        ],
        sinh: ["cosh", "∫sinh u du = cosh u", "(cosh u)′ = sinh u."],
        cosh: ["sinh", "∫cosh u du = sinh u", "(sinh u)′ = cosh u."],
        sqrt: [
          "",
          "∫√u du = (2/3)u^(3/2)",
          "√u = u^(1/2) فنطبق قاعدة القوة. يشترط u ≥ 0.",
        ],
      };
      const entry = table[name];
      if (entry && rate) {
        const u = inner.toString();
        const primitive =
          name === "sqrt"
            ? `2/3 * (${u})^(3/2)`
            : ["tan", "cot"].includes(name)
              ? `${entry[0]}(${u})))`
              : `${entry[0]}(${u})`;
        const result = tidy(divide(primitive, rate, inner));
        const note = integralNotes[name];
        if (note) notes.add(note);
        steps.push({
          before: of(node),
          operation: `تكامل ${name}`,
          after: result,
          rule: entry[1],
          reason: `${entry[2]}${linearNote(inner, rate)}`,
        });
        return result;
      }
      throw new Error("Unsupported integral function");
    }
    throw new Error("Unsupported integral node");
  }
  return { result: visit(root), steps, notes: [...notes] };
}

function source(input: string, variable: string) {
  const expression = normalize(input)
    .replace(/^[yz]\s*=\s*/, "")
    .trim();
  if (!["x", "y"].includes(variable)) throw new Error("Unsupported variable");
  return { expression, node: safeParse(expression, allowed) };
}

export function explainDerivative(
  input: string,
  variable = "x",
): CalculusExplanation {
  const { expression, node } = source(input, variable);
  const partial = variable !== "x" || dependsOn(node, "y");
  const operator = partial ? `∂/∂${variable}` : `d/d${variable}`;
  let result: string,
    steps: ExplainedStep[],
    notes: string[] = [],
    constants: string[] = [];
  let verified = false;
  try {
    const explained = explainDerivativeTree(node, variable);
    if (!verifyDerivativePair(expression, explained.result, variable))
      throw new Error("Rule mismatch");
    ({ result, steps, notes, constants } = explained);
    verified = true;
    if (!steps.length) {
      const varies = dependsOn(node, variable);
      steps = [
        {
          before: `${operator}[${expression}]`,
          operation: varies ? "مشتقة المتغير" : "مشتقة الثابت",
          after: result,
          rule: varies ? `d${variable}/d${variable} = 1` : "مشتقة الثابت صفر",
          reason: varies
            ? `المستقيم y = ${variable} يرتفع وحدة واحدة لكل وحدة على المحور، فميله 1.`
            : `القيمة لا تتغير عند تغير ${variable}، فالمنحنى أفقي وميله صفر.`,
        },
      ];
    }
  } catch {
    result = derivative(node, variable).toString();
    verified = verifyDerivativePair(expression, result, variable);
    steps = [
      {
        before: `${operator}[${expression}]`,
        operation: "تطبيق قواعد الاشتقاق",
        after: result,
        rule: "قواعد الاشتقاق",
        reason:
          "طُبقت قواعد الاشتقاق آليًا؛ هذا التركيب خارج الشرح التفصيلي المدعوم خطوة بخطوة.",
      },
    ];
  }
  if (partial) {
    const others = ["x", "y"].filter(
      (name) => name !== variable && dependsOn(node, name),
    );
    if (others.length)
      steps.unshift({
        before: `${operator}[${expression}]`,
        operation: `تثبيت ${others.join(" و")}`,
        after: `${others.join(", ")} = ثابت`,
        rule: "الاشتقاق الجزئي",
        reason: `نقيس معدل التغير عند التحرك بموازاة محور ${variable} فقط، لذلك نعامل ${others.join(" و")} كعدد ثابت؛ كل حد لا يحتوي ${variable} مشتقته صفر.`,
      });
  }
  return {
    source: expression,
    variable,
    operation: "derivative",
    partial,
    result: tidy(result),
    display: tidy(result),
    steps,
    signNotes: notes,
    constants,
    verified,
  };
}

export function explainIntegral(
  input: string,
  variable = "x",
): CalculusExplanation {
  const { expression, node } = source(input, variable);
  let result: string,
    steps: ExplainedStep[],
    notes: string[] = [];
  try {
    const explained = explainIntegralTree(node, variable);
    if (!verifyDerivativePair(explained.result, expression, variable))
      throw new Error("Rule mismatch");
    ({ result, steps, notes } = explained);
  } catch {
    result = nerdamer.integrate(expression, variable).toString();
    if (/integrate\(/.test(result))
      throw new Error("لم يتمكن المحرك من إيجاد تكامل رمزي لهذا التعبير.");
    steps = [
      {
        before: `∫ ${wrap(expression)} d${variable}`,
        operation: "إيجاد دالة أصلية بمحرك رمزي",
        after: result,
        rule: "التكامل غير المحدد",
        reason:
          "لا تنطبق قاعدة أساسية واحدة مباشرة (قد يلزم التعويض أو التجزئة)؛ نعرض ناتج المحرك الرمزي ثم نتحقق منه بالاشتقاق.",
      },
    ];
  }
  const verified = verifyDerivativePair(result, expression, variable);
  if (verified)
    steps.push({
      before: `d/d${variable}[${result}]`,
      operation: "التحقق بالاشتقاق",
      after: expression,
      rule: "F′ = f",
      reason:
        "اشتقاق الدالة الأصلية يعيد الدالة الأصلية تحت التكامل؛ هذا هو معنى «دالة أصلية». فُحص التطابق عدديًا عند نقاط عديدة.",
    });
  steps.push({
    before: result,
    operation: "إضافة ثابت التكامل",
    after: `${result} + C`,
    rule: "التكامل غير المحدد",
    reason:
      "كل الدوال F + C لها المشتقة نفسها لأن مشتقة الثابت صفر؛ إزاحة المنحنى رأسيًا لا تغير ميله.",
  });
  return {
    source: expression,
    variable,
    operation: "integral",
    partial: false,
    result,
    display: `${result} + C`,
    steps,
    signNotes: notes,
    constants: [],
    verified,
  };
}

export function explainCalculus(
  input: string,
  operation: CalculusOperation,
  variable = "x",
) {
  return operation === "derivative"
    ? explainDerivative(input, variable)
    : explainIntegral(input, variable);
}

/** Restricts f(x,y) to the line where the other variable is fixed, re-expressed in x for plotting. */
export function sliceExpression(
  expression: string,
  variable: "x" | "y",
  held: number,
) {
  try {
    return parse(normalize(expression))
      .transform((node) => {
        if (node.type !== "SymbolNode") return node;
        const name = (node as SymbolNode).name;
        if (name === (variable === "x" ? "y" : "x")) return parse(`(${held})`);
        if (variable === "y" && name === "y") return parse("x");
        return node;
      })
      .toString();
  } catch {
    return expression;
  }
}

export function piLabel(value: number) {
  const quarters = value / (Math.PI / 4);
  const rounded = Math.round(quarters);
  if (Math.abs(quarters - rounded) > 1e-6) return fmt(value);
  if (rounded === 0) return "0";
  const divisor = rounded % 4 === 0 ? 1 : rounded % 2 === 0 ? 2 : 4;
  const numerator = (rounded * divisor) / 4;
  const sign = numerator < 0 ? "−" : "";
  const magnitude = Math.abs(numerator);
  return `${sign}${magnitude === 1 ? "" : magnitude}π${divisor === 1 ? "" : `/${divisor}`}`;
}

export type SignInterval = { from: number; to: number; sign: 1 | -1 };
/** Sampled sign pattern; reports observations in the window, not a proof about every point. */
export function signIntervals(
  expression: string,
  from: number,
  to: number,
  scope: Record<string, number> = {},
  samples = 600,
) {
  const code = safeParse(expression, allowed).compile();
  const evaluate = (x: number) => {
    try {
      const value: unknown = code.evaluate({ ...scope, x });
      return typeof value === "number" && Number.isFinite(value) ? value : NaN;
    } catch {
      return NaN;
    }
  };
  const tolerance = 1e-9;
  const intervals: SignInterval[] = [];
  const zeros: number[] = [];
  let start: number | null = null,
    sign: 1 | -1 | 0 = 0,
    previous = from;
  const close = (end: number) => {
    if (start !== null && sign !== 0 && end - start > (to - from) / samples)
      intervals.push({ from: start, to: end, sign });
  };
  for (let index = 0; index <= samples; index++) {
    const x = from + ((to - from) * index) / samples;
    const value = evaluate(x);
    const current: 1 | -1 | 0 = !Number.isFinite(value)
      ? 0
      : Math.abs(value) <= tolerance
        ? 0
        : value > 0
          ? 1
          : -1;
    if (!Number.isFinite(value)) {
      close(previous);
      start = null;
      sign = 0;
    } else if (current === 0) {
      if (!zeros.some((zero) => Math.abs(zero - x) < 1e-6)) zeros.push(x);
      close(x);
      start = x;
      sign = 0;
    } else if (sign === 0) {
      start ??= x;
      sign = current;
    } else if (current !== sign) {
      let left = previous,
        right = x;
      for (let iteration = 0; iteration < 50; iteration++) {
        const middle = (left + right) / 2;
        const middleValue = evaluate(middle);
        if (!Number.isFinite(middleValue)) break;
        if (Math.sign(middleValue) === sign) left = middle;
        else right = middle;
      }
      const root = (left + right) / 2;
      const rootValue = evaluate(root);
      if (Number.isFinite(rootValue) && Math.abs(rootValue) < 1e-6)
        zeros.push(root);
      close(root);
      start = root;
      sign = current;
    }
    previous = x;
  }
  close(to);
  return { intervals, zeros };
}
