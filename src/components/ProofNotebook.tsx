import { Download, Plus, Trash2, PencilLine } from "lucide-react";
import { useLocal } from "../hooks/useLocal";
import { Formula } from "./Controls";

type ProofStep = {
  id: string;
  statement: string;
  equation: string;
  reason: string;
};
type ProofDraft = {
  title: string;
  claim: string;
  assumptions: string;
  steps: ProofStep[];
  conclusion: string;
};
const emptyStep = (): ProofStep => ({
  id: crypto.randomUUID(),
  statement: "",
  equation: "",
  reason: "",
});
export function ProofNotebook() {
  const [proof, setProof] = useLocal<ProofDraft>("math-space-proof-draft", {
    title: "",
    claim: "",
    assumptions: "",
    steps: [],
    conclusion: "",
  });
  function updateStep(
    id: string,
    field: keyof Omit<ProofStep, "id">,
    value: string,
  ) {
    setProof((previous) => ({
      ...previous,
      steps: previous.steps.map((step) =>
        step.id === id ? { ...step, [field]: value } : step,
      ),
    }));
  }
  function download() {
    const text = [
      proof.title,
      `المطلوب إثباته: ${proof.claim}`,
      `الفرضيات: ${proof.assumptions}`,
      ...proof.steps.map(
        (step, index) =>
          `${index + 1}. ${step.statement}\n${step.equation}\nالمبرر: ${step.reason}`,
      ),
      `النتيجة: ${proof.conclusion}`,
      "مسودة برهان، غير متحققة آليًا.",
    ].join("\n\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "mathspace-proof.txt";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <details className="proof-notebook workspace-examples">
      <summary>
        <PencilLine size={16} /> دفتر البراهين
      </summary>
      <div className="proof-notebook-body">
        <div className="section-heading">
          <h2>مسودة البرهان</h2>
          <button
            type="button"
            onClick={download}
            aria-label="تنزيل البرهان"
            title="تنزيل البرهان"
          >
            <Download size={18} />
          </button>
        </div>
        <p className="common-mistake">مسودة غير متحققة آليًا</p>
        <label className="field-label">
          العنوان
          <input
            aria-label="عنوان البرهان"
            value={proof.title}
            onChange={(event) =>
              setProof((previous) => ({
                ...previous,
                title: event.target.value,
              }))
            }
          />
        </label>
        <label className="field-label">
          المطلوب إثباته
          <textarea
            aria-label="المطلوب إثباته"
            dir="auto"
            rows={2}
            value={proof.claim}
            onChange={(event) =>
              setProof((previous) => ({
                ...previous,
                claim: event.target.value,
              }))
            }
          />
        </label>
        <label className="field-label">
          الفرضيات والمجال
          <textarea
            aria-label="فرضيات البرهان"
            dir="auto"
            rows={2}
            value={proof.assumptions}
            onChange={(event) =>
              setProof((previous) => ({
                ...previous,
                assumptions: event.target.value,
              }))
            }
          />
        </label>
        <ol className="proof-step-list">
          {proof.steps.map((step, index) => (
            <li key={step.id}>
              <div className="section-heading">
                <strong>الخطوة {index + 1}</strong>
                <button
                  type="button"
                  aria-label={`حذف الخطوة ${index + 1}`}
                  title="حذف الخطوة"
                  onClick={() =>
                    setProof((previous) => ({
                      ...previous,
                      steps: previous.steps.filter(
                        (item) => item.id !== step.id,
                      ),
                    }))
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <label className="field-label">
                العبارة
                <textarea
                  aria-label={`عبارة الخطوة ${index + 1}`}
                  rows={2}
                  dir="auto"
                  value={step.statement}
                  onChange={(event) =>
                    updateStep(step.id, "statement", event.target.value)
                  }
                />
              </label>
              <label className="field-label">
                الصيغة الرياضية
                <input
                  aria-label={`صيغة الخطوة ${index + 1}`}
                  dir="ltr"
                  value={step.equation}
                  onChange={(event) =>
                    updateStep(step.id, "equation", event.target.value)
                  }
                />
              </label>
              {step.equation && <Formula value={step.equation} block />}
              <label className="field-label">
                المبرر أو القانون
                <textarea
                  aria-label={`مبرر الخطوة ${index + 1}`}
                  rows={2}
                  dir="auto"
                  value={step.reason}
                  onChange={(event) =>
                    updateStep(step.id, "reason", event.target.value)
                  }
                />
              </label>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="button secondary"
          onClick={() =>
            setProof((previous) => ({
              ...previous,
              steps: [...previous.steps, emptyStep()],
            }))
          }
        >
          <Plus size={16} /> إضافة خطوة
        </button>
        <label className="field-label">
          النتيجة
          <textarea
            aria-label="نتيجة البرهان"
            dir="auto"
            rows={2}
            value={proof.conclusion}
            onChange={(event) =>
              setProof((previous) => ({
                ...previous,
                conclusion: event.target.value,
              }))
            }
          />
        </label>
      </div>
    </details>
  );
}
