/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import SearchableProgrammeSelect from "@/components/admin/SearchableProgrammeSelect";
import { getAdminContext } from "@/lib/admin-context";
import {
  competitionRanks,
  DEFAULT_GROUP_POSITION_POINTS,
  DEFAULT_INDIVIDUAL_POSITION_POINTS,
  formatMark,
  getGrade,
  getPositionPoints,
} from "@/lib/marking";
import type { GradeRules, PositionPointRules } from "@/lib/marking";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  Save,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

type Programme = {
  id: string;
  name: string;
  programme_type: string;
  stage_type: string;
  sort_order: number;
  category_id: string | null;
  total_marks: number;
};

type Category = {
  id: string;
  name: string;
};

type Judge = {
  id: string;
  name: string;
  is_active: boolean;
};

type Assignment = {
  judge_id: string;
  programme_id: string;
};

type Code = {
  registration_id: string;
  programme_id: string;
  code_letter: string;
  is_present: boolean;
};

type Score = {
  registration_id: string;
  judge_id: string;
  mark: number;
};

type Registration = {
  id: string;
  programme_id: string | null;
  student_id: string | null;
  team_id: string | null;
  group_name: string | null;
  registration_no: string | null;
  status: string | null;
};

type Student = {
  id: string;
  chest_no: string | null;
  name: string;
  class_id: string | null;
  team_id: string | null;
};

type Team = {
  id: string;
  name: string;
};

type ClassItem = {
  id: string;
  name: string;
};

type CalculatedEntry = {
  registrationId: string;
  code: string;
  average: number;
  position: number;
  grade: string;
  points: number;
};


function getCodeSequenceValue(codeLetter: string) {
  const normalized = String(codeLetter || "")
    .trim()
    .toUpperCase();

  if (!/^[A-Z]+$/.test(normalized)) {
    return Number.MAX_SAFE_INTEGER;
  }

  let value = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    value =
      value * 26 +
      (normalized.charCodeAt(index) - 64);
  }

  return value;
}

function compareCodeLetters(
  firstCode: string,
  secondCode: string,
) {
  const firstValue = getCodeSequenceValue(firstCode);
  const secondValue = getCodeSequenceValue(secondCode);

  if (firstValue !== secondValue) {
    return firstValue - secondValue;
  }

  return String(firstCode || "")
    .trim()
    .toUpperCase()
    .localeCompare(
      String(secondCode || "").trim().toUpperCase(),
    );
}

