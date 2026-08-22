/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import { getAdminContext } from "@/lib/admin-context";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  RefreshCcw,
  Rocket,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

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

type Student = {
  id: string;
  chest_no: string | null;
  name: string;
  class_id: string | null;
  category_id: string | null;
  team_id: string | null;
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

type ResultStatus = "pending" | "in_progress" | "submitted" | "published";

type ResultEntry = {
  result: ResultItem;
  participantTitle: string;
  participantSubtitle: string;
  teamId: string | null;
  memberNames: string[];
};

function isAbsentResult(result: ResultItem) {
  return String(result.grade || "").trim().toLowerCase() === "absent";
}

function isDisqualifiedResult(result: ResultItem) {
  if (isAbsentResult(result)) return false;

  const finalAverage = Number(
    result.average_mark ?? result.total_mark ?? 0,
  );

  return !Number.isFinite(finalAverage) || finalAverage <= 0;
}

function getResultDisplayGrade(result: ResultItem) {
  if (isAbsentResult(result)) return "Absent";
  if (isDisqualifiedResult(result)) return "Disqualified";
  return result.grade || "-";
}

function getResultDisplayPoints(result: ResultItem) {
  return isDisqualifiedResult(result) ? 0 : Number(result.points || 0);
}

export default function ResultsPage() {
  const [orgUser, setOrgUser] = useState<OrganizationUser | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);

  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);

  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [previewProgramme, setPreviewProgramme] = useState<Programme | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPageData();
  }, []);

  const filteredProgrammes = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return programmes
      .filter((programme) => {
        const status = getProgrammeStatus(programme.id);

        const matchesSearch =
          !keyword || programme.name.toLowerCase().includes(keyword);

        const matchesCategory =
          !categoryFilter ||
          (categoryFilter === "general" && !programme.category_id) ||
          programme.category_id === categoryFilter;

        const matchesGender =
          !genderFilter || programme.gender_scope === genderFilter;

        const matchesStage = !stageFilter || programme.stage_type === stageFilter;

        const matchesStatus = !statusFilter || status === statusFilter;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesGender &&
          matchesStage &&
          matchesStatus
        );
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [
    programmes,
    searchText,
    categoryFilter,
    genderFilter,
    stageFilter,
    statusFilter,
    results,
    registrations,
  ]);

  const statusCounts = useMemo(() => {
    return {
      pending: programmes.filter((p) => getProgrammeStatus(p.id) === "pending").length,
      in_progress: programmes.filter((p) => getProgrammeStatus(p.id) === "in_progress").length,
      submitted: programmes.filter((p) => getProgrammeStatus(p.id) === "submitted").length,
      published: programmes.filter((p) => getProgrammeStatus(p.id) === "published").length,
    };
  }, [programmes, results, registrations]);

  const teamPoints = useMemo(() => {
    const map = new Map<string, number>();

    results
      .filter((result) => result.is_published)
      .forEach((result) => {
        const registration = registrations.find(
          (item) => item.id === result.registration_id,
        );

        const teamId = registration?.team_id || null;
        if (!teamId) return;

        map.set(
          teamId,
          (map.get(teamId) || 0) + getResultDisplayPoints(result),
        );
      });

    return Array.from(map.entries())
      .map(([teamId, points]) => ({
        teamId,
        teamName: getTeamName(teamId),
        points,
      }))
      .sort((a, b) => b.points - a.points);
  }, [results, registrations, teams]);

  const previewEntries = useMemo(() => {
    if (!previewProgramme) return [];

    return getProgrammeResults(previewProgramme.id)
      .map((result) => buildResultEntry(result, previewProgramme))
      .sort((a, b) => {
        const aPos = a.result.position || 9999;
        const bPos = b.result.position || 9999;

        if (aPos !== bPos) return aPos - bPos;
        return Number(b.result.total_mark || 0) - Number(a.result.total_mark || 0);
      });
  }, [previewProgramme, results, registrations, students, teams, classes]);

  async function loadPageData() {
    setIsLoading(true);
    setError("");
    setMessage("");

    const { context, error: contextError } = await getAdminContext({ forceRefresh: true });

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
    let allRegistrations: Registration[] = [];
    let allResults: ResultItem[] = [];

    try {
      [allStudents, allRegistrations, allResults] = await Promise.all([
        fetchAllRows<Student>((from, to) =>
          supabase.from("students")
            .select("id, chest_no, name, class_id, category_id, team_id")
            .eq("organization_id", activeEvent.organization_id)
            .eq("event_id", activeEvent.id)
            .order("chest_no_sort", { ascending: true })
            .range(from, to),
        ),
        fetchAllRows<Registration>((from, to) =>
          supabase.from("programme_registrations")
            .select("*")
            .eq("organization_id", activeEvent.organization_id)
            .eq("event_id", activeEvent.id)
            .eq("status", "registered")
            .order("created_at", { ascending: true })
            .range(from, to),
        ),
        fetchAllRows<ResultItem>((from, to) =>
          supabase.from("results")
            .select("*")
            .eq("organization_id", activeEvent.organization_id)
            .eq("event_id", activeEvent.id)
            .order("position", { ascending: true })
            .range(from, to),
        ),
      ]);
    } catch (loadError) {
      return stopLoading(loadError instanceof Error ? loadError.message : "Unable to load results.");
    }

    const [
      programmeRes,
      categoryRes,
      teamRes,
      classRes,
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
    ]);

    if (programmeRes.error) return stopLoading(programmeRes.error.message);
    if (categoryRes.error) return stopLoading(categoryRes.error.message);
    if (teamRes.error) return stopLoading(teamRes.error.message);
    if (classRes.error) return stopLoading(classRes.error.message);

    setProgrammes((programmeRes.data || []) as Programme[]);
    setCategories((categoryRes.data || []) as Category[]);
    setTeams((teamRes.data || []) as Team[]);
    setClasses((classRes.data || []) as ClassItem[]);
    setStudents(allStudents);
    setRegistrations(allRegistrations);
    setResults(allResults);

    setIsLoading(false);
  }

  function stopLoading(message: string) {
    setError(message);
    setIsLoading(false);
  }

  function getProgrammeRegistrations(programmeId: string) {
    return registrations.filter((item) => item.programme_id === programmeId);
  }

  function getProgrammeEntryCount(programme: Programme) {
    const programmeRegistrations = getProgrammeRegistrations(programme.id);

    if (programme.programme_type !== "group") {
      return programmeRegistrations.length;
    }

    const groupKeys = new Set(
      programmeRegistrations.map(
        (item) => `${item.team_id || "team"}-${item.group_name || "group"}`,
      ),
    );

    return groupKeys.size;
  }

  function getProgrammeResults(programmeId: string) {
    return results.filter((item) => item.programme_id === programmeId);
  }

  function getProgrammeStatus(programmeId: string): ResultStatus {
    const programme = programmes.find((item) => item.id === programmeId);
    const programmeResults = getProgrammeResults(programmeId);

    if (!programme) return "pending";

    const entryCount = getProgrammeEntryCount(programme);

    if (entryCount === 0) return "pending";
    if (programmeResults.length === 0) return "in_progress";

    const allPublished = programmeResults.every((item) => item.is_published);

    if (allPublished) return "published";

    return "submitted";
  }

  function normalizeChest(chestNo: string | null) {
    return String(chestNo || "").replace("#", "").trim();
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

  function getPositionLabel(position: number | null) {
    if (position === 1) return "🥇 1st";
    if (position === 2) return "🥈 2nd";
    if (position === 3) return "🥉 3rd";
    if (!position) return "-";
    return `#${position}`;
  }

  function buildResultEntry(result: ResultItem, programme: Programme): ResultEntry {
    const registration =
      registrations.find((item) => item.id === result.registration_id) || null;

    if (!registration) {
      return {
        result,
        participantTitle: "Unknown participant",
        participantSubtitle: "-",
        teamId: null,
        memberNames: [],
      };
    }

    if (programme.programme_type === "group") {
      const groupRegistrations = registrations.filter((item) => {
        return (
          item.programme_id === registration.programme_id &&
          item.team_id === registration.team_id &&
          item.group_name === registration.group_name
        );
      });

      const memberNames = groupRegistrations
        .map((item) => {
          const student = getStudent(item.student_id);
          if (!student) return "";
          return `#${normalizeChest(student.chest_no)} ${student.name}`;
        })
        .filter(Boolean);

      return {
        result,
        participantTitle: registration.group_name || "Group",
        participantSubtitle: `${getTeamName(registration.team_id)} • Group`,
        teamId: registration.team_id,
        memberNames,
      };
    }

    const student = getStudent(registration.student_id);

    return {
      result,
      participantTitle: student
        ? `#${normalizeChest(student.chest_no)} ${student.name}`
        : "Student",
      participantSubtitle: student
        ? `${getClassName(student.class_id)} • ${getTeamName(student.team_id)}`
        : getTeamName(registration.team_id),
      teamId: registration.team_id,
      memberNames: student ? [student.name] : [],
    };
  }

  function cleanPosterName(value: string | null | undefined) {
    return String(value || "-").replace(/^#?\d+\s*/, "").trim() || "-";
  }

  function buildLockedPosterData(programmeId: string, resultNo: number) {
    const programme = programmes.find((item) => item.id === programmeId);

    if (!programme) {
      return {
        result_label: "RESULT",
        result_no: String(resultNo || 1).padStart(2, "0"),
        category: "GENERAL",
        programme: "Programme",
        first_name: "-",
        first_unit: "-",
        second_name: "-",
        second_unit: "-",
        third_name: "-",
        third_unit: "-",
      };
    }

    const entries = getProgrammeResults(programmeId)
      .filter(
        (result) =>
          !isAbsentResult(result) &&
          !isDisqualifiedResult(result) &&
          [1, 2, 3].includes(Number(result.position || 0)),
      )
      .map((result) => buildResultEntry(result, programme))
      .sort((a, b) => {
        const aPos = a.result.position || 9999;
        const bPos = b.result.position || 9999;

        if (aPos !== bPos) return aPos - bPos;
        return Number(b.result.total_mark || 0) - Number(a.result.total_mark || 0);
      });

    function getPlacementPosterText(position: number) {
      const tiedEntries = entries.filter(
        (entry) => Number(entry.result.position) === position,
      );

      if (tiedEntries.length === 0) {
        return {
          names: "-",
          units: "-",
        };
      }

      return {
        names: tiedEntries
          .map((entry) =>
            cleanPosterName(entry.participantTitle).toUpperCase(),
          )
          .join("\n"),
        units: Array.from(
          new Set(
            tiedEntries.map((entry) =>
              getTeamName(entry.teamId || null).toUpperCase(),
            ),
          ),
        ).join(" / "),
      };
    }

    const first = getPlacementPosterText(1);
    const second = getPlacementPosterText(2);
    const third = getPlacementPosterText(3);

    return {
      result_label: "RESULT",
      result_no: String(resultNo || 1).padStart(2, "0"),
      category: getCategoryName(programme.category_id).toUpperCase(),
      programme: programme.name,
      first_name: first.names,
      first_unit: first.units,
      second_name: second.names,
      second_unit: second.units,
      third_name: third.names,
      third_unit: third.units,
    };
  }

  async function getPublishedProgrammeOrderIds() {
    if (!eventInfo || !orgUser) return [];

    const { data, error } = await supabase
      .from("results")
      .select("programme_id, published_at, created_at")
      .eq("organization_id", orgUser.organization_id)
      .eq("event_id", eventInfo.id)
      .eq("is_published", true);

    if (error) {
      console.warn("Published programme order check failed:", error.message);
      return [];
    }

    const map = new Map<string, string>();

    (data || []).forEach((row: any) => {
      const programmeId = row.programme_id as string | null;
      if (!programmeId) return;

      const dateValue = String(row.published_at || row.created_at || "");
      const previous = map.get(programmeId);

      if (!previous || dateValue < previous) {
        map.set(programmeId, dateValue);
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => {
        const dateCompare = a[1].localeCompare(b[1]);
        if (dateCompare !== 0) return dateCompare;

        const aProgramme = programmes.find((item) => item.id === a[0]);
        const bProgramme = programmes.find((item) => item.id === b[0]);

        return Number(aProgramme?.sort_order || 9999) - Number(bProgramme?.sort_order || 9999);
      })
      .map(([programmeId]) => programmeId);
  }

  async function ensureResultPosterLocks(programmeIds?: string[]) {
    if (!eventInfo || !orgUser) {
      return { createdCount: 0 };
    }

    const orderedPublishedProgrammeIds = await getPublishedProgrammeOrderIds();

    const requestedProgrammeIds = Array.from(
      new Set((programmeIds || orderedPublishedProgrammeIds).filter(Boolean)),
    );

    const targetProgrammeIds = orderedPublishedProgrammeIds.filter((programmeId) =>
      requestedProgrammeIds.includes(programmeId),
    );

    if (targetProgrammeIds.length === 0) {
      return { createdCount: 0 };
    }

    const { data: existingRows, error: existingError } = await supabase
      .from("result_posters")
      .select("id, programme_id, result_no")
      .eq("organization_id", orgUser.organization_id)
      .eq("event_id", eventInfo.id)
      .in("programme_id", targetProgrammeIds);

    if (existingError) {
      console.warn("Result poster lock check failed:", existingError.message);
      return { createdCount: 0 };
    }

    const existingPosterByProgramme = new Map(
      (existingRows || [])
        .filter((item: any) => item.programme_id)
        .map((item: any) => [item.programme_id, item]),
    );

    const { data: activeTemplate, error: templateError } = await supabase
      .from("poster_templates")
      .select("id")
      .eq("organization_id", orgUser.organization_id)
      .eq("event_id", eventInfo.id)
      .eq("template_usage", "result_poster")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (templateError) {
      console.warn("Active result poster template check failed:", templateError.message);
    }

    const rowsToInsert: Array<Record<string, unknown>> = [];
    const rowsToRefresh: Array<{
      id: string;
      resultNo: number;
      programmeId: string;
    }> = [];

    targetProgrammeIds.forEach((programmeId) => {
      const calculatedResultNo =
        orderedPublishedProgrammeIds.findIndex((id) => id === programmeId) + 1;
      const existingPoster = existingPosterByProgramme.get(programmeId) as
        | { id: string; result_no: number | null }
        | undefined;

      if (existingPoster?.id) {
        rowsToRefresh.push({
          id: existingPoster.id,
          resultNo: Number(existingPoster.result_no || calculatedResultNo || 1),
          programmeId,
        });
        return;
      }

      const resultNo = calculatedResultNo || 1;

      rowsToInsert.push({
        organization_id: orgUser.organization_id,
        event_id: eventInfo.id,
        programme_id: programmeId,
        template_id: activeTemplate?.id || null,
        result_no: resultNo,
        poster_data: buildLockedPosterData(programmeId, resultNo),
        is_public: true,
      });
    });

    if (rowsToRefresh.length > 0) {
      const refreshResults = await Promise.all(
        rowsToRefresh.map((item) =>
          supabase
            .from("result_posters")
            .update({
              poster_data: buildLockedPosterData(
                item.programmeId,
                item.resultNo,
              ),
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.id)
            .eq("organization_id", orgUser.organization_id)
            .eq("event_id", eventInfo.id),
        ),
      );

      const refreshError = refreshResults.find((result) => result.error)?.error;

      if (refreshError) {
        console.warn("Result poster refresh failed:", refreshError.message);
      }
    }

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("result_posters")
        .insert(rowsToInsert);

      if (insertError) {
        console.warn("Result poster lock save failed:", insertError.message);
        return { createdCount: 0 };
      }
    }

    return { createdCount: rowsToInsert.length };
  }

  async function ensureMilestonePosters() {
    if (!eventInfo || !orgUser) {
      return {
        createdCount: 0,
        latestMilestone: 0,
        publishedProgrammeCount: 0,
      };
    }

    const { data: publishedRows, error: publishedError } = await supabase
      .from("results")
      .select("programme_id, registration_id, points")
      .eq("organization_id", orgUser.organization_id)
      .eq("event_id", eventInfo.id)
      .eq("is_published", true);

    if (publishedError) {
      console.warn("Milestone poster check failed:", publishedError.message);
      return {
        createdCount: 0,
        latestMilestone: 0,
        publishedProgrammeCount: 0,
      };
    }

    const publishedProgrammeIds = Array.from(
      new Set(
        (publishedRows || [])
          .map((item: any) => item.programme_id)
          .filter(Boolean),
      ),
    );

    const publishedProgrammeCount = publishedProgrammeIds.length;
    const latestMilestone = Math.floor(publishedProgrammeCount / 10) * 10;

    if (latestMilestone < 10) {
      return {
        createdCount: 0,
        latestMilestone: 0,
        publishedProgrammeCount,
      };
    }

    const pointsMap = new Map<string, number>();

    (publishedRows || []).forEach((result: any) => {
      const registration = registrations.find(
        (item) => item.id === result.registration_id,
      );

      const teamId = registration?.team_id || null;
      if (!teamId) return;

      pointsMap.set(
        teamId,
        (pointsMap.get(teamId) || 0) + Number(result.points || 0),
      );
    });

    const leaderboardSnapshot = Array.from(pointsMap.entries())
      .map(([teamId, points]) => ({
        teamId,
        teamName: getTeamName(teamId),
        points,
      }))
      .sort((a, b) => b.points - a.points);

    const { data: existingMilestoneRows, error: existingError } = await supabase
      .from("result_milestone_posters")
      .select("milestone_count")
      .eq("organization_id", orgUser.organization_id)
      .eq("event_id", eventInfo.id);

    if (existingError) {
      console.warn("Milestone poster existing check failed:", existingError.message);
      return {
        createdCount: 0,
        latestMilestone,
        publishedProgrammeCount,
      };
    }

    const existingMilestones = new Set(
      (existingMilestoneRows || []).map((item: any) =>
        Number(item.milestone_count || 0),
      ),
    );

    const { data: templateData, error: templateError } = await supabase
      .from("poster_templates")
      .select("id")
      .eq("organization_id", orgUser.organization_id)
      .eq("event_id", eventInfo.id)
      .eq("template_usage", "milestone_poster")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (templateError) {
      console.warn("Milestone template check failed:", templateError.message);
    }

    const rows = [];

    for (let milestone = 10; milestone <= latestMilestone; milestone += 10) {
      if (existingMilestones.has(milestone)) continue;

      rows.push({
        organization_id: orgUser.organization_id,
        event_id: eventInfo.id,
        milestone_count: milestone,
        title: `After ${milestone}`,
        template_id: templateData?.id || null,
        leaderboard_snapshot: leaderboardSnapshot,
        published_result_count: publishedProgrammeCount,
        is_public: true,
      });
    }

    if (rows.length === 0) {
      return {
        createdCount: 0,
        latestMilestone,
        publishedProgrammeCount,
      };
    }

    const { error: insertError } = await supabase
      .from("result_milestone_posters")
      .insert(rows);

    if (insertError) {
      console.warn("Milestone poster save failed:", insertError.message);
      return {
        createdCount: 0,
        latestMilestone,
        publishedProgrammeCount,
      };
    }

    return {
      createdCount: rows.length,
      latestMilestone,
      publishedProgrammeCount,
    };
  }

  async function callPublicationApi(body: Record<string, unknown>) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Login session expired. Please login again.");
    }

    const response = await fetch("/api/admin/results/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload?.error || "Publication operation failed.");
    }

    return payload;
  }

  async function publishProgramme(programmeId: string) {
    const programmeResults = getProgrammeResults(programmeId);

    if (programmeResults.length === 0) {
      setError("No result found for this programme. Enter marks first.");
      return;
    }

    setIsPublishing(true);
    setError("");
    setMessage("");

    try {
      await callPublicationApi({
        action: "publish",
        programmeId,
      });

      const posterLockResult = await ensureResultPosterLocks([programmeId]);
      const milestoneResult = await ensureMilestonePosters();

      const lockMessage =
        posterLockResult.createdCount > 0
          ? ` ${posterLockResult.createdCount} result poster locked.`
          : "";

      const milestoneMessage =
        milestoneResult.createdCount > 0
          ? ` ${milestoneResult.createdCount} milestone poster${
              milestoneResult.createdCount === 1 ? "" : "s"
            } created.`
          : "";

      setMessage(
        `Result published successfully.${lockMessage}${milestoneMessage}`,
      );
      await loadPageData();
    } catch (publishError: any) {
      setError(publishError?.message || "Unable to publish result.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function revokeProgramme(programmeId: string) {
    setIsPublishing(true);
    setError("");
    setMessage("");

    try {
      await callPublicationApi({
        action: "revoke",
        programmeId,
      });

      setMessage("Result moved back to submitted draft.");
      await loadPageData();
    } catch (revokeError: any) {
      setError(revokeError?.message || "Unable to revoke result.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function publishAllReady() {
    if (!eventInfo || !orgUser) return;

    const readyResults = results.filter((item) => !item.is_published);

    if (readyResults.length === 0) {
      setError("No submitted results to publish.");
      return;
    }

    const confirmed = window.confirm("Publish all submitted results?");
    if (!confirmed) return;

    setIsPublishing(true);
    setError("");
    setMessage("");

    try {
      await callPublicationApi({ action: "publish_all" });

      const readyProgrammeIds = Array.from(
        new Set(
          readyResults
            .map((item) => item.programme_id)
            .filter(Boolean) as string[],
        ),
      );

      const posterLockResult = await ensureResultPosterLocks(readyProgrammeIds);
      const milestoneResult = await ensureMilestonePosters();

      const lockMessage =
        posterLockResult.createdCount > 0
          ? ` ${posterLockResult.createdCount} result poster${
              posterLockResult.createdCount === 1 ? "" : "s"
            } locked.`
          : "";

      const milestoneMessage =
        milestoneResult.createdCount > 0
          ? ` ${milestoneResult.createdCount} milestone poster${
              milestoneResult.createdCount === 1 ? "" : "s"
            } created.`
          : "";

      setMessage(
        `All submitted results published.${lockMessage}${milestoneMessage}`,
      );
      await loadPageData();
    } catch (publishError: any) {
      setError(publishError?.message || "Unable to publish all results.");
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <AdminShell
      title="Results"
      subtitle="Publish results and track live team points."
      actions={
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadPageData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={publishAllReady}
            disabled={isPublishing}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:opacity-60"
          >
            {isPublishing ? <Loader2 className="animate-spin" size={17} /> : <Rocket size={17} />}
            Publish All
          </button>
        </div>
      }
    >
      <div className="w-full max-w-full space-y-6 overflow-hidden">
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

        {!eventInfo && !isLoading && (
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-lg shadow-amber-900/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 text-amber-700" size={22} />
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-amber-950">
                  Event Setup required
                </h2>
                <p className="mt-2 text-sm font-bold leading-6 text-amber-800">
                  Complete Event Setup before publishing results.
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

        <div className="grid gap-4 md:grid-cols-4">
          <StatusCard label="Pending" value={statusCounts.pending} tone="slate" />
          <StatusCard label="In Progress" value={statusCounts.in_progress} tone="blue" />
          <StatusCard label="Submitted" value={statusCounts.submitted} tone="amber" />
          <StatusCard label="Published" value={statusCounts.published} tone="green" />
        </div>

        <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
              <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                  <Search size={18} className="text-slate-400" />
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search programme..."
                    className="w-full bg-transparent text-sm font-bold outline-none"
                  />
                </div>

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                >
                  <option value="">All Categories</option>
                  <option value="general">General</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <select
                  value={genderFilter}
                  onChange={(event) => setGenderFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                >
                  <option value="">All Genders</option>
                  <option value="all">All</option>
                  <option value="male">Boys</option>
                  <option value="female">Girls</option>
                </select>

                <select
                  value={stageFilter}
                  onChange={(event) => setStageFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                >
                  <option value="">All Stages</option>
                  <option value="stage">Stage</option>
                  <option value="off_stage">Off-stage</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
              <div className="flex items-center justify-between border-b border-slate-200 p-5">
                <div>
                  <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                    Programme Results
                  </h2>
                  <p className="mt-1 text-sm font-bold text-slate-500">
                    Showing {filteredProgrammes.length} of {programmes.length} programmes.
                  </p>
                </div>

                <span className="rounded-2xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">
                  {eventInfo?.title || "Event"}
                </span>
              </div>

              {isLoading ? (
                <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-black text-slate-500">
                  <Loader2 className="animate-spin" size={18} />
                  Loading results...
                </div>
              ) : filteredProgrammes.length === 0 ? (
                <EmptyState title="No programmes found" text="Try changing filters." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                      <tr>
                        <th className="px-5 py-4">#</th>
                        <th className="px-5 py-4">Programme Name</th>
                        <th className="px-5 py-4">Category</th>
                        <th className="px-5 py-4">Participants</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4 text-right">Actions</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredProgrammes.map((programme, index) => {
                        const status = getProgrammeStatus(programme.id);
                        const participantCount = getProgrammeEntryCount(programme);

                        return (
                          <tr key={programme.id} className="transition hover:bg-slate-50">
                            <td className="px-5 py-4 text-sm font-black text-slate-500">
                              #{index + 1}
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-black text-slate-950">
                                {programme.name}
                              </p>
                              <p className="mt-1 text-xs font-bold capitalize text-slate-500">
                                {programme.programme_type} •{" "}
                                {programme.stage_type === "off_stage"
                                  ? "Off-stage"
                                  : "Stage"}
                              </p>
                            </td>

                            <td className="px-5 py-4 text-sm font-bold text-slate-600">
                              {getCategoryName(programme.category_id)}
                            </td>

                            <td className="px-5 py-4 text-sm font-bold text-slate-600">
                              {participantCount} Participant
                              {participantCount === 1 ? "" : "s"}
                            </td>

                            <td className="px-5 py-4">
                              <StatusBadge status={status} />
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewProgramme(programme)}
                                  disabled={getProgrammeResults(programme.id).length === 0}
                                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                >
                                  <Eye size={15} />
                                  Open
                                </button>

                                {status === "published" ? (
                                  <button
                                    type="button"
                                    onClick={() => revokeProgramme(programme.id)}
                                    disabled={isPublishing}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                                  >
                                    <EyeOff size={15} />
                                    Revoke
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => publishProgramme(programme.id)}
                                    disabled={isPublishing || getProgrammeResults(programme.id).length === 0}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-3 py-2 text-xs font-black text-white transition hover:bg-violet-700 disabled:opacity-50"
                                  >
                                    <Rocket size={15} />
                                    Publish
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
            <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
              🏆 Live Team Points
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Based on published results only.
            </p>

            {teamPoints.length === 0 ? (
              <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
                No published points yet.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {teamPoints.map((team, index) => (
                  <div
                    key={team.teamId}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        {index === 0
                          ? "🥇 "
                          : index === 1
                            ? "🥈 "
                            : index === 2
                              ? "🥉 "
                              : ""}
                        {team.teamName}
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        Rank #{index + 1}
                      </p>
                    </div>

                    <p className="text-lg font-black text-violet-700">
                      {team.points} pts
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {previewProgramme && (
          <ResultPreviewModal
            programme={previewProgramme}
            entries={previewEntries}
            status={getProgrammeStatus(previewProgramme.id)}
            getPositionLabel={getPositionLabel}
            getTeamName={getTeamName}
            onClose={() => setPreviewProgramme(null)}
            onPublish={() => publishProgramme(previewProgramme.id)}
            onRevoke={() => revokeProgramme(previewProgramme.id)}
            isPublishing={isPublishing}
          />
        )}
      </div>
    </AdminShell>
  );
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "slate" | "blue" | "amber" | "green";
}) {
  const toneClass =
    tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "green"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-700";

  return (
    <div className={`rounded-[1.7rem] border p-5 shadow-xl shadow-slate-900/5 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em]">
        {label}
      </p>
      <p className="mt-4 text-4xl font-black tracking-[-0.08em]">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ResultStatus }) {
  if (status === "published") {
    return (
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black uppercase text-emerald-700">
        Published
      </span>
    );
  }

  if (status === "submitted") {
    return (
      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black uppercase text-amber-700">
        Submitted Draft
      </span>
    );
  }

  if (status === "in_progress") {
    return (
      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase text-blue-700">
        In Progress
      </span>
    );
  }

  return (
    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase text-slate-500">
      Pending
    </span>
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

function ResultPreviewModal({
  programme,
  entries,
  status,
  getPositionLabel,
  getTeamName,
  onClose,
  onPublish,
  onRevoke,
  isPublishing,
}: {
  programme: Programme;
  entries: ResultEntry[];
  status: ResultStatus;
  getPositionLabel: (position: number | null) => string;
  getTeamName: (id: string | null) => string;
  onClose: () => void;
  onPublish: () => void;
  onRevoke: () => void;
  isPublishing: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
              {programme.name}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Result Preview
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {entries.length === 0 ? (
            <EmptyState title="No result found" text="Enter marks first." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Rank</th>
                    <th className="px-5 py-4">Participant</th>
                    <th className="px-5 py-4">Team</th>
                    <th className="px-5 py-4">Mark</th>
                    <th className="px-5 py-4">Grade</th>
                    <th className="px-5 py-4">Points</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {entries.map((entry) => (
                    <tr key={entry.result.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            isDisqualifiedResult(entry.result)
                              ? "bg-red-50 text-red-700"
                              : isAbsentResult(entry.result)
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {isAbsentResult(entry.result)
                            ? "Absent"
                            : isDisqualifiedResult(entry.result)
                              ? "Disqualified"
                              : getPositionLabel(entry.result.position)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-slate-950">
                          {entry.participantTitle}
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          {entry.participantSubtitle}
                        </p>

                        {entry.memberNames.length > 1 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {entry.memberNames.map((name) => (
                              <span
                                key={name}
                                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-600">
                        {getTeamName(entry.teamId)}
                      </td>

                      <td className="px-5 py-4 text-lg font-black text-slate-950">
                        {Number(entry.result.total_mark).toFixed(2)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            isDisqualifiedResult(entry.result)
                              ? "bg-red-50 text-red-700"
                              : "bg-violet-50 text-violet-700"
                          }`}
                        >
                          {getResultDisplayGrade(entry.result)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-slate-700">
                        {getResultDisplayPoints(entry.result)} pts
                      </td>

                      <td className="px-5 py-4">
                        {entry.result.is_published ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            Published
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                            Submitted
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>

          {status === "published" ? (
            <button
              type="button"
              onClick={onRevoke}
              disabled={isPublishing}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:opacity-60"
            >
              <EyeOff size={17} />
              Revoke
            </button>
          ) : (
            <button
              type="button"
              onClick={onPublish}
              disabled={isPublishing || entries.length === 0}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white transition hover:bg-violet-700 disabled:opacity-60"
            >
              <Rocket size={17} />
              Publish Result
            </button>
          )}
        </div>
      </div>
    </div>
  );
}