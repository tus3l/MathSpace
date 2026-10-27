import { useCallback, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Check,
  Copy,
  LayoutGrid,
  LoaderCircle,
  LogOut,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  UserCheck,
  Clock,
  X,
} from "lucide-react";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  resetPassword,
  setAccountStatus,
} from "./api";
import type { Account, AccountStatus, Credentials, MemberRow } from "./api";

const dateFormat = new Intl.DateTimeFormat("ar", {
  dateStyle: "medium",
  timeStyle: "short",
});
const statusLabels: Record<AccountStatus, string> = {
  active: "نشط",
  frozen: "مجمّد",
  suspended: "موقوف",
  banned: "محظور",
};

export function AdminDashboard({
  account,
  onOpenApp,
  onLogout,
}: {
  account: Account;
  onOpenApp: () => void;
  onLogout: () => void;
}) {
  const [rows, setRows] = useState<MemberRow[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [name, setName] = useState(""),
    [creating, setCreating] = useState(false),
    [issued, setIssued] = useState<(Credentials & { reset?: boolean }) | null>(null),
    [query, setQuery] = useState(""),
    [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listAccounts());
      setError("");
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    listAccounts()
      .then((data) => active && setRows(data))
      .catch((caught: Error) => active && setError(caught.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  async function create(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      setIssued(await createAccount(name));
      setName("");
      await refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setCreating(false);
    }
  }
  async function reset(row: MemberRow) {
    if (!confirm(`إعادة تعيين رمز الحساب ${row.id} إلى الرمز المؤقت؟`)) return;
    setBusyId(row.id);
    try {
      const result = await resetPassword(row.id);
      setIssued({ ...result, name: row.name, reset: true });
      await refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusyId(null);
    }
  }
  async function remove(row: MemberRow) {
    if (!confirm(`حذف الحساب ${row.id} نهائيًا؟`)) return;
    setBusyId(row.id);
    try {
      await deleteAccount(row.id);
      await refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function changeStatus(row: MemberRow, status: AccountStatus) {
    if (status === row.status) return;
    let reason = "";
    if (status !== "active") {
      const answer = prompt(`سبب ${statusLabels[status]} الحساب ${row.id}:`, row.statusReason ?? "");
      if (answer === null) return;
      reason = answer.trim();
      if (!reason) return setError("اكتب سبب الإجراء.");
    } else if (!confirm(`إعادة تفعيل الحساب ${row.id}؟`)) return;
    setBusyId(row.id);
    setError("");
    try {
      await setAccountStatus(row.id, status, reason);
      await refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const members = rows.filter((row) => row.role === "member"),
    active = members.filter((row) => !row.mustChangePassword).length,
    filtered = members.filter(
      (row) =>
        !query.trim() ||
        row.id.includes(query.trim()) ||
        row.name?.toLowerCase().includes(query.trim().toLowerCase()),
    );

  return (
    <div className="admin-page">
      <header className="admin-top">
        <div className="admin-brand">
          <img src="/logo.png" alt="" />
          <span>
            <strong>لوحة التحكم</strong>
            <small>مختبر فضاء الرياضيات</small>
          </span>
        </div>
        <div className="admin-top-actions">
          <span className="admin-chip">
            <ShieldCheck size={15} />
            المشرف <b dir="ltr">{account.id}</b>
          </span>
          <button className="admin-btn ghost" onClick={onOpenApp}>
            <LayoutGrid size={16} />
            فتح المختبر
          </button>
          <button className="admin-btn ghost" onClick={onLogout}>
            <LogOut size={16} />
            خروج
          </button>
        </div>
      </header>

      <main className="admin-main">
        <section className="admin-stats">
          <Stat icon={<Users size={20} />} label="إجمالي المشتركين" value={members.length} tone="accent" />
          <Stat icon={<UserCheck size={20} />} label="حسابات مفعّلة" value={active} tone="green" />
          <Stat icon={<Clock size={20} />} label="بانتظار أول دخول" value={members.length - active} tone="orange" />
        </section>

        <section className="admin-card admin-create">
          <div>
            <h2>
              <UserPlus size={18} /> إنشاء حساب مشترك
            </h2>
            <p>يُولَّد رقم ID عشوائي من 6 أرقام، والرمز المؤقت <b dir="ltr">Aa1234</b>. يُطلب من المشترك تغييره عند أول دخول.</p>
          </div>
          <form onSubmit={create}>
            <input
              placeholder="اسم المشترك (اختياري)"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
            />
            <button className="admin-btn primary" disabled={creating}>
              {creating ? <LoaderCircle className="auth-spin" size={16} /> : <UserPlus size={16} />}
              إنشاء حساب
            </button>
          </form>
          {issued && <IssuedCard credentials={issued} onClose={() => setIssued(null)} />}
        </section>

        {error && <p className="auth-error">{error}</p>}

        <section className="admin-card">
          <div className="admin-table-head">
            <h2>
              <Users size={18} /> المشتركون
            </h2>
            <div className="admin-search">
              <Search size={15} />
              <input
                placeholder="ابحث برقم ID أو الاسم"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <button className="admin-icon" title="تحديث" aria-label="تحديث" onClick={refresh}>
              <RefreshCw size={16} className={loading ? "auth-spin" : ""} />
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>رقم ID</th>
                  <th>الاسم</th>
                  <th>الحالة</th>
                  <th>الجلسة النشطة</th>
                  <th>تاريخ الإنشاء</th>
                  <th>آخر دخول</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td className="mono" dir="ltr">{row.id}</td>
                    <td>{row.name || <span className="muted">—</span>}</td>
                    <td>
                      {row.status && row.status !== "active" ? (
                        <span className="pill red" title={row.statusReason ?? undefined}>
                          {statusLabels[row.status]}
                        </span>
                      ) : row.locked ? (
                        <span className="pill red">مقفل مؤقتًا</span>
                      ) : row.mustChangePassword ? (
                        <span className="pill orange">بانتظار التفعيل</span>
                      ) : (
                        <span className="pill green">مفعّل</span>
                      )}
                    </td>
                    <td className="muted">
                      {row.activeSession ? (
                        <span title={`منذ ${dateFormat.format(new Date(row.activeSession.createdAt))}`}>
                          {row.activeSession.deviceLabel ?? "جهاز"} ·{" "}
                          {dateFormat.format(new Date(row.activeSession.lastActivity))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="muted">{dateFormat.format(new Date(row.createdAt))}</td>
                    <td className="muted">
                      {row.lastLoginAt ? dateFormat.format(new Date(row.lastLoginAt)) : "لم يدخل بعد"}
                    </td>
                    <td className="admin-row-actions">
                      <select
                        className="admin-status-select"
                        aria-label="حالة الحساب"
                        title="حالة الحساب"
                        value={row.status ?? "active"}
                        disabled={busyId === row.id}
                        onChange={(event) => changeStatus(row, event.target.value as AccountStatus)}
                      >
                        {(Object.keys(statusLabels) as AccountStatus[]).map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>
                      <button
                        className="admin-icon"
                        title="إعادة تعيين الرمز"
                        aria-label="إعادة تعيين الرمز"
                        disabled={busyId === row.id}
                        onClick={() => reset(row)}
                      >
                        <RotateCcw size={15} />
                      </button>
                      <button
                        className="admin-icon danger"
                        title="حذف الحساب"
                        aria-label="حذف الحساب"
                        disabled={busyId === row.id}
                        onClick={() => remove(row)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && !filtered.length && (
              <p className="admin-empty">
                {members.length ? "لا توجد نتائج مطابقة." : "لا يوجد مشتركون بعد. أنشئ أول حساب من الأعلى."}
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: "accent" | "green" | "orange";
}) {
  return (
    <div className={`admin-stat ${tone}`}>
      <span className="admin-stat-icon">{icon}</span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function IssuedCard({
  credentials,
  onClose,
}: {
  credentials: Credentials & { reset?: boolean };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const text = `رقم ID: ${credentials.id}\nالرمز: ${credentials.password}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard may be blocked; values remain visible. */
    }
  }
  return (
    <div className="admin-issued">
      <div className="admin-issued-head">
        <strong>
          <Check size={16} />
          {credentials.reset ? "تمت إعادة تعيين الرمز" : "تم إنشاء الحساب"}
          {credentials.name ? ` — ${credentials.name}` : ""}
        </strong>
        <button className="admin-icon" aria-label="إغلاق" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <div className="admin-issued-grid">
        <div>
          <small>رقم ID</small>
          <b dir="ltr">{credentials.id}</b>
        </div>
        <div>
          <small>الرمز المؤقت</small>
          <b dir="ltr">{credentials.password}</b>
        </div>
        <button className="admin-btn ghost" onClick={copy}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "تم النسخ" : "نسخ البيانات"}
        </button>
      </div>
    </div>
  );
}
