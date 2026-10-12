import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  MoveUpRight,
  Pause,
  Play,
  TriangleAlert,
} from "lucide-react";
import { MathInput, Slider, Timeline, Why } from "./Controls";
import { Graph } from "./Graph";
import type { GraphPoint } from "./Graph";
import { Insight, LabHeader } from "./CoreLabs";
import { LearningPanel } from "./LearningPanel";
import { SignSummary } from "./SignSummary";
import { compileFunction, fmt, normalize } from "../engine/math";
import {
  explainDerivative,
  explainIntegral,
  piLabel,
  sliceExpression,
} from "../engine/calculusSteps";
import type { CalculusExplanation } from "../engine/calculusSteps";
import { riemann } from "../engine/simulations";

type Mode = "limits" | "derivative" | "integral" | "partial";
const presets: Record<Mode, string[]> = {
  limits: ["sin(x)/x", "(x^2-1)/(x-1)", "x^2"],
  derivative: ["sin(x)", "cos(x)", "tan(x)", "x^3-3*x", "exp(-x^2)"],
  integral: ["sin(x)", "cos(x)", "sec(x)^2", "x^2", "1/x"],
  partial: ["x^2*y+sin(x*y)", "sin(x)*cos(y)", "x^2-y^2"],
};

function evaluateAt(expression: string, x: number) {
  try {
    return compileFunction(expression)(x);
  } catch {
    return NaN;
  }
}

