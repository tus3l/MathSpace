import { useState } from "react";
import {
  BookOpen,
  Check,
  Lightbulb,
  ListOrdered,
  Play,
  RotateCcw,
  Square,
  X,
} from "lucide-react";
import { analyze } from "../engine/math";
import {
  learningLaws,
  tryLaw,
  verifyFinal,
  verifyTransition,
} from "../engine/learning";
import type { LawAttempt, Verdict } from "../engine/learning";
import { Formula, MathInput } from "./Controls";

type StudentStep = Verdict & {
  source: string;
  before: string;
  after: string;
  attemptIndex: number;
  discarded?: boolean;
};
type Props = {
  source: string;
  graphDescription: string;
  values: Record<string, number>;
  activity: string[];
  running: boolean;
  onPlay: () => void;
  onReset: () => void;
  onShowSteps: () => void;
  onClearPreview: () => void;
  onPreview: (
    expression: string,
    purpose: LawAttempt["purpose"],
    reason: string,
  ) => void;
};

export function LearningPanel({
  source,
  graphDescription,
  values,
  activity,
  running,
  onPlay,
  onReset,
  onShowSteps,
  onClearPreview,
  onPreview,
}: Props) {
  const [panel, setPanel] = useState<"library" | "advisor" | "steps" | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [lawId, setLawId] = useState("quadratic");
  const [attempts, setAttempts] = useState<LawAttempt[]>([]);
  const [steps, setSteps] = useState<StudentStep[]>([]);
  const [draft, setDraft] = useState("");
  const [answer, setAnswer] = useState({ source, value: "" });
  const currentAttempts = attempts.filter(
    (attempt) => attempt.source === source,
  );
  const attempt = currentAttempts.at(-1);
  const attemptIndex = attempt ? attempts.lastIndexOf(attempt) : -1;
  const currentSteps = steps.filter(
    (step) =>
      step.source === source &&
      step.attemptIndex === attemptIndex &&
      !step.discarded,
  );
  const selectedLaw = learningLaws.find((law) => law.id === lawId)!;
  const analysis = analyze(source);
  const final = verifyFinal(
    source,
    answer.source === source ? answer.value : "",
    attempt,
  );
  const firstError = currentSteps.findIndex((step) => step.valid === false);
  const uncertain = currentSteps.some((step) => step.valid === null);
  const complete =
    final.valid === true &&
    firstError === -1 &&
    !uncertain &&
    (!attempt || attempt.valid === true);
  const lastAttempt = attempts.at(-1);
  const filtered = learningLaws.filter((law) =>
    `${law.title} ${law.condition}`.includes(search.trim()),
  );
  function open(next: typeof panel) {
    setPanel(panel === next ? null : next);
    if (next === "steps") onShowSteps();
  }
  return (
    <section
      className="learning-workbench"
      aria-label="تجربة القوانين والمستشار داخل الرسم"
    >
      <div className="learning-toolbar">
        <button
          className={panel === "library" ? "active" : ""}
          onClick={() => open("library")}
          aria-expanded={panel === "library"}
        >
          <BookOpen size={16} /> المكتبة
        </button>
        <button
          className={panel === "advisor" ? "active" : ""}
          onClick={() => open("advisor")}
          aria-expanded={panel === "advisor"}
        >
          <Lightbulb size={16} /> المستشار
        </button>
        <button onClick={onPlay} aria-pressed={running}>
          {running ? <Square size={16} /> : <Play size={16} />}
          {running ? "إيقاف الحركة" : "تشغيل الحركة"}
        </button>
        <button onClick={onReset}>
          <RotateCcw size={16} /> إعادة ضبط
        </button>
        <button
          className={panel === "steps" ? "active" : ""}
          onClick={() => open("steps")}
          aria-expanded={panel === "steps"}
        >
          <ListOrdered size={16} /> عرض الخطوات
        </button>
      </div>
      {panel && (
        <div className="learning-drawer">
          <div className="section-heading">
            <h3>
              {panel === "library"
                ? "تجربة قانون على المسألة"
                : panel === "advisor"
                  ? "مراجعة الحل الحالي"
                  : "خطوات الطالب والتطبيق"}
            </h3>
            <button
              title="إغلاق اللوحة"
              aria-label="إغلاق اللوحة"
              onClick={() => setPanel(null)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="learning-context">
            <small>المسألة الحالية</small>
            <code dir="ltr">{source}</code>
          </div>
          {panel === "library" && (
            <>
              <input
                className="full-select"
                aria-label="بحث قوانين التجربة"
                placeholder="بحث القوانين"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <label className="field-label">
                القانون أو طريقة الحل
                <select
                  value={lawId}
                  aria-label="قانون للمسألة الحالية"
                  onChange={(event) => setLawId(event.target.value)}
                >
                  {!filtered.some((law) => law.id === lawId) && (
                    <option value={lawId}>{selectedLaw.title}</option>
                  )}
                  {filtered.map((law) => (
                    <option key={law.id} value={law.id}>
                      {law.title}
                    </option>
                  ))}
                </select>
              </label>
              {!filtered.length && <p>لا توجد نتائج مطابقة.</p>}
              <Formula value={selectedLaw.formula} block />
              <p>{selectedLaw.condition}</p>
              <button
                className="button primary"
                onClick={() => {
                  const next = tryLaw(source, lawId);
                  setAttempts([...attempts, next]);
                  setAnswer({ source, value: "" });
                  onClearPreview();
                  if (next.valid && next.preview)
                    onPreview(
                      next.preview,
                      next.purpose,
                      `${next.title}: ${next.output}. ${next.message}`,
                    );
                }}
              >
                <Play size={16} /> تجربة القانون
              </button>
              {lastAttempt && (
                <div
                  className={`learning-verdict ${lastAttempt.valid === false ? "incorrect" : ""}`}
                  role="status"
                >
                  <strong>
                    {lastAttempt.source !== source ? "محاولة سابقة: " : ""}
                    {lastAttempt.title}:{" "}
                    {lastAttempt.valid === true
                      ? "قابل للتطبيق"
                      : lastAttempt.valid === false
                        ? "غير مناسب"
                        : "لم يُتحقق من التطبيق"}
                  </strong>
                  <p>{lastAttempt.message}</p>
                  {lastAttempt.output && (
                    <code dir="ltr">{lastAttempt.output}</code>
                  )}
                </div>
              )}
            </>
          )}
          {panel === "steps" && (
            <>
              {attempt?.steps.map((step, index) => (
                <div className="learning-step" key={index}>
                  <strong>
                    {index + 1}. {step.operation}
                  </strong>
                  <code dir="ltr">{step.before}</code>
                  <code dir="ltr">{step.after}</code>
                  <p>{step.reason}</p>
                  <button
                    className="button secondary"
                    onClick={() =>
                      onPreview(
                        attempt.preview || step.after,
                        attempt.purpose,
                        `${step.after}. ${step.reason}`,
                      )
                    }
                  >
                    <Play size={14} /> تمثيل الخطوة
                  </button>
                </div>
              ))}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const previous =
                    currentSteps.at(-1)?.after ||
                    (attempt?.valid &&
                    ["transform", "derivative"].includes(attempt.purpose)
                      ? attempt.output
                      : source);
                  const verdict = verifyTransition(previous, draft);
                  setSteps([
                    ...steps,
                    {
                      source,
                      before: previous,
                      after: draft,
                      attemptIndex,
                      ...verdict,
                    },
                  ]);
                  onPreview(draft, "transform", verdict.message);
                  setDraft("");
                }}
              >
                <label className="field-label">
                  الخطوة التالية للطالب
                  <MathInput
                    label="خطوة الطالب"
                    value={draft}
                    onChange={setDraft}
                    required
                  />
                </label>
                <button className="button secondary" type="submit">
                  <Check size={16} /> تسجيل الخطوة وفحصها
                </button>
              </form>
              {currentSteps.map((step, index) => (
                <div
                  key={index}
                  className={`learning-step ${step.valid === false ? "incorrect" : ""}`}
                >
                  <strong>خطوة الطالب {index + 1}</strong>
                  <code dir="ltr">
                    {step.before} → {step.after}
                  </code>
                  <p>{step.message}</p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      const removed = currentSteps.slice(index);
                      setSteps(
                        steps.map((entry) =>
                          removed.includes(entry)
                            ? { ...entry, discarded: true }
                            : entry,
                        ),
                      );
                      setDraft(step.after);
                      onPreview(
                        step.before,
                        "transform",
                        "العودة إلى ما قبل الخطوة لتصحيحها؛ المحاولة السابقة محفوظة في السجل.",
                      );
                    }}
                  >
                    <RotateCcw size={14} /> تصحيح من هنا
                  </button>
                </div>
              ))}
            </>
          )}
          {(panel === "steps" || panel === "advisor") && (
            <label className="field-label">
              نتيجة الطالب النهائية
              <input
                aria-label="نتيجة الطالب النهائية"
                dir="ltr"
                value={answer.source === source ? answer.value : ""}
                onChange={(event) =>
                  setAnswer({ source, value: event.target.value })
                }
                placeholder="x: -2, -3"
              />
            </label>
          )}
          {panel === "advisor" && (
            <>
              <div
                className={`learning-verdict ${firstError !== -1 || final.valid === false || attempt?.valid === false ? "incorrect" : ""}`}
                role="status"
              >
                <strong>
                  {complete
                    ? currentSteps.length
                      ? "الخطوات والنتيجة صحيحتان ضمن نطاق التحقق"
                      : attempt
                        ? "تطبيق القانون والنتيجة صحيحان ضمن نطاق التحقق"
                        : "النتيجة صحيحة؛ لا توجد خطوات مدخلة لمراجعتها"
                    : firstError !== -1
                      ? `بدأ الخطأ في خطوة الطالب ${firstError + 1}`
                      : final.valid === false || attempt?.valid === false
                        ? "الحل يحتاج تصحيحًا"
                        : "المراجعة غير مكتملة"}
                </strong>
                <p>
                  {attempt
                    ? `${attempt.title}: ${attempt.message}`
                    : "لم تختَر قانونًا من المكتبة؛ المراجعة تعتمد على خطواتك والنتيجة المدخلة."}
                </p>
                {firstError !== -1 && (
                  <>
                    <p>{currentSteps[firstError].message}</p>
                    <p>
                      ما بعد هذه الخطوة لا يُعتمد استنادًا إليها، حتى إن صادفت
                      النتيجة الصحيحة. ارجع إلى{" "}
                      <code dir="ltr">{currentSteps[firstError].before}</code>{" "}
                      وأعد التحويل.
                    </p>
                  </>
                )}
                {currentSteps.map((step, index) => (
                  <p key={index}>
                    الخطوة {index + 1}: {step.message}
                  </p>
                ))}
                <p>
                  <strong>النتيجة النهائية: </strong>
                  {final.message}
                </p>
                {analysis.supported && (
                  <p>
                    <strong>الطريقة المقترحة: </strong>
                    {analysis.method}. {analysis.methodReason}
                  </p>
                )}
              </div>
              <p>{graphDescription}</p>
              <div className="learning-context">
                <small>القيم ونقطة الفحص الحالية</small>
                <code dir="ltr">
                  {Object.entries(values)
                    .map(
                      ([name, value]) => `${name}=${Number(value.toFixed(4))}`,
                    )
                    .join(" · ") || "—"}
                </code>
              </div>
              <details>
                <summary>
                  سجل تغييرات المسألة والقيم ({activity.length})
                </summary>
                {activity.map((entry, index) => (
                  <p dir="auto" key={index}>
                    {entry}
                  </p>
                ))}
              </details>
            </>
          )}
          {attempts.length > 0 && (
            <details className="learning-history">
              <summary>سجل تجارب القوانين ({attempts.length})</summary>
              {attempts.map((item, index) => (
                <div key={index} className="learning-step">
                  <strong>
                    {index + 1}. {item.title}
                    {item.source !== source ? " · حالة سابقة" : ""}
                  </strong>
                  <code dir="ltr">{item.source}</code>
                  <p>{item.message}</p>
                </div>
              ))}
            </details>
          )}
          {steps.length > 0 && (
            <details className="learning-history">
              <summary>سجل خطوات الطالب ({steps.length})</summary>
              {steps.map((item, index) => (
                <div key={index} className="learning-step">
                  <strong>
                    {index + 1}.{" "}
                    {item.discarded
                      ? "محاولة قبل التصحيح"
                      : item.source !== source ||
                          item.attemptIndex !== attemptIndex
                        ? "حالة سابقة"
                        : "خطوة حالية"}
                  </strong>
                  <code dir="ltr">
                    {item.before} → {item.after}
                  </code>
                  <p>{item.message}</p>
                </div>
              ))}
            </details>
          )}
        </div>
      )}
    </section>
  );
}