export default function MarkEntryPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>(
    [],
  );
  const [codes, setCodes] = useState<Code[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [registrations, setRegistrations] = useState<
    Registration[]
  >([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [individualPointRules, setIndividualPointRules] =
    useState<PositionPointRules>(DEFAULT_INDIVIDUAL_POSITION_POINTS);
  const [groupPointRules, setGroupPointRules] =
    useState<PositionPointRules>(DEFAULT_GROUP_POSITION_POINTS);
  const [gradeRules, setGradeRules] = useState<GradeRules>({
    aPlusMin: 80,
    aMin: 70,
    bMin: 60,
    cMin: 50,
  });

  const [programmeId, setProgrammeId] = useState("");
  const [values, setValues] = useState<Record<string, string>>(
    {},
  );
  const [participantSearch, setParticipantSearch] =
    useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  const programme = useMemo(() => {
    return (
      programmes.find((item) => item.id === programmeId) ||
      null
    );
  }, [programmes, programmeId]);

  const programmeOptions = useMemo(() => {
    return programmes.map((item) => ({
      id: item.id,
      name: item.name,
      sort_order: item.sort_order,
    }));
  }, [programmes]);

  const activeJudges = useMemo(() => {
    if (!programmeId) return [];

    const assignedJudgeIds = new Set(
      assignments
        .filter(
          (assignment) =>
            assignment.programme_id === programmeId,
        )
        .map((assignment) => assignment.judge_id),
    );

    return judges.filter(
      (judge) =>
        judge.is_active && assignedJudgeIds.has(judge.id),
    );
  }, [programmeId, assignments, judges]);

  const presentEntries = useMemo(() => {
    return codes
      .filter(
        (code) =>
          code.programme_id === programmeId &&
          code.is_present,
      )
      .sort((first, second) =>
        compareCodeLetters(
          first.code_letter,
          second.code_letter,
        ),
      );
  }, [codes, programmeId]);

  const absentCount = useMemo(() => {
    return codes.filter(
      (code) =>
        code.programme_id === programmeId &&
        !code.is_present,
    ).length;
  }, [codes, programmeId]);

  const filteredEntries = useMemo(() => {
    const keyword = participantSearch
      .trim()
      .toLowerCase();

    if (!keyword) {
      return presentEntries;
    }

    return presentEntries.filter((entry) => {
      const details = getParticipantDetails(
        entry.registration_id,
      );

      const searchableText = [
        entry.code_letter,
        details.name,
        details.subtitle,
        details.team,
        details.classOrMembers,
        details.registrationNo,
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [
    presentEntries,
    participantSearch,
    registrations,
    students,
    teams,
    classes,
  ]);

  const preview = useMemo<CalculatedEntry[]>(() => {
    if (!programme || activeJudges.length === 0) {
      return [];
    }

    const completedEntries = presentEntries
      .map((entry) => {
        const judgeMarks = activeJudges.map((judge) => {
          const key = getMarkKey(
            entry.registration_id,
            judge.id,
          );

          const rawValue = values[key];

          if (
            rawValue === undefined ||
            rawValue.trim() === ""
          ) {
            return null;
          }

          const mark = Number(rawValue);

          return Number.isFinite(mark) ? mark : null;
        });

        if (
          judgeMarks.some((mark) => mark === null)
        ) {
          return null;
        }

        const numericMarks = judgeMarks as number[];

        const average =
          numericMarks.reduce(
            (total, mark) => total + mark,
            0,
          ) / numericMarks.length;

        return {
          registrationId: entry.registration_id,
          code: entry.code_letter,
          average: Number(average.toFixed(2)),
        };
      })
      .filter(Boolean) as Array<{
      registrationId: string;
      code: string;
      average: number;
    }>;

    return competitionRanks(
      completedEntries,
      (item) => item.average,
    ).map(({ row, position }) => ({
      ...row,
      position,
      grade: getGrade(
        row.average,
        programme.total_marks,
        gradeRules,
      ),
      points: getPositionPoints(
        position,
        programme.programme_type === "group"
          ? groupPointRules
          : individualPointRules,
      ),
    }));
  }, [
    programme,
    activeJudges,
    presentEntries,
    values,
    individualPointRules,
    groupPointRules,
    gradeRules,
  ]);

  const submittedCount = useMemo(() => {
    if (activeJudges.length === 0) return 0;

    return presentEntries.filter((entry) =>
      activeJudges.every((judge) =>
        scores.some(
          (score) =>
            score.registration_id ===
              entry.registration_id &&
            score.judge_id === judge.id,
        ),
      ),
    ).length;
  }, [presentEntries, activeJudges, scores]);

  async function load() {
    setLoading(true);
    setError("");

    const admin = await getAdminContext({
      forceRefresh: true,
    });

    if (admin.error || !admin.context) {
      setError(
        admin.error || "Unable to load workspace.",
      );
      setLoading(false);
      return;
    }

    const organizationId =
      admin.context.organizationId;
    const eventId = admin.context.eventId;

    const [
      programmeRes,
      categoryRes,
      judgeRes,
      assignmentRes,
      codeRes,
      scoreRes,
      registrationRes,
      studentRes,
      teamRes,
      classRes,
      pointRuleRes,
      gradeRuleRes,
    ] = await Promise.all([
      supabase
        .from("programmes")
        .select(
          "id, name, programme_type, stage_type, sort_order, category_id, total_marks",
        )
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .eq("status", "active")
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("categories")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("judges")
        .select("id, name, is_active")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .order("created_at", {
          ascending: true,
        }),

      supabase
        .from("judge_assignments")
        .select("judge_id, programme_id")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId),

      fetchAllRows<Code>((from, to) =>
        supabase
          .from("programme_codes")
          .select("registration_id, programme_id, code_letter, is_present")
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .order("registration_id", { ascending: true })
          .range(from, to),
      )
        .then((data) => ({ data, error: null }))
        .catch((error) => ({ data: null, error })),

      fetchAllRows<Score>((from, to) =>
        supabase
          .from("judge_scores")
          .select("registration_id, judge_id, mark")
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .order("registration_id", { ascending: true })
          .range(from, to),
      )
        .then((data) => ({ data, error: null }))
        .catch((error) => ({ data: null, error })),

      fetchAllRows<Registration>((from, to) =>
        supabase
          .from("programme_registrations")
          .select(
            "id, programme_id, student_id, team_id, group_name, registration_no, status",
          )
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .order("id", { ascending: true })
          .range(from, to),
      )
        .then((data) => ({ data, error: null }))
        .catch((error) => ({ data: null, error })),

      supabase
        .from("students")
        .select(
          "id, chest_no, name, class_id, team_id",
        )
        .eq("organization_id", organizationId)
        .eq("event_id", eventId),

      supabase
        .from("teams")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("classes")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("event_point_rules")
        .select(
          "individual_first, individual_second, individual_third, individual_fourth, group_first, group_second, group_third, group_fourth",
        )
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .maybeSingle(),

      supabase
        .from("event_grade_rules")
        .select("a_plus_min, a_min, b_min, c_min")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .maybeSingle(),
    ]);

    const firstError =
      programmeRes.error ||
      categoryRes.error ||
      judgeRes.error ||
      assignmentRes.error ||
      codeRes.error ||
      scoreRes.error ||
      registrationRes.error ||
      studentRes.error ||
      teamRes.error ||
      classRes.error ||
      pointRuleRes.error ||
      gradeRuleRes.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const loadedProgrammes =
      (programmeRes.data || []) as Programme[];
    const loadedScores =
      (scoreRes.data || []) as Score[];

    setProgrammes(loadedProgrammes);
    setCategories(
      (categoryRes.data || []) as Category[],
    );
    setJudges((judgeRes.data || []) as Judge[]);
    setAssignments(
      (assignmentRes.data || []) as Assignment[],
    );
    setCodes((codeRes.data || []) as Code[]);
    setScores(loadedScores);
    setRegistrations(
      (registrationRes.data || []) as Registration[],
    );
    setStudents(
      (studentRes.data || []) as Student[],
    );
    setTeams((teamRes.data || []) as Team[]);
    setClasses((classRes.data || []) as ClassItem[]);

    const loadedPointRules = pointRuleRes.data;

    setIndividualPointRules({
      1: Number(loadedPointRules?.individual_first ?? 10),
      2: Number(loadedPointRules?.individual_second ?? 5),
      3: Number(loadedPointRules?.individual_third ?? 3),
      4: Number(loadedPointRules?.individual_fourth ?? 1),
    });

    setGroupPointRules({
      1: Number(loadedPointRules?.group_first ?? 20),
      2: Number(loadedPointRules?.group_second ?? 15),
      3: Number(loadedPointRules?.group_third ?? 10),
      4: Number(loadedPointRules?.group_fourth ?? 5),
    });

    const loadedGradeRules = gradeRuleRes.data;
    setGradeRules({
      aPlusMin: Number(loadedGradeRules?.a_plus_min ?? 80),
      aMin: Number(loadedGradeRules?.a_min ?? 70),
      bMin: Number(loadedGradeRules?.b_min ?? 60),
      cMin: Number(loadedGradeRules?.c_min ?? 50),
    });

    const selectedStillExists = loadedProgrammes.some(
      (item) => item.id === programmeId,
    );

    const nextProgrammeId = selectedStillExists
      ? programmeId
      : loadedProgrammes[0]?.id || "";

    setProgrammeId(nextProgrammeId);

    const loadedValues: Record<string, string> = {};

    loadedScores.forEach((score) => {
      loadedValues[
        getMarkKey(
          score.registration_id,
          score.judge_id,
        )
      ] = String(score.mark ?? "");
    });

    setValues(loadedValues);
    setLoading(false);
  }

  function getMarkKey(
    registrationId: string,
    judgeId: string,
  ) {
    return `${registrationId}_${judgeId}_overall`;
  }

  function setValue(key: string, value: string) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function getCategoryName(categoryId: string | null) {
    if (!categoryId) return "General";

    return (
      categories.find(
        (category) => category.id === categoryId,
      )?.name || "General"
    );
  }

  function normalizeChest(chestNo: string | null) {
    return String(chestNo || "")
      .replace("#", "")
      .trim();
  }

  function getParticipantDetails(
    registrationId: string,
  ) {
    const registration =
      registrations.find(
        (item) => item.id === registrationId,
      ) || null;

    const student =
      students.find(
        (item) =>
          item.id === registration?.student_id,
      ) || null;

    const teamId =
      registration?.team_id || student?.team_id || null;

    const team =
      teams.find((item) => item.id === teamId)?.name ||
      "-";

    const className =
      classes.find(
        (item) => item.id === student?.class_id,
      )?.name || "-";

    const isGroup =
      programme?.programme_type === "group";

    if (isGroup && registration) {
      const groupRegistrations = registrations.filter(
        (item) =>
          item.programme_id ===
            registration.programme_id &&
          item.team_id === registration.team_id &&
          String(item.group_name || "") ===
            String(registration.group_name || ""),
      );

      const groupStudents = groupRegistrations
        .map((item) =>
          students.find(
            (studentItem) =>
              studentItem.id === item.student_id,
          ),
        )
        .filter(Boolean) as Student[];

      const memberNames = groupStudents
        .map((member) => {
          const chest = normalizeChest(member.chest_no);

          return chest
            ? `#${chest} ${member.name}`
            : member.name;
        })
        .join(", ");

      return {
        name:
          registration.group_name ||
          `Group ${registration.registration_no || ""}`,
        subtitle: "Group Participant",
        team,
        classOrMembers:
          memberNames ||
          `${groupStudents.length} members`,
        registrationNo:
          registration.registration_no || "",
      };
    }

    const chestNo = normalizeChest(
      student?.chest_no || null,
    );

    return {
      name: student
        ? `${chestNo ? `#${chestNo} ` : ""}${
            student.name
          }`
        : registration?.registration_no
          ? `Registration ${registration.registration_no}`
          : "Participant",
      subtitle: "Individual Participant",
      team,
      classOrMembers: className,
      registrationNo:
        registration?.registration_no || "",
    };
  }

  function getCalculatedEntry(
    registrationId: string,
  ) {
    return (
      preview.find(
        (item) =>
          item.registrationId === registrationId,
      ) || null
    );
  }

  function handleProgrammeChange(value: string) {
    setProgrammeId(value);
    setParticipantSearch("");
    setError("");
    setMessage("");
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!programme) {
      setError("Select a programme first.");
      return;
    }

    if (activeJudges.length === 0) {
      setError(
        "Assign at least one active judge to this programme.",
      );
      return;
    }

    if (presentEntries.length === 0) {
      setError(
        "Generate programme codes and mark present participants first.",
      );
      return;
    }

    const scoreRows: Array<{
      registration_id: string;
      judge_id: string;
      mark: number;
    }> = [];

    for (const entry of presentEntries) {
      for (const judge of activeJudges) {
        const key = getMarkKey(
          entry.registration_id,
          judge.id,
        );

        const rawValue = values[key];

        if (
          rawValue === undefined ||
          rawValue.trim() === ""
        ) {
          setError(
            `Enter marks for all participants and all ${activeJudges.length} judges.`,
          );
          return;
        }

        const mark = Number(rawValue);

        if (
          !Number.isFinite(mark) ||
          mark < 0 ||
          mark > programme.total_marks
        ) {
          setError(
            `Every judge mark must be between 0 and ${programme.total_marks}.`,
          );
          return;
        }

        scoreRows.push({
          registration_id: entry.registration_id,
          judge_id: judge.id,
          mark,
        });
      }
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setError(
        "Your login session has expired. Please log in again.",
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/admin/marks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            programmeId: programme.id,
            scores: scoreRows,
          }),
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload.error || "Unable to save marks.",
        );
      }

      setMessage(
        payload.calculation?.status === "completed"
          ? "Marks saved successfully. Average, grade, rank, points and absent results were calculated."
          : "Marks saved successfully. Waiting for all required judge marks.",
      );

      await load();
    } catch (submitError: any) {
      setError(
        submitError?.message ||
          "Unable to save marks.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell
      title="Mark Entry"
      subtitle="Enter judge-wise marks and calculate final average, grade, rank and points."
      actions={
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="mark-secondary-button"
        >
          <RefreshCcw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          <span className="hidden sm:inline">
            Refresh
          </span>
        </button>
      }
    >
      <style jsx global>{`
        .mark-secondary-button {
          display: inline-flex;
          height: 44px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: white;
          padding: 0 16px;
          font-size: 14px;
          font-weight: 900;
          color: #334155;
          box-shadow: 0 3px 8px rgb(15 23 42 / 5%);
          transition:
            background 150ms ease,
            border-color 150ms ease;
        }

        .mark-secondary-button:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .mark-secondary-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .mark-input {
          height: 48px;
          width: 92px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: white;
          padding: 0 14px;
          font-size: 14px;
          font-weight: 900;
          color: #0f172a;
          outline: none;
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        .mark-input::placeholder {
          color: #94a3b8;
        }

        .mark-input:focus {
          border-color: #8b5cf6;
          box-shadow: 0 0 0 4px #ede9fe;
        }

        .mark-table-scrollbar::-webkit-scrollbar {
          height: 8px;
        }

        .mark-table-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .mark-table-scrollbar::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #cbd5e1;
        }
      `}</style>

      <div className="mx-auto max-w-[1500px] space-y-5">
        {error && (
          <Notice tone="error">{error}</Notice>
        )}

        {message && (
          <Notice tone="success">{message}</Notice>
        )}

        <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.04]">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Select Programme
              </label>

              <SearchableProgrammeSelect
                value={programmeId}
                onChange={handleProgrammeChange}
                options={programmeOptions}
                placeholder="Search programme..."
                emptyText="No programmes found"
              />
            </div>

            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Search Participant
              </label>

              <div className="flex h-12 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
                <Search
                  size={17}
                  className="shrink-0 text-slate-400"
                />

                <input
                  value={participantSearch}
                  onChange={(event) =>
                    setParticipantSearch(
                      event.target.value,
                    )
                  }
                  disabled={!programme}
                  placeholder="Name, code, chest no or team..."
                  className="w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {programme && (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <InfoCard
                  icon={<Award size={19} />}
                  label="Type"
                  value={
                    programme.programme_type === "group"
                      ? "Group"
                      : "Individual"
                  }
                />

                <InfoCard
                  icon={<Users size={19} />}
                  label="Category"
                  value={getCategoryName(
                    programme.category_id,
                  )}
                />

                <InfoCard
                  icon={<Trophy size={19} />}
                  label="Total Marks"
                  value={programme.total_marks}
                />

                <InfoCard
                  icon={<Users size={19} />}
                  label="Judges"
                  value={activeJudges.length}
                />

                <InfoCard
                  icon={<CheckCircle2 size={19} />}
                  label="Submitted"
                  value={`${submittedCount}/${presentEntries.length}`}
                />
              </div>

              {activeJudges.length > 0 && (
                <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-700">
                    Assigned Judges
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeJudges.map(
                      (judge, index) => (
                        <span
                          key={judge.id}
                          className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-violet-700 shadow-sm"
                        >
                          J{index + 1}: {judge.name}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              )}

              {activeJudges.length === 0 && (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  No active judges are assigned to this
                  programme. Assign judges from the Judges
                  page first.
                </div>
              )}

              {absentCount > 0 && (
                <p className="mt-3 text-xs font-bold text-slate-500">
                  {absentCount} participant
                  {absentCount === 1 ? "" : "s"} marked
                  absent.
                </p>
              )}
            </>
          )}
        </section>

        <form
          onSubmit={submit}
          className="overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.04]"
        >
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Judge-wise Mark Sheet
              </h2>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {programme
                  ? programme.name
                  : "Select a programme to enter marks"}
              </p>
            </div>

            <button
              type="submit"
              disabled={
                saving ||
                !programme ||
                activeJudges.length === 0 ||
                presentEntries.length === 0
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2
                  className="animate-spin"
                  size={17}
                />
              ) : (
                <Save size={17} />
              )}

              {saving
                ? "Saving..."
                : "Submit Marks"}
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center gap-3 text-sm font-black text-slate-500">
              <Loader2
                className="animate-spin text-violet-600"
                size={20}
              />
              Loading mark sheet...
            </div>
          ) : !programme ? (
            <EmptyState
              title="Select a programme"
              text="Choose a programme above to begin mark entry."
            />
          ) : presentEntries.length === 0 ? (
            <EmptyState
              title="No present participants"
              text="Generate code letters and mark participants present from the Green Room page."
            />
          ) : filteredEntries.length === 0 ? (
            <EmptyState
              title="No matching participants"
              text="Change the participant search and try again."
            />
          ) : (
            <div className="mark-table-scrollbar overflow-x-auto">
              <table className="w-full min-w-[1100px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    <TableHeading className="min-w-[230px]">
                      Participant
                    </TableHeading>

                    <TableHeading className="w-[170px]">
                      Team
                    </TableHeading>

                    <TableHeading className="min-w-[190px]">
                      Class / Members
                    </TableHeading>

                    {activeJudges.map(
                      (judge, index) => (
                        <TableHeading
                          key={judge.id}
                          className="w-[125px]"
                        >
                          <span>
                            J{index + 1}
                          </span>

                          <span className="mt-1 block max-w-[105px] truncate text-[10px] font-bold normal-case tracking-normal text-slate-400">
                            {judge.name}
                          </span>
                        </TableHeading>
                      ),
                    )}

                    <TableHeading className="w-[110px]">
                      Final Avg
                    </TableHeading>

                    <TableHeading className="w-[90px]">
                      Grade
                    </TableHeading>

                    <TableHeading className="w-[100px]">
                      Rank
                    </TableHeading>
                  </tr>
                </thead>

                <tbody>
                  {filteredEntries.map((entry) => {
                    const details =
                      getParticipantDetails(
                        entry.registration_id,
                      );

                    const calculated =
                      getCalculatedEntry(
                        entry.registration_id,
                      );

                    return (
                      <tr
                        key={entry.registration_id}
                        className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-violet-50/30"
                      >
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-violet-50 px-2 text-xs font-black text-violet-700">
                              {entry.code_letter}
                            </div>

                            <div className="min-w-0">
                              <p className="font-black text-slate-950">
                                {details.name}
                              </p>

                              <p className="mt-1 text-xs font-bold text-slate-500">
                                {details.subtitle}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm font-extrabold text-slate-600">
                          {details.team}
                        </td>

                        <td className="max-w-[260px] px-5 py-4 text-sm font-bold leading-5 text-slate-600">
                          {details.classOrMembers}
                        </td>

                        {activeJudges.map((judge) => {
                          const markKey = getMarkKey(
                            entry.registration_id,
                            judge.id,
                          );

                          return (
                            <td
                              key={judge.id}
                              className="px-5 py-4"
                            >
                              <input
                                type="number"
                                min="0"
                                max={
                                  programme.total_marks
                                }
                                step="0.01"
                                value={
                                  values[markKey] || ""
                                }
                                onChange={(event) =>
                                  setValue(
                                    markKey,
                                    event.target.value,
                                  )
                                }
                                placeholder="0"
                                className="mark-input"
                              />
                            </td>
                          );
                        })}

                        <td className="px-5 py-4">
                          <span className="text-sm font-black text-slate-950">
                            {calculated
                              ? formatMark(
                                  calculated.average,
                                )
                              : "-"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {calculated ? (
                            <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                              {calculated.grade}
                            </span>
                          ) : (
                            <span className="font-bold text-slate-400">
                              -
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {calculated ? (
                            <RankBadge
                              position={
                                calculated.position
                              }
                            />
                          ) : (
                            <span className="font-bold text-slate-400">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </form>

        {preview.length > 0 && (
          <section className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/[0.04]">
            <div>
              <h3 className="text-lg font-black text-slate-950">
                Calculation Preview
              </h3>

              <p className="mt-1 text-sm font-bold text-slate-500">
                Preview updates automatically while entering
                marks.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {preview.map((item) => {
                const details =
                  getParticipantDetails(
                    item.registrationId,
                  );

                return (
                  <div
                    key={item.registrationId}
                    className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-950">
                        {details.name}
                      </p>

                      <p className="mt-1 text-xs font-bold text-slate-500">
                        Code {item.code} · Grade{" "}
                        {item.grade} · {item.points} points
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-black text-violet-700">
                        {formatMark(item.average)}
                      </p>

                      <p className="mt-1 text-[10px] font-black uppercase text-slate-400">
                        Rank #{item.position}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AdminShell>
  );
}

function TableHeading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-4 text-[10px] font-black uppercase tracking-[0.17em] text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-violet-700">{icon}</div>

      <p className="mt-3 text-[9px] font-black uppercase tracking-[0.17em] text-slate-500">
        {label}
      </p>

      <p className="mt-1.5 truncate text-sm font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function RankBadge({
  position,
}: {
  position: number;
}) {
  let label = `#${position}`;

  if (position === 1) label = "🥇 1st";
  if (position === 2) label = "🥈 2nd";
  if (position === 3) label = "🥉 3rd";

  return (
    <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
      {label}
    </span>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "error" | "success";
  children: ReactNode;
}) {
  const isError = tone === "error";

  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border px-4 py-3.5 text-sm font-bold ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {isError ? (
        <AlertCircle
          size={17}
          className="mt-0.5 shrink-0"
        />
      ) : (
        <CheckCircle2
          size={17}
          className="mt-0.5 shrink-0"
        />
      )}

      <span>{children}</span>
    </div>
  );
}

function EmptyState({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
        <Trophy size={27} />
      </div>

      <h3 className="mt-4 text-xl font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
        {text}
      </p>
    </div>
  );
}