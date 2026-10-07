import { useEffect, useState } from "react";
import {
  CircleHelp,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
} from "lucide-react";
import katex from "katex";

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
