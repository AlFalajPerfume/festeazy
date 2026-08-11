/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import {
  getAdminContext,
  type AdminContext,
  type OrganizationType,
} from "@/lib/admin-context";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Crown,
  ExternalLink,
  GraduationCap,
  ImageIcon,
  Layers3,
  Loader2,
  Mic2,
  Printer,
  RefreshCcw,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type Programme = {
  id: string;
  name: string;
  programme_type: string;
  stage_type: string;
  category_id: string | null;
  total_marks: number;
  sort_order: number;
};

type Registration = {
  id: string;
  programme_id: string | null;
  student_id: string | null;
  team_id: string | null;
  group_name: string | null;
};

type ProgrammeCode = {
  id: string;
  programme_id: string | null;
  registration_id: string | null;
  is_present: boolean | null;
};

type JudgeAssignment = {
  id: string;
  programme_id: string | null;
  judge_id: string | null;
};

type JudgeScore = {
  id: string;
  programme_id: string | null;
  registration_id: string | null;
  judge_id: string | null;
};

type ResultItem = {
  id: string;
  programme_id: string | null;
  registration_id: string | null;
  total_mark: number | null;
  grade: string | null;
  position: number | null;
  points: number | null;
  is_published: boolean;
  published_at: string | null;
};

type Team = {
  id: string;
  name: string;
  color: string | null;
};

type Student = {
  id: string;
  name: string;
  chest_no: string | null;
  team_id: string | null;
};

type SimpleItem = {
  id: string;
  name?: string | null;
};

type MeritCertificate = {
  id: string;
  result_id: string;
  student_id: string;
  issued_at: string | null;
  status: string;
};

type ProgrammeStatus = "pending" | "in_progress" | "submitted" | "published";

type Terms = {
  institution: string;
  institutionLower: string;
  teamPlural: string;
};

function getTerms(type: OrganizationType): Terms {
  if (type === "school") {
    return {
      institution: "School",
      institutionLower: "school",
      teamPlural: "Houses",
    };
  }

  if (type === "institution") {
    return {
      institution: "Institution",
      institutionLower: "institution",
      teamPlural: "Teams / Houses",
    };
  }

  return {
    institution: "Madrasa",
    institutionLower: "madrasa",
    teamPlural: "Teams",
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateRange(start: string, end: string) {
  if (!start && !end) return "-";
  if (!end || start === end) return formatDate(start || end);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function positionLabel(position: number | null) {
  if (position === 1) return "First Place";
  if (position === 2) return "Second Place";
  if (position === 3) return "Third Place";
  if (position === 4) return "Fourth Place";
  if (!position) return "Result";
  return `Position ${position}`;
}

function formatRelativeTime(value: string | null) {
  if (!value) return "Published";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Published";

  const difference = Date.now() - date.getTime();
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;

  return formatDate(value);
}

function getPlanStatus(planEnd: string) {
  if (!planEnd) {
    return {
      label: "Plan Active",
      helper: "No expiry date added",
      tone: "slate" as const,
      daysRemaining: null as number | null,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(planEnd);
  end.setHours(0, 0, 0, 0);

  if (Number.isNaN(end.getTime())) {
    return {
      label: "Plan Active",
      helper: "Expiry date unavailable",
      tone: "slate" as const,
      daysRemaining: null as number | null,
    };
  }

  const daysRemaining = Math.ceil(
    (end.getTime() - today.getTime()) / 86400000,
  );

  if (daysRemaining < 0) {
    return {
      label: "Plan Expired",
      helper: `Expired on ${formatDate(planEnd)}`,
      tone: "red" as const,
      daysRemaining,
    };
  }

  if (daysRemaining <= 7) {
    return {
      label: "Plan Expiring Soon",
      helper:
        daysRemaining === 0
          ? "Expires today"
          : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`,
      tone: "amber" as const,
      daysRemaining,
    };
  }

  return {
    label: "Plan Active",
    helper: `${daysRemaining} days remaining`,
    tone: "green" as const,
    daysRemaining,
  };
}

export default function DashboardPage() {
  const [context, setContext] = useState<AdminContext | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<SimpleItem[]>([]);
  const [classes, setClasses] = useState<SimpleItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [programmeCodes, setProgrammeCodes] = useState<ProgrammeCode[]>([]);
  const [judgeAssignments, setJudgeAssignments] = useState<JudgeAssignment[]>([]);
  const [judgeScores, setJudgeScores] = useState<JudgeScore[]>([]);
  const [judges, setJudges] = useState<SimpleItem[]>([]);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [certificates, setCertificates] = useState<MeritCertificate[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadDashboard();
  }, []);

  const terms = getTerms(context?.organizationType || "madrasa");
  const planStatus = getPlanStatus(context?.planEnd || "");

  const dashboard = useMemo(() => {
    const studentMap = new Map(students.map((student) => [student.id, student]));
    const programmeMap = new Map(
      programmes.map((programme) => [programme.id, programme]),
    );
    const registrationMap = new Map(
      registrations.map((registration) => [registration.id, registration]),
    );
    const teamMap = new Map(teams.map((team) => [team.id, team]));

    function programmeRegistrations(programmeId: string) {
      return registrations.filter(
        (registration) => registration.programme_id === programmeId,
      );
    }

    function entryCount(programme: Programme) {
      const rows = programmeRegistrations(programme.id);

      if (programme.programme_type !== "group") return rows.length;

      return new Set(
        rows.map(
          (row) =>
            `${row.team_id || "team"}:${row.group_name || row.id}`,
        ),
      ).size;
    }

    function programmeCodesFor(programmeId: string) {
      return programmeCodes.filter(
        (code) => code.programme_id === programmeId,
      );
    }

    function assignedJudgeIds(programmeId: string) {
      return Array.from(
        new Set(
          judgeAssignments
            .filter(
              (assignment) =>
                assignment.programme_id === programmeId &&
                assignment.judge_id,
            )
            .map((assignment) => assignment.judge_id as string),
        ),
      );
    }

    function submittedScorePairs(
      programmeId: string,
      presentRegistrationIds: Set<string>,
      assignedJudges: Set<string>,
    ) {
      return new Set(
        judgeScores
          .filter(
            (score) =>
              score.programme_id === programmeId &&
              Boolean(score.registration_id) &&
              Boolean(score.judge_id) &&
              presentRegistrationIds.has(score.registration_id as string) &&
              assignedJudges.has(score.judge_id as string),
          )
          .map(
            (score) =>
              `${score.registration_id as string}:${score.judge_id as string}`,
          ),
      );
    }

    function programmeResults(programmeId: string) {
      return results.filter((result) => result.programme_id === programmeId);
    }

    const programmeRows = programmes.map((programme) => {
      const entries = entryCount(programme);
      const codes = programmeCodesFor(programme.id);
      const generatedCodes = codes.length;
      const presentRegistrationIds = new Set(
        codes
          .filter((code) => code.is_present && code.registration_id)
          .map((code) => code.registration_id as string),
      );
      const judgeIds = assignedJudgeIds(programme.id);
      const assignedJudges = new Set(judgeIds);
      const completedScorePairs = submittedScorePairs(
        programme.id,
        presentRegistrationIds,
        assignedJudges,
      );
      const requiredMarks = presentRegistrationIds.size * judgeIds.length;
      const resultRows = programmeResults(programme.id);

      let status: ProgrammeStatus = "pending";

      if (resultRows.length > 0) {
        status = resultRows.every((result) => result.is_published)
          ? "published"
          : "submitted";
      } else if (generatedCodes > 0 || completedScorePairs.size > 0) {
        status = "in_progress";
      }

      return {
        programme,
        entries,
        generatedCodes,
        presentEntries: presentRegistrationIds.size,
        judges: judgeIds.length,
        requiredMarks,
        completedMarks: completedScorePairs.size,
        status,
      };
    });

    const totalEntries = programmeRows.reduce(
      (sum, row) => sum + row.entries,
      0,
    );
    const generatedCodes = programmeRows.reduce(
      (sum, row) => sum + row.generatedCodes,
      0,
    );
    const presentEntries = programmeRows.reduce(
      (sum, row) => sum + row.presentEntries,
      0,
    );
    const totalRequiredMarks = programmeRows.reduce(
      (sum, row) => sum + row.requiredMarks,
      0,
    );
    const completedMarks = programmeRows.reduce(
      (sum, row) => sum + row.completedMarks,
      0,
    );

    const pendingProgrammes = programmeRows.filter(
      (row) => row.status === "pending",
    ).length;
    const inProgressProgrammes = programmeRows.filter(
      (row) => row.status === "in_progress",
    ).length;
    const submittedProgrammes = programmeRows.filter(
      (row) => row.status === "submitted",
    ).length;
    const publishedProgrammes = programmeRows.filter(
      (row) => row.status === "published",
    ).length;

    const setupItems = [
      teams.length > 0,
      categories.length > 0,
      classes.length > 0,
      students.length > 0,
      programmes.length > 0,
      judges.length > 0,
    ];

    const setupPercent = Math.round(
      (setupItems.filter(Boolean).length / setupItems.length) * 100,
    );
    const greenRoomPercent =
      totalEntries > 0
        ? Math.min(100, Math.round((generatedCodes / totalEntries) * 100))
        : 0;
    const valuationPercent =
      totalRequiredMarks > 0
        ? Math.min(
            100,
            Math.round((completedMarks / totalRequiredMarks) * 100),
          )
        : 0;
    const publishingPercent =
      programmes.length > 0
        ? Math.round((publishedProgrammes / programmes.length) * 100)
        : 0;
    const overallProgress = Math.round(
      (setupPercent +
        greenRoomPercent +
        valuationPercent +
        publishingPercent) /
        4,
    );

    const noJudges = programmeRows.filter(
      (row) => row.entries > 0 && row.judges === 0,
    ).length;
    const noParticipants = programmeRows.filter(
      (row) => row.entries === 0,
    ).length;
    const greenRoomPending = programmeRows.filter(
      (row) => row.entries > 0 && row.generatedCodes < row.entries,
    ).length;
    const markingPending = programmeRows.filter(
      (row) =>
        row.requiredMarks > 0 &&
        row.completedMarks < row.requiredMarks &&
        row.status !== "submitted" &&
        row.status !== "published",
    ).length;

    const teamPointMap = new Map<string, number>();

    results
      .filter((result) => result.is_published)
      .forEach((result) => {
        const registration = result.registration_id
          ? registrationMap.get(result.registration_id)
          : null;
        const student = registration?.student_id
          ? studentMap.get(registration.student_id)
          : null;
        const teamId = registration?.team_id || student?.team_id || null;

        if (!teamId) return;

        teamPointMap.set(
          teamId,
          (teamPointMap.get(teamId) || 0) + Number(result.points || 0),
        );
      });

    const sortedTeams = Array.from(teamPointMap.entries())
      .map(([teamId, points]) => ({
        teamId,
        name: teamMap.get(teamId)?.name || "Team",
        points,
      }))
      .sort((first, second) => {
        if (second.points !== first.points) return second.points - first.points;
        return first.name.localeCompare(second.name);
      });

    let previousPoints: number | null = null;
    let currentRank = 0;

    const topTeams = sortedTeams.slice(0, 5).map((team, index) => {
      if (previousPoints === null || team.points !== previousPoints) {
        currentRank = index + 1;
        previousPoints = team.points;
      }

      return { ...team, rank: currentRank };
    });

    const certificateCandidateKeys = new Set<string>();

    results
      .filter(
        (result) =>
          result.is_published &&
          String(result.grade || "").trim().toLowerCase() !== "absent",
      )
      .forEach((result) => {
        const programme = result.programme_id
          ? programmeMap.get(result.programme_id)
          : null;
        const registration = result.registration_id
          ? registrationMap.get(result.registration_id)
          : null;

        if (!programme || !registration) return;

        if (programme.programme_type === "group") {
          registrations
            .filter(
              (row) =>
                row.programme_id === programme.id &&
                row.team_id === registration.team_id &&
                row.group_name === registration.group_name &&
                row.student_id,
            )
            .forEach((row) => {
              certificateCandidateKeys.add(
                `${result.id}:${row.student_id as string}`,
              );
            });
          return;
        }

        if (registration.student_id) {
          certificateCandidateKeys.add(
            `${result.id}:${registration.student_id}`,
          );
        }
      });

    const issuedCertificateKeys = new Set(
      certificates.map(
        (certificate) =>
          `${certificate.result_id}:${certificate.student_id}`,
      ),
    );

    const pendingCertificates = Array.from(certificateCandidateKeys).filter(
      (key) => !issuedCertificateKeys.has(key),
    ).length;

    const recentResults = results
      .filter((result) => result.is_published)
      .sort((first, second) => {
        const firstTime = first.published_at
          ? new Date(first.published_at).getTime()
          : 0;
        const secondTime = second.published_at
          ? new Date(second.published_at).getTime()
          : 0;
        return secondTime - firstTime;
      })
      .slice(0, 5)
      .map((result) => {
        const programme = result.programme_id
          ? programmeMap.get(result.programme_id)
          : null;
        const registration = result.registration_id
          ? registrationMap.get(result.registration_id)
          : null;
        const student = registration?.student_id
          ? studentMap.get(registration.student_id)
          : null;
        const teamId = registration?.team_id || student?.team_id || null;

        return {
          id: result.id,
          programmeName: programme?.name || "Programme",
          participantName:
            registration?.group_name || student?.name || "Participant",
          chestNo: registration?.group_name ? "" : student?.chest_no || "",
          teamName: teamId ? teamMap.get(teamId)?.name || "-" : "-",
          position: positionLabel(result.position),
          publishedAt: formatRelativeTime(result.published_at),
        };
      });

    return {
      totalEntries,
      generatedCodes,
      presentEntries,
      completedMarks,
      totalRequiredMarks,
      pendingProgrammes,
      inProgressProgrammes,
      submittedProgrammes,
      publishedProgrammes,
      setupPercent,
      greenRoomPercent,
      valuationPercent,
      publishingPercent,
      overallProgress,
      noJudges,
      noParticipants,
      greenRoomPending,
      markingPending,
      topTeams,
      issuedCertificates: certificates.length,
      pendingCertificates,
      recentResults,
    };
  }, [
    teams,
    categories,
    classes,
    students,
    programmes,
    registrations,
    programmeCodes,
    judgeAssignments,
    judgeScores,
    judges,
    results,
    certificates,
  ]);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  }

  async function loadDashboard(forceRefresh = false) {
    if (forceRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    setError("");

    const { context: loadedContext, error: contextError } =
      await getAdminContext({ forceRefresh });

    if (contextError || !loadedContext) {
      setError(contextError || "Unable to load the active event.");
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    setContext(loadedContext);

    const organizationId = loadedContext.organizationId;
    const eventId = loadedContext.eventId;

    const [
      teamRes,
      categoryRes,
      classRes,
      studentRes,
      programmeRes,
      registrationRes,
      codeRes,
      assignmentRes,
      scoreRes,
      judgeRes,
      resultRes,
    ] = await Promise.all([
      supabase
        .from("teams")
        .select("id, name, color")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId),
      supabase
        .from("categories")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId),
      supabase
        .from("classes")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId),
      supabase
        .from("students")
        .select("id, name, chest_no, team_id")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .eq("status", "active"),
      supabase
        .from("programmes")
        .select(
          "id, name, programme_type, stage_type, category_id, total_marks, sort_order",
        )
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .eq("status", "active")
        .order("sort_order", { ascending: true }),
      fetchAllRows<Registration>((from, to) =>
        supabase
          .from("programme_registrations")
          .select("id, programme_id, student_id, team_id, group_name")
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .order("id", { ascending: true })
          .range(from, to),
      )
        .then((data) => ({ data, error: null }))
        .catch((error) => ({ data: null, error })),
      fetchAllRows<ProgrammeCode>((from, to) =>
        supabase
          .from("programme_codes")
          .select("id, programme_id, registration_id, is_present")
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .order("id", { ascending: true })
          .range(from, to),
      )
        .then((data) => ({ data, error: null }))
        .catch((error) => ({ data: null, error })),
      supabase
        .from("judge_assignments")
        .select("id, programme_id, judge_id")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId),
      fetchAllRows<JudgeScore>((from, to) =>
        supabase
          .from("judge_scores")
          .select("id, programme_id, registration_id, judge_id")
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .order("id", { ascending: true })
          .range(from, to),
      )
        .then((data) => ({ data, error: null }))
        .catch((error) => ({ data: null, error })),
      supabase
        .from("judges")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .eq("is_active", true),
      fetchAllRows<ResultItem>((from, to) =>
        supabase
          .from("results")
          .select(
            "id, programme_id, registration_id, total_mark, grade, position, points, is_published, published_at",
          )
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .order("id", { ascending: true })
          .range(from, to),
      )
        .then((data) => ({ data, error: null }))
        .catch((error) => ({ data: null, error })),
    ]);

    const requiredErrors = [
      teamRes.error,
      categoryRes.error,
      classRes.error,
      studentRes.error,
      programmeRes.error,
      registrationRes.error,
      codeRes.error,
      assignmentRes.error,
      scoreRes.error,
      judgeRes.error,
      resultRes.error,
    ].filter(Boolean);

    if (requiredErrors.length > 0) {
      setError(requiredErrors[0]?.message || "Unable to load dashboard data.");
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    setTeams((teamRes.data || []) as Team[]);
    setCategories((categoryRes.data || []) as SimpleItem[]);
    setClasses((classRes.data || []) as SimpleItem[]);
    setStudents((studentRes.data || []) as Student[]);
    setProgrammes((programmeRes.data || []) as Programme[]);
    setRegistrations((registrationRes.data || []) as Registration[]);
    setProgrammeCodes((codeRes.data || []) as ProgrammeCode[]);
    setJudgeAssignments((assignmentRes.data || []) as JudgeAssignment[]);
    setJudgeScores((scoreRes.data || []) as JudgeScore[]);
    setJudges((judgeRes.data || []) as SimpleItem[]);
    setResults((resultRes.data || []) as ResultItem[]);

    try {
      const token = await getAccessToken();

      if (token) {
        const response = await fetch("/api/admin/certificates", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const payload = await response.json().catch(() => ({}));

        if (response.ok) {
          setCertificates(
            (payload.certificates || []) as MeritCertificate[],
          );
        } else {
          console.warn(
            "Certificate dashboard counts unavailable:",
            payload.error || response.statusText,
          );
          setCertificates([]);
        }
      }
    } catch (certificateError) {
      console.warn(
        "Certificate dashboard counts unavailable:",
        certificateError,
      );
      setCertificates([]);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }

  function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  if (isLoading) {
    return (
      <AdminShell
        title="Dashboard"
        subtitle="Loading your Festeazy event dashboard..."
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-500 shadow-xl shadow-slate-900/5">
            <Loader2 className="animate-spin" size={20} />
            Loading dashboard...
          </div>
        </div>
      </AdminShell>
    );
  }

  if (error || !context) {
    return (
      <AdminShell title="Dashboard" subtitle="Festeazy control panel">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-red-200 bg-red-50 p-6 shadow-xl shadow-red-900/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-1 text-red-700" size={22} />
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-black tracking-[-0.05em] text-red-950">
                Dashboard Error
              </h2>
              <p className="mt-2 text-sm font-bold leading-6 text-red-700">
                {error || "Unable to load the dashboard."}
              </p>
              <button
                type="button"
                onClick={() => void loadDashboard(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-black text-white"
              >
                <RefreshCcw size={16} />
                Try Again
              </button>
            </div>
          </div>
        </div>
      </AdminShell>
    );
  }

  const publicPageAvailable =
    context.eventIsPublic && Boolean(context.publicSlug);

  return (
    <AdminShell
      title="Dashboard"
      subtitle={`Live control room for your ${terms.institutionLower} event.`}
    >
      <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
        <section className="overflow-hidden rounded-[1.5rem] border border-violet-100 bg-white shadow-xl shadow-slate-900/5 sm:rounded-[2rem]">
          <div className="grid gap-4 bg-gradient-to-br from-violet-700 via-violet-800 to-slate-950 p-4 text-white sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-8">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="hidden items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/70 sm:inline-flex">
                    <Sparkles size={14} />
                    Festeazy Control Dashboard
                  </div>

                  <h1 className="text-2xl font-black tracking-[-0.07em] sm:mt-5 sm:text-4xl md:text-5xl">
                    {getGreeting()}, Admin!
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={() => void loadDashboard(true)}
                  disabled={isRefreshing}
                  aria-label="Refresh dashboard"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15 disabled:opacity-60 sm:h-11 sm:w-auto sm:gap-2 sm:px-4"
                >
                  <RefreshCcw
                    size={16}
                    className={isRefreshing ? "animate-spin" : ""}
                  />
                  <span className="hidden text-sm font-black sm:inline">Refresh</span>
                </button>
              </div>

              <p className="mt-2 max-w-2xl text-xs font-bold leading-5 text-white/70 sm:mt-3 sm:text-sm sm:leading-6">
                {context.eventTitle || "Event Dashboard"} is active for{" "}
                {context.organizationName || `your ${terms.institutionLower}`}.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:gap-3">
                {publicPageAvailable ? (
                  <Link
                    href={`/event/${context.publicSlug}`}
                    target="_blank"
                    className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl bg-white px-2 py-2.5 text-[11px] font-black text-slate-950 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 sm:gap-2 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm"
                  >
                    <ExternalLink size={17} />
                    Open Public Page
                  </Link>
                ) : (
                  <div className="inline-flex min-w-0 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-white/10 px-2 py-2.5 text-center text-[10px] font-black leading-4 text-white/55 ring-1 ring-white/15 sm:gap-2 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm">
                    <ExternalLink size={17} />
                    Public Page Not Enabled
                  </div>
                )}

                <Link
                  href="/admin/results"
                  className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2 py-2.5 text-[11px] font-black text-white transition hover:bg-white/15 sm:gap-2 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm"
                >
                  <Rocket size={17} />
                  Publish Results
                </Link>

                <Link
                  href="/admin/green-room"
                  className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-2 py-2.5 text-[11px] font-black text-white transition hover:bg-white/15 sm:gap-2 sm:rounded-2xl sm:px-5 sm:py-3 sm:text-sm"
                >
                  <ShieldCheck size={17} />
                  Green Room
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/10 p-4 backdrop-blur sm:rounded-[1.7rem] sm:p-5">
                <div className="flex items-center justify-between gap-3 sm:block">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50 sm:text-xs sm:tracking-[0.18em]">
                      Overall Event Progress
                    </p>
                    <p className="mt-1 text-3xl font-black tracking-[-0.08em] sm:hidden">
                      {dashboard.overallProgress}%
                    </p>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black text-white/70 sm:hidden">
                    Live
                  </span>
                </div>

                <div className="mt-3 sm:hidden">
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-violet-300"
                      style={{ width: `${dashboard.overallProgress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] font-bold text-white/55">
                    Setup, judging and publication combined
                  </p>
                </div>

                <div className="mt-4 hidden items-center gap-5 sm:flex">
                  <CompletionRing value={dashboard.overallProgress} />

                  <div>
                    <p className="text-5xl font-black tracking-[-0.09em]">
                      {dashboard.overallProgress}%
                    </p>
                    <p className="mt-1 text-sm font-bold text-white/60">
                      Current event completion
                    </p>
                  </div>
                </div>
              </div>

              <PlanStatusCard
                label={planStatus.label}
                helper={planStatus.helper}
                tone={planStatus.tone}
              />
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto border-t border-slate-100 p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-4 sm:p-5 lg:grid-cols-4">
            <EventInfoCard
              label={terms.institution}
              value={context.organizationName || "-"}
            />
            <EventInfoCard
              label="Event Date"
              value={formatDateRange(
                context.eventStartDate,
                context.eventEndDate,
              )}
            />
            <EventInfoCard
              label="Venue"
              value={context.eventVenue || context.organizationPlace || "-"}
            />
            <EventInfoCard label="Role" value={context.role || "admin"} />
          </div>
        </section>

        <section className="-mx-3 flex snap-x gap-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 xl:grid-cols-6">
          <MetricCard
            title="Students"
            value={students.length}
            subtitle="Active students"
            icon={<GraduationCap size={22} />}
            tone="blue"
            href="/admin/students"
          />
          <MetricCard
            title="Programmes"
            value={programmes.length}
            subtitle={`${dashboard.publishedProgrammes} published`}
            icon={<Mic2 size={22} />}
            tone="violet"
            href="/admin/programmes"
          />
          <MetricCard
            title="Participants"
            value={dashboard.totalEntries}
            subtitle="Competition entries"
            icon={<Users size={22} />}
            tone="cyan"
            href="/admin/participants"
          />
          <MetricCard
            title="Published"
            value={dashboard.publishedProgrammes}
            subtitle={`${dashboard.submittedProgrammes} waiting`}
            icon={<Trophy size={22} />}
            tone="green"
            href="/admin/results"
          />
          <MetricCard
            title="Certificates"
            value={dashboard.issuedCertificates}
            subtitle="Issued and printed"
            icon={<Award size={22} />}
            tone="amber"
            href="/admin/certificates"
          />
          <MetricCard
            title="Pending Merit"
            value={dashboard.pendingCertificates}
            subtitle="Ready to print"
            icon={<Printer size={22} />}
            tone={dashboard.pendingCertificates > 0 ? "rose" : "green"}
            href="/admin/certificates"
          />
        </section>

        <details className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-lg shadow-slate-900/5 xl:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0">
              <p className="text-base font-black text-slate-950">Workflow Details</p>
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                Tap to view setup, Green Room, marking and result progress.
              </p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 transition group-open:rotate-180">
              <BarChart3 size={17} />
            </span>
          </summary>

          <div className="border-t border-slate-100 px-4 pb-5 pt-4">
            <div className="space-y-4">
              <ProgressRow
                label="Event Setup"
                value={dashboard.setupPercent}
                helper="Core event data and users"
              />
              <ProgressRow
                label="Green Room"
                value={dashboard.greenRoomPercent}
                helper={`${dashboard.generatedCodes}/${dashboard.totalEntries} codes generated`}
              />
              <ProgressRow
                label="Marking"
                value={dashboard.valuationPercent}
                helper={`${dashboard.completedMarks}/${dashboard.totalRequiredMarks} marks submitted`}
              />
              <ProgressRow
                label="Published"
                value={dashboard.publishingPercent}
                helper={`${dashboard.publishedProgrammes}/${programmes.length} programmes`}
              />
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {[
                ["Pending", dashboard.pendingProgrammes, "bg-slate-100 text-slate-700"],
                ["Running", dashboard.inProgressProgrammes, "bg-blue-50 text-blue-700"],
                ["Ready", dashboard.submittedProgrammes, "bg-amber-50 text-amber-700"],
                ["Live", dashboard.publishedProgrammes, "bg-emerald-50 text-emerald-700"],
              ].map(([label, value, className]) => (
                <div key={String(label)} className={`rounded-xl px-2 py-2.5 text-center ${className}`}>
                  <p className="text-lg font-black">{value}</p>
                  <p className="mt-0.5 truncate text-[9px] font-black uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </details>

        <section className="hidden gap-6 xl:grid xl:grid-cols-2">
          <DashboardPanel
            title="Workflow Progress"
            description="Setup, Green Room, judging and publication progress."
            icon={<BarChart3 size={24} />}
            iconClass="bg-violet-50 text-violet-700"
          >
            <div className="mt-6 space-y-5">
              <ProgressRow
                label="Event Setup"
                value={dashboard.setupPercent}
                helper="Teams, categories, classes, students, programmes and judges"
              />
              <ProgressRow
                label="Green Room Codes"
                value={dashboard.greenRoomPercent}
                helper={`${dashboard.generatedCodes}/${dashboard.totalEntries} competition codes generated`}
              />
              <ProgressRow
                label="Judge Valuation"
                value={dashboard.valuationPercent}
                helper={`${dashboard.completedMarks}/${dashboard.totalRequiredMarks} required present-entry marks completed`}
              />
              <ProgressRow
                label="Result Publishing"
                value={dashboard.publishingPercent}
                helper={`${dashboard.publishedProgrammes}/${programmes.length} programmes published`}
              />
            </div>
          </DashboardPanel>

          <DashboardPanel
            title="Programme Status"
            description="Current status of all active programmes."
            icon={<ClipboardCheck size={24} />}
            iconClass="bg-blue-50 text-blue-700"
          >
            <div className="mt-6">
              <StatusBarChart
                total={programmes.length}
                items={[
                  {
                    label: "Pending",
                    value: dashboard.pendingProgrammes,
                    tone: "slate",
                  },
                  {
                    label: "In Progress",
                    value: dashboard.inProgressProgrammes,
                    tone: "blue",
                  },
                  {
                    label: "Submitted",
                    value: dashboard.submittedProgrammes,
                    tone: "amber",
                  },
                  {
                    label: "Published",
                    value: dashboard.publishedProgrammes,
                    tone: "green",
                  },
                ]}
              />
            </div>
          </DashboardPanel>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <DashboardPanel
            title="Needs Attention"
            description="Open items that may delay the event workflow."
            icon={<Zap size={24} />}
            iconClass="bg-red-50 text-red-700"
          >
            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 lg:grid-cols-3">
              <AttentionItem
                label="No Judges Assigned"
                value={dashboard.noJudges}
                href="/admin/judges"
                tone={dashboard.noJudges > 0 ? "red" : "green"}
              />
              <AttentionItem
                label="No Participants"
                value={dashboard.noParticipants}
                href="/admin/participants"
                tone={dashboard.noParticipants > 0 ? "amber" : "green"}
              />
              <AttentionItem
                label="Green Room Pending"
                value={dashboard.greenRoomPending}
                href="/admin/green-room"
                tone={dashboard.greenRoomPending > 0 ? "blue" : "green"}
              />
              <AttentionItem
                label="Marking Pending"
                value={dashboard.markingPending}
                href="/admin/mark-entry"
                tone={dashboard.markingPending > 0 ? "amber" : "green"}
              />
              <AttentionItem
                label="Submitted Not Published"
                value={dashboard.submittedProgrammes}
                href="/admin/results"
                tone={dashboard.submittedProgrammes > 0 ? "violet" : "green"}
              />
              <AttentionItem
                label="Certificates Pending"
                value={dashboard.pendingCertificates}
                href="/admin/certificates"
                tone={dashboard.pendingCertificates > 0 ? "blue" : "green"}
              />
            </div>
          </DashboardPanel>

          <DashboardPanel
            title={`Live ${terms.teamPlural} Points`}
            description="Calculated from published results only."
            icon={<Trophy size={24} />}
            iconClass="bg-emerald-50 text-emerald-700"
          >
            {dashboard.topTeams.length === 0 ? (
              <EmptyState text="No published team points yet." />
            ) : (
              <div className="mt-6 space-y-3">
                {dashboard.topTeams.map((team) => (
                  <div
                    key={team.teamId}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">
                        {team.rank === 1
                          ? "🥇 "
                          : team.rank === 2
                            ? "🥈 "
                            : team.rank === 3
                              ? "🥉 "
                              : ""}
                        {team.name}
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        Rank #{team.rank}
                      </p>
                    </div>

                    <p className="ml-3 shrink-0 text-lg font-black text-violet-700">
                      {team.points} pts
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>
        </section>

        <section className="grid gap-4 sm:gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <DashboardPanel
            title="Recent Published Results"
            description="The latest result activity from the public event."
            icon={<Clock3 size={24} />}
            iconClass="bg-cyan-50 text-cyan-700"
          >
            {dashboard.recentResults.length === 0 ? (
              <EmptyState text="No published results yet." />
            ) : (
              <div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
                {dashboard.recentResults.map((result, index) => (
                  <div
                    key={result.id}
                    className={`${index >= 3 ? "hidden sm:flex" : "flex"} items-start justify-between gap-4 bg-white px-4 py-3 sm:py-4`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">
                        {result.programmeName}
                      </p>
                      <p className="mt-1 truncate text-xs font-bold text-slate-500">
                        {result.chestNo ? `#${result.chestNo} ` : ""}
                        {result.participantName} · {result.teamName}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xs font-black text-violet-700">
                        {result.position}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-slate-400">
                        {result.publishedAt}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardPanel>

          <div className="hidden sm:block">
            <DashboardPanel
            title="Event Snapshot"
            description="Useful live totals for the event team."
            icon={<Crown size={24} />}
            iconClass="bg-amber-50 text-amber-700"
          >
            <div className="mt-6 grid grid-cols-2 gap-3">
              <SnapshotStat label="Active Judges" value={judges.length} />
              <SnapshotStat
                label="Judge Assignments"
                value={judgeAssignments.length}
              />
              <SnapshotStat
                label="Present Entries"
                value={dashboard.presentEntries}
              />
              <SnapshotStat
                label="Marks Submitted"
                value={dashboard.completedMarks}
              />
              <SnapshotStat label={terms.teamPlural} value={teams.length} />
              <SnapshotStat label="Categories" value={categories.length} />
            </div>
            </DashboardPanel>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-[-0.06em] text-slate-950">
                Quick Actions
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Open the most-used event tools.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:hidden">
            <QuickAction
              title="Marks"
              href="/admin/mark-entry"
              icon={<UserCheck size={19} />}
            />
            <QuickAction
              title="Posters"
              href="/admin/posters"
              icon={<ImageIcon size={19} />}
            />
            <QuickAction
              title="Certificates"
              href="/admin/certificates"
              icon={<Award size={19} />}
            />
            <QuickAction
              title="Reports"
              href="/admin/reports"
              icon={<Printer size={19} />}
            />
          </div>

          <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <QuickAction
              title="Participants"
              href="/admin/participants"
              icon={<UserPlus size={21} />}
            />
            <QuickAction
              title="Green Room"
              href="/admin/green-room"
              icon={<ShieldCheck size={21} />}
            />
            <QuickAction
              title="Mark Entry"
              href="/admin/mark-entry"
              icon={<UserCheck size={21} />}
            />
            <QuickAction
              title="Results"
              href="/admin/results"
              icon={<Trophy size={21} />}
            />
            <QuickAction
              title="Poster Studio"
              href="/admin/posters"
              icon={<ImageIcon size={21} />}
            />
            <QuickAction
              title="Certificates"
              href="/admin/certificates"
              icon={<Award size={21} />}
            />
            <QuickAction
              title="Reports"
              href="/admin/reports"
              icon={<Printer size={21} />}
            />
          </div>
        </section>

        <section className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          <SmallStat
            title={terms.teamPlural}
            value={teams.length}
            icon={<Users size={20} />}
            href="/admin/teams"
          />
          <SmallStat
            title="Categories"
            value={categories.length}
            icon={<Layers3 size={20} />}
            href="/admin/categories"
          />
          <SmallStat
            title="Classes"
            value={classes.length}
            icon={<GraduationCap size={20} />}
            href="/admin/categories"
          />
          <SmallStat
            title="Schedule"
            value="Open"
            icon={<CalendarDays size={20} />}
            href="/admin/schedule"
          />
        </section>
      </div>
    </AdminShell>
  );
}

function DashboardPanel({
  title,
  description,
  icon,
  iconClass,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  iconClass: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:rounded-[2rem] sm:p-6 sm:shadow-xl">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-black tracking-[-0.05em] text-slate-950 sm:text-2xl">
            {title}
          </h2>
          <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
            {description}
          </p>
        </div>
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
      {children}
    </div>
  );
}

function EventInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="w-44 shrink-0 rounded-2xl bg-slate-50 p-3.5 sm:w-auto sm:min-w-0 sm:p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 truncate text-sm font-black capitalize text-slate-950">
        {value}
      </p>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  tone,
  href,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: ReactNode;
  tone: "violet" | "blue" | "cyan" | "amber" | "green" | "rose";
  href: string;
}) {
  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : tone === "cyan"
        ? "bg-cyan-50 text-cyan-700"
        : tone === "amber"
          ? "bg-amber-50 text-amber-700"
          : tone === "green"
            ? "bg-emerald-50 text-emerald-700"
            : tone === "rose"
              ? "bg-rose-50 text-rose-700"
              : "bg-violet-50 text-violet-700";

  return (
    <Link
      href={href}
      className="w-[9.25rem] shrink-0 snap-start rounded-[1.35rem] border border-slate-200 bg-white p-3.5 shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-xl sm:w-auto sm:min-w-0 sm:p-5"
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl ${toneClass}`}
      >
        {icon}
      </div>
      <p className="mt-3 text-2xl font-black tracking-[-0.08em] text-slate-950 sm:mt-4 sm:text-4xl">
        {value}
      </p>
      <p className="mt-1 truncate text-sm font-black text-slate-600">
        {title}
      </p>
      <p className="mt-1 truncate text-[11px] font-bold text-slate-400">
        {subtitle}
      </p>
    </Link>
  );
}

function CompletionRing({ value }: { value: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const progressLength = (clampedValue / 100) * circumference;

  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="11"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={`${progressLength} ${circumference}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-xl font-black text-white">{clampedValue}%</p>
      </div>
    </div>
  );
}

function PlanStatusCard({
  label,
  helper,
  tone,
}: {
  label: string;
  helper: string;
  tone: "green" | "amber" | "red" | "slate";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-300/30 bg-red-400/15 text-red-50"
      : tone === "amber"
        ? "border-amber-300/30 bg-amber-400/15 text-amber-50"
        : tone === "green"
          ? "border-emerald-300/30 bg-emerald-400/15 text-emerald-50"
          : "border-white/10 bg-white/10 text-white";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] opacity-70">
            Subscription
          </p>
          <p className="mt-1 text-sm font-black">{label}</p>
        </div>
        {tone === "green" ? (
          <CheckCircle2 size={20} className="shrink-0" />
        ) : tone === "slate" ? (
          <Clock3 size={20} className="shrink-0" />
        ) : (
          <AlertCircle size={20} className="shrink-0" />
        )}
      </div>
      <p className="mt-2 text-xs font-bold opacity-70">{helper}</p>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  helper,
}: {
  label: string;
  value: number;
  helper: string;
}) {
  const safeValue = Math.min(100, Math.max(0, value));

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-950">{label}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-400">
            {helper}
          </p>
        </div>
        <p className="shrink-0 text-sm font-black text-violet-700">
          {safeValue}%
        </p>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-violet-600 transition-all"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function StatusBarChart({
  total,
  items,
}: {
  total: number;
  items: {
    label: string;
    value: number;
    tone: "slate" | "blue" | "amber" | "green";
  }[];
}) {
  return (
    <div className="space-y-5">
      {items.map((item) => {
        const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
        const barClass =
          item.tone === "blue"
            ? "bg-blue-500"
            : item.tone === "amber"
              ? "bg-amber-500"
              : item.tone === "green"
                ? "bg-emerald-500"
                : "bg-slate-400";

        return (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-black text-slate-700">{item.label}</p>
              <p className="text-sm font-black text-slate-950">
                {item.value}{" "}
                <span className="text-xs text-slate-400">({percent}%)</span>
              </p>
            </div>
            <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${barClass}`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AttentionItem({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone: "red" | "amber" | "blue" | "violet" | "green";
}) {
  const toneClass =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "blue"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : tone === "green"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-violet-200 bg-violet-50 text-violet-700";

  return (
    <Link
      href={href}
      className={`min-w-0 rounded-xl border p-3 transition hover:-translate-y-0.5 sm:rounded-2xl sm:p-4 ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-black leading-4 sm:text-sm sm:leading-5">{label}</p>
        {value === 0 ? (
          <CheckCircle2 size={18} className="shrink-0" />
        ) : (
          <AlertCircle size={18} className="shrink-0" />
        )}
      </div>
      <p className="mt-2 text-2xl font-black tracking-[-0.07em] sm:mt-3 sm:text-3xl">{value}</p>
    </Link>
  );
}

function QuickAction({
  title,
  href,
  icon,
}: {
  title: string;
  href: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[5.25rem] min-w-0 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-center shadow-sm shadow-slate-900/5 transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl sm:min-h-28 sm:rounded-[1.5rem] sm:p-4 sm:shadow-lg"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white sm:h-11 sm:w-11 sm:rounded-2xl">
        {icon}
      </div>
      <p className="mt-2 line-clamp-2 text-[10px] font-black leading-3.5 text-slate-800 sm:mt-3 sm:text-sm sm:leading-5">{title}</p>
    </Link>
  );
}

function SnapshotStat({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-[-0.06em] text-slate-950">
        {value}
      </p>
    </div>
  );
}

function SmallStat({
  title,
  value,
  icon,
  href,
}: {
  title: string;
  value: number | string;
  icon: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div>
        <p className="text-sm font-black text-slate-500">{title}</p>
        <p className="mt-1 text-2xl font-black tracking-[-0.06em] text-slate-950">
          {value}
        </p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-3 text-slate-600">{icon}</div>
    </Link>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}