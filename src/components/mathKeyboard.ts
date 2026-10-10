export type MathKey = {
  title: string;
  latex: string;
  prefix: string;
  suffix?: string;
  fallback?: string;
  operation?: boolean;
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
    ],
  },
];

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
