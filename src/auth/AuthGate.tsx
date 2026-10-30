import { useEffect, useLayoutEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import katex from "katex";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  Box,
  Check,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MonitorSmartphone,
  PauseCircle,
  ShieldCheck,
  Snowflake,
  Sparkles,
} from "lucide-react";
import App from "../App";
import { AdminDashboard } from "./AdminDashboard";
import {
  AuthError,
  authConfigured,
  changePassword,
  checkSession,
  dismissSessionEnd,
  login,
  logout,
  onSessionEnded,
  pendingSessionEnd,
  restoreSession,
} from "./api";
import type { Account, SessionEnd } from "./api";
import "./auth.css";

const SESSION_CHECK_MS = 15_000;

export function AuthGate() {
  const [account, setAccount] = useState<Account | null>(null),
    [ready, setReady] = useState(false),
    [ended, setEnded] = useState<SessionEnd | null>(pendingSessionEnd),
    [adminView, setAdminView] = useState<"dashboard" | "app">("dashboard");
  useLayoutEffect(() => {
    let theme = "dark";
    try {
      theme = JSON.parse(localStorage.getItem("math-space-theme") ?? '"dark"');
    } catch {
      /* Keep the default theme. */
    }
    document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }, []);
  useEffect(() => {
    let active = true;
    restoreSession()
      .then((restored) => active && setAccount(restored))
      .catch((caught: AuthError) => active && setEnded(caught.sessionEnd))
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);
  // Any backend rejection (from polling or from a protected call) ends the session in the UI.
  useEffect(
    () =>
      onSessionEnded((end) => {
        setAccount(null);
        setAdminView("dashboard");
        if (end) setEnded(end);
      }),
    [],
  );
  const signedIn = account !== null;
  useEffect(() => {
    if (!signedIn) return;
    let busy = false;
    const verify = () => {
      if (busy || document.visibilityState === "hidden") return;
      busy = true;
      checkSession()
        .then((fresh) => fresh && setAccount(fresh))
        .catch(() => undefined) // Network errors keep the UI; rejections are handled by onSessionEnded.
        .finally(() => (busy = false));
    };
    const timer = window.setInterval(verify, SESSION_CHECK_MS);
    window.addEventListener("focus", verify);
    window.addEventListener("online", verify);
    document.addEventListener("visibilitychange", verify);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", verify);
      window.removeEventListener("online", verify);
      document.removeEventListener("visibilitychange", verify);
    };
  }, [signedIn]);
  async function signOut() {
    await logout().catch(() => undefined);
    setAccount(null);
    setAdminView("dashboard");
  }

  if (!ready)
    return (
      <div className="auth-loading">
        <LoaderCircle className="auth-spin" size={28} />
      </div>
    );
  if (ended)
    return (
      <SessionEndedPage
        end={ended}
        onBack={() => {
          dismissSessionEnd();
          setEnded(null);
        }}
      />
    );
  if (!account)
    return (
      <LoginPage
        onLogin={(next) => {
          setAccount(next);
          setAdminView("dashboard");
        }}
        onBlocked={setEnded}
      />
    );
  if (account.mustChangePassword)
    return (
      <ChangePasswordPage
        account={account}
        onDone={setAccount}
        onLogout={signOut}
      />
    );
  if (account.role === "admin" && adminView === "dashboard")
    return (
      <AdminDashboard
        account={account}
        onOpenApp={() => setAdminView("app")}
        onLogout={signOut}
      />
    );
  return (
    <App
      account={account}
      onLogout={signOut}
      onAdmin={
        account.role === "admin" ? () => setAdminView("dashboard") : undefined
      }
    />
  );
}

const heroFormulas = [
  "\\int_a^b f(x)\\,dx",
  "e^{i\\pi} + 1 = 0",
  "\\nabla \\cdot \\mathbf{F}",
  "\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}",
  "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1",
].map((tex) => katex.renderToString(tex, { throwOnError: false, output: "html" }));
const curve = "M0 230 C 75 130, 150 130, 225 230 S 375 330, 450 230 S 560 150, 600 190";
const infinity =
  "M50 25 C 62 8, 90 8, 90 25 C 90 42, 62 42, 50 25 C 38 8, 10 8, 10 25 C 10 42, 38 42, 50 25 Z";
