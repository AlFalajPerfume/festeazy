/* eslint-disable */
"use client";

import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Globe2,
  GraduationCap,
  KeyRound,
  Landmark,
  Loader2,
  Lock,
  Save,
  ShieldCheck,
  UserCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";

type OrganizationType = "madrasa" | "school" | "institution";

const EVENT_TYPES = [
  { value: "meelad", label: "Meelad Programme" },
  { value: "arts_fest", label: "Arts Fest" },
  { value: "annual_day", label: "Annual Day" },
  { value: "competition", label: "General Competition" },
];

export default function NewOrganizationPage() {
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [organizationType, setOrganizationType] =
    useState<OrganizationType>("madrasa");
  const [organizationName, setOrganizationName] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [place, setPlace] = useState("");
  const [phone, setPhone] = useState("");

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [showAdditionalAccess, setShowAdditionalAccess] = useState(false);
  const [createGreenRoomOperator, setCreateGreenRoomOperator] = useState(false);
  const [operatorEmail, setOperatorEmail] = useState("");
  const [operatorPassword, setOperatorPassword] = useState("");
  const [showOperatorPassword, setShowOperatorPassword] = useState(false);

  const [actionPin, setActionPin] = useState("");
  const [confirmActionPin, setConfirmActionPin] = useState("");
  const [showPin, setShowPin] = useState(false);

  const [eventTitle, setEventTitle] = useState("Meelad Fest 2026");
  const [eventType, setEventType] = useState("meelad");
  const [tagline, setTagline] = useState(
    "Celebrating knowledge, talent and tradition",
  );
  const [venue, setVenue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [planStart, setPlanStart] = useState(todayIso());
  const planEnd = useMemo(() => addMonths(planStart, 3), [planStart]);

  const [created, setCreated] = useState<{
    name: string;
    slug: string;
    adminEmail: string;
    operatorEmail: string | null;
    planStart: string;
    planEnd: string;
  } | null>(null);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const organizationLabel = getOrganizationLabel(organizationType);
  const publicUrl = useMemo(() => {
    const slug = created?.slug || slugify(publicSlug) || "your-event";
    if (typeof window === "undefined") return `/event/${slug}`;
    return `${window.location.origin}/event/${slug}`;
  }, [publicSlug, created]);

  async function checkSuperAdmin() {
    setIsChecking(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please login through the Super Admin page first.");
      setIsAllowed(false);
      setIsChecking(false);
      return;
    }

    const { data: superAdmin, error: roleError } = await supabase
      .from("super_admins")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError || !superAdmin) {
      setError("This account is not registered as a FestEazy Super Admin.");
      setIsAllowed(false);
      setIsChecking(false);
      return;
    }

    setIsAllowed(true);
    setIsChecking(false);
  }

  function updateOrganizationName(value: string) {
    setOrganizationName(value);
    if (!slugEdited) setPublicSlug(slugify(value));
  }

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setCreated(null);

    if (!organizationName.trim()) {
      setError(`${organizationLabel} name is required.`);
      return;
    }

    if (!adminEmail.trim()) {
      setError("Administrator email is required.");
      return;
    }

    if (adminPassword.length < 8) {
      setError("Administrator password must have at least 8 characters.");
      return;
    }

    if (createGreenRoomOperator) {
      const normalizedOperatorEmail = operatorEmail.trim().toLowerCase();

      if (
        !normalizedOperatorEmail ||
        !/^\S+@\S+\.\S+$/.test(normalizedOperatorEmail)
      ) {
        setError("Enter a valid Green Room operator email.");
        return;
      }

      if (normalizedOperatorEmail === adminEmail.trim().toLowerCase()) {
        setError(
          "Green Room operator email must be different from the administrator email.",
        );
        return;
      }

      if (operatorPassword.length < 8) {
        setError("Green Room operator password must have at least 8 characters.");
        return;
      }
    }

    if (!/^\d{6}$/.test(actionPin)) {
      setError("Secure action PIN must contain exactly 6 digits.");
      return;
    }

    if (actionPin !== confirmActionPin) {
      setError("The secure action PIN confirmation does not match.");
      return;
    }

    if (!eventTitle.trim()) {
      setError("Event title is required.");
      return;
    }

    if (startDate && endDate && endDate < startDate) {
      setError("Event end date cannot be before the start date.");
      return;
    }

    setIsSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Super Admin session expired. Please login again.");
      }

      const response = await fetch("/api/super-admin/create-madrasa", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationType,
          organizationName: organizationName.trim(),
          publicSlug: slugify(publicSlug || organizationName),
          place: place.trim(),
          phone: phone.trim(),
          adminEmail: adminEmail.trim().toLowerCase(),
          adminPassword,
          createGreenRoomOperator,
          operatorEmail: createGreenRoomOperator
            ? operatorEmail.trim().toLowerCase()
            : "",
          operatorPassword: createGreenRoomOperator ? operatorPassword : "",
          actionPin,
          eventTitle: eventTitle.trim(),
          eventType,
          tagline: tagline.trim(),
          venue: venue.trim(),
          startDate,
          endDate,
          planStart,
          planEnd,
          status: "active",
          isPublic,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "Organization creation failed.");
      }

      setCreated({
        name: payload.organization.name,
        slug: payload.event.public_slug,
        adminEmail: payload.admin.email,
        operatorEmail: payload.operator?.email || null,
        planStart: payload.plan.start,
        planEnd: payload.plan.end,
      });
      setMessage(`${organizationLabel} workspace created successfully.`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Organization creation failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function resetForm() {
    setOrganizationType("madrasa");
    setOrganizationName("");
    setPublicSlug("");
    setSlugEdited(false);
    setPlace("");
    setPhone("");
    setAdminEmail("");
    setAdminPassword("");
    setShowAdditionalAccess(false);
    setCreateGreenRoomOperator(false);
    setOperatorEmail("");
    setOperatorPassword("");
    setShowOperatorPassword(false);
    setActionPin("");
    setConfirmActionPin("");
    setEventTitle("Meelad Fest 2026");
    setEventType("meelad");
    setTagline("Celebrating knowledge, talent and tradition");
    setVenue("");
    setStartDate("");
    setEndDate("");
    setIsPublic(true);
    setPlanStart(todayIso());
    setCreated(null);
    setMessage("");
    setError("");
  }

  async function copyPublicUrl() {
    await navigator.clipboard.writeText(publicUrl);
    setMessage("Public portal URL copied.");
  }

  if (isChecking) {
    return <LoadingScreen text="Checking Super Admin access..." />;
  }

  if (!isAllowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="max-w-md rounded-[2rem] bg-white p-8 text-center shadow-2xl">
          <ShieldCheck className="mx-auto text-red-600" size={42} />
          <h1 className="mt-5 text-2xl font-black">Access Denied</h1>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
            {error}
          </p>
          <Link
            href="/super-admin"
            className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white"
          >
            Return to Super Admin
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-700 text-white">
              <Building2 size={25} />
            </div>
            <div>
              <p className="text-lg font-black tracking-[-0.04em]">
                Create Organization
              </p>
              <p className="text-xs font-bold text-slate-500">
                One organization, one event and a three-month plan.
              </p>
            </div>
          </div>
          <Link
            href="/super-admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
          >
            <ArrowLeft size={17} />
            Back
          </Link>
        </div>
      </header>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <form
          onSubmit={createOrganization}
          className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
        >
          <div className="space-y-6">
            {error && <MessageBox tone="red">{error}</MessageBox>}
            {message && <MessageBox tone="green">{message}</MessageBox>}

            <SectionCard
              icon={<Building2 size={21} />}
              title="Organization Profile"
              subtitle="Choose how this workspace should behave and be labelled."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <TypeButton
                  active={organizationType === "madrasa"}
                  icon={<Building2 size={24} />}
                  title="Madrasa"
                  description="Category, Class and Team"
                  onClick={() => setOrganizationType("madrasa")}
                />
                <TypeButton
                  active={organizationType === "school"}
                  icon={<GraduationCap size={24} />}
                  title="School"
                  description="Class, Division and House"
                  onClick={() => setOrganizationType("school")}
                />
                <TypeButton
                  active={organizationType === "institution"}
                  icon={<Landmark size={24} />}
                  title="Institution"
                  description="Flexible academic structure"
                  onClick={() => setOrganizationType("institution")}
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label={`${organizationLabel} Name *`}>
                  <input
                    value={organizationName}
                    onChange={(event) => updateOrganizationName(event.target.value)}
                    placeholder={`Enter ${organizationLabel.toLowerCase()} name`}
                    className="form-input"
                  />
                </Field>
                <Field label="Place">
                  <input value={place} onChange={(event) => setPlace(event.target.value)} placeholder="City / area" className="form-input" />
                </Field>
                <Field label="Phone">
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Contact number" className="form-input" />
                </Field>
                <Field label="Public Portal Slug *">
                  <input
                    value={publicSlug}
                    onChange={(event) => {
                      setSlugEdited(true);
                      setPublicSlug(slugify(event.target.value));
                    }}
                    placeholder="organization-name"
                    className="form-input"
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              icon={<UserRound size={21} />}
              title="Administrator Login"
              subtitle="Creates the main administrator account for this organization."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Administrator Email *">
                  <input type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} placeholder="admin@example.com" className="form-input" />
                </Field>
                <Field label="Administrator Password *">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={adminPassword}
                      onChange={(event) => setAdminPassword(event.target.value)}
                      placeholder="Minimum 8 characters"
                      className="form-input pr-12"
                    />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
              </div>
            </SectionCard>

            <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
              <button
                type="button"
                onClick={() => setShowAdditionalAccess((value) => !value)}
                className="flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <UserCheck size={21} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black tracking-[-0.04em]">
                        Additional User Access
                      </h2>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                        Optional
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                      Optionally create a restricted Green Room operator together
                      with the organization.
                    </p>
                  </div>
                </div>
                <ChevronDown
                  size={21}
                  className={`shrink-0 text-slate-400 transition ${
                    showAdditionalAccess ? "rotate-180" : ""
                  }`}
                />
              </button>

              {showAdditionalAccess && (
                <div className="border-t border-slate-200 p-5 sm:p-6">
                  <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                    <div>
                      <p className="text-sm font-black text-violet-950">
                        Create Green Room Operator
                      </p>
                      <p className="mt-1 text-xs font-bold leading-5 text-violet-700">
                        This user can access only Green Room code generation,
                        attendance and unlocked code reset.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={createGreenRoomOperator}
                      onChange={(event) =>
                        setCreateGreenRoomOperator(event.target.checked)
                      }
                      className="mt-1 h-5 w-5 accent-violet-700"
                    />
                  </label>

                  {createGreenRoomOperator && (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Field label="Operator Email *">
                        <input
                          type="email"
                          value={operatorEmail}
                          onChange={(event) => setOperatorEmail(event.target.value)}
                          placeholder="greenroom@example.com"
                          className="form-input"
                        />
                      </Field>

                      <Field label="Temporary Password *">
                        <div className="relative">
                          <input
                            type={showOperatorPassword ? "text" : "password"}
                            value={operatorPassword}
                            onChange={(event) =>
                              setOperatorPassword(event.target.value)
                            }
                            placeholder="Minimum 8 characters"
                            className="form-input pr-12"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowOperatorPassword((value) => !value)
                            }
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                            aria-label={
                              showOperatorPassword
                                ? "Hide operator password"
                                : "Show operator password"
                            }
                          >
                            {showOperatorPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </Field>
                    </div>
                  )}
                </div>
              )}
            </section>

            <SectionCard
              icon={<KeyRound size={21} />}
              title="Secure Action PIN"
              subtitle="Required later for backup downloads and workspace resets."
              accent="amber"
            >
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
                Keep this PIN separate from the login password. It cannot be viewed later; Super Admin can only replace it.
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="6-Digit Action PIN *">
                  <div className="relative">
                    <input
                      type={showPin ? "text" : "password"}
                      inputMode="numeric"
                      maxLength={6}
                      value={actionPin}
                      onChange={(event) => setActionPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="••••••"
                      className="form-input pr-12 tracking-[0.35em]"
                    />
                    <button type="button" onClick={() => setShowPin((value) => !value)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm Action PIN *">
                  <input
                    type={showPin ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmActionPin}
                    onChange={(event) => setConfirmActionPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    className="form-input tracking-[0.35em]"
                  />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              icon={<CalendarDays size={21} />}
              title="Single Event"
              subtitle="This organization receives one dedicated event workspace."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Event Title *">
                  <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} className="form-input" />
                </Field>
                <Field label="Event Type">
                  <select value={eventType} onChange={(event) => setEventType(event.target.value)} className="form-input">
                    {EVENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </Field>
                <Field label="Tagline" className="md:col-span-2">
                  <input value={tagline} onChange={(event) => setTagline(event.target.value)} className="form-input" />
                </Field>
                <Field label="Venue">
                  <input value={venue} onChange={(event) => setVenue(event.target.value)} className="form-input" />
                </Field>
                <Field label="Public Portal">
                  <select value={isPublic ? "on" : "off"} onChange={(event) => setIsPublic(event.target.value === "on")} className="form-input">
                    <option value="on">Enabled</option>
                    <option value="off">Disabled</option>
                  </select>
                </Field>
                <Field label="Event Start Date">
                  <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="form-input" />
                </Field>
                <Field label="Event End Date">
                  <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="form-input" />
                </Field>
              </div>
            </SectionCard>

            <SectionCard
              icon={<Lock size={21} />}
              title="Three-Month Plan"
              subtitle="The plan end date is calculated automatically from the selected start date."
              accent="emerald"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Plan Start Date">
                  <input type="date" value={planStart} onChange={(event) => setPlanStart(event.target.value)} className="form-input" />
                </Field>
                <Field label="Plan End Date">
                  <input type="date" value={planEnd} readOnly className="form-input bg-slate-100 text-slate-500" />
                </Field>
              </div>
            </SectionCard>

            <div className="flex flex-col gap-3 rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={resetForm} className="h-12 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-700">Reset Form</button>
              <button type="submit" disabled={isSaving} className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-violet-700 px-6 text-sm font-black text-white disabled:opacity-60">
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Create Organization
              </button>
            </div>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Workspace Preview</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  {organizationType === "school" ? <GraduationCap size={24} /> : organizationType === "institution" ? <Landmark size={24} /> : <Building2 size={24} />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-black">{organizationName || `New ${organizationLabel}`}</p>
                  <p className="text-xs font-bold text-slate-500">{organizationLabel} · One Event</p>
                </div>
              </div>

              <PreviewItem icon={<Globe2 size={17} />} label="Public Portal" value={publicUrl} />
              <PreviewItem icon={<CalendarDays size={17} />} label="Plan" value={`${formatDate(planStart)} – ${formatDate(planEnd)}`} />
              <PreviewItem icon={<ShieldCheck size={17} />} label="Security" value="6-digit action PIN configured" />
              <PreviewItem
                icon={<UserCheck size={17} />}
                label="Additional Access"
                value={
                  createGreenRoomOperator
                    ? `Green Room Operator: ${operatorEmail || "email pending"}`
                    : "No additional user"
                }
              />

              <button type="button" onClick={copyPublicUrl} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700">
                <Copy size={16} />
                Copy Portal URL
              </button>
            </div>

            {created && (
              <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-5">
                <CheckCircle2 className="text-emerald-700" size={30} />
                <h3 className="mt-3 text-xl font-black text-emerald-950">Workspace Ready</h3>
                <p className="mt-2 text-sm font-bold leading-6 text-emerald-800">{created.name} and its administrator account were created.</p>
                <div className="mt-4 space-y-2 text-xs font-bold text-emerald-900">
                  <p>Admin: {created.adminEmail}</p>
                  {created.operatorEmail && (
                    <p>Green Room Operator: {created.operatorEmail}</p>
                  )}
                  <p>Plan: {formatDate(created.planStart)} – {formatDate(created.planEnd)}</p>
                </div>
                <Link href="/super-admin" className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-700 px-4 py-3 text-sm font-black text-white">Return to Dashboard</Link>
              </div>
            )}
          </aside>
        </form>
      </section>

      <style jsx global>{`
        .form-input {
          height: 56px;
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0 1rem;
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

function SectionCard({ icon, title, subtitle, children, accent = "violet" }: { icon: ReactNode; title: string; subtitle: string; children: ReactNode; accent?: "violet" | "amber" | "emerald" }) {
  const color = accent === "amber" ? "bg-amber-100 text-amber-700" : accent === "emerald" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700";
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${color}`}>{icon}</div>
        <div><h2 className="text-xl font-black tracking-[-0.04em]">{title}</h2><p className="mt-1 text-sm font-bold leading-6 text-slate-500">{subtitle}</p></div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TypeButton({ active, icon, title, description, onClick }: { active: boolean; icon: ReactNode; title: string; description: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${active ? "border-violet-400 bg-violet-50 ring-4 ring-violet-100" : "border-slate-200 bg-white hover:border-violet-300"}`}><div className="text-violet-700">{icon}</div><p className="mt-3 text-sm font-black">{title}</p><p className="mt-1 text-xs font-bold leading-5 text-slate-500">{description}</p></button>;
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <label className={className}><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>{children}</label>;
}

function PreviewItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="mt-3 flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="mt-0.5 text-violet-700">{icon}</div><div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">{label}</p><p className="mt-1 break-words text-xs font-black text-slate-700">{value}</p></div></div>;
}

function MessageBox({ children, tone }: { children: ReactNode; tone: "red" | "green" }) {
  return <div className={`rounded-2xl border px-5 py-4 text-sm font-bold ${tone === "red" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{children}</div>;
}

function LoadingScreen({ text }: { text: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-100"><div className="text-center"><Loader2 className="mx-auto animate-spin text-violet-700" size={36} /><p className="mt-4 text-sm font-black text-slate-600">{text}</p></div></main>;
}

function getOrganizationLabel(type: OrganizationType) {
  if (type === "school") return "School";
  if (type === "institution") return "Institution";
  return "Madrasa";
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

function todayIso() {
  const now = new Date();
  const local = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}

function addMonths(value: string, months: number) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() + months);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value: string) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
