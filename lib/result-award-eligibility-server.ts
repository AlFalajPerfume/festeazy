/* eslint-disable */
import {
  competitionRanks,
  DEFAULT_GROUP_POSITION_POINTS,
  DEFAULT_INDIVIDUAL_POSITION_POINTS,
  getPositionPoints,
  type PositionPointRules,
} from "@/lib/marking";
import { supabaseAdmin } from "@/lib/supabase-admin";

type NormalizeZeroAwardArgs = {
  organizationId: string;
  eventId: string;
  programmeId: string;
};

type ResultRow = {
  id: string;
  average_mark: number | null;
  total_mark: number | null;
  grade: string | null;
  position: number | null;
  points: number | null;
};

function normalizeProgrammeType(value: string | null | undefined) {
  return String(value || "individual").trim().toLowerCase();
}

function buildPositionRules(
  row: Record<string, unknown> | null | undefined,
  prefix: "individual" | "group",
): PositionPointRules {
  const defaults =
    prefix === "group"
      ? DEFAULT_GROUP_POSITION_POINTS
      : DEFAULT_INDIVIDUAL_POSITION_POINTS;

  return {
    1: Number(row?.[`${prefix}_first`] ?? defaults[1] ?? 0),
    2: Number(row?.[`${prefix}_second`] ?? defaults[2] ?? 0),
    3: Number(row?.[`${prefix}_third`] ?? defaults[3] ?? 0),
    4: Number(row?.[`${prefix}_fourth`] ?? defaults[4] ?? 0),
  };
}

function getFinalAverage(result: ResultRow) {
  const value = Number(result.average_mark ?? result.total_mark ?? 0);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
}

export async function normalizeZeroMarkAwards({
  organizationId,
  eventId,
  programmeId,
}: NormalizeZeroAwardArgs) {
  const [resultRes, programmeRes, pointRuleRes] = await Promise.all([
    supabaseAdmin
      .from("results")
      .select("id, average_mark, total_mark, grade, position, points")
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .eq("programme_id", programmeId),

    supabaseAdmin
      .from("programmes")
      .select("id, programme_type")
      .eq("id", programmeId)
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .maybeSingle(),

    supabaseAdmin
      .from("event_point_rules")
      .select(
        "individual_first, individual_second, individual_third, individual_fourth, group_first, group_second, group_third, group_fourth",
      )
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .maybeSingle(),
  ]);

  const firstError =
    resultRes.error || programmeRes.error || pointRuleRes.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  if (!programmeRes.data) {
    throw new Error("Programme not found while normalizing result awards.");
  }

  const rows = (resultRes.data || []) as ResultRow[];
  const eligibleRows = rows.filter((result) => {
    const grade = String(result.grade || "").trim().toLowerCase();

    if (grade === "absent") return false;

    return getFinalAverage(result) > 0;
  });

  const zeroMarkRows = rows.filter((result) => {
    const grade = String(result.grade || "").trim().toLowerCase();

    if (grade === "absent") return false;

    return getFinalAverage(result) <= 0;
  });

  const programmeType = normalizeProgrammeType(
    programmeRes.data.programme_type,
  );

  const positionRules =
    programmeType === "group"
      ? buildPositionRules(pointRuleRes.data as Record<string, unknown> | null, "group")
      : buildPositionRules(
          pointRuleRes.data as Record<string, unknown> | null,
          "individual",
        );

  const desiredAwards = new Map<
    string,
    { position: number | null; points: number }
  >();

  competitionRanks(eligibleRows, getFinalAverage).forEach(
    ({ row, position }) => {
      desiredAwards.set(row.id, {
        position,
        points: getPositionPoints(position, positionRules),
      });
    },
  );

  zeroMarkRows.forEach((row) => {
    desiredAwards.set(row.id, {
      position: null,
      points: 0,
    });
  });

  const changedRows = rows.filter((row) => {
    const desired = desiredAwards.get(row.id);
    if (!desired) return false;

    const currentPosition =
      row.position === null || row.position === undefined
        ? null
        : Number(row.position);

    return (
      currentPosition !== desired.position ||
      Number(row.points || 0) !== desired.points
    );
  });

  if (changedRows.length > 0) {
    const updateResults = await Promise.all(
      changedRows.map((row) => {
        const desired = desiredAwards.get(row.id)!;

        return supabaseAdmin
          .from("results")
          .update({
            position: desired.position,
            points: desired.points,
          })
          .eq("id", row.id)
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .eq("programme_id", programmeId);
      }),
    );

    const updateError = updateResults.find((result) => result.error)?.error;

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return {
    disqualifiedCount: zeroMarkRows.length,
    denseRankUpdatedCount: changedRows.length,
  };
}
