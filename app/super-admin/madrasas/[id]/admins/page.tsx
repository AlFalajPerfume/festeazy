/* eslint-disable */
"use client";

import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Save,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Organization = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  place: string | null;
  logo_url: string | null;
  status: string | null;
};

type OrganizationUser = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  email: string | null;
  created_at?: string | null;
};

type ApiPayload = {
  organization?: Organization;
  users?: OrganizationUser[];
  message?: string;
  error?: string;
};

export default function OrganizationUsersPage() {
  const params = useParams();
  const organizationIdParam = params?.id;
  const organizationId = Array.isArray(organizationIdParam)
    ? organizationIdParam[0]
    : organizationIdParam || "";

  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [mutatingId, setMutatingId] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);

  const [userEmail, setUserEmail] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userRole, setUserRole] = useState("admin");

  useEffect(() => {
    void checkAccessAndLoad();
  }, [organizationId]);

  const activeUsers = useMemo(
    () => users.filter((item) => item.is_active).length,
    [users],
  );

  const greenRoomOperators = useMemo(
    () =>
      users.filter(
        (item) =>
          String(item.role || "").toLowerCase() === "green_room_operator",
      ).length,
    [users],
  );

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Super Admin session expired. Please login again.");
    }

    return session.access_token;
  }

  async function checkAccessAndLoad() {
    setIsChecking(true);
    setIsLoading(true);
    setError("");
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsAllowed(false);
      setError("Please login from /super-admin first.");
      setIsChecking(false);
      setIsLoading(false);
      return;
    }

    const { data: superAdmin, error: roleError } = await supabase
      .from("super_admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError || !superAdmin) {
      setIsAllowed(false);
      setError("This account is not registered as a FestEazy Super Admin.");
      setIsChecking(false);
      setIsLoading(false);
      return;
    }

    setIsAllowed(true);
    setIsChecking(false);
    await loadData();
  }

  async function callUsersApi(
    method: "GET" | "POST" | "PATCH" | "DELETE",
    body?: Record<string, unknown>,
  ) {
    const accessToken = await getAccessToken();

    const response = await fetch(
      `/api/super-admin/madrasas/${organizationId}/users`,
      {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      },
    );

    const payload = (await response.json().catch(() => null)) as ApiPayload | null;

    if (!response.ok) {
      throw new Error(payload?.error || "Unable to manage organization users.");
    }

    return payload || {};
  }

  async function loadData() {
    setIsLoading(true);
    setError("");

    if (!organizationId) {
      setError("Organization ID is missing.");
      setIsLoading(false);
      return;
    }

    try {
      const payload = await callUsersApi("GET");
      setOrganization(payload.organization || null);
      setUsers(payload.users || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load organization users.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function createOrLinkUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const email = userEmail.trim().toLowerCase();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError("Enter a valid user email address.");
      return;
    }

    if (temporaryPassword && temporaryPassword.length < 8) {
      setError("Temporary password must contain at least 8 characters.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = await callUsersApi("POST", {
        email,
        password: temporaryPassword,
        role: userRole,
      });

      setUserEmail("");
      setTemporaryPassword("");
      setUserRole("admin");
      setMessage(payload.message || "Organization user saved successfully.");
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the organization user.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleUser(user: OrganizationUser) {
    setError("");
    setMessage("");
    setMutatingId(user.id);

    try {
      const payload = await callUsersApi("PATCH", {
        linkId: user.id,
        isActive: !user.is_active,
      });

      setMessage(payload.message || "User access updated.");
      await loadData();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Unable to update user access.",
      );
    } finally {
      setMutatingId("");
    }
  }

  async function removeUser(user: OrganizationUser) {
    const confirmed = confirm(
      `Remove organization access for ${user.email || "this user"}? The Supabase Authentication login will not be deleted.`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setMutatingId(user.id);

    try {
      const payload = await callUsersApi("DELETE", {
        linkId: user.id,
      });

      setMessage(payload.message || "Organization access removed.");
      await loadData();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove organization access.",
      );
    } finally {
      setMutatingId("");
    }
  }

  function formatDate(value: string | null | undefined) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getRoleLabel(role: string | null | undefined) {
    const normalized = String(role || "admin").toLowerCase();
    if (normalized === "green_room_operator") return "Green Room Operator";
    if (normalized === "madrasa_admin") return "Madrasa Admin";
    if (normalized === "manager") return "Manager";
    if (normalized === "viewer") return "Viewer";
    if (normalized === "super_admin") return "Super Admin";
    return "Admin";
  }

  if (isChecking || isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="rounded-[2rem] border border-white/10 bg-white/10 p-8 text-center text-white shadow-2xl backdrop-blur">
          <Loader2 className="mx-auto animate-spin text-violet-300" size={38} />
          <h1 className="mt-5 text-2xl font-black tracking-[-0.05em]">
            Loading Organization Users
          </h1>
          <p className="mt-2 text-sm font-bold text-white/50">
            Checking access and loading user accounts.
          </p>
        </div>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl">
          <ShieldCheck className="mx-auto text-red-600" size={42} />
          <h1 className="mt-5 text-2xl font-black tracking-[-0.05em] text-slate-950">
            Access Denied
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
            {error}
          </p>
          <Link
            href="/super-admin"
            className="mt-6 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Go to Super Admin
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-700 text-white shadow-lg shadow-violet-900/20">
              <Users size={25} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-[-0.04em] text-slate-950">
                Manage Organization Users
              </p>
              <p className="truncate text-xs font-bold text-slate-500">
                {organization?.name || "Organization"}
              </p>
            </div>
          </div>

          <Link
            href="/super-admin"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft size={17} />
            Back
          </Link>
        </div>
      </header>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
              <CheckCircle2 size={18} />
              {message}
            </div>
          )}

          <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-6 text-white shadow-2xl shadow-slate-900/20 sm:p-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-violet-100">
                  <Building2 size={15} />
                  Organization User Access
                </div>
                <h1 className="mt-5 text-4xl font-black tracking-[-0.08em] sm:text-5xl">
                  {organization?.name}
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-white/60 sm:text-base">
                  Create full administrators or restricted Green Room operators.
                  Every login remains connected only to this organization.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <SummaryStat value={users.length} label="Total Users" />
                <SummaryStat value={activeUsers} label="Active" />
                <SummaryStat value={greenRoomOperators} label="Green Room" />
              </div>
            </div>
          </div>

          <form
            onSubmit={createOrLinkUser}
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-6"
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <UserPlus size={20} />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                  Add Organization User
                </h2>
                <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                  Enter a password to create a new login. Leave it blank only
                  when the email already exists in Supabase Authentication.
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px_auto] lg:items-end">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  User Email
                </label>
                <div className="relative mt-2">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(event) => setUserEmail(event.target.value)}
                    placeholder="user@example.com"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Temporary Password
                </label>
                <div className="relative mt-2">
                  <KeyRound
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={temporaryPassword}
                    onChange={(event) => setTemporaryPassword(event.target.value)}
                    placeholder="Required for new login"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-12 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Role
                </label>
                <select
                  value={userRole}
                  onChange={(event) => setUserRole(event.target.value)}
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="admin">Admin — Full Access</option>
                  <option value="green_room_operator">
                    Green Room Operator — Restricted
                  </option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet-700 px-6 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                Create / Link User
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <AccessNote
                title="Admin"
                description="Full organization admin panel access."
              />
              <AccessNote
                title="Green Room Operator"
                description="Only Green Room code generation, attendance and unlocked code reset."
              />
            </div>
          </form>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                Linked Organization Users
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Activate, deactivate or remove organization access. Removing
                access does not delete the Authentication login.
              </p>
            </div>

            {users.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <UserPlus className="mx-auto text-slate-400" size={36} />
                <p className="mt-4 text-lg font-black text-slate-900">
                  No users linked yet
                </p>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Create the first organization user above.
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {users.map((user) => {
                  const isMutating = mutatingId === user.id;
                  const isOperator =
                    String(user.role || "").toLowerCase() ===
                    "green_room_operator";

                  return (
                    <article
                      key={user.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                              user.is_active
                                ? isOperator
                                  ? "bg-violet-50 text-violet-700"
                                  : "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {user.is_active ? (
                              isOperator ? (
                                <ShieldCheck size={22} />
                              ) : (
                                <UserCheck size={22} />
                              )
                            ) : (
                              <UserX size={22} />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-slate-950">
                              {user.email || "No email"}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              Role: {getRoleLabel(user.role)} • Added{" "}
                              {formatDate(user.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] ${
                              user.is_active
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-red-50 text-red-700 ring-1 ring-red-200"
                            }`}
                          >
                            {user.is_active ? "Active" : "Inactive"}
                          </span>

                          <button
                            type="button"
                            onClick={() => toggleUser(user)}
                            disabled={isMutating}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            {isMutating && <Loader2 className="animate-spin" size={14} />}
                            {user.is_active ? "Deactivate" : "Activate"}
                          </button>

                          <button
                            type="button"
                            onClick={() => removeUser(user)}
                            disabled={isMutating}
                            className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            <Trash2 size={14} />
                            Remove Access
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function SummaryStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[92px] rounded-2xl border border-white/10 bg-white/10 px-4 py-4">
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/50">
        {label}
      </p>
    </div>
  );
}

function AccessNote({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-black text-slate-800">{title}</p>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}
