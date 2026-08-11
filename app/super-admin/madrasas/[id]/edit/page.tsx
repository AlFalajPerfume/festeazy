/* eslint-disable */
"use client";

import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Eye,
  EyeOff,
  ExternalLink,
  GraduationCap,
  KeyRound,
  Landmark,
  Loader2,
  RefreshCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

type OrganizationType = "madrasa" | "school" | "institution";

type Organization = {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType | null;
  phone: string | null;
  email: string | null;
  place: string | null;
  status: string | null;
  plan_start: string | null;
  plan_end: string | null;
};

type EventInfo = {
  id: string;
  title: string;
  event_type: string | null;
  tagline: string | null;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
  public_slug: string;
  is_public: boolean;
};

const EVENT_TYPES = [
  { value: "meelad", label: "Meelad Programme" },
  { value: "arts_fest", label: "Arts Fest" },
  { value: "annual_day", label: "Annual Day" },
  { value: "competition", label: "General Competition" },
];

export default function EditOrganizationPage() {
  const params = useParams<{ id: string }>();
  const organizationId = String(params?.id || "");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [organizationType, setOrganizationType] =
    useState<OrganizationType>("madrasa");
  const [organizationName, setOrganizationName] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [place, setPlace] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("active");
  const [planStart, setPlanStart] = useState("");
  const [planEnd, setPlanEnd] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventType, setEventType] = useState("meelad");
  const [tagline, setTagline] = useState("");
  const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [hasActionPin, setHasActionPin] = useState(false);
  const [pinUpdatedAt, setPinUpdatedAt] = useState<string | null>(null);
  const [newActionPin, setNewActionPin] = useState("");
  const [confirmActionPin, setConfirmActionPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (organizationId) loadOrganization();
  }, [organizationId]);

  const organizationLabel = getOrganizationLabel(organizationType);
  const publicUrl = useMemo(() => {
    const slug = slugify(publicSlug) || "event";
    if (typeof window === "undefined") return `/event/${slug}`;
    return `${window.location.origin}/event/${slug}`;
  }, [publicSlug]);

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Super Admin session expired. Please login again.");
    }

    return session.access_token;
  }

  async function loadOrganization() {
    setIsLoading(true);
    setError("");

    try {
      const token = await getToken();
      const response = await fetch(
        `/api/super-admin/madrasas/${organizationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        },
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to load organization.");
      }

      const organization = payload.organization as Organization;
      const event = payload.event as EventInfo | null;

      setOrganizationType(normalizeType(organization.organization_type));
      setOrganizationName(organization.name || "");
      setPublicSlug(event?.public_slug || organization.slug || "");
      setPlace(organization.place || "");
      setPhone(organization.phone || "");
      setEmail(organization.email || "");
      setStatus(organization.status || "active");
      setPlanStart(organization.plan_start || "");
      setPlanEnd(organization.plan_end || "");

      setEventTitle(event?.title || "Meelad Fest 2026");
      setEventType(event?.event_type || "meelad");
      setTagline(event?.tagline || "");
      setVenue(event?.venue || "");
      setStartDate(event?.start_date || "");
      setEndDate(event?.end_date || "");
      setIsPublic(event?.is_public ?? true);

      setHasActionPin(Boolean(payload.security?.hasActionPin));
      setPinUpdatedAt(payload.security?.pinUpdatedAt || null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load organization.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function setThreeMonthsFromToday() {
    const start = todayIso();
    setPlanStart(start);
    setPlanEnd(addMonths(start, 3));
  }

  function setThreeMonthsFromSelectedStart() {
    const start = planStart || todayIso();
    setPlanStart(start);
    setPlanEnd(addMonths(start, 3));
  }

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!organizationName.trim()) {
      setError(`${organizationLabel} name is required.`);
      return;
    }

    if (!slugify(publicSlug)) {
      setError("A valid public portal slug is required.");
      return;
    }

    if (!eventTitle.trim()) {
      setError("Event title is required.");
      return;
    }

    if (planStart && planEnd && planEnd < planStart) {
      setError("Plan end date cannot be before the plan start date.");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setError("Event end date cannot be before the event start date.");
      return;
    }

    if (newActionPin) {
      if (!/^\d{6}$/.test(newActionPin)) {
        setError("The new action PIN must contain exactly 6 digits.");
        return;
      }

      if (newActionPin !== confirmActionPin) {
        setError("The new action PIN confirmation does not match.");
        return;
      }
    }

    setIsSaving(true);

    try {
      const token = await getToken();
      const response = await fetch(
        `/api/super-admin/madrasas/${organizationId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organizationType,
            organizationName: organizationName.trim(),
            publicSlug: slugify(publicSlug),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            place: place.trim(),
            status,
            planStart,
            planEnd,
            eventTitle: eventTitle.trim(),
            eventType,
            tagline: tagline.trim(),
            venue: venue.trim(),
            startDate,
            endDate,
            isPublic,
            newActionPin: newActionPin || undefined,
          }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to save organization.");
      }

      setPublicSlug(payload.event?.public_slug || slugify(publicSlug));

      if (payload.actionPinChanged) {
        setHasActionPin(true);
        setPinUpdatedAt(new Date().toISOString());
        setNewActionPin("");
        setConfirmActionPin("");
      }

      setMessage(`${organizationLabel} settings saved successfully.`);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save organization.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-violet-700" size={36} />
          <p className="mt-4 text-sm font-black text-slate-600">
            Loading organization...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-700 text-white">
              {organizationType === "school" ? (
                <GraduationCap size={25} />
              ) : organizationType === "institution" ? (
                <Landmark size={25} />
              ) : (
                <Building2 size={25} />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black tracking-[-0.04em]">
                Edit Organization
              </p>
              <p className="truncate text-xs font-bold text-slate-500">
                {organizationName}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={loadOrganization}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
            >
              <RefreshCcw size={16} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/super-admin"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
            >
              <ArrowLeft size={17} />
              Back
            </Link>
          </div>
        </div>
      </header>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <form
          onSubmit={saveOrganization}
          className="mx-auto max-w-6xl space-y-6"
        >
          {error && <MessageBox tone="red">{error}</MessageBox>}
          {message && <MessageBox tone="green">{message}</MessageBox>}

          <SectionCard
            icon={<Building2 size={21} />}
            title="Organization Profile"
            subtitle="Set the organization type and public identity."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <TypeButton
                active={organizationType === "madrasa"}
                icon={<Building2 size={23} />}
                title="Madrasa"
                description="Category, Class and Team"
                onClick={() => setOrganizationType("madrasa")}
              />
              <TypeButton
                active={organizationType === "school"}
                icon={<GraduationCap size={23} />}
                title="School"
                description="Class, Division and House"
                onClick={() => setOrganizationType("school")}
              />
              <TypeButton
                active={organizationType === "institution"}
                icon={<Landmark size={23} />}
                title="Institution"
                description="Flexible academic structure"
                onClick={() => setOrganizationType("institution")}
              />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label={`${organizationLabel} Name *`}>
                <input
                  value={organizationName}
                  onChange={(event) => setOrganizationName(event.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Public Portal Slug *">
                <input
                  value={publicSlug}
                  onChange={(event) => setPublicSlug(slugify(event.target.value))}
                  className="form-input"
                />
              </Field>
              <Field label="Place">
                <input
                  value={place}
                  onChange={(event) => setPlace(event.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Phone">
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Organization Email">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Account Status">
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="form-input"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-violet-700">
                  Public Portal
                </p>
                <p className="mt-1 break-all text-sm font-black text-slate-800">
                  {publicUrl}
                </p>
              </div>
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-3 text-sm font-black text-white"
              >
                Open Portal
                <ExternalLink size={16} />
              </a>
            </div>
          </SectionCard>

          <SectionCard
            icon={<CalendarDays size={21} />}
            title="Single Event"
            subtitle="This workspace intentionally supports one event only."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Event Title *">
                <input
                  value={eventTitle}
                  onChange={(event) => setEventTitle(event.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Event Type">
                <select
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value)}
                  className="form-input"
                >
                  {EVENT_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tagline" className="md:col-span-2">
                <input
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Venue">
                <input
                  value={venue}
                  onChange={(event) => setVenue(event.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Public Portal Visibility">
                <select
                  value={isPublic ? "on" : "off"}
                  onChange={(event) => setIsPublic(event.target.value === "on")}
                  className="form-input"
                >
                  <option value="on">Enabled</option>
                  <option value="off">Disabled</option>
                </select>
              </Field>
              <Field label="Event Start Date">
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Event End Date">
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="form-input"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            icon={<ShieldCheck size={21} />}
            title="Plan & Access"
            subtitle="Only Super Admin can modify organization plan dates."
            accent="emerald"
          >
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={setThreeMonthsFromToday}
                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"
              >
                Set 3 Months from Today
              </button>
              <button
                type="button"
                onClick={setThreeMonthsFromSelectedStart}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700"
              >
                Recalculate from Start Date
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Plan Start Date">
                <input
                  type="date"
                  value={planStart}
                  onChange={(event) => setPlanStart(event.target.value)}
                  className="form-input"
                />
              </Field>
              <Field label="Plan End Date">
                <input
                  type="date"
                  value={planEnd}
                  onChange={(event) => setPlanEnd(event.target.value)}
                  className="form-input"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            icon={<KeyRound size={21} />}
            title="Secure Action PIN"
            subtitle="Used for organization backup downloads and workspace resets."
            accent="amber"
          >
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-amber-950">
                  {hasActionPin ? "Action PIN configured" : "Action PIN not configured"}
                </p>
                <p className="mt-1 text-xs font-bold text-amber-800">
                  {pinUpdatedAt
                    ? `Last changed ${formatDateTime(pinUpdatedAt)}`
                    : "Enter a new six-digit PIN below."}
                </p>
              </div>
              <span className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.13em] ${hasActionPin ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {hasActionPin ? "Protected" : "Required"}
              </span>
            </div>

            <p className="mt-4 text-xs font-bold leading-5 text-slate-500">
              Leave both fields empty to keep the current PIN. Existing PINs can
              never be displayed; they can only be replaced.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="New 6-Digit Action PIN">
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    value={newActionPin}
                    onChange={(event) =>
                      setNewActionPin(
                        event.target.value.replace(/\D/g, "").slice(0, 6),
                      )
                    }
                    placeholder="Leave empty to keep current PIN"
                    className="form-input pr-12 tracking-[0.25em]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((value) => !value)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm New Action PIN">
                <input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmActionPin}
                  onChange={(event) =>
                    setConfirmActionPin(
                      event.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  placeholder="Repeat new PIN"
                  className="form-input tracking-[0.25em]"
                />
              </Field>
            </div>
          </SectionCard>

          <div className="flex flex-col gap-3 rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-bold leading-5 text-slate-500">
              Saving updates the organization and its one event. It does not
              change administrator passwords.
            </p>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-700 px-6 text-sm font-black text-white disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </section>

      <style jsx global>{`
        .form-input {
          height: 56px;
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding-left: 1rem;
          padding-right: 1rem;
          font-size: 0.875rem;
          font-weight: 800;
          outline: none;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }
        .form-input:focus {
          border-color: rgb(167 139 250);
          box-shadow: 0 0 0 4px rgb(237 233 254);
        }
      `}</style>
    </main>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
  accent = "violet",
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
  accent?: "violet" | "amber" | "emerald";
}) {
  const color =
    accent === "amber"
      ? "bg-amber-100 text-amber-700"
      : accent === "emerald"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-violet-100 text-violet-700";

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${color}`}>
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-black tracking-[-0.04em]">{title}</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TypeButton({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${active ? "border-violet-400 bg-violet-50 ring-4 ring-violet-100" : "border-slate-200 bg-white hover:border-violet-300"}`}
    >
      <div className="text-violet-700">{icon}</div>
      <p className="mt-3 text-sm font-black">{title}</p>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
        {description}
      </p>
    </button>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function MessageBox({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "red" | "green";
}) {
  return (
    <div
      className={`rounded-2xl border px-5 py-4 text-sm font-bold ${tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
    >
      <div className="flex items-center gap-2">
        {tone === "green" ? <CheckCircle2 size={18} /> : null}
        {children}
      </div>
    </div>
  );
}

function normalizeType(value: OrganizationType | null): OrganizationType {
  if (value === "school") return "school";
  if (value === "institution") return "institution";
  return "madrasa";
}

function getOrganizationLabel(type: OrganizationType) {
  if (type === "school") return "School";
  if (type === "institution") return "Institution";
  return "Madrasa";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function todayIso() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addMonths(value: string, months: number) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
  ).getDate();
  date.setDate(Math.min(day, lastDay));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
