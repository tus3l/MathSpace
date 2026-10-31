import { useMemo, useState } from "react";
import {
  Lightbulb,
  RotateCcw,
  Check,
  ArrowLeft,
  CircleHelp,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Formula, MathInput, Slider, Timeline, Why } from "./Controls";
import { Graph } from "./Graph";
import { LearningPanel } from "./LearningPanel";
import { verifyTransition } from "../engine/learning";
import type { Verdict } from "../engine/learning";
import { analyze, checkStep, fmt, normalize, safeParse } from "../engine/math";
import { MathTools } from "./MathTools";
import {
  prepareVisualExpression,
  prepareWorkspaceVisual,
  visualInputParameters,
  resolveVisualInput,
} from "../engine/visual";
import type { VisualParameter } from "../engine/visual";
import { functionFamilies } from "../content/knowledge";

export function LabHeader({
  english,
  title,
  badge = "مختبر تفاعلي",
}: {
  english: string;
  title: string;
  badge?: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          {english} <span>/ LAB</span>
        </div>
        <h1>{title}</h1>
      </div>
      <span className="badge">
        <span className="status-dot" />
        {badge}
      </span>
    </div>
  );
}
export function Insight({
  children,
  title = "لماذا؟",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="live-explanation">
      <Lightbulb size={19} />
      <div>
        <strong>{title}</strong>
        <div className="insight-content">{children}</div>
      </div>
    </div>
  );
}
export function ProofLab() {
  const [a, setA] = useState(3),
    [b, setB] = useState(2),
    [current, setCurrent] = useState(0);
  const [proof, setProof] = useState("square");
  const [customScope, setCustomScope] = useState({ a: 3, b: 2, c: 0 });
  const [custom, setCustom] = useState<
    ReturnType<typeof prepareVisualExpression>
  >({
    expressions: ["x^2"],
    parameters: [],
    operation: null,
  });
  const [customSource, setCustomSource] = useState("x^2");
  const [customError, setCustomError] = useState("");
  const proofExpression =
    proof === "square"
      ? "(a+b)^2=a^2+2*a*b+b^2"
      : proof === "pythagoras"
        ? "3^2+4^2=5^2"
        : customSource;
  function applyExpression(expression: string, live = false) {
    const normalized = normalize(expression).replace(/\s/g, "");
    if (["(a+b)^2=a^2+2*a*b+b^2", "3^2+4^2=5^2"].includes(normalized)) {
      setProof(normalized.startsWith("(a+b)") ? "square" : "pythagoras");
      setCurrent(0);
      setCustomError("");
      return;
    }
    try {
      const prepared = prepareVisualExpression(expression, customScope);
      setCustom(prepared);
      setCustomSource(expression);
      setProof("custom");
      setCustomError("");
    } catch (failure) {
      setCustomError(
        `${failure instanceof Error ? failure.message : "تعذر قراءة التعبير."}${live ? " الرسم المعروض هو آخر تعبير صالح." : ""}`,
      );
    }
  }
  const total = a + b,
    sideA = 24 * a,
    sideB = 24 * b,
    squareSide = sideA + sideB;
  const steps = [
    "المربع الكامل",
    "تقسيم الأضلاع",
    "تحديد المساحات",
    "جمع الأجزاء",
  ];
  const pieces = [
    {
      x: 0,
      y: 0,
      sizeX: sideA,
      sizeY: sideA,
      color: "#7770ce",
      label: "a²",
      value: a * a,
    },
    {
      x: sideA,
      y: 0,
      sizeX: sideB,
      sizeY: sideA,
      color: "#249b8d",
      label: "ab",
      value: a * b,
    },
    {
      x: 0,
      y: sideA,
      sizeX: sideA,
      sizeY: sideB,
      color: "#249b8d",
      label: "ab",
      value: a * b,
    },
    {
      x: sideA,
      y: sideA,
      sizeX: sideB,
      sizeY: sideB,
      color: "#e28e4e",
      label: "b²",
      value: b * b,
    },
  ];
  return (
    <>
      <LabHeader english="VISUAL PROOF SIMULATOR" title="الإثبات، كما تراه" />
      <MathTools
        expression={proofExpression}
        onApply={applyExpression}
        onLiveChange={(expression) => applyExpression(expression, true)}
        variables={["x", "a", "b", "c"]}
        presets={[
          {
            title: "مربع المجموع",
            expression: "(a+b)^2=a^2+2*a*b+b^2",
            topicId: "square",
          },
          {
            title: "فيثاغورس — المساحات",
            expression: "3^2+4^2=5^2",
            topicId: "pythagoras",
          },
          {
            title: "استكشاف فرق بين مربعين",
            expression: "x^2-4",
            topicId: "difference",
          },
          { title: "تحريك معاملات القطع المكافئ", expression: "a*x^2+b*x+c" },
          {
            title: "تحريك موجة جيبية",
            expression: "a*sin(b*x)+c",
            topicId: "trigonometry",
          },
          { title: "استكشاف طرفي معادلة", expression: "x^2=2*x+3" },
          ...functionFamilies.map(([title, expression]) => ({
            title,
            expression,
          })),
        ]}
      />
      {customError && (
        <p className="error-message" role="alert">
          {customError}
        </p>
      )}
      {proof === "custom" ? (
        <section className="lab-stage">
          <div className="section-heading">
            <h2>استكشاف التعبير المتحرك</h2>
            <button
              className="button secondary"
              onClick={() => {
                setProof("square");
                setCurrent(0);
              }}
            >
              <RotateCcw size={16} /> العودة للإثبات
            </button>
          </div>
          <Formula
            value={custom.expressions
              .map((expression) => safeParse(expression).toTex())
              .join("=")}
            block
          />
          {custom.parameters.length > 0 && (
            <div className="visual-parameter-controls">
              {custom.parameters.map((parameter: VisualParameter) => (
                <Slider
                  key={parameter}
                  label={parameter}
                  min={-5}
                  max={5}
                  step={0.1}
                  value={customScope[parameter]}
                  onChange={(value) =>
                    setCustomScope((current) => ({
                      ...current,
                      [parameter]: value,
                    }))
                  }
                />
              ))}
            </div>
          )}
          <Graph
            scope={customScope}
            curves={custom.expressions.map((expression, index) => ({
              expression,
              color: index === 0 ? "#249b8d" : "#7770ce",
              label:
                custom.expressions.length === 1
                  ? "f(x)"
                  : index === 0
                    ? "الطرف الأيسر"
                    : "الطرف الأيمن",
            }))}
          />
          <Insight>
            غيّر رقمًا في التعبير أو قيمة أحد المعاملات؛ يتحدث الرسم مباشرة
            وينتقل إلى الشكل الجديد مرة واحدة ثم يثبت. للمعادلة نرسم طرفيها؛
            تقاطعهما يوضح مساواتهما عند تلك القيم، وليس إثباتًا عامًا لهوية أو
            معادلة.
            {custom.operation === "integral" &&
              " عند التكامل يعرض الرسم الدالة الأصلية مع C = 0."}
          </Insight>
        </section>
      ) : (
        <div className="lab-layout">
          <section className="lab-stage">
            <div className="section-heading">
              <h2>
                {proof === "square" ? "مربع مجموع عددين" : "نظرية فيثاغورس"}
              </h2>
              <select
                aria-label="الإثبات"
                value={proof}
                onChange={(event) => {
                  setProof(event.target.value);
                  setCurrent(0);
                }}
              >
                <option value="square">مربع المجموع</option>
                <option value="pythagoras">فيثاغورس — المساحات</option>
              </select>
            </div>
            <div className="proof-stage">
              {proof === "square" ? (
                <svg
                  viewBox="0 0 540 420"
                  role="img"
                  aria-label="إثبات مساحة مربع مجموع عددين"
                >
                  <g transform={`translate(${(540 - squareSide) / 2},65)`}>
                    {current === 0 ? (
                      <>
                        <rect
                          width={squareSide}
                          height={squareSide}
                          fill="#7770ce"
                          fillOpacity="0.14"
                          stroke="#7770ce"
                          strokeWidth="2"
                        />
                        <text
                          x={squareSide / 2}
                          y={squareSide / 2}
                          className="svg-big"
                          style={{ fontSize: Math.min(24, squareSide / 5) }}
                        >
                          (a+b)²
                        </text>
                      </>
                    ) : (
                      pieces.map((piece, index) => (
                        <g
                          key={piece.label + index}
                          style={{
                            transform:
                              current === 2
                                ? `translate(${index % 2 ? 10 : -10}px, ${index > 1 ? 10 : -10}px)`
                                : "translate(0,0)",
                            transition: "transform 700ms ease",
                          }}
                        >
                          <rect
                            x={piece.x}
                            y={piece.y}
                            width={piece.sizeX}
                            height={piece.sizeY}
                            fill={piece.color}
                            fillOpacity="0.18"
                            stroke={piece.color}
                            strokeWidth="2"
                          />
                          <text
                            x={piece.x + piece.sizeX / 2}
                            y={
                              piece.y +
                              piece.sizeY / 2 -
                              (current === 3
                                ? Math.min(14, piece.sizeY / 4)
                                : 0)
                            }
                            className="svg-big"
                            style={{
                              fontSize: Math.min(
                                24,
                                piece.sizeX / 3,
                                piece.sizeY / 3,
                              ),
                            }}
                          >
                            {current >= 2 ? piece.label : ""}
                          </text>
                          {current === 3 && (
                            <text
                              x={piece.x + piece.sizeX / 2}
                              y={
                                piece.y +
                                piece.sizeY / 2 +
                                Math.min(14, piece.sizeY / 4)
                              }
                              className="svg-small"
                              style={{
                                fontSize: Math.min(
                                  14,
                                  piece.sizeX / 3,
                                  piece.sizeY / 3,
                                ),
                              }}
                            >
                              {fmt(piece.value)}
                            </text>
                          )}
                        </g>
                      ))
                    )}
                    <text
                      x={sideA / 2 - 12}
                      y="-18"
                      className="svg-medium"
                      style={{ textAnchor: "end" }}
                    >
                      a = {a}
                    </text>
                    <text
                      x={sideA + sideB / 2 + 12}
                      y="-18"
                      className="svg-medium"
                      style={{ textAnchor: "start" }}
                    >
                      b = {b}
                    </text>
                    <text
                      x={squareSide / 2}
                      y={squareSide + 35}
                      className="svg-medium"
                    >
                      a + b = {total}
                    </text>
                  </g>
                </svg>
              ) : (
                <svg
                  viewBox="0 0 540 440"
                  role="img"
                  aria-label="مربعات أضلاع مثلث قائم"
                >
                  <polygon
                    points="210,200 330,200 210,290"
                    fill="#f0f2f5"
                    stroke="#838b97"
                    strokeWidth="2"
                  />
                  <rect
                    x="210"
                    y="80"
                    width="120"
                    height="120"
                    fill="#7770ce"
                    fillOpacity="0.2"
                    stroke="#7770ce"
                  />
                  <rect
                    x="120"
                    y="200"
                    width="90"
                    height="90"
                    fill="#249b8d"
                    fillOpacity="0.2"
                    stroke="#249b8d"
                  />
                  <polygon
                    points="330,200 420,320 300,410 210,290"
                    fill="#e28e4e"
                    fillOpacity={0.1 + current * 0.05}
                    stroke="#e28e4e"
                  />
                  <text x="270" y="145" className="svg-big">
                    b² = 16
                  </text>
                  <text x="165" y="250" className="svg-medium">
                    a² = 9
                  </text>
                  <text x="318" y="315" className="svg-big">
                    c² = 25
                  </text>
                </svg>
              )}
            </div>
            <div className="proof-equation">
              <Formula
                value={
                  proof === "square"
                    ? current === 3
                      ? "(a+b)^2=a^2+2ab+b^2"
                      : "(a+b)^2"
                    : "3^2+4^2=5^2"
                }
                block
              />
            </div>
            <Timeline steps={steps} current={current} onChange={setCurrent} />
          </section>
          <aside className="lab-properties">
            <h3>متغيرات التجربة</h3>
            {proof === "square" ? (
              <>
                <Slider
                  label="a"
                  min={1}
                  max={6}
                  value={a}
                  color="#7770ce"
                  onChange={setA}
                />
                <Slider
                  label="b"
                  min={1}
                  max={6}
                  value={b}
                  color="#e28e4e"
                  onChange={setB}
                />
                <div className="metric">
                  <span>المساحة الكلية</span>
                  <strong>{total ** 2}</strong>
                </div>
                <Insight title={steps[current]}>
                  <p>
                    {
                      [
                        "طول ضلع المربع a+b، لذلك مساحته (a+b)².",
                        "نقسم كل ضلع عند المسافة a. ينتج مربعان ومستطيلان دون تداخل.",
                        "مساحة كل مستطيل ab؛ ولهذا يوجد حدان لا حد واحد.",
                        "نجمع المناطق الأربع: a² + ab + ab + b². هذا يساوي مساحة المربع الأصلي.",
                      ][current]
                    }
                  </p>
                  <p>
                    تغيير الأضلاع يغير المساحات: a² = {a * a}، ab = {a * b}، b²
                    = {b * b}.
                  </p>
                </Insight>
                <Why>
                  عند تغيير a أو b، يتغير طول الضلع ومجموع المساحات بنفس
                  المقدار؛ لأن المناطق تغطي المربع كاملًا.
                </Why>
              </>
            ) : (
              <Insight>
                <p>
                  المربع على ضلع 3 مساحته 9، وعلى ضلع 4 مساحته 16. مجموعهما 25
                  يساوي مربع الوتر 5. تنطبق النظرية لأن الزاوية قائمة.
                </p>
                <p>
                  العرض هنا مقارنة مساحات؛ ليس إثباتًا عامًا بإعادة ترتيب القطع.
                </p>
              </Insight>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
export function FreeGeometryWorkspace() {
  const [equations, setEquations] = useState<
    {
      id: string;
      expression: string;
      color: string;
      visible: boolean;
    }[]
  >([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [scope, setScope] = useState({ a: 1, b: 1, c: 0 });
  const [selectedId, setSelectedId] = useState("");
  const [candidate, setCandidate] = useState("");
  const [review, setReview] = useState<{
    source: string;
    candidate: string;
    verdict: Verdict;
  } | null>(null);
  const [preview, setPreview] = useState<{
    source: string;
    expression: string;
    reason: string;
  } | null>(null);
  const selected =
    equations.find((equation) => equation.id === selectedId) ?? equations[0];
  let source = selected?.expression ?? "";
  try {
    if (source) source = resolveVisualInput(source, scope);
  } catch {
    source = selected?.expression ?? "";
  }
  const previewVisual = useMemo(() => {
    if (!preview || preview.source !== source) return null;
    try {
      return prepareWorkspaceVisual(preview.expression, scope);
    } catch {
      return null;
    }
  }, [preview, source, scope]);
  const visuals = useMemo(
    () =>
      equations
        .filter((equation) => equation.visible)
        .map((equation) => {
          try {
            return {
              equation,
              visual: prepareWorkspaceVisual(equation.expression, scope),
              error: "",
            };
          } catch (failure) {
            return {
              equation,
              visual: null,
              error:
                failure instanceof Error
                  ? failure.message
                  : "تعذر رسم المعادلة.",
            };
          }
        }),
    [equations, scope],
  );
  const parameters = [
    ...new Set(
      equations.flatMap((equation) =>
        (() => {
          try {
            return visualInputParameters(equation.expression);
          } catch {
            return [];
          }
        })(),
      ),
    ),
  ];
  const palette = ["#249b8d", "#e28e4e", "#7770ce", "#d55a78", "#408cc0"];
  function cancelEdit() {
    setEditing(null);
    setDraft("");
    setError("");
  }
  return (
    <>
      <LabHeader english="FREE WORKSPACE" title="مساحة حرة" />
      <section className="lab-stage">
        <div className="free-geometry">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              try {
                const expression = normalize(draft);
                if (!expression.trim() || expression.length > 250)
                  throw new Error("اكتب مدخلًا لا يتجاوز 250 حرفًا.");
                setEquations((current) =>
                  editing
                    ? current.map((equation) =>
                        equation.id === editing
                          ? { ...equation, expression }
                          : equation,
                      )
                    : [
                        ...current,
                        {
                          id: crypto.randomUUID(),
                          expression,
                          color: palette[current.length % palette.length],
                          visible: true,
                        },
                      ],
                );
                cancelEdit();
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "تعذر رسم المعادلة.",
                );
              }
            }}
          >
            <MathInput
              label="معادلة المساحة الحرة"
              value={draft}
              onChange={setDraft}
              variables={["x", "y", "a", "b", "c"]}
              keyboardInitiallyOpen={false}
              required
            />
            <div className="free-equation-actions">
              <button className="button secondary" type="submit">
                {editing ? <Check size={16} /> : <Plus size={16} />}
                {editing ? "حفظ التعديل" : "إضافة معادلة"}
              </button>
              {editing && (
                <button
                  className="icon-button"
                  type="button"
                  title="إلغاء التعديل"
                  aria-label="إلغاء التعديل"
                  onClick={cancelEdit}
                >
                  <X size={16} />
                </button>
              )}
              <button
                className="icon-button"
                type="button"
                title="مسح المساحة"
                aria-label="مسح المساحة"
                disabled={!equations.length}
                onClick={() => {
                  setEquations([]);
                  setSelectedId("");
                  setPreview(null);
                  setReview(null);
                  setCandidate("");
                  cancelEdit();
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </form>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          {equations.length > 0 && (
            <ul className="free-equation-list">
              {equations.map((equation, index) => (
                <li key={equation.id} className="free-equation-row">
                  <input
                    type="checkbox"
                    aria-label={`عرض المعادلة ${index + 1}`}
                    checked={equation.visible}
                    onChange={(event) =>
                      setEquations((current) =>
                        current.map((item) =>
                          item.id === equation.id
                            ? { ...item, visible: event.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  <input
                    type="color"
                    aria-label={`لون المعادلة ${index + 1}`}
                    value={equation.color}
                    onChange={(event) =>
                      setEquations((current) =>
                        current.map((item) =>
                          item.id === equation.id
                            ? { ...item, color: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <code dir="ltr">{equation.expression}</code>
                  <button
                    className="icon-button"
                    type="button"
                    title={`تعديل المعادلة ${index + 1}`}
                    aria-label={`تعديل المعادلة ${index + 1}`}
                    onClick={() => {
                      setDraft(equation.expression);
                      setEditing(equation.id);
                      setError("");
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    type="button"
                    title={`حذف المعادلة ${index + 1}`}
                    aria-label={`حذف المعادلة ${index + 1}`}
                    onClick={() => {
                      setEquations((current) =>
                        current.filter((item) => item.id !== equation.id),
                      );
                      if (editing === equation.id) cancelEdit();
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {equations.length > 0 && (
            <>
              <label className="field-label">
                المسألة الحالية
                <select
                  className="full-select"
                  aria-label="المسألة الحالية في المساحة الحرة"
                  value={selected?.id ?? ""}
                  onChange={(event) => {
                    setSelectedId(event.target.value);
                    setPreview(null);
                  }}
                >
                  {equations.map((equation, index) => (
                    <option key={equation.id} value={equation.id}>
                      {index + 1}. {equation.expression}
                    </option>
                  ))}
                </select>
              </label>
              <LearningPanel
                source={source}
                graphDescription={
                  visuals.find((item) => item.equation.id === selected?.id)
                    ?.visual?.description ?? "لا يتوفر رسم مدعوم لهذا المدخل."
                }
                values={scope}
                activity={equations.map((equation) => equation.expression)}
                customReview={
                  review?.source === source && review.candidate === candidate
                    ? review
                    : null
                }
                onReset={() => setPreview(null)}
                onShowSteps={() => {}}
                onClearPreview={() => setPreview(null)}
                onPreview={(expression, _purpose, reason) =>
                  setPreview({ source, expression, reason })
                }
              />
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  let resolved = candidate;
                  try {
                    resolved = resolveVisualInput(candidate, scope);
                  } catch {
                    resolved = candidate;
                  }
                  const verdict = verifyTransition(source, resolved);
                  setReview({ source, candidate, verdict });
                  setPreview({
                    source,
                    expression: resolved,
                    reason: verdict.message,
                  });
                }}
              >
                <MathInput
                  label="قانون أو تحويل جديد للمسألة الحالية"
                  value={candidate}
                  onChange={setCandidate}
                  variables={["x", "y", "a", "b", "c"]}
                  keyboardInitiallyOpen={false}
                  required
                />
                <button className="button secondary" type="submit">
                  <Check size={16} /> فحص القانون الجديد
                </button>
              </form>
              {review &&
                review.source === source &&
                review.candidate === candidate && (
                  <div
                    className={`learning-verdict ${review.verdict.valid === false ? "incorrect" : ""}`}
                    role="status"
                  >
                    <strong>
                      {review.verdict.valid === true
                        ? "التحويل صحيح للمسألة الحالية"
                        : review.verdict.valid === false
                          ? "التحويل غير صحيح للمسألة الحالية"
                          : "لم يتمكن المستشار من التحقق"}
                    </strong>
                    <code dir="ltr">{review.candidate}</code>
                    <p>{review.verdict.message}</p>
                  </div>
                )}
            </>
          )}
          {parameters.length > 0 && (
            <div className="visual-parameter-controls">
              {parameters.map((parameter) => (
                <Slider
                  key={parameter}
                  label={parameter}
                  min={-10}
                  max={10}
                  step={0.1}
                  value={scope[parameter]}
                  onChange={(value) =>
                    setScope((current) => ({ ...current, [parameter]: value }))
                  }
                />
              ))}
            </div>
          )}
          {visuals
            .filter((item) => item.error)
            .map((item) => (
              <p className="error-message" role="alert" key={item.equation.id}>
                <code dir="ltr">{item.equation.expression}</code>: {item.error}
              </p>
            ))}
          <Graph
            autoFit
            autoFitKey={equations
              .filter((equation) => equation.visible)
              .map((equation) => equation.id)
              .join(",")}
            scope={scope}
            rectangles={(() => {
              const area =
                visuals.find((item) => item.equation.id === selected?.id)
                  ?.visual?.area ??
                visuals.find((item) => item.visual?.area)?.visual?.area;
              return area ? { count: 64, ...area } : undefined;
            })()}
            curves={visuals
              .flatMap(
                ({ equation, visual }) =>
                  [
                    ...(visual?.expressions ?? []),
                    ...(visual?.alternate ? [visual.alternate] : []),
                  ].map((expression) => ({
                    expression,
                    color: equation.color,
                    label: equation.expression,
                  })),
              )
              .concat(
                previewVisual?.expressions.map((expression) => ({
                  expression,
                  color: "#d55a78",
                  label: "محاولة القانون",
                })) ?? [],
              )}
            points={visuals
              .flatMap(
                ({ equation, visual }) =>
                  visual?.points.map((point) => ({
                    ...point,
                    color: equation.color,
                  })) ?? [],
              )
              .concat(
                previewVisual?.points.map((point) => ({
                  ...point,
                  color: "#d55a78",
                })) ?? [],
              )}
            segments={visuals
              .flatMap(
                ({ equation, visual }) =>
                  visual?.segments.map((segment) => ({
                    ...segment,
                    color: equation.color,
                  })) ?? [],
              )
              .concat(
                previewVisual?.segments.map((segment) => ({
                  ...segment,
                  color: "#d55a78",
                })) ?? [],
              )}
          />
          {preview && preview.source === source && (
            <p className="visual-caption">
              {preview.reason}
              {!previewVisual && " لا يتوفر تمثيل بياني مدعوم لهذه المحاولة."}
            </p>
          )}
          {visuals.map(
            ({ equation, visual }) =>
              visual && (
                <p className="visual-caption" key={equation.id}>
                  {visual.kind}: {visual.description}
                </p>
              ),
          )}
        </div>
      </section>
    </>
  );
}

export function TrigLab({ complex = false }: { complex?: boolean }) {
  const [angle, setAngle] = useState(45),
    [radius, setRadius] = useState(1),
    [dragging, setDragging] = useState(false);
  const radians = (angle * Math.PI) / 180,
    cosine = Math.cos(radians),
    sine = Math.sin(radians),
    tangent = Math.abs(cosine) < 1e-8 ? NaN : sine / cosine;
  return (
    <>
      <LabHeader
        english={
          complex ? "COMPLEX PLANE · EULER" : "TRIGONOMETRY · UNIT CIRCLE"
        }
        title={complex ? "الأعداد المركبة وصيغة أويلر" : "دائرة الوحدة"}
      />
      <div className="lab-layout">
        <section className="lab-stage">
          <div className="section-heading">
            <h2>{complex ? "المستوى المركب" : "الزاوية والمثلث"}</h2>
            <span className="mini-tag" dir="ltr">
              θ = {fmt(radians)} rad
            </span>
          </div>
          <div className="circle-stage">
            <svg
              viewBox="0 0 600 390"
              role="img"
              aria-label="دائرة وحدة تفاعلية"
              onPointerMove={(event) => {
                if (!dragging) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const x =
                    ((event.clientX - rect.left) * 600) / rect.width - 300,
                  y = 195 - ((event.clientY - rect.top) * 390) / rect.height;
                setAngle(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
              }}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
            >
              <line
                x1="70"
                y1="195"
                x2="530"
                y2="195"
                stroke="var(--line-strong)"
              />
              <line
                x1="300"
                y1="25"
                x2="300"
                y2="365"
                stroke="var(--line-strong)"
              />
              <circle
                cx="300"
                cy="195"
                r="140"
                fill="none"
                stroke="var(--line-strong)"
                strokeWidth="1.5"
              />
              <circle
                cx="300"
                cy="195"
                r="45"
                fill="none"
                stroke="#e28e4e"
                strokeDasharray={`${radians * 45} ${2 * Math.PI * 45}`}
                transform="rotate(-90 300 195)"
              />
              <polygon
                points={`300,195 ${300 + cosine * 140},195 ${300 + cosine * 140},${195 - sine * 140}`}
                fill="#7770ce"
                fillOpacity="0.1"
              />
              <line
                x1="300"
                y1="195"
                x2={300 + cosine * 140}
                y2="195"
                stroke="#249b8d"
                strokeWidth="3"
              />
              <line
                x1={300 + cosine * 140}
                y1="195"
                x2={300 + cosine * 140}
                y2={195 - sine * 140}
                stroke="#7770ce"
                strokeWidth="3"
              />
              <line
                x1="300"
                y1="195"
                x2={300 + cosine * 140}
                y2={195 - sine * 140}
                stroke="#e28e4e"
                strokeWidth="2"
              />
              <circle
                className="draggable-point"
                cx={300 + cosine * 140}
                cy={195 - sine * 140}
                r="9"
                fill="#7770ce"
                stroke="var(--surface)"
                strokeWidth="3"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setDragging(true);
                }}
              />
              <text x="515" y="218" className="svg-small">
                {complex ? "Re" : "cos θ"}
              </text>
              <text x="326" y="35" className="svg-small">
                {complex ? "Im" : "sin θ"}
              </text>
              <text x="300" y="380" className="svg-medium">
                {complex
                  ? `z = ${fmt(radius * cosine)} + (${fmt(radius * sine)})i`
                  : `P = (${fmt(cosine)}, ${fmt(sine)})`}
              </text>
            </svg>
          </div>
          <Insight>
            <p>
              تغير الزاوية موقع النقطة: الإسقاط الأفقي هو cos θ والرأسي sin θ.{" "}
              {complex
                ? "الضرب في eⁱθ يدور العدد المركب دون تغيير مقداره؛ r يضرب المركبتين معًا."
                : "يتغير ارتفاع المثلث وقاعدته بالتزامن مع نقطة المنحنى. tan θ هو نسبة الارتفاع إلى القاعدة، وغير معرف عندما cos θ = 0."}
            </p>
          </Insight>
          {!complex && (
            <Graph
              domain={[-1, 9]}
              curves={[
                { expression: "sin(x)", color: "#7770ce", label: "sin θ" },
                { expression: "cos(x)", color: "#249b8d", label: "cos θ" },
                { expression: "tan(x)", color: "#e28e4e", label: "tan θ" },
              ]}
              points={[
                { x: radians, y: sine, color: "#7770ce" },
                { x: radians, y: cosine, color: "#249b8d" },
                { x: radians, y: tangent, color: "#e28e4e" },
              ]}
            />
          )}
        </section>
        <aside className="lab-properties">
          <h3>الزاوية والقيم</h3>
          <Slider
            label="θ / degrees"
            min={0}
            max={360}
            value={angle}
            onChange={setAngle}
          />
          {complex && (
            <Slider
              label="r"
              min={0.1}
              max={5}
              step={0.1}
              value={radius}
              onChange={setRadius}
            />
          )}
          <div className="metrics-stack">
            {[
              ["Radians", radians],
              ["sin θ", sine],
              ["cos θ", cosine],
              ["tan θ", tangent],
              ...(complex
                ? [
                    ["Magnitude", radius],
                    ["Argument", radians],
                  ]
                : []),
            ].map(([label, value]) => (
              <div className="metric" key={label}>
                <span dir="ltr">{label}</span>
                <strong dir="ltr">{fmt(Number(value))}</strong>
              </div>
            ))}
          </div>
          <Formula
            value={
              complex
                ? String.raw`e^{i\theta}=\cos\theta+i\sin\theta`
                : String.raw`\sin^2\theta+\cos^2\theta=1`
            }
            block
          />
          <Why>
            {complex
              ? "الجزء الحقيقي من الأس المركب هو cos θ، والتخيلي sin θ. الدائرة المعروضة دائرة وحدة، بينما القيم العددية تتضمن r."
              : "المثلث قائم ووتره 1، لذلك مجموع مربعي الإسقاطين يساوي 1 وفق فيثاغورس."}
          </Why>
        </aside>
      </div>
    </>
  );
}
export function AdvisorLab() {
  const [before, setBefore] = useState("2x + 5 = 15"),
    [after, setAfter] = useState("2x = 20"),
    [checked, setChecked] = useState<Verdict | null>(null);
  const [application, setApplication] = useState<{
    source: string;
    reason: string;
  } | null>(null);
  return (
    <>
      <LabHeader
        english="RULE-BASED MATH ADVISOR"
        title="المستشار الرياضي"
        badge="قواعد"
      />
      <div className="lab-layout">
        <section className="lab-stage">
          <div className="section-heading">
            <h2>المكتبة ومراجعة المسألة</h2>
          </div>
          <LearningPanel
            source={before}
            graphDescription=""
            values={{}}
            activity={[]}
            customReview={
              checked ? { candidate: after, verdict: checked } : null
            }
            onReset={() => {
              setApplication(null);
              setChecked(null);
            }}
            onShowSteps={() => {}}
            onClearPreview={() => setApplication(null)}
            onPreview={(_expression, _purpose, reason) =>
              setApplication({ source: before, reason })
            }
          />
          {application?.source === before && (
            <p className="visual-caption">{application.reason}</p>
          )}
        </section>
        <aside className="lab-properties">
          <h3>افحص خطوتك</h3>
          <label className="field-label">
            المعادلة الأصلية
            <input
              aria-label="المعادلة الأصلية"
              dir="ltr"
              value={before}
              onChange={(event) => {
                setBefore(event.target.value);
                setChecked(null);
              }}
            />
          </label>
          <label className="field-label">
            الخطوة التالية
            <input
              aria-label="الخطوة التالية"
              dir="ltr"
              value={after}
              onChange={(event) => {
                setAfter(event.target.value);
                setChecked(null);
              }}
            />
          </label>
          <button
            className="button primary full-width"
            onClick={() => setChecked(verifyTransition(before, after))}
          >
            <Check size={16} /> تحقق من التكافؤ
          </button>
          {checked && (
            <div
              className={`check-result ${checked.valid === false ? "incorrect" : ""}`}
            >
              <h4>
                {checked.valid === true
                  ? "خطوة مكافئة"
                  : checked.valid === false
                    ? "هنا يوجد خطأ"
                    : "تعذر التحقق"}
              </h4>
              <p>{checked.message}</p>
              {checked.valid === false &&
                before.replace(/\s/g, "") === "2x+5=15" && (
                  <code dir="ltr">2x = 15 - 5 = 10</code>
                )}
            </div>
          )}
          <Why>
            التحقق يراجع تكافؤ المعادلات ضمن النطاق المدعوم، بما فيه معادلات
            جبرية في x وy. لا يتحقق من وصف العملية التي قصدها الطالب، ولا يدعي
            دعم كل تحويل جبري.
          </Why>
        </aside>
      </div>
    </>
  );
}
export function PracticeLab({
  onSave,
}: {
  onSave: (expression: string, kind: string) => void;
}) {
  const [difficulty, setDifficulty] = useState("Easy"),
    [question, setQuestion] = useState("2x + 5 = 15"),
    [hint, setHint] = useState(0),
    [revealed, setRevealed] = useState(0),
    [method, setMethod] = useState(false),
    [answer, setAnswer] = useState(""),
    [feedback, setFeedback] = useState(""),
    [application, setApplication] = useState("");
  const analysis = analyze(question);
  function generate(level = difficulty) {
    const first = Math.floor(Math.random() * 8) + 1,
      second = Math.floor(Math.random() * 6) + 1;
    const next =
      level === "Easy"
        ? `${first}x + ${second} = ${first * second + second}`
        : level === "Medium"
          ? `x^2 + ${first + second}x + ${first * second} = 0`
          : level === "Hard"
            ? `x^2 - ${first}x - ${second} = 0`
            : `${first}x^2 + ${second}x + ${first + second} = 0`;
    setQuestion(next);
    setHint(0);
    setRevealed(0);
    setMethod(false);
    setAnswer("");
    setFeedback("");
    onSave(next, "practice");
  }
  return (
    <>
      <LabHeader english="PRACTICE STUDIO" title="جرّب بنفسك" />
      <div className="practice-layout">
        <section className="practice-question">
          <div className="section-heading">
            <h2>المسألة</h2>
            <select
              aria-label="مستوى الصعوبة"
              value={difficulty}
              onChange={(event) => {
                setDifficulty(event.target.value);
                generate(event.target.value);
              }}
            >
              {["Easy", "Medium", "Hard", "Advanced"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
          <div className="question-equation mono" dir="ltr">
            {question}
          </div>
          <div className="practice-answer">
            <label>
              اكتب خطوة مكافئة للمعادلة
              <input
                aria-label="إجابة التمرين"
                dir="ltr"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="x = ..."
              />
            </label>
            <button
              className="button primary"
              onClick={() => {
                const result = checkStep(question, answer);
                setFeedback(result.message);
              }}
            >
              تحقق <Check size={16} />
            </button>
          </div>
          {feedback && (
            <Insight title="مراجعة الخطوة">
              <p>{feedback}</p>
            </Insight>
          )}
          <div className="practice-actions">
            <button
              className="button secondary"
              disabled={hint >= analysis.hints.length}
              onClick={() => setHint(hint + 1)}
            >
              <Lightbulb size={16} /> تلميح
            </button>
            <button
              className="button secondary"
              onClick={() => setMethod(true)}
            >
              <CircleHelp size={16} /> الطريقة
            </button>
            <button
              className="button secondary"
              onClick={() =>
                setRevealed(Math.min(revealed + 1, analysis.steps.length))
              }
            >
              <ArrowLeft size={16} /> الخطوة التالية
            </button>
            <button
              className="button secondary"
              onClick={() => setRevealed(analysis.steps.length)}
            >
              الحل كاملًا
            </button>
            <button className="button secondary" onClick={() => generate()}>
              <RotateCcw size={16} /> مسألة جديدة
            </button>
          </div>
          {analysis.hints.slice(0, hint).map((text, index) => (
            <p className="hint" key={index}>
              <span>{index + 1}</span>
              {text}
            </p>
          ))}
          {method && (
            <Insight title={analysis.method}>
              <p>{analysis.methodReason}</p>
            </Insight>
          )}
          {analysis.steps.slice(0, revealed).map((step, index) => (
            <div className="practice-step" key={index}>
              <h4>
                {index + 1}. {step.operation}
              </h4>
              <code dir="ltr">{step.after}</code>
              <Why>{step.reason}</Why>
            </div>
          ))}
          <div className="section-heading">
            <h2>المكتبة والمستشار لهذا التمرين</h2>
          </div>
          <LearningPanel
            key={question}
            source={question}
            graphDescription="تمرين مولّد؛ المستشار يراجع القانون المختار وخطواتك ونتيجتك على المسألة نفسها."
            values={{}}
            activity={[]}
            onReset={() => setApplication("")}
            onShowSteps={() => {}}
            onClearPreview={() => setApplication("")}
            onPreview={(_expression, _purpose, reason) =>
              setApplication(reason)
            }
          />
          {application && <p className="visual-caption">{application}</p>}
        </section>
        <aside className="practice-note">
          <span className="eyebrow">YOUR EXPLORATION</span>
          <h2>التفكير قبل النتيجة</h2>
          <div className="metric">
            <span>التلميحات المفتوحة</span>
            <strong>
              {hint} / {analysis.hints.length}
            </strong>
          </div>
          <div className="metric">
            <span>الخطوات المكشوفة</span>
            <strong>
              {revealed} / {analysis.steps.length}
            </strong>
          </div>
          <div className="practice-symbol">∑</div>
        </aside>
      </div>
    </>
  );
}
