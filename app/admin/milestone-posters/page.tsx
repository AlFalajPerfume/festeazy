/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import MilestonePosterCanvas, {
  MILESTONE_ELEMENT_LABELS,
  MilestoneElementKey,
  MilestonePosterLayout,
  MilestoneLayerStyle,
  createDefaultMilestoneLayout,
  normalizeMilestoneLayout,
  renderMilestonePosterToCanvas,
} from "@/components/MilestonePosterCanvas";
import { supabase } from "@/lib/supabase";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import {
  deleteAdminStorageAsset,
  uploadAdminStorageAsset,
} from "@/lib/admin-storage";
import {
  CheckCircle2,
  Download,
  Eye,
  ImagePlus,
  Loader2,
  RefreshCcw,
  Rocket,
  Save,
  Star,
  Trash2,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

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

type Team = {
  id: string;
  name: string;
  code: string | null;
  color?: string | null;
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
  created_at: string;
};

type TeamPoint = {
  teamId: string;
  teamName: string;
  points: number;
};

type PosterTemplate = {
  id: string;
  organization_id: string;
  event_id: string;
  name: string;
  image_url: string;
  template_usage?: string | null;
  is_active: boolean;
  canvas_width: number | null;
  canvas_height: number | null;
  layout?: any;
  sort_order?: number | null;
  created_at: string;
};

type MilestonePoster = {
  id: string;
  organization_id: string;
  event_id: string;
  milestone_count: number;
  title: string;
  template_id: string | null;
  leaderboard_snapshot: TeamPoint[] | string | null;
  published_result_count: number;
  is_public: boolean;
  created_at: string;
};

const POSTER_BUCKET = "poster-templates";
const DEFAULT_POSTER_WIDTH = 1080;
const DEFAULT_POSTER_HEIGHT = 1350;

/**
 * Put these files in your project:
 * public/templates/milestone-1.png
 * public/templates/milestone-2.png
 *
 * These are only fallback/default milestone templates.
 * When an admin uploads a custom milestone template, custom templates become active
 * and these default templates become silent.
 */
const DEFAULT_MILESTONE_TEMPLATES = [
  {
    name: "Default Milestone Template 1",
    image_url: "/templates/milestone-1.png",
    sort_order: 1,
  },
  {
    name: "Default Milestone Template 2",
    image_url: "/templates/milestone-2.png",
    sort_order: 2,
  },
];

export default function MilestonePostersPage() {

  const [orgUser, setOrgUser] = useState<OrganizationUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);

  const [templates, setTemplates] = useState<PosterTemplate[]>([]);
  const [milestonePosters, setMilestonePosters] = useState<MilestonePoster[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);

  const [selectedPoster, setSelectedPoster] = useState<MilestonePoster | null>(null);
  const [draftLayout, setDraftLayout] = useState<MilestonePosterLayout | null>(null);
  const [selectedLayoutElement, setSelectedLayoutElement] =
    useState<MilestoneElementKey>("leaderboard");
  const [isSavingLayout, setIsSavingLayout] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPageData();
  }, []);

  const customTemplates = useMemo(() => {
    return templates.filter((template) => !isDefaultMilestoneTemplate(template));
  }, [templates]);

  const hasCustomTemplates = customTemplates.length > 0;

  const visibleTemplates = useMemo(() => {
    return hasCustomTemplates ? customTemplates : templates;
  }, [hasCustomTemplates, customTemplates, templates]);

  const activeTemplate = useMemo(() => {
    if (hasCustomTemplates) {
      return (
        customTemplates.find((item) => item.is_active) ||
        customTemplates[0] ||
        null
      );
    }

    return templates.find((item) => item.is_active) || templates[0] || null;
  }, [templates, customTemplates, hasCustomTemplates]);

  const publishedProgrammeCount = useMemo(() => {
    return getPublishedProgrammeCount(results);
  }, [results]);

  const latestMilestone = useMemo(() => {
    return Math.floor(publishedProgrammeCount / 10) * 10;
  }, [publishedProgrammeCount]);

  const nextMilestone = latestMilestone + 10;

  const currentLeaderboard = useMemo(() => {
    return buildLeaderboard(results, registrations, teams);
  }, [results, registrations, teams]);

  async function loadPageData() {
    setIsLoading(true);
    setError("");
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please login again.");
      setIsLoading(false);
      return;
    }

    const { data: orgUserData, error: orgUserError } = await supabase
      .from("organization_users")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (orgUserError) return stopLoading(orgUserError.message);

    if (!orgUserData) {
      setError("This login is not connected to any madrasa.");
      setIsLoading(false);
      return;
    }

    const activeOrgUser = orgUserData as OrganizationUser;
    setOrgUser(activeOrgUser);

    let { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, organization_id, title, venue, start_date, end_date, is_public, created_at, updated_at")
      .eq("organization_id", activeOrgUser.organization_id)
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!eventData && !eventError) {
      const fallback = await supabase
        .from("events")
        .select("id, organization_id, title, venue, start_date, end_date, is_public, created_at, updated_at")
        .eq("organization_id", activeOrgUser.organization_id)
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      eventData = fallback.data;
      eventError = fallback.error;
    }

    if (eventError) return stopLoading(eventError.message);

    if (!eventData) {
      setError("Event setup not found.");
      setIsLoading(false);
      return;
    }

    const activeEvent = eventData as EventInfo;
    setEventInfo(activeEvent);

    await ensureDefaultMilestoneTemplates(
      activeOrgUser.organization_id,
      activeEvent.id,
    );

    let allRegistrations: Registration[] = [];
    let allPublishedResults: ResultItem[] = [];

    try {
      [allRegistrations, allPublishedResults] = await Promise.all([
        fetchAllRows<Registration>((from, to) =>
          supabase.from("programme_registrations")
            .select("*")
            .eq("organization_id", activeOrgUser.organization_id)
            .eq("event_id", activeEvent.id)
            .eq("status", "registered")
            .order("created_at", { ascending: true })
            .range(from, to),
        ),
        fetchAllRows<ResultItem>((from, to) =>
          supabase.from("results")
            .select("*")
            .eq("organization_id", activeOrgUser.organization_id)
            .eq("event_id", activeEvent.id)
            .eq("is_published", true)
            .order("created_at", { ascending: true })
            .range(from, to),
        ),
      ]);
    } catch (loadError) {
      return stopLoading(loadError instanceof Error ? loadError.message : "Unable to load milestone data.");
    }

    const [orgRes, templateRes, posterRes, teamRes] =
      await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, place, logo_url")
          .eq("id", activeOrgUser.organization_id)
          .maybeSingle(),

        supabase
          .from("poster_templates")
          .select("*")
          .eq("organization_id", activeOrgUser.organization_id)
          .eq("event_id", activeEvent.id)
          .eq("template_usage", "milestone_poster")
          .order("is_active", { ascending: false })
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),

        supabase
          .from("result_milestone_posters")
          .select("*")
          .eq("organization_id", activeOrgUser.organization_id)
          .eq("event_id", activeEvent.id)
          .order("milestone_count", { ascending: false }),

        supabase
          .from("teams")
          .select("id, name, code, color")
          .eq("organization_id", activeOrgUser.organization_id)
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),      ]);

    if (orgRes.error) return stopLoading(orgRes.error.message);
    if (templateRes.error) return stopLoading(templateRes.error.message);
    if (posterRes.error) return stopLoading(posterRes.error.message);
    if (teamRes.error) return stopLoading(teamRes.error.message);

    setOrganization((orgRes.data || null) as Organization | null);
    setTemplates((templateRes.data || []) as PosterTemplate[]);
    setMilestonePosters((posterRes.data || []) as MilestonePoster[]);
    setTeams((teamRes.data || []) as Team[]);
    setRegistrations(allRegistrations);
    setResults(allPublishedResults);

    setIsLoading(false);
  }

  function stopLoading(text: string) {
    setError(text);
    setIsLoading(false);
    setIsUploading(false);
    setIsGenerating(false);
    setIsDownloading(false);
    setIsUploadingLogo(false);
  }

  function getTemplateForPoster(poster: MilestonePoster | null) {
    if (!poster) return activeTemplate;

    return (
      templates.find((template) => template.id === poster.template_id) ||
      activeTemplate
    );
  }

  async function ensureDefaultMilestoneTemplates(
    organizationId: string,
    eventId: string,
  ) {
    const { data, error } = await supabase
      .from("poster_templates")
      .select("id, image_url, template_usage")
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .eq("template_usage", "milestone_poster");

    if (error) {
      console.warn("Default milestone template check skipped:", error.message);
      return;
    }

    const existing = data || [];
    const missingDefaults = DEFAULT_MILESTONE_TEMPLATES.filter((template) => {
      return !existing.some((item: any) => item.image_url === template.image_url);
    });

    if (missingDefaults.length === 0) return;

    const hasAnyTemplates = existing.length > 0;

    const rows = missingDefaults.map((template, index) => ({
      organization_id: organizationId,
      event_id: eventId,
      name: template.name,
      image_url: template.image_url,
      template_usage: "milestone_poster",
      is_active: !hasAnyTemplates && index === 0,
      canvas_width: DEFAULT_POSTER_WIDTH,
      canvas_height: DEFAULT_POSTER_HEIGHT,
      layout: null,
      show_ad_banner: false,
      sort_order: template.sort_order,
    }));

    const { error: insertError } = await supabase
      .from("poster_templates")
      .insert(rows);

    if (insertError) {
      console.warn("Default milestone template insert skipped:", insertError.message);
    }
  }

  async function uploadTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!orgUser || !eventInfo) {
      setError("Event not found.");
      return;
    }

    if (!templateFile) {
      setError("Select milestone poster template image.");
      return;
    }

    setIsUploading(true);

    const dimensions = await getImageDimensions(templateFile);

    let uploadedAsset;

    try {
      uploadedAsset = await uploadAdminStorageAsset({
        file: templateFile,
        assetType: "milestone_template",
      });
    } catch (uploadError) {
      return stopLoading(
        uploadError instanceof Error
          ? uploadError.message
          : "Milestone template upload failed.",
      );
    }

    const finalName =
      templateName.trim() ||
      templateFile.name.replace(/\.[^/.]+$/, "") ||
      "Milestone Points Template";

    const { error: clearError } = await supabase
      .from("poster_templates")
      .update({ is_active: false })
      .eq("organization_id", orgUser.organization_id)
      .eq("event_id", eventInfo.id)
      .eq("template_usage", "milestone_poster");

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
        organization_id: orgUser.organization_id,
        event_id: eventInfo.id,
        name: finalName,
        image_url: uploadedAsset.publicUrl,
        template_usage: "milestone_poster",
        is_active: true,
        canvas_width: dimensions.width,
        canvas_height: dimensions.height,
        layout: null,
        show_ad_banner: false,
        sort_order:
          Math.max(9, ...customTemplates.map((item) => Number(item.sort_order || 0))) + 1,
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

    setTemplates((current) =>
      [
        data as PosterTemplate,
        ...current.map((item) => ({ ...item, is_active: false })),
      ].sort((a, b) => Number(a.sort_order || 99) - Number(b.sort_order || 99)),
    );

    setTemplateName("");
    setTemplateFile(null);
    setShowUploadModal(false);
    setMessage("Custom milestone template uploaded and activated.");
    setIsUploading(false);
  }

  async function setActiveTemplate(templateId: string) {
    if (!orgUser || !eventInfo) return;

    setError("");
    setMessage("");

    const { error: clearError } = await supabase
      .from("poster_templates")
      .update({ is_active: false })
      .eq("organization_id", orgUser.organization_id)
      .eq("event_id", eventInfo.id)
      .eq("template_usage", "milestone_poster");

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

    setMessage("Active milestone template updated. This affects only future milestone posters.");
  }

  async function deleteTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    const isDefault = template ? isDefaultMilestoneTemplate(template) : false;

    if (isDefault) {
      setError("Default milestone templates cannot be deleted. Upload a custom template to make defaults silent.");
      return;
    }

    const confirmed = confirm("Delete this custom milestone template?");
    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("poster_templates")
      .delete()
      .eq("id", templateId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (template?.image_url) {
      await deleteAdminStorageAsset({ url: template.image_url });
    }

    setMessage("Template and stored image deleted.");
    await loadPageData();
  }

  async function generateMilestonePosters() {
    if (!orgUser || !eventInfo) return;

    setError("");
    setMessage("");

    const count = getPublishedProgrammeCount(results);
    const maxMilestone = Math.floor(count / 10) * 10;

    if (maxMilestone < 10) {
      setError(
        `Need at least 10 published programme results. Current published result count is ${count}.`,
      );
      return;
    }

    setIsGenerating(true);

    const snapshot = buildLeaderboard(results, registrations, teams);

    if (snapshot.length === 0) {
      setError("No team points found. Publish results with points first.");
      setIsGenerating(false);
      return;
    }

    const existingMilestones = new Set(
      milestonePosters.map((poster) => Number(poster.milestone_count)),
    );

    const rows = [];

    for (let milestone = 10; milestone <= maxMilestone; milestone += 10) {
      if (existingMilestones.has(milestone)) continue;

      rows.push({
        organization_id: orgUser.organization_id,
        event_id: eventInfo.id,
        milestone_count: milestone,
        title: `After ${milestone}`,
        template_id: activeTemplate?.id || null,
        leaderboard_snapshot: snapshot,
        published_result_count: count,
        is_public: true,
      });
    }

    if (rows.length === 0) {
      setMessage("All available milestone posters are already created. Existing snapshots were not changed.");
      setIsGenerating(false);
      return;
    }

    const { error: insertError } = await supabase
      .from("result_milestone_posters")
      .insert(rows);

    if (insertError) {
      setError(insertError.message);
      setIsGenerating(false);
      return;
    }

    const latestCreated = rows[rows.length - 1]?.milestone_count || maxMilestone;
    setMessage(`Created ${rows.length} new milestone poster(s), up to After ${latestCreated}.`);
    setIsGenerating(false);
    await loadPageData();
  }
  async function resetMilestonePosters() {
  if (!orgUser || !eventInfo) {
    setError("Event not found.");
    return;
  }

  const confirmed = confirm(
    "Reset all created milestone posters? This will delete milestone poster snapshots only. Results and team points will not be deleted.",
  );

  if (!confirmed) return;

  setIsGenerating(true);
  setError("");
  setMessage("");

  const { error: deleteError } = await supabase
    .from("result_milestone_posters")
    .delete()
    .eq("organization_id", orgUser.organization_id)
    .eq("event_id", eventInfo.id);

  if (deleteError) {
    setError(deleteError.message);
    setIsGenerating(false);
    return;
  }

  setMessage("Milestone posters reset successfully. You can generate fresh milestone posters again.");
  setIsGenerating(false);
  await loadPageData();
}

  async function togglePosterPublic(poster: MilestonePoster) {
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("result_milestone_posters")
      .update({ is_public: !poster.is_public })
      .eq("id", poster.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const updatedPoster = { ...poster, is_public: !poster.is_public };

    setMilestonePosters((current) =>
      current.map((item) => (item.id === poster.id ? updatedPoster : item)),
    );

    setSelectedPoster((current) =>
      current?.id === poster.id ? updatedPoster : current,
    );
  }

  async function deleteMilestonePoster(posterId: string) {
    const confirmed = confirm("Delete this milestone poster?");
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("result_milestone_posters")
      .delete()
      .eq("id", posterId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMilestonePosters((current) => current.filter((poster) => poster.id !== posterId));
    setSelectedPoster((current) => (current?.id === posterId ? null : current));
    setMessage("Milestone poster deleted.");
  }

  function openPosterPreview(poster: MilestonePoster) {
    const template = getTemplateForPoster(poster);
    const width = Number(template?.canvas_width || DEFAULT_POSTER_WIDTH);
    const height = Number(template?.canvas_height || DEFAULT_POSTER_HEIGHT);

    setDraftLayout(normalizeMilestoneLayout(template?.layout, width, height));
    setSelectedLayoutElement("leaderboard");
    setSelectedPoster(poster);
    setError("");
  }

  function closePosterPreview() {
    setSelectedPoster(null);
    setDraftLayout(null);
    setSelectedLayoutElement("leaderboard");
  }

  function updateSelectedLayer(patch: Partial<MilestoneLayerStyle>) {
    if (!draftLayout) return;

    setDraftLayout({
      ...draftLayout,
      elements: {
        ...draftLayout.elements,
        [selectedLayoutElement]: {
          ...draftLayout.elements[selectedLayoutElement],
          ...patch,
        },
      },
    });
  }

  function resetSelectedLayout() {
    if (!selectedPoster) return;

    const template = getTemplateForPoster(selectedPoster);
    const width = Number(template?.canvas_width || DEFAULT_POSTER_WIDTH);
    const height = Number(template?.canvas_height || DEFAULT_POSTER_HEIGHT);
    setDraftLayout(createDefaultMilestoneLayout(width, height));
    setSelectedLayoutElement("leaderboard");
  }

  async function uploadCustomMilestoneLogo(file: File) {
    if (!draftLayout) return;

    if (!file.type.startsWith("image/")) {
      setError("Choose a valid image file for the milestone logo.");
      return;
    }

    setIsUploadingLogo(true);
    setError("");
    setMessage("");

    const previousLogoUrl =
      draftLayout.elements.logo.logoSource === "custom"
        ? draftLayout.elements.logo.customLogoUrl || null
        : null;

    try {
      const uploadedAsset = await uploadAdminStorageAsset({
        file,
        assetType: "milestone_logo",
      });

      setDraftLayout((current) => {
        if (!current) return current;
        return {
          ...current,
          elements: {
            ...current.elements,
            logo: {
              ...current.elements.logo,
              visible: true,
              logoSource: "custom",
              customLogoUrl: uploadedAsset.publicUrl,
            },
          },
        };
      });

      if (previousLogoUrl && previousLogoUrl !== uploadedAsset.publicUrl) {
        await deleteAdminStorageAsset({ url: previousLogoUrl }).catch(() => undefined);
      }

      setSelectedLayoutElement("logo");
      setMessage("Custom milestone logo uploaded. Click Save Layout to make it public.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Milestone logo upload failed.",
      );
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function saveSelectedLayout() {
    if (!selectedPoster || !draftLayout) return;

    const template = getTemplateForPoster(selectedPoster);
    if (!template?.id) {
      setError("Select or upload a milestone template before saving layout.");
      return;
    }

    setIsSavingLayout(true);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("poster_templates")
      .update({ layout: draftLayout })
      .eq("id", template.id);

    if (updateError) {
      setError(updateError.message);
      setIsSavingLayout(false);
      return;
    }

    setTemplates((current) =>
      current.map((item) =>
        item.id === template.id ? { ...item, layout: draftLayout } : item,
      ),
    );

    setMessage(`Layout saved for ${template.name}. Public milestone posters now use this layout.`);
    setIsSavingLayout(false);
  }

  async function downloadSelectedPoster() {
    if (!selectedPoster) return;

    setIsDownloading(true);

    try {
      const template = getTemplateForPoster(selectedPoster);
      const width = Number(template?.canvas_width || DEFAULT_POSTER_WIDTH);
      const height = Number(template?.canvas_height || DEFAULT_POSTER_HEIGHT);
      const layoutForDownload =
        draftLayout || normalizeMilestoneLayout(template?.layout, width, height);

      const canvas = await renderMilestonePosterToCanvas({
        width,
        height,
        backgroundUrl: template?.image_url || null,
        organizationName: organization?.name || "Organization",
        organizationLogoUrl: organization?.logo_url || null,
        eventTitle: eventInfo?.title || "Event",
        milestoneCount: selectedPoster.milestone_count,
        publishedResultCount: selectedPoster.published_result_count,
        rows: parseLeaderboard(selectedPoster.leaderboard_snapshot),
        layout: layoutForDownload,
        pixelRatio: 2,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => {
          if (value) resolve(value);
          else reject(new Error("Unable to prepare poster PNG."));
        }, "image/png");
      });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${eventInfo?.title || "event"}-after-${selectedPoster.milestone_count}-points-poster.png`
        .toLowerCase()
        .replace(/[^a-z0-9.]+/g, "-")
        .replace(/-+/g, "-");

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (error) {
      console.error(error);
      alert("Poster download failed. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  if (isLoading) {
    return (
      <AdminShell title="Milestone Posters" subtitle="Team points posters after every 10 results.">
        <div className="flex min-h-96 items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <Loader2 className="animate-spin text-violet-700" size={34} />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Milestone Posters"
      subtitle="Create championship point posters like After 10, After 20, After 90 results."
      actions={
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadPageData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 shadow-sm hover:bg-violet-100"
          >
            <ImagePlus size={17} />
            Template
          </button>

          <button
            type="button"
            onClick={generateMilestonePosters}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 hover:bg-violet-700 disabled:opacity-60"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={17} /> : <Rocket size={17} />}
            Generate Missing
          </button>
          <button
            type="button"
            onClick={resetMilestonePosters}
            disabled={isGenerating || milestonePosters.length === 0}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700 shadow-sm hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={17} />
            Reset Milestones
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

        <div className="rounded-[2rem] border border-violet-200 bg-violet-50 p-5 shadow-xl shadow-violet-900/5">
          <h2 className="text-lg font-black tracking-[-0.04em] text-violet-950">
            Milestone Poster Snapshot
          </h2>
          <p className="mt-2 text-sm font-bold leading-6 text-violet-800">
            Team points are calculated from all published programme results. Every 10 published programmes creates one locked snapshot. When a milestone
            poster is generated, the current team ranking is saved as a fixed snapshot.
            Reset milestones if you want to create fresh posters after changing results.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Published Programmes" value={publishedProgrammeCount} icon="🏆" />
          <StatCard label="Next Milestone" value={nextMilestone} icon="🚀" />
          <StatCard label="Posters Created" value={milestonePosters.length} icon="🖼️" />
          <StatCard label="Templates" value={visibleTemplates.length} icon="🎨" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                    Milestone Templates
                  </h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Used only for team points posters.
                  </p>
                </div>
                <Trophy className="text-violet-700" size={24} />
              </div>

              {hasCustomTemplates && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black leading-5 text-emerald-700">
                  Custom templates found. Default templates are now silent and only custom templates are shown.
                </div>
              )}

              {visibleTemplates.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                  <ImagePlus className="mx-auto text-slate-400" size={38} />
                  <p className="mt-3 text-sm font-black text-slate-600">
                    Upload your purple team points template.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {visibleTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`overflow-hidden rounded-2xl border ${
                        template.is_active
                          ? "border-violet-300 bg-violet-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex gap-3 p-3">
                        <TemplateThumbnail template={template} />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-950">
                            {template.name}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {Number(template.canvas_width || DEFAULT_POSTER_WIDTH)} × {Number(template.canvas_height || DEFAULT_POSTER_HEIGHT)}
                          </p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
                            {isDefaultMilestoneTemplate(template) ? "Default Template" : "Custom Template"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveTemplate(template.id)}
                              className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"
                            >
                              {template.is_active ? "Active" : "Set Active"}
                            </button>
                            {!isDefaultMilestoneTemplate(template) && (
                              <button
                                type="button"
                                onClick={() => deleteTemplate(template.id)}
                                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                Current Points
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                This is what will be saved into the next new milestone poster.
              </p>

              {currentLeaderboard.length === 0 ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                  No points yet.
                </div>
              ) : (
                <div className="mt-5 space-y-2">
                  {currentLeaderboard.map((row, index) => (
                    <div
                      key={row.teamId || row.teamName}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          #{index + 1} {row.teamName}
                        </p>
                        <p className="text-xs font-bold text-slate-500">Team ranking</p>
                      </div>
                      <p className="text-lg font-black text-violet-700">{row.points}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                    Created Milestone Posters
                  </h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Existing milestone snapshots are not changed when you regenerate.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={generateMilestonePosters}
                  disabled={isGenerating}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 hover:bg-violet-700 disabled:opacity-60"
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={17} /> : <Rocket size={17} />}
                  Generate Missing
                </button>
              </div>
            </div>

            {milestonePosters.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-12 text-center shadow-xl shadow-slate-900/5">
                <Star className="mx-auto text-slate-400" size={42} />
                <h3 className="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">
                  No milestone posters yet
                </h3>
                <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-slate-500">
                  Publish 10 programme results first. Then click Generate Missing to create After 10, After 20 and more.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {milestonePosters.map((poster) => (
                  <MilestoneAdminCard
                    key={poster.id}
                    poster={poster}
                    template={getTemplateForPoster(poster)}
                    onPreview={() => openPosterPreview(poster)}
                    onTogglePublic={() => togglePosterPublic(poster)}
                    onDelete={() => deleteMilestonePoster(poster.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <form onSubmit={uploadTemplate} className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                  Upload Milestone Template
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Use this for After 10 / After 20 team points posters.
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
                  placeholder="e.g. Purple After Points Template"
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
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setTemplateFile(file);
                    if (file && !templateName) {
                      setTemplateName(file.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/20 disabled:opacity-60"
            >
              {isUploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
              Upload Template
            </button>
          </form>
        </div>
      )}

      {selectedPoster && (() => {
        const selectedTemplate = getTemplateForPoster(selectedPoster);
        const posterWidth = Number(selectedTemplate?.canvas_width || DEFAULT_POSTER_WIDTH);
        const posterHeight = Number(selectedTemplate?.canvas_height || DEFAULT_POSTER_HEIGHT);
        const activeLayout = draftLayout || normalizeMilestoneLayout(selectedTemplate?.layout, posterWidth, posterHeight);
        const selectedLayer = activeLayout.elements[selectedLayoutElement];
        const previewScale = Math.min(0.54, 570 / Math.max(1, posterWidth));

        return (
          <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/70 px-3 py-4 backdrop-blur-md sm:px-4 sm:py-6">
            <div className="mx-auto max-w-[1500px] overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-black/30">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">
                    Editable Milestone Poster
                  </p>
                  <h3 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">
                    {selectedPoster.title} Points Poster
                  </h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Drag any outlined element on the poster, then save the template layout.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closePosterPreview}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid xl:grid-cols-[minmax(0,1fr)_390px]">
                <div className="flex min-h-[680px] items-start justify-center overflow-auto bg-slate-100 p-4 sm:p-7">
                  <div>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                          Poster Canvas
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Template: {selectedTemplate?.name || "Built-in design"} • {posterWidth} × {posterHeight}
                        </p>
                      </div>
                      <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">
                        Drag with mouse or touch
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-2xl shadow-slate-900/20">
                      <MilestonePosterCanvas
                        width={posterWidth}
                        height={posterHeight}
                        backgroundUrl={selectedTemplate?.image_url || null}
                        backgroundAlt={selectedTemplate?.name || "Milestone poster template"}
                        organizationName={organization?.name || "Organization"}
                        organizationLogoUrl={organization?.logo_url || null}
                        eventTitle={eventInfo?.title || "Event"}
                        milestoneCount={selectedPoster.milestone_count}
                        publishedResultCount={selectedPoster.published_result_count}
                        rows={parseLeaderboard(selectedPoster.leaderboard_snapshot)}
                        scale={previewScale}
                        layout={activeLayout}
                        editable
                        selectedElement={selectedLayoutElement}
                        onSelectElement={setSelectedLayoutElement}
                        onLayoutChange={setDraftLayout}
                      />
                    </div>
                  </div>
                </div>

                <aside className="border-t border-slate-100 bg-slate-50 p-4 sm:p-5 xl:border-l xl:border-t-0">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-violet-700">
                          Layout Editor
                        </p>
                        <h4 className="mt-1 text-base font-black text-slate-950">
                          {MILESTONE_ELEMENT_LABELS[selectedLayoutElement]}
                        </h4>
                      </div>
                      <label className="flex items-center gap-2 text-xs font-black text-slate-600">
                        <input
                          type="checkbox"
                          checked={selectedLayer.visible}
                          onChange={(event) => updateSelectedLayer({ visible: event.target.checked })}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Show
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        Select Element
                      </span>
                      <select
                        value={selectedLayoutElement}
                        onChange={(event) => setSelectedLayoutElement(event.target.value as MilestoneElementKey)}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black outline-none focus:border-violet-400"
                      >
                        {Object.entries(MILESTONE_ELEMENT_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </label>

                    <div className={`mt-4 grid gap-2 ${selectedLayoutElement === "logo" ? "grid-cols-2" : "grid-cols-3"}`}>
                      <NumberControl label="X" value={selectedLayer.x} onChange={(value) => updateSelectedLayer({ x: value })} />
                      <NumberControl label="Y" value={selectedLayer.y} onChange={(value) => updateSelectedLayer({ y: value })} />
                      <NumberControl label="Width" value={selectedLayer.width} min={40} onChange={(value) => updateSelectedLayer({ width: Math.max(40, value) })} />
                      {selectedLayoutElement === "logo" && (
                        <NumberControl
                          label="Height"
                          value={selectedLayer.height ?? selectedLayer.width}
                          min={40}
                          onChange={(value) => updateSelectedLayer({ height: Math.max(40, value) })}
                        />
                      )}
                    </div>

                    {selectedLayoutElement === "logo" ? (
                      <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
                          Logo Source
                        </p>

                        <label className="mt-3 block">
                          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-900">Source</span>
                          <select
                            value={selectedLayer.logoSource || "organization"}
                            onChange={(event) =>
                              updateSelectedLayer({
                                logoSource: event.target.value as any,
                                visible: event.target.value !== "none",
                              })
                            }
                            className="mt-1.5 h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-xs font-black"
                          >
                            <option value="organization">Organization Logo</option>
                            <option value="custom">Custom Logo</option>
                            <option value="none">No Logo</option>
                          </select>
                        </label>

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-900">Fit</span>
                            <select
                              value={selectedLayer.objectFit || "contain"}
                              onChange={(event) => updateSelectedLayer({ objectFit: event.target.value as any })}
                              className="mt-1.5 h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-xs font-black"
                            >
                              <option value="contain">Contain</option>
                              <option value="cover">Cover</option>
                            </select>
                          </label>
                          <NumberControl
                            label="Radius"
                            value={selectedLayer.borderRadius ?? 0}
                            min={0}
                            onChange={(value) => updateSelectedLayer({ borderRadius: Math.max(0, value) })}
                          />
                        </div>

                        <label className="mt-3 block">
                          <span className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.14em] text-violet-900">
                            <span>Opacity</span>
                            <span>{Math.round((selectedLayer.opacity ?? 1) * 100)}%</span>
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={selectedLayer.opacity ?? 1}
                            onChange={(event) => updateSelectedLayer({ opacity: Number(event.target.value) })}
                            className="mt-2 w-full accent-violet-600"
                          />
                        </label>

                        <div className="mt-4 rounded-xl border border-violet-200 bg-white p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                              {(selectedLayer.logoSource === "none"
                                ? null
                                : selectedLayer.logoSource === "custom"
                                  ? selectedLayer.customLogoUrl
                                  : organization?.logo_url) ? (
                                <img
                                  src={
                                    selectedLayer.logoSource === "none"
                                      ? ""
                                      : selectedLayer.logoSource === "custom"
                                        ? selectedLayer.customLogoUrl || ""
                                        : organization?.logo_url || ""
                                  }
                                  alt="Logo preview"
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <ImagePlus size={20} className="text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-black text-slate-800">
                                {selectedLayer.logoSource === "custom"
                                  ? "Custom milestone logo"
                                  : selectedLayer.logoSource === "none"
                                    ? "Logo hidden"
                                    : "Organization logo"}
                              </p>
                              <p className="mt-1 text-[10px] font-bold leading-4 text-slate-500">
                                Organization logo is taken automatically from your organization profile. Upload a custom logo only when this poster needs a different event mark.
                              </p>
                            </div>
                          </div>
                        </div>

                        <label className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-3 text-xs font-black text-violet-700 transition hover:bg-violet-100">
                          {isUploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                          {isUploadingLogo ? "Uploading..." : "Upload Custom Logo"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            disabled={isUploadingLogo}
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0] || null;
                              event.currentTarget.value = "";
                              if (file) uploadCustomMilestoneLogo(file);
                            }}
                          />
                        </label>
                      </div>
                    ) : (
                      <>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <NumberControl label="Font Size" value={selectedLayer.fontSize} min={6} onChange={(value) => updateSelectedLayer({ fontSize: Math.max(6, value) })} />

                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Weight</span>
                        <select
                          value={selectedLayer.fontWeight}
                          onChange={(event) => updateSelectedLayer({ fontWeight: Number(event.target.value) })}
                          className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black"
                        >
                          {[300, 400, 500, 600, 700, 800, 900].map((weight) => (
                            <option key={weight} value={weight}>{weight}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="mt-4 block">
                      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Font</span>
                      <select
                        value={selectedLayer.fontFamily}
                        onChange={(event) => updateSelectedLayer({ fontFamily: event.target.value })}
                        className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black"
                      >
                        <option value={'Inter, Arial, Helvetica, sans-serif'}>Inter / Sans</option>
                        <option value={'Arial, Helvetica, sans-serif'}>Arial</option>
                        <option value={'Georgia, "Times New Roman", serif'}>Georgia</option>
                        <option value={'"Times New Roman", Times, serif'}>Times New Roman</option>
                        <option value={'Impact, Haettenschweiler, sans-serif'}>Impact</option>
                      </select>
                    </label>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Color</span>
                        <div className="mt-1.5 flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2">
                          <input
                            type="color"
                            value={selectedLayer.color}
                            onChange={(event) => updateSelectedLayer({ color: event.target.value })}
                            className="h-7 w-8 cursor-pointer border-0 bg-transparent p-0"
                          />
                          <input
                            value={selectedLayer.color}
                            onChange={(event) => updateSelectedLayer({ color: event.target.value })}
                            className="min-w-0 flex-1 bg-transparent text-[11px] font-black outline-none"
                          />
                        </div>
                      </label>

                      <label className="block">
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Align</span>
                        <select
                          value={selectedLayer.textAlign}
                          onChange={(event) => updateSelectedLayer({ textAlign: event.target.value as any })}
                          className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </label>
                    </div>

                      </>
                    )}

                    {selectedLayoutElement === "leaderboard" && (
                      <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-violet-700">
                          Leaderboard Rows
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <NumberControl label="Row Gap" value={selectedLayer.rowGap ?? 14} min={0} onChange={(value) => updateSelectedLayer({ rowGap: Math.max(0, value) })} />
                          <NumberControl label="Name Size" value={selectedLayer.nameFontSize ?? selectedLayer.fontSize} min={6} onChange={(value) => updateSelectedLayer({ nameFontSize: Math.max(6, value) })} />
                          <NumberControl label="Points Size" value={selectedLayer.pointsFontSize ?? selectedLayer.fontSize} min={6} onChange={(value) => updateSelectedLayer({ pointsFontSize: Math.max(6, value) })} />
                          <NumberControl label="Rank Size" value={selectedLayer.rankFontSize ?? 20} min={6} onChange={(value) => updateSelectedLayer({ rankFontSize: Math.max(6, value) })} />
                        </div>
                        <label className="mt-3 flex items-center gap-2 text-xs font-black text-violet-900">
                          <input
                            type="checkbox"
                            checked={selectedLayer.showRanks !== false}
                            onChange={(event) => updateSelectedLayer({ showRanks: event.target.checked })}
                            className="h-4 w-4 rounded border-violet-300"
                          />
                          Show rank numbers
                        </label>
                      </div>
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={resetSelectedLayout}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700"
                      >
                        Reset Layout
                      </button>
                      <button
                        type="button"
                        onClick={saveSelectedLayout}
                        disabled={isSavingLayout}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-3 text-xs font-black text-white disabled:opacity-60"
                      >
                        {isSavingLayout ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        Save Layout
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                      Poster Actions
                    </p>

                    <button
                      type="button"
                      onClick={downloadSelectedPoster}
                      disabled={isDownloading}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {isDownloading ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
                      Download Current Preview
                    </button>

                    <button
                      type="button"
                      onClick={() => togglePosterPublic(selectedPoster)}
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      <Eye size={17} />
                      {selectedPoster.is_public ? "Hide from Public" : "Show on Public"}
                    </button>

                    <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">
                      Download uses the current editor position. Save Layout makes the same arrangement permanent for public milestone posters using this template.
                    </p>
                  </div>

                  <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5">
                    <h4 className="text-base font-black text-slate-950">Points Snapshot</h4>
                    <div className="mt-4 max-h-64 space-y-2 overflow-auto pr-1">
                      {parseLeaderboard(selectedPoster.leaderboard_snapshot).map((row, index) => (
                        <div key={row.teamId || row.teamName} className="flex justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                          <p className="text-sm font-black text-slate-700">#{index + 1} {row.teamName}</p>
                          <p className="text-sm font-black text-violet-700">{row.points}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        );
      })()}
    </AdminShell>
  );
}

function NumberControl({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</span>
      <input
        type="number"
        value={Math.round(Number(value) || 0)}
        min={min}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs font-black outline-none focus:border-violet-400"
      />
    </label>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="mt-4 text-4xl font-black tracking-[-0.08em] text-slate-950">{value}</p>
    </div>
  );
}

function TemplateThumbnail({ template }: { template: PosterTemplate }) {
  if (!template.image_url) {
    return (
      <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl bg-violet-950 text-white">
        🖼️
      </div>
    );
  }

  return (
    <img
      src={template.image_url}
      alt={template.name}
      className="h-20 w-16 shrink-0 rounded-xl object-cover"
    />
  );
}

function MilestoneAdminCard({
  poster,
  template,
  onPreview,
  onTogglePublic,
  onDelete,
}: {
  poster: MilestonePoster;
  template: PosterTemplate | null;
  onPreview: () => void;
  onTogglePublic: () => void;
  onDelete: () => void;
}) {
  const rows = parseLeaderboard(poster.leaderboard_snapshot);

  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
      <div className="bg-gradient-to-br from-violet-950 via-fuchsia-900 to-slate-950 p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/50">
              Championship Update
            </p>
            <h3 className="mt-3 text-4xl font-light tracking-[-0.08em]">
              After <span className="font-black">{poster.milestone_count}</span>
            </h3>
            <p className="mt-2 text-sm font-bold text-white/60">
              {poster.published_result_count} results counted
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
            {poster.is_public ? "Public" : "Hidden"}
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {rows.slice(0, 4).map((row, index) => (
            <div key={row.teamId || row.teamName} className="flex justify-between gap-4">
              <p className="truncate text-sm font-bold text-white/85">
                #{index + 1} {row.teamName}
              </p>
              <p className="text-sm font-black text-white">{row.points}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5">
        <p className="text-xs font-bold text-slate-500">
          Template: <span className="font-black text-slate-700">{template?.name || "Built-in design"}</span>
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onPreview}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-3 py-3 text-xs font-black text-white"
          >
            <Eye size={15} />
            Preview
          </button>

          <button
            type="button"
            onClick={onTogglePublic}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-700"
          >
            {poster.is_public ? "Hide" : "Show"}
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-xs font-black text-red-700"
          >
            <Trash2 size={15} />
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function getPublishedProgrammeCount(results: ResultItem[]) {
  return Array.from(
    new Set(
      results
        .filter((result) => result.is_published && result.programme_id)
        .map((result) => result.programme_id as string),
    ),
  ).length;
}

function buildLeaderboard(
  results: ResultItem[],
  registrations: Registration[],
  teams: Team[],
): TeamPoint[] {
  const map = new Map<string, number>();

  results
    .filter((result) => result.is_published)
    .forEach((result) => {
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
      teamName: teams.find((team) => team.id === teamId)?.name || "-",
      points,
    }))
    .sort((a, b) => b.points - a.points);
}

function parseLeaderboard(value: MilestonePoster["leaderboard_snapshot"]): TeamPoint[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item: any) => ({
        teamId: String(item.teamId || item.team_id || item.id || item.teamName || ""),
        teamName: String(item.teamName || item.team_name || item.name || "-"),
        points: Number(item.points || 0),
      }))
      .sort((a, b) => b.points - a.points);
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parseLeaderboard(parsed as any);
  } catch {
    return [];
  }
}

function isDefaultMilestoneTemplate(template: PosterTemplate) {
  return DEFAULT_MILESTONE_TEMPLATES.some(
    (item) => item.image_url === template.image_url,
  );
}

function getImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        width: image.naturalWidth || DEFAULT_POSTER_WIDTH,
        height: image.naturalHeight || DEFAULT_POSTER_HEIGHT,
      });
      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      resolve({ width: DEFAULT_POSTER_WIDTH, height: DEFAULT_POSTER_HEIGHT });
      URL.revokeObjectURL(url);
    };

    image.src = url;
  });
}

async function waitForImages(root: HTMLElement) {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));

  if (typeof document !== "undefined" && "fonts" in document) {
    try {
      await (document as any).fonts.ready;
    } catch {}
  }

  const images = Array.from(root.querySelectorAll("img"));

  await Promise.all(
    images.map(
      (image) =>
        new Promise((resolve) => {
          if (image.complete) {
            resolve(true);
            return;
          }
          image.onload = () => resolve(true);
          image.onerror = () => resolve(true);
        }),
    ),
  );
}