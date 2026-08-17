/* eslint-disable */
"use client";

import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Clock,
  Download,
  Loader2,
  MapPin,
  Printer,
  RotateCcw,
  Search,
  Share2,
  School,
  Sparkles,
  Trophy,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CUSTOM_FONT_FACE_CSS,
  GOOGLE_FONT_STYLESHEET_URL,
} from "@/app/fonts";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Organization = {
  id: string;
  name: string;
  slug: string | null;
  place: string | null;
  logo_url: string | null;
  status: string | null;
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
  show_student_search: boolean | null;
};

type LookupStudent = {
  id: string;
  name: string;
  gender: string;
  categoryName: string;
  className: string;
  divisionName: string;
  teamName: string;
  teamColor: string | null;
};

type LookupSchedule = {
  stageName: string;
  date: string | null;
  startTime: string;
  endTime: string;
};

type LookupProgramme = {
  registrationId: string;
  programmeId: string;
  name: string;
  programmeType: string;
  stageType: string;
  categoryName: string;
  genderScope: string;
  groupName: string | null;
  sortOrder: number;
  schedule: LookupSchedule | null;
};

type LookupCertificate = {
  id: string;
  resultId: string;
  programmeId: string;
  programmeName: string;
  programmeType: string;
  categoryName: string;
  groupName: string | null;
  position: number;
  positionLabel: string;
  grade: string;
  publishedAt: string | null;
  messageText?: string;
};

type CertificateDownloadSettings = {
  templateUrl: string | null;
  textXmm: number;
  textYmm: number;
  textWidthMm: number;
  fontSizePt: number;
  lineHeight: number;
  textColor: string;
  textAlign: "left" | "center" | "right";
  fontFamily: string;
  eligiblePositions: number[];
  studentNameXmm: number;
  studentNameYmm: number;
  studentNameWidthMm: number;
  studentNameFontSizePt: number;
  studentNameLineHeight: number;
  studentNameTextColor: string;
  studentNameTextAlign: "left" | "center" | "right";
  studentNameFontFamily: string;
};

type LookupResponse = {
  success: true;
  student: LookupStudent;
  programmes: LookupProgramme[];
  certificates: LookupCertificate[];
  certificateSettings?: CertificateDownloadSettings | null;
};

type NamedOption = {
  id: string;
  name: string;
};

type GenderOption = {
  value: string;
  label: string;
};

type StudentOption = {
  id: string;
  name: string;
  divisionName: string;
};

type Theme = {
  primary: string;
  dark: string;
  soft: string;
  border: string;
  hero: string;
};

const DEFAULT_SETTINGS: EventSettings = {
  organization_id: "",
  event_id: "",
  theme_color: "emerald",
  show_student_search: true,
};

const DEFAULT_CERTIFICATE_DOWNLOAD_SETTINGS: CertificateDownloadSettings = {
  templateUrl: null,
  textXmm: 46,
  textYmm: 73,
  textWidthMm: 205,
  fontSizePt: 11.5,
  lineHeight: 1.55,
  textColor: "#4f86a5",
  textAlign: "center",
  fontFamily: "Arial, Helvetica, sans-serif",
  eligiblePositions: [1, 2],
  studentNameXmm: 82,
  studentNameYmm: 73,
  studentNameWidthMm: 190,
  studentNameFontSizePt: 31,
  studentNameLineHeight: 1.05,
  studentNameTextColor: "#4b5563",
  studentNameTextAlign: "center",
  studentNameFontFamily: '"Great Vibes", "Brush Script MT", cursive',
};

function safeDownloadName(value: unknown) {
  return String(value || "certificate")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}


function escapeCertificateHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function certificateRichTextHtml(value: unknown) {
  return escapeCertificateHtml(value)
    .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

const CERTIFICATE_FONT_LINK_ID = "festeazy-certificate-font-link";
const CERTIFICATE_CUSTOM_FONT_STYLE_ID = "festeazy-certificate-custom-font-style";

function firstFontFamily(fontFamily: string) {
  return String(fontFamily || "Arial")
    .split(",")[0]
    .trim() || "Arial";
}

async function ensureCertificateFontsLoaded(
  studentNameFontFamily: string,
  studentNameFontSizePx: number,
  messageFontFamily: string,
  messageFontSizePx: number,
) {
  let customStyle = document.getElementById(
    CERTIFICATE_CUSTOM_FONT_STYLE_ID,
  ) as HTMLStyleElement | null;

  if (!customStyle) {
    customStyle = document.createElement("style");
    customStyle.id = CERTIFICATE_CUSTOM_FONT_STYLE_ID;
    customStyle.textContent = CUSTOM_FONT_FACE_CSS;
    document.head.appendChild(customStyle);
  }

  let fontLink = document.getElementById(
    CERTIFICATE_FONT_LINK_ID,
  ) as HTMLLinkElement | null;

  if (!fontLink) {
    fontLink = document.createElement("link");
    fontLink.id = CERTIFICATE_FONT_LINK_ID;
    fontLink.rel = "stylesheet";
    fontLink.href = GOOGLE_FONT_STYLESHEET_URL;
    document.head.appendChild(fontLink);

    await new Promise<void>((resolve) => {
      const done = () => resolve();
      fontLink!.addEventListener("load", done, { once: true });
      fontLink!.addEventListener("error", done, { once: true });
      window.setTimeout(done, 2500);
    });
  }

  if ("fonts" in document) {
    try {
      const studentFont = firstFontFamily(studentNameFontFamily);
      const messageFont = firstFontFamily(messageFontFamily);

      await Promise.all([
        (document as any).fonts.load(
          `400 ${Math.max(8, studentNameFontSizePx)}px ${studentFont}`,
        ),
        (document as any).fonts.load(
          `400 ${Math.max(8, messageFontSizePx)}px ${messageFont}`,
        ),
        (document as any).fonts.load(
          `700 ${Math.max(8, messageFontSizePx)}px ${messageFont}`,
        ),
      ]);
      await (document as any).fonts.ready;
    } catch {
      // Continue with the best available fallback font.
    }
  }
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function cleanChest(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/^#+/, "")
    .trim();
}

function normalizeStageType(value: unknown) {
  const normalized = normalizeText(value).replace(/[-\s]+/g, "_");
  return normalized.includes("off") ? "off_stage" : "stage";
}

function formatStageType(value: unknown) {
  return normalizeStageType(value) === "off_stage" ? "Off-stage" : "Stage";
}

function formatProgrammeType(value: unknown) {
  return normalizeText(value).includes("group") ? "Group" : "Individual";
}

function formatGender(value: unknown) {
  const normalized = normalizeText(value);
  if (normalized.includes("female") || normalized.includes("girl")) return "Girls";
  if (normalized.includes("male") || normalized.includes("boy")) return "Boys";
  return "All";
}

function formatDate(value: string | null) {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatEventDate(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) return "";
  if (startDate && (!endDate || startDate === endDate)) return formatDate(startDate);
  if (!startDate && endDate) return formatDate(endDate);
  return `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

function isPlanExpired(planEnd: string | null | undefined) {
  if (!planEnd) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(`${planEnd}T00:00:00`);
  endDate.setHours(0, 0, 0, 0);

  if (Number.isNaN(endDate.getTime())) return false;
  return endDate < today;
}

function getTheme(themeColor: string | null | undefined): Theme {
  const theme = normalizeText(themeColor);

  if (theme === "violet") {
    return {
      primary: "#7c3aed",
      dark: "#5b21b6",
      soft: "#f5f3ff",
      border: "#ddd6fe",
      hero: "linear-gradient(135deg, #5b21b6 0%, #7c3aed 55%, #a21caf 100%)",
    };
  }

  if (theme === "amber") {
    return {
      primary: "#d97706",
      dark: "#92400e",
      soft: "#fffbeb",
      border: "#fde68a",
      hero: "linear-gradient(135deg, #b45309 0%, #d97706 55%, #ea580c 100%)",
    };
  }

  if (theme === "slate") {
    // Intentionally avoids the old near-black #020617 hero.
    return {
      primary: "#475569",
      dark: "#334155",
      soft: "#f8fafc",
      border: "#cbd5e1",
      hero: "linear-gradient(135deg, #475569 0%, #64748b 58%, #334155 100%)",
    };
  }

  if (theme === "blue") {
    return {
      primary: "#2563eb",
      dark: "#1d4ed8",
      soft: "#eff6ff",
      border: "#bfdbfe",
      hero: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 55%, #0891b2 100%)",
    };
  }

  return {
    primary: "#059669",
    dark: "#047857",
    soft: "#ecfdf5",
    border: "#a7f3d0",
    hero: "linear-gradient(135deg, #065f46 0%, #059669 58%, #0f766e 100%)",
  };
}

function scheduleDateTime(schedule: LookupSchedule | null) {
  if (!schedule?.date || !schedule.startTime) return null;

  const [hours, minutes] = String(schedule.startTime)
    .split(":")
    .map((part) => Number(part));

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const date = new Date(`${schedule.date}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  date.setHours(hours, minutes, 0, 0);
  return date;
}

function scheduleStatus(schedule: LookupSchedule | null) {
  if (!schedule?.date) return "Not announced";

  const now = new Date();
  const start = scheduleDateTime(schedule);
  const scheduleDay = new Date(`${schedule.date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  scheduleDay.setHours(0, 0, 0, 0);

  if (scheduleDay.getTime() === today.getTime()) {
    if (start && start.getTime() < now.getTime()) return "Today";
    return "Today";
  }

  if (scheduleDay.getTime() > today.getTime()) return "Upcoming";
  return "Completed";
}

export default function ParentStudentProgrammeLookupPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug = String(Array.isArray(slugParam) ? slugParam[0] : slugParam || "")
    .trim()
    .toLowerCase();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [eventSettings, setEventSettings] =
    useState<EventSettings>(DEFAULT_SETTINGS);

  const [classes, setClasses] = useState<NamedOption[]>([]);
  const [genders, setGenders] = useState<GenderOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [student, setStudent] = useState<LookupStudent | null>(null);
  const [programmes, setProgrammes] = useState<LookupProgramme[]>([]);
  const [certificates, setCertificates] = useState<LookupCertificate[]>([]);
  const [certificateSettings, setCertificateSettings] =
    useState<CertificateDownloadSettings>(DEFAULT_CERTIFICATE_DOWNLOAD_SETTINGS);
  const [downloadingCertificateId, setDownloadingCertificateId] = useState("");
  const [certificateToVerify, setCertificateToVerify] =
    useState<LookupCertificate | null>(null);
  const [certificateChestInput, setCertificateChestInput] = useState("");
  const [certificateVerifyError, setCertificateVerifyError] = useState("");
  const [isVerifyingCertificate, setIsVerifyingCertificate] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [pageError, setPageError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [message, setMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (slug) void loadPublicContext();
  }, [slug]);

  const theme = useMemo(
    () => getTheme(eventSettings.theme_color),
    [eventSettings.theme_color],
  );

  const themeStyle = {
    "--lookup-primary": theme.primary,
    "--lookup-dark": theme.dark,
    "--lookup-soft": theme.soft,
    "--lookup-border": theme.border,
  } as CSSProperties;

  const stageProgrammes = useMemo(
    () =>
      programmes.filter(
        (item) => normalizeStageType(item.stageType) === "stage",
      ),
    [programmes],
  );

  const offStageProgrammes = useMemo(
    () =>
      programmes.filter(
        (item) => normalizeStageType(item.stageType) === "off_stage",
      ),
    [programmes],
  );

  const groupCount = useMemo(
    () =>
      programmes.filter(
        (item) => formatProgrammeType(item.programmeType) === "Group",
      ).length,
    [programmes],
  );

  const nextProgramme = useMemo(() => {
    const now = new Date();

    return (
      programmes
        .filter((item) => item.schedule?.date && item.schedule?.startTime)
        .map((item) => ({ item, at: scheduleDateTime(item.schedule) }))
        .filter(
          (entry): entry is { item: LookupProgramme; at: Date } =>
            entry.at instanceof Date && entry.at.getTime() >= now.getTime(),
        )
        .sort((a, b) => a.at.getTime() - b.at.getTime())[0]?.item || null
    );
  }, [programmes]);

  async function lookupRequest(body: Record<string, unknown>) {
    const response = await fetch(
      `/api/public/event/${encodeURIComponent(slug)}/student-lookup`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || "Unable to load the student lookup.");
    }

    return payload;
  }

  async function loadPublicContext() {
    setIsLoading(true);
    setPageError("");
    setLookupError("");

    try {
      const payload = await lookupRequest({ action: "bootstrap" });
      const context = payload?.context || {};
      const activeEvent = context.event as EventInfo | undefined;
      const activeOrganization = context.organization as Organization | undefined;

      if (!activeEvent || !activeOrganization) {
        throw new Error("This student lookup is not available.");
      }

      const activeSettings = {
        ...DEFAULT_SETTINGS,
        organization_id: activeEvent.organization_id,
        event_id: activeEvent.id,
        ...(context.settings || {}),
      } as EventSettings;

      setOrganization(activeOrganization);
      setEventInfo(activeEvent);
      setEventSettings(activeSettings);
      setClasses((payload?.classes || []) as NamedOption[]);
    } catch (error: any) {
      setPageError(error?.message || "Unable to load the student lookup.");
    } finally {
      setIsLoading(false);
    }
  }

  function clearResult() {
    setStudent(null);
    setProgrammes([]);
    setCertificates([]);
    setMessage("");
    setHasSearched(false);
  }

  async function handleClassChange(classId: string) {
    setSelectedClassId(classId);
    setSelectedGender("");
    setSelectedStudentId("");
    setGenders([]);
    setStudents([]);
    setLookupError("");
    clearResult();

    if (!classId) return;

    setIsSearching(true);
    try {
      const payload = await lookupRequest({
        action: "genders",
        classId,
      });
      setGenders((payload?.genders || []) as GenderOption[]);
    } catch (error: any) {
      setLookupError(error?.message || "Unable to load genders.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleGenderChange(gender: string) {
    setSelectedGender(gender);
    setSelectedStudentId("");
    setStudents([]);
    setLookupError("");
    clearResult();

    if (!gender || !selectedClassId) return;

    setIsSearching(true);
    try {
      const payload = await lookupRequest({
        action: "students",
        classId: selectedClassId,
        gender,
      });
      setStudents((payload?.students || []) as StudentOption[]);
    } catch (error: any) {
      setLookupError(error?.message || "Unable to load students.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleStudentChange(studentId: string) {
    setSelectedStudentId(studentId);
    setLookupError("");
    setMessage("");
    setStudent(null);
    setProgrammes([]);
    setCertificates([]);
    setHasSearched(Boolean(studentId));

    if (!studentId || !selectedClassId || !selectedGender) {
      return;
    }

    setIsSearching(true);

    try {
      const payload = (await lookupRequest({
        action: "student",
        classId: selectedClassId,
        gender: selectedGender,
        studentId,
      })) as LookupResponse;

      setStudent(payload.student);
      setProgrammes(payload.programmes || []);
      setCertificates(payload.certificates || []);
      setCertificateSettings(DEFAULT_CERTIFICATE_DOWNLOAD_SETTINGS);
      setCertificateToVerify(null);
      setCertificateChestInput("");
      setCertificateVerifyError("");
      setMessage("Student programmes loaded.");
    } catch (error: any) {
      setLookupError(error?.message || "Unable to load this student's programmes.");
    } finally {
      setIsSearching(false);
    }
  }

  function resetLookup() {
    setSelectedClassId("");
    setSelectedGender("");
    setSelectedStudentId("");
    setGenders([]);
    setStudents([]);
    setStudent(null);
    setProgrammes([]);
    setCertificates([]);
    setCertificateToVerify(null);
    setCertificateChestInput("");
    setCertificateVerifyError("");
    setLookupError("");
    setMessage("");
    setHasSearched(false);
  }

  function chooseAnotherStudent() {
    setSelectedStudentId("");
    setStudent(null);
    setProgrammes([]);
    setCertificates([]);
    setCertificateToVerify(null);
    setCertificateChestInput("");
    setCertificateVerifyError("");
    setLookupError("");
    setMessage("");
    setHasSearched(false);
  }

  function requestCertificateDownload(certificate: LookupCertificate) {
    setCertificateToVerify(certificate);
    setCertificateChestInput("");
    setCertificateVerifyError("");
    setLookupError("");
  }

  async function verifyCertificateAndDownload() {
    if (
      !certificateToVerify ||
      !selectedStudentId ||
      !selectedClassId ||
      !selectedGender
    ) {
      return;
    }

    const chestNo = certificateChestInput.trim();
    if (!chestNo) {
      setCertificateVerifyError("Enter the chest number to continue.");
      return;
    }

    setIsVerifyingCertificate(true);
    setCertificateVerifyError("");

    try {
      const payload = await lookupRequest({
        action: "certificate",
        classId: selectedClassId,
        gender: selectedGender,
        studentId: selectedStudentId,
        certificateId: certificateToVerify.id,
        chestNo,
      });

      const verifiedCertificate = payload?.certificate as
        | LookupCertificate
        | undefined;
      const verifiedSettings = payload?.certificateSettings as
        | CertificateDownloadSettings
        | undefined;

      if (!verifiedCertificate || !verifiedSettings?.templateUrl) {
        throw new Error("Certificate is not available for download.");
      }

      setCertificateSettings({
        ...DEFAULT_CERTIFICATE_DOWNLOAD_SETTINGS,
        ...verifiedSettings,
      });
      setCertificateToVerify(null);
      setCertificateChestInput("");
      await downloadCertificate(verifiedCertificate, {
        ...DEFAULT_CERTIFICATE_DOWNLOAD_SETTINGS,
        ...verifiedSettings,
      });
    } catch (error: any) {
      setCertificateVerifyError(
        error?.message || "Unable to verify the chest number.",
      );
    } finally {
      setIsVerifyingCertificate(false);
    }
  }

  async function downloadCertificate(
    certificate: LookupCertificate,
    verifiedSettings: CertificateDownloadSettings,
  ) {
    if (!student || !organization || !eventInfo || !certificate.messageText) return;

    setDownloadingCertificateId(certificate.id);
    setLookupError("");

    let certificateRoot: HTMLDivElement | null = null;

    try {
      const html2canvasModule = await import("html2canvas");
      const html2canvas = (html2canvasModule as any).default || html2canvasModule;

      const widthPx = 1123;
      const heightPx = 794;
      const pxPerMm = widthPx / 297;
      const pxPerPt = 96 / 72;
      const studentNameFontSizePx =
        verifiedSettings.studentNameFontSizePt * pxPerPt;
      const messageFontSizePx = verifiedSettings.fontSizePt * pxPerPt;

      await ensureCertificateFontsLoaded(
        verifiedSettings.studentNameFontFamily,
        studentNameFontSizePx,
        verifiedSettings.fontFamily,
        messageFontSizePx,
      );

      const root = document.createElement("div");
      certificateRoot = root;
      root.style.position = "fixed";
      root.style.left = "-12000px";
      root.style.top = "0";
      root.style.width = `${widthPx}px`;
      root.style.height = `${heightPx}px`;
      root.style.background = "#ffffff";
      root.style.overflow = "hidden";
      root.style.fontFamily = verifiedSettings.fontFamily;
      root.style.boxSizing = "border-box";

      const certificateStyle = document.createElement("style");
      certificateStyle.textContent = ".certificate-message-rich strong{font-weight:700;}";
      root.appendChild(certificateStyle);

      if (!verifiedSettings.templateUrl) {
        throw new Error(
          "Certificate template is not available yet. Please contact the event administrator.",
        );
      }

      const image = document.createElement("img");
      image.src = verifiedSettings.templateUrl;
      image.crossOrigin = "anonymous";
      image.alt = "Certificate template";
      image.style.position = "absolute";
      image.style.inset = "0";
      image.style.width = "100%";
      image.style.height = "100%";
      image.style.objectFit = "fill";
      image.style.zIndex = "0";
      root.appendChild(image);

      await new Promise<void>((resolve, reject) => {
        if (image.complete && image.naturalWidth > 0) return resolve();
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener(
          "error",
          () => reject(new Error("Unable to load the certificate template.")),
          { once: true },
        );
      });

      const studentNameBox = document.createElement("div");
      studentNameBox.innerText = student.name;
      studentNameBox.style.position = "absolute";
      studentNameBox.style.left = `${verifiedSettings.studentNameXmm * pxPerMm}px`;
      studentNameBox.style.top = `${verifiedSettings.studentNameYmm * pxPerMm}px`;
      studentNameBox.style.width = `${verifiedSettings.studentNameWidthMm * pxPerMm}px`;
      studentNameBox.style.whiteSpace = "normal";
      studentNameBox.style.overflowWrap = "anywhere";
      studentNameBox.style.textAlign = verifiedSettings.studentNameTextAlign;
      studentNameBox.style.fontFamily = verifiedSettings.studentNameFontFamily;
      studentNameBox.style.fontSize = `${studentNameFontSizePx}px`;
      studentNameBox.style.lineHeight = String(
        verifiedSettings.studentNameLineHeight,
      );
      studentNameBox.style.fontWeight = "400";
      studentNameBox.style.color = verifiedSettings.studentNameTextColor;
      studentNameBox.style.boxSizing = "border-box";
      studentNameBox.style.zIndex = "2";
      studentNameBox.style.textRendering = "geometricPrecision";
      root.appendChild(studentNameBox);

      const messageBox = document.createElement("div");
      messageBox.className = "certificate-message-rich";
      messageBox.innerHTML = certificateRichTextHtml(certificate.messageText);
      messageBox.style.position = "absolute";
      messageBox.style.left = `${verifiedSettings.textXmm * pxPerMm}px`;
      messageBox.style.top = `${verifiedSettings.textYmm * pxPerMm}px`;
      messageBox.style.width = `${verifiedSettings.textWidthMm * pxPerMm}px`;
      messageBox.style.whiteSpace = "pre-wrap";
      messageBox.style.textAlign = verifiedSettings.textAlign;
      messageBox.style.fontFamily = verifiedSettings.fontFamily;
      messageBox.style.fontSize = `${messageFontSizePx}px`;
      messageBox.style.lineHeight = String(verifiedSettings.lineHeight);
      // Keep digital Student Lookup certificates visually identical to the
      // Admin pre-printed certificate output. The admin print layout uses
      // normal font weight, so do not artificially bold the public download.
      messageBox.style.fontWeight = "400";
      messageBox.style.color = verifiedSettings.textColor;
      messageBox.style.boxSizing = "border-box";
      messageBox.style.zIndex = "2";
      messageBox.style.textRendering = "geometricPrecision";
      root.appendChild(messageBox);

      document.body.appendChild(root);

      if ("fonts" in document) {
        try {
          await (document as any).fonts.ready;
        } catch {
          // Continue with the available font.
        }
      }

      // Give the browser two paint frames after the remote/custom fonts and
      // positioned layers are ready. This prevents html2canvas from dropping
      // the script student-name layer on some browsers.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );

      const canvas = await html2canvas(root, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      root.remove();
      certificateRoot = null;

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png", 1),
      );

      if (!blob) throw new Error("Unable to prepare the certificate image.");

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${safeDownloadName(student.name)}-${safeDownloadName(
        certificate.programmeName,
      )}-${certificate.position}-certificate.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("Certificate downloaded.");
    } catch (error: any) {
      setLookupError(
        error?.message || "Unable to download the certificate right now.",
      );
    } finally {
      certificateRoot?.remove();
      setDownloadingCertificateId("");
    }
  }

  async function shareLookupPage() {
    const shareData = {
      title: `${organization?.name || "Festeazy"} – Student Programme Lookup`,
      text: "Open the student programme lookup, choose the student, and view registered programmes and schedule.",
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      setMessage("Lookup page link copied.");
    } catch {
      // Ignore user-cancelled share actions.
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-bold text-slate-600 shadow-sm">
          <Loader2 className="animate-spin" size={18} />
          Loading student programme lookup...
        </div>
      </main>
    );
  }

  if (pageError || !eventInfo || !organization) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Search size={24} />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-[-0.04em] text-slate-950">
            Student Lookup Unavailable
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
            {pageError || "This public event is not available."}
          </p>
        </div>
      </main>
    );
  }

  const eventDate = formatEventDate(eventInfo.start_date, eventInfo.end_date);
  const lookupEnabled = eventSettings.show_student_search !== false;

  return (
    <main
      style={themeStyle}
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(248,250,252,0.97)_40%,_rgba(241,245,249,1)_100%)] text-slate-950"
    >
      <style jsx global>{`
        @media print {
          .lookup-no-print {
            display: none !important;
          }

          .lookup-print-root {
            background: white !important;
          }

          .lookup-result-card,
          .lookup-programme-section,
          .lookup-next-card {
            box-shadow: none !important;
            break-inside: avoid;
          }
        }
      `}</style>

      <header
        className="lookup-no-print relative overflow-hidden text-white"
        style={{ background: theme.hero }}
      >
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-28 -left-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-7">
          <div className={`flex items-center gap-4 ${eventInfo.is_public ? "justify-between" : "justify-end"}`}>
            {eventInfo.is_public && (
              <Link
                href={`/event/${slug}`}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-xs font-black backdrop-blur transition hover:bg-white/15"
              >
                <ArrowLeft size={15} />
                Event Page
              </Link>
            )}

            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur">
              <Sparkles size={12} />
              Festeazy
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                {organization.logo_url ? (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/25 bg-white p-1.5 shadow-lg">
                    <img
                      src={organization.logo_url}
                      alt={organization.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                    <School size={26} />
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/70">
                    {organization.name}
                  </p>
                  <p className="mt-1 text-sm font-bold text-white/90">
                    {eventInfo.title}
                  </p>
                </div>
              </div>

              <h1 className="mt-7 text-3xl font-black tracking-[-0.055em] sm:text-5xl">
                Find Student Programmes
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/80 sm:text-base">
                Choose the student using the organization&apos;s class and gender structure,
                then view registered programmes and schedule information.
              </p>
            </div>

            <div className="grid min-w-0 gap-2 text-xs font-bold text-white/85 sm:min-w-64">
              {eventDate && (
                <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
                  <CalendarDays size={15} />
                  {eventDate}
                </div>
              )}
              {eventInfo.venue && (
                <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur">
                  <MapPin size={15} />
                  <span className="truncate">{eventInfo.venue}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="lookup-print-root mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="lookup-no-print relative -mt-7 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 sm:-mt-8 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-[0.2em]"
                style={{ color: theme.primary }}
              >
                Parent / Student Lookup
              </p>
              <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950 sm:text-2xl">
                Find Student
              </h2>
              <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Select the class and gender configured by this organization. Then choose
                the student to load registered programmes automatically.
              </p>
            </div>

            {!lookupEnabled && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-black text-amber-800">
                Lookup disabled by event administrator
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <SelectField
              label="1. Class"
              value={selectedClassId}
              onChange={(value) => void handleClassChange(value)}
              placeholder={
                classes.length > 0
                  ? "Select class"
                  : isSearching
                    ? "Loading classes..."
                    : "No classes available"
              }
              disabled={!lookupEnabled || isSearching || classes.length === 0}
              options={classes.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />

            <SelectField
              label="2. Gender"
              value={selectedGender}
              onChange={(value) => void handleGenderChange(value)}
              placeholder={
                selectedClassId
                  ? genders.length > 0
                    ? "Select gender"
                    : isSearching
                      ? "Loading genders..."
                      : "No students available"
                  : "Select class first"
              }
              disabled={
                !lookupEnabled ||
                isSearching ||
                !selectedClassId ||
                genders.length === 0
              }
              options={genders.map((item) => ({
                value: item.value,
                label: item.label,
              }))}
            />

            <SearchableStudentField
              label="3. Student"
              value={selectedStudentId}
              onChange={(value) => void handleStudentChange(value)}
              placeholder={
                selectedGender
                  ? students.length > 0
                    ? "Search or select student"
                    : isSearching
                      ? "Loading students..."
                      : "No students available"
                  : "Select gender first"
              }
              disabled={
                !lookupEnabled ||
                isSearching ||
                !selectedGender ||
                students.length === 0
              }
              students={students}
            />
          </div>

          {lookupError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {lookupError}
            </div>
          )}

          {message && !lookupError && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
              <BadgeCheck size={17} />
              {message}
            </div>
          )}
        </section>

        {!student && !lookupError && !hasSearched && (
          <section className="lookup-no-print py-12 text-center sm:py-16">
            <div
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: theme.soft, color: theme.primary }}
            >
              <BadgeCheck size={27} />
            </div>
            <h3 className="mt-5 text-xl font-black tracking-[-0.04em] text-slate-950">
              Guided student programme lookup
            </h3>
            <p className="mx-auto mt-2 max-w-lg text-sm font-semibold leading-6 text-slate-500">
              Start with the organization&apos;s class structure. Student names appear only
              after narrowing by class and gender.
            </p>
          </section>
        )}

        {student && (
          <div className="mt-6 space-y-6">
            <section className="lookup-result-card overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
              <div className="h-1.5 w-full" style={{ background: theme.primary }} />

              <div className="p-5 sm:p-7">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                      style={{ background: theme.soft, color: theme.primary }}
                    >
                      <User size={26} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]"
                          style={{ background: theme.soft, color: theme.primary }}
                        >
                          <BadgeCheck size={12} /> Verified
                        </span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
                          {formatGender(student.gender)}
                        </span>
                      </div>

                      <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.045em] text-slate-950 sm:text-3xl">
                        {student.name}
                      </h2>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {student.className || "-"}
                        {student.divisionName ? ` • ${student.divisionName}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:items-end">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:text-right">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Team / House
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {student.teamName || "-"}
                      </p>
                    </div>

                    <div className="lookup-no-print flex gap-2">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 transition hover:bg-slate-50"
                      >
                        <Printer size={14} /> Print
                      </button>
                      <button
                        type="button"
                        onClick={shareLookupPage}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 transition hover:bg-slate-50"
                      >
                        <Share2 size={14} /> Share
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <SummaryCard label="Total" value={programmes.length} icon={<Trophy size={17} />} theme={theme} />
                  <SummaryCard label="Stage" value={stageProgrammes.length} icon={<Users size={17} />} theme={theme} />
                  <SummaryCard label="Off-stage" value={offStageProgrammes.length} icon={<School size={17} />} theme={theme} />
                  <SummaryCard label="Group" value={groupCount} icon={<Users size={17} />} theme={theme} />
                </div>
              </div>
            </section>

            {certificates.length > 0 && (
              <section className="lookup-no-print overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-lg sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                      <Trophy size={21} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                        Achievement Certificates
                      </p>
                      <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">
                        My Certificates
                      </h3>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                        Available automatically for eligible published positions configured by the event administrator.
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                    {certificates.length} available
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {certificates.map((certificate) => (
                    <div
                      key={certificate.id}
                      className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-amber-800">
                            {certificate.positionLabel}
                          </span>
                          <p className="mt-3 truncate text-base font-black uppercase tracking-[-0.03em] text-slate-950">
                            {certificate.programmeName}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {certificate.categoryName}
                            {certificate.grade ? ` • Grade ${certificate.grade}` : ""}
                          </p>
                        </div>

                        <BadgeCheck size={22} className="shrink-0 text-amber-600" />
                      </div>

                      <button
                        type="button"
                        onClick={() => requestCertificateDownload(certificate)}
                        disabled={Boolean(downloadingCertificateId)}
                        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {downloadingCertificateId === certificate.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Download size={15} />
                        )}
                        Download Certificate
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {nextProgramme && nextProgramme.schedule && (
              <section
                className="lookup-next-card overflow-hidden rounded-[2rem] border p-5 shadow-lg sm:p-6"
                style={{
                  background: theme.soft,
                  borderColor: theme.border,
                }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.15em]"
                        style={{ background: "white", color: theme.primary }}
                      >
                        Next Scheduled Programme
                      </span>
                      <StatusPill status={scheduleStatus(nextProgramme.schedule)} theme={theme} />
                    </div>
                    <h3 className="mt-3 text-xl font-black uppercase tracking-[-0.04em] text-slate-950">
                      {nextProgramme.name}
                    </h3>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {formatProgrammeType(nextProgramme.programmeType)} • {formatStageType(nextProgramme.stageType)}
                    </p>
                  </div>

                  <div className="grid gap-2 text-xs font-bold text-slate-700 sm:min-w-80 sm:grid-cols-3">
                    <ScheduleChip icon={<MapPin size={14} />} text={nextProgramme.schedule.stageName} />
                    <ScheduleChip icon={<CalendarDays size={14} />} text={nextProgramme.schedule.date ? formatDate(nextProgramme.schedule.date) : "Date TBA"} />
                    <ScheduleChip icon={<Clock size={14} />} text={`${nextProgramme.schedule.startTime} – ${nextProgramme.schedule.endTime}`} />
                  </div>
                </div>
              </section>
            )}

            {programmes.length === 0 ? (
              <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
                <School size={28} className="mx-auto text-slate-300" />
                <h3 className="mt-4 text-lg font-black text-slate-950">No registered programmes</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  This verified student currently has no registered programme assignments.
                </p>
              </section>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <ProgrammeSection
                  title="Stage Programmes"
                  description="Programmes conducted on stage."
                  items={stageProgrammes}
                  theme={theme}
                  emptyText="No stage programmes registered."
                />
                <ProgrammeSection
                  title="Off-stage Programmes"
                  description="Writing, test and other off-stage programmes."
                  items={offStageProgrammes}
                  theme={theme}
                  emptyText="No off-stage programmes registered."
                />
              </div>
            )}

            <section className="lookup-no-print rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: theme.soft, color: theme.primary }}
                  >
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-950">Schedule information</h3>
                    <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500">
                      Date, time and stage appear only after the programme is added to the official FestEazy schedule. Unscheduled programmes remain visible as registered.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={chooseAnotherStudent}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                >
                  <RotateCcw size={15} /> Choose Another Student
                </button>
              </div>
            </section>
          </div>
        )}

        <footer className="lookup-no-print mt-10 border-t border-slate-200 py-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Powered by Festeazy</p>
          <p className="mt-2 text-xs font-semibold text-slate-400">Make Your Fest Easy</p>
        </footer>
      </div>

      {certificateToVerify && (
        <div className="lookup-no-print fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">
                    Certificate Verification
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">
                    Verify Student
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Enter your chest number to download the {certificateToVerify.programmeName} certificate.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isVerifyingCertificate) return;
                    setCertificateToVerify(null);
                    setCertificateChestInput("");
                    setCertificateVerifyError("");
                  }}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-black text-slate-500 transition hover:bg-slate-200"
                  aria-label="Close certificate verification"
                >
                  ×
                </button>
              </div>
            </div>

            <form
              className="p-6"
              onSubmit={(event) => {
                event.preventDefault();
                void verifyCertificateAndDownload();
              }}
            >
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                  Chest Number
                </span>
                <input
                  autoFocus
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={certificateChestInput}
                  onChange={(event) => {
                    setCertificateChestInput(event.target.value);
                    setCertificateVerifyError("");
                  }}
                  placeholder="Enter chest number"
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-base font-black tracking-wide text-slate-950 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
                />
              </label>

              {certificateVerifyError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                  {certificateVerifyError}
                </div>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isVerifyingCertificate}
                  onClick={() => {
                    setCertificateToVerify(null);
                    setCertificateChestInput("");
                    setCertificateVerifyError("");
                  }}
                  className="h-12 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifyingCertificate || !certificateChestInput.trim()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifyingCertificate ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <BadgeCheck size={16} />
                  )}
                  Verify & Download
                </button>
              </div>

              <p className="mt-4 text-center text-[11px] font-semibold leading-5 text-slate-400">
                Your chest number is used only to verify this certificate download.
              </p>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-14 w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm font-black text-slate-950 outline-none transition focus:border-[var(--lookup-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--lookup-soft)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
          ▾
        </span>
      </div>
    </label>
  );
}

function SearchableStudentField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  students,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  students: StudentOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedStudent =
    students.find((student) => student.id === value) || null;

  function getStudentDisplayName(student: StudentOption) {
    return String(student.name || "Student").trim();
  }


  const filteredStudents = useMemo(() => {
    const keyword = normalizeText(query);

    if (!keyword) return students;

    return students.filter((student) => {
      const searchableText = [
        student.name,
        getStudentDisplayName(student),
        student.divisionName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [students, query]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      setQuery("");
    }
  }, [disabled]);

  return (
    <div
      className="relative"
      onBlurCapture={(event) => {
        const nextTarget = event.relatedTarget as Node | null;

        if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
          setIsOpen(false);
          setQuery("");
        }
      }}
    >
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>

      <button
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => {
          if (disabled) return;
          setIsOpen((current) => !current);
          setQuery("");
        }}
        className="flex h-14 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-left outline-none transition hover:bg-white focus:border-[var(--lookup-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--lookup-soft)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <div className="min-w-0">
          {selectedStudent ? (
            <>
              <p className="truncate text-sm font-black text-slate-950">
                {getStudentDisplayName(selectedStudent)}
              </p>
              {selectedStudent.divisionName && (
                <p className="mt-0.5 truncate text-[10px] font-bold text-slate-400">
                  {selectedStudent.divisionName}
                </p>
              )}
            </>
          ) : (
            <p className="truncate text-sm font-black text-slate-500">
              {placeholder}
            </p>
          )}
        </div>

        <span
          className={`shrink-0 text-xs font-black text-slate-400 transition ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">
          <div className="border-b border-slate-100 p-3">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search student name or division..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-950 outline-none transition focus:border-[var(--lookup-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--lookup-soft)]"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {filteredStudents.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Search size={22} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm font-black text-slate-600">
                  No student found
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  Try another student name or division.
                </p>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const selected = student.id === value;
                const displayName = getStudentDisplayName(student);

                return (
                  <button
                    key={student.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(student.id);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                      selected
                        ? "bg-[var(--lookup-soft)]"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        background: selected ? "var(--lookup-primary)" : "#f1f5f9",
                        color: selected ? "white" : "#64748b",
                      }}
                    >
                      <User size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-950">
                        {displayName}
                      </p>
                      {student.divisionName && (
                        <p className="mt-1 truncate text-[11px] font-bold text-slate-400">
                          {student.divisionName}
                        </p>
                      )}
                    </div>

                    {selected && (
                      <BadgeCheck
                        size={19}
                        className="shrink-0"
                        style={{ color: "var(--lookup-primary)" }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  theme,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  theme: Theme;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</span>
        <span style={{ color: theme.primary }}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</p>
    </div>
  );
}

function ProgrammeSection({
  title,
  description,
  items,
  theme,
  emptyText,
}: {
  title: string;
  description: string;
  items: LookupProgramme[];
  theme: Theme;
  emptyText: string;
}) {
  return (
    <section className="lookup-programme-section overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black tracking-[-0.04em] text-slate-950">{title}</h3>
            <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
          </div>
          <span
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-xs font-black"
            style={{ background: theme.soft, color: theme.primary }}
          >
            {items.length}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm font-semibold text-slate-400">{emptyText}</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item, index) => (
            <article key={`${item.registrationId}-${item.programmeId}`} className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-black"
                  style={{ background: theme.soft, color: theme.primary }}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="text-sm font-black uppercase leading-5 text-slate-950 sm:text-[15px]">{item.name}</h4>
                    <StatusPill status={scheduleStatus(item.schedule)} theme={theme} />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <MetaPill text={formatProgrammeType(item.programmeType)} />
                    <MetaPill text={formatStageType(item.stageType)} />
                    <MetaPill text={formatGender(item.genderScope)} />
                  </div>

                  {item.groupName && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600">
                      <Users size={14} className="text-slate-400" /> Group: {item.groupName}
                    </div>
                  )}

                  {item.schedule ? (
                    <div
                      className="mt-4 grid gap-2 rounded-2xl border p-3 text-xs font-bold sm:grid-cols-3"
                      style={{ background: theme.soft, borderColor: theme.border, color: theme.dark }}
                    >
                      <div className="flex items-center gap-2"><MapPin size={14} /><span className="truncate">{item.schedule.stageName}</span></div>
                      <div className="flex items-center gap-2"><CalendarDays size={14} />{item.schedule.date ? formatDate(item.schedule.date) : "Date TBA"}</div>
                      <div className="flex items-center gap-2"><Clock size={14} />{item.schedule.startTime} – {item.schedule.endTime}</div>
                    </div>
                  ) : (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-400">
                      <Clock size={13} /> Schedule not announced
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ScheduleChip({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-white/70 bg-white/80 px-3 py-2">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function StatusPill({ status, theme }: { status: string; theme: Theme }) {
  if (status === "Upcoming" || status === "Today") {
    return (
      <span
        className="inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]"
        style={{ background: theme.soft, color: theme.primary }}
      >
        {status}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-slate-500">
      {status}
    </span>
  );
}

function MetaPill({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">
      {text}
    </span>
  );
}