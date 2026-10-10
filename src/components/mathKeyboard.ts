import { parse } from "mathjs";
import type { MathNode } from "mathjs";
import { normalize } from "../engine/math";

export type MathKey = {
  title: string;
  latex: string;
  prefix: string;
  suffix?: string;
  fallback?: string;
  operation?: boolean;
  notationOnly?: boolean;
};

export const mathKeyGroups: { title: string; keys: MathKey[] }[] = [
  {
    title: "الأساسيات",
    keys: [
      ...["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "."].map(
        (digit) => ({
          title: `إدراج ${digit}`,
          latex: digit,
          prefix: digit,
          fallback: "",
        }),
      ),
      { title: "جمع", latex: "+", prefix: "+", fallback: "" },
      { title: "طرح", latex: "-", prefix: "-", fallback: "" },
      { title: "ضرب", latex: "\\times", prefix: "*", fallback: "" },
      { title: "قسمة", latex: "\\div", prefix: "/", fallback: "" },
      { title: "يساوي", latex: "=", prefix: "=", fallback: "" },
      { title: "قوس أيسر", latex: "(", prefix: "(", fallback: "" },
      { title: "قوس أيمن", latex: ")", prefix: ")", fallback: "" },
      { title: "أقواس حول التعبير", latex: "(x)", prefix: "(", suffix: ")" },
      { title: "كسر", latex: "\\frac{x}{y}", prefix: "(", suffix: ")/(1)" },
    ],
  },
  {
    title: "القوى والجذور",
    keys: [
      { title: "التربيع", latex: "x^2", prefix: "(", suffix: ")^2" },
      { title: "التكعيب", latex: "x^3", prefix: "(", suffix: ")^3" },
      {
        title: "قوة مخصصة؛ استبدل الأس 3",
        latex: "x^n",
        prefix: "(",
        suffix: ")^(3)",
      },
      {
        title: "الجذر التربيعي",
        latex: "\\sqrt{x}",
        prefix: "sqrt(",
        suffix: ")",
      },
      {
        title: "الجذر التكعيبي للقيم غير السالبة",
        latex: "\\sqrt[3]{x}",
        prefix: "(",
        suffix: ")^(1/3)",
      },
      {
        title: "جذر من الرتبة n؛ استبدل الرتبة 3",
        latex: "\\sqrt[n]{x}",
        prefix: "(",
        suffix: ")^(1/3)",
      },
      { title: "المقلوب", latex: "\\frac{1}{x}", prefix: "1/(", suffix: ")" },
      { title: "القيمة المطلقة", latex: "|x|", prefix: "abs(", suffix: ")" },
      {
        title: "العدد الصحيح الأصغر",
        latex: "\\lfloor x\\rfloor",
        prefix: "floor(",
        suffix: ")",
      },
      {
        title: "العدد الصحيح الأكبر",
        latex: "\\lceil x\\rceil",
        prefix: "ceil(",
        suffix: ")",
      },
    ],
  },
  {
    title: "المثلثات",
    keys: [
      ...[
        "sin",
        "cos",
        "tan",
        "sec",
        "csc",
        "cot",
        "asin",
        "acos",
        "atan",
        "sinh",
        "cosh",
      ].map((name, index) => ({
        title: [
          "الجيب",
          "جيب التمام",
          "الظل",
          "القاطع",
          "قاطع التمام",
          "ظل التمام",
          "معكوس الجيب",
          "معكوس جيب التمام",
          "معكوس الظل",
          "الجيب الزائدي",
          "جيب التمام الزائدي",
        ][index],
        latex:
          index >= 6 && index <= 8
            ? `\\${name.slice(1)}^{-1}`
            : `\\operatorname{${name}}`,
        prefix: `${name}(`,
        suffix: ")",
      })),
      {
        title: "تحويل الدرجات إلى راديان",
        latex: "x\\frac{\\pi}{180}",
        prefix: "(",
        suffix: ")*pi/180",
      },
    ],
  },
  {
    title: "اللوغاريتمات",
    keys: [
      {
        title: "اللوغاريتم الطبيعي",
        latex: "\\ln x",
        prefix: "ln(",
        suffix: ")",
      },
      {
        title: "اللوغاريتم العشري",
        latex: "\\log_{10}x",
        prefix: "log10(",
        suffix: ")",
      },
      {
        title: "لوغاريتم للأساس 2؛ يمكن تغيير الأساس",
        latex: "\\log_b x",
        prefix: "log(",
        suffix: ",2)",
      },
      { title: "الدالة الأسية", latex: "e^x", prefix: "exp(", suffix: ")" },
      { title: "قوة للعدد 10", latex: "10^x", prefix: "10^(", suffix: ")" },
      {
        title: "صيغة علمية",
        latex: "x\\times10^n",
        prefix: "(",
        suffix: ")*10^3",
      },
    ],
  },
  {
    title: "التفاضل والتكامل",
    keys: [
      {
        title: "اشتقاق بالنسبة إلى x",
        latex: "\\frac{d}{dx}",
        prefix: "derivative(",
        suffix: ")",
        operation: true,
      },
      {
        title: "تكامل غير محدد بالنسبة إلى x",
        latex: "\\int f(x)\\,dx",
        prefix: "∫ (",
        suffix: ") dx",
        operation: true,
      },
      {
        title: "تكامل محدد؛ إدخال فقط دون حساب تلقائي",
        latex: "\\int_0^1 f(x)\\,dx",
        prefix: "definiteIntegral(",
        suffix: ",0,1)",
        operation: true,
        notationOnly: true,
      },
      {
        title: "نهاية؛ إدخال فقط دون حساب تلقائي",
        latex: "\\lim_{x\\to0} f(x)",
        prefix: "limit(",
        suffix: ",x,0)",
        operation: true,
        notationOnly: true,
      },
      {
        title: "مجموع؛ إدخال فقط دون حساب تلقائي",
        latex: "\\sum_{n=1}^{10} f(n)",
        prefix: "sum(",
        suffix: ",n,1,10)",
        fallback: "n",
        operation: true,
        notationOnly: true,
      },
    ],
  },
  {
    title: "الهندسة والإحداثيات",
    keys: [
      {
        title: "نقطة؛ إحداثيان",
        latex: "(x,y)",
        prefix: "point(",
        fallback: "2",
        suffix: ",3)",
      },
      {
        title: "دائرة؛ نصف قطر موجب",
        latex: "\\bigcirc\\;r",
        prefix: "circle(",
        fallback: "3",
        suffix: ")",
      },
      {
        title: "مثلث؛ ضلعان وزاوية محصورة بالدرجات",
        latex: "\\triangle\\;(a,b,\\theta)",
        prefix: "triangle(",
        fallback: "3",
        suffix: ",4,90)",
      },
      {
        title: "زاوية بالدرجات",
        latex: "\\angle\\theta",
        prefix: "angle(",
        fallback: "60",
        suffix: ")",
      },
      {
        title: "معادلة دائرة",
        latex: "x^2+y^2=r^2",
        prefix: "x^2+y^2=(",
        fallback: "3",
        suffix: ")^2",
        operation: true,
      },
      {
        title: "قطع ناقص",
        latex: "\\frac{x^2}{9}+\\frac{y^2}{4}=1",
        prefix: "x^2/9+y^2/4=1",
        fallback: "",
        operation: true,
      },
      {
        title: "قطع زائد",
        latex: "x^2-y^2=1",
        prefix: "x^2-y^2=1",
        fallback: "",
        operation: true,
      },
    ],
  },
  {
    title: "المتجهات والمصفوفات",
    keys: [
      {
        title: "متجه ثنائي الأبعاد",
        latex: "\\vec{v}=(a,b)",
        prefix: "vector(",
        fallback: "3",
        suffix: ",4)",
      },
      {
        title: "مصفوفة 2×2؛ عدل العناصر",
        latex: "\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}",
        prefix: "[[",
        fallback: "1",
        suffix: ",0],[0,1]]",
      },
      {
        title: "مصفوفة دوران 90 درجة",
        latex: "\\begin{pmatrix}0&-1\\\\1&0\\end{pmatrix}",
        prefix: "[[0,-1],[1,0]]",
        fallback: "",
        operation: true,
      },
      {
        title: "فاصلة بين الإحداثيات أو العناصر",
        latex: ",",
        prefix: ",",
        fallback: "",
      },
      { title: "قوس مصفوفة أيسر", latex: "[", prefix: "[", fallback: "" },
      { title: "قوس مصفوفة أيمن", latex: "]", prefix: "]", fallback: "" },
    ],
  },
  {
    title: "العلاقات والرموز",
    keys: [
      ...[
        ["أصغر من", "<", "<"],
        ["أكبر من", ">", ">"],
        ["أصغر أو يساوي", "\\le", "<="],
        ["أكبر أو يساوي", "\\ge", ">="],
        ["لا يساوي", "\\ne", "!="],
        ["زائد أو ناقص", "\\pm", "±"],
        ["ما لا نهاية", "\\infty", "∞"],
      ].map(([title, latex, prefix]) => ({
        title: `${title}؛ إدخال فقط دون حل تلقائي`,
        latex,
        prefix,
        fallback: "",
        notationOnly: true,
      })),
    ],
  },
];

