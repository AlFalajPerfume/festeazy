/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import FontFamilySelect from "@/components/FontFamilySelect";
import { getSupportedFontWeight } from "@/app/fonts";
import { supabase } from "@/lib/supabase";
import { getAdminContext } from "@/lib/admin-context";
import {
  deleteAdminStorageAsset,
  uploadAdminStorageAsset,
} from "@/lib/admin-storage";
import {
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  Move,
  RefreshCcw,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
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
};

type PosterField = {
  x: number;
  y: number;
  align: "left" | "center" | "right";
  color: string;
  width: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: string;
  visible?: boolean;
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

type PosterLayout = Record<LayerKey, PosterField>;

type PosterTemplate = {
  id: string;
  organization_id: string;
  event_id: string;
  name: string;
  image_url: string;
  template_usage?: string | null;
  is_active: boolean;
  canvas_width: number;
  canvas_height: number;
  layout: PosterLayout | null;
  show_ad_banner: boolean;
  ad_banner_url: string | null;
  ad_x: number;
  ad_y: number;
  ad_width: number;
  ad_height: number;
  created_at: string;
};

type Category = { id: string; name: string };
type Team = { id: string; name: string };

type Programme = {
  id: string;
  name: string;
  category_id: string | null;
  programme_type: string;
  stage_type: string;
  gender_scope: string;
  total_marks: number;
};

type Student = {
  id: string;
  chest_no: string | null;
  name: string;
  team_id: string | null;
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
  total_mark: number;
  average_mark: number;
  grade: string | null;
  position: number | null;
  points: number;
  is_published: boolean;
  published_at: string | null;
};

type PosterData = {
  result_label: string;
  result_no: string;
  category: string;
  programme: string;
  first_name: string;
  first_unit: string;
  second_name: string;
  second_unit: string;
  third_name: string;
  third_unit: string;
  organization_name: string;
  event_title: string;
  event_date: string;
  venue: string;
  footer_text: string;
};

type ResultPosterLock = {
  id: string;
  programme_id: string;
  result_no: number | null;
  poster_data: Partial<PosterData> | null;
  template_id: string | null;
  is_public: boolean | null;
};

type TemplateDimensions = {
  width: number;
  height: number;
};

type DragState =
  | {
      kind: "text";
      key: LayerKey;
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
    }
  | {
      kind: "ad";
      startClientX: number;
      startClientY: number;
      startX: number;
      startY: number;
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

const FIELD_LABELS: Record<LayerKey, string> = {
  result_label: "Result Label",
  result_no: "Result No",
  category: "Category",
  programme: "Programme",
  first_name: "First Name",
  first_unit: "First Team",
  second_name: "Second Name",
  second_unit: "Second Team",
  third_name: "Third Name",
  third_unit: "Third Team",
  organization_name: "Institution Name",
  event_title: "Event Title",
  event_date: "Event Date",
  venue: "Venue",
  footer_text: "Footer Text",
};

const LEGACY_DEFAULT_TEMPLATE_URLS = [
  "/templates/result1.png",
  "/templates/result2.png",
];

const MAX_PUBLIC_TEMPLATES = 3;

const DEFAULT_LAYOUT: PosterLayout = {
  category: {
    x: 150,
    y: 270,
    align: "left",
    color: "#ffffff",
    width: 620,
    fontSize: 28,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: "0px",
  },
  programme: {
    x: 150,
    y: 316,
    align: "left",
    color: "#ffffff",
    width: 680,
    fontSize: 38,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 900,
    lineHeight: 1,
    letterSpacing: "0px",
  },
  result_no: {
    x: 279,
    y: 176,
    align: "left",
    color: "#f2bd18",
    width: 170,
    fontSize: 82,
    fontFamily: "Montserrat, Poppins, Arial, sans-serif",
    fontWeight: 700,
    lineHeight: 0.92,
    letterSpacing: "0px",
  },
  result_label: {
    x: 150,
    y: 211,
    align: "left",
    color: "#f2bd18",
    width: 180,
    fontSize: 30,
    fontFamily: "Montserrat, Poppins, Arial, sans-serif",
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "0px",
  },
  first_name: {
    x: 267,
    y: 442,
    align: "left",
    color: "#ffffff",
    width: 520,
    fontSize: 28,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: "0px",
  },
  first_unit: {
    x: 267,
    y: 467,
    align: "left",
    color: "#d7d7d7",
    width: 520,
    fontSize: 24,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 300,
    lineHeight: 1,
    letterSpacing: "0px",
  },
  second_name: {
    x: 267,
    y: 532,
    align: "left",
    color: "#ffffff",
    width: 520,
    fontSize: 28,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: "0px",
  },
  second_unit: {
    x: 265,
    y: 563,
    align: "left",
    color: "#d7d7d7",
    width: 520,
    fontSize: 24,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 300,
    lineHeight: 1,
    letterSpacing: "0px",
  },
  third_name: {
    x: 267,
    y: 635,
    align: "left",
    color: "#ffffff",
    width: 520,
    fontSize: 28,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: "0px",
  },
  third_unit: {
    x: 265,
    y: 665,
    align: "left",
    color: "#d7d7d7",
    width: 520,
    fontSize: 24,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 300,
    lineHeight: 1,
    letterSpacing: "0px",
  },
  organization_name: {
    x: 120,
    y: 1055,
    align: "center",
    color: "#ffffff",
    width: 837,
    fontSize: 26,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 800,
    lineHeight: 1,
    letterSpacing: "0px",
    visible: false,
  },
  event_title: {
    x: 120,
    y: 1092,
    align: "center",
    color: "#f2bd18",
    width: 837,
    fontSize: 21,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: "0px",
    visible: false,
  },
  event_date: {
    x: 150,
    y: 1132,
    align: "left",
    color: "#d7d7d7",
    width: 360,
    fontSize: 17,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: "0px",
    visible: false,
  },
  venue: {
    x: 527,
    y: 1132,
    align: "right",
    color: "#d7d7d7",
    width: 400,
    fontSize: 17,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: "0px",
    visible: false,
  },
  footer_text: {
    x: 120,
    y: 1280,
    align: "center",
    color: "#ffffff",
    width: 837,
    fontSize: 14,
    fontFamily: "Montserrat, Poppins, Arial, Helvetica, sans-serif",
    fontWeight: 600,
    lineHeight: 1,
    letterSpacing: "1px",
    visible: false,
  },
};

function cloneLayout(layout: PosterLayout) {
  return JSON.parse(JSON.stringify(layout)) as PosterLayout;
}

function normalizeLayout(layout: any): PosterLayout {
  const merged = cloneLayout(DEFAULT_LAYOUT);

  FIELD_ORDER.forEach((key) => {
    merged[key].visible =
      merged[key].visible ?? !FOOTER_LAYER_KEYS.includes(key);
  });

  if (!layout || typeof layout !== "object") return merged;

  FIELD_ORDER.forEach((key) => {
    if (layout[key]) {
      merged[key] = {
        ...merged[key],
        ...layout[key],
        x: Number(layout[key].x ?? merged[key].x),
        y: Number(layout[key].y ?? merged[key].y),
        width: Number(layout[key].width ?? merged[key].width),
        fontSize: Number(layout[key].fontSize ?? merged[key].fontSize),
        fontWeight: Number(layout[key].fontWeight ?? merged[key].fontWeight),
        lineHeight: Number(layout[key].lineHeight ?? merged[key].lineHeight),
        visible:
          layout[key].visible ??
          merged[key].visible ??
          !FOOTER_LAYER_KEYS.includes(key),
      };
    }
  });

  return merged;
}

function isDefaultTemplateImage(url: string | null | undefined) {
  const imageUrl = String(url || "").trim();

  return LEGACY_DEFAULT_TEMPLATE_URLS.includes(imageUrl);
}

function formatPosterDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function readImageDimensions(file: File) {
  return new Promise<TemplateDimensions>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The template image dimensions could not be read."));
    };

    image.src = objectUrl;
  });
}

