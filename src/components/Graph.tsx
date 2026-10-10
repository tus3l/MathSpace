import { useEffect, useMemo, useRef, useState } from "react";
import {
  Grid2X2,
  Maximize,
  Minus,
  Plus,
  Crosshair,
  Download,
} from "lucide-react";
import { compileFunction, fmt } from "../engine/math";
import { useGraphTransition } from "./useGraphTransition";
import type { VisualSegment } from "../engine/visual";

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
  autoFit?: boolean;
  autoFitKey?: string;
  points?: GraphPoint[];
  segments?: VisualSegment[];
  scope?: Record<string, number>;
  domain?: [number, number];
  tangent?: { x: number; expression: string };
  rectangles?: { count: number; from: number; to: number; expression: string };
  onInspect?: (point: { x: number; y: number; slope: number }) => void;
};
export function Graph({
  curves,
  autoFit = false,
  autoFitKey,
  points = [],
  segments = [],
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
  const compiledCurves = useMemo(
    () =>
      curves.map((curve) => {
        try {
          return {
            ...curve,
            evaluate: compileFunction(curve.expression),
            error: null,
          };
        } catch (error) {
          return {
            ...curve,
            evaluate: null,
            error:
              error instanceof Error ? error.message : "تعذر قراءة الدالة.",
          };
        }
      }),
    [curves],
  );
  const auxiliary = useMemo(
    () =>
      [rectangles?.expression, tangent?.expression].map((expression) => {
        if (!expression) return { evaluate: null, error: null };
        try {
          return { evaluate: compileFunction(expression), error: null };
        } catch (error) {
          return {
            evaluate: null,
            error:
              error instanceof Error ? error.message : "تعذر قراءة الدالة.",
          };
        }
      }),
    [rectangles?.expression, tangent?.expression],
  );
  const graphErrors = [...compiledCurves, ...auxiliary].flatMap((curve) =>
    curve.error ? [curve.error] : [],
  );
  const transition = useGraphTransition(
    [...compiledCurves, ...auxiliary].map((curve) => curve.evaluate),
    scope,
    [...points, ...segments.flatMap((segment) => [segment.from, segment.to])],
    JSON.stringify([
      curves.map((curve) => curve.expression),
      scope,
      points,
      segments,
      rectangles,
      tangent,
    ]),
    viewport.x - viewport.span / 2,
    viewport.x + viewport.span / 2,
  );
  const undefinedCurves = useMemo(
    () =>
      compiledCurves
        .filter((curve) => {
          const evaluate = curve.evaluate;
          if (!evaluate) return false;
          return !Array.from(
            { length: 101 },
            (_, index) =>
              viewport.x - viewport.span / 2 + (index * viewport.span) / 100,
          ).some((x) => Number.isFinite(evaluate(x, scope)));
        })
        .map((curve) => curve.label ?? curve.expression),
    [compiledCurves, scope, viewport],
  );
  const curveSignature = curves.map((curve) => curve.expression).join("\0");
  const [previousSignature, setPreviousSignature] = useState(curveSignature);
  const [inspected, setInspected] = useState<{
    x: number;
    y: number;
    slope: number;
  } | null>(null);
  if (previousSignature !== curveSignature) {
    setPreviousSignature(curveSignature);
    setInspected(null);
  }
  const inspectEvaluator = compiledCurves[0]?.evaluate;
  const activeInspected = useMemo(
    () =>
      inspected && inspectEvaluator
        ? {
            x: inspected.x,
            y: transition.evaluate(0, inspected.x),
            slope:
              (transition.evaluate(0, inspected.x + 0.0001) -
                transition.evaluate(0, inspected.x - 0.0001)) /
              0.0002,
          }
        : null,
    [inspected, inspectEvaluator, transition],
  );
  const drag = useRef<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    moved: boolean;
  } | null>(null);
  const scopeKey = JSON.stringify(scope);
  const fitKey = JSON.stringify([
    curveSignature,
    scopeKey,
    segments,
    size.width,
    size.height,
  ]);
  const previousFit = useRef("");
  const previousGeometryFit = useRef("");
  useEffect(() => {
    if (
      !autoFit ||
      previousFit.current === fitKey ||
      size.width <= 0 ||
      size.height <= 0
    )
      return;
    const commitFit = (next: typeof viewport, geometryKey = "") => {
      const request = requestAnimationFrame(() => {
        previousFit.current = fitKey;
        previousGeometryFit.current = geometryKey;
        setViewport(next);
      });
      return () => cancelAnimationFrame(request);
    };
    if (segments.length) {
      const endpoints = segments.flatMap((segment) => [
        segment.from,
        segment.to,
      ]);
      const geometryKey = `${autoFitKey || "geometry"}:${size.width}:${size.height}`;
      const halfHeight = (viewport.span * size.height) / size.width / 2;
      if (
        previousGeometryFit.current === geometryKey &&
        endpoints.some(
          (point) =>
            Math.abs(point.x - viewport.x) <= viewport.span / 2 &&
            Math.abs(point.y - viewport.y) <= halfHeight,
        )
      ) {
        previousFit.current = fitKey;
        return;
      }
      const left = Math.min(...endpoints.map((point) => point.x));
      const right = Math.max(...endpoints.map((point) => point.x));
      const bottom = Math.min(...endpoints.map((point) => point.y));
      const top = Math.max(...endpoints.map((point) => point.y));
      if ([left, right, bottom, top].every(Number.isFinite))
        return commitFit({
          x: (left + right) / 2,
          y: (bottom + top) / 2,
          span: Math.max(
            16,
            (right - left) * 1.3,
            ((top - bottom) * 1.3 * size.width) / size.height,
          ),
        }, geometryKey);
      previousFit.current = fitKey;
      return;
    }
    previousGeometryFit.current = "";
    const values = compiledCurves
      .flatMap((curve) =>
        Array.from(
          { length: 65 },
          (_, index) =>
            curve.evaluate?.(
              viewport.x - viewport.span / 2 + (index * viewport.span) / 64,
              scope,
            ) ?? NaN,
        ),
      )
      .filter(Number.isFinite)
      .sort((first, second) => first - second);
    const visibleHalfHeight = (viewport.span * size.height) / size.width / 2;
    const anchor = points.find(
      (point) =>
        Number.isFinite(point.y) &&
        Math.abs(point.x - viewport.x) <= viewport.span / 2,
    );
    if (
      values.length &&
      !values.some((value) => Math.abs(value - viewport.y) <= visibleHalfHeight)
    )
      return commitFit({
        ...viewport,
        y: anchor?.y ?? values[Math.floor(values.length / 2)],
      });
    previousFit.current = fitKey;
  }, [
    autoFit,
    autoFitKey,
    fitKey,
    size,
    segments,
    compiledCurves,
    viewport,
    scope,
    points,
  ]);
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
        const evaluate = (x: number) => transition.evaluate(curves.length, x),
          delta = (rectangles.to - rectangles.from) / rectangles.count;
        for (let index = 0; index < rectangles.count; index++) {
          const x = rectangles.from + index * delta,
            y = evaluate(x + delta / 2);
          if (!Number.isFinite(y)) continue;
          const first = { x, y: 0 };
          const last = { x: x + delta, y };
          context.fillStyle = "#259b8f28";
          context.strokeStyle = "#259b8f88";
          context.fillRect(
            projectX(first.x),
            Math.min(projectY(first.y), projectY(last.y)),
            (last.x - first.x) * scale,
            Math.abs((last.y - first.y) * scale),
          );
          context.strokeRect(
            projectX(first.x),
            Math.min(projectY(first.y), projectY(last.y)),
            (last.x - first.x) * scale,
            Math.abs((last.y - first.y) * scale),
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
    compiledCurves.forEach((curve, index) => {
      const evaluate = curve.evaluate;
      if (evaluate)
        drawCurve(
          (x) => transition.evaluate(index, x),
          curve.color,
          curve.dashed,
        );
    });
    if (tangent) {
      try {
        const evaluate = (x: number) =>
            transition.evaluate(curves.length + 1, x),
          y = evaluate(tangent.x),
          slope =
            (evaluate(tangent.x + 0.0001) - evaluate(tangent.x - 0.0001)) /
            0.0002;
        drawCurve((x) => y + slope * (x - tangent.x), "#e88d49", true);
      } catch {
        /* Tangent omitted when undefined. */
      }
    }
    segments.forEach((segment, index) => {
      const from = transition.points[points.length + index * 2] ?? segment.from;
      const to = transition.points[points.length + index * 2 + 1] ?? segment.to;
      if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return;
      context.strokeStyle = segment.color || "#249b8d";
      context.lineWidth = segment.arrow ? 2.5 : 1.8;
      context.beginPath();
      context.moveTo(projectX(from.x), projectY(from.y));
      context.lineTo(projectX(to.x), projectY(to.y));
      context.stroke();
      if (segment.arrow) {
        const direction = Math.atan2(
          projectY(to.y) - projectY(from.y),
          projectX(to.x) - projectX(from.x),
        );
        context.beginPath();
        context.moveTo(projectX(to.x), projectY(to.y));
        context.lineTo(
          projectX(to.x) - 12 * Math.cos(direction - 0.4),
          projectY(to.y) - 12 * Math.sin(direction - 0.4),
        );
        context.moveTo(projectX(to.x), projectY(to.y));
        context.lineTo(
          projectX(to.x) - 12 * Math.cos(direction + 0.4),
          projectY(to.y) - 12 * Math.sin(direction + 0.4),
        );
        context.stroke();
      }
    });
    const allPoints = [
      ...transition.points.slice(0, points.length),
      ...(activeInspected
        ? [
            {
              ...activeInspected,
              color: "#e88d49",
              label: `(${fmt(activeInspected.x)}, ${fmt(activeInspected.y)})`,
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
    segments,
    scopeKey,
    size,
    viewport,
    grid,
    tangent,
    rectangles,
    inspected,
    scope,
    compiledCurves,
    transition,
    activeInspected,
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
      {graphErrors.length > 0 && (
        <p className="error-message" role="alert">
          {graphErrors.join(" ")}
        </p>
      )}
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
                  y = transition.evaluate(0, x),
                  slope =
                    (transition.evaluate(0, x + 0.0001) -
                      transition.evaluate(0, x - 0.0001)) /
                    0.0002;
                const point = { x, y, slope };
                setInspected(point);
                if (onInspect) {
                  onInspect({
                    x,
                    y: evaluate(x, scope),
                    slope:
                      (evaluate(x + 0.0001, scope) -
                        evaluate(x - 0.0001, scope)) /
                      0.0002,
                  });
                }
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
      {undefinedCurves.length > 0 && (
        <p className="error-message" role="status">
          لا توجد قيم حقيقية ضمن مجال العرض الحالي: {undefinedCurves.join("، ")}
          . غيّر المعامل أو موضع العرض.
        </p>
      )}
      <div className="graph-footer">
        <span>
          <span className="status-dot" /> إحداثيات ديكارتية
        </span>
        {activeInspected ? (
          <span className="mono" dir="ltr">
            x: {fmt(activeInspected.x)} · y: {fmt(activeInspected.y)} · slope:{" "}
            {fmt(activeInspected.slope)}
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
