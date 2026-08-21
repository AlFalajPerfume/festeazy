/* eslint-disable */
import { getJudgeSession } from "@/lib/judge-session-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

const PAGE_SIZE = 1000;

type ProgrammeCodeRow = {
  programme_id: string;
  registration_id: string;
  is_present: boolean | null;
};

type JudgeScoreRow = {
  programme_id: string;
  registration_id: string;
};

async function loadAllProgrammeCodes(
  organizationId: string,
  eventId: string,
  programmeIds: string[],
): Promise<ProgrammeCodeRow[]> {
  if (programmeIds.length === 0) return [];

  const rows: ProgrammeCodeRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("programme_codes")
      .select("programme_id, registration_id, is_present")
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .in("programme_id", programmeIds)
      .order("programme_id", { ascending: true })
      .order("registration_id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data || []) as ProgrammeCodeRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

async function loadAllJudgeScores(
  organizationId: string,
  eventId: string,
  judgeId: string,
  programmeIds: string[],
): Promise<JudgeScoreRow[]> {
  if (programmeIds.length === 0) return [];

  const rows: JudgeScoreRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabaseAdmin
      .from("judge_scores")
      .select("programme_id, registration_id")
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .eq("judge_id", judgeId)
      .in("programme_id", programmeIds)
      .order("programme_id", { ascending: true })
      .order("registration_id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data || []) as JudgeScoreRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }
  }

  return rows;
}

export async function GET() {
  const judge = await getJudgeSession();

  if (!judge) {
    return NextResponse.json(
      { error: "Judge session expired." },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const [organizationRes, eventRes, assignmentsRes, categoriesRes] =
    await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("id, name, logo_url, place")
        .eq("id", judge.organization_id)
        .maybeSingle(),
      supabaseAdmin
        .from("events")
        .select("id, title")
        .eq("id", judge.event_id)
        .eq("organization_id", judge.organization_id)
        .maybeSingle(),
      supabaseAdmin
        .from("judge_assignments")
        .select("programme_id")
        .eq("judge_id", judge.id)
        .eq("event_id", judge.event_id),
      supabaseAdmin
        .from("categories")
        .select("id, name")
        .eq("organization_id", judge.organization_id)
        .eq("event_id", judge.event_id),
    ]);

  const firstError =
    organizationRes.error ||
    eventRes.error ||
    assignmentsRes.error ||
    categoriesRes.error;

  if (firstError) {
    return NextResponse.json(
      { error: firstError.message },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const programmeIds = Array.from(
    new Set(
      (assignmentsRes.data || [])
        .map((item) => String(item.programme_id || "").trim())
        .filter(Boolean),
    ),
  );

  let programmes: any[] = [];

  if (programmeIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("programmes")
      .select(
        "id, name, programme_type, stage_type, category_id, gender_scope, total_marks, sort_order, status",
      )
      .eq("organization_id", judge.organization_id)
      .eq("event_id", judge.event_id)
      .in("id", programmeIds)
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        {
          status: 500,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    programmes = data || [];
  }

  let codeRows: ProgrammeCodeRow[] = [];
  let scoreRows: JudgeScoreRow[] = [];

  try {
    [codeRows, scoreRows] = await Promise.all([
      loadAllProgrammeCodes(
        judge.organization_id,
        judge.event_id,
        programmeIds,
      ),
      loadAllJudgeScores(
        judge.organization_id,
        judge.event_id,
        judge.id,
        programmeIds,
      ),
    ]);
  } catch (loadError: any) {
    return NextResponse.json(
      {
        error:
          loadError?.message ||
          "Unable to load programme codes and judge scores.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const categories = new Map(
    (categoriesRes.data || []).map((item) => [item.id, item.name]),
  );

  const presentRegistrationIdsByProgramme = new Map<
    string,
    Set<string>
  >();

  for (const code of codeRows) {
    if (!code.is_present) continue;

    const programmeId = String(code.programme_id || "");
    const registrationId = String(code.registration_id || "");

    if (!programmeId || !registrationId) continue;

    if (!presentRegistrationIdsByProgramme.has(programmeId)) {
      presentRegistrationIdsByProgramme.set(programmeId, new Set<string>());
    }

    presentRegistrationIdsByProgramme
      .get(programmeId)!
      .add(registrationId);
  }

  const scoredRegistrationIdsByProgramme = new Map<
    string,
    Set<string>
  >();

  for (const score of scoreRows) {
    const programmeId = String(score.programme_id || "");
    const registrationId = String(score.registration_id || "");

    if (!programmeId || !registrationId) continue;

    if (!scoredRegistrationIdsByProgramme.has(programmeId)) {
      scoredRegistrationIdsByProgramme.set(programmeId, new Set<string>());
    }

    scoredRegistrationIdsByProgramme
      .get(programmeId)!
      .add(registrationId);
  }

  const cards = programmes.map((programme) => {
    const presentIds =
      presentRegistrationIdsByProgramme.get(programme.id) ||
      new Set<string>();

    const scoredIds =
      scoredRegistrationIdsByProgramme.get(programme.id) ||
      new Set<string>();

    let savedEntries = 0;

    presentIds.forEach((registrationId) => {
      if (scoredIds.has(registrationId)) {
        savedEntries += 1;
      }
    });

    const totalEntries = presentIds.size;

    return {
      ...programme,
      category_name: categories.get(programme.category_id) || "General",
      total_entries: totalEntries,
      saved_entries: savedEntries,
      completed: totalEntries > 0 && savedEntries >= totalEntries,
    };
  });

  return NextResponse.json(
    {
      judge: {
        id: judge.id,
        name: judge.name,
      },
      organization: organizationRes.data,
      event: eventRes.data,
      programmes: cards,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
