import { createClient } from "@supabase/supabase-js";

export type Account = {
  id: string;
  name: string | null;
  role: "admin" | "member";
  mustChangePassword: boolean;
};
export type AccountStatus = "active" | "frozen" | "suspended" | "banned";
export type MemberRow = Account & {
  locked: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  status: AccountStatus;
  statusReason: string | null;
  activeSession: {
    deviceLabel: string | null;
    createdAt: string;
    lastActivity: string;
  } | null;
};
export type Credentials = { id: string; name: string | null; password: string };
/** Reasons that end the current session and must be shown to the user on a dedicated page. */
export type SessionEnd = {
  code: "session_replaced" | "account_frozen" | "account_suspended" | "account_banned";
  reason: string | null;
};

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined,
  key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const authConfigured = Boolean(url && key);
const client = authConfigured
  ? createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
const TOKEN_KEY = "math-space-session",
  DEVICE_KEY = "math-space-device",
  ENDED_KEY = "math-space-session-ended";

const messages: Record<string, string> = {
  invalid_credentials: "رقم ID أو الرمز غير صحيح.",
  account_locked: "تم إيقاف المحاولات مؤقتًا بعد عدة محاولات خاطئة. حاول بعد 15 دقيقة.",
  not_authenticated: "انتهت الجلسة، سجّل الدخول من جديد.",
  weak_password:
    "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي حرفًا كبيرًا وحرفًا صغيرًا ورقمًا.",
  same_password: "اختر كلمة مرور مختلفة عن الرمز الحالي.",
  forbidden: "هذه الصفحة للمشرف فقط.",
  not_found: "الحساب غير موجود.",
  id_generation_failed: "تعذّر توليد رقم ID جديد، حاول مرة أخرى.",
  session_replaced: "تم تسجيل الدخول من جهاز آخر على نفس الحساب.",
  account_frozen: "تم تجميد حسابك.",
  account_suspended: "تم إيقاف حسابك.",
  account_banned: "تم حظر حسابك.",
  invalid_device: "تعذّر التعرف على الجهاز، حدّث الصفحة وحاول مجددًا.",
  cannot_change_self: "لا يمكنك تغيير حالة حسابك.",
  reason_required: "اكتب سبب الإجراء.",
  invalid_status: "حالة غير صالحة.",
  schema_outdated:
    "قاعدة البيانات غير محدّثة: شغّل ملف supabase/migrations/20261027190000_single_active_session.sql في SQL Editor.",
};
const sessionEndCodes = new Set<string>([
  "session_replaced",
  "account_frozen",
  "account_suspended",
  "account_banned",
]);
export class AuthError extends Error {
  readonly code: string;
  readonly reason: string | null;
  constructor(code: string, reason: string | null = null) {
    super(messages[code] ?? "تعذّر الاتصال بالخادم، تحقق من الإنترنت وحاول مجددًا.");
    this.code = code;
    this.reason = reason;
  }
  get sessionEnd(): SessionEnd | null {
    return sessionEndCodes.has(this.code)
      ? { code: this.code as SessionEnd["code"], reason: this.reason }
      : null;
  }
}
function fail(code: string, reason: string | null = null): never {
  throw new AuthError(code, reason);
}

type Listener = (end: SessionEnd | null) => void;
const listeners = new Set<Listener>();
/** Fires when the backend rejects the current session; `null` means a plain sign-out. */
export function onSessionEnded(listener: Listener) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
function endSession(end: SessionEnd | null) {
  clearToken();
  if (end) {
    try {
      sessionStorage.setItem(ENDED_KEY, JSON.stringify(end));
    } catch {
      /* Storage may be disabled by the browser. */
    }
  }
  listeners.forEach((listener) => listener(end));
}
/** The last forced sign-out, kept across reloads until the user returns to the login page. */
export function pendingSessionEnd(): SessionEnd | null {
  try {
    const raw = sessionStorage.getItem(ENDED_KEY);
    return raw ? (JSON.parse(raw) as SessionEnd) : null;
  } catch {
    return null;
  }
}
export function dismissSessionEnd() {
  try {
    sessionStorage.removeItem(ENDED_KEY);
  } catch {
    /* Storage may be disabled by the browser. */
  }
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!client) fail("not_configured");
  const { data, error } = await client.rpc(name, { ...args, p_device_id: deviceId() });
  if (error) {
    // PGRST202: the guarded RPCs are missing, i.e. the session migration was not applied.
    const failure = new AuthError(
      error.code === "PGRST202" ? "schema_outdated" : error.message,
      error.details || null,
    );
    if (failure.sessionEnd) endSession(failure.sessionEnd);
    else if (error.message === "not_authenticated") endSession(null);
    throw failure;
  }
  return data as T;
}

let memoryDeviceId = "";
/** Stable random identifier for this browser; the backend binds each session to it. */
function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY) ?? "";
    if (!/^[A-Za-z0-9-]{16,64}$/.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return (memoryDeviceId ||= crypto.randomUUID());
  }
}
function deviceLabel() {
  const ua = navigator.userAgent;
  const browser =
    /Edg\//.test(ua) ? "Edge"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Browser";
  const os =
    /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iPod/.test(ua) ? "iOS"
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : "";
  return os ? `${browser} · ${os}` : browser;
}
function token() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}
function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* Storage may be disabled by the browser. */
  }
}

export async function login(id: string, password: string) {
  const result = await rpc<
    | { ok: true; token: string; account: Account }
    | { ok: false; error: string; reason?: string | null }
  >("app_login", { p_id: id.trim(), p_password: password, p_device_label: deviceLabel() });
  if (!result.ok) fail(result.error, result.reason ?? null);
  dismissSessionEnd();
  localStorage.setItem(TOKEN_KEY, result.token);
  return result.account;
}
/**
 * Asks the backend whether this device still holds the account's active session.
 * Returns null when signed out; throws AuthError with `sessionEnd` set when kicked or blocked.
 */
export async function checkSession() {
  if (!client || !token()) return null;
  const account = await rpc<Account | null>("app_session", { p_token: token() });
  if (!account) endSession(null);
  return account;
}
export async function restoreSession() {
  try {
    return await checkSession();
  } catch (caught) {
    if (caught instanceof AuthError && caught.sessionEnd) throw caught;
    return null;
  }
}
export async function logout() {
  const current = token();
  clearToken();
  if (current && client)
    await client.rpc("app_logout", { p_token: current, p_device_id: deviceId() });
}
export const changePassword = (password: string) =>
  rpc<Account>("app_change_password", {
    p_token: token(),
    p_new_password: password,
  });
export const listAccounts = () =>
  rpc<MemberRow[]>("admin_list_accounts", { p_token: token() });
export const createAccount = (name: string) =>
  rpc<Credentials>("admin_create_account", { p_token: token(), p_name: name });
export const resetPassword = (id: string) =>
  rpc<Credentials>("admin_reset_password", { p_token: token(), p_id: id });
export const deleteAccount = (id: string) =>
  rpc<void>("admin_delete_account", { p_token: token(), p_id: id });
export const setAccountStatus = (id: string, status: AccountStatus, reason: string) =>
  rpc<{ id: string; status: AccountStatus; reason: string | null }>(
    "admin_set_account_status",
    { p_token: token(), p_id: id, p_status: status, p_reason: reason },
  );