const infinityEquation = katex.renderToString("\\lim_{x \\to 0^{+}} \\frac{1}{x} =", {
  throwOnError: false,
  output: "html",
});

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <section className="auth-hero" aria-hidden="true">
        <div className="auth-aurora a" />
        <div className="auth-aurora b" />
        <div className="auth-stars" />
        <div className="auth-grid" />
        <div className="auth-orbit auth-orbit-a" />
        <div className="auth-orbit auth-orbit-b" />
        <svg className="auth-plot" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="auth-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#a49bec" stopOpacity="0.28" />
              <stop offset="1" stopColor="#a49bec" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="auth-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3fd0bd" />
              <stop offset="0.5" stopColor="#a49bec" />
              <stop offset="1" stopColor="#f0a26a" />
            </linearGradient>
            <filter id="auth-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <line className="auth-axis" x1="0" y1="230" x2="600" y2="230" />
          <line className="auth-axis" x1="300" y1="20" x2="300" y2="400" />
          <path className="auth-area" d={`${curve} L600 400 L0 400 Z`} />
          <path className="auth-curve-2" d="M0 270 C 90 200, 160 200, 250 270 S 400 340, 480 260 S 570 220, 600 240" />
          <path className="auth-curve-glow" d={curve} filter="url(#auth-glow)" />
          <path className="auth-curve" d={curve} pathLength={1} />
          <circle r="11" className="auth-tracer-halo">
            <animateMotion dur="9s" repeatCount="indefinite" path={curve} />
          </circle>
          <circle r="4.5" className="auth-tracer">
            <animateMotion dur="9s" repeatCount="indefinite" path={curve} />
          </circle>
        </svg>
        {heroFormulas.map((html, index) => (
          <span
            key={index}
            className={`auth-formula f${index + 1}`}
            dir="ltr"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ))}
        <div className="auth-hero-text">
          <span className="auth-formula auth-infinity-eq" dir="ltr">
            <span
              className="auth-infinity-expr"
              dangerouslySetInnerHTML={{ __html: infinityEquation }}
            />
          <svg className="auth-infinity" viewBox="0 0 100 50">
            <path className="auth-infinity-base" d={infinity} />
            {[0.2, 0.12, 0.05].map((len, i) => (
              <path
                key={len}
                className={`auth-infinity-flow t${i}`}
                d={infinity}
                pathLength={1}
                style={{ strokeDasharray: `${len} ${1 - len}` }}
              />
            ))}
            <circle r="2.6" className="auth-infinity-dot">
              <animateMotion dur="4s" begin="-0.8s" repeatCount="indefinite" path={infinity} />
            </circle>
          </svg>
          </span>
          <span className="auth-tag">
            <Sparkles size={13} />
            منصة رياضية تفاعلية
          </span>
          <div className="auth-title">
            <span className="auth-mark" dir="ltr">
              <img src="/logo.png" alt="" />
            </span>
            <h1>مختبر فضاء الرياضيات</h1>
          </div>
          <p>ليس الناتج فقط. السبب أيضًا.</p>
          <ul className="auth-features">
            <li>
              <ListChecks size={15} />
              حلول مشروحة خطوة بخطوة
            </li>
            <li>
              <Box size={15} />
              رسوم ثنائية وثلاثية الأبعاد
            </li>
            <li>
              <BookOpen size={15} />
              مكتبة قوانين شاملة
            </li>
          </ul>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">{children}</div>
      </section>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  label,
  autoComplete,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  autoComplete: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-input">
        <LockKeyhole size={17} />
        <input
          type={visible ? "text" : "password"}
          dir="ltr"
          value={value}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="auth-eye"
          aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  );
}

function LoginPage({
  onLogin,
  onBlocked,
}: {
  onLogin: (account: Account) => void;
  onBlocked: (end: SessionEnd) => void;
}) {
  const [id, setId] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(await login(id, password));
    } catch (caught) {
      if (caught instanceof AuthError && caught.sessionEnd) return onBlocked(caught.sessionEnd);
      setError((caught as Error).message);
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <div className="auth-badge">
        <KeyRound size={20} />
      </div>
      <h2>تسجيل الدخول</h2>
      <p className="auth-sub">أدخل رقم ID والرمز اللذين استلمتهما من المشرف.</p>
      <form onSubmit={submit} className="auth-form">
        <label className="auth-field">
          <span>رقم ID</span>
          <div className="auth-input">
            <IdCard size={17} />
            <input
              dir="ltr"
              inputMode="numeric"
              autoComplete="username"
              placeholder="000000"
              maxLength={6}
              value={id}
              autoFocus
              required
              onChange={(event) => setId(event.target.value.replace(/\D/g, ""))}
            />
          </div>
        </label>
        <PasswordInput
          label="الرمز"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        {!authConfigured && (
          <p className="auth-error">
            لم يتم ربط Supabase بعد. أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف .env
          </p>
        )}
        {error && <p className="auth-error">{error}</p>}
        <button
          className="auth-submit"
          disabled={busy || !id || !password || !authConfigured}
        >
          {busy ? <LoaderCircle className="auth-spin" size={18} /> : <>دخول <ArrowLeft size={17} /></>}
        </button>
      </form>
      <p className="auth-note">
        <ShieldCheck size={15} />
        لا يوجد تسجيل حساب جديد؛ الحسابات تُنشأ من المشرف فقط.
      </p>
    </AuthShell>
  );
}