export function CalculusLab() {
  const [mode, setMode] = useState<Mode>("derivative"),
    [input, setInput] = useState("sin(x)"),
    [expression, setExpression] = useState("sin(x)"),
    [error, setError] = useState("");
  const [point, setPoint] = useState(1),
    [delta, setDelta] = useState(1),
    [count, setCount] = useState(8),
    [from, setFrom] = useState(0),
    [to, setTo] = useState(Math.PI),
    [playing, setPlaying] = useState(false),
    [variable, setVariable] = useState<"x" | "y">("x"),
    [held, setHeld] = useState(1),
    [preview, setPreview] = useState<{
      source: string;
      expression: string;
      reason: string;
    } | null>(null);
  const partial = mode === "partial";
  const axis = partial ? variable : "x";
  const other = variable === "x" ? "y" : "x";
  const explanation = useMemo<CalculusExplanation | null>(() => {
    try {
      if (mode === "integral") return explainIntegral(expression);
      if (mode === "derivative") return explainDerivative(expression);
      if (mode === "partial") return explainDerivative(expression, variable);
    } catch {
      /* Unsupported operations are reported below instead of guessed. */
    }
    return null;
  }, [mode, expression, variable]);
  const curve = partial
    ? sliceExpression(expression, variable, held)
    : expression;
  const result = explanation
    ? partial
      ? sliceExpression(explanation.result, variable, held)
      : explanation.result
    : "";
  const value = evaluateAt(curve, point),
    nextValue = evaluateAt(curve, point + delta),
    secantSlope = (nextValue - value) / delta,
    rate = result && mode !== "integral" ? evaluateAt(result, point) : NaN;
  const evaluate = (x: number) => evaluateAt(curve, x);
  const approximation = riemann(evaluate, from, to, count);
  const exact =
    mode === "integral" && result && explanation?.verified
      ? evaluateAt(result, to) - evaluateAt(result, from)
      : NaN;
  useEffect(() => {
    if (!playing) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let request = 0,
      start: number | null = null,
      last = 0;
    const tick = (now: number) => {
      start ??= now;
      if (now - last > 40) {
        last = now;
        const phase = (now - start) / 3200;
        if (mode === "integral")
          setTo(
            Number(
              (from + 0.05 + ((Math.sin(phase) + 1) / 2) * (4 - from)).toFixed(
                3,
              ),
            ),
          );
        else if (mode === "limits")
          setDelta(
            Number((0.01 + ((Math.cos(phase) + 1) / 2) * 1.99).toFixed(3)),
          );
        else setPoint(Number((4 * Math.sin(phase)).toFixed(3)));
      }
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [playing, mode, from]);
  function changeMode(next: Mode) {
    setMode(next);
    setPlaying(false);
    setPreview(null);
    const twoVariables = /\by\b/.test(expression);
    if (next === "partial" && !twoVariables) load(presets.partial[0]);
    if (next !== "partial" && twoVariables) load(presets[next][0]);
  }
  function load(next: string) {
    setInput(next);
    setExpression(next);
    setError("");
    setPreview(null);
  }
  const timelineSteps = [
    "بداية التجربة",
    "تقريب أول",
    "تقريب أدق",
    "اقتراب من الحد",
  ];
  const current =
    mode === "integral"
      ? count <= 8
        ? 0
        : count <= 24
          ? 1
          : count <= 64
            ? 2
            : 3
      : delta >= 1
        ? 0
        : delta >= 0.3
          ? 1
          : delta >= 0.08
            ? 2
            : 3;
  const points: GraphPoint[] =
    mode === "integral"
      ? result && explanation?.verified
        ? [
            {
              x: from,
              y: evaluateAt(result, from),
              color: "#249b8d",
              label: `F(${fmt(from)})`,
            },
            {
              x: to,
              y: evaluateAt(result, to),
              color: "#249b8d",
              label: `F(${fmt(to)})`,
            },
          ]
        : []
      : mode === "limits"
        ? [
            {
              x: point - delta,
              y: evaluateAt(curve, point - delta),
              color: "#249b8d",
              label: "Left",
            },
            {
              x: point + delta,
              y: nextValue,
              color: "#e28e4e",
              label: "Right",
            },
          ]
        : [
            { x: point, y: value, color: "#7770ce", label: "P" },
            ...(Number.isFinite(rate)
              ? [
                  {
                    x: point,
                    y: rate,
                    color: "#249b8d",
                    label: `ميل = ${fmt(rate)}`,
                  },
                ]
              : []),
            ...(!playing && mode === "derivative"
              ? [{ x: point + delta, y: nextValue, color: "#e28e4e" }]
              : []),
          ];
  const derivativeLabel = partial ? `∂f/∂${variable}` : "f′(x)";
  const sliceLabel = partial
    ? `مقطع f عند ${other} = ${fmt(held)}`
    : mode === "derivative"
      ? "قبل: f(x)"
      : "f(x)";
  return (
    <>
      <LabHeader english="CALCULUS VISUALIZER" title="التغير والتراكم" />
      <div className="workspace-navigation">
        <div className="tabs">
          {(
            [
              ["limits", "النهايات"],
              ["derivative", "المشتقة"],
              ["integral", "التكامل"],
              ["partial", "الاشتقاق الجزئي"],
            ] as [Mode, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              className={mode === id ? "active" : ""}
              onClick={() => changeMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="lab-layout">
        <section className="lab-stage">
          <form
            className="inline-form stage-form calculus-form"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                if (!partial && /\by\b/.test(normalize(input)))
                  throw new Error(
                    "الدالة تحتوي y؛ استخدم تبويب الاشتقاق الجزئي لدوال المتغيرين.",
                  );
                compileFunction(input);
                load(input);
              } catch (failure) {
                setError(
                  failure instanceof Error &&
                    /[\u0600-\u06ff]/.test(failure.message)
                    ? failure.message
                    : "تعذر قراءة الدالة.",
                );
              }
            }}
          >
            <span className="mono">{partial ? "f(x, y) =" : "f(x) ="}</span>
            <MathInput
              label="دالة التفاضل والتكامل"
              value={input}
              onChange={setInput}
              variables={partial ? ["x", "y"] : ["x"]}
            />
            <button className="button primary">
              رسم <MoveUpRight size={15} />
            </button>
          </form>
          <div className="calculus-presets" aria-label="أمثلة جاهزة">
            {presets[mode].map((item) => (
              <button
                key={item}
                className={expression === item ? "active" : ""}
                onClick={() => load(item)}
                dir="ltr"
              >
                {item}
              </button>
            ))}
          </div>
          {error && <p className="error-message">{error}</p>}
          {mode !== "limits" && !explanation && (
            <p className="error-message" role="alert">
              لا يدعم المحرك{" "}
              {mode === "integral" ? "إيجاد دالة أصلية" : "اشتقاق"} هذه الدالة
              رمزيًا؛ لا نعرض ناتجًا غير متحقق منه. التجربة العددية على الرسم ما
              زالت متاحة.
            </p>
          )}
          <Graph
            curves={[
              { expression: curve, color: "#7770ce", label: sliceLabel },
              ...(result
                ? [
                    {
                      expression: result,
                      color: "#249b8d",
                      label:
                        mode === "integral"
                          ? "بعد: F(x)، C = 0"
                          : `بعد: ${derivativeLabel}`,
                    },
                  ]
                : []),
              ...(mode === "derivative" && !playing
                ? [
                    {
                      expression: `${value}+(${secantSlope})*(x-(${point}))`,
                      color: "#358ec5",
                      label: "Secant",
                      dashed: true,
                    },
                  ]
                : []),
              ...(preview?.source === expression
                ? [
                    {
                      expression: partial
                        ? sliceExpression(preview.expression, variable, held)
                        : preview.expression,
                      color: "#d8687e",
                      label: "أثر القانون المختار",
                      dashed: true,
                    },
                  ]
                : []),
            ]}
            points={points}
            tangent={
              mode === "derivative" || partial
                ? { x: point, expression: curve }
                : undefined
            }
            rectangles={
              mode === "integral"
                ? { count, from, to, expression: curve }
                : undefined
            }
          />
          <div className="calculus-play">
            <button
              className="button secondary"
              aria-pressed={playing}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing
                ? "إيقاف الحركة"
                : mode === "integral"
                  ? "حرّك الحد العلوي b"
                  : mode === "limits"
                    ? "قرّب h من الصفر"
                    : "حرّك نقطة التماس"}
            </button>
            <span>
              {mode === "integral"
                ? "المساحة المتراكمة تحت f من a إلى b تساوي ارتفاع F عند b ناقص ارتفاعها عند a."
                : mode === "limits"
                  ? "النقطتان تقتربان من x₀ من الجهتين."
                  : `النقطة البنفسجية على ${partial ? "المقطع" : "f"} والخضراء على ${derivativeLabel}: ارتفاع الخضراء = ميل المماس البرتقالي.`}
            </span>
          </div>
          {!partial && (
            <Timeline
              steps={timelineSteps}
              current={current}
              onChange={(index) =>
                mode === "integral"
                  ? setCount([4, 16, 48, 120][index])
                  : setDelta([1, 0.4, 0.1, 0.01][index])
              }
            />
          )}
          <Insight>
            <p>
              {mode === "derivative" || partial
                ? `${partial ? `نثبّت ${other} = ${fmt(held)} فنحصل على مقطع من السطح z = f(x, y) بموازاة محور ${variable}. ` : ""}عند ${axis} = ${piLabel(point)} ميل المماس يساوي ${fmt(rate)}، وهو ارتفاع منحنى ${derivativeLabel} عند النقطة نفسها. ${!Number.isFinite(rate) ? "المشتقة غير معرّفة هنا." : Math.abs(rate) < 1e-6 ? "الميل صفر: مماس أفقي." : rate > 0 ? "الميل موجب: المنحنى يصعد هنا، لذلك المشتقة فوق المحور." : "الميل سالب: المنحنى يهبط هنا، لذلك المشتقة تحت المحور."}${mode === "derivative" && !playing ? ` ميل القاطع عند h = ${fmt(delta)} هو ${fmt(secantSlope)} ويقترب من ميل المماس كلما صغرت h.` : ""}${partial ? ` غيّر ${other} لترى كيف يتغير المقطع وميله؛ ∂f/∂${variable} لا يرى إلا الحركة بموازاة محور ${variable}.` : ""}`
                : mode === "limits"
                  ? `النقطة اليسرى عند ${fmt(point - delta)} واليمنى عند ${fmt(point + delta)}. تصغير h يفحص قيمًا أقرب إلى ${fmt(point)}. تقارب القيم هنا مشاهدة عددية وليس إثباتًا عامًا لوجود النهاية.`
                  : `عدد المستطيلات ${count} وعرض كل منها ${fmt((to - from) / count)}. المساحة الموقّعة من ${fmt(from)} إلى ${fmt(to)} تساوي F(${fmt(to)}) − F(${fmt(from)}) = ${fmt(exact)}؛ المستطيلات تحت المحور تُطرح لأن f سالبة هناك.`}
            </p>
          </Insight>
          {explanation && mode !== "limits" && (
            <section className="calculus-steps" aria-label="خطوات الحل">
              <div className="section-heading">
                <h2>
                  خطوات{" "}
                  {mode === "integral"
                    ? "التكامل"
                    : partial
                      ? "الاشتقاق الجزئي"
                      : "الاشتقاق"}
                </h2>
                <span
                  className={`verified-badge ${explanation.verified ? "" : "warning"}`}
                >
                  {explanation.verified ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <TriangleAlert size={14} />
                  )}
                  {explanation.verified
                    ? "تحقق عددي من الناتج"
                    : "لم يكتمل التحقق العددي"}
                </span>
              </div>
              <div className="formula-line" dir="ltr">
                {mode === "integral"
                  ? `∫ ${explanation.source} dx = ${explanation.display}`
                  : `${partial ? `∂/∂${variable}` : "d/dx"}[${explanation.source}] = ${explanation.display}`}
              </div>
              <ol className="explained-steps">
                {explanation.steps.map((step, index) => (
                  <li key={index}>
                    <h4>{step.operation}</h4>
                    <code dir="ltr">{step.before}</code>
                    <code dir="ltr">{step.after}</code>
                    <span className="rule-label" dir="auto">
                      {step.rule}
                    </span>
                    <p>{step.reason}</p>
                  </li>
                ))}
              </ol>
              {explanation.signNotes.length > 0 && (
                <Insight title="لماذا هذه الإشارة؟">
                  {explanation.signNotes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </Insight>
              )}
              {result && (
                <SignSummary
                  rate={mode === "integral" ? curve : result}
                  subject={mode === "integral" ? "F" : partial ? "g" : "f"}
                />
              )}
              {partial && (
                <p className="muted">
                  g(t) هو المقطع f عند {other} = {fmt(held)} بدلالة {variable}.
                  الثوابت في هذا الاشتقاق:{" "}
                  {explanation.constants.join("، ") || "—"}. لرؤية السطح كاملًا
                  مع مماسي المقطعين افتح المعمل ثلاثي الأبعاد.
                </p>
              )}
            </section>
          )}
          <section aria-label="المكتبة والمستشار للدالة الحالية">
            <div className="section-heading">
              <h2>المكتبة والمستشار</h2>
            </div>
            <LearningPanel
              source={expression}
              graphDescription={`${sliceLabel}${result ? `، و${mode === "integral" ? "F" : derivativeLabel} = ${explanation?.display}` : ""}.`}
              values={
                partial
                  ? { [variable]: point, [other]: held }
                  : mode === "integral"
                    ? { a: from, b: to, n: count }
                    : { x: point, h: delta }
              }
              activity={[]}
              running={playing}
              showAnimation={false}
              onPlay={() => setPlaying(!playing)}
              onReset={() => setPreview(null)}
              onShowSteps={() => {}}
              onClearPreview={() => setPreview(null)}
              onPreview={(next, _purpose, reason) =>
                setPreview({ source: expression, expression: next, reason })
              }
            />
            {preview?.source === expression && (
              <p className="visual-caption">{preview.reason}</p>
            )}
          </section>
        </section>
        <aside className="lab-properties">
          <h3>متغيرات التجربة</h3>
          {partial && (
            <div className="segmented" aria-label="متغير الاشتقاق">
              {(["x", "y"] as const).map((name) => (
                <button
                  key={name}
                  className={variable === name ? "active" : ""}
                  onClick={() => setVariable(name)}
                >
                  ∂/∂{name}
                </button>
              ))}
            </div>
          )}
          {mode === "integral" ? (
            <>
              <Slider
                label="n"
                min={2}
                max={150}
                value={count}
                onChange={setCount}
              />
              <Slider
                label="a"
                min={-4}
                max={4}
                step={0.05}
                value={from}
                onChange={setFrom}
              />
              <Slider
                label="b"
                min={-4}
                max={4}
                step={0.05}
                value={to}
                onChange={setTo}
              />
              <div className="metric">
                <span>مجموع المنتصف</span>
                <strong>{fmt(approximation)}</strong>
              </div>
              <div className="metric">
                <span>F(b) − F(a)</span>
                <strong>{fmt(exact)}</strong>
              </div>
              <div className="metric">
                <span>الخطأ المطلق</span>
                <strong>{fmt(Math.abs(exact - approximation))}</strong>
              </div>
            </>
          ) : (
            <>
              {partial && (
                <Slider
                  label={`${other} (ثابت)`}
                  min={-3}
                  max={3}
                  step={0.1}
                  value={held}
                  onChange={setHeld}
                />
              )}
              <Slider
                label={partial ? variable : "x / a"}
                min={-4}
                max={4}
                step={0.05}
                value={point}
                onChange={setPoint}
              />
              {!partial && (
                <Slider
                  label="h"
                  min={0.01}
                  max={2}
                  step={0.01}
                  value={delta}
                  onChange={setDelta}
                />
              )}
              <div className="metric">
                <span>
                  {mode === "limits"
                    ? "من اليسار"
                    : partial
                      ? "قيمة المقطع"
                      : "f(x₀)"}
                </span>
                <strong>
                  {fmt(
                    mode === "limits"
                      ? evaluateAt(curve, point - delta)
                      : value,
                  )}
                </strong>
              </div>
              <div className="metric">
                <span>
                  {mode === "limits"
                    ? "من اليمين"
                    : `ميل المماس = ${derivativeLabel}`}
                </span>
                <strong>{fmt(mode === "limits" ? nextValue : rate)}</strong>
              </div>
              {mode === "derivative" && (
                <div className="metric">
                  <span>ميل القاطع</span>
                  <strong>{fmt(secantSlope)}</strong>
                </div>
              )}
            </>
          )}
          {mode === "integral" && (
            <p className="muted">
              مقارنة عددية وليست اختبارًا عامًا لتقارب التكامل. فرق قيم الدالة
              الأصلية صالح للتكامل المحدد فقط حين تكون f متصلة على [a, b].
            </p>
          )}
          {mode === "integral" && !Number.isFinite(approximation) && (
            <p className="error-message">
              رُصدت قيمة غير معرّفة داخل المجال أو عند أحد طرفيه. لا نستنتج قيمة
              التكامل من هذه التجربة.
            </p>
          )}
          <Why>
            {mode === "integral"
              ? "كل مستطيل يساوي ارتفاع الدالة عند المنتصف مضروبًا بعرض الجزء. التكامل قد يكون سالبًا تحت محور x، وعكس الحدود يعكس الإشارة. لأن F′ = f، تتزايد F حيث f موجبة وتتناقص حيث f سالبة."
              : partial
                ? "المشتقة الجزئية هي مشتقة عادية لدالة متغير واحد نحصل عليها بتثبيت المتغير الآخر. لذلك كل حد لا يحتوي متغير الاشتقاق مشتقته صفر، والمعامل الذي يحتوي المتغير الثابت يبقى معاملًا."
                : "نحسب فرق القيم مقسومًا على فرق المدخلات. لا نضع h = 0 مباشرة لأن القسمة على الصفر غير معرفة؛ المشتقة هي ما يقترب منه ميل القاطع."}
          </Why>
        </aside>
      </div>
    </>
  );
}
