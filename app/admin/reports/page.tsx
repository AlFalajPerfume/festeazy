/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import FontFamilySelect from "@/components/FontFamilySelect";
import { DEFAULT_APP_FONT_FAMILY } from "@/app/fonts";
import SearchableProgrammeSelect from "@/components/admin/SearchableProgrammeSelect";
import { getAdminContext } from "@/lib/admin-context";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { supabase } from "@/lib/supabase";
import {
  Check,
  Download,
  FileText,
  Filter,
  ImagePlus,
  Loader2,
  Palette,
  Printer,
  RefreshCcw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

type OrganizationUser = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
};

type Organization = {
  id: string;
  name: string;
  place: string | null;
  logo_url: string | null;
};

type EventInfo = {
  id: string;
  organization_id: string;
  title: string;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
  is_public?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Category = {
  id: string;
  name: string;
};

type ClassItem = {
  id: string;
  name: string;
  category_id: string | null;
  sort_order: number;
};

type DivisionItem = {
  id: string;
  class_id: string;
  name: string;
  sort_order: number;
};

type Team = {
  id: string;
  name: string;
  code: string | null;
};

type Student = {
  id: string;
  chest_no: string | null;
  admission_no: string | null;
  name: string;
  gender: string;
  class_id: string | null;
  division_id: string | null;
  category_id: string | null;
  team_id: string | null;
  guardian_name: string | null;
  phone: string | null;
  status: string;
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
  max_participants_per_team: number | null;
  max_members_per_group: number | null;
  duration_minutes: number | null;
  total_marks: number;
  sort_order: number;
  status: string;
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
};

type ProgrammeCode = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_id: string;
  registration_id: string;
  code_letter: string;
  is_present: boolean;
};

type ReportType =
  | "green_room"
  | "valuation_sheet"
  | "common_valuation_sheet"
  | "call_list"
  | "registration_sheet"
  | "chest_cards"
  | "chest_list"
  | "participant_list"
  | "programme_register"
  | "winners_list"
  | "prize_distribution"
  | "team_wise"
  | "top_scorers"
  | "encouragement_gift"
  | "result_summary";

type ChestPaperFormat =
  "a4-portrait" | "a4-landscape" | "a3-portrait" | "a3-landscape";
type ChestWallpaper = "classic" | "sunrise" | "gradient" | "custom";
type PreviewPageFormat = ChestPaperFormat;
type ChestImageFit = "cover" | "contain";
type RegistrationSheetMode = "blank" | "filled";

type ChestTextElement =
  | "logo"
  | "organization"
  | "event"
  | "chestLabel"
  | "chestNumber"
  | "infoBox"
  | "studentName"
  | "details"
  | "division"
  | "team";

type ChestTextPosition = {
  x: number;
  y: number;
};

type ChestTextLayout = Record<ChestTextElement, ChestTextPosition>;

type ChestElementStyle = {
  visible: boolean;
  fontFamily: string;
  fontScale: number;
  fontWeight: number;
  color: string;
};

type ChestElementStyleMap = Record<ChestTextElement, ChestElementStyle>;

const CHEST_ELEMENT_LABELS: Record<ChestTextElement, string> = {
  logo: "Organization Logo",
  organization: "Organization Name",
  event: "Event Title",
  chestLabel: "Chest No Label",
  chestNumber: "Chest Number",
  infoBox: "Student Details Box",
  studentName: "Student Name",
  details: "Category / Class",
  division: "Division",
  team: "Team Name",
};

const CHEST_TEXT_ELEMENTS: ChestTextElement[] = [
  "organization",
  "event",
  "chestLabel",
  "chestNumber",
  "studentName",
  "details",
  "division",
  "team",
];

const DEFAULT_CHEST_TEXT_LAYOUT: ChestTextLayout = {
  logo: { x: 0, y: 0 },
  organization: { x: 0, y: 0 },
  event: { x: 0, y: 0 },
  chestLabel: { x: 0, y: 0 },
  chestNumber: { x: 0, y: 0 },
  infoBox: { x: 0, y: 0 },
  studentName: { x: 0, y: 0 },
  details: { x: 0, y: 0 },
  division: { x: 0, y: 0 },
  team: { x: 0, y: 0 },
};

function createDefaultChestTextLayout(): ChestTextLayout {
  return {
    logo: { ...DEFAULT_CHEST_TEXT_LAYOUT.logo },
    organization: { ...DEFAULT_CHEST_TEXT_LAYOUT.organization },
    event: { ...DEFAULT_CHEST_TEXT_LAYOUT.event },
    chestLabel: { ...DEFAULT_CHEST_TEXT_LAYOUT.chestLabel },
    chestNumber: { ...DEFAULT_CHEST_TEXT_LAYOUT.chestNumber },
    infoBox: { ...DEFAULT_CHEST_TEXT_LAYOUT.infoBox },
    studentName: { ...DEFAULT_CHEST_TEXT_LAYOUT.studentName },
    details: { ...DEFAULT_CHEST_TEXT_LAYOUT.details },
    division: { ...DEFAULT_CHEST_TEXT_LAYOUT.division },
    team: { ...DEFAULT_CHEST_TEXT_LAYOUT.team },
  };
}

function createDefaultChestElementStyles(): ChestElementStyleMap {
  const font = DEFAULT_APP_FONT_FAMILY;
  return {
    logo: { visible: true, fontFamily: font, fontScale: 100, fontWeight: 700, color: "#0f172a" },
    organization: { visible: true, fontFamily: font, fontScale: 100, fontWeight: 900, color: "#7c3aed" },
    event: { visible: true, fontFamily: font, fontScale: 100, fontWeight: 800, color: "#475569" },
    chestLabel: { visible: true, fontFamily: font, fontScale: 100, fontWeight: 900, color: "#64748b" },
    chestNumber: { visible: true, fontFamily: font, fontScale: 100, fontWeight: 900, color: "#0f172a" },
    infoBox: { visible: true, fontFamily: font, fontScale: 100, fontWeight: 700, color: "#0f172a" },
    studentName: { visible: true, fontFamily: font, fontScale: 100, fontWeight: 900, color: "#0f172a" },
    details: { visible: true, fontFamily: font, fontScale: 100, fontWeight: 800, color: "#475569" },
    division: { visible: false, fontFamily: font, fontScale: 100, fontWeight: 800, color: "#64748b" },
    team: { visible: true, fontFamily: font, fontScale: 100, fontWeight: 900, color: "#7c3aed" },
  };
}

type ParticipantEntry = {
  key: string;
  programmeId: string | null;
  programmeName: string;
  programmeType: string;
  stageType: string;
  categoryName: string;
  totalMarks: number;
  chestNo: string;
  participantName: string;
  memberNames: string[];
  className: string;
  divisionName: string;
  teamName: string;
  teamId: string | null;
  gender: string;
  type: string;
  registrationId: string | null;
  codeLetter?: string | null;
  isPresent?: boolean;
};

type StudentProgrammeAssignment = {
  programmeId: string;
  programmeName: string;
  programmeType: string;
  stageType: string;
  sortOrder: number;
  groupName: string | null;
};

type StudentProgrammeRow = {
  student: Student;
  chestNo: string;
  studentName: string;
  gender: string;
  categoryName: string;
  className: string;
  divisionName: string;
  teamName: string;
  programmes: StudentProgrammeAssignment[];
};

type TopScorerRow = {
  rank: number;
  student: Student;
  chestNo: string;
  studentName: string;
  gender: string;
  categoryName: string;
  className: string;
  divisionName: string;
  teamName: string;
  stagePoints: number;
  offStagePoints: number;
  totalPoints: number;
  resultCount: number;
};

type EncouragementGiftRow = {
  student: Student;
  chestNo: string;
  studentName: string;
  gender: string;
  categoryName: string;
  className: string;
  divisionName: string;
  teamName: string;
  programmeCount: number;
};

const REPORT_TYPES: {
  id: ReportType;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    id: "green_room",
    title: "Green Room Sign",
    description: "Separate programme-wise attendance sheet",
    icon: "🚪",
  },
  {
    id: "valuation_sheet",
    title: "Valuation Sheet",
    description: "Separate judge mark sheet for each programme",
    icon: "📝",
  },
  {
    id: "common_valuation_sheet",
    title: "Common Valuation Sheet",
    description: "One common blank-code mark sheet for selected programmes",
    icon: "📄",
  },
  {
    id: "call_list",
    title: "Call List",
    description: "Separate stage calling list for each programme",
    icon: "📣",
  },
  {
    id: "registration_sheet",
    title: "Entry Form",
    description:
      "Download a blank or category-wise filled student entry form",
    icon: "📑",
  },
  {
    id: "chest_cards",
    title: "Chest Number Cards",
    description: "Designed printable chest cards for A4 / A3",
    icon: "🎫",
  },
  {
    id: "chest_list",
    title: "Chest Number List",
    description: "Student chest number details list",
    icon: "🔢",
  },
  {
    id: "participant_list",
    title: "Student Programme Register",
    description: "Student-wise programme assignments for team leaders",
    icon: "👥",
  },
  {
    id: "programme_register",
    title: "Programme Register",
    description: "Clean portrait programme list",
    icon: "📋",
  },
  {
    id: "winners_list",
    title: "Winners List",
    description: "Rank, grade, mark and points list",
    icon: "🏆",
  },
  {
    id: "prize_distribution",
    title: "Prize Distribution",
    description: "Prize handover list for stage",
    icon: "🎁",
  },
  {
    id: "team_wise",
    title: "Team-wise List",
    description: "Students grouped by team / house",
    icon: "🏠",
  },
  {
    id: "top_scorers",
    title: "Top Scorers Report",
    description: "Vocal, Pen and individual point ranking",
    icon: "⭐",
  },
  {
    id: "encouragement_gift",
    title: "Encouragement Gift Report",
    description:
      "Unique participating students without any published 1st or 2nd prize",
    icon: "🎀",
  },
  {
    id: "result_summary",
    title: "Result Summary",
    description: "Team points and result summary",
    icon: "📊",
  },
];

type ReportGroup = {
  id: string;
  title: string;
  description: string;
  reportIds: ReportType[];
};

const REPORT_GROUPS: ReportGroup[] = [
  {
    id: "operations",
    title: "Event Operations",
    description: "Documents used during programme execution and judging.",
    reportIds: [
      "green_room",
      "call_list",
      "valuation_sheet",
      "common_valuation_sheet",
    ],
  },
  {
    id: "participants",
    title: "Participants & Registration",
    description: "Student, chest number, programme and team records.",
    reportIds: [
      "registration_sheet",
      "chest_cards",
      "chest_list",
      "participant_list",
      "programme_register",
      "team_wise",
    ],
  },
  {
    id: "results",
    title: "Results & Awards",
    description: "Winner, prize, topper and team point reports.",
    reportIds: [
      "winners_list",
      "prize_distribution",
      "encouragement_gift",
      "top_scorers",
      "result_summary",
    ],
  },
];

const LANDSCAPE_REPORTS: ReportType[] = [
  "registration_sheet",
  "chest_list",
  "winners_list",
  "prize_distribution",
  "encouragement_gift",
  "team_wise",
  "top_scorers",
  "result_summary",
];

const RESULT_DETAIL_REPORTS: ReportType[] = [
  "winners_list",
  "prize_distribution",
  "encouragement_gift",
  "top_scorers",
  "result_summary",
];

const CHEST_WALLPAPERS: {
  id: "classic" | "sunrise";
  name: string;
  description: string;
  background: string;
}[] = [
  {
    id: "classic",
    name: "FestEazy Classic",
    description: "Clean violet and warm accents",
    background:
      "radial-gradient(circle at top left, rgba(124,58,237,.20), transparent 36%), radial-gradient(circle at bottom right, rgba(249,115,22,.18), transparent 34%), linear-gradient(135deg,#ffffff 0%,#faf7ff 48%,#fff7ed 100%)",
  },
  {
    id: "sunrise",
    name: "Warm Sunrise",
    description: "Soft gold and rose wallpaper",
    background:
      "radial-gradient(circle at 18% 20%, rgba(251,191,36,.30), transparent 30%), radial-gradient(circle at 86% 82%, rgba(244,63,94,.18), transparent 30%), linear-gradient(135deg,#fff7ed 0%,#ffffff 52%,#fdf2f8 100%)",
  },
];

function getChestWallpaperBackground(wallpaper: "classic" | "sunrise") {
  return (
    CHEST_WALLPAPERS.find((item) => item.id === wallpaper)?.background ||
    CHEST_WALLPAPERS[0].background
  );
}

function getChestGradientBackground(
  startColor: string,
  endColor: string,
  angle: number,
  balance: number,
) {
  const safeAngle = Math.min(360, Math.max(0, angle));
  const safeBalance = Math.min(78, Math.max(22, balance));

  return `linear-gradient(${safeAngle}deg, ${startColor} 0%, #ffffff ${safeBalance}%, ${endColor} 100%)`;
}