function scaleLayoutToCanvas(
  layout: PosterLayout,
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number,
) {
  const next = cloneLayout(layout);
  const scaleX = toWidth / Math.max(1, fromWidth);
  const scaleY = toHeight / Math.max(1, fromHeight);
  const fontScale = Math.min(scaleX, scaleY);

  FIELD_ORDER.forEach((key) => {
    next[key] = {
      ...next[key],
      x: Math.round(next[key].x * scaleX),
      y: Math.round(next[key].y * scaleY),
      width: Math.max(1, Math.round(next[key].width * scaleX)),
      fontSize: Math.max(8, Math.round(next[key].fontSize * fontScale)),
    };
  });

  return next;
}

function createNewTemplateLayout(width: number, height: number) {
  const layout = scaleLayoutToCanvas(
    normalizeLayout(DEFAULT_LAYOUT),
    1077,
    1350,
    width,
    height,
  );

  FOOTER_LAYER_KEYS.forEach((key) => {
    layout[key].visible = true;
  });

  return layout;
}

function getTextWidthWithSpacing(
  context: CanvasRenderingContext2D,
  value: string,
  letterSpacing: number,
) {
  return (
    context.measureText(value).width +
    Math.max(0, value.length - 1) * letterSpacing
  );
}

function getAutoFitFontSize(
  key: LayerKey,
  value: string,
  field: PosterField,
  context?: CanvasRenderingContext2D | null,
) {
  const baseSize = Math.max(8, Number(field.fontSize || 28));
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
  const letterSpacing = Number.parseFloat(field.letterSpacing || "0") || 0;
  const family = field.fontFamily || "Arial, sans-serif";
  const weight = Number(field.fontWeight || 700);

  for (let size = baseSize; size >= minSize; size -= 1) {
    measureContext.font = `${weight} ${size}px ${family}`;
    if (
      getTextWidthWithSpacing(measureContext, value, letterSpacing) <=
      Number(field.width || 500)
    ) {
      return size;
    }
  }

  return minSize;
}

