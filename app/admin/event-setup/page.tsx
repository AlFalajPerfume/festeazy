/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import { clearAdminContextCache } from "@/lib/admin-context";
import {
  deleteAdminStorageAsset,
  uploadAdminStorageAsset,
} from "@/lib/admin-storage";
import { formatDateRange, slugify } from "@/lib/ulsav";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Copy,
  Globe2,
  ImagePlus,
  Loader2,
  LockKeyhole,
  MapPin,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type Organization = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  email: string | null;
  place: string | null;
  logo_url: string | null;
  status: string;
  plan_start: string | null;
  plan_end: string | null;
};

type EventRow = {
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

type OrganizationUser = {
  organization_id: string;
  role: string;
  is_active: boolean;
};

type ParticipationRules = {
  limitsEnabled: boolean;
  individualUnlimited: boolean;
  groupUnlimited: boolean;
  totalUnlimited: boolean;
  stageUnlimited: boolean;
  offStageUnlimited: boolean;
  maleUnlimited: boolean;
  femaleUnlimited: boolean;
  maxIndividualProgrammes: string;
  maxGroupProgrammes: string;
  maxTotalProgrammes: string;
  maxStageProgrammes: string;
  maxOffStageProgrammes: string;
  maxMaleProgrammes: string;
  maxFemaleProgrammes: string;
};


type PointRules = {
  individualFirst: string;
  individualSecond: string;
  individualThird: string;
  individualFourth: string;
  groupFirst: string;
  groupSecond: string;
  groupThird: string;
  groupFourth: string;
};

type GradeRules = {
  aPlusMin: string;
  aMin: string;
  bMin: string;
  cMin: string;
};

type FormState = {
  madrasaName: string;
  place: string;
  phone: string;
  email: string;
  logoUrl: string;
  eventTitle: string;
  eventType: string;
  tagline: string;
  venue: string;
  startDate: string;
  endDate: string;
  publicSlug: string;
  isPublic: boolean;
  planStart: string;
  planEnd: string;
};

const emptyForm: FormState = {
  madrasaName: "",
  place: "",
  phone: "",
  email: "",
  logoUrl: "",
  eventTitle: "Meelad Fest 2026",
  eventType: "meelad",
  tagline: "Celebrating knowledge, talent and tradition",
  venue: "",
  startDate: "",
  endDate: "",
  publicSlug: "",
  isPublic: true,
  planStart: "",
  planEnd: "",
};

const defaultParticipationRules: ParticipationRules = {
  limitsEnabled: false,
  individualUnlimited: true,
  groupUnlimited: true,
  totalUnlimited: true,
  stageUnlimited: true,
  offStageUnlimited: true,
  maleUnlimited: true,
  femaleUnlimited: true,
  maxIndividualProgrammes: "3",
  maxGroupProgrammes: "2",
  maxTotalProgrammes: "5",
  maxStageProgrammes: "3",
  maxOffStageProgrammes: "2",
  maxMaleProgrammes: "5",
  maxFemaleProgrammes: "3",
};

const defaultPointRules: PointRules = {
  individualFirst: "10",
  individualSecond: "5",
  individualThird: "3",
  individualFourth: "1",
  groupFirst: "20",
  groupSecond: "15",
  groupThird: "10",
  groupFourth: "5",
};

const defaultGradeRules: GradeRules = {
  aPlusMin: "80",
  aMin: "70",
  bMin: "60",
  cMin: "50",
};

const LOGO_BUCKET = "organization-logos";
const MAX_LOGO_FILE_SIZE = 5 * 1024 * 1024;

const eventTypes = [
  { value: "meelad", label: "Meelad Programme" },
  { value: "arts_fest", label: "Islamic Arts Fest" },
  { value: "annual_day", label: "Madrasa Annual Day" },
  { value: "competition", label: "General Competition" },
];

export default function EventSetupPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [eventId, setEventId] = useState("");
  const [role, setRole] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [participationRules, setParticipationRules] =
    useState<ParticipationRules>(defaultParticipationRules);
  const [participationRulesOpen, setParticipationRulesOpen] = useState(false);
  const [pointRules, setPointRules] =
    useState<PointRules>(defaultPointRules);
  const [gradeRules, setGradeRules] =
    useState<GradeRules>(defaultGradeRules);
  const [gradeRulesOpen, setGradeRulesOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isRemovingLogo, setIsRemovingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadEventSetup();
  }, []);

  const previewUrl = useMemo(() => {
    if (!form.publicSlug.trim()) return "/event/your-event";
    return `/event/${form.publicSlug.trim()}`;
  }, [form.publicSlug]);

  const planStatus = useMemo(() => {
    if (!form.planEnd) {
      return {
        label: "Plan period not assigned",
        tone: "slate" as const,
        message: "Contact the FestEazy super-admin to assign the subscription period.",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(`${form.planEnd}T00:00:00`);
    if (Number.isNaN(endDate.getTime())) {
      return {
        label: "Plan date unavailable",
        tone: "slate" as const,
        message: "The current plan period could not be verified.",
      };
    }

    const remainingMilliseconds = endDate.getTime() - today.getTime();
    const remainingDays = Math.ceil(remainingMilliseconds / 86_400_000);

    if (remainingDays < 0) {
      return {
        label: "Plan expired",
        tone: "red" as const,
        message: "Contact the FestEazy super-admin to renew the plan.",
      };
    }

    if (remainingDays <= 14) {
      return {
        label: `${remainingDays} day${remainingDays === 1 ? "" : "s"} remaining`,
        tone: "amber" as const,
        message: "The plan will expire soon. Contact the super-admin for renewal.",
      };
    }

    return {
      label: "Plan active",
      tone: "emerald" as const,
      message: `${remainingDays} days remaining in the current plan.`,
    };
  }, [form.planEnd]);

  function updateField(field: keyof FormState, value: string | boolean) {
    setForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "eventTitle" && !current.publicSlug.trim()) {
        next.publicSlug = slugify(String(value));
      }

      return next;
    });
  }

  function updateParticipationRule(
    field: keyof ParticipationRules,
    value: string | boolean,
  ) {
    setParticipationRules((current) => {
      const next = {
        ...current,
        [field]: value,
      } as ParticipationRules;

      const individualValue = Number(next.maxIndividualProgrammes);
      const groupValue = Number(next.maxGroupProgrammes);
      const canCalculateTotal =
        !next.individualUnlimited &&
        !next.groupUnlimited &&
        Number.isInteger(individualValue) &&
        individualValue >= 1 &&
        Number.isInteger(groupValue) &&
        groupValue >= 1;

      next.totalUnlimited = !canCalculateTotal;
      next.maxTotalProgrammes = canCalculateTotal
        ? String(individualValue + groupValue)
        : "";

      return next;
    });
  }

  function updatePointRule(field: keyof PointRules, value: string) {
    setPointRules((current) => ({
      ...current,
      [field]: value.replace(/[^0-9]/g, ""),
    }));
  }

  function parsePointValue(value: string, label: string) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 999) {
      throw new Error(`${label} must be a whole number between 0 and 999.`);
    }

    return parsed;
  }

  function updateGradeRule(field: keyof GradeRules, value: string) {
    setGradeRules((current) => ({
      ...current,
      [field]: value.replace(/[^0-9.]/g, ""),
    }));
  }

  function parseGradeRule(value: string, label: string) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      throw new Error(`${label} must be between 0 and 100.`);
    }

    return Number(parsed.toFixed(2));
  }

  function parseParticipationLimit(
    value: string,
    unlimited: boolean,
    label: string,
  ) {
    if (unlimited) return null;

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 999) {
      throw new Error(`${label} must be a whole number between 1 and 999.`);
    }

    return parsed;
  }


  function notifyOrganizationUpdated(next: {
    name?: string;
    slug?: string;
    phone?: string | null;
    email?: string | null;
    place?: string | null;
    logoUrl?: string | null;
  }) {
    if (typeof window === "undefined") return;

    window.dispatchEvent(
      new CustomEvent("festeazy:organization-updated", { detail: next }),
    );
  }

  function getStoredLogoPath(url: string) {
    const marker = `/storage/v1/object/public/${LOGO_BUCKET}/`;
    const markerIndex = url.indexOf(marker);

    if (markerIndex < 0) return "";

    return decodeURIComponent(
      url.slice(markerIndex + marker.length).split("?")[0] || "",
    );
  }

  async function createOptimizedLogo(file: File) {
    const sourceUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("The selected logo could not be opened."));
        nextImage.src = sourceUrl;
      });

      const canvasSize = 640;
      const innerSize = 560;
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing is not available in this browser.");

      context.clearRect(0, 0, canvasSize, canvasSize);

      const scale = Math.min(
        innerSize / Math.max(1, image.naturalWidth),
        innerSize / Math.max(1, image.naturalHeight),
      );
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const drawX = (canvasSize - drawWidth) / 2;
      const drawY = (canvasSize - drawHeight) / 2;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("The optimized logo could not be created."));
          },
          "image/webp",
          0.92,
        );
      });
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  async function handleLogoSelected(file: File | null) {
    if (!file) return;

    setMessage("");
    setError("");

    if (!organizationId) {
      setError("Please wait until the madrasa account finishes loading.");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a PNG, JPG or WebP logo.");
      return;
    }

    if (file.size > MAX_LOGO_FILE_SIZE) {
      setError("Logo file must be smaller than 5 MB.");
      return;
    }

    setIsUploadingLogo(true);

    try {
      const oldLogoUrl = form.logoUrl;
      const optimizedLogo = await createOptimizedLogo(file);
      const uploadedAsset = await uploadAdminStorageAsset({
        file: optimizedLogo,
        filename: "organization-logo.webp",
        assetType: "organization_logo",
      });
      const logoUrl = uploadedAsset.displayUrl;

      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (updateError) {
        await deleteAdminStorageAsset({
          bucket: uploadedAsset.bucket,
          path: uploadedAsset.path,
        }).catch(() => undefined);
        throw updateError;
      }

      updateField("logoUrl", logoUrl);
      clearAdminContextCache();
      notifyOrganizationUpdated({ logoUrl });
      setMessage("Madrasa logo uploaded and profile updated.");

      if (oldLogoUrl && oldLogoUrl !== logoUrl) {
        await deleteAdminStorageAsset({ url: oldLogoUrl });
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Logo upload failed. Please try again.",
      );
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (!organizationId || !form.logoUrl) return;

    setMessage("");
    setError("");
    setIsRemovingLogo(true);

    try {
      const oldLogoUrl = form.logoUrl;
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          logo_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId);

      if (updateError) throw updateError;

      updateField("logoUrl", "");
      clearAdminContextCache();
      notifyOrganizationUpdated({ logoUrl: null });
      setMessage("Madrasa logo removed. The default FestEazy icon is now used.");

      await deleteAdminStorageAsset({ url: oldLogoUrl });
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Could not remove the logo.",
      );
    } finally {
      setIsRemovingLogo(false);
    }
  }

  async function getLoggedInOrganizationId() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return { organizationId: "", role: "", error: sessionError.message };
    }

    if (!session?.user) {
      return {
        organizationId: "",
        role: "",
        error: "You are not logged in. Please login again.",
      };
    }

    const { data: userLink, error: userLinkError } = await supabase
      .from("organization_users")
      .select("organization_id, role, is_active")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (userLinkError || !userLink) {
      return {
        organizationId: "",
        role: "",
        error:
          "This login is not connected to any madrasa. Please connect this user in organization_users table.",
      };
    }

    const link = userLink as OrganizationUser;

    return {
      organizationId: link.organization_id,
      role: link.role,
      error: "",
    };
  }

  async function loadEventSetup() {
    setIsLoading(true);
    setError("");
    setMessage("");

    const context = await getLoggedInOrganizationId();

    if (context.error) {
      setError(context.error);
      setIsLoading(false);
      return;
    }

    setOrganizationId(context.organizationId);
    setRole(context.role);

    const { data: organizationData, error: organizationError } = await supabase
      .from("organizations")
      .select(
        "id, name, slug, phone, email, place, logo_url, status, plan_start, plan_end",
      )
      .eq("id", context.organizationId)
      .single();

    if (organizationError || !organizationData) {
      setError(
        organizationError?.message ||
          "Madrasa profile not found for this login.",
      );
      setIsLoading(false);
      return;
    }

    const organization = organizationData as Organization;

    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select(
        "id, organization_id, title, event_type, tagline, venue, start_date, end_date, public_slug, is_public",
      )
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (eventsError) {
      setError(eventsError.message);
      setIsLoading(false);
      return;
    }

    const event = (eventsData?.[0] || null) as EventRow | null;

    setEventId(event?.id || "");

    if (event?.id) {
      const { data: ruleData, error: ruleError } = await supabase
        .from("event_participation_rules")
        .select(
          "limits_enabled, max_individual_programmes, max_group_programmes, max_total_programmes, max_stage_programmes, max_off_stage_programmes, max_male_programmes, max_female_programmes",
        )
        .eq("organization_id", organization.id)
        .eq("event_id", event.id)
        .maybeSingle();

      if (ruleError) {
        setError(ruleError.message);
        setIsLoading(false);
        return;
      }

      const loadedIndividualLimit =
        ruleData?.max_individual_programmes ?? null;
      const loadedGroupLimit = ruleData?.max_group_programmes ?? null;
      const calculatedTotalLimit =
        loadedIndividualLimit === null || loadedGroupLimit === null
          ? null
          : loadedIndividualLimit + loadedGroupLimit;
      const loadedStageLimit = ruleData?.max_stage_programmes ?? null;
      const loadedOffStageLimit = ruleData?.max_off_stage_programmes ?? null;
      const loadedMaleLimit = ruleData?.max_male_programmes ?? null;
      const loadedFemaleLimit = ruleData?.max_female_programmes ?? null;

      setParticipationRules({
        limitsEnabled: Boolean(ruleData?.limits_enabled),
        individualUnlimited: loadedIndividualLimit === null,
        groupUnlimited: loadedGroupLimit === null,
        totalUnlimited: calculatedTotalLimit === null,
        stageUnlimited: loadedStageLimit === null,
        offStageUnlimited: loadedOffStageLimit === null,
        maleUnlimited: loadedMaleLimit === null,
        femaleUnlimited: loadedFemaleLimit === null,
        maxIndividualProgrammes: String(loadedIndividualLimit ?? 3),
        maxGroupProgrammes: String(loadedGroupLimit ?? 2),
        maxTotalProgrammes: String(calculatedTotalLimit ?? ""),
        maxStageProgrammes: String(loadedStageLimit ?? 3),
        maxOffStageProgrammes: String(loadedOffStageLimit ?? 2),
        maxMaleProgrammes: String(loadedMaleLimit ?? 5),
        maxFemaleProgrammes: String(loadedFemaleLimit ?? 3),
      });

      const { data: pointRuleData, error: pointRuleError } = await supabase
        .from("event_point_rules")
        .select(
          "individual_first, individual_second, individual_third, individual_fourth, group_first, group_second, group_third, group_fourth",
        )
        .eq("organization_id", organization.id)
        .eq("event_id", event.id)
        .maybeSingle();

      if (pointRuleError) {
        setError(pointRuleError.message);
        setIsLoading(false);
        return;
      }

      setPointRules({
        individualFirst: String(pointRuleData?.individual_first ?? 10),
        individualSecond: String(pointRuleData?.individual_second ?? 5),
        individualThird: String(pointRuleData?.individual_third ?? 3),
        individualFourth: String(pointRuleData?.individual_fourth ?? 1),
        groupFirst: String(pointRuleData?.group_first ?? 20),
        groupSecond: String(pointRuleData?.group_second ?? 15),
        groupThird: String(pointRuleData?.group_third ?? 10),
        groupFourth: String(pointRuleData?.group_fourth ?? 5),
      });

      const { data: gradeRuleData, error: gradeRuleError } = await supabase
        .from("event_grade_rules")
        .select("a_plus_min, a_min, b_min, c_min")
        .eq("organization_id", organization.id)
        .eq("event_id", event.id)
        .maybeSingle();

      if (gradeRuleError) {
        setError(gradeRuleError.message);
        setIsLoading(false);
        return;
      }

      setGradeRules({
        aPlusMin: String(gradeRuleData?.a_plus_min ?? 80),
        aMin: String(gradeRuleData?.a_min ?? 70),
        bMin: String(gradeRuleData?.b_min ?? 60),
        cMin: String(gradeRuleData?.c_min ?? 50),
      });
    } else {
      setParticipationRules(defaultParticipationRules);
      setPointRules(defaultPointRules);
      setGradeRules(defaultGradeRules);
    }

    const defaultPublicSlug =
      event?.public_slug ||
      slugify(`${organization.slug || organization.name}-meelad`);

    setForm({
      madrasaName: organization.name || "",
      place: organization.place || "",
      phone: organization.phone || "",
      email: organization.email || "",
      logoUrl: organization.logo_url || "",
      planStart: organization.plan_start || "",
      planEnd: organization.plan_end || "",
      eventTitle: event?.title || "Meelad Fest 2026",
      eventType: event?.event_type || "meelad",
      tagline:
        event?.tagline || "Celebrating knowledge, talent and tradition",
      venue: event?.venue || "",
      startDate: event?.start_date || "",
      endDate: event?.end_date || "",
      publicSlug: defaultPublicSlug,
      isPublic: event?.is_public ?? true,
    });

    setIsLoading(false);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!organizationId) {
      setError("This login is not connected to any madrasa.");
      return;
    }

    if (!form.madrasaName.trim()) {
      setError("Please enter madrasa / institute name.");
      return;
    }

    if (!form.eventTitle.trim()) {
      setError("Please enter event name.");
      return;
    }

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setError("Event end date cannot be earlier than the start date.");
      return;
    }

    const publicSlug = slugify(
      form.publicSlug || form.eventTitle || form.madrasaName,
    );

    if (!publicSlug) {
      setError("Please enter a valid public portal slug.");
      return;
    }

    let maxIndividualProgrammes: number | null = null;
    let maxGroupProgrammes: number | null = null;
    let maxTotalProgrammes: number | null = null;
    let maxStageProgrammes: number | null = null;
    let maxOffStageProgrammes: number | null = null;
    let maxMaleProgrammes: number | null = null;
    let maxFemaleProgrammes: number | null = null;
    let parsedPointRules: Record<keyof PointRules, number>;
    let parsedGradeRules: Record<keyof GradeRules, number>;

    try {
      maxIndividualProgrammes = parseParticipationLimit(
        participationRules.maxIndividualProgrammes,
        participationRules.individualUnlimited,
        "Individual programme limit",
      );
      maxGroupProgrammes = parseParticipationLimit(
        participationRules.maxGroupProgrammes,
        participationRules.groupUnlimited,
        "Group programme limit",
      );
      maxTotalProgrammes =
        maxIndividualProgrammes === null || maxGroupProgrammes === null
          ? null
          : maxIndividualProgrammes + maxGroupProgrammes;

      maxStageProgrammes = parseParticipationLimit(
        participationRules.maxStageProgrammes,
        participationRules.stageUnlimited,
        "Stage programme limit",
      );

      maxOffStageProgrammes = parseParticipationLimit(
        participationRules.maxOffStageProgrammes,
        participationRules.offStageUnlimited,
        "Off-stage programme limit",
      );

      maxMaleProgrammes = parseParticipationLimit(
        participationRules.maxMaleProgrammes,
        participationRules.maleUnlimited,
        "Boys overall programme limit",
      );

      maxFemaleProgrammes = parseParticipationLimit(
        participationRules.maxFemaleProgrammes,
        participationRules.femaleUnlimited,
        "Girls overall programme limit",
      );

      parsedPointRules = {
        individualFirst: parsePointValue(pointRules.individualFirst, "Individual 1st place points"),
        individualSecond: parsePointValue(pointRules.individualSecond, "Individual 2nd place points"),
        individualThird: parsePointValue(pointRules.individualThird, "Individual 3rd place points"),
        individualFourth: parsePointValue(pointRules.individualFourth, "Individual 4th place points"),
        groupFirst: parsePointValue(pointRules.groupFirst, "Group 1st place points"),
        groupSecond: parsePointValue(pointRules.groupSecond, "Group 2nd place points"),
        groupThird: parsePointValue(pointRules.groupThird, "Group 3rd place points"),
        groupFourth: parsePointValue(pointRules.groupFourth, "Group 4th place points"),
      };

      parsedGradeRules = {
        aPlusMin: parseGradeRule(gradeRules.aPlusMin, "A+ minimum"),
        aMin: parseGradeRule(gradeRules.aMin, "A minimum"),
        bMin: parseGradeRule(gradeRules.bMin, "B minimum"),
        cMin: parseGradeRule(gradeRules.cMin, "C minimum"),
      };

      if (!(
        parsedGradeRules.aPlusMin > parsedGradeRules.aMin &&
        parsedGradeRules.aMin > parsedGradeRules.bMin &&
        parsedGradeRules.bMin > parsedGradeRules.cMin
      )) {
        throw new Error(
          "Grade minimums must be in descending order: A+ > A > B > C.",
        );
      }
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Participation rules are invalid.",
      );
      return;
    }

    setIsSaving(true);

    /*
      IMPORTANT:
      plan_start and plan_end are intentionally NOT included here.
      Madrasa admins can view plan dates but cannot update them from Event Setup.
      Subscription dates must be controlled from the Super Admin panel.
    */
    const orgPayload = {
      name: form.madrasaName.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      place: form.place.trim() || null,
      logo_url: form.logoUrl.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error: updateOrgError } = await supabase
      .from("organizations")
      .update(orgPayload)
      .eq("id", organizationId);

    if (updateOrgError) {
      setError(updateOrgError.message);
      setIsSaving(false);
      return;
    }

    const eventPayload = {
      organization_id: organizationId,
      title: form.eventTitle.trim(),
      event_type: form.eventType,
      tagline: form.tagline.trim() || null,
      venue: form.venue.trim() || null,
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      public_slug: publicSlug,
      is_public: form.isPublic,
      updated_at: new Date().toISOString(),
    };

    let savedEventId = eventId;

    if (eventId) {
      const { error: updateEventError } = await supabase
        .from("events")
        .update(eventPayload)
        .eq("id", eventId)
        .eq("organization_id", organizationId);

      if (updateEventError) {
        setError(updateEventError.message);
        setIsSaving(false);
        return;
      }
    } else {
      const { data: insertedEvent, error: insertEventError } = await supabase
        .from("events")
        .insert(eventPayload)
        .select("id")
        .single();

      if (insertEventError) {
        setError(insertEventError.message);
        setIsSaving(false);
        return;
      }

      savedEventId = insertedEvent.id;
      setEventId(insertedEvent.id);
    }

    const { error: rulesError } = await supabase
      .from("event_participation_rules")
      .upsert(
        {
          organization_id: organizationId,
          event_id: savedEventId,
          limits_enabled: participationRules.limitsEnabled,
          max_individual_programmes: maxIndividualProgrammes,
          max_group_programmes: maxGroupProgrammes,
          max_total_programmes: maxTotalProgrammes,
          max_stage_programmes: maxStageProgrammes,
          max_off_stage_programmes: maxOffStageProgrammes,
          max_male_programmes: maxMaleProgrammes,
          max_female_programmes: maxFemaleProgrammes,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "organization_id,event_id",
        },
      );

    if (rulesError) {
      setError(rulesError.message);
      setIsSaving(false);
      return;
    }

    const { error: pointRulesError } = await supabase
      .from("event_point_rules")
      .upsert(
        {
          organization_id: organizationId,
          event_id: savedEventId,
          individual_first: parsedPointRules.individualFirst,
          individual_second: parsedPointRules.individualSecond,
          individual_third: parsedPointRules.individualThird,
          individual_fourth: parsedPointRules.individualFourth,
          group_first: parsedPointRules.groupFirst,
          group_second: parsedPointRules.groupSecond,
          group_third: parsedPointRules.groupThird,
          group_fourth: parsedPointRules.groupFourth,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "organization_id,event_id",
        },
      );

    if (pointRulesError) {
      setError(pointRulesError.message);
      setIsSaving(false);
      return;
    }

    const { error: gradeRulesError } = await supabase
      .from("event_grade_rules")
      .upsert(
        {
          organization_id: organizationId,
          event_id: savedEventId,
          a_plus_min: parsedGradeRules.aPlusMin,
          a_min: parsedGradeRules.aMin,
          b_min: parsedGradeRules.bMin,
          c_min: parsedGradeRules.cMin,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "organization_id,event_id",
        },
      );

    if (gradeRulesError) {
      setError(gradeRulesError.message);
      setIsSaving(false);
      return;
    }

    setForm((current) => ({ ...current, publicSlug }));
    clearAdminContextCache();
    notifyOrganizationUpdated({
      name: form.madrasaName.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      place: form.place.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
    });
    setMessage("Event setup, participation rules, point rules and grade rules saved successfully.");
    setIsSaving(false);
  }

  async function copyPublicLink() {
    try {
      const link = `${window.location.origin}${previewUrl}`;
      await navigator.clipboard.writeText(link);
      setMessage("Public portal link copied.");
    } catch {
      setError("Could not copy link. Please copy it manually.");
    }
  }

  return (
    <AdminShell
      title="Event Setup"
      subtitle="Manage event and public portal details for this Madrasa / Institute."
      actions={
        <button
          type="button"
          onClick={copyPublicLink}
          className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 sm:inline-flex"
        >
          <Copy size={17} />
          Copy Portal Link
        </button>
      }
    >
      <div className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <form
          onSubmit={handleSave}
          className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5"
        >
          <div className="border-b border-slate-200 bg-gradient-to-r from-violet-50 to-fuchsia-50 p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-violet-700 shadow-sm">
              <Sparkles size={16} />
              Event configuration
            </div>

            <h2 className="mt-4 text-3xl font-black tracking-[-0.06em] text-slate-950">
              Basic Event Information
            </h2>

            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
              These details are used in the public portal, reports, posters and
              event documents.
            </p>

            {role && (
              <p className="mt-3 inline-flex rounded-full bg-violet-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-violet-700">
                Role: {role.replaceAll("_", " ")}
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex min-h-96 items-center justify-center gap-3 text-sm font-black text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Loading event setup...
            </div>
          ) : error && !organizationId ? (
            <div className="flex min-h-96 items-center justify-center p-6">
              <div className="max-w-xl rounded-[2rem] border border-red-200 bg-red-50 p-6 text-center">
                <AlertCircle className="mx-auto text-red-600" size={36} />
                <h3 className="mt-4 text-2xl font-black tracking-[-0.05em] text-red-950">
                  Madrasa connection missing
                </h3>
                <p className="mt-2 text-sm font-bold leading-6 text-red-700">
                  {error}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 p-6 sm:p-8">
              <section>
                <SectionTitle
                  title="Madrasa / Institute Details"
                  description="Basic contact and identity information."
                />

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Madrasa / Institute Name *">
                    <input
                      value={form.madrasaName}
                      onChange={(event) =>
                        updateField("madrasaName", event.target.value)
                      }
                      placeholder="e.g. RM Cheroor Kotta Madrasa"
                      className="ulsav-input"
                    />
                  </Field>

                  <Field label="Place">
                    <input
                      value={form.place}
                      onChange={(event) =>
                        updateField("place", event.target.value)
                      }
                      placeholder="e.g. Kasaragod"
                      className="ulsav-input"
                    />
                  </Field>

                  <Field label="Phone">
                    <input
                      value={form.phone}
                      onChange={(event) =>
                        updateField("phone", event.target.value)
                      }
                      placeholder="Contact number"
                      className="ulsav-input"
                    />
                  </Field>

                  <Field label="Email">
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        updateField("email", event.target.value)
                      }
                      placeholder="Optional email"
                      className="ulsav-input"
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      Madrasa Logo
                    </span>

                    <div className="rounded-[1.7rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) =>
                          handleLogoSelected(event.target.files?.[0] || null)
                        }
                      />

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
                          {form.logoUrl ? (
                            <img
                              src={form.logoUrl}
                              alt={`${form.madrasaName || "Madrasa"} logo`}
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white">
                              <ImagePlus size={34} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-black text-slate-950">
                            {form.logoUrl ? "Current madrasa logo" : "Upload madrasa logo"}
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                            PNG, JPG or WebP · Maximum 5 MB. The image is optimized automatically and used in the admin profile and public portal.
                          </p>

                          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <button
                              type="button"
                              disabled={isUploadingLogo || isRemovingLogo}
                              onClick={() => logoInputRef.current?.click()}
                              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-900/15 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUploadingLogo ? (
                                <Loader2 className="animate-spin" size={17} />
                              ) : (
                                <Upload size={17} />
                              )}
                              {isUploadingLogo
                                ? "Uploading..."
                                : form.logoUrl
                                  ? "Replace Logo"
                                  : "Upload Logo"}
                            </button>

                            {form.logoUrl && (
                              <button
                                type="button"
                                disabled={isUploadingLogo || isRemovingLogo}
                                onClick={removeLogo}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isRemovingLogo ? (
                                  <Loader2 className="animate-spin" size={17} />
                                ) : (
                                  <Trash2 size={17} />
                                )}
                                {isRemovingLogo ? "Removing..." : "Remove"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="h-px bg-slate-200" />

              <section>
                <SectionTitle
                  title="Event Details"
                  description="Control the information shown publicly for this event."
                />

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Event Name *">
                    <input
                      value={form.eventTitle}
                      onChange={(event) =>
                        updateField("eventTitle", event.target.value)
                      }
                      placeholder="e.g. Meelad Fest 2026"
                      className="ulsav-input"
                    />
                  </Field>

                  <Field label="Event Type">
                    <select
                      value={form.eventType}
                      onChange={(event) =>
                        updateField("eventType", event.target.value)
                      }
                      className="ulsav-input"
                    >
                      {eventTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Tagline" className="sm:col-span-2">
                    <input
                      value={form.tagline}
                      onChange={(event) =>
                        updateField("tagline", event.target.value)
                      }
                      placeholder="e.g. Inspiring Excellence Through Competition"
                      className="ulsav-input"
                    />
                  </Field>

                  <Field label="Venue">
                    <input
                      value={form.venue}
                      onChange={(event) =>
                        updateField("venue", event.target.value)
                      }
                      placeholder="e.g. Madrasa Ground"
                      className="ulsav-input"
                    />
                  </Field>

                  <Field label="Public Portal Slug">
                    <input
                      value={form.publicSlug}
                      onChange={(event) =>
                        updateField("publicSlug", slugify(event.target.value))
                      }
                      placeholder="meelad-fest-2026"
                      className="ulsav-input"
                    />
                  </Field>

                  <Field label="Start Date">
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(event) =>
                        updateField("startDate", event.target.value)
                      }
                      className="ulsav-input"
                    />
                  </Field>

                  <Field label="End Date">
                    <input
                      type="date"
                      value={form.endDate}
                      min={form.startDate || undefined}
                      onChange={(event) =>
                        updateField("endDate", event.target.value)
                      }
                      className="ulsav-input"
                    />
                  </Field>
                </div>
              </section>

              <div className="h-px bg-slate-200" />

              <section>
                <button
                  type="button"
                  onClick={() => setParticipationRulesOpen((current) => !current)}
                  aria-expanded={participationRulesOpen}
                  className="flex w-full items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-violet-200 hover:bg-violet-50/30 sm:px-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-black text-slate-950">
                        Participation Rules
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                          participationRules.limitsEnabled
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        Optional · {participationRules.limitsEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                      Set optional student participation limits. Open this section only when changes are needed.
                    </p>
                  </div>

                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-slate-500 transition-transform ${
                      participationRulesOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {participationRulesOpen && (
                  <div className="mt-4 rounded-[1.8rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-violet-200 hover:bg-violet-50/40">
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          Enable participation limits
                        </p>
                        <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                          When disabled, students can join any number of eligible programmes.
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={participationRules.limitsEnabled}
                        onChange={(event) =>
                          updateParticipationRule(
                            "limitsEnabled",
                            event.target.checked,
                          )
                        }
                        className="h-5 w-5 shrink-0 accent-violet-600"
                      />
                    </label>

                    <div
                      className={`mt-5 space-y-4 ${
                        participationRules.limitsEnabled
                          ? ""
                          : "pointer-events-none opacity-50"
                      }`}
                    >
                      <div className="rounded-[1.7rem] border border-slate-200 bg-white p-4 sm:p-5">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            Programme type limits
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                            Individual and Group limits are optional. Total is calculated automatically from both.
                          </p>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-3">
                          <ParticipationLimitField
                            label="Individual Programmes"
                            description="Maximum individual programmes for one student."
                            value={participationRules.maxIndividualProgrammes}
                            unlimited={participationRules.individualUnlimited}
                            onValueChange={(value) =>
                              updateParticipationRule(
                                "maxIndividualProgrammes",
                                value,
                              )
                            }
                            onUnlimitedChange={(checked) =>
                              updateParticipationRule(
                                "individualUnlimited",
                                checked,
                              )
                            }
                          />

                          <ParticipationLimitField
                            label="Group Programmes"
                            description="Maximum group programmes for one student."
                            value={participationRules.maxGroupProgrammes}
                            unlimited={participationRules.groupUnlimited}
                            onValueChange={(value) =>
                              updateParticipationRule("maxGroupProgrammes", value)
                            }
                            onUnlimitedChange={(checked) =>
                              updateParticipationRule("groupUnlimited", checked)
                            }
                          />

                          <CalculatedParticipationLimitCard
                            label="Total Programmes"
                            description="Automatically calculated from Individual and Group limits."
                            value={participationRules.maxTotalProgrammes}
                            unlimited={participationRules.totalUnlimited}
                          />
                        </div>
                      </div>

                      <div className="rounded-[1.7rem] border border-slate-200 bg-white p-4 sm:p-5">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            Programme location limits
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                            Optionally restrict how many Stage and Off-Stage programmes one student can join.
                          </p>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <ParticipationLimitField
                            label="Stage Programmes"
                            description="Maximum stage programmes for one student."
                            value={participationRules.maxStageProgrammes}
                            unlimited={participationRules.stageUnlimited}
                            onValueChange={(value) =>
                              updateParticipationRule("maxStageProgrammes", value)
                            }
                            onUnlimitedChange={(checked) =>
                              updateParticipationRule("stageUnlimited", checked)
                            }
                          />

                          <ParticipationLimitField
                            label="Off-Stage Programmes"
                            description="Maximum off-stage programmes for one student."
                            value={participationRules.maxOffStageProgrammes}
                            unlimited={participationRules.offStageUnlimited}
                            onValueChange={(value) =>
                              updateParticipationRule("maxOffStageProgrammes", value)
                            }
                            onUnlimitedChange={(checked) =>
                              updateParticipationRule("offStageUnlimited", checked)
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-[1.7rem] border border-slate-200 bg-white p-4 sm:p-5">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            Gender-specific overall limits
                          </p>
                          <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                            Optionally restrict the combined non-General total for boys or girls.
                          </p>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <ParticipationLimitField
                            label="Boys Overall Programmes"
                            description="Maximum combined non-General programmes for one boy."
                            value={participationRules.maxMaleProgrammes}
                            unlimited={participationRules.maleUnlimited}
                            onValueChange={(value) =>
                              updateParticipationRule("maxMaleProgrammes", value)
                            }
                            onUnlimitedChange={(checked) =>
                              updateParticipationRule("maleUnlimited", checked)
                            }
                          />

                          <ParticipationLimitField
                            label="Girls Overall Programmes"
                            description="Maximum combined non-General programmes for one girl."
                            value={participationRules.maxFemaleProgrammes}
                            unlimited={participationRules.femaleUnlimited}
                            onValueChange={(value) =>
                              updateParticipationRule("maxFemaleProgrammes", value)
                            }
                            onUnlimitedChange={(checked) =>
                              updateParticipationRule("femaleUnlimited", checked)
                            }
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs font-bold leading-5 text-violet-700">
                        General programmes are excluded from every participation limit. Individual, Group, Stage, Off-Stage, Boys and Girls rules remain optional. Total is automatically calculated when both Individual and Group limits are set.
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <div className="h-px bg-slate-200" />

              <section>
                <SectionTitle
                  title="Result Point Rules"
                  description="Set the team points awarded for Individual and Group programme positions. Tied participants receive the same position points, and the next position is skipped."
                />

                <div className="mt-4 grid gap-5 lg:grid-cols-2">
                  <PointRuleCard
                    title="Individual Programme Points"
                    description="Default: 10, 5, 3 and 1 points from 1st to 4th place."
                    values={[
                      pointRules.individualFirst,
                      pointRules.individualSecond,
                      pointRules.individualThird,
                      pointRules.individualFourth,
                    ]}
                    onChange={(index, value) =>
                      updatePointRule(
                        ([
                          "individualFirst",
                          "individualSecond",
                          "individualThird",
                          "individualFourth",
                        ] as const)[index],
                        value,
                      )
                    }
                  />

                  <PointRuleCard
                    title="Group Programme Points"
                    description="Default: 20, 15, 10 and 5 points from 1st to 4th place."
                    values={[
                      pointRules.groupFirst,
                      pointRules.groupSecond,
                      pointRules.groupThird,
                      pointRules.groupFourth,
                    ]}
                    onChange={(index, value) =>
                      updatePointRule(
                        ([
                          "groupFirst",
                          "groupSecond",
                          "groupThird",
                          "groupFourth",
                        ] as const)[index],
                        value,
                      )
                    }
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
                  Tie example: two participants tied for 1st are ranked 1st and 1st. Both receive 1st-place points, and the following participant is ranked 3rd.
                </div>
              </section>

              <div className="h-px bg-slate-200" />

              <section className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setGradeRulesOpen((current) => !current)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                >
                  <div>
                    <p className="text-lg font-black tracking-[-0.03em] text-slate-950">
                      Grade Rules
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                      Set the minimum percentage for each grade. These rules are used for new and recalculated results across FestEazy.
                    </p>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`shrink-0 text-slate-500 transition ${
                      gradeRulesOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {gradeRulesOpen && (
                  <div className="border-t border-slate-200 bg-white p-4 sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <GradeRuleField
                        grade="A+"
                        value={gradeRules.aPlusMin}
                        onChange={(value) => updateGradeRule("aPlusMin", value)}
                      />
                      <GradeRuleField
                        grade="A"
                        value={gradeRules.aMin}
                        onChange={(value) => updateGradeRule("aMin", value)}
                      />
                      <GradeRuleField
                        grade="B"
                        value={gradeRules.bMin}
                        onChange={(value) => updateGradeRule("bMin", value)}
                      />
                      <GradeRuleField
                        grade="C"
                        value={gradeRules.cMin}
                        onChange={(value) => updateGradeRule("cMin", value)}
                      />
                    </div>

                    <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs font-bold leading-5 text-violet-800">
                      D is automatic for every percentage below the C minimum. Default rules: A+ 80%, A 70%, B 60%, C 50%.
                    </div>
                  </div>
                )}
              </section>

              <div className="h-px bg-slate-200" />

              <section>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <SectionTitle
                    title="Access & Plan"
                    description="Subscription dates are controlled only by the FestEazy super-admin."
                  />

                  <span
                    className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${getPlanToneClasses(
                      planStatus.tone,
                    )}`}
                  >
                    <ShieldCheck size={14} />
                    {planStatus.label}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <PlanDateCard
                    label="Plan Start Date"
                    value={form.planStart}
                    emptyText="Not assigned"
                  />

                  <PlanDateCard
                    label="Plan End Date"
                    value={form.planEnd}
                    emptyText="Not assigned"
                  />
                </div>

                <div
                  className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${getPlanNoticeClasses(
                    planStatus.tone,
                  )}`}
                >
                  <LockKeyhole className="mt-0.5 shrink-0" size={18} />
                  <p className="leading-6">
                    {planStatus.message} Madrasa admins cannot change plan dates
                    from Event Setup.
                  </p>
                </div>

                <label className="mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-violet-200 hover:bg-violet-50/40">
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Public portal enabled
                    </p>
                    <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                      Parents and students can view published results when this
                      option is enabled and the plan is active.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(event) =>
                      updateField("isPublic", event.target.checked)
                    }
                    className="h-5 w-5 shrink-0 accent-violet-600"
                  />
                </label>
              </section>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  <CheckCircle2 size={18} />
                  {message}
                </div>
              )}

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs font-bold leading-5 text-slate-500">
                  Saving this page updates the madrasa profile and event only.
                  Subscription dates remain unchanged.
                </p>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 px-6 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  {isSaving ? "Saving..." : "Save Event Setup"}
                </button>
              </div>
            </div>
          )}
        </form>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-violet-600">
              Live Preview
            </p>

            <div className="mt-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {form.logoUrl ? (
                <img
                  src={form.logoUrl}
                  alt="Madrasa logo preview"
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white">
                  <ImagePlus size={24} />
                </div>
              )}
            </div>

            <h3 className="mt-3 text-3xl font-black tracking-[-0.06em] text-slate-950">
              {form.eventTitle || "Meelad Fest 2026"}
            </h3>

            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
              {form.tagline || "Your event tagline will appear here."}
            </p>

            <div className="mt-5 space-y-3">
              <PreviewItem
                icon={<MapPin size={18} />}
                label="Institute"
                value={form.madrasaName || "Madrasa name not set"}
              />

              <PreviewItem
                icon={<CalendarDays size={18} />}
                label="Event Date"
                value={formatDateRange(form.startDate, form.endDate)}
              />

              <PreviewItem
                icon={<Globe2 size={18} />}
                label="Public Link"
                value={previewUrl}
              />
            </div>

            <button
              type="button"
              onClick={copyPublicLink}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 transition hover:bg-violet-100"
            >
              <Copy size={17} />
              Copy Public Link
            </button>
          </div>

          <div className="rounded-[2rem] border border-violet-200 bg-violet-50 p-6">
            <div className="flex items-center gap-2 text-violet-800">
              <LockKeyhole size={18} />
              <p className="text-sm font-black">Plan security</p>
            </div>

            <p className="mt-3 text-sm font-bold leading-6 text-violet-700">
              Plan start and end dates are read-only here. Renewal and plan
              changes must be completed from the FestEazy Super Admin panel.
            </p>
          </div>

          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm font-black text-amber-900">
              Multi-madrasa mode
            </p>

            <ol className="mt-3 space-y-3 text-sm font-bold leading-6 text-amber-800">
              <li>1. One login belongs to one Madrasa.</li>
              <li>2. This page edits only that Madrasa.</li>
              <li>3. Other Madrasas cannot access this event data.</li>
              <li>4. Every event has its own public portal link.</li>
            </ol>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">
        {title}
      </h3>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function GradeRuleField({
  grade,
  value,
  onChange,
}: {
  grade: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
      <span className="block text-sm font-black text-slate-950">{grade}</span>
      <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
        Minimum percentage
      </span>
      <div className="relative mt-3">
        <input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="ulsav-input pr-10 text-center"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">
          %
        </span>
      </div>
    </label>
  );
}

function PointRuleCard({
  title,
  description,
  values,
  onChange,
}: {
  title: string;
  description: string;
  values: string[];
  onChange: (index: number, value: string) => void;
}) {
  const labels = ["1st", "2nd", "3rd", "4th"];

  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <p className="text-sm font-black text-slate-950">{title}</p>
      <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {labels.map((label, index) => (
          <label key={label} className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
              {label}
            </span>
            <input
              type="number"
              min="0"
              max="999"
              step="1"
              value={values[index] || ""}
              onChange={(event) => onChange(index, event.target.value)}
              className="ulsav-input text-center"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function CalculatedParticipationLimitCard({
  label,
  description,
  value,
  unlimited,
}: {
  label: string;
  description: string;
  value: string;
  unlimited: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-violet-200 bg-violet-50/50 p-4">
      <p className="text-sm font-black text-slate-950">{label}</p>
      <p className="mt-1 min-h-10 text-xs font-bold leading-5 text-slate-500">
        {description}
      </p>

      <div className="ulsav-input mt-3 flex items-center bg-violet-50 font-black text-violet-700">
        {unlimited ? "No limit" : value || "—"}
      </div>

      <p className="mt-3 text-[11px] font-black text-violet-600">
        {unlimited
          ? "Set both Individual and Group limits to calculate Total."
          : "Calculated automatically and saved with the event."}
      </p>
    </div>
  );
}

function ParticipationLimitField({
  label,
  description,
  value,
  unlimited,
  onValueChange,
  onUnlimitedChange,
}: {
  label: string;
  description: string;
  value: string;
  unlimited: boolean;
  onValueChange: (value: string) => void;
  onUnlimitedChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-black text-slate-950">{label}</p>
      <p className="mt-1 min-h-10 text-xs font-bold leading-5 text-slate-500">
        {description}
      </p>

      <input
        type="number"
        min="1"
        max="999"
        step="1"
        value={value}
        disabled={unlimited}
        onChange={(event) => onValueChange(event.target.value)}
        className="ulsav-input mt-3 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      />

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs font-black text-slate-600">
        <input
          type="checkbox"
          checked={unlimited}
          onChange={(event) => onUnlimitedChange(event.target.checked)}
          className="h-4 w-4 accent-violet-600"
        />
        No limit
      </label>
    </div>
  );
}

function PlanDateCard({
  label,
  value,
  emptyText,
}: {
  label: string;
  value: string;
  emptyText: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          {label}
        </p>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
          <LockKeyhole size={11} />
          Read only
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm ring-1 ring-slate-200">
          <CalendarDays size={20} />
        </div>

        <div className="min-w-0">
          <p className="text-lg font-black tracking-[-0.03em] text-slate-950">
            {value ? formatPlanDate(value) : emptyText}
          </p>
          <p className="mt-0.5 text-xs font-bold text-slate-500">
            Managed by FestEazy Super Admin
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <div className="mt-0.5 text-violet-600">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-black text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

function formatPlanDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPlanToneClasses(tone: "emerald" | "amber" | "red" | "slate") {
  if (tone === "emerald") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "amber") {
    return "border border-amber-200 bg-amber-50 text-amber-700";
  }

  if (tone === "red") {
    return "border border-red-200 bg-red-50 text-red-700";
  }

  return "border border-slate-200 bg-slate-50 text-slate-600";
}

function getPlanNoticeClasses(tone: "emerald" | "amber" | "red" | "slate") {
  if (tone === "emerald") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "amber") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (tone === "red") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}