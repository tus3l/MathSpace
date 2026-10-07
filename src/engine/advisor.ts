export function recommendQuadratic(
  a: number,
  b: number,
  c: number,
  discriminant: number,
) {
  const difference = b === 0 && c / a < 0;
  const easy =
    discriminant >= 0 &&
    Number.isInteger(Math.sqrt(discriminant)) &&
    [a, b, c].every(Number.isInteger);
  const method = difference
    ? "فرق بين مربعين"
    : easy
      ? "التحليل إلى عوامل"
      : "القانون العام";
  const methodReason = difference
    ? "لا يوجد حد خطي، والحد الثابت سالب بعد القسمة على معامل x²؛ لذا يمكن كتابة فرق بين مربعين."
    : easy
      ? "المميز مربع كامل والمعاملات صحيحة، لذلك يمكن إيجاد عوامل دقيقة بسهولة."
      : "التحليل البسيط ليس الخيار الأنسب؛ القانون العام يعمل لكل معادلة تربيعية ذات معامل رئيسي غير صفري.";
  const methods = [
    {
      name: "التحليل إلى عوامل",
      reason:
        easy || difference
          ? "العوامل قابلة للاستخراج مباشرة هنا."
          : "قد تحتاج العوامل إلى جذور غير نسبية أو مركبة.",
      recommended: easy || difference,
    },
    {
      name: "إكمال المربع",
      reason: "يوضح بنية القطع المكافئ، لكنه يتطلب خطوات إضافية.",
      recommended: false,
    },
    {
      name: "القانون العام",
      reason: "يربط الجذور بالمعاملات والمميز مباشرة.",
      recommended: !easy && !difference,
    },
    {
      name: "الرسم البياني",
      reason: "يحدد مواضع الجذور بصريًا، وليس بديلًا عن الحل الدقيق.",
      recommended: false,
    },
  ];
  return { difference, easy, method, methodReason, methods };
}
