/* eslint-disable */
import { supabaseAdmin } from "@/lib/supabase-admin";

type NormalizeZeroAwardArgs = {
  organizationId: string;
  eventId: string;
  programmeId: string;
};

export async function normalizeZeroMarkAwards({
  organizationId,
  eventId,
  programmeId,
}: NormalizeZeroAwardArgs) {
  const { data, error } = await supabaseAdmin
    .from("results")
    .select("id, average_mark, total_mark, grade, position, points")
    .eq("organization_id", organizationId)
    .eq("event_id", eventId)
    .eq("programme_id", programmeId);

  if (error) {
    throw new Error(error.message);
  }

  const zeroMarkResultIds = (data || [])
    .filter((result) => {
      const grade = String(result.grade || "")
        .trim()
        .toLowerCase();

      if (grade === "absent") {
        return false;
      }

      const finalAverage = Number(
        result.average_mark ?? result.total_mark ?? 0,
      );

      return !Number.isFinite(finalAverage) || finalAverage <= 0;
    })
    .map((result) => result.id)
    .filter(Boolean);

  if (zeroMarkResultIds.length === 0) {
    return { disqualifiedCount: 0 };
  }

  const { error: updateError } = await supabaseAdmin
    .from("results")
    .update({
      position: null,
      points: 0,
    })
    .in("id", zeroMarkResultIds);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    disqualifiedCount: zeroMarkResultIds.length,
  };
}