export function keyboardPreview(value: string): string {
  const source = normalize(value);
  if (!source || source.length > 250) return "";
  const request = source.match(/^(definiteIntegral|limit|sum)\((.*)\)$/);
  if (request) {
    const node = parse(source);
    if (!("args" in node)) return "";
    const args = node.args as MathNode[];
    if (request[1] === "definiteIntegral" && args.length === 3)
      return `\\int_{${args[1].toTex()}}^{${args[2].toTex()}} ${args[0].toTex()}\\,dx`;
    if (request[1] === "limit" && args.length === 3)
      return `\\lim_{${args[1].toTex()}\\to ${args[2].toTex()}} ${args[0].toTex()}`;
    if (request[1] === "sum" && args.length === 4)
      return `\\sum_{${args[1].toTex()}=${args[2].toTex()}}^{${args[3].toTex()}} ${args[0].toTex()}`;
    return "";
  }
  const relations: Record<string, string> = {
    "<=": "\\le",
    ">=": "\\ge",
    "!=": "\\ne",
    "±": "\\pm",
    "=": "=",
    "<": "<",
    ">": ">",
  };
  return source
    .split(/(<=|>=|!=|±|=|<|>)/)
    .map((part) =>
      relations[part]
        ? ` ${relations[part]} `
        : part.trim() === "∞"
          ? "\\infty"
          : parse(part.replace(/∞/g, "Infinity")).toTex(),
    )
    .join("");
}

export function insertMathKey(
  value: string,
  start: number,
  end: number,
  key: MathKey,
) {
  let selected = value.slice(start, end);
  if (key.operation) {
    start = 0;
    end = value.length;
    selected = value.includes("=") ? "" : value;
  }
  const fallback = key.fallback ?? "x";
  const body = fallback === "" ? "" : selected || fallback;
  const next =
    value.slice(0, start) +
    key.prefix +
    body +
    (key.suffix ?? "") +
    value.slice(end);
  if (next.length > 250)
    throw new Error("التعبير لا يمكن أن يتجاوز 250 حرفًا.");
  const selectionStart = start + key.prefix.length;
  return {
    value: next,
    start: selectionStart,
    end: selectionStart + body.length,
  };
}

export function deleteMathSelection(value: string, start: number, end: number) {
  const position = start === end ? Math.max(0, start - 1) : start;
  return {
    value: value.slice(0, position) + value.slice(end),
    start: position,
    end: position,
  };
}