const sessionEndCopy: Record<
  SessionEnd["code"],
  { title: string; icon: ReactNode; fallback: string }
> = {
  session_replaced: {
    title: "تم طردك!",
    icon: <MonitorSmartphone size={20} />,
    fallback: "تم تسجيل الدخول من جهاز آخر على نفس الحساب.",
  },
  account_frozen: {
    title: "تم تجميد حسابك!",
    icon: <Snowflake size={20} />,
    fallback: "لم يُذكر سبب.",
  },
  account_suspended: {
    title: "تم إيقاف حسابك!",
    icon: <PauseCircle size={20} />,
    fallback: "لم يُذكر سبب.",
  },
  account_banned: {
    title: "تم حظر حسابك!",
    icon: <Ban size={20} />,
    fallback: "لم يُذكر سبب.",
  },
};

function SessionEndedPage({ end, onBack }: { end: SessionEnd; onBack: () => void }) {
  const copy = sessionEndCopy[end.code] ?? sessionEndCopy.session_replaced;
  const reason = end.code === "session_replaced" ? copy.fallback : end.reason?.trim() || copy.fallback;
  return (
    <AuthShell>
      <div className="auth-badge danger">{copy.icon}</div>
      <h2>{copy.title}</h2>
      <div className="auth-reason" role="alert">
        <strong>السبب:</strong>
        <p>{reason}</p>
      </div>
      <button className="auth-submit" onClick={onBack}>
        العودة إلى تسجيل الدخول <ArrowLeft size={17} />
      </button>
    </AuthShell>
  );
}

function ChangePasswordPage({
  account,
  onDone,
  onLogout,
}: {
  account: Account;
  onDone: (account: Account) => void;
  onLogout: () => void;
}) {
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const rules = [
    { ok: password.length >= 8, label: "8 أحرف على الأقل" },
    { ok: /[A-Z]/.test(password), label: "حرف إنجليزي كبير (A-Z)" },
    { ok: /[a-z]/.test(password), label: "حرف إنجليزي صغير (a-z)" },
    { ok: /[0-9]/.test(password), label: "رقم واحد على الأقل" },
    { ok: !!confirm && password === confirm, label: "التأكيد مطابق" },
  ];
  const valid = rules.every((rule) => rule.ok);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError("");
    try {
      onDone(await changePassword(password));
    } catch (caught) {
      setError((caught as Error).message);
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <div className="auth-badge">
        <LockKeyhole size={20} />
      </div>
      <h2>أنشئ كلمة مرور جديدة</h2>
      <p className="auth-sub">
        أهلًا{account.name ? ` ${account.name}` : ""}! هذا أول دخول للحساب{" "}
        <b dir="ltr">{account.id}</b>، اختر كلمة مرور خاصة بك للمتابعة.
      </p>
      <form onSubmit={submit} className="auth-form">
        <PasswordInput
          label="كلمة المرور الجديدة"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          autoFocus
        />
        <PasswordInput
          label="تأكيد كلمة المرور"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        <ul className="auth-rules">
          {rules.map((rule) => (
            <li key={rule.label} className={rule.ok ? "ok" : ""}>
              <Check size={13} />
              {rule.label}
            </li>
          ))}
        </ul>
        {error && <p className="auth-error">{error}</p>}
        <button className="auth-submit" disabled={busy || !valid}>
          {busy ? <LoaderCircle className="auth-spin" size={18} /> : "حفظ والمتابعة"}
        </button>
      </form>
      <button className="auth-link" onClick={onLogout}>
        <LogOut size={15} />
        تسجيل الخروج
      </button>
    </AuthShell>
  );
}
