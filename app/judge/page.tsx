/* eslint-disable */
"use client";

import SearchableProgrammeSelect from "@/components/admin/SearchableProgrammeSelect";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Lock,
  LogOut,
  Phone,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trophy,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type JudgeProgramme = {
  id: string;
  name: string;
  sort_order?: number;
  category_name?: string | null;
  programme_type?: string | null;
  stage_type?: string | null;
  total_entries: number;
  saved_entries: number;
  total_marks: number;
  completed: boolean;
};

type JudgeSessionData = {
  organization?: {
    id?: string;
    name?: string;
    place?: string | null;
  };

  event?: {
    id?: string;
    title?: string;
  };

  judge?: {
    id?: string;
    name?: string;
    phone?: string | null;
  };

  programmes: JudgeProgramme[];
};

type ProgrammeStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "No Participants";

type ProgrammeFilter =
  | "all"
  | "remaining"
  | "completed"
  | "no_participants";

type ProgrammeCardData = {
  programme: JudgeProgramme;
  totalEntries: number;
  savedEntries: number;
  progress: number;
  completed: boolean;
  status: ProgrammeStatus;
};

export default function JudgePortalPage() {
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  const [data, setData] =
    useState<JudgeSessionData | null>(null);

  const [selectedProgrammeId, setSelectedProgrammeId] =
    useState("");

  const [programmeSearch, setProgrammeSearch] =
    useState("");

  const [programmeFilter, setProgrammeFilter] =
    useState<ProgrammeFilter>("remaining");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    loadSession();
  }, []);

  const programmeCards = useMemo<
    ProgrammeCardData[]
  >(() => {
    return (data?.programmes || []).map(
      (programme) => {
        const totalEntries = Number(
          programme.total_entries || 0,
        );

        const savedEntries = Number(
          programme.saved_entries || 0,
        );

        const progress =
          totalEntries > 0
            ? Math.min(
                100,
                Math.round(
                  (savedEntries / totalEntries) * 100,
                ),
              )
            : 0;

        const completed =
          Boolean(programme.completed) ||
          (totalEntries > 0 &&
            savedEntries >= totalEntries);

        let status: ProgrammeStatus = "Pending";

        if (totalEntries === 0) {
          status = "No Participants";
        } else if (completed) {
          status = "Completed";
        } else if (savedEntries > 0) {
          status = "In Progress";
        }

        return {
          programme,
          totalEntries,
          savedEntries,
          progress,
          completed,
          status,
        };
      },
    );
  }, [data]);

  const programmeOptions = useMemo(() => {
    return programmeCards.map((item, index) => ({
      id: item.programme.id,
      name: item.programme.name,
      sort_order:
        item.programme.sort_order ?? index + 1,
      categoryName:
        item.programme.category_name || "General",
      programmeType:
        item.programme.programme_type || "individual",
      stageType:
        item.programme.stage_type || "stage",
      status: item.status,
    }));
  }, [programmeCards]);

  const filteredProgrammeCards = useMemo(() => {
    const keyword = programmeSearch
      .trim()
      .toLowerCase();

    return programmeCards.filter((item) => {
      const matchesFilter =
        programmeFilter === "all" ||
        (programmeFilter === "remaining" &&
          (item.status === "Pending" ||
            item.status === "In Progress")) ||
        (programmeFilter === "completed" &&
          item.completed) ||
        (programmeFilter === "no_participants" &&
          item.status === "No Participants");

      if (!matchesFilter) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const searchableText = [
        item.programme.name,
        item.programme.category_name,
        item.programme.programme_type,
        item.programme.stage_type,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [
    programmeCards,
    programmeSearch,
    programmeFilter,
  ]);

  const completedCount = programmeCards.filter(
    (item) => item.completed,
  ).length;

  const pendingCount = programmeCards.filter(
    (item) =>
      item.status === "Pending" ||
      item.status === "In Progress",
  ).length;

  async function loadSession(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await fetch(
        "/api/judge/session",
        {
          cache: "no-store",
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (response.status === 401) {
        setData(null);
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "Unable to load the judge portal.",
        );
      }

      setData(payload as JudgeSessionData);
    } catch (loadError: any) {
      setError(
        loadError?.message ||
          "Unable to load the judge portal.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function login(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const cleanPhone = phone.trim();
    const cleanPin = pin.trim();

    if (!cleanPhone || !cleanPin) {
      setError("Enter your phone number and PIN.");
      return;
    }

    setLoggingIn(true);

    try {
      const response = await fetch(
        "/api/judge/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: cleanPhone,
            pin: cleanPin,
          }),
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "Invalid phone number or PIN.",
        );
      }

      setPhone("");
      setPin("");

      await loadSession();
    } catch (loginError: any) {
      setError(
        loginError?.message || "Login failed.",
      );
    } finally {
      setLoggingIn(false);
    }
  }

  async function logout() {
    setLoggingOut(true);
    setError("");

    try {
      const response = await fetch(
        "/api/judge/login",
        {
          method: "DELETE",
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error || "Unable to log out.",
        );
      }

      setData(null);
      setPhone("");
      setPin("");
      setSelectedProgrammeId("");
      setProgrammeSearch("");
      setProgrammeFilter("remaining");
    } catch (logoutError: any) {
      setError(
        logoutError?.message || "Unable to log out.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  function handleProgrammeSelect(value: string) {
    setSelectedProgrammeId(value);
    setError("");

    if (!value) return;

    const selected = programmeCards.find(
      (item) => item.programme.id === value,
    );

    if (!selected) {
      setError("Selected programme was not found.");
      return;
    }

    if (selected.status === "No Participants") {
      setError(
        "No present participant codes are available for this programme.",
      );
      return;
    }

    if (selected.completed) {
      setError(
        "Marks are already submitted and locked for this programme.",
      );
      return;
    }

    router.push(`/judge/programme/${value}`);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-2xl shadow-black/30">
          <Loader2
            className="mx-auto animate-spin text-violet-700"
            size={34}
          />

          <p className="mt-4 text-sm font-black text-slate-600">
            Loading judge portal...
          </p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen overflow-hidden bg-slate-950 px-4 py-10">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-700/30 blur-3xl" />
          <div className="absolute -bottom-48 -right-40 h-[30rem] w-[30rem] rounded-full bg-fuchsia-700/20 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-80px)] max-w-md items-center">
          <div className="w-full rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-2xl shadow-black/40 sm:p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-600 text-white shadow-lg shadow-violet-900/30">
              <ShieldCheck size={30} />
            </div>

            <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
              Festeazy Judge Portal
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.06em]">
              Judge Login
            </h1>

            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
              Enter the mobile number and login PIN
              provided by the event administrator.
            </p>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
                {error}
              </div>
            )}

            <form
              onSubmit={login}
              className="mt-7 space-y-4"
            >
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Phone Number
                </span>

                <div className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
                  <Phone
                    size={18}
                    className="shrink-0 text-slate-400"
                  />

                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    placeholder="Enter phone number"
                    className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Login PIN
                </span>

                <div className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
                  <Lock
                    size={18}
                    className="shrink-0 text-slate-400"
                  />

                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    value={pin}
                    onChange={(event) =>
                      setPin(event.target.value)
                    }
                    placeholder="Enter login PIN"
                    className="w-full bg-transparent text-sm font-black tracking-[0.15em] text-slate-950 outline-none placeholder:font-bold placeholder:tracking-normal placeholder:text-slate-400"
                  />
                </div>
              </label>

              <button
                type="submit"
                disabled={loggingIn}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingIn ? (
                  <Loader2
                    className="animate-spin"
                    size={18}
                  />
                ) : (
                  <UserCheck size={18} />
                )}

                {loggingIn
                  ? "Logging in..."
                  : "Login to Judge Portal"}
              </button>
            </form>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-violet-700"
              />

              <p className="text-xs font-bold leading-5 text-slate-500">
                Your account only displays programmes
                assigned to you by the event
                administrator.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700 sm:text-xs">
              Festeazy Judge Portal
            </p>

            <h1 className="mt-0.5 truncate text-xl font-black tracking-[-0.05em] text-slate-950">
              {data.judge?.name || "Judge"}
            </h1>

            <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
              {data.organization?.name ||
                "Organization"}

              {data.event?.title && (
                <>
                  <span className="mx-1.5">•</span>
                  {data.event.title}
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => loadSession(true)}
              disabled={refreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              <RefreshCcw
                size={16}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
            >
              {loggingOut ? (
                <Loader2
                  className="animate-spin"
                  size={16}
                />
              ) : (
                <LogOut size={16} />
              )}

              <span className="hidden sm:inline">
                {loggingOut
                  ? "Logging out..."
                  : "Logout"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-700 via-violet-900 to-slate-950 p-6 text-white shadow-2xl shadow-violet-900/20 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

          <div className="relative">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              <ClipboardList size={28} />
            </div>

            <h2 className="mt-5 text-3xl font-black tracking-[-0.07em] sm:text-4xl">
              Assigned Programmes
            </h2>

            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-white/70">
              Search or select an assigned programme and
              enter marks using anonymous participant code
              letters.
            </p>

            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
              <HeroStat
                label="Assigned"
                value={programmeCards.length}
              />

              <HeroStat
                label="Completed"
                value={completedCount}
              />

              <HeroStat
                label="Remaining"
                value={pendingCount}
              />
            </div>
          </div>
        </div>

        {/* Searchable programme selector */}
        {programmeCards.length > 0 && (
          <section className="mt-6 rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Select Programme
                </label>

                <SearchableProgrammeSelect
                  value={selectedProgrammeId}
                  onChange={handleProgrammeSelect}
                  options={programmeOptions}
                  placeholder="Search and select programme..."
                  emptyText="No assigned programmes found"
                />
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Filter Programme Cards
                </label>

                <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
                  <Search
                    size={17}
                    className="shrink-0 text-slate-400"
                  />

                  <input
                    value={programmeSearch}
                    onChange={(event) =>
                      setProgrammeSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Search name, category or status..."
                    className="w-full bg-transparent text-sm font-bold text-slate-950 outline-none placeholder:text-slate-400"
                  />

                  {programmeSearch && (
                    <button
                      type="button"
                      onClick={() =>
                        setProgrammeSearch("")
                      }
                      className="text-xs font-black text-violet-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Show Programmes
              </p>

              <div className="flex flex-wrap gap-2">
                {[
                  {
                    id: "remaining",
                    label: "Remaining",
                    count: programmeCards.filter(
                      (item) =>
                        item.status === "Pending" ||
                        item.status === "In Progress",
                    ).length,
                  },
                  {
                    id: "completed",
                    label: "Completed",
                    count: completedCount,
                  },
                  {
                    id: "no_participants",
                    label: "No Participants",
                    count: programmeCards.filter(
                      (item) =>
                        item.status === "No Participants",
                    ).length,
                  },
                  {
                    id: "all",
                    label: "All",
                    count: programmeCards.length,
                  },
                ].map((filter) => {
                  const active =
                    programmeFilter === filter.id;

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() =>
                        setProgrammeFilter(
                          filter.id as ProgrammeFilter,
                        )
                      }
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition ${
                        active
                          ? "bg-violet-600 text-white shadow-lg shadow-violet-900/20"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {filter.label}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] ${
                          active
                            ? "bg-white/15 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {filter.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-3 text-xs font-bold text-slate-500">
              Remaining shows programmes that still need
              marks. Completed programmes are locked.
            </p>
          </section>
        )}

        {programmeCards.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-900/5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
              <Trophy size={30} />
            </div>

            <h3 className="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">
              No programmes assigned
            </h3>

            <p className="mt-2 text-sm font-bold text-slate-500">
              Contact the event administrator to assign
              programmes to your judge account.
            </p>
          </div>
        ) : filteredProgrammeCards.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-900/5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
              <Search size={28} />
            </div>

            <h3 className="mt-4 text-xl font-black text-slate-950">
              No matching programmes
            </h3>

            <p className="mt-2 text-sm font-bold text-slate-500">
              Change the programme search and try again.
            </p>

            <button
              type="button"
              onClick={() => setProgrammeSearch("")}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-2xl bg-violet-600 px-5 text-sm font-black text-white"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Programme List
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  Showing {filteredProgrammeCards.length} of{" "}
                  {programmeCards.length} programmes in the selected filter.
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {filteredProgrammeCards.map((item) => (
                <ProgrammeCard
                  key={item.programme.id}
                  item={item}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function ProgrammeCard({
  item,
}: {
  item: ProgrammeCardData;
}) {
  const programmeType =
    item.programme.programme_type === "group"
      ? "Group"
      : "Individual";

  const stageType =
    item.programme.stage_type === "off_stage"
      ? "Off-stage"
      : item.programme.stage_type === "stage"
        ? "Stage"
        : null;

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <StatusBadge status={item.status} />

          <h3 className="mt-4 text-xl font-black tracking-[-0.04em] text-slate-950">
            {item.programme.name}
          </h3>

          <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
            {item.programme.category_name ||
              "General"}

            {item.programme.programme_type && (
              <>
                <span className="mx-1.5">•</span>
                {programmeType}
              </>
            )}

            {stageType && (
              <>
                <span className="mx-1.5">•</span>
                {stageType}
              </>
            )}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${
            item.completed
              ? "bg-emerald-50 text-emerald-700"
              : "bg-violet-50 text-violet-700 group-hover:bg-violet-600 group-hover:text-white"
          }`}
        >
          {item.completed ? (
            <CheckCircle2 size={20} />
          ) : (
            <ArrowRight size={20} />
          )}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          <span>Marking Progress</span>
          <span>{item.progress}%</span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              item.completed
                ? "bg-emerald-500"
                : "bg-violet-600"
            }`}
            style={{
              width: `${item.progress}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MiniStat
          label="Codes"
          value={String(item.totalEntries)}
        />

        <MiniStat
          label="Marked"
          value={`${item.savedEntries}/${item.totalEntries}`}
        />

        <MiniStat
          label="Maximum"
          value={String(
            item.programme.total_marks,
          )}
        />
      </div>

      {item.completed && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
          <CheckCircle2
            size={17}
            className="mt-0.5 shrink-0"
          />

          <span>
            Submitted. Marks are locked for this
            programme.
          </span>
        </div>
      )}

      {item.status === "No Participants" && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
          No present participant codes are available.
        </div>
      )}
    </>
  );

  if (
    item.completed ||
    item.status === "No Participants"
  ) {
    return (
      <article
        className={`rounded-[1.7rem] border bg-white p-5 shadow-xl shadow-slate-900/5 ${
          item.completed
            ? "border-emerald-200"
            : "border-slate-200"
        }`}
      >
        {cardContent}
      </article>
    );
  }

  return (
    <Link
      href={`/judge/programme/${item.programme.id}`}
      className="group rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-2xl"
    >
      {cardContent}
    </Link>
  );
}

function HeroStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-[9px] font-black uppercase tracking-[0.17em] text-white/50">
        {label}
      </p>

      <p className="mt-1 text-2xl font-black text-white">
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 p-3 sm:p-4">
      <p className="truncate text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-base font-black text-slate-950 sm:text-lg">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ProgrammeStatus;
}) {
  if (status === "Completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
        <CheckCircle2 size={13} />
        Completed
      </span>
    );
  }

  if (status === "In Progress") {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
        In Progress
      </span>
    );
  }

  if (status === "No Participants") {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
        No Participants
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
      Pending
    </span>
  );
}