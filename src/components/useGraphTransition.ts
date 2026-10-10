import { useEffect, useRef, useState } from "react";
import { interpolateGraphValue, sampleGraph } from "../engine/visual";
import type { GraphPoint } from "./Graph";

type Evaluator = ((x: number, scope?: Record<string, number>) => number) | null;
type Frame = {
  evaluate: (index: number, x: number) => number;
  points: GraphPoint[];
};

export function useGraphTransition(
  evaluators: Evaluator[],
  scope: Record<string, number>,
  points: GraphPoint[],
  signature: string,
  from: number,
  to: number,
) {
  const target: Frame = {
    evaluate: (index, x) => evaluators[index]?.(x, scope) ?? NaN,
    points,
  };
  const [frame, setFrame] = useState(target);
  const rendered = useRef(frame);
  const latest = useRef({ target, from, to, count: evaluators.length });
  useEffect(() => {
    latest.current = { target, from, to, count: evaluators.length };
  });
  const previousSignature = useRef(signature);
  useEffect(() => {
    if (previousSignature.current === signature) return;
    previousSignature.current = signature;
    const { target: next, from: left, to: right, count } = latest.current;
    const previous = rendered.current;
    const samples = Array.from({ length: count }, (_, index) =>
      sampleGraph((x) => previous.evaluate(index, x), left, right),
    );
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let request = 0;
    let started: number | null = null;
    const tick = (now: number) => {
      started ??= now;
      const progress = reduced ? 1 : Math.min(1, (now - started) / 350);
      const eased = progress * progress * (3 - 2 * progress);
      const current: Frame =
        progress === 1
          ? next
          : {
              evaluate: (index, x) =>
                interpolateGraphValue(
                  samples[index]?.(x) ?? NaN,
                  next.evaluate(index, x),
                  eased,
                ),
              points: next.points.map((point, index) => {
                const old = previous.points[index] ?? point;
                return {
                  ...point,
                  x: interpolateGraphValue(old.x, point.x, eased),
                  y: interpolateGraphValue(old.y, point.y, eased),
                };
              }),
            };
      rendered.current = current;
      setFrame(current);
      if (progress < 1) request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [signature]);
  return frame;
}
