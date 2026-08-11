/* eslint-disable */
import { getJudgeSession } from "@/lib/judge-session-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const judge = await getJudgeSession();

  if (!judge) {
    return NextResponse.json(
      { error: "Judge session expired." },
      { status: 401 },
    );
  }

  const { id: programmeId } = await context.params;

  const { data: assignment, error: assignmentError } = await supabaseAdmin
    .from("judge_assignments")
    .select("id")
    .eq("judge_id", judge.id)
    .eq("programme_id", programmeId)
    .eq("event_id", judge.event_id)
    .maybeSingle();

  if (assignmentError) {
    return NextResponse.json(
      { error: assignmentError.message },
      { status: 500 },
    );
  }

  if (!assignment) {
    return NextResponse.json(
      { error: "This programme is not assigned to you." },
      { status: 403 },
    );
  }

  const [programmeRes, codesRes, scoresRes] = await Promise.all([
    supabaseAdmin
      .from("programmes")
      .select(
        "id, name, programme_type, stage_type, category_id, total_marks",
      )
      .eq("id", programmeId)
      .eq("event_id", judge.event_id)
      .maybeSingle(),
    supabaseAdmin
      .from("programme_codes")
      .select("registration_id, code_letter, is_present")
      .eq("programme_id", programmeId)
      .eq("event_id", judge.event_id)
      .order("code_letter", { ascending: true }),
    supabaseAdmin
      .from("judge_scores")
      .select("registration_id, mark")
      .eq("judge_id", judge.id)
      .eq("programme_id", programmeId),
  ]);

  const firstError =
    programmeRes.error || codesRes.error || scoresRes.error;

  if (firstError) {
    return NextResponse.json(
      { error: firstError.message },
      { status: 500 },
    );
  }

  if (!programmeRes.data) {
    return NextResponse.json(
      { error: "Programme not found." },
      { status: 404 },
    );
  }

  const saved = new Map(
    (scoresRes.data || []).map((item) => [
      item.registration_id,
      item.mark,
    ]),
  );

  const entries = (codesRes.data || [])
    .filter((item) => item.is_present)
    .map((item) => ({
      registration_id: item.registration_id,
      code_letter: item.code_letter,
      saved_mark: saved.get(item.registration_id) ?? null,
    }));

  return NextResponse.json({
    judge: { id: judge.id, name: judge.name },
    programme: programmeRes.data,
    entries,
    submitted:
      entries.length > 0 &&
      entries.every((item) => item.saved_mark !== null),
  });
}
