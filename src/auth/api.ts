import { createClient } from "@supabase/supabase-js";

export type Account = {
  id: string;
  name: string | null;
  role: "admin" | "member";
  mustChangePassword: boolean;
};
export type MemberRow = Account & {
  locked: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};
export type Credentials = { id: string; name: string | null; password: string };

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined,
  key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const authConfigured = Boolean(url && key);
const client = authConfigured
  ? createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
const TOKEN_KEY = "math-space-session";

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
};
export class AuthError extends Error {}
function fail(code: string): never {
  throw new AuthError(messages[code] ?? "تعذّر الاتصال بالخادم، تحقق من الإنترنت وحاول مجددًا.");
}

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!client) fail("not_configured");
  const { data, error } = await client.rpc(name, args);
  if (error) {
    if (error.message === "not_authenticated") clearToken();
    fail(error.message);
  }
  return data as T;
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
    | { ok: false; error: string }
  >("app_login", { p_id: id.trim(), p_password: password });
  if (!result.ok) fail(result.error);
  localStorage.setItem(TOKEN_KEY, result.token);
  return result.account;
}
export async function restoreSession() {
  if (!client || !token()) return null;
  try {
    const account = await rpc<Account | null>("app_session", { p_token: token() });
    if (!account) clearToken();
    return account;
  } catch {
    return null;
  }
}
export async function logout() {
  const current = token();
  clearToken();
  if (current && client) await client.rpc("app_logout", { p_token: current });
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
