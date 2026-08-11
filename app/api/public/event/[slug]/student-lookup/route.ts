/* eslint-disable */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

type StudentRow = {
  id: string;
  chest_no: string | null;
  name: string;
  gender: string | null;
  category_id: string | null;
  class_id: string | null;
  division_id: string | null;
  team_id: string | null;
  status: string | null;
};

type RegistrationRow = {
  id: string;
  programme_id: string | null;
  student_id: string | null;
  team_id: string | null;
  group_name: string | null;
  status: string | null;
};

type ProgrammeRow = {
  id: string;
  name: string;
  programme_type: string;
  stage_type: string;
  category_id: string | null;
  gender_scope: string;
  sort_order: number;
  status: string | null;
};

type ScheduleStage = {
  id: string;
  name: string;
  stage_date: string | null;
  start_time: string | null;
  gap_minutes: number | null;
  sort_order: number | null;
};

type ScheduleItem = {
  id: string;
  stage_id: string;
  programme_id: string;
  duration_minutes: number | null;
  gap_after_minutes: number | null;
  sort_order: number | null;
  status: string | null;
};

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function cleanChest(value: unknown) {
  return clean(value).replace(/^#+/, "").trim();
}

function normalize(value: unknown) {
  return clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalGender(value: unknown) {
  const text = normalize(value);
  if (!text) return "";
  if (text.includes("female") || text.includes("girl")) return "female";
  if (text.includes("male") || text.includes("boy")) return "male";
  return text.replace(/\s+/g, "_");
}

function genderLabel(value: unknown) {
  const canonical = canonicalGender(value);
  if (canonical === "female") return "Girls";
  if (canonical === "male") return "Boys";

  const original = clean(value);
  if (!original) return "Other";

  return original
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeStageType(value: unknown) {
  const text = normalize(value).replace(/\s+/g, "_");
  return text.includes("off") ? "off_stage" : "stage";
}

function timeToMinutes(value: string | null | undefined) {
  const [hours, minutes] = String(value || "09:00")
    .split(":")
    .map((part) => Number(part));

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 9 * 60;
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number) {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
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

async function resolvePublicEvent(slug: string) {
  const { data: eventData, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id, organization_id, public_slug, is_public")
    .eq("public_slug", slug)
    .eq("is_public", true)
    .limit(1)
    .maybeSingle();

  if (eventError) throw new Error(eventError.message);
  if (!eventData) {
    return {
      response: error("This public event is not available.", 404),
      event: null,
    };
  }

  const [{ data: organizationData, error: orgError }, settingsRes] =
    await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("id, status, plan_end")
        .eq("id", eventData.organization_id)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("event_settings")
        .select("show_student_search")
        .eq("organization_id", eventData.organization_id)
        .eq("event_id", eventData.id)
        .maybeSingle(),
    ]);

  if (orgError) throw new Error(orgError.message);
  if (!organizationData) {
    return {
      response: error("This public event is not available.", 404),
      event: null,
    };
  }

  const orgStatus = normalize(organizationData.status || "active");
  if (["inactive", "disabled"].includes(orgStatus)) {
    return {
      response: error("This public event is currently unavailable.", 403),
      event: null,
    };
  }

  if (isPlanExpired(organizationData.plan_end)) {
    return {
      response: error("This public event is currently unavailable.", 403),
      event: null,
    };
  }

  if (!settingsRes.error && settingsRes.data?.show_student_search === false) {
    return {
      response: error("Student programme lookup is disabled for this event.", 403),
      event: null,
    };
  }

  return {
    response: null,
    event: {
      id: String(eventData.id),
      organizationId: String(eventData.organization_id),
    },
  };
}

async function ensureCategory(
  organizationId: string,
  eventId: string,
  categoryId: string,
) {
  if (!categoryId) return null;

  const { data, error: categoryError } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .eq("id", categoryId)
    .eq("organization_id", organizationId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (categoryError) throw new Error(categoryError.message);
  return data || null;
}

async function ensureClass(
  organizationId: string,
  eventId: string,
  classId: string,
) {
  if (!classId) return null;

  const { data, error: classError } = await supabaseAdmin
    .from("classes")
    .select("id, name, category_id")
    .eq("id", classId)
    .eq("organization_id", organizationId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (classError) throw new Error(classError.message);
  return data || null;
}

async function loadStudentProgrammes(
  organizationId: string,
  eventId: string,
  studentId: string,
  classId: string,
  gender: string,
) {
  const { data: matchedStudent, error: studentError } = await supabaseAdmin
    .from("students")
    .select(
      "id, chest_no, name, gender, category_id, class_id, division_id, team_id, status",
    )
    .eq("id", studentId)
    .eq("organization_id", organizationId)
    .eq("event_id", eventId)
    .eq("class_id", classId)
    .maybeSingle();

  if (studentError) throw new Error(studentError.message);

  if (
    !matchedStudent ||
    ["inactive", "disabled"].includes(normalize(matchedStudent.status || "active")) ||
    canonicalGender(matchedStudent.gender) !== canonicalGender(gender)
  ) {
    return error("The selected student is not available.", 404);
  }

  const { data: registrationRows, error: registrationError } = await supabaseAdmin
    .from("programme_registrations")
    .select("id, programme_id, student_id, team_id, group_name, status")
    .eq("organization_id", organizationId)
    .eq("event_id", eventId)
    .eq("student_id", matchedStudent.id);

  if (registrationError) throw new Error(registrationError.message);

  const registrations = ((registrationRows || []) as RegistrationRow[]).filter(
    (row) => !["cancelled", "inactive", "deleted"].includes(normalize(row.status)),
  );

  const programmeIds = Array.from(
    new Set(
      registrations
        .map((row) => row.programme_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const programmePromise = programmeIds.length
    ? supabaseAdmin
        .from("programmes")
        .select(
          "id, name, programme_type, stage_type, category_id, gender_scope, sort_order, status",
        )
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .in("id", programmeIds)
    : Promise.resolve({ data: [], error: null } as any);

  const [
    categoryRes,
    classRes,
    divisionRes,
    teamRes,
    programmeRes,
    stageRes,
    itemRes,
  ] = await Promise.all([
    matchedStudent.category_id
      ? supabaseAdmin
          .from("categories")
          .select("id, name")
          .eq("id", matchedStudent.category_id)
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    matchedStudent.class_id
      ? supabaseAdmin
          .from("classes")
          .select("id, name")
          .eq("id", matchedStudent.class_id)
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    matchedStudent.division_id
      ? supabaseAdmin
          .from("class_divisions")
          .select("id, name")
          .eq("id", matchedStudent.division_id)
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    matchedStudent.team_id
      ? supabaseAdmin
          .from("teams")
          .select("id, name, color")
          .eq("id", matchedStudent.team_id)
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    programmePromise,
    supabaseAdmin
      .from("schedule_stages")
      .select("id, name, stage_date, start_time, gap_minutes, sort_order")
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("schedule_items")
      .select("id, stage_id, programme_id, duration_minutes, gap_after_minutes, sort_order, status")
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true }),
  ]);

  if (programmeRes.error) throw new Error(programmeRes.error.message);

  const programmes = ((programmeRes.data || []) as ProgrammeRow[]).filter(
    (row) => !["inactive", "disabled"].includes(normalize(row.status || "active")),
  );

  const programmeMap = new Map(programmes.map((row) => [row.id, row]));

  const categoryIds = Array.from(
    new Set(
      programmes
        .map((row) => row.category_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const { data: programmeCategoryRows } = categoryIds.length
    ? await supabaseAdmin
        .from("categories")
        .select("id, name")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .in("id", categoryIds)
    : { data: [] as any[] };

  const programmeCategoryMap = new Map(
    (programmeCategoryRows || []).map((row: any) => [row.id, row.name]),
  );

  const scheduleMap = new Map<
    string,
    {
      stageName: string;
      date: string | null;
      startTime: string;
      endTime: string;
    }
  >();

  const stages = ((stageRes.error ? [] : stageRes.data || []) as ScheduleStage[]).sort(
    (a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0),
  );
  const scheduleItems = (itemRes.error ? [] : itemRes.data || []) as ScheduleItem[];

  stages.forEach((stage) => {
    let currentMinutes = timeToMinutes(stage.start_time || "09:00");

    const stageItems = scheduleItems
      .filter(
        (item) =>
          item.stage_id === stage.id &&
          !["cancelled", "inactive"].includes(normalize(item.status)),
      )
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));

    stageItems.forEach((item) => {
      const duration = Math.max(0, Number(item.duration_minutes || 0));
      const startMinutes = currentMinutes;
      const endMinutes = startMinutes + duration;

      if (!scheduleMap.has(item.programme_id)) {
        scheduleMap.set(item.programme_id, {
          stageName: stage.name,
          date: stage.stage_date,
          startTime: minutesToTime(startMinutes),
          endTime: minutesToTime(endMinutes),
        });
      }

      const effectiveGap =
        item.gap_after_minutes === null ||
        item.gap_after_minutes === undefined
          ? Math.max(0, Number(stage.gap_minutes || 0))
          : Math.max(0, Number(item.gap_after_minutes || 0));

      currentMinutes = endMinutes + effectiveGap;
    });
  });

  const assignments = registrations
    .map((registration) => {
      if (!registration.programme_id) return null;
      const programme = programmeMap.get(registration.programme_id);
      if (!programme) return null;

      return {
        registrationId: registration.id,
        programmeId: programme.id,
        name: programme.name,
        programmeType: programme.programme_type,
        stageType: programme.stage_type,
        categoryName: programme.category_id
          ? programmeCategoryMap.get(programme.category_id) || "General"
          : "General",
        genderScope: programme.gender_scope,
        groupName: registration.group_name,
        sortOrder: Number(programme.sort_order || 0),
        schedule: scheduleMap.get(programme.id) || null,
      };
    })
    .filter(Boolean) as Array<{
    registrationId: string;
    programmeId: string;
    name: string;
    programmeType: string;
    stageType: string;
    categoryName: string;
    genderScope: string;
    groupName: string | null;
    sortOrder: number;
    schedule: {
      stageName: string;
      date: string | null;
      startTime: string;
      endTime: string;
    } | null;
  }>;

  assignments.sort((a, b) => {
    const aStage = normalizeStageType(a.stageType) === "stage" ? 0 : 1;
    const bStage = normalizeStageType(b.stageType) === "stage" ? 0 : 1;
    if (aStage !== bStage) return aStage - bStage;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({
    success: true,
    student: {
      id: matchedStudent.id,
      chestNo: cleanChest(matchedStudent.chest_no),
      name: matchedStudent.name,
      gender: matchedStudent.gender || "",
      categoryName: categoryRes.data?.name || "General",
      className: classRes.data?.name || "",
      divisionName: divisionRes.data?.name || "",
      teamName: teamRes.data?.name || "",
      teamColor: teamRes.data?.color || null,
    },
    programmes: assignments,
  });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug: rawSlug } = await context.params;
    const slug = clean(rawSlug).toLowerCase();
    const body = await request.json().catch(() => ({}));
    const action = clean(body?.action || "bootstrap").toLowerCase();

    if (!slug) return error("Event link is invalid.", 404);

    const resolved = await resolvePublicEvent(slug);
    if (resolved.response || !resolved.event) {
      return resolved.response || error("This public event is not available.", 404);
    }

    const organizationId = resolved.event.organizationId;
    const eventId = resolved.event.id;

    if (action === "bootstrap") {
      const [categoryResult, classResult] = await Promise.all([
        supabaseAdmin
          .from("categories")
          .select("id, name, sort_order")
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
        supabaseAdmin
          .from("classes")
          .select("id, name, category_id, sort_order")
          .eq("organization_id", organizationId)
          .eq("event_id", eventId),
      ]);

      if (categoryResult.error) throw new Error(categoryResult.error.message);
      if (classResult.error) throw new Error(classResult.error.message);

      const categoryMap = new Map<string, { name: string; sortOrder: number }>(
        (categoryResult.data || []).map((row: any, index: number) =>
          [
            String(row.id),
            {
              name: String(row.name || "Category"),
              sortOrder: Number(row.sort_order ?? index + 1),
            },
          ] as const,
        ),
      );

      const classes = [...(classResult.data || [])]
        .sort((first: any, second: any) => {
          const firstCategory = categoryMap.get(String(first.category_id || ""));
          const secondCategory = categoryMap.get(String(second.category_id || ""));
          const categoryCompare =
            Number(firstCategory?.sortOrder ?? Number.MAX_SAFE_INTEGER) -
            Number(secondCategory?.sortOrder ?? Number.MAX_SAFE_INTEGER);

          if (categoryCompare !== 0) return categoryCompare;

          const classCompare =
            Number(first.sort_order ?? Number.MAX_SAFE_INTEGER) -
            Number(second.sort_order ?? Number.MAX_SAFE_INTEGER);

          if (classCompare !== 0) return classCompare;
          return String(first.name || "").localeCompare(String(second.name || ""));
        })
        .map((row: any) => {
          const category = categoryMap.get(String(row.category_id || ""));
          const className = String(row.name || "Class");

          return {
            id: String(row.id),
            name: category?.name ? `${category.name} — ${className}` : className,
          };
        });

      return NextResponse.json({
        success: true,
        classes,
      });
    }

    const classId = clean(body?.classId);
    if (!classId) return error("Select a class.");

    const classItem = await ensureClass(organizationId, eventId, classId);
    if (!classItem) return error("The selected class is not available.", 404);

    if (action === "genders") {
      const { data, error: studentError } = await supabaseAdmin
        .from("students")
        .select("gender")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .eq("class_id", classId)
        .eq("status", "active")
        .limit(5000);

      if (studentError) throw new Error(studentError.message);

      const byCanonical = new Map<string, { value: string; label: string }>();

      (data || []).forEach((row: any) => {
        const value = canonicalGender(row.gender);
        if (!value || byCanonical.has(value)) return;
        byCanonical.set(value, {
          value,
          label: genderLabel(row.gender),
        });
      });

      const genders = Array.from(byCanonical.values()).sort((a, b) => {
        const order = (value: string) =>
          value === "male" ? 0 : value === "female" ? 1 : 2;
        const rank = order(a.value) - order(b.value);
        if (rank !== 0) return rank;
        return a.label.localeCompare(b.label);
      });

      return NextResponse.json({ success: true, genders });
    }

    const gender = canonicalGender(body?.gender);
    if (!gender) return error("Select a gender.");

    if (action === "students") {
      const { data, error: studentError } = await supabaseAdmin
        .from("students")
        .select("id, chest_no, name, gender, division_id, status")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .eq("class_id", classId)
        .eq("status", "active")
        .order("name", { ascending: true })
        .limit(5000);

      if (studentError) throw new Error(studentError.message);

      const matchingStudents = ((data || []) as Array<{
        id: string;
        chest_no: string | null;
        name: string;
        gender: string | null;
        division_id: string | null;
        status: string | null;
      }>).filter((row) => canonicalGender(row.gender) === gender);

      const divisionIds = Array.from(
        new Set(
          matchingStudents
            .map((row) => row.division_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      const { data: divisionRows, error: divisionError } = divisionIds.length
        ? await supabaseAdmin
            .from("class_divisions")
            .select("id, name")
            .eq("organization_id", organizationId)
            .eq("event_id", eventId)
            .in("id", divisionIds)
        : { data: [] as any[], error: null as any };

      if (divisionError) throw new Error(divisionError.message);

      const divisionMap = new Map(
        (divisionRows || []).map((row: any) => [String(row.id), String(row.name || "")]),
      );

      const nameCount = new Map<string, number>();
      matchingStudents.forEach((row) => {
        const key = normalize(row.name);
        nameCount.set(key, (nameCount.get(key) || 0) + 1);
      });

      return NextResponse.json({
        success: true,
        students: matchingStudents.map((row) => {
          const divisionName = row.division_id
            ? divisionMap.get(String(row.division_id)) || ""
            : "";
          const duplicateName = (nameCount.get(normalize(row.name)) || 0) > 1;
          const chest = cleanChest(row.chest_no);
          const chestHint =
            duplicateName && chest
              ? chest.length <= 2
                ? chest
                : chest.slice(-2)
              : "";

          return {
            id: String(row.id),
            name: String(row.name || "Student"),
            divisionName,
            chestHint,
          };
        }),
      });
    }

    if (action === "student") {
      const studentId = clean(body?.studentId);
      if (!studentId) return error("Select a student.");

      return await loadStudentProgrammes(
        organizationId,
        eventId,
        studentId,
        classId,
        gender,
      );
    }

    return error("Unsupported lookup action.");
  } catch (cause: any) {
    console.error("Public student lookup failed:", cause);
    return error("Unable to load the student lookup right now. Please try again.", 500);
  }
}
