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

    if (!programmeId || scores.length === 0) {
      return NextResponse.json(
        { error: "Programme and marks are required." },
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

    if (scores.length !== allowedRegistrations.size) {
      return NextResponse.json(
        { error: "Enter marks for every present participant." },
        { status: 400 },
      );
    }

    for (const score of scores) {
      if (!allowedRegistrations.has(score.registration_id)) {
        return NextResponse.json(
          { error: "An invalid participant was included." },
          { status: 400 },
        );
      }

      const mark = Number(score.mark);

      if (!Number.isFinite(mark) || mark < 0 || mark > maximumMark) {
        return NextResponse.json(
          {
            error: `Mark must be between 0 and ${maximumMark}.`,
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
        score_rows: scores.map((score: any) => ({
          registration_id: score.registration_id,
          mark: Number(score.mark),
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