function safeDownloadName(value: string) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export default function ReportsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [programmeCodes, setProgrammeCodes] = useState<ProgrammeCode[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);

  const [reportType, setReportType] = useState<ReportType>("valuation_sheet");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [entryFormDivisionFilter, setEntryFormDivisionFilter] =
    useState("all");
  const [chestCardDivisionFilter, setChestCardDivisionFilter] = useState("all");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [stageLocationFilter, setStageLocationFilter] = useState("all");
  const [showParticipantDivision, setShowParticipantDivision] = useState(false);
  const [showResultClass, setShowResultClass] = useState(true);
  const [showResultDivision, setShowResultDivision] = useState(false);
  const [showEntryFormDivision, setShowEntryFormDivision] = useState(false);
  const [showEntryFormChestNo, setShowEntryFormChestNo] = useState(false);
  const [showChestCardDivision, setShowChestCardDivision] = useState(false);
  const [chestTextDragEnabled, setChestTextDragEnabled] = useState(false);
  const [chestTextLayout, setChestTextLayout] = useState<ChestTextLayout>(
    createDefaultChestTextLayout,
  );
  const [chestElementStyles, setChestElementStyles] = useState<ChestElementStyleMap>(
    createDefaultChestElementStyles,
  );
  const [selectedChestElement, setSelectedChestElement] =
    useState<ChestTextElement>("chestNumber");
  const [chestLogoSizeMm, setChestLogoSizeMm] = useState(8);
  const [chestInfoBoxWidthPercent, setChestInfoBoxWidthPercent] = useState(100);
  const [chestInfoBoxPaddingMm, setChestInfoBoxPaddingMm] = useState(3.8);
  const [chestInfoBoxRadiusMm, setChestInfoBoxRadiusMm] = useState(6);
  const [compactMode, setCompactMode] = useState(false);
  const [chestPaperFormat, setChestPaperFormat] =
    useState<ChestPaperFormat>("a3-landscape");
  const [chestCardWidthMm, setChestCardWidthMm] = useState(65);
  const [chestCardHeightMm, setChestCardHeightMm] = useState(110);
  const [chestCardGapMm, setChestCardGapMm] = useState(0.8);
  const [chestFontFamily, setChestFontFamily] = useState(
    DEFAULT_APP_FONT_FAMILY,
  );
  const [chestWallpaper, setChestWallpaper] =
    useState<ChestWallpaper>("classic");
  const [chestDesignImage, setChestDesignImage] = useState("");
  const [chestDesignName, setChestDesignName] = useState("");
  const [chestImageFit, setChestImageFit] = useState<ChestImageFit>("cover");
  const [chestOverlayStrength, setChestOverlayStrength] = useState(42);
  const [chestGradientStart, setChestGradientStart] = useState("#ddd6fe");
  const [chestGradientEnd, setChestGradientEnd] = useState("#fed7aa");
  const [chestGradientAngle, setChestGradientAngle] = useState(135);
  const [chestGradientBalance, setChestGradientBalance] = useState(52);
  const [showFilters, setShowFilters] = useState(false);

  const [registrationSheetMode, setRegistrationSheetMode] =
    useState<RegistrationSheetMode>("filled");
  const [registrationSheetRows, setRegistrationSheetRows] = useState(24);
  const [registrationMarkColumns, setRegistrationMarkColumns] = useState(25);
  const [isRegistrationDownloading, setIsRegistrationDownloading] =
    useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (reportType === "registration_sheet" && categoryFilter === "all") {
      setCategoryFilter(categories[0]?.id || "general");
      setClassFilter("all");
      setEntryFormDivisionFilter("all");
    }
  }, [reportType, categories, categoryFilter]);

  const activeReport = REPORT_TYPES.find((item) => item.id === reportType)!;

  const availableClassOptions = useMemo(() => {
    if (categoryFilter === "all" || categoryFilter === "general") return [];

    return classes
      .filter((item) => item.category_id === categoryFilter)
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.name.localeCompare(b.name);
      });
  }, [classes, categoryFilter]);

  useEffect(() => {
    if (classFilter === "all") return;

    if (!availableClassOptions.some((item) => item.id === classFilter)) {
      setClassFilter("all");
      setEntryFormDivisionFilter("all");
      setChestCardDivisionFilter("all");
    }
  }, [classFilter, availableClassOptions]);

  const chestCardLayout = useMemo(
    () =>
      calculateChestCardLayout(
        chestPaperFormat,
        chestCardWidthMm,
        chestCardHeightMm,
        chestCardGapMm,
      ),
    [chestPaperFormat, chestCardWidthMm, chestCardHeightMm, chestCardGapMm],
  );

  const filteredStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return students
      .filter((student) => {
        if (String(student.status || "").toLowerCase() === "inactive") {
          return false;
        }

        const studentRegistrations = registrations.filter(
          (registration) => registration.student_id === student.id,
        );

        const assignedProgrammes = studentRegistrations
          .map((registration) =>
            programmes.find((programme) => programme.id === registration.programme_id),
          )
          .filter(Boolean) as Programme[];

        const matchesSearch =
          !keyword ||
          student.name.toLowerCase().includes(keyword) ||
          String(student.chest_no || "")
            .toLowerCase()
            .includes(keyword) ||
          String(student.admission_no || "")
            .toLowerCase()
            .includes(keyword) ||
          getTeamName(student.team_id).toLowerCase().includes(keyword) ||
          getClassName(student.class_id).toLowerCase().includes(keyword) ||
          assignedProgrammes.some((programme) =>
            programme.name.toLowerCase().includes(keyword),
          );

        const matchesCategory =
          categoryFilter === "all" ||
          (categoryFilter === "general"
            ? !student.category_id
            : student.category_id === categoryFilter);

        const matchesClass =
          classFilter === "all" || student.class_id === classFilter;

        const matchesDivision =
          reportType !== "chest_cards" ||
          chestCardDivisionFilter === "all" ||
          student.division_id === chestCardDivisionFilter;

        const matchesGender =
          genderFilter === "all" ||
          normalizeGender(student.gender) === genderFilter;

        const matchesTeam =
          teamFilter === "all" || student.team_id === teamFilter;

        const matchesProgramme =
          programmeFilter === "all" ||
          studentRegistrations.some(
            (registration) => registration.programme_id === programmeFilter,
          );

        return (
          matchesSearch &&
          matchesCategory &&
          matchesClass &&
          matchesDivision &&
          matchesGender &&
          matchesTeam &&
          matchesProgramme
        );
      })
      .sort((a, b) => chestNumber(a.chest_no) - chestNumber(b.chest_no));
  }, [
    students,
    registrations,
    programmes,
    search,
    categoryFilter,
    classFilter,
    reportType,
    chestCardDivisionFilter,
    genderFilter,
    teamFilter,
    programmeFilter,
    teams,
    classes,
  ]);

  const generalEntryFormStudentIds = useMemo(() => {
    if (reportType !== "registration_sheet" || categoryFilter !== "general") {
      return new Set<string>();
    }

    const eligibleGeneralProgrammeIds = new Set(
      programmes
        .filter((programme) => {
          if (programme.status !== "active" || programme.category_id) return false;

          const matchesGender =
            genderFilter === "all" ||
            programme.gender_scope === "all" ||
            normalizeGender(programme.gender_scope) === genderFilter;

          const matchesProgramme =
            programmeFilter === "all" || programme.id === programmeFilter;

          return matchesGender && matchesProgramme;
        })
        .map((programme) => programme.id),
    );

    const studentIds = new Set<string>();

    registrations.forEach((registration) => {
      if (
        registration.student_id &&
        registration.programme_id &&
        eligibleGeneralProgrammeIds.has(registration.programme_id)
      ) {
        studentIds.add(registration.student_id);
      }
    });

    return studentIds;
  }, [
    reportType,
    categoryFilter,
    programmes,
    registrations,
    genderFilter,
    programmeFilter,
  ]);

  const entryFormDivisionOptions = useMemo(() => {
    const matchingDivisionIds = new Set(
      students
        .filter((student) => {
          const active =
            String(student.status || "").toLowerCase() !== "inactive";

          const matchesCategory =
            categoryFilter === "all" ||
            (categoryFilter === "general"
              ? reportType === "registration_sheet"
                ? generalEntryFormStudentIds.has(student.id)
                : !student.category_id
              : student.category_id === categoryFilter);

          const matchesClass =
            classFilter === "all" || student.class_id === classFilter;

          const matchesGender =
            genderFilter === "all" ||
            normalizeGender(student.gender) === genderFilter;

          const matchesTeam =
            teamFilter === "all" || student.team_id === teamFilter;

          return (
            active &&
            matchesCategory &&
            matchesClass &&
            matchesGender &&
            matchesTeam &&
            Boolean(student.division_id)
          );
        })
        .map((student) => student.division_id)
        .filter(Boolean) as string[],
    );

    return divisions
      .filter(
        (division) =>
          matchingDivisionIds.has(division.id) &&
          (classFilter === "all" || division.class_id === classFilter),
      )
      .sort((a, b) => {
        const classA = classes.find((item) => item.id === a.class_id);
        const classB = classes.find((item) => item.id === b.class_id);
        const categoryAIndex = categories.findIndex(
          (item) => item.id === classA?.category_id,
        );
        const categoryBIndex = categories.findIndex(
          (item) => item.id === classB?.category_id,
        );

        if (categoryAIndex !== categoryBIndex) {
          return categoryAIndex - categoryBIndex;
        }

        if ((classA?.sort_order || 0) !== (classB?.sort_order || 0)) {
          return (classA?.sort_order || 0) - (classB?.sort_order || 0);
        }

        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.name.localeCompare(b.name);
      });
  }, [
    divisions,
    students,
    categories,
    classes,
    categoryFilter,
    classFilter,
    genderFilter,
    teamFilter,
    reportType,
    generalEntryFormStudentIds,
  ]);

  useEffect(() => {
    if (!showEntryFormDivision) {
      if (entryFormDivisionFilter !== "all") {
        setEntryFormDivisionFilter("all");
      }
      return;
    }

    if (
      entryFormDivisionFilter !== "all" &&
      !entryFormDivisionOptions.some(
        (division) => division.id === entryFormDivisionFilter,
      )
    ) {
      setEntryFormDivisionFilter("all");
    }
  }, [
    showEntryFormDivision,
    entryFormDivisionFilter,
    entryFormDivisionOptions,
  ]);

  useEffect(() => {
    if (reportType !== "chest_cards") {
      if (chestCardDivisionFilter !== "all") {
        setChestCardDivisionFilter("all");
      }
      return;
    }

    if (
      chestCardDivisionFilter !== "all" &&
      !entryFormDivisionOptions.some(
        (division) => division.id === chestCardDivisionFilter,
      )
    ) {
      setChestCardDivisionFilter("all");
    }
  }, [reportType, chestCardDivisionFilter, entryFormDivisionOptions]);

  const selectedEntryFormDivisionName =
    entryFormDivisionFilter === "all"
      ? null
      : entryFormDivisionOptions.find(
          (division) => division.id === entryFormDivisionFilter,
        )?.name || null;

  const registrationSheetStudents = useMemo(() => {
    return students
      .filter((student) => {
        const active =
          String(student.status || "").toLowerCase() !== "inactive";

        const matchesCategory =
          categoryFilter === "all" ||
          (categoryFilter === "general"
            ? generalEntryFormStudentIds.has(student.id)
            : student.category_id === categoryFilter);

        const matchesClass =
          classFilter === "all" || student.class_id === classFilter;

        const matchesDivision =
          !showEntryFormDivision ||
          entryFormDivisionFilter === "all" ||
          student.division_id === entryFormDivisionFilter;

        const matchesGender =
          genderFilter === "all" ||
          normalizeGender(student.gender) === genderFilter;

        const matchesTeam =
          teamFilter === "all" || student.team_id === teamFilter;

        const matchesProgramme =
          programmeFilter === "all" ||
          registrations.some(
            (registration) =>
              registration.student_id === student.id &&
              registration.programme_id === programmeFilter,
          );

        return (
          active &&
          matchesCategory &&
          matchesClass &&
          matchesDivision &&
          matchesGender &&
          matchesTeam &&
          matchesProgramme
        );
      })
      .sort((a, b) => {
        const firstChest = chestNumber(a.chest_no);
        const secondChest = chestNumber(b.chest_no);

        if (firstChest !== secondChest) {
          return firstChest - secondChest;
        }

        return a.name.localeCompare(b.name);
      });
  }, [
    students,
    categoryFilter,
    classFilter,
    showEntryFormDivision,
    entryFormDivisionFilter,
    genderFilter,
    teamFilter,
    programmeFilter,
    registrations,
    generalEntryFormStudentIds,
  ]);

  const registrationSheetProgrammes = useMemo(() => {
    return programmes
      .filter((programme) => {
        if (programme.status !== "active") return false;

        const matchesCategory =
          categoryFilter === "all" ||
          (categoryFilter === "general"
            ? !programme.category_id
            : programme.category_id === categoryFilter);

        const matchesGender =
          genderFilter === "all" ||
          programme.gender_scope === "all" ||
          normalizeGender(programme.gender_scope) === genderFilter;

        const matchesProgramme =
          programmeFilter === "all" || programme.id === programmeFilter;

        return matchesCategory && matchesGender && matchesProgramme;
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [programmes, categoryFilter, genderFilter, programmeFilter]);

  const availableProgrammeOptions = useMemo(() => {
    const stageFilterEnabled =
      reportType === "programme_register" ||
      reportType === "green_room" ||
      reportType === "call_list" ||
      reportType === "valuation_sheet";

    return programmes
      .filter((programme) => {
        if (programme.status !== "active") return false;

        const matchesCategory =
          categoryFilter === "all" ||
          (categoryFilter === "general"
            ? !programme.category_id
            : programme.category_id === categoryFilter);

        const matchesGender =
          genderFilter === "all" ||
          programme.gender_scope === "all" ||
          normalizeGender(programme.gender_scope) === genderFilter;

        const matchesStageLocation =
          !stageFilterEnabled ||
          stageLocationFilter === "all" ||
          normalizeStageLocation(programme.stage_type) === stageLocationFilter;

        return matchesCategory && matchesGender && matchesStageLocation;
      })
      .sort((a, b) => {
        if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
        return a.name.localeCompare(b.name);
      });
  }, [
    programmes,
    categoryFilter,
    genderFilter,
    reportType,
    stageLocationFilter,
  ]);

  useEffect(() => {
    if (programmeFilter === "all") return;

    if (!availableProgrammeOptions.some((programme) => programme.id === programmeFilter)) {
      setProgrammeFilter("all");
    }
  }, [programmeFilter, availableProgrammeOptions]);

  const stageLocationOptions = useMemo(() => {
    const values = new Map<string, string>();

    programmes.forEach((programme) => {
      const raw = String(programme.stage_type || "stage").trim();
      const key = normalizeStageLocation(raw);
      if (!values.has(key)) {
        values.set(key, formatStageLocation(raw));
      }
    });

    return Array.from(values, ([value, label]) => ({ value, label })).sort(
      (a, b) => a.label.localeCompare(b.label),
    );
  }, [programmes]);

  const filteredProgrammes = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return programmes
      .filter((programme) => {
        if (programme.status !== "active") return false;

        const matchesSearch =
          reportType !== "programme_register" ||
          !keyword ||
          programme.name.toLowerCase().includes(keyword) ||
          getCategoryName(programme.category_id)
            .toLowerCase()
            .includes(keyword);

        const matchesCategory =
          categoryFilter === "all" ||
          (categoryFilter === "general" && !programme.category_id) ||
          programme.category_id === categoryFilter;

        const matchesProgramme =
          programmeFilter === "all" || programme.id === programmeFilter;

        const matchesGender =
          genderFilter === "all" ||
          programme.gender_scope === "all" ||
          normalizeGender(programme.gender_scope) === genderFilter;

        const stageFilterEnabled =
          reportType === "programme_register" ||
          reportType === "green_room" ||
          reportType === "call_list" ||
          reportType === "valuation_sheet";

        const matchesStageLocation =
          !stageFilterEnabled ||
          stageLocationFilter === "all" ||
          normalizeStageLocation(programme.stage_type) === stageLocationFilter;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesProgramme &&
          matchesGender &&
          matchesStageLocation
        );
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [
    programmes,
    search,
    categoryFilter,
    programmeFilter,
    genderFilter,
    reportType,
    stageLocationFilter,
  ]);

  const participantEntries = useMemo(() => {
    const entries: ParticipantEntry[] = [];

    filteredProgrammes.forEach((programme) => {
      const programmeRegistrations = registrations.filter(
        (item) => item.programme_id === programme.id,
      );

      if (programme.programme_type === "group") {
        const groupMap = new Map<string, Registration[]>();

        programmeRegistrations.forEach((registration) => {
          const key = `${registration.team_id || "team"}-${
            registration.group_name || "group"
          }`;

          if (!groupMap.has(key)) groupMap.set(key, []);
          groupMap.get(key)!.push(registration);
        });

        groupMap.forEach((groupRegistrations, key) => {
          const first = groupRegistrations[0];

          const memberStudents = groupRegistrations
            .map((item) => getStudent(item.student_id))
            .filter(Boolean) as Student[];

          if (!entryMatchesFilters(first, memberStudents)) return;

          const savedCode = getProgrammeCode(first.id);

          entries.push({
            key,
            programmeId: programme.id,
            programmeName: programme.name,
            programmeType: programme.programme_type,
            stageType: programme.stage_type,
            categoryName: getCategoryName(programme.category_id),
            totalMarks: Number(programme.total_marks || 100),
            chestNo: memberStudents
              .map((student) => cleanChest(student.chest_no))
              .filter(Boolean)
              .join(", "),
            participantName: first.group_name || "Group",
            memberNames: memberStudents.map(
              (student) => `#${cleanChest(student.chest_no)} ${student.name}`,
            ),
            className: "-",
            divisionName: "-",
            teamName: getTeamName(first.team_id),
            teamId: first.team_id,
            gender: programme.gender_scope,
            type: "Group",
            registrationId: first.id,
            codeLetter: savedCode?.code_letter || null,
            isPresent: Boolean(savedCode?.is_present),
          });
        });

        return;
      }

      programmeRegistrations.forEach((registration) => {
        const student = getStudent(registration.student_id);
        if (!student) return;
        if (!entryMatchesFilters(registration, [student])) return;

        const savedCode = getProgrammeCode(registration.id);

        entries.push({
          key: registration.id,
          programmeId: programme.id,
          programmeName: programme.name,
          programmeType: programme.programme_type,
          stageType: programme.stage_type,
          categoryName: getCategoryName(programme.category_id),
          totalMarks: Number(programme.total_marks || 100),
          chestNo: cleanChest(student.chest_no),
          participantName: student.name,
          memberNames: [student.name],
          className: getClassName(student.class_id),
          divisionName: getDivisionName(student.division_id),
          teamName: getTeamName(student.team_id || registration.team_id),
          teamId: student.team_id || registration.team_id,
          gender: student.gender,
          type: "Individual",
          registrationId: registration.id,
          codeLetter: savedCode?.code_letter || null,
          isPresent: Boolean(savedCode?.is_present),
        });
      });
    });

    const keyword = search.trim().toLowerCase();

    const visibleEntries = !keyword
      ? entries
      : entries.filter((entry) => {
          return (
            entry.programmeName.toLowerCase().includes(keyword) ||
            entry.participantName.toLowerCase().includes(keyword) ||
            entry.memberNames.some((name) => name.toLowerCase().includes(keyword)) ||
            entry.chestNo.toLowerCase().includes(keyword) ||
            entry.teamName.toLowerCase().includes(keyword) ||
            entry.categoryName.toLowerCase().includes(keyword) ||
            entry.className.toLowerCase().includes(keyword)
          );
        });

    return visibleEntries.sort((a, b) => {
      const firstProgrammeOrder =
        getProgramme(a.programmeId)?.sort_order ?? Number.MAX_SAFE_INTEGER;
      const secondProgrammeOrder =
        getProgramme(b.programmeId)?.sort_order ?? Number.MAX_SAFE_INTEGER;

      if (firstProgrammeOrder !== secondProgrammeOrder) {
        return firstProgrammeOrder - secondProgrammeOrder;
      }

      const programmeCompare = a.programmeName.localeCompare(b.programmeName);
      if (programmeCompare !== 0) return programmeCompare;

      return entryChestNumber(a.chestNo) - entryChestNumber(b.chestNo);
    });
  }, [
    filteredProgrammes,
    registrations,
    students,
    divisions,
    categoryFilter,
    classFilter,
    genderFilter,
    teamFilter,
    programmeCodes,
    search,
  ]);

  const studentProgrammeRows = useMemo<StudentProgrammeRow[]>(() => {
    return filteredStudents
      .map((student) => {
        const assignments = registrations
          .filter((registration) => registration.student_id === student.id)
          .map((registration) => {
            const programme = getProgramme(registration.programme_id);
            if (!programme) return null;

            const matchesCategory =
              categoryFilter === "all" ||
              (categoryFilter === "general"
                ? !programme.category_id
                : programme.category_id === categoryFilter);

            const matchesGender =
              genderFilter === "all" ||
              programme.gender_scope === "all" ||
              normalizeGender(programme.gender_scope) === genderFilter;

            const matchesProgramme =
              programmeFilter === "all" || programme.id === programmeFilter;

            if (!matchesCategory || !matchesGender || !matchesProgramme) return null;

            return {
              programmeId: programme.id,
              programmeName: programme.name,
              programmeType: programme.programme_type,
              stageType: programme.stage_type,
              sortOrder: Number(programme.sort_order || 0),
              groupName: registration.group_name || null,
            } satisfies StudentProgrammeAssignment;
          })
          .filter(Boolean) as StudentProgrammeAssignment[];

        assignments.sort((a, b) => {
          if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
          return a.programmeName.localeCompare(b.programmeName);
        });

        if (assignments.length === 0) return null;

        return {
          student,
          chestNo: cleanChest(student.chest_no),
          studentName: student.name,
          gender: student.gender,
          categoryName: getCategoryName(student.category_id),
          className: getClassName(student.class_id),
          divisionName: getDivisionName(student.division_id),
          teamName: getTeamName(student.team_id),
          programmes: assignments,
        } satisfies StudentProgrammeRow;
      })
      .filter(Boolean) as StudentProgrammeRow[];
  }, [
    filteredStudents,
    registrations,
    programmes,
    categoryFilter,
    genderFilter,
    programmeFilter,
    divisions,
    teams,
    classes,
    categories,
  ]);

  const encouragementGiftRows = useMemo<EncouragementGiftRow[]>(() => {
    const activeRegistrations = registrations.filter((registration) => {
      const status = String(registration.status || "active").toLowerCase();
      return (
        Boolean(registration.student_id) &&
        Boolean(registration.programme_id) &&
        !["cancelled", "inactive", "deleted"].includes(status)
      );
    });

    const winningStudentIds = new Set<string>();
    const absentStudentProgrammeKeys = new Set<string>();

    results
      .filter((result) => result.is_published)
      .forEach((result) => {
        const registration = activeRegistrations.find(
          (item) => item.id === result.registration_id,
        );
        const programme = getProgramme(result.programme_id);

        if (!registration || !programme || !registration.programme_id) return;

        const relatedRegistrations =
          programme.programme_type === "group"
            ? activeRegistrations.filter(
                (item) =>
                  item.programme_id === registration.programme_id &&
                  item.team_id === registration.team_id &&
                  String(item.group_name || "").trim().toLowerCase() ===
                    String(registration.group_name || "").trim().toLowerCase(),
              )
            : [registration];

        const grade = String(result.grade || "").trim().toLowerCase();
        if (grade === "absent") {
          relatedRegistrations.forEach((item) => {
            if (!item.student_id || !item.programme_id) return;
            absentStudentProgrammeKeys.add(
              `${item.student_id}:${item.programme_id}`,
            );
          });
          return;
        }

        if (result.position === 1 || result.position === 2) {
          relatedRegistrations.forEach((item) => {
            if (item.student_id) winningStudentIds.add(item.student_id);
          });
        }
      });

    const programmeIdsByStudent = new Map<string, Set<string>>();

    activeRegistrations.forEach((registration) => {
      if (!registration.student_id || !registration.programme_id) return;
      if (
        absentStudentProgrammeKeys.has(
          `${registration.student_id}:${registration.programme_id}`,
        )
      ) {
        return;
      }

      if (!programmeIdsByStudent.has(registration.student_id)) {
        programmeIdsByStudent.set(registration.student_id, new Set());
      }
      programmeIdsByStudent
        .get(registration.student_id)!
        .add(registration.programme_id);
    });

    const keyword = search.trim().toLowerCase();

    return students
      .filter((student) => {
        if (String(student.status || "").toLowerCase() === "inactive") {
          return false;
        }
        if (winningStudentIds.has(student.id)) return false;

        const participatingProgrammeIds = programmeIdsByStudent.get(student.id);
        if (!participatingProgrammeIds || participatingProgrammeIds.size === 0) {
          return false;
        }

        const matchesCategory =
          categoryFilter === "all" ||
          (categoryFilter === "general"
            ? !student.category_id
            : student.category_id === categoryFilter);
        const matchesClass =
          classFilter === "all" || student.class_id === classFilter;
        const matchesGender =
          genderFilter === "all" ||
          normalizeGender(student.gender) === genderFilter;
        const matchesTeam =
          teamFilter === "all" || student.team_id === teamFilter;
        const matchesProgramme =
          programmeFilter === "all" ||
          participatingProgrammeIds.has(programmeFilter);

        const searchableText = [
          student.name,
          cleanChest(student.chest_no),
          student.admission_no || "",
          getCategoryName(student.category_id),
          getClassName(student.class_id),
          getDivisionName(student.division_id),
          getTeamName(student.team_id),
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch = !keyword || searchableText.includes(keyword);

        return (
          matchesCategory &&
          matchesClass &&
          matchesGender &&
          matchesTeam &&
          matchesProgramme &&
          matchesSearch
        );
      })
      .map((student) => ({
        student,
        chestNo: cleanChest(student.chest_no),
        studentName: student.name,
        gender: student.gender,
        categoryName: getCategoryName(student.category_id),
        className: getClassName(student.class_id),
        divisionName: getDivisionName(student.division_id),
        teamName: getTeamName(student.team_id),
        programmeCount: programmeIdsByStudent.get(student.id)?.size || 0,
      }))
      .sort((a, b) => {
        const chestCompare =
          chestNumber(a.chestNo) - chestNumber(b.chestNo);
        if (chestCompare !== 0) return chestCompare;
        return a.studentName.localeCompare(b.studentName);
      });
  }, [
    registrations,
    results,
    students,
    programmes,
    categories,
    classes,
    divisions,
    teams,
    search,
    categoryFilter,
    classFilter,
    genderFilter,
    teamFilter,
    programmeFilter,
  ]);

  const resultRows = useMemo(() => {
    return results
      .filter((result) => {
        if (!result.is_published) return false;

        if (
          programmeFilter !== "all" &&
          result.programme_id !== programmeFilter
        ) {
          return false;
        }

        const programme = getProgramme(result.programme_id);
        if (!programme) return false;

        if (
          categoryFilter !== "all" &&
          !(categoryFilter === "general" && !programme.category_id) &&
          programme.category_id !== categoryFilter
        ) {
          return false;
        }

        const participant = getResultParticipant(result);
        if (!participant) return false;

        if (teamFilter !== "all" && participant.teamId !== teamFilter)
          return false;

        const registration = registrations.find(
          (item) => item.id === result.registration_id,
        );

        const memberStudents = registration
          ? programme.programme_type === "group"
            ? registrations
                .filter(
                  (item) =>
                    item.programme_id === registration.programme_id &&
                    item.team_id === registration.team_id &&
                    item.group_name === registration.group_name,
                )
                .map((item) => getStudent(item.student_id))
                .filter(Boolean) as Student[]
            : ([getStudent(registration.student_id)].filter(Boolean) as Student[])
          : [];

        if (
          classFilter !== "all" &&
          !memberStudents.some((student) => student.class_id === classFilter)
        ) {
          return false;
        }

        if (
          genderFilter !== "all" &&
          !memberStudents.some(
            (student) => normalizeGender(student.gender) === genderFilter,
          )
        ) {
          return false;
        }

        const keyword = search.trim().toLowerCase();
        if (keyword) {
          const searchValues = [
            programme.name,
            getCategoryName(programme.category_id),
            participant.title,
            participant.subtitle,
            getTeamName(participant.teamId),
            ...memberStudents.map((student) => student.name),
            ...memberStudents.map((student) => cleanChest(student.chest_no)),
          ]
            .join(" ")
            .toLowerCase();

          if (!searchValues.includes(keyword)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const pa = getProgramme(a.programme_id)?.sort_order || 9999;
        const pb = getProgramme(b.programme_id)?.sort_order || 9999;

        if (pa !== pb) return pa - pb;

        return (a.position || 9999) - (b.position || 9999);
      });
  }, [
    results,
    programmeFilter,
    categoryFilter,
    classFilter,
    genderFilter,
    teamFilter,
    search,
    programmes,
    registrations,
    students,
    teams,
    categories,
  ]);

  const teamPoints = useMemo(() => {
    const map = new Map<string, number>();

    results
      .filter((item) => item.is_published)
      .forEach((result) => {
        const registration = registrations.find(
          (item) => item.id === result.registration_id,
        );

        const teamId =
          registration?.team_id || getResultParticipant(result)?.teamId;

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
  }, [results, registrations, teams]);

  const topScorerRows = useMemo<TopScorerRow[]>(() => {
    const map = new Map<string, TopScorerRow>();
    const keyword = search.trim().toLowerCase();

    results
      .filter((item) => item.is_published)
      .forEach((result) => {
        const programme = getProgramme(result.programme_id);
        if (!programme) return;

        const programmeType = String(programme.programme_type || "")
          .trim()
          .toLowerCase();

        // Individual topper should count only individual programmes.
        if (programmeType !== "individual") return;

        if (programmeFilter !== "all" && programme.id !== programmeFilter) return;

        const registration = registrations.find(
          (item) => item.id === result.registration_id,
        );
        if (!registration?.student_id) return;

        const student = getStudent(registration.student_id);
        if (!student) return;

        const points = Number(result.points || 0);
        if (points <= 0) return;

        const matchesSearch =
          !keyword ||
          student.name.toLowerCase().includes(keyword) ||
          String(student.chest_no || "")
            .toLowerCase()
            .includes(keyword) ||
          String(student.admission_no || "")
            .toLowerCase()
            .includes(keyword) ||
          getTeamName(student.team_id || registration.team_id)
            .toLowerCase()
            .includes(keyword) ||
          getCategoryName(student.category_id || programme.category_id)
            .toLowerCase()
            .includes(keyword) ||
          programme.name.toLowerCase().includes(keyword);

        const matchesCategory =
          categoryFilter === "all" ||
          (categoryFilter === "general"
            ? !student.category_id && !programme.category_id
            : student.category_id === categoryFilter ||
              programme.category_id === categoryFilter);

        const matchesClass =
          classFilter === "all" || student.class_id === classFilter;

        const matchesGender =
          genderFilter === "all" ||
          normalizeGender(student.gender) === genderFilter;

        const matchesTeam =
          teamFilter === "all" ||
          student.team_id === teamFilter ||
          registration.team_id === teamFilter;

        if (
          !matchesSearch ||
          !matchesCategory ||
          !matchesClass ||
          !matchesGender ||
          !matchesTeam
        ) {
          return;
        }

        const stageType = String(programme.stage_type || "stage")
          .trim()
          .toLowerCase();

        const isOffStage =
          stageType === "off_stage" ||
          stageType === "off-stage" ||
          stageType === "offstage";

        const existing =
          map.get(student.id) ||
          ({
            rank: 0,
            student,
            chestNo: cleanChest(student.chest_no),
            studentName: student.name,
            gender: student.gender,
            categoryName: getCategoryName(
              student.category_id || programme.category_id,
            ),
            className: getClassName(student.class_id),
            divisionName: getDivisionName(student.division_id),
            teamName: getTeamName(student.team_id || registration.team_id),
            stagePoints: 0,
            offStagePoints: 0,
            totalPoints: 0,
            resultCount: 0,
          } satisfies TopScorerRow);

        existing.totalPoints += points;
        existing.resultCount += 1;

        if (isOffStage) {
          existing.offStagePoints += points;
        } else {
          existing.stagePoints += points;
        }

        map.set(student.id, existing);
      });

    const sorted = Array.from(map.values()).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.stagePoints !== a.stagePoints) return b.stagePoints - a.stagePoints;
      if (b.offStagePoints !== a.offStagePoints) {
        return b.offStagePoints - a.offStagePoints;
      }
      return entryChestNumber(a.chestNo) - entryChestNumber(b.chestNo);
    });

    let lastPoints: number | null = null;
    let currentRank = 0;

    return sorted.map((row) => {
      if (lastPoints === null || row.totalPoints !== lastPoints) {
        currentRank += 1;
        lastPoints = row.totalPoints;
      }

      return {
        ...row,
        rank: currentRank,
      };
    });
  }, [
    results,
    registrations,
    students,
    programmes,
    teams,
    categories,
    classes,
    divisions,
    search,
    programmeFilter,
    categoryFilter,
    classFilter,
    genderFilter,
    teamFilter,
  ]);

  function updateChestTextPosition(
    element: ChestTextElement,
    position: ChestTextPosition,
  ) {
    setChestTextLayout((current) => ({
      ...current,
      [element]: position,
    }));
  }

  function updateChestElementStyle(
    element: ChestTextElement,
    patch: Partial<ChestElementStyle>,
  ) {
    setChestElementStyles((current) => ({
      ...current,
      [element]: {
        ...current[element],
        ...patch,
      },
    }));
  }

  function nudgeChestElement(
    element: ChestTextElement,
    deltaX: number,
    deltaY: number,
  ) {
    setChestTextLayout((current) => {
      const position = current[element] || DEFAULT_CHEST_TEXT_LAYOUT[element];
      return {
        ...current,
        [element]: {
          x: Number((position.x + deltaX).toFixed(2)),
          y: Number((position.y + deltaY).toFixed(2)),
        },
      };
    });
  }

  function resetChestTextPositions() {
    setChestTextLayout(createDefaultChestTextLayout());
  }

  function resetChestCardStudio() {
    setChestTextLayout(createDefaultChestTextLayout());
    setChestElementStyles(createDefaultChestElementStyles());
    setShowChestCardDivision(false);
    setChestLogoSizeMm(8);
    setChestInfoBoxWidthPercent(100);
    setChestInfoBoxPaddingMm(3.8);
    setChestInfoBoxRadiusMm(6);
    setSelectedChestElement("chestNumber");
  }

  useEffect(() => {
    if (reportType !== "chest_cards" || !chestTextDragEnabled) return;

    function handleChestStudioKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = String(target?.tagName || "").toLowerCase();
      const isTyping =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        Boolean(target?.isContentEditable);

      if (isTyping) return;

      const step = event.shiftKey ? 2 : 0.5;
      let deltaX = 0;
      let deltaY = 0;

      if (event.key === "ArrowLeft") deltaX = -step;
      else if (event.key === "ArrowRight") deltaX = step;
      else if (event.key === "ArrowUp") deltaY = -step;
      else if (event.key === "ArrowDown") deltaY = step;
      else return;

      event.preventDefault();
      nudgeChestElement(selectedChestElement, deltaX, deltaY);
    }

    window.addEventListener("keydown", handleChestStudioKeyboard);
    return () => window.removeEventListener("keydown", handleChestStudioKeyboard);
  }, [reportType, chestTextDragEnabled, selectedChestElement]);

  async function loadData(forceRefresh = false) {
    setIsLoading(true);
    setError("");

    const { context, error: contextError } = await getAdminContext({
      forceRefresh,
    });

    if (contextError || !context) {
      setError(contextError || "Unable to load the active event.");
      setIsLoading(false);
      return;
    }

    const activeEvent: EventInfo = {
      id: context.eventId,
      organization_id: context.organizationId,
      title: context.eventTitle,
      venue: context.eventVenue || null,
      start_date: context.eventStartDate || null,
      end_date: context.eventEndDate || null,
      is_public: context.eventIsPublic,
    };

    setOrganization({
      id: context.organizationId,
      name: context.organizationName,
      place: context.organizationPlace || null,
      logo_url:
        (context as any).organizationLogoUrl ||
        (context as any).organizationLogo ||
        (context as any).logoUrl ||
        null,
    });
    setEventInfo(activeEvent);

    try {
      const [
        categoryRes,
        classRes,
        divisionRes,
        teamRes,
        programmeRes,
        allStudents,
        allRegistrations,
        allProgrammeCodes,
        allResults,
      ] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name")
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .order("sort_order", { ascending: true }),

        supabase
          .from("classes")
          .select("id, name, category_id, sort_order")
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("class_divisions")
          .select("id, class_id, name, sort_order")
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),

        supabase
          .from("teams")
          .select("id, name, code")
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .order("sort_order", { ascending: true }),

        supabase
          .from("programmes")
          .select(
            "id, organization_id, event_id, name, programme_type, stage_type, category_id, gender_scope, max_participants_per_team, max_members_per_group, duration_minutes, total_marks, sort_order, status",
          )
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .order("sort_order", { ascending: true }),

        fetchAllRows<Student>((from, to) =>
          supabase
            .from("students")
            .select(
              "id, chest_no, admission_no, name, gender, class_id, division_id, category_id, team_id, guardian_name, phone, status",
            )
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId)
            .order("chest_no_sort", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to),
        ),

        fetchAllRows<Registration>((from, to) =>
          supabase
            .from("programme_registrations")
            .select(
              "id, organization_id, event_id, programme_id, student_id, team_id, group_name, registration_no, status",
            )
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId)
            .eq("status", "registered")
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to),
        ),

        fetchAllRows<ProgrammeCode>((from, to) =>
          supabase
            .from("programme_codes")
            .select(
              "id, organization_id, event_id, programme_id, registration_id, code_letter, is_present",
            )
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId)
            .order("generated_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to),
        ),

        fetchAllRows<ResultItem>((from, to) =>
          supabase
            .from("results")
            .select(
              "id, organization_id, event_id, programme_id, registration_id, total_mark, average_mark, grade, position, points, is_published, published_at",
            )
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(from, to),
        ),
      ]);

      if (categoryRes.error) return stopLoading(categoryRes.error.message);
      if (classRes.error) return stopLoading(classRes.error.message);
      if (divisionRes.error) return stopLoading(divisionRes.error.message);
      if (teamRes.error) return stopLoading(teamRes.error.message);
      if (programmeRes.error) return stopLoading(programmeRes.error.message);

      setCategories((categoryRes.data || []) as Category[]);
      setClasses((classRes.data || []) as ClassItem[]);
      setDivisions((divisionRes.data || []) as DivisionItem[]);
      setTeams((teamRes.data || []) as Team[]);
      setStudents(allStudents);
      setProgrammes((programmeRes.data || []) as Programme[]);
      setRegistrations(allRegistrations);
      setProgrammeCodes(allProgrammeCodes);
      setResults(allResults);
    } catch (loadError: any) {
      return stopLoading(loadError?.message || "Unable to load report data.");
    }

    setIsLoading(false);
  }

  function stopLoading(message: string) {
    setError(message);
    setIsLoading(false);
  }

  function normalizeGender(value: string | null) {
    const text = String(value || "").toLowerCase();

    if (text.includes("female") || text.includes("girl")) return "female";
    if (text.includes("male") || text.includes("boy")) return "male";

    return text || "all";
  }

  function cleanChest(value: string | null) {
    return String(value || "")
      .replace("#", "")
      .trim();
  }

  function chestNumber(value: string | null) {
    const match = String(value || "").match(/\d+/);
    return match ? Number(match[0]) : 999999;
  }

  function getStudent(id: string | null) {
    return students.find((item) => item.id === id) || null;
  }

  function getProgramme(id: string | null) {
    return programmes.find((item) => item.id === id) || null;
  }

  function getTeamName(id: string | null) {
    return teams.find((item) => item.id === id)?.name || "-";
  }

  function getClassName(id: string | null) {
    return classes.find((item) => item.id === id)?.name || "-";
  }

  function getDivisionName(id: string | null) {
    if (!id) return "-";
    return divisions.find((item) => item.id === id)?.name || "-";
  }

  function getCategoryName(id: string | null) {
    if (!id) return "General";
    return categories.find((item) => item.id === id)?.name || "-";
  }

  function getProgrammeCode(registrationId: string | null) {
    if (!registrationId) return null;
    return (
      programmeCodes.find((item) => item.registration_id === registrationId) ||
      null
    );
  }

  function entryMatchesFilters(
    registration: Registration,
    memberStudents: Student[],
  ) {
    const anyStudent = memberStudents[0] || null;

    if (
      teamFilter !== "all" &&
      registration.team_id !== teamFilter &&
      anyStudent?.team_id !== teamFilter
    ) {
      return false;
    }

    if (
      classFilter !== "all" &&
      !memberStudents.some((student) => student.class_id === classFilter)
    ) {
      return false;
    }

    if (
      genderFilter !== "all" &&
      !memberStudents.some(
        (student) => normalizeGender(student.gender) === genderFilter,
      )
    ) {
      return false;
    }

    return true;
  }

  function getResultParticipant(result: ResultItem) {
    const registration = registrations.find(
      (item) => item.id === result.registration_id,
    );
    const programme = getProgramme(result.programme_id);

    if (!registration || !programme) return null;

    if (programme.programme_type === "group") {
      const groupRegistrations = registrations.filter((item) => {
        return (
          item.programme_id === registration.programme_id &&
          item.team_id === registration.team_id &&
          item.group_name === registration.group_name
        );
      });

      const members = groupRegistrations
        .map((item) => getStudent(item.student_id))
        .filter(Boolean) as Student[];

      const classNames = Array.from(
        new Set(
          members
            .map((student) => getClassName(student.class_id))
            .filter((name) => name && name !== "-"),
        ),
      );

      const divisionNames = Array.from(
        new Set(
          members
            .map((student) => getDivisionName(student.division_id))
            .filter((name) => name && name !== "-"),
        ),
      );

      return {
        title: registration.group_name || "Group",
        subtitle: members
          .map((student) => `#${cleanChest(student.chest_no)} ${student.name}`)
          .join(", "),
        className: classNames.join(", ") || "-",
        divisionName: divisionNames.join(", ") || "-",
        teamId: registration.team_id,
        type: "Group",
      };
    }

    const student = getStudent(registration.student_id);

    return {
      title: student
        ? `#${cleanChest(student.chest_no)} ${student.name}`
        : "Student",
      subtitle: student
        ? `${getClassName(student.class_id)} • ${getTeamName(student.team_id)}`
        : "-",
      className: student ? getClassName(student.class_id) : "-",
      divisionName: student ? getDivisionName(student.division_id) : "-",
      teamId: registration.team_id || student?.team_id || null,
      type: "Individual",
    };
  }

  function getPositionLabel(position: number | null) {
    if (position === 1) return "First";
    if (position === 2) return "Second";
    if (position === 3) return "Third";
    if (!position) return "-";
    return `Rank ${position}`;
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatEventDate() {
    if (!eventInfo?.start_date && !eventInfo?.end_date) return "-";

    if (eventInfo.start_date === eventInfo.end_date) {
      return formatDate(eventInfo.start_date);
    }

    return `${formatDate(eventInfo.start_date)} - ${formatDate(eventInfo.end_date)}`;
  }

  async function printReport() {
    const source = document.querySelector<HTMLElement>(".print-area");

    if (!source) {
      window.print();
      return;
    }

    /*
     * Mobile Safari must receive the same fixed desktop page geometry that the
     * FestEazy preview uses. If the report is left as width:100%, iPhone/iPad
     * reflows the table to its own print viewport and a single logical page can
     * become two or more PDF pages.
     */
    document
      .querySelectorAll<HTMLElement>(".print-export-root")
      .forEach((element) => element.remove());

    const clone = source.cloneNode(true) as HTMLElement;
    clone.classList.add("print-export-root");
    clone.setAttribute("aria-hidden", "true");

    // The screen preview itself is scaled. The export clone must use unscaled
    // desktop dimensions, then the complete logical page is scaled as one unit.
    clone.style.transform = "none";
    clone.style.transformOrigin = "top left";
    clone.style.width = "100%";
    clone.style.maxWidth = "none";
    clone.style.minWidth = "0";
    clone.style.minHeight = "0";
    clone.style.height = "auto";
    clone.style.margin = "0";
    clone.style.padding = "0";
    clone.style.overflow = "visible";
    clone.style.border = "0";
    clone.style.borderRadius = "0";
    clone.style.boxShadow = "none";

    // Duplicate ids are invalid and can confuse WebKit while snapshotting.
    clone.querySelectorAll<HTMLElement>("[id]").forEach((element) => {
      element.removeAttribute("id");
    });

    const fixedLogicalPageReport =
      reportType === "green_room" ||
      reportType === "valuation_sheet" ||
      reportType === "common_valuation_sheet" ||
      reportType === "call_list" ||
      reportType === "registration_sheet";

    if (fixedLogicalPageReport) {
      const landscape = reportType === "registration_sheet";

      // Keep the same orientation rules already used on desktop.
      const paperWidthMm = landscape ? 297 : 210;
      const paperHeightMm = landscape ? 210 : 297;
      const pageMarginMm = landscape ? 7 : 9;

      // @page margins reduce the actual CSS page content box. The frame MUST use
      // that printable content size, not the full paper size. Using the full paper
      // width here is what caused the previous iPhone fix to still overflow.
      const printableWidthMm = paperWidthMm - pageMarginMm * 2;
      const printableHeightMm = paperHeightMm - pageMarginMm * 2;

      // These are exactly the desktop preview page dimensions used by
      // ScaledPrintPreview for A4 portrait / landscape.
      const desktopPageWidthPx = landscape ? 1123 : 794;
      const desktopPageHeightPx = landscape ? 794 : 1123;
      const mmToPx = 96 / 25.4;
      const printableWidthPx = printableWidthMm * mmToPx;
      const printableHeightPx = printableHeightMm * mmToPx;

      const sourceSheets = Array.from(
        source.querySelectorAll<HTMLElement>(".programme-sheet"),
      );
      const cloneSheets = Array.from(
        clone.querySelectorAll<HTMLElement>(".programme-sheet"),
      );

      cloneSheets.forEach((sheet, index) => {
        const sourceSheet = sourceSheets[index];

        // The grey 18px separator exists only in the on-screen preview and must
        // not influence the physical page fit calculation.
        const screenSeparator = index > 0 ? 18 : 0;
        const measuredContentHeight = Math.max(
          desktopPageHeightPx,
          Number(sourceSheet?.scrollHeight || 0) - screenSeparator,
        );
        const measuredContentWidth = Math.max(
          desktopPageWidthPx,
          Number(sourceSheet?.scrollWidth || 0),
        );

        const scale = Math.min(
          1,
          printableWidthPx / measuredContentWidth,
          printableHeightPx / measuredContentHeight,
        );
        // Never clip an unexpectedly tall logical page. Programme-wise reports
        // are paginated before printing, but this small lower bound remains as a
        // final safety net for unusually long names/group rows.
        const safeScale = Math.max(0.05, Math.min(1, scale));

        const frame = document.createElement("div");
        frame.className = "print-page-frame";
        frame.style.setProperty(
          "--festeazy-printable-width",
          `${printableWidthMm}mm`,
        );
        frame.style.setProperty(
          "--festeazy-printable-height",
          `${printableHeightMm}mm`,
        );

        sheet.classList.add("print-page-content");
        sheet.style.setProperty(
          "--festeazy-desktop-page-width",
          `${measuredContentWidth}px`,
        );
        sheet.style.setProperty(
          "--festeazy-desktop-page-height",
          `${measuredContentHeight}px`,
        );
        sheet.style.setProperty("--festeazy-page-scale", String(safeScale));

        const parent = sheet.parentNode;
        if (parent) {
          parent.insertBefore(frame, sheet);
          frame.appendChild(sheet);
        }
      });
    }

    document.body.appendChild(clone);
    document.body.classList.add("festeazy-printing");

    const clearPrintingState = () => {
      // Keep the clone mounted because iOS can finish its native print snapshot
      // after afterprint fires. It is hidden by @media screen and removed before
      // the next print request.
      document.body.classList.remove("festeazy-printing");
      window.removeEventListener("afterprint", clearPrintingState);
    };

    window.addEventListener("afterprint", clearPrintingState, { once: true });

    try {
      const images = Array.from(clone.querySelectorAll<HTMLImageElement>("img"));

      await Promise.all(
        images.map((image) => {
          if (image.complete) return Promise.resolve();

          return new Promise<void>((resolve) => {
            const finish = () => resolve();
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
          });
        }),
      );

      if ("fonts" in document) {
        try {
          await (document as any).fonts.ready;
        } catch {
          // Printing can continue even if the FontFaceSet API is unavailable.
        }
      }

      // Let WebKit finish layout of the new fixed page wrappers before opening
      // the native print sheet.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      window.print();
    } catch {
      window.print();
    }
  }

  function csvEscape(value: any) {
    const text = String(value ?? "");

    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  }

  function downloadCsv() {
    const rows = getCsvRows();

    if (rows.length === 0) {
      alert("No data available for CSV.");
      return;
    }

    const headers = Object.keys(rows[0]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => {
        const record = row as Record<string, any>;
        return headers.map((header) => csvEscape(record[header])).join(",");
      }),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${activeReport.title.replace(/\s+/g, "_").toUpperCase()}.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  async function downloadRegistrationSheet() {
    setError("");

    if (registrationSheetMode === "filled" && categoryFilter === "all") {
      setError(
        "Select one category before downloading the filled entry form.",
      );
      return;
    }

    if (
      registrationSheetMode === "filled" &&
      registrationSheetStudents.length === 0
    ) {
      setError("No students were found for the selected category and filters.");
      return;
    }

    setIsRegistrationDownloading(true);

    try {
      const ExcelJSModule = await import("exceljs");
      const ExcelJS = (ExcelJSModule as any).default || ExcelJSModule;
      const workbook = new ExcelJS.Workbook();

      workbook.creator = "Festeazy";
      workbook.company = organization?.name || "Festeazy";
      workbook.created = new Date();

      const selectedCategoryName =
        categoryFilter === "all"
          ? "Blank Registration"
          : getCategoryName(
              categoryFilter === "general" ? null : categoryFilter,
            );

      const safeSheetName = selectedCategoryName
        .replace(/[\\/*?:[\]]/g, "")
        .slice(0, 31);

      const worksheet = workbook.addWorksheet(safeSheetName || "Entry Form", {
        pageSetup: {
          orientation: "landscape",
          paperSize: 9,
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          horizontalCentered: true,
          verticalCentered: false,
          margins: {
            left: 0.2,
            right: 0.2,
            top: 0.3,
            bottom: 0.3,
            header: 0.1,
            footer: 0.1,
          },
        },
        properties: {
          defaultRowHeight: 22,
        },
      });

      const markColumnCount = Math.max(
        1,
        Math.min(40, registrationMarkColumns),
      );
      let fixedColumnCursor = 1;
      const slColumn = fixedColumnCursor++;
      const chestColumn = showEntryFormChestNo ? fixedColumnCursor++ : null;
      const nameColumn = fixedColumnCursor++;
      const contactColumn = fixedColumnCursor++;
      const classColumn = fixedColumnCursor++;
      const divisionColumn = showEntryFormDivision ? fixedColumnCursor++ : null;
      const fixedColumnCount = fixedColumnCursor - 1;
      const firstProgrammeColumnNumber = fixedColumnCount + 1;
      const lastColumnNumber = fixedColumnCount + markColumnCount;

      worksheet.getColumn(slColumn).width = 8;
      if (chestColumn) worksheet.getColumn(chestColumn).width = 11;
      worksheet.getColumn(nameColumn).width = 31;
      worksheet.getColumn(contactColumn).width = 16;
      worksheet.getColumn(classColumn).width = 15;
      if (divisionColumn) worksheet.getColumn(divisionColumn).width = 14;

      for (
        let columnNumber = firstProgrammeColumnNumber;
        columnNumber <= lastColumnNumber;
        columnNumber++
      ) {
        worksheet.getColumn(columnNumber).width = 4.3;
      }

      const headerRow = worksheet.getRow(1);
      headerRow.height = 95;

      worksheet.getCell(1, slColumn).value = "SL. NO";
      if (chestColumn) worksheet.getCell(1, chestColumn).value = "CHEST NO";
      worksheet.getCell(1, nameColumn).value = "NAME";
      worksheet.getCell(1, contactColumn).value = "CONTACT NO";
      worksheet.getCell(1, classColumn).value = "CLASS";
      if (divisionColumn) worksheet.getCell(1, divisionColumn).value = "DIVISION";

      const minimumRows = Math.max(1, Math.min(100, registrationSheetRows));

      const studentsToWrite =
        registrationSheetMode === "filled" ? registrationSheetStudents : [];

      const dataRowCount =
        registrationSheetMode === "filled"
          ? Math.max(minimumRows, studentsToWrite.length)
          : minimumRows;

      for (let dataIndex = 0; dataIndex < dataRowCount; dataIndex++) {
        const excelRowNumber = dataIndex + 2;
        const student =
          registrationSheetMode === "filled"
            ? studentsToWrite[dataIndex]
            : null;

        const row = worksheet.getRow(excelRowNumber);
        row.height = 21;

        worksheet.getCell(excelRowNumber, slColumn).value = student
          ? dataIndex + 1
          : "";
        if (chestColumn) {
          worksheet.getCell(excelRowNumber, chestColumn).value = student
            ? cleanChest(student.chest_no)
            : "";
        }
        worksheet.getCell(excelRowNumber, nameColumn).value = student?.name || "";
        worksheet.getCell(excelRowNumber, contactColumn).value = student?.phone || "";
        worksheet.getCell(excelRowNumber, classColumn).value = student
          ? getClassName(student.class_id)
          : "";

        if (divisionColumn) {
          worksheet.getCell(excelRowNumber, divisionColumn).value = student
            ? getDivisionName(student.division_id)
            : "";
        }
      }

      const lastRowNumber = dataRowCount + 1;

      for (let rowNumber = 1; rowNumber <= lastRowNumber; rowNumber++) {
        for (
          let columnNumber = 1;
          columnNumber <= lastColumnNumber;
          columnNumber++
        ) {
          const cell = worksheet.getCell(rowNumber, columnNumber);

          cell.border = {
            top: { style: "thin", color: { argb: "FF333333" } },
            left: { style: "thin", color: { argb: "FF333333" } },
            bottom: { style: "thin", color: { argb: "FF333333" } },
            right: { style: "thin", color: { argb: "FF333333" } },
          };

          cell.alignment = {
            vertical: "middle",
            horizontal: columnNumber === nameColumn && rowNumber > 1 ? "left" : "center",
            wrapText: true,
          };

          cell.font = {
            name: "Arial",
            size: rowNumber === 1 ? 12 : 10,
            bold: rowNumber === 1,
            color: { argb: "FF111111" },
          };
        }
      }

      for (let rowNumber = 2; rowNumber <= lastRowNumber; rowNumber++) {
        worksheet.getCell(rowNumber, nameColumn).alignment = {
          vertical: "middle",
          horizontal: "left",
          indent: 1,
        };
      }

      worksheet.pageSetup.printTitlesRow = "1:1";
      const lastColumnLetter = worksheet.getColumn(lastColumnNumber).letter;
      worksheet.pageSetup.printArea = `A1:${lastColumnLetter}${lastRowNumber}`;

      worksheet.headerFooter.oddFooter = `&L${organization?.name || "Festeazy"}&CPage &P of &N&R${
        eventInfo?.title || ""
      }`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      const categoryPart =
        categoryFilter === "all"
          ? "all-categories"
          : categoryFilter === "general"
            ? "general"
            : getCategoryName(categoryFilter);

      anchor.href = url;
      anchor.download = `${safeDownloadName(
        organization?.name || "festeazy",
      )}-${safeDownloadName(
        categoryPart,
      )}-${registrationSheetMode}-entry-form.xlsx`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError: any) {
      console.error(downloadError);
      setError(
        downloadError?.message ||
          "Unable to create the entry form Excel sheet.",
      );
    } finally {
      setIsRegistrationDownloading(false);
    }
  }

  function getCsvRows() {
    if (reportType === "registration_sheet") {
      if (registrationSheetMode === "filled") {
        return registrationSheetStudents.map((student, index) => {
          const row: Record<string, string | number> = {
            "SL. NO": index + 1,
          };

          if (showEntryFormChestNo) {
            row["CHEST NO"] = cleanChest(student.chest_no);
          }

          row.NAME = student.name;
          row["CONTACT NO"] = student.phone || "";
          row.CLASS = getClassName(student.class_id);

          if (showEntryFormDivision) {
            row.DIVISION = getDivisionName(student.division_id);
          }

          return row;
        });
      }

      return Array.from({ length: registrationSheetRows }, () => {
        const row: Record<string, string> = {
          "SL. NO": "",
        };

        if (showEntryFormChestNo) {
          row["CHEST NO"] = "";
        }

        row.NAME = "";
        row["CONTACT NO"] = "";
        row.CLASS = "";

        if (showEntryFormDivision) {
          row.DIVISION = "";
        }

        return row;
      });
    }

    if (
      reportType === "chest_cards" ||
      reportType === "chest_list" ||
      reportType === "team_wise"
    ) {
      return filteredStudents.map((student) => ({
        Chest: cleanChest(student.chest_no),
        Name: student.name,
        Gender: formatGenderScope(student.gender),
        Category: getCategoryName(student.category_id),
        Class: getClassName(student.class_id),
        Team: getTeamName(student.team_id),
        Phone: student.phone || "",
      }));
    }

    if (reportType === "valuation_sheet") {
      return groupEntriesByProgramme(participantEntries).flatMap((entries) =>
        entries
          .filter((entry) => entry.codeLetter && entry.isPresent)
          .sort(compareEntriesByCode)
          .map((entry, index) => ({
            No: index + 1,
            Programme: entry.programmeName,
            Category: entry.categoryName,
            Code: entry.codeLetter || "",
            Marks: "",
            Remarks: "",
          })),
      );
    }

    if (reportType === "common_valuation_sheet") {
      return Array.from({ length: 15 }, (_, index) => ({
        No: index + 1,
        Programme: "",
        Category: "",
        Code: "",
        Marks: "",
        Remarks: "",
      }));
    }

    if (reportType === "participant_list") {
      return studentProgrammeRows.map((row, index) => {
        const csvRow: Record<string, string | number> = {
          No: index + 1,
          Chest: row.chestNo,
          Student: row.studentName,
          Gender: formatGenderScope(row.gender),
          Category: row.categoryName,
          Class: row.className,
        };

        if (showParticipantDivision) {
          csvRow.Division = row.divisionName;
        }

        csvRow.Team = row.teamName;
        csvRow["Programme Count"] = row.programmes.length;
        csvRow.Programmes = row.programmes
          .map(
            (programme, programmeIndex) =>
              `${programmeIndex + 1}. ${programme.programmeName} (${formatProgrammeType(
                programme.programmeType,
              )} • ${formatStageType(programme.stageType)})`,
          )
          .join(" | ");

        return csvRow;
      });
    }

    if (reportType === "encouragement_gift") {
      return encouragementGiftRows.map((row, index) => {
        const csvRow: Record<string, string | number> = {
          No: index + 1,
          Chest: row.chestNo,
          Student: row.studentName,
          Gender: formatGenderScope(row.gender),
          Category: row.categoryName,
        };

        if (showResultClass) {
          csvRow.Class = row.className;
        }

        if (showResultDivision) {
          csvRow.Division = row.divisionName;
        }

        csvRow.Team = row.teamName;
        csvRow["Programme Count"] = row.programmeCount;
        csvRow["Gift Given"] = "";
        csvRow.Signature = "";
        return csvRow;
      });
    }

    if (reportType === "green_room" || reportType === "call_list") {
      const exportEntries =
        reportType === "green_room"
          ? groupEntriesByProgramme(participantEntries).flatMap((entries) =>
              [...entries].sort(compareEntriesByCode),
            )
          : participantEntries;

      return exportEntries.map((entry, index) => ({
        No: index + 1,
        Programme: entry.programmeName,
        Category: entry.categoryName,
        Code: entry.codeLetter || "",
        Present: entry.isPresent ? "Yes" : "No",
        Chest: entry.chestNo,
        Participant: entry.participantName,
        Members: entry.memberNames.join(" | "),
        Class: entry.className,
        Team: entry.teamName,
        Type: entry.type,
      }));
    }

    if (reportType === "programme_register") {
      return filteredProgrammes.map((programme, index) => ({
        SL: index + 1,
        PROGRAMME: programme.name,
        CATEGORY: getCategoryName(programme.category_id),
        TYPE: formatProgrammeType(programme.programme_type),
        STAGE: formatStageType(programme.stage_type),
        GENDER: formatGenderScope(programme.gender_scope),
      }));
    }

    if (reportType === "top_scorers") {
      return topScorerRows.map((row) => {
        const csvRow: Record<string, string | number> = {
          Rank: row.rank,
          Chest: row.chestNo,
          Student: row.studentName,
          Gender: formatGenderScope(row.gender),
          Category: row.categoryName,
        };

        if (showResultClass) {
          csvRow.Class = row.className;
        }

        if (showResultDivision) {
          csvRow.Division = row.divisionName;
        }

        csvRow.Team = row.teamName;
        csvRow.StagePoints = row.stagePoints;
        csvRow.OffStagePoints = row.offStagePoints;
        csvRow.TotalPoints = row.totalPoints;
        csvRow.Results = row.resultCount;
        return csvRow;
      });
    }

    if (
      reportType === "winners_list" ||
      reportType === "prize_distribution" ||
      reportType === "result_summary"
    ) {
      return resultRows.map((result, index) => {
        const programme = getProgramme(result.programme_id);
        const participant = getResultParticipant(result);

        const csvRow: Record<string, string | number> = {
          No: index + 1,
          Programme: programme?.name || "-",
          Category: getCategoryName(programme?.category_id || null),
          Position: getPositionLabel(result.position),
          Participant: participant?.title || "-",
        };

        if (showResultClass) {
          csvRow.Class = participant?.className || "-";
        }

        if (showResultDivision) {
          csvRow.Division = participant?.divisionName || "-";
        }

        csvRow.Team = getTeamName(participant?.teamId || null);
        csvRow.Mark = result.total_mark;
        csvRow.Grade = result.grade || "-";
        csvRow.Points = result.points;
        csvRow.Published = result.is_published ? "Yes" : "No";
        return csvRow;
      });
    }

    return [];
  }

  function handleChestBackgroundUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose a PNG, JPG or WebP image.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert("The background image must be smaller than 8 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setChestDesignImage(reader.result);
      setChestDesignName(file.name);
      setChestWallpaper("custom");
    };

    reader.onerror = () => {
      alert("The image could not be read. Please try another file.");
    };

    reader.readAsDataURL(file);
  }

  function removeChestBackgroundImage() {
    setChestDesignImage("");
    setChestDesignName("");
    setChestWallpaper("classic");
  }

  function resetFilters() {
    setSearch("");
    setCategoryFilter("all");
    setClassFilter("all");
    setEntryFormDivisionFilter("all");
    setChestCardDivisionFilter("all");
    setProgrammeFilter("all");
    setGenderFilter("all");
    setTeamFilter("all");
    setStageLocationFilter("all");
  }

  const activeFilterCount = [
    search.trim() ? "search" : "",
    categoryFilter !== "all" ? "category" : "",
    classFilter !== "all" ? "class" : "",
    reportType === "registration_sheet" &&
    showEntryFormDivision &&
    entryFormDivisionFilter !== "all"
      ? "division"
      : "",
    reportType === "chest_cards" && chestCardDivisionFilter !== "all"
      ? "chest-division"
      : "",
    programmeFilter !== "all" ? "programme" : "",
    genderFilter !== "all" ? "gender" : "",
    (reportType === "programme_register" ||
      reportType === "green_room" ||
      reportType === "call_list" ||
      reportType === "valuation_sheet") &&
    stageLocationFilter !== "all"
      ? "stage-location"
      : "",
    reportType !== "programme_register" && teamFilter !== "all" ? "team" : "",
  ].filter(Boolean).length;

  const publishedResultCount = results.filter(
    (item) => item.is_published,
  ).length;

  const activeDataCount = (() => {
    if (reportType === "registration_sheet") {
      return registrationSheetMode === "filled"
        ? registrationSheetStudents.length
        : registrationSheetRows;
    }

    if (
      reportType === "chest_cards" ||
      reportType === "chest_list" ||
      reportType === "team_wise"
    ) {
      return filteredStudents.length;
    }

    if (reportType === "programme_register") {
      return filteredProgrammes.length;
    }

    if (reportType === "participant_list") {
      return studentProgrammeRows.length;
    }

    if (reportType === "green_room" || reportType === "call_list") {
      return participantEntries.length;
    }

    if (reportType === "valuation_sheet") {
      return participantEntries.filter(
        (entry) => entry.codeLetter && entry.isPresent,
      ).length;
    }

    if (reportType === "common_valuation_sheet") {
      return 15;
    }

    if (reportType === "top_scorers") {
      return topScorerRows.length;
    }

    if (reportType === "encouragement_gift") {
      return encouragementGiftRows.length;
    }

    return resultRows.length;
  })();

  const activeDataLabel = (() => {
    if (reportType === "registration_sheet") {
      return registrationSheetMode === "filled" ? "students" : "blank rows";
    }
    if (reportType === "programme_register") return "programmes";
    if (reportType === "participant_list") return "students";
    if (reportType === "top_scorers") return "scorers";
    if (reportType === "encouragement_gift") return "students";
    if (
      reportType === "winners_list" ||
      reportType === "prize_distribution" ||
      reportType === "result_summary"
    ) {
      return "result rows";
    }
    if (reportType === "common_valuation_sheet") return "blank rows";
    return "records";
  })();

  const isStudentProgrammeRegister = reportType === "participant_list";

  const printPageLabel =
    reportType === "chest_cards"
      ? getChestPaperPrintSize(chestPaperFormat)
      : isStudentProgrammeRegister
        ? "A4 portrait"
        : LANDSCAPE_REPORTS.includes(reportType)
          ? "A4 landscape"
          : "A4 portrait";

  // Explicit physical dimensions make the browser print dialog honor the
  // intended orientation reliably. Student Programme Register is always A4 portrait.
  const printPageCssSize =
    reportType === "chest_cards"
      ? getChestPaperPrintSize(chestPaperFormat)
      : isStudentProgrammeRegister
        ? "210mm 297mm"
        : LANDSCAPE_REPORTS.includes(reportType)
          ? "297mm 210mm"
          : "210mm 297mm";

  const printPageMargin =
    reportType === "chest_cards"
      ? "3mm"
      : isStudentProgrammeRegister
        ? "9mm"
        : LANDSCAPE_REPORTS.includes(reportType)
          ? "7mm"
          : "9mm";

  const previewPageFormat: PreviewPageFormat =
    reportType === "chest_cards"
      ? chestPaperFormat
      : isStudentProgrammeRegister
        ? "a4-portrait"
        : LANDSCAPE_REPORTS.includes(reportType)
          ? "a4-landscape"
          : "a4-portrait";

  const searchPlaceholder =
    reportType === "chest_cards" ||
    reportType === "chest_list" ||
    reportType === "team_wise" ||
    reportType === "top_scorers" ||
    reportType === "encouragement_gift"
      ? "Search student, chest number, admission number or team..."
      : reportType === "programme_register"
        ? "Search programme or category..."
        : "Search student, programme, chest number or team...";

  return (
    <AdminShell
      title="Reports"
      subtitle="Create event documents, export data and print professional report packs."
      actions={
        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={isLoading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4"
          >
            <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={downloadCsv}
            disabled={isLoading || activeDataCount === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Download CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>

          <button
            type="button"
            onClick={printReport}
            disabled={isLoading || activeDataCount === 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Print / Save PDF</span>
            <span className="sm:hidden">Print</span>
          </button>
        </div>
      }
    >
      <style jsx global>{`
        /*
         * The export clone must never be visible in the normal UI. It is kept in
         * the DOM after printing so iOS/iPadOS Safari can finish building its
         * native print preview without losing the isolated report.
         */
        .print-export-root {
          display: none !important;
        }

        @media print {
          @page {
            size: ${printPageCssSize};
            margin: ${printPageMargin};
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            -webkit-text-size-adjust: 100% !important;
            text-size-adjust: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /*
           * The real application is hidden while printing. A clean copy of only
           * the report is appended directly to <body> by printReport(). This
           * removes AdminShell/header/sidebar offsets from the printed document.
           */
          /*
           * Do not depend on a transient body class here. Safari on iPhone/iPad
           * can capture the printable document after JavaScript has resumed.
           * Whenever the export clone exists, print ONLY that direct body child.
           */
          body > *:not(.print-export-root) {
            display: none !important;
          }

          body > .print-export-root {
            display: block !important;
          }

          .no-print,
          .report-screen-toolbar {
            display: none !important;
          }

          .print-export-root,
          .print-export-root * {
            visibility: visible !important;
          }

          .print-export-root {
            position: static !important;
            inset: auto !important;
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
            transform-origin: initial !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: white !important;
          }

          .print-export-root.print-area {
            transform: none !important;
          }

          /*
           * iPhone/iPad: one FestEazy logical page = one native print page.
           * The frame size is the @page CONTENT BOX (paper minus the existing
           * desktop margins). The child keeps the desktop preview width and is
           * scaled as a single object, so Safari cannot reflow table columns.
           */
          .print-page-frame {
            position: relative !important;
            display: block !important;
            box-sizing: border-box !important;
            width: var(--festeazy-printable-width) !important;
            min-width: var(--festeazy-printable-width) !important;
            max-width: var(--festeazy-printable-width) !important;
            height: var(--festeazy-printable-height) !important;
            min-height: var(--festeazy-printable-height) !important;
            max-height: var(--festeazy-printable-height) !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
            page-break-before: auto !important;
            break-before: auto !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
          }

          .print-page-frame:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .print-page-frame > .print-page-content {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            box-sizing: border-box !important;
            width: var(--festeazy-desktop-page-width) !important;
            min-width: var(--festeazy-desktop-page-width) !important;
            max-width: var(--festeazy-desktop-page-width) !important;
            min-height: var(--festeazy-desktop-page-height) !important;
            height: auto !important;
            margin: 0 !important;
            transform: scale(var(--festeazy-page-scale, 1)) !important;
            transform-origin: top left !important;
            overflow: visible !important;
            page-break-before: auto !important;
            break-before: auto !important;
            page-break-after: auto !important;
            break-after: auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
          }

          .print-page-frame .overflow-x-auto {
            overflow: visible !important;
          }

          /* Long non-programme reports rely on the browser's normal page flow.
           * Remove horizontal scroll containers in print so columns are never
           * clipped at the right edge. */
          .print-export-root .report-table-scroll,
          .print-export-root .overflow-x-auto {
            overflow-x: visible !important;
            overflow-y: visible !important;
          }

          .print-export-root .report-table-block {
            overflow: visible !important;
          }

          .print-page-frame table {
            max-width: none !important;
          }


          .report-document-header {
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
            break-after: avoid-page !important;
            page-break-after: avoid !important;
          }

          .team-wise-section > h3,
          .student-programme-category > div:first-child {
            break-after: avoid-page !important;
            page-break-after: avoid !important;
          }

          .student-programme-category .overflow-hidden {
            overflow: visible !important;
          }

          .programme-sheet {
            box-sizing: border-box !important;
            width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            page-break-after: always;
            break-after: page;
            page-break-inside: auto;
            break-inside: auto;
          }

          .programme-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          .student-programme-register-root {
            width: 192mm !important;
            max-width: 192mm !important;
            margin: 0 auto !important;
          }

          .student-programme-card {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
          }

          /* A student can have enough programme assignments for one table row
           * to exceed a physical page. Allow only those very tall register rows
           * to continue onto the next page instead of overflowing or disappearing. */
          .student-programme-table .student-programme-row {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .student-register-summary {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }


          .registration-print-page {
            width: 100% !important;
            min-height: 190mm !important;
            height: auto !important;
            padding: 0 !important;
          }

          .registration-print-page .registration-sheet-table {
            width: 100% !important;
            table-layout: fixed !important;
          }

          .chest-print-wrapper {
            padding: 0 !important;
          }

          .chest-card-sheet {
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }

          .chest-card-sheet-a4-portrait {
            width: 204mm !important;
            height: 291mm !important;
            min-height: 291mm !important;
            padding: 1.5mm !important;
          }

          .chest-card-sheet-a4-landscape {
            width: 291mm !important;
            height: 204mm !important;
            min-height: 204mm !important;
            padding: 1.5mm !important;
          }

          .chest-card-sheet-a3-portrait {
            width: 291mm !important;
            height: 414mm !important;
            min-height: 414mm !important;
            padding: 1.5mm !important;
          }

          .chest-card-sheet-a3-landscape {
            width: 414mm !important;
            height: 291mm !important;
            min-height: 291mm !important;
            padding: 1.5mm !important;
          }

          .chest-card-sheet:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .chest-card-grid {
            gap: ${chestCardGapMm}mm !important;
          }

          .festeazy-chest-card {
            page-break-inside: avoid;
            break-inside: avoid;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .print-table {
            font-size: ${
              LANDSCAPE_REPORTS.includes(reportType) ? "9px" : "10.5px"
            } !important;
          }

          .print-small {
            font-size: 9.5px !important;
          }

          thead {
            display: table-header-group !important;
          }

          tfoot {
            display: table-footer-group !important;
          }

          tr,
          td,
          th {
            orphans: 2;
            widows: 2;
          }

          tr {
            page-break-inside: avoid !important;
            break-inside: avoid-page !important;
          }
        }

        @media screen {
          .programme-sheet + .programme-sheet {
            border-top: 18px solid rgb(226 232 240 / 0.75);
          }
        }

        .chest-print-wrapper {
          background: white;
        }

        .chest-card-grid {
          display: grid;
          flex: 1 1 auto;
          min-height: 0;
          gap: 4px;
        }

        @media screen {
          .chest-card-sheet {
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            padding: 12px;
          }

          .chest-card-sheet-a4-portrait {
            width: 794px;
            height: 1123px;
            min-height: 1123px;
          }

          .chest-card-sheet-a4-landscape {
            width: 1123px;
            height: 794px;
            min-height: 794px;
          }

          .chest-card-sheet-a3-portrait {
            width: 1123px;
            height: 1587px;
            min-height: 1587px;
          }

          .chest-card-sheet-a3-landscape {
            width: 1587px;
            height: 1123px;
            min-height: 1123px;
          }
        }

        .chest-draggable-text {
          position: relative;
          z-index: 30;
          border-radius: 4px;
          transition:
            outline-color 120ms ease,
            background-color 120ms ease;
        }

        @media screen {
          .chest-draggable-text:hover {
            outline: 2px dashed rgb(124 58 237 / 0.75);
            outline-offset: 2px;
            background-color: rgb(255 255 255 / 0.2);
          }

          .chest-draggable-text:active {
            outline: 2px solid rgb(124 58 237 / 0.9);
          }

          .chest-draggable-selected {
            outline: 2px solid rgb(124 58 237 / 0.92) !important;
            outline-offset: 2px;
            background-color: rgb(237 233 254 / 0.24);
          }
        }

        @media print {
          .chest-draggable-text,
          .chest-draggable-selected {
            outline: none !important;
          }
        }

        .festeazy-chest-card {
          position: relative;
          overflow: hidden;
          border: 2px solid #111827;
          border-radius: 0;
          background:
            radial-gradient(
              circle at top left,
              rgba(124, 58, 237, 0.16),
              transparent 34%
            ),
            radial-gradient(
              circle at bottom right,
              rgba(249, 115, 22, 0.14),
              transparent 32%
            ),
            linear-gradient(135deg, #ffffff 0%, #faf7ff 46%, #fff7ed 100%);
        }

        .festeazy-chest-card::before {
          content: "";
          position: absolute;
          left: -18%;
          top: -36%;
          width: 70%;
          height: 88%;
          border-radius: 999px;
          background: linear-gradient(
            135deg,
            rgba(124, 58, 237, 0.22),
            rgba(6, 182, 212, 0.1)
          );
          transform: rotate(-20deg);
        }

        .festeazy-chest-card::after {
          content: "";
          position: absolute;
          right: -20%;
          bottom: -44%;
          width: 74%;
          height: 86%;
          border-radius: 999px;
          background: linear-gradient(
            135deg,
            rgba(249, 115, 22, 0.2),
            rgba(124, 58, 237, 0.08)
          );
          transform: rotate(-16deg);
        }

        .festeazy-chest-card.custom-chest-background::before,
        .festeazy-chest-card.custom-chest-background::after {
          display: none;
        }

        .chest-cut-line {
          border-top: 1px dashed rgba(15, 23, 42, 0.28);
        }

        .select-input {
          height: 52px;
          width: 100%;
          border-radius: 0.9rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0 0.9rem;
          font-size: 0.875rem;
          font-weight: 800;
          outline: none;
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        .select-input:focus {
          border-color: rgb(167 139 250);
          box-shadow: 0 0 0 4px rgb(237 233 254);
        }
      `}</style>

      <div className="reports-page-root w-full max-w-full space-y-5 overflow-hidden">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 no-print xl:grid-cols-4">
          <DashboardMetric
            icon="📄"
            label="Selected Report"
            value={activeReport.title}
            compact
          />
          <DashboardMetric
            icon="🔎"
            label="Matching Data"
            value={`${activeDataCount} ${activeDataLabel}`}
            compact
          />
          <DashboardMetric icon="👥" label="Students" value={students.length} />
          <DashboardMetric
            icon="🏆"
            label="Published Results"
            value={publishedResultCount}
          />
        </div>

        <div className="no-print xl:hidden">
          <MobileReportPicker
            reportType={reportType}
            onChange={(next) => {
              setReportType(next);
              setShowFilters(false);
            }}
          />
        </div>

        <div className="reports-layout grid min-w-0 gap-5 xl:grid-cols-[318px_minmax(0,1fr)]">
          <aside className="hidden self-start xl:sticky xl:top-24 xl:block no-print">
            <ReportLibrary reportType={reportType} onChange={setReportType} />
          </aside>

          <main className="reports-main min-w-0 space-y-5">
            <section className="relative z-40 overflow-visible rounded-[1.7rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 no-print">
              <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
                      Active Report
                    </span>
                    <span className="text-xs font-black text-slate-400">
                      {activeDataCount} {activeDataLabel}
                    </span>
                  </div>
                  <h2 className="mt-2 text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
                    {activeReport.title}
                  </h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {activeReport.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                    >
                      <RotateCcw size={14} />
                      Reset {activeFilterCount}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowFilters((value) => !value)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-black text-white lg:hidden"
                  >
                    <SlidersHorizontal size={15} />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-950">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <div
                className={`${showFilters ? "block" : "hidden"} relative z-50 px-4 py-4 sm:px-5 lg:block`}
              >
                <div className="relative z-50 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <div className="relative md:col-span-2 xl:col-span-3">
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      size={18}
                    />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={searchPlaceholder}
                      className="h-[52px] w-full rounded-[0.9rem] border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                  </div>

                  <SelectBox label="Category">
                    <select
                      value={categoryFilter}
                      onChange={(event) => {
                        setCategoryFilter(event.target.value);
                        setClassFilter("all");
                        setEntryFormDivisionFilter("all");
                        setChestCardDivisionFilter("all");
                      }}
                      className="select-input"
                    >
                      {reportType !== "registration_sheet" && (
                        <option value="all">All Categories</option>
                      )}
                      <option value="general">General</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </SelectBox>

                  <SelectBox label="Class">
                    <select
                      value={classFilter}
                      onChange={(event) => {
                        setClassFilter(event.target.value);
                        setEntryFormDivisionFilter("all");
                        setChestCardDivisionFilter("all");
                      }}
                      disabled={
                        categoryFilter === "all" || categoryFilter === "general"
                      }
                      className="select-input disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="all">
                        {categoryFilter === "all"
                          ? "Select a category first"
                          : categoryFilter === "general"
                            ? "No classes for General"
                            : "All Classes"}
                      </option>
                      {availableClassOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </SelectBox>

                  {reportType === "registration_sheet" &&
                    showEntryFormDivision && (
                      <SelectBox label="Division">
                        <select
                          value={entryFormDivisionFilter}
                          onChange={(event) =>
                            setEntryFormDivisionFilter(event.target.value)
                          }
                          disabled={entryFormDivisionOptions.length === 0}
                          className="select-input disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                          <option value="all">All Divisions</option>
                          {entryFormDivisionOptions.map((division) => (
                            <option key={division.id} value={division.id}>
                              {division.name}
                            </option>
                          ))}
                        </select>
                        <p className="mt-2 text-[11px] font-bold leading-4 text-slate-400">
                          Choose one division or keep All Divisions. Filled forms
                          start each division on a separate page.
                        </p>
                      </SelectBox>
                    )}

                  {reportType === "chest_cards" && (
                    <SelectBox label="Division (Optional)">
                      <select
                        value={chestCardDivisionFilter}
                        onChange={(event) =>
                          setChestCardDivisionFilter(event.target.value)
                        }
                        disabled={entryFormDivisionOptions.length === 0}
                        className="select-input disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="all">All Divisions</option>
                        {entryFormDivisionOptions.map((division) => (
                          <option key={division.id} value={division.id}>
                            {categoryFilter === "all"
                              ? `${getCategoryName(
                                  classes.find((item) => item.id === division.class_id)
                                    ?.category_id || null,
                                )} - ${getClassName(division.class_id)} - ${division.name}`
                              : classFilter === "all"
                                ? `${getClassName(division.class_id)} - ${division.name}`
                                : division.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-2 text-[11px] font-bold leading-4 text-slate-400">
                        Optional filter for printing one class division at a time.
                      </p>
                    </SelectBox>
                  )}

                  <div className="relative z-[70]">
                    <SelectBox label="Programme">
                    <SearchableProgrammeSelect
                      value={programmeFilter}
                      onChange={setProgrammeFilter}
                      options={[
                        { id: "all", name: "All Programmes" },
                        ...availableProgrammeOptions.map((programme) => ({
                          id: programme.id,
                          name: programme.name,
                          sort_order: programme.sort_order,
                          categoryName: getCategoryName(programme.category_id),
                          programmeType: formatProgrammeType(
                            programme.programme_type,
                          ),
                          stageType: formatStageType(programme.stage_type),
                          genderScope: formatGenderScope(
                            programme.gender_scope,
                          ),
                        })),
                      ]}
                      placeholder="Search or select programme..."
                      emptyText="No programmes found"
                    />
                    </SelectBox>
                  </div>

                  <SelectBox label="Gender">
                    <select
                      value={genderFilter}
                      onChange={(event) => setGenderFilter(event.target.value)}
                      className="select-input"
                    >
                      <option value="all">All Genders</option>
                      <option value="male">Boys</option>
                      <option value="female">Girls</option>
                    </select>
                  </SelectBox>

                  {reportType !== "programme_register" && (
                    <SelectBox label="Team / House">
                      <select
                        value={teamFilter}
                        onChange={(event) => setTeamFilter(event.target.value)}
                        className="select-input"
                      >
                        <option value="all">All Teams</option>
                        {teams.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </SelectBox>
                  )}

                  {reportType === "programme_register" && (
                    <SelectBox label="Stage / Location">
                      <select
                        value={stageLocationFilter}
                        onChange={(event) =>
                          setStageLocationFilter(event.target.value)
                        }
                        className="select-input"
                      >
                        <option value="all">All Stage / Locations</option>
                        {stageLocationOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </SelectBox>
                  )}

                  {(reportType === "green_room" ||
                    reportType === "call_list" ||
                    reportType === "valuation_sheet") && (
                    <SelectBox label="Stage / Off-stage">
                      <select
                        value={stageLocationFilter}
                        onChange={(event) =>
                          setStageLocationFilter(event.target.value)
                        }
                        className="select-input"
                      >
                        <option value="all">All Stage Types</option>
                        {stageLocationOptions.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </SelectBox>
                  )}

                  {reportType === "registration_sheet" && (
                    <>
                      <SelectBox label="Sheet Type">
                        <select
                          value={registrationSheetMode}
                          onChange={(event) =>
                            setRegistrationSheetMode(
                              event.target.value as RegistrationSheetMode,
                            )
                          }
                          className="select-input"
                        >
                          <option value="blank">
                            Blank Entry Form
                          </option>
                          <option value="filled">Filled Entry Form</option>
                        </select>
                      </SelectBox>

                      <SelectBox label="Rows">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={registrationSheetRows}
                          onChange={(event) =>
                            setRegistrationSheetRows(
                              Math.max(
                                1,
                                Math.min(100, Number(event.target.value || 1)),
                              ),
                            )
                          }
                          className="select-input"
                        />
                      </SelectBox>

                      <SelectBox label="Programme Columns">
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={registrationMarkColumns}
                          onChange={(event) =>
                            setRegistrationMarkColumns(
                              Math.max(
                                1,
                                Math.min(30, Number(event.target.value || 1)),
                              ),
                            )
                          }
                          className="select-input"
                        />
                        <p className="mt-2 text-[11px] font-bold leading-4 text-slate-400">
                          Assigned programmes always appear. Extra columns stay
                          blank for handwritten additions. Fewer columns automatically
                          print with larger, easier-to-read text. Maximum custom value: 30.
                        </p>
                      </SelectBox>

                      <div className="md:col-span-2 xl:col-span-3">
                        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4">
                          <div>
                            <p className="text-sm font-black text-slate-950">
                              Entry Form Columns
                            </p>
                            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                              Choose the optional student details that should appear
                              before the programme columns. Division support remains
                              available for organizations that use class divisions.
                            </p>
                          </div>

                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-sm">
                              <input
                                type="checkbox"
                                checked={showEntryFormChestNo}
                                onChange={(event) =>
                                  setShowEntryFormChestNo(event.target.checked)
                                }
                                className="h-5 w-5 accent-violet-600"
                              />
                              Show Chest No column
                            </label>

                            <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-sm">
                              <input
                                type="checkbox"
                                checked={showEntryFormDivision}
                                onChange={(event) => {
                                  setShowEntryFormDivision(event.target.checked);
                                  if (!event.target.checked) {
                                    setEntryFormDivisionFilter("all");
                                  }
                                }}
                                className="h-5 w-5 accent-violet-600"
                              />
                              Show Division column
                            </label>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {reportType === "chest_cards" && (
                    <SelectBox label="Paper & Orientation">
                      <select
                        value={chestPaperFormat}
                        onChange={(event) =>
                          setChestPaperFormat(
                            event.target.value as ChestPaperFormat,
                          )
                        }
                        className="select-input"
                      >
                        <option value="a3-landscape">A3 Landscape</option>
                        <option value="a3-portrait">A3 Portrait</option>
                        <option value="a4-landscape">A4 Landscape</option>
                        <option value="a4-portrait">A4 Portrait</option>
                      </select>
                    </SelectBox>
                  )}

                  {reportType === "chest_cards" && (
                    <div className="md:col-span-2 xl:col-span-3">
                      <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-black text-slate-950">
                              Chest Card Studio
                            </p>
                            <p className="mt-1 max-w-3xl text-xs font-bold leading-5 text-slate-500">
                              Select an element, drag it on the preview, and style each text independently.
                              When Drag is enabled, use the keyboard arrow keys for fine movement.
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex h-11 cursor-pointer items-center gap-3 rounded-xl border border-violet-200 bg-white px-4 text-sm font-black text-violet-700 shadow-sm">
                              <input
                                type="checkbox"
                                checked={chestTextDragEnabled}
                                onChange={(event) =>
                                  setChestTextDragEnabled(event.target.checked)
                                }
                                className="h-5 w-5 accent-violet-600"
                              />
                              Enable Drag
                            </label>

                            <button
                              type="button"
                              onClick={resetChestCardStudio}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                              <RotateCcw size={15} />
                              Reset Studio
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                          {(Object.keys(CHEST_ELEMENT_LABELS) as ChestTextElement[]).map((element) => {
                            const style = chestElementStyles[element];
                            const checked =
                              element === "division"
                                ? showChestCardDivision && style.visible
                                : style.visible;

                            return (
                              <div
                                key={element}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                                  selectedChestElement === element
                                    ? "border-violet-300 bg-violet-100 text-violet-800"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-violet-200"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    const nextVisible = event.target.checked;
                                    if (element === "division") {
                                      setShowChestCardDivision(nextVisible);
                                    }
                                    updateChestElementStyle(element, { visible: nextVisible });
                                    setSelectedChestElement(element);
                                  }}
                                  className="h-4 w-4 shrink-0 cursor-pointer accent-violet-600"
                                  aria-label={`Show ${CHEST_ELEMENT_LABELS[element]}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setSelectedChestElement(element)}
                                  className="min-w-0 flex-1 truncate text-left text-xs font-black"
                                  title={CHEST_ELEMENT_LABELS[element]}
                                >
                                  {CHEST_ELEMENT_LABELS[element]}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 rounded-2xl border border-violet-200 bg-white p-4">
                          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                                Editing
                              </p>
                              <h3 className="mt-1 text-lg font-black text-slate-950">
                                {CHEST_ELEMENT_LABELS[selectedChestElement]}
                              </h3>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                updateChestTextPosition(selectedChestElement, { x: 0, y: 0 })
                              }
                              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 transition hover:bg-violet-50 hover:text-violet-700"
                            >
                              Reset Position
                            </button>
                          </div>

                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div>
                              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                Position
                              </label>
                              <div className="grid grid-cols-2 gap-2">
                                <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                  <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">X mm</span>
                                  <input
                                    type="number"
                                    step="0.25"
                                    value={chestTextLayout[selectedChestElement].x}
                                    onChange={(event) =>
                                      updateChestTextPosition(selectedChestElement, {
                                        ...chestTextLayout[selectedChestElement],
                                        x: Number(event.target.value || 0),
                                      })
                                    }
                                    className="mt-1 w-full bg-transparent text-sm font-black text-slate-800 outline-none"
                                  />
                                </label>
                                <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                  <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Y mm</span>
                                  <input
                                    type="number"
                                    step="0.25"
                                    value={chestTextLayout[selectedChestElement].y}
                                    onChange={(event) =>
                                      updateChestTextPosition(selectedChestElement, {
                                        ...chestTextLayout[selectedChestElement],
                                        y: Number(event.target.value || 0),
                                      })
                                    }
                                    className="mt-1 w-full bg-transparent text-sm font-black text-slate-800 outline-none"
                                  />
                                </label>
                              </div>

                              <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/70 px-3 py-2.5 text-[11px] font-bold leading-5 text-violet-700">
                                Keyboard: Arrow keys move 0.5 mm. Hold Shift + Arrow to move 2 mm.
                                Keyboard movement works while Enable Drag is on and you are not typing in a field.
                              </div>
                            </div>

                            <div>
                              {CHEST_TEXT_ELEMENTS.includes(selectedChestElement) ? (
                                <div className="space-y-3">
                                  <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                      Text Appearance
                                    </label>
                                    <FontFamilySelect
                                      value={chestElementStyles[selectedChestElement].fontFamily}
                                      onChange={(value) =>
                                        updateChestElementStyle(selectedChestElement, { fontFamily: value })
                                      }
                                      ariaLabel={`${CHEST_ELEMENT_LABELS[selectedChestElement]} font family`}
                                      className="select-input"
                                    />
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                      <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Font Size</span>
                                      <div className="mt-1 flex items-center gap-1">
                                        <input
                                          type="number"
                                          min="40"
                                          max="220"
                                          step="5"
                                          value={chestElementStyles[selectedChestElement].fontScale}
                                          onChange={(event) =>
                                            updateChestElementStyle(selectedChestElement, {
                                              fontScale: Math.max(40, Math.min(220, Number(event.target.value || 100))),
                                            })
                                          }
                                          className="w-full bg-transparent text-sm font-black text-slate-800 outline-none"
                                        />
                                        <span className="text-xs font-black text-slate-400">%</span>
                                      </div>
                                    </label>

                                    <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                      <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Weight</span>
                                      <select
                                        value={chestElementStyles[selectedChestElement].fontWeight}
                                        onChange={(event) =>
                                          updateChestElementStyle(selectedChestElement, {
                                            fontWeight: Number(event.target.value),
                                          })
                                        }
                                        className="mt-1 w-full bg-transparent text-sm font-black text-slate-800 outline-none"
                                      >
                                        <option value={400}>Regular</option>
                                        <option value={500}>Medium</option>
                                        <option value={600}>Semi Bold</option>
                                        <option value={700}>Bold</option>
                                        <option value={800}>Extra Bold</option>
                                        <option value={900}>Black</option>
                                      </select>
                                    </label>
                                  </div>

                                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <input
                                      type="color"
                                      value={chestElementStyles[selectedChestElement].color}
                                      onChange={(event) =>
                                        updateChestElementStyle(selectedChestElement, {
                                          color: event.target.value,
                                        })
                                      }
                                      className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                                    />
                                    <span className="text-xs font-black text-slate-600">Text Color</span>
                                  </label>

                                  <p
                                    className="truncate rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm font-bold text-slate-500"
                                    style={{ fontFamily: chestElementStyles[selectedChestElement].fontFamily }}
                                  >
                                    Font preview · FestEazy 123
                                  </p>
                                </div>
                              ) : selectedChestElement === "logo" ? (
                                <div>
                                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                    Logo Size
                                  </label>
                                  <label className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                    <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Size mm</span>
                                    <input
                                      type="number"
                                      min="3"
                                      max="30"
                                      step="0.5"
                                      value={chestLogoSizeMm}
                                      onChange={(event) =>
                                        setChestLogoSizeMm(
                                          Math.max(3, Math.min(30, Number(event.target.value || 8))),
                                        )
                                      }
                                      className="mt-1 w-full bg-transparent text-sm font-black text-slate-800 outline-none"
                                    />
                                  </label>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                                    Details Box
                                  </label>
                                  <label className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Box Width</span>
                                    <div className="mt-1 flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="40"
                                        max="100"
                                        step="1"
                                        value={chestInfoBoxWidthPercent}
                                        onChange={(event) =>
                                          setChestInfoBoxWidthPercent(
                                            Math.max(40, Math.min(100, Number(event.target.value || 100))),
                                          )
                                        }
                                        className="w-full bg-transparent text-sm font-black text-slate-800 outline-none"
                                      />
                                      <span className="text-xs font-black text-slate-400">%</span>
                                    </div>
                                  </label>

                                  <div className="grid grid-cols-2 gap-2">
                                    <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                      <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Padding mm</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="12"
                                        step="0.25"
                                        value={chestInfoBoxPaddingMm}
                                        onChange={(event) =>
                                          setChestInfoBoxPaddingMm(
                                            Math.max(0, Math.min(12, Number(event.target.value || 0))),
                                          )
                                        }
                                        className="mt-1 w-full bg-transparent text-sm font-black text-slate-800 outline-none"
                                      />
                                    </label>
                                    <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                      <span className="block text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Radius mm</span>
                                      <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        step="0.5"
                                        value={chestInfoBoxRadiusMm}
                                        onChange={(event) =>
                                          setChestInfoBoxRadiusMm(
                                            Math.max(0, Math.min(20, Number(event.target.value || 0))),
                                          )
                                        }
                                        className="mt-1 w-full bg-transparent text-sm font-black text-slate-800 outline-none"
                                      />
                                    </label>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {reportType === "chest_cards" && (
                    <div className="md:col-span-2 xl:col-span-2">
                      <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Exact Card Dimensions
                      </label>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <DimensionInput
                            label="Width"
                            value={chestCardWidthMm}
                            min={45}
                            max={Math.floor(chestCardLayout.maxWidthMm)}
                            step={1}
                            onChange={setChestCardWidthMm}
                          />

                          <DimensionInput
                            label="Height"
                            value={chestCardHeightMm}
                            min={40}
                            max={Math.floor(chestCardLayout.maxHeightMm)}
                            step={1}
                            onChange={setChestCardHeightMm}
                          />

                          <DimensionInput
                            label="Gap"
                            value={chestCardGapMm}
                            min={0}
                            max={5}
                            step={0.1}
                            onChange={setChestCardGapMm}
                          />
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {[
                            { label: "Compact", width: 78, height: 65 },
                            { label: "Standard", width: 94, height: 86 },
                            { label: "Large", width: 105, height: 95 },
                          ].map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setChestCardWidthMm(
                                  Math.min(
                                    preset.width,
                                    chestCardLayout.maxWidthMm,
                                  ),
                                );
                                setChestCardHeightMm(
                                  Math.min(
                                    preset.height,
                                    chestCardLayout.maxHeightMm,
                                  ),
                                );
                              }}
                              className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-black text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                            >
                              {preset.label}
                              <span className="mt-0.5 block text-[9px] font-bold text-slate-400">
                                {preset.width} × {preset.height} mm
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 rounded-xl border border-violet-100 bg-white px-3 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-black text-slate-900">
                                {chestCardLayout.columns} columns ×{" "}
                                {chestCardLayout.rows} rows
                              </p>
                              <p className="mt-0.5 text-xs font-bold text-slate-500">
                                {chestCardLayout.perPage} cards per{" "}
                                {getChestPaperLabel(chestPaperFormat)} sheet
                              </p>
                            </div>

                            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 ring-1 ring-violet-200">
                              {Math.max(
                                1,
                                Math.ceil(
                                  filteredStudents.length /
                                    chestCardLayout.perPage,
                                ),
                              )}{" "}
                              page
                              {Math.max(
                                1,
                                Math.ceil(
                                  filteredStudents.length /
                                    chestCardLayout.perPage,
                                ),
                              ) === 1
                                ? ""
                                : "s"}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500">
                            <span className="rounded-lg bg-slate-50 px-2.5 py-2">
                              Printable area:{" "}
                              {Math.round(chestCardLayout.maxWidthMm)} ×{" "}
                              {Math.round(chestCardLayout.maxHeightMm)} mm
                            </span>
                            <span className="rounded-lg bg-slate-50 px-2.5 py-2">
                              Card: {chestCardLayout.cardWidthMm} ×{" "}
                              {chestCardLayout.cardHeightMm} mm
                            </span>
                          </div>
                        </div>

                        <p className="mt-2 text-[11px] font-bold leading-4 text-slate-400">
                          Enter any width and height that fit the selected
                          paper. FestEazy automatically calculates the columns,
                          rows and cards per page without overlap.
                        </p>
                      </div>
                    </div>
                  )}

                  {RESULT_DETAIL_REPORTS.includes(reportType) && (
                    <div className="md:col-span-2 xl:col-span-3">
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            Result Report Columns
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                            Choose whether Class and Division should appear in this result report, print/PDF preview and CSV export.
                          </p>
                          {reportType === "encouragement_gift" && (
                            <p className="mt-2 text-[11px] font-bold leading-5 text-amber-700">
                              Encouragement Gift keeps one row per eligible student. Published First or Second place winners are excluded; Third-place students remain eligible.
                            </p>
                          )}
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-black text-emerald-700 shadow-sm">
                            <input
                              type="checkbox"
                              checked={showResultClass}
                              onChange={(event) =>
                                setShowResultClass(event.target.checked)
                              }
                              className="h-5 w-5 accent-emerald-600"
                            />
                            Show Class column
                          </label>

                          <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-black text-emerald-700 shadow-sm">
                            <input
                              type="checkbox"
                              checked={showResultDivision}
                              onChange={(event) =>
                                setShowResultDivision(event.target.checked)
                              }
                              className="h-5 w-5 accent-emerald-600"
                            />
                            Show Division column
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {reportType === "participant_list" && (
                    <div className="md:col-span-2 xl:col-span-3">
                      <div className="flex flex-col gap-3 rounded-2xl border border-violet-200 bg-violet-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            Student Programme Register Options
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                            Print one student at a time with all assigned programmes.
                            Keep Division enabled for organizations that use class divisions.
                          </p>
                        </div>

                        <label className="inline-flex cursor-pointer items-center gap-3 rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-sm">
                          <input
                            type="checkbox"
                            checked={showParticipantDivision}
                            onChange={(event) =>
                              setShowParticipantDivision(event.target.checked)
                            }
                            className="h-5 w-5 accent-violet-600"
                          />
                          Show Division column
                        </label>
                      </div>
                    </div>
                  )}

                  {reportType !== "chest_cards" && (
                    <SelectBox label="Table Spacing">
                      <select
                        value={compactMode ? "compact" : "standard"}
                        onChange={(event) =>
                          setCompactMode(event.target.value === "compact")
                        }
                        className="select-input"
                      >
                        <option value="standard">
                          Standard — easier to read
                        </option>
                        <option value="compact">
                          Compact — more rows per page
                        </option>
                      </select>
                      <p className="mt-2 text-[11px] font-bold leading-4 text-slate-400">
                        Compact only reduces table row height while printing. It
                        does not remove any data.
                      </p>
                    </SelectBox>
                  )}

                  {reportType === "chest_cards" && (
                    <div className="md:col-span-2 xl:col-span-3">
                      <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50/80">
                        <div className="flex flex-col gap-2 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                              <Palette size={20} />
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-slate-950">
                                Chest Card Background
                              </h3>
                              <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                                Choose FestEazy Classic, Warm Sunrise, create
                                your own gradient, or upload an image.
                              </p>
                            </div>
                          </div>

                          <span className="w-fit rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-violet-700 ring-1 ring-violet-200">
                            Print background
                          </span>
                        </div>

                        <div className="p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                            Background Style
                          </p>

                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {CHEST_WALLPAPERS.map((wallpaper) => {
                              const selected = chestWallpaper === wallpaper.id;

                              return (
                                <button
                                  key={wallpaper.id}
                                  type="button"
                                  onClick={() =>
                                    setChestWallpaper(wallpaper.id)
                                  }
                                  className={`group overflow-hidden rounded-xl border bg-white text-left transition ${
                                    selected
                                      ? "border-violet-500 ring-4 ring-violet-100"
                                      : "border-slate-200 hover:border-violet-300"
                                  }`}
                                >
                                  <div
                                    className="relative h-20"
                                    style={{
                                      backgroundImage: wallpaper.background,
                                    }}
                                  >
                                    {selected && (
                                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg">
                                        <Check size={14} strokeWidth={3} />
                                      </span>
                                    )}
                                  </div>
                                  <div className="px-3 py-2.5">
                                    <p className="truncate text-xs font-black text-slate-800">
                                      {wallpaper.name}
                                    </p>
                                    <p className="mt-0.5 line-clamp-2 text-[10px] font-bold leading-4 text-slate-400">
                                      {wallpaper.description}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}

                            <button
                              type="button"
                              onClick={() => setChestWallpaper("gradient")}
                              className={`group overflow-hidden rounded-xl border bg-white text-left transition ${
                                chestWallpaper === "gradient"
                                  ? "border-violet-500 ring-4 ring-violet-100"
                                  : "border-slate-200 hover:border-violet-300"
                              }`}
                            >
                              <div
                                className="relative h-20"
                                style={{
                                  backgroundImage: getChestGradientBackground(
                                    chestGradientStart,
                                    chestGradientEnd,
                                    chestGradientAngle,
                                    chestGradientBalance,
                                  ),
                                }}
                              >
                                {chestWallpaper === "gradient" && (
                                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg">
                                    <Check size={14} strokeWidth={3} />
                                  </span>
                                )}
                              </div>
                              <div className="px-3 py-2.5">
                                <p className="truncate text-xs font-black text-slate-800">
                                  Custom Gradient
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-[10px] font-bold leading-4 text-slate-400">
                                  Pick two colours and drag the direction
                                </p>
                              </div>
                            </button>
                          </div>

                          {chestWallpaper === "gradient" && (
                            <div className="mt-4 grid gap-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4 md:grid-cols-2 xl:grid-cols-4">
                              <ColorControl
                                label="First Colour"
                                value={chestGradientStart}
                                onChange={setChestGradientStart}
                              />
                              <ColorControl
                                label="Second Colour"
                                value={chestGradientEnd}
                                onChange={setChestGradientEnd}
                              />

                              <div>
                                <div className="flex items-center justify-between gap-3">
                                  <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                    Direction
                                  </label>
                                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">
                                    {chestGradientAngle}°
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="360"
                                  step="5"
                                  value={chestGradientAngle}
                                  onChange={(event) =>
                                    setChestGradientAngle(
                                      Number(event.target.value),
                                    )
                                  }
                                  className="mt-4 w-full accent-violet-600"
                                />
                                <p className="mt-2 text-[11px] font-bold text-slate-500">
                                  Drag to rotate the colour direction.
                                </p>
                              </div>

                              <div>
                                <div className="flex items-center justify-between gap-3">
                                  <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                    White Balance
                                  </label>
                                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">
                                    {chestGradientBalance}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="22"
                                  max="78"
                                  step="2"
                                  value={chestGradientBalance}
                                  onChange={(event) =>
                                    setChestGradientBalance(
                                      Number(event.target.value),
                                    )
                                  }
                                  className="mt-4 w-full accent-violet-600"
                                />
                                <p className="mt-2 text-[11px] font-bold text-slate-500">
                                  Drag to move the light centre area.
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                            <label
                              htmlFor="chest-background-upload"
                              className={`flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-5 text-center transition ${
                                chestWallpaper === "custom"
                                  ? "border-violet-400 bg-violet-50"
                                  : "border-slate-300 bg-white hover:border-violet-400 hover:bg-violet-50/50"
                              }`}
                            >
                              <input
                                id="chest-background-upload"
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handleChestBackgroundUpload}
                                className="sr-only"
                              />
                              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                                <Upload size={19} />
                              </span>
                              <span className="mt-3 text-sm font-black text-slate-900">
                                Upload image or wallpaper
                              </span>
                              <span className="mt-1 text-xs font-bold text-slate-500">
                                PNG, JPG or WebP · maximum 8 MB
                              </span>
                              <span className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black text-white">
                                <ImagePlus size={15} />
                                Choose Image
                              </span>
                            </label>

                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              {chestDesignImage ? (
                                <>
                                  <div
                                    className="h-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                                    style={{
                                      backgroundImage: `url(${chestDesignImage})`,
                                      backgroundPosition: "center",
                                      backgroundRepeat: "no-repeat",
                                      backgroundSize: chestImageFit,
                                    }}
                                  />
                                  <p className="mt-2 truncate text-xs font-black text-slate-700">
                                    {chestDesignName || "Uploaded wallpaper"}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={removeChestBackgroundImage}
                                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                                  >
                                    <Trash2 size={14} />
                                    Remove Image
                                  </button>
                                </>
                              ) : (
                                <div className="flex h-full min-h-28 flex-col items-center justify-center text-center">
                                  <ImagePlus
                                    size={25}
                                    className="text-slate-300"
                                  />
                                  <p className="mt-2 text-xs font-black text-slate-500">
                                    No custom image selected
                                  </p>
                                  <p className="mt-1 text-[10px] font-bold text-slate-400">
                                    A ready wallpaper is currently active.
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {chestDesignImage && chestWallpaper === "custom" && (
                            <div className="mt-4 grid gap-4 rounded-xl border border-violet-200 bg-violet-50/60 p-4 md:grid-cols-2">
                              <SelectBox label="Image Fit">
                                <select
                                  value={chestImageFit}
                                  onChange={(event) =>
                                    setChestImageFit(
                                      event.target.value as ChestImageFit,
                                    )
                                  }
                                  className="select-input"
                                >
                                  <option value="cover">
                                    Fill card — may crop edges
                                  </option>
                                  <option value="contain">
                                    Show full image — no crop
                                  </option>
                                </select>
                              </SelectBox>

                              <div>
                                <div className="flex items-center justify-between gap-3">
                                  <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                                    White Overlay
                                  </label>
                                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-200">
                                    {chestOverlayStrength}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="20"
                                  max="92"
                                  step="2"
                                  value={chestOverlayStrength}
                                  onChange={(event) =>
                                    setChestOverlayStrength(
                                      Number(event.target.value),
                                    )
                                  }
                                  className="mt-4 w-full accent-violet-600"
                                />
                                <p className="mt-2 text-[11px] font-bold leading-4 text-slate-500">
                                  Increase it when the participant name or chest
                                  number is difficult to read.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="report-print-host relative z-0 overflow-hidden rounded-[1.7rem] border border-slate-200 bg-slate-100/75 shadow-xl shadow-slate-900/5">
              <div className="report-screen-toolbar flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 no-print">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-200">
                      Print Preview
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                      {printPageLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-black text-slate-950">
                    {organization?.name || "Madrasa"} ·{" "}
                    {eventInfo?.title || "Event"}
                  </p>
                </div>

                <p className="text-xs font-bold text-slate-500">
                  The grey area is not included in the printed PDF.
                </p>
              </div>

              <div className="report-print-content p-2 sm:p-4 lg:p-6">
                <ScaledPrintPreview format={previewPageFormat}>
                  {isLoading ? (
                    <div className="flex min-h-[460px] items-center justify-center gap-3 text-sm font-black text-slate-500">
                      <Loader2
                        className="animate-spin text-violet-600"
                        size={20}
                      />
                      Preparing report preview...
                    </div>
                  ) : (
                    <ReportBody
                      reportType={reportType}
                      compactMode={compactMode}
                      chestPaperFormat={chestPaperFormat}
                      chestCardWidthMm={chestCardWidthMm}
                      chestCardHeightMm={chestCardHeightMm}
                      chestCardGapMm={chestCardGapMm}
                      chestFontFamily={chestFontFamily}
                      chestWallpaper={chestWallpaper}
                      chestDesignImage={chestDesignImage}
                      chestImageFit={chestImageFit}
                      chestOverlayStrength={chestOverlayStrength}
                      chestGradientStart={chestGradientStart}
                      chestGradientEnd={chestGradientEnd}
                      chestGradientAngle={chestGradientAngle}
                      chestGradientBalance={chestGradientBalance}
                      reportTitle={activeReport.title}
                      reportSubtitle={activeReport.description}
                      organization={organization}
                      eventInfo={eventInfo}
                      dateText={formatEventDate()}
                      filteredStudents={filteredStudents}
                      registrationSheetStudents={registrationSheetStudents}
                      registrationSheetProgrammes={registrationSheetProgrammes}
                      registrations={registrations}
                      selectedCategoryName={
                        categoryFilter === "all"
                          ? "All Categories"
                          : getCategoryName(
                              categoryFilter === "general"
                                ? null
                                : categoryFilter,
                            )
                      }
                      registrationSheetMode={registrationSheetMode}
                      registrationSheetRows={registrationSheetRows}
                      registrationMarkColumns={registrationMarkColumns}
                      showEntryFormDivision={showEntryFormDivision}
                      showEntryFormChestNo={showEntryFormChestNo}
                      entryFormDivisionName={selectedEntryFormDivisionName}
                      genderFilter={genderFilter}
                      teamFilter={teamFilter}
                      filteredProgrammes={filteredProgrammes}
                      participantEntries={participantEntries}
                      studentProgrammeRows={studentProgrammeRows}
                      showParticipantDivision={showParticipantDivision}
                      encouragementGiftRows={encouragementGiftRows}
                      showResultClass={showResultClass}
                      showResultDivision={showResultDivision}
                      showChestCardDivision={showChestCardDivision}
                      chestTextDragEnabled={chestTextDragEnabled}
                      chestTextLayout={chestTextLayout}
                      chestElementStyles={chestElementStyles}
                      selectedChestElement={selectedChestElement}
                      onChestElementSelect={setSelectedChestElement}
                      chestLogoSizeMm={chestLogoSizeMm}
                      chestInfoBoxWidthPercent={chestInfoBoxWidthPercent}
                      chestInfoBoxPaddingMm={chestInfoBoxPaddingMm}
                      chestInfoBoxRadiusMm={chestInfoBoxRadiusMm}
                      onChestTextPositionChange={updateChestTextPosition}
                      resultRows={resultRows}
                      teamPoints={teamPoints}
                      topScorerRows={topScorerRows}
                      getCategoryName={getCategoryName}
                      getClassName={getClassName}
                      getDivisionName={getDivisionName}
                      getTeamName={getTeamName}
                      getProgramme={getProgramme}
                      getResultParticipant={getResultParticipant}
                      getPositionLabel={getPositionLabel}
                      cleanChest={cleanChest}
                    />
                  )}
                </ScaledPrintPreview>
              </div>
            </section>
          </main>
        </div>
      </div>
    </AdminShell>
  );
}

function MobileReportPicker({
  reportType,
  onChange,
}: {
  reportType: ReportType;
  onChange: (value: ReportType) => void;
}) {
  const active = REPORT_TYPES.find((item) => item.id === reportType)!;

  return (
    <section className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-2xl ring-1 ring-violet-100">
          {active.icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-700">
            Report Library
          </p>
          <p className="truncate text-base font-black text-slate-950">
            {active.title}
          </p>
        </div>
      </div>

      <select
        value={reportType}
        onChange={(event) => onChange(event.target.value as ReportType)}
        className="select-input mt-4"
        aria-label="Select report"
      >
        {REPORT_GROUPS.map((group) => (
          <optgroup key={group.id} label={group.title}>
            {group.reportIds.map((reportId) => {
              const report = REPORT_TYPES.find((item) => item.id === reportId)!;
              return (
                <option key={report.id} value={report.id}>
                  {report.title}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>

      <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
        {active.description}
      </p>
    </section>
  );
}

function ReportLibrary({
  reportType,
  onChange,
}: {
  reportType: ReportType;
  onChange: (value: ReportType) => void;
}) {
  return (
    <section className="max-h-[calc(100vh-7rem)] overflow-y-auto rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 [scrollbar-width:thin]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-1 pb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
          <FileText size={20} />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-[-0.04em] text-slate-950">
            Report Library
          </h2>
          <p className="text-xs font-bold text-slate-500">
            {REPORT_TYPES.length} printable formats
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-5">
        {REPORT_GROUPS.map((group) => (
          <div key={group.id}>
            <div className="px-1">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {group.title}
              </p>
              <p className="mt-1 text-[11px] font-bold leading-4 text-slate-500">
                {group.description}
              </p>
            </div>

            <div className="mt-2 space-y-1.5">
              {group.reportIds.map((reportId) => {
                const item = REPORT_TYPES.find(
                  (report) => report.id === reportId,
                )!;
                const selected = reportType === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChange(item.id)}
                    className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                      selected
                        ? "border-violet-300 bg-violet-50 shadow-sm ring-2 ring-violet-100"
                        : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${
                        selected ? "bg-white" : "bg-slate-50"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm font-black ${
                          selected ? "text-violet-800" : "text-slate-800"
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] font-bold text-slate-400">
                        {item.description}
                      </span>
                    </span>
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                        selected
                          ? "bg-violet-600"
                          : "bg-slate-200 group-hover:bg-slate-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardMetric({
  icon,
  label,
  value,
  compact = false,
}: {
  icon: string;
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {label}
          </p>
          <p
            className={`mt-2 font-black tracking-[-0.05em] text-slate-950 ${
              compact
                ? "line-clamp-2 text-base leading-5 sm:text-lg"
                : "text-2xl sm:text-3xl"
            }`}
          >
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function ScaledPrintPreview({
  format,
  children,
}: {
  format: PreviewPageFormat;
  children: ReactNode;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  const dimensions =
    format === "a3-landscape"
      ? { width: 1587, height: 1123 }
      : format === "a3-portrait"
        ? { width: 1123, height: 1587 }
        : format === "a4-landscape"
          ? { width: 1123, height: 794 }
          : { width: 794, height: 1123 };

  useEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;

    const updatePreview = () => {
      const availableWidth = Math.max(280, viewport.clientWidth);
      const nextScale = Math.min(1.25, availableWidth / dimensions.width);
      setScale(nextScale);
      setContentHeight(Math.max(dimensions.height, canvas.scrollHeight));
    };

    updatePreview();

    const observer = new ResizeObserver(updatePreview);
    observer.observe(viewport);
    observer.observe(canvas);
    window.addEventListener("resize", updatePreview);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updatePreview);
    };
  }, [dimensions.height, dimensions.width]);

  const scaledHeight = Math.max(dimensions.height, contentHeight) * scale;
  const scaledWidth = dimensions.width * scale;

  return (
    <div
      ref={viewportRef}
      className="print-preview-viewport w-full overflow-hidden"
    >
      <div
        className="print-preview-scaler mx-auto"
        style={{ width: scaledWidth, height: scaledHeight }}
      >
        <div
          ref={canvasRef}
          className="print-area origin-top-left overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/10"
          style={{
            width: dimensions.width,
            minHeight: dimensions.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
      <div className="mt-3 flex h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded-md border-0 bg-transparent p-0"
          aria-label={label}
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-black uppercase text-slate-700 outline-none"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function RegistrationSheetPreview({
  students,
  programmes,
  registrations,
  mode,
  rowCount,
  markColumnCount,
  showChestNo,
  showDivision,
  selectedDivisionName,
  getClassName,
  getDivisionName,
  cleanChest,
  organization,
  eventInfo,
  categoryName,
  genderLabel,
  teamName,
}: {
  students: Student[];
  programmes: Programme[];
  registrations: Registration[];
  mode: RegistrationSheetMode;
  rowCount: number;
  markColumnCount: number;
  showChestNo: boolean;
  showDivision: boolean;
  selectedDivisionName: string | null;
  getClassName: (id: string | null) => string;
  getDivisionName: (id: string | null) => string;
  cleanChest: (value: string | null) => string;
  organization: Organization | null;
  eventInfo: EventInfo | null;
  categoryName: string;
  genderLabel: string | null;
  teamName: string | null;
}) {
  const safeRowCount = Math.max(1, Math.min(100, rowCount));
  const displayRowCount =
    mode === "filled" ? Math.max(safeRowCount, students.length) : safeRowCount;

  const requestedColumnCount = Math.max(
    1,
    Math.min(30, Number(markColumnCount || 1)),
  );

  // Never hide assigned programmes. If the user requests more columns,
  // the remaining columns are left blank for handwritten additions.
  const totalProgrammeColumns = Math.max(
    programmes.length,
    requestedColumnCount,
  );
  const blankProgrammeColumns = Math.max(
    0,
    totalProgrammeColumns - programmes.length,
  );

  const registeredProgrammeIdsByStudent = new Map<string, Set<string>>();

  registrations.forEach((registration) => {
    if (!registration.student_id || !registration.programme_id) return;

    const current =
      registeredProgrammeIdsByStudent.get(registration.student_id) ||
      new Set<string>();

    current.add(registration.programme_id);
    registeredProgrammeIdsByStudent.set(registration.student_id, current);
  });

  // Entry Form readability is adaptive. When the administrator reduces the
  // programme-column count, use the freed page space for larger text and rows
  // instead of keeping the same tiny typography. Dense forms still stay compact.
  const entryFormDensity =
    totalProgrammeColumns <= 8
      ? { bodyFontPx: 12, rowHeightPx: 40, headerScale: 1.35, rowsPerPage: 11 }
      : totalProgrammeColumns <= 12
        ? { bodyFontPx: 11, rowHeightPx: 37, headerScale: 1.2, rowsPerPage: 12 }
        : totalProgrammeColumns <= 18
          ? { bodyFontPx: 10, rowHeightPx: 34, headerScale: 1.1, rowsPerPage: 13 }
          : totalProgrammeColumns <= 24
            ? { bodyFontPx: 9, rowHeightPx: 31, headerScale: 1, rowsPerPage: 14 }
            : { bodyFontPx: 8.2, rowHeightPx: 29, headerScale: 0.94, rowsPerPage: 14 };

  // Long programme titles are split only at spaces, then the complete line
  // group is rotated. Keep enough vertical header room even in readable mode.
  const programmeHeaderHeightPx = totalProgrammeColumns <= 12 ? 150 : 144;
  const rowsPerPage = entryFormDensity.rowsPerPage;

  function getProgrammeHeaderLines(name: string) {
    const normalizedName = String(name || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!normalizedName) return [""];

    const targetLineCount =
      normalizedName.length > 30
        ? 3
        : normalizedName.length > 17
          ? 2
          : 1;

    if (targetLineCount === 1) return [normalizedName];

    const words = normalizedName.split(" ");
    const targetLength = Math.ceil(
      normalizedName.length / targetLineCount,
    );
    const lines: string[] = [];
    let currentLine = "";

    words.forEach((word) => {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const canStartAnotherLine = lines.length < targetLineCount - 1;

      if (
        currentLine &&
        candidate.length > targetLength &&
        canStartAnotherLine
      ) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.slice(0, targetLineCount);
  }

  function getProgrammeHeaderFontSize(name: string) {
    const lines = getProgrammeHeaderLines(name);
    const longestLine = Math.max(
      1,
      ...lines.map((line) => line.length),
    );

    const baseSize =
      longestLine > 22
        ? 6.8
        : longestLine > 18
          ? 7.2
          : lines.length === 3
            ? 7.4
            : lines.length === 2
              ? 7.8
              : 8.4;

    return Math.min(11.2, baseSize * entryFormDensity.headerScale);
  }
  type RegistrationPreviewPage = {
    rowIndexes: number[];
    divisionName: string | null;
  };

  const pages: RegistrationPreviewPage[] = (() => {
    // Blank forms do not contain student division data, so they use the normal
    // fixed-row pagination even when the Division column is visible.
    if (mode !== "filled" || !showDivision) {
      const allRowIndexes = Array.from(
        { length: displayRowCount },
        (_, index) => index,
      );

      return chunkArray(allRowIndexes, rowsPerPage).map((rowIndexes) => ({
        rowIndexes,
        divisionName: showDivision ? selectedDivisionName : null,
      }));
    }

    // Filled forms with Division enabled are grouped by division. Each
    // division starts on a fresh page and continues onto additional pages when
    // it contains more than rowsPerPage students.
    const divisionGroups = new Map<
      string,
      { divisionName: string; rowIndexes: number[] }
    >();

    students.forEach((student, studentIndex) => {
      const divisionName = getDivisionName(student.division_id);
      const divisionKey = student.division_id || "__no_division__";
      const existing = divisionGroups.get(divisionKey);

      if (existing) {
        existing.rowIndexes.push(studentIndex);
      } else {
        divisionGroups.set(divisionKey, {
          divisionName,
          rowIndexes: [studentIndex],
        });
      }
    });

    return Array.from(divisionGroups.values()).flatMap((group) =>
      chunkArray(group.rowIndexes, rowsPerPage).map((rowIndexes) => ({
        rowIndexes,
        divisionName: group.divisionName,
      })),
    );
  })();

  return (
    <div className="bg-white">
      {pages.map((page, pageIndex) => {
        const pageRowIndexes = page.rowIndexes;

        return (
        <section
          key={`registration-page-${pageIndex}`}
          className="programme-sheet registration-print-page bg-white p-0"
        >
          <div className="border-b border-slate-300 px-6 py-4">
            <div className="grid grid-cols-[96px_minmax(0,1fr)_190px] items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                {organization?.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={`${organization.name} logo`}
                    className="h-full w-full object-contain p-1.5"
                  />
                ) : (
                  <span className="text-xl font-black text-violet-700">F</span>
                )}
              </div>

              <div className="min-w-0 text-center">
                <p className="truncate text-lg font-black uppercase tracking-[0.08em] text-slate-950">
                  {eventInfo?.title || "Event"}
                </p>

                <p className="mt-1 truncate text-base font-black uppercase tracking-[0.06em] text-slate-800">
                  {organization?.name || "Festeazy"}
                </p>

                <p className="mt-1 text-sm font-black uppercase tracking-[0.06em] text-slate-950">
                  Entry Form – {categoryName}
                  {genderLabel ? ` / ${genderLabel}` : ""}
                </p>

                {showDivision && page.divisionName && (
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-violet-700">
                    Division: {page.divisionName}
                  </p>
                )}
              </div>

              <div className="flex min-h-16 flex-col items-end justify-center text-right uppercase">
                {teamName && (
                  <p className="max-w-[190px] text-xs font-black tracking-[0.06em] text-slate-700">
                    Team: {teamName}
                  </p>
                )}

                <p className={`${teamName ? "mt-2" : ""} text-[10px] font-black tracking-[0.12em] text-slate-400`}>
                  Page {pageIndex + 1} / {pages.length}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden p-4 pt-3">
            <table
              className="registration-sheet-table w-full border-collapse border border-black text-center"
              style={{ fontSize: `${entryFormDensity.bodyFontPx}px` }}
            >
              <thead>
                <tr style={{ height: `${programmeHeaderHeightPx}px` }}>
                  <th className="w-[5%] border border-black px-2 text-xs font-black">
                    SL. NO
                  </th>

                  {showChestNo && (
                    <th className="w-[8%] border border-black px-1 text-xs font-black">
                      CHEST NO
                    </th>
                  )}

                  <th className={`${showChestNo ? "w-[18%]" : "w-[22%]"} border border-black px-2 text-xs font-black`}>
                    NAME
                  </th>

                  <th className="w-[11%] border border-black px-2 text-xs font-black">
                    CONTACT NO
                  </th>

                  <th className={`${showDivision ? "w-[8%]" : "w-[9%]"} border border-black px-2 text-xs font-black`}>
                    CLASS
                  </th>

                  {showDivision && (
                    <th className="w-[8%] border border-black px-2 text-xs font-black">
                      DIVISION
                    </th>
                  )}

                  {programmes.map((programme) => (
                    <th
                      key={programme.id}
                      className="relative min-w-[29px] border border-black p-0 align-bottom"
                    >
                      <div
                        className="absolute inset-0 flex items-center justify-center overflow-hidden px-0.5 py-1"
                        style={{ height: `${programmeHeaderHeightPx}px` }}
                      >
                        <div
                          title={programme.name}
                          className="flex flex-col items-center justify-center text-center font-black uppercase"
                          style={{
                            width: `${programmeHeaderHeightPx - 14}px`,
                            transform: "rotate(-90deg)",
                            transformOrigin: "center",
                            fontSize: `${getProgrammeHeaderFontSize(
                              programme.name,
                            )}px`,
                            lineHeight: 1.08,
                            letterSpacing:
                              programme.name.length > 28 ? "0" : "0.015em",
                          }}
                        >
                          {getProgrammeHeaderLines(programme.name).map(
                            (line, lineIndex) => (
                              <span
                                key={`${programme.id}-header-line-${lineIndex}`}
                                className="block whitespace-nowrap"
                              >
                                {line}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    </th>
                  ))}

                  {Array.from({ length: blankProgrammeColumns }).map(
                    (_, index) => (
                      <th
                        key={`blank-programme-${pageIndex}-${index}`}
                        className="relative min-w-[29px] border border-black p-0 align-bottom"
                      >
                        <div
                          style={{ height: `${programmeHeaderHeightPx}px` }}
                        />
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {pageRowIndexes.map((absoluteIndex) => {
                  const student =
                    mode === "filled" ? students[absoluteIndex] : null;
                  const registeredIds = student
                    ? registeredProgrammeIdsByStudent.get(student.id) ||
                      new Set<string>()
                    : new Set<string>();

                  return (
                    <tr
                      key={absoluteIndex}
                      style={{ height: `${entryFormDensity.rowHeightPx}px` }}
                    >
                      <td className="border border-black px-1 font-bold">
                        {student ? absoluteIndex + 1 : ""}
                      </td>

                      {showChestNo && (
                        <td className="border border-black px-1 font-black">
                          {student ? cleanChest(student.chest_no) : ""}
                        </td>
                      )}

                      <td className="border border-black px-2 text-left font-bold leading-tight">
                        {student?.name || ""}
                      </td>

                      <td className="border border-black px-1 font-bold">
                        {student?.phone || ""}
                      </td>

                      <td className="border border-black px-1 font-bold">
                        {student ? getClassName(student.class_id) : ""}
                      </td>

                      {showDivision && (
                        <td className="border border-black px-1 font-bold">
                          {student ? getDivisionName(student.division_id) : ""}
                        </td>
                      )}

                      {programmes.map((programme) => (
                        <td
                          key={programme.id}
                          className="border border-black text-center text-sm font-black"
                        >
                          {student && registeredIds.has(programme.id)
                            ? "✓"
                            : ""}
                        </td>
                      ))}

                      {Array.from({ length: blankProgrammeColumns }).map(
                        (_, blankIndex) => (
                          <td
                            key={`blank-cell-${absoluteIndex}-${blankIndex}`}
                            className="border border-black"
                          />
                        ),
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {programmes.length === 0 && pageIndex === 0 && (
              <div className="border-x border-b border-black p-3 text-center text-xs font-bold text-slate-500">
                No assigned programme names were found. Blank columns are
                available for handwritten programme names.
              </div>
            )}
          </div>
        </section>
        );
      })}
    </div>
  );
}

function formatProgrammeType(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase() === "group"
    ? "Group"
    : "Individual";
}

function normalizeStageLocation(value: string | null | undefined) {
  return String(value || "stage")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function formatStageLocation(value: string | null | undefined) {
  const normalized = normalizeStageLocation(value);

  if (
    normalized === "off_stage" ||
    normalized === "off-stage" ||
    normalized === "offstage"
  ) {
    return "Off-stage";
  }

  if (normalized === "stage") return "Stage";

  return String(value || "Stage")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatStageType(value: string | null | undefined) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "off_stage" ||
    normalized === "off-stage" ||
    normalized === "offstage"
  ) {
    return "Off-stage";
  }

  return "Stage";
}

function formatGenderScope(value: string | null | undefined) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized.includes("female") || normalized.includes("girl")) {
    return "Girls";
  }

  if (normalized.includes("male") || normalized.includes("boy")) {
    return "Boys";
  }

  return "All";
}

function ReportBody(props: any) {
  const {
    reportType,
    compactMode,
    chestPaperFormat,
    chestCardWidthMm,
    chestCardHeightMm,
    chestCardGapMm,
    chestFontFamily,
    chestWallpaper,
    chestDesignImage,
    chestImageFit,
    chestOverlayStrength,
    chestGradientStart,
    chestGradientEnd,
    chestGradientAngle,
    chestGradientBalance,
    reportTitle,
    reportSubtitle,
    organization,
    eventInfo,
    dateText,
    filteredStudents,
    registrationSheetStudents,
    registrationSheetProgrammes,
    registrations,
    selectedCategoryName,
    registrationSheetMode,
    registrationSheetRows,
    registrationMarkColumns,
    showEntryFormDivision,
    showEntryFormChestNo,
    entryFormDivisionName,
    genderFilter,
    teamFilter,
    filteredProgrammes,
    participantEntries,
    studentProgrammeRows,
    showParticipantDivision,
    encouragementGiftRows,
    showResultClass,
    showResultDivision,
    showChestCardDivision,
    chestTextDragEnabled,
    chestTextLayout,
    chestElementStyles,
    selectedChestElement,
    onChestElementSelect,
    chestLogoSizeMm,
    chestInfoBoxWidthPercent,
    chestInfoBoxPaddingMm,
    chestInfoBoxRadiusMm,
    onChestTextPositionChange,
    resultRows,
    teamPoints,
    topScorerRows,
    getCategoryName,
    getClassName,
    getDivisionName,
    getTeamName,
    getProgramme,
    getResultParticipant,
    getPositionLabel,
    cleanChest,
  } = props;

  const groupedEntries = groupEntriesByProgramme(participantEntries);

  if (reportType === "green_room") {
    return (
      <ProgrammeWiseSheets
        groups={groupedEntries}
        compactMode={compactMode}
        type="green_room"
        organization={organization}
        eventInfo={eventInfo}
        dateText={dateText}
      />
    );
  }

  if (reportType === "valuation_sheet") {
    return (
      <ProgrammeWiseSheets
        groups={groupedEntries}
        compactMode={compactMode}
        type="valuation_sheet"
        organization={organization}
        eventInfo={eventInfo}
        dateText={dateText}
      />
    );
  }

  if (reportType === "common_valuation_sheet") {
    return (
      <CommonValuationSheet
        entries={participantEntries}
        compactMode={compactMode}
        organization={organization}
        eventInfo={eventInfo}
        dateText={dateText}
      />
    );
  }

  if (reportType === "call_list") {
    return (
      <ProgrammeWiseSheets
        groups={groupedEntries}
        compactMode={compactMode}
        type="call_list"
        organization={organization}
        eventInfo={eventInfo}
        dateText={dateText}
      />
    );
  }

  if (reportType === "registration_sheet") {
    return (
      <RegistrationSheetPreview
        students={registrationSheetStudents}
        programmes={registrationSheetProgrammes}
        registrations={registrations}
        mode={registrationSheetMode}
        rowCount={registrationSheetRows}
        markColumnCount={registrationMarkColumns}
        showChestNo={showEntryFormChestNo}
        showDivision={showEntryFormDivision}
        selectedDivisionName={entryFormDivisionName}
        getClassName={getClassName}
        getDivisionName={getDivisionName}
        cleanChest={cleanChest}
        organization={organization}
        eventInfo={eventInfo}
        categoryName={selectedCategoryName}
        genderLabel={
          genderFilter === "male"
            ? "BOYS"
            : genderFilter === "female"
              ? "GIRLS"
              : null
        }
        teamName={teamFilter === "all" ? null : getTeamName(teamFilter)}
      />
    );
  }

  if (reportType === "chest_cards") {
    return (
      <ChestCardsReport
        students={filteredStudents}
        paperFormat={chestPaperFormat}
        cardWidthMm={chestCardWidthMm}
        cardHeightMm={chestCardHeightMm}
        cardGapMm={chestCardGapMm}
        fontFamily={chestFontFamily}
        wallpaper={chestWallpaper}
        customDesignImage={chestDesignImage}
        imageFit={chestImageFit}
        overlayStrength={chestOverlayStrength}
        gradientStart={chestGradientStart}
        gradientEnd={chestGradientEnd}
        gradientAngle={chestGradientAngle}
        gradientBalance={chestGradientBalance}
        organization={organization}
        eventInfo={eventInfo}
        dateText={dateText}
        getCategoryName={getCategoryName}
        getClassName={getClassName}
        getDivisionName={getDivisionName}
        getTeamName={getTeamName}
        showDivision={showChestCardDivision}
        dragEnabled={chestTextDragEnabled}
        textLayout={chestTextLayout}
        elementStyles={chestElementStyles}
        selectedElement={selectedChestElement}
        onElementSelect={onChestElementSelect}
        logoSizeMm={chestLogoSizeMm}
        infoBoxWidthPercent={chestInfoBoxWidthPercent}
        infoBoxPaddingMm={chestInfoBoxPaddingMm}
        infoBoxRadiusMm={chestInfoBoxRadiusMm}
        onTextPositionChange={onChestTextPositionChange}
        cleanChest={cleanChest}
      />
    );
  }

  return (
    <>
      <ReportHeader
        title={reportTitle}
        subtitle={reportSubtitle}
        organization={organization}
        eventInfo={eventInfo}
        dateText={dateText}
      />

      {reportType === "chest_list" && (
        <ReportTable
          compactMode={compactMode}
          headers={[
            "SL",
            "Chest No",
            "Student Name",
            "Gender",
            "Category",
            "Class",
            "Team",
            "Phone",
          ]}
          rows={filteredStudents.map((student: Student, index: number) => [
            index + 1,
            cleanChest(student.chest_no),
            student.name,
            formatGenderScope(student.gender),
            getCategoryName(student.category_id),
            getClassName(student.class_id),
            getTeamName(student.team_id),
            student.phone || "-",
          ])}
        />
      )}

      {reportType === "team_wise" && (
        <TeamWiseReport
          students={filteredStudents}
          compactMode={compactMode}
          getTeamName={getTeamName}
          getClassName={getClassName}
          getCategoryName={getCategoryName}
          cleanChest={cleanChest}
        />
      )}

      {reportType === "participant_list" && (
        <StudentProgrammeRegister
          rows={studentProgrammeRows}
          compactMode={compactMode}
          showDivision={showParticipantDivision}
        />
      )}

      {reportType === "encouragement_gift" && (
        <ReportTable
          compactMode={compactMode}
          headers={[
            "SL",
            "Chest No",
            "Student Name",
            "Gender",
            "Category",
            ...(showResultClass ? ["Class"] : []),
            ...(showResultDivision ? ["Division"] : []),
            "Team",
            "Programmes",
            "Gift Given",
            "Signature",
          ]}
          rows={encouragementGiftRows.map(
            (row: EncouragementGiftRow, index: number) => [
              index + 1,
              row.chestNo,
              row.studentName,
              formatGenderScope(row.gender),
              row.categoryName,
              ...(showResultClass ? [row.className || "-"] : []),
              ...(showResultDivision ? [row.divisionName || "-"] : []),
              row.teamName,
              row.programmeCount,
              "☐",
              "",
            ],
          )}
        />
      )}

      {reportType === "programme_register" && (
        <ReportTable
          compactMode={compactMode}
          headers={[
            "SL",
            "Programme",
            "Category",
            "Type",
            "Stage",
            "Gender",
          ]}
          rows={filteredProgrammes.map(
            (programme: Programme, index: number) => [
              index + 1,
              programme.name,
              getCategoryName(programme.category_id),
              formatProgrammeType(programme.programme_type),
              formatStageType(programme.stage_type),
              formatGenderScope(programme.gender_scope),
            ],
          )}
        />
      )}

      {(reportType === "winners_list" ||
        reportType === "prize_distribution") && (
        <ReportTable
          compactMode={compactMode}
          headers={[
            "SL",
            "Programme",
            "Category",
            "Position",
            "Participant",
            ...(showResultClass ? ["Class"] : []),
            ...(showResultDivision ? ["Division"] : []),
            "Team",
            "Mark",
            "Grade",
            "Points",
            ...(reportType === "prize_distribution"
              ? ["Prize Given", "Signature"]
              : []),
          ]}
          rows={resultRows.map((result: ResultItem, index: number) => {
            const programme = getProgramme(result.programme_id);
            const participant = getResultParticipant(result);

            return [
              index + 1,
              programme?.name || "-",
              getCategoryName(programme?.category_id || null),
              getPositionLabel(result.position),
              participant?.title || "-",
              ...(showResultClass ? [participant?.className || "-"] : []),
              ...(showResultDivision ? [participant?.divisionName || "-"] : []),
              getTeamName(participant?.teamId || null),
              result.total_mark,
              result.grade || "-",
              result.points,
              ...(reportType === "prize_distribution" ? ["☐", ""] : []),
            ];
          })}
        />
      )}

      {reportType === "top_scorers" && (
        <TopScorersReport
          rows={topScorerRows}
          compactMode={compactMode}
          showClass={showResultClass}
          showDivision={showResultDivision}
        />
      )}

      {reportType === "result_summary" && (
        <div className="p-6">
          <h3 className="mb-3 text-lg font-black text-slate-950">
            Team Points
          </h3>

          <ReportTable
            compactMode={compactMode}
            noOuterPadding
            headers={["Rank", "Team", "Points"]}
            rows={teamPoints.map((team: any, index: number) => [
              index + 1,
              team.teamName,
              team.points,
            ])}
          />

          <h3 className="mb-3 mt-8 text-lg font-black text-slate-950">
            Result Summary
          </h3>

          <ReportTable
            compactMode={compactMode}
            noOuterPadding
            headers={[
              "Programme",
              "Position",
              "Participant",
              ...(showResultClass ? ["Class"] : []),
              ...(showResultDivision ? ["Division"] : []),
              "Team",
              "Mark",
              "Grade",
              "Points",
            ]}
            rows={resultRows.map((result: ResultItem) => {
              const programme = getProgramme(result.programme_id);
              const participant = getResultParticipant(result);

              return [
                programme?.name || "-",
                getPositionLabel(result.position),
                participant?.title || "-",
                ...(showResultClass ? [participant?.className || "-"] : []),
                ...(showResultDivision ? [participant?.divisionName || "-"] : []),
                getTeamName(participant?.teamId || null),
                result.total_mark,
                result.grade || "-",
                result.points,
              ];
            })}
          />
        </div>
      )}
    </>
  );
}

function CommonValuationSheet({
  entries,
  compactMode,
  organization,
  eventInfo,
  dateText,
}: {
  entries: ParticipantEntry[];
  compactMode: boolean;
  organization: Organization | null;
  eventInfo: EventInfo | null;
  dateText: string;
}) {
  const rowCount = 15;

  const rows = Array.from({ length: rowCount }, (_, index) => [
    index + 1,
    "",
    "",
    "",
    "",
    "",
  ]);

  return (
    <div className="programme-sheet bg-white p-6">
      <div className="mb-5 border-b border-slate-300 pb-5">
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-700">
            FestEazy Event Report
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950">
            Valuation Sheet
          </h1>

          <p className="mt-1 text-xs font-bold text-slate-500">
            Judge mark entry sheet
          </p>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-700">
          <div>{organization?.name || "Madrasa"}</div>
          <div>{eventInfo?.title || "Event"}</div>
          <div>{dateText}</div>
        </div>

        <div className="mt-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">
              Report
            </p>

            <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.04em] text-slate-950">
              Common Valuation
            </h2>

            <p className="mt-1 max-w-lg text-xs font-black uppercase leading-5 text-violet-700">
              Code column is intentionally blank for manual use.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Programmes
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">—</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Total Entries
              </p>
              <p className="mt-1 text-2xl font-black text-slate-950">—</p>
            </div>
          </div>
        </div>
      </div>

      <ReportTable
        compactMode={compactMode}
        noOuterPadding
        headers={["SL", "Programme", "Category", "Code", "Marks", "Remarks"]}
        rows={rows}
      />

      <div className="mt-10 grid grid-cols-2 gap-12 text-xs font-black text-slate-700">
        <div className="border-t border-slate-400 pt-2">Judge Name:</div>
        <div className="border-t border-slate-400 pt-2">Signature:</div>
      </div>
    </div>
  );
}

type ProgrammePrintPage = {
  entries: ParticipantEntry[];
  startIndex: number;
};

function estimateProgrammeEntryPrintWeight(
  entry: ParticipantEntry,
  type: "green_room" | "valuation_sheet" | "call_list",
  compactMode: boolean,
) {
  if (type === "valuation_sheet") return 1;

  const participantText = formatParticipant(entry);
  const participantCharsPerLine = compactMode ? 78 : 60;
  const chestCharsPerLine = compactMode ? 30 : 24;
  const participantLines = Math.max(
    1,
    Math.ceil(participantText.length / participantCharsPerLine),
  );
  const chestLines = Math.max(
    1,
    Math.ceil(String(entry.chestNo || "").length / chestCharsPerLine),
  );
  const memberLines = Math.max(1, Math.ceil(entry.memberNames.length / 3));

  // Long group/team entries wrap over several lines. Treat those rows as more
  // than one normal row so a logical A4 page never overflows or gets clipped.
  return Math.max(participantLines, chestLines, memberLines);
}

function paginateProgrammeEntries(
  entries: ParticipantEntry[],
  type: "green_room" | "valuation_sheet" | "call_list",
  compactMode: boolean,
): ProgrammePrintPage[] {
  const pageBudget =
    type === "valuation_sheet"
      ? compactMode
        ? 24
        : 18
      : type === "call_list"
        ? compactMode
          ? 22
          : 17
        : compactMode
          ? 20
          : 15;

  if (entries.length === 0) {
    return [{ entries: [], startIndex: 0 }];
  }

  const pages: ProgrammePrintPage[] = [];
  let currentEntries: ParticipantEntry[] = [];
  let currentWeight = 0;
  let currentStartIndex = 0;

  entries.forEach((entry, index) => {
    const weight = Math.max(
      1,
      estimateProgrammeEntryPrintWeight(entry, type, compactMode),
    );

    if (
      currentEntries.length > 0 &&
      currentWeight + weight > pageBudget
    ) {
      pages.push({ entries: currentEntries, startIndex: currentStartIndex });
      currentEntries = [];
      currentWeight = 0;
      currentStartIndex = index;
    }

    currentEntries.push(entry);
    currentWeight += weight;
  });

  if (currentEntries.length > 0) {
    pages.push({ entries: currentEntries, startIndex: currentStartIndex });
  }

  return pages;
}

function ProgrammeWiseSheets({
  groups,
  compactMode,
  type,
  organization,
  eventInfo,
  dateText,
}: {
  groups: ParticipantEntry[][];
  compactMode: boolean;
  type: "green_room" | "valuation_sheet" | "call_list";
  organization: Organization | null;
  eventInfo: EventInfo | null;
  dateText: string;
}) {
  if (groups.length === 0) {
    return (
      <div className="p-10 text-center text-sm font-bold text-slate-500">
        No data found for this report.
      </div>
    );
  }

  return (
    <div>
      {groups.flatMap((entries, groupIndex) => {
        const first = entries[0];

        const title =
          type === "green_room"
            ? "Green Room Sign-In"
            : type === "valuation_sheet"
              ? "Valuation Sheet"
              : "Call List";

        const subtitle =
          type === "green_room"
            ? "Attendance and signature sheet"
            : type === "valuation_sheet"
              ? "Judge mark entry sheet"
              : "Stage calling sheet";

        const baseDisplayEntries =
          type === "valuation_sheet"
            ? entries.filter((entry) => entry.codeLetter && entry.isPresent)
            : entries;

        // Green Room and Valuation Sheet must follow the generated code order
        // (A, B, C ... Z, AA, AB ...), not registration/chest order.
        const displayEntries =
          type === "green_room" || type === "valuation_sheet"
            ? [...baseDisplayEntries].sort(compareEntriesByCode)
            : baseDisplayEntries;

        const pages = paginateProgrammeEntries(
          displayEntries,
          type,
          compactMode,
        );

        const headers =
          type === "green_room"
            ? [
                "SL",
                "Chest No",
                "Participant / Team Name",
                "Team",
                "Code Letter",
                "Present",
                "Signature",
              ]
            : type === "valuation_sheet"
              ? ["SL", "Code", "Marks", "Remarks"]
              : [
                  "SL",
                  "Code",
                  "Chest No",
                  "Participant / Team Name",
                  "Team",
                  "Called",
                  "Present",
                ];

        return pages.map((page, pageIndex) => {
          const rows =
            type === "green_room"
              ? page.entries.map((entry, index) => [
                  page.startIndex + index + 1,
                  entry.chestNo || "-",
                  formatParticipant(entry),
                  entry.teamName,
                  entry.codeLetter || "",
                  entry.isPresent ? "☑" : "☐",
                  "",
                ])
              : type === "valuation_sheet"
                ? page.entries.map((entry, index) => [
                    page.startIndex + index + 1,
                    entry.codeLetter || "",
                    "",
                    "",
                  ])
                : page.entries.map((entry, index) => [
                    page.startIndex + index + 1,
                    entry.codeLetter || "",
                    entry.chestNo || "-",
                    formatParticipant(entry),
                    entry.teamName,
                    "☐",
                    entry.isPresent ? "☑" : "☐",
                  ]);

          return (
            <div
              key={`${first.programmeId}-${groupIndex}-${pageIndex}`}
              className="programme-sheet bg-white p-6"
            >
              <SingleProgrammeHeader
                title={title}
                subtitle={subtitle}
                organization={organization}
                eventInfo={eventInfo}
                dateText={dateText}
                programmeName={first.programmeName}
                categoryName={first.categoryName}
                typeText={first.type}
                stageText={
                  first.stageType === "off_stage" ? "Off Stage" : "Stage"
                }
                marks={first.totalMarks}
                totalEntries={displayEntries.length}
                pageText={
                  pages.length > 1
                    ? `Page ${pageIndex + 1} / ${pages.length}`
                    : undefined
                }
              />

              <ReportTable
                compactMode={compactMode}
                noOuterPadding
                headers={headers}
                rows={rows}
              />

              {type === "valuation_sheet" && (
                <div className="mt-10 grid grid-cols-2 gap-12 text-xs font-black text-slate-700">
                  <div className="border-t border-slate-400 pt-2">
                    Judge Name:
                  </div>
                  <div className="border-t border-slate-400 pt-2">Signature:</div>
                </div>
              )}

              {type === "green_room" && (
                <div className="mt-10 grid grid-cols-2 gap-12 text-xs font-black text-slate-700">
                  <div className="border-t border-slate-400 pt-2">
                    In-Charge Name:
                  </div>
                  <div className="border-t border-slate-400 pt-2">Signature:</div>
                </div>
              )}
            </div>
          );
        });
      })}
    </div>
  );
}

function SingleProgrammeHeader({
  title,
  subtitle,
  organization,
  eventInfo,
  dateText,
  programmeName,
  categoryName,
  typeText,
  stageText,
  marks,
  totalEntries,
  pageText,
}: {
  title: string;
  subtitle: string;
  organization: Organization | null;
  eventInfo: EventInfo | null;
  dateText: string;
  programmeName: string;
  categoryName: string;
  typeText: string;
  stageText: string;
  marks: number;
  totalEntries: number;
  pageText?: string;
}) {
  return (
    <div className="mb-5 border-b border-slate-300 pb-5">
      <div className="grid grid-cols-[58px_1fr_58px] items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
          {organization?.logo_url ? (
            <img
              src={organization.logo_url}
              alt={`${organization.name} logo`}
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <span className="font-black text-violet-700">F</span>
          )}
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-700">
            FestEazy Event Report
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950">
            {title}
          </h1>

          <p className="mt-1 text-xs font-bold text-slate-500">{subtitle}</p>
        </div>
        <div />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-700">
        <div>{organization?.name || "Madrasa"}</div>
        <div>{eventInfo?.title || "Event"}</div>
        <div>{dateText}</div>
      </div>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">
            Programme
          </p>

          <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.04em] text-slate-950">
            {programmeName}
          </h2>

          <p className="mt-1 text-xs font-black uppercase text-violet-700">
            Category: {categoryName} · Type: {typeText} · Stage: {stageText} ·
            Marks: {marks}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Total Entries
          </p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {totalEntries}
          </p>
          {pageText && (
            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-violet-600">
              {pageText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ChestCardsReport({
  students,
  paperFormat,
  cardWidthMm,
  cardHeightMm,
  cardGapMm,
  fontFamily,
  wallpaper,
  customDesignImage,
  imageFit,
  overlayStrength,
  gradientStart,
  gradientEnd,
  gradientAngle,
  gradientBalance,
  organization,
  eventInfo,
  dateText,
  getCategoryName,
  getClassName,
  getDivisionName,
  getTeamName,
  showDivision,
  dragEnabled,
  textLayout,
  elementStyles,
  selectedElement,
  onElementSelect,
  logoSizeMm,
  infoBoxWidthPercent,
  infoBoxPaddingMm,
  infoBoxRadiusMm,
  onTextPositionChange,
  cleanChest,
}: {
  students: Student[];
  paperFormat: ChestPaperFormat;
  cardWidthMm: number;
  cardHeightMm: number;
  cardGapMm: number;
  fontFamily: string;
  wallpaper: ChestWallpaper;
  customDesignImage: string;
  imageFit: ChestImageFit;
  overlayStrength: number;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  gradientBalance: number;
  organization: Organization | null;
  eventInfo: EventInfo | null;
  dateText: string;
  getCategoryName: (id: string | null) => string;
  getClassName: (id: string | null) => string;
  getDivisionName: (id: string | null) => string;
  getTeamName: (id: string | null) => string;
  showDivision: boolean;
  dragEnabled: boolean;
  textLayout: ChestTextLayout;
  elementStyles: ChestElementStyleMap;
  selectedElement: ChestTextElement;
  onElementSelect: (element: ChestTextElement) => void;
  logoSizeMm: number;
  infoBoxWidthPercent: number;
  infoBoxPaddingMm: number;
  infoBoxRadiusMm: number;
  onTextPositionChange: (
    element: ChestTextElement,
    position: ChestTextPosition,
  ) => void;
  cleanChest: (value: string | null) => string;
}) {
  const layout = calculateChestCardLayout(
    paperFormat,
    cardWidthMm,
    cardHeightMm,
    cardGapMm,
  );
  const pages = chunkArray(students, layout.perPage);
  const customBackground = customDesignImage.trim();
  const safeOverlay = Math.min(0.92, Math.max(0.2, overlayStrength / 100));
  const presetWallpaper: "classic" | "sunrise" =
    wallpaper === "sunrise" ? "sunrise" : "classic";
  const widthScale = Math.max(0.85, Math.min(1.2, layout.cardWidthMm / 65));
  const heightScale = Math.max(0.9, Math.min(1.18, layout.cardHeightMm / 110));
  const contentScale = Math.min(widthScale, heightScale);

  // Keep important text readable even when six cards are fitted across A3.
  const chestNumberFontSize = Math.round(
    Math.max(72, Math.min(92, 82 * widthScale)),
  );
  const participantFontSize = Math.round(
    Math.max(20, Math.min(27, 23 * widthScale)),
  );
  const detailFontSize = Math.round(
    Math.max(11, Math.min(14, 12 * contentScale)),
  );
  const teamFontSize = Math.round(
    Math.max(10, Math.min(13, 11 * contentScale)),
  );
  const organizationName = organization?.name || "Madrasa";
  const organizationNameLength = organizationName.replace(/\s+/g, " ").trim().length;
  const organizationFontBase =
    organizationNameLength > 60
      ? 6.5
      : organizationNameLength > 48
        ? 7.2
        : organizationNameLength > 36
          ? 8.2
          : organizationNameLength > 28
            ? 9.2
            : 10.5;
  const organizationFontSize = Math.round(
    Math.max(6, Math.min(12, organizationFontBase * widthScale)),
  );
  const eventFontSize = Math.round(
    Math.max(9, Math.min(12, 10 * contentScale)),
  );
  const gradientBackground = getChestGradientBackground(
    gradientStart,
    gradientEnd,
    gradientAngle,
    gradientBalance,
  );

  const dragStateRef = useRef<{
    element: ChestTextElement;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPosition: ChestTextPosition;
    mmPerPixelX: number;
    mmPerPixelY: number;
  } | null>(null);

  function getTextPosition(element: ChestTextElement) {
    return textLayout?.[element] || DEFAULT_CHEST_TEXT_LAYOUT[element];
  }

  function getTextDragStyle(element: ChestTextElement) {
    const position = getTextPosition(element);

    return {
      transform: `translate(${position.x}mm, ${position.y}mm)`,
      touchAction: dragEnabled ? "none" : undefined,
      cursor: dragEnabled ? "move" : undefined,
      userSelect: dragEnabled ? ("none" as const) : undefined,
    };
  }

  function startTextDrag(
    element: ChestTextElement,
    event: any,
  ) {
    if (!dragEnabled) return;

    const card = event.currentTarget.closest(
      ".festeazy-chest-card",
    ) as HTMLElement | null;

    if (!card) return;

    const cardRect = card.getBoundingClientRect();
    if (!cardRect.width || !cardRect.height) return;

    event.preventDefault();
    event.stopPropagation();

    const currentPosition = getTextPosition(element);

    dragStateRef.current = {
      element,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPosition: { ...currentPosition },
      mmPerPixelX: layout.cardWidthMm / cardRect.width,
      mmPerPixelY: layout.cardHeightMm / cardRect.height,
    };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
  }

  function moveTextDrag(event: any) {
    const drag = dragStateRef.current;
    if (!dragEnabled || !drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();

    const nextX =
      drag.startPosition.x +
      (event.clientX - drag.startClientX) * drag.mmPerPixelX;
    const nextY =
      drag.startPosition.y +
      (event.clientY - drag.startClientY) * drag.mmPerPixelY;

    onTextPositionChange(drag.element, {
      x: Number(
        clampNumber(
          nextX,
          -layout.cardWidthMm * 0.8,
          layout.cardWidthMm * 0.8,
        ).toFixed(2),
      ),
      y: Number(
        clampNumber(
          nextY,
          -layout.cardHeightMm * 0.8,
          layout.cardHeightMm * 0.8,
        ).toFixed(2),
      ),
    });
  }

  function stopTextDrag(event: any) {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}

    dragStateRef.current = null;
  }

  function dragProps(element: ChestTextElement) {
    return {
      onPointerDown: (event: any) => {
        onElementSelect(element);
        startTextDrag(element, event);
      },
      onClick: () => onElementSelect(element),
      onPointerMove: moveTextDrag,
      onPointerUp: stopTextDrag,
      onPointerCancel: stopTextDrag,
      style: getTextDragStyle(element),
      className: dragEnabled
        ? `chest-draggable-text ${selectedElement === element ? "chest-draggable-selected" : ""}`
        : undefined,
    };
  }

  function textStyle(element: ChestTextElement, baseFontSize: number) {
    const style = elementStyles[element];
    return {
      ...getTextDragStyle(element),
      fontFamily: style.fontFamily || fontFamily,
      fontSize: `${Math.max(4, baseFontSize * (style.fontScale / 100))}px`,
      fontWeight: style.fontWeight,
      color: style.color,
    };
  }

  if (students.length === 0) {
    return (
      <div className="p-10 text-center text-sm font-bold text-slate-500">
        No students found for chest number cards.
      </div>
    );
  }

  return (
    <div className="chest-print-wrapper bg-white">
      {pages.map((pageStudents, pageIndex) => (
        <div
          key={pageIndex}
          className={`chest-card-sheet chest-card-sheet-${paperFormat} bg-white`}
        >
          <div className="mb-[1.5mm] flex shrink-0 items-center justify-between border-b border-slate-200 pb-[1.5mm]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                {organization?.logo_url ? (
                  <img
                    src={organization.logo_url}
                    alt={`${organization.name} logo`}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="font-black text-violet-700">F</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-black uppercase tracking-[0.26em] text-violet-700">
                  Chest Number Cards
                </p>
                <h2 className="mt-0.5 break-words text-xl font-black leading-tight tracking-[-0.05em] text-slate-950 [overflow-wrap:anywhere]">
                  {organizationName}
                </h2>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs font-black text-slate-950">
                {eventInfo?.title || "Event"}
              </p>
              <p className="mt-0.5 text-[10px] font-bold text-slate-500">
                {dateText} · Page {pageIndex + 1}/{pages.length}
              </p>
            </div>
          </div>

          <div
            className="chest-card-grid"
            style={{
              gridTemplateColumns: `repeat(${layout.columns}, ${layout.cardWidthMm}mm)`,
              gridAutoRows: `${layout.cardHeightMm}mm`,
              justifyContent: "start",
              alignContent: "start",
              gap: `${layout.gapMm}mm`,
            }}
          >
            {pageStudents.map((student) => {
              const teamName = getTeamName(student.team_id);
              const categoryName = getCategoryName(student.category_id);
              const className = getClassName(student.class_id);
              const divisionName = getDivisionName(student.division_id);

              return (
                <div
                  key={student.id}
                  className={`festeazy-chest-card flex h-full min-h-0 flex-col justify-between rounded-none text-center ${
                    wallpaper === "custom" && customBackground
                      ? "custom-chest-background"
                      : ""
                  }`}
                  style={{
                    fontFamily,
                    padding: `${Math.max(2.5, 3.1 * contentScale)}mm ${Math.max(2.4, 3.2 * widthScale)}mm`,
                    ...(wallpaper === "custom" && customBackground
                      ? {
                          backgroundColor: "#ffffff",
                          backgroundImage: `linear-gradient(rgba(255,255,255,${safeOverlay}), rgba(255,255,255,${safeOverlay})), url("${customBackground}")`,
                          backgroundSize: imageFit,
                          backgroundPosition: "center",
                          backgroundRepeat: "no-repeat",
                        }
                      : wallpaper === "gradient"
                        ? {
                            backgroundImage: gradientBackground,
                          }
                        : {
                            backgroundImage:
                              getChestWallpaperBackground(presetWallpaper),
                          }),
                  }}
                >
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    {organization?.logo_url && elementStyles.logo.visible && (
                      <img
                        {...dragProps("logo")}
                        src={organization.logo_url}
                        alt=""
                        className={`shrink-0 object-contain ${
                          dragEnabled ? "chest-draggable-text" : ""
                        } ${selectedElement === "logo" && dragEnabled ? "chest-draggable-selected" : ""}`}
                        style={{
                          ...getTextDragStyle("logo"),
                          width: `${logoSizeMm}mm`,
                          height: `${logoSizeMm}mm`,
                          borderRadius: "1.5mm",
                        }}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      {elementStyles.organization.visible && (
                        <p
                          {...dragProps("organization")}
                          className={`uppercase leading-[1.04] tracking-[0.06em] [overflow-wrap:anywhere] ${
                            dragEnabled ? "chest-draggable-text" : ""
                          } ${selectedElement === "organization" && dragEnabled ? "chest-draggable-selected" : ""}`}
                          style={textStyle("organization", organizationFontSize)}
                        >
                          {organizationName}
                        </p>
                      )}
                      {elementStyles.event.visible && (
                        <p
                          {...dragProps("event")}
                          className={`mt-1 line-clamp-2 leading-tight ${
                            dragEnabled ? "chest-draggable-text" : ""
                          } ${selectedElement === "event" && dragEnabled ? "chest-draggable-selected" : ""}`}
                          style={textStyle("event", eventFontSize)}
                        >
                          {eventInfo?.title || "Event"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10 py-3">
                    {elementStyles.chestLabel.visible && (
                      <p
                        {...dragProps("chestLabel")}
                        className={`uppercase tracking-[0.42em] ${
                          dragEnabled ? "chest-draggable-text" : ""
                        } ${selectedElement === "chestLabel" && dragEnabled ? "chest-draggable-selected" : ""}`}
                        style={textStyle("chestLabel", 10)}
                      >
                        Chest No
                      </p>
                    )}
                    {elementStyles.chestNumber.visible && (
                      <p
                        {...dragProps("chestNumber")}
                        className={`mt-1 leading-none tracking-[-0.09em] ${
                          dragEnabled ? "chest-draggable-text" : ""
                        } ${selectedElement === "chestNumber" && dragEnabled ? "chest-draggable-selected" : ""}`}
                        style={textStyle("chestNumber", chestNumberFontSize)}
                      >
                        {cleanChest(student.chest_no)}
                      </p>
                    )}
                  </div>

                  <div
                    {...dragProps("infoBox")}
                    className={`relative z-10 ${
                      elementStyles.infoBox.visible
                        ? "bg-white/80 shadow-sm ring-1 ring-slate-200/80 backdrop-blur"
                        : "bg-transparent"
                    } ${dragEnabled ? "chest-draggable-text" : ""} ${
                      selectedElement === "infoBox" && dragEnabled ? "chest-draggable-selected" : ""
                    }`}
                    style={{
                      ...getTextDragStyle("infoBox"),
                      width: `${Math.max(40, Math.min(100, infoBoxWidthPercent))}%`,
                      alignSelf: "center",
                      padding: `${Math.max(0, infoBoxPaddingMm)}mm ${Math.max(0, infoBoxPaddingMm)}mm`,
                      borderRadius: `${Math.max(0, infoBoxRadiusMm)}mm`,
                    }}
                  >
                    {elementStyles.studentName.visible && (
                      <p
                        {...dragProps("studentName")}
                        className={`line-clamp-2 min-h-[2.35em] leading-[1.12] tracking-[-0.025em] ${
                          dragEnabled ? "chest-draggable-text" : ""
                        } ${selectedElement === "studentName" && dragEnabled ? "chest-draggable-selected" : ""}`}
                        style={textStyle("studentName", participantFontSize)}
                      >
                        {student.name}
                      </p>
                    )}
                    {elementStyles.details.visible && (
                      <p
                        {...dragProps("details")}
                        className={`mt-1 line-clamp-2 leading-tight ${
                          dragEnabled ? "chest-draggable-text" : ""
                        } ${selectedElement === "details" && dragEnabled ? "chest-draggable-selected" : ""}`}
                        style={textStyle("details", detailFontSize)}
                      >
                        {categoryName} · {className}
                      </p>
                    )}
                    {showDivision &&
                      divisionName !== "-" &&
                      elementStyles.division.visible && (
                        <p
                          {...dragProps("division")}
                          className={`mt-1 line-clamp-1 leading-tight ${
                            dragEnabled ? "chest-draggable-text" : ""
                          } ${selectedElement === "division" && dragEnabled ? "chest-draggable-selected" : ""}`}
                          style={textStyle("division", Math.max(8, detailFontSize - 1))}
                        >
                          Division: {divisionName}
                        </p>
                      )}
                    {elementStyles.team.visible && (
                      <div className="chest-cut-line mt-3 pt-3">
                        <p
                          {...dragProps("team")}
                          className={`line-clamp-2 uppercase leading-tight tracking-[0.14em] ${
                            dragEnabled ? "chest-draggable-text" : ""
                          } ${selectedElement === "team" && dragEnabled ? "chest-draggable-selected" : ""}`}
                          style={textStyle("team", teamFontSize)}
                        >
                          {teamName}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      ))}
    </div>
  );
}

function TopScorersReport({
  rows,
  compactMode,
  showClass,
  showDivision,
}: {
  rows: TopScorerRow[];
  compactMode: boolean;
  showClass: boolean;
  showDivision: boolean;
}) {
  const vocalOfFest =
    rows
      .filter((row) => row.stagePoints > 0)
      .sort(
        (a, b) =>
          b.stagePoints - a.stagePoints || b.totalPoints - a.totalPoints,
      )[0] || null;

  const penOfFest =
    rows
      .filter((row) => row.offStagePoints > 0)
      .sort(
        (a, b) =>
          b.offStagePoints - a.offStagePoints || b.totalPoints - a.totalPoints,
      )[0] || null;

  return (
    <div className="p-6">
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
            Vocal of the Fest
          </p>
          <p className="mt-2 text-xl font-black text-slate-950">
            {vocalOfFest
              ? `${vocalOfFest.studentName} · ${vocalOfFest.stagePoints} pts`
              : "No stage points"}
          </p>
          {vocalOfFest && (
            <p className="mt-1 text-xs font-bold text-slate-500">
              Chest #{vocalOfFest.chestNo} · {vocalOfFest.teamName}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            Pen of the Fest
          </p>
          <p className="mt-2 text-xl font-black text-slate-950">
            {penOfFest
              ? `${penOfFest.studentName} · ${penOfFest.offStagePoints} pts`
              : "No off-stage points"}
          </p>
          {penOfFest && (
            <p className="mt-1 text-xs font-bold text-slate-500">
              Chest #{penOfFest.chestNo} · {penOfFest.teamName}
            </p>
          )}
        </div>
      </div>

      <ReportTable
        compactMode={compactMode}
        noOuterPadding
        headers={[
          "Rank",
          "Chest No",
          "Student Name",
          "Gender",
          "Category",
          ...(showClass ? ["Class"] : []),
          ...(showDivision ? ["Division"] : []),
          "Team",
          "Stage",
          "Off-stage",
          "Total",
          "Results",
        ]}
        rows={rows.map((row) => [
          row.rank,
          row.chestNo || "-",
          row.studentName,
          formatGenderScope(row.gender),
          row.categoryName,
          ...(showClass ? [row.className || "-"] : []),
          ...(showDivision ? [row.divisionName || "-"] : []),
          row.teamName,
          row.stagePoints,
          row.offStagePoints,
          row.totalPoints,
          row.resultCount,
        ])}
      />
    </div>
  );
}

function StudentProgrammeRegister({
  rows,
  compactMode,
  showDivision,
}: {
  rows: StudentProgrammeRow[];
  compactMode: boolean;
  showDivision: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm font-bold text-slate-500">
          No students with programme assignments were found for the selected filters.
        </div>
      </div>
    );
  }

  const isOffStage = (value: string | null | undefined) => {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");

    return (
      normalized === "off_stage" ||
      normalized === "off-stage" ||
      normalized === "offstage"
    );
  };

  const splitProgrammes = (programmes: StudentProgrammeAssignment[]) => {
    const stageIndividual: StudentProgrammeAssignment[] = [];
    const offStageIndividual: StudentProgrammeAssignment[] = [];
    const groupProgrammes: StudentProgrammeAssignment[] = [];
    const otherProgrammes: StudentProgrammeAssignment[] = [];

    programmes.forEach((programme) => {
      const type = String(programme.programmeType || "")
        .trim()
        .toLowerCase();

      if (type === "group") {
        groupProgrammes.push(programme);
        return;
      }

      if (type === "individual") {
        if (isOffStage(programme.stageType)) {
          offStageIndividual.push(programme);
        } else {
          stageIndividual.push(programme);
        }
        return;
      }

      // Never hide an assignment because of an unexpected programme type.
      otherProgrammes.push(programme);
    });

    return {
      stageIndividual,
      offStageIndividual,
      groupProgrammes,
      otherProgrammes,
    };
  };

  const assignmentCount = rows.reduce(
    (total, row) => total + row.programmes.length,
    0,
  );
  const averagePerStudent = assignmentCount / Math.max(1, rows.length);

  const globalCounts = rows.reduce(
    (counts, row) => {
      const groups = splitProgrammes(row.programmes);
      counts.stage += groups.stageIndividual.length;
      counts.offStage += groups.offStageIndividual.length;
      counts.group += groups.groupProgrammes.length;
      counts.other += groups.otherProgrammes.length;
      return counts;
    },
    { stage: 0, offStage: 0, group: 0, other: 0 },
  );

  const categoryGroups = new Map<string, StudentProgrammeRow[]>();

  rows.forEach((row) => {
    const categoryName = row.categoryName || "General";
    if (!categoryGroups.has(categoryName)) categoryGroups.set(categoryName, []);
    categoryGroups.get(categoryName)!.push(row);
  });

  const renderProgrammeSection = (
    label: string,
    programmes: StudentProgrammeAssignment[],
    options?: { showStage?: boolean; muted?: boolean },
  ) => {
    if (programmes.length === 0) return null;

    return (
      <div className="student-programme-group">
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <span
            className={`text-[8.5px] font-black uppercase tracking-[0.14em] ${
              options?.muted ? "text-slate-500" : "text-violet-700"
            }`}
          >
            {label}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8px] font-black text-slate-500">
            {programmes.length}
          </span>
        </div>

        <div className="space-y-1">
          {programmes.map((programme, programmeIndex) => (
            <div
              key={`${label}-${programme.programmeId}-${programmeIndex}`}
              className="grid grid-cols-[22px_minmax(0,1fr)] items-start gap-1.5"
            >
              <span className="pt-[1px] text-[9px] font-black tabular-nums text-slate-400">
                {String(programmeIndex + 1).padStart(2, "0")}.
              </span>

              <div className="min-w-0">
                <p className="text-[10.5px] font-black uppercase leading-[1.35] text-slate-900">
                  {programme.programmeName}
                </p>

                {(programme.groupName || options?.showStage) && (
                  <p className="mt-0.5 text-[8.5px] font-bold uppercase leading-3 text-slate-400">
                    {options?.showStage
                      ? formatStageType(programme.stageType)
                      : ""}
                    {options?.showStage && programme.groupName ? " • " : ""}
                    {programme.groupName
                      ? `Group: ${programme.groupName}`
                      : ""}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`student-programme-register-root ${compactMode ? "p-3.5" : "p-5"}`}
    >
      <div className="student-register-summary mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-y border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] font-bold text-slate-600">
        <span>
          <strong className="mr-1 text-xs font-black text-slate-950">
            {rows.length}
          </strong>
          Students
        </span>
        <span className="text-slate-300">•</span>
        <span>
          <strong className="mr-1 text-xs font-black text-slate-950">
            {assignmentCount}
          </strong>
          Assignments
        </span>
        <span className="text-slate-300">•</span>
        <span>
          Stage <strong className="text-slate-950">{globalCounts.stage}</strong>
        </span>
        <span className="text-slate-300">•</span>
        <span>
          Off-stage{" "}
          <strong className="text-slate-950">{globalCounts.offStage}</strong>
        </span>
        <span className="text-slate-300">•</span>
        <span>
          Group <strong className="text-slate-950">{globalCounts.group}</strong>
        </span>
        {globalCounts.other > 0 && (
          <>
            <span className="text-slate-300">•</span>
            <span>
              Other <strong className="text-slate-950">{globalCounts.other}</strong>
            </span>
          </>
        )}
        <span className="text-slate-300">•</span>
        <span>
          Avg. <strong className="text-slate-950">{averagePerStudent.toFixed(1)}</strong>
          / Student
        </span>
      </div>

      <div className="space-y-5">
        {Array.from(categoryGroups.entries()).map(
          ([categoryName, categoryRows], categoryIndex) => (
            <section
              key={categoryName}
              className="student-programme-category"
            >
              <div className="mb-2 flex items-end justify-between gap-3 border-b-2 border-slate-900 pb-1.5">
                <div>
                  <p className="text-[8.5px] font-black uppercase tracking-[0.18em] text-violet-600">
                    Category
                  </p>
                  <h3 className="mt-0.5 text-[15px] font-black uppercase tracking-[-0.01em] text-slate-950">
                    {categoryName}
                  </h3>
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                  {categoryRows.length} student
                  {categoryRows.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="overflow-hidden border border-slate-300 bg-white">
                <table className="student-programme-table print-table w-full table-fixed border-collapse text-left">
                  <colgroup>
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "31%" }} />
                    <col style={{ width: "57%" }} />
                  </colgroup>

                  <thead>
                    <tr>
                      <th className="border-b border-r border-slate-300 bg-slate-100 px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-600">
                        Chest No.
                      </th>
                      <th className="border-b border-r border-slate-300 bg-slate-100 px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-600">
                        Student
                      </th>
                      <th className="border-b border-slate-300 bg-slate-100 px-2.5 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-600">
                        Assigned Programmes
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {categoryRows.map((row, rowIndex) => {
                      const groups = splitProgrammes(row.programmes);

                      return (
                        <tr
                          key={row.student.id}
                          className={`student-programme-row align-top ${
                            (rowIndex + categoryIndex) % 2 === 1
                              ? "bg-slate-50/45"
                              : "bg-white"
                          }`}
                        >
                          <td className="border-r border-t border-slate-300 px-2.5 py-3 text-center align-top">
                            <span className="text-[12px] font-black tabular-nums text-slate-950">
                              {row.chestNo || "-"}
                            </span>
                          </td>

                          <td className="border-r border-t border-slate-300 px-2.5 py-3 align-top">
                            <p className="text-[10.5px] font-black uppercase leading-[1.35] text-slate-950">
                              {row.studentName}
                            </p>

                            <div className="mt-1.5 space-y-0.5 text-[8.7px] font-bold leading-3.5 text-slate-500">
                              <p>{row.className}</p>
                              {showDivision && row.divisionName !== "-" && (
                                <p>Division: {row.divisionName}</p>
                              )}
                              <p>
                                {formatGenderScope(row.gender)} • {row.teamName}
                              </p>
                            </div>

                            <div className="mt-2 border-t border-slate-200 pt-1.5 text-[8.5px] font-black uppercase tracking-[0.08em] text-slate-400">
                              {row.programmes.length} programme
                              {row.programmes.length === 1 ? "" : "s"}
                            </div>
                          </td>

                          <td className="border-t border-slate-300 px-2.5 py-3 align-top">
                            <div className="space-y-2.5">
                              {renderProgrammeSection(
                                "Stage — Individual",
                                groups.stageIndividual,
                              )}

                              {renderProgrammeSection(
                                "Off-stage — Individual",
                                groups.offStageIndividual,
                              )}

                              {renderProgrammeSection(
                                "Group / Team",
                                groups.groupProgrammes,
                                { showStage: true },
                              )}

                              {renderProgrammeSection(
                                "Other",
                                groups.otherProgrammes,
                                { showStage: true, muted: true },
                              )}
                            </div>

                            <div className="mt-2.5 flex flex-wrap gap-x-2.5 gap-y-1 border-t border-slate-200 pt-1.5 text-[8px] font-black uppercase tracking-[0.08em] text-slate-400">
                              <span>
                                Stage: {groups.stageIndividual.length}
                              </span>
                              <span>•</span>
                              <span>
                                Off-stage: {groups.offStageIndividual.length}
                              </span>
                              <span>•</span>
                              <span>
                                Group: {groups.groupProgrammes.length}
                              </span>
                              <span>•</span>
                              <span className="text-slate-600">
                                Total: {row.programmes.length}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}

function TeamWiseReport({
  students,
  compactMode,
  getTeamName,
  getClassName,
  getCategoryName,
  cleanChest,
}: any) {
  const grouped = new Map<string, Student[]>();

  students.forEach((student: Student) => {
    const teamName = getTeamName(student.team_id);
    if (!grouped.has(teamName)) grouped.set(teamName, []);
    grouped.get(teamName)!.push(student);
  });

  return (
    <div className="p-6">
      {Array.from(grouped.entries()).map(([teamName, teamStudents]) => (
        <div key={teamName} className="team-wise-section mb-8">
          <h3 className="mb-3 border-b border-slate-300 pb-2 text-lg font-black text-slate-950">
            {teamName} - {teamStudents.length} Students
          </h3>

          <ReportTable
            compactMode={compactMode}
            noOuterPadding
            headers={[
              "SL",
              "Chest No",
              "Student Name",
              "Gender",
              "Class",
              "Category",
            ]}
            rows={teamStudents.map((student: Student, index: number) => [
              index + 1,
              cleanChest(student.chest_no),
              student.name,
              formatGenderScope(student.gender),
              getClassName(student.class_id),
              getCategoryName(student.category_id),
            ])}
          />
        </div>
      ))}
    </div>
  );
}

function codeSequenceValue(value: string | null | undefined) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (!normalized || !/^[A-Z]+$/.test(normalized)) return null;

  // Treat code letters like spreadsheet columns:
  // A=1, B=2, ... Z=26, AA=27, AB=28 ...
  return normalized.split("").reduce((total, letter) => {
    return total * 26 + (letter.charCodeAt(0) - 64);
  }, 0);
}

function entryChestNumber(value: string | null | undefined) {
  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function compareEntriesByCode(a: ParticipantEntry, b: ParticipantEntry) {
  const firstCode = String(a.codeLetter || "")
    .trim()
    .toUpperCase();
  const secondCode = String(b.codeLetter || "")
    .trim()
    .toUpperCase();

  // Rows without a generated code stay at the bottom of Green Room sheets.
  if (!firstCode && !secondCode) {
    return entryChestNumber(a.chestNo) - entryChestNumber(b.chestNo);
  }
  if (!firstCode) return 1;
  if (!secondCode) return -1;

  const firstSequence = codeSequenceValue(firstCode);
  const secondSequence = codeSequenceValue(secondCode);

  if (firstSequence !== null && secondSequence !== null) {
    if (firstSequence !== secondSequence) {
      return firstSequence - secondSequence;
    }
  } else {
    const codeCompare = firstCode.localeCompare(secondCode, undefined, {
      numeric: true,
      sensitivity: "base",
    });

    if (codeCompare !== 0) return codeCompare;
  }

  // Stable fallback if two rows somehow have the same code.
  const chestCompare = entryChestNumber(a.chestNo) - entryChestNumber(b.chestNo);
  if (chestCompare !== 0) return chestCompare;

  return a.participantName.localeCompare(b.participantName);
}

function groupEntriesByProgramme(entries: ParticipantEntry[]) {
  const map = new Map<string, ParticipantEntry[]>();

  entries.forEach((entry) => {
    const key = entry.programmeId || entry.programmeName;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  });

  return Array.from(map.values());
}

function formatParticipant(entry: ParticipantEntry) {
  if (entry.memberNames.length > 1) {
    return `${entry.participantName} (${entry.memberNames.join(", ")})`;
  }

  return entry.participantName;
}

function codeLetter(index: number) {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return letters[index] || "";
}

const CHEST_CARD_SHEET_PADDING_MM = 1.5;
const CHEST_CARD_HEADER_MM = 17;
const CHEST_CARD_FOOTER_MM = 0;
const CHEST_CARD_SECTION_GAP_MM = 1.5;

const CHEST_PAPER_DIMENSIONS: Record<
  ChestPaperFormat,
  {
    label: string;
    printSize: string;
    sheetWidthMm: number;
    sheetHeightMm: number;
  }
> = {
  "a4-portrait": {
    label: "A4 Portrait",
    printSize: "A4 portrait",
    sheetWidthMm: 204,
    sheetHeightMm: 291,
  },
  "a4-landscape": {
    label: "A4 Landscape",
    printSize: "A4 landscape",
    sheetWidthMm: 291,
    sheetHeightMm: 204,
  },
  "a3-portrait": {
    label: "A3 Portrait",
    printSize: "A3 portrait",
    sheetWidthMm: 291,
    sheetHeightMm: 414,
  },
  "a3-landscape": {
    label: "A3 Landscape",
    printSize: "A3 landscape",
    sheetWidthMm: 414,
    sheetHeightMm: 291,
  },
};

function getChestPaperLabel(format: ChestPaperFormat) {
  return CHEST_PAPER_DIMENSIONS[format].label;
}

function getChestPaperPrintSize(format: ChestPaperFormat) {
  return CHEST_PAPER_DIMENSIONS[format].printSize;
}

function clampNumber(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function calculateChestCardLayout(
  paperFormat: ChestPaperFormat,
  requestedWidthMm: number,
  requestedHeightMm: number,
  requestedGapMm: number,
) {
  const paper = CHEST_PAPER_DIMENSIONS[paperFormat];
  const maxWidthMm = paper.sheetWidthMm - CHEST_CARD_SHEET_PADDING_MM * 2;
  const maxHeightMm =
    paper.sheetHeightMm -
    CHEST_CARD_SHEET_PADDING_MM * 2 -
    CHEST_CARD_HEADER_MM -
    CHEST_CARD_FOOTER_MM -
    CHEST_CARD_SECTION_GAP_MM;

  const cardWidthMm = Number(
    clampNumber(requestedWidthMm || 78, 45, maxWidthMm).toFixed(1),
  );
  const cardHeightMm = Number(
    clampNumber(requestedHeightMm || 65, 40, maxHeightMm).toFixed(1),
  );
  const gapMm = Number(clampNumber(requestedGapMm, 0, 5).toFixed(1));

  const columns = Math.max(
    1,
    Math.floor((maxWidthMm + gapMm) / (cardWidthMm + gapMm)),
  );
  const rows = Math.max(
    1,
    Math.floor((maxHeightMm + gapMm) / (cardHeightMm + gapMm)),
  );

  return {
    sheetWidthMm: paper.sheetWidthMm,
    sheetHeightMm: paper.sheetHeightMm,
    maxWidthMm,
    maxHeightMm,
    cardWidthMm,
    cardHeightMm,
    gapMm,
    columns,
    rows,
    perPage: columns * rows,
  };
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function ReportHeader({
  title,
  subtitle,
  organization,
  eventInfo,
  dateText,
}: {
  title: string;
  subtitle: string;
  organization: Organization | null;
  eventInfo: EventInfo | null;
  dateText: string;
}) {
  return (
    <div className="report-document-header border-b border-slate-200 bg-white p-6">
      <div className="grid grid-cols-[64px_1fr_64px] items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
          {organization?.logo_url ? (
            <img
              src={organization.logo_url}
              alt={`${organization.name} logo`}
              className="h-full w-full object-contain p-1"
            />
          ) : (
            <span className="text-lg font-black text-violet-700">F</span>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-700">
            FestEazy Event Report
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-950">
            {title}
          </h1>

          <p className="mt-1 text-sm font-bold text-slate-500">{subtitle}</p>

          <div className="mt-5 grid gap-2 text-sm font-bold text-slate-700 sm:grid-cols-3">
            <div>{organization?.name || "Madrasa"}</div>
            <div>{eventInfo?.title || "Event"}</div>
            <div>{dateText}</div>
          </div>

          {eventInfo?.venue && (
            <p className="mt-2 text-sm font-bold text-slate-500">
              Venue: {eventInfo.venue}
            </p>
          )}
        </div>
        <div />
      </div>
    </div>
  );
}

function ReportTable({
  headers,
  rows,
  compactMode,
  noOuterPadding = false,
}: {
  headers: string[];
  rows: any[][];
  compactMode: boolean;
  noOuterPadding?: boolean;
}) {
  return (
    <div className={`report-table-block ${noOuterPadding ? "" : "p-6"}`}>
      <div className="report-table-scroll overflow-x-auto">
        <table className="print-table w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-600"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length}
                  className="border border-slate-300 px-3 py-8 text-center text-sm font-bold text-slate-500"
                >
                  No data found for this report.
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className={`border border-slate-300 px-3 ${
                        compactMode ? "py-1.5" : "py-3"
                      } align-top font-semibold text-slate-700`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DimensionInput({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  function commitValue() {
    const parsedValue = Number(draftValue);

    if (!Number.isFinite(parsedValue)) {
      setDraftValue(String(value));
      return;
    }

    const nextValue = Number(clampNumber(parsedValue, min, max).toFixed(1));

    onChange(nextValue);
    setDraftValue(String(nextValue));
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label} (mm)
      </span>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onBlur={commitValue}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-black text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
          mm
        </span>
      </div>
    </label>
  );
}

function SelectBox({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
      <div className="text-3xl">{icon}</div>

      <p className="mt-3 text-3xl font-black tracking-[-0.08em] text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
    </div>
  );
}