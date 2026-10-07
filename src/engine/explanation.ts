export type CalculationStep = {
  before: string;
  operation: string;
  after: string;
  rule: string;
};
export type ExplainedStep = CalculationStep & { reason: string };
const reasons: Record<string, string> = {
  "الصورة القياسية":
    "نجمع الحدود في طرف واحد، ثم نقرأ معاملات x² وx والحد الثابت.",
  "مميز المعادلة التربيعية":
    "المميز هو الجزء تحت الجذر في القانون العام: موجب لجذرين حقيقيين، صفر لجذر مكرر، وسالب دون جذور حقيقية.",
  "خاصية حاصل الضرب الصفري":
    "إذا كان حاصل ضرب عددين صفرًا، فلا بد أن يكون أحدهما صفرًا.",
  "الأعداد المركبة":
    "المميز سالب؛ نستخدم √(-1) = i. لا يقطع الرسم الحقيقي محور x.",
};
export function explainStep(
  calculation: CalculationStep,
  dynamicReason?: string,
): ExplainedStep {
  const reason = reasons[calculation.rule] || dynamicReason;
  if (!reason) throw new Error(`Missing explanation for ${calculation.rule}`);
  return { ...calculation, reason };
}
