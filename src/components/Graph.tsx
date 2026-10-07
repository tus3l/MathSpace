import { useEffect, useRef, useState } from "react";
import {
  Grid2X2,
  Maximize,
  Minus,
  Plus,
  Crosshair,
  Download,
} from "lucide-react";
import { compileFunction, fmt } from "../engine/math";

export type Curve = {
  expression: string;
  color: string;
  label?: string;
  dashed?: boolean;
};
export type GraphPoint = {
  x: number;
  y: number;
  color?: string;
  label?: string;
};
export type GraphProps = {
  curves: Curve[];
  points?: GraphPoint[];
  scope?: Record<string, number>;
  domain?: [number, number];
  tangent?: { x: number; expression: string };
  rectangles?: { count: number; from: number; to: number; expression: string };
  onInspect?: (point: { x: number; y: number; slope: number }) => void;
};
export function Graph({
  curves,
  points = [],
  scope = {},
  domain = [-8, 8],
  tangent,
  rectangles,
  onInspect,
}: GraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });
  const [viewport, setViewport] = useState({
    x: 0,
    y: 1,
    span: domain[1] - domain[0],
  });
  const [grid, setGrid] = useState(true);
  const [inspected, setInspected] = useState<{
    x: number;
    y: number;
    slope: number;
  } | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    moved: boolean;
  } | null>(null);
  const scopeKey = JSON.stringify(scope);
  useEffect(() => {
    if (!wrapRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width < 1) return;
    const context = canvas.getContext("2d")!;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = size.width * ratio;
    canvas.height = size.height * ratio;
    context.scale(ratio, ratio);
    const dark = document.documentElement.dataset.theme === "dark";
    const width = size.width,
      height = size.height,
      scale = width / viewport.span;
    const projectX = (x: number) => width / 2 + (x - viewport.x) * scale;
    const projectY = (y: number) => height / 2 - (y - viewport.y) * scale;
    const left = viewport.x - viewport.span / 2,
      right = viewport.x + viewport.span / 2;
    const bottom = viewport.y - height / scale / 2,
      top = viewport.y + height / scale / 2;
    context.fillStyle = dark ? "#191c22" : "#ffffff";
    context.fillRect(0, 0, width, height);
    const raw = viewport.span / 12,
      power = 10 ** Math.floor(Math.log10(raw)),
      spacing =
        [1, 2, 5, 10]
          .map((value) => value * power)
          .find((value) => value >= raw) || power;
    context.lineWidth = 1;
    if (grid) {
      context.strokeStyle = dark ? "#282d34" : "#eef0f3";
      context.beginPath();
      for (
        let x = Math.ceil(left / spacing) * spacing;
        x <= right;
        x += spacing
      ) {
        context.moveTo(projectX(x), 0);
        context.lineTo(projectX(x), height);
      }
      for (
        let y = Math.ceil(bottom / spacing) * spacing;
        y <= top;
        y += spacing
      ) {
        context.moveTo(0, projectY(y));
        context.lineTo(width, projectY(y));
      }
      context.stroke();
    }
    context.strokeStyle = dark ? "#58616f" : "#adb4c0";
    context.beginPath();
    context.moveTo(projectX(0), 0);
    context.lineTo(projectX(0), height);
    context.moveTo(0, projectY(0));
    context.lineTo(width, projectY(0));
    context.stroke();
    context.font = '11px "IBM Plex Mono"';
    context.fillStyle = dark ? "#9da5b2" : "#858d99";
    context.textAlign = "center";
    for (let x = Math.ceil(left / spacing) * spacing; x <= right; x += spacing)
      if (Math.abs(x) > 1e-9)
        context.fillText(
          fmt(x),
          projectX(x),
          Math.min(height - 8, Math.max(16, projectY(0) + 18)),
        );
    context.textAlign = "right";
    for (let y = Math.ceil(bottom / spacing) * spacing; y <= top; y += spacing)
      if (Math.abs(y) > 1e-9)
        context.fillText(
          fmt(y),
          Math.max(26, Math.min(width - 10, projectX(0) - 10)),
          projectY(y) + 4,
        );
    context.fillText(
      "x",
      width - 12,
      Math.min(height - 12, Math.max(16, projectY(0) - 10)),
    );
    context.fillText(
      "y",
      Math.max(18, Math.min(width - 12, projectX(0) - 12)),
      18,
    );
    if (rectangles) {
      try {
        const evaluate = compileFunction(rectangles.expression),
          delta = (rectangles.to - rectangles.from) / rectangles.count;
        for (let index = 0; index < rectangles.count; index++) {
          const x = rectangles.from + index * delta,
            y = evaluate(x + delta / 2, scope);
          if (!Number.isFinite(y)) continue;
          context.fillStyle = "#259b8f28";
          context.strokeStyle = "#259b8f88";
          context.fillRect(
            projectX(x),
            Math.min(projectY(0), projectY(y)),
            delta * scale,
            Math.abs(y * scale),
          );
          context.strokeRect(
            projectX(x),
            Math.min(projectY(0), projectY(y)),
            delta * scale,
            Math.abs(y * scale),
          );
        }
      } catch {
        /* Invalid expressions are reported by the input owner. */
      }
    }
    const drawCurve = (
      evaluate: (x: number) => number,
      color: string,
      dashed = false,
    ) => {
      context.strokeStyle = color;
      context.lineWidth = 2.5;
      context.setLineDash(dashed ? [6, 5] : []);
      context.beginPath();
      let started = false,
        previous = NaN;
      for (let pixel = 0; pixel <= width; pixel += 1.5) {
        const x = left + pixel / scale,
          y = projectY(evaluate(x));
        if (
          !Number.isFinite(y) ||
          Math.abs(y) > height * 8 ||
          (Number.isFinite(previous) && Math.abs(y - previous) > height * 0.7)
        ) {
          started = false;
          previous = y;
          continue;
        }
        if (!started) context.moveTo(pixel, y);
        else context.lineTo(pixel, y);
        started = true;
        previous = y;
      }
      context.stroke();
      context.setLineDash([]);
    };
    curves.forEach((curve) => {
      try {
        const evaluate = compileFunction(curve.expression);
        drawCurve((x) => evaluate(x, scope), curve.color, curve.dashed);
      } catch {
        /* Input owner displays parsing errors. */
      }
    });
    if (tangent) {
      try {
        const evaluate = compileFunction(tangent.expression),
          y = evaluate(tangent.x, scope),
          slope =
            (evaluate(tangent.x + 0.0001, scope) -
              evaluate(tangent.x - 0.0001, scope)) /
            0.0002;
        drawCurve((x) => y + slope * (x - tangent.x), "#e88d49", true);
      } catch {
        /* Tangent omitted when undefined. */
      }
    }
    const allPoints = [
      ...points,
      ...(inspected
        ? [
            {
              ...inspected,
              color: "#e88d49",
              label: `(${fmt(inspected.x)}, ${fmt(inspected.y)})`,
            },
          ]
        : []),
    ];
    const labelBounds: {
      x: number;
      y: number;
      width: number;
      height: number;
    }[] = [];
    allPoints.forEach((point) => {
      if (!Number.isFinite(point.y)) return;
      context.fillStyle = point.color || "#259b8f";
      context.beginPath();
      context.arc(projectX(point.x), projectY(point.y), 5, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = dark ? "#191c22" : "#fff";
      context.lineWidth = 2;
      context.stroke();
      if (point.label) {
        context.fillStyle = dark ? "#dce1e9" : "#3e4652";
        context.textAlign = "left";
        const textWidth = context.measureText(point.label).width;
        const candidates = Array.from({ length: 10 }, (_, index) => ({
          x: Math.max(
            6,
            Math.min(
              width - textWidth - 6,
              projectX(point.x) + (index % 2 ? -textWidth - 10 : 10),
            ),
          ),
          y: Math.max(
            16,
            Math.min(
              height - 12,
              projectY(point.y) +
                (index < 2 ? -12 : 20 + Math.floor((index - 2) / 2) * 18),
            ),
          ),
          width: textWidth,
          height: 14,
        }));
        const label = candidates.find(
          (candidate) =>
            !labelBounds.some(
              (used) =>
                candidate.x < used.x + used.width + 6 &&
                candidate.x + candidate.width + 6 > used.x &&
                candidate.y < used.y + used.height + 4 &&
                candidate.y + candidate.height + 4 > used.y,
            ),
        );
        if (label) {
          context.fillText(point.label, label.x, label.y);
          labelBounds.push(label);
        }
      }
    });
  }, [
    curves,
    points,
    scopeKey,
    size,
    viewport,
    grid,
    tangent,
    rectangles,
    inspected,
    scope,
  ]);
  const zoom = (factor: number) =>
    setViewport((current) => ({
      ...current,
      span: Math.min(100, Math.max(1, current.span * factor)),
    }));
  return (
    <div className="graph-shell">
      <div className="graph-toolbar">
        <div className="graph-legend">
          {curves.map((curve, index) => (
            <span key={index}>
              <i style={{ background: curve.color }} />
              <span dir="ltr">{curve.label || curve.expression}</span>
            </span>
          ))}
        </div>
        <div className="graph-actions">
          <button title="تكبير" aria-label="تكبير" onClick={() => zoom(0.8)}>
            <Plus size={16} />
          </button>
          <button title="تصغير" aria-label="تصغير" onClick={() => zoom(1.25)}>
            <Minus size={16} />
          </button>
          <button
            title="إعادة ضبط العرض"
            aria-label="إعادة ضبط العرض"
            onClick={() => {
              setViewport({ x: 0, y: 1, span: domain[1] - domain[0] });
              setInspected(null);
            }}
          >
            <Maximize size={16} />
          </button>
          <button
            title="الشبكة"
            aria-label="الشبكة"
            aria-pressed={grid}
            onClick={() => setGrid(!grid)}
            className={grid ? "selected" : ""}
          >
            <Grid2X2 size={16} />
          </button>
          <button
            title="تنزيل الرسم"
            aria-label="تنزيل الرسم"
            onClick={() => {
              const anchor = document.createElement("a");
              anchor.href = canvasRef.current!.toDataURL();
              anchor.download = "math-space-graph.png";
              anchor.click();
            }}
          >
            <Download size={16} />
          </button>
        </div>
      </div>
      <div className="graph-canvas-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          aria-label="رسم بياني تفاعلي"
          onWheel={(event) => {
            zoom(event.deltaY > 0 ? 1.12 : 0.89);
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = {
              x: event.clientX,
              y: event.clientY,
              vx: viewport.x,
              vy: viewport.y,
              moved: false,
            };
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const deltaX = event.clientX - drag.current.x,
              deltaY = event.clientY - drag.current.y;
            if (Math.abs(deltaX) + Math.abs(deltaY) > 4)
              drag.current.moved = true;
            setViewport((current) => ({
              ...current,
              x: drag.current!.vx - (deltaX * current.span) / size.width,
              y: drag.current!.vy + (deltaY * current.span) / size.width,
            }));
          }}
          onPointerUp={(event) => {
            if (drag.current && !drag.current.moved && curves[0]) {
              const rect = event.currentTarget.getBoundingClientRect(),
                x =
                  viewport.x +
                  ((event.clientX - rect.left - size.width / 2) *
                    viewport.span) /
                    size.width;
              try {
                const evaluate = compileFunction(curves[0].expression),
                  y = evaluate(x, scope),
                  slope =
                    (evaluate(x + 0.0001, scope) -
                      evaluate(x - 0.0001, scope)) /
                    0.0002;
                const point = { x, y, slope };
                setInspected(point);
                onInspect?.(point);
              } catch {
                /* Unparseable curves have no inspectable points. */
              }
            }
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
        />
      </div>
      <div className="graph-footer">
        <span>
          <span className="status-dot" /> إحداثيات ديكارتية
        </span>
        {inspected ? (
          <span className="mono" dir="ltr">
            x: {fmt(inspected.x)} · y: {fmt(inspected.y)} · slope:{" "}
            {fmt(inspected.slope)}
          </span>
        ) : (
          <span>
            <Crosshair size={12} /> Graph Inspector
          </span>
        )}
      </div>
    </div>
  );
}
