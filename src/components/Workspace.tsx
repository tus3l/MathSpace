import { useRef, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  CircleHelp,
  Lightbulb,
  Plus,
  Trash2,
  Sparkles,
  GitCompareArrows,
  ChartNoAxesCombined,
  ListOrdered,
} from "lucide-react";
import {
  analyze,
  coefficients,
  compileFunction,
  fmt,
  symbolic,
} from "../engine/math";
import type { Analysis } from "../engine/math";
import { functionFamilies } from "../content/knowledge";
import { Graph } from "./Graph";
import { Formula, MathInput, Slider, Why } from "./Controls";
import { MathTools } from "./MathTools";

type Props = {
  onSave: (expression: string, kind: string) => void;
  initial?: string;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
};
export function Workspace({
  onSave,
  initial,
  bookmarks,
  toggleBookmark,
}: Props) {
  const equationRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState(initial || "x^2 + 5x + 6 = 0");
  const [analysis, setAnalysis] = useState<Analysis>(() =>
    analyze(initial || "x^2 + 5x + 6 = 0"),
  );
  const [mode, setMode] = useState<"solve" | "explore" | "compare">("solve");
  const [parameters, setParameters] = useState(() => {
    try {
      const [c, b, a] = coefficients(
        (initial || "x^2+5*x+6=0").replace(/^y\s*=\s*/, ""),
      );
      return { a, b, c };
    } catch {
      return { a: 1, b: 0, c: 0 };
    }
  });
  const [change, setChange] = useState(
    "المعامل a موجب؛ لذلك يفتح القطع المكافئ للأعلى. الجذور هي تقاطعاته مع محور x.",
  );
  const [panel, setPanel] = useState<"steps" | "advisor">("steps");
  const [level, setLevel] = useState("عادي");
  const [hint, setHint] = useState(0);
  const [revealed, setRevealed] = useState(99);
  const [extra, setExtra] = useState<string[]>([]);
  const [newCurve, setNewCurve] = useState("sin(x)");
  const [error, setError] = useState("");
  const [inspector, setInspector] = useState<{
    x: number;
    y: number;
    slope: number;
  } | null>(null);
  const [operation, setOperation] = useState<
    "simplify" | "factor" | "expand" | "derivative" | "integral"
  >("simplify");
  const [symbolicResult, setSymbolicResult] = useState("");
  const expression = analysis.graph || "0";
  const exploreExpression = `${parameters.a}*x^2+(${parameters.b})*x+(${parameters.c})`;
  const currentExpression = mode === "solve" ? expression : exploreExpression;
  const curves =
    !analysis.supported && mode === "solve"
      ? []
      : [
          { expression: currentExpression, color: "#7770ce", label: "f(x)" },
          ...(mode === "compare"
            ? [
                {
                  expression: "x^2",
                  color: "#249b8d",
                  label: "Before: x²",
                  dashed: true,
                },
              ]
            : []),
          ...extra.map((expression, index) => ({
            expression,
            color: ["#e28e4e", "#d8687e", "#358ec5"][index % 3],
            label: expression,
          })),
        ];
  const currentAnalysis =
    mode === "solve" ? analysis : analyze(`${exploreExpression}=0`);
  const points = currentAnalysis.roots.map((root) => ({
    x: root,
    y: 0,
    label: `x = ${fmt(root)}`,
    color: "#7770ce",
  }));
  if (mode !== "solve" && parameters.a !== 0) {
    const x = -parameters.b / (2 * parameters.a);
    points.push({
      x,
      y: compileFunction(exploreExpression)(x),
      label: "Vertex",
      color: "#249b8d",
    });
  }
  function submit(expression = input, save = true) {
    const next = analyze(expression);
    setInput(expression);
    setAnalysis(next);
    setHint(0);
    setRevealed(99);
    setSymbolicResult("");
    setError("");
    setInspector(null);
    if (next.supported) {
      if (save) onSave(expression, "problem");
      try {
        const [c, b, a] = coefficients(expression);
        setParameters({ a, b, c });
      } catch {
        /* Functions need not be polynomials. */
      }
    }
    setMode("solve");
  }
  function update(name: "a" | "b" | "c", value: number) {
    const previous = parameters[name],
      next = { ...parameters, [name]: value };
    setParameters(next);
    let why = "";
    if (name === "a")
      why =
        value === 0
          ? "أصبحت a صفرًا؛ اختفى حد x²، فلم تعد الدالة تربيعية."
          : `أصبحت a = ${fmt(value)}؛ ${value < 0 ? "الإشارة السالبة تجعل القطع المكافئ يفتح للأسفل" : "الإشارة الموجبة تجعله يفتح للأعلى"}. ${Math.abs(value) > Math.abs(previous) ? "زيادة |a| تضيق المنحنى" : Math.abs(value) < Math.abs(previous) ? "نقصان |a| يوسع المنحنى" : "تغيرت الإشارة دون تغيير مقدار التمدد"}.`;
    if (name === "b")
      why =
        value === previous
          ? "لم يتغير المعامل b."
          : `تغير b من ${fmt(previous)} إلى ${fmt(value)}؛ ${next.a !== 0 ? `انتقل محور التماثل إلى x = -b/(2a) = ${fmt(-value / (2 * next.a))}` : "تغير ميل الخط المستقيم لأنه أصبح معامل x"}.`;
    if (name === "c")
      why = `تغير c بمقدار ${fmt(value - previous)}؛ تحركت كل نقطة ${value >= previous ? "للأعلى" : "للأسفل"} بهذا المقدار، لأن c يضاف إلى مخرج الدالة دون تغيير x.`;
    setChange(why);
  }
  return (
    <div className="workspace-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            MATH WORKSPACE <span>/ 01</span>
          </div>
          <h1>مساحة العمل الرياضية</h1>
        </div>
        <button
          className={`button secondary ${bookmarks.includes(input) ? "saved" : ""}`}
          onClick={() => toggleBookmark(input)}
        >
          {bookmarks.includes(input) ? (
            <Check size={16} />
          ) : (
            <Bookmark size={16} />
          )}{" "}
          حفظ المسألة
        </button>
      </div>
      <MathTools
        expression={input}
        onApply={submit}
        onWrite={() => equationRef.current?.focus()}
        presets={[
          { title: "المعادلة التربيعية", expression: "x^2+5*x+6=0", topicId: "quadratic" },
          { title: "الدوال والتحويلات", expression: "(x-2)^2+3", topicId: "functions" },
          { title: "فرق بين مربعين", expression: "x^2-4=0", topicId: "difference" },
          ...functionFamilies.map(([title, expression]) => ({ title, expression })),
        ]}
      />
      <form
        className="equation-entry"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="equation-marker">ƒ</div>
        <MathInput
          inputRef={equationRef}
          label="المعادلة"
          value={input}
          onChange={(value) => submit(value, false)}
        />
        <span className="entry-type">Math input</span>
        <button className="button primary" type="submit">
          تحليل المسألة <ArrowLeft size={16} />
        </button>
      </form>
      <div className="workspace-navigation">
        <div className="tabs">
          {[
            ["solve", "الحل والتحليل", ListOrdered],
            ["explore", "استكشاف الدالة", ChartNoAxesCombined],
            ["compare", "قبل / بعد", GitCompareArrows],
          ].map(([id, label, Icon]) => {
            const Symbol = Icon as typeof ListOrdered;
            return (
              <button
                key={String(id)}
                className={mode === id ? "active" : ""}
                onClick={() => setMode(id as typeof mode)}
              >
                <Symbol size={16} />
                {String(label)}
              </button>
            );
          })}
        </div>
        <div className="example-select">
          <select
            aria-label="أمثلة رياضية"
            value=""
            onChange={(event) => submit(event.target.value)}
          >
            <option value="" disabled>
              مثال آخر
            </option>
            {[
              "x² + 5x + 6 = 0",
              "x² - 4 = 0",
              "2x + 5 = 15",
              "y = 2x + 3",
              "sin(x)",
              "x² + 1 = 0",
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>
      </div>
      <div className="workbench">
        <section className="workspace-center">
          <div className="section-heading">
            <h2>الرسم البياني</h2>
            <span className="badge">
              <span className="status-dot" /> Live graph
            </span>
          </div>
          <Graph curves={curves} points={points} onInspect={setInspector} />
          {mode !== "solve" && (
            <div className="live-explanation">
              <Lightbulb size={18} />
              <div>
                <strong>لماذا تغير الرسم؟</strong>
                <p>{change}</p>
                {mode === "compare" && (
                  <p>
                    بالمقارنة مع y = x²: المعامل a يغيّر التمدد والاتجاه، وb
                    يغيّر موقع الرأس، وc يغيّر التقاطع مع محور y.
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="graph-properties">
            <div>
              <small>نوع المسألة</small>
              <strong>{currentAnalysis.kind}</strong>
            </div>
            <div>
              <small>الجذور الحقيقية</small>
              <strong className="mono" dir="ltr">
                {currentAnalysis.roots.length
                  ? currentAnalysis.roots.map(fmt).join(", ")
                  : currentAnalysis.kind === "معادلة تربيعية"
                    ? "None"
                    : "—"}
              </strong>
            </div>
            <div>
              <small>التقاطع مع y</small>
              <strong className="mono" dir="ltr">
                {currentAnalysis.supported && currentAnalysis.graph
                  ? fmt(compileFunction(currentExpression)(0))
                  : "غير متاح"}
              </strong>
            </div>
            <div>
              <small>النافذة الابتدائية</small>
              <strong className="mono" dir="ltr">
                x ∈ [−8, 8]
              </strong>
            </div>
          </div>
          {inspector && (
            <div className="inspector-result">
              <CrosshairLabel />
              <span dir="ltr" className="mono">
                f({fmt(inspector.x)}) = {fmt(inspector.y)} · f′ ={" "}
                {fmt(inspector.slope)}
              </span>
              <p>
                {Math.abs(inspector.y) < 0.05
                  ? "هذه النقطة قريبة من جذر: قيمة الدالة تقترب من الصفر."
                  : Math.abs(inspector.slope) < 0.05
                    ? "الميل قريب من الصفر؛ قد تكون نقطة حرجة إذا كانت المشتقة معرفة."
                    : "الميل موجب عند الصعود وسالب عند الهبوط؛ حُسب هنا بتقريب الفرق المركزي."}
              </p>
            </div>
          )}
          <details className="additional-graphs">
            <summary>
              <Plus size={15} /> منحنيات إضافية وأدوات رمزية
            </summary>
            <div className="inline-form">
              <input
                aria-label="منحنى إضافي"
                dir="ltr"
                value={newCurve}
                onChange={(event) => setNewCurve(event.target.value)}
              />
              <button
                className="button secondary"
                onClick={() => {
                  try {
                    compileFunction(newCurve);
                    setExtra([...extra, newCurve]);
                    setError("");
                    onSave(newCurve, "graph");
                  } catch {
                    setError("تعذر قراءة الدالة. استخدم تعبيرًا في x.");
                  }
                }}
              >
                <Plus size={16} /> إضافة
              </button>
            </div>
            {extra.map((curve, index) => (
              <div className="extra-curve" key={index}>
                <code>{curve}</code>
                <button
                  title="حذف المنحنى"
                  onClick={() =>
                    setExtra(extra.filter((_, current) => index !== current))
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="inline-form">
              <select
                aria-label="العملية الرمزية"
                value={operation}
                onChange={(event) =>
                  setOperation(event.target.value as typeof operation)
                }
              >
                <option value="simplify">تبسيط</option>
                <option value="factor">تحليل</option>
                <option value="expand">توسيع</option>
                <option value="derivative">اشتقاق</option>
                <option value="integral">تكامل غير محدد</option>
              </select>
              <button
                className="button secondary"
                onClick={() => {
                  try {
                    setSymbolicResult(
                      symbolic(currentExpression, operation) +
                        (operation === "integral" ? " + C" : ""),
                    );
                    setError("");
                  } catch {
                    setError("المحرك لا يدعم هذه العملية لهذا التعبير.");
                  }
                }}
              >
                حساب
              </button>
            </div>
            {symbolicResult && (
              <div className="result-line">
                <code dir="ltr">{symbolicResult}</code>
                <Why>
                  النتيجة محسوبة بالمحرك الرمزي وفق قواعد{" "}
                  {operation === "integral"
                    ? "التكامل؛ نضيف ثابت التكامل لأن مشتقة أي ثابت تساوي صفرًا"
                    : operation === "derivative"
                      ? "الاشتقاق"
                      : "التكافؤ الجبري"}
                  . يُراعى مجال التعبير الأصلي.
                </Why>
              </div>
            )}
            {error && <p className="error-message">{error}</p>}
          </details>
        </section>
        <details className="explanation-panel" open>
          <summary className="explanation-toggle">
            خطوات الفهم والمستشار <ChevronDown size={16} />
          </summary>
          <div className="panel-tabs">
            <button
              className={panel === "steps" ? "active" : ""}
              onClick={() => setPanel("steps")}
            >
              <ListOrdered size={16} /> خطوات الفهم
            </button>
            <button
              className={panel === "advisor" ? "active" : ""}
              onClick={() => setPanel("advisor")}
            >
              <Lightbulb size={16} /> المستشار
            </button>
          </div>
          {mode !== "solve" && (
            <>
              <div className="panel-section">
                <div className="panel-section-title">
                  <h3>معاملات الدالة</h3>
                  <span className="mini-tag">Interactive</span>
                </div>
                <Formula value="y=ax^2+bx+c" block />
                <Slider
                  label="a"
                  value={parameters.a}
                  min={-4}
                  max={4}
                  step={0.1}
                  color="#7770ce"
                  onChange={(value) => update("a", value)}
                />
                <Slider
                  label="b"
                  value={parameters.b}
                  min={-10}
                  max={10}
                  step={0.5}
                  color="#249b8d"
                  onChange={(value) => update("b", value)}
                />
                <Slider
                  label="c"
                  value={parameters.c}
                  min={-10}
                  max={10}
                  step={0.5}
                  color="#e28e4e"
                  onChange={(value) => update("c", value)}
                />
                <button
                  className="what-if"
                  onClick={() =>
                    update(
                      "a",
                      parameters.a >= 0
                        ? -Math.max(1, parameters.a)
                        : Math.abs(parameters.a),
                    )
                  }
                >
                  <CircleHelp size={15} /> ماذا لو عكسنا إشارة a؟
                </button>
              </div>
              <div className="panel-section">
                <h3>عائلة الدالة</h3>
                <select
                  className="full-select"
                  aria-label="عائلة الدالة"
                  value=""
                  onChange={(event) => submit(event.target.value)}
                >
                  <option value="" disabled>
                    اختر نوعًا آخر
                  </option>
                  {functionFamilies.map(([name, expression]) => (
                    <option key={name} value={expression}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="panel-section">
            <div className="panel-section-title">
              <h3>
                {panel === "steps" ? "من المعادلة إلى الفهم" : "اختيار الطريقة"}
              </h3>
              <select
                aria-label="مستوى الشرح"
                value={level}
                onChange={(event) => setLevel(event.target.value)}
              >
                {["مختصر", "عادي", "مفصل"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className="classification">
              <span className="mini-label">التصنيف</span>
              <strong>{currentAnalysis.kind}</strong>
              <p>{currentAnalysis.goal}</p>
            </div>
            {!currentAnalysis.supported ? (
              <div className="fallback">
                <h3>{currentAnalysis.method}</h3>
                <p>{currentAnalysis.methodReason}</p>
              </div>
            ) : panel === "steps" ? (
              <div className="solution-steps">
                {currentAnalysis.steps.slice(0, revealed).map((step, index) => (
                  <div
                    className="solution-step"
                    key={`${currentExpression}-${index}`}
                  >
                    <span className="step-number">{index + 1}</span>
                    <div>
                      <h4>{step.operation}</h4>
                      <div className="step-math" dir="ltr">
                        {step.after}
                      </div>
                      {level !== "مختصر" && (
                        <span className="rule-label">{step.rule}</span>
                      )}
                      {level === "مفصل" && <p>{step.reason}</p>}
                      <Why>
                        {step.reason}
                        {level === "مفصل" && (
                          <p>
                            قبل العملية: <code dir="ltr">{step.before}</code>.
                            نتحقق من أن النتيجة تحفظ القاعدة المذكورة.
                          </p>
                        )}
                      </Why>
                    </div>
                  </div>
                ))}
                {revealed >= currentAnalysis.steps.length && (
                  <div className="solution-result">
                    <span>
                      <Check size={15} /> النتيجة
                    </span>
                    <strong dir="ltr">{currentAnalysis.result}</strong>
                  </div>
                )}
              </div>
            ) : (
              <div className="advisor-methods">
                <div className="recommended">
                  <span>
                    <Sparkles size={14} /> الطريقة الموصى بها — قواعد رياضية
                  </span>
                  <h4>{currentAnalysis.method}</h4>
                  <p>{currentAnalysis.methodReason}</p>
                </div>
                {currentAnalysis.methods.map((method) => (
                  <div className="method-row" key={method.name}>
                    <h4>
                      {method.name}
                      {method.recommended && <Check size={14} />}
                    </h4>
                    <p>{method.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="panel-section hints-section">
            <h3>
              <Lightbulb size={16} /> تلميحات قبل الحل
            </h3>
            {currentAnalysis.hints.slice(0, hint).map((text, index) => (
              <p className="hint" key={index}>
                <span>{index + 1}</span>
                {text}
              </p>
            ))}
            <div className="hint-actions">
              <button
                disabled={hint >= currentAnalysis.hints.length}
                onClick={() => {
                  setHint(hint + 1);
                  if (hint === 0) setRevealed(0);
                }}
              >
                تلميح {Math.min(hint + 1, currentAnalysis.hints.length)}
              </button>
              <button
                disabled={!currentAnalysis.steps.length}
                onClick={() => {
                  setPanel("steps");
                  setRevealed(
                    revealed === 99
                      ? 1
                      : Math.min(currentAnalysis.steps.length, revealed + 1),
                  );
                }}
              >
                خطوة واحدة
              </button>
              <button
                disabled={!currentAnalysis.steps.length}
                onClick={() => {
                  setPanel("steps");
                  setRevealed(99);
                }}
              >
                الحل كاملًا
              </button>
            </div>
          </div>
        </details>
      </div>
      <div className="workspace-bottom">
        <span>
          <span className="status-dot" /> محرك قواعد رياضية · لا يعتمد على
          الذكاء الاصطناعي
        </span>
        <span className="mono">Math Space / Explore. Understand.</span>
      </div>
    </div>
  );
}
function CrosshairLabel() {
  return <strong className="mini-label">GRAPH INSPECTOR</strong>;
}
