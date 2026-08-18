/* eslint-disable */
import { getJudgeSession } from "@/lib/judge-session-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  const judge = await getJudgeSession();

  if (!judge) {
    return NextResponse.json({ error: "Judge session expired." }, { status: 401 });
  }

  const [
    organizationRes,
    eventRes,
    assignmentsRes,
    categoriesRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("organizations")
      .select("id, name, logo_url, place")
      .eq("id", judge.organization_id)
      .maybeSingle(),
    supabaseAdmin
      .from("events")
      .select("id, title")
      .eq("id", judge.event_id)
      .maybeSingle(),
    supabaseAdmin
      .from("judge_assignments")
      .select("programme_id")
      .eq("judge_id", judge.id)
      .eq("event_id", judge.event_id),
    supabaseAdmin
      .from("categories")
      .select("id, name")
      .eq("event_id", judge.event_id),
  ]);

  const firstError =
    organizationRes.error ||
    eventRes.error ||
    assignmentsRes.error ||
    categoriesRes.error;

  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const programmeIds = Array.from(
    new Set((assignmentsRes.data || []).map((item) => item.programme_id)),
  );

  let programmes: any[] = [];

  if (programmeIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("programmes")
      .select(
        "id, name, programme_type, stage_type, category_id, gender_scope, total_marks, sort_order, status",
      )
      .in("id", programmeIds)
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    programmes = data || [];
  }

  const [codeRes, scoreRes] = await Promise.all([
    supabaseAdmin
      .from("programme_codes")
      .select("programme_id, registration_id, is_present")
      .eq("event_id", judge.event_id)
      .in("programme_id", programmeIds.length ? programmeIds : ["00000000-0000-0000-0000-000000000000"]),
    supabaseAdmin
      .from("judge_scores")
      .select("programme_id, registration_id")
      .eq("judge_id", judge.id)
      .in("programme_id", programmeIds.length ? programmeIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  if (codeRes.error || scoreRes.error) {
    return NextResponse.json(
      { error: codeRes.error?.message || scoreRes.error?.message },
      { status: 500 },
    );
  }

  const categories = new Map(
    (categoriesRes.data || []).map((item) => [item.id, item.name]),
  );

  const cards = programmes.map((programme) => {
    const presentCodes = (codeRes.data || []).filter(
      (item) => item.programme_id === programme.id && item.is_present,
    );
    const savedScores = (scoreRes.data || []).filter(
      (item) => item.programme_id === programme.id,
    );

    return {
      ...programme,
      category_name: categories.get(programme.category_id) || "General",
      total_entries: presentCodes.length,
      saved_entries: savedScores.length,
      completed:
        presentCodes.length > 0 && savedScores.length >= presentCodes.length,
    };
  });

  return NextResponse.json({
    judge: {
      id: judge.id,
      name: judge.name,
    },
    organization: organizationRes.data,
    event: eventRes.data,
    programmes: cards,
  });
}
