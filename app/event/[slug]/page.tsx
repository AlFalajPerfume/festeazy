/* eslint-disable */
"use client";

import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { loadPublicResultParticipants } from "@/lib/public-result-participants";
import {
  CalendarDays,
  Camera,
  Download,
  Loader2,
  MapPin,
  Medal,
  RefreshCcw,
  Search,
  Share2,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

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
  event_type: string;
  tagline: string | null;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
  public_slug: string;
  is_public: boolean;
};

type EventSettings = {
  id?: string;
  organization_id: string;
  event_id: string;
  contact_number: string | null;
  whatsapp_number: string | null;
  hero_image_url: string | null;
  theme_color: string | null;
  show_points: boolean | null;
  show_student_search: boolean | null;
  show_gallery: boolean | null;
  show_schedule: boolean | null;
  show_posters: boolean | null;
  show_team_details?: boolean | null;
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
  total_marks: number;
  sort_order: number;
  status: string;
};

type MilestonePoster = {
  id: string;
  organization_id: string;
  event_id: string;
  milestone_count: number;
  title: string;
  template_id: string | null;
  leaderboard_snapshot: TeamPoint[];
  published_result_count: number;
  is_public: boolean;
  created_at: string;
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
  leader_name?: string | null;
  description?: string | null;
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
};

type TeamPoint = {
  teamId: string;
  teamName: string;
  points: number;
};

type GalleryImage = {
  id: string;
  organization_id?: string;
  event_id?: string;
  title: string | null;
  description: string | null;
  image_url: string;
  storage_path?: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  created_at?: string;
};

type LayerKey =
  | "result_label"
  | "result_no"
  | "category"
  | "programme"
  | "first_name"
  | "first_unit"
  | "second_name"
  | "second_unit"
  | "third_name"
  | "third_unit"
  | "organization_name"
  | "event_title"
  | "event_date"
  | "venue"
  | "footer_text";

type LayerStyle = {
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontWeight: number | string;
  color: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  letterSpacing: string;
  fontFamily: string;
  visible?: boolean;
};

type PosterTemplate = {
  id: string;
  organization_id: string;
  event_id: string;
  name: string;
  image_url: string;
  is_active: boolean;
  template_usage?: string | null;
  canvas_width: number | null;
  canvas_height: number | null;
  layout: Record<string, Partial<LayerStyle>> | null;
  show_ad_banner?: boolean | null;
  ad_banner_url?: string | null;
  ad_image_url?: string | null;
  ad_x?: number | null;
  ad_y?: number | null;
  ad_width?: number | null;
  ad_height?: number | null;
};

type PosterData = Record<LayerKey, string>;

type ResultPosterLock = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_id: string;
  template_id: string | null;
  result_no: number | null;
  poster_data: Partial<PosterData> | null;
  is_public: boolean | null;
  created_at: string | null;
  template?: PosterTemplate | null;
};

const FIELD_ORDER: LayerKey[] = [
  "result_label",
  "result_no",
  "category",
  "programme",
  "first_name",
  "first_unit",
  "second_name",
  "second_unit",
  "third_name",
  "third_unit",
  "organization_name",
  "event_title",
  "event_date",
  "venue",
  "footer_text",
];

const FOOTER_LAYER_KEYS: LayerKey[] = [
  "organization_name",
  "event_title",
  "event_date",
  "venue",
  "footer_text",
];

const AUTO_FIT_LAYER_KEYS: LayerKey[] = [
  "programme",
  "first_name",
  "first_unit",
  "second_name",
  "second_unit",
  "third_name",
  "third_unit",
  "organization_name",
  "event_title",
  "venue",
];

const LEGACY_DEFAULT_TEMPLATE_URLS = [
  "/templates/result1.png",
  "/templates/result2.png",
];

function isUploadedCustomPosterTemplate(
  template: PosterTemplate | null | undefined,
) {
  if (!template) return false;

  const imageUrl = String(template.image_url || "").trim();
  const normalizedUrl = imageUrl.toLowerCase().split("?")[0];

  if (!imageUrl) return false;

  const isLegacyDefault = LEGACY_DEFAULT_TEMPLATE_URLS.some((legacyUrl) => {
    const normalizedLegacy = legacyUrl.toLowerCase();
    return (
      normalizedUrl === normalizedLegacy ||
      normalizedUrl.endsWith(normalizedLegacy)
    );
  });

  if (isLegacyDefault) return false;

  // Templates uploaded through Poster Studio are stored in this bucket.
  // This prevents old built-in/default poster rows from appearing publicly.
  return normalizedUrl.includes("poster-templates");
}

const DEFAULT_FONT = "Montserrat, Poppins, Arial, Helvetica, sans-serif";
const DEFAULT_SETTINGS: EventSettings = {
  organization_id: "",
  event_id: "",
  contact_number: null,
  whatsapp_number: null,
  hero_image_url: null,
  theme_color: "emerald",
  show_points: true,
  show_student_search: true,
  show_gallery: true,
  show_schedule: true,
  show_posters: true,
  show_team_details: true,
};

const DEFAULT_LAYOUT: Record<LayerKey, LayerStyle> = {
  result_label: {
    x: 150,
    y: 211,
    width: 180,
    fontSize: 30,
    fontWeight: 800,
    color: "#f2bd18",
    align: "left",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
  },
  result_no: {
    x: 279,
    y: 176,
    width: 170,
    fontSize: 82,
    fontWeight: 700,
    color: "#f2bd18",
    align: "left",
    lineHeight: 0.92,
    letterSpacing: "0px",
    fontFamily: "Montserrat, Poppins, Arial, sans-serif",
  },
  category: {
    x: 150,
    y: 270,
    width: 620,
    fontSize: 28,
    fontWeight: 700,
    color: "#ffffff",
    align: "left",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
  },
  programme: {
    x: 150,
    y: 316,
    width: 680,
    fontSize: 38,
    fontWeight: 900,
    color: "#ffffff",
    align: "left",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
  },
  first_name: {
    x: 267,
    y: 442,
    width: 520,
    fontSize: 28,
    fontWeight: 600,
    color: "#ffffff",
    align: "left",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
  },
  first_unit: {
    x: 267,
    y: 467,
    width: 520,
    fontSize: 24,
    fontWeight: 300,
    color: "#d7d7d7",
    align: "left",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
  },
  second_name: {
    x: 267,
    y: 532,
    width: 520,
    fontSize: 28,
    fontWeight: 600,
    color: "#ffffff",
    align: "left",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
  },
  second_unit: {
    x: 265,
    y: 563,
    width: 520,
    fontSize: 24,
    fontWeight: 300,
    color: "#d7d7d7",
    align: "left",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
  },
  third_name: {
    x: 267,
    y: 635,
    width: 520,
    fontSize: 28,
    fontWeight: 600,
    color: "#ffffff",
    align: "left",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
  },
  third_unit: {
    x: 265,
    y: 665,
    width: 520,
    fontSize: 24,
    fontWeight: 300,
    color: "#d7d7d7",
    align: "left",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
  },
  organization_name: {
    x: 120,
    y: 1055,
    width: 837,
    fontSize: 26,
    fontWeight: 800,
    color: "#ffffff",
    align: "center",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
    visible: false,
  },
  event_title: {
    x: 120,
    y: 1092,
    width: 837,
    fontSize: 21,
    fontWeight: 700,
    color: "#f2bd18",
    align: "center",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
    visible: false,
  },
  event_date: {
    x: 150,
    y: 1132,
    width: 360,
    fontSize: 17,
    fontWeight: 500,
    color: "#d7d7d7",
    align: "left",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
    visible: false,
  },
  venue: {
    x: 527,
    y: 1132,
    width: 400,
    fontSize: 17,
    fontWeight: 500,
    color: "#d7d7d7",
    align: "right",
    lineHeight: 1,
    letterSpacing: "0px",
    fontFamily: DEFAULT_FONT,
    visible: false,
  },
  footer_text: {
    x: 120,
    y: 1280,
    width: 837,
    fontSize: 14,
    fontWeight: 600,
    color: "#ffffff",
    align: "center",
    lineHeight: 1,
    letterSpacing: "1px",
    fontFamily: DEFAULT_FONT,
    visible: false,
  },
};

function getThemeStyle(themeColor: string | null | undefined) {
  if (themeColor === "violet") {
    return {
      primary: "#6d28d9",
      primaryDark: "#4c1d95",
      primarySoft: "#f5f3ff",
      primaryBorder: "#ddd6fe",
      primaryText: "#5b21b6",
      hero: "from-violet-950 via-violet-800 to-fuchsia-700",
      button: "bg-violet-700 hover:bg-violet-800",
      text: "text-violet-950",
      badge: "border-violet-100 bg-violet-50 text-violet-800",
    };
  }

  if (themeColor === "amber") {
    return {
      primary: "#d97706",
      primaryDark: "#78350f",
      primarySoft: "#fffbeb",
      primaryBorder: "#fde68a",
      primaryText: "#b45309",
      hero: "from-amber-950 via-amber-800 to-orange-700",
      button: "bg-amber-600 hover:bg-amber-700",
      text: "text-amber-950",
      badge: "border-amber-100 bg-amber-50 text-amber-800",
    };
  }

  if (themeColor === "slate") {
    return {
      primary: "#334155",
      primaryDark: "#0f172a",
      primarySoft: "#f8fafc",
      primaryBorder: "#e2e8f0",
      primaryText: "#334155",
      hero: "from-slate-950 via-slate-800 to-slate-700",
      button: "bg-slate-800 hover:bg-slate-900",
      text: "text-slate-950",
      badge: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }

  return {
    primary: "#047857",
    primaryDark: "#064e3b",
    primarySoft: "#ecfdf5",
    primaryBorder: "#a7f3d0",
    primaryText: "#047857",
    hero: "from-emerald-950 via-emerald-800 to-teal-700",
    button: "bg-[var(--theme-primary)] hover:brightness-90",
    text: "text-[var(--theme-primary-dark)]",
    badge: "border-[var(--theme-primary-border)] bg-[var(--theme-primary-soft)] text-[var(--theme-primary-text)]",
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

export default function PublicEventPage() {
  const params = useParams();
  const slugParam = params?.slug;
const slug = String(Array.isArray(slugParam) ? slugParam[0] : slugParam || "")
  .trim()
  .toLowerCase();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [eventSettings, setEventSettings] =
    useState<EventSettings>(DEFAULT_SETTINGS);

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [posterTemplates, setPosterTemplates] = useState<PosterTemplate[]>([]);
  const [resultPosterLocks, setResultPosterLocks] =
    useState<ResultPosterLock[]>([]);
  const [selectedPosterTemplateId, setSelectedPosterTemplateId] = useState("");
  const [milestonePosters, setMilestonePosters] = useState<MilestonePoster[]>([]);

  const [search, setSearch] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [showAllResults, setShowAllResults] = useState(false);
  const [showAllStudents, setShowAllStudents] = useState(false);

  const [selectedPosterGroup, setSelectedPosterGroup] =
    useState<ProgrammeResultGroup | null>(null);
  const [isPosterBusy, setIsPosterBusy] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");

  const mobileLeaderboardRef = useRef<HTMLDivElement | null>(null);
  const firstPlaceCardRef = useRef<HTMLDivElement | null>(null);
  const [activeLeaderboardRank, setActiveLeaderboardRank] = useState(1);

  useEffect(() => {
    if (slug) loadPublicData();
  }, [slug]);

  useEffect(() => {
    setShowAllResults(false);
  }, [search, categoryFilter, programmeFilter]);

  const showPoints = eventSettings.show_points !== false;
  const showStudentSearch = eventSettings.show_student_search !== false;
  const showGallery = eventSettings.show_gallery !== false;
  const showPosters = eventSettings.show_posters !== false;
  const showTeamDetails = eventSettings.show_team_details !== false;
  const canShowPosters = showPosters && posterTemplates.length > 0;

  const theme = getThemeStyle(eventSettings.theme_color);

  const publishedResults = useMemo(() => {
    return results.filter((item) => item.is_published);
  }, [results]);

  const resultEntries = useMemo(() => {
    return publishedResults
      .map((result) => {
        const programme = programmes.find(
          (item) => item.id === result.programme_id,
        );
        if (!programme) return null;
        return buildResultEntry(result, programme);
      })
      .filter(Boolean) as ResultEntry[];
  }, [publishedResults, programmes, registrations, students, teams, classes]);

  const programmeGroups = useMemo<ProgrammeResultGroup[]>(() => {
    const map = new Map<string, ProgrammeResultGroup>();

    resultEntries.forEach((entry) => {
      if (!map.has(entry.programme.id)) {
        map.set(entry.programme.id, {
          programme: entry.programme,
          entries: [],
        });
      }

      map.get(entry.programme.id)!.entries.push(entry);
    });

    return Array.from(map.values())
      .map((group) => ({
        ...group,
        entries: group.entries.sort((a, b) => {
          const aPos = a.result.position || 9999;
          const bPos = b.result.position || 9999;

          if (aPos !== bPos) return aPos - bPos;

          return (
            Number(b.result.total_mark || 0) - Number(a.result.total_mark || 0)
          );
        }),
      }))
      .sort((a, b) => a.programme.sort_order - b.programme.sort_order);
  }, [resultEntries]);

  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return programmeGroups.filter((group) => {
      const categoryOk =
        categoryFilter === "all" ||
        (categoryFilter === "general" && !group.programme.category_id) ||
        group.programme.category_id === categoryFilter;

      const programmeOk =
        programmeFilter === "all" || group.programme.id === programmeFilter;

      const searchOk =
        !keyword ||
        group.programme.name.toLowerCase().includes(keyword) ||
        getCategoryName(group.programme.category_id)
          .toLowerCase()
          .includes(keyword) ||
        group.entries.some((entry) => {
          return (
            entry.participantTitle.toLowerCase().includes(keyword) ||
            entry.participantSubtitle.toLowerCase().includes(keyword) ||
            getTeamName(entry.teamId).toLowerCase().includes(keyword) ||
            entry.memberNames.some((name) => name.toLowerCase().includes(keyword))
          );
        });

      return categoryOk && programmeOk && searchOk;
    });
  }, [programmeGroups, search, categoryFilter, programmeFilter]);

  const visibleGroups = showAllResults
    ? filteredGroups
    : filteredGroups.slice(0, 4);

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
      .map(([teamId, points]) => ({
        teamId,
        teamName: getTeamName(teamId),
        points,
      }))
      .sort((a, b) => b.points - a.points);
  }, [publishedResults, registrations, teams]);

  useEffect(() => {
    if (!leaderboard.length) return;

    const frame = requestAnimationFrame(() => {
      const container = mobileLeaderboardRef.current;
      const firstPlaceCard = firstPlaceCardRef.current;

      if (!container || !firstPlaceCard) return;

      const targetLeft =
        firstPlaceCard.offsetLeft -
        (container.clientWidth - firstPlaceCard.clientWidth) / 2;

      container.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: "auto",
      });
      setActiveLeaderboardRank(1);
    });

    return () => cancelAnimationFrame(frame);
  }, [leaderboard.length]);

  function handleMobileLeaderboardScroll() {
    const container = mobileLeaderboardRef.current;
    if (!container) return;

    const containerCentre = container.scrollLeft + container.clientWidth / 2;
    const cards = Array.from(
      container.querySelectorAll<HTMLElement>("[data-leaderboard-rank]"),
    );

    if (!cards.length) return;

    let closestRank = 1;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card) => {
      const cardCentre = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(cardCentre - containerCentre);
      const rank = Number(card.dataset.leaderboardRank || 1);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestRank = rank;
      }
    });

    setActiveLeaderboardRank(closestRank);
  }

  function scrollToLeaderboardRank(rank: number) {
    const container = mobileLeaderboardRef.current;
    if (!container) return;

    const card = container.querySelector<HTMLElement>(
      `[data-leaderboard-rank="${rank}"]`,
    );
    if (!card) return;

    const targetLeft =
      card.offsetLeft - (container.clientWidth - card.clientWidth) / 2;

    container.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: "smooth",
    });
  }

  const studentResultEntries = useMemo(() => {
    const keyword = studentSearch.trim().toLowerCase();

    const sortedEntries = [...resultEntries].sort((a, b) => {
      const aChest = extractChestNumber(a.participantTitle);
      const bChest = extractChestNumber(b.participantTitle);

      if (aChest !== bChest) return aChest - bChest;

      return a.participantTitle.localeCompare(b.participantTitle);
    });

    if (!keyword) return sortedEntries;

    return sortedEntries.filter((entry) => {
      return (
        entry.participantTitle.toLowerCase().includes(keyword) ||
        entry.participantSubtitle.toLowerCase().includes(keyword) ||
        entry.programme.name.toLowerCase().includes(keyword) ||
        getTeamName(entry.teamId).toLowerCase().includes(keyword) ||
        entry.memberNames.some((name) => name.toLowerCase().includes(keyword))
      );
    });
  }, [resultEntries, studentSearch]);

  const visibleStudentResults = showAllStudents
    ? studentResultEntries
    : studentResultEntries.slice(0, 8);

  const selectedPosterData = useMemo(() => {
    if (!selectedPosterGroup) return null;
    return getPosterDataForGroup(selectedPosterGroup);
  }, [
    selectedPosterGroup,
    programmeGroups,
    teams,
    categories,
    resultPosterLocks,
    organization,
    eventInfo,
  ]);

  const selectedPosterTemplate = useMemo(() => {
    return (
      posterTemplates.find(
        (template) => template.id === selectedPosterTemplateId,
      ) ||
      posterTemplates.find((template) => template.is_active) ||
      posterTemplates[0] ||
      null
    );
  }, [posterTemplates, selectedPosterTemplateId]);

  async function loadPublicData() {
    setIsLoading(true);
    setLoadingError("");

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("public_slug", slug)
      .eq("is_public", true)
      .limit(1)
      .maybeSingle();

    if (eventError) return stopLoading(eventError.message);

    if (!eventData) {
      return stopLoading("This public event is not available.");
    }

    const activeEvent = eventData as EventInfo;
    setEventInfo(activeEvent);

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", activeEvent.organization_id)
      .limit(1)
      .maybeSingle();

    if (orgError) return stopLoading(orgError.message);

    const activeOrganization = (orgData || null) as Organization | null;

    if (!activeOrganization) {
      return stopLoading("Madrasa not found.");
    }

    const organizationStatus = String(activeOrganization.status || "active")
      .trim()
      .toLowerCase();

    if (organizationStatus === "inactive" || organizationStatus === "disabled") {
      return stopLoading("This madrasa public portal is currently inactive.");
    }

    if (isPlanExpired(activeOrganization.plan_end)) {
      return stopLoading("This madrasa public portal plan has expired.");
    }

    setOrganization(activeOrganization);

    try {
      const [
        programmeRes,
        categoryRes,
        teamRes,
        classRes,
        settingsRes,
        allPublishedResults,
      ] = await Promise.all([
        supabase
          .from("programmes")
          .select("*")
          .eq("event_id", activeEvent.id)
          .eq("status", "active")
          .order("sort_order", { ascending: true }),

        supabase
          .from("categories")
          .select("id, name")
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("teams")
          .select("id, name, code, color, logo_url, leader_name, description")
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("classes")
          .select("id, name")
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("event_settings")
          .select("*")
          .eq("event_id", activeEvent.id)
          .maybeSingle(),

        fetchAllRows<ResultItem>((from, to) =>
          supabase
            .from("results")
            .select("*")
            .eq("organization_id", activeEvent.organization_id)
            .eq("event_id", activeEvent.id)
            .eq("is_published", true)
            .order("position", { ascending: true })
            .range(from, to),
        ),
      ]);

      if (programmeRes.error) throw new Error(programmeRes.error.message);
      if (categoryRes.error) throw new Error(categoryRes.error.message);
      if (teamRes.error) throw new Error(teamRes.error.message);
      if (classRes.error) throw new Error(classRes.error.message);

      const loadedProgrammes = (programmeRes.data || []) as Programme[];
      const loadedSettings = {
        ...DEFAULT_SETTINGS,
        organization_id: activeEvent.organization_id,
        event_id: activeEvent.id,
        ...(settingsRes.error ? {} : settingsRes.data || {}),
      } as EventSettings;

      if (settingsRes.error) {
        console.warn(
          "Event settings loading skipped:",
          settingsRes.error.message,
        );
      }

      const publishedProgrammeIds = new Set(
        allPublishedResults
          .map((result) => result.programme_id)
          .filter((value): value is string => Boolean(value)),
      );

      const groupProgrammeIds = loadedProgrammes
        .filter(
          (programme) =>
            programme.programme_type === "group" &&
            publishedProgrammeIds.has(programme.id),
        )
        .map((programme) => programme.id);

      const participantData = await loadPublicResultParticipants({
        supabase,
        organizationId: activeEvent.organization_id,
        eventId: activeEvent.id,
        results: allPublishedResults,
        groupProgrammeIds,
      });

      const shouldLoadPosters = loadedSettings.show_posters !== false;
      const shouldLoadGallery = loadedSettings.show_gallery !== false;

      const [templateRes, galleryRes, milestoneRes, posterLockRes] =
        await Promise.all([
          shouldLoadPosters
            ? supabase
                .from("poster_templates")
                .select("*")
                .eq("event_id", activeEvent.id)
                .eq("template_usage", "result_poster")
                .order("is_active", { ascending: false })
                .order("created_at", { ascending: false })
                .limit(3)
            : Promise.resolve({ data: [], error: null }),

          shouldLoadGallery
            ? supabase
                .from("gallery_images")
                .select("*")
                .eq("event_id", activeEvent.id)
                .eq("is_active", true)
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),

          shouldLoadPosters
            ? supabase
                .from("result_milestone_posters")
                .select("*")
                .eq("event_id", activeEvent.id)
                .eq("is_public", true)
                .order("milestone_count", { ascending: false })
            : Promise.resolve({ data: [], error: null }),

          shouldLoadPosters
            ? supabase
                .from("result_posters")
                .select(
                  "id, organization_id, event_id, programme_id, template_id, result_no, poster_data, is_public, created_at",
                )
                .eq("event_id", activeEvent.id)
                .eq("is_public", true)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (templateRes.error) {
        console.warn(
          "Poster template loading skipped:",
          templateRes.error.message,
        );
        setPosterTemplates([]);
        setSelectedPosterTemplateId("");
      } else {
        const loadedTemplates = ((templateRes.data || []) as PosterTemplate[])
          .filter((template) => isUploadedCustomPosterTemplate(template))
          .slice(0, 3);

        setPosterTemplates(loadedTemplates);

        const defaultTemplate =
          loadedTemplates.find((template) => template.is_active) ||
          loadedTemplates[0] ||
          null;

        setSelectedPosterTemplateId(defaultTemplate?.id || "");
      }

      if (galleryRes.error) {
        console.warn("Gallery loading skipped:", galleryRes.error.message);
        setGalleryImages([]);
      } else {
        setGalleryImages((galleryRes.data || []) as GalleryImage[]);
      }

      if (milestoneRes.error) {
        console.warn(
          "Milestone posters loading skipped:",
          milestoneRes.error.message,
        );
        setMilestonePosters([]);
      } else {
        setMilestonePosters((milestoneRes.data || []) as MilestonePoster[]);
      }

      if (posterLockRes.error) {
        console.warn(
          "Official result poster locks loading skipped:",
          posterLockRes.error.message,
        );
        setResultPosterLocks([]);
      } else {
        setResultPosterLocks((posterLockRes.data || []) as ResultPosterLock[]);
      }

      setEventSettings(loadedSettings);
      setProgrammes(loadedProgrammes);
      setCategories((categoryRes.data || []) as Category[]);
      setTeams((teamRes.data || []) as Team[]);
      setClasses((classRes.data || []) as ClassItem[]);
      setStudents(participantData.students as Student[]);
      setRegistrations(participantData.registrations as Registration[]);
      setResults(allPublishedResults);
      setIsLoading(false);
    } catch (loadError) {
      return stopLoading(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load public event data.",
      );
    }
  }

  function stopLoading(message: string) {
    setLoadingError(message);
    setIsLoading(false);
  }

  function normalizeChest(chestNo: string | null) {
    return String(chestNo || "").replace("#", "").trim();
  }

  function extractChestNumber(value: string) {
    const match = value.match(/#?(\d+)/);
    return match ? Number(match[1]) : 999999;
  }

  function getStudent(id: string | null) {
    return students.find((item) => item.id === id) || null;
  }

  function getTeamName(id: string | null) {
    return teams.find((item) => item.id === id)?.name || "-";
  }

  function getClassName(id: string | null) {
    return classes.find((item) => item.id === id)?.name || "-";
  }

  function getCategoryName(id: string | null) {
    if (!id) return "General";
    return categories.find((item) => item.id === id)?.name || "-";
  }

  function getPositionShort(position: number | null) {
    if (position === 1) return "First Place";
    if (position === 2) return "Second Place";
    if (position === 3) return "Third Place";
    if (!position) return "Rank";
    return `Rank #${position}`;
  }

  function getPositionMedal(position: number | null) {
    if (position === 1) return "🥇";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    return "🏅";
  }

  function buildResultEntry(
    result: ResultItem,
    programme: Programme,
  ): ResultEntry {
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

  function formatDate(dateValue: string | null) {
    if (!dateValue) return "";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateRange() {
    if (!eventInfo?.start_date && !eventInfo?.end_date) return "Date not added";

    if (eventInfo.start_date === eventInfo.end_date) {
      return formatDate(eventInfo.start_date);
    }

    return `${formatDate(eventInfo.start_date)} - ${formatDate(
      eventInfo.end_date,
    )}`;
  }

  function formatPublishedTime(dateValue: string | null) {
    if (!dateValue) return "Published";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Published";

    return `Published at ${date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  function cleanPosterName(value: string | undefined) {
    return String(value || "-").replace(/^#?\d+\s*/, "").trim() || "-";
  }

  function getPosterLock(programmeId: string) {
    return (
      resultPosterLocks.find((item) => item.programme_id === programmeId) ||
      null
    );
  }

  function getPosterDataForGroup(group: ProgrammeResultGroup) {
    const liveData = buildPosterData(group);
    const lock = getPosterLock(group.programme.id);

    return {
      ...liveData,
      ...(lock?.poster_data || {}),
      organization_name: liveData.organization_name,
      event_title: liveData.event_title,
      event_date: liveData.event_date,
      venue: liveData.venue,
      footer_text: liveData.footer_text,
    } satisfies PosterData;
  }

  function getProgrammeResultNumber(group: ProgrammeResultGroup) {
    const lockedNumber = getPosterLock(group.programme.id)?.result_no;
    if (lockedNumber) return lockedNumber;

    const index = programmeGroups.findIndex(
      (item) => item.programme.id === group.programme.id,
    );

    return index >= 0 ? index + 1 : Math.max(1, group.programme.sort_order || 1);
  }

  function buildPosterData(group: ProgrammeResultGroup): PosterData {
    const topThree = group.entries
      .filter((entry) => entry.result.grade !== "Absent")
      .slice(0, 3);
    const first = topThree[0];
    const second = topThree[1];
    const third = topThree[2];
    const resultNo = getProgrammeResultNumber(group);

    return {
      result_label: "RESULT",
      result_no: String(resultNo).padStart(2, "0"),
      category: getCategoryName(group.programme.category_id).toUpperCase(),
      programme: group.programme.name,
      first_name: cleanPosterName(first?.participantTitle),
      first_unit: getTeamName(first?.teamId || null).toUpperCase(),
      second_name: cleanPosterName(second?.participantTitle),
      second_unit: getTeamName(second?.teamId || null).toUpperCase(),
      third_name: cleanPosterName(third?.participantTitle),
      third_unit: getTeamName(third?.teamId || null).toUpperCase(),
      organization_name: organization?.name || "",
      event_title: eventInfo?.title || "",
      event_date: formatDateRange(),
      venue: eventInfo?.venue || organization?.place || "",
      footer_text: "Powered by FestEazy",
    };
  }

  function getShareText(group: ProgrammeResultGroup) {
    const topThree = group.entries
      .filter((entry) => entry.result.grade !== "Absent")
      .slice(0, 3);

    const winners = topThree
      .map((entry) => {
        return `${getPositionMedal(entry.result.position)} ${getPositionShort(
          entry.result.position,
        )}: ${cleanPosterName(entry.participantTitle)} - ${getTeamName(
          entry.teamId,
        )}`;
      })
      .join("\n");

    const publicUrl = typeof window !== "undefined" ? window.location.href : "";

    return `${organization?.name || "FestEazy"}
${eventInfo?.title || "Event Results"}

🏆 ${group.programme.name}
Category: ${getCategoryName(group.programme.category_id)}

${winners}

View live results:
${publicUrl}`;
  }

  async function shareResult(group: ProgrammeResultGroup) {
    const text = getShareText(group);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${group.programme.name} Result`,
          text,
        });
        return;
      } catch {}
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function loadCanvasImage(url: string) {
    const absoluteUrl = new URL(url, window.location.origin).toString();

    try {
      const response = await fetch(absoluteUrl, {
        mode: "cors",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Image request failed with ${response.status}`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      try {
        return await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error("Poster image could not be loaded."));
          image.src = objectUrl;
        });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (fetchError) {
      return await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.crossOrigin = "anonymous";
        image.onload = () => resolve(image);
        image.onerror = () => reject(fetchError);
        image.src = absoluteUrl;
      });
    }
  }

  function getAutoFitFontSize(
    key: LayerKey,
    value: string,
    layer: LayerStyle,
    context?: CanvasRenderingContext2D | null,
  ) {
    const baseSize = Math.max(8, Number(layer.fontSize || 28));
    if (!AUTO_FIT_LAYER_KEYS.includes(key) || !value || value === "-") {
      return baseSize;
    }

    let measureContext = context || null;

    if (!measureContext && typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      measureContext = canvas.getContext("2d");
    }

    if (!measureContext) return baseSize;

    const minSize = Math.max(11, Math.round(baseSize * 0.58));
    const letterSpacing = Number.parseFloat(layer.letterSpacing) || 0;
    const fontWeight = String(layer.fontWeight || 700);
    const fontFamily = layer.fontFamily || "Arial, sans-serif";

    for (let size = baseSize; size >= minSize; size -= 1) {
      measureContext.font = `${fontWeight} ${size}px ${fontFamily}`;
      if (
        getTextWidth(measureContext, value, letterSpacing) <=
        Number(layer.width || 500)
      ) {
        return size;
      }
    }

    return minSize;
  }

  function getTextWidth(
    context: CanvasRenderingContext2D,
    value: string,
    letterSpacing: number,
  ) {
    const basicWidth = context.measureText(value).width;
    return basicWidth + Math.max(0, value.length - 1) * letterSpacing;
  }

  function wrapCanvasText(
    context: CanvasRenderingContext2D,
    value: string,
    maxWidth: number,
    letterSpacing: number,
  ) {
    const paragraphs = value.split("\n");
    const output: string[] = [];

    paragraphs.forEach((paragraph) => {
      const words = paragraph.trim().split(/\s+/).filter(Boolean);

      if (words.length === 0) {
        output.push("");
        return;
      }

      let currentLine = "";

      words.forEach((word) => {
        const candidate = currentLine ? `${currentLine} ${word}` : word;

        if (getTextWidth(context, candidate, letterSpacing) <= maxWidth) {
          currentLine = candidate;
          return;
        }

        if (currentLine) output.push(currentLine);

        if (getTextWidth(context, word, letterSpacing) <= maxWidth) {
          currentLine = word;
          return;
        }

        let characterLine = "";
        Array.from(word).forEach((character) => {
          const characterCandidate = `${characterLine}${character}`;
          if (
            characterLine &&
            getTextWidth(context, characterCandidate, letterSpacing) > maxWidth
          ) {
            output.push(characterLine);
            characterLine = character;
          } else {
            characterLine = characterCandidate;
          }
        });
        currentLine = characterLine;
      });

      if (currentLine) output.push(currentLine);
    });

    return output;
  }

  function drawSpacedText(
    context: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    letterSpacing: number,
  ) {
    let cursor = x;

    Array.from(value).forEach((character) => {
      context.fillText(character, cursor, y);
      cursor += context.measureText(character).width + letterSpacing;
    });
  }

  function drawPosterTextLayer(
    context: CanvasRenderingContext2D,
    key: LayerKey,
    value: string,
    template: PosterTemplate,
  ) {
    if (!value || value === "-") return;

    const layer = normalizeLayer(key, template);
    if (layer.visible === false) return;

    const fittedFontSize = getAutoFitFontSize(key, value, layer, context);
    const fontWeight = String(layer.fontWeight || 700);
    const fontFamily = layer.fontFamily || "Arial, sans-serif";
    const letterSpacing = Number.parseFloat(layer.letterSpacing) || 0;
    const lineHeight =
      fittedFontSize * Math.max(0.7, layer.lineHeight || 1);

    context.save();
    context.font = `${fontWeight} ${fittedFontSize}px ${fontFamily}`;
    context.fillStyle = layer.color;
    context.textBaseline = "top";

    const lines = AUTO_FIT_LAYER_KEYS.includes(key)
      ? [value]
      : wrapCanvasText(context, value, layer.width, letterSpacing);

    lines.forEach((line, lineIndex) => {
      const measuredWidth = getTextWidth(context, line, letterSpacing);
      let drawX = layer.x;

      if (layer.align === "center") {
        drawX = layer.x + (layer.width - measuredWidth) / 2;
      } else if (layer.align === "right") {
        drawX = layer.x + layer.width - measuredWidth;
      }

      const drawY = layer.y + lineIndex * lineHeight;

      if (letterSpacing === 0) {
        context.fillText(line, drawX, drawY);
      } else {
        drawSpacedText(context, line, drawX, drawY, letterSpacing);
      }
    });

    context.restore();
  }

  async function makePosterCanvas() {
    if (!selectedPosterGroup || !selectedPosterTemplate || !selectedPosterData) {
      return null;
    }

    if (typeof document !== "undefined" && "fonts" in document) {
      try {
        await (document as any).fonts.ready;
      } catch {}
    }

    const logicalWidth = Number(selectedPosterTemplate.canvas_width || 1077);
    const logicalHeight = Number(selectedPosterTemplate.canvas_height || 1350);
    const exportScale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = logicalWidth * exportScale;
    canvas.height = logicalHeight * exportScale;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not supported by this browser.");

    context.scale(exportScale, exportScale);
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, logicalWidth, logicalHeight);

    const templateImage = await loadCanvasImage(selectedPosterTemplate.image_url);
    context.drawImage(templateImage, 0, 0, logicalWidth, logicalHeight);

    FIELD_ORDER.forEach((key) => {
      drawPosterTextLayer(
        context,
        key,
        selectedPosterData[key],
        selectedPosterTemplate,
      );
    });

    const adUrl =
      selectedPosterTemplate.ad_banner_url ||
      selectedPosterTemplate.ad_image_url ||
      "";

    if (selectedPosterTemplate.show_ad_banner && adUrl) {
      const adImage = await loadCanvasImage(adUrl);
      const adX = Number(selectedPosterTemplate.ad_x || 0);
      const adY = Number(
        selectedPosterTemplate.ad_y || logicalHeight - 240,
      );
      const adWidth = Number(
        selectedPosterTemplate.ad_width || logicalWidth,
      );
      const adHeight = Number(selectedPosterTemplate.ad_height || 240);

      context.drawImage(adImage, adX, adY, adWidth, adHeight);
    }

    return canvas;
  }

  function canvasToPngBlob(canvas: HTMLCanvasElement) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("The poster image could not be created."));
      }, "image/png");
    });
  }

  function getPosterFileName(group: ProgrammeResultGroup) {
    return `${eventInfo?.title || "event"}-${group.programme.name}-${getCategoryName(
      group.programme.category_id,
    )}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function downloadPoster() {
    if (!selectedPosterGroup) return;

    setIsPosterBusy(true);

    try {
      const canvas = await makePosterCanvas();
      if (!canvas) return;

      const blob = await canvasToPngBlob(canvas);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = `${getPosterFileName(selectedPosterGroup)}-poster.png`;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (error) {
      console.error("Poster download failed:", error);
      alert(
        error instanceof Error
          ? `Poster download failed: ${error.message}`
          : "Poster download failed. Please try again.",
      );
    } finally {
      setIsPosterBusy(false);
    }
  }

  async function sharePosterImage() {
    if (!selectedPosterGroup) return;

    setIsPosterBusy(true);

    try {
      const canvas = await makePosterCanvas();
      if (!canvas) return;

      const blob = await canvasToPngBlob(canvas);

      const file = new File(
        [blob],
        `${getPosterFileName(selectedPosterGroup)}-poster.png`,
        {
          type: "image/png",
        },
      );

      const text = getShareText(selectedPosterGroup);

      if (
        (navigator as any).canShare &&
        (navigator as any).canShare({ files: [file] })
      ) {
        await navigator.share({
          title: `${selectedPosterGroup.programme.name} Result`,
          text,
          files: [file],
        } as any);

        return;
      }

      await downloadPoster();
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    } catch (error) {
      console.error("Poster share failed:", error);
      alert("Sharing failed. Download PNG and share manually.");
    } finally {
      setIsPosterBusy(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f0df] px-4">
        <div className="rounded-[2rem] border border-amber-100 bg-white p-8 text-center shadow-2xl shadow-slate-900/10">
          <Loader2 className="mx-auto animate-spin text-[var(--theme-primary-text)]" size={36} />
          <h1 className="mt-5 text-2xl font-black tracking-[-0.05em] text-slate-950">
            Loading Live Results
          </h1>
          <p className="mt-2 text-sm font-bold text-slate-500">
            Please wait while public result portal opens.
          </p>
        </div>
      </main>
    );
  }

  if (loadingError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f0df] px-4">
        <div className="max-w-lg rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-2xl shadow-slate-900/10">
          <Medal className="mx-auto text-red-600" size={38} />
          <h1 className="mt-5 text-2xl font-black tracking-[-0.05em] text-slate-950">
            Public Portal Not Available
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-500">
            {loadingError}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
  className="min-h-screen bg-[#f7f0df] text-slate-950"
  style={
    {
      "--theme-primary": theme.primary,
      "--theme-primary-dark": theme.primaryDark,
      "--theme-primary-soft": theme.primarySoft,
      "--theme-primary-border": theme.primaryBorder,
      "--theme-primary-text": theme.primaryText,
    } as CSSProperties
  }
>
      <header className="sticky top-0 z-50 border-b border-amber-100/80 bg-[#fffaf0]/95 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-lg shadow-slate-900/10 ${
                organization?.logo_url
                  ? "border border-slate-200/90 bg-white p-1.5 ring-1 ring-slate-900/5"
                  : "bg-[var(--theme-primary)] text-white"
              }`}
            >
              {organization?.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt={`${organization.name} logo`}
                  className="h-full w-full object-contain"
                  loading="eager"
                  decoding="async"
                />
              ) : (
                <Trophy size={24} />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-base font-black tracking-[-0.03em] text-[var(--theme-primary-dark)] sm:text-lg">
                  {eventInfo?.title || "Live Results"}
                </p>
                <span className="hidden rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-green-700 ring-1 ring-green-200 sm:inline-flex">
                  Live
                </span>
              </div>
              <p className="truncate text-xs font-bold text-slate-500">
                {organization?.name || "FestEazy"}
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm font-black text-slate-600 lg:flex">
            {showTeamDetails && teams.length > 0 && (
              <a href="#teams" className="transition hover:text-[var(--theme-primary-text)]">
                Teams
              </a>
            )}

            <a href="#results" className="transition hover:text-[var(--theme-primary-text)]">
              Results
            </a>

            {showPoints && (
              <a href="#points" className="transition hover:text-[var(--theme-primary-text)]">
                Points
              </a>
            )}

            {showStudentSearch && (
              <a href="#students" className="transition hover:text-[var(--theme-primary-text)]">
                Student Search
              </a>
            )}

            {showGallery && (
              <a href="#gallery" className="transition hover:text-[var(--theme-primary-text)]">
                Gallery
              </a>
            )}
          </nav>

          <button
            type="button"
            onClick={loadPublicData}
            className="inline-flex items-center gap-2 rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-lg shadow-slate-900/5 transition hover:bg-amber-50"
          >
            <RefreshCcw size={16} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      <section className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
  <div className="mx-auto max-w-7xl">
    <div className="relative overflow-hidden rounded-[1.65rem] border border-amber-100 bg-white p-2 shadow-xl shadow-slate-900/8 sm:rounded-[1.9rem] sm:p-2.5">
      {eventSettings.hero_image_url ? (
        <div className="overflow-hidden rounded-[1.35rem] bg-white">
  <img
    src={eventSettings.hero_image_url}
    alt={`${eventInfo?.title || "Event"} banner`}
    className="block h-auto w-full"
    loading="eager"
    decoding="async"
    fetchPriority="high"
  />
</div>
      ) : (
        <div
          className={`relative overflow-hidden rounded-[1.35rem] bg-gradient-to-br ${theme.hero} text-white`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${theme.hero}`} />
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-300/20 blur-3xl" />
          <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/25 to-transparent" />

          <div className="relative p-5 sm:p-6 lg:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_0_5px_rgba(110,231,183,0.12)]" />
                Live Result Portal
              </div>

              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-200 sm:text-xs">
                Powered by FestEazy
              </p>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
              <div className="min-w-0">
                <h1 className="max-w-4xl text-[2.35rem] font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
                  {eventInfo?.title}
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/75 sm:text-base">
                  {eventInfo?.tagline ||
                    "Official programme results, winners and team standings in one live portal."}
                </p>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <HeroPill
                    icon={<Users size={17} />}
                    text={organization?.name || "Madrasa"}
                  />

                  <HeroPill
                    icon={<CalendarDays size={17} />}
                    text={formatDateRange()}
                  />

                  <HeroPill
                    icon={<MapPin size={17} />}
                    text={
                      eventInfo?.venue ||
                      organization?.place ||
                      "Venue to be announced"
                    }
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
                  <a
                    href="#results"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 text-sm font-black text-[var(--theme-primary-dark)] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-amber-200 sm:px-6"
                  >
                    <Sparkles size={18} />
                    View Results
                  </a>

                  {showPoints && (
                    <a
                      href="#points"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15 sm:px-6"
                    >
                      <Trophy size={18} />
                      Points Table
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
                <HeroStat
                  number={String(programmeGroups.length)}
                  label="Published"
                />

                <HeroStat
                  number={String(publishedResults.length)}
                  label="Winners"
                />

                <HeroStat
                  number={String(teams.length)}
                  label="Teams"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
</section>

      {showTeamDetails && teams.length > 0 && (
        <section id="teams" className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              badge="Teams / Houses"
              icon={<Users size={16} />}
              title="Participating Teams"
              description="Team logos, leaders and current points from this event."
              side={`${teams.length} teams`}
            />

            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {teams.map((team) => {
                const pointRow = leaderboard.find((item) => item.teamId === team.id);
                const rankIndex = leaderboard.findIndex((item) => item.teamId === team.id);

                return (
                  <PublicTeamCard
                    key={team.id}
                    team={team}
                    points={pointRow?.points || 0}
                    rank={rankIndex >= 0 ? rankIndex + 1 : null}
                  />
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section id="results" className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            badge="Published Results"
            icon={<Sparkles size={16} />}
            title="Live Results"
            description="Search and view officially published programme results."
            side={`${filteredGroups.length} programmes`}
          />

          <div className="rounded-[1.7rem] border border-amber-100 bg-white/85 p-3 shadow-xl shadow-slate-900/5 backdrop-blur">
            <div className="grid gap-3 md:grid-cols-[1.4fr_0.8fr_0.8fr]">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search participant, programme, team or chest no..."
              />

              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  setProgrammeFilter("all");
                }}
                className="h-14 rounded-2xl border border-amber-100 bg-white px-4 text-sm font-black text-slate-700 outline-none shadow-lg shadow-slate-900/5"
              >
                <option value="all">All Categories</option>
                <option value="general">General</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={programmeFilter}
                onChange={(event) => setProgrammeFilter(event.target.value)}
                className="h-14 rounded-2xl border border-amber-100 bg-white px-4 text-sm font-black text-slate-700 outline-none shadow-lg shadow-slate-900/5"
              >
                <option value="all">All Programmes</option>
                {programmeGroups.map((group) => (
                  <option key={group.programme.id} value={group.programme.id}>
                    {group.programme.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredGroups.length === 0 ? (
            <EmptyBox title="No published results found" />
          ) : (
            <>
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between gap-3 px-1 lg:hidden">
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Latest published results
                  </p>
                  <p className="text-[11px] font-bold text-slate-400">
                    Swipe left or right
                  </p>
                </div>

                <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-5 [scrollbar-width:none] touch-pan-x overscroll-x-contain [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0">
                  {visibleGroups.map((group) => (
                    <div
                      key={group.programme.id}
                      className="w-[86vw] max-w-[390px] shrink-0 snap-center sm:w-[72vw] sm:max-w-[440px] lg:w-auto lg:max-w-none lg:shrink"
                    >
                      <ResultCard
                        group={group}
                        resultNo={getProgrammeResultNumber(group)}
                        categoryName={getCategoryName(group.programme.category_id)}
                        getTeamName={getTeamName}
                        getPositionShort={getPositionShort}
                        getPositionMedal={getPositionMedal}
                        formatPublishedTime={formatPublishedTime}
                        showPosters={canShowPosters}
                        onViewPoster={() => setSelectedPosterGroup(group)}
                        onShare={() => shareResult(group)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {filteredGroups.length > 4 && (
                <div className="mt-7 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllResults((current) => !current)}
                    className="inline-flex items-center justify-center rounded-2xl bg-[var(--theme-primary)] px-7 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:brightness-90"
                  >
                    {showAllResults
                      ? "Show Less"
                      : `Show More Results (${filteredGroups.length - 4})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {showPoints && (
        <section id="points" className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              badge="Points Leaderboard"
              icon={<Trophy size={16} />}
              title="Current Team Ranking"
              description="Live point standings calculated from published results only."
              side={`${leaderboard.length} teams`}
            />

            {leaderboard.length === 0 ? (
              <EmptyBox title="No published points yet" />
            ) : (
              <>
                {/* Mobile: swipeable leaderboard. Rank 1 opens in the centre. */}
                <div className="mt-7 lg:hidden">
                  <div className="mb-2 flex items-center justify-between gap-3 px-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                      Top rankings
                    </p>
                    <p className="text-[11px] font-bold text-slate-400">
                      Swipe left or right
                    </p>
                  </div>

                  <div
                    ref={mobileLeaderboardRef}
                    onScroll={handleMobileLeaderboardScroll}
                    className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[9vw] pb-5 pt-4 [scrollbar-width:none] touch-pan-x overscroll-x-contain [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-[12vw]"
                    aria-label="Top team rankings"
                  >
                    {[
                      { item: leaderboard[1], rank: 2, medal: "🥈" },
                      { item: leaderboard[0], rank: 1, medal: "🥇" },
                      { item: leaderboard[2], rank: 3, medal: "🥉" },
                    ].map(({ item, rank, medal }) => {
                      if (!item) return null;

                      return (
                        <div
                          key={`${rank}-${item.teamId}`}
                          ref={rank === 1 ? firstPlaceCardRef : undefined}
                          data-leaderboard-rank={rank}
                          className="w-[82vw] max-w-[22rem] shrink-0 snap-center"
                        >
                          <TopRankCard
                            medal={medal}
                            title={`Rank ${rank}`}
                            team={item.teamName}
                            points={item.points}
                            large={rank === 1}
                            className={
                              rank === 1
                                ? "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-[var(--theme-primary-soft)]"
                                : rank === 2
                                  ? "border-slate-200 bg-white"
                                  : "border-orange-200 bg-white"
                            }
                          />
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-center gap-2" aria-label="Leaderboard navigation">
                    {[
                      { rank: 2, exists: Boolean(leaderboard[1]) },
                      { rank: 1, exists: Boolean(leaderboard[0]) },
                      { rank: 3, exists: Boolean(leaderboard[2]) },
                    ]
                      .filter((item) => item.exists)
                      .map(({ rank }) => (
                        <button
                          key={rank}
                          type="button"
                          onClick={() => scrollToLeaderboardRank(rank)}
                          aria-label={`Show rank ${rank}`}
                          aria-current={activeLeaderboardRank === rank ? "true" : undefined}
                          className={`h-2 rounded-full transition-all duration-200 ${
                            activeLeaderboardRank === rank
                              ? "w-7 bg-[var(--theme-primary)]"
                              : "w-2 bg-slate-300"
                          }`}
                        />
                      ))}
                  </div>
                </div>

                {/* Desktop: fixed three-card podium. */}
                <div className="mt-8 hidden grid-cols-3 items-end gap-5 lg:grid">
                  {leaderboard[1] ? (
                    <TopRankCard
                      medal="🥈"
                      title="Rank 2"
                      team={leaderboard[1].teamName}
                      points={leaderboard[1].points}
                      className="border-slate-200 bg-white"
                    />
                  ) : (
                    <div aria-hidden="true" />
                  )}

                  {leaderboard[0] ? (
                    <TopRankCard
                      medal="🥇"
                      title="Rank 1"
                      team={leaderboard[0].teamName}
                      points={leaderboard[0].points}
                      className="-translate-y-5 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-[var(--theme-primary-soft)]"
                      large
                    />
                  ) : (
                    <div aria-hidden="true" />
                  )}

                  {leaderboard[2] ? (
                    <TopRankCard
                      medal="🥉"
                      title="Rank 3"
                      team={leaderboard[2].teamName}
                      points={leaderboard[2].points}
                      className="border-orange-200 bg-white"
                    />
                  ) : (
                    <div aria-hidden="true" />
                  )}
                </div>

                <div className="mt-6 overflow-hidden rounded-[1.8rem] border border-amber-100 bg-white shadow-xl shadow-slate-900/5">
                  <div className="flex items-center justify-between gap-4 border-b border-amber-100 bg-[#fffaf0] px-4 py-4 sm:px-6">
                    <div>
                      <h3 className="text-lg font-black tracking-[-0.03em] text-[var(--theme-primary-dark)]">
                        Full Points Table
                      </h3>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        Team championship standings.
                      </p>
                    </div>

                    <span className="rounded-full bg-[var(--theme-primary-soft)] px-3 py-1.5 text-xs font-black text-[var(--theme-primary-text)]">
                      Live
                    </span>
                  </div>

                  <table className="w-full">
                    <thead>
                      <tr className="bg-white">
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400 sm:px-6">
                          Rank
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400 sm:px-6">
                          Team
                        </th>
                        <th className="px-4 py-4 text-right text-xs font-black uppercase tracking-[0.16em] text-slate-400 sm:px-6">
                          Points
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {leaderboard.map((item, index) => (
                        <tr
                          key={item.teamId}
                          className={`border-t border-slate-100 ${
                            index === 0
                              ? "bg-amber-50/70"
                              : index === 1
                                ? "bg-slate-50/70"
                                : index === 2
                                  ? "bg-orange-50/50"
                                  : "bg-white"
                          }`}
                        >
                          <td className="px-4 py-4 sm:px-6">
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-black shadow-sm">
                              #{index + 1}
                            </span>
                          </td>

                          <td className="px-4 py-4 sm:px-6">
                            <p className="font-black text-slate-950">
                              {item.teamName}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-right sm:px-6">
                            <p className="text-lg font-black text-[var(--theme-primary-text)]">
                              {item.points}
                            </p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>
      )}


      {showPoints && milestonePosters.length > 0 && (
        <section id="milestone-posters" className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              badge="Team Points Posters"
              icon={<Trophy size={16} />}
              title="Championship Updates"
              description="Official locked team-point snapshots created after every 10 published programmes."
              side={`${milestonePosters.length} posters`}
            />

            <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {milestonePosters.map((poster) => (
                <MilestonePosterCard key={poster.id} poster={poster} />
              ))}
            </div>
          </div>
        </section>
      )}

      {showStudentSearch && (
        <section id="students" className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              badge="Student Search"
              icon={<Search size={16} />}
              title="Find Student Results"
              description="Search by student name, chest number, programme or team."
              side={`${studentResultEntries.length} entries`}
            />

            <div className="rounded-[1.7rem] border border-amber-100 bg-white/85 p-3 shadow-xl shadow-slate-900/5 backdrop-blur">
              <SearchInput
                value={studentSearch}
                onChange={setStudentSearch}
                placeholder="Search student name, chest no, programme or team..."
              />
            </div>

            {studentResultEntries.length === 0 ? (
              <EmptyBox title="No student results found" />
            ) : (
              <>
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visibleStudentResults.map((entry) => (
                    <StudentResultCard
                      key={entry.result.id}
                      entry={entry}
                      teamName={getTeamName(entry.teamId)}
                      position={
                        entry.result.grade === "Absent"
                          ? "Absent"
                          : getPositionShort(entry.result.position)
                      }
                      medal={
                        entry.result.grade === "Absent"
                          ? "✕"
                          : getPositionMedal(entry.result.position)
                      }
                    />
                  ))}
                </div>

                {studentResultEntries.length > 8 && (
                  <div className="mt-7 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setShowAllStudents((current) => !current)}
                      className="inline-flex items-center justify-center rounded-2xl bg-[var(--theme-primary)] px-7 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:brightness-90"
                    >
                      {showAllStudents
                        ? "Show Less"
                        : `Show More (${studentResultEntries.length - 8})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {showGallery && (
        <section id="gallery" className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              badge="Event Gallery"
              icon={<Camera size={16} />}
              title="Festival Moments"
              description="Latest photos, stage moments and memories from the event."
              side={
                <span className="rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-lg shadow-slate-900/5">
                  {galleryImages.length
                    ? `${galleryImages.length} photos`
                    : "Coming soon"}
                </span>
              }
            />

            {galleryImages.length > 0 ? (
              <div className="-mx-4 mt-7 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0">
                {galleryImages.map((image, index) => (
                  <a
                    key={image.id}
                    href={image.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group relative h-[260px] w-[82%] shrink-0 snap-center overflow-hidden rounded-[1.8rem] border border-amber-100 bg-white shadow-xl shadow-slate-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-950/10 md:w-auto ${
                      index === 0
                        ? "md:col-span-2 md:row-span-2 md:h-[536px]"
                        : ""
                    }`}
                  >
                    <img
                      src={image.image_url}
                      alt={image.title || "Event gallery image"}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      loading="lazy"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />

                    <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--theme-primary-text)] shadow-lg backdrop-blur">
                      Gallery
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-5">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">
                        Event Moment
                      </p>

                      <p className="mt-1 line-clamp-2 text-lg font-black tracking-[-0.04em] text-white">
                        {image.title || "Meelad Fest Moment"}
                      </p>

                      {image.description && (
                        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-white/75">
                          {image.description}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="-mx-4 mt-7 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0">
                {[
                  "Opening Ceremony",
                  "Stage Programmes",
                  "Prize Distribution",
                  "Winners Gallery",
                  "Audience Moments",
                ].map((title, index) => (
                  <div
                    key={title}
                    className={`group relative h-[260px] w-[82%] shrink-0 snap-center overflow-hidden rounded-[1.8rem] border border-amber-100 bg-white shadow-xl shadow-slate-900/5 md:w-auto ${
                      index === 0
                        ? "md:col-span-2 md:row-span-2 md:h-[536px]"
                        : ""
                    }`}
                  >
                    <div className="flex h-full w-full flex-col justify-between bg-gradient-to-br from-[var(--theme-primary-soft)] via-white to-amber-50 p-6">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[var(--theme-primary-text)] shadow-lg shadow-emerald-950/5">
                        <Camera size={25} />
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--theme-primary-text)]">
                          Coming Soon
                        </p>

                        <h3 className="mt-2 text-xl font-black tracking-[-0.05em] text-[var(--theme-primary-dark)]">
                          {title}
                        </h3>

                        <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                          Upload photos from Gallery Admin to show them here.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <footer className="px-4 py-10 sm:px-6 lg:px-8">
  <div className="mx-auto max-w-7xl rounded-[1.7rem] border border-amber-100 bg-white/70 px-5 py-6 text-center shadow-lg shadow-slate-900/5 backdrop-blur">
    <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-bold text-slate-500">
      <span>{organization?.name}</span>
      <span className="text-slate-300">•</span>
      <span>{eventInfo?.title}</span>
      <span className="text-slate-300">•</span>
      <span className="font-semibold text-slate-400">Powered by</span>
      <a
        href="https://festeazy.com"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visit FestEazy website"
        className="group inline-flex items-center gap-1 font-extrabold text-violet-700 transition hover:text-violet-900"
      >
        <span className="relative">
          FestEazy
          <span className="absolute -bottom-1 left-0 h-0.5 w-full origin-left rounded-full bg-violet-600 transition-transform duration-200 group-hover:scale-x-110" />
        </span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          <path d="M7 17 17 7" />
          <path d="M7 7h10v10" />
        </svg>
      </a>
    </p>
  </div>
</footer>

      {canShowPosters && selectedPosterGroup && (
        <PosterPreviewModal
          group={selectedPosterGroup}
          templates={posterTemplates}
          selectedTemplateId={selectedPosterTemplate?.id || ""}
          template={selectedPosterTemplate}
          posterData={selectedPosterData}
          categoryName={getCategoryName(selectedPosterGroup.programme.category_id)}
          resultNo={getProgrammeResultNumber(selectedPosterGroup)}
          getTeamName={getTeamName}
          getPositionMedal={getPositionMedal}
          isBusy={isPosterBusy}
          onClose={() => setSelectedPosterGroup(null)}
          onSelectTemplate={setSelectedPosterTemplateId}
          onDownload={downloadPoster}
          onShare={sharePosterImage}
        />
      )}

    </main>
  );
}

function normalizeLayer(
  key: LayerKey,
  template: PosterTemplate | null,
): LayerStyle {
  const saved = template?.layout?.[key] || {};
  const base = DEFAULT_LAYOUT[key];

  return {
    ...base,
    ...saved,
    x: Number(saved.x ?? base.x),
    y: Number(saved.y ?? base.y),
    width: Number(saved.width ?? base.width),
    fontSize: Number(saved.fontSize ?? base.fontSize),
    lineHeight: Number(saved.lineHeight ?? base.lineHeight),
    color: String(saved.color || base.color),
    align: (saved.align as LayerStyle["align"]) || base.align,
    fontFamily: String(saved.fontFamily || base.fontFamily),
    fontWeight: saved.fontWeight ?? base.fontWeight,
    letterSpacing: String(saved.letterSpacing || base.letterSpacing),
    visible:
      saved.visible ?? base.visible ?? !FOOTER_LAYER_KEYS.includes(key),
  };
}

function getLayerAutoFitFontSize(
  key: LayerKey,
  value: string,
  layer: LayerStyle,
) {
  const baseSize = Math.max(8, Number(layer.fontSize || 28));
  if (!AUTO_FIT_LAYER_KEYS.includes(key) || !value || value === "-") {
    return baseSize;
  }

  if (typeof document === "undefined") return baseSize;

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return baseSize;

  const minSize = Math.max(11, Math.round(baseSize * 0.58));
  const letterSpacing = Number.parseFloat(layer.letterSpacing) || 0;
  const fontWeight = String(layer.fontWeight || 700);
  const fontFamily = layer.fontFamily || "Arial, sans-serif";

  for (let size = baseSize; size >= minSize; size -= 1) {
    context.font = `${fontWeight} ${size}px ${fontFamily}`;
    const measured =
      context.measureText(value).width +
      Math.max(0, value.length - 1) * letterSpacing;

    if (measured <= Number(layer.width || 500)) return size;
  }

  return minSize;
}

function PosterCanvas({
  template,
  data,
  scale,
}: {
  template: PosterTemplate;
  data: PosterData;
  scale: number;
}) {
  const width = Number(template.canvas_width || 1077);
  const height = Number(template.canvas_height || 1350);
  const adUrl = template.ad_banner_url || template.ad_image_url || "";
  const showAd = Boolean(template.show_ad_banner && adUrl);

  return (
    <div
      className="relative overflow-hidden bg-slate-900"
      style={{
        width: width * scale,
        height: height * scale,
      }}
    >
      <div
        className="absolute left-0 top-0 overflow-hidden bg-slate-900"
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <img
          src={template.image_url}
          alt={template.name || "Poster Template"}
          crossOrigin="anonymous"
          className="absolute inset-0 h-full w-full object-fill"
          draggable={false}
        />

        {FIELD_ORDER.map((key) => {
          const layer = normalizeLayer(key, template);
          const value = data[key];

          if (!value || value === "-" || layer.visible === false) return null;

          const fittedFontSize = getLayerAutoFitFontSize(key, value, layer);

          return (
            <div
              key={key}
              className="absolute select-none whitespace-pre-wrap"
              style={{
                left: layer.x,
                top: layer.y,
                width: layer.width,
                color: layer.color,
                fontSize: fittedFontSize,
                fontWeight: layer.fontWeight,
                fontFamily: layer.fontFamily,
                lineHeight: layer.lineHeight,
                letterSpacing: layer.letterSpacing,
                textAlign: layer.align,
              }}
            >
              {value}
            </div>
          );
        })}

        {showAd && (
          <img
            src={adUrl}
            alt="Ad banner"
            crossOrigin="anonymous"
            className="absolute object-fill"
            style={{
              left: Number(template.ad_x || 0),
              top: Number(template.ad_y || height - 240),
              width: Number(template.ad_width || width),
              height: Number(template.ad_height || 240),
            }}
            draggable={false}
          />
        )}
      </div>
    </div>
  );
}

function ResponsivePosterCanvas({
  template,
  data,
}: {
  template: PosterTemplate;
  data: PosterData;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [availableSize, setAvailableSize] = useState({
    width: 320,
    height: 500,
  });

  const posterWidth = Number(template.canvas_width || 1077);
  const posterHeight = Number(template.canvas_height || 1350);
  const widthScale = availableSize.width / posterWidth;
  const heightScale = availableSize.height / posterHeight;
  const scale = Math.min(1, Math.max(0.08, widthScale, 0), Math.max(0.08, heightScale, 0));

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const updateSize = () => {
      setAvailableSize({
        width: Math.max(220, wrap.clientWidth - 4),
        height: Math.max(280, wrap.clientHeight - 4),
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(wrap);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [template.id]);

  return (
    <div
      ref={wrapRef}
      className="mx-auto flex h-full min-h-[320px] w-full items-center justify-center"
    >
      <div
        className="overflow-hidden rounded-[1.35rem] bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/5"
        style={{
          width: posterWidth * scale,
          height: posterHeight * scale,
        }}
      >
        <PosterCanvas template={template} data={data} scale={scale} />
      </div>
    </div>
  );
}

function PosterPreviewModal({
  group,
  templates,
  selectedTemplateId,
  template,
  posterData,
  categoryName,
  resultNo,
  getTeamName,
  getPositionMedal,
  isBusy,
  onClose,
  onSelectTemplate,
  onDownload,
  onShare,
}: {
  group: ProgrammeResultGroup;
  templates: PosterTemplate[];
  selectedTemplateId: string;
  template: PosterTemplate | null;
  posterData: PosterData | null;
  categoryName: string;
  resultNo: number;
  getTeamName: (id: string | null) => string;
  getPositionMedal: (position: number | null) => string;
  isBusy: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
  onDownload: () => void;
  onShare: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-md sm:px-4 sm:py-6">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl shadow-black/30 sm:h-[calc(100vh-3rem)] sm:rounded-[2rem]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--theme-primary-text)]">
              Official Result Poster
            </p>
            <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-[var(--theme-primary-dark)] sm:text-2xl">
              Poster Preview
            </h3>
            <p className="mt-1 truncate text-xs font-bold text-slate-500 sm:text-sm">
              Result {String(resultNo).padStart(2, "0")} • {group.programme.name} • {categoryName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Close poster preview"
          >
            <X size={21} />
          </button>
        </div>

        {templates.length > 1 && (
          <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-slate-900">
                  Choose your poster design
                </p>
                <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                  Select any design before downloading or sharing.
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-100">
                {templates.length} designs
              </span>
            </div>

            <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {templates.map((posterTemplate, index) => {
                const isSelected = posterTemplate.id === selectedTemplateId;

                return (
                  <button
                    key={posterTemplate.id}
                    type="button"
                    onClick={() => onSelectTemplate(posterTemplate.id)}
                    aria-pressed={isSelected}
                    className={`flex min-w-[150px] snap-start items-center gap-3 rounded-2xl border p-2 text-left transition sm:min-w-[180px] ${
                      isSelected
                        ? "border-violet-500 bg-violet-50 shadow-md shadow-violet-900/10 ring-2 ring-violet-100"
                        : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"
                    }`}
                  >
                    <div className="h-14 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                      <img
                        src={posterTemplate.image_url}
                        alt={posterTemplate.name || `Poster design ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-900">
                        {posterTemplate.name || `Design ${index + 1}`}
                      </p>
                      <p
                        className={`mt-1 text-[10px] font-black uppercase tracking-[0.1em] ${
                          isSelected ? "text-violet-700" : "text-slate-400"
                        }`}
                      >
                        {isSelected
                          ? "Selected"
                          : posterTemplate.is_active
                            ? "Default"
                            : `Design ${index + 1}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex min-h-0 items-center justify-center overflow-hidden bg-slate-100 p-3 sm:p-6 lg:p-8">
            {template && posterData ? (
              <ResponsivePosterCanvas template={template} data={posterData} />
            ) : (
              <div className="mx-auto flex min-h-[420px] w-full max-w-lg items-center justify-center rounded-[2rem] border border-dashed border-amber-200 bg-white p-8 text-center">
                <div>
                  <Download className="mx-auto text-amber-500" size={38} />
                  <h4 className="mt-4 text-xl font-black text-slate-950">
                    Poster template not available
                  </h4>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                    Upload and activate a custom template from Admin → Poster Studio.
                  </p>
                </div>
              </div>
            )}
          </div>

          <aside className="max-h-[44vh] overflow-y-auto border-t border-slate-100 bg-[#fffaf0] p-4 sm:p-5 lg:max-h-none lg:border-l lg:border-t-0 lg:p-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
              <button
                type="button"
                onClick={onDownload}
                disabled={!template || isBusy}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--theme-primary)] px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <Download size={17} />
                )}
                Download
              </button>

              <button
                type="button"
                onClick={onShare}
                disabled={!template || isBusy}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <Share2 size={17} />
                )}
                Share
              </button>
            </div>

            <div className="mt-4 rounded-[1.4rem] border border-amber-100 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-base font-black text-slate-950">
                  Top Winners
                </h4>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-100">
                  Published
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {group.entries
                  .filter((entry) => entry.result.grade !== "Absent")
                  .slice(0, 3)
                  .map((entry) => (
                    <div
                      key={entry.result.id}
                      className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
                        {getPositionMedal(entry.result.position)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-950">
                          {String(entry.participantTitle || "-")
                            .replace(/^#?\d+\s*/, "")
                            .trim() || "-"}
                        </p>
                        <p className="truncate text-xs font-bold text-slate-500">
                          {getTeamName(entry.teamId)}
                        </p>
                      </div>

                      <span className="text-xs font-black text-[var(--theme-primary-text)]">
                        {entry.result.points} pts
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MilestonePosterCard({ poster }: { poster: MilestonePoster }) {
  const rows = Array.isArray(poster.leaderboard_snapshot)
    ? poster.leaderboard_snapshot
    : [];

  const visibleRows = rows.slice(0, 8);

  function shareMilestone() {
    const lines = visibleRows
      .map((team, index) => `${index + 1}. ${team.teamName} - ${team.points}`)
      .join("\n");

    const text = `${poster.title || `After ${poster.milestone_count}`} Results\n\n${lines}\n\nPowered by FestEazy`;

    if (navigator.share) {
      navigator
        .share({
          title: poster.title || `After ${poster.milestone_count}`,
          text,
        })
        .catch(() => {});
      return;
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-violet-200 bg-gradient-to-br from-[#3b0b4f] via-[#8b0f78] to-[#26002f] p-6 text-white shadow-2xl shadow-violet-950/20">
      <div className="absolute -left-16 top-10 h-36 w-36 rounded-full bg-pink-300/20 blur-3xl" />
      <div className="absolute -right-16 bottom-8 h-44 w-44 rounded-full bg-violet-300/20 blur-3xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-white/55">
              Official Points Poster
            </p>

            <h3 className="mt-3 text-5xl font-light tracking-[-0.08em] sm:text-6xl">
              After <span className="font-black">{poster.milestone_count}</span>
            </h3>

            <p className="mt-2 text-sm font-bold text-white/60">
              {poster.published_result_count} published results counted
            </p>
          </div>

          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-lg shadow-black/10">
            🏆
          </div>
        </div>

        <div className="mt-8 space-y-3">
          {visibleRows.length === 0 ? (
            <p className="rounded-2xl bg-white/10 p-4 text-sm font-bold text-white/70">
              No points available.
            </p>
          ) : (
            visibleRows.map((team, index) => (
              <div
                key={team.teamId || team.teamName || index}
                className="grid grid-cols-[42px_1fr_auto] items-center gap-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xs font-black text-white/70">
                  {index + 1}
                </span>

                <p className="truncate text-xl font-light tracking-[-0.04em]">
                  {team.teamName}
                </p>

                <p className="text-2xl font-black tracking-[-0.06em]">
                  {team.points}
                </p>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
            Powered by FestEazy
          </p>

          <button
            type="button"
            onClick={shareMilestone}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white transition hover:bg-white/15"
          >
            <Share2 size={15} />
            Share
          </button>
        </div>
      </div>
    </article>
  );
}

function HeroPill({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex min-h-10 min-w-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-black text-white shadow-sm backdrop-blur sm:text-sm">
      <span className="shrink-0 text-amber-200">{icon}</span>
      <span className="min-w-0 truncate">{text}</span>
    </div>
  );
}

function HeroStat({ number, label }: { number: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-center text-white shadow-lg shadow-black/10 backdrop-blur sm:px-3.5 sm:py-3 lg:text-left">
      <p className="text-xl font-black tracking-[-0.06em] sm:text-2xl">{number}</p>
      <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-white/65 sm:text-xs">
        {label}
      </p>
    </div>
  );
}

function SectionHeader({
  badge,
  icon,
  title,
  description,
  side,
}: {
  badge: string;
  icon: ReactNode;
  title: string;
  description: string;
  side: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--theme-primary-border)] bg-[var(--theme-primary-soft)] px-4 py-2 text-sm font-black text-[var(--theme-primary-text)]">
          {icon}
          {badge}
        </div>

        <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] text-[var(--theme-primary-dark)] sm:text-5xl">
          {title}
        </h2>

        <p className="mt-2 max-w-2xl font-medium leading-7 text-slate-600">
          {description}
        </p>
      </div>

      {typeof side === "string" ? (
        <span className="rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm font-black text-slate-600 shadow-lg shadow-slate-900/5">
          {side}
        </span>
      ) : (
        side
      )}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        size={18}
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-14 w-full rounded-2xl border border-amber-100 bg-white pl-11 pr-4 text-sm font-bold outline-none shadow-lg shadow-slate-900/5 transition focus:border-amber-300 focus:ring-4 focus:ring-amber-100"
      />
    </div>
  );
}

function ResultCard({
  group,
  resultNo,
  categoryName,
  getTeamName,
  getPositionShort,
  getPositionMedal,
  formatPublishedTime,
  showPosters,
  onViewPoster,
  onShare,
}: {
  group: ProgrammeResultGroup;
  resultNo: number;
  categoryName: string;
  getTeamName: (id: string | null) => string;
  getPositionShort: (position: number | null) => string;
  getPositionMedal: (position: number | null) => string;
  formatPublishedTime: (date: string | null) => string;
  showPosters: boolean;
  onViewPoster: () => void;
  onShare: () => void;
}) {
  const topThree = group.entries
    .filter((entry) => entry.result.grade !== "Absent")
    .slice(0, 3);
  const firstPublishedAt = group.entries[0]?.result.published_at || null;

  return (
    <article className="overflow-hidden rounded-[1.55rem] border border-amber-100 bg-white shadow-lg shadow-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10">
      <div className="relative border-b border-amber-100 bg-gradient-to-br from-[#fffaf0] via-white to-[var(--theme-primary-soft)] px-4 py-4 sm:px-5">
        <div className="absolute right-4 top-4 hidden h-12 w-12 items-center justify-center rounded-2xl bg-[var(--theme-primary)] text-white shadow-lg shadow-slate-900/20 sm:flex">
          <Medal size={24} />
        </div>

        <div className="pr-0 sm:pr-16">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="purple">Result {String(resultNo).padStart(2, "0")}</Badge>
            <Badge tone="green">Published</Badge>
            <Badge tone="amber">{categoryName}</Badge>
            <Badge tone="slate">
              {group.programme.programme_type === "group"
                ? "Group"
                : "Individual"}
            </Badge>
          </div>

          <h3 className="text-xl font-black tracking-[-0.04em] text-[var(--theme-primary-dark)] sm:text-2xl">
            {group.programme.name}
          </h3>

          <p className="mt-1.5 text-sm font-bold text-slate-500">
            {formatPublishedTime(firstPublishedAt)}
          </p>
        </div>
      </div>

      <div className="space-y-2.5 p-4 sm:p-5">
        {topThree.map((entry) => (
          <WinnerRow
            key={entry.result.id}
            medal={getPositionMedal(entry.result.position)}
            title={getPositionShort(entry.result.position)}
            name={entry.participantTitle}
            team={getTeamName(entry.teamId)}
            points={entry.result.points}
          />
        ))}
      </div>

      <div
        className={`grid gap-3 border-t border-amber-100 bg-[#fffdf8] p-4 ${
          showPosters ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {showPosters && (
          <button
            type="button"
            onClick={onViewPoster}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--theme-primary)] px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/20 transition hover:brightness-90"
          >
            <Download size={17} />
            View Poster
          </button>
        )}

        <button
          type="button"
          onClick={onShare}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-100 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-amber-50"
        >
          <Share2 size={17} />
          Share Result
        </button>
      </div>
    </article>
  );
}

function WinnerRow({
  medal,
  title,
  name,
  team,
  points,
}: {
  medal: string;
  title: string;
  name: string;
  team: string;
  points: number;
}) {
  const cleanName = String(name || "-").replace(/^#?\d+\s*/, "").trim() || "-";

  return (
    <div className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-2xl border border-amber-50 bg-white px-3 py-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-xl">
        {medal}
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          {title}
        </p>
        <p className="truncate text-sm font-black uppercase tracking-[0.03em] text-slate-950 sm:text-base">
          {cleanName}
        </p>
        <p className="truncate text-xs font-black uppercase tracking-[0.08em] text-slate-500">
          {team}
        </p>
      </div>

      <p className="whitespace-nowrap text-sm font-black text-[var(--theme-primary-text)] sm:text-base">
        {points} pts
      </p>
    </div>
  );
}

function StudentResultCard({
  entry,
  teamName,
  position,
  medal,
}: {
  entry: ResultEntry;
  teamName: string;
  position: string;
  medal: string;
}) {
  const cleanName =
    String(entry.participantTitle || "-").replace(/^#?\d+\s*/, "").trim() || "-";

  return (
    <div className="rounded-[1.5rem] border border-amber-100 bg-white p-4 shadow-xl shadow-slate-900/5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-xl">
          {medal}
        </div>

        <div className="min-w-0">
          <p className="truncate text-base font-black text-slate-950">
            {cleanName}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {entry.programme.name}
          </p>
          <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
            {position}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <MiniStat label="Team" value={teamName} />
        <MiniStat label="Points" value={String(entry.result.points)} />
      </div>
    </div>
  );
}

function PublicTeamCard({
  team,
  points,
  rank,
}: {
  team: Team;
  points: number;
  rank: number | null;
}) {
  return (
    <article className="overflow-hidden rounded-[1.8rem] border border-amber-100 bg-white shadow-xl shadow-slate-900/5">
      <div className="bg-gradient-to-br from-white via-[var(--theme-primary-soft)] to-amber-50 p-5">
        <div className="flex items-start gap-4">
          <TeamAvatar team={team} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-2">
              {team.code && (
                <span className="rounded-full bg-[var(--theme-primary)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white shadow-sm">
                  {team.code}
                </span>
              )}

              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                Team / House
              </span>
            </div>

            <h3 className="mt-3 line-clamp-2 text-xl font-black tracking-[-0.05em] text-[var(--theme-primary-dark)]">
              {team.name}
            </h3>

            <p className="mt-1 text-sm font-bold text-slate-500">
              Leader: {team.leader_name || "Not added"}
            </p>
          </div>
        </div>

        {team.description && (
          <p className="mt-4 line-clamp-3 text-sm font-bold leading-6 text-slate-500">
            {team.description}
          </p>
        )}
      </div>
    </article>
  );
}

function TeamAvatar({ team }: { team: Team }) {
  const initials = String(team.name || "T")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white p-2 text-xl font-black text-[var(--theme-primary-text)] shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5">
      {team.logo_url ? (
        <img
          src={team.logo_url}
          alt={`${team.name} logo`}
          className="h-full w-full object-contain"
          loading="lazy"
          decoding="async"
        />
      ) : (
        initials
      )}
    </div>
  );
}

function TopRankCard({
  medal,
  title,
  team,
  points,
  className,
  large = false,
}: {
  medal: string;
  title: string;
  team: string;
  points: number;
  className: string;
  large?: boolean;
}) {
  return (
    <article
      className={`flex min-h-[18rem] h-full flex-col rounded-[1.8rem] border p-6 shadow-xl shadow-slate-900/5 sm:min-h-[19rem] ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <div
          className={`flex shrink-0 items-center justify-center rounded-3xl bg-amber-100 ${
            large ? "h-20 w-20 text-5xl" : "h-16 w-16 text-4xl"
          }`}
          aria-hidden="true"
        >
          {medal}
        </div>

        <span className="whitespace-nowrap rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          {title}
        </span>
      </div>

      <div className="mt-auto pt-8">
        <h3
          title={team}
          className={`break-words font-black leading-[1.05] tracking-[-0.04em] text-slate-950 ${
            large ? "text-3xl" : "text-2xl"
          }`}
        >
          {team}
        </h3>

        <p
          className={`mt-4 flex flex-wrap items-baseline font-black leading-none tracking-[-0.06em] text-[var(--theme-primary-text)] ${
            large ? "text-5xl" : "text-4xl"
          }`}
        >
          {points}
          <span className="ml-2 text-base font-black tracking-normal text-slate-400">
            Points
          </span>
        </p>
      </div>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#fffaf0] px-3 py-3 text-center">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-black text-slate-950">{value}</p>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "green" | "amber" | "slate" | "purple";
}) {
  const toneClass =
    tone === "green"
      ? "border-[var(--theme-primary-border)] bg-[var(--theme-primary-soft)] text-[var(--theme-primary-text)]"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "purple"
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-slate-200 bg-white text-slate-600";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black ${toneClass}`}
    >
      {children}
    </span>
  );
}

function EmptyBox({ title }: { title: string }) {
  return (
    <div className="mt-6 rounded-[1.8rem] border border-amber-100 bg-white p-10 text-center shadow-xl shadow-slate-900/5">
      <Download className="mx-auto text-amber-500" size={36} />
      <p className="mt-4 text-lg font-black text-slate-900">{title}</p>
      <p className="mt-2 text-sm font-bold text-slate-500">
        Results will appear here after admin publishes them.
      </p>
    </div>
  );
}