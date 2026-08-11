/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import SearchableProgrammeSelect from "@/components/admin/SearchableProgrammeSelect";
import { getAdminContext } from "@/lib/admin-context";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { supabase } from "@/lib/supabase";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Printer,
  RefreshCcw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

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

type Category = {
  id: string;
  name: string;
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
  duration_minutes: number | null;
  sort_order: number;
  status: string;
};

type Registration = {
  id: string;
  programme_id: string | null;
  student_id: string | null;
  team_id: string | null;
  group_name: string | null;
  status: string;
};

type ScheduleStage = {
  id: string;
  organization_id: string;
  event_id: string;
  name: string;
  stage_type: string | null;
  stage_date: string | null;
  start_time: string | null;
  gap_minutes: number;
  sort_order: number;
  created_at: string;
};

type ScheduleItem = {
  id: string;
  organization_id: string;
  event_id: string;
  stage_id: string;
  programme_id: string;
  duration_minutes: number;
  gap_after_minutes: number | null;
  sort_order: number;
  status: string;
  created_at: string;
};

type DurationInfo = {
  baseMinutes: number;
  unitCount: number;
  unitLabel: string;
  calculatedMinutes: number;
  explanation: string;
};

export default function SchedulePage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stages, setStages] = useState<ScheduleStage[]>([]);
  const [items, setItems] = useState<ScheduleItem[]>([]);

  const [selectedStageId, setSelectedStageId] = useState("");
  const [showStageModal, setShowStageModal] = useState(false);

  const [stageName, setStageName] = useState("");
  const [stageType, setStageType] = useState<"stage" | "off_stage">("stage");
  const [stageDate, setStageDate] = useState("");
  const [stageStartTime, setStageStartTime] = useState("09:00");
  const [gapMinutes, setGapMinutes] = useState("5");

  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [selectedDuration, setSelectedDuration] = useState("10");
  const [programmeCategoryFilter, setProgrammeCategoryFilter] = useState("all");
  const [programmeGenderFilter, setProgrammeGenderFilter] = useState("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStage, setIsSavingStage] = useState(false);
  const [isAddingProgramme, setIsAddingProgramme] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const selectedStage = useMemo(() => {
    return stages.find((stage) => stage.id === selectedStageId) || null;
  }, [stages, selectedStageId]);

  const selectedStageItems = useMemo(() => {
    return items
      .filter((item) => item.stage_id === selectedStageId)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [items, selectedStageId]);

  const availableProgrammes = useMemo(() => {
    const alreadyScheduled = new Set(items.map((item) => item.programme_id));
    const selectedLocation = selectedStage
      ? normalizeStageType(selectedStage.stage_type || selectedStage.name)
      : null;

    return programmes
      .filter((programme) => {
        if (programme.status === "inactive") return false;
        if (alreadyScheduled.has(programme.id)) return false;

        const locationOk =
          !selectedLocation ||
          normalizeStageType(programme.stage_type) === selectedLocation;

        const categoryOk =
          programmeCategoryFilter === "all" ||
          (programmeCategoryFilter === "general" && !programme.category_id) ||
          programme.category_id === programmeCategoryFilter;

        const programmeGender = normalizeGenderScope(programme.gender_scope);
        const genderOk =
          programmeGenderFilter === "all" ||
          programmeGender === "all" ||
          programmeGender === programmeGenderFilter;

        return locationOk && categoryOk && genderOk;
      })
      .sort((a, b) => {
        const orderDiff = Number(a.sort_order || 0) - Number(b.sort_order || 0);
        return orderDiff || a.name.localeCompare(b.name);
      });
  }, [
    programmes,
    items,
    selectedStage,
    programmeCategoryFilter,
    programmeGenderFilter,
  ]);

  const availableProgrammeOptions = useMemo(() => {
    return availableProgrammes.map((programme) => ({
      id: programme.id,
      name: programme.name,
      sort_order: programme.sort_order,
      categoryName: getCategoryName(programme.category_id),
      programmeType: programme.programme_type,
      stageType: programme.stage_type,
      genderScope: programme.gender_scope,
    }));
  }, [availableProgrammes, categories]);

  useEffect(() => {
    if (!selectedProgrammeId) return;

    const isStillAvailable = availableProgrammes.some(
      (programme) => programme.id === selectedProgrammeId,
    );

    if (!isStillAvailable) {
      setSelectedProgrammeId("");
      setSelectedDuration("10");
    }
  }, [
    selectedProgrammeId,
    availableProgrammes,
    selectedStageId,
    programmeCategoryFilter,
    programmeGenderFilter,
  ]);

  const selectedProgramme = useMemo(() => {
    return programmes.find((p) => p.id === selectedProgrammeId) || null;
  }, [programmes, selectedProgrammeId]);

  const selectedProgrammeDurationInfo = useMemo(() => {
    return selectedProgramme
      ? getDurationInfo(selectedProgramme)
      : null;
  }, [selectedProgramme, registrations]);

  const scheduleRows = useMemo(() => {
    if (!selectedStage) return [];

    let currentMinutes = timeToMinutes(selectedStage.start_time || "09:00");

    return selectedStageItems.map((item, index) => {
      const programme = getProgramme(item.programme_id);
      const durationInfo = programme ? getDurationInfo(programme) : null;
      const startTime = minutesToTime(currentMinutes);
      const endTime = minutesToTime(
        currentMinutes + Number(item.duration_minutes || 0),
      );
      const effectiveGap = getEffectiveGap(item, selectedStage);

      currentMinutes =
        currentMinutes +
        Number(item.duration_minutes || 0) +
        effectiveGap;

      return {
        item,
        programme,
        durationInfo,
        index,
        startTime,
        endTime,
        effectiveGap,
      };
    });
  }, [selectedStageItems, selectedStage, programmes, registrations]);

  const totalScheduled = items.length;
  const totalDuration = selectedStageItems.reduce(
    (sum, item) => sum + Number(item.duration_minutes || 0),
    0,
  );

  const selectedStageFinish =
    scheduleRows.length > 0
      ? scheduleRows[scheduleRows.length - 1].endTime
      : selectedStage?.start_time || "-";

  async function loadData() {
    setIsLoading(true);
    setError("");
    setMessage("");

    const admin = await getAdminContext({ forceRefresh: true });

    if (admin.error || !admin.context) {
      stopLoading(admin.error || "Unable to load workspace.");
      return;
    }

    const context = admin.context;

    try {
      const registrationRows = await fetchAllRows<Registration>((from, to) =>
        supabase
          .from("programme_registrations")
          .select(
            "id, programme_id, student_id, team_id, group_name, status",
          )
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .eq("status", "registered")
          .order("created_at", { ascending: true })
          .range(from, to),
      );

      const [orgRes, eventRes, categoryRes, programmeRes, stageRes, itemRes] =
        await Promise.all([
          supabase
            .from("organizations")
            .select("id, name, place")
            .eq("id", context.organizationId)
            .maybeSingle(),

          supabase
            .from("events")
            .select(
              "id, organization_id, title, venue, start_date, end_date",
            )
            .eq("id", context.eventId)
            .eq("organization_id", context.organizationId)
            .maybeSingle(),

          supabase
            .from("categories")
            .select("id, name")
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId)
            .order("sort_order", { ascending: true }),

          supabase
            .from("programmes")
            .select("*")
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId)
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true }),

          supabase
            .from("schedule_stages")
            .select("*")
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId)
            .order("sort_order", { ascending: true }),

          supabase
            .from("schedule_items")
            .select("*")
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId)
            .order("sort_order", { ascending: true }),
        ]);

      const firstError =
        orgRes.error ||
        eventRes.error ||
        categoryRes.error ||
        programmeRes.error ||
        stageRes.error ||
        itemRes.error;

      if (firstError) {
        stopLoading(firstError.message);
        return;
      }

      if (!eventRes.data) {
        stopLoading("Event setup not found.");
        return;
      }

      const loadedStages = (stageRes.data || []) as ScheduleStage[];

      setOrganization((orgRes.data || null) as Organization | null);
      setEventInfo(eventRes.data as EventInfo);
      setCategories((categoryRes.data || []) as Category[]);
      setProgrammes((programmeRes.data || []) as Programme[]);
      setRegistrations(registrationRows);
      setStages(loadedStages);
      setItems((itemRes.data || []) as ScheduleItem[]);

      if (loadedStages.length > 0) {
        setSelectedStageId((current) =>
          loadedStages.some((stage) => stage.id === current)
            ? current
            : loadedStages[0].id,
        );
      } else {
        setSelectedStageId("");
      }

      setIsLoading(false);
    } catch (loadError: any) {
      stopLoading(loadError?.message || "Unable to load schedule data.");
    }
  }

  function stopLoading(message: string) {
    setError(message);
    setIsLoading(false);
    setIsSavingStage(false);
    setIsAddingProgramme(false);
    setIsRecalculating(false);
  }

  function getProgramme(id: string | null) {
    return programmes.find((item) => item.id === id) || null;
  }

  function getCategoryName(id: string | null | undefined) {
    if (!id) return "General";
    return categories.find((item) => item.id === id)?.name || "General";
  }

  function getEffectiveGap(
    item: ScheduleItem,
    stage: ScheduleStage | null = selectedStage,
  ) {
    if (!stage) return 0;

    if (
      item.gap_after_minutes === null ||
      item.gap_after_minutes === undefined
    ) {
      return Math.max(0, Number(stage.gap_minutes || 0));
    }

    return Math.max(0, Number(item.gap_after_minutes || 0));
  }

  function getProgrammeRegistrations(programmeId: string) {
    return registrations.filter(
      (registration) => registration.programme_id === programmeId,
    );
  }

  function getParticipantCount(programmeId: string) {
    return getProgrammeRegistrations(programmeId).length;
  }

  function getGroupCount(programmeId: string) {
    const programmeRegistrations = getProgrammeRegistrations(programmeId);
    const groupKeys = new Set<string>();

    programmeRegistrations.forEach((registration) => {
      const groupName = String(registration.group_name || "")
        .trim()
        .toLowerCase();
      const teamId = registration.team_id || "";

      if (groupName || teamId) {
        groupKeys.add(`${teamId || "no-team"}::${groupName || "group"}`);
      } else {
        // If neither team nor group name exists, do not collapse unrelated
        // registrations into one group.
        groupKeys.add(`registration::${registration.id}`);
      }
    });

    return groupKeys.size;
  }

  function getDurationInfo(programme: Programme): DurationInfo {
    const baseMinutes = Math.max(1, Number(programme.duration_minutes || 1));
    const isOffStage = formatStageType(programme.stage_type) === "Off-stage";
    const isGroup = String(programme.programme_type || "").toLowerCase() === "group";

    if (isOffStage) {
      const participantCount = getParticipantCount(programme.id);

      return {
        baseMinutes,
        unitCount: participantCount,
        unitLabel: participantCount === 1 ? "participant" : "participants",
        calculatedMinutes: baseMinutes,
        explanation: `${baseMinutes} mins total (off-stage runs together)`,
      };
    }

    if (isGroup) {
      const groups = getGroupCount(programme.id);
      const effectiveGroups = groups > 0 ? groups : 1;

      return {
        baseMinutes,
        unitCount: groups,
        unitLabel: groups === 1 ? "group" : "groups",
        calculatedMinutes: effectiveGroups * baseMinutes,
        explanation:
          groups > 0
            ? `${groups} ${groups === 1 ? "group" : "groups"} × ${baseMinutes} mins = ${groups * baseMinutes} mins`
            : `No groups yet • using base ${baseMinutes} mins`,
      };
    }

    const participants = getParticipantCount(programme.id);
    const effectiveParticipants = participants > 0 ? participants : 1;

    return {
      baseMinutes,
      unitCount: participants,
      unitLabel: participants === 1 ? "participant" : "participants",
      calculatedMinutes: effectiveParticipants * baseMinutes,
      explanation:
        participants > 0
          ? `${participants} ${participants === 1 ? "participant" : "participants"} × ${baseMinutes} mins = ${participants * baseMinutes} mins`
          : `No participants yet • using base ${baseMinutes} mins`,
    };
  }

  function formatDate(value: string | null) {
    if (!value) return "-";

    const parts = value.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      return `${day} ${months[Number(month) - 1] || month} ${year}`;
    }

    return value;
  }

  function normalizeStageType(value: string | null | undefined) {
    const text = String(value || "").trim().toLowerCase().replace(/[-\s]+/g, "_");
    return text.includes("off") ? "off_stage" : "stage";
  }

  function normalizeGenderScope(value: string | null | undefined) {
    const text = String(value || "").trim().toLowerCase();

    if (text.includes("female") || text.includes("girl")) return "female";
    if (text.includes("male") || text.includes("boy")) return "male";
    return "all";
  }

  function formatGenderScope(value: string | null | undefined) {
    const normalized = normalizeGenderScope(value);
    if (normalized === "female") return "Girls";
    if (normalized === "male") return "Boys";
    return "All";
  }

  function formatStageType(value: string | null | undefined) {
    return normalizeStageType(value) === "off_stage" ? "Off-stage" : "Stage";
  }

  function formatProgrammeType(value: string | null | undefined) {
    return String(value || "").toLowerCase() === "group" ? "Group" : "Individual";
  }

  function timeToMinutes(value: string) {
    const [hour, minute] = String(value || "09:00")
      .split(":")
      .map((item) => Number(item));

    return hour * 60 + minute;
  }

  function minutesToTime(totalMinutes: number) {
    const normalized = ((totalMinutes % 1440) + 1440) % 1440;
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function updateStageLocal(stageId: string, patch: Partial<ScheduleStage>) {
    setStages((current) =>
      current.map((stage) =>
        stage.id === stageId ? { ...stage, ...patch } : stage,
      ),
    );
  }

  async function saveStagePatch(stageId: string, patch: any) {
    const { error: updateError } = await supabase
      .from("schedule_stages")
      .update(patch)
      .eq("id", stageId);

    if (updateError) setError(updateError.message);
  }

  function updateItemLocal(itemId: string, patch: Partial<ScheduleItem>) {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
  }

  async function saveItemPatch(itemId: string, patch: any) {
    const { error: updateError } = await supabase
      .from("schedule_items")
      .update(patch)
      .eq("id", itemId);

    if (updateError) setError(updateError.message);
  }

  async function createStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!eventInfo) {
      setError("Event not found.");
      return;
    }

    if (!stageName.trim()) {
      setError("Enter stage name.");
      return;
    }

    setIsSavingStage(true);

    const payload = {
      organization_id: eventInfo.organization_id,
      event_id: eventInfo.id,
      name: stageName.trim(),
      stage_type: stageType,
      stage_date: stageDate || eventInfo.start_date || null,
      start_time: stageStartTime || "09:00",
      gap_minutes: Number(gapMinutes || 0),
      sort_order:
        Math.max(0, ...stages.map((item) => Number(item.sort_order || 0))) + 1,
    };

    const { data, error: insertError } = await supabase
      .from("schedule_stages")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) {
      stopLoading(insertError.message);
      return;
    }

    const newStage = data as ScheduleStage;

    setStages((current) => [...current, newStage]);
    setSelectedStageId(newStage.id);
    setShowStageModal(false);
    setStageName("");
    setStageType("stage");
    setStageDate("");
    setStageStartTime("09:00");
    setGapMinutes("5");
    setMessage("Stage created successfully.");
    setIsSavingStage(false);
  }

  async function addProgrammeToStage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!eventInfo || !selectedStage) {
      setError("Please create/select a stage first.");
      return;
    }

    if (!selectedProgrammeId || !selectedProgramme) {
      setError("Select a programme.");
      return;
    }

    const finalDuration = Number(selectedDuration || 0);

    if (!Number.isFinite(finalDuration) || finalDuration < 1) {
      setError("Duration must be at least 1 minute.");
      return;
    }

    setIsAddingProgramme(true);

    const maxOrder =
      selectedStageItems.length > 0
        ? Math.max(...selectedStageItems.map((item) => item.sort_order))
        : 0;

    const payload = {
      organization_id: eventInfo.organization_id,
      event_id: eventInfo.id,
      stage_id: selectedStage.id,
      programme_id: selectedProgrammeId,
      duration_minutes: finalDuration,
      gap_after_minutes: null,
      sort_order: maxOrder + 1,
      status: "scheduled",
    };

    const { data, error: insertError } = await supabase
      .from("schedule_items")
      .insert(payload)
      .select("*")
      .single();

    if (insertError) {
      if (insertError.message.toLowerCase().includes("duplicate")) {
        stopLoading("This programme is already added to schedule.");
        return;
      }

      stopLoading(insertError.message);
      return;
    }

    setItems((current) => [...current, data as ScheduleItem]);
    setSelectedProgrammeId("");
    setSelectedDuration("10");
    setMessage("Programme added with calculated schedule duration.");
    setIsAddingProgramme(false);
  }

  async function deleteScheduleItem(itemId: string) {
    const confirmed = confirm("Remove this programme from schedule?");
    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("schedule_items")
      .delete()
      .eq("id", itemId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setItems((current) => current.filter((item) => item.id !== itemId));
  }

  async function deleteStage(stageId: string) {
    const confirmed = confirm(
      "Delete this stage and all scheduled programmes inside it?",
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("schedule_stages")
      .delete()
      .eq("id", stageId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    const remainingStages = stages.filter((stage) => stage.id !== stageId);

    setStages(remainingStages);
    setItems((current) => current.filter((item) => item.stage_id !== stageId));
    setSelectedStageId(remainingStages[0]?.id || "");
  }

  async function moveItem(item: ScheduleItem, direction: "up" | "down") {
    const ordered = [...selectedStageItems];
    const index = ordered.findIndex((row) => row.id === item.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= ordered.length) return;

    const targetItem = ordered[targetIndex];

    const { error: firstError } = await supabase
      .from("schedule_items")
      .update({ sort_order: targetItem.sort_order })
      .eq("id", item.id);

    if (firstError) {
      setError(firstError.message);
      return;
    }

    const { error: secondError } = await supabase
      .from("schedule_items")
      .update({ sort_order: item.sort_order })
      .eq("id", targetItem.id);

    if (secondError) {
      setError(secondError.message);
      return;
    }

    setItems((current) =>
      current.map((row) => {
        if (row.id === item.id) {
          return { ...row, sort_order: targetItem.sort_order };
        }

        if (row.id === targetItem.id) {
          return { ...row, sort_order: item.sort_order };
        }

        return row;
      }),
    );
  }

  async function useAutoDuration(item: ScheduleItem) {
    const programme = getProgramme(item.programme_id);
    if (!programme) return;

    const autoDuration = getDurationInfo(programme).calculatedMinutes;

    updateItemLocal(item.id, { duration_minutes: autoDuration });
    await saveItemPatch(item.id, { duration_minutes: autoDuration });
    setMessage(`Updated ${programme.name} to ${autoDuration} mins.`);
  }

  async function recalculateSelectedStage() {
    if (!selectedStage || selectedStageItems.length === 0) return;

    const confirmed = confirm(
      "Recalculate all durations in this stage from the latest participant/group counts?\n\nThis will replace any manual duration changes for this stage.",
    );

    if (!confirmed) return;

    setIsRecalculating(true);
    setError("");
    setMessage("");

    try {
      const updates = selectedStageItems.map((item) => {
        const programme = getProgramme(item.programme_id);
        const duration = programme
          ? getDurationInfo(programme).calculatedMinutes
          : Number(item.duration_minutes || 1);

        return { item, duration };
      });

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("schedule_items")
          .update({ duration_minutes: update.duration })
          .eq("id", update.item.id);

        if (updateError) throw updateError;
      }

      setItems((current) =>
        current.map((item) => {
          const update = updates.find((entry) => entry.item.id === item.id);
          return update
            ? { ...item, duration_minutes: update.duration }
            : item;
        }),
      );

      setMessage(
        `Recalculated ${updates.length} programme duration${updates.length === 1 ? "" : "s"} for ${selectedStage.name}.`,
      );
    } catch (recalculateError: any) {
      setError(
        recalculateError?.message || "Unable to recalculate schedule durations.",
      );
    } finally {
      setIsRecalculating(false);
    }
  }

  function printSchedule() {
    window.print();
  }

  return (
    <AdminShell
      title="Schedule"
      subtitle="Plan stage programmes, timing order and printable schedules."
      actions={
        <div className="flex flex-wrap gap-3 no-print">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowStageModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700"
          >
            <Plus size={17} />
            Stage
          </button>

          <button
            type="button"
            onClick={printSchedule}
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 shadow-sm transition hover:bg-emerald-100"
          >
            <Printer size={17} />
            Print
          </button>
        </div>
      }
    >
      <style jsx global>{`
        .print-area {
          display: none;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          body * {
            visibility: hidden !important;
          }

          .print-area,
          .print-area * {
            visibility: visible !important;
          }

          .print-area {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          .stage-print-block {
            page-break-after: always;
            break-after: page;
            page-break-before: auto;
            break-before: auto;
          }

          .schedule-print-header {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .stage-print-block:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      `}</style>

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
          <div className="flex min-h-96 items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
            <Loader2 className="animate-spin text-violet-700" size={34} />
          </div>
        ) : stages.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-xl shadow-slate-900/5">
            <CalendarDays className="mx-auto text-slate-400" size={44} />

            <h2 className="mt-4 text-3xl font-black tracking-[-0.06em] text-slate-950">
              No stages created
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
              Create Stage 1, Stage 2 or Off-stage. Then add programmes and the
              timings will be calculated automatically.
            </p>

            <button
              type="button"
              onClick={() => setShowStageModal(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20"
            >
              <Plus size={17} />
              Create First Stage
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-5 no-print">
              <StatCard icon="🏟️" label="Stages" value={stages.length} />
              <StatCard icon="📋" label="Scheduled" value={totalScheduled} />
              <StatCard
                icon="⏱️"
                label="Programme Time"
                value={totalDuration}
                suffix="mins"
              />
              <StatCard
                icon="🕘"
                label="Default Gap"
                value={selectedStage?.gap_minutes || 0}
                suffix="mins"
              />
              <TextStatCard
                icon="🏁"
                label="Stage Finish"
                value={selectedStageFinish}
              />
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 no-print">
              <div className="flex flex-wrap gap-3">
                {stages.map((stage) => (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => setSelectedStageId(stage.id)}
                    className={`min-w-[170px] rounded-2xl border px-5 py-4 text-left transition ${
                      selectedStageId === stage.id
                        ? "border-violet-300 bg-violet-50 text-violet-700 ring-4 ring-violet-100"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-base font-black">{stage.name}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${
                          normalizeStageType(stage.stage_type || stage.name) ===
                          "off_stage"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-violet-100 text-violet-700"
                        }`}
                      >
                        {formatStageType(stage.stage_type || stage.name)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-bold opacity-70">
                      {formatDate(stage.stage_date)} • {stage.start_time || "09:00"}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {selectedStage && (
              <>
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 no-print">
                  <div className="mb-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                      Selected Stage
                    </p>
                    <h2 className="mt-1 text-3xl font-black tracking-[-0.06em] text-slate-950">
                      {selectedStage.name}
                    </h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      The stage location controls which programmes can be added.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(180px,1.2fr)_minmax(170px,1fr)_minmax(170px,1fr)_minmax(150px,0.8fr)_140px] xl:items-end">
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Programme Location
                      </label>
                      <select
                        value={normalizeStageType(
                          selectedStage.stage_type || selectedStage.name,
                        )}
                        disabled={selectedStageItems.length > 0}
                        onChange={(event) => {
                          const nextType = event.target.value;
                          updateStageLocal(selectedStage.id, {
                            stage_type: nextType,
                          });
                          saveStagePatch(selectedStage.id, {
                            stage_type: nextType,
                          });
                          setSelectedProgrammeId("");
                          setSelectedDuration("10");
                        }}
                        className="mt-2 h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="stage">Stage</option>
                        <option value="off_stage">Off-stage</option>
                      </select>
                      {selectedStageItems.length > 0 && (
                        <p className="mt-1 text-[10px] font-bold text-slate-400">
                          Remove scheduled programmes before changing location.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Date
                      </label>
                      <input
                        type="date"
                        value={selectedStage.stage_date || ""}
                        onChange={(event) => {
                          updateStageLocal(selectedStage.id, {
                            stage_date: event.target.value || null,
                          });
                          saveStagePatch(selectedStage.id, {
                            stage_date: event.target.value || null,
                          });
                        }}
                        className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={selectedStage.start_time || "09:00"}
                        onChange={(event) => {
                          updateStageLocal(selectedStage.id, {
                            start_time: event.target.value,
                          });
                          saveStagePatch(selectedStage.id, {
                            start_time: event.target.value,
                          });
                        }}
                        className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Default Gap Minutes
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={selectedStage.gap_minutes}
                        onChange={(event) =>
                          updateStageLocal(selectedStage.id, {
                            gap_minutes: Number(event.target.value || 0),
                          })
                        }
                        onBlur={(event) =>
                          saveStagePatch(selectedStage.id, {
                            gap_minutes: Number(event.target.value || 0),
                          })
                        }
                        className="mt-2 h-13 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none"
                      />
                      <p className="mt-1 text-[10px] font-bold leading-4 text-slate-400">
                        Used automatically unless a programme has its own gap.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteStage(selectedStage.id)}
                      className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700"
                    >
                      <Trash2 size={17} />
                      Delete
                    </button>
                  </div>
                </div>

                <form
                  onSubmit={addProgrammeToStage}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 no-print"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                        Add Programme
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        Only {formatStageType(
                          selectedStage.stage_type || selectedStage.name,
                        ).toLowerCase()} programmes are shown for this stage.
                      </p>
                    </div>

                    <span className="inline-flex w-fit rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-violet-700">
                      {availableProgrammes.length} available
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Category
                      </label>
                      <select
                        value={programmeCategoryFilter}
                        onChange={(event) =>
                          setProgrammeCategoryFilter(event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="all">All Categories</option>
                        <option value="general">General</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Gender
                      </label>
                      <select
                        value={programmeGenderFilter}
                        onChange={(event) =>
                          setProgrammeGenderFilter(event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="all">All Genders</option>
                        <option value="male">Boys</option>
                        <option value="female">Girls</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Stage / Off-stage
                      </label>
                      <div className="mt-2 flex h-12 items-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700">
                        {formatStageType(
                          selectedStage.stage_type || selectedStage.name,
                        )}
                        <span className="ml-2 text-xs font-bold text-slate-400">
                          automatic
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px_150px] xl:items-end">
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Programme
                      </label>
                      <div className="mt-3 relative z-40">
                        <SearchableProgrammeSelect
                          value={selectedProgrammeId}
                          onChange={(programmeId) => {
                            const programme = programmes.find(
                              (p) => p.id === programmeId,
                            );

                            setSelectedProgrammeId(programmeId);

                            if (programme) {
                              setSelectedDuration(
                                String(
                                  getDurationInfo(programme).calculatedMinutes,
                                ),
                              );
                            } else {
                              setSelectedDuration("10");
                            }
                          }}
                          options={availableProgrammeOptions}
                          placeholder="Search programme to add..."
                          emptyText="No programmes match this stage and filters"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                        Final Schedule Duration
                      </label>
                      <input
                        value={selectedDuration}
                        onChange={(event) =>
                          setSelectedDuration(event.target.value)
                        }
                        type="number"
                        min="1"
                        placeholder="10"
                        className="mt-3 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isAddingProgramme || !selectedProgrammeId}
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-900/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isAddingProgramme ? (
                        <Loader2 className="animate-spin" size={17} />
                      ) : (
                        <Plus size={17} />
                      )}
                      Add
                    </button>
                  </div>

                  {selectedProgramme && selectedProgrammeDurationInfo && (
                    <div className="mt-4 grid gap-3 rounded-2xl border border-violet-100 bg-violet-50/70 p-4 md:grid-cols-4">
                      <MiniInfo
                        label="Base Time"
                        value={`${selectedProgrammeDurationInfo.baseMinutes} mins`}
                        note={
                          formatStageType(selectedProgramme.stage_type) ===
                          "Off-stage"
                            ? "total"
                            : formatProgrammeType(
                                  selectedProgramme.programme_type,
                                ) === "Group"
                              ? "per group"
                              : "per participant"
                        }
                      />
                      <MiniInfo
                        label={
                          formatProgrammeType(
                            selectedProgramme.programme_type,
                          ) === "Group"
                            ? "Groups"
                            : "Participants"
                        }
                        value={String(
                          selectedProgrammeDurationInfo.unitCount,
                        )}
                        note="registered now"
                      />
                      <MiniInfo
                        label="Auto Duration"
                        value={`${selectedProgrammeDurationInfo.calculatedMinutes} mins`}
                        note="recommended"
                      />
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
                          Calculation
                        </p>
                        <p className="mt-1 text-xs font-black leading-5 text-slate-700">
                          {selectedProgrammeDurationInfo.explanation}
                        </p>
                      </div>
                    </div>
                  )}
                </form>

                <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                  <div className="flex flex-col gap-4 border-b border-slate-200 p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                        Stage Schedule
                      </h3>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        Stage individual = participants × time. Stage group =
                        groups × time. Off-stage = base time only.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={recalculateSelectedStage}
                      disabled={
                        isRecalculating || selectedStageItems.length === 0
                      }
                      className="no-print inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRecalculating ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <RotateCcw size={16} />
                      )}
                      Recalculate Durations
                    </button>
                  </div>

                  {scheduleRows.length === 0 ? (
                    <div className="p-10 text-center text-sm font-bold text-slate-500">
                      No programmes added to this stage.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1320px] border-collapse text-left">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50">
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                              Order
                            </th>
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                              Programme
                            </th>
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                              Entries / Calculation
                            </th>
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                              Time
                            </th>
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                              Duration
                            </th>
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                              Gap After
                            </th>
                            <th className="px-5 py-4 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                              Status
                            </th>
                            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                              Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {scheduleRows.map((row) => (
                            <tr
                              key={row.item.id}
                              className="border-b border-slate-100 last:border-b-0"
                            >
                              <td className="px-5 py-5 align-top">
                                <span className="text-xl font-black text-violet-700">
                                  #{row.index + 1}
                                </span>
                              </td>

                              <td className="px-5 py-5 align-top">
                                <p className="text-base font-black text-slate-950">
                                  {row.programme?.name || "Programme"}
                                </p>
                                <p className="mt-1 text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                                  {getCategoryName(row.programme?.category_id)} ·{" "}
                                  {formatGenderScope(row.programme?.gender_scope)} ·{" "}
                                  {formatProgrammeType(
                                    row.programme?.programme_type,
                                  )} · {formatStageType(row.programme?.stage_type)}
                                </p>
                              </td>

                              <td className="px-5 py-5 align-top">
                                {row.durationInfo ? (
                                  <div>
                                    <p className="text-sm font-black text-slate-800">
                                      {row.durationInfo.unitCount}{" "}
                                      {row.durationInfo.unitLabel}
                                    </p>
                                    <p className="mt-1 max-w-[250px] text-xs font-bold leading-5 text-slate-500">
                                      {row.durationInfo.explanation}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-sm font-bold text-slate-400">
                                    -
                                  </span>
                                )}
                              </td>

                              <td className="px-5 py-5 align-top">
                                <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2">
                                  <Clock size={16} className="text-slate-400" />
                                  <span className="text-sm font-black text-slate-950">
                                    {row.startTime} - {row.endTime}
                                  </span>
                                </div>
                              </td>

                              <td className="px-5 py-5 align-top">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={row.item.duration_minutes}
                                    onChange={(event) =>
                                      updateItemLocal(row.item.id, {
                                        duration_minutes: Number(
                                          event.target.value || 0,
                                        ),
                                      })
                                    }
                                    onBlur={(event) =>
                                      saveItemPatch(row.item.id, {
                                        duration_minutes: Number(
                                          event.target.value || 0,
                                        ),
                                      })
                                    }
                                    className="h-11 w-24 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none"
                                  />
                                  <span className="text-sm font-bold text-slate-500">
                                    mins
                                  </span>
                                </div>

                                {row.durationInfo &&
                                  row.item.duration_minutes !==
                                    row.durationInfo.calculatedMinutes && (
                                    <button
                                      type="button"
                                      onClick={() => useAutoDuration(row.item)}
                                      className="mt-2 inline-flex items-center gap-1 text-xs font-black text-violet-700 hover:text-violet-900"
                                    >
                                      <RotateCcw size={12} />
                                      Use auto {row.durationInfo.calculatedMinutes}
                                    </button>
                                  )}
                              </td>

                              <td className="px-5 py-5 align-top">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    value={row.item.gap_after_minutes ?? ""}
                                    placeholder={String(
                                      selectedStage.gap_minutes || 0,
                                    )}
                                    onChange={(event) => {
                                      const value = event.target.value;
                                      updateItemLocal(row.item.id, {
                                        gap_after_minutes:
                                          value === ""
                                            ? null
                                            : Math.max(0, Number(value || 0)),
                                      });
                                    }}
                                    onBlur={(event) => {
                                      const value = event.target.value;
                                      saveItemPatch(row.item.id, {
                                        gap_after_minutes:
                                          value === ""
                                            ? null
                                            : Math.max(0, Number(value || 0)),
                                      });
                                    }}
                                    className="h-11 w-20 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none"
                                  />
                                  <span className="text-sm font-bold text-slate-500">
                                    mins
                                  </span>
                                </div>

                                {row.item.gap_after_minutes === null ||
                                row.item.gap_after_minutes === undefined ? (
                                  <p className="mt-1 text-[10px] font-bold text-slate-400">
                                    Default: {selectedStage.gap_minutes || 0} mins
                                  </p>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      updateItemLocal(row.item.id, {
                                        gap_after_minutes: null,
                                      });
                                      await saveItemPatch(row.item.id, {
                                        gap_after_minutes: null,
                                      });
                                      setMessage(
                                        `${row.programme?.name || "Programme"} now uses the default gap.`,
                                      );
                                    }}
                                    className="mt-1 text-[10px] font-black text-violet-700 hover:text-violet-900"
                                  >
                                    Use default ({selectedStage.gap_minutes || 0})
                                  </button>
                                )}
                              </td>

                              <td className="px-5 py-5 align-top">
                                <select
                                  value={row.item.status}
                                  onChange={(event) => {
                                    updateItemLocal(row.item.id, {
                                      status: event.target.value,
                                    });
                                    saveItemPatch(row.item.id, {
                                      status: event.target.value,
                                    });
                                  }}
                                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none"
                                >
                                  <option value="scheduled">Scheduled</option>
                                  <option value="ongoing">Ongoing</option>
                                  <option value="completed">Completed</option>
                                  <option value="hold">Hold</option>
                                </select>
                              </td>

                              <td className="px-5 py-5 align-top">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => moveItem(row.item, "up")}
                                    className="rounded-xl border border-slate-200 p-2 text-slate-600"
                                  >
                                    <ArrowUp size={16} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => moveItem(row.item, "down")}
                                    className="rounded-xl border border-slate-200 p-2 text-slate-600"
                                  >
                                    <ArrowDown size={16} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteScheduleItem(row.item.id)
                                    }
                                    className="rounded-xl border border-red-200 bg-red-50 p-2 text-red-700"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div className="print-area">
        <PrintableSchedule
          organization={organization}
          eventInfo={eventInfo}
          stages={stages}
          items={items}
          programmes={programmes}
          registrations={registrations}
          getCategoryName={getCategoryName}
          formatDate={formatDate}
          timeToMinutes={timeToMinutes}
          minutesToTime={minutesToTime}
          formatStageType={formatStageType}
          formatProgrammeType={formatProgrammeType}
          formatGenderScope={formatGenderScope}
          getDurationInfo={getDurationInfo}
        />
      </div>

      {showStageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <form
            onSubmit={createStage}
            className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                  Create Stage
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Choose Stage or Off-stage first, then set the name and timing.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowStageModal(false)}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Programme Location
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1.5">
                  <button
                    type="button"
                    onClick={() => setStageType("stage")}
                    className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                      stageType === "stage"
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-900/20"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    Stage
                  </button>
                  <button
                    type="button"
                    onClick={() => setStageType("off_stage")}
                    className={`rounded-xl px-4 py-3 text-sm font-black transition ${
                      stageType === "off_stage"
                        ? "bg-amber-500 text-white shadow-lg shadow-amber-900/10"
                        : "text-slate-600 hover:bg-white"
                    }`}
                  >
                    Off-stage
                  </button>
                </div>
                <p className="mt-2 text-[11px] font-bold leading-5 text-slate-400">
                  This controls which programmes appear when adding to this stage.
                </p>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Stage Name
                </label>
                <input
                  value={stageName}
                  onChange={(event) => setStageName(event.target.value)}
                  placeholder="e.g. Stage 1"
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Date
                  </label>
                  <input
                    type="date"
                    value={stageDate}
                    onChange={(event) => setStageDate(event.target.value)}
                    className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={stageStartTime}
                    onChange={(event) =>
                      setStageStartTime(event.target.value)
                    }
                    className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Gap Between Programmes
                </label>
                <input
                  type="number"
                  min="0"
                  value={gapMinutes}
                  onChange={(event) => setGapMinutes(event.target.value)}
                  placeholder="5"
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingStage}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/20 disabled:opacity-60"
            >
              {isSavingStage ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Plus size={18} />
              )}
              Create Stage
            </button>
          </form>
        </div>
      )}
    </AdminShell>
  );
}

function PrintableSchedule({
  organization,
  eventInfo,
  stages,
  items,
  programmes,
  getCategoryName,
  formatDate,
  timeToMinutes,
  minutesToTime,
  formatStageType,
  formatProgrammeType,
  formatGenderScope,
  getDurationInfo,
}: any) {
  return (
    <div className="bg-white p-4">
      {stages.map((stage: ScheduleStage) => {
        const stageItems = items
          .filter((item: ScheduleItem) => item.stage_id === stage.id)
          .sort(
            (a: ScheduleItem, b: ScheduleItem) =>
              a.sort_order - b.sort_order,
          );

        let currentMinutes = timeToMinutes(stage.start_time || "09:00");

        return (
          <div key={stage.id} className="stage-print-block mb-6">
            <div className="schedule-print-header mb-5 border-b border-slate-300 pb-4 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-700">
                Festeazy Event Schedule
              </p>

              <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950">
                Programme Schedule
              </h1>

              <p className="mt-1 text-xs font-bold text-slate-600">
                {organization?.name || "Madrasa"} • {eventInfo?.title || "Event"}
              </p>

              {eventInfo?.venue && (
                <p className="mt-1 text-[10px] font-bold text-slate-500">
                  Venue: {eventInfo.venue}
                </p>
              )}
            </div>

            <div className="mb-3 flex items-center justify-between border-b border-slate-300 pb-2">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {stage.name}
                </h2>
                <p className="text-[10px] font-bold text-slate-500">
                  {formatStageType(stage.stage_type || stage.name)} •{" "}
                  {formatDate(stage.stage_date)} • Starts{" "}
                  {stage.start_time || "09:00"} • Default gap {stage.gap_minutes} mins
                </p>
              </div>

              <p className="rounded-lg bg-violet-50 px-3 py-1.5 text-[10px] font-black text-violet-700">
                {stageItems.length} Programmes
              </p>
            </div>

            <table className="w-full border-collapse text-left text-[10px]">
              <thead>
                <tr>
                  <PrintTh>SL</PrintTh>
                  <PrintTh>Time</PrintTh>
                  <PrintTh>Programme</PrintTh>
                  <PrintTh>Category</PrintTh>
                  <PrintTh>Type</PrintTh>
                  <PrintTh>Entries / Base</PrintTh>
                  <PrintTh>Total Duration</PrintTh>
                  <PrintTh>Gap After</PrintTh>
                  <PrintTh>Status</PrintTh>
                </tr>
              </thead>

              <tbody>
                {stageItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="border border-slate-300 px-2 py-5 text-center font-bold text-slate-500"
                    >
                      No programmes scheduled.
                    </td>
                  </tr>
                ) : (
                  stageItems.map((item: ScheduleItem, index: number) => {
                    const programme = programmes.find(
                      (p: Programme) => p.id === item.programme_id,
                    );

                    const durationInfo = programme
                      ? getDurationInfo(programme)
                      : null;

                    const startTime = minutesToTime(currentMinutes);
                    const endTime = minutesToTime(
                      currentMinutes + Number(item.duration_minutes || 0),
                    );
                    const effectiveGap =
                      item.gap_after_minutes === null ||
                      item.gap_after_minutes === undefined
                        ? Math.max(0, Number(stage.gap_minutes || 0))
                        : Math.max(0, Number(item.gap_after_minutes || 0));

                    currentMinutes =
                      currentMinutes +
                      Number(item.duration_minutes || 0) +
                      effectiveGap;

                    return (
                      <tr key={item.id}>
                        <PrintTd className="font-bold">{index + 1}</PrintTd>
                        <PrintTd className="font-black">
                          {startTime} - {endTime}
                        </PrintTd>
                        <PrintTd className="font-black">
                          {programme?.name || "-"}
                        </PrintTd>
                        <PrintTd>
                          {getCategoryName(programme?.category_id)}
                        </PrintTd>
                        <PrintTd>
                          {formatProgrammeType(programme?.programme_type)} /{" "}
                          {formatGenderScope(programme?.gender_scope)} /{" "}
                          {formatStageType(programme?.stage_type)}
                        </PrintTd>
                        <PrintTd>
                          {durationInfo
                            ? formatStageType(programme?.stage_type) ===
                              "Off-stage"
                              ? `${durationInfo.unitCount} participants • ${durationInfo.baseMinutes} mins total`
                              : `${durationInfo.unitCount} ${durationInfo.unitLabel} × ${durationInfo.baseMinutes} mins`
                            : "-"}
                        </PrintTd>
                        <PrintTd className="font-black">
                          {item.duration_minutes} mins
                        </PrintTd>
                        <PrintTd>
                          {effectiveGap} mins
                          {item.gap_after_minutes === null ||
                          item.gap_after_minutes === undefined
                            ? " (default)"
                            : " (custom)"}
                        </PrintTd>
                        <PrintTd className="capitalize">{item.status}</PrintTd>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function MiniInfo({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
      <p className="mt-0.5 text-[11px] font-bold text-slate-500">{note}</p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix = "",
}: {
  icon: string;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
      <div className="text-3xl">{icon}</div>
      <p className="mt-3 text-3xl font-black tracking-[-0.08em] text-slate-950">
        {value}{" "}
        {suffix && (
          <span className="text-sm font-black tracking-normal text-slate-500">
            {suffix}
          </span>
        )}
      </p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function TextStatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
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

function PrintTh({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-slate-300 bg-slate-100 px-2 py-2 font-black">
      {children}
    </th>
  );
}

function PrintTd({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`border border-slate-300 px-2 py-2 ${className}`}>
      {children}
    </td>
  );
}