import { useEffect, useRef, useState } from "react";
import {
  CircleHelp,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Eraser,
} from "lucide-react";
import katex from "katex";
import { mathRequest, normalize, safeParse } from "../engine/math";

export function MathInput({
  value,
  onChange,
  label,
  required = false,
  variables = ["x"],
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  variables?: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  let preview = "";
  try {
    const request = mathRequest(value);
    if (request.operation) {
      const expression = safeParse(request.expression).toTex();
      preview = request.operation === "integral"
        ? `\\int ${expression}\\,dx`
        : `\\frac{d}{dx}\\left(${expression}\\right)`;
    } else {
      const sides = normalize(value).split("=");
      if (sides.length <= 2)
        preview = sides.map((side) => safeParse(side).toTex()).join("=");
    }
  } catch {
    preview = "";
  }
  function insert(prefix: string, suffix = "", fallback = "x", operation = false) {
    const input = inputRef.current;
    if (!input) return;
    let start = input.selectionStart ?? value.length;
    let end = input.selectionEnd ?? start;
    let selected = value.slice(start, end);
    if (operation) {
      start = 0;
      end = value.length;
      selected = value.includes("=") ? "" : value;
    }
    const body = fallback === "" ? "" : selected || fallback;
    onChange(value.slice(0, start) + prefix + body + suffix + value.slice(end));
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + prefix.length, start + prefix.length + body.length);
    });
  }
  return (
    <div className="math-input-control">
      <input
        ref={inputRef}
        aria-label={label}
        dir="ltr"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        required={required}
        maxLength={250}
      />
      <div className="math-symbols" role="toolbar" aria-label={`رموز ${label}`} dir="ltr">
        {[
          { title: "الجيب", latex: "\\sin", prefix: "sin(", suffix: ")" },
          { title: "جيب التمام", latex: "\\cos", prefix: "cos(", suffix: ")" },
          { title: "الظل", latex: "\\tan", prefix: "tan(", suffix: ")" },
          { title: "الجذر التربيعي", latex: "\\sqrt{x}", prefix: "sqrt(", suffix: ")" },
          { title: "التربيع", latex: "x^2", prefix: "(", suffix: ")^2" },
          { title: "قوة", latex: "x^n", prefix: "(", suffix: ")^3" },
          { title: "كسر", latex: "\\frac{x}{y}", prefix: "(", suffix: ")/(1)" },
          { title: "القيمة المطلقة", latex: "|x|", prefix: "abs(", suffix: ")" },
          { title: "اللوغاريتم الطبيعي", latex: "\\ln", prefix: "ln(", suffix: ")" },
          { title: "اللوغاريتم العشري", latex: "\\log_{10}", prefix: "log10(", suffix: ")" },
          { title: "الدالة الأسية", latex: "e^x", prefix: "exp(", suffix: ")" },
          { title: "تكامل غير محدد بالنسبة إلى x", latex: "\\int", prefix: "∫ (", suffix: ") dx", operation: true },
          { title: "اشتقاق بالنسبة إلى x", latex: "\\frac{d}{dx}", prefix: "derivative(", suffix: ")", operation: true },
        ].map((symbol) => (
          <button key={symbol.title} type="button" title={symbol.title} aria-label={symbol.title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insert(symbol.prefix, symbol.suffix, "x", symbol.operation)}>
            <Formula value={symbol.latex} />
          </button>
        ))}
        {[...variables, "π", "e"].map((symbol) => (
          <button key={symbol} type="button" title={symbol === "π" ? "باي" : symbol} aria-label={symbol === "π" ? "باي" : `إدراج ${symbol}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => insert(symbol, "", "")}>
            <Formula value={symbol === "π" ? "\\pi" : symbol} />
          </button>
        ))}
        <button type="button" title="مسح الإدخال" aria-label="مسح الإدخال"
          onClick={() => { onChange(""); inputRef.current?.focus(); }}>
          <Eraser size={16} />
        </button>
      </div>
      <div className="math-input-preview" aria-label={`معاينة ${label}`}>
        {preview && <Formula value={preview} />}
      </div>
    </div>
  );
}

export function Formula({
  value,
  block = false,
}: {
  value: string;
  block?: boolean;
}) {
  return (
    <span
      dir="ltr"
      className={block ? "formula formula-block" : "formula"}
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(value, {
          throwOnError: false,
          displayMode: block,
          output: "html",
        }),
      }}
    />
  );
}
export function Why({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="why-wrap">
      <button
        className={`why-button ${open ? "active" : ""}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <CircleHelp size={14} /> لماذا؟
      </button>
      {open && <div className="why-answer">{children}</div>}
    </div>
  );
}
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  color,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  color?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label
      className="slider-control"
      style={
        { "--slider-color": color || "var(--accent)" } as React.CSSProperties
      }
    >
      <span>
        <b dir="ltr">{label}</b>
        <output dir="ltr">{Number(value.toFixed(3))}</output>
      </span>
      <input
        aria-label={label}
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <span className="range-labels" dir="ltr">
        <small>{min}</small>
        <small>{max}</small>
      </span>
    </label>
  );
}
export function Timeline({
  steps,
  current,
  onChange,
}: {
  steps: string[];
  current: number;
  onChange: (value: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const isPlaying = playing && current < steps.length - 1;
  useEffect(() => {
    if (!playing || current >= steps.length - 1) return;
    const timer = window.setTimeout(() => {
      onChange(current + 1);
      if (current + 1 >= steps.length - 1) setPlaying(false);
    }, 1600 / speed);
    return () => clearTimeout(timer);
  }, [current, onChange, playing, speed, steps.length]);
  return (
    <div className="timeline">
      <div className="timeline-controls">
        <button
          title="السابق"
          aria-label="السابق"
          onClick={() => {
            setPlaying(false);
            onChange(Math.max(0, current - 1));
          }}
        >
          <SkipBack size={17} />
        </button>
        <button
          className="play-button"
          title={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
          aria-label={isPlaying ? "إيقاف مؤقت" : "تشغيل"}
          onClick={() => {
            if (current === steps.length - 1) onChange(0);
            setPlaying(!isPlaying);
          }}
        >
          {isPlaying ? <Pause size={17} /> : <Play size={17} />}
        </button>
        <button
          title="التالي"
          aria-label="التالي"
          onClick={() => {
            setPlaying(false);
            onChange(Math.min(steps.length - 1, current + 1));
          }}
        >
          <SkipForward size={17} />
        </button>
        <button
          title="إعادة التشغيل"
          aria-label="إعادة التشغيل"
          onClick={() => {
            setPlaying(false);
            onChange(0);
          }}
        >
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="timeline-track">
        {steps.map((label, index) => (
          <button
            key={label}
            className={index <= current ? "reached" : ""}
            onClick={() => {
              setPlaying(false);
              onChange(index);
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <small>{label}</small>
          </button>
        ))}
      </div>
      <select
        aria-label="سرعة الحركة"
        value={speed}
        onChange={(event) => setSpeed(Number(event.target.value))}
      >
        {[0.5, 1, 1.5, 2].map((value) => (
          <option key={value} value={value}>
            {value}x
          </option>
        ))}
      </select>
    </div>
  );
}
