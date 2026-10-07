import { useState } from "react";
import { Play, RotateCcw } from "lucide-react";
import { det, multiply } from "mathjs";
import { Formula, Slider, Timeline, Why } from "./Controls";
import { Graph } from "./Graph";
import { Insight, LabHeader } from "./CoreLabs";
import { fmt } from "../engine/math";
import {
  combination,
  datasetStats,
  gcdSteps,
  spectrum,
} from "../engine/simulations";

export function LinearLab() {
  const [mode, setMode] = useState("matrix"),
    [matrix, setMatrix] = useState([1, 0, 0, 1]),
    [current, setCurrent] = useState(3);
  const [vx, setVx] = useState(3),
    [vy, setVy] = useState(2),
    [wx, setWx] = useState(1),
    [wy, setWy] = useState(3);
  const [slope1, setSlope1] = useState(2),
    [slope2, setSlope2] = useState(-1),
    [intercept1, setIntercept1] = useState(1),
    [intercept2, setIntercept2] = useState(4);
  const fraction = current / 3,
    transformed = [
      1 + (matrix[0] - 1) * fraction,
      matrix[1] * fraction,
      matrix[2] * fraction,
      1 + (matrix[3] - 1) * fraction,
    ];
  const project = (x: number, y: number) => {
    const result = multiply(
      [
        [transformed[0], transformed[1]],
        [transformed[2], transformed[3]],
      ],
      [x, y],
    ) as number[];
    return `${300 + result[0] * 30},${210 - result[1] * 30}`;
  };
  const determinant = det([
    [matrix[0], matrix[1]],
    [matrix[2], matrix[3]],
  ]);
  const intersectionX =
      Math.abs(slope1 - slope2) < 1e-10
        ? NaN
        : (intercept2 - intercept1) / (slope1 - slope2),
    intersectionY = slope1 * intersectionX + intercept1;
  return (
    <>
      <LabHeader english="LINEAR ALGEBRA LAB" title="المتجهات والتحويلات" />
      <div className="workspace-navigation">
        <div className="tabs">
          {[
            ["matrix", "المصفوفات"],
            ["vectors", "المتجهات"],
            ["systems", "أنظمة المعادلات"],
          ].map(([id, label]) => (
            <button
              className={mode === id ? "active" : ""}
              key={id}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="lab-layout">
        <section className="lab-stage">
          {mode === "systems" ? (
            <Graph
              curves={[
                {
                  expression: `${slope1}*x+(${intercept1})`,
                  color: "#7770ce",
                  label: "Equation 1",
                },
                {
                  expression: `${slope2}*x+(${intercept2})`,
                  color: "#249b8d",
                  label: "Equation 2",
                },
              ]}
              points={
                Number.isFinite(intersectionX)
                  ? [
                      {
                        x: intersectionX,
                        y: intersectionY,
                        label: `(${fmt(intersectionX)}, ${fmt(intersectionY)})`,
                        color: "#e28e4e",
                      },
                    ]
                  : []
              }
            />
          ) : (
            <div className="matrix-stage">
              <svg
                viewBox="0 0 600 420"
                role="img"
                aria-label={
                  mode === "matrix" ? "شبكة تتحول بواسطة مصفوفة" : "جمع متجهات"
                }
              >
                <defs>
                  <marker
                    id="vector-arrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L0,6 L6,3 z" fill="context-stroke" />
                  </marker>
                </defs>
                {Array.from({ length: 15 }, (_, index) => index - 7).map(
                  (value) => (
                    <g key={value}>
                      <line
                        x1={300 + value * 30}
                        y1="0"
                        x2={300 + value * 30}
                        y2="420"
                        stroke="var(--grid)"
                      />
                      <line
                        x1="0"
                        y1={210 + value * 30}
                        x2="600"
                        y2={210 + value * 30}
                        stroke="var(--grid)"
                      />
                      {mode === "matrix" && (
                        <>
                          <polyline
                            points={`${project(value, -7)} ${project(value, 7)}`}
                            stroke="#7770ce"
                            strokeOpacity="0.45"
                            fill="none"
                            style={{ transition: "all 800ms ease" }}
                          />
                          <polyline
                            points={`${project(-10, value)} ${project(10, value)}`}
                            stroke="#249b8d"
                            strokeOpacity="0.45"
                            fill="none"
                            style={{ transition: "all 800ms ease" }}
                          />
                        </>
                      )}
                    </g>
                  ),
                )}
                <line
                  x1="0"
                  y1="210"
                  x2="600"
                  y2="210"
                  stroke="var(--line-strong)"
                />
                <line
                  x1="300"
                  y1="0"
                  x2="300"
                  y2="420"
                  stroke="var(--line-strong)"
                />
                {mode === "matrix" ? (
                  <>
                    <polygon
                      points={`${project(0, 0)} ${project(1, 0)} ${project(1, 1)} ${project(0, 1)}`}
                      fill="#e28e4e"
                      fillOpacity="0.3"
                    />
                    <polyline
                      points={`${project(0, 0)} ${project(1, 0)}`}
                      stroke="#7770ce"
                      strokeWidth="3"
                      markerEnd="url(#vector-arrow)"
                    />
                    <polyline
                      points={`${project(0, 0)} ${project(0, 1)}`}
                      stroke="#249b8d"
                      strokeWidth="3"
                      markerEnd="url(#vector-arrow)"
                    />
                  </>
                ) : (
                  <>
                    {[
                      [vx, vy, "#7770ce", "v"],
                      [wx, wy, "#249b8d", "w"],
                      [vx + wx, vy + wy, "#e28e4e", "v+w"],
                    ].map(([x, y, color, label]) => (
                      <g key={label}>
                        <line
                          x1="300"
                          y1="210"
                          x2={300 + Number(x) * 30}
                          y2={210 - Number(y) * 30}
                          stroke={String(color)}
                          strokeWidth="3"
                          markerEnd="url(#vector-arrow)"
                        />
                        <text
                          x={315 + Number(x) * 30}
                          y={200 - Number(y) * 30}
                          className="svg-medium"
                        >
                          {label}
                        </text>
                      </g>
                    ))}
                    <line
                      x1={300 + vx * 30}
                      y1={210 - vy * 30}
                      x2={300 + (vx + wx) * 30}
                      y2={210 - (vy + wy) * 30}
                      stroke="#249b8d"
                      strokeDasharray="4 4"
                    />
                  </>
                )}
              </svg>
            </div>
          )}
          {mode === "matrix" && (
            <Timeline
              steps={[
                "الشبكة الأصلية",
                "ثلث التحويل",
                "ثلثا التحويل",
                "التحويل الكامل",
              ]}
              current={current}
              onChange={setCurrent}
            />
          )}
          <Insight>
            <p>
              {mode === "matrix"
                ? `أعمدة المصفوفة تحدد صور متجهي الوحدة. المحدد ${fmt(determinant)} يعني تغير المساحة بعامل ${fmt(Math.abs(determinant))}${determinant < 0 ? " مع عكس الاتجاه" : determinant === 0 ? "؛ انهار المستوى إلى خط أو نقطة" : ""}. تغيير العناصر يغيّر جميع النقاط حسب القاعدة نفسها.`
                : mode === "vectors"
                  ? `نجمع المركبات: (${vx}, ${vy}) + (${wx}, ${wy}) = (${vx + wx}, ${vy + wy}). القطعة المتقطعة تنقل المتجه w دون تغيير طوله أو اتجاهه.`
                  : Number.isFinite(intersectionX)
                    ? `بمساواة المعادلتين: (${slope1} - (${slope2}))x = ${intercept2} - (${intercept1})، فنجد x = ${fmt(intersectionX)}. نقطة التقاطع تحقق المعادلتين معًا.`
                    : intercept1 === intercept2
                      ? "الميل والتقاطع متساويان: الخطان متطابقان ويوجد عدد لا نهائي من الحلول."
                      : "الميل متساوٍ والتقاطع مختلف: الخطان متوازيان ولا يوجد حل."}
            </p>
          </Insight>
        </section>
        <aside className="lab-properties">
          <h3>
            {mode === "matrix"
              ? "عناصر المصفوفة"
              : mode === "vectors"
                ? "المركبات"
                : "معاملات الخطين"}
          </h3>
          {mode === "matrix" ? (
            <>
              <div className="matrix-input" dir="ltr">
                {matrix.map((value, index) => (
                  <input
                    key={index}
                    aria-label={`matrix ${index + 1}`}
                    type="number"
                    min={-3}
                    max={3}
                    step={0.1}
                    value={value}
                    onChange={(event) => {
                      const next = [...matrix];
                      next[index] = Math.max(
                        -3,
                        Math.min(3, Number(event.target.value)),
                      );
                      setMatrix(next);
                    }}
                  />
                ))}
              </div>
              <div className="preset-buttons">
                {[
                  ["دوران 90°", [0, -1, 1, 0]],
                  ["تمدد", [2, 0, 0, 1]],
                  ["قص", [1, 1, 0, 1]],
                  ["هوية", [1, 0, 0, 1]],
                ].map(([name, value]) => (
                  <button
                    key={String(name)}
                    onClick={() => {
                      setMatrix(value as number[]);
                      setCurrent(3);
                    }}
                  >
                    {String(name)}
                  </button>
                ))}
              </div>
              <div className="metric">
                <span>المحدد</span>
                <strong>{fmt(determinant)}</strong>
              </div>
              <Why>
                يمكن كتابة أي نقطة x e₁ + y e₂. نحول متجهي الوحدة ثم نستخدم
                التركيب الخطي نفسه. الحركة بين الخطوات استيفاء خطي للمصفوفات، لا
                دوران زاوي خالص.
              </Why>
            </>
          ) : mode === "vectors" ? (
            <>
              <Slider
                label="v.x"
                min={-5}
                max={5}
                value={vx}
                onChange={setVx}
              />
              <Slider
                label="v.y"
                min={-5}
                max={5}
                value={vy}
                onChange={setVy}
              />
              <Slider
                label="w.x"
                min={-5}
                max={5}
                value={wx}
                onChange={setWx}
              />
              <Slider
                label="w.y"
                min={-5}
                max={5}
                value={wy}
                onChange={setWy}
              />
              <div className="metric">
                <span>‖v‖</span>
                <strong>{fmt(Math.hypot(vx, vy))}</strong>
              </div>
              <div className="metric">
                <span>v · w</span>
                <strong>{fmt(vx * wx + vy * wy)}</strong>
              </div>
              <div className="metric">
                <span>v × w (z)</span>
                <strong>{fmt(vx * wy - vy * wx)}</strong>
              </div>
            </>
          ) : (
            <>
              <Slider
                label="m₁"
                min={-4}
                max={4}
                step={0.5}
                value={slope1}
                onChange={setSlope1}
              />
              <Slider
                label="b₁"
                min={-5}
                max={5}
                value={intercept1}
                onChange={setIntercept1}
              />
              <Slider
                label="m₂"
                min={-4}
                max={4}
                step={0.5}
                value={slope2}
                onChange={setSlope2}
              />
              <Slider
                label="b₂"
                min={-5}
                max={5}
                value={intercept2}
                onChange={setIntercept2}
              />
              <div className="metric">
                <span>x</span>
                <strong>{fmt(intersectionX)}</strong>
              </div>
              <div className="metric">
                <span>y</span>
                <strong>{fmt(intersectionY)}</strong>
              </div>
              <Why>
                التعويض يعطي y في كل معادلة. مساواة الطرفين تلغي y، وهي خطوة
                الحذف. المصفوفة [[-m₁,1],[-m₂,1]] لها محدد m₂-m₁؛ إذا كان غير
                صفري فالحل وحيد.
              </Why>
            </>
          )}
        </aside>
      </div>
    </>
  );
}
export function StatisticsLab() {
  const [input, setInput] = useState("2, 4, 5, 5, 7, 8, 10, 12"),
    [previous, setPrevious] = useState(6.625);
  const values = input
    .split(/[,،\s]+/)
    .filter(Boolean)
    .map(Number);
  let stats: ReturnType<typeof datasetStats> | null = null;
  try {
    if (values.length <= 500) stats = datasetStats(values);
  } catch {
    /* Input validation below. */
  }
  const bins = stats
    ? Array.from({ length: 8 }, (_, index) => {
        const width = (stats!.max - stats!.min || 1) / 8;
        const start = stats!.min + index * width;
        return {
          start,
          count: values.filter(
            (value) =>
              Math.min(7, Math.floor((value - stats!.min) / width)) === index,
          ).length,
        };
      })
    : [];
  const maxCount = Math.max(1, ...bins.map((bin) => bin.count));
  const quartile = (fraction: number) => {
    const position = (stats!.sorted.length - 1) * fraction,
      lower = Math.floor(position);
    return (
      stats!.sorted[lower] +
      (stats!.sorted[Math.ceil(position)] - stats!.sorted[lower]) *
        (position - lower)
    );
  };
  const project = (value: number) =>
    70 + ((value - stats!.min) / (stats!.max - stats!.min || 1)) * 460;
  return (
    <>
      <LabHeader english="STATISTICS STUDIO" title="البيانات ومعناها" />
      <div className="lab-layout">
        <section className="lab-stage">
          <div className="section-heading">
            <h2>مجموعة البيانات</h2>
            <span className="mini-tag">{values.length} values</span>
          </div>
          <textarea
            aria-label="مجموعة البيانات"
            className="dataset-input"
            dir="ltr"
            value={input}
            onChange={(event) => {
              if (stats) setPrevious(stats.mean);
              setInput(event.target.value);
            }}
          />
          {stats ? (
            <>
              <div className="histogram">
                <svg viewBox="0 0 600 280" role="img" aria-label="مدرج تكراري">
                  <line
                    x1="40"
                    y1="235"
                    x2="565"
                    y2="235"
                    stroke="var(--line-strong)"
                  />
                  {bins.map((bin, index) => (
                    <g key={index}>
                      <rect
                        x={50 + index * 63}
                        y={235 - (bin.count / maxCount) * 180}
                        width="50"
                        height={(bin.count / maxCount) * 180}
                        fill={index % 2 ? "#249b8d" : "#7770ce"}
                        fillOpacity="0.75"
                      />
                      <text
                        x={75 + index * 63}
                        y={220 - (bin.count / maxCount) * 180}
                        className="svg-small"
                      >
                        {bin.count}
                      </text>
                      <text x={75 + index * 63} y="260" className="svg-small">
                        {fmt(bin.start)}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
              <div className="section-heading">
                <h2>Box Plot</h2>
              </div>
              <svg
                className="box-plot"
                viewBox="0 0 600 110"
                role="img"
                aria-label="مخطط صندوقي بربيعات مستوفاة خطيًا"
              >
                <line
                  x1="70"
                  x2="530"
                  y1="50"
                  y2="50"
                  stroke="var(--line-strong)"
                />
                <rect
                  x={project(quartile(0.25))}
                  y="25"
                  width={Math.max(
                    2,
                    project(quartile(0.75)) - project(quartile(0.25)),
                  )}
                  height="50"
                  fill="#7770ce"
                  fillOpacity="0.18"
                  stroke="#7770ce"
                />
                <line
                  x1={project(stats.median)}
                  x2={project(stats.median)}
                  y1="25"
                  y2="75"
                  stroke="#e28e4e"
                  strokeWidth="3"
                />
                <text x="70" y="100" className="svg-small">
                  {stats.min}
                </text>
                <text x="530" y="100" className="svg-small">
                  {stats.max}
                </text>
              </svg>
              <Insight>
                <p>
                  المتوسط الحالي {fmt(stats.mean)}؛ تغير بمقدار{" "}
                  {fmt(stats.mean - previous)} عن مجموعة البيانات السابقة لأن
                  مجموع القيم أو عددها تغير. القيم البعيدة تزيد التباين بقوة
                  لأننا نربع بعدها عن المتوسط.
                </p>
              </Insight>
            </>
          ) : (
            <p className="error-message">
              أدخل أعدادًا مفصولة بفواصل، بين قيمة واحدة و500 قيمة.
            </p>
          )}
        </section>
        <aside className="lab-properties">
          <h3>ملخص إحصائي</h3>
          {stats && (
            <>
              {[
                ["المتوسط", stats.mean],
                ["الوسيط", stats.median],
                ["التباين (مجتمع)", stats.variance],
                ["الانحراف المعياري", stats.deviation],
                ["الربع الأول", quartile(0.25)],
                ["الربع الثالث", quartile(0.75)],
              ].map(([label, value]) => (
                <div className="metric" key={label}>
                  <span>{label}</span>
                  <strong>{fmt(Number(value))}</strong>
                </div>
              ))}
              <div className="metric">
                <span>المنوال</span>
                <strong>
                  {stats.modes.length
                    ? stats.modes.map(fmt).join(", ")
                    : "لا يوجد"}
                </strong>
              </div>
            </>
          )}
          <Formula value="\sigma^2=\frac{1}{n}\sum(x_i-\mu)^2" block />
          <Why>
            نقسم على n لأن هذه القيم تُعامل كمجتمع كامل. الانحراف المعياري جذر
            التباين ويعود إلى وحدة البيانات الأصلية. أطراف المخطط الصندوقي هي
            الحد الأدنى والأقصى، لا قاعدة 1.5 IQR.
          </Why>
        </aside>
      </div>
    </>
  );
}
export function ProbabilityLab() {
  const [mode, setMode] = useState("coin"),
    [trials, setTrials] = useState(1000),
    [counts, setCounts] = useState([0, 0]);
  const total = counts.reduce((sum, value) => sum + value, 0),
    outcomes =
      mode === "coin" ? ["صورة", "كتابة"] : ["1", "2", "3", "4", "5", "6"];
  function run() {
    const next = [...counts];
    for (let index = 0; index < trials; index++)
      next[Math.floor(Math.random() * next.length)]++;
    setCounts(next);
  }
  return (
    <>
      <LabHeader
        english="PROBABILITY SIMULATOR"
        title="الاحتمال، تحت التجربة"
      />
      <div className="lab-layout">
        <section className="lab-stage">
          <div className="section-heading">
            <h2>التكرارات التجريبية</h2>
            <div className="segmented">
              {[
                ["coin", "قطعة نقد"],
                ["dice", "نرد"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={mode === id ? "active" : ""}
                  onClick={() => {
                    setMode(id);
                    setCounts(Array(id === "coin" ? 2 : 6).fill(0));
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="probability-bars">
            {counts.map((count, index) => (
              <div key={index}>
                <strong>{count}</strong>
                <div className="bar-track">
                  <div
                    style={{
                      height: `${total ? (count / total) * 100 : 0}%`,
                      background: [
                        "#7770ce",
                        "#249b8d",
                        "#e28e4e",
                        "#d8687e",
                        "#358ec5",
                        "#8aa149",
                      ][index],
                    }}
                  />
                </div>
                <span>{outcomes[index]}</span>
                <small>{total ? fmt((count / total) * 100) : "0"}%</small>
              </div>
            ))}
          </div>
          <div className="practice-actions">
            <button className="button primary" onClick={run}>
              <Play size={16} /> إجراء {trials} تجربة
            </button>
            <button
              className="button secondary"
              onClick={() => setCounts(Array(counts.length).fill(0))}
            >
              <RotateCcw size={16} /> تصفير
            </button>
          </div>
          <Insight>
            <p>
              {total
                ? `بعد ${total} تجربة، احتمال ${outcomes[0]} التجريبي ${fmt(counts[0] / total)} مقابل النظري ${fmt(1 / counts.length)}. الاختلاف بسبب العشوائية في عينة محدودة؛ زيادة التجارب تميل إلى تحسين التقارب لكنها لا تضمن ذلك لكل تشغيل.`
                : "لم تبدأ التجربة بعد. كل نتيجة لها احتمال متساوٍ في هذا النموذج؛ النتائج التالية لا تعتمد على السابقة."}
            </p>
          </Insight>
        </section>
        <aside className="lab-properties">
          <h3>إعداد التجربة</h3>
          <Slider
            label="n / trials"
            min={10}
            max={10000}
            step={10}
            value={trials}
            onChange={setTrials}
          />
          <div className="metric">
            <span>مجموع التجارب</span>
            <strong>{total}</strong>
          </div>
          <div className="metric">
            <span>الاحتمال النظري</span>
            <strong>{fmt(1 / counts.length)}</strong>
          </div>
          <Why>
            المحاكاة تختار نتيجة من توزيع متساوٍ باستخدام مولد أرقام شبه عشوائي
            في المتصفح. التكرار النسبي ليس وعدًا بأن كل مجموعة تجارب ستكون
            متوازنة.
          </Why>
        </aside>
      </div>
    </>
  );
}
export function SequencesLab() {
  const [mode, setMode] = useState("geometric"),
    [a, setA] = useState(1),
    [ratio, setRatio] = useState(0.5),
    [count, setCount] = useState(8);
  const terms = Array.from({ length: count }, (_, index) =>
      mode === "geometric" ? a * ratio ** index : a + index * ratio,
    ),
    sum = terms.reduce((total, value) => total + value, 0),
    scale = Math.max(1, ...terms.map(Math.abs));
  const convergent = mode === "geometric" && (Math.abs(ratio) < 1 || a === 0);
  return (
    <>
      <LabHeader english="SEQUENCES & SERIES" title="حدود صغيرة، صورة أكبر" />
      <div className="lab-layout">
        <section className="lab-stage">
          <div className="section-heading">
            <h2>حدود المتتالية</h2>
            <div className="segmented">
              <button
                className={mode === "geometric" ? "active" : ""}
                onClick={() => setMode("geometric")}
              >
                هندسية
              </button>
              <button
                className={mode === "arithmetic" ? "active" : ""}
                onClick={() => setMode("arithmetic")}
              >
                حسابية
              </button>
            </div>
          </div>
          <svg
            className="sequence-chart"
            viewBox="0 0 650 370"
            role="img"
            aria-label="حدود المتتالية"
          >
            <line
              x1="35"
              y1="185"
              x2="625"
              y2="185"
              stroke="var(--line-strong)"
            />
            {terms.map((value, index) => (
              <g key={index}>
                <line
                  x1={50 + (index * 570) / count}
                  x2={50 + (index * 570) / count}
                  y1="185"
                  y2={185 - (value / scale) * 135}
                  stroke="#7770ce"
                  strokeWidth="3"
                />
                <circle
                  cx={50 + (index * 570) / count}
                  cy={185 - (value / scale) * 135}
                  r="5"
                  fill="#249b8d"
                />
                <text
                  x={50 + (index * 570) / count}
                  y="350"
                  className="svg-small"
                >
                  {index + 1}
                </text>
              </g>
            ))}
          </svg>
          <Timeline
            steps={["4 حدود", "8 حدود", "12 حدًا", "20 حدًا"]}
            current={count <= 4 ? 0 : count <= 8 ? 1 : count <= 12 ? 2 : 3}
            onChange={(index) => setCount([4, 8, 12, 20][index])}
          />
          <Insight>
            <p>
              {mode === "geometric"
                ? `كل حد يساوي السابق مضروبًا في r = ${ratio}. ${convergent ? "المجموع اللانهائي متقارب؛ الحدود تتلاشى إذا |r| < 1 أو إذا كان a = 0." : "المجموع اللانهائي غير متقارب لأن الحدود لا تتلاشى."}`
                : `كل حد يزداد بالمقدار d = ${ratio}. تغيير d يغيّر فرق الحدود، بينما تغيير a يزيح جميع الحدود بالمقدار نفسه.`}{" "}
              زيادة n تضيف حدودًا جديدة إلى المجموع الجزئي.
            </p>
          </Insight>
        </section>
        <aside className="lab-properties">
          <h3>المعاملات</h3>
          <Slider
            label="a₁"
            min={-5}
            max={5}
            step={0.5}
            value={a}
            onChange={setA}
          />
          <Slider
            label={mode === "geometric" ? "r" : "d"}
            min={-2}
            max={2}
            step={0.1}
            value={ratio}
            onChange={setRatio}
          />
          <Slider
            label="n"
            min={2}
            max={20}
            value={count}
            onChange={setCount}
          />
          <div className="metric">
            <span>المجموع الجزئي</span>
            <strong>{fmt(sum)}</strong>
          </div>
          {mode === "geometric" && (
            <div className="metric">
              <span>المجموع اللانهائي</span>
              <strong>
                {convergent ? fmt(a === 0 ? 0 : a / (1 - ratio)) : "متباعد"}
              </strong>
            </div>
          )}
          <Formula
            value={mode === "geometric" ? "a_n=a_1 r^{n-1}" : "a_n=a_1+(n-1)d"}
            block
          />
          <Why>
            للهندسية، طرح rS من S يلغي معظم الحدود. للحسابية، جمع أول حد وآخر حد
            يعطي نفس قيمة الأزواج الأخرى.
          </Why>
        </aside>
      </div>
    </>
  );
}
export function TransformsLab() {
  const [mode, setMode] = useState("series"),
    [harmonics, setHarmonics] = useState(3),
    [frequency, setFrequency] = useState(3),
    [amplitude, setAmplitude] = useState(1);
  const expression =
    mode === "series"
      ? Array.from(
          { length: harmonics },
          (_, index) => `4/pi*sin(${2 * index + 1}*x)/${2 * index + 1}`,
        ).join("+")
      : `${amplitude}*sin(${frequency}*x)+0.5*cos(2*x)`;
  const samples = Array.from(
      { length: 128 },
      (_, index) =>
        amplitude * Math.sin((frequency * 2 * Math.PI * index) / 128) +
        0.5 * Math.cos((2 * 2 * Math.PI * index) / 128),
    ),
    amplitudes = spectrum(samples).slice(0, 16);
  return (
    <>
      <LabHeader english="FOURIER LAB" title="من الموجة إلى التردد" />
      <div className="workspace-navigation">
        <div className="tabs">
          <button
            className={mode === "series" ? "active" : ""}
            onClick={() => setMode("series")}
          >
            متسلسلة فورييه
          </button>
          <button
            className={mode === "transform" ? "active" : ""}
            onClick={() => setMode("transform")}
          >
            تحويل فورييه المتقطع
          </button>
        </div>
      </div>
      <div className="lab-layout">
        <section className="lab-stage">
          <Graph
            curves={[
              {
                expression,
                color: "#7770ce",
                label: mode === "series" ? "Fourier sum" : "Time domain",
              },
              ...(mode === "series"
                ? [
                    {
                      expression: "4/pi*sin(x)",
                      color: "#249b8d",
                      label: "Fundamental",
                      dashed: true,
                    },
                  ]
                : []),
            ]}
          />
          {mode === "series" ? (
            <Timeline
              steps={["توافق واحد", "3 توافقيات", "7 توافقيات", "15 توافقًا"]}
              current={
                harmonics <= 1 ? 0 : harmonics <= 3 ? 1 : harmonics <= 7 ? 2 : 3
              }
              onChange={(index) => setHarmonics([1, 3, 7, 15][index])}
            />
          ) : (
            <>
              <div className="section-heading">
                <h2>Frequency domain</h2>
                <span className="mini-tag">128 samples · DFT</span>
              </div>
              <svg
                className="spectrum-chart"
                viewBox="0 0 650 190"
                role="img"
                aria-label="طيف التردد المحسوب بتحويل فورييه المتقطع"
              >
                {amplitudes.map((value, index) => (
                  <g key={index}>
                    <rect
                      x={35 + index * 37}
                      y={155 - (value / Math.max(1, ...amplitudes)) * 130}
                      width="20"
                      height={(value / Math.max(1, ...amplitudes)) * 130}
                      fill="#249b8d"
                    />
                    <text x={45 + index * 37} y="180" className="svg-small">
                      {index}
                    </text>
                  </g>
                ))}
              </svg>
            </>
          )}
          <Insight>
            <p>
              {mode === "series"
                ? `نضيف ${harmonics} من التوافقيات الفردية لتقريب موجة مربعة. زيادة الحدود تجعل الحواف أشد، لكن تجاوز غيبس قرب القفزات لا يختفي كليًا.`
                : `زيادة السعة إلى ${amplitude} ترفع العمود عند التردد ${frequency}. الإشارة تشمل أيضًا cos(2x) بسعة 0.5؛ الطيف محسوب من 128 عينة لا من بيانات معدة مسبقًا.`}
            </p>
          </Insight>
        </section>
        <aside className="lab-properties">
          <h3>مكونات الإشارة</h3>
          {mode === "series" ? (
            <Slider
              label="N / harmonics"
              min={1}
              max={20}
              value={harmonics}
              onChange={setHarmonics}
            />
          ) : (
            <>
              <Slider
                label="frequency"
                min={1}
                max={12}
                value={frequency}
                onChange={setFrequency}
              />
              <Slider
                label="amplitude"
                min={0}
                max={3}
                step={0.1}
                value={amplitude}
                onChange={setAmplitude}
              />
            </>
          )}
          <Formula
            value={
              mode === "series"
                ? String.raw`\frac4\pi\sum_{k=0}^{N-1}\frac{\sin((2k+1)x)}{2k+1}`
                : String.raw`X_k=\sum_{j=0}^{n-1}x_j e^{-2\pi i kj/n}`
            }
            block
          />
          <Why>
            الموجات الجيبية المتعامدة تفصل مكونات التردد. الأعمدة تعرض السعة
            الأحادية الجانب؛ جمع مركبات الزمن وإسقاطها على الجيب وجيب التمام
            ينتج الطيف.
          </Why>
        </aside>
      </div>
    </>
  );
}
export function NumbersLab() {
  const [first, setFirst] = useState(48),
    [second, setSecond] = useState(18);
  let result: ReturnType<typeof gcdSteps> | null = null;
  try {
    result = gcdSteps(first, second);
  } catch {
    /* Validation is visible below. */
  }
  const factors = (value: number) => {
    const list: number[] = [];
    if (value <= 0 || value > 100000) return list;
    for (let divisor = 1; divisor <= Math.sqrt(value); divisor++)
      if (value % divisor === 0) {
        list.push(divisor);
        if (divisor !== value / divisor) list.push(value / divisor);
      }
    return list.sort((left, right) => left - right);
  };
  const divisors = factors(first);
  return (
    <>
      <LabHeader english="NUMBER THEORY" title="نظام الأعداد" />
      <div className="lab-layout">
        <section className="lab-stage">
          <div className="section-heading">
            <h2>خوارزمية إقليدس</h2>
          </div>
          {result ? (
            <>
              {result.steps.map((step, index) => (
                <div className="number-step" key={index}>
                  <span className="step-number">{index + 1}</span>
                  <code dir="ltr">
                    {step.left} = {step.quotient} × {step.right} +{" "}
                    {step.remainder}
                  </code>
                  <Why>
                    باقي قسمة {step.left} على {step.right} هو {step.remainder}.
                    القواسم المشتركة لا تتغير باستبدال العدد الأكبر بهذا الباقي.
                  </Why>
                </div>
              ))}
              <Insight>
                <p>
                  آخر مقسوم عليه غير صفري هو {result.gcd}، لذلك هو القاسم
                  المشترك الأكبر. تغيير أحد المدخلين يعيد سلسلة البواقي لأن
                  قابلية القسمة تغيرت.
                </p>
              </Insight>
              <div className="panel-section">
                <h3>قواسم {first}</h3>
                <div className="factor-list">
                  {divisors.map((value) => (
                    <span key={value}>{value}</span>
                  ))}
                </div>
                <p>
                  {first > 100000
                    ? "عرض القواسم محدود حتى 100000."
                    : first < 1
                      ? "قواسم الصفر ليست قائمة منتهية."
                      : divisors.length === 2
                        ? "هذا عدد أولي؛ قاسماه الموجبان هما 1 والعدد نفسه."
                        : "ليس عددًا أوليًا؛ الأولي له قاسمان موجبان بالضبط."}
                </p>
              </div>
            </>
          ) : (
            <p className="error-message">
              استخدم أعدادًا صحيحة غير سالبة لا تتجاوز مليارًا.
            </p>
          )}
        </section>
        <aside className="lab-properties">
          <h3>المدخلات</h3>
          {[
            ["a", first, setFirst],
            ["b", second, setSecond],
          ].map(([label, value, setter]) => (
            <label className="field-label" key={String(label)}>
              {String(label)}
              <input
                type="number"
                aria-label={String(label)}
                min={0}
                max={1e9}
                value={Number(value)}
                onChange={(event) =>
                  (setter as (value: number) => void)(
                    Number(event.target.value),
                  )
                }
              />
            </label>
          ))}
          {result && (
            <>
              <div className="metric">
                <span>GCD</span>
                <strong>{result.gcd}</strong>
              </div>
              <div className="metric">
                <span>LCM</span>
                <strong>{result.lcm}</strong>
              </div>
              <div className="metric">
                <span>a mod b</span>
                <strong>{second ? first % second : "غير معرف"}</strong>
              </div>
            </>
          )}
          <Formula value="\gcd(a,b)=\gcd(b,a\bmod b)" block />
        </aside>
      </div>
    </>
  );
}
export function CombinatoricsLab() {
  const [total, setTotal] = useState(5),
    [chosen, setChosen] = useState(2),
    [ordered, setOrdered] = useState(false);
  const count = combination(total, Math.min(chosen, total)),
    permutations = Array.from(
      { length: Math.min(chosen, total) },
      (_, index) => total - index,
    ).reduce((product, value) => product * value, 1);
  const rows = Array.from({ length: Math.min(total, 10) + 1 }, (_, row) =>
    Array.from({ length: row + 1 }, (_, column) => combination(row, column)),
  );
  return (
    <>
      <LabHeader english="COMBINATORICS" title="طرق الاختيار" />
      <div className="lab-layout">
        <section className="lab-stage">
          <div className="section-heading">
            <h2>مثلث باسكال</h2>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={ordered}
                onChange={(event) => setOrdered(event.target.checked)}
              />
              الترتيب مهم
            </label>
          </div>
          <div className="pascal-triangle">
            {rows.map((row, index) => (
              <div key={index}>
                {row.map((value, column) => (
                  <span
                    className={
                      index === total && column === chosen ? "highlight" : ""
                    }
                    key={column}
                  >
                    {value}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <Insight>
            <p>
              {ordered
                ? `الترتيب مهم؛ نختار أول عنصر من ${total} احتمالات، والثاني من ${total - 1}، وهكذا. الناتج ${permutations}.`
                : `الترتيب لا يهم؛ كل مجموعة عُدّت r! مرة في التباديل، فنقسم عليه. عدد اختيارات ${chosen} من ${total} هو ${count}.`}{" "}
              كل عدد في مثلث باسكال مجموع العددين فوقه؛ لأن الاختيار إما يحتوي
              عنصرًا معينًا أو لا يحتويه.
            </p>
          </Insight>
        </section>
        <aside className="lab-properties">
          <h3>عدد العناصر</h3>
          <Slider
            label="n"
            min={1}
            max={10}
            value={total}
            onChange={(value) => {
              setTotal(value);
              if (chosen > value) setChosen(value);
            }}
          />
          <Slider
            label="r"
            min={0}
            max={total}
            value={chosen}
            onChange={setChosen}
          />
          <div className="metric">
            <span>{ordered ? "التباديل" : "التوافيق"}</span>
            <strong>{ordered ? permutations : count}</strong>
          </div>
          <Formula
            value={
              ordered
                ? String.raw`P(n,r)=\frac{n!}{(n-r)!}`
                : String.raw`\binom nr=\frac{n!}{r!(n-r)!}`
            }
            block
          />
          <Why>
            الاختيار هنا دون تكرار. إذا سمحنا بتكرار العناصر تتغير القاعدة، لذلك
            لا نستخدم القانون نفسه لكل مسألة عد.
          </Why>
        </aside>
      </div>
    </>
  );
}
