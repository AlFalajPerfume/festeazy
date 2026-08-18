/* eslint-disable */
import { getJudgeSession } from "@/lib/judge-session-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const judge = await getJudgeSession();

    if (!judge) {
      return NextResponse.json(
        { error: "Judge session expired." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const programmeId = String(body?.programmeId || "").trim();
    const scores = Array.isArray(body?.scores) ? body.scores : [];

    if (!programmeId) {
      return NextResponse.json(
        { error: "Programme is required." },
        { status: 400 },
      );
    }

    const [assignmentRes, programmeRes, codeRes] = await Promise.all([
      supabaseAdmin
        .from("judge_assignments")
        .select("id")
        .eq("judge_id", judge.id)
        .eq("programme_id", programmeId)
        .eq("event_id", judge.event_id)
        .maybeSingle(),
      supabaseAdmin
        .from("programmes")
        .select("id, total_marks")
        .eq("id", programmeId)
        .eq("event_id", judge.event_id)
        .maybeSingle(),
      supabaseAdmin
        .from("programme_codes")
        .select("registration_id")
        .eq("programme_id", programmeId)
        .eq("event_id", judge.event_id)
        .eq("is_present", true),
    ]);

    const firstError =
      assignmentRes.error || programmeRes.error || codeRes.error;

    if (firstError) {
      return NextResponse.json(
        { error: firstError.message },
        { status: 500 },
      );
    }

    if (!assignmentRes.data) {
      return NextResponse.json(
        { error: "This programme is not assigned to you." },
        { status: 403 },
      );
    }

    if (!programmeRes.data) {
      return NextResponse.json(
        { error: "Programme not found." },
        { status: 404 },
      );
    }

    const maximumMark = Number(programmeRes.data.total_marks || 100);
    const allowedRegistrations = new Set(
      (codeRes.data || []).map((item) => item.registration_id),
    );

    if (allowedRegistrations.size === 0) {
      return NextResponse.json(
        { error: "No present participants are available for this programme." },
        { status: 400 },
      );
    }

    // Validate only participant IDs actually sent by the client. Missing rows
    // are intentionally filled with 0 below, so blank/unfilled marks can still
    // be submitted safely for every present participant.
    const providedScores = new Map<string, unknown>();

    for (const score of scores) {
      const registrationId = String(score?.registration_id || "").trim();

      if (!registrationId || !allowedRegistrations.has(registrationId)) {
        return NextResponse.json(
          { error: "An invalid participant was included." },
          { status: 400 },
        );
      }

      providedScores.set(registrationId, score?.mark);
    }

    const normalizedScores = Array.from(allowedRegistrations).map(
      (registrationId) => {
        const rawMark = providedScores.get(registrationId);
        const isBlank =
          rawMark === undefined ||
          rawMark === null ||
          (typeof rawMark === "string" && rawMark.trim() === "");
        const mark = isBlank ? 0 : Number(rawMark);

        return {
          registration_id: registrationId,
          mark,
        };
      },
    );

    for (const score of normalizedScores) {
      if (
        !Number.isFinite(score.mark) ||
        score.mark < 0 ||
        score.mark > maximumMark
      ) {
        return NextResponse.json(
          {
            error: `Mark must be between 0 and ${maximumMark}. Blank fields are saved as 0.`,
          },
          { status: 400 },
        );
      }
    }

    const { data, error } = await supabaseAdmin.rpc(
      "submit_judge_scores",
      {
        target_judge_id: judge.id,
        target_programme_id: programmeId,
        score_rows: normalizedScores.map((score) => ({
          registration_id: score.registration_id,
          mark: score.mark,
          criteria_scores: {},
        })),
      },
    );

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      calculation: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unable to submit marks." },
      { status: 500 },
    );
  }
}
