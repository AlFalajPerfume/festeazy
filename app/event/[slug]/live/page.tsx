/* eslint-disable */
"use client";

import {
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

const REFRESH_INTERVAL_MS = 10000;
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

function buildResultSignature(results: ResultItem[]) {
  return results
    .map((result) =>
      [
        result.id,
        result.programme_id || "",
        result.registration_id || "",
        result.position ?? "",
        result.points ?? "",
        result.total_mark ?? "",
        result.average_mark ?? "",
        result.grade || "",
        result.published_at || "",
      ].join(":"),
    )
    .sort()
    .join("|");
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
  const liveEventRef = useRef<EventInfo | null>(null);
  const liveProgrammesRef = useRef<Programme[]>([]);
  const resultSignatureRef = useRef("");

  const theme = getThemeStyle(eventSettings.theme_color);
  const showPoints = eventSettings.show_points !== false;
  const studentLookupUrl = slug
    ? `https://festeazy.com/event/${encodeURIComponent(slug)}/student`
    : "";

  useEffect(() => {
    void loadPublicData();

    const refreshTimer = window.setInterval(() => {
      void refreshLiveResults();
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

  async function requestLiveData(mode: "bootstrap" | "results" | "participants") {
    const response = await fetch(
      `/api/public/event/${encodeURIComponent(slug)}/live?mode=${mode}`,
      { cache: "no-store" },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Unable to load Live Results.");
    }

    return payload;
  }

  async function loadPublicData() {
    if (!slug || fetchInFlight.current) return;

    fetchInFlight.current = true;
    setIsLoading(true);
    setLoadingError("");

    try {
      const payload = await requestLiveData("bootstrap");
      const activeEvent = payload.event as EventInfo | undefined;
      const activeOrganization = payload.organization as Organization | undefined;
      const loadedProgrammes = (payload.programmes || []) as Programme[];
      const loadedResults = (payload.results || []) as ResultItem[];

      if (!activeEvent || !activeOrganization) {
        throw new Error("This event is not available.");
      }

      liveEventRef.current = activeEvent;
      liveProgrammesRef.current = loadedProgrammes;
      resultSignatureRef.current = buildResultSignature(loadedResults);

      setOrganization(activeOrganization);
      setEventInfo(activeEvent);
      setProgrammes(loadedProgrammes);
      setCategories((payload.categories || []) as Category[]);
      setTeams((payload.teams || []) as Team[]);
      setClasses((payload.classes || []) as ClassItem[]);
      setStudents((payload.students || []) as Student[]);
      setRegistrations((payload.registrations || []) as Registration[]);
      setResults(loadedResults);

      setEventSettings({
        ...DEFAULT_SETTINGS,
        organization_id: activeEvent.organization_id,
        event_id: activeEvent.id,
        ...((payload.settings || {}) as Partial<EventSettings>),
      });

      setIsOnline(true);
      setLoadingError("");
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error("Live TV initial load failed:", error);
      setIsOnline(false);
      setLoadingError(error?.message || "Unable to open Live TV Results.");
    } finally {
      fetchInFlight.current = false;
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function refreshLiveResults() {
    if (!liveEventRef.current || fetchInFlight.current) return;

    fetchInFlight.current = true;
    setIsRefreshing(true);

    try {
      // Every 10 seconds only the published result rows are requested.
      // Static programmes, teams, classes and event information are not reloaded.
      const resultPayload = await requestLiveData("results");
      const nextResults = (resultPayload.results || []) as ResultItem[];
      const nextSignature = buildResultSignature(nextResults);

      if (nextSignature !== resultSignatureRef.current) {
        // Participant details are refreshed only when the published result set
        // actually changes, so new group members/names can render correctly.
        const participantPayload = await requestLiveData("participants");
        const changedResults = (participantPayload.results || []) as ResultItem[];

        setStudents((participantPayload.students || []) as Student[]);
        setRegistrations(
          (participantPayload.registrations || []) as Registration[],
        );
        setResults(changedResults);
        resultSignatureRef.current = buildResultSignature(changedResults);
      }

      setIsOnline(true);
      setLoadingError("");
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error("Live TV result refresh failed:", error);
      setIsOnline(false);
    } finally {
      fetchInFlight.current = false;
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
      <main className="tv-root tv-center-screen" style={{ backgroundColor: theme.deep }}>
        <style jsx global>{TV_SAFE_CSS}</style>
        <div className="tv-error-card">
          <WifiOff size={42} />
          <h1>Live Results Unavailable</h1>
          <p>{loadingError || "This public event is not available."}</p>
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

  const studentLookupQrUrl = studentLookupUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=0&data=${encodeURIComponent(
        studentLookupUrl,
      )}`
    : "";

  return (
    <main
      className="tv-root"
      style={{
        backgroundColor: theme.deep,
        backgroundImage: `linear-gradient(135deg, ${theme.deep} 0%, #07101f 52%, ${theme.deep2} 100%)`,
      }}
    >
      <style jsx global>{TV_SAFE_CSS}</style>

      <div className="tv-shell">
        <header className="tv-header">
          <div className="tv-brand">
            <div className="tv-org-logo" style={{ borderColor: theme.primary }}>
              {organization.logo_url ? (
                <img src={organization.logo_url} alt={organization.name} />
              ) : (
                <Trophy size={30} color={theme.primary} />
              )}
            </div>

            <div className="tv-brand-copy">
              <div className="tv-eyebrow">
                {organization.name} <span>•</span> Live Results
              </div>
              <div className="tv-title">{eventInfo.title}</div>
            </div>
          </div>

          <div className="tv-header-actions">
            <div className={`tv-status ${isOnline ? "online" : "offline"}`}>
              <span className="tv-status-dot" />
              {isOnline ? "Live Sync" : "Reconnecting"}
            </div>

            <div className="tv-clock-box">
              <div className="tv-clock">{formatTime(clock)}</div>
              <div className="tv-clock-date">
                {clock.toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                })}
              </div>
            </div>

            <ControlButton
              title={isPaused ? "Resume rotation" : "Pause rotation"}
              onClick={() => {
                setIsPaused((current) => !current);
                setRotationEpoch((value) => value + 1);
              }}
            >
              {isPaused ? <Play size={18} /> : <Pause size={18} />}
            </ControlButton>

            <ControlButton
              title={isFullscreen ? "Exit fullscreen" : "Open fullscreen"}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Expand size={18} />}
            </ControlButton>
          </div>
        </header>

        <section className="tv-stage-wrap">
          <div className="tv-stage" style={{ borderColor: `${theme.primary}66` }}>
            {newResultPulse && displayedIndex === 0 && (
              <div className="tv-new-result-ring" style={{ borderColor: theme.bright }} />
            )}

            <div
              key={`${activeSlide?.id || "none"}-${displayedIndex}-${rotationEpoch}`}
              className={`tv-scene ${isLeaving ? "tv-scene-leaving" : "tv-scene-entering"}`}
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

            {!isPaused && slides.length > 1 && (
              <div className="tv-timer-track">
                <div
                  key={`timer-${activeSlide?.id}-${displayedIndex}-${rotationEpoch}`}
                  className="tv-timer-bar"
                  style={{
                    backgroundColor: theme.bright,
                    animationDuration: `${ROTATE_INTERVAL_MS}ms`,
                  }}
                />
              </div>
            )}
          </div>
        </section>

        <footer className="tv-footer">
          <div className="tv-footer-left">
            {eventDate && <span>{eventDate}</span>}
            {eventInfo.venue && (
              <span className="tv-venue"><MapPin size={13} /> {eventInfo.venue}</span>
            )}
          </div>

          <div className="tv-nav">
            <button
              type="button"
              onClick={showPrevious}
              disabled={slides.length <= 1 || isLeaving}
              className="tv-nav-button"
              title="Previous scene"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="tv-dots">
              {slides.slice(0, 10).map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => changeSlide(index, index >= displayedIndex ? "next" : "prev")}
                  className={`tv-dot ${index === displayedIndex ? "active" : ""}`}
                  title={`Scene ${index + 1}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={showNext}
              disabled={slides.length <= 1 || isLeaving}
              className="tv-nav-button"
              title="Next scene"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="tv-footer-right">
            {studentLookupQrUrl && (
              <a
                href={studentLookupUrl}
                target="_blank"
                rel="noreferrer"
                className="tv-qr-link"
                title="Open Student Lookup"
              >
                <span className="tv-qr-copy">
                  <strong>Student Lookup</strong>
                  <small>Scan to find programmes</small>
                </span>
                <img src={studentLookupQrUrl} alt="Student Lookup QR" />
              </a>
            )}

            <button
              type="button"
              onClick={() => void refreshLiveResults()}
              disabled={isRefreshing}
              className="tv-refresh-button"
              title="Refresh now"
            >
              <RefreshCcw size={14} />
              <span>
                {lastUpdated
                  ? lastUpdated.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "Refresh"}
              </span>
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}

const TV_SAFE_CSS = `
  html, body { margin: 0; padding: 0; background: #050816; }
  *, *:before, *:after { box-sizing: border-box; }
  button, input { font: inherit; }
  button { cursor: pointer; }
  button:disabled { cursor: default; opacity: .4; }

  .tv-root {
    width: 100%;
    min-height: 100vh;
    color: #ffffff;
    overflow: hidden;
    font-family: Arial, Helvetica, sans-serif;
  }
  .tv-shell { min-height: 100vh; display: flex; flex-direction: column; }
  .tv-center-screen { display: flex; align-items: center; justify-content: center; padding: 24px; }
  .tv-error-card {
    width: 100%; max-width: 620px; padding: 34px; text-align: center;
    border: 1px solid #334155; border-radius: 28px; background: #0f172a;
  }
  .tv-error-card h1 { margin: 18px 0 0; font-size: 34px; }
  .tv-error-card p { margin: 12px 0 0; color: #cbd5e1; font-weight: 700; line-height: 1.6; }

  .tv-header {
    height: 92px; min-height: 92px; padding: 12px 42px; display: flex;
    align-items: center; justify-content: space-between; border-bottom: 1px solid #263244;
    background: #08101c;
  }
  .tv-brand { min-width: 0; display: flex; align-items: center; }
  .tv-org-logo {
    width: 64px; height: 64px; min-width: 64px; display: flex; align-items: center;
    justify-content: center; overflow: hidden; border: 2px solid #334155; border-radius: 16px;
    background: #ffffff; margin-right: 16px;
  }
  .tv-org-logo img { width: 100%; height: 100%; object-fit: contain; padding: 4px; display: block; }
  .tv-brand-copy { min-width: 0; }
  .tv-eyebrow { color: #9fb0c6; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tv-eyebrow span { color: #54657c; }
  .tv-title { margin-top: 5px; max-width: 840px; font-size: 28px; line-height: 1.05; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .tv-header-actions { display: flex; align-items: center; margin-left: 20px; }
  .tv-status { display: flex; align-items: center; height: 40px; padding: 0 14px; border: 1px solid #334155; border-radius: 20px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-right: 10px; }
  .tv-status.online { color: #a7f3d0; background: #0d2b25; }
  .tv-status.offline { color: #fecdd3; background: #33131c; }
  .tv-status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; margin-right: 8px; }
  .tv-clock-box { min-width: 108px; padding: 7px 12px; border: 1px solid #263244; border-radius: 14px; background: #101a29; text-align: right; margin-right: 10px; }
  .tv-clock { font-size: 18px; font-weight: 900; }
  .tv-clock-date { margin-top: 2px; color: #7f90a7; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .tv-control-button {
    width: 46px; height: 46px; margin-left: 8px; display: flex; align-items: center; justify-content: center;
    border: 1px solid #334155; border-radius: 13px; background: #101a29; color: #ffffff;
  }

  .tv-stage-wrap { flex: 1; min-height: 0; padding: 20px 34px; display: flex; }
  .tv-stage {
    position: relative; width: 100%; min-height: 560px; overflow: hidden; border: 1px solid #2c3d53;
    border-radius: 30px; background: #0a1321;
  }
  .tv-scene { position: absolute; left: 0; top: 0; right: 0; bottom: 0; }
  .tv-scene-entering { animation: tvSceneIn .45s ease-out both; }
  .tv-scene-leaving { animation: tvSceneOut ${TRANSITION_MS}ms ease-in both; }
  .tv-new-result-ring { position: absolute; left: 4px; top: 4px; right: 4px; bottom: 4px; z-index: 5; pointer-events: none; border: 2px solid; border-radius: 26px; }
  @keyframes tvSceneIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes tvSceneOut { from { opacity: 1; } to { opacity: 0; } }
  @keyframes tvTimer { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  .tv-timer-track { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: #172233; z-index: 8; }
  .tv-timer-bar { width: 100%; height: 100%; transform-origin: left center; animation-name: tvTimer; animation-timing-function: linear; animation-fill-mode: both; }

  .tv-scene-inner { height: 100%; min-height: 560px; padding: 36px 48px; display: flex; flex-direction: column; }
  .tv-scene-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .tv-scene-kicker { display: inline-block; padding: 8px 13px; border: 1px solid #334155; border-radius: 18px; background: #101a29; color: #d7e0eb; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.6px; }
  .tv-scene-title { margin: 16px 0 0; max-width: 1200px; font-size: 58px; line-height: .96; font-weight: 900; text-transform: uppercase; letter-spacing: -2px; }
  .tv-scene-meta { margin-top: 12px; color: #93a4ba; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
  .tv-published { min-width: 128px; padding: 12px 14px; border: 1px solid #263244; border-radius: 14px; background: #101a29; text-align: right; }
  .tv-published small { display: block; color: #7f90a7; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .tv-published strong { display: block; margin-top: 3px; font-size: 19px; }

  .tv-podium { flex: 1; min-height: 0; display: flex; align-items: flex-end; justify-content: center; margin-top: 24px; }
  .tv-podium-card {
    width: 32%; min-height: 245px; margin: 0 7px; padding: 22px; display: flex; flex-direction: column;
    border: 1px solid #2b3a4d; border-radius: 24px; background: #111c2a;
  }
  .tv-podium-card.featured { min-height: 292px; border-width: 2px; background: #142235; }
  .tv-podium-card.empty { align-items: center; justify-content: center; color: #58697f; }
  .tv-medal-row { display: flex; align-items: center; justify-content: space-between; }
  .tv-medal { font-size: 38px; }
  .tv-position-pill { padding: 6px 9px; border: 1px solid #334155; border-radius: 16px; color: #9fb0c6; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .tv-podium-copy { margin-top: auto; padding-top: 18px; }
  .tv-chest { margin: 0; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.4px; }
  .tv-winner-name { margin: 6px 0 0; font-size: 29px; line-height: 1; font-weight: 900; text-transform: uppercase; }
  .tv-podium-card.featured .tv-winner-name { font-size: 36px; }
  .tv-member-list { margin: 10px 0 0; color: #9aaac0; font-size: 11px; line-height: 1.45; font-weight: 700; }
  .tv-team-line { margin-top: 15px; padding-top: 13px; border-top: 1px solid #2a384b; display: flex; align-items: center; justify-content: space-between; }
  .tv-team-name { min-width: 0; display: flex; align-items: center; font-size: 12px; font-weight: 900; text-transform: uppercase; }
  .tv-team-name img { width: 30px; height: 30px; object-fit: contain; background: #ffffff; border-radius: 8px; padding: 2px; margin-right: 8px; }
  .tv-team-color { width: 11px; height: 11px; border-radius: 50%; margin-right: 8px; }
  .tv-grade { color: #7f90a7; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }

  .tv-standings-list { flex: 1; min-height: 0; display: flex; flex-wrap: wrap; align-content: center; margin: 20px -7px 0; }
  .tv-standing-row { width: calc(50% - 14px); margin: 7px; padding: 18px; display: flex; align-items: center; border: 1px solid #2a3a4e; border-radius: 20px; background: #111c2a; }
  .tv-standing-rank { width: 54px; height: 54px; min-width: 54px; margin-right: 14px; display: flex; align-items: center; justify-content: center; border: 1px solid #334155; border-radius: 16px; background: #152234; font-size: 25px; font-weight: 900; }
  .tv-standing-main { flex: 1; min-width: 0; }
  .tv-standing-title { display: flex; align-items: center; min-width: 0; }
  .tv-standing-title img { width: 34px; height: 34px; object-fit: contain; background: #fff; border-radius: 8px; padding: 2px; margin-right: 9px; }
  .tv-standing-title h3 { margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 24px; text-transform: uppercase; }
  .tv-standing-bar { height: 6px; margin-top: 12px; overflow: hidden; border-radius: 4px; background: #1b293a; }
  .tv-standing-bar span { display: block; height: 100%; }
  .tv-standing-points { min-width: 92px; margin-left: 14px; text-align: right; }
  .tv-standing-points strong { display: block; font-size: 35px; }
  .tv-standing-points small { color: #7f90a7; font-size: 9px; font-weight: 900; text-transform: uppercase; }

  .tv-progress-layout { flex: 1; min-height: 0; display: flex; align-items: center; }
  .tv-progress-big { width: 36%; text-align: center; }
  .tv-progress-circle { width: 300px; height: 300px; max-width: 90%; margin: 0 auto; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 18px solid #243247; border-radius: 50%; background: #0c1624; }
  .tv-progress-circle strong { font-size: 82px; line-height: 1; }
  .tv-progress-circle span { margin-top: 8px; color: #93a4ba; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .tv-progress-copy { width: 64%; padding-left: 38px; }
  .tv-progress-copy h2 { margin: 14px 0 0; font-size: 52px; line-height: 1; text-transform: uppercase; }
  .tv-progress-copy > p { margin: 10px 0 0; color: #93a4ba; font-weight: 700; }
  .tv-metrics { display: flex; margin: 22px -5px 0; }
  .tv-metric { width: 33.333%; margin: 5px; padding: 17px; border: 1px solid #2a394d; border-radius: 18px; background: #101a29; }
  .tv-metric small { display: block; color: #7f90a7; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .tv-metric strong { display: block; margin-top: 5px; font-size: 32px; }
  .tv-metric span { display: block; margin-top: 3px; color: #708198; font-size: 10px; font-weight: 700; }
  .tv-two-cards { display: flex; margin: 8px -5px 0; }
  .tv-small-card { width: 50%; margin: 5px; padding: 16px; border: 1px solid #2a394d; border-radius: 18px; background: #101a29; }
  .tv-small-card small { color: #7f90a7; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .tv-small-card strong { display: block; margin-top: 6px; font-size: 18px; text-transform: uppercase; }
  .tv-small-card span { display: block; margin-top: 5px; color: #8697ad; font-size: 11px; }

  .tv-waiting { height: 100%; min-height: 560px; display: flex; align-items: center; justify-content: center; padding: 40px; text-align: center; }
  .tv-waiting-inner { max-width: 900px; }
  .tv-waiting-icon { width: 88px; height: 88px; margin: 0 auto; display: flex; align-items: center; justify-content: center; border: 1px solid #334155; border-radius: 24px; background: #111c2a; }
  .tv-waiting-kicker { margin-top: 24px; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
  .tv-waiting h2 { margin: 12px 0 0; font-size: 56px; line-height: 1; text-transform: uppercase; }
  .tv-waiting p { margin: 18px auto 0; max-width: 650px; color: #93a4ba; font-size: 15px; line-height: 1.6; font-weight: 700; }
  .tv-waiting-status { display: inline-flex; align-items: center; margin-top: 24px; padding: 11px 16px; border: 1px solid #334155; border-radius: 20px; background: #101a29; color: #b8c4d4; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .tv-waiting-status i { width: 8px; height: 8px; margin-right: 8px; border-radius: 50%; background: #6ee7b7; }

  .tv-footer { min-height: 76px; padding: 8px 34px 14px; display: flex; align-items: center; justify-content: space-between; }
  .tv-footer-left, .tv-footer-right, .tv-nav { display: flex; align-items: center; }
  .tv-footer-left { width: 32%; color: #8798ad; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
  .tv-footer-left > span { margin-right: 16px; }
  .tv-venue { display: flex; align-items: center; }
  .tv-nav { justify-content: center; }
  .tv-nav-button { width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; border: 1px solid #334155; border-radius: 11px; background: #101a29; color: #ffffff; }
  .tv-dots { display: flex; align-items: center; padding: 0 8px; }
  .tv-dot { width: 8px; height: 8px; margin: 0 3px; padding: 0; border: 0; border-radius: 5px; background: #42536a; }
  .tv-dot.active { width: 28px; background: #ffffff; }
  .tv-footer-right { width: 32%; justify-content: flex-end; }
  .tv-qr-link { display: flex; align-items: center; color: #ffffff; text-decoration: none; margin-right: 14px; }
  .tv-qr-copy { text-align: right; margin-right: 8px; }
  .tv-qr-copy strong { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
  .tv-qr-copy small { display: block; margin-top: 2px; color: #7f90a7; font-size: 9px; }
  .tv-qr-link img { width: 58px; height: 58px; background: #fff; padding: 3px; border-radius: 8px; }
  .tv-refresh-button { height: 38px; display: flex; align-items: center; border: 0; background: transparent; color: #93a4ba; font-size: 10px; font-weight: 900; text-transform: uppercase; }
  .tv-refresh-button svg { margin-right: 6px; }

  @media (max-width: 1200px) {
    .tv-header { padding-left: 24px; padding-right: 24px; }
    .tv-status, .tv-qr-link { display: none; }
    .tv-stage-wrap { padding-left: 22px; padding-right: 22px; }
    .tv-scene-inner { padding: 30px 34px; }
    .tv-scene-title { font-size: 48px; }
    .tv-winner-name { font-size: 24px; }
    .tv-podium-card.featured .tv-winner-name { font-size: 30px; }
    .tv-progress-copy h2 { font-size: 44px; }
  }
  @media (max-width: 900px) {
    .tv-header { height: 80px; min-height: 80px; }
    .tv-org-logo { width: 54px; height: 54px; min-width: 54px; }
    .tv-title { font-size: 21px; max-width: 450px; }
    .tv-clock-box { display: none; }
    .tv-stage { min-height: 500px; }
    .tv-scene-inner, .tv-waiting { min-height: 500px; }
    .tv-scene-title { font-size: 38px; }
    .tv-podium { align-items: stretch; }
    .tv-podium-card, .tv-podium-card.featured { min-height: 220px; }
    .tv-standing-row { width: calc(100% - 14px); }
    .tv-progress-big { width: 32%; }
    .tv-progress-copy { width: 68%; padding-left: 24px; }
    .tv-progress-circle { width: 220px; height: 220px; border-width: 12px; }
    .tv-progress-circle strong { font-size: 58px; }
    .tv-footer-left { display: none; }
    .tv-footer-right { width: auto; }
    .tv-nav { margin-left: auto; margin-right: auto; }
  }
  @media (max-width: 680px) {
    .tv-header-actions .tv-control-button:first-of-type { display: none; }
    .tv-eyebrow { display: none; }
    .tv-title { font-size: 18px; max-width: 260px; }
    .tv-stage-wrap { padding: 12px; }
    .tv-scene-inner { padding: 22px 18px; }
    .tv-scene-top { display: block; }
    .tv-published { display: none; }
    .tv-scene-title { font-size: 30px; }
    .tv-podium { display: block; overflow: auto; }
    .tv-podium-card, .tv-podium-card.featured { width: auto; min-height: 180px; margin: 8px 0; }
    .tv-progress-layout { display: block; overflow: auto; }
    .tv-progress-big, .tv-progress-copy { width: 100%; padding-left: 0; }
    .tv-progress-circle { width: 180px; height: 180px; margin-top: 20px; }
    .tv-metrics, .tv-two-cards { display: block; margin: 14px 0 0; }
    .tv-metric, .tv-small-card { width: auto; margin: 8px 0; }
    .tv-waiting h2 { font-size: 38px; }
    .tv-footer { padding-left: 16px; padding-right: 16px; }
    .tv-refresh-button { display: none; }
  }
`;

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
    <div className="tv-scene-inner">
      <div className="tv-scene-top">
        <div>
          <span className="tv-scene-kicker" style={{ color: latest ? theme.bright : "#d7e0eb" }}>
            {latest ? "Latest Result" : "Result Highlight"}
          </span>
          <h2 className="tv-scene-title">{group.programme.name}</h2>
          <div className="tv-scene-meta">
            {getCategoryName(group.programme.category_id)}
            {normalizeGender(group.programme.gender_scope) === "All"
              ? ""
              : ` • ${normalizeGender(group.programme.gender_scope)}`}
            {` • ${formatProgrammeType(group.programme.programme_type)} • ${formatStageType(group.programme.stage_type)}`}
          </div>
        </div>

        <div className="tv-published">
          <small>Published</small>
          <strong>{formatPublishedTime(group.publishedAt)}</strong>
        </div>
      </div>

      <div className="tv-podium">
        <PodiumCard entry={second} team={second ? getTeam(second.teamId) : null} position={2} theme={theme} />
        <PodiumCard entry={first} team={first ? getTeam(first.teamId) : null} position={1} theme={theme} featured />
        <PodiumCard entry={third} team={third ? getTeam(third.teamId) : null} position={3} theme={theme} />
      </div>
    </div>
  );
}

function PodiumCard({
  entry,
  team,
  position,
  featured = false,
  theme,
}: {
  entry: ResultEntry | null;
  team: Team | null;
  position: number;
  featured?: boolean;
  theme: ReturnType<typeof getThemeStyle>;
}) {
  if (!entry) {
    return (
      <div className={`tv-podium-card empty ${featured ? "featured" : ""}`}>
        <Medal size={38} />
      </div>
    );
  }

  const chest = extractChest(entry.participantTitle);
  const name = cleanParticipantName(entry.participantTitle);
  const teamName = team?.name || entry.participantSubtitle || "-";

  return (
    <div
      className={`tv-podium-card ${featured ? "featured" : ""}`}
      style={featured ? { borderColor: theme.bright } : undefined}
    >
      <div className="tv-medal-row">
        <span className="tv-medal">{getMedal(position)}</span>
        <span className="tv-position-pill">{getPositionText(position)}</span>
      </div>

      <div className="tv-podium-copy">
        {chest && <p className="tv-chest" style={{ color: theme.bright }}>Chest #{chest}</p>}
        <h3 className="tv-winner-name">{name}</h3>

        {entry.programme.programme_type === "group" && entry.memberNames.length > 0 && (
          <p className="tv-member-list">
            {entry.memberNames.slice(0, 5).join(" • ")}
            {entry.memberNames.length > 5 ? ` +${entry.memberNames.length - 5} more` : ""}
          </p>
        )}

        <div className="tv-team-line">
          <div className="tv-team-name">
            {team?.logo_url ? (
              <img src={team.logo_url} alt="" />
            ) : (
              <span className="tv-team-color" style={{ backgroundColor: team?.color || theme.primary }} />
            )}
            <span>{teamName}</span>
          </div>
          {entry.result.grade && <span className="tv-grade">Grade {entry.result.grade}</span>}
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
  const leaderPoints = Math.max(1, top[0]?.points || 1);

  return (
    <div className="tv-scene-inner">
      <span className="tv-scene-kicker" style={{ color: theme.bright }}>Championship</span>
      <h2 className="tv-scene-title">Team Standings</h2>
      <div className="tv-scene-meta">Live points from published results.</div>

      {top.length === 0 ? (
        <div className="tv-waiting">
          <div className="tv-waiting-inner"><Trophy size={56} /><h2>No team points yet</h2></div>
        </div>
      ) : (
        <div className="tv-standings-list">
          {top.map((team, index) => {
            const width = Math.max(5, Math.round((team.points / leaderPoints) * 100));
            return (
              <div
                key={team.teamId}
                className="tv-standing-row"
                style={index === 0 ? { borderColor: theme.bright } : undefined}
              >
                <div className="tv-standing-rank">
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                </div>
                <div className="tv-standing-main">
                  <div className="tv-standing-title">
                    {team.teamLogo ? (
                      <img src={team.teamLogo} alt="" />
                    ) : (
                      <span className="tv-team-color" style={{ backgroundColor: team.teamColor || theme.primary }} />
                    )}
                    <h3>{team.teamName}</h3>
                  </div>
                  <div className="tv-standing-bar">
                    <span style={{ width: `${width}%`, backgroundColor: theme.primary }} />
                  </div>
                </div>
                <div className="tv-standing-points">
                  <strong>{team.points}</strong>
                  <small>points</small>
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
    <div className="tv-scene-inner">
      <div className="tv-progress-layout">
        <div className="tv-progress-big">
          <div className="tv-progress-circle" style={{ borderColor: theme.primary }}>
            <strong>{progressPercent}%</strong>
            <span>Results Published</span>
          </div>
        </div>

        <div className="tv-progress-copy">
          <span className="tv-scene-kicker" style={{ color: theme.bright }}>Event Pulse</span>
          <h2>The Fest Is Moving</h2>
          <p>Automatic progress based on programmes with published results.</p>

          <div className="tv-metrics">
            <MetricBox label="Published" value={String(publishedProgrammeCount)} note="programmes" />
            <MetricBox label="Remaining" value={String(remainingProgrammes)} note="programmes" />
            <MetricBox label="Total" value={String(totalProgrammes)} note="programmes" />
          </div>

          <div className="tv-two-cards">
            <div className="tv-small-card">
              <small>Latest Result</small>
              <strong>{latestGroup?.programme.name || "Waiting"}</strong>
              <span>{latestGroup ? getCategoryName(latestGroup.programme.category_id) : "No result yet"}</span>
            </div>
            <div className="tv-small-card">
              <small>Leading Team</small>
              <strong>{leader?.teamName || "-"}</strong>
              <span>{leader ? `${leader.points} current championship points` : "No team points yet"}</span>
            </div>
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
    <div className="tv-waiting">
      <div className="tv-waiting-inner">
        <div className="tv-waiting-icon"><Radio size={38} color={theme.bright} /></div>
        <div className="tv-waiting-kicker" style={{ color: theme.bright }}>Live Results Display</div>
        <h2>{eventTitle}</h2>
        <p>The screen will update automatically when the first result is published.</p>
        <div className="tv-waiting-status"><i /> Waiting for published results</div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="tv-metric">
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{note}</span>
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
    <button type="button" onClick={onClick} title={title} className="tv-control-button">
      {children}
    </button>
  );
}

function LoadingScreen() {
  return (
    <main className="tv-root tv-center-screen" style={{ backgroundColor: "#050816" }}>
      <style jsx global>{TV_SAFE_CSS}</style>
      <div className="tv-error-card">
        <RefreshCcw size={34} />
        <h1>Opening Live TV</h1>
        <p>Connecting to published results...</p>
      </div>
    </main>
  );
}