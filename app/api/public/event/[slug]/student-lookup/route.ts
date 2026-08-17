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

const DEFAULT_CERTIFICATE_MESSAGE_TEMPLATE = `This Certificate of Merit is awarded to {student_name} of {organization_name} for securing {grade} Grade in {programme_name} in {event_title} held on {event_date} at {venue}.

Category: {category_name}

We wish {pronoun} all the best for a glorious future.`;

const DEFAULT_STUDENT_NAME_LAYOUT = {
  x_mm: 82,
  y_mm: 73,
  width_mm: 190,
  font_size_pt: 31,
  line_height: 1.05,
  text_color: "#4b5563",
  text_align: "center",
  font_family: '"Great Vibes", "Brush Script MT", cursive',
};

const DEFAULT_PUBLIC_CERTIFICATE_SETTINGS = {
  message_template: DEFAULT_CERTIFICATE_MESSAGE_TEMPLATE,
  text_x_mm: 46,
  text_y_mm: 73,
  text_width_mm: 205,
  font_size_pt: 11.5,
  line_height: 1.55,
  text_color: "#4f86a5",
  text_align: "center",
  font_family: "Arial, Helvetica, sans-serif",
  preview_template_url: null as string | null,
  public_positions: [1, 2] as number[],
  layout_config: {
    student_name: DEFAULT_STUDENT_NAME_LAYOUT,
  },
};

function safeCertificateNumber(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function cleanStudentNameLayout(value: unknown) {
  const source = value && typeof value === "object" ? (value as any) : {};
  const color = clean(
    source.text_color || DEFAULT_STUDENT_NAME_LAYOUT.text_color,
  );

  return {
    x_mm: safeCertificateNumber(
      source.x_mm,
      DEFAULT_STUDENT_NAME_LAYOUT.x_mm,
      0,
      280,
    ),
    y_mm: safeCertificateNumber(
      source.y_mm,
      DEFAULT_STUDENT_NAME_LAYOUT.y_mm,
      0,
      195,
    ),
    width_mm: safeCertificateNumber(
      source.width_mm,
      DEFAULT_STUDENT_NAME_LAYOUT.width_mm,
      40,
      290,
    ),
    font_size_pt: safeCertificateNumber(
      source.font_size_pt,
      DEFAULT_STUDENT_NAME_LAYOUT.font_size_pt,
      8,
      72,
    ),
    line_height: safeCertificateNumber(
      source.line_height,
      DEFAULT_STUDENT_NAME_LAYOUT.line_height,
      0.7,
      2,
    ),
    text_color: /^#[0-9a-fA-F]{6}$/.test(color)
      ? color
      : DEFAULT_STUDENT_NAME_LAYOUT.text_color,
    text_align: ["left", "center", "right"].includes(
      clean(source.text_align),
    )
      ? clean(source.text_align)
      : DEFAULT_STUDENT_NAME_LAYOUT.text_align,
    font_family:
      clean(source.font_family) || DEFAULT_STUDENT_NAME_LAYOUT.font_family,
  };
}

function cleanPublicPositions(value: unknown) {
  if (!Array.isArray(value)) return [1, 2];
  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 3),
    ),
  ).sort((a, b) => a - b);
}

function certificatePositionLabel(position: number) {
  if (position === 1) return "First Place";
  if (position === 2) return "Second Place";
  if (position === 3) return "Third Place";
  return `Position ${position}`;
}

