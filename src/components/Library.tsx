import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  Check,
  Search,
  X,
  ExternalLink,
} from "lucide-react";
import { topics, searchTopics } from "../content/knowledge";
import type { Topic, View } from "../content/knowledge";
import { Formula, Why } from "./Controls";
import { LabHeader } from "./CoreLabs";
import { Graph } from "./Graph";

export function Library({
  bookmarks,
  toggleBookmark,
  onNavigate,
  selectedId,
}: {
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
  onNavigate: (view: View) => void;
  selectedId?: string;
}) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("الكل"),
    [onlySaved, setOnlySaved] = useState(false),
    [selected, setSelected] = useState<Topic | null>(
      () => topics.find((topic) => topic.id === selectedId) || null,
    );
  const categories = [
    "الكل",
    ...new Set(topics.map((topic) => topic.category)),
  ];
  const results = searchTopics(query).filter(
    (topic) =>
      (category === "الكل" || topic.category === category) &&
      (!onlySaved || bookmarks.includes(topic.id)),
  );
  const related = selected
    ? topics.filter((topic) => selected.related.includes(topic.id))
    : [];
  const expressions: Record<string, string> = {
    quadratic: "x^2+5*x+6",
    functions: "(x-2)^2+3",
    derivative: "x^2",
    limits: "x^2",
    integral: "x^2",
    "unit-circle": "sin(x)",
    fourier: "4/pi*sin(x)",
    difference: "x^2-4",
    sequences: "2^(-x)",
  };
  return (
    <>
      <LabHeader
        english="MATHEMATICAL LIBRARY"
        title="المكتبة الرياضية"
        badge={`${topics.length} موضوعًا موثقًا`}
      />
      <div className="library-toolbar">
        <div className="local-search">
          <Search size={17} />
          <input
            aria-label="بحث المكتبة"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="قانون، رمز، أو مفهوم…"
          />
        </div>
        <button
          className={`button secondary ${onlySaved ? "saved" : ""}`}
          onClick={() => setOnlySaved(!onlySaved)}
        >
          <Bookmark size={16} /> المحفوظات
        </button>
      </div>
      <div className="category-tabs">
        {categories.map((name) => (
          <button
            key={name}
            className={category === name ? "active" : ""}
            onClick={() => setCategory(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="library-table">
        <div className="library-table-head">
          <span>المفهوم / القانون</span>
          <span>الصيغة الرياضية</span>
          <span>المجال</span>
          <span />
        </div>
        {results.map((topic) => (
          <div className="library-row" key={topic.id}>
            <button className="topic-name" onClick={() => setSelected(topic)}>
              <BookOpen size={18} />
              <span>
                <strong>{topic.title}</strong>
                <small>{topic.english}</small>
              </span>
            </button>
            <button
              className="topic-formula"
              onClick={() => setSelected(topic)}
            >
              <Formula value={topic.formula} />
            </button>
            <span className="category-label">{topic.category}</span>
            <button
              title={
                bookmarks.includes(topic.id) ? "إزالة الحفظ" : "حفظ القانون"
              }
              aria-label={`حفظ ${topic.title}`}
              className={bookmarks.includes(topic.id) ? "saved" : ""}
              onClick={() => toggleBookmark(topic.id)}
            >
              {bookmarks.includes(topic.id) ? (
                <Check size={17} />
              ) : (
                <Bookmark size={17} />
              )}
            </button>
          </div>
        ))}
        {!results.length && (
          <div className="empty-state">لا توجد نتائج مطابقة.</div>
        )}
      </div>
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <article
            className="topic-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-heading">
              <span className="eyebrow">{selected.english.toUpperCase()}</span>
              <button
                title="إغلاق"
                aria-label="إغلاق"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>
            <h2>{selected.title}</h2>
            <Formula value={selected.formula} block />
            <p className="topic-summary">{selected.summary}</p>
            <div className="topic-content">
              <h3>الفكرة</h3>
              <p>{selected.detail}</p>
              <h3>متى أستخدمه؟</h3>
              <p>{selected.when}</p>
              <Why>{selected.why}</Why>
              <h3>مثال</h3>
              <div className="topic-example" dir="auto">
                {selected.example}
              </div>
              {expressions[selected.id] && (
                <Graph
                  curves={[
                    {
                      expression: expressions[selected.id],
                      color: "#7770ce",
                      label: selected.english,
                    },
                  ]}
                />
              )}
              <h3>أخطاء شائعة</h3>
              <p className="common-mistake">{selected.mistakes}</p>
              <h3>مفاهيم مرتبطة</h3>
              <div className="related-topics">
                {related.map((topic) => (
                  <button key={topic.id} onClick={() => setSelected(topic)}>
                    {topic.title}
                    <ArrowLeft size={13} />
                  </button>
                ))}
              </div>
            </div>
            <div className="dialog-actions">
              <button
                className="button primary"
                onClick={() => {
                  onNavigate(selected.view);
                  setSelected(null);
                }}
              >
                <ExternalLink size={16} /> افتح التجربة
              </button>
              <button
                className="button secondary"
                onClick={() => toggleBookmark(selected.id)}
              >
                <Bookmark size={16} />
                {bookmarks.includes(selected.id)
                  ? "إزالة الحفظ"
                  : "حفظ القانون"}
              </button>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
