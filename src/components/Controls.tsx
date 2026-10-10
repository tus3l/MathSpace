import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  CircleHelp,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Eraser,
  Delete,
  ChevronLeft,
  ChevronRight,
  Keyboard,
} from "lucide-react";
import katex from "katex";
import { mathRequest, normalize, safeParse } from "../engine/math";
import {
  deleteMathSelection,
  insertMathKey,
  mathKeyGroups,
} from "./mathKeyboard";
import type { MathKey } from "./mathKeyboard";

export function MathInput({
  value,
  onChange,
  label,
  required = false,
  variables = ["x"],
  inputRef: externalInputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  required?: boolean;
  variables?: string[];
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const localInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? localInputRef;
  const [group, setGroup] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(true);
  const [editError, setEditError] = useState("");
  let preview = "";
  try {
    const request = mathRequest(value);
    if (request.operation) {
      const expression = safeParse(request.expression).toTex();
      preview =
        request.operation === "integral"
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
  function restoreSelection(start: number, end = start) {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(start, end);
    });
  }
  function insert(key: MathKey) {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? start;
    try {
      const next = insertMathKey(value, start, end, key);
      onChange(next.value);
      setEditError("");
      restoreSelection(next.start, next.end);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "تعذر إدراج الرمز.",
      );
    }
  }
  return (
    <div className="math-input-control">
      <input
        ref={inputRef}
        aria-label={label}
        dir="ltr"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setEditError("");
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        required={required}
        maxLength={250}
      />
      <div className="math-keyboard-heading">
        <button
          type="button"
          className="math-keyboard-toggle"
          aria-expanded={keyboardOpen}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setKeyboardOpen(!keyboardOpen)}
        >
          <Keyboard size={16} />{" "}
          {keyboardOpen ? "إخفاء اللوحة الرياضية" : "إظهار اللوحة الرياضية"}
        </button>
        <span>حدّد جزءًا من التعبير لتطبيق قالب عليه</span>
      </div>
      {keyboardOpen && (
        <div className="math-keyboard" aria-label={`لوحة ${label}`}>
          <div
            className="math-keyboard-categories"
            aria-label="أقسام اللوحة الرياضية"
          >
            {[
              ...mathKeyGroups.map((item) => item.title),
              "المتغيرات والثوابت",
            ].map((title, index) => (
              <button
                key={title}
                type="button"
                aria-pressed={group === index}
                className={group === index ? "active" : ""}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setGroup(index)}
              >
                {title}
              </button>
            ))}
          </div>
          <div
            className="math-symbols"
            role="group"
            aria-label={`رموز ${label}`}
            dir="ltr"
          >
            {(
              mathKeyGroups[group]?.keys ?? [
                ...Array.from(new Set([...variables, "π", "e"])).map(
                  (symbol) => ({
                    title: symbol === "π" ? "باي" : `إدراج ${symbol}`,
                    latex: symbol === "π" ? "\\pi" : symbol,
                    prefix: symbol,
                    fallback: "",
                  }),
                ),
              ]
            ).map((key) => (
              <button
                key={key.title}
                type="button"
                title={key.title}
                aria-label={key.title}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insert(key)}
              >
                <Formula value={key.latex} />
              </button>
            ))}
          </div>
          <div className="math-keyboard-footer">
            <small>
              {group === 2
                ? "الزوايا بالراديان؛ استخدم زر التحويل للدرجات."
                : group === 4
                  ? "العمليات على التعبير كاملًا وبالنسبة إلى x؛ التكامل المحدد والنهايات غير مدعومين هنا."
                  : group === 1
                    ? "استبدل القيم داخل القالب؛ الجذور الكسرية للقيم غير السالبة."
                    : "يمكن تعديل القوالب والأرقام مباشرة من حقل الإدخال."}
            </small>
            <div className="math-keyboard-actions" dir="ltr">
              {[-1, 1].map((direction) => (
                <button
                  key={direction}
                  type="button"
                  title={
                    direction < 0
                      ? "تحريك المؤشر لليسار"
                      : "تحريك المؤشر لليمين"
                  }
                  aria-label={
                    direction < 0
                      ? "تحريك المؤشر لليسار"
                      : "تحريك المؤشر لليمين"
                  }
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    const input = inputRef.current;
                    if (!input) return;
                    const start = input.selectionStart ?? 0;
                    const end = input.selectionEnd ?? start;
                    restoreSelection(
                      start !== end
                        ? direction < 0
                          ? start
                          : end
                        : Math.max(
                            0,
                            Math.min(value.length, start + direction),
                          ),
                    );
                  }}
                >
                  {direction < 0 ? (
                    <ChevronLeft size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              ))}
              <button
                type="button"
                title="حذف الحرف السابق أو التحديد"
                aria-label="حذف الحرف السابق أو التحديد"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  const input = inputRef.current;
                  if (!input) return;
                  const start = input.selectionStart ?? value.length;
                  const next = deleteMathSelection(
                    value,
                    start,
                    input.selectionEnd ?? start,
                  );
                  onChange(next.value);
                  setEditError("");
                  restoreSelection(next.start);
                }}
              >
                <Delete size={16} />
              </button>
              <button
                type="button"
                title="مسح الإدخال"
                aria-label="مسح الإدخال"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange("");
                  setEditError("");
                  restoreSelection(0);
                }}
              >
                <Eraser size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      {editError && (
        <p className="math-keyboard-error" role="alert">
          {editError}
        </p>
      )}
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
