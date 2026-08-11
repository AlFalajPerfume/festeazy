/* eslint-disable */
"use client";

import {
  clearAdminContextCache,
  getAdminContext,
} from "@/lib/admin-context";
import { supabase } from "@/lib/supabase";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

function clearStoredAdminData() {
  if (typeof window === "undefined") return;

  localStorage.removeItem("festeazy_admin");
  localStorage.removeItem("festeazy_role");
  localStorage.removeItem("festeazy_organization_id");
  clearAdminContextCache();
}

function storeAdminData(context: {
  role: string;
  organizationId: string;
}) {
  if (typeof window === "undefined") return;

  localStorage.setItem("festeazy_admin", "true");
  localStorage.setItem("festeazy_role", context.role || "admin");
  localStorage.setItem(
    "festeazy_organization_id",
    context.organizationId,
  );
}

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    void checkExistingSession();
  }, []);

  async function goToDashboard(context: {
    role: string;
    organizationId: string;
  }) {
    storeAdminData(context);
    const destination =
      String(context.role || "").toLowerCase() === "green_room_operator"
        ? "/admin/green-room"
        : "/admin/dashboard";
    router.replace(destination);
    router.refresh();
  }

  async function checkExistingSession() {
    setError("");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      setError("Unable to check your login session. Please try again.");
      setIsChecking(false);
      return;
    }

    if (!session?.user) {
      clearStoredAdminData();
      setIsChecking(false);
      return;
    }

    const { context, error: contextError } = await getAdminContext({
      forceRefresh: true,
    });

    if (contextError || !context) {
      await supabase.auth.signOut({
  scope: "local",
});
      clearStoredAdminData();
      setError(
        contextError ||
          "This login is not connected to an active institution.",
      );
      setIsChecking(false);
      return;
    }

    await goToDashboard(context);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    setError("");

    if (!normalizedEmail) {
      setError("Please enter the admin email.");
      return;
    }

    if (!password) {
      setError("Please enter the password.");
      return;
    }

    setIsLoggingIn(true);
    clearAdminContextCache();

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

      if (loginError || !data.user) {
        setError("Invalid email or password.");
        return;
      }

      const { context, error: contextError } = await getAdminContext({
        forceRefresh: true,
      });

      if (contextError || !context) {
        await supabase.auth.signOut({
  scope: "local",
});
        clearStoredAdminData();
        setError(
          contextError ||
            "This login is not connected to an active institution. Please contact Festeazy support.",
        );
        return;
      }

      await goToDashboard(context);
    } catch (loginFailure) {
      console.error(loginFailure);
      setError("Login could not be completed. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f7ff] px-4">
        <div className="flex items-center gap-3 rounded-3xl border border-violet-100 bg-white px-6 py-4 text-sm font-black text-violet-900 shadow-xl shadow-slate-900/10">
          <Loader2 className="animate-spin" size={18} />
          Checking session...
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f7ff] px-4 py-8 text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(91,78,248,0.08)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-violet-300/25 blur-3xl" />
      <div className="absolute -right-24 bottom-8 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-64px)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-2xl shadow-slate-900/10 lg:grid-cols-[0.9fr_1fr]">
          <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-900 p-10 text-white lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-orange-300/20 blur-3xl" />

            <div className="relative flex h-full min-h-[520px] flex-col justify-between">
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-xl shadow-violet-950/30">
                  <img
                    src="/brand/festeazy-logo.png"
                    alt="Festeazy"
                    className="h-full w-full object-contain p-1.5"
                  />
                </div>

                <div>
                  <p className="text-2xl font-black tracking-[-0.06em]">
                    Fest<span className="text-violet-300">Eazy</span>
                  </p>
                  <p className="text-xs font-bold text-white/45">
                    Make your fest easy
                  </p>
                </div>
              </Link>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-violet-100">
                  <ShieldCheck size={15} />
                  Admin Portal
                </div>

                <h1 className="mt-6 max-w-md text-5xl font-black leading-[0.95] tracking-[-0.08em]">
                  Manage your fest with ease.
                </h1>

                <p className="mt-5 max-w-sm text-sm font-semibold leading-7 text-white/60">
                  Students, programmes, judging, results, posters, reports and
                  certificates in one clean workspace.
                </p>
              </div>

              <p className="text-xs font-bold text-white/35">
                Festeazy · Fest Management Suite
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md">
              <div className="lg:hidden">
                <Link href="/" className="inline-flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-violet-900/15 ring-1 ring-violet-100">
                    <img
                      src="/brand/festeazy-logo.png"
                      alt="Festeazy"
                      className="h-full w-full object-contain p-1"
                    />
                  </div>

                  <div>
                    <p className="text-xl font-black tracking-[-0.05em] text-slate-950">
                      Fest<span className="text-violet-600">Eazy</span>
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      Make your fest easy
                    </p>
                  </div>
                </Link>
              </div>

              <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-black text-violet-800 lg:mt-0">
                <ShieldCheck size={16} />
                Secure Admin Login
              </div>

              <h2 className="mt-5 text-4xl font-black tracking-[-0.06em] text-slate-950">
                Welcome back
              </h2>

              <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                Sign in to continue to your institution dashboard.
              </p>

              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="admin-email"
                    className="mb-2 block text-sm font-black text-slate-700"
                  >
                    Email
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="admin-email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      disabled={isLoggingIn}
                      className="h-14 w-full rounded-2xl border border-violet-100 bg-[#fbfaff] pl-11 pr-4 text-sm font-bold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Enter admin email"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="admin-password"
                    className="mb-2 block text-sm font-black text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="current-password"
                      disabled={isLoggingIn}
                      className="h-14 w-full rounded-2xl border border-violet-100 bg-[#fbfaff] pl-11 pr-12 text-sm font-bold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder="Enter password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      disabled={isLoggingIn}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingIn ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <ArrowRight size={18} />
                  )}
                  {isLoggingIn ? "Signing in..." : "Login"}
                </button>
              </form>

              <div className="mt-5">
                <Link
                  href="/"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-lg shadow-slate-900/5 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                >
                  Back to Home
                </Link>
              </div>

              <p className="mt-6 text-center text-xs font-bold text-slate-400">
                Authorized institution administrators only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}