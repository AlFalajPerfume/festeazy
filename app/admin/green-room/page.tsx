/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import SearchableProgrammeSelect from "@/components/admin/SearchableProgrammeSelect";
import { supabase } from "@/lib/supabase";
import { getAdminContext } from "@/lib/admin-context";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  Shuffle,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type OrganizationUser = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string | null;
  is_active: boolean | null;
};

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

type ClassItem = {
  id: string;
  name: string;
};

type Team = {
  id: string;
  name: string;
  code: string | null;
};

type Student = {
  id: string;
  chest_no: string | null;
  name: string;
  gender: string;
  class_id: string | null;
  category_id: string | null;
  team_id: string | null;
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

type ProgrammeCode = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_id: string;
  registration_id: string;
  code_letter: string;
  is_present: boolean;
  generated_at: string;
  generated_by: string | null;
  reset_count: number | null;
  notes: string | null;
};

type JudgeScore = {
  id: string;
  registration_id: string;
  programme_id: string;
};

type ResultItem = {
  id: string;
  registration_id: string | null;
  programme_id: string | null;
  grade: string | null;
  is_published: boolean;
};

type GreenRoomEntry = {
  key: string;
  type: "individual" | "group";
  primaryRegistrationId: string;
  registrationIds: string[];
  teamId: string | null;
  groupName: string | null;
  studentIds: string[];
};

const CODE_POOL = buildCodePool();

