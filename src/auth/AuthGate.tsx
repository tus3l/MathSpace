import { useEffect, useLayoutEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  IdCard,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import App from "../App";
import { AdminDashboard } from "./AdminDashboard";
import {
  authConfigured,
  changePassword,
  login,
  logout,
  restoreSession,
} from "./api";
import type { Account } from "./api";
import "./auth.css";

export function AuthGate() {
  const [account, setAccount] = useState<Account | null>(null),
    [ready, setReady] = useState(false),
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
    restoreSession().then((restored) => {
      if (!active) return;
      setAccount(restored);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);
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
  if (!account)
    return (
      <LoginPage
        onLogin={(next) => {
          setAccount(next);
          setAdminView("dashboard");
        }}
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

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page">
      <section className="auth-hero" aria-hidden="true">
        <div className="auth-grid" />
        <div className="auth-orbit auth-orbit-a" />
        <div className="auth-orbit auth-orbit-b" />
        <span className="auth-formula f1" dir="ltr">∫ f(x) dx</span>
        <span className="auth-formula f2" dir="ltr">e^(iπ) + 1 = 0</span>
        <span className="auth-formula f3" dir="ltr">∇ · F</span>
        <span className="auth-formula f4" dir="ltr">Σ 1/n²</span>
        <span className="auth-formula f5" dir="ltr">lim x→0</span>
        <svg className="auth-wave" viewBox="0 0 600 200" preserveAspectRatio="none">
          <path d="M0 100 C 75 10, 150 10, 225 100 S 375 190, 450 100 S 560 20, 600 60" />
          <path d="M0 130 C 90 60, 160 60, 250 130 S 400 200, 480 120 S 570 80, 600 100" />
        </svg>
        <div className="auth-hero-text">
          <img src="/logo.png" alt="" />
          <h1>مختبر فضاء الرياضيات</h1>
          <p>ليس الناتج فقط. السبب أيضًا.</p>
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

function LoginPage({ onLogin }: { onLogin: (account: Account) => void }) {
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
