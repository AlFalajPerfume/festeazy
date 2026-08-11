/* eslint-disable */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { clearAdminContextCache, getAdminContext } from "@/lib/admin-context";
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FileImage,
  FileText,
  Images,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Medal,
  MonitorSmartphone,
  PenLine,
  School,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  Trophy,
  UploadCloud,
  UserCheck,
  Users,
  X,
} from "lucide-react";

type AdminShellProps = {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

type OrganizationUser = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string | null;
  is_active: boolean | null;
  email: string | null;
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  place: string | null;
  logo_url: string | null;
  status: string | null;
  plan_start?: string | null;
  plan_end?: string | null;
};

type EventInfo = {
  id: string;
  organization_id: string;
  title: string;
  public_slug: string;
  is_public: boolean;
  updated_at?: string | null;
  created_at?: string | null;
};

type AdminShellCache = {
  organization: Organization | null;
  role: string;
  publicPortalHref: string;
  blockedTitle: string;
  blockedMessage: string;
};

type OrganizationUpdatedDetail = {
  name?: string;
  slug?: string;
  phone?: string | null;
  email?: string | null;
  place?: string | null;
  logoUrl?: string | null;
};

let adminShellCache: AdminShellCache | null = null;

const navSections = [
  {
    title: "Core Setup",
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Event Setup", href: "/admin/event-setup", icon: Sparkles },
      { label: "Import Data", href: "/admin/imports", icon: UploadCloud },
      { label: "Teams / Houses", href: "/admin/teams", icon: Users },
      { label: "Categories & Classes", href: "/admin/categories", icon: Tags },
      { label: "Students", href: "/admin/students", icon: School },
      { label: "Programmes", href: "/admin/programmes", icon: ClipboardList },
    ],
  },
  {
    title: "Competition",
    items: [
      { label: "Participants", href: "/admin/participants", icon: UserCheck },
      { label: "Green Room", href: "/admin/green-room", icon: ClipboardList },
      { label: "Judges", href: "/admin/judges", icon: ShieldCheck },
      { label: "Mark Entry", href: "/admin/mark-entry", icon: PenLine },
      { label: "Results", href: "/admin/results", icon: Medal },
      { label: "Top Scorers", href: "/admin/top-scorers", icon: Trophy },
      { label: "Schedule", href: "/admin/schedule", icon: CalendarClock },
    ],
  },
  {
    title: "Output",
    items: [
      { label: "Reports", href: "/admin/reports", icon: FileText },
      { label: "Certificates", href: "/admin/certificates", icon: Medal },
      { label: "Gallery", href: "/admin/gallery", icon: Images },
      { label: "Poster Studio", href: "/admin/posters", icon: FileImage },
      { label: "Milestone Posters", href: "/admin/milestone-posters", icon: Trophy,},
      { label: "Public Portal", href: "__PUBLIC_PORTAL__", icon: MonitorSmartphone },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

function isPlanExpired(planEnd: string | null | undefined) {
  if (!planEnd) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(planEnd);
  endDate.setHours(0, 0, 0, 0);

  if (Number.isNaN(endDate.getTime())) return false;

  return endDate < today;
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

export default function AdminShell({
  children,
  title,
  subtitle,
  actions,
}: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isChecking, setIsChecking] = useState(() => !adminShellCache);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [organization, setOrganization] = useState<Organization | null>(
    () => adminShellCache?.organization || null,
  );
  const [role, setRole] = useState(() => adminShellCache?.role || "");
  const [publicPortalHref, setPublicPortalHref] = useState(
    () => adminShellCache?.publicPortalHref || "/",
  );
  const [blockedTitle, setBlockedTitle] = useState(
    () => adminShellCache?.blockedTitle || "",
  );
  const [blockedMessage, setBlockedMessage] = useState(
    () => adminShellCache?.blockedMessage || "",
  );

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    function handleOrganizationUpdated(event: Event) {
      const detail = (event as CustomEvent<OrganizationUpdatedDetail>).detail;
      if (!detail) return;

      setOrganization((current) => {
        if (!current) return current;

        const nextOrganization: Organization = {
          ...current,
          name: detail.name ?? current.name,
          slug: detail.slug ?? current.slug,
          phone:
            detail.phone !== undefined ? detail.phone : current.phone,
          email:
            detail.email !== undefined ? detail.email : current.email,
          place:
            detail.place !== undefined ? detail.place : current.place,
          logo_url:
            detail.logoUrl !== undefined ? detail.logoUrl : current.logo_url,
        };

        if (adminShellCache) {
          adminShellCache = {
            ...adminShellCache,
            organization: nextOrganization,
          };
        }

        return nextOrganization;
      });
    }

    window.addEventListener(
      "festeazy:organization-updated",
      handleOrganizationUpdated,
    );

    return () => {
      window.removeEventListener(
        "festeazy:organization-updated",
        handleOrganizationUpdated,
      );
    };
  }, []);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  function cacheShellState(nextState: AdminShellCache) {
    adminShellCache = nextState;
    setOrganization(nextState.organization);
    setRole(nextState.role);
    setPublicPortalHref(nextState.publicPortalHref);
    setBlockedTitle(nextState.blockedTitle);
    setBlockedMessage(nextState.blockedMessage);
    setIsChecking(false);
  }

  async function checkSession() {
    if (adminShellCache) {
      setOrganization(adminShellCache.organization);
      setRole(adminShellCache.role);
      setPublicPortalHref(adminShellCache.publicPortalHref);
      setBlockedTitle(adminShellCache.blockedTitle);
      setBlockedMessage(adminShellCache.blockedMessage);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    setBlockedTitle("");
    setBlockedMessage("");

    const { context, error } = await getAdminContext();

    if (error || !context) {
      if (error === "Not logged in.") {
        localStorage.removeItem("festeazy_admin");
        router.replace("/admin");
        return;
      }

      cacheShellState({
        organization: null,
        role: "",
        publicPortalHref: "/",
        blockedTitle: "Admin Access Error",
        blockedMessage: error || "Unable to open the admin account.",
      });
      return;
    }

    const activeOrganization: Organization = {
      id: context.organizationId,
      name: context.organizationName,
      slug: context.organizationSlug,
      phone: context.organizationPhone || null,
      email: context.organizationEmail || null,
      place: context.organizationPlace || null,
      logo_url: context.organizationLogoUrl || null,
      status: context.organizationStatus || "active",
      plan_start: context.planStart || null,
      plan_end: context.planEnd || null,
    };

    const orgStatus = String(activeOrganization.status || "active").toLowerCase();

    if (["inactive", "disabled", "blocked"].includes(orgStatus)) {
      cacheShellState({
        organization: activeOrganization,
        role: context.role,
        publicPortalHref: "/",
        blockedTitle: "Madrasa Account Inactive",
        blockedMessage: `${activeOrganization.name} is currently inactive. Please contact Festeazy Super Admin to reactivate this account.`,
      });
      return;
    }

    if (isPlanExpired(activeOrganization.plan_end)) {
      cacheShellState({
        organization: activeOrganization,
        role: context.role,
        publicPortalHref: "/",
        blockedTitle: "Madrasa Plan Expired",
        blockedMessage: `${activeOrganization.name} plan expired on ${formatDate(
          activeOrganization.plan_end,
        )}. Please renew the plan to continue using admin panel.`,
      });
      return;
    }

    const nextPublicPortalHref = context.publicSlug
      ? `/event/${context.publicSlug}`
      : "/";

    localStorage.setItem("festeazy_admin", "true");
    cacheShellState({
      organization: activeOrganization,
      role: context.role,
      publicPortalHref: nextPublicPortalHref,
      blockedTitle: "",
      blockedMessage: "",
    });
  }

  async function handleLogout() {
  adminShellCache = null;
  clearAdminContextCache();

  await supabase.auth.signOut({
    scope: "local",
  });

  localStorage.removeItem("festeazy_admin");
  localStorage.removeItem("festeazy_role");
  localStorage.removeItem("festeazy_organization_id");

  router.replace("/admin");
  router.refresh();
}

  const isGreenRoomOperator =
    String(role || "").toLowerCase() === "green_room_operator";

  const availableNavSections = useMemo(() => {
    if (!isGreenRoomOperator) return navSections;

    return [
      {
        title: "Green Room Access",
        items: [
          {
            label: "Green Room",
            href: "/admin/green-room",
            icon: ClipboardList,
          },
        ],
      },
    ];
  }, [isGreenRoomOperator]);

  const currentLabel = useMemo(() => {
    for (const section of availableNavSections) {
      const item = section.items.find((navItem) => navItem.href === pathname);
      if (item) return item.label;
    }
    return title;
  }, [pathname, title, availableNavSections]);

  useEffect(() => {
    if (
      !isChecking &&
      !blockedTitle &&
      isGreenRoomOperator &&
      pathname !== "/admin/green-room"
    ) {
      router.replace("/admin/green-room");
    }
  }, [
    isChecking,
    blockedTitle,
    isGreenRoomOperator,
    pathname,
    router,
  ]);

  if (
    !isChecking &&
    !blockedTitle &&
    isGreenRoomOperator &&
    pathname !== "/admin/green-room"
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-3xl bg-white px-6 py-4 text-sm font-black text-violet-900 shadow-xl shadow-slate-900/10">
          <Loader2 className="animate-spin" size={18} />
          Opening Green Room...
        </div>
      </main>
    );
  }

  const sidebar = (
    <aside className="flex h-full w-80 flex-col border-r border-slate-200 bg-slate-950 text-white">
      <div className="border-b border-white/10 p-6">
        <Link
          href={isGreenRoomOperator ? "/admin/green-room" : "/admin/dashboard"}
          prefetch={false}
          className="flex items-center gap-3"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-950/30 ring-1 ring-white/10">
            {organization?.logo_url ? (
              <img
                src={organization.logo_url}
                alt={`${organization.name} logo`}
                className="h-full w-full bg-white object-contain p-1.5"
              />
            ) : (
              <BarChart3 size={24} />
            )}
          </div>
          <div>
            <p className="text-xl font-black tracking-[-0.05em]">Festeazy</p>
            <p className="text-xs font-bold text-slate-400">
              {organization?.name || "Fest Management Suite"}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {availableNavSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              {section.title}
            </p>

            <div className="mt-2 space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const actualHref =
                  item.href === "__PUBLIC_PORTAL__"
                    ? publicPortalHref
                    : item.href;

                const isExternalPublic = item.href === "__PUBLIC_PORTAL__";
                const isActive = pathname === actualHref;

                return (
                  <Link
                    key={item.href}
                    href={actualHref}
                    target={isExternalPublic ? "_blank" : undefined}
                    prefetch={false}
                    className={`group flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-black transition ${
                      isActive
                        ? "bg-violet-500/20 text-white ring-1 ring-violet-400/40"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon size={18} />
                      {item.label}
                    </span>

                    <ChevronRight
                      size={16}
                      className={`transition ${
                        isActive
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-60"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-slate-300 transition hover:bg-red-500/10 hover:text-red-200"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-3xl bg-white px-6 py-4 text-sm font-black text-violet-900 shadow-xl shadow-slate-900/10">
          <Loader2 className="animate-spin" size={18} />
          Checking admin access...
        </div>
      </main>
    );
  }

  if (blockedTitle) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-lg rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-2xl shadow-slate-900/10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600">
            <AlertTriangle size={34} />
          </div>

          <h1 className="mt-6 text-3xl font-black tracking-[-0.06em] text-slate-950">
            {blockedTitle}
          </h1>

          <p className="mt-3 text-sm font-bold leading-7 text-slate-500">
            {blockedMessage}
          </p>

          {organization && (
            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-left">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                Madrasa
              </p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {organization.name}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-black text-red-700">
                    {organization.status || "-"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Plan End
                  </p>
                  <p className="mt-1 text-sm font-black text-red-700">
                    {formatDate(organization.plan_end)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/15"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        {sidebar}
      </div>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close menu"
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/60"
          />

          <div className="relative h-full w-80 max-w-[88vw]">{sidebar}</div>
        </div>
      )}

      <div className="lg:pl-80">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur-2xl">
          <div className="flex min-h-20 flex-col items-stretch gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileOpen((value) => !value)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm lg:hidden"
                aria-label="Open menu"
              >
                {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-600">
                  {currentLabel}
                </p>

                <h1 className="truncate text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-3xl">
                  {title}
                </h1>

                {subtitle && (
                  <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-slate-500 sm:text-sm sm:leading-6">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {actions && (
              <div className="w-full sm:w-auto [&>div]:w-full [&>div]:justify-stretch sm:[&>div]:w-auto sm:[&>div]:justify-end [&>div>*]:min-w-0 [&>div>*]:flex-1 sm:[&>div>*]:flex-none">
                {actions}
              </div>
            )}
          </div>
        </header>

        <section className="px-3 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-6 lg:px-8">{children}</section>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-2xl shadow-slate-950/20 backdrop-blur-xl lg:hidden">
        {[
          { label: "Home", href: "/admin/dashboard", icon: LayoutDashboard },
          { label: "Entries", href: "/admin/participants", icon: UserCheck },
          { label: "Codes", href: "/admin/green-room", icon: ClipboardList },
          { label: "Results", href: "/admin/results", icon: Medal },
        ].map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-black transition ${
                active
                  ? "bg-violet-600 text-white"
                  : "text-slate-500 active:bg-slate-100"
              }`}
            >
              <Icon size={18} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}