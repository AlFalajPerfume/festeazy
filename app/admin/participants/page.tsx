/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import SearchableProgrammeSelect from "@/components/admin/SearchableProgrammeSelect";
import { supabase } from "@/lib/supabase";
import { getAdminContext } from "@/lib/admin-context";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import {
  AlertCircle,
  Check,
  Loader2,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type OrganizationUser = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
};

type EventInfo = {
  id: string;
  organization_id: string;
  title: string;
};

type Category = {
  id: string;
  name: string;
};

type Team = {
  id: string;
  name: string;
  color: string | null;
};

type ClassItem = {
  id: string;
  name: string;
};

type DivisionItem = {
  id: string;
  class_id: string;
  name: string;
};

type Student = {
  id: string;
  organization_id: string;
  event_id: string;
  chest_no: string | null;
  name: string;
  gender: string;
  class_id: string | null;
  division_id: string | null;
  category_id: string | null;
  team_id: string | null;
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
  created_at: string;
};

type ParticipationRules = {
  limits_enabled: boolean;
  max_individual_programmes: number | null;
  max_group_programmes: number | null;
  max_total_programmes: number | null;
  max_stage_programmes: number | null;
  max_off_stage_programmes: number | null;
  max_male_programmes: number | null;
  max_female_programmes: number | null;
};

type ParticipationUsage = {
  individual: number;
  group: number;
  stage: number;
  offStage: number;
  total: number;
  blocked: boolean;
  reason: string;
};

type RegisteredEntry = {
  key: string;
  type: "individual" | "group";
  registrationIds: string[];
  teamId: string | null;
  groupName: string | null;
  studentIds: string[];
};

