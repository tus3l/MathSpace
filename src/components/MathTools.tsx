import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Lightbulb,
  PencilLine,
} from "lucide-react";
import { topics } from "../content/knowledge";
import { analyze, checkStep } from "../engine/math";
import { Formula, MathInput, Why } from "./Controls";

export type LawPreset = {
  title: string;
  expression: string;
  topicId?: string;
};

export function MathTools({
  expression,
  presets,
  onApply,
  variables,
}: {
  expression: string;
  presets: LawPreset[];
  onApply: (expression: string) => void;
  variables?: string[];
}) {
  const [panel, setPanel] = useState<"library" | "advisor" | "write" | null>(
    null,
  );
  const [selected, setSelected] = useState(0);
  const [draft, setDraft] = useState(expression);
  const [nextStep, setNextStep] = useState("");
  const [checked, setChecked] = useState<ReturnType<typeof checkStep> | null>(
    null,
  );
  const [checkedExpression, setCheckedExpression] = useState("");
  const [topicId, setTopicId] = useState("");
  const preset = presets[selected];
  const topic = topics.find((item) => item.id === preset?.topicId);
  const libraryTopic = topics.find((item) => item.id === topicId);
  const analysis = panel === "advisor" ? analyze(expression) : null;
  return (
    <section className="math-tools" aria-label="أدوات التجربة">
      <div className="tabs" aria-label="المكتبة والمستشار والكتابة">
        <button
          className={panel === "library" ? "active" : ""}
          aria-expanded={panel === "library"}
          onClick={() => setPanel(panel === "library" ? null : "library")}
        >
          <BookOpen size={16} /> المكتبة
        </button>
        <button
          className={panel === "advisor" ? "active" : ""}
          aria-expanded={panel === "advisor"}
          onClick={() => setPanel(panel === "advisor" ? null : "advisor")}
        >
          <Lightbulb size={16} /> المستشار
        </button>
        <button
          className={panel === "write" ? "active" : ""}
          aria-expanded={panel === "write"}
          onClick={() => {
            setDraft(expression);
            setPanel(panel === "write" ? null : "write");
          }}
        >
          <PencilLine size={16} /> الكتابة
        </button>
      </div>
      {panel === "library" && (
        <div className="math-tools-content">
          <label className="field-label">
            القانون
            <select
              aria-label="اختيار القانون"
              value={selected}
              onChange={(event) => setSelected(Number(event.target.value))}
            >
              {presets.map((item, index) => (
                <option key={`${index}-${item.expression}`} value={index}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <Formula value={topic?.formula || preset.expression} block />
          {topic && <Why>{topic.why}</Why>}
          <button
            className="button primary"
            onClick={() => onApply(preset.expression)}
          >
            <ArrowLeft size={16} /> تطبيق القانون
          </button>
          <label className="field-label">
            المفاهيم والقوانين
            <select
              aria-label="مفاهيم المكتبة"
              value={topicId}
              onChange={(event) => setTopicId(event.target.value)}
            >
              <option value="" disabled>
                المكتبة الرياضية
              </option>
              {topics.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          {libraryTopic && (
            <>
              <Formula value={libraryTopic.formula} block />
              <p>{libraryTopic.summary}</p>
              <Why>{libraryTopic.why}</Why>
            </>
          )}
        </div>
      )}
      {panel === "write" && (
        <form
          className="math-tools-content"
          onSubmit={(event) => {
            event.preventDefault();
            onApply(draft);
          }}
        >
          <label className="field-label">
            التعبير الرياضي
            <MathInput
              label="التعبير المخصص"
              value={draft}
              onChange={setDraft}
              variables={variables}
              required
            />
          </label>
          <button className="button primary" type="submit">
            <ArrowLeft size={16} /> تطبيق التعبير
          </button>
        </form>
      )}
      {panel === "advisor" && analysis && (
        <div className="math-tools-content">
          <h3>المستشار الرياضي</h3>
          <Formula value={expression} block />
          <p>
            {analysis.supported
              ? analysis.methodReason
              : "هذا التعبير خارج نطاق الحل الرمزي للمستشار. الرسم أو أخذ عينات عددية ليس إثباتًا."}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setChecked(checkStep(expression, nextStep));
              setCheckedExpression(expression);
            }}
          >
            <label className="field-label">
              الخطوة التالية
              <input
                aria-label="الخطوة التالية في التجربة"
                dir="ltr"
                value={nextStep}
                onChange={(event) => {
                  setNextStep(event.target.value);
                  setChecked(null);
                }}
                required
              />
            </label>
            <button className="button secondary" type="submit">
              <Check size={16} /> تحقق من التكافؤ
            </button>
          </form>
          {checked && checkedExpression === expression && (
            <p role="status">{checked.message}</p>
          )}
        </div>
      )}
    </section>
  );
}
