/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import FontFamilySelect from "@/components/FontFamilySelect";
import {
  CUSTOM_FONT_FACE_CSS,
  GOOGLE_FONT_STYLESHEET_URL,
  normalizeFontFamily,
} from "@/app/fonts";
import { getAdminContext } from "@/lib/admin-context";
import { supabase } from "@/lib/supabase";
import {
  deleteAdminStorageAsset,
  uploadAdminStorageAsset,
} from "@/lib/admin-storage";
import {
  Award,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Edit3,
  FileText,
  ImagePlus,
  Loader2,
  Move,
  Printer,
  RefreshCcw,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

type Organization = {
  id: string;
  name: string;
  place: string | null;
};

type EventInfo = {
  id: string;
  organization_id: string;
  title: string;
  venue: string | null;
  start_date: string | null;
  end_date: string | null;
};

type Category = { id: string; name: string };
type Team = { id: string; name: string };

type Student = {
  id: string;
  name: string;
  chest_no: string | null;
  gender: string | null;
  category_id: string | null;
  team_id: string | null;
  status: string | null;
};

type Programme = {
  id: string;
  name: string;
  category_id: string | null;
  programme_type: string;
  sort_order: number;
};

type Registration = {
  id: string;
  programme_id: string | null;
  student_id: string | null;
  team_id: string | null;
  group_name: string | null;
};

type ResultItem = {
  id: string;
  programme_id: string | null;
  registration_id: string | null;
  grade: string | null;
  position: number | null;
  total_mark: number;
  average_mark: number;
  is_published: boolean;
  published_at: string | null;
};

type CertificateSettings = {
  id?: string;
  message_template: string;
  text_x_mm: number;
  text_y_mm: number;
  text_width_mm: number;
  font_size_pt: number;
  line_height: number;
  text_color: string;
  text_align: "left" | "center" | "right";
  font_family: string;
  preview_template_url: string | null;
  preview_template_path: string | null;
  public_positions: number[];
};

type IssuedCertificate = {
  id: string;
  organization_id: string;
  event_id: string;
  result_id: string;
  programme_id: string;
  registration_id: string;
  student_id: string;
  certificate_number: string;
  message_text: string;
  locked_data: Record<string, any>;
  issued_at: string;
  last_printed_at: string;
  print_count: number;
};

type CertificateCandidate = {
  key: string;
  result: ResultItem;
  programme: Programme;
  registration: Registration;
  student: Student;
  categoryName: string;
  teamName: string;
  groupName: string;
};

type EditorSelection =
  | {
      mode: "pending";
      candidate: CertificateCandidate;
      issued: null;
    }
  | {
      mode: "issued";
      candidate: CertificateCandidate | null;
      issued: IssuedCertificate;
    };

const DEFAULT_MESSAGE_TEMPLATE = `This Certificate of Merit is awarded to {student_name} of {organization_name} for securing {grade} Grade in {programme_name} in {event_title} held on {event_date} at {venue}.

Category: {category_name}

We wish {pronoun} all the best for a glorious future.`;

const DEFAULT_SETTINGS: CertificateSettings = {
  message_template: DEFAULT_MESSAGE_TEMPLATE,
  text_x_mm: 46,
  text_y_mm: 73,
  text_width_mm: 205,
  font_size_pt: 11.5,
  line_height: 1.55,
  text_color: "#4f86a5",
  text_align: "center",
  font_family: "Arial, Helvetica, sans-serif",
  preview_template_url: null,
  preview_template_path: null,
  public_positions: [1, 2],
};

const MESSAGE_TOKENS = [
  "{student_name}",
  "{organization_name}",
  "{grade}",
  "{programme_name}",
  "{event_title}",
  "{event_date}",
  "{venue}",
  "{category_name}",
  "{team_name}",
  "{group_name}",
  "{position}",
  "{pronoun}",
];

const A4_LANDSCAPE_WIDTH_MM = 297;
const A4_LANDSCAPE_HEIGHT_MM = 210;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePublicPositions(value: unknown) {
  if (!Array.isArray(value)) return [1, 2];
  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 3),
    ),
  ).sort((a, b) => a - b);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function positionLabel(position: number | null) {
  if (position === 1) return "First Place";
  if (position === 2) return "Second Place";
  if (position === 3) return "Third Place";
  if (position === 4) return "Fourth Place";
  if (!position) return "";
  return `Position ${position}`;
}

function pronounForGender(gender: string | null) {
  const value = String(gender || "").trim().toLowerCase();
  if (value.includes("female") || value.includes("girl")) return "her";
  if (value.includes("male") || value.includes("boy")) return "him";
  return "them";
}