function certificateDateText(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
) {
  const formatDate = (value: string | null | undefined) => {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  if (!startDate && !endDate) return "the event date";
  if (!endDate || startDate === endDate) return formatDate(startDate || endDate);
  if (!startDate) return formatDate(endDate);
  return `${formatDate(startDate)} to ${formatDate(endDate)}`;
}

function certificatePronoun(value: unknown) {
  const gender = canonicalGender(value);
  if (gender === "female") return "her";
  if (gender === "male") return "him";
  return "them";
}

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
    .select("id, organization_id, title, tagline, venue, start_date, end_date, public_slug, is_public")
    .eq("public_slug", slug)
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
        .select("id, name, slug, place, logo_url, status, plan_end")
        .eq("id", eventData.organization_id)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("event_settings")
        .select("organization_id, event_id, theme_color, show_student_search")
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
      eventInfo: {
        id: String(eventData.id),
        organization_id: String(eventData.organization_id),
        title: String(eventData.title || "Event"),
        tagline: eventData.tagline ? String(eventData.tagline) : null,
        venue: eventData.venue ? String(eventData.venue) : null,
        start_date: eventData.start_date ? String(eventData.start_date) : null,
        end_date: eventData.end_date ? String(eventData.end_date) : null,
        public_slug: String(eventData.public_slug || slug),
        is_public: Boolean(eventData.is_public),
      },
      organization: {
        id: String(organizationData.id),
        name: String(organizationData.name || "Organization"),
        slug: organizationData.slug ? String(organizationData.slug) : null,
        place: organizationData.place ? String(organizationData.place) : null,
        logo_url: organizationData.logo_url ? String(organizationData.logo_url) : null,
        status: organizationData.status ? String(organizationData.status) : null,
        plan_end: organizationData.plan_end ? String(organizationData.plan_end) : null,
      },
      settings: {
        organization_id: String(eventData.organization_id),
        event_id: String(eventData.id),
        theme_color: settingsRes.data?.theme_color
          ? String(settingsRes.data.theme_color)
          : "emerald",
        show_student_search: settingsRes.data?.show_student_search !== false,
      },
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
  publicEventInfo: any,
  publicOrganization: any,
  includeCertificateDownloadData = false,
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

  const { data: certificateSettingsRow, error: certificateSettingsError } =
    await supabaseAdmin
      .from("certificate_print_settings")
      .select(
        "message_template, text_x_mm, text_y_mm, text_width_mm, font_size_pt, line_height, text_color, text_align, font_family, preview_template_url, public_positions, layout_config",
      )
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .maybeSingle();

  if (certificateSettingsError) {
    throw new Error(certificateSettingsError.message);
  }

  const certificateSettings = {
    ...DEFAULT_PUBLIC_CERTIFICATE_SETTINGS,
    ...(certificateSettingsRow || {}),
    public_positions: cleanPublicPositions(
      certificateSettingsRow?.public_positions,
    ),
    layout_config: {
      student_name: cleanStudentNameLayout(
        (certificateSettingsRow as any)?.layout_config?.student_name,
      ),
    },
  };

  // Public certificate downloads are available only after the admin has
  // uploaded a Merit Certificate template. Without a template, keep the
  // entire certificate feature hidden from Student Lookup.
  const hasCertificateTemplate = Boolean(
    clean(certificateSettings.preview_template_url),
  );

  const publicPositions = hasCertificateTemplate
    ? certificateSettings.public_positions
    : [];

  const { data: publishedResultRows, error: publishedResultError } =
    programmeIds.length > 0 && publicPositions.length > 0
      ? await supabaseAdmin
          .from("results")
          .select(
            "id, programme_id, registration_id, grade, position, total_mark, average_mark, is_published, published_at",
          )
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .eq("is_published", true)
          .in("programme_id", programmeIds)
      : { data: [] as any[], error: null as any };

  if (publishedResultError) throw new Error(publishedResultError.message);

  const eligibleResults = (publishedResultRows || []).filter((result: any) => {
    const position = Number(result.position || 0);
    const grade = normalize(result.grade || "");
    return publicPositions.includes(position) && grade !== "absent";
  });

  const resultRegistrationIds = Array.from(
    new Set(
      eligibleResults
        .map((result: any) => clean(result.registration_id))
        .filter(Boolean),
    ),
  );

  const { data: resultRegistrationRows, error: resultRegistrationError } =
    resultRegistrationIds.length > 0
      ? await supabaseAdmin
          .from("programme_registrations")
          .select("id, programme_id, student_id, team_id, group_name, status")
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .in("id", resultRegistrationIds)
      : { data: [] as any[], error: null as any };

  if (resultRegistrationError) throw new Error(resultRegistrationError.message);

  const resultRegistrationMap = new Map(
    (resultRegistrationRows || []).map((row: any) => [String(row.id), row]),
  );

  const certificates = eligibleResults
    .map((result: any) => {
      const programme = programmeMap.get(String(result.programme_id || ""));
      if (!programme) return null;

      const resultRegistration = resultRegistrationMap.get(
        String(result.registration_id || ""),
      ) as any;
      if (!resultRegistration) return null;

      const matchingStudentRegistration = registrations.find((registration) => {
        if (registration.programme_id !== programme.id) return false;

        if (programme.programme_type === "group") {
          return (
            registration.team_id === resultRegistration.team_id &&
            normalize(registration.group_name) ===
              normalize(resultRegistration.group_name)
          );
        }

        return registration.id === resultRegistration.id;
      });

      if (!matchingStudentRegistration) return null;

      const categoryName = programme.category_id
        ? programmeCategoryMap.get(programme.category_id) || "General"
        : "General";
      const position = Number(result.position || 0);
      const positionText = certificatePositionLabel(position);
      const gradeText = clean(result.grade || "");

      const replacements: Record<string, string> = {
        "{student_name}": String(matchedStudent.name || "Student"),
        "{organization_name}": String(publicOrganization?.name || "Organization"),
        "{grade}": gradeText,
        "{programme_name}": String(programme.name || "Programme"),
        "{event_title}": String(publicEventInfo?.title || "Event"),
        "{event_date}": certificateDateText(
          publicEventInfo?.start_date,
          publicEventInfo?.end_date,
        ),
        "{venue}": String(
          publicEventInfo?.venue || publicOrganization?.place || "the event venue",
        ),
        "{category_name}": String(categoryName),
        "{team_name}": String(teamRes.data?.name || ""),
        "{group_name}": String(matchingStudentRegistration.group_name || ""),
        "{position}": positionText,
        "{pronoun}": certificatePronoun(matchedStudent.gender),
      };

      const messageText = Object.entries(replacements).reduce(
        (text, [token, value]) => text.split(token).join(value),
        String(
          certificateSettings.message_template ||
            DEFAULT_CERTIFICATE_MESSAGE_TEMPLATE,
        ),
      );

      return {
        id: `${result.id}:${matchedStudent.id}`,
        resultId: String(result.id),
        programmeId: programme.id,
        programmeName: programme.name,
        programmeType: programme.programme_type,
        categoryName,
        groupName: matchingStudentRegistration.group_name || null,
        position,
        positionLabel: positionText,
        grade: gradeText,
        publishedAt: result.published_at || null,
        messageText,
      };
    })
    .filter(Boolean)
    .sort((a: any, b: any) => {
      if (a.position !== b.position) return a.position - b.position;
      const firstProgramme = programmeMap.get(a.programmeId);
      const secondProgramme = programmeMap.get(b.programmeId);
      const order =
        Number(firstProgramme?.sort_order || 9999) -
        Number(secondProgramme?.sort_order || 9999);
      if (order !== 0) return order;
      return String(a.programmeName).localeCompare(String(b.programmeName));
    });

  const publicCertificates = certificates.map((certificate: any) =>
    includeCertificateDownloadData
      ? certificate
      : {
          id: certificate.id,
          resultId: certificate.resultId,
          programmeId: certificate.programmeId,
          programmeName: certificate.programmeName,
          programmeType: certificate.programmeType,
          categoryName: certificate.categoryName,
          groupName: certificate.groupName,
          position: certificate.position,
          positionLabel: certificate.positionLabel,
          grade: certificate.grade,
          publishedAt: certificate.publishedAt,
        },
  );

  return NextResponse.json({
    success: true,
    student: {
      id: matchedStudent.id,
      name: matchedStudent.name,
      gender: matchedStudent.gender || "",
      categoryName: categoryRes.data?.name || "General",
      className: classRes.data?.name || "",
      divisionName: divisionRes.data?.name || "",
      teamName: teamRes.data?.name || "",
      teamColor: teamRes.data?.color || null,
    },
    programmes: assignments,
    certificates: publicCertificates,
    certificateSettings: includeCertificateDownloadData
      ? {
      templateUrl: certificateSettings.preview_template_url || null,
      textXmm: Number(certificateSettings.text_x_mm || 46),
      textYmm: Number(certificateSettings.text_y_mm || 73),
      textWidthMm: Number(certificateSettings.text_width_mm || 205),
      fontSizePt: Number(certificateSettings.font_size_pt || 11.5),
      lineHeight: Number(certificateSettings.line_height || 1.55),
      textColor: String(certificateSettings.text_color || "#4f86a5"),
      textAlign: ["left", "center", "right"].includes(
        String(certificateSettings.text_align || "center"),
      )
        ? String(certificateSettings.text_align)
        : "center",
      fontFamily: String(
        certificateSettings.font_family ||
          "Arial, Helvetica, sans-serif",
      ),
      eligiblePositions: publicPositions,
      studentNameXmm: certificateSettings.layout_config.student_name.x_mm,
      studentNameYmm: certificateSettings.layout_config.student_name.y_mm,
      studentNameWidthMm:
        certificateSettings.layout_config.student_name.width_mm,
      studentNameFontSizePt:
        certificateSettings.layout_config.student_name.font_size_pt,
      studentNameLineHeight:
        certificateSettings.layout_config.student_name.line_height,
      studentNameTextColor:
        certificateSettings.layout_config.student_name.text_color,
      studentNameTextAlign:
        certificateSettings.layout_config.student_name.text_align,
      studentNameFontFamily:
        certificateSettings.layout_config.student_name.font_family,
        }
      : null,
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
        context: {
          event: resolved.event.eventInfo,
          organization: resolved.event.organization,
          settings: resolved.event.settings,
        },
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
        .select("id, name, gender, division_id, status")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .eq("class_id", classId)
        .eq("status", "active")
        .order("name", { ascending: true })
        .limit(5000);

      if (studentError) throw new Error(studentError.message);

      const matchingStudents = ((data || []) as Array<{
        id: string;
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

      return NextResponse.json({
        success: true,
        students: matchingStudents.map((row) => {
          const divisionName = row.division_id
            ? divisionMap.get(String(row.division_id)) || ""
            : "";
          return {
            id: String(row.id),
            name: String(row.name || "Student"),
            divisionName,
          };
        }),
      });
    }

    if (action === "certificate") {
      const studentId = clean(body?.studentId);
      const certificateId = clean(body?.certificateId);
      const enteredChest = cleanChest(body?.chestNo);

      if (!studentId) return error("Select a student.");
      if (!certificateId) return error("Select a certificate.");
      if (!enteredChest) return error("Enter the chest number.");

      const { data: verificationStudent, error: verificationError } =
        await supabaseAdmin
          .from("students")
          .select("id, chest_no, status, gender, class_id")
          .eq("id", studentId)
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .eq("class_id", classId)
          .maybeSingle();

      if (verificationError) throw new Error(verificationError.message);

      if (
        !verificationStudent ||
        ["inactive", "disabled"].includes(
          normalize(verificationStudent.status || "active"),
        ) ||
        canonicalGender(verificationStudent.gender) !== gender
      ) {
        return error("The selected student is not available.", 404);
      }

      if (cleanChest(verificationStudent.chest_no) !== enteredChest) {
        return error("Chest number does not match this student.", 403);
      }

      const fullResponse = await loadStudentProgrammes(
        organizationId,
        eventId,
        studentId,
        classId,
        gender,
        resolved.event.eventInfo,
        resolved.event.organization,
        true,
      );

      if (!fullResponse.ok) return fullResponse;

      const payload = await fullResponse.json();
      const certificate = (payload?.certificates || []).find(
        (item: any) => String(item?.id || "") === certificateId,
      );

      if (!certificate) {
        return error("This certificate is not available for download.", 404);
      }

      return NextResponse.json({
        success: true,
        certificate,
        certificateSettings: payload?.certificateSettings || null,
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
        resolved.event.eventInfo,
        resolved.event.organization,
        false,
      );
    }

    return error("Unsupported lookup action.");
  } catch (cause: any) {
    console.error("Public student lookup failed:", cause);
    return error("Unable to load the student lookup right now. Please try again.", 500);
  }
}