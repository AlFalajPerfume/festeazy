/* eslint-disable */
import {
  apiError,
  authorizeInstitutionAdmin,
} from "@/lib/admin-api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeInstitutionAdmin(request);
    if (authorization.response) return authorization.response;

    const body = await request.json();
    const programmeId = String(body?.programmeId || "").trim();
    const scores = Array.isArray(body?.scores) ? body.scores : [];

    if (!programmeId) return apiError("Programme ID is required.");
    if (scores.length === 0) return apiError("No marks were provided.");

    const { data: programme, error: programmeError } = await supabaseAdmin
      .from("programmes")
      .select("id, total_marks")
      .eq("id", programmeId)
      .eq("organization_id", authorization.admin.organizationId)
      .eq("event_id", authorization.admin.eventId)
      .maybeSingle();

    if (programmeError) return apiError(programmeError.message, 500);
    if (!programme) return apiError("Programme not found.", 404);

    const maximumMark = Number(programme.total_marks || 100);

    for (const score of scores) {
      const mark = Number(score.mark);

      if (!Number.isFinite(mark) || mark < 0 || mark > maximumMark) {
        return apiError(
          `Each judge mark must be between 0 and ${maximumMark}.`,
        );
      }
    }

    const { data, error } = await supabaseAdmin.rpc(
      "replace_programme_scores",
      {
        target_organization_id: authorization.admin.organizationId,
        target_event_id: authorization.admin.eventId,
        target_programme_id: programmeId,
        score_rows: scores.map((score: any) => ({
          registration_id: score.registration_id,
          judge_id: score.judge_id,
          mark: Number(score.mark),
          criteria_scores: {},
        })),
      },
    );

    if (error) return apiError(error.message, 409);

    return NextResponse.json({ success: true, calculation: data });
  } catch (error: any) {
    return apiError(error?.message || "Unable to save marks.", 500);
  }
}
