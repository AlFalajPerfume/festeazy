/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import { clearAdminContextCache } from "@/lib/admin-context";
import { supabase } from "@/lib/supabase";
import {
  deleteAdminStorageAsset,
  uploadAdminStorageAsset,
  type AdminStorageAsset,
} from "@/lib/admin-storage";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  DatabaseBackup,
  Download,
  Eye,
  EyeOff,
  FileArchive,
  Globe2,
  HardDrive,
  History,
  ImagePlus,
  KeyRound,
  Loader2,
  LockKeyhole,
  Palette,
  RefreshCcw,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

type StorageHealth = {
  generatedAt: string;
  totalFiles: number;
  referencedFiles: number;
  orphanFiles: number;
  totalBytes: number;
  orphanBytes: number;
  orphans: Array<{
    bucket: string;
    path: string;
    size: number | null;
    createdAt: string | null;
    updatedAt: string | null;
  }>;
};

type OrganizationType = "madrasa" | "school" | "institution";

type Organization = {
  id: string;
  name: string;
  slug: string;
  organization_type: OrganizationType | null;
  phone: string | null;
  email: string | null;
  place: string | null;
  logo_url: string | null;
  status: string;
  plan_start: string | null;
  plan_end: string | null;
};

type EventInfo = {
  id: string;
  organization_id: string;
  title: string;
  event_type?: string | null;
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
  theme_color: string;
  show_points: boolean;
  show_student_search: boolean;
  show_gallery: boolean;
  show_schedule: boolean;
  show_posters: boolean;
  show_team_details?: boolean;
};

type DataAction = {
  id: string;
  action_type: "backup_download" | "workspace_reset";
  status: "requested" | "completed" | "failed" | "blocked";
  details: Record<string, unknown> | null;
  created_at: string;
};

type DataControlStatus = {
  securityConfigured: boolean;
  pinUpdatedAt: string | null;
  lockedUntil: string | null;
  recentActions: DataAction[];
};

type DataModalMode = "backup" | "reset" | null;

const THEME_OPTIONS = [
  { label: "Emerald", value: "emerald", preview: "bg-emerald-600" },
  { label: "Violet", value: "violet", preview: "bg-violet-600" },
  { label: "Amber", value: "amber", preview: "bg-amber-500" },
  { label: "Slate", value: "slate", preview: "bg-slate-700" },
];

const DEFAULT_SETTINGS: Omit<EventSettings, "organization_id" | "event_id"> = {
  contact_number: "",
  whatsapp_number: "",
  hero_image_url: "",
  theme_color: "emerald",
  show_points: true,
  show_student_search: true,
  show_gallery: true,
  show_schedule: true,
  show_posters: true,
  show_team_details: true,
};