export default function ParticipantsPage() {
  const [orgUser, setOrgUser] = useState<OrganizationUser | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<Registration[]>(
    [],
  );
  const [participationRules, setParticipationRules] =
    useState<ParticipationRules>({
      limits_enabled: false,
      max_individual_programmes: null,
      max_group_programmes: null,
      max_total_programmes: null,
      max_stage_programmes: null,
      max_off_stage_programmes: null,
      max_male_programmes: null,
      max_female_programmes: null,
    });

  const [programmeCategoryFilter, setProgrammeCategoryFilter] = useState("all");
  const [programmeGenderFilter, setProgrammeGenderFilter] = useState("all");
  const [programmeTypeFilter, setProgrammeTypeFilter] = useState("all");
  const [programmeStageFilter, setProgrammeStageFilter] = useState("all");
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [registeredSearch, setRegisteredSearch] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRegistrationsLoading, setIsRegistrationsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPageData();
  }, []);

  const filteredProgrammeOptions = useMemo(() => {
    return programmes.filter((programme) => {
      const matchesCategory =
        programmeCategoryFilter === "all" ||
        (programmeCategoryFilter === "general"
          ? !programme.category_id
          : programme.category_id === programmeCategoryFilter);

      const normalizedGender = normalizeGender(programme.gender_scope);
      const matchesGender =
        programmeGenderFilter === "all" ||
        (programmeGenderFilter === "mixed"
          ? normalizedGender === "all"
          : normalizedGender === programmeGenderFilter);

      const matchesType =
        programmeTypeFilter === "all" ||
        programme.programme_type === programmeTypeFilter;

      const matchesStage =
        programmeStageFilter === "all" ||
        programme.stage_type === programmeStageFilter;

      return matchesCategory && matchesGender && matchesType && matchesStage;
    });
  }, [
    programmes,
    programmeCategoryFilter,
    programmeGenderFilter,
    programmeTypeFilter,
    programmeStageFilter,
  ]);

  const activeProgramme = useMemo(() => {
    return programmes.find((item) => item.id === selectedProgrammeId) || null;
  }, [programmes, selectedProgrammeId]);

  const activeRegistrations = useMemo(() => {
    if (!activeProgramme) return [];
    return registrations.filter(
      (item) => item.programme_id === activeProgramme.id,
    );
  }, [registrations, activeProgramme]);

  const registeredStudentIds = useMemo(() => {
    return new Set(
      activeRegistrations
        .map((item) => item.student_id)
        .filter(Boolean) as string[],
    );
  }, [activeRegistrations]);

  const registeredEntries = useMemo<RegisteredEntry[]>(() => {
    if (!activeProgramme) return [];

    if (activeProgramme.programme_type === "group") {
      const map = new Map<string, RegisteredEntry>();

      activeRegistrations.forEach((registration) => {
        const key = `${registration.team_id || "no-team"}-${
          registration.group_name || "group"
        }`;

        if (!map.has(key)) {
          map.set(key, {
            key,
            type: "group",
            registrationIds: [],
            teamId: registration.team_id,
            groupName: registration.group_name,
            studentIds: [],
          });
        }

        const entry = map.get(key)!;
        entry.registrationIds.push(registration.id);

        if (registration.student_id) {
          entry.studentIds.push(registration.student_id);
        }
      });

      return Array.from(map.values());
    }

    return activeRegistrations.map((registration) => ({
      key: registration.id,
      type: "individual",
      registrationIds: [registration.id],
      teamId: registration.team_id,
      groupName: null,
      studentIds: registration.student_id ? [registration.student_id] : [],
    }));
  }, [activeProgramme, activeRegistrations]);

  const filteredRegisteredEntries = useMemo(() => {
    const keyword = registeredSearch.trim().toLowerCase();

    if (!keyword) return registeredEntries;

    return registeredEntries.filter((entry) => {
      const teamName = getTeamName(entry.teamId).toLowerCase();
      const groupNameText = String(entry.groupName || "").toLowerCase();

      if (teamName.includes(keyword) || groupNameText.includes(keyword)) {
        return true;
      }

      return entry.studentIds.some((studentId) => {
        const student = getStudent(studentId);
        if (!student) return false;

        const chest = normalizeChest(student.chest_no).toLowerCase();
        const className = getClassName(student.class_id).toLowerCase();
        const divisionName = getDivisionName(student.division_id).toLowerCase();

        return (
          student.name.toLowerCase().includes(keyword) ||
          chest.includes(keyword) ||
          className.includes(keyword) ||
          divisionName.includes(keyword)
        );
      });
    });
  }, [
    registeredEntries,
    registeredSearch,
    students,
    teams,
    classes,
    divisions,
  ]);

  const eligibleStudents = useMemo(() => {
    if (!activeProgramme) return [];

    const normalizedProgrammeGender = normalizeGender(
      activeProgramme.gender_scope,
    );

    return students
      .filter((student) => {
        const categoryOk =
          !activeProgramme.category_id ||
          student.category_id === activeProgramme.category_id;

        const genderOk =
          normalizedProgrammeGender === "all" ||
          normalizeGender(student.gender) === normalizedProgrammeGender;

        const groupTeamOk =
          activeProgramme.programme_type !== "group" ||
          !selectedTeamId ||
          student.team_id === selectedTeamId;

        const notRegistered = !registeredStudentIds.has(student.id);

        return categoryOk && genderOk && groupTeamOk && notRegistered;
      })
      .sort((a, b) => chestValue(a.chest_no) - chestValue(b.chest_no));
  }, [
    students,
    activeProgramme,
    selectedTeamId,
    registeredStudentIds,
  ]);

  const participationUsageByStudent = useMemo(() => {
    const usage = new Map<
      string,
      {
        individual: number;
        group: number;
        stage: number;
        offStage: number;
        total: number;
      }
    >();
    const countedStudentProgrammes = new Set<string>();
    const programmeDetailsById = new Map(
      programmes.map((programme) => [
        programme.id,
        {
          type:
            programme.programme_type === "group" ? "group" : "individual",
          stageType:
            programme.stage_type === "off_stage" ? "off_stage" : "stage",
          isGeneral: !programme.category_id,
        },
      ]),
    );

    eventRegistrations.forEach((registration) => {
      if (!registration.student_id || !registration.programme_id) return;

      const uniqueKey = `${registration.student_id}:${registration.programme_id}`;
      if (countedStudentProgrammes.has(uniqueKey)) return;
      countedStudentProgrammes.add(uniqueKey);

      const current = usage.get(registration.student_id) || {
        individual: 0,
        group: 0,
        stage: 0,
        offStage: 0,
        total: 0,
      };
      const programmeDetails = programmeDetailsById.get(
        registration.programme_id,
      );

      // General programmes never count toward participation limits.
      if (!programmeDetails || programmeDetails.isGeneral) return;

      if (programmeDetails.type === "group") {
        current.group += 1;
      } else {
        current.individual += 1;
      }

      if (programmeDetails.stageType === "off_stage") {
        current.offStage += 1;
      } else {
        current.stage += 1;
      }

      current.total += 1;
      usage.set(registration.student_id, current);
    });

    return usage;
  }, [eventRegistrations, programmes]);

  function getParticipationUsage(studentId: string): ParticipationUsage {
    const current = participationUsageByStudent.get(studentId) || {
      individual: 0,
      group: 0,
      stage: 0,
      offStage: 0,
      total: 0,
    };

    if (
      !participationRules.limits_enabled ||
      !activeProgramme ||
      !activeProgramme.category_id
    ) {
      return {
        ...current,
        blocked: false,
        reason: "",
      };
    }

    const nextIndividual =
      current.individual +
      (activeProgramme.programme_type === "group" ? 0 : 1);
    const nextGroup =
      current.group +
      (activeProgramme.programme_type === "group" ? 1 : 0);
    const isOffStage = activeProgramme.stage_type === "off_stage";
    const nextStage = current.stage + (isOffStage ? 0 : 1);
    const nextOffStage = current.offStage + (isOffStage ? 1 : 0);
    const nextTotal = current.total + 1;

    if (
      participationRules.max_individual_programmes !== null &&
      nextIndividual > participationRules.max_individual_programmes
    ) {
      return {
        ...current,
        blocked: true,
        reason: `Individual limit reached (${current.individual}/${participationRules.max_individual_programmes}).`,
      };
    }

    if (
      participationRules.max_group_programmes !== null &&
      nextGroup > participationRules.max_group_programmes
    ) {
      return {
        ...current,
        blocked: true,
        reason: `Group limit reached (${current.group}/${participationRules.max_group_programmes}).`,
      };
    }

    if (
      participationRules.max_stage_programmes !== null &&
      nextStage > participationRules.max_stage_programmes
    ) {
      return {
        ...current,
        blocked: true,
        reason: `Stage programme limit reached (${current.stage}/${participationRules.max_stage_programmes}).`,
      };
    }

    if (
      participationRules.max_off_stage_programmes !== null &&
      nextOffStage > participationRules.max_off_stage_programmes
    ) {
      return {
        ...current,
        blocked: true,
        reason: `Off-Stage programme limit reached (${current.offStage}/${participationRules.max_off_stage_programmes}).`,
      };
    }

    if (
      participationRules.max_total_programmes !== null &&
      nextTotal > participationRules.max_total_programmes
    ) {
      return {
        ...current,
        blocked: true,
        reason: `Total limit reached (${current.total}/${participationRules.max_total_programmes}).`,
      };
    }

    const student = getStudent(studentId);
    const studentGender = normalizeGender(student?.gender || null);
    const genderLimit =
      studentGender === "female"
        ? participationRules.max_female_programmes
        : studentGender === "male"
          ? participationRules.max_male_programmes
          : null;

    if (genderLimit !== null && nextTotal > genderLimit) {
      return {
        ...current,
        blocked: true,
        reason: `${
          studentGender === "female" ? "Girls" : "Boys"
        } overall limit reached (${current.total}/${genderLimit}).`,
      };
    }

    return {
      ...current,
      blocked: false,
      reason: "",
    };
  }

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
    };

    setOrgUser(activeOrgUser);
    setEventInfo(activeEvent);

    let allStudents: Student[] = [];
    let allEventRegistrations: Registration[] = [];

    try {
      [allStudents, allEventRegistrations] = await Promise.all([
        fetchAllRows<Student>((from, to) =>
          supabase
            .from("students")
            .select("*")
            .eq("organization_id", activeEvent.organization_id)
            .eq("event_id", activeEvent.id)
            .eq("status", "active")
            .order("chest_no_sort", { ascending: true })
            .range(from, to),
        ),
        fetchAllRows<Registration>((from, to) =>
          supabase
            .from("programme_registrations")
            .select("*")
            .eq("organization_id", activeEvent.organization_id)
            .eq("event_id", activeEvent.id)
            .eq("status", "registered")
            .order("created_at", { ascending: true })
            .range(from, to),
        ),
      ]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load participants.");
      setIsLoading(false);
      return;
    }

    const [
      programmeRes,
      categoryRes,
      teamRes,
      classRes,
      divisionRes,
      participationRuleRes,
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
          .select("id, name, color")
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("classes")
          .select("id, name")
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("class_divisions")
          .select("id, class_id, name")
          .eq("event_id", activeEvent.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),

        supabase
          .from("event_participation_rules")
          .select(
            "limits_enabled, max_individual_programmes, max_group_programmes, max_total_programmes, max_stage_programmes, max_off_stage_programmes, max_male_programmes, max_female_programmes",
          )
          .eq("organization_id", activeEvent.organization_id)
          .eq("event_id", activeEvent.id)
          .maybeSingle(),
      ]);

    const firstError =
      programmeRes.error ||
      categoryRes.error ||
      teamRes.error ||
      classRes.error ||
      divisionRes.error ||
      participationRuleRes.error;

    if (firstError) {
      setError(firstError.message);
      setIsLoading(false);
      return;
    }

    const loadedProgrammes = (programmeRes.data || []) as Programme[];

    setProgrammes(loadedProgrammes);
    setStudents(allStudents);
    setCategories((categoryRes.data || []) as Category[]);
    setTeams((teamRes.data || []) as Team[]);
    setClasses((classRes.data || []) as ClassItem[]);
    setDivisions((divisionRes.data || []) as DivisionItem[]);
    setEventRegistrations(allEventRegistrations);
    setParticipationRules({
      limits_enabled: Boolean(participationRuleRes.data?.limits_enabled),
      max_individual_programmes:
        participationRuleRes.data?.max_individual_programmes ?? null,
      max_group_programmes:
        participationRuleRes.data?.max_group_programmes ?? null,
      max_total_programmes:
        participationRuleRes.data?.max_total_programmes ?? null,
      max_stage_programmes:
        participationRuleRes.data?.max_stage_programmes ?? null,
      max_off_stage_programmes:
        participationRuleRes.data?.max_off_stage_programmes ?? null,
      max_male_programmes:
        participationRuleRes.data?.max_male_programmes ?? null,
      max_female_programmes:
        participationRuleRes.data?.max_female_programmes ?? null,
    });

    const currentStillExists = loadedProgrammes.some(
      (programme) => programme.id === selectedProgrammeId,
    );
    const nextProgrammeId = currentStillExists
      ? selectedProgrammeId
      : loadedProgrammes[0]?.id || "";

    setSelectedProgrammeId(nextProgrammeId);
    setRegisteredSearch("");

    if (nextProgrammeId) {
      await loadRegistrations(activeEvent.id, nextProgrammeId);
    } else {
      setRegistrations([]);
    }

    setIsLoading(false);
  }

  async function loadRegistrations(eventId: string, programmeId: string) {
    if (!eventId || !programmeId) {
      setRegistrations([]);
      return;
    }

    setIsRegistrationsLoading(true);
    setRegistrations([]);

    const { data, error: registrationError } = await supabase
      .from("programme_registrations")
      .select("*")
      .eq("event_id", eventId)
      .eq("programme_id", programmeId)
      .eq("status", "registered")
      .order("created_at", { ascending: true });

    if (registrationError) {
      setError(registrationError.message);
      setIsRegistrationsLoading(false);
      return;
    }

    setRegistrations((data || []) as Registration[]);
    setIsRegistrationsLoading(false);
  }

  function normalizeChest(chestNo: string | null) {
    return String(chestNo || "").replace("#", "").trim();
  }

  function normalizeGender(value: string | null) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();

    if (normalized.includes("female") || normalized.includes("girl")) {
      return "female";
    }

    if (normalized.includes("male") || normalized.includes("boy")) {
      return "male";
    }

    return normalized || "all";
  }

  function chestValue(chestNo: string | null) {
    const value = Number(normalizeChest(chestNo));
    return Number.isNaN(value) ? 999999 : value;
  }

  function getStudent(id: string | null) {
    return students.find((item) => item.id === id) || null;
  }

  function getTeamName(id: string | null) {
    return teams.find((item) => item.id === id)?.name || "-";
  }

  function getCategoryName(id: string | null) {
    if (!id) return "General";
    return categories.find((item) => item.id === id)?.name || "-";
  }

  function getClassName(id: string | null) {
    return classes.find((item) => item.id === id)?.name || "-";
  }

  function getDivisionName(id: string | null) {
    if (!id) return "";
    return divisions.find((item) => item.id === id)?.name || "";
  }

  async function callParticipantsApi(
    method: "POST" | "DELETE",
    body: Record<string, unknown>,
  ) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Login session expired. Please login again.");
    }

    const response = await fetch("/api/admin/participants", {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || "Participant operation failed.");
    }

    return payload;
  }

  function clearProgrammeSelection() {
    setSelectedProgrammeId("");
    setRegistrations([]);
    setRegisteredSearch("");
    setMessage("");
    setError("");
  }

  function resetProgrammeFilters() {
    setProgrammeCategoryFilter("all");
    setProgrammeGenderFilter("all");
    setProgrammeTypeFilter("all");
    setProgrammeStageFilter("all");
  }

  const hasProgrammeFilters =
    programmeCategoryFilter !== "all" ||
    programmeGenderFilter !== "all" ||
    programmeTypeFilter !== "all" ||
    programmeStageFilter !== "all";

  function openAddModal() {
    setSelectedStudentIds([]);
    setSelectedTeamId("");
    setGroupName("");
    setStudentSearch("");
    setError("");
    setMessage("");
    setIsAddModalOpen(true);
  }

  function closeAddModal() {
    setIsAddModalOpen(false);
    setSelectedStudentIds([]);
    setSelectedTeamId("");
    setGroupName("");
    setStudentSearch("");
    setError("");
  }

  function toggleStudent(studentId: string) {
    const usage = getParticipationUsage(studentId);
    if (usage.blocked) return;

    setSelectedStudentIds((current) => {
      if (current.includes(studentId)) {
        return current.filter((id) => id !== studentId);
      }

      return [...current, studentId];
    });
  }

  function getTeamEntryCount(teamId: string) {
    if (!activeProgramme) return 0;

    if (activeProgramme.programme_type === "group") {
      const groupKeys = new Set(
        activeRegistrations
          .filter((item) => item.team_id === teamId)
          .map((item) => item.group_name || "group"),
      );

      return groupKeys.size;
    }

    return activeRegistrations.filter((item) => item.team_id === teamId).length;
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!eventInfo || !activeProgramme) {
      setError("Please select a programme.");
      return;
    }

    if (selectedStudentIds.length === 0) {
      setError("Please select at least one student.");
      return;
    }

    const blockedStudent = selectedStudentIds.find(
      (studentId) => getParticipationUsage(studentId).blocked,
    );

    if (blockedStudent) {
      const student = getStudent(blockedStudent);
      setError(
        `${student?.name || "Selected student"} cannot be added. ${
          getParticipationUsage(blockedStudent).reason
        }`,
      );
      return;
    }

    if (activeProgramme.programme_type === "group" && !selectedTeamId) {
      setError("Please select a team.");
      return;
    }

    if (activeProgramme.programme_type === "group" && !groupName.trim()) {
      setError("Please enter group name.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = await callParticipantsApi("POST", {
        programmeId: activeProgramme.id,
        studentIds: selectedStudentIds,
        teamId:
          activeProgramme.programme_type === "group"
            ? selectedTeamId
            : null,
        groupName:
          activeProgramme.programme_type === "group"
            ? groupName.trim()
            : null,
      });

      const insertedCount = Number(
        payload?.result?.inserted_count || selectedStudentIds.length,
      );

      closeAddModal();
      setMessage(
        activeProgramme.programme_type === "group"
          ? `Group saved with ${insertedCount} member${
              insertedCount === 1 ? "" : "s"
            }.`
          : `${insertedCount} participant${
              insertedCount === 1 ? "" : "s"
            } added successfully.`,
      );
      await loadPageData();
    } catch (saveError: any) {
      setError(saveError?.message || "Unable to register participants.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveIndividualRegistration() {
    if (!orgUser || !eventInfo || !activeProgramme) return;

    const selectedStudents = students.filter((student) =>
      selectedStudentIds.includes(student.id),
    );

    const payload = selectedStudents.map((student) => ({
      organization_id: orgUser.organization_id,
      event_id: eventInfo.id,
      programme_id: activeProgramme.id,
      student_id: student.id,
      team_id: student.team_id,
      group_name: null,
      registration_no: `${activeProgramme.sort_order}-${normalizeChest(
        student.chest_no,
      )}`,
      status: "registered",
    }));

    const { error: insertError } = await supabase
      .from("programme_registrations")
      .insert(payload);

    if (insertError) {
      setError(insertError.message);
      setIsSaving(false);
      return;
    }

    setMessage(`${payload.length} participant(s) added successfully.`);
    setIsSaving(false);
    closeAddModal();
    await loadRegistrations(eventInfo.id, activeProgramme.id);
  }

  async function saveGroupRegistration() {
    if (!orgUser || !eventInfo || !activeProgramme) return;

    if (!selectedTeamId) {
      setError("Please select a team.");
      setIsSaving(false);
      return;
    }

    if (!groupName.trim()) {
      setError("Please enter group name.");
      setIsSaving(false);
      return;
    }

    const groupAlreadyExists = activeRegistrations.some(
      (item) =>
        item.team_id === selectedTeamId &&
        String(item.group_name || "").toLowerCase() ===
          groupName.trim().toLowerCase(),
    );

    if (groupAlreadyExists) {
      setError("This group name already exists for selected team.");
      setIsSaving(false);
      return;
    }

    const payload = selectedStudentIds.map((studentId, index) => ({
      organization_id: orgUser.organization_id,
      event_id: eventInfo.id,
      programme_id: activeProgramme.id,
      student_id: studentId,
      team_id: selectedTeamId,
      group_name: groupName.trim(),
      registration_no: `${groupName.trim()}-${index + 1}`,
      status: "registered",
    }));

    const { error: insertError } = await supabase
      .from("programme_registrations")
      .insert(payload);

    if (insertError) {
      setError(insertError.message);
      setIsSaving(false);
      return;
    }

    setMessage("Group added successfully.");
    setIsSaving(false);
    closeAddModal();
    await loadRegistrations(eventInfo.id, activeProgramme.id);
  }

  async function deleteRegistration(entry: RegisteredEntry) {
    const confirmed = window.confirm(
      entry.type === "group"
        ? `Delete group "${entry.groupName}"?`
        : "Delete this participant?",
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      await callParticipantsApi("DELETE", {
        registrationIds: entry.registrationIds,
      });

      setMessage("Registration deleted successfully.");

      if (eventInfo && activeProgramme) {
        await loadPageData();
      }
    } catch (deleteError: any) {
      setError(deleteError?.message || "Unable to delete registration.");
    }
  }

  return (
    <AdminShell
      title="Participants"
      subtitle="Simple student assignment for each programme."
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
        {error && !isAddModalOpen && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {message && !isAddModalOpen && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        {!eventInfo && !isLoading && (
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-lg shadow-amber-900/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 text-amber-700" size={22} />
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-amber-950">
                  Event Setup required
                </h2>
                <p className="mt-2 text-sm font-bold leading-6 text-amber-800">
                  Complete Event Setup before assigning participants.
                </p>
                <Link
                  href="/admin/event-setup"
                  className="mt-5 inline-flex rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-amber-950 transition hover:bg-amber-400"
                >
                  Go to Event Setup
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 sm:rounded-[2rem] sm:p-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">Programme Filters</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Narrow the programme list before assigning participants.
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
                value={programmeCategoryFilter}
                onChange={(event) => {
                  setProgrammeCategoryFilter(event.target.value);
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
                value={programmeGenderFilter}
                onChange={(event) => {
                  setProgrammeGenderFilter(event.target.value);
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
                value={programmeTypeFilter}
                onChange={(event) => {
                  setProgrammeTypeFilter(event.target.value);
                  clearProgrammeSelection();
                }}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="all">All Types</option>
                <option value="individual">Individual</option>
                <option value="group">Group</option>
              </select>

              <select
                value={programmeStageFilter}
                onChange={(event) => {
                  setProgrammeStageFilter(event.target.value);
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

          <div className="mt-4 grid gap-3 sm:gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Select Programme
              </label>
              <div className="mt-2">
                <SearchableProgrammeSelect
                  value={selectedProgrammeId}
                  onChange={(nextProgrammeId) => {
                    setSelectedProgrammeId(nextProgrammeId);
                    setRegisteredSearch("");
                    setMessage("");
                    setError("");

                    if (eventInfo) {
                      void loadRegistrations(eventInfo.id, nextProgrammeId);
                    }
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

            <div className="flex items-end">
              <button
                type="button"
                onClick={openAddModal}
                disabled={!activeProgramme}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={17} />
                Add Participants
              </button>
            </div>
          </div>

          {activeProgramme && (
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <InfoCard
                label="Type"
                value={
                  activeProgramme.programme_type === "group"
                    ? "Group"
                    : "Individual"
                }
              />
              <InfoCard
                label="Category"
                value={getCategoryName(activeProgramme.category_id)}
              />
              <InfoCard
                label="Location"
                value={
                  activeProgramme.stage_type === "off_stage"
                    ? "Off-stage"
                    : "Stage"
                }
              />
              <InfoCard label="Registered" value={registeredEntries.length} />
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                Registered Participants
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {activeProgramme
                  ? activeProgramme.name
                  : "Select a programme to view participants"}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <div className="flex h-11 min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 sm:w-72">
                <Search size={16} className="shrink-0 text-slate-400" />
                <input
                  value={registeredSearch}
                  onChange={(event) => setRegisteredSearch(event.target.value)}
                  placeholder="Search registered participants..."
                  className="w-full min-w-0 bg-transparent text-sm font-bold outline-none placeholder:text-slate-400"
                />
                {registeredSearch && (
                  <button
                    type="button"
                    onClick={() => setRegisteredSearch("")}
                    aria-label="Clear participant search"
                    className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="whitespace-nowrap rounded-2xl bg-violet-50 px-4 py-2.5 text-center text-sm font-black text-violet-700">
                {registeredSearch
                  ? `${filteredRegisteredEntries.length}/${registeredEntries.length}`
                  : registeredEntries.length}{" "}
                entries
              </div>
            </div>
          </div>

          {isLoading || isRegistrationsLoading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm font-black text-slate-500 sm:min-h-72">
              <Loader2 className="animate-spin" size={18} />
              Loading participants...
            </div>
          ) : !activeProgramme ? (
            <EmptyState title="Select programme" text="Choose a programme above." />
          ) : registeredEntries.length === 0 ? (
            <EmptyState
              title="No participants yet"
              text="Click Add Participants to assign students."
            />
          ) : filteredRegisteredEntries.length === 0 ? (
            <EmptyState
              title="No matching participants"
              text="Try another student name, chest number, class, division, group or team."
            />
          ) : (
            <>
              <div className="divide-y divide-slate-100 sm:hidden">
                {filteredRegisteredEntries.map((entry) => {
                  const firstStudent = getStudent(entry.studentIds[0] || null);

                  return (
                    <div key={entry.key} className="space-y-4 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-base font-black text-slate-950">
                            {entry.type === "group"
                              ? entry.groupName
                              : `#${normalizeChest(firstStudent?.chest_no || "")} ${firstStudent?.name || "Student"}`}
                          </p>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            {entry.type === "group" ? "Group Programme" : "Individual Participant"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteRegistration(entry)}
                          aria-label="Delete participant"
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-xs font-bold">
                        <div>
                          <p className="uppercase tracking-[0.12em] text-slate-400">Team</p>
                          <p className="mt-1 text-slate-700">{getTeamName(entry.teamId)}</p>
                        </div>
                        <div>
                          <p className="uppercase tracking-[0.12em] text-slate-400">Class</p>
                          <p className="mt-1 text-slate-700">
                            {entry.type === "group"
                              ? "-"
                              : [
                                  getClassName(firstStudent?.class_id || null),
                                  getDivisionName(firstStudent?.division_id || null),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                          </p>
                        </div>
                      </div>

                      {entry.type === "group" && (
                        <div className="flex flex-wrap gap-2">
                          {entry.studentIds.map((studentId) => {
                            const student = getStudent(studentId);
                            return (
                              <span
                                key={studentId}
                                className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700"
                              >
                                #{normalizeChest(student?.chest_no || "")} {student?.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Participant</th>
                    <th className="px-5 py-4">Team</th>
                    <th className="px-5 py-4">Class</th>
                    <th className="px-5 py-4">Members</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRegisteredEntries.map((entry) => {
                    const firstStudent = getStudent(entry.studentIds[0] || null);

                    return (
                      <tr key={entry.key} className="transition hover:bg-slate-50">
                        <td className="px-5 py-4">
                          {entry.type === "group" ? (
                            <>
                              <p className="text-sm font-black text-slate-950">
                                {entry.groupName}
                              </p>
                              <p className="mt-1 text-xs font-bold text-slate-500">
                                Group Programme
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-black text-slate-950">
                                #{normalizeChest(firstStudent?.chest_no || "")}{" "}
                                {firstStudent?.name || "Student"}
                              </p>
                              <p className="mt-1 text-xs font-bold text-slate-500">
                                Individual Participant
                              </p>
                            </>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-slate-600">
                          {getTeamName(entry.teamId)}
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-slate-600">
                          {entry.type === "group"
                            ? "-"
                            : [
                                getClassName(firstStudent?.class_id || null),
                                getDivisionName(firstStudent?.division_id || null),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                        </td>

                        <td className="px-5 py-4">
                          {entry.type === "group" ? (
                            <div className="flex flex-wrap gap-2">
                              {entry.studentIds.map((studentId) => {
                                const student = getStudent(studentId);

                                return (
                                  <span
                                    key={studentId}
                                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700"
                                  >
                                    #{normalizeChest(student?.chest_no || "")}{" "}
                                    {student?.name}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-slate-500">
                              1 student
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => deleteRegistration(entry)}
                              className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                            >
                              <Trash2 size={15} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {isAddModalOpen && activeProgramme && (
          <AddParticipantsModal
            programme={activeProgramme}
            teams={teams}
            classes={classes}
            divisions={divisions}
            eligibleStudents={eligibleStudents}
            participationRules={participationRules}
            getParticipationUsage={getParticipationUsage}
            selectedStudentIds={selectedStudentIds}
            selectedTeamId={selectedTeamId}
            groupName={groupName}
            studentSearch={studentSearch}
            error={error}
            isSaving={isSaving}
            getTeamName={getTeamName}
            getClassName={getClassName}
            getDivisionName={getDivisionName}
            normalizeChest={normalizeChest}
            normalizeGender={normalizeGender}
            onClose={closeAddModal}
            onSubmit={handleRegister}
            onToggleStudent={toggleStudent}
            onSetSelectedStudentIds={setSelectedStudentIds}
            onTeamChange={(value) => {
              setSelectedTeamId(value);
              setSelectedStudentIds([]);
            }}
            onGroupNameChange={setGroupName}
            onSearchChange={setStudentSearch}
          />
        )}
      </div>
    </AdminShell>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
        <Users size={28} />
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

function ModalFilter({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
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

function AddParticipantsModal({
  programme,
  teams,
  classes,
  divisions,
  eligibleStudents,
  participationRules,
  getParticipationUsage,
  selectedStudentIds,
  selectedTeamId,
  groupName,
  studentSearch,
  error,
  isSaving,
  getTeamName,
  getClassName,
  getDivisionName,
  normalizeChest,
  normalizeGender,
  onClose,
  onSubmit,
  onToggleStudent,
  onSetSelectedStudentIds,
  onTeamChange,
  onGroupNameChange,
  onSearchChange,
}: {
  programme: Programme;
  teams: Team[];
  classes: ClassItem[];
  divisions: DivisionItem[];
  eligibleStudents: Student[];
  participationRules: ParticipationRules;
  getParticipationUsage: (studentId: string) => ParticipationUsage;
  selectedStudentIds: string[];
  selectedTeamId: string;
  groupName: string;
  studentSearch: string;
  error: string;
  isSaving: boolean;
  getTeamName: (id: string | null) => string;
  getClassName: (id: string | null) => string;
  getDivisionName: (id: string | null) => string;
  normalizeChest: (chestNo: string | null) => string;
  normalizeGender: (value: string | null) => string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleStudent: (studentId: string) => void;
  onSetSelectedStudentIds: (studentIds: string[]) => void;
  onTeamChange: (value: string) => void;
  onGroupNameChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}) {
  const isGroup = programme.programme_type === "group";
  const programmeGender = normalizeGender(programme.gender_scope);
  const genderLocked =
    programmeGender === "male" || programmeGender === "female";

  const [modalGenderFilter, setModalGenderFilter] = useState(
    genderLocked ? programmeGender : "all",
  );
  const [modalTeamFilter, setModalTeamFilter] = useState("all");
  const [modalClassFilter, setModalClassFilter] = useState("all");
  const [modalDivisionFilter, setModalDivisionFilter] = useState("all");

  useEffect(() => {
    setModalGenderFilter(genderLocked ? programmeGender : "all");
    setModalTeamFilter("all");
    setModalClassFilter("all");
    setModalDivisionFilter("all");
  }, [programme.id, genderLocked, programmeGender]);

  const availableClasses = useMemo(() => {
    const ids = new Set(
      eligibleStudents
        .map((student) => student.class_id)
        .filter(Boolean) as string[],
    );

    return classes.filter((item) => ids.has(item.id));
  }, [eligibleStudents, classes]);

  const availableDivisions = useMemo(() => {
    const ids = new Set(
      eligibleStudents
        .filter(
          (student) =>
            modalClassFilter === "all" ||
            student.class_id === modalClassFilter,
        )
        .map((student) => student.division_id)
        .filter(Boolean) as string[],
    );

    return divisions.filter(
      (item) =>
        ids.has(item.id) &&
        (modalClassFilter === "all" ||
          item.class_id === modalClassFilter),
    );
  }, [eligibleStudents, divisions, modalClassFilter]);

  const visibleStudents = useMemo(() => {
    const keyword = studentSearch.trim().toLowerCase();

    return eligibleStudents.filter((student) => {
      const matchesSearch =
        !keyword ||
        student.name.toLowerCase().includes(keyword) ||
        normalizeChest(student.chest_no).toLowerCase().includes(keyword);

      const matchesGender =
        modalGenderFilter === "all" ||
        normalizeGender(student.gender) === modalGenderFilter;

      const matchesTeam =
        isGroup ||
        modalTeamFilter === "all" ||
        student.team_id === modalTeamFilter;

      const matchesClass =
        modalClassFilter === "all" ||
        student.class_id === modalClassFilter;

      const matchesDivision =
        modalDivisionFilter === "all" ||
        student.division_id === modalDivisionFilter;

      return (
        matchesSearch &&
        matchesGender &&
        matchesTeam &&
        matchesClass &&
        matchesDivision
      );
    });
  }, [
    eligibleStudents,
    studentSearch,
    modalGenderFilter,
    modalTeamFilter,
    modalClassFilter,
    modalDivisionFilter,
    isGroup,
    normalizeChest,
    normalizeGender,
  ]);

  function selectVisibleStudents() {
    const visibleIds = visibleStudents
      .filter((student) => !getParticipationUsage(student.id).blocked)
      .map((student) => student.id);
    onSetSelectedStudentIds(
      Array.from(new Set([...selectedStudentIds, ...visibleIds])),
    );
  }

  function clearSelection() {
    onSetSelectedStudentIds([]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="h-[96dvh] w-full max-w-4xl overflow-y-auto rounded-t-[1.75rem] bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-[2rem]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
              {isGroup ? "Add Group" : "Add Participants"}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {programme.name}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-4 pb-28 sm:p-6 sm:pb-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          {isGroup && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Team *
                </label>
                <select
                  value={selectedTeamId}
                  onChange={(event) => onTeamChange(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="">Select Team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Group Name *
                </label>
                <input
                  value={groupName}
                  onChange={(event) => onGroupNameChange(event.target.value)}
                  placeholder="e.g. Red Quiz Team 1"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Search Student
            </label>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <Search size={18} className="text-slate-400" />
              <input
                value={studentSearch}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search by name or chest no..."
                className="w-full bg-transparent text-sm font-bold outline-none"
              />
              {studentSearch && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  aria-label="Clear student search"
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ModalFilter label="Gender">
              <select
                value={modalGenderFilter}
                onChange={(event) =>
                  setModalGenderFilter(event.target.value)
                }
                disabled={genderLocked}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </ModalFilter>

            {!isGroup && (
              <ModalFilter label="Team / House">
                <select
                  value={modalTeamFilter}
                  onChange={(event) =>
                    setModalTeamFilter(event.target.value)
                  }
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                >
                  <option value="all">All Teams</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </ModalFilter>
            )}

            <ModalFilter label="Class">
              <select
                value={modalClassFilter}
                onChange={(event) => {
                  setModalClassFilter(event.target.value);
                  setModalDivisionFilter("all");
                }}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="all">All Classes</option>
                {availableClasses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </ModalFilter>

            <ModalFilter label="Division">
              <select
                value={modalDivisionFilter}
                onChange={(event) =>
                  setModalDivisionFilter(event.target.value)
                }
                disabled={availableDivisions.length === 0}
                className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="all">All Divisions</option>
                {availableDivisions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </ModalFilter>
          </div>

          {participationRules.limits_enabled && (
            <div className="rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-xs font-bold leading-5 text-violet-700">
              {!programme.category_id ? (
                <>General programme · Participation limits do not apply.</>
              ) : (
                <>
                  Event limits: Individual{" "}
                  {participationRules.max_individual_programmes ?? "No limit"} ·
                  Group {participationRules.max_group_programmes ?? "No limit"} ·
                  Stage {participationRules.max_stage_programmes ?? "No limit"} ·
                  Off-Stage {participationRules.max_off_stage_programmes ?? "No limit"} ·
                  Total {participationRules.max_total_programmes ?? "No limit"} ·
                  Boys Overall {participationRules.max_male_programmes ?? "No limit"} ·
                  Girls Overall {participationRules.max_female_programmes ?? "No limit"}
                </>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-slate-950">
                  Eligible Students
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Showing {visibleStudents.length} of {eligibleStudents.length}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={selectVisibleStudents}
                  disabled={visibleStudents.length === 0}
                  className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-black text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Select Visible
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  disabled={selectedStudentIds.length === 0}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Clear Selection
                </button>
                <p className="rounded-full bg-violet-50 px-3 py-2 text-xs font-black text-violet-700">
                  Selected: {selectedStudentIds.length}
                </p>
              </div>
            </div>

            <div className="max-h-[380px] divide-y divide-slate-100 overflow-y-auto">
              {visibleStudents.length === 0 ? (
                <div className="p-8 text-center text-sm font-bold text-slate-500">
                  No students match the selected filters.
                </div>
              ) : (
                visibleStudents.map((student) => {
                  const checked = selectedStudentIds.includes(student.id);
                  const usage = getParticipationUsage(student.id);
                  const disabled = usage.blocked;

                  return (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => onToggleStudent(student.id)}
                      disabled={disabled}
                      className={`flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition ${
                        disabled
                          ? "cursor-not-allowed bg-slate-50 opacity-65"
                          : checked
                            ? "bg-violet-50"
                            : "hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          #{normalizeChest(student.chest_no)} {student.name}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {[
                            normalizeGender(student.gender) === "female"
                              ? "Female"
                              : normalizeGender(student.gender) === "male"
                                ? "Male"
                                : student.gender,
                            getClassName(student.class_id),
                            getDivisionName(student.division_id),
                            getTeamName(student.team_id),
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>

                        {participationRules.limits_enabled && (
                          <div className="mt-2">
                            <p className="text-[11px] font-black text-slate-500">
                              Individual {usage.individual}/
                              {participationRules.max_individual_programmes ??
                                "∞"}{" "}
                              · Group {usage.group}/
                              {participationRules.max_group_programmes ?? "∞"}{" "}
                              · Stage {usage.stage}/
                              {participationRules.max_stage_programmes ?? "∞"}{" "}
                              · Off-Stage {usage.offStage}/
                              {participationRules.max_off_stage_programmes ?? "∞"}{" "}
                              · Total {usage.total}/
                              {participationRules.max_total_programmes ?? "∞"}{" "}
                              · {normalizeGender(student.gender) === "female"
                                ? "Girls"
                                : normalizeGender(student.gender) === "male"
                                  ? "Boys"
                                  : "Gender"}{" "}
                              overall {usage.total}/
                              {normalizeGender(student.gender) === "female"
                                ? participationRules.max_female_programmes ?? "∞"
                                : normalizeGender(student.gender) === "male"
                                  ? participationRules.max_male_programmes ?? "∞"
                                  : "∞"}
                            </p>
                            {usage.blocked && (
                              <p className="mt-1 text-[11px] font-black text-red-600">
                                {usage.reason}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                          disabled
                            ? "border-slate-200 bg-slate-100 text-slate-300"
                            : checked
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-300 bg-white text-white"
                        }`}
                      >
                        {checked && <Check size={15} />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-20 flex justify-end gap-3 border-t border-slate-200 bg-white p-4 sm:static sm:bg-transparent sm:p-0 sm:pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:opacity-60 sm:flex-none sm:px-6"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Plus size={18} />
              )}
              {isGroup ? "Save Group" : "Save Participants"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}