function normalizeGroupValue(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

export default function GreenRoomPage() {
  const [orgUser, setOrgUser] = useState<OrganizationUser | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [programmeCodes, setProgrammeCodes] = useState<ProgrammeCode[]>([]);
  const [judgeScores, setJudgeScores] = useState<JudgeScore[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [search, setSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isProgrammeLoading, setIsProgrammeLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPageData();
  }, []);

  const filteredProgrammeOptions = useMemo(() => {
    return programmes.filter((programme) => {
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "general"
          ? !programme.category_id
          : programme.category_id === categoryFilter);

      const normalizedGender = normalizeGender(programme.gender_scope);
      const matchesGender =
        genderFilter === "all" ||
        (genderFilter === "mixed"
          ? normalizedGender === "all"
          : normalizedGender === genderFilter);

      const matchesType =
        typeFilter === "all" || programme.programme_type === typeFilter;
      const matchesStage =
        stageFilter === "all" || programme.stage_type === stageFilter;

      return matchesCategory && matchesGender && matchesType && matchesStage;
    });
  }, [programmes, categoryFilter, genderFilter, typeFilter, stageFilter]);

  const activeProgramme = useMemo(() => {
    return programmes.find((item) => item.id === selectedProgrammeId) || null;
  }, [programmes, selectedProgrammeId]);

  const activeRegistrations = useMemo(() => {
    if (!activeProgramme) return [];

    return registrations
      .filter(
        (item) =>
          item.programme_id === activeProgramme.id &&
          item.status !== "cancelled" &&
          item.status !== "inactive",
      )
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [registrations, activeProgramme]);

  const entries = useMemo<GreenRoomEntry[]>(() => {
    if (!activeProgramme) return [];

    if (activeProgramme.programme_type === "group") {
      const map = new Map<string, GreenRoomEntry>();

      activeRegistrations.forEach((registration) => {
        const key = `${registration.team_id || "no-team"}::${
          normalizeGroupValue(registration.group_name) || "group"
        }`;

        if (!map.has(key)) {
          map.set(key, {
            key,
            type: "group",
            primaryRegistrationId: registration.id,
            registrationIds: [],
            teamId: registration.team_id,
            groupName: registration.group_name,
            studentIds: [],
          });
        }

        const entry = map.get(key)!;
        entry.registrationIds.push(registration.id);
        entry.registrationIds.sort((a, b) => a.localeCompare(b));
        entry.primaryRegistrationId = entry.registrationIds[0];

        if (registration.student_id) {
          entry.studentIds.push(registration.student_id);
        }
      });

      return Array.from(map.values()).sort(
        (a, b) => getEntrySortNumber(a) - getEntrySortNumber(b),
      );
    }

    return activeRegistrations
      .map((registration) => ({
        key: registration.id,
        type: "individual" as const,
        primaryRegistrationId: registration.id,
        registrationIds: [registration.id],
        teamId: registration.team_id,
        groupName: null,
        studentIds: registration.student_id ? [registration.student_id] : [],
      }))
      .sort((a, b) => getEntrySortNumber(a) - getEntrySortNumber(b));
  }, [activeProgramme, activeRegistrations, students]);

  const filteredEntries = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return entries
      .filter((entry) => {
        if (!keyword) return true;

        const code = getEntryCode(entry)?.code_letter || "";

        if (code.toLowerCase().includes(keyword)) return true;
        if (entry.groupName?.toLowerCase().includes(keyword)) return true;
        if (getTeamName(entry.teamId).toLowerCase().includes(keyword)) {
          return true;
        }

        return entry.studentIds.some((studentId) => {
          const student = getStudent(studentId);

          return (
            student?.name.toLowerCase().includes(keyword) ||
            cleanChest(student?.chest_no || "").toLowerCase().includes(keyword) ||
            getClassName(student?.class_id || null)
              .toLowerCase()
              .includes(keyword)
          );
        });
      })
      .sort((firstEntry, secondEntry) => {
        const firstCode = getEntryCode(firstEntry)?.code_letter;
        const secondCode = getEntryCode(secondEntry)?.code_letter;

        // Generated codes always appear first.
        if (firstCode && !secondCode) return -1;
        if (!firstCode && secondCode) return 1;

        // When both entries have codes, display them in code order:
        // A, B, C ... Z, AA, AB ...
        if (firstCode && secondCode) {
          const firstCodeIndex = getCodeSortIndex(firstCode);
          const secondCodeIndex = getCodeSortIndex(secondCode);

          if (firstCodeIndex !== secondCodeIndex) {
            return firstCodeIndex - secondCodeIndex;
          }
        }

        // Entries without codes remain in chest-number order.
        return getEntrySortNumber(firstEntry) - getEntrySortNumber(secondEntry);
      });
  }, [entries, search, programmeCodes, students, teams, classes]);

  const generatedCount = useMemo(() => {
    if (!activeProgramme) return 0;
    return entries.filter((entry) => !!getEntryCode(entry)).length;
  }, [entries, programmeCodes, activeProgramme]);

  const presentCount = useMemo(() => {
    if (!activeProgramme) return 0;
    return entries.filter((entry) => getEntryCode(entry)?.is_present).length;
  }, [entries, programmeCodes, activeProgramme]);

  const codeIntegrityWarning = useMemo(() => {
    const codeCounts = new Map<string, number>();

    programmeCodes.forEach((item) => {
      const code = String(item.code_letter || "").trim().toUpperCase();
      if (!code) return;
      codeCounts.set(code, (codeCounts.get(code) || 0) + 1);
    });

    const duplicateLetters = Array.from(codeCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([code]) => code);

    const entriesWithMultipleCodes = entries.filter(
      (entry) => getEntryCodes(entry).length > 1,
    ).length;

    if (duplicateLetters.length === 0 && entriesWithMultipleCodes === 0) {
      return "";
    }

    const details: string[] = [];
    if (duplicateLetters.length > 0) {
      details.push(`duplicate code letter${duplicateLetters.length === 1 ? "" : "s"}: ${duplicateLetters.join(", ")}`);
    }
    if (entriesWithMultipleCodes > 0) {
      details.push(`${entriesWithMultipleCodes} participant/group entr${entriesWithMultipleCodes === 1 ? "y has" : "ies have"} multiple code rows`);
    }

    return `Code integrity warning — ${details.join("; ")}. Reset the affected entry before generating more codes.`;
  }, [entries, programmeCodes]);

  function normalizeGender(value: string | null | undefined) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized.includes("female") || normalized.includes("girl")) {
      return "female";
    }
    if (normalized.includes("male") || normalized.includes("boy")) {
      return "male";
    }
    return "all";
  }

  function clearProgrammeSelection() {
    setSelectedProgrammeId("");
    setRegistrations([]);
    setProgrammeCodes([]);
    setJudgeScores([]);
    setResults([]);
    setSearch("");
    setMessage("");
    setError("");
  }

  function resetProgrammeFilters() {
    setCategoryFilter("all");
    setGenderFilter("all");
    setTypeFilter("all");
    setStageFilter("all");
  }

  const hasProgrammeFilters =
    categoryFilter !== "all" ||
    genderFilter !== "all" ||
    typeFilter !== "all" ||
    stageFilter !== "all";

  async function loadPageData() {
    setIsLoading(true);
    setError("");
    setMessage("");

    const { context, error: contextError } = await getAdminContext();

    if (contextError || !context) {
      setError(contextError || "Please login again.");
      setIsLoading(false);
      return;
    }

    const activeOrgUser: OrganizationUser = {
      id: context.userId,
      organization_id: context.organizationId,
      user_id: context.userId,
      role: context.role,
      is_active: true,
    };

    const activeEvent: EventInfo = {
      id: context.eventId,
      organization_id: context.organizationId,
      title: context.eventTitle,
      venue: context.eventVenue || null,
      start_date: context.eventStartDate || null,
      end_date: context.eventEndDate || null,
    };

    setOrgUser(activeOrgUser);
    setOrganization({
      id: context.organizationId,
      name: context.organizationName,
      place: context.organizationPlace || null,
    });
    setEventInfo(activeEvent);

    const [categoryRes, classRes, teamRes, studentRes, programmeRes] =
      await Promise.all([
        supabase
          .from("categories")
          .select("id, name")
          .eq("organization_id", activeOrgUser.organization_id)
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("classes")
          .select("id, name")
          .eq("organization_id", activeOrgUser.organization_id)
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("teams")
          .select("id, name, code")
          .eq("organization_id", activeOrgUser.organization_id)
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("students")
          .select("id, chest_no, name, gender, class_id, category_id, team_id")
          .eq("organization_id", activeOrgUser.organization_id)
          .eq("event_id", activeEvent.id)
          .eq("status", "active")
          .order("chest_no", { ascending: true }),

        supabase
          .from("programmes")
          .select(
            "id, organization_id, event_id, name, programme_type, stage_type, category_id, gender_scope, total_marks, sort_order, status",
          )
          .eq("organization_id", activeOrgUser.organization_id)
          .eq("event_id", activeEvent.id)
          .eq("status", "active")
          .order("sort_order", { ascending: true }),
      ]);

    if (categoryRes.error) return stopLoading(categoryRes.error.message);
    if (classRes.error) return stopLoading(classRes.error.message);
    if (teamRes.error) return stopLoading(teamRes.error.message);
    if (studentRes.error) return stopLoading(studentRes.error.message);
    if (programmeRes.error) return stopLoading(programmeRes.error.message);

    const loadedProgrammes = (programmeRes.data || []) as Programme[];

    setCategories((categoryRes.data || []) as Category[]);
    setClasses((classRes.data || []) as ClassItem[]);
    setTeams((teamRes.data || []) as Team[]);
    setStudents((studentRes.data || []) as Student[]);
    setProgrammes(loadedProgrammes);

    const existingSelection = loadedProgrammes.some(
      (programme) => programme.id === selectedProgrammeId,
    )
      ? selectedProgrammeId
      : "";

    const nextProgrammeId = existingSelection || loadedProgrammes[0]?.id || "";
    setSelectedProgrammeId(nextProgrammeId);

    if (nextProgrammeId) {
      await loadProgrammeData(activeOrgUser, activeEvent, nextProgrammeId);
    } else {
      setRegistrations([]);
      setProgrammeCodes([]);
      setJudgeScores([]);
      setResults([]);
    }

    setIsLoading(false);
  }

  async function loadProgrammeData(
    activeOrgUser: OrganizationUser | null,
    activeEvent: EventInfo | null,
    programmeId: string,
  ) {
    if (!activeOrgUser || !activeEvent || !programmeId) {
      setRegistrations([]);
      setProgrammeCodes([]);
      setJudgeScores([]);
      setResults([]);
      return;
    }

    setIsProgrammeLoading(true);
    setRegistrations([]);
    setProgrammeCodes([]);
    setJudgeScores([]);
    setResults([]);

    const [registrationRes, codeRes, scoreRes, resultRes] = await Promise.all([
      supabase
        .from("programme_registrations")
        .select(
          "id, organization_id, event_id, programme_id, student_id, team_id, group_name, registration_no, status",
        )
        .eq("organization_id", activeOrgUser.organization_id)
        .eq("event_id", activeEvent.id)
        .eq("programme_id", programmeId)
        .order("id", { ascending: true }),

      supabase
        .from("programme_codes")
        .select(
          "id, organization_id, event_id, programme_id, registration_id, code_letter, is_present, generated_at, generated_by, reset_count, notes",
        )
        .eq("organization_id", activeOrgUser.organization_id)
        .eq("event_id", activeEvent.id)
        .eq("programme_id", programmeId)
        .order("generated_at", { ascending: true })
        .order("id", { ascending: true }),

      supabase
        .from("judge_scores")
        .select("id, registration_id, programme_id")
        .eq("organization_id", activeOrgUser.organization_id)
        .eq("event_id", activeEvent.id)
        .eq("programme_id", programmeId),

      supabase
        .from("results")
        .select("id, registration_id, programme_id, grade, is_published")
        .eq("organization_id", activeOrgUser.organization_id)
        .eq("event_id", activeEvent.id)
        .eq("programme_id", programmeId),
    ]);

    const firstError =
      registrationRes.error || codeRes.error || scoreRes.error || resultRes.error;

    if (firstError) {
      setError(firstError.message);
      setIsProgrammeLoading(false);
      return;
    }

    setRegistrations((registrationRes.data || []) as Registration[]);
    setProgrammeCodes((codeRes.data || []) as ProgrammeCode[]);
    setJudgeScores((scoreRes.data || []) as JudgeScore[]);
    setResults((resultRes.data || []) as ResultItem[]);
    setIsProgrammeLoading(false);
  }

  function stopLoading(text: string) {
    setError(text);
    setIsLoading(false);
    setIsWorking(false);
  }

  function getEntryCodes(entry: GreenRoomEntry) {
    return programmeCodes
      .filter((item) => entry.registrationIds.includes(item.registration_id))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  function getEntryCode(entry: GreenRoomEntry) {
    return getEntryCodes(entry)[0] || null;
  }

  function cleanChest(value: string | null) {
    return String(value || "").replace("#", "").trim();
  }

  function chestNumber(value: string | null) {
    const match = String(value || "").match(/\d+/);
    return match ? Number(match[0]) : 999999;
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

  function getEntrySortNumber(entry: GreenRoomEntry) {
    const numbers = entry.studentIds
      .map((studentId) => {
        const student = getStudent(studentId);
        const match = cleanChest(student?.chest_no || "").match(/\d+/);
        return match ? Number(match[0]) : 999999;
      })
      .filter((value) => Number.isFinite(value));

    if (numbers.length === 0) return 999999;
    return Math.min(...numbers);
  }

  function getCodeSortIndex(codeLetter: string) {
    const normalizedCode = String(codeLetter || "")
      .trim()
      .toUpperCase();

    const existingIndex = CODE_POOL.indexOf(normalizedCode);

    if (existingIndex >= 0) {
      return existingIndex;
    }

    // Unknown or manually entered codes are placed after the normal code pool.
    return CODE_POOL.length + 1;
  }

  function getEntryTitle(entry: GreenRoomEntry) {
    if (entry.type === "group") return entry.groupName || "Group";
    const student = getStudent(entry.studentIds[0] || null);
    return student?.name || "Student";
  }

  function getEntryChestText(entry: GreenRoomEntry) {
    return entry.studentIds
      .map((studentId) => cleanChest(getStudent(studentId)?.chest_no || ""))
      .filter(Boolean)
      .join(", ");
  }

  function getEntrySubtitle(entry: GreenRoomEntry) {
    if (entry.type === "group") {
      return entry.studentIds
        .map((studentId) => {
          const student = getStudent(studentId);
          return student ? `#${cleanChest(student.chest_no)} ${student.name}` : "";
        })
        .filter(Boolean)
        .join(" • ");
    }

    const student = getStudent(entry.studentIds[0] || null);
    return `${getCategoryName(student?.category_id || activeProgramme?.category_id || null)} • ${getClassName(student?.class_id || null)}`;
  }

  function hasLockedMarks(entry: GreenRoomEntry) {
    const hasScores = judgeScores.some((score) =>
      entry.registrationIds.includes(score.registration_id),
    );

    const hasLockedResult = results.some(
      (result) =>
        Boolean(result.registration_id) &&
        entry.registrationIds.includes(result.registration_id as string) &&
        (result.is_published ||
          (result.grade != null && String(result.grade) !== "Absent")),
    );

    return hasScores || hasLockedResult;
  }


  async function callGreenRoomApi(body: Record<string, unknown>) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Login session expired. Please login again.");
    }

    const response = await fetch("/api/admin/green-room", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || "Green-room operation failed.");
    }

    return payload;
  }

  async function generateCodesForAll() {
    setError("");
    setMessage("");

    if (!orgUser || !eventInfo || !activeProgramme) {
      setError("Select a programme first.");
      return;
    }

    setIsWorking(true);

    try {
      const payload = await callGreenRoomApi({
        action: "generate_all",
        programmeId: activeProgramme.id,
      });

      const generatedCount = Number(
        payload?.result?.generated_count || 0,
      );

      setMessage(
        generatedCount > 0
          ? `${generatedCount} code${generatedCount === 1 ? "" : "s"} generated successfully.`
          : "All participant codes are already generated.",
      );
      await loadProgrammeData(orgUser, eventInfo, activeProgramme.id);
    } catch (generateError: any) {
      setError(generateError?.message || "Unable to generate codes.");
    } finally {
      setIsWorking(false);
    }
  }

  async function generateCode(entry: GreenRoomEntry) {
    setError("");
    setMessage("");

    if (!orgUser || !eventInfo || !activeProgramme) {
      setError("Event not found.");
      return;
    }

    setIsWorking(true);

    try {
      const payload = await callGreenRoomApi({
        action: "generate_one",
        programmeId: activeProgramme.id,
        registrationId: entry.primaryRegistrationId,
      });

      setMessage(
        `Code ${payload?.result?.code_letter || ""} generated for ${getEntryTitle(entry)}.`,
      );
      await loadProgrammeData(orgUser, eventInfo, activeProgramme.id);
    } catch (generateError: any) {
      setError(generateError?.message || "Unable to generate code.");
    } finally {
      setIsWorking(false);
    }
  }

  async function togglePresent(
    entry: GreenRoomEntry,
    nextValue: boolean,
  ) {
    if (!orgUser || !eventInfo || !activeProgramme) return;

    setError("");
    setMessage("");
    setIsWorking(true);

    try {
      await callGreenRoomApi({
        action: "presence",
        programmeId: activeProgramme.id,
        registrationId: entry.primaryRegistrationId,
        isPresent: nextValue,
      });

      setMessage(nextValue ? "Marked present." : "Marked absent.");
      await loadProgrammeData(orgUser, eventInfo, activeProgramme.id);
    } catch (presenceError: any) {
      setError(presenceError?.message || "Unable to change presence.");
    } finally {
      setIsWorking(false);
    }
  }

  async function resetCode(entry: GreenRoomEntry) {
    const code = getEntryCode(entry);
    if (!code || !orgUser || !eventInfo || !activeProgramme) return;

    const confirmed = confirm(
      `Reset Code ${code.code_letter} for ${getEntryTitle(entry)}? This should be used only before valuation starts.`,
    );

    if (!confirmed) return;

    setError("");
    setMessage("");
    setIsWorking(true);

    try {
      await callGreenRoomApi({
        action: "reset",
        programmeId: activeProgramme.id,
        registrationId: entry.primaryRegistrationId,
      });

      setMessage(
        "Code reset successfully. You can generate a new random code now.",
      );
      await loadProgrammeData(orgUser, eventInfo, activeProgramme.id);
    } catch (resetError: any) {
      setError(resetError?.message || "Unable to reset code.");
    } finally {
      setIsWorking(false);
    }
  }

  if (isLoading) {
    return (
      <AdminShell title="Green Room" subtitle="Generate random code letters for valuation.">
        <div className="flex min-h-64 items-center justify-center gap-3 rounded-[1.5rem] border border-slate-200 bg-white text-sm font-black text-slate-500 shadow-xl shadow-slate-900/5 sm:min-h-96 sm:rounded-[2rem]">
          <Loader2 className="animate-spin text-violet-700" size={22} />
          Loading green room...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Green Room"
      subtitle="Generate saved random code letters when participants reach the green room."
      actions={
        <button
          type="button"
          onClick={loadPageData}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCcw size={17} />
          Refresh
        </button>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} />
            {error}
          </div>
        )}

        {message && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        {codeIntegrityWarning && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-800">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} />
            {codeIntegrityWarning}
          </div>
        )}

        <div className="rounded-[1.5rem] border border-violet-100 bg-gradient-to-br from-violet-700 to-slate-950 p-4 text-white shadow-2xl shadow-violet-900/20 sm:rounded-[2rem] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/50">
                Fair Valuation Workflow
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.06em]">
                {organization?.name || "Madrasa"}
              </h2>
              <p className="mt-2 text-sm font-bold text-white/65">
                {eventInfo?.title || "Event"} • Code letters are random and saved per programme.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <MiniStat label="Entries" value={entries.length} />
              <MiniStat label="Codes" value={generatedCount} />
              <MiniStat label="Present" value={presentCount} />
            </div>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 sm:rounded-[2rem] sm:p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">Programme Filters</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Filter programmes before generating Green Room codes.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-violet-700 shadow-sm ring-1 ring-slate-200">
                  {filteredProgrammeOptions.length} matching
                </span>
                {hasProgrammeFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      resetProgrammeFilters();
                      clearProgrammeSelection();
                    }}
                    className="text-xs font-black text-violet-700 hover:text-violet-900"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <select
                value={categoryFilter}
                onChange={(event) => {
                  setCategoryFilter(event.target.value);
                  clearProgrammeSelection();
                }}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="all">All Categories</option>
                {programmes.some((programme) => !programme.category_id) && (
                  <option value="general">General</option>
                )}
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>

              <select
                value={genderFilter}
                onChange={(event) => {
                  setGenderFilter(event.target.value);
                  clearProgrammeSelection();
                }}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="all">All Genders</option>
                <option value="male">Boys</option>
                <option value="female">Girls</option>
                <option value="mixed">Mixed / All</option>
              </select>

              <select
                value={typeFilter}
                onChange={(event) => {
                  setTypeFilter(event.target.value);
                  clearProgrammeSelection();
                }}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="all">All Types</option>
                <option value="individual">Individual</option>
                <option value="group">Group</option>
              </select>

              <select
                value={stageFilter}
                onChange={(event) => {
                  setStageFilter(event.target.value);
                  clearProgrammeSelection();
                }}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="all">All Locations</option>
                <option value="stage">Stage</option>
                <option value="off_stage">Off-Stage</option>
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Select Programme
              </label>
              <div className="mt-2">
                <SearchableProgrammeSelect
                  value={selectedProgrammeId}
                  onChange={(nextValue) => {
                    setSelectedProgrammeId(nextValue);
                    setSearch("");
                    setError("");
                    setMessage("");
                    void loadProgrammeData(orgUser, eventInfo, nextValue);
                  }}
                  options={filteredProgrammeOptions.map((programme) => ({
                    id: programme.id,
                    name: programme.name,
                    sort_order: programme.sort_order,
                    categoryName: getCategoryName(programme.category_id),
                    programmeType: programme.programme_type,
                    stageType: programme.stage_type,
                    genderScope: programme.gender_scope,
                  }))}
                  placeholder="Search or select filtered programme..."
                  emptyText="No programmes match the selected filters"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Search
              </label>
              <div className="mt-2 flex h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4">
                <Search size={18} className="text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Chest no, name, team or code..."
                  className="w-full bg-transparent text-sm font-bold outline-none"
                />
              </div>
            </div>
          </div>

          {activeProgramme && (
            <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 px-5 py-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-black text-slate-950">
                    {activeProgramme.name}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    {getCategoryName(activeProgramme.category_id)} • {activeProgramme.programme_type === "group" ? "Group" : "Individual"} • {activeProgramme.stage_type === "off_stage" ? "Off Stage" : "Stage"}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-violet-700 shadow-sm">
                  {generatedCount}/{entries.length} codes generated
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                Participant Codes
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Generated participants are automatically arranged in code order for easy identification.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeProgramme && entries.length > 0 && generatedCount < entries.length && (
                <button
                  type="button"
                  onClick={generateCodesForAll}
                  disabled={isWorking}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:opacity-60 sm:w-auto sm:py-2.5"
                >
                  <Shuffle size={16} />
                  Generate All
                </button>
              )}

              {isWorking && (
                <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
                  <Loader2 className="animate-spin" size={16} />
                  Updating...
                </div>
              )}
            </div>
          </div>

          {isProgrammeLoading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm font-black text-slate-500">
              <Loader2 className="animate-spin text-violet-700" size={20} />
              Loading programme entries...
            </div>
          ) : !activeProgramme ? (
            <EmptyState title="Select programme" text="Choose a programme to start green room code generation." />
          ) : entries.length === 0 ? (
            <EmptyState title="No participants" text="No registrations found for this programme." />
          ) : filteredEntries.length === 0 ? (
            <EmptyState title="No matching entries" text="Try another search keyword." />
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredEntries.map((entry) => {
                const code = getEntryCode(entry);
                const locked = hasLockedMarks(entry);

                return (
                  <div key={entry.key} className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_220px] lg:items-center">
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-black sm:h-16 sm:w-16 sm:text-2xl ${code ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                        {code?.code_letter || "?"}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-black text-slate-950">
                            {entry.type === "group" ? getEntryTitle(entry) : `#${getEntryChestText(entry)} ${getEntryTitle(entry)}`}
                          </p>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                            {entry.type === "group" ? "Group" : "Individual"}
                          </span>
                          {code && (
                            <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${code.is_present ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                              {code.is_present ? "Present" : "Absent"}
                            </span>
                          )}
                          {locked && (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-amber-700">
                              Marks Locked
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                          {getEntrySubtitle(entry)}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-500">
                          Team: <span className="text-slate-800">{getTeamName(entry.teamId)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap lg:justify-end">
                      {!code ? (
                        <button
                          type="button"
                          onClick={() => generateCode(entry)}
                          disabled={isWorking}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:opacity-60 sm:w-auto"
                        >
                          <Shuffle size={16} />
                          Generate Code
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => togglePresent(entry, !code.is_present)}
                            disabled={isWorking || locked}
                            className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition disabled:opacity-50 sm:w-auto ${code.is_present ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                          >
                            {code.is_present ? <XCircle size={16} /> : <UserCheck size={16} />}
                            {code.is_present ? "Mark Absent" : "Mark Present"}
                          </button>

                          <button
                            type="button"
                            onClick={() => resetCode(entry)}
                            disabled={isWorking || locked}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                          >
                            <RotateCcw size={16} />
                            Reset
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 text-sm font-bold leading-6 text-slate-600">
          <p className="font-black text-slate-900">Rule:</p>
          <p>
            Generate codes before valuation. Once judge marks or results are created, code reset is disabled to avoid confusion.
            Generated entries are displayed in alphabetical code order, while entries without codes remain below in chest-number order.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
      <p className="text-2xl font-black tracking-[-0.06em]">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
        {label}
      </p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
        <ClipboardCheck size={28} />
      </div>
      <h3 className="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}

function buildCodePool(limit = 702) {
  const codes: string[] = [];

  for (let index = 1; index <= limit; index += 1) {
    let number = index;
    let code = "";

    while (number > 0) {
      number -= 1;
      code = String.fromCharCode(65 + (number % 26)) + code;
      number = Math.floor(number / 26);
    }

    codes.push(code);
  }

  return codes;
}