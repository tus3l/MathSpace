import { useMemo } from "react";
import { piLabel, signIntervals } from "../engine/calculusSteps";

/** Increasing/decreasing summary from the sampled sign of a rate-of-change expression. */
export function SignSummary({
  rate,
  scope = {},
  from = -2 * Math.PI,
  to = 2 * Math.PI,
  subject = "f",
}: {
  rate: string;
  scope?: Record<string, number>;
  from?: number;
  to?: number;
  subject?: string;
}) {
  const summary = useMemo(() => {
    try {
      return signIntervals(rate, from, to, scope);
    } catch {
      return null;
    }
  }, [rate, from, to, scope]);
  if (!summary || (!summary.intervals.length && !summary.zeros.length))
    return null;
  const interval = (start: number, end: number) =>
    `(${piLabel(start)}, ${piLabel(end)})`;
  const rising = summary.intervals.filter((item) => item.sign === 1);
  const falling = summary.intervals.filter((item) => item.sign === -1);
  return (
    <div className="sign-summary" aria-label="إشارة المشتقة">
      <strong>
        إشارة {subject}′ على [{piLabel(from)}, {piLabel(to)}]
      </strong>
      {rising.length > 0 && (
        <p>
          <span className="sign-chip positive">{subject}′ &gt; 0</span>
          {subject} متزايدة على{" "}
          <span dir="ltr">
            {rising.map((item) => interval(item.from, item.to)).join(" ∪ ")}
          </span>
        </p>
      )}
      {falling.length > 0 && (
        <p>
          <span className="sign-chip negative">{subject}′ &lt; 0</span>
          {subject} متناقصة على{" "}
          <span dir="ltr">
            {falling.map((item) => interval(item.from, item.to)).join(" ∪ ")}
          </span>
        </p>
      )}
      {summary.zeros.length > 0 && (
        <p>
          <span className="sign-chip zero">{subject}′ = 0</span>
          مماس أفقي عند x ={" "}
          <span dir="ltr">
            {summary.zeros
              .slice(0, 8)
              .map((zero) => piLabel(zero))
              .join("، ")}
          </span>
        </p>
      )}
      <small>
        من عينات عددية داخل النافذة؛ الفجوات تعني قيمًا غير معرّفة، وليست
        إثباتًا خارجها.
      </small>
    </div>
  );
}