export default function CertificatesPage() {
  const previewPaperRef = useRef<HTMLDivElement | null>(null);
  const previewTemplateInputRef = useRef<HTMLInputElement | null>(null);
  const messageDragRef = useRef<{
    startClientX: number;
    startClientY: number;
    startXmm: number;
    startYmm: number;
    messageHeightMm: number;
  } | null>(null);

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [issuedCertificates, setIssuedCertificates] = useState<
    IssuedCertificate[]
  >([]);
  const [settings, setSettings] =
    useState<CertificateSettings>(DEFAULT_SETTINGS);

  const [activeTab, setActiveTab] = useState<"pending" | "issued">("pending");
  const [search, setSearch] = useState("");
  const [programmeFilter, setProgrammeFilter] = useState("all");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [messageText, setMessageText] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isDraggingMessage, setIsDraggingMessage] = useState(false);
  const [isUploadingPreviewTemplate, setIsUploadingPreviewTemplate] =
    useState(false);
  const [isRemovingPreviewTemplate, setIsRemovingPreviewTemplate] =
    useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isIssuing, setIsIssuing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handleMessageDrag);
      window.removeEventListener("pointerup", stopMessageDrag);
    };
  }, []);

  const candidateMap = useMemo(() => {
    const map = new Map<string, CertificateCandidate>();

    results
      .filter(
        (result) =>
          result.is_published &&
          String(result.grade || "").trim().toLowerCase() !== "absent",
      )
      .forEach((result) => {
        const programme = programmes.find(
          (item) => item.id === result.programme_id,
        );
        const registration = registrations.find(
          (item) => item.id === result.registration_id,
        );

        if (!programme || !registration) return;

        const categoryName =
          categories.find((item) => item.id === programme.category_id)?.name ||
          "General";

        const addStudent = (student: Student, memberRegistration: Registration) => {
          const teamId = memberRegistration.team_id || student.team_id;
          const teamName =
            teams.find((item) => item.id === teamId)?.name || "";
          const key = `${result.id}:${student.id}`;

          map.set(key, {
            key,
            result,
            programme,
            registration,
            student,
            categoryName,
            teamName,
            groupName: registration.group_name || "",
          });
        };

        if (programme.programme_type === "group") {
          registrations
            .filter(
              (item) =>
                item.programme_id === programme.id &&
                item.team_id === registration.team_id &&
                item.group_name === registration.group_name,
            )
            .forEach((memberRegistration) => {
              const student = students.find(
                (item) => item.id === memberRegistration.student_id,
              );
              if (student) addStudent(student, memberRegistration);
            });
          return;
        }

        const student = students.find(
          (item) => item.id === registration.student_id,
        );
        if (student) addStudent(student, registration);
      });

    return map;
  }, [
    results,
    programmes,
    registrations,
    students,
    categories,
    teams,
  ]);

  const candidates = useMemo(
    () =>
      Array.from(candidateMap.values()).sort((a, b) => {
        const programmeCompare =
          safeNumber(a.programme.sort_order, 9999) -
          safeNumber(b.programme.sort_order, 9999);
        if (programmeCompare !== 0) return programmeCompare;
        const positionCompare =
          safeNumber(a.result.position, 9999) -
          safeNumber(b.result.position, 9999);
        if (positionCompare !== 0) return positionCompare;
        return a.student.name.localeCompare(b.student.name);
      }),
    [candidateMap],
  );

  const issuedKeys = useMemo(
    () =>
      new Set(
        issuedCertificates.map(
          (certificate) => `${certificate.result_id}:${certificate.student_id}`,
        ),
      ),
    [issuedCertificates],
  );

  const pendingCandidates = useMemo(
    () => candidates.filter((candidate) => !issuedKeys.has(candidate.key)),
    [candidates, issuedKeys],
  );

  const selectedPendingGroupMembers = useMemo(() => {
    if (
      !selection ||
      selection.mode !== "pending" ||
      selection.candidate.programme.programme_type !== "group"
    ) {
      return [];
    }

    const selectedCandidate = selection.candidate;

    return pendingCandidates.filter((candidate) => {
      return (
        candidate.result.id === selectedCandidate.result.id &&
        candidate.programme.id === selectedCandidate.programme.id &&
        candidate.teamName === selectedCandidate.teamName &&
        candidate.groupName === selectedCandidate.groupName
      );
    });
  }, [selection, pendingCandidates]);

  const visiblePending = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return pendingCandidates.filter((candidate) => {
      const matchesProgramme =
        programmeFilter === "all" ||
        candidate.programme.id === programmeFilter;
      const matchesGrade =
        gradeFilter === "all" || candidate.result.grade === gradeFilter;
      const matchesSearch =
        !keyword ||
        candidate.student.name.toLowerCase().includes(keyword) ||
        String(candidate.student.chest_no || "")
          .toLowerCase()
          .includes(keyword) ||
        candidate.programme.name.toLowerCase().includes(keyword) ||
        candidate.categoryName.toLowerCase().includes(keyword) ||
        candidate.teamName.toLowerCase().includes(keyword);
      return matchesProgramme && matchesGrade && matchesSearch;
    });
  }, [pendingCandidates, search, programmeFilter, gradeFilter]);

  const visibleIssued = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return issuedCertificates.filter((certificate) => {
      const locked = certificate.locked_data || {};
      const matchesProgramme =
        programmeFilter === "all" ||
        certificate.programme_id === programmeFilter;
      const matchesGrade =
        gradeFilter === "all" || locked.grade === gradeFilter;
      const haystack = [
        locked.student_name,
        locked.chest_no,
        locked.programme_name,
        locked.category_name,
        locked.team_name,
        certificate.certificate_number,
      ]
        .join(" ")
        .toLowerCase();
      return matchesProgramme && matchesGrade && (!keyword || haystack.includes(keyword));
    });
  }, [issuedCertificates, search, programmeFilter, gradeFilter]);

  const gradeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          results
            .map((result) => String(result.grade || "").trim())
            .filter((grade) => grade && grade.toLowerCase() !== "absent"),
        ),
      ).sort(),
    [results],
  );

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || "";
  }

  async function callCertificateApi(
    method: "GET" | "POST" | "PUT" | "PATCH",
    body?: Record<string, any>,
  ) {
    const token = await getAccessToken();
    if (!token) throw new Error("Your login session expired. Please login again.");

    const response = await fetch("/api/admin/certificates", {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const requestError: any = new Error(payload.error || "Request failed.");
      requestError.payload = payload;
      throw requestError;
    }
    return payload;
  }

  async function loadData() {
    setIsLoading(true);
    setError("");
    setMessage("");

    const { context, error: contextError } = await getAdminContext({
      forceRefresh: true,
    });

    if (contextError || !context) {
      setError(contextError || "Unable to load the active event.");
      setIsLoading(false);
      return;
    }

    const activeOrganization: Organization = {
      id: context.organizationId,
      name: context.organizationName,
      place: context.organizationPlace || null,
    };
    const activeEvent: EventInfo = {
      id: context.eventId,
      organization_id: context.organizationId,
      title: context.eventTitle,
      venue: context.eventVenue || null,
      start_date: context.eventStartDate || null,
      end_date: context.eventEndDate || null,
    };

    setOrganization(activeOrganization);
    setEventInfo(activeEvent);

    try {
      const [
        categoryResponse,
        teamResponse,
        studentResponse,
        programmeResponse,
        registrationResponse,
        resultResponse,
        certificateResponse,
      ] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name")
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("teams")
          .select("id, name")
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("students")
          .select(
            "id, name, chest_no, gender, category_id, team_id, status",
          )
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId),
        supabase
          .from("programmes")
          .select("id, name, category_id, programme_type, sort_order")
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .eq("status", "active")
          .order("sort_order", { ascending: true }),
        supabase
          .from("programme_registrations")
          .select("id, programme_id, student_id, team_id, group_name")
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId),
        supabase
          .from("results")
          .select(
            "id, programme_id, registration_id, grade, position, total_mark, average_mark, is_published, published_at",
          )
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .eq("is_published", true),
        callCertificateApi("GET"),
      ]);

      const databaseResponses = [
        categoryResponse,
        teamResponse,
        studentResponse,
        programmeResponse,
        registrationResponse,
        resultResponse,
      ];
      const databaseError = databaseResponses.find((item) => item.error)?.error;
      if (databaseError) throw new Error(databaseError.message);

      setCategories((categoryResponse.data || []) as Category[]);
      setTeams((teamResponse.data || []) as Team[]);
      setStudents((studentResponse.data || []) as Student[]);
      setProgrammes((programmeResponse.data || []) as Programme[]);
      setRegistrations((registrationResponse.data || []) as Registration[]);
      setResults((resultResponse.data || []) as ResultItem[]);
      setSettings({
        ...DEFAULT_SETTINGS,
        ...(certificateResponse.settings || {}),
        font_family: normalizeFontFamily(
          certificateResponse.settings?.font_family,
        ),
        preview_template_url:
          certificateResponse.settings?.preview_template_url || null,
        preview_template_path:
          certificateResponse.settings?.preview_template_path || null,
        public_positions: normalizePublicPositions(
          certificateResponse.settings?.public_positions,
        ),
        text_x_mm: safeNumber(
          certificateResponse.settings?.text_x_mm,
          DEFAULT_SETTINGS.text_x_mm,
        ),
        text_y_mm: safeNumber(
          certificateResponse.settings?.text_y_mm,
          DEFAULT_SETTINGS.text_y_mm,
        ),
        text_width_mm: safeNumber(
          certificateResponse.settings?.text_width_mm,
          DEFAULT_SETTINGS.text_width_mm,
        ),
        font_size_pt: safeNumber(
          certificateResponse.settings?.font_size_pt,
          DEFAULT_SETTINGS.font_size_pt,
        ),
        line_height: safeNumber(
          certificateResponse.settings?.line_height,
          DEFAULT_SETTINGS.line_height,
        ),
      });
      setIssuedCertificates(
        (certificateResponse.certificates || []) as IssuedCertificate[],
      );
    } catch (loadError: any) {
      setError(loadError?.message || "Unable to load certificates.");
    } finally {
      setIsLoading(false);
    }
  }

  function eventDateText() {
    if (!eventInfo?.start_date && !eventInfo?.end_date) return "the event date";
    if (eventInfo.start_date === eventInfo.end_date || !eventInfo.end_date) {
      return formatDate(eventInfo.start_date);
    }
    return `${formatDate(eventInfo.start_date)} to ${formatDate(
      eventInfo.end_date,
    )}`;
  }

  function buildMessage(candidate: CertificateCandidate) {
    const replacements: Record<string, string> = {
      "{student_name}": candidate.student.name,
      "{organization_name}": organization?.name || "",
      "{grade}": candidate.result.grade || "",
      "{programme_name}": candidate.programme.name,
      "{event_title}": eventInfo?.title || "",
      "{event_date}": eventDateText(),
      "{venue}": eventInfo?.venue || organization?.place || "the event venue",
      "{category_name}": candidate.categoryName,
      "{team_name}": candidate.teamName,
      "{group_name}": candidate.groupName,
      "{position}": positionLabel(candidate.result.position),
      "{pronoun}": pronounForGender(candidate.student.gender),
    };

    return Object.entries(replacements).reduce(
      (text, [token, value]) => text.split(token).join(value),
      settings.message_template || DEFAULT_MESSAGE_TEMPLATE,
    );
  }

  function openPending(candidate: CertificateCandidate) {
    setSelection({ mode: "pending", candidate, issued: null });
    setMessageText(buildMessage(candidate));
    setError("");
    setMessage("");
  }

  function openIssued(certificate: IssuedCertificate) {
    const candidate = candidateMap.get(
      `${certificate.result_id}:${certificate.student_id}`,
    );
    setSelection({
      mode: "issued",
      candidate: candidate || null,
      issued: certificate,
    });
    setMessageText(certificate.message_text);
    setError("");
    setMessage("");
  }

  function openCertificatePrintWindow() {
    const printWindow = window.open(
      "",
      "_blank",
      "popup=yes,width=1200,height=850",
    );

    if (!printWindow) {
      setError(
        "The print window was blocked. Allow pop-ups for this website and try again.",
      );
      return null;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Preparing Certificates</title>
</head>
<body style="font-family:Arial,sans-serif;padding:32px">
  Preparing certificate print...
</body>
</html>`);
    printWindow.document.close();

    return printWindow;
  }

  function printCertificateMessages(
    printWindow: Window,
    messages: string[],
  ) {
    const safeFontFamily = normalizeFontFamily(settings.font_family).replace(
      /[<>{};]/g,
      "",
    );

    const pages = messages
      .map((certificateMessage, index) => {
        const safeMessage = escapeHtml(certificateMessage).replace(
          /\n/g,
          "<br />",
        );

        return `<section class="certificate-page${
          index === messages.length - 1 ? " last-page" : ""
        }">
  <div class="certificate-message">${safeMessage}</div>
</section>`;
      })
      .join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Merit Certificates</title>
  <link rel="stylesheet" href="${GOOGLE_FONT_STYLESHEET_URL}" />
  <style>
    ${CUSTOM_FONT_FACE_CSS}

    @page {
      size: A4 landscape;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: white;
    }

    .certificate-page {
      position: relative;
      width: 297mm;
      height: 210mm;
      overflow: hidden;
      background: white;
      page-break-after: always;
      break-after: page;
    }

    .certificate-page.last-page {
      page-break-after: auto;
      break-after: auto;
    }

    .certificate-message {
      position: absolute;
      left: ${settings.text_x_mm}mm;
      top: ${settings.text_y_mm}mm;
      width: ${settings.text_width_mm}mm;
      margin: 0;
      padding: 0;
      color: ${settings.text_color};
      font-family: ${safeFontFamily};
      font-size: ${settings.font_size_pt}pt;
      line-height: ${settings.line_height};
      text-align: ${settings.text_align};
      white-space: normal;
      overflow-wrap: anywhere;
    }

    @media screen {
      body {
        background: #d1d5db;
        padding: 8mm 0;
      }

      .certificate-page {
        margin: 0 auto 6mm;
        box-shadow: 0 1px 5px rgba(15, 23, 42, 0.35);
      }
    }

    @media print {
      html,
      body {
        width: 297mm;
        background: white;
      }

      .certificate-page {
        margin: 0;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  ${pages}
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();

    window.setTimeout(async () => {
      try {
        await printWindow.document.fonts?.ready;
      } catch {
        // Printing still works with the configured fallback fonts.
      }

      printWindow.focus();
      printWindow.print();
    }, 250);
  }

  function mergeIssuedCertificates(
    current: IssuedCertificate[],
    additions: IssuedCertificate[],
  ) {
    const map = new Map<string, IssuedCertificate>();

    [...additions, ...current].forEach((certificate) => {
      map.set(certificate.id, certificate);
    });

    return Array.from(map.values());
  }

  async function saveSettingsPayload(nextSettings: CertificateSettings) {
    const payload = await callCertificateApi("PUT", nextSettings);
    const savedSettings = {
      ...DEFAULT_SETTINGS,
      ...(payload.settings || {}),
      font_family: normalizeFontFamily(payload.settings?.font_family),
      preview_template_url:
        payload.settings?.preview_template_url || null,
      preview_template_path:
        payload.settings?.preview_template_path || null,
    } as CertificateSettings;

    setSettings(savedSettings);
    return savedSettings;
  }

  async function uploadPreviewTemplate(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!organization || !eventInfo) {
      setError("Organization or event information is missing.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Choose a PNG, JPG or WebP certificate image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The certificate template image must be smaller than 10 MB.");
      return;
    }

    setIsUploadingPreviewTemplate(true);
    setError("");
    setMessage("");

    try {
      const uploadedAsset = await uploadAdminStorageAsset({
        file,
        assetType: "certificate_preview",
      });
      const previousPath = settings.preview_template_path;
      const previousUrl = settings.preview_template_url;
      const nextSettings: CertificateSettings = {
        ...settings,
        preview_template_url: uploadedAsset.publicUrl,
        preview_template_path: uploadedAsset.path,
      };

      try {
        await saveSettingsPayload(nextSettings);
      } catch (settingsError) {
        await deleteAdminStorageAsset({
          bucket: uploadedAsset.bucket,
          path: uploadedAsset.path,
        }).catch(() => undefined);
        throw settingsError;
      }

      if (previousPath || previousUrl) {
        await deleteAdminStorageAsset({
          bucket: "poster-templates",
          path: previousPath,
          url: previousUrl,
        });
      }

      setMessage(
        "Certificate preview template added. It will not be included in printing.",
      );
    } catch (uploadError: any) {
      setError(
        uploadError?.message ||
          "Unable to upload the certificate preview template.",
      );
    } finally {
      setIsUploadingPreviewTemplate(false);
    }
  }

  async function removePreviewTemplate() {
    if (!settings.preview_template_url) return;

    const confirmed = window.confirm(
      "Remove the certificate image from the preview? This will not affect issued certificates.",
    );
    if (!confirmed) return;

    setIsRemovingPreviewTemplate(true);
    setError("");
    setMessage("");

    const previousPath = settings.preview_template_path;

    try {
      const nextSettings: CertificateSettings = {
        ...settings,
        preview_template_url: null,
        preview_template_path: null,
      };

      await saveSettingsPayload(nextSettings);

      await deleteAdminStorageAsset({
        bucket: "poster-templates",
        path: previousPath,
        url: settings.preview_template_url,
      });

      setMessage("Certificate preview template removed.");
    } catch (removeError: any) {
      setError(
        removeError?.message ||
          "Unable to remove the certificate preview template.",
      );
    } finally {
      setIsRemovingPreviewTemplate(false);
    }
  }

  async function saveSettings() {
    setIsSavingSettings(true);
    setError("");
    setMessage("");

    try {
      await saveSettingsPayload(settings);
      setMessage("Certificate wording and print position saved.");
    } catch (saveError: any) {
      setError(saveError?.message || "Unable to save certificate settings.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function issueAndPrint() {
    if (!selection || selection.mode !== "pending") return;
    if (!messageText.trim()) {
      setError("Certificate message cannot be empty.");
      return;
    }

    const printWindow = openCertificatePrintWindow();
    if (!printWindow) return;

    setIsIssuing(true);
    setError("");
    setMessage("");

    try {
      const payload = await callCertificateApi("POST", {
        result_id: selection.candidate.result.id,
        student_id: selection.candidate.student.id,
        message_text: messageText,
      });
      const certificate = payload.certificate as IssuedCertificate;
      setIssuedCertificates((current) =>
        mergeIssuedCertificates(current, [certificate]),
      );
      setSelection({
        mode: "issued",
        candidate: selection.candidate,
        issued: certificate,
      });
      setActiveTab("issued");
      setMessage(
        "Certificate marked as issued. It is removed from the Pending list.",
      );
      printCertificateMessages(printWindow, [messageText]);
    } catch (issueError: any) {
      printWindow.close();

      const existing = issueError?.payload?.certificate as
        | IssuedCertificate
        | undefined;
      if (existing) {
        setIssuedCertificates((current) =>
          mergeIssuedCertificates(current, [existing]),
        );
        openIssued(existing);
      }
      setError(issueError?.message || "Unable to issue this certificate.");
    } finally {
      setIsIssuing(false);
    }
  }

  async function issueEntireGroupAndPrint() {
    if (
      !selection ||
      selection.mode !== "pending" ||
      selection.candidate.programme.programme_type !== "group"
    ) {
      return;
    }

    if (selectedPendingGroupMembers.length === 0) {
      setError("There are no pending group-member certificates.");
      return;
    }

    const printWindow = openCertificatePrintWindow();
    if (!printWindow) return;

    setIsIssuing(true);
    setError("");
    setMessage("");

    const createdCertificates: IssuedCertificate[] = [];
    const certificateMessages: string[] = [];

    try {
      for (const candidate of selectedPendingGroupMembers) {
        const memberMessage =
          candidate.key === selection.candidate.key
            ? messageText
            : buildMessage(candidate);

        const payload = await callCertificateApi("POST", {
          result_id: candidate.result.id,
          student_id: candidate.student.id,
          message_text: memberMessage,
        });

        createdCertificates.push(
          payload.certificate as IssuedCertificate,
        );
        certificateMessages.push(memberMessage);
      }

      setIssuedCertificates((current) =>
        mergeIssuedCertificates(current, createdCertificates),
      );

      const selectedCertificate =
        createdCertificates.find(
          (certificate) =>
            certificate.student_id === selection.candidate.student.id,
        ) || createdCertificates[0];

      if (selectedCertificate) {
        setSelection({
          mode: "issued",
          candidate: selection.candidate,
          issued: selectedCertificate,
        });
      }

      setActiveTab("issued");
      setMessage(
        `${createdCertificates.length} group-member certificates were marked as issued and prepared for printing.`,
      );
      printCertificateMessages(printWindow, certificateMessages);
    } catch (groupError: any) {
      if (createdCertificates.length > 0) {
        setIssuedCertificates((current) =>
          mergeIssuedCertificates(current, createdCertificates),
        );
        printCertificateMessages(printWindow, certificateMessages);
        setError(
          `${createdCertificates.length} certificate(s) were issued before an error occurred. ${groupError?.message || ""}`.trim(),
        );
      } else {
        printWindow.close();
        setError(
          groupError?.message ||
            "Unable to issue the group-member certificates.",
        );
      }
    } finally {
      setIsIssuing(false);
    }
  }

  async function saveAndReprint() {
    if (!selection || selection.mode !== "issued") return;
    if (!messageText.trim()) {
      setError("Certificate message cannot be empty.");
      return;
    }

    const printWindow = openCertificatePrintWindow();
    if (!printWindow) return;

    setIsIssuing(true);
    setError("");
    setMessage("");

    try {
      const payload = await callCertificateApi("PATCH", {
        certificate_id: selection.issued.id,
        message_text: messageText,
      });
      const certificate = payload.certificate as IssuedCertificate;
      setIssuedCertificates((current) =>
        current.map((item) =>
          item.id === certificate.id ? certificate : item,
        ),
      );
      setSelection({
        ...selection,
        issued: certificate,
      });
      setMessage("Certificate wording updated. Reprint uses the same record.");
      printCertificateMessages(printWindow, [messageText]);
    } catch (reprintError: any) {
      printWindow.close();
      setError(reprintError?.message || "Unable to reprint this certificate.");
    } finally {
      setIsIssuing(false);
    }
  }


  function startMessageDrag(event: PointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    const paper = previewPaperRef.current;
    if (!paper) return;

    const paperRect = paper.getBoundingClientRect();
    const messageRect = event.currentTarget.getBoundingClientRect();

    messageDragRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startXmm: settings.text_x_mm,
      startYmm: settings.text_y_mm,
      messageHeightMm:
        (messageRect.height / Math.max(1, paperRect.height)) *
        A4_LANDSCAPE_HEIGHT_MM,
    };

    setIsDraggingMessage(true);
    window.addEventListener("pointermove", handleMessageDrag);
    window.addEventListener("pointerup", stopMessageDrag);
  }

  function handleMessageDrag(event: globalThis.PointerEvent) {
    const drag = messageDragRef.current;
    const paper = previewPaperRef.current;

    if (!drag || !paper) return;

    const paperRect = paper.getBoundingClientRect();
    const deltaXmm =
      ((event.clientX - drag.startClientX) / Math.max(1, paperRect.width)) *
      A4_LANDSCAPE_WIDTH_MM;
    const deltaYmm =
      ((event.clientY - drag.startClientY) / Math.max(1, paperRect.height)) *
      A4_LANDSCAPE_HEIGHT_MM;

    const maximumX = Math.max(
      0,
      A4_LANDSCAPE_WIDTH_MM - settings.text_width_mm,
    );
    const maximumY = Math.max(
      0,
      A4_LANDSCAPE_HEIGHT_MM - drag.messageHeightMm,
    );

    setSettings((current) => ({
      ...current,
      text_x_mm: Number(
        clamp(drag.startXmm + deltaXmm, 0, maximumX).toFixed(1),
      ),
      text_y_mm: Number(
        clamp(drag.startYmm + deltaYmm, 0, maximumY).toFixed(1),
      ),
    }));
  }

  function stopMessageDrag() {
    messageDragRef.current = null;
    setIsDraggingMessage(false);
    window.removeEventListener("pointermove", handleMessageDrag);
    window.removeEventListener("pointerup", stopMessageDrag);
  }

  function nudgeMessage(event: KeyboardEvent<HTMLDivElement>) {
    const movement =
      event.shiftKey ? 2 : 0.5;

    let deltaX = 0;
    let deltaY = 0;

    if (event.key === "ArrowLeft") deltaX = -movement;
    if (event.key === "ArrowRight") deltaX = movement;
    if (event.key === "ArrowUp") deltaY = -movement;
    if (event.key === "ArrowDown") deltaY = movement;

    if (deltaX === 0 && deltaY === 0) return;

    event.preventDefault();

    setSettings((current) => ({
      ...current,
      text_x_mm: Number(
        clamp(
          current.text_x_mm + deltaX,
          0,
          Math.max(
            0,
            A4_LANDSCAPE_WIDTH_MM - current.text_width_mm,
          ),
        ).toFixed(1),
      ),
      text_y_mm: Number(
        clamp(
          current.text_y_mm + deltaY,
          0,
          A4_LANDSCAPE_HEIGHT_MM - 8,
        ).toFixed(1),
      ),
    }));
  }

  function resetMessagePosition() {
    setSettings((current) => ({
      ...current,
      text_x_mm: DEFAULT_SETTINGS.text_x_mm,
      text_y_mm: DEFAULT_SETTINGS.text_y_mm,
      text_width_mm: DEFAULT_SETTINGS.text_width_mm,
    }));
  }

  function resetFilters() {
    setSearch("");
    setProgrammeFilter("all");
    setGradeFilter("all");
  }

  const previewTextStyle: CSSProperties = {
    left: `${(settings.text_x_mm / A4_LANDSCAPE_WIDTH_MM) * 100}%`,
    top: `${(settings.text_y_mm / A4_LANDSCAPE_HEIGHT_MM) * 100}%`,
    width: `${(settings.text_width_mm / A4_LANDSCAPE_WIDTH_MM) * 100}%`,
    color: settings.text_color,
    fontFamily: settings.font_family,
    fontSize: `${Math.max(8, settings.font_size_pt * 0.82)}px`,
    lineHeight: settings.line_height,
    textAlign: settings.text_align,
    whiteSpace: "pre-wrap",
  };

  return (
    <AdminShell
      title="Merit Certificates"
      subtitle="Print only the editable certificate message on your pre-printed A4 landscape certificate."
      actions={
        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      }
    >


      <div className="space-y-5">
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

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            icon={<Award size={20} />}
            label="Pending"
            value={pendingCandidates.length}
          />
          <MetricCard
            icon={<CheckCircle2 size={20} />}
            label="Issued"
            value={issuedCertificates.length}
          />
          <MetricCard
            icon={<FileText size={20} />}
            label="Published Results"
            value={results.length}
          />
          <MetricCard
            icon={<Printer size={20} />}
            label="Paper"
            value="A4 Landscape"
            small
          />
        </div>

        <section className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <button
            type="button"
            onClick={() => setShowSettings((value) => !value)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
          >
            <div>
              <h2 className="text-lg font-black text-slate-950">
                Certificate Settings
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Manage Student Lookup eligibility, certificate wording and print alignment. FestEazy still prints only the message on pre-printed certificates.
              </p>
            </div>
            <ChevronDown
              size={19}
              className={`shrink-0 text-slate-500 transition ${
                showSettings ? "rotate-180" : ""
              }`}
            />
          </button>

          {showSettings && (
            <div className="border-t border-slate-100 p-5">
              <label className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                Default Message
              </label>
              <textarea
                value={settings.message_template}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    message_template: event.target.value,
                  }))
                }
                rows={7}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {MESSAGE_TOKENS.map((token) => (
                  <button
                    key={token}
                    type="button"
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        message_template: `${current.message_template}${token}`,
                      }))
                    }
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-600"
                  >
                    {token}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      Student Lookup Certificate Eligibility
                    </p>
                    <p className="mt-1 max-w-2xl text-xs font-bold leading-5 text-slate-500">
                      Students can download a certificate from the public Student Lookup only for the selected published positions. The default is First and Second place.
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-emerald-200">
                    {settings.public_positions.length} enabled
                  </span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {[
                    { value: 1, label: "1st Place" },
                    { value: 2, label: "2nd Place" },
                    { value: 3, label: "3rd Place" },
                  ].map((position) => {
                    const checked = settings.public_positions.includes(position.value);
                    return (
                      <label
                        key={position.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-black transition ${
                          checked
                            ? "border-emerald-300 bg-white text-emerald-700 shadow-sm"
                            : "border-slate-200 bg-white/70 text-slate-500"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setSettings((current) => ({
                              ...current,
                              public_positions: event.target.checked
                                ? Array.from(
                                    new Set([
                                      ...current.public_positions,
                                      position.value,
                                    ]),
                                  ).sort((a, b) => a - b)
                                : current.public_positions.filter(
                                    (item) => item !== position.value,
                                  ),
                            }))
                          }
                          className="h-5 w-5 accent-emerald-600"
                        />
                        {position.label}
                      </label>
                    );
                  })}
                </div>

                <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">
                  Leave all positions unchecked to disable public certificate downloads without affecting Admin certificate printing.
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SettingsNumber
                  label="Left Position (mm)"
                  value={settings.text_x_mm}
                  min={0}
                  max={280}
                  step={1}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      text_x_mm: value,
                    }))
                  }
                />
                <SettingsNumber
                  label="Top Position (mm)"
                  value={settings.text_y_mm}
                  min={0}
                  max={195}
                  step={1}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      text_y_mm: value,
                    }))
                  }
                />
                <SettingsNumber
                  label="Text Width (mm)"
                  value={settings.text_width_mm}
                  min={40}
                  max={290}
                  step={1}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      text_width_mm: value,
                    }))
                  }
                />
                <SettingsNumber
                  label="Font Size (pt)"
                  value={settings.font_size_pt}
                  min={6}
                  max={32}
                  step={0.5}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      font_size_pt: value,
                    }))
                  }
                />
                <SettingsNumber
                  label="Line Height"
                  value={settings.line_height}
                  min={0.8}
                  max={3}
                  step={0.05}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      line_height: value,
                    }))
                  }
                />

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Text Colour
                  </label>
                  <input
                    type="color"
                    value={settings.text_color}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        text_color: event.target.value,
                      }))
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white p-2"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Alignment
                  </label>
                  <select
                    value={settings.text_align}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        text_align: event.target.value as any,
                      }))
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
                  >
                    <option value="left">Left</option>
                    <option value="center">Centre</option>
                    <option value="right">Right</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    Font
                  </label>
                  <FontFamilySelect
                    value={settings.font_family}
                    onChange={(fontFamily) =>
                      setSettings((current) => ({
                        ...current,
                        font_family: fontFamily,
                      }))
                    }
                    includeGeorgia
                    ariaLabel="Certificate font family"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={saveSettings}
                  disabled={isSavingSettings}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {isSavingSettings ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  Save Settings
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...DEFAULT_SETTINGS,
                      preview_template_url: current.preview_template_url,
                      preview_template_path: current.preview_template_path,
                    }))
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
                >
                  <RotateCcw size={16} />
                  Reset Defaults
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("pending")}
                className={`rounded-lg px-4 py-2 text-sm font-black transition ${
                  activeTab === "pending"
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Pending ({pendingCandidates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("issued")}
                className={`rounded-lg px-4 py-2 text-sm font-black transition ${
                  activeTab === "issued"
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-500"
                }`}
              >
                Issued ({issuedCertificates.length})
              </button>
            </div>

            <div className="grid flex-1 gap-3 sm:grid-cols-3 lg:max-w-3xl">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search student or programme..."
                  className="h-11 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm font-bold outline-none"
                />
              </div>
              <select
                value={programmeFilter}
                onChange={(event) => setProgrammeFilter(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
              >
                <option value="all">All Programmes</option>
                {programmes.map((programme) => (
                  <option key={programme.id} value={programme.id}>
                    {programme.name}
                  </option>
                ))}
              </select>
              <select
                value={gradeFilter}
                onChange={(event) => setGradeFilter(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
              >
                <option value="all">All Grades</option>
                {gradeOptions.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade} Grade
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="flex min-h-72 items-center justify-center rounded-[1.7rem] border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-sm font-black text-slate-500">
              <Loader2 size={22} className="animate-spin text-violet-600" />
              Loading merit certificates...
            </div>
          </div>
        ) : (
          <div className="grid min-w-0 gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
            <section className="min-w-0 rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-950">
                  {activeTab === "pending"
                    ? "Ready to Print"
                    : "Issued Certificates"}
                </h2>
                {(search || programmeFilter !== "all" || gradeFilter !== "all") && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-black text-violet-700"
                  >
                    Reset filters
                  </button>
                )}
              </div>

              <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
                {activeTab === "pending" ? (
                  visiblePending.length ? (
                    visiblePending.map((candidate) => (
                      <CandidateCard
                        key={candidate.key}
                        candidate={candidate}
                        active={
                          selection?.mode === "pending" &&
                          selection.candidate.key === candidate.key
                        }
                        onClick={() => openPending(candidate)}
                      />
                    ))
                  ) : (
                    <EmptyState
                      title="No pending certificates"
                      text="Published graded results already issued will not appear here again."
                    />
                  )
                ) : visibleIssued.length ? (
                  visibleIssued.map((certificate) => (
                    <IssuedCard
                      key={certificate.id}
                      certificate={certificate}
                      active={
                        selection?.mode === "issued" &&
                        selection.issued.id === certificate.id
                      }
                      onClick={() => openIssued(certificate)}
                    />
                  ))
                ) : (
                  <EmptyState
                    title="No issued certificates"
                    text="Certificates appear here after Mark Issued & Print is used."
                  />
                )}
              </div>
            </section>

            <section className="min-w-0 rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 sm:p-5">
              {!selection ? (
                <div className="flex min-h-[520px] items-center justify-center text-center">
                  <div className="max-w-md">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
                      <Award size={30} />
                    </div>
                    <h2 className="mt-5 text-xl font-black text-slate-950">
                      Select a student
                    </h2>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                      Choose a pending certificate to edit its message before
                      printing, or choose an issued certificate to reprint it.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] ${
                          selection.mode === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {selection.mode === "pending" ? "Pending" : "Issued"}
                      </span>
                      <h2 className="mt-2 text-xl font-black text-slate-950">
                        {selection.mode === "pending"
                          ? selection.candidate.student.name
                          : selection.issued.locked_data?.student_name ||
                            "Issued Certificate"}
                      </h2>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {selection.mode === "pending"
                          ? `${selection.candidate.programme.name} • ${
                              selection.candidate.result.grade || "-"
                            } Grade`
                          : `${selection.issued.locked_data?.programme_name || "-"} • ${selection.issued.certificate_number}`}
                      </p>

                      {selection.mode === "pending" &&
                        selection.candidate.programme.programme_type ===
                          "group" && (
                          <p className="mt-2 inline-flex rounded-lg bg-cyan-50 px-2.5 py-1 text-[11px] font-black text-cyan-700">
                            Group: {selection.candidate.groupName || "Group"} •{" "}
                            {selectedPendingGroupMembers.length} pending member
                            {selectedPendingGroupMembers.length === 1 ? "" : "s"}
                          </p>
                        )}
                    </div>

                    {selection.mode === "issued" && (
                      <div className="rounded-xl bg-slate-50 px-3 py-2 text-right text-xs font-bold text-slate-500">
                        Printed {selection.issued.print_count} time
                        {selection.issued.print_count === 1 ? "" : "s"}
                        <br />
                        {formatShortDate(selection.issued.last_printed_at)}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      <Edit3 size={14} />
                      Editable Printed Message
                    </label>
                    <textarea
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      rows={8}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                    />
                    <p className="mt-2 text-xs font-bold leading-5 text-slate-400">
                      This box shows the final filled message for the selected
                      student. The saved Default Wording uses tokens such as
                      {" {student_name} "}, {" {organization_name} "},
                      {" {programme_name} "} and {" {grade} "}. For group
                      programmes, each member receives a separate page and
                      {" {student_name} "} is replaced with that member&apos;s
                      name automatically.
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          A4 Landscape Preview
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                          <Move size={13} />
                          Drag the blue message box. Use arrow keys for fine adjustment.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={previewTemplateInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={uploadPreviewTemplate}
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => previewTemplateInputRef.current?.click()}
                          disabled={isUploadingPreviewTemplate}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-[10px] font-black text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
                        >
                          {isUploadingPreviewTemplate ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : settings.preview_template_url ? (
                            <ImagePlus size={12} />
                          ) : (
                            <Upload size={12} />
                          )}
                          {settings.preview_template_url
                            ? "Change Template"
                            : "Add Certificate Template"}
                        </button>

                        {settings.preview_template_url && (
                          <button
                            type="button"
                            onClick={removePreviewTemplate}
                            disabled={isRemovingPreviewTemplate}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[10px] font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            {isRemovingPreviewTemplate ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                            Remove
                          </button>
                        )}

                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-600">
                          Printing: message only
                        </span>
                        <button
                          type="button"
                          onClick={resetMessagePosition}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-black text-slate-600 transition hover:bg-slate-50"
                        >
                          <RotateCcw size={12} />
                          Reset position
                        </button>
                        <button
                          type="button"
                          onClick={saveSettings}
                          disabled={isSavingSettings}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-violet-700 disabled:opacity-60"
                        >
                          {isSavingSettings ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Save size={12} />
                          )}
                          Save position
                        </button>
                      </div>
                    </div>
                    <div className="overflow-auto rounded-2xl bg-slate-100 p-3">
                      <div
                        ref={previewPaperRef}
                        className="relative mx-auto w-full max-w-[900px] overflow-hidden bg-white shadow-xl"
                        style={{ aspectRatio: "297 / 210" }}
                      >
                        {settings.preview_template_url ? (
                          <img
                            src={settings.preview_template_url}
                            alt="Certificate preview template"
                            className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
                            draggable={false}
                          />
                        ) : (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white">
                            <div className="max-w-xs text-center">
                              <ImagePlus size={30} className="mx-auto text-slate-300" />
                              <p className="mt-2 text-xs font-black text-slate-400">
                                Add the blank certificate image to align the message accurately.
                              </p>
                              <p className="mt-1 text-[10px] font-bold text-slate-300">
                                The image is for preview only and will not print.
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="pointer-events-none absolute inset-3 rounded-lg border border-dashed border-slate-300/70" />
                        <div
                          role="button"
                          tabIndex={0}
                          aria-label="Draggable certificate message"
                          onPointerDown={startMessageDrag}
                          onKeyDown={nudgeMessage}
                          className={`absolute rounded border-2 border-dashed px-1 outline-none transition ${
                            isDraggingMessage
                              ? "cursor-grabbing border-violet-500 bg-violet-100/40 shadow-lg ring-4 ring-violet-200/60"
                              : "cursor-grab border-blue-300 bg-blue-50/25 hover:border-violet-400 hover:bg-violet-50/30 focus:border-violet-500 focus:ring-4 focus:ring-violet-200/60"
                          }`}
                          style={{
                            ...previewTextStyle,
                            touchAction: "none",
                            userSelect: "none",
                          }}
                          title="Drag to position. Arrow keys move 0.5 mm; Shift + arrow moves 2 mm."
                        >
                          <span className="pointer-events-none absolute -top-7 left-0 inline-flex items-center gap-1 rounded-md bg-slate-950 px-2 py-1 text-[9px] font-black text-white shadow-sm">
                            <Move size={10} />
                            Drag message
                          </span>
                          {messageText}
                        </div>

                        {settings.preview_template_url && (
                          <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-slate-950/75 px-2 py-1 text-[9px] font-black text-white">
                            Preview template — not printed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    {selection.mode === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={issueAndPrint}
                          disabled={isIssuing || !messageText.trim()}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/20 disabled:opacity-60"
                        >
                          {isIssuing ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Printer size={18} />
                          )}
                          {selection.candidate.programme.programme_type ===
                          "group"
                            ? "Print This Member"
                            : "Mark Issued & Print"}
                        </button>

                        {selection.candidate.programme.programme_type ===
                          "group" &&
                          selectedPendingGroupMembers.length > 1 && (
                            <button
                              type="button"
                              onClick={issueEntireGroupAndPrint}
                              disabled={isIssuing}
                              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                            >
                              {isIssuing ? (
                                <Loader2
                                  size={18}
                                  className="animate-spin"
                                />
                              ) : (
                                <Printer size={18} />
                              )}
                              Print Entire Group (
                              {selectedPendingGroupMembers.length})
                            </button>
                          )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={saveAndReprint}
                        disabled={isIssuing || !messageText.trim()}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/20 disabled:opacity-60"
                      >
                        {isIssuing ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Printer size={18} />
                        )}
                        Save Edit & Reprint
                      </button>
                    )}
                  </div>

                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs font-bold leading-5 text-amber-800">
                    The browser cannot confirm whether a physical printer
                    completed the page. FestEazy marks it as issued when you
                    press the print button, preventing it from returning to the
                    Pending list.
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

    </AdminShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
  small = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-violet-600">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
          {label}
        </span>
      </div>
      <div
        className={`mt-2 font-black tracking-[-0.04em] text-slate-950 ${
          small ? "text-lg" : "text-2xl"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  active,
  onClick,
}: {
  candidate: CertificateCandidate;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-violet-300 bg-violet-50 ring-2 ring-violet-100"
          : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {candidate.student.name}
          </p>
          <p className="mt-1 truncate text-xs font-bold text-slate-500">
            {candidate.programme.name}
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700">
          {candidate.result.grade || "-"} Grade
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
        {candidate.student.chest_no && (
          <span className="rounded-lg bg-slate-100 px-2 py-1">
            Chest {candidate.student.chest_no}
          </span>
        )}
        <span className="rounded-lg bg-slate-100 px-2 py-1">
          {candidate.categoryName}
        </span>
        {candidate.teamName && (
          <span className="rounded-lg bg-slate-100 px-2 py-1">
            {candidate.teamName}
          </span>
        )}
        {candidate.groupName && (
          <span className="rounded-lg bg-cyan-50 px-2 py-1 text-cyan-700">
            Group: {candidate.groupName}
          </span>
        )}
      </div>
    </button>
  );
}

function IssuedCard({
  certificate,
  active,
  onClick,
}: {
  certificate: IssuedCertificate;
  active: boolean;
  onClick: () => void;
}) {
  const locked = certificate.locked_data || {};
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        active
          ? "border-emerald-300 bg-emerald-50 ring-2 ring-emerald-100"
          : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">
            {locked.student_name || "Student"}
          </p>
          <p className="mt-1 truncate text-xs font-bold text-slate-500">
            {locked.programme_name || "Programme"}
          </p>
        </div>
        <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500">
        <span>{certificate.certificate_number}</span>
        <span className="inline-flex items-center gap-1">
          <Clock3 size={11} />
          {formatShortDate(certificate.issued_at)}
        </span>
      </div>
    </button>
  );
}

function SettingsNumber({
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
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
      />
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center">
      <Award size={28} className="mx-auto text-slate-300" />
      <p className="mt-3 text-sm font-black text-slate-700">{title}</p>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-400">{text}</p>
    </div>
  );
}