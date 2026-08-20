/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import {
  Award,
  BookOpen,
  Loader2,
  Medal,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type OrganizationUser = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string | null;
  is_active: boolean | null;
};

type EventInfo = {
  id: string;
  organization_id: string;
  title: string;
  public_slug: string;
  is_public: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type Student = {
  id: string;
  organization_id: string;
  event_id: string;
  chest_no: string | null;
  admission_no: string | null;
  name: string;
  gender: string | null;
  class_id: string | null;
  category_id: string | null;
  team_id: string | null;
  status: string | null;
};

type Programme = {
  id: string;
  organization_id: string;
  event_id: string;
  name: string;
  programme_type: string | null;
  stage_type: string | null;
  category_id: string | null;
  gender_scope: string | null;
  status: string | null;
};

type Participant = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_id: string | null;
  student_id: string | null;
  team_id: string | null;
  group_name?: string | null;
  registration_no?: string | null;
  status: string | null;
};

type ResultRow = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_id: string;
  registration_id: string | null;
  total_mark: number | null;
  average_mark: number | null;
  grade: string | null;
  position: number | null;
  points: number | null;
  is_published: boolean | null;
};

type Category = {
  id: string;
  name: string;
};

type Team = {
  id: string;
  name: string;
};

type ScorerRow = {
  student: Student;
  teamName: string;
  categoryName: string;
  totalPoints: number;
  stagePoints: number;
  offStagePoints: number;
  groupPoints: number;
  highestMark: number;
  resultCount: number;
  rank: number;
};

export default function TopScorersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeEvent, setActiveEvent] = useState<EventInfo | null>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [includeGroupProgrammes, setIncludeGroupProgrammes] = useState(false);
  const [selectedGroupProgrammeId, setSelectedGroupProgrammeId] =
    useState("all");

  useEffect(() => {
    loadTopScorers();
  }, []);

  async function loadTopScorers() {
    setIsLoading(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setError("Please login again.");
      setIsLoading(false);
      return;
    }

    const { data: orgUserData, error: orgUserError } = await supabase
      .from("organization_users")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (orgUserError) {
      setError(orgUserError.message);
      setIsLoading(false);
      return;
    }

    if (!orgUserData) {
      setError("This login is not connected to any madrasa.");
      setIsLoading(false);
      return;
    }

    const orgUser = orgUserData as OrganizationUser;

    let { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("organization_id", orgUser.organization_id)
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!eventData && !eventError) {
      const fallbackEvent = await supabase
        .from("events")
        .select("*")
        .eq("organization_id", orgUser.organization_id)
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      eventData = fallbackEvent.data;
      eventError = fallbackEvent.error;
    }

    if (eventError) {
      setError(eventError.message);
      setIsLoading(false);
      return;
    }

    if (!eventData) {
      setError("No event found. Please create event setup first.");
      setIsLoading(false);
      return;
    }

    const eventInfo = eventData as EventInfo;
    setActiveEvent(eventInfo);

    const [
      studentsRes,
      programmesRes,
      participantsRes,
      resultsRes,
      categoriesRes,
      teamsRes,
    ] = await Promise.all([
      supabase
        .from("students")
        .select("*")
        .eq("organization_id", orgUser.organization_id)
        .eq("event_id", eventInfo.id),
      supabase
        .from("programmes")
        .select("*")
        .eq("organization_id", orgUser.organization_id)
        .eq("event_id", eventInfo.id),
      supabase
  .from("programme_registrations")
  .select("*")
  .eq("organization_id", orgUser.organization_id)
  .eq("event_id", eventInfo.id),
      supabase
        .from("results")
        .select("*")
        .eq("organization_id", orgUser.organization_id)
        .eq("event_id", eventInfo.id)
        .eq("is_published", true),
      supabase
  .from("categories")
  .select("id,name")
  .eq("organization_id", orgUser.organization_id)
  .eq("event_id", eventInfo.id),

supabase
  .from("teams")
  .select("id,name")
  .eq("organization_id", orgUser.organization_id)
  .eq("event_id", eventInfo.id),
    ]);

    const firstError =
      studentsRes.error ||
      programmesRes.error ||
      participantsRes.error ||
      resultsRes.error ||
      categoriesRes.error ||
      teamsRes.error;

    if (firstError) {
      setError(firstError.message);
      setIsLoading(false);
      return;
    }

    setStudents((studentsRes.data || []) as Student[]);
    setProgrammes((programmesRes.data || []) as Programme[]);
    setParticipants((participantsRes.data || []) as Participant[]);
    setResults((resultsRes.data || []) as ResultRow[]);
    setCategories((categoriesRes.data || []) as Category[]);
    setTeams((teamsRes.data || []) as Team[]);

    setIsLoading(false);
  }

  const categoryMap = useMemo(() => {
    return new Map(categories.map((item) => [item.id, item.name]));
  }, [categories]);

  const teamMap = useMemo(() => {
    return new Map(teams.map((item) => [item.id, item.name]));
  }, [teams]);

  const groupProgrammes = useMemo(() => {
    return programmes
      .filter(
        (programme) =>
          String(programme.programme_type || "")
            .trim()
            .toLowerCase() === "group",
      )
      .sort((first, second) =>
        String(first.name || "").localeCompare(String(second.name || "")),
      );
  }, [programmes]);

  const scorerRows = useMemo<ScorerRow[]>(() => {
    const studentMap = new Map(students.map((item) => [item.id, item]));
    const programmeMap = new Map(programmes.map((item) => [item.id, item]));
    const participantMap = new Map(participants.map((item) => [item.id, item]));

    const scorerMap = new Map<string, ScorerRow>();

    const getOrCreateScorer = (student: Student) => {
      const current = scorerMap.get(student.id);

      if (current) {
        return current;
      }

      const created: ScorerRow = {
        student,
        teamName: teamMap.get(student.team_id || "") || "-",
        categoryName: categoryMap.get(student.category_id || "") || "-",
        totalPoints: 0,
        stagePoints: 0,
        offStagePoints: 0,
        groupPoints: 0,
        highestMark: 0,
        resultCount: 0,
        rank: 0,
      };

      scorerMap.set(student.id, created);
      return created;
    };

    const addPointsToStudent = ({
      student,
      points,
      isOffStage,
      mark,
      isGroupShare,
    }: {
      student: Student;
      points: number;
      isOffStage: boolean;
      mark: number;
      isGroupShare: boolean;
    }) => {
      if (points <= 0) return;

      const existing = getOrCreateScorer(student);

      existing.totalPoints += points;

      if (isOffStage) {
        existing.offStagePoints += points;
      } else {
        existing.stagePoints += points;
      }

      if (isGroupShare) {
        existing.groupPoints += points;
      }

      existing.highestMark = Math.max(existing.highestMark, mark);
      existing.resultCount += 1;

      scorerMap.set(student.id, existing);
    };

    for (const result of results) {
      const programme = programmeMap.get(result.programme_id);
      if (!programme) continue;

      const programmeType = String(programme.programme_type || "")
        .trim()
        .toLowerCase();

      const stageType = String(programme.stage_type || "stage")
        .trim()
        .toLowerCase();

      const isOffStage =
        stageType === "off_stage" ||
        stageType === "off-stage" ||
        stageType === "offstage";

      const resultPoints = Number(result.points || 0);
      if (resultPoints <= 0) continue;

      const resultMark = Number(
        result.total_mark || result.average_mark || 0,
      );

      const resultRegistration = result.registration_id
        ? participantMap.get(result.registration_id)
        : null;

      if (programmeType === "individual") {
        if (!resultRegistration?.student_id) continue;

        const student = studentMap.get(resultRegistration.student_id);
        if (!student) continue;

        addPointsToStudent({
          student,
          points: resultPoints,
          isOffStage,
          mark: resultMark,
          isGroupShare: false,
        });

        continue;
      }

      if (programmeType !== "group" || !includeGroupProgrammes) {
        continue;
      }

      if (
        selectedGroupProgrammeId !== "all" &&
        programme.id !== selectedGroupProgrammeId
      ) {
        continue;
      }

      if (!resultRegistration) continue;

      const normalizedGroupName = String(
        resultRegistration.group_name || "",
      ).trim();

      const groupRegistrations = participants.filter((registration) => {
        if (registration.programme_id !== programme.id) return false;

        const registrationStatus = String(registration.status || "")
          .trim()
          .toLowerCase();

        if (
          registrationStatus === "cancelled" ||
          registrationStatus === "canceled" ||
          registrationStatus === "rejected" ||
          registrationStatus === "withdrawn"
        ) {
          return false;
        }

        if (normalizedGroupName) {
          return (
            registration.team_id === resultRegistration.team_id &&
            String(registration.group_name || "").trim() ===
              normalizedGroupName
          );
        }

        // Fallback for older group registrations that do not have group_name:
        // use the winning team within this programme.
        return registration.team_id === resultRegistration.team_id;
      });

      const uniqueGroupStudents = Array.from(
        new Map(
          groupRegistrations
            .map((registration) => {
              if (!registration.student_id) return null;
              const student = studentMap.get(registration.student_id);
              return student ? [student.id, student] as const : null;
            })
            .filter(Boolean) as Array<readonly [string, Student]>,
        ).values(),
      );

      // If the result registration itself is a student registration but the
      // group lookup did not find other rows, keep that student instead of
      // silently dropping the result.
      if (
        uniqueGroupStudents.length === 0 &&
        resultRegistration.student_id
      ) {
        const fallbackStudent = studentMap.get(
          resultRegistration.student_id,
        );

        if (fallbackStudent) {
          uniqueGroupStudents.push(fallbackStudent);
        }
      }

      if (uniqueGroupStudents.length === 0) continue;

      // Group points are divided equally among the actual registered members
      // of that winning group and rounded to the nearest whole point.
      // Example: 10 points / 3 students = 3.333 -> 3 points each.
      const sharedPoints = Math.round(
        resultPoints / uniqueGroupStudents.length,
      );

      for (const student of uniqueGroupStudents) {
        addPointsToStudent({
          student,
          points: sharedPoints,
          isOffStage,
          mark: resultMark,
          isGroupShare: true,
        });
      }
    }

    const sorted = Array.from(scorerMap.values()).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }

      if (b.stagePoints !== a.stagePoints) {
        return b.stagePoints - a.stagePoints;
      }

      if (b.offStagePoints !== a.offStagePoints) {
        return b.offStagePoints - a.offStagePoints;
      }

      return a.student.name.localeCompare(b.student.name);
    });

    let lastPoints: number | null = null;
    let currentRank = 0;

    return sorted.map((row) => {
      if (lastPoints === null || row.totalPoints !== lastPoints) {
        currentRank += 1;
        lastPoints = row.totalPoints;
      }

      return {
        ...row,
        rank: currentRank,
      };
    });
  }, [
    students,
    programmes,
    participants,
    results,
    categoryMap,
    teamMap,
    includeGroupProgrammes,
    selectedGroupProgrammeId,
  ]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return scorerRows.filter((row) => {
      const student = row.student;

      const matchesSearch =
        !keyword ||
        String(student.name || "").toLowerCase().includes(keyword) ||
        String(student.chest_no || "").toLowerCase().includes(keyword) ||
        String(student.admission_no || "").toLowerCase().includes(keyword) ||
        String(row.teamName || "").toLowerCase().includes(keyword) ||
        String(row.categoryName || "").toLowerCase().includes(keyword);

      const matchesCategory =
        categoryFilter === "all" || student.category_id === categoryFilter;

      const matchesGender =
        genderFilter === "all" ||
        String(student.gender || "").toLowerCase() === genderFilter;

      const matchesTeam = teamFilter === "all" || student.team_id === teamFilter;

      const matchesStage =
        stageFilter === "all" ||
        (stageFilter === "stage" && row.stagePoints > 0) ||
        (stageFilter === "off_stage" && row.offStagePoints > 0);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesGender &&
        matchesTeam &&
        matchesStage
      );
    });
  }, [scorerRows, search, categoryFilter, genderFilter, stageFilter, teamFilter]);

  const overallTopper = scorerRows[0] || null;

  const stageTopper =
    scorerRows
      .filter((row) => row.stagePoints > 0)
      .sort((a, b) => b.stagePoints - a.stagePoints || b.totalPoints - a.totalPoints)[0] ||
    null;

  const offStageTopper =
    scorerRows
      .filter((row) => row.offStagePoints > 0)
      .sort(
        (a, b) =>
          b.offStagePoints - a.offStagePoints || b.totalPoints - a.totalPoints,
      )[0] || null;

  const highestScore = scorerRows.reduce(
    (max, row) => Math.max(max, row.totalPoints),
    0,
  );

  return (
    <AdminShell
      title="Top Scorers"
      subtitle={
        activeEvent
          ? `Top scorers calculated from published results of ${activeEvent.title}.`
          : "Track Vocal of the Fest, Pen of the Fest and overall champions."
      }
      actions={
        <button
          type="button"
          onClick={loadTopScorers}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Refresh
        </button>
      }
    >
      {isLoading ? (
        <div className="flex min-h-[380px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex items-center gap-3 text-sm font-black text-violet-700">
            <Loader2 className="animate-spin" size={20} />
            Calculating top scorers...
          </div>
        </div>
      ) : error ? (
        <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-violet-200 bg-violet-50/50 p-5 shadow-xl shadow-violet-900/5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
                  Group Programme Points
                </p>
                <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">
                  Optional group contribution
                </h2>
                <p className="mt-1 max-w-3xl text-sm font-bold leading-6 text-slate-500">
                  Individual programmes are always counted. Turn this on when selected
                  group programme points should also be shared between the registered
                  members of each winning group.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIncludeGroupProgrammes((current) => !current)
                }
                className={`inline-flex h-12 shrink-0 items-center justify-center rounded-2xl px-5 text-sm font-black transition ${
                  includeGroupProgrammes
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/20 hover:bg-violet-700"
                    : "border border-violet-200 bg-white text-violet-700 hover:bg-violet-100"
                }`}
              >
                {includeGroupProgrammes
                  ? "Group Programmes: ON"
                  : "Include Group Programmes"}
              </button>
            </div>

            {includeGroupProgrammes && (
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                    Group Programme
                  </label>
                  <select
                    value={selectedGroupProgrammeId}
                    onChange={(event) =>
                      setSelectedGroupProgrammeId(event.target.value)
                    }
                    className="h-13 w-full rounded-2xl border border-violet-200 bg-white px-4 text-sm font-black text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  >
                    <option value="all">All Group Programmes</option>
                    {groupProgrammes.map((programme) => (
                      <option key={programme.id} value={programme.id}>
                        {programme.name}
                        {" — "}
                        {categoryMap.get(programme.category_id || "") || "General"}
                        {programme.gender_scope
                          ? ` — ${programme.gender_scope}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-violet-200 bg-white px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
                    Point division rule
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-600">
                    Each winning group's points are divided by its registered member
                    count and rounded to the nearest whole point. Example: 10 points ÷
                    3 members = 3.333, so each member receives 3 points in Top Scorers.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5">
            <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by chest no, name, team..."
                  className="h-13 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-13 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                <option value="all">All Categories</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <select
                value={genderFilter}
                onChange={(event) => setGenderFilter(event.target.value)}
                className="h-13 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>

              <select
                value={stageFilter}
                onChange={(event) => setStageFilter(event.target.value)}
                className="h-13 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                <option value="all">All Stages</option>
                <option value="stage">Stage</option>
                <option value="off_stage">Off-stage</option>
              </select>

              <select
                value={teamFilter}
                onChange={(event) => setTeamFilter(event.target.value)}
                className="h-13 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-bold outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                <option value="all">All Teams</option>
                {teams.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <WinnerCard
              title="Vocal of the Fest"
              icon={<Trophy size={18} />}
              row={stageTopper}
              points={stageTopper?.stagePoints || 0}
              emptyText="No stage points recorded."
              tone="violet"
            />

            <WinnerCard
              title="Pen of the Fest"
              icon={<Award size={18} />}
              row={offStageTopper}
              points={offStageTopper?.offStagePoints || 0}
              emptyText="No off-stage points recorded."
              tone="amber"
            />

            <SummaryCard
              icon={<Users size={19} />}
              title="Total Contenders"
              value={String(scorerRows.length)}
              subtitle={includeGroupProgrammes ? "Individual + selected group shares" : "Scoring individual contestants"}
            />

            <SummaryCard
              icon={<Medal size={19} />}
              title="Highest Score"
              value={`${highestScore} pts`}
              subtitle="Top total points"
            />
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                  Contenders Ranking
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  {includeGroupProgrammes
                    ? selectedGroupProgrammeId === "all"
                      ? "Overall ranking from individual results plus shared points from all group programmes."
                      : `Overall ranking from individual results plus shared points from ${
                          groupProgrammes.find(
                            (item) => item.id === selectedGroupProgrammeId,
                          )?.name || "the selected group programme"
                        }.`
                    : "Overall ranking from published individual programme results."}
                </p>
              </div>

              {overallTopper && (
                <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-black text-violet-700">
                  Overall Topper: {overallTopper.student.name} ·{" "}
                  {overallTopper.totalPoints} pts
                </div>
              )}
            </div>

            {filteredRows.length === 0 ? (
              <div className="mt-5 rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <BookOpen className="mx-auto text-slate-400" size={36} />
                <p className="mt-4 text-lg font-black text-slate-950">
                  No top scorer data found
                </p>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  Publish individual programme results first
                  {includeGroupProgrammes
                    ? " or publish the selected group programme result"
                    : ""}
                  , then refresh this page.
                </p>
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto rounded-[1.5rem] border border-slate-200">
                <table className="min-w-[1000px] w-full border-collapse bg-white text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Rank</Th>
                      <Th>Chest No</Th>
                      <Th>Student Name</Th>
                      <Th>Gender</Th>
                      <Th>Team</Th>
                      <Th>Category</Th>
                      <Th>Stage</Th>
                      <Th>Off-stage</Th>
                      {includeGroupProgrammes && <Th>Group Share</Th>}
                      <Th>Total</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row) => (
                      <tr
                        key={row.student.id}
                        className="border-t border-slate-200 transition hover:bg-violet-50/40"
                      >
                        <Td>
                          <span className="font-black text-slate-700">
                            {row.rank === 1
                              ? "🥇 #1"
                              : row.rank === 2
                                ? "🥈 #2"
                                : row.rank === 3
                                  ? "🥉 #3"
                                  : `Rank #${row.rank}`}
                          </span>
                        </Td>

                        <Td>
                          <span className="font-black text-slate-950">
                            {row.student.chest_no || "-"}
                          </span>
                        </Td>

                        <Td>
                          <div>
                            <p className="font-black text-slate-950">
                              {row.student.name}
                            </p>
                            <p className="text-xs font-bold text-slate-400">
                              {row.resultCount} result
                              {row.resultCount === 1 ? "" : "s"}
                            </p>
                          </div>
                        </Td>

                        <Td>{row.student.gender || "-"}</Td>
                        <Td>{row.teamName}</Td>
                        <Td>{row.categoryName}</Td>

                        <Td>
                          <span className="font-black text-violet-700">
                            {row.stagePoints} pts
                          </span>
                        </Td>

                        <Td>
                          <span className="font-black text-orange-600">
                            {row.offStagePoints} pts
                          </span>
                        </Td>

                        {includeGroupProgrammes && (
                          <Td>
                            <span className="font-black text-emerald-700">
                              {row.groupPoints} pts
                            </span>
                          </Td>
                        )}

                        <Td>
                          <span className="text-base font-black text-slate-950">
                            {row.totalPoints} pts
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function WinnerCard({
  title,
  icon,
  row,
  points,
  emptyText,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  row: ScorerRow | null;
  points: number;
  emptyText: string;
  tone: "violet" | "amber";
}) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50/40 text-amber-700"
      : "border-violet-200 bg-violet-50/40 text-violet-700";

  return (
    <div
      className={`rounded-[1.7rem] border p-5 shadow-xl shadow-slate-900/5 ${toneClass}`}
    >
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em]">
        {icon}
        {title}
      </div>

      {row ? (
        <div className="mt-5">
          <p className="text-3xl font-black tracking-[-0.06em] text-slate-950">
            {row.student.name}
          </p>
          <p className="mt-2 text-sm font-black">
            #{row.student.chest_no || "-"} · {row.teamName}
          </p>
          <div className="mt-4 inline-flex rounded-xl bg-white px-3 py-2 text-sm font-black">
            {points} pts
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm font-bold italic text-slate-500">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {icon}
        {title}
      </div>
      <p className="mt-5 text-4xl font-black tracking-[-0.07em] text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm font-bold text-slate-500">{subtitle}</p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-4 font-bold text-slate-600">{children}</td>;
}