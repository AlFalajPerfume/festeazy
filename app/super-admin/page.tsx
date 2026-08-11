/* eslint-disable */
"use client";

import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Landmark,
  Loader2,
  LogOut,
  PencilLine,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type OrganizationType = "madrasa" | "school" | "institution";

type Organization = {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType | null;
  phone: string | null;
  email: string | null;
  place: string | null;
  logo_url: string | null;
  status: string | null;
  plan_start: string | null;
  plan_end: string | null;
  created_at: string | null;
};

type EventInfo = {
  id: string;
  organization_id: string;
  title: string;
  event_type: string | null;
  public_slug: string;
  is_public: boolean;
  updated_at: string | null;
  created_at: string | null;
};

type Row = {
  organization: Organization;
  event: EventInfo | null;
};

type PlanStatus = {
  label: string;
  detail: string;
  tone: "green" | "amber" | "red" | "slate";
  status: "active" | "expiring" | "expired" | "none" | "invalid";
};

export default function SuperAdminDashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [superAdminEmail, setSuperAdminEmail] = useState("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [events, setEvents] = useState<EventInfo[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const rows = useMemo<Row[]>(() => {
    return organizations.map((organization) => ({
      organization,
      event:
        events.find((event) => event.organization_id === organization.id) || null,
    }));
  }, [organizations, events]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return rows;

    return rows.filter(({ organization, event }) =>
      [
        organization.name,
        organization.slug,
        organization.place,
        organization.phone,
        organization.email,
        organization.organization_type,
        event?.title,
        event?.public_slug,
      ]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(keyword)),
    );
  }, [rows, search]);

  const activeCount = organizations.filter(
    (item) => String(item.status || "active").toLowerCase() === "active",
  ).length;
  const inactiveCount = organizations.length - activeCount;
  const publicPortalCount = events.filter((event) => event.is_public).length;
  const attentionCount = organizations.filter((organization) => {
    const plan = getPlanStatus(organization);
    return (
      String(organization.status || "active").toLowerCase() !== "active" ||
      plan.status === "expired" ||
      plan.status === "expiring"
    );
  }).length;

  async function checkSuperAdmin() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return null;

    const { data: superAdmin, error: roleError } = await supabase
      .from("super_admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError || !superAdmin) return null;
    return user;
  }

  async function loadDashboard() {
    setIsLoading(true);
    setError("");

    const user = await checkSuperAdmin();

    if (!user) {
      setIsAllowed(false);
      setShowLogin(true);
      setIsLoading(false);
      return;
    }

    setIsAllowed(true);
    setShowLogin(false);
    setSuperAdminEmail(String(user.email || ""));

    const [orgRes, eventRes] = await Promise.all([
      supabase
        .from("organizations")
        .select(
          "id, name, slug, organization_type, phone, email, place, logo_url, status, plan_start, plan_end, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("events")
        .select(
          "id, organization_id, title, event_type, public_slug, is_public, updated_at, created_at",
        )
        .order("created_at", { ascending: false }),
    ]);

    if (orgRes.error) {
      setError(orgRes.error.message);
      setIsLoading(false);
      return;
    }

    if (eventRes.error) {
      setError(eventRes.error.message);
      setIsLoading(false);
      return;
    }

    setOrganizations((orgRes.data || []) as Organization[]);
    setEvents((eventRes.data || []) as EventInfo[]);
    setIsLoading(false);
  }

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setError("");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim().toLowerCase(),
      password: loginPassword,
    });

    if (loginError) {
      setError(loginError.message);
      setIsLoggingIn(false);
      return;
    }

    const user = await checkSuperAdmin();

    if (!user) {
      await supabase.auth.signOut({
  scope: "local",
});
      setError("This account is not registered as a FestEazy Super Admin.");
      setIsLoggingIn(false);
      return;
    }

    setIsLoggingIn(false);
    await loadDashboard();
  }

  async function logout() {
    await supabase.auth.signOut({
  scope: "local",
});
    setIsAllowed(false);
    setShowLogin(true);
    setOrganizations([]);
    setEvents([]);
    setSuperAdminEmail("");
    setLoginPassword("");
  }

  function openDelete(organization: Organization) {
    setDeleteTarget(organization);
    setDeleteName("");
    setDeleteAcknowledged(false);
    setError("");
    setMessage("");
  }

  async function deleteOrganization() {
    if (!deleteTarget) return;

    const matches =
      deleteName.trim().toLowerCase() === deleteTarget.name.trim().toLowerCase();

    if (!matches || !deleteAcknowledged) {
      setError(
        `Type ${deleteTarget.name} exactly and confirm permanent deletion.`,
      );
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Super Admin session expired. Please login again.");
      }

      const response = await fetch(
        `/api/super-admin/madrasas/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ confirmationName: deleteTarget.name }),
        },
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Deletion failed.");

      const deletedId = deleteTarget.id;
      const deletedName = deleteTarget.name;

      setOrganizations((current) =>
        current.filter((item) => item.id !== deletedId),
      );
      setEvents((current) =>
        current.filter((item) => item.organization_id !== deletedId),
      );
      setDeleteTarget(null);
      setMessage(`${deletedName} was permanently deleted.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Organization deletion failed.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function getPublicUrl(slug: string | null | undefined) {
    if (!slug) return "";
    if (typeof window === "undefined") return `/event/${slug}`;
    return `${window.location.origin}/event/${slug}`;
  }

  if (isLoading) {
    return (
      <CenteredScreen>
        <Loader2 className="animate-spin text-violet-600" size={36} />
        <h1 className="mt-4 text-2xl font-black">Loading Super Admin</h1>
      </CenteredScreen>
    );
  }

  if (showLogin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
        <form
          onSubmit={login}
          className="w-full max-w-md rounded-[2rem] bg-white p-7 shadow-2xl sm:p-8"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-700 text-white">
            <ShieldCheck size={31} />
          </div>
          <h1 className="mt-6 text-center text-3xl font-black tracking-[-0.06em]">
            Super Admin Login
          </h1>
          <p className="mt-2 text-center text-sm font-bold text-slate-500">
            Access the FestEazy organization control centre.
          </p>

          {error && <ErrorBox className="mt-5">{error}</ErrorBox>}

          <label className="mt-6 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
            Email
          </label>
          <input
            type="email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            required
          />

          <label className="mt-4 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
            Password
          </label>
          <input
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
            required
          />

          <button
            type="submit"
            disabled={isLoggingIn}
            className="mt-6 inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 text-sm font-black text-white disabled:opacity-60"
          >
            {isLoggingIn ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
            Login
          </button>
        </form>
      </main>
    );
  }

  if (!isAllowed) return null;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-700 text-white">
              <ShieldCheck size={25} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-[-0.04em]">
                FestEazy Super Admin
              </p>
              <p className="truncate text-xs font-bold text-slate-500">
                {superAdminEmail}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
            >
              <RefreshCcw size={16} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-black text-white"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {error && <ErrorBox>{error}</ErrorBox>}
          {message && (
            <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
              <CheckCircle2 size={18} />
              {message}
            </div>
          )}

          <div className="rounded-[2rem] bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 p-6 text-white shadow-2xl sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-200">
                  Single-event organization control
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-[-0.08em] sm:text-6xl">
                  Organization Management
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-white/60">
                  Manage Madrasas, Schools and Institutions, their one event,
                  three-month plans, administrators and public portals.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/super-admin/madrasas/new"
                  className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-5 py-3 text-sm font-black text-white"
                >
                  <Building2 size={17} />
                  Add Organization
                </Link>
                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"
                >
                  Open Admin
                  <ExternalLink size={16} />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Metric label="Organizations" value={organizations.length} icon={<Building2 size={20} />} />
            <Metric label="Active" value={activeCount} icon={<CheckCircle2 size={20} />} />
            <Metric label="Inactive" value={inactiveCount} icon={<XCircle size={20} />} />
            <Metric label="Need Attention" value={attentionCount} icon={<AlertTriangle size={20} />} />
            <Metric label="Public Portals" value={publicPortalCount} icon={<ExternalLink size={20} />} />
          </div>

          <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em]">
                  All Organizations
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Each organization has one event and one public portal.
                </p>
              </div>
              <div className="relative w-full lg:max-w-sm">
                <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, type, place or phone..."
                  className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {filteredRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500">
                  No organization found.
                </div>
              ) : (
                filteredRows.map(({ organization, event }) => (
                  <OrganizationCard
                    key={organization.id}
                    organization={organization}
                    event={event}
                    plan={getPlanStatus(organization)}
                    publicUrl={getPublicUrl(event?.public_slug)}
                    onDelete={() => openDelete(organization)}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      </section>

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-red-600">
                  Permanent deletion
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
                  Delete {deleteTarget.name}?
                </h2>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
              This permanently removes the organization, event, users' access,
              students, results, reports, posters and related records.
            </div>

            <label className="mt-5 block text-xs font-black uppercase tracking-[0.15em] text-slate-500">
              Type the organization name
            </label>
            <input
              value={deleteName}
              onChange={(event) => setDeleteName(event.target.value)}
              placeholder={deleteTarget.name}
              className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
            />

            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={deleteAcknowledged}
                onChange={(event) => setDeleteAcknowledged(event.target.checked)}
                className="mt-0.5 h-5 w-5 accent-red-600"
              />
              <span className="text-sm font-bold leading-6 text-slate-700">
                I understand that this operation cannot be undone.
              </span>
            </label>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="h-13 rounded-2xl border border-slate-200 text-sm font-black text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={deleteOrganization}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-red-600 text-sm font-black text-white disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function OrganizationCard({
  organization,
  event,
  plan,
  publicUrl,
  onDelete,
}: {
  organization: Organization;
  event: EventInfo | null;
  plan: PlanStatus;
  publicUrl: string;
  onDelete: () => void;
}) {
  const type = normalizeType(organization.organization_type);
  const meta = getTypeMeta(type);
  const statusActive = String(organization.status || "active").toLowerCase() === "active";

  return (
    <article className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt="" className="h-full w-full object-contain p-1.5" />
              ) : (
                meta.icon
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-xl font-black tracking-[-0.04em]">
                  {organization.name}
                </h3>
                <Badge tone="violet">{meta.label}</Badge>
                <Badge tone={statusActive ? "green" : "red"}>
                  {statusActive ? "Active" : "Inactive"}
                </Badge>
                <Badge tone={plan.tone}>{plan.label}</Badge>
              </div>

              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <Info label="Place" value={organization.place || "Not added"} />
                <Info label="Phone" value={organization.phone || "Not added"} />
                <Info label="Email" value={organization.email || "Not added"} />
                <Info label="Slug" value={organization.slug} />
              </div>

              <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
                <Info label="Current Event" value={event?.title || "Event not found"} />
                <Info label="Public Portal" value={event ? `/event/${event.public_slug}` : "Not available"} />
                <Info label="Plan" value={plan.detail} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid content-start gap-2">
          <Link
            href={`/super-admin/madrasas/${organization.id}/edit`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700"
          >
            <PencilLine size={16} />
            Edit Organization
          </Link>
          <Link
            href={`/super-admin/madrasas/${organization.id}/admins`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 text-sm font-black text-violet-700"
          >
            <Users size={16} />
            Manage Users
          </Link>
          {publicUrl ? (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-700 text-sm font-black text-white"
            >
              Open Public Portal
              <ExternalLink size={16} />
            </a>
          ) : null}
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 text-xs font-black text-red-700"
          >
            <Trash2 size={15} />
            Delete Organization
          </button>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-5">
      <div className="text-violet-700">{icon}</div>
      <p className="mt-3 text-3xl font-black tracking-[-0.07em]">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 truncate font-black text-slate-800" title={value}>{value}</p>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "amber" | "red" | "slate" | "violet" }) {
  const classes =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "violet"
            ? "border-violet-200 bg-violet-50 text-violet-700"
            : "border-slate-200 bg-slate-50 text-slate-600";

  return <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${classes}`}>{children}</span>;
}

function ErrorBox({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700 ${className}`}>{children}</div>;
}

function CenteredScreen({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4 text-center">{children}</main>;
}

function normalizeType(value: OrganizationType | null): OrganizationType {
  if (value === "school") return "school";
  if (value === "institution") return "institution";
  return "madrasa";
}

function getTypeMeta(type: OrganizationType) {
  if (type === "school") return { label: "School", icon: <GraduationCap size={25} className="text-violet-700" /> };
  if (type === "institution") return { label: "Institution", icon: <Landmark size={25} className="text-violet-700" /> };
  return { label: "Madrasa", icon: <Building2 size={25} className="text-violet-700" /> };
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getPlanStatus(organization: Organization): PlanStatus {
  if (!organization.plan_end) {
    return { label: "No Plan", detail: "Plan end not set", tone: "slate", status: "none" };
  }

  const end = new Date(`${organization.plan_end}T00:00:00`);
  if (Number.isNaN(end.getTime())) {
    return { label: "Invalid Plan", detail: "Check plan date", tone: "red", status: "invalid" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);

  if (days < 0) return { label: "Expired", detail: `Expired ${formatDate(organization.plan_end)}`, tone: "red", status: "expired" };
  if (days <= 7) return { label: days === 0 ? "Expires Today" : `${days} Days Left`, detail: `Ends ${formatDate(organization.plan_end)}`, tone: "amber", status: "expiring" };
  return { label: "Active Plan", detail: `Ends ${formatDate(organization.plan_end)}`, tone: "green", status: "active" };
}