export default function AdminSettingsPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [settingsData, setSettingsData] = useState<EventSettings | null>(null);

  const [orgName, setOrgName] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPlace, setOrgPlace] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventTagline, setEventTagline] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [pendingLogoAsset, setPendingLogoAsset] =
    useState<AdminStorageAsset | null>(null);
  const [pendingHeroAsset, setPendingHeroAsset] =
    useState<AdminStorageAsset | null>(null);
  const [themeColor, setThemeColor] = useState("emerald");
  const [showPoints, setShowPoints] = useState(true);
  const [showStudentSearch, setShowStudentSearch] = useState(true);
  const [showGallery, setShowGallery] = useState(true);
  const [showSchedule, setShowSchedule] = useState(true);
  const [showPosters, setShowPosters] = useState(true);
  const [showTeamDetails, setShowTeamDetails] = useState(true);

  const [dataControlStatus, setDataControlStatus] =
    useState<DataControlStatus | null>(null);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [dataModalMode, setDataModalMode] = useState<DataModalMode>(null);
  const [actionPin, setActionPin] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetAcknowledged, setResetAcknowledged] = useState(false);
  const [isRunningDataAction, setIsRunningDataAction] = useState(false);
  const [dataActionError, setDataActionError] = useState("");
  const [storageHealth, setStorageHealth] = useState<StorageHealth | null>(null);
  const [isCheckingStorage, setIsCheckingStorage] = useState(false);
  const [isCleaningStorage, setIsCleaningStorage] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const organizationType = normalizeOrganizationType(
    organization?.organization_type,
  );
  const organizationLabel = getOrganizationLabel(organizationType);

  const publicUrl = useMemo(() => {
    if (!publicSlug) return "";
    if (typeof window === "undefined") return `/event/${publicSlug}`;
    return `${window.location.origin}/event/${publicSlug}`;
  }, [publicSlug]);

  const planSummary = useMemo(
    () => getPlanSummary(organization?.plan_start, organization?.plan_end),
    [organization?.plan_start, organization?.plan_end],
  );

  async function getAccessToken() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("Your login session expired. Please login again.");
    }

    return session.access_token;
  }

  async function loadSettings() {
    setIsLoading(true);
    setError("");
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      stopLoading("Please login again.");
      return;
    }

    const { data: orgUserData, error: orgUserError } = await supabase
      .from("organization_users")
      .select("organization_id, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (orgUserError) return stopLoading(orgUserError.message);

    if (!orgUserData) {
      return stopLoading(
        "This login is not connected to any active organization.",
      );
    }

    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select(
        "id, name, slug, organization_type, phone, email, place, logo_url, status, plan_start, plan_end",
      )
      .eq("id", orgUserData.organization_id)
      .maybeSingle();

    if (orgError) return stopLoading(orgError.message);
    if (!orgData) return stopLoading("Organization profile was not found.");

    const activeOrganization = orgData as Organization;

    const { data: eventsData, error: eventError } = await supabase
      .from("events")
      .select(
        "id, organization_id, title, event_type, tagline, venue, start_date, end_date, public_slug, is_public",
      )
      .eq("organization_id", activeOrganization.id)
      .limit(2);

    if (eventError) return stopLoading(eventError.message);

    if (!eventsData || eventsData.length === 0) {
      return stopLoading("Event setup was not found.");
    }

    if (eventsData.length > 1) {
      return stopLoading(
        "More than one event exists for this organization. Contact FestEazy support.",
      );
    }

    const activeEvent = eventsData[0] as EventInfo;

    const { data: settingsRes, error: settingsError } = await supabase
      .from("event_settings")
      .select(
        "id, organization_id, event_id, contact_number, whatsapp_number, hero_image_url, theme_color, show_points, show_student_search, show_gallery, show_schedule, show_posters, show_team_details",
      )
      .eq("event_id", activeEvent.id)
      .maybeSingle();

    if (settingsError) return stopLoading(settingsError.message);

    const loadedSettings: EventSettings = settingsRes
      ? ({ ...DEFAULT_SETTINGS, ...(settingsRes as EventSettings) } as EventSettings)
      : {
          organization_id: activeOrganization.id,
          event_id: activeEvent.id,
          ...DEFAULT_SETTINGS,
        };

    setOrganization(activeOrganization);
    setEventInfo(activeEvent);
    setSettingsData(loadedSettings);

    setOrgName(activeOrganization.name || "");
    setOrgPhone(activeOrganization.phone || "");
    setOrgEmail(activeOrganization.email || "");
    setOrgPlace(activeOrganization.place || "");
    setLogoUrl(activeOrganization.logo_url || "");

    setEventTitle(activeEvent.title || "");
    setEventTagline(activeEvent.tagline || "");
    setEventVenue(activeEvent.venue || "");
    setEventStartDate(activeEvent.start_date || "");
    setEventEndDate(activeEvent.end_date || "");
    setPublicSlug(activeEvent.public_slug || "");
    setIsPublic(Boolean(activeEvent.is_public));

    setHeroImageUrl(loadedSettings.hero_image_url || "");
    setThemeColor(loadedSettings.theme_color || "emerald");
    setShowPoints(loadedSettings.show_points !== false);
    setShowStudentSearch(loadedSettings.show_student_search !== false);
    setShowGallery(loadedSettings.show_gallery !== false);
    setShowSchedule(loadedSettings.show_schedule !== false);
    setShowPosters(loadedSettings.show_posters !== false);
    setShowTeamDetails(loadedSettings.show_team_details !== false);

    setIsLoading(false);
    void loadDataControlStatus();
  }

  async function loadDataControlStatus() {
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/admin/data-controls/status", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to load status.");
      setDataControlStatus(payload as DataControlStatus);
    } catch (statusError) {
      console.warn(
        "Data control status could not be loaded:",
        statusError instanceof Error ? statusError.message : statusError,
      );
    }
  }

  function stopLoading(value: string) {
    setError(value);
    setIsLoading(false);
    setIsSaving(false);
  }

  function stopSaving(value: string) {
    setError(value);
    setIsSaving(false);
  }

  function generateSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function uploadAsset(file: File, folder: "logos" | "hero") {
    if (!organization || !eventInfo) {
      throw new Error("Organization or event was not found.");
    }

    return uploadAdminStorageAsset({
      file,
      assetType: folder === "logos" ? "organization_logo" : "event_hero",
    });
  }

  async function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingLogo(true);
    setError("");
    setMessage("");

    try {
      const asset = await uploadAsset(file, "logos");
      if (pendingLogoAsset) {
        await deleteAdminStorageAsset({
          bucket: pendingLogoAsset.bucket,
          path: pendingLogoAsset.path,
        }).catch(() => undefined);
      }
      setPendingLogoAsset(asset);
      setLogoUrl(asset.displayUrl);
      setMessage("Logo uploaded. Click Save Settings to publish it.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Logo upload failed.",
      );
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function handleHeroUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploadingHero(true);
    setError("");
    setMessage("");

    try {
      const asset = await uploadAsset(file, "hero");
      if (pendingHeroAsset) {
        await deleteAdminStorageAsset({
          bucket: pendingHeroAsset.bucket,
          path: pendingHeroAsset.path,
        }).catch(() => undefined);
      }
      setPendingHeroAsset(asset);
      setHeroImageUrl(asset.displayUrl);
      setMessage("Hero image uploaded. Click Save Settings to publish it.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Hero upload failed.",
      );
    } finally {
      setIsUploadingHero(false);
    }
  }

  function resetBrandAssets() {
    const confirmed = confirm(
      "Remove the logo and hero image from the portal after the next save?",
    );

    if (!confirmed) return;
    if (pendingLogoAsset) {
      void deleteAdminStorageAsset({
        bucket: pendingLogoAsset.bucket,
        path: pendingLogoAsset.path,
      });
      setPendingLogoAsset(null);
    }
    if (pendingHeroAsset) {
      void deleteAdminStorageAsset({
        bucket: pendingHeroAsset.bucket,
        path: pendingHeroAsset.path,
      });
      setPendingHeroAsset(null);
    }
    setLogoUrl("");
    setHeroImageUrl("");
    setMessage("Brand images cleared. Click Save Settings to apply.");
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setMessage("");

    if (!organization || !eventInfo) {
      return stopSaving("Organization or event was not found.");
    }

    if (!orgName.trim()) {
      return stopSaving(`${organizationLabel} name is required.`);
    }

    if (!eventTitle.trim()) {
      return stopSaving("Event title is required.");
    }

    if (
      eventStartDate &&
      eventEndDate &&
      eventEndDate < eventStartDate
    ) {
      return stopSaving("Event end date cannot be before the start date.");
    }

    const finalSlug = generateSlug(publicSlug || eventTitle);
    if (!finalSlug) return stopSaving("Public slug is required.");

    const previousLogoUrl = organization.logo_url;
    const previousHeroUrl = settingsData?.hero_image_url || null;

    const { error: orgUpdateError } = await supabase
      .from("organizations")
      .update({
        name: orgName.trim(),
        phone: orgPhone.trim() || null,
        email: orgEmail.trim() || null,
        place: orgPlace.trim() || null,
        logo_url: logoUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organization.id);

    if (orgUpdateError) return stopSaving(orgUpdateError.message);

    if (previousLogoUrl && previousLogoUrl !== logoUrl) {
      await deleteAdminStorageAsset({ url: previousLogoUrl }).catch((cleanupError) => {
        console.warn("Previous organization logo cleanup failed:", cleanupError);
      });
    }
    setPendingLogoAsset(null);

    const { error: eventUpdateError } = await supabase
      .from("events")
      .update({
        title: eventTitle.trim(),
        tagline: eventTagline.trim() || null,
        venue: eventVenue.trim() || null,
        start_date: eventStartDate || null,
        end_date: eventEndDate || null,
        public_slug: finalSlug,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventInfo.id)
      .eq("organization_id", organization.id);

    if (eventUpdateError) return stopSaving(eventUpdateError.message);

    const settingsPayload = {
      organization_id: organization.id,
      event_id: eventInfo.id,
      contact_number: settingsData?.contact_number || null,
      whatsapp_number: settingsData?.whatsapp_number || null,
      hero_image_url: heroImageUrl || null,
      theme_color: themeColor || "emerald",
      show_points: showPoints,
      show_student_search: showStudentSearch,
      show_gallery: showGallery,
      show_schedule: showSchedule,
      show_posters: showPosters,
      show_team_details: showTeamDetails,
      updated_at: new Date().toISOString(),
    };

    const { data: savedSettings, error: settingsSaveError } = await supabase
      .from("event_settings")
      .upsert(settingsPayload, { onConflict: "event_id" })
      .select(
        "id, organization_id, event_id, contact_number, whatsapp_number, hero_image_url, theme_color, show_points, show_student_search, show_gallery, show_schedule, show_posters, show_team_details",
      )
      .single();

    if (settingsSaveError) return stopSaving(settingsSaveError.message);

    if (previousHeroUrl && previousHeroUrl !== heroImageUrl) {
      await deleteAdminStorageAsset({ url: previousHeroUrl }).catch((cleanupError) => {
        console.warn("Previous hero image cleanup failed:", cleanupError);
      });
    }
    setPendingHeroAsset(null);

    setSettingsData(savedSettings as EventSettings);
    setPublicSlug(finalSlug);
    setOrganization({
      ...organization,
      name: orgName.trim(),
      phone: orgPhone.trim() || null,
      email: orgEmail.trim() || null,
      place: orgPlace.trim() || null,
      logo_url: logoUrl || null,
    });
    setEventInfo({
      ...eventInfo,
      title: eventTitle.trim(),
      tagline: eventTagline.trim() || null,
      venue: eventVenue.trim() || null,
      start_date: eventStartDate || null,
      end_date: eventEndDate || null,
      public_slug: finalSlug,
      is_public: isPublic,
    });

    clearAdminContextCache();
    window.dispatchEvent(new Event("festeazy-organization-updated"));
    setMessage("Settings saved successfully.");
    setIsSaving(false);
  }

  async function copyPublicUrl() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setMessage("Public portal URL copied.");
  }

  function openDataModal(mode: Exclude<DataModalMode, null>) {
    setActionPin("");
    setResetConfirmation("");
    setResetAcknowledged(false);
    setDataActionError("");
    setDataModalMode(mode);
  }

  function closeDataModal() {
    if (isRunningDataAction) return;
    setDataModalMode(null);
    setActionPin("");
    setResetConfirmation("");
    setResetAcknowledged(false);
    setDataActionError("");
  }

  async function runBackup() {
    setIsRunningDataAction(true);
    setDataActionError("");

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/admin/data-controls/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: actionPin }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Backup generation failed.");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition") || "";
      const match = contentDisposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || "festeazy-workspace-backup.json.gz";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setMessage("Secure workspace backup downloaded successfully.");
      setDataModalMode(null);
      setActionPin("");
      await loadDataControlStatus();
    } catch (backupError) {
      setDataActionError(
        backupError instanceof Error
          ? backupError.message
          : "Backup generation failed.",
      );
    } finally {
      setIsRunningDataAction(false);
    }
  }

  function formatStorageBytes(value: number) {
    if (!Number.isFinite(value) || value <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const unitIndex = Math.min(
      units.length - 1,
      Math.floor(Math.log(value) / Math.log(1024)),
    );
    const amount = value / 1024 ** unitIndex;
    return `${amount.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  async function loadStorageHealth() {
    setIsCheckingStorage(true);
    setError("");
    setMessage("");

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/admin/storage/cleanup", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Storage health check failed.");
      }
      setStorageHealth(payload.health as StorageHealth);
      setMessage("Storage health check completed.");
    } catch (storageError) {
      setError(
        storageError instanceof Error
          ? storageError.message
          : "Storage health check failed.",
      );
    } finally {
      setIsCheckingStorage(false);
    }
  }

  async function cleanupOrphanStorage() {
    if (!storageHealth?.orphanFiles) return;

    const confirmation = window.prompt(
      `This permanently deletes ${storageHealth.orphanFiles} unreferenced file(s). Type DELETE ORPHAN FILES to continue.`,
    );
    if (confirmation !== "DELETE ORPHAN FILES") return;

    setIsCleaningStorage(true);
    setError("");
    setMessage("");

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/admin/storage/cleanup", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirmation }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Storage cleanup failed.");
      }
      setStorageHealth(payload.health as StorageHealth);
      setMessage(
        `${Number(payload.removedCount || 0)} orphan storage file(s) permanently deleted.`,
      );
    } catch (storageError) {
      setError(
        storageError instanceof Error
          ? storageError.message
          : "Storage cleanup failed.",
      );
    } finally {
      setIsCleaningStorage(false);
    }
  }

  async function runWorkspaceReset() {
    setIsRunningDataAction(true);
    setDataActionError("");

    try {
      const token = await getAccessToken();
      const response = await fetch("/api/admin/data-controls/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pin: actionPin,
          confirmation: resetConfirmation,
          acknowledgement: resetAcknowledged,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Workspace reset failed.");
      }

      clearAdminContextCache();
      setMessage(
        "Event workspace reset completed. Organization, login, plan and event settings were preserved.",
      );
      setDataModalMode(null);
      setActionPin("");
      setResetConfirmation("");
      setResetAcknowledged(false);
      await loadDataControlStatus();
    } catch (resetError) {
      setDataActionError(
        resetError instanceof Error ? resetError.message : "Workspace reset failed.",
      );
    } finally {
      setIsRunningDataAction(false);
    }
  }

  return (
    <AdminShell
      title="Settings"
      subtitle={`Control ${organizationLabel.toLowerCase()} details, event settings and public portal visibility.`}
      actions={
        <button
          type="button"
          onClick={loadSettings}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCcw size={17} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      }
    >
      <form onSubmit={saveSettings} className="space-y-6">
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
          <div className="flex min-h-96 items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            <Loader2 className="animate-spin text-violet-700" size={34} />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <OverviewCard
                label="Workspace Type"
                value={organizationLabel}
                note="Managed by FestEazy Super Admin"
              />
              <OverviewCard
                label="Event Workspace"
                value="Single Event"
                note={eventInfo?.title || "Event"}
              />
              <OverviewCard
                label="Access Plan"
                value={planSummary.title}
                note={planSummary.note}
                tone={planSummary.tone}
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-6">
                <Card
                  icon={<Settings size={20} />}
                  title={`${organizationLabel} Details`}
                  description="Basic identity and contact details shown in the dashboard and public portal."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput
                      label={`${organizationLabel} Name`}
                      value={orgName}
                      onChange={setOrgName}
                      placeholder={`Enter ${organizationLabel.toLowerCase()} name`}
                    />
                    <TextInput
                      label="Place"
                      value={orgPlace}
                      onChange={setOrgPlace}
                      placeholder="City or locality"
                    />
                    <TextInput
                      label="Phone"
                      value={orgPhone}
                      onChange={setOrgPhone}
                      placeholder="Contact phone"
                    />
                    <TextInput
                      label="Email"
                      value={orgEmail}
                      onChange={setOrgEmail}
                      placeholder="contact@example.com"
                    />
                  </div>
                </Card>

                <Card
                  icon={<CalendarDays size={20} />}
                  title="Event Details"
                  description="This organization has one event workspace. Update its public details here."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <TextInput
                        label="Event Title"
                        value={eventTitle}
                        onChange={(value) => {
                          setEventTitle(value);
                          if (!publicSlug.trim()) {
                            setPublicSlug(generateSlug(value));
                          }
                        }}
                        placeholder="Meelad Fest 2026"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <TextInput
                        label="Tagline"
                        value={eventTagline}
                        onChange={setEventTagline}
                        placeholder="Celebrating knowledge, talent and tradition"
                      />
                    </div>

                    <TextInput
                      label="Venue"
                      value={eventVenue}
                      onChange={setEventVenue}
                      placeholder="Event venue"
                    />
                    <TextInput
                      label="Public Slug"
                      value={publicSlug}
                      onChange={(value) => setPublicSlug(generateSlug(value))}
                      placeholder="event-public-link"
                    />
                    <DateInput
                      label="Start Date"
                      value={eventStartDate}
                      onChange={setEventStartDate}
                    />
                    <DateInput
                      label="End Date"
                      value={eventEndDate}
                      onChange={setEventEndDate}
                    />
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                          Public Portal URL
                        </p>
                        <p className="mt-1 break-all text-sm font-black text-slate-800">
                          {publicUrl || "Add a public slug"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={copyPublicUrl}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm"
                      >
                        <Copy size={16} />
                        Copy URL
                      </button>
                    </div>
                  </div>
                </Card>
              </div>

              <aside className="space-y-6 xl:sticky xl:top-28 xl:self-start">
                <Card
                  icon={<ImagePlus size={20} />}
                  title="Brand Assets"
                  description="Upload the organization logo and public portal hero image."
                >
                  <div className="space-y-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        {organizationLabel} Logo
                      </p>

                      <div className="mt-3 flex items-center gap-4">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt="Organization logo"
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Upload className="text-slate-400" size={26} />
                          )}
                        </div>

                        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700">
                          {isUploadingLogo ? (
                            <Loader2 className="animate-spin" size={17} />
                          ) : (
                            <Upload size={17} />
                          )}
                          Upload Logo
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                        Hero Image
                      </p>

                      <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                        {heroImageUrl ? (
                          <img
                            src={heroImageUrl}
                            alt="Hero"
                            className="h-40 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-40 items-center justify-center text-slate-400">
                            <ImagePlus size={34} />
                          </div>
                        )}
                      </div>

                      <label className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700">
                        {isUploadingHero ? (
                          <Loader2 className="animate-spin" size={17} />
                        ) : (
                          <Upload size={17} />
                        )}
                        Upload Hero Image
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          onChange={handleHeroUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {(logoUrl || heroImageUrl) && (
                      <button
                        type="button"
                        onClick={resetBrandAssets}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
                      >
                        <RefreshCcw size={17} />
                        Clear Brand Images
                      </button>
                    )}

                    <p className="text-xs font-bold leading-5 text-slate-500">
                      Recommended hero size: 1920 × 650 px. Click Save Settings
                      after uploading.
                    </p>
                  </div>
                </Card>

                <Card
                  icon={<Palette size={20} />}
                  title="Theme Color"
                  description="Choose the main colour used in the public portal."
                >
                  <div className="grid grid-cols-2 gap-3">
                    {THEME_OPTIONS.map((theme) => (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => setThemeColor(theme.value)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          themeColor === theme.value
                            ? "border-violet-300 bg-violet-50 ring-4 ring-violet-100"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <span className={`block h-8 w-8 rounded-xl ${theme.preview}`} />
                        <span className="mt-3 block text-sm font-black text-slate-800">
                          {theme.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </Card>
              </aside>
            </div>

            <Card
              icon={<Globe2 size={20} />}
              title="Public Portal Controls"
              description="Choose which sections parents, students and visitors can access."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ToggleCard
                  title="Public Portal"
                  description="Allow visitors to open this event page."
                  checked={isPublic}
                  onChange={setIsPublic}
                />
                <ToggleCard
                  title="Points Table"
                  description="Show the team or house leaderboard."
                  checked={showPoints}
                  onChange={setShowPoints}
                />
                <ToggleCard
                  title="Team / House Details"
                  description="Show team logos and leader details."
                  checked={showTeamDetails}
                  onChange={setShowTeamDetails}
                />
                <ToggleCard
                  title="Student Search"
                  description="Allow student-wise result search."
                  checked={showStudentSearch}
                  onChange={setShowStudentSearch}
                />
                <ToggleCard
                  title="Gallery"
                  description="Show the event gallery section."
                  checked={showGallery}
                  onChange={setShowGallery}
                />
                <ToggleCard
                  title="Schedule"
                  description="Show the programme schedule."
                  checked={showSchedule}
                  onChange={setShowSchedule}
                />
                <ToggleCard
                  title="Posters"
                  description="Allow poster preview, download and sharing."
                  checked={showPosters}
                  onChange={setShowPosters}
                />
              </div>
            </Card>

            <section className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => setShowAdvancedControls((value) => !value)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <LockKeyhole size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800">
                      Advanced Data Controls
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-slate-400">
                      Secure backup, storage cleanup and workspace reset
                    </p>
                  </div>
                </div>

                {showAdvancedControls ? (
                  <ChevronUp size={18} className="shrink-0 text-slate-400" />
                ) : (
                  <ChevronDown size={18} className="shrink-0 text-slate-400" />
                )}
              </button>

              {showAdvancedControls && (
                <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 text-emerald-600" size={20} />
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          Secure action PIN
                        </p>
                        <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                          {dataControlStatus?.securityConfigured
                            ? "Configured by FestEazy Super Admin. The PIN is never shown in this page."
                            : "Not configured. Ask the FestEazy Super Admin to set a six-digit PIN."}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] ${
                        dataControlStatus?.securityConfigured
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                      }`}
                    >
                      {dataControlStatus?.securityConfigured
                        ? "PIN Protected"
                        : "PIN Required"}
                    </span>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <div className="rounded-[1.4rem] border border-emerald-200 bg-white p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <DatabaseBackup size={20} />
                      </div>
                      <h3 className="mt-4 text-lg font-black text-slate-950">
                        Download Workspace Backup
                      </h3>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                        Creates a compressed backup of event records and a manifest
                        of uploaded assets. The secret PIN is required.
                      </p>
                      <button
                        type="button"
                        onClick={() => openDataModal("backup")}
                        disabled={!dataControlStatus?.securityConfigured}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Download size={17} />
                        Download Backup
                      </button>
                    </div>

                    <div className="rounded-[1.4rem] border border-violet-200 bg-white p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                        <HardDrive size={20} />
                      </div>
                      <h3 className="mt-4 text-lg font-black text-slate-950">
                        Storage Health
                      </h3>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                        Finds uploaded files that are no longer referenced by logos,
                        gallery, poster templates, banners or certificates.
                      </p>

                      {storageHealth && (
                        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                          <div className="rounded-xl bg-slate-50 p-3">
                            <p className="text-lg font-black text-slate-950">
                              {storageHealth.totalFiles}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                              Total files
                            </p>
                          </div>
                          <div className={`rounded-xl p-3 ${
                            storageHealth.orphanFiles > 0
                              ? "bg-amber-50"
                              : "bg-emerald-50"
                          }`}>
                            <p className={`text-lg font-black ${
                              storageHealth.orphanFiles > 0
                                ? "text-amber-700"
                                : "text-emerald-700"
                            }`}>
                              {storageHealth.orphanFiles}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                              Orphan files
                            </p>
                          </div>
                        </div>
                      )}

                      {storageHealth?.orphanFiles ? (
                        <p className="mt-3 text-xs font-bold text-amber-700">
                          Reclaimable: {formatStorageBytes(storageHealth.orphanBytes)}
                        </p>
                      ) : storageHealth ? (
                        <p className="mt-3 text-xs font-bold text-emerald-700">
                          Storage is clean. Every managed file is referenced.
                        </p>
                      ) : null}

                      <div className="mt-5 grid gap-2">
                        <button
                          type="button"
                          onClick={loadStorageHealth}
                          disabled={isCheckingStorage || isCleaningStorage}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                        >
                          {isCheckingStorage ? (
                            <Loader2 className="animate-spin" size={17} />
                          ) : (
                            <RefreshCcw size={17} />
                          )}
                          Check Storage
                        </button>

                        {Boolean(storageHealth?.orphanFiles) && (
                          <button
                            type="button"
                            onClick={cleanupOrphanStorage}
                            disabled={isCleaningStorage || isCheckingStorage}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            {isCleaningStorage ? (
                              <Loader2 className="animate-spin" size={17} />
                            ) : (
                              <Trash2 size={17} />
                            )}
                            Delete Orphan Files
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1.4rem] border border-red-200 bg-white p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-700">
                        <Trash2 size={20} />
                      </div>
                      <h3 className="mt-4 text-lg font-black text-slate-950">
                        Reset Event Workspace
                      </h3>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
                        Permanently removes competition data while preserving the
                        organization, login, plan and event profile.
                      </p>
                      <button
                        type="button"
                        onClick={() => openDataModal("reset")}
                        disabled={!dataControlStatus?.securityConfigured}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <AlertTriangle size={17} />
                        Open Reset Controls
                      </button>
                    </div>
                  </div>

                  {dataControlStatus?.recentActions?.length ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2">
                        <History size={16} className="text-slate-500" />
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          Recent Data Actions
                        </p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {dataControlStatus.recentActions.slice(0, 4).map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col gap-1 rounded-xl bg-slate-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="text-xs font-black text-slate-700">
                              {item.action_type === "backup_download"
                                ? "Backup download"
                                : "Workspace reset"}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">
                              {formatDateTime(item.created_at)} · {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <div className="sticky bottom-4 z-20 rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    Save all settings
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Changes apply to the dashboard and public portal after saving.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/20 disabled:opacity-60"
                >
                  {isSaving ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  {isSaving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </>
        )}
      </form>

      {dataModalMode && organization && (
        <DataControlModal
          mode={dataModalMode}
          organizationName={organization.name}
          actionPin={actionPin}
          onPinChange={(value) =>
            setActionPin(value.replace(/\D/g, "").slice(0, 6))
          }
          resetConfirmation={resetConfirmation}
          onResetConfirmationChange={setResetConfirmation}
          resetAcknowledged={resetAcknowledged}
          onResetAcknowledgedChange={setResetAcknowledged}
          error={dataActionError}
          isWorking={isRunningDataAction}
          onClose={closeDataModal}
          onConfirm={dataModalMode === "backup" ? runBackup : runWorkspaceReset}
        />
      )}
    </AdminShell>
  );
}

function DataControlModal({
  mode,
  organizationName,
  actionPin,
  onPinChange,
  resetConfirmation,
  onResetConfirmationChange,
  resetAcknowledged,
  onResetAcknowledgedChange,
  error,
  isWorking,
  onClose,
  onConfirm,
}: {
  mode: Exclude<DataModalMode, null>;
  organizationName: string;
  actionPin: string;
  onPinChange: (value: string) => void;
  resetConfirmation: string;
  onResetConfirmationChange: (value: string) => void;
  resetAcknowledged: boolean;
  onResetAcknowledgedChange: (value: boolean) => void;
  error: string;
  isWorking: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isBackup = mode === "backup";
  const canConfirm = isBackup
    ? actionPin.length === 6
    : actionPin.length === 6 &&
      resetConfirmation === organizationName &&
      resetAcknowledged;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl shadow-slate-950/30">
        <div
          className={`border-b px-5 py-5 sm:px-6 ${
            isBackup
              ? "border-emerald-100 bg-emerald-50"
              : "border-red-100 bg-red-50"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  isBackup
                    ? "bg-emerald-700 text-white"
                    : "bg-red-700 text-white"
                }`}
              >
                {isBackup ? <FileArchive size={22} /> : <AlertTriangle size={22} />}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  PIN Protected Action
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
                  {isBackup ? "Download Backup" : "Reset Event Workspace"}
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isWorking}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm disabled:opacity-50"
              aria-label="Close"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Secure Action PIN
            </label>
            <div className="relative mt-2">
              <KeyRound
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={actionPin}
                onChange={(event) => onPinChange(event.target.value)}
                placeholder="Enter 6-digit PIN"
                className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-lg font-black tracking-[0.35em] text-slate-950 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-500">
              This is the separate PIN provided by the FestEazy Super Admin,
              not your login password.
            </p>
          </div>

          {isBackup ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">
              The download is a compressed <strong>.json.gz</strong> workspace
              backup containing database records and a storage-file manifest.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-black text-red-900">
                  This cannot be undone from the dashboard.
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-red-700">
                  Teams, categories, classes, divisions, students, programmes,
                  registrations, judges, marks, results, schedules, gallery records
                  and poster records will be removed.
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Type the exact organization name
                </label>
                <p className="mt-1 text-sm font-black text-slate-950">
                  {organizationName}
                </p>
                <input
                  value={resetConfirmation}
                  onChange={(event) =>
                    onResetConfirmationChange(event.target.value)
                  }
                  placeholder={organizationName}
                  className="mt-2 h-14 w-full rounded-2xl border border-red-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={resetAcknowledged}
                  onChange={(event) =>
                    onResetAcknowledgedChange(event.target.checked)
                  }
                  className="mt-0.5 h-5 w-5 accent-red-600"
                />
                <span className="text-sm font-bold leading-6 text-slate-700">
                  I understand that the event workspace data will be permanently
                  removed. Organization profile, login, plan and event settings
                  will remain.
                </span>
              </label>
            </>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isWorking}
              className="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!canConfirm || isWorking}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl text-sm font-black text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isBackup
                  ? "bg-emerald-700 shadow-emerald-900/15 hover:bg-emerald-800"
                  : "bg-red-700 shadow-red-900/15 hover:bg-red-800"
              }`}
            >
              {isWorking ? (
                <Loader2 className="animate-spin" size={17} />
              ) : isBackup ? (
                <Download size={17} />
              ) : (
                <Trash2 size={17} />
              )}
              {isWorking
                ? isBackup
                  ? "Preparing backup..."
                  : "Resetting workspace..."
                : isBackup
                  ? "Verify & Download"
                  : "Reset Permanently"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          {icon}
        </div>
        <div>
          <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </div>
  );
}

function DateInput({
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
      <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-[1.5rem] border p-5 text-left transition ${
        checked
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-base font-black ${
              checked ? "text-emerald-950" : "text-slate-600"
            }`}
          >
            {title}
          </p>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
            {description}
          </p>
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            checked
              ? "bg-emerald-700 text-white"
              : "bg-white text-slate-400"
          }`}
        >
          {checked ? <Eye size={18} /> : <EyeOff size={18} />}
        </div>
      </div>
    </button>
  );
}

function OverviewCard({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    default: "border-slate-200 bg-white",
    success: "border-emerald-200 bg-emerald-50",
    warning: "border-amber-200 bg-amber-50",
    danger: "border-red-200 bg-red-50",
  }[tone];

  return (
    <div className={`rounded-[1.4rem] border p-4 shadow-sm ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-lg font-black tracking-[-0.03em] text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-500">{note}</p>
    </div>
  );
}

function normalizeOrganizationType(value: unknown): OrganizationType {
  const type = String(value || "").toLowerCase();
  if (type === "school") return "school";
  if (type === "institution") return "institution";
  return "madrasa";
}

function getOrganizationLabel(type: OrganizationType) {
  if (type === "school") return "School";
  if (type === "institution") return "Institution";
  return "Madrasa";
}

function getPlanSummary(start: string | null | undefined, end: string | null | undefined) {
  if (!start || !end) {
    return {
      title: "Not Assigned",
      note: "Plan dates are managed by Super Admin",
      tone: "warning" as const,
    };
  }

  const endDate = new Date(`${end}T23:59:59`);
  if (Number.isNaN(endDate.getTime())) {
    return {
      title: "Plan Configured",
      note: `${start} to ${end}`,
      tone: "default" as const,
    };
  }

  const remaining = Math.ceil((endDate.getTime() - Date.now()) / 86400000);

  if (remaining < 0) {
    return {
      title: "Expired",
      note: `Ended ${formatDate(end)}`,
      tone: "danger" as const,
    };
  }

  if (remaining <= 14) {
    return {
      title: `${remaining} day${remaining === 1 ? "" : "s"} left`,
      note: `Ends ${formatDate(end)}`,
      tone: "warning" as const,
    };
  }

  return {
    title: "Active",
    note: `Ends ${formatDate(end)}`,
    tone: "success" as const,
  };
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
