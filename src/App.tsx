import { lazy, Suspense, useLayoutEffect, useState } from "react";
import {
  Atom,
  House,
  ChartNoAxesCombined,
  Lightbulb,
  Shapes,
  Box,
  Triangle,
  Sigma,
  MoveUpRight,
  Grid2X2,
  Dices,
  BarChart3,
  Waves,
  Infinity as InfinityIcon,
  Binary,
  Braces,
  BookOpen,
  PencilLine,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  ArrowLeft,
  History,
  Bookmark,
  ChevronLeft,
  CircleHelp,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Workspace } from "./components/Workspace";
import {
  AdvisorLab,
  CalculusLab,
  GeometryLab,
  PracticeLab,
  ProofLab,
  TrigLab,
} from "./components/CoreLabs";
import {
  CombinatoricsLab,
  LinearLab,
  NumbersLab,
  ProbabilityLab,
  SequencesLab,
  StatisticsLab,
  TransformsLab,
} from "./components/ExtendedLabs";
import { Library } from "./components/Library";
import { Graph } from "./components/Graph";
import { searchTopics, topics } from "./content/knowledge";
import type { View } from "./content/knowledge";
import { useLocal } from "./hooks/useLocal";
import "./App.css";

const ThreeLab = lazy(() => import("./components/ThreeLab"));
type HistoryEntry = {
  expression: string;
  kind: string;
  date: string;
  view: View;
};
type Navigation = {
  id: View;
  title: string;
  english: string;
  icon: LucideIcon;
  color: string;
};
const navigation: Navigation[] = [
  {
    id: "home",
    title: "الرئيسية",
    english: "Home",
    icon: House,
    color: "#838b97",
  },
  {
    id: "workspace",
    title: "مساحة العمل",
    english: "Math Workspace",
    icon: ChartNoAxesCombined,
    color: "#7770ce",
  },
  {
    id: "advisor",
    title: "المستشار الرياضي",
    english: "Math Advisor",
    icon: Lightbulb,
    color: "#e28e4e",
  },
  {
    id: "proof",
    title: "الإثبات البصري",
    english: "Visual Proof",
    icon: Shapes,
    color: "#249b8d",
  },
  {
    id: "geometry",
    title: "الهندسة",
    english: "Geometry",
    icon: Triangle,
    color: "#249b8d",
  },
  {
    id: "trigonometry",
    title: "المثلثات",
    english: "Trigonometry",
    icon: Waves,
    color: "#d8687e",
  },
  {
    id: "calculus",
    title: "التفاضل والتكامل",
    english: "Calculus",
    icon: Sigma,
    color: "#7770ce",
  },
  {
    id: "three",
    title: "معمل ثلاثي الأبعاد",
    english: "3D Math Lab",
    icon: Box,
    color: "#358ec5",
  },
  {
    id: "linear",
    title: "الجبر الخطي",
    english: "Linear Algebra",
    icon: Grid2X2,
    color: "#249b8d",
  },
  {
    id: "statistics",
    title: "الإحصاء",
    english: "Statistics",
    icon: BarChart3,
    color: "#e28e4e",
  },
  {
    id: "probability",
    title: "الاحتمالات",
    english: "Probability",
    icon: Dices,
    color: "#d8687e",
  },
  {
    id: "sequences",
    title: "المتتاليات والمتسلسلات",
    english: "Sequences & Series",
    icon: InfinityIcon,
    color: "#7770ce",
  },
  {
    id: "transforms",
    title: "تحويلات فورييه",
    english: "Fourier Lab",
    icon: Waves,
    color: "#358ec5",
  },
  {
    id: "complex",
    title: "الأعداد المركبة",
    english: "Complex Numbers",
    icon: MoveUpRight,
    color: "#249b8d",
  },
  {
    id: "numbers",
    title: "نظرية الأعداد",
    english: "Number Theory",
    icon: Binary,
    color: "#e28e4e",
  },
  {
    id: "combinatorics",
    title: "التوافقيات",
    english: "Combinatorics",
    icon: Braces,
    color: "#d8687e",
  },
  {
    id: "library",
    title: "المكتبة الرياضية",
    english: "Library",
    icon: BookOpen,
    color: "#7770ce",
  },
  {
    id: "practice",
    title: "التمارين",
    english: "Practice",
    icon: PencilLine,
    color: "#249b8d",
  },
];
const sidebarViews: View[] = ["geometry", "three", "trigonometry"];
const sidebarNavigation = sidebarViews.map(
  (id) => navigation.find((item) => item.id === id)!,
);
const libraryNavigation = navigation.filter(
  (item) => item.id !== "library" && !sidebarViews.includes(item.id),
);
export default function App() {
  const [view, setView] = useState<View>("workspace"),
    [drawer, setDrawer] = useState(false),
    [query, setQuery] = useState(""),
    [searching, setSearching] = useState(false),
    [initial, setInitial] = useState<string | undefined>(),
    [workspaceKey, setWorkspaceKey] = useState(0),
    [topicId, setTopicId] = useState<string | undefined>();
  const [theme, setTheme] = useLocal<"light" | "dark">(
    "math-space-theme",
    "dark",
  );
  const [history, setHistory] = useLocal<HistoryEntry[]>(
    "math-space-history",
    [],
  );
  const [bookmarks, setBookmarks] = useLocal<string[]>(
    "math-space-bookmarks",
    [],
  );
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }, [theme]);
  const current = navigation.find((item) => item.id === view)!;
  function save(expression: string, kind: string) {
    setHistory((current) =>
      [
        { expression, kind, date: new Date().toISOString(), view },
        ...current.filter((entry) => entry.expression !== expression),
      ].slice(0, 40),
    );
  }
  function toggleBookmark(id: string) {
    setBookmarks((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  function navigate(next: View) {
    setView(next);
    setDrawer(false);
    setSearching(false);
    if (next !== "library") setTopicId(undefined);
    if (!["home", "workspace", "library", "practice"].includes(next))
      setHistory((current) =>
        [
          {
            expression: navigation.find((item) => item.id === next)!.title,
            kind: "simulation",
            date: new Date().toISOString(),
            view: next,
          },
          ...current.filter((entry) => entry.view !== next),
        ].slice(0, 40),
      );
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function openProblem(expression: string) {
    setInitial(expression);
    setWorkspaceKey((key) => key + 1);
    navigate("workspace");
  }
  const results = searchTopics(query).slice(0, 7),
    searchMath = /[=^²³()+\d]/.test(query);
  const body =
    view === "workspace" ? (
      <Workspace
        key={workspaceKey}
        initial={initial}
        onSave={save}
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
      />
    ) : view === "home" ? (
      <Home
        onNavigate={navigate}
        history={history}
        bookmarks={bookmarks}
        onOpen={openProblem}
        onTopic={(id) => {
          setTopicId(id);
          navigate("library");
        }}
        clearHistory={() => setHistory([])}
      />
    ) : view === "proof" ? (
      <ProofLab />
    ) : view === "geometry" ? (
      <GeometryLab />
    ) : view === "trigonometry" ? (
      <TrigLab />
    ) : view === "complex" ? (
      <TrigLab complex />
    ) : view === "calculus" ? (
      <CalculusLab />
    ) : view === "advisor" ? (
      <AdvisorLab />
    ) : view === "practice" ? (
      <PracticeLab onSave={save} />
    ) : view === "linear" ? (
      <LinearLab />
    ) : view === "statistics" ? (
      <StatisticsLab />
    ) : view === "probability" ? (
      <ProbabilityLab />
    ) : view === "sequences" ? (
      <SequencesLab />
    ) : view === "transforms" ? (
      <TransformsLab />
    ) : view === "numbers" ? (
      <NumbersLab />
    ) : view === "combinatorics" ? (
      <CombinatoricsLab />
    ) : view === "three" ? (
      <Suspense
        fallback={
          <div className="loading-stage">تهيئة المشهد ثلاثي الأبعاد…</div>
        }
      >
        <ThreeLab />
      </Suspense>
    ) : (
      <Library
        key={topicId || "library"}
        sections={libraryNavigation}
        selectedId={topicId}
        bookmarks={bookmarks}
        toggleBookmark={toggleBookmark}
        onNavigate={navigate}
      />
    );
  return (
    <div className="app-shell">
      <aside className={`sidebar ${drawer ? "open" : ""}`}>
        <button className="brand" onClick={() => navigate("home")}>
          <span className="brand-symbol">
            <Atom size={27} strokeWidth={1.6} />
          </span>
          <span>
            <strong>تخيل فضاء الرياضيات</strong>
            <small>MATH SPACE</small>
          </span>
        </button>
        <div className="sidebar-section-label">المختبرات الرياضية</div>
        <nav aria-label="التنقل الرئيسي">
          {sidebarNavigation.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              active={view === item.id}
              onClick={() => navigate(item.id)}
            />
          ))}
          <div className="sidebar-section-label">المكتبة</div>
          <NavItem
            item={navigation.find((item) => item.id === "library")!}
            active={view === "library"}
            onClick={() => navigate("library")}
          />
        </nav>
        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>محفوظ على هذا الجهاز</span>
          <Check size={13} />
        </div>
      </aside>
      {drawer && (
        <button
          className="drawer-backdrop"
          aria-label="إغلاق القائمة"
          onClick={() => setDrawer(false)}
        />
      )}
      <div className="app-main">
        <header className="topbar">
          <div className="topbar-context">
            <button
              className="mobile-menu"
              title="القائمة"
              aria-label="القائمة"
              onClick={() => setDrawer(!drawer)}
            >
              {drawer ? <X size={19} /> : <Menu size={19} />}
            </button>
            <span>المختبر الرياضي</span>
            <ChevronLeft size={13} />
            <strong>{current.title}</strong>
          </div>
          <div className="global-search">
            <Search size={17} />
            <input
              aria-label="البحث الرياضي"
              placeholder="ابحث عن مفهوم، قانون، أو معادلة…"
              value={query}
              onFocus={() => setSearching(true)}
              onChange={(event) => {
                setQuery(event.target.value);
                setSearching(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") setSearching(false);
                if (event.key === "Enter" && query.trim()) {
                  if (searchMath || !results.length) openProblem(query);
                  else {
                    setTopicId(results[0].id);
                    navigate("library");
                  }
                }
              }}
            />
            <span className="search-symbol">⌕</span>
            {searching && (
              <div className="search-results">
                <div className="search-heading">
                  <small>البحث الرياضي</small>
                  <button
                    aria-label="إغلاق البحث"
                    onClick={() => setSearching(false)}
                  >
                    <X size={14} />
                  </button>
                </div>
                {searchMath && (
                  <button onClick={() => openProblem(query)}>
                    <ChartNoAxesCombined size={17} />
                    <span>
                      تحليل <code dir="ltr">{query}</code>
                    </span>
                    <ArrowLeft size={15} />
                  </button>
                )}
                {results.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => {
                      setTopicId(topic.id);
                      navigate("library");
                    }}
                  >
                    <BookOpen size={16} />
                    <span>
                      <strong>{topic.title}</strong>
                      <small>{topic.category}</small>
                    </span>
                    <ArrowLeft size={14} />
                  </button>
                ))}
                {!results.length && !searchMath && (
                  <p className="empty-state">
                    لا توجد نتائج؛ جرّب اسم قانون أو معادلة.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <button
              title={theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}
              aria-label="تغيير المظهر"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              title="المكتبة الرياضية"
              aria-label="المساعدة الرياضية"
              onClick={() => navigate("library")}
            >
              <CircleHelp size={18} />
            </button>
            <div className="profile-mark">م</div>
          </div>
        </header>
        <main className="main-content">{body}</main>
        <footer className="app-footer">
          <span>تخيل فضاء الرياضيات</span>
          <span>ليس الناتج فقط. السبب أيضًا.</span>
          <span dir="ltr">MATH SPACE · LOCAL FIRST</span>
        </footer>
      </div>
    </div>
  );
}
function NavItem({
  item,
  active,
  onClick,
}: {
  item: Navigation;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      className={`nav-item ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <Icon size={17} style={{ color: active ? "var(--accent)" : undefined }} />
      <span>{item.title}</span>
      {active && <span className="nav-active-dot" />}
    </button>
  );
}
function Home({
  onNavigate,
  history,
  bookmarks,
  onOpen,
  onTopic,
  clearHistory,
}: {
  onNavigate: (view: View) => void;
  history: HistoryEntry[];
  bookmarks: string[];
  onOpen: (expression: string) => void;
  onTopic: (id: string) => void;
  clearHistory: () => void;
}) {
  const [a, setA] = useState(1);
  const recentProblems = history.filter((entry) =>
      ["problem", "practice"].includes(entry.kind),
    ),
    recentGraphs = history.filter((entry) =>
      ["graph", "simulation"].includes(entry.kind),
    );
  return (
    <div className="home-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR MATHEMATICAL SPACE</div>
          <h1>تخيل فضاء الرياضيات</h1>
          <p className="page-subtitle">
            مساحة العمل والمختبرات والمفاهيم المحفوظة
          </p>
        </div>
        <button
          className="button primary"
          onClick={() => onNavigate("workspace")}
        >
          فتح مساحة العمل <ArrowLeft size={16} />
        </button>
      </div>
      <section className="home-experiment">
        <div className="home-experiment-title">
          <span className="eyebrow">FUNCTION EXPLORER</span>
          <h2>الدالة التربيعية</h2>
          <div className="home-formula mono" dir="ltr">
            y = {a}x²
          </div>
          <div className="segmented">
            {[-2, -1, 1, 2].map((value) => (
              <button
                className={a === value ? "active" : ""}
                key={value}
                onClick={() => setA(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <p>
            {a < 0
              ? "a سالبة؛ المنحنى يفتح للأسفل."
              : "a موجبة؛ المنحنى يفتح للأعلى."}{" "}
            {Math.abs(a) === 2
              ? "زيادة |a| تمدد القيم رأسيًا فيصبح المنحنى أضيق."
              : "|a| = 1؛ لا يوجد تمدد رأسي إضافي."}
          </p>
          <button className="text-button" onClick={() => onOpen(`y=${a}x^2`)}>
            استكشف الدالة <ArrowLeft size={15} />
          </button>
        </div>
        <Graph
          curves={[
            { expression: `${a}*x^2`, color: "#7770ce", label: `y = ${a}x²` },
          ]}
        />
      </section>
      <div className="home-section-heading">
        <h2>المختبرات</h2>
        <span>{navigation.length - 3} مساحة مترابطة</span>
      </div>
      <div className="lab-directory">
        {navigation
          .filter((item) => !["home", "library", "practice"].includes(item.id))
          .map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}>
                <span
                  className="directory-icon"
                  style={{ color: item.color, background: `${item.color}15` }}
                >
                  <Icon size={23} strokeWidth={1.5} />
                </span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.english}</small>
                </span>
                <ArrowLeft size={15} />
              </button>
            );
          })}
      </div>
      <div className="recent-layout">
        <section>
          <div className="section-heading">
            <h2>
              <History size={17} /> آخر المسائل
            </h2>
            {history.length > 0 && (
              <button className="text-button" onClick={clearHistory}>
                مسح السجل
              </button>
            )}
          </div>
          {recentProblems.length ? (
            recentProblems.slice(0, 5).map((entry) => (
              <button
                className="recent-row"
                key={entry.expression}
                onClick={() => onOpen(entry.expression)}
              >
                <span className="mono" dir="ltr">
                  {entry.expression}
                </span>
                <small>{new Date(entry.date).toLocaleDateString("ar")}</small>
                <ArrowLeft size={14} />
              </button>
            ))
          ) : (
            <div className="empty-state">لم تُحفظ مسائل بعد.</div>
          )}
        </section>
        <section>
          <div className="section-heading">
            <h2>
              <ChartNoAxesCombined size={17} /> آخر الرسومات والتجارب
            </h2>
          </div>
          {recentGraphs.length ? (
            recentGraphs.slice(0, 5).map((entry) => (
              <button
                className="recent-row"
                key={entry.expression}
                onClick={() =>
                  entry.kind === "graph"
                    ? onOpen(entry.expression)
                    : onNavigate(entry.view)
                }
              >
                <span>{entry.expression}</span>
                <ArrowLeft size={14} />
              </button>
            ))
          ) : (
            <div className="empty-state">لم تُفتح تجارب بعد.</div>
          )}
        </section>
      </div>
      <section className="home-saved">
        <div className="section-heading">
          <h2>
            <Bookmark size={17} /> المحفوظات
          </h2>
          <button className="text-button" onClick={() => onNavigate("library")}>
            المكتبة <ArrowLeft size={14} />
          </button>
        </div>
        {bookmarks.length ? (
          <div className="related-topics">
            {bookmarks.map((id) => (
              <button
                key={id}
                onClick={() => {
                  const topic = topics.find((topic) => topic.id === id);
                  if (topic) onTopic(topic.id);
                  else onOpen(id);
                }}
              >
                {topics.find((topic) => topic.id === id)?.title || id}
                <Bookmark size={13} />
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            المسائل والقوانين التي تحفظها ستظهر هنا.
          </div>
        )}
      </section>
    </div>
  );
}
