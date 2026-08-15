/* eslint-disable */
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { loadPublicResultParticipants } from "@/lib/public-result-participants";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

type ResultItem = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_id: string | null;
  registration_id: string | null;
  total_mark: number;
  average_mark: number;
  grade: string | null;
  position: number | null;
  points: number;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function isPlanExpired(planEnd: string | null | undefined) {
  if (!planEnd) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(`${planEnd}T00:00:00`);
  endDate.setHours(0, 0, 0, 0);

  if (Number.isNaN(endDate.getTime())) return false;
  return endDate < today;
}

function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function resolveLiveEvent(slug: string) {
  const { data: eventData, error: eventError } = await supabaseAdmin
    .from("events")
    .select(
      "id, organization_id, title, tagline, venue, start_date, end_date, public_slug, is_public",
    )
    .eq("public_slug", slug)
    .limit(1)
    .maybeSingle();

  if (eventError) throw new Error(eventError.message);
  if (!eventData) return null;

  const { data: organizationData, error: orgError } = await supabaseAdmin
    .from("organizations")
    .select("id, name, slug, place, logo_url, status, plan_start, plan_end")
    .eq("id", eventData.organization_id)
    .limit(1)
    .maybeSingle();

  if (orgError) throw new Error(orgError.message);
  if (!organizationData) return null;

  const status = clean(organizationData.status || "active").toLowerCase();
  if (status === "inactive" || status === "disabled") {
    throw new Error("This event is currently inactive.");
  }

  if (isPlanExpired(organizationData.plan_end)) {
    throw new Error("This event plan has expired.");
  }

  return {
    event: eventData,
    organization: organizationData,
  };
}

async function loadPublishedResults(organizationId: string, eventId: string) {
  return fetchAllRows<ResultItem>((from, to) =>
    supabaseAdmin
      .from("results")
      .select(
        "id, organization_id, event_id, programme_id, registration_id, total_mark, average_mark, grade, position, points, is_published, published_at, created_at",
      )
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, to),
  );
}

async function loadParticipantBundle(
  organizationId: string,
  eventId: string,
  results: ResultItem[],
  programmes: Array<{ id: string; programme_type: string }>,
) {
  const publishedProgrammeIds = new Set(
    results
      .map((result) => result.programme_id)
      .filter((value): value is string => Boolean(value)),
  );

  const groupProgrammeIds = programmes
    .filter(
      (programme) =>
        programme.programme_type === "group" &&
        publishedProgrammeIds.has(programme.id),
    )
    .map((programme) => programme.id);

  return loadPublicResultParticipants({
    supabase: supabaseAdmin,
    organizationId,
    eventId,
    results,
    groupProgrammeIds,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: rawSlug } = await context.params;
    const slug = clean(rawSlug).toLowerCase();
    const mode = clean(request.nextUrl.searchParams.get("mode") || "bootstrap")
      .toLowerCase();

    if (!slug) return error("Event link is invalid.", 404);

    const resolved = await resolveLiveEvent(slug);
    if (!resolved) return error("This event is not available.", 404);

    const organizationId = String(resolved.event.organization_id);
    const eventId = String(resolved.event.id);

    if (mode === "results") {
      const results = await loadPublishedResults(organizationId, eventId);
      return NextResponse.json({ success: true, results });
    }

    if (mode === "participants") {
      const [results, programmeRes] = await Promise.all([
        loadPublishedResults(organizationId, eventId),
        supabaseAdmin
          .from("programmes")
          .select("id, programme_type")
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .eq("status", "active"),
      ]);

      if (programmeRes.error) throw new Error(programmeRes.error.message);

      const participantData = await loadParticipantBundle(
        organizationId,
        eventId,
        results,
        (programmeRes.data || []) as Array<{ id: string; programme_type: string }>,
      );

      return NextResponse.json({
        success: true,
        results,
        registrations: participantData.registrations,
        students: participantData.students,
      });
    }

    const [
      programmeRes,
      categoryRes,
      teamRes,
      classRes,
      settingsRes,
      results,
    ] = await Promise.all([
      supabaseAdmin
        .from("programmes")
        .select(
          "id, organization_id, event_id, name, programme_type, stage_type, category_id, gender_scope, sort_order, status",
        )
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .eq("status", "active")
        .order("sort_order", { ascending: true }),

      supabaseAdmin
        .from("categories")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true }),

      supabaseAdmin
        .from("teams")
        .select("id, name, code, color, logo_url")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true }),

      supabaseAdmin
        .from("classes")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .order("sort_order", { ascending: true }),

      supabaseAdmin
        .from("event_settings")
        .select("organization_id, event_id, theme_color, show_points")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .maybeSingle(),

      loadPublishedResults(organizationId, eventId),
    ]);

    const firstError =
      programmeRes.error || categoryRes.error || teamRes.error || classRes.error;
    if (firstError) throw new Error(firstError.message);

    const programmes = programmeRes.data || [];
    const participantData = await loadParticipantBundle(
      organizationId,
      eventId,
      results,
      programmes as Array<{ id: string; programme_type: string }>,
    );

    return NextResponse.json({
      success: true,
      event: resolved.event,
      organization: resolved.organization,
      settings: settingsRes.error ? null : settingsRes.data || null,
      programmes,
      categories: categoryRes.data || [],
      teams: teamRes.data || [],
      classes: classRes.data || [],
      results,
      registrations: participantData.registrations,
      students: participantData.students,
    });
  } catch (requestError: any) {
    console.error("Public live API error:", requestError);
    return error(requestError?.message || "Unable to load Live Results.", 500);
  }
}
