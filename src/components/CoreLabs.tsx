import { useState } from "react";
import {
  Lightbulb,
  MoveUpRight,
  RotateCcw,
  Check,
  ArrowLeft,
  CircleHelp,
} from "lucide-react";
import { Formula, Slider, Timeline, Why } from "./Controls";
import { Graph } from "./Graph";
import {
  analyze,
  checkStep,
  compileFunction,
  fmt,
  symbolic,
} from "../engine/math";
import { riemann } from "../engine/simulations";

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
  const total = a + b,
    sideA = (290 * a) / total,
    sideB = (290 * b) / total;
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
                <g transform="translate(110,65)">
                  {current === 0 ? (
                    <>
                      <rect
                        width="290"
                        height="290"
                        fill="#7770ce"
                        fillOpacity="0.14"
                        stroke="#7770ce"
                        strokeWidth="2"
                      />
                      <text x="145" y="145" className="svg-big">
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
                          y={piece.y + piece.sizeY / 2}
                          className="svg-big"
                        >
                          {current >= 2 ? piece.label : ""}
                        </text>
                        {current === 3 && (
                          <text
                            x={piece.x + piece.sizeX / 2}
                            y={piece.y + piece.sizeY / 2 + 28}
                            className="svg-small"
                          >
                            {fmt(piece.value)}
                          </text>
                        )}
                      </g>
                    ))
                  )}
                  <text x={sideA / 2} y="-18" className="svg-medium">
                    a = {a}
                  </text>
                  <text x={sideA + sideB / 2} y="-18" className="svg-medium">
                    b = {b}
                  </text>
                  <text x="145" y="325" className="svg-medium">
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
                  تغيير الأضلاع يغير المساحات: a² = {a * a}، ab = {a * b}، b² ={" "}
                  {b * b}.
                </p>
              </Insight>
              <Why>
                عند تغيير a أو b، يتغير طول الضلع ومجموع المساحات بنفس المقدار؛
                لأن المناطق تغطي المربع كاملًا.
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
    </>
  );
}
export function GeometryLab() {
  const [shape, setShape] = useState("circle"),
    [radius, setRadius] = useState(3),
    [width, setWidth] = useState(6),
    [height, setHeight] = useState(4);
  const [vertex, setVertex] = useState({ x: 3, y: 4 });
  const [dragging, setDragging] = useState(false);
  const area =
    shape === "circle"
      ? Math.PI * radius ** 2
      : shape === "triangle"
        ? (width * vertex.y) / 2
        : shape === "segment"
          ? 0
          : width * height;
  const perimeter =
    shape === "circle"
      ? 2 * Math.PI * radius
      : shape === "triangle"
        ? width +
          Math.hypot(vertex.x, vertex.y) +
          Math.hypot(width - vertex.x, vertex.y)
        : shape === "segment"
          ? Math.hypot(width, height)
          : 2 * (width + height);
  return (
    <>
      <LabHeader english="GEOMETRY LAB" title="معمل الهندسة" />
      <div className="lab-layout">
        <section className="lab-stage">
          <div className="section-heading">
            <h2>الشكل والقياسات</h2>
            <div className="segmented">
              {[
                ["circle", "دائرة"],
                ["rectangle", "مستطيل"],
                ["triangle", "مثلث"],
                ["segment", "قطعة"],
              ].map(([id, name]) => (
                <button
                  key={id}
                  className={shape === id ? "active" : ""}
                  onClick={() => setShape(id)}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
          <div className="geometry-stage">
            <svg
              viewBox="0 0 650 430"
              role="img"
              aria-label="شكل هندسي قابل لتغيير الأبعاد"
              onPointerMove={(event) => {
                if (!dragging) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                setVertex({
                  x: Math.max(
                    0,
                    Math.min(
                      10,
                      (((event.clientX - bounds.left) * 650) / bounds.width -
                        120) /
                        40,
                    ),
                  ),
                  y: Math.max(
                    0.5,
                    Math.min(
                      7,
                      (350 -
                        ((event.clientY - bounds.top) * 430) / bounds.height) /
                        40,
                    ),
                  ),
                });
              }}
              onPointerUp={() => setDragging(false)}
              onPointerCancel={() => setDragging(false)}
            >
              <defs>
                <pattern
                  id="geometry-grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="var(--grid)"
                  />
                </pattern>
              </defs>
              <rect width="650" height="430" fill="url(#geometry-grid)" />
              {shape === "circle" ? (
                <g>
                  <circle
                    cx="325"
                    cy="215"
                    r={radius * 25}
                    fill="#7770ce"
                    fillOpacity="0.12"
                    stroke="#7770ce"
                    strokeWidth="2.5"
                  />
                  <line
                    x1="325"
                    y1="215"
                    x2={325 + radius * 25}
                    y2="215"
                    stroke="#e28e4e"
                    strokeWidth="2"
                  />
                  <circle cx="325" cy="215" r="4" fill="#7770ce" />
                  <text x={325 + radius * 12} y="202" className="svg-medium">
                    r = {radius}
                  </text>
                </g>
              ) : shape === "triangle" ? (
                <g>
                  <polygon
                    points={`120,350 ${120 + width * 40},350 ${120 + vertex.x * 40},${350 - vertex.y * 40}`}
                    fill="#249b8d"
                    fillOpacity="0.12"
                    stroke="#249b8d"
                    strokeWidth="2.5"
                  />
                  <line
                    x1={120 + vertex.x * 40}
                    y1="350"
                    x2={120 + vertex.x * 40}
                    y2={350 - vertex.y * 40}
                    stroke="#e28e4e"
                    strokeDasharray="5 5"
                  />
                  <circle
                    className="draggable-point"
                    cx={120 + vertex.x * 40}
                    cy={350 - vertex.y * 40}
                    r="8"
                    fill="#e28e4e"
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setDragging(true);
                    }}
                  />
                  <text
                    x={130 + vertex.x * 40}
                    y={350 - vertex.y * 20}
                    className="svg-small"
                  >
                    h = {fmt(vertex.y)}
                  </text>
                  <text x={120 + width * 20} y="377" className="svg-medium">
                    b = {width}
                  </text>
                </g>
              ) : shape === "segment" ? (
                <g>
                  <line
                    x1="120"
                    y1="350"
                    x2={120 + width * 40}
                    y2={350 - height * 40}
                    stroke="#7770ce"
                    strokeWidth="3"
                  />
                  <circle cx="120" cy="350" r="6" fill="#249b8d" />
                  <circle
                    cx={120 + width * 40}
                    cy={350 - height * 40}
                    r="6"
                    fill="#e28e4e"
                  />
                  <text x="100" y="377" className="svg-small">
                    A (0,0)
                  </text>
                  <text
                    x={120 + width * 40}
                    y={330 - height * 40}
                    className="svg-small"
                  >
                    B ({width},{height})
                  </text>
                </g>
              ) : (
                <g>
                  <rect
                    x="140"
                    y={330 - height * 35}
                    width={width * 35}
                    height={height * 35}
                    fill="#7770ce"
                    fillOpacity="0.12"
                    stroke="#7770ce"
                    strokeWidth="2.5"
                  />
                  <text x={140 + width * 17.5} y="357" className="svg-medium">
                    w = {width}
                  </text>
                  <text x="110" y={330 - height * 17.5} className="svg-medium">
                    {height}
                  </text>
                </g>
              )}
            </svg>
          </div>
          <Insight>
            <p>
              {shape === "circle"
                ? "زيادة نصف القطر تضاعف المحيط خطيًا، لكنها تزيد المساحة تربيعيًا: المساحة تعتمد على r²."
                : shape === "triangle"
                  ? "تغيير الارتفاع أو سحب الرأس يغير المساحة بنسبة مباشرة مع الارتفاع. التحريك الأفقي وحده لا يغير المساحة ما دامت القاعدة والارتفاع ثابتين."
                  : shape === "segment"
                    ? "الطول يتبع فيثاغورس: √(Δx² + Δy²). تغيير أي مركبة يغير المسافة والميل."
                    : "المساحة حاصل ضرب الطول والعرض. زيادة أحدهما تزيد المساحة مباشرة، والمحيط يجمع أطوال الأضلاع."}
            </p>
          </Insight>
        </section>
        <aside className="lab-properties">
          <h3>خصائص الشكل</h3>
          {shape === "circle" ? (
            <Slider
              label="r"
              min={0.5}
              max={7}
              step={0.1}
              value={radius}
              onChange={setRadius}
            />
          ) : (
            <>
              <Slider
                label={shape === "triangle" ? "b" : "w / Δx"}
                min={1}
                max={10}
                step={0.5}
                value={width}
                onChange={setWidth}
              />
              <Slider
                label={shape === "triangle" ? "h" : "h / Δy"}
                min={0.5}
                max={7}
                step={0.1}
                value={shape === "triangle" ? vertex.y : height}
                onChange={(value) =>
                  shape === "triangle"
                    ? setVertex({ ...vertex, y: value })
                    : setHeight(value)
                }
              />
            </>
          )}
          <div className="metrics-stack">
            {shape !== "segment" && (
              <div className="metric">
                <span>المساحة</span>
                <strong>{fmt(area)}</strong>
              </div>
            )}
            <div className="metric">
              <span>{shape === "segment" ? "الطول" : "المحيط"}</span>
              <strong>{fmt(perimeter)}</strong>
            </div>
            {shape === "circle" && (
              <div className="metric">
                <span>القطر</span>
                <strong>{fmt(2 * radius)}</strong>
              </div>
            )}
            {shape === "segment" && (
              <div className="metric">
                <span>الميل</span>
                <strong>{fmt(height / width)}</strong>
              </div>
            )}
          </div>
          <Formula
            value={
              shape === "circle"
                ? String.raw`A=\pi r^2,\ C=2\pi r`
                : shape === "triangle"
                  ? String.raw`A=\frac{1}{2}bh`
                  : shape === "segment"
                    ? String.raw`d=\sqrt{\Delta x^2+\Delta y^2}`
                    : "A=wh"
            }
            block
          />
          <Why>
            القانون مرتبط بالشكل نفسه، لا بأرقام المثال فقط. القياسات تُحسب من
            الأبعاد الحالية عند كل تغيير.
          </Why>
        </aside>
      </div>
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
export function CalculusLab() {
  const [mode, setMode] = useState("derivative"),
    [input, setInput] = useState("x^2"),
    [expression, setExpression] = useState("x^2"),
    [error, setError] = useState("");
  const [point, setPoint] = useState(1),
    [delta, setDelta] = useState(1),
    [count, setCount] = useState(8),
    [from, setFrom] = useState(0),
    [to, setTo] = useState(2);
  const evaluate = compileFunction(expression),
    value = evaluate(point),
    nextValue = evaluate(point + delta),
    secantSlope = (nextValue - value) / delta;
  let derived = "",
    primitive = "",
    exact = NaN;
  try {
    derived = symbolic(expression, "derivative");
    primitive = symbolic(expression, "integral");
    const primitiveFn = compileFunction(primitive);
    exact = Number.isFinite(riemann(evaluate, from, to, 8))
      ? primitiveFn(to) - primitiveFn(from)
      : NaN;
  } catch {
    /* Symbolic results are optional for the visual experiment. */
  }
  const approximation = riemann(evaluate, from, to, count);
  const steps = ["بداية التجربة", "تقريب أول", "تقريب أدق", "اقتراب من الحد"];
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
  return (
    <>
      <LabHeader english="CALCULUS VISUALIZER" title="التغير والتراكم" />
      <div className="workspace-navigation">
        <div className="tabs">
          {[
            ["limits", "النهايات"],
            ["derivative", "المشتقة"],
            ["integral", "التكامل"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={mode === id ? "active" : ""}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="lab-layout">
        <section className="lab-stage">
          <form
            className="inline-form stage-form"
            onSubmit={(event) => {
              event.preventDefault();
              try {
                compileFunction(input);
                setExpression(input);
                setError("");
              } catch {
                setError("تعذر قراءة الدالة.");
              }
            }}
          >
            <span className="mono">f(x) =</span>
            <input
              aria-label="دالة التفاضل والتكامل"
              dir="ltr"
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className="button primary">
              رسم <MoveUpRight size={15} />
            </button>
          </form>
          {error && <p className="error-message">{error}</p>}
          <Graph
            curves={[
              { expression, color: "#7770ce", label: "f(x)" },
              ...(mode === "derivative"
                ? [
                    {
                      expression: `${value}+(${secantSlope})*(x-(${point}))`,
                      color: "#249b8d",
                      label: "Secant",
                      dashed: true,
                    },
                  ]
                : []),
            ]}
            points={
              mode === "integral"
                ? []
                : mode === "limits"
                  ? [
                      {
                        x: point - delta,
                        y: evaluate(point - delta),
                        color: "#249b8d",
                        label: "Left",
                      },
                      {
                        x: point + delta,
                        y: evaluate(point + delta),
                        color: "#e28e4e",
                        label: "Right",
                      },
                    ]
                  : [
                      { x: point, y: value },
                      { x: point + delta, y: nextValue, color: "#249b8d" },
                    ]
            }
            tangent={
              mode === "derivative" ? { x: point, expression } : undefined
            }
            rectangles={
              mode === "integral" ? { count, from, to, expression } : undefined
            }
          />
          <Timeline
            steps={steps}
            current={current}
            onChange={(index) =>
              mode === "integral"
                ? setCount([4, 16, 48, 120][index])
                : setDelta([1, 0.4, 0.1, 0.01][index])
            }
          />
          <Insight>
            <p>
              {mode === "derivative"
                ? `عندما تقل h = ${fmt(delta)}، تقترب النقطتان ويقترب ميل القاطع ${fmt(secantSlope)} من ميل المماس. المشتقة تقيس معدل التغير اللحظي عندما تكون معرفة.`
                : mode === "limits"
                  ? `النقطة اليسرى عند ${fmt(point - delta)} واليمنى عند ${fmt(point + delta)}. تصغير h يجعلنا نفحص قيمًا أقرب إلى ${point}. تقارب القيم هنا مشاهدة عددية وليس إثباتًا عامًا لوجود النهاية.`
                  : `عدد المستطيلات ${count} وعرض كل منها ${fmt((to - from) / count)}. زيادة n تصغر العرض، فيتحسن تقريب المساحة الموقعة باستخدام نقاط المنتصف للدوال المتصلة.`}
            </p>
          </Insight>
        </section>
        <aside className="lab-properties">
          <h3>متغيرات التجربة</h3>
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
                step={0.25}
                value={from}
                onChange={setFrom}
              />
              <Slider
                label="b"
                min={-4}
                max={4}
                step={0.25}
                value={to}
                onChange={setTo}
              />
              <div className="metric">
                <span>مجموع المنتصف</span>
                <strong>{fmt(approximation)}</strong>
              </div>
              <div className="metric">
                <span>فرق قيم الدالة الأصلية</span>
                <strong>{fmt(exact)}</strong>
              </div>
              <div className="metric">
                <span>الخطأ المطلق</span>
                <strong>{fmt(Math.abs(exact - approximation))}</strong>
              </div>
            </>
          ) : (
            <>
              <Slider
                label="x / a"
                min={-4}
                max={4}
                step={0.1}
                value={point}
                onChange={setPoint}
              />
              <Slider
                label="h"
                min={0.01}
                max={2}
                step={0.01}
                value={delta}
                onChange={setDelta}
              />
              <div className="metric">
                <span>{mode === "limits" ? "من اليسار" : "ميل القاطع"}</span>
                <strong>
                  {fmt(
                    mode === "limits" ? evaluate(point - delta) : secantSlope,
                  )}
                </strong>
              </div>
              <div className="metric">
                <span>{mode === "limits" ? "من اليمين" : "ميل المماس"}</span>
                <strong>
                  {fmt(
                    mode === "limits"
                      ? evaluate(point + delta)
                      : derived
                        ? compileFunction(derived)(point)
                        : NaN,
                  )}
                </strong>
              </div>
            </>
          )}
          {mode === "derivative" && (
            <div className="result-line">
              <small>المشتقة الرمزية</small>
              <code dir="ltr">{derived || "غير متاحة"}</code>
            </div>
          )}
          {mode === "integral" && (
            <div className="result-line">
              <small>الدالة الأصلية</small>
              <code dir="ltr">
                {primitive ? `${primitive} + C` : "غير متاحة"}
              </code>
            </div>
          )}
          {mode === "integral" && (
            <p className="muted">
              هذه مقارنة عددية وليست اختبارًا عامًا لتقارب التكامل. فحص العينات
              قد لا يكشف كل نقطة تفرد؛ وفرق قيم الدالة الأصلية صالح للتكامل
              المحدد فقط عند تحقق شروطه.
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
              ? "كل مستطيل يساوي ارتفاع الدالة عند المنتصف مضروبًا بعرض الجزء. التكامل قد يكون سالبًا تحت محور x؛ وعكس الحدود يعكس الإشارة."
              : "نحسب فرق القيم مقسومًا على فرق المدخلات. لا نضع h = 0 مباشرة لأن القسمة على الصفر غير معرفة."}
          </Why>
        </aside>
      </div>
    </>
  );
}
export function AdvisorLab() {
  const [before, setBefore] = useState("2x + 5 = 15"),
    [after, setAfter] = useState("2x = 20"),
    [checked, setChecked] = useState<ReturnType<typeof checkStep> | null>(null);
  const [current, setCurrent] = useState(0);
  return (
    <>
      <LabHeader
        english="RULE-BASED MATH ADVISOR"
        title="المستشار الرياضي"
        badge="قواعد · لا يوجد AI"
      />
      <div className="lab-layout">
        <section className="lab-stage">
          <div className="section-heading">
            <h2>ميزان المعادلة</h2>
          </div>
          <div className="balance-stage">
            <svg
              viewBox="0 0 650 320"
              role="img"
              aria-label="ميزان يوضح تنفيذ العملية على الطرفين"
            >
              <line
                x1="325"
                y1="80"
                x2="325"
                y2="260"
                stroke="var(--line-strong)"
                strokeWidth="5"
              />
              <path
                d="M 270 280 L 325 240 L 380 280 Z"
                fill="var(--line-strong)"
              />
              <line
                x1="150"
                y1="90"
                x2="500"
                y2="90"
                stroke="#7770ce"
                strokeWidth="5"
              />
              <path
                d="M150 90 L90 190 L210 190 Z M500 90 L440 190 L560 190 Z"
                fill="none"
                stroke="var(--line-strong)"
                strokeWidth="2"
              />
              <rect
                x="90"
                y="190"
                width="120"
                height="45"
                rx="4"
                fill="#7770ce"
                fillOpacity="0.15"
              />
              <rect
                x="440"
                y="190"
                width="120"
                height="45"
                rx="4"
                fill="#249b8d"
                fillOpacity="0.15"
              />
              <text x="150" y="219" className="svg-big">
                {current === 0 ? "x + 3" : current === 1 ? "x + 3 − 3" : "x"}
              </text>
              <text x="500" y="219" className="svg-big">
                {current === 0 ? "7" : current === 1 ? "7 − 3" : "4"}
              </text>
            </svg>
          </div>
          <Formula
            value={
              current === 0 ? "x+3=7" : current === 1 ? "x+3-3=7-3" : "x=4"
            }
            block
          />
          <Timeline
            steps={["المعادلة", "طرح 3 من الطرفين", "عزل المتغير"]}
            current={current}
            onChange={setCurrent}
          />
          <Insight>
            <p>
              {current === 0
                ? "طرفا المعادلة لهما القيمة نفسها؛ الميزان يمثل هذه المساواة."
                : current === 1
                  ? "طرحنا 3 من الجانبين، لا من جانب واحد؛ لذلك لا يميل الميزان وتبقى المساواة صحيحة."
                  : "تلاشى +3 مع -3، وأصبح x = 4. التعويض يعطي 4+3=7، فيتحقق الحل."}
            </p>
          </Insight>
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
            onClick={() => setChecked(checkStep(before, after))}
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
            التحقق يقارن مجموعتي الحلول للمعادلتين الخطيتين أو التربيعيتين. لا
            يتحقق من وصف العملية التي قصدها الطالب، ولا يدعي دعم كل تحويل جبري.
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
    [feedback, setFeedback] = useState("");
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