export default function PosterStudioPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);

  const [templates, setTemplates] = useState<PosterTemplate[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [posterLocks, setPosterLocks] = useState<ResultPosterLock[]>([]);

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [selectedLayer, setSelectedLayer] = useState<LayerKey>("programme");

  const [scale, setScale] = useState(1);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateDimensions, setTemplateDimensions] =
    useState<TemplateDimensions | null>(null);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [isSyncingDimensions, setIsSyncingDimensions] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAd, setIsUploadingAd] = useState(false);
  const [isSavingPosition, setIsSavingPosition] = useState(false);
  const [isRefreshingLock, setIsRefreshingLock] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const activeTemplate = useMemo(() => {
    return (
      templates.find((template) => template.id === selectedTemplateId) ||
      templates.find((template) => template.is_active) ||
      templates[0] ||
      null
    );
  }, [templates, selectedTemplateId]);

  const activeLayout = useMemo(() => {
    return normalizeLayout(activeTemplate?.layout);
  }, [activeTemplate]);

  const canAddTemplate = templates.length < MAX_PUBLIC_TEMPLATES;

  const publishedProgrammeIds = useMemo(() => {
    return Array.from(
      new Set(
        results
          .filter((result) => result.is_published && result.programme_id)
          .map((result) => result.programme_id as string),
      ),
    );
  }, [results]);

  const resultProgrammes = useMemo(() => {
    return publishedProgrammeIds
      .map((id) => programmes.find((programme) => programme.id === id))
      .filter(Boolean) as Programme[];
  }, [publishedProgrammeIds, programmes]);

  const posterData = useMemo(() => {
    const programme =
      programmes.find((item) => item.id === selectedProgrammeId) ||
      resultProgrammes[0] ||
      null;

    if (!programme) return samplePosterData();

    return buildPosterData(programme);
  }, [
    selectedProgrammeId,
    resultProgrammes,
    programmes,
    results,
    registrations,
    students,
    teams,
    categories,
    posterLocks,
    organization,
    eventInfo,
  ]);

  const selectedField = activeLayout[selectedLayer];

  useEffect(() => {
    if (activeTemplate) {
      drawCanvasPoster();
    }
  }, [activeTemplate, activeLayout, posterData]);

  useEffect(() => {
    updatePreviewScale();
    window.addEventListener("resize", updatePreviewScale);

    return () => {
      window.removeEventListener("resize", updatePreviewScale);
    };
  }, [activeTemplate]);

  function updatePreviewScale() {
    setTimeout(() => {
      const wrap = previewWrapRef.current;
      if (!wrap || !activeTemplate) return;

      const realWidth = Number(activeTemplate.canvas_width || 1077);
      setScale(wrap.clientWidth / realWidth);
    }, 50);
  }

  function focusPosterPreview() {
    previewWrapRef.current?.focus({ preventScroll: true });
  }

  function handlePreviewKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) {
    if (!activeTemplate) return;

    const movementKeys = [
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
    ];

    if (!movementKeys.includes(event.key)) return;

    event.preventDefault();
    event.stopPropagation();

    const step = event.shiftKey ? 10 : 1;
    const currentLayout = normalizeLayout(activeTemplate.layout);
    const currentField = currentLayout[selectedLayer];
    const canvasWidth = Math.max(
      1,
      Number(activeTemplate.canvas_width || 1077),
    );
    const canvasHeight = Math.max(
      1,
      Number(activeTemplate.canvas_height || 1350),
    );
    const estimatedLayerHeight = Math.max(
      1,
      Number(currentField.fontSize || 28) *
        Number(currentField.lineHeight || 1),
    );
    const maxX = Math.max(
      0,
      canvasWidth - Math.max(1, Number(currentField.width || 1)),
    );
    const maxY = Math.max(0, canvasHeight - estimatedLayerHeight);

    let nextX = Number(currentField.x || 0);
    let nextY = Number(currentField.y || 0);

    const movesHorizontally =
      event.key === "ArrowLeft" || event.key === "ArrowRight";
    const movesVertically =
      event.key === "ArrowUp" || event.key === "ArrowDown";

    if (event.key === "ArrowLeft") nextX -= step;
    if (event.key === "ArrowRight") nextX += step;
    if (event.key === "ArrowUp") nextY -= step;
    if (event.key === "ArrowDown") nextY += step;

    updateLayer(selectedLayer, {
      x: movesHorizontally
        ? Math.round(Math.min(maxX, Math.max(0, nextX)))
        : Math.round(Number(currentField.x || 0)),
      y: movesVertically
        ? Math.round(Math.min(maxY, Math.max(0, nextY)))
        : Math.round(Number(currentField.y || 0)),
    });
  }


  async function loadData() {
    setIsLoading(true);
    setError("");
    setMessage("");

    const { context, error: contextError } = await getAdminContext();

    if (contextError || !context) {
      return stopLoading(contextError || "Please login again.");
    }

    const activeEvent: EventInfo = {
      id: context.eventId,
      organization_id: context.organizationId,
      title: context.eventTitle,
      venue: context.eventVenue || null,
      start_date: context.eventStartDate || null,
      end_date: context.eventEndDate || null,
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

    const { data: templateData, error: templateError } = await supabase
      .from("poster_templates")
      .select("*")
      .eq("event_id", activeEvent.id)
      .eq("template_usage", "result_poster")
      .order("created_at", { ascending: false });

    if (templateError) {
      return stopLoading(templateError.message);
    }

    const customTemplates = ((templateData || []) as PosterTemplate[])
      .filter((template) => !isDefaultTemplateImage(template.image_url))
      .map((template) => ({
        ...template,
        layout: normalizeLayout(template.layout),
        show_ad_banner: Boolean(template.show_ad_banner),
        ad_banner_url: template.ad_banner_url || null,
        ad_x: Number(template.ad_x ?? 0),
        ad_y: Number(
          template.ad_y ?? Number(template.canvas_height || 1350) - 240,
        ),
        ad_width: Number(
          template.ad_width ?? Number(template.canvas_width || 1077),
        ),
        ad_height: Number(template.ad_height ?? 240),
      }))
      .sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return String(b.created_at || "").localeCompare(
          String(a.created_at || ""),
        );
      });

    setTemplates(customTemplates);

    const active =
      customTemplates.find((item) => item.is_active) || customTemplates[0];

    setSelectedTemplateId(active?.id || "");

    // Do not load thousands of students/results until a custom template exists.
    if (!active) {
      setCategories([]);
      setTeams([]);
      setProgrammes([]);
      setStudents([]);
      setRegistrations([]);
      setResults([]);
      setPosterLocks([]);
      setSelectedProgrammeId("");
      setIsLoading(false);
      return;
    }

    const [
      categoryRes,
      teamRes,
      programmeRes,
      studentRes,
      registrationRes,
      resultRes,
      lockRes,
    ] = await Promise.all([
      supabase.from("categories").select("id, name").eq("event_id", activeEvent.id),
      supabase.from("teams").select("id, name").eq("event_id", activeEvent.id),
      supabase
        .from("programmes")
        .select(
          "id, name, category_id, programme_type, stage_type, gender_scope, total_marks",
        )
        .eq("event_id", activeEvent.id),
      supabase
        .from("students")
        .select("id, chest_no, name, team_id")
        .eq("event_id", activeEvent.id),
      supabase
        .from("programme_registrations")
        .select("id, programme_id, student_id, team_id, group_name")
        .eq("event_id", activeEvent.id),
      supabase
        .from("results")
        .select("*")
        .eq("event_id", activeEvent.id)
        .eq("is_published", true)
        .order("position", { ascending: true }),
      supabase
        .from("result_posters")
        .select("id, programme_id, result_no, poster_data, template_id, is_public")
        .eq("event_id", activeEvent.id),
    ]);

    if (categoryRes.error) return stopLoading(categoryRes.error.message);
    if (teamRes.error) return stopLoading(teamRes.error.message);
    if (programmeRes.error) return stopLoading(programmeRes.error.message);
    if (studentRes.error) return stopLoading(studentRes.error.message);
    if (registrationRes.error) return stopLoading(registrationRes.error.message);
    if (resultRes.error) return stopLoading(resultRes.error.message);
    if (lockRes.error) {
      console.warn("Official poster locks could not be loaded:", lockRes.error.message);
    }

    setCategories((categoryRes.data || []) as Category[]);
    setTeams((teamRes.data || []) as Team[]);
    setProgrammes((programmeRes.data || []) as Programme[]);
    setStudents((studentRes.data || []) as Student[]);
    setRegistrations((registrationRes.data || []) as Registration[]);
    setResults((resultRes.data || []) as ResultItem[]);
    setPosterLocks((lockRes.data || []) as ResultPosterLock[]);

    const loadedResults = (resultRes.data || []) as ResultItem[];
    const loadedProgrammes = (programmeRes.data || []) as Programme[];

    const firstProgrammeId =
      loadedResults.find((item) => item.programme_id)?.programme_id ||
      loadedProgrammes[0]?.id ||
      "";

    setSelectedProgrammeId(String(firstProgrammeId || ""));
    setIsLoading(false);
  }

  function stopLoading(text: string) {
    setError(text);
    setIsLoading(false);
    setIsUploading(false);
    setIsUploadingAd(false);
    setIsSavingPosition(false);
  }

  function getCategoryName(id: string | null | undefined) {
    if (!id) return "General";
    return categories.find((item) => item.id === id)?.name || "General";
  }

  function getTeamName(id: string | null | undefined) {
    return teams.find((item) => item.id === id)?.name || "-";
  }

  function getStudent(id: string | null | undefined) {
    return students.find((item) => item.id === id) || null;
  }

  function getRegistration(id: string | null | undefined) {
    return registrations.find((item) => item.id === id) || null;
  }

  function samplePosterData(): PosterData {
    return {
      result_label: "RESULT",
      result_no: "01",
      category: "GENERAL",
      programme: "Nasheed",
      first_name: "FIRST WINNER",
      first_unit: "BLUE HOUSE",
      second_name: "SECOND WINNER",
      second_unit: "GREEN HOUSE",
      third_name: "THIRD WINNER",
      third_unit: "RED HOUSE",
      organization_name: organization?.name || "DEMO INSTITUTION",
      event_title: eventInfo?.title || "ANNUAL ARTS FEST",
      event_date: formatEventDateRange(),
      venue: eventInfo?.venue || organization?.place || "",
      footer_text: "Powered by FestEazy",
    };
  }

  function formatEventDateRange() {
    if (!eventInfo?.start_date && !eventInfo?.end_date) return "";
    if (eventInfo.start_date === eventInfo.end_date) {
      return formatPosterDate(eventInfo.start_date);
    }
    return [
      formatPosterDate(eventInfo.start_date),
      formatPosterDate(eventInfo.end_date),
    ]
      .filter(Boolean)
      .join(" – ");
  }

  function getWinnerName(result: ResultItem) {
    const registration = getRegistration(result.registration_id);
    if (!registration) return "-";

    if (registration.group_name) return registration.group_name;

    const student = getStudent(registration.student_id);
    return student?.name || "-";
  }

  function getWinnerUnit(result: ResultItem) {
    const registration = getRegistration(result.registration_id);
    const student = getStudent(registration?.student_id);

    return getTeamName(registration?.team_id || student?.team_id);
  }

  function buildLivePosterData(programme: Programme): PosterData {
    const programmeResults = results
      .filter((item) => item.programme_id === programme.id && item.is_published)
      .sort((a, b) => {
        const positionCompare =
          Number(a.position || 999) - Number(b.position || 999);
        if (positionCompare !== 0) return positionCompare;
        return Number(b.total_mark || 0) - Number(a.total_mark || 0);
      });

    const first = programmeResults[0];
    const second = programmeResults[1];
    const third = programmeResults[2];
    const posterLock = posterLocks.find(
      (item) => item.programme_id === programme.id,
    );
    const resultIndex =
      posterLock?.result_no ||
      resultProgrammes.findIndex((item) => item.id === programme.id) + 1;

    return {
      result_label: "RESULT",
      result_no: String(resultIndex || 1).padStart(2, "0"),
      category: getCategoryName(programme.category_id).toUpperCase(),
      programme: programme.name,
      first_name: first ? getWinnerName(first) : "-",
      first_unit: first ? getWinnerUnit(first).toUpperCase() : "-",
      second_name: second ? getWinnerName(second) : "-",
      second_unit: second ? getWinnerUnit(second).toUpperCase() : "-",
      third_name: third ? getWinnerName(third) : "-",
      third_unit: third ? getWinnerUnit(third).toUpperCase() : "-",
      organization_name: organization?.name || "",
      event_title: eventInfo?.title || "",
      event_date: formatEventDateRange(),
      venue: eventInfo?.venue || organization?.place || "",
      footer_text: "Powered by FestEazy",
    };
  }

  function buildPosterData(programme: Programme): PosterData {
    const liveData = buildLivePosterData(programme);
    const posterLock = posterLocks.find(
      (item) => item.programme_id === programme.id,
    );

    return {
      ...liveData,
      ...(posterLock?.poster_data || {}),
      organization_name: liveData.organization_name,
      event_title: liveData.event_title,
      event_date: liveData.event_date,
      venue: liveData.venue,
      footer_text: liveData.footer_text,
    };
  }

  async function refreshOfficialPosterData() {
    const programme = programmes.find(
      (item) => item.id === selectedProgrammeId,
    );
    if (!programme || !eventInfo) return;

    const posterLock = posterLocks.find(
      (item) => item.programme_id === programme.id,
    );
    if (!posterLock) {
      setError("This programme does not have an official poster lock yet.");
      return;
    }

    setIsRefreshingLock(true);
    setError("");
    setMessage("");

    const liveData = buildLivePosterData(programme);
    const { error: updateError } = await supabase
      .from("result_posters")
      .update({
        poster_data: liveData,
        template_id: activeTemplate?.id || posterLock.template_id || null,
      })
      .eq("id", posterLock.id);

    if (updateError) {
      setError(updateError.message);
      setIsRefreshingLock(false);
      return;
    }

    setPosterLocks((current) =>
      current.map((item) =>
        item.id === posterLock.id
          ? {
              ...item,
              poster_data: liveData,
              template_id: activeTemplate?.id || item.template_id,
            }
          : item,
      ),
    );
    setMessage("Official poster data refreshed from the latest published result.");
    setIsRefreshingLock(false);
  }

  async function uploadTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!eventInfo) {
      setError("Event not found.");
      return;
    }

    if (templates.length >= MAX_PUBLIC_TEMPLATES) {
      setError(
        `You can add a maximum of ${MAX_PUBLIC_TEMPLATES} public poster templates. Delete one template before adding another.`,
      );
      return;
    }

    if (!templateFile) {
      setError("Select poster template image.");
      return;
    }

    setIsUploading(true);

    let dimensions = templateDimensions;
    try {
      dimensions = dimensions || (await readImageDimensions(templateFile));
    } catch (dimensionError) {
      return stopLoading(
        dimensionError instanceof Error
          ? dimensionError.message
          : "The template image dimensions could not be read.",
      );
    }

    const canvasWidth = Math.max(1, Number(dimensions.width));
    const canvasHeight = Math.max(1, Number(dimensions.height));
    const initialLayout = createNewTemplateLayout(canvasWidth, canvasHeight);

    let uploadedAsset;

    try {
      uploadedAsset = await uploadAdminStorageAsset({
        file: templateFile,
        assetType: "poster_template",
      });
    } catch (uploadError) {
      return stopLoading(
        uploadError instanceof Error
          ? uploadError.message
          : "Poster template upload failed.",
      );
    }

    const finalName =
      templateName.trim() ||
      templateFile.name.replace(/\.[^/.]+$/, "") ||
      "Custom Result Template";

    const { error: clearError } = await supabase
      .from("poster_templates")
      .update({ is_active: false })
      .eq("event_id", eventInfo.id)
      .eq("template_usage", "result_poster");

    if (clearError) {
      await deleteAdminStorageAsset({
        bucket: uploadedAsset.bucket,
        path: uploadedAsset.path,
      }).catch(() => undefined);
      return stopLoading(clearError.message);
    }

    const { data, error: insertError } = await supabase
      .from("poster_templates")
      .insert({
        organization_id: eventInfo.organization_id,
        event_id: eventInfo.id,
        name: finalName,
        image_url: uploadedAsset.publicUrl,
        template_usage: "result_poster",
        is_active: true,
        canvas_width: canvasWidth,
        canvas_height: canvasHeight,
        layout: initialLayout,
        show_ad_banner: false,
        ad_banner_url: null,
        ad_x: 0,
        ad_y: Math.max(0, canvasHeight - Math.round(240 * (canvasHeight / 1350))),
        ad_width: canvasWidth,
        ad_height: Math.max(80, Math.round(240 * (canvasHeight / 1350))),
      })
      .select("*")
      .single();

    if (insertError) {
      await deleteAdminStorageAsset({
        bucket: uploadedAsset.bucket,
        path: uploadedAsset.path,
      }).catch(() => undefined);
      return stopLoading(insertError.message);
    }

    const newTemplate = {
      ...(data as PosterTemplate),
      layout: normalizeLayout((data as PosterTemplate).layout),
      show_ad_banner: Boolean((data as PosterTemplate).show_ad_banner),
      ad_banner_url: (data as PosterTemplate).ad_banner_url || null,
      ad_x: Number((data as PosterTemplate).ad_x ?? 0),
      ad_y: Number((data as PosterTemplate).ad_y ?? 1110),
      ad_width: Number((data as PosterTemplate).ad_width ?? 1077),
      ad_height: Number((data as PosterTemplate).ad_height ?? 240),
    };

    setTemplates((current) => [
      newTemplate,
      ...current.map((template) => ({
        ...template,
        is_active: false,
      })),
    ].slice(0, MAX_PUBLIC_TEMPLATES));
    setSelectedTemplateId(newTemplate.id);
    setTemplateName("");
    setTemplateFile(null);
    setTemplateDimensions(null);
    setShowUploadModal(false);
    setIsUploading(false);
    await loadData();
    setMessage("Template uploaded successfully. It is now the default design, and all saved designs remain available publicly.");
  }

  async function syncTemplateDimensions(
    template: PosterTemplate,
    naturalWidth: number,
    naturalHeight: number,
  ) {
    const currentWidth = Number(template.canvas_width || 1077);
    const currentHeight = Number(template.canvas_height || 1350);

    if (
      !naturalWidth ||
      !naturalHeight ||
      (currentWidth === naturalWidth && currentHeight === naturalHeight) ||
      isSyncingDimensions
    ) {
      return;
    }

    setIsSyncingDimensions(true);

    const scaledLayout = scaleLayoutToCanvas(
      normalizeLayout(template.layout),
      currentWidth,
      currentHeight,
      naturalWidth,
      naturalHeight,
    );
    const scaleX = naturalWidth / Math.max(1, currentWidth);
    const scaleY = naturalHeight / Math.max(1, currentHeight);
    const patch = {
      canvas_width: naturalWidth,
      canvas_height: naturalHeight,
      layout: scaledLayout,
      ad_x: Math.round(Number(template.ad_x || 0) * scaleX),
      ad_y: Math.round(Number(template.ad_y || 0) * scaleY),
      ad_width: Math.round(
        Number(template.ad_width || currentWidth) * scaleX,
      ),
      ad_height: Math.round(Number(template.ad_height || 240) * scaleY),
    };

    const { error: updateError } = await supabase
      .from("poster_templates")
      .update(patch)
      .eq("id", template.id);

    if (updateError) {
      setError(updateError.message);
      setIsSyncingDimensions(false);
      return;
    }

    updateActiveTemplate(patch);
    setMessage(
      `Template size detected: ${naturalWidth} × ${naturalHeight}px. Layout was adjusted automatically.`,
    );
    setIsSyncingDimensions(false);
    window.setTimeout(updatePreviewScale, 60);
  }

  async function uploadAdBanner(file: File) {
    setError("");
    setMessage("");

    if (!eventInfo || !activeTemplate) {
      setError("Select a template first.");
      return;
    }

    setIsUploadingAd(true);

    let uploadedAsset;

    try {
      uploadedAsset = await uploadAdminStorageAsset({
        file,
        assetType: "poster_ad_banner",
      });
    } catch (uploadError) {
      return stopLoading(
        uploadError instanceof Error
          ? uploadError.message
          : "Ad banner upload failed.",
      );
    }

    const previousAdUrl = activeTemplate.ad_banner_url;
    const patch = {
      ad_banner_url: uploadedAsset.publicUrl,
      show_ad_banner: true,
      ad_x: activeTemplate.ad_x ?? 0,
      ad_y:
        activeTemplate.ad_y ??
        Math.max(0, Number(activeTemplate.canvas_height || 1350) - 240),
      ad_width: activeTemplate.ad_width || activeTemplate.canvas_width || 1077,
      ad_height: activeTemplate.ad_height || 240,
    };

    const { error: updateError } = await supabase
      .from("poster_templates")
      .update(patch)
      .eq("id", activeTemplate.id);

    if (updateError) {
      await deleteAdminStorageAsset({
        bucket: uploadedAsset.bucket,
        path: uploadedAsset.path,
      }).catch(() => undefined);
      return stopLoading(updateError.message);
    }

    if (previousAdUrl && previousAdUrl !== uploadedAsset.publicUrl) {
      await deleteAdminStorageAsset({ url: previousAdUrl });
    }

    updateActiveTemplate(patch);
    setMessage("Ad banner uploaded and previous stored banner cleaned.");
    setIsUploadingAd(false);
  }

  async function setActiveTemplate(templateId: string) {
    if (!eventInfo) return;

    setError("");
    setMessage("");

    const { error: clearError } = await supabase
      .from("poster_templates")
      .update({ is_active: false })
      .eq("event_id", eventInfo.id)
      .eq("template_usage", "result_poster");

    if (clearError) {
      setError(clearError.message);
      return;
    }

    const { error: activeError } = await supabase
      .from("poster_templates")
      .update({ is_active: true })
      .eq("id", templateId);

    if (activeError) {
      setError(activeError.message);
      return;
    }

    setTemplates((current) =>
      current.map((template) => ({
        ...template,
        is_active: template.id === templateId,
      })),
    );

    setSelectedTemplateId(templateId);
    setMessage("Default result poster template updated.");
  }

  async function deleteTemplate(templateId: string) {
    const confirmed = confirm("Delete this custom poster template?");
    if (!confirmed) return;

    setError("");
    setMessage("");

    const templateToDelete = templates.find(
      (template) => template.id === templateId,
    );
    const remainingTemplates = templates.filter(
      (template) => template.id !== templateId,
    );

    const { error: deleteError } = await supabase
      .from("poster_templates")
      .delete()
      .eq("id", templateId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (templateToDelete?.image_url) {
      await deleteAdminStorageAsset({ url: templateToDelete.image_url });
    }
    if (templateToDelete?.ad_banner_url) {
      await deleteAdminStorageAsset({ url: templateToDelete.ad_banner_url });
    }

    if (templateToDelete?.is_active && remainingTemplates[0]) {
      const { error: defaultError } = await supabase
        .from("poster_templates")
        .update({ is_active: true })
        .eq("id", remainingTemplates[0].id);

      if (defaultError) {
        setError(
          `Template was deleted, but the next default could not be activated: ${defaultError.message}`,
        );
        await loadData();
        return;
      }
    }

    setMessage("Template and stored assets deleted.");
    await loadData();
  }

  function updateActiveTemplate(patch: Partial<PosterTemplate>) {
    if (!activeTemplate) return;

    setTemplates((current) =>
      current.map((template) =>
        template.id === activeTemplate.id ? { ...template, ...patch } : template,
      ),
    );
  }

  function updateLayer(key: LayerKey, patch: Partial<PosterField>) {
    if (!activeTemplate) return;

    const currentLayout = normalizeLayout(activeTemplate.layout);
    const nextLayout = cloneLayout(currentLayout);

    nextLayout[key] = {
      ...nextLayout[key],
      ...patch,
    };

    updateActiveTemplate({ layout: nextLayout });
  }

  async function saveTemplatePositions() {
    if (!activeTemplate) return;

    setIsSavingPosition(true);
    setError("");
    setMessage("");

    const layoutToSave = normalizeLayout(activeTemplate.layout);

    const { error: updateError } = await supabase
      .from("poster_templates")
      .update({
        canvas_width: Number(activeTemplate.canvas_width || 1077),
        canvas_height: Number(activeTemplate.canvas_height || 1350),
        layout: layoutToSave,
        show_ad_banner: Boolean(activeTemplate.show_ad_banner),
        ad_banner_url: activeTemplate.ad_banner_url || null,
        ad_x: Number(activeTemplate.ad_x || 0),
        ad_y: Number(activeTemplate.ad_y || 0),
        ad_width: Number(
          activeTemplate.ad_width || activeTemplate.canvas_width || 1077,
        ),
        ad_height: Number(activeTemplate.ad_height || 240),
      })
      .eq("id", activeTemplate.id);

    if (updateError) return stopLoading(updateError.message);

    setMessage("Poster layout saved.");
    setIsSavingPosition(false);
  }

  function resetLayout() {
    const confirmed = confirm("Reset text positions to default values?");
    if (!confirmed) return;

    updateActiveTemplate({ layout: cloneLayout(DEFAULT_LAYOUT) });
  }

  async function removeAdBanner() {
    if (!activeTemplate) return;

    const previousAdUrl = activeTemplate.ad_banner_url;
    const { error: updateError } = await supabase
      .from("poster_templates")
      .update({
        show_ad_banner: false,
        ad_banner_url: null,
      })
      .eq("id", activeTemplate.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (previousAdUrl) {
      await deleteAdminStorageAsset({ url: previousAdUrl });
    }

    updateActiveTemplate({
      show_ad_banner: false,
      ad_banner_url: null,
    });
    setMessage("Ad banner removed from the poster and Storage.");
  }

  function startTextDrag(event: PointerEvent<HTMLDivElement>, key: LayerKey) {
    event.preventDefault();
    event.stopPropagation();

    if (!activeTemplate) return;

    focusPosterPreview();
    setSelectedLayer(key);

    const layer = activeLayout[key];

    dragRef.current = {
      kind: "text",
      key,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: layer.x,
      startY: layer.y,
    };

    window.addEventListener("pointermove", handleDragMove as any);
    window.addEventListener("pointerup", stopDrag as any);
  }

  function startAdDrag(event: PointerEvent<HTMLImageElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (!activeTemplate) return;

    dragRef.current = {
      kind: "ad",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: Number(activeTemplate.ad_x || 0),
      startY: Number(activeTemplate.ad_y || 0),
    };

    window.addEventListener("pointermove", handleDragMove as any);
    window.addEventListener("pointerup", stopDrag as any);
  }

  function handleDragMove(event: globalThis.PointerEvent) {
    const drag = dragRef.current;
    if (!drag || !activeTemplate) return;

    const dx = (event.clientX - drag.startClientX) / scale;
    const dy = (event.clientY - drag.startClientY) / scale;

    if (drag.kind === "text") {
      updateLayer(drag.key, {
        x: Math.round(drag.startX + dx),
        y: Math.round(drag.startY + dy),
      });

      return;
    }

    updateActiveTemplate({
      ad_x: Math.round(drag.startX + dx),
      ad_y: Math.round(drag.startY + dy),
    });
  }

  function stopDrag() {
    dragRef.current = null;
    window.removeEventListener("pointermove", handleDragMove as any);
    window.removeEventListener("pointerup", stopDrag as any);
  }

  function loadImage(url: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image load failed"));
      image.src = url;
    });
  }

  async function drawCanvasPoster() {
    if (!activeTemplate) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const layout = normalizeLayout(activeTemplate.layout);
    const width = Number(activeTemplate.canvas_width || 1077);
    const height = Number(activeTemplate.canvas_height || 1350);

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const bg = await loadImage(activeTemplate.image_url);

      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(bg, 0, 0, width, height);

      if (activeTemplate.show_ad_banner && activeTemplate.ad_banner_url) {
        const ad = await loadImage(activeTemplate.ad_banner_url);

        ctx.drawImage(
          ad,
          Number(activeTemplate.ad_x || 0),
          Number(activeTemplate.ad_y || 0),
          Number(activeTemplate.ad_width || width),
          Number(activeTemplate.ad_height || 240),
        );
      }

      if (typeof document !== "undefined" && "fonts" in document) {
        await (document as any).fonts.ready;
      }

      FIELD_ORDER.forEach((key) => {
        drawTextField(ctx, key, posterData[key], layout[key]);
      });
    } catch {
      setError(
        "Template image could not load. Check template file path or Supabase bucket public access.",
      );
    }
  }

  function drawTextField(
    ctx: CanvasRenderingContext2D,
    key: LayerKey,
    text: string,
    field: PosterField,
  ) {
    if (field.visible === false || !text || text === "-") return;

    ctx.save();

    const fontSize = getAutoFitFontSize(key, text, field, ctx);
    const letterSpacing = Number.parseFloat(field.letterSpacing || "0") || 0;
    ctx.fillStyle = field.color || "#ffffff";
    ctx.font = `${Number(field.fontWeight || 700)} ${fontSize}px ${
      field.fontFamily || "Arial, sans-serif"
    }`;
    ctx.textBaseline = "top";

    const lines = AUTO_FIT_LAYER_KEYS.includes(key)
      ? [text]
      : wrapCanvasText(ctx, text || "", Number(field.width || 500), letterSpacing);
    const lineHeight = fontSize * Number(field.lineHeight || 1.1);

    lines.forEach((line, index) => {
      const measuredWidth = getTextWidthWithSpacing(ctx, line, letterSpacing);
      let drawX = Number(field.x || 0);

      if (field.align === "center") {
        drawX = Number(field.x || 0) +
          (Number(field.width || 0) - measuredWidth) / 2;
      } else if (field.align === "right") {
        drawX =
          Number(field.x || 0) + Number(field.width || 0) - measuredWidth;
      }

      const drawY = Number(field.y || 0) + index * lineHeight;

      if (letterSpacing === 0) {
        ctx.fillText(line, drawX, drawY);
      } else {
        let cursor = drawX;
        Array.from(line).forEach((character) => {
          ctx.fillText(character, cursor, drawY);
          cursor += ctx.measureText(character).width + letterSpacing;
        });
      }
    });

    ctx.restore();
  }

  function wrapCanvasText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    letterSpacing: number,
  ) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";

    words.forEach((word) => {
      const testLine = line ? `${line} ${word}` : word;
      const width = getTextWidthWithSpacing(ctx, testLine, letterSpacing);

      if (width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    });

    if (line) lines.push(line);
    return lines;
  }

  async function downloadPoster() {
    await drawCanvasPoster();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const programmeName = posterData.programme || "poster";
    const link = document.createElement("a");

    link.download = `${programmeName.replace(/\s+/g, "_")}_result_poster.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function copyWhatsAppText() {
    const text = `🏆 ${eventInfo?.title || "Meelad Fest"} Result

📌 Programme: ${posterData.programme}
🏷️ Category: ${posterData.category}

🥇 ${posterData.first_name} - ${posterData.first_unit}
🥈 ${posterData.second_name} - ${posterData.second_unit}
🥉 ${posterData.third_name} - ${posterData.third_unit}

Generated by FestEazy`;

    navigator.clipboard.writeText(text);
    setMessage("WhatsApp result text copied.");
  }

  return (
    <AdminShell
      title="Poster Studio"
      subtitle="Add up to three result poster designs and position each layout separately."
      actions={
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 sm:px-4 sm:text-sm"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => canAddTemplate && setShowUploadModal(true)}
            disabled={!canAddTemplate}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-3 py-3 text-xs font-black text-white shadow-lg shadow-violet-900/20 hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none sm:px-5 sm:text-sm"
          >
            <ImagePlus size={17} />
            {canAddTemplate
              ? `Add Template (${templates.length}/${MAX_PUBLIC_TEMPLATES})`
              : `${MAX_PUBLIC_TEMPLATES} Templates Added`}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
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

        {isLoading ? (
          <div className="flex min-h-64 items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5 sm:min-h-96 sm:rounded-[2rem]">
            <div className="flex items-center gap-3 text-sm font-black text-slate-500">
              <Loader2 className="animate-spin text-violet-700" size={24} />
              Loading poster studio...
            </div>
          </div>
        ) : !activeTemplate ? (
          <div className="rounded-[1.5rem] border border-dashed border-violet-200 bg-white px-5 py-14 text-center shadow-xl shadow-slate-900/5 sm:rounded-[2rem] sm:px-8 sm:py-20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
              <ImagePlus size={30} />
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-[-0.05em] text-slate-950">
              Add your result poster template
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-slate-500">
              No default poster is used. Upload the exact design required for this event, then position the result text on it.
            </p>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/20 sm:w-auto"
            >
              <Upload size={18} />
              Add First Template
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 rounded-[1.5rem] border border-violet-100 bg-gradient-to-r from-violet-50 to-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="text-sm font-black text-slate-950">
                  Public poster choices
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                  Parents and students can choose any uploaded design. The default design opens first.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                  {templates.length}/{MAX_PUBLIC_TEMPLATES} templates
                </span>
                <button
                  type="button"
                  onClick={() => canAddTemplate && setShowUploadModal(true)}
                  disabled={!canAddTemplate}
                  className="rounded-full bg-violet-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {canAddTemplate ? "Add another" : "Limit reached"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-start">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/5 sm:rounded-[2rem] sm:p-5">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                      Draggable Preview
                    </h2>

                    <p className="mt-1 text-sm font-bold text-slate-500">
                      Click a text layer, then drag it or use the keyboard arrows for precise positioning.
                    </p>
                    <p className="mt-1 text-xs font-bold text-violet-600">
                      Arrow keys: 1 px · Shift + Arrow: 10 px
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-2 rounded-2xl bg-violet-50 px-4 py-2 text-xs font-black text-violet-700">
                    <Move size={15} />
                    Drag Mode
                  </span>
                </div>

                {!activeTemplate ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center">
                    <ImagePlus className="mx-auto text-slate-400" size={44} />
                    <p className="mt-4 text-sm font-black text-slate-700">
                      Template not found.
                    </p>
                  </div>
                ) : (
                  <div className="flex justify-center overflow-auto rounded-2xl bg-slate-100 p-2 sm:rounded-3xl sm:p-4">
                    <div
                      ref={previewWrapRef}
                      tabIndex={0}
                      onKeyDown={handlePreviewKeyDown}
                      onPointerDown={focusPosterPreview}
                      aria-label="Poster preview. Select a text layer and use arrow keys to move it."
                      className="relative w-full max-w-[620px] overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20 outline-none focus:ring-4 focus:ring-violet-300/60"
                      style={{
                        aspectRatio: `${activeTemplate.canvas_width || 1077} / ${
                          activeTemplate.canvas_height || 1350
                        }`,
                      }}
                    >
                      <img
                        src={activeTemplate.image_url}
                        alt={activeTemplate.name}
                        onLoad={(event) => {
                          updatePreviewScale();
                          void syncTemplateDimensions(
                            activeTemplate,
                            event.currentTarget.naturalWidth,
                            event.currentTarget.naturalHeight,
                          );
                        }}
                        className="absolute inset-0 h-full w-full select-none object-fill"
                        draggable={false}
                      />

                      {activeTemplate.show_ad_banner &&
                        activeTemplate.ad_banner_url && (
                          <img
                            src={activeTemplate.ad_banner_url}
                            alt="Ad banner"
                            onPointerDown={startAdDrag}
                            className="absolute cursor-move select-none ring-2 ring-emerald-300/80"
                            draggable={false}
                            style={{
                              left: Number(activeTemplate.ad_x || 0) * scale,
                              top: Number(activeTemplate.ad_y || 0) * scale,
                              width:
                                Number(
                                  activeTemplate.ad_width ||
                                    activeTemplate.canvas_width ||
                                    1077,
                                ) * scale,
                              height: Number(activeTemplate.ad_height || 240) * scale,
                              touchAction: "none",
                            }}
                          />
                        )}

                      {FIELD_ORDER.map((key) => {
                        const field = activeLayout[key];
                        const isActive = selectedLayer === key;
                        const value = posterData[key];

                        if (field.visible === false || !value || value === "-") {
                          return null;
                        }

                        const fittedFontSize = getAutoFitFontSize(
                          key,
                          value,
                          field,
                        );

                        return (
                          <div
                            key={key}
                            onPointerDown={(event) => startTextDrag(event, key)}
                            onClick={() => setSelectedLayer(key)}
                            className={`absolute cursor-move select-none rounded-md px-1 transition ${
                              isActive
                                ? "ring-2 ring-yellow-300 ring-offset-2 ring-offset-black/20"
                                : "hover:ring-2 hover:ring-white/60"
                            }`}
                            style={{
                              left: field.x * scale,
                              top: field.y * scale,
                              width: field.width * scale,
                              color: field.color,
                              fontSize: fittedFontSize * scale,
                              fontFamily: field.fontFamily,
                              fontWeight: field.fontWeight,
                              lineHeight: field.lineHeight,
                              letterSpacing: field.letterSpacing,
                              textAlign: field.align,
                              touchAction: "none",
                            }}
                            title={FIELD_LABELS[key]}
                          >
                            {value}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <canvas ref={canvasRef} className="hidden" />
              </div>

              <aside className="space-y-5 xl:sticky xl:top-28">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
                  <h2 className="text-lg font-black tracking-[-0.04em] text-slate-950">
                    Poster Setup
                  </h2>

                  <label className="mt-5 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Template
                  </label>

                  <select
                    value={activeTemplate?.id || ""}
                    onChange={(event) => setSelectedTemplateId(event.target.value)}
                    className="mt-2 h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
                  >
                    {templates.length === 0 ? (
                      <option value="">No templates</option>
                    ) : (
                      templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} {template.is_active ? "(Default)" : ""}
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    type="button"
                    onClick={() => canAddTemplate && setShowUploadModal(true)}
                    disabled={!canAddTemplate}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <ImagePlus size={17} />
                    {canAddTemplate
                      ? `Upload Another (${templates.length}/${MAX_PUBLIC_TEMPLATES})`
                      : "Maximum 3 Templates"}
                  </button>

                  <label className="mt-5 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Preview Result
                  </label>

                  <select
                    value={selectedProgrammeId}
                    onChange={(event) => setSelectedProgrammeId(event.target.value)}
                    className="mt-2 h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
                  >
                    {resultProgrammes.length === 0 ? (
                      <option value="">No published result yet — sample data shown</option>
                    ) : (
                      resultProgrammes.map((programme) => (
                        <option key={programme.id} value={programme.id}>
                          {programme.name}
                        </option>
                      ))
                    )}
                  </select>

                  {selectedProgrammeId &&
                    posterLocks.some(
                      (item) => item.programme_id === selectedProgrammeId,
                    ) && (
                      <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                        <p className="text-xs font-black text-emerald-800">
                          Official poster data is locked
                        </p>
                        <p className="mt-1 text-[11px] font-bold leading-4 text-emerald-700">
                          This keeps its result number and winner details stable. Use refresh only after correcting a published result.
                        </p>
                        <button
                          type="button"
                          onClick={refreshOfficialPosterData}
                          disabled={isRefreshingLock}
                          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-700 disabled:opacity-60"
                        >
                          {isRefreshingLock ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <RefreshCcw size={14} />
                          )}
                          Refresh Official Data
                        </button>
                      </div>
                    )}

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={downloadPoster}
                      disabled={!activeTemplate}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 disabled:opacity-50"
                    >
                      <Download size={17} />
                      PNG
                    </button>

                    <button
                      type="button"
                      onClick={copyWhatsAppText}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
                    >
                      Copy Text
                    </button>
                  </div>
                </div>

                {activeTemplate && (
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
                    <h2 className="text-lg font-black tracking-[-0.04em] text-slate-950">
                      Layer Controls
                    </h2>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                      Choose a text item, make simple changes, then drag it on the poster.
                    </p>

                    <label className="mt-5 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Selected Text
                    </label>

                    <select
                      value={selectedLayer}
                      onChange={(event) => {
                        setSelectedLayer(event.target.value as LayerKey);
                        setShowAdvancedControls(false);
                      }}
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none"
                    >
                      {FIELD_ORDER.map((key) => (
                        <option key={key} value={key}>
                          {FIELD_LABELS[key]}
                        </option>
                      ))}
                    </select>

                    <label className="mt-4 flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <span>
                        <span className="block text-sm font-black text-slate-800">
                          Show this text
                        </span>
                        <span className="mt-1 block text-[11px] font-bold text-slate-500">
                          Hide unused institution, event or footer details.
                        </span>
                      </span>

                      <span className="flex items-center gap-2">
                        {selectedField.visible === false ? (
                          <EyeOff size={17} className="text-slate-400" />
                        ) : (
                          <Eye size={17} className="text-violet-600" />
                        )}
                        <input
                          type="checkbox"
                          checked={selectedField.visible !== false}
                          onChange={(event) =>
                            updateLayer(selectedLayer, {
                              visible: event.target.checked,
                            })
                          }
                          className="h-5 w-5 accent-violet-600"
                        />
                      </span>
                    </label>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <NumberInput
                        label="Font Size"
                        value={selectedField.fontSize}
                        onChange={(value) =>
                          updateLayer(selectedLayer, { fontSize: value })
                        }
                      />

                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                          Text Color
                        </label>
                        <input
                          type="color"
                          value={selectedField.color}
                          onChange={(event) =>
                            updateLayer(selectedLayer, {
                              color: event.target.value,
                            })
                          }
                          className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white p-2"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {(["left", "center", "right"] as const).map((align) => (
                        <button
                          key={align}
                          type="button"
                          onClick={() => updateLayer(selectedLayer, { align })}
                          className={`rounded-xl border px-3 py-2 text-xs font-black capitalize ${
                            selectedField.align === align
                              ? "border-violet-300 bg-violet-50 text-violet-700"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {align}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAdvancedControls((value) => !value)}
                      className="mt-4 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700"
                    >
                      Advanced Positioning
                      <ChevronDown
                        size={17}
                        className={`transition ${
                          showAdvancedControls ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {showAdvancedControls && (
                      <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                        <div className="grid grid-cols-2 gap-3">
                          <NumberInput
                            label="X"
                            value={selectedField.x}
                            onChange={(value) =>
                              updateLayer(selectedLayer, { x: value })
                            }
                          />
                          <NumberInput
                            label="Y"
                            value={selectedField.y}
                            onChange={(value) =>
                              updateLayer(selectedLayer, { y: value })
                            }
                          />
                          <NumberInput
                            label="Width"
                            value={selectedField.width}
                            onChange={(value) =>
                              updateLayer(selectedLayer, { width: value })
                            }
                          />
                          <NumberInput
                            label="Weight"
                            value={selectedField.fontWeight}
                            onChange={(value) =>
                              updateLayer(selectedLayer, { fontWeight: value })
                            }
                          />
                          <NumberInput
                            label="Line Height"
                            value={selectedField.lineHeight}
                            step="0.05"
                            onChange={(value) =>
                              updateLayer(selectedLayer, { lineHeight: value })
                            }
                          />
                          <NumberInput
                            label="Letter Space"
                            value={
                              Number.parseFloat(selectedField.letterSpacing) || 0
                            }
                            step="0.5"
                            onChange={(value) =>
                              updateLayer(selectedLayer, {
                                letterSpacing: `${value}px`,
                              })
                            }
                          />
                        </div>

                        <div className="mt-4">
                          <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                            Font Family
                          </label>
                          <FontFamilySelect
                            value={selectedField.fontFamily}
                            onChange={(fontFamily) =>
                              updateLayer(selectedLayer, {
                                fontFamily,
                                fontWeight: getSupportedFontWeight(
                                  fontFamily,
                                  selectedField.fontWeight,
                                ),
                              })
                            }
                            ariaLabel="Poster layer font family"
                            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs font-bold leading-5 text-violet-800">
                      Click the selected text on the poster, then use Arrow keys to move it by 1 px. Hold Shift for 10 px movement.
                    </div>

                    <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-bold leading-5 text-emerald-800">
                      Long programme and winner names automatically shrink to fit their box.
                    </div>
                  </div>
                )}
              </aside>
            </div>

            {activeTemplate && (
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-black tracking-[-0.04em] text-slate-950">
                        Institution & Event Footer
                      </h2>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                        Institution name, event title, date, venue and footer are separate text layers.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          FOOTER_LAYER_KEYS.forEach((key) =>
                            updateLayer(key, { visible: true }),
                          );
                          setSelectedLayer("organization_name");
                        }}
                        className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white"
                      >
                        Show Footer
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          FOOTER_LAYER_KEYS.forEach((key) =>
                            updateLayer(key, { visible: false }),
                          )
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600"
                      >
                        Hide Footer
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
                  <h2 className="text-lg font-black tracking-[-0.04em] text-slate-950">
                    Sponsor Banner
                  </h2>

                  <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                    Optional sponsor banner overlay. Keep OFF if your template already has banner design.
                  </p>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
                    <div className="space-y-4">
                      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <span className="text-sm font-black text-slate-700">
                          Show Ad Banner
                        </span>

                        <input
                          type="checkbox"
                          checked={Boolean(activeTemplate.show_ad_banner)}
                          onChange={(event) =>
                            updateActiveTemplate({
                              show_ad_banner: event.target.checked,
                            })
                          }
                          className="h-5 w-5 accent-violet-600"
                        />
                      </label>

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        disabled={isUploadingAd}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) uploadAdBanner(file);
                          event.target.value = "";
                        }}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold"
                      />

                      {isUploadingAd && (
                        <div className="flex items-center gap-2 text-xs font-black text-violet-700">
                          <Loader2 className="animate-spin" size={15} />
                          Uploading banner...
                        </div>
                      )}

                      {activeTemplate.ad_banner_url && (
                        <img
                          src={activeTemplate.ad_banner_url}
                          alt="Ad banner"
                          className="h-20 w-full rounded-2xl border border-slate-200 object-cover"
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <NumberInput
                        label="Ad X"
                        value={activeTemplate.ad_x}
                        onChange={(value) => updateActiveTemplate({ ad_x: value })}
                      />

                      <NumberInput
                        label="Ad Y"
                        value={activeTemplate.ad_y}
                        onChange={(value) => updateActiveTemplate({ ad_y: value })}
                      />

                      <NumberInput
                        label="Ad Width"
                        value={activeTemplate.ad_width}
                        onChange={(value) =>
                          updateActiveTemplate({ ad_width: value })
                        }
                      />

                      <NumberInput
                        label="Ad Height"
                        value={activeTemplate.ad_height}
                        onChange={(value) =>
                          updateActiveTemplate({ ad_height: value })
                        }
                      />

                      <button
                        type="button"
                        onClick={removeAdBanner}
                        className="col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700"
                      >
                        Remove Banner
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
                  <h2 className="text-lg font-black tracking-[-0.04em] text-slate-950">
                    Save Actions
                  </h2>

                  <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                    Save layout after dragging text or changing banner positions.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={saveTemplatePositions}
                      disabled={isSavingPosition}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-4 text-sm font-black text-white disabled:opacity-60"
                    >
                      {isSavingPosition ? (
                        <Loader2 className="animate-spin" size={17} />
                      ) : (
                        <Save size={17} />
                      )}
                      Save Layout
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTemplate(activeTemplate.id)}
                      className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-black text-emerald-700"
                    >
                      Make Default Template
                    </button>

                    <button
                      type="button"
                      onClick={resetLayout}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-black text-slate-700"
                    >
                      Reset Given Values
                    </button>

                    <button
  type="button"
  onClick={() => deleteTemplate(activeTemplate.id)}
  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-black text-red-700"
>
  <Trash2 size={17} />
  Delete Template
</button>
                  </div>
                </div>
              </div>
              </div>
            )}
          </>
        )}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:px-4">
          <form
            onSubmit={uploadTemplate}
            className="w-full max-w-lg rounded-t-[1.75rem] bg-white p-5 pb-8 shadow-2xl sm:rounded-[2rem] sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                  Upload Custom Template
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  You can keep up to 3 designs. The newest upload becomes the default, while all designs remain available publicly.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Template Name
                </label>

                <input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="e.g. Black Gold Result Template"
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Template Image
                </label>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={async (event) => {
                    const file = event.target.files?.[0] || null;
                    setTemplateFile(file);
                    setTemplateDimensions(null);

                    if (file && !templateName) {
                      setTemplateName(file.name.replace(/\.[^/.]+$/, ""));
                    }

                    if (file) {
                      try {
                        setTemplateDimensions(await readImageDimensions(file));
                      } catch (dimensionError) {
                        setError(
                          dimensionError instanceof Error
                            ? dimensionError.message
                            : "Unable to read the template image.",
                        );
                      }
                    }
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold"
                />
                {templateDimensions && (
                  <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                    Detected size: {templateDimensions.width} × {templateDimensions.height}px
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/20 disabled:opacity-60"
            >
              {isUploading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Upload size={18} />
              )}
              Upload Template
            </button>
          </form>
        </div>
      )}
    </AdminShell>
  );
}

function NumberInput({
  label,
  value,
  step = "1",
  onChange,
}: {
  label: string;
  value: number;
  step?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>

      <input
        type="number"
        step={step}
        value={value || 0}
        onChange={(event) => onChange(Number(event.target.value || 0))}
        className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </div>
  );
}