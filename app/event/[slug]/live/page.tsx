/* eslint-disable */
"use client";

import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Expand,
  MapPin,
  Medal,
  Minimize2,
  Pause,
  Play,
  Radio,
  RefreshCcw,
  Sparkles,
  Trophy,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Organization = {
  id: string;
  name: string;
  slug: string;
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
  tagline: string | null;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
  public_slug: string;
  is_public: boolean;
};

type EventSettings = {
  organization_id: string;
  event_id: string;
  theme_color: string | null;
  show_points: boolean | null;
};

type Programme = {
  id: string;
  organization_id: string;
  event_id: string;
  name: string;
  programme_type: string;
  stage_type: string;
  category_id: string | null;
  gender_scope: string;
  sort_order: number;
  status: string;
};

type Category = {
  id: string;
  name: string;
};

type Team = {
  id: string;
  name: string;
  code?: string | null;
  color: string | null;
  logo_url?: string | null;
};

type ClassItem = {
  id: string;
  name: string;
};

type Student = {
  id: string;
  chest_no: string | null;
  name: string;
  class_id: string | null;
  category_id: string | null;
  team_id: string | null;
};

type Registration = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_id: string | null;
  student_id: string | null;
  team_id: string | null;
  group_name: string | null;
  registration_no: string | null;
  status: string;
  created_at: string;
};

type ResultItem = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_id: string | null;
  registration_id: string | null;
  total_mark: number;
  average_mark: number;
  grade: string | null;
  position: number | null;
  points: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

type ResultEntry = {
  result: ResultItem;
  programme: Programme;
  participantTitle: string;
  participantSubtitle: string;
  teamId: string | null;
  memberNames: string[];
};

type ProgrammeResultGroup = {
  programme: Programme;
  entries: ResultEntry[];
  publishedAt: string | null;
};

type TeamPoint = {
  teamId: string;
  teamName: string;
  teamColor: string | null;
  teamLogo: string | null;
  points: number;
};

type LiveSlide =
  | {
      id: string;
      kind: "result";
      group: ProgrammeResultGroup;
      latest: boolean;
    }
  | {
      id: string;
      kind: "standings";
    }
  | {
      id: string;
      kind: "progress";
    }
  | {
      id: string;
      kind: "waiting";
    };

const DEFAULT_SETTINGS: EventSettings = {
  organization_id: "",
  event_id: "",
  theme_color: "emerald",
  show_points: true,
};

const REFRESH_INTERVAL_MS = 8000;
const ROTATE_INTERVAL_MS = 10000;
const MAX_RESULT_SLIDES = 6;
const TRANSITION_MS = 380;

function getThemeStyle(themeColor: string | null | undefined) {
  const theme = String(themeColor || "emerald").trim().toLowerCase();

  if (theme === "violet") {
    return {
      primary: "#7c3aed",
      bright: "#c4b5fd",
      light: "#ede9fe",
      deep: "#10071f",
      deep2: "#22103f",
      glow: "rgba(124,58,237,.34)",
    };
  }

  if (theme === "amber") {
    return {
      primary: "#d97706",
      bright: "#fcd34d",
      light: "#fef3c7",
      deep: "#1f1004",
      deep2: "#402208",
      glow: "rgba(217,119,6,.32)",
    };
  }

  if (theme === "slate") {
    return {
      primary: "#64748b",
      bright: "#cbd5e1",
      light: "#f1f5f9",
      deep: "#111827",
      deep2: "#273449",
      glow: "rgba(100,116,139,.28)",
    };
  }

  if (theme === "blue") {
    return {
      primary: "#2563eb",
      bright: "#93c5fd",
      light: "#dbeafe",
      deep: "#07152f",
      deep2: "#102d61",
      glow: "rgba(37,99,235,.34)",
    };
  }

  if (theme === "rose") {
    return {
      primary: "#e11d48",
      bright: "#fda4af",
      light: "#ffe4e6",
      deep: "#24070f",
      deep2: "#4f1022",
      glow: "rgba(225,29,72,.32)",
    };
  }

  return {
    primary: "#059669",
    bright: "#6ee7b7",
    light: "#d1fae5",
    deep: "#031a15",
    deep2: "#073b31",
    glow: "rgba(5,150,105,.32)",
  };
}

function isPlanExpired(planEnd: string | null | undefined) {
  if (!planEnd) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(planEnd);
  endDate.setHours(0, 0, 0, 0);

  if (Number.isNaN(endDate.getTime())) return false;
  return endDate < today;
}

function normalizeGender(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized.includes("female") || normalized.includes("girl")) return "Girls";
  if (normalized.includes("male") || normalized.includes("boy")) return "Boys";
  return "All";
}

function formatStageType(value: string | null | undefined) {
  return String(value || "").toLowerCase().includes("off") ? "Off-stage" : "Stage";
}

function formatProgrammeType(value: string | null | undefined) {
  return String(value || "").toLowerCase() === "group" ? "Group" : "Individual";
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getLatestTimestamp(entries: ResultEntry[]) {
  const latestTime = entries.reduce<number | null>((currentLatest, entry) => {
    const date = parseDate(entry.result.published_at || entry.result.created_at);
    if (!date) return currentLatest;
    const time = date.getTime();
    return currentLatest === null || time > currentLatest ? time : currentLatest;
  }, null);

  return latestTime === null ? null : new Date(latestTime).toISOString();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(value: Date) {
  return value.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPublishedTime(value: string | null | undefined) {
  if (!value) return "Published";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Published";

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(value: string | null | undefined) {
  if (!value) return "Published";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Published";

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

function cleanParticipantName(value: string | null | undefined) {
  return String(value || "-").replace(/^#?\d+\s*/, "").trim() || "-";
}

function extractChest(value: string | null | undefined) {
  const match = String(value || "").match(/^#?(\d+)/);
  return match ? match[1] : "";
}

function getMedal(position: number | null) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return "🏅";
}

function getPositionText(position: number | null) {
  if (position === 1) return "First Place";
  if (position === 2) return "Second Place";
  if (position === 3) return "Third Place";
  return position ? `Rank ${position}` : "Winner";
}

export default function LiveResultsPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = String(Array.isArray(slugParam) ? slugParam[0] : slugParam || "")
    .trim()
    .toLowerCase();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [eventSettings, setEventSettings] = useState<EventSettings>(DEFAULT_SETTINGS);

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [clock, setClock] = useState(new Date());
  const [displayedIndex, setDisplayedIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"next" | "prev">("next");
  const [rotationEpoch, setRotationEpoch] = useState(0);
  const [newResultPulse, setNewResultPulse] = useState(false);

  const fetchInFlight = useRef(false);
  const latestGroupSignature = useRef("");
  const transitionTimer = useRef<number | null>(null);

  const theme = getThemeStyle(eventSettings.theme_color);
  const showPoints = eventSettings.show_points !== false;

  useEffect(() => {
    loadPublicData(true);

    const refreshTimer = window.setInterval(() => {
      loadPublicData(false);
    }, REFRESH_INTERVAL_MS);

    return () => window.clearInterval(refreshTimer);
  }, [slug]);

  useEffect(() => {
    const clockTimer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    function syncFullscreen() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
    };
  }, []);

  const publishedResults = useMemo(
    () => results.filter((item) => item.is_published),
    [results],
  );

  function normalizeChest(chestNo: string | null) {
    return String(chestNo || "").replace("#", "").trim();
  }

  function getStudent(id: string | null) {
    return students.find((item) => item.id === id) || null;
  }

  function getTeam(id: string | null) {
    return teams.find((item) => item.id === id) || null;
  }

  function getTeamName(id: string | null) {
    return getTeam(id)?.name || "-";
  }

  function getClassName(id: string | null) {
    return classes.find((item) => item.id === id)?.name || "-";
  }

  function getCategoryName(id: string | null) {
    if (!id) return "General";
    return categories.find((item) => item.id === id)?.name || "General";
  }

  function buildResultEntry(result: ResultItem, programme: Programme): ResultEntry {
    const registration =
      registrations.find((item) => item.id === result.registration_id) || null;

    if (!registration) {
      return {
        result,
        programme,
        participantTitle: "Unknown participant",
        participantSubtitle: "-",
        teamId: null,
        memberNames: [],
      };
    }

    if (programme.programme_type === "group") {
      const groupRegistrations = registrations.filter((item) => {
        return (
          item.programme_id === registration.programme_id &&
          item.team_id === registration.team_id &&
          item.group_name === registration.group_name
        );
      });

      const memberNames = groupRegistrations
        .map((item) => {
          const student = getStudent(item.student_id);
          if (!student) return "";
          return `#${normalizeChest(student.chest_no)} ${student.name}`;
        })
        .filter(Boolean);

      return {
        result,
        programme,
        participantTitle: registration.group_name || "Group",
        participantSubtitle: `${getTeamName(registration.team_id)} • Group`,
        teamId: registration.team_id,
        memberNames,
      };
    }

    const student = getStudent(registration.student_id);

    return {
      result,
      programme,
      participantTitle: student
        ? `#${normalizeChest(student.chest_no)} ${student.name}`
        : "Student",
      participantSubtitle: student
        ? `${getClassName(student.class_id)} • ${getTeamName(student.team_id)}`
        : getTeamName(registration.team_id),
      teamId: registration.team_id,
      memberNames: student ? [student.name] : [],
    };
  }

  const resultEntries = useMemo<ResultEntry[]>(() => {
    return publishedResults
      .map((result) => {
        const programme = programmes.find((item) => item.id === result.programme_id);
        if (!programme) return null;
        return buildResultEntry(result, programme);
      })
      .filter(Boolean) as ResultEntry[];
  }, [publishedResults, programmes, registrations, students, teams, classes]);

  const resultGroups = useMemo<ProgrammeResultGroup[]>(() => {
    const map = new Map<string, ProgrammeResultGroup>();

    resultEntries.forEach((entry) => {
      const current = map.get(entry.programme.id);

      if (!current) {
        map.set(entry.programme.id, {
          programme: entry.programme,
          entries: [entry],
          publishedAt: null,
        });
        return;
      }

      current.entries.push(entry);
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        entries: group.entries.sort((a, b) => {
          const aPos = a.result.position || 9999;
          const bPos = b.result.position || 9999;
          if (aPos !== bPos) return aPos - bPos;
          return Number(b.result.total_mark || 0) - Number(a.result.total_mark || 0);
        }),
        publishedAt: getLatestTimestamp(group.entries),
      }))
      .sort((a, b) => {
        const aDate = parseDate(a.publishedAt)?.getTime() || 0;
        const bDate = parseDate(b.publishedAt)?.getTime() || 0;
        if (aDate !== bDate) return bDate - aDate;
        return b.programme.sort_order - a.programme.sort_order;
      });
  }, [resultEntries]);

  const leaderboard = useMemo<TeamPoint[]>(() => {
    const map = new Map<string, number>();

    publishedResults.forEach((result) => {
      const registration = registrations.find(
        (item) => item.id === result.registration_id,
      );

      const teamId = registration?.team_id || null;
      if (!teamId) return;
      map.set(teamId, (map.get(teamId) || 0) + Number(result.points || 0));
    });

    return Array.from(map.entries())
      .map(([teamId, points]) => {
        const team = getTeam(teamId);
        return {
          teamId,
          teamName: team?.name || "Team",
          teamColor: team?.color || null,
          teamLogo: team?.logo_url || null,
          points,
        };
      })
      .sort((a, b) => b.points - a.points);
  }, [publishedResults, registrations, teams]);

  const publishedProgrammeIds = useMemo(
    () => new Set(publishedResults.map((item) => item.programme_id).filter(Boolean)),
    [publishedResults],
  );

  const publishedProgrammeCount = publishedProgrammeIds.size;
  const totalProgrammes = programmes.length;
  const progressPercent =
    totalProgrammes > 0
      ? Math.min(100, Math.round((publishedProgrammeCount / totalProgrammes) * 100))
      : 0;
  const remainingProgrammes = Math.max(0, totalProgrammes - publishedProgrammeCount);

  const slides = useMemo<LiveSlide[]>(() => {
    if (resultGroups.length === 0) {
      return [{ id: "waiting", kind: "waiting" }];
    }

    const recent = resultGroups.slice(0, MAX_RESULT_SLIDES);
    const deck: LiveSlide[] = [];

    recent.forEach((group, index) => {
      deck.push({
        id: `result-${group.programme.id}-${group.publishedAt || index}`,
        kind: "result",
        group,
        latest: index === 0,
      });

      // Keep the TV uncluttered: standings and progress appear as their own scenes.
      if (index === 0 && showPoints && leaderboard.length > 0) {
        deck.push({ id: "standings", kind: "standings" });
      }

      if (index === 1 || (recent.length === 1 && index === 0)) {
        deck.push({ id: "progress", kind: "progress" });
      }
    });

    if (!deck.some((slide) => slide.kind === "progress")) {
      deck.push({ id: "progress", kind: "progress" });
    }

    return deck;
  }, [resultGroups, showPoints, leaderboard.length]);

  const activeSlide = slides[displayedIndex] || slides[0] || null;

  useEffect(() => {
    if (displayedIndex >= slides.length) {
      setDisplayedIndex(0);
      setRotationEpoch((value) => value + 1);
    }
  }, [slides.length, displayedIndex]);

  function changeSlide(nextIndex: number, direction: "next" | "prev") {
    if (slides.length <= 1 || isLeaving) return;

    const normalized = ((nextIndex % slides.length) + slides.length) % slides.length;
    if (normalized === displayedIndex) return;

    setSlideDirection(direction);
    setIsLeaving(true);

    if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
    transitionTimer.current = window.setTimeout(() => {
      setDisplayedIndex(normalized);
      setIsLeaving(false);
      setRotationEpoch((value) => value + 1);
    }, TRANSITION_MS);
  }

  function showNext() {
    changeSlide(displayedIndex + 1, "next");
  }

  function showPrevious() {
    changeSlide(displayedIndex - 1, "prev");
  }

  useEffect(() => {
    if (isPaused || slides.length <= 1 || isLeaving) return;

    const timer = window.setTimeout(() => {
      changeSlide(displayedIndex + 1, "next");
    }, ROTATE_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [isPaused, slides.length, displayedIndex, rotationEpoch, isLeaving]);

  useEffect(() => {
    const latest = resultGroups[0];
    if (!latest) return;

    const signature = `${latest.programme.id}:${latest.publishedAt || ""}`;

    if (!latestGroupSignature.current) {
      latestGroupSignature.current = signature;
      return;
    }

    if (latestGroupSignature.current !== signature) {
      latestGroupSignature.current = signature;
      setSlideDirection("next");
      setIsLeaving(false);
      setDisplayedIndex(0);
      setRotationEpoch((value) => value + 1);
      setNewResultPulse(true);
      window.setTimeout(() => setNewResultPulse(false), 5000);
    }
  }, [resultGroups]);

  async function loadPublicData(initial: boolean) {
    if (!slug || fetchInFlight.current) return;

    fetchInFlight.current = true;

    if (initial) {
      setIsLoading(true);
      setLoadingError("");
    } else {
      setIsRefreshing(true);
    }

    try {
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(
          "id, organization_id, title, tagline, venue, start_date, end_date, public_slug, is_public",
        )
        .eq("public_slug", slug)
        .eq("is_public", true)
        .limit(1)
        .maybeSingle();

      if (eventError) throw eventError;
      if (!eventData) throw new Error("This public event is not available.");

      const activeEvent = eventData as EventInfo;

      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("id, name, slug, place, logo_url, status, plan_start, plan_end")
        .eq("id", activeEvent.organization_id)
        .limit(1)
        .maybeSingle();

      if (orgError) throw orgError;
      if (!orgData) throw new Error("Madrasa not found.");

      const activeOrganization = orgData as Organization;
      const organizationStatus = String(activeOrganization.status || "active")
        .trim()
        .toLowerCase();

      if (organizationStatus === "inactive" || organizationStatus === "disabled") {
        throw new Error("This madrasa public portal is currently inactive.");
      }

      if (isPlanExpired(activeOrganization.plan_end)) {
        throw new Error("This madrasa public portal plan has expired.");
      }

      const [
        programmeRes,
        categoryRes,
        teamRes,
        classRes,
        studentRes,
        registrationRes,
        resultRes,
        settingsRes,
      ] = await Promise.all([
        supabase
          .from("programmes")
          .select(
            "id, organization_id, event_id, name, programme_type, stage_type, category_id, gender_scope, sort_order, status",
          )
          .eq("organization_id", activeEvent.organization_id)
          .eq("event_id", activeEvent.id)
          .eq("status", "active")
          .order("sort_order", { ascending: true }),

        supabase
          .from("categories")
          .select("id, name")
          .eq("organization_id", activeEvent.organization_id)
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("teams")
          .select("id, name, code, color, logo_url")
          .eq("organization_id", activeEvent.organization_id)
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("classes")
          .select("id, name")
          .eq("organization_id", activeEvent.organization_id)
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("students")
          .select("id, chest_no, name, class_id, category_id, team_id")
          .eq("organization_id", activeEvent.organization_id)
          .eq("event_id", activeEvent.id),

        supabase
          .from("programme_registrations")
          .select(
            "id, organization_id, event_id, programme_id, student_id, team_id, group_name, registration_no, status, created_at",
          )
          .eq("organization_id", activeEvent.organization_id)
          .eq("event_id", activeEvent.id),

        supabase
          .from("results")
          .select(
            "id, organization_id, event_id, programme_id, registration_id, total_mark, average_mark, grade, position, points, is_published, published_at, created_at",
          )
          .eq("organization_id", activeEvent.organization_id)
          .eq("event_id", activeEvent.id)
          .eq("is_published", true),

        supabase
          .from("event_settings")
          .select("organization_id, event_id, theme_color, show_points")
          .eq("organization_id", activeEvent.organization_id)
          .eq("event_id", activeEvent.id)
          .maybeSingle(),
      ]);

      const firstError =
        programmeRes.error ||
        categoryRes.error ||
        teamRes.error ||
        classRes.error ||
        studentRes.error ||
        registrationRes.error ||
        resultRes.error;

      if (firstError) throw firstError;

      setOrganization(activeOrganization);
      setEventInfo(activeEvent);
      setProgrammes((programmeRes.data || []) as Programme[]);
      setCategories((categoryRes.data || []) as Category[]);
      setTeams((teamRes.data || []) as Team[]);
      setClasses((classRes.data || []) as ClassItem[]);
      setStudents((studentRes.data || []) as Student[]);
      setRegistrations((registrationRes.data || []) as Registration[]);
      setResults((resultRes.data || []) as ResultItem[]);

      setEventSettings({
        ...DEFAULT_SETTINGS,
        organization_id: activeEvent.organization_id,
        event_id: activeEvent.id,
        ...((settingsRes.data || {}) as Partial<EventSettings>),
      });

      setIsOnline(true);
      setLoadingError("");
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error("Live TV refresh failed:", error);
      setIsOnline(false);

      if (initial || !eventInfo) {
        setLoadingError(error?.message || "Unable to open Live TV Results.");
      }
    } finally {
      fetchInFlight.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen unavailable:", error);
    }
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (loadingError || !eventInfo || !organization) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050816] px-5 text-white">
        <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.05] p-8 text-center shadow-2xl backdrop-blur-xl">
          <WifiOff className="mx-auto text-rose-300" size={42} />
          <h1 className="mt-5 text-3xl font-black tracking-[-0.05em]">
            Live Results Unavailable
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-300">
            {loadingError || "This public event is not available."}
          </p>
          <Link
            href={`/event/${slug}`}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"
          >
            <ArrowLeft size={17} />
            Event Page
          </Link>
        </div>
      </main>
    );
  }

  const eventDate =
    eventInfo.start_date && eventInfo.end_date
      ? eventInfo.start_date === eventInfo.end_date
        ? formatDate(eventInfo.start_date)
        : `${formatDate(eventInfo.start_date)} – ${formatDate(eventInfo.end_date)}`
      : formatDate(eventInfo.start_date || eventInfo.end_date);

  const cssVars = {
    "--live-primary": theme.primary,
    "--live-bright": theme.bright,
    "--live-light": theme.light,
    "--live-deep": theme.deep,
    "--live-deep-2": theme.deep2,
    "--live-glow": theme.glow,
  } as CSSProperties;

  const sceneClass = isLeaving
    ? slideDirection === "next"
      ? "live-scene-exit-next"
      : "live-scene-exit-prev"
    : slideDirection === "next"
      ? "live-scene-enter-next"
      : "live-scene-enter-prev";

  return (
    <main
      className="relative min-h-[100dvh] overflow-hidden bg-[#050816] text-white"
      style={cssVars}
    >
      <style jsx global>{`
        @keyframes liveAuroraA {
          0%, 100% { transform: translate3d(-4%, -3%, 0) scale(1); opacity: .7; }
          50% { transform: translate3d(8%, 7%, 0) scale(1.18); opacity: 1; }
        }
        @keyframes liveAuroraB {
          0%, 100% { transform: translate3d(5%, 4%, 0) scale(1.1); opacity: .45; }
          50% { transform: translate3d(-8%, -5%, 0) scale(.95); opacity: .75; }
        }
        @keyframes liveSceneEnterNext {
          0% { opacity: 0; transform: translate3d(70px, 0, 0) scale(.982); filter: blur(10px); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }
        @keyframes liveSceneEnterPrev {
          0% { opacity: 0; transform: translate3d(-70px, 0, 0) scale(.982); filter: blur(10px); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }
        @keyframes liveSceneExitNext {
          0% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translate3d(-55px, 0, 0) scale(.988); filter: blur(8px); }
        }
        @keyframes liveSceneExitPrev {
          0% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translate3d(55px, 0, 0) scale(.988); filter: blur(8px); }
        }
        @keyframes liveWinnerRise {
          0% { opacity: 0; transform: translateY(34px) scale(.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes liveShine {
          0% { transform: translateX(-140%) skewX(-20deg); opacity: 0; }
          35% { opacity: .7; }
          70%, 100% { transform: translateX(190%) skewX(-20deg); opacity: 0; }
        }
        @keyframes livePulseDot {
          0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,.45); }
          50% { box-shadow: 0 0 0 8px rgba(52,211,153,0); }
        }
        @keyframes liveTimer {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        @keyframes liveRingGlow {
          0%,100% { filter: drop-shadow(0 0 14px var(--live-glow)); }
          50% { filter: drop-shadow(0 0 34px var(--live-glow)); }
        }
        .live-scene-enter-next { animation: liveSceneEnterNext .72s cubic-bezier(.16,.82,.23,1) both; }
        .live-scene-enter-prev { animation: liveSceneEnterPrev .72s cubic-bezier(.16,.82,.23,1) both; }
        .live-scene-exit-next { animation: liveSceneExitNext ${TRANSITION_MS}ms cubic-bezier(.5,0,.8,.2) both; }
        .live-scene-exit-prev { animation: liveSceneExitPrev ${TRANSITION_MS}ms cubic-bezier(.5,0,.8,.2) both; }
        .live-winner-rise { animation: liveWinnerRise .72s cubic-bezier(.16,.82,.23,1) both; }
        .live-timer { transform-origin: left; animation: liveTimer ${ROTATE_INTERVAL_MS}ms linear both; }
        .live-timer-paused { animation-play-state: paused; }
        .live-pulse-dot { animation: livePulseDot 1.8s ease-in-out infinite; }
        .live-ring-glow { animation: liveRingGlow 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .live-scene-enter-next,.live-scene-enter-prev,.live-scene-exit-next,.live-scene-exit-prev,
          .live-winner-rise,.live-timer,.live-pulse-dot,.live-ring-glow { animation: none !important; }
        }
      `}</style>

      <div
        className="pointer-events-none fixed -left-[16vw] -top-[28vh] h-[72vh] w-[72vw] rounded-full blur-[120px]"
        style={{ background: theme.glow, animation: "liveAuroraA 14s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none fixed -bottom-[34vh] -right-[12vw] h-[82vh] w-[62vw] rounded-full blur-[140px]"
        style={{ background: `${theme.primary}4D`, animation: "liveAuroraB 17s ease-in-out infinite" }}
      />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage: "linear-gradient(to bottom, black, transparent 82%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background: `linear-gradient(135deg, ${theme.deep}E8 0%, #060914E8 48%, ${theme.deep2}B8 100%)`,
        }}
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <header className="flex h-[92px] shrink-0 items-center border-b border-white/[0.08] bg-white/[0.025] px-5 backdrop-blur-2xl sm:px-8 lg:px-12">
          <div className="mx-auto flex w-full max-w-[1880px] items-center justify-between gap-6">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.15rem] border border-white/15 bg-white shadow-2xl sm:h-16 sm:w-16">
                {organization.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={organization.name}
                    className="h-full w-full object-contain p-1.5"
                  />
                ) : (
                  <Trophy className="text-[var(--live-primary)]" size={28} />
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.24em] text-white/45 sm:text-xs">
                  {organization.name} <span className="text-white/20">•</span> Live Results
                </p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-[-0.055em] sm:text-3xl">
                  {eventInfo.title}
                </h1>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2.5">
              <div
                className={`hidden items-center gap-2 rounded-full border px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] md:flex ${
                  isOnline
                    ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
                    : "border-rose-300/20 bg-rose-400/10 text-rose-200"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${isOnline ? "live-pulse-dot bg-emerald-300" : "bg-rose-300"}`} />
                {isOnline ? "Live Sync" : "Reconnecting"}
              </div>

              <div className="hidden rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-2.5 text-right sm:block">
                <p className="text-lg font-black tabular-nums tracking-[-0.04em]">
                  {formatTime(clock)}
                </p>
                <p className="text-[9px] font-black uppercase tracking-[0.17em] text-white/35">
                  {clock.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </p>
              </div>

              <ControlButton
                title={isPaused ? "Resume rotation" : "Pause rotation"}
                onClick={() => {
                  setIsPaused((current) => !current);
                  setRotationEpoch((value) => value + 1);
                }}
              >
                {isPaused ? <Play size={19} /> : <Pause size={19} />}
              </ControlButton>

              <ControlButton
                title={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? <Minimize2 size={19} /> : <Expand size={19} />}
              </ControlButton>
            </div>
          </div>
        </header>

        <section className="relative mx-auto flex w-full max-w-[1880px] flex-1 items-stretch px-4 py-4 sm:px-7 sm:py-6 lg:px-10 lg:py-7">
          <div className="relative min-h-[620px] w-full overflow-hidden rounded-[2.5rem] border border-white/[0.09] bg-white/[0.045] shadow-[0_34px_110px_rgba(0,0,0,.38)] backdrop-blur-2xl">
            <div
              className="absolute inset-x-0 top-0 z-30 h-[2px] opacity-80"
              style={{ background: `linear-gradient(90deg, transparent, ${theme.bright}, transparent)` }}
            />

            {newResultPulse && displayedIndex === 0 && (
              <div
                className="pointer-events-none absolute inset-0 z-20 rounded-[2.5rem] border-2"
                style={{ borderColor: theme.bright, boxShadow: `inset 0 0 100px ${theme.glow}, 0 0 80px ${theme.glow}` }}
              />
            )}

            <div
              key={`${activeSlide?.id || "none"}-${displayedIndex}-${rotationEpoch}`}
              className={`absolute inset-0 ${sceneClass}`}
            >
              {activeSlide?.kind === "result" && (
                <ResultScene
                  slide={activeSlide}
                  getCategoryName={getCategoryName}
                  getTeam={getTeam}
                  theme={theme}
                />
              )}

              {activeSlide?.kind === "standings" && (
                <StandingsScene leaderboard={leaderboard} theme={theme} />
              )}

              {activeSlide?.kind === "progress" && (
                <ProgressScene
                  progressPercent={progressPercent}
                  publishedProgrammeCount={publishedProgrammeCount}
                  totalProgrammes={totalProgrammes}
                  remainingProgrammes={remainingProgrammes}
                  latestGroup={resultGroups[0] || null}
                  leader={leaderboard[0] || null}
                  getCategoryName={getCategoryName}
                  theme={theme}
                />
              )}

              {activeSlide?.kind === "waiting" && (
                <WaitingScene eventTitle={eventInfo.title} theme={theme} />
              )}
            </div>

            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-30 h-1 bg-white/[0.055]">
              {!isPaused && slides.length > 1 && (
                <div
                  key={`timer-${activeSlide?.id}-${displayedIndex}-${rotationEpoch}`}
                  className="live-timer h-full"
                  style={{ background: `linear-gradient(90deg, ${theme.primary}, ${theme.bright})` }}
                />
              )}
            </div>
          </div>
        </section>

        <footer className="shrink-0 px-5 pb-4 sm:px-8 lg:px-12">
          <div className="mx-auto flex max-w-[1880px] items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 backdrop-blur-xl sm:px-5">
            <div className="flex min-w-0 items-center gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-xs">
              <Link href={`/event/${slug}`} className="hidden items-center gap-2 transition hover:text-white/70 sm:flex">
                <ArrowLeft size={14} /> Event Page
              </Link>
              {eventDate && <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />}
              {eventDate && <span className="hidden md:block">{eventDate}</span>}
              {eventInfo.venue && <span className="hidden h-1 w-1 rounded-full bg-white/20 lg:block" />}
              {eventInfo.venue && (
                <span className="hidden min-w-0 items-center gap-1.5 truncate lg:flex">
                  <MapPin size={13} /> {eventInfo.venue}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={showPrevious}
                disabled={slides.length <= 1 || isLeaving}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                title="Previous scene"
              >
                <ChevronLeft size={17} />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                {slides.slice(0, 10).map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => changeSlide(index, index >= displayedIndex ? "next" : "prev")}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === displayedIndex ? "w-8 bg-white" : "w-2 bg-white/20 hover:bg-white/40"
                    }`}
                    title={`Scene ${index + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={showNext}
                disabled={slides.length <= 1 || isLeaving}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] text-white/65 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
                title="Next scene"
              >
                <ChevronRight size={17} />
              </button>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/35 sm:text-xs">
              <button
                type="button"
                onClick={() => loadPublicData(false)}
                disabled={isRefreshing}
                className="hidden items-center gap-2 transition hover:text-white/70 sm:flex"
              >
                <RefreshCcw className={isRefreshing ? "animate-spin" : ""} size={13} />
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                  : "Sync"}
              </button>
              <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />
              <span className="flex items-center gap-2">
                <Radio size={13} className="text-[var(--live-bright)]" /> FestEazy
              </span>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

function ResultScene({
  slide,
  getCategoryName,
  getTeam,
  theme,
}: {
  slide: Extract<LiveSlide, { kind: "result" }>;
  getCategoryName: (id: string | null) => string;
  getTeam: (id: string | null) => Team | null;
  theme: ReturnType<typeof getThemeStyle>;
}) {
  const { group, latest } = slide;
  const winners = group.entries
    .filter((entry) => String(entry.result.grade || "").trim().toLowerCase() !== "absent")
    .slice(0, 3);

  const first = winners.find((entry) => entry.result.position === 1) || winners[0] || null;
  const second = winners.find((entry) => entry.result.position === 2) || winners[1] || null;
  const third = winners.find((entry) => entry.result.position === 3) || winners[2] || null;

  return (
    <div className="relative flex h-full min-h-[620px] flex-col overflow-hidden px-6 py-6 sm:px-9 sm:py-8 lg:px-14 lg:py-10 xl:px-16">
      <div
        className="pointer-events-none absolute -right-20 -top-28 h-[430px] w-[430px] rounded-full blur-[95px]"
        style={{ background: `${theme.primary}33` }}
      />
      <div className="pointer-events-none absolute right-[4%] top-[8%] text-[220px] font-black leading-none text-white/[0.018] lg:text-[320px]">
        {String(group.programme.sort_order || 1).padStart(2, "0")}
      </div>

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.065] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/70">
              <Radio size={14} className={latest ? "text-[var(--live-bright)]" : "text-white/45"} />
              {latest ? "Just Published" : "Result Highlight"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/45">
              {getCategoryName(group.programme.category_id)} • {normalizeGender(group.programme.gender_scope)}
            </span>
          </div>

          <h2 className="mt-5 max-w-[1250px] text-4xl font-black uppercase leading-[.94] tracking-[-0.07em] sm:text-5xl lg:text-6xl xl:text-[76px]">
            {group.programme.name}
          </h2>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-white/42 sm:text-sm">
            <span>{formatProgrammeType(group.programme.programme_type)}</span>
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span>{formatStageType(group.programme.stage_type)}</span>
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span>{timeAgo(group.publishedAt)}</span>
          </div>
        </div>

        <div className="hidden rounded-[1.4rem] border border-white/10 bg-white/[0.055] px-5 py-4 text-right lg:block">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">Published</p>
          <p className="mt-1 text-xl font-black tabular-nums">{formatPublishedTime(group.publishedAt)}</p>
        </div>
      </div>

      <div className="relative z-10 mt-7 grid flex-1 items-end gap-4 md:grid-cols-3 lg:gap-5 xl:gap-7">
        <PodiumCard entry={second} team={second ? getTeam(second.teamId) : null} position={2} delay=".12s" />
        <PodiumCard entry={first} team={first ? getTeam(first.teamId) : null} position={1} featured delay="0s" />
        <PodiumCard entry={third} team={third ? getTeam(third.teamId) : null} position={3} delay=".22s" />
      </div>
    </div>
  );
}

function PodiumCard({
  entry,
  team,
  position,
  featured = false,
  delay,
}: {
  entry: ResultEntry | null;
  team: Team | null;
  position: number;
  featured?: boolean;
  delay: string;
}) {
  if (!entry) {
    return (
      <div
        className={`live-winner-rise flex min-h-[230px] items-center justify-center rounded-[2rem] border border-white/[0.08] bg-white/[0.035] ${featured ? "md:min-h-[315px]" : "md:min-h-[270px]"}`}
        style={{ animationDelay: delay }}
      >
        <Medal className="text-white/15" size={38} />
      </div>
    );
  }

  const chest = extractChest(entry.participantTitle);
  const name = cleanParticipantName(entry.participantTitle);
  const teamName = team?.name || entry.participantSubtitle || "-";

  return (
    <div
      className={`live-winner-rise group relative overflow-hidden rounded-[2.1rem] border p-5 backdrop-blur-xl sm:p-6 lg:p-7 ${
        featured
          ? "border-[var(--live-bright)]/30 bg-white/[0.105] md:min-h-[315px] md:-translate-y-5 shadow-[0_24px_70px_var(--live-glow)]"
          : "border-white/10 bg-white/[0.055] md:min-h-[270px]"
      }`}
      style={{ animationDelay: delay }}
    >
      {featured && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-1/3 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" style={{ animation: "liveShine 4.4s ease-in-out infinite 1.2s" }} />
        </div>
      )}

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex items-center justify-center rounded-[1.35rem] border border-white/10 bg-white/[0.07] ${featured ? "h-16 w-16 text-4xl" : "h-14 w-14 text-3xl"}`}>
            {getMedal(position)}
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/45">
            {getPositionText(position)}
          </span>
        </div>

        <div className="mt-auto pt-6">
          {chest && (
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--live-bright)]">Chest #{chest}</p>
          )}
          <h3 className={`mt-1.5 line-clamp-2 font-black uppercase leading-[.98] tracking-[-0.055em] ${featured ? "text-3xl lg:text-4xl xl:text-[42px]" : "text-2xl lg:text-3xl"}`}>
            {name}
          </h3>

          {entry.programme.programme_type === "group" && entry.memberNames.length > 0 && (
            <p className="mt-3 line-clamp-2 text-xs font-bold leading-5 text-white/38">
              {entry.memberNames.slice(0, 5).join(" • ")}
              {entry.memberNames.length > 5 ? ` +${entry.memberNames.length - 5} more` : ""}
            </p>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
            <div className="flex min-w-0 items-center gap-2.5">
              {team?.logo_url ? (
                <img src={team.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain bg-white/90 p-1" />
              ) : (
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: team?.color || "var(--live-primary)" }} />
              )}
              <p className="truncate text-xs font-black uppercase tracking-[0.08em] text-white/72 sm:text-sm">{teamName}</p>
            </div>
            {entry.result.grade && (
              <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.14em] text-white/35">Grade {entry.result.grade}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StandingsScene({
  leaderboard,
  theme,
}: {
  leaderboard: TeamPoint[];
  theme: ReturnType<typeof getThemeStyle>;
}) {
  const top = leaderboard.slice(0, 6);

  return (
    <div className="relative flex h-full min-h-[620px] flex-col overflow-hidden px-6 py-7 sm:px-9 sm:py-9 lg:px-14 lg:py-11 xl:px-16">
      <Trophy className="pointer-events-none absolute -right-10 -top-20 h-[420px] w-[420px] text-white/[0.018]" />
      <div className="relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/65">
          <Trophy size={14} className="text-[var(--live-bright)]" /> Championship
        </span>
        <h2 className="mt-4 text-4xl font-black uppercase tracking-[-0.065em] sm:text-5xl lg:text-6xl xl:text-[72px]">
          Team Standings
        </h2>
        <p className="mt-2 text-sm font-bold text-white/40 sm:text-base">Live points from published results.</p>
      </div>

      {top.length === 0 ? (
        <div className="relative z-10 flex flex-1 items-center justify-center text-center">
          <div>
            <Trophy className="mx-auto text-white/15" size={56} />
            <p className="mt-5 text-2xl font-black">No team points yet</p>
          </div>
        </div>
      ) : (
        <div className="relative z-10 mt-8 grid flex-1 gap-4 lg:grid-cols-2 lg:gap-5">
          {top.map((team, index) => {
            const leaderPoints = Math.max(1, top[0]?.points || 1);
            const width = Math.max(5, Math.round((team.points / leaderPoints) * 100));
            return (
              <div
                key={team.teamId}
                className={`live-winner-rise relative overflow-hidden rounded-[2rem] border p-5 sm:p-6 ${index === 0 ? "border-[var(--live-bright)]/30 bg-white/[0.10]" : "border-white/10 bg-white/[0.05]"}`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex shrink-0 items-center justify-center rounded-[1.35rem] border border-white/10 bg-white/[0.07] ${index === 0 ? "h-16 w-16 text-3xl" : "h-14 w-14 text-2xl"}`}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      {team.teamLogo ? (
                        <img src={team.teamLogo} alt="" className="h-9 w-9 shrink-0 rounded-xl bg-white/90 object-contain p-1" />
                      ) : (
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: team.teamColor || theme.primary }} />
                      )}
                      <h3 className="truncate text-xl font-black uppercase tracking-[-0.035em] sm:text-2xl lg:text-3xl">{team.teamName}</h3>
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div className="h-full rounded-full" style={{ width: `${width}%`, background: `linear-gradient(90deg, ${theme.primary}, ${theme.bright})` }} />
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-3xl font-black tabular-nums tracking-[-0.055em] sm:text-4xl">{team.points}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.17em] text-white/35">points</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProgressScene({
  progressPercent,
  publishedProgrammeCount,
  totalProgrammes,
  remainingProgrammes,
  latestGroup,
  leader,
  getCategoryName,
  theme,
}: {
  progressPercent: number;
  publishedProgrammeCount: number;
  totalProgrammes: number;
  remainingProgrammes: number;
  latestGroup: ProgrammeResultGroup | null;
  leader: TeamPoint | null;
  getCategoryName: (id: string | null) => string;
  theme: ReturnType<typeof getThemeStyle>;
}) {
  return (
    <div className="relative grid h-full min-h-[620px] overflow-hidden px-6 py-7 sm:px-9 sm:py-9 lg:grid-cols-[.88fr_1.12fr] lg:gap-12 lg:px-14 lg:py-11 xl:px-16">
      <div className="flex items-center justify-center">
        <div
          className="live-ring-glow relative flex h-[300px] w-[300px] items-center justify-center rounded-full p-[18px] sm:h-[360px] sm:w-[360px] lg:h-[420px] lg:w-[420px]"
          style={{
            background: `conic-gradient(${theme.bright} 0 ${progressPercent}%, rgba(255,255,255,.075) ${progressPercent}% 100%)`,
          }}
        >
          <div className="flex h-full w-full flex-col items-center justify-center rounded-full border border-white/10 bg-[#08101c]/90 shadow-inner backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/35 sm:text-xs">Event Progress</p>
            <p className="mt-2 text-7xl font-black tabular-nums tracking-[-0.09em] sm:text-8xl lg:text-[108px]">{progressPercent}%</p>
            <p className="mt-2 text-xs font-black uppercase tracking-[0.14em] text-white/35 sm:text-sm">Results Published</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center py-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/65">
          <Sparkles size={14} className="text-[var(--live-bright)]" /> Event Pulse
        </span>
        <h2 className="mt-5 text-4xl font-black uppercase leading-[.95] tracking-[-0.065em] sm:text-5xl lg:text-6xl xl:text-[72px]">The Fest Is Moving</h2>
        <p className="mt-3 max-w-2xl text-sm font-bold leading-6 text-white/40 sm:text-base">Automatic progress based on programmes with published results.</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:gap-4">
          <MetricBox label="Published" value={String(publishedProgrammeCount)} note="programmes" />
          <MetricBox label="Remaining" value={String(remainingProgrammes)} note="programmes" />
          <MetricBox label="Total" value={String(totalProgrammes)} note="programmes" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:gap-4">
          <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Latest Result</p>
            <p className="mt-2 truncate text-lg font-black uppercase tracking-[-0.025em] sm:text-xl">{latestGroup?.programme.name || "Waiting"}</p>
            {latestGroup && (
              <p className="mt-1 text-xs font-bold text-white/35">{getCategoryName(latestGroup.programme.category_id)} • {timeAgo(latestGroup.publishedAt)}</p>
            )}
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.045] p-5">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">Leading Team</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="truncate text-lg font-black uppercase tracking-[-0.025em] sm:text-xl">{leader?.teamName || "-"}</p>
              {leader && <span className="text-xl font-black tabular-nums text-[var(--live-bright)]">{leader.points}</span>}
            </div>
            <p className="mt-1 text-xs font-bold text-white/35">Current championship points</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WaitingScene({
  eventTitle,
  theme,
}: {
  eventTitle: string;
  theme: ReturnType<typeof getThemeStyle>;
}) {
  return (
    <div className="relative flex h-full min-h-[620px] items-center justify-center overflow-hidden p-8 text-center">
      <div className="absolute h-[440px] w-[440px] rounded-full blur-[110px]" style={{ background: `${theme.primary}33` }} />
      <div className="relative z-10 max-w-3xl">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/12 bg-white/[0.06] shadow-2xl">
          <Radio className="text-[var(--live-bright)]" size={38} />
        </div>
        <p className="mt-7 text-[10px] font-black uppercase tracking-[0.24em] text-[var(--live-bright)]">Live Results Display</p>
        <h2 className="mt-3 text-4xl font-black uppercase leading-[.96] tracking-[-0.065em] sm:text-5xl lg:text-7xl">{eventTitle}</h2>
        <p className="mx-auto mt-5 max-w-xl text-sm font-bold leading-6 text-white/42 sm:text-base">The screen will update automatically when the first result is published.</p>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-xs font-black uppercase tracking-[0.15em] text-white/55">
          <span className="live-pulse-dot h-2 w-2 rounded-full bg-emerald-300" /> Waiting for published results
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[1.55rem] border border-white/10 bg-white/[0.045] p-5">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/35">{label}</p>
      <p className="mt-1 text-3xl font-black tabular-nums tracking-[-0.055em] sm:text-4xl">{value}</p>
      <p className="mt-1 text-[10px] font-bold text-white/30">{note}</p>
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] text-white/72 transition hover:-translate-y-0.5 hover:bg-white/10 hover:text-white sm:h-12 sm:w-12"
    >
      {children}
    </button>
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050816] px-5 text-white">
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-2xl">
          <RefreshCcw className="animate-spin" size={32} />
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-[-0.05em]">Opening Live TV</h1>
        <p className="mt-2 text-sm font-bold text-slate-400">Connecting to published results…</p>
      </div>
    </main>
  );
}