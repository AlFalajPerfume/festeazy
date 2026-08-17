/* eslint-disable */
import {
  apiError,
  authorizeInstitutionAdmin,
} from "@/lib/admin-api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

const DEFAULT_MESSAGE_TEMPLATE = `is hereby awarded this Certificate of Achievement for securing {position} in {programme_name} during {event_title}, held on {event_date} at {venue}.

Category: {category_name}

We congratulate {pronoun} on this achievement and wish {pronoun} continued success.`;

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

const DEFAULT_SETTINGS = {
  message_template: DEFAULT_MESSAGE_TEMPLATE,
  text_x_mm: 46,
  text_y_mm: 73,
  text_width_mm: 205,
  font_size_pt: 11.5,
  line_height: 1.55,
  text_color: "#4f86a5",
  text_align: "center",
  font_family: "Arial, Helvetica, sans-serif",
  preview_template_url: null,
  preview_template_path: null,
  public_positions: [1, 2],
  layout_config: {
    student_name: DEFAULT_STUDENT_NAME_LAYOUT,
  },
};

function safeNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function cleanText(value: unknown, maxLength = 10000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanNullableText(value: unknown, maxLength = 2000) {
  const cleaned = cleanText(value, maxLength);
  return cleaned || null;
}


function cleanPublicPositions(value: unknown) {
  if (value === undefined || value === null) return [1, 2];
  if (!Array.isArray(value)) return [1, 2];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item >= 1 && item <= 3),
    ),
  ).sort((a, b) => a - b);
}

function cleanStudentNameLayout(value: unknown) {
  const source = value && typeof value === "object" ? (value as any) : {};
  const textColor = cleanText(
    source.text_color || DEFAULT_STUDENT_NAME_LAYOUT.text_color,
    20,
  );
  const textAlign = ["left", "center", "right"].includes(source.text_align)
    ? source.text_align
    : DEFAULT_STUDENT_NAME_LAYOUT.text_align;

  return {
    x_mm: safeNumber(source.x_mm, DEFAULT_STUDENT_NAME_LAYOUT.x_mm, 0, 280),
    y_mm: safeNumber(source.y_mm, DEFAULT_STUDENT_NAME_LAYOUT.y_mm, 0, 195),
    width_mm: safeNumber(
      source.width_mm,
      DEFAULT_STUDENT_NAME_LAYOUT.width_mm,
      40,
      290,
    ),
    font_size_pt: safeNumber(
      source.font_size_pt,
      DEFAULT_STUDENT_NAME_LAYOUT.font_size_pt,
      8,
      72,
    ),
    line_height: safeNumber(
      source.line_height,
      DEFAULT_STUDENT_NAME_LAYOUT.line_height,
      0.7,
      2,
    ),
    text_color: /^#[0-9a-fA-F]{6}$/.test(textColor)
      ? textColor
      : DEFAULT_STUDENT_NAME_LAYOUT.text_color,
    text_align: textAlign,
    font_family: cleanText(
      source.font_family || DEFAULT_STUDENT_NAME_LAYOUT.font_family,
      200,
    ),
  };
}

function cleanLayoutConfig(value: unknown) {
  const source = value && typeof value === "object" ? (value as any) : {};
  return {
    student_name: cleanStudentNameLayout(source.student_name),
  };
}

function formatCertificateYear(value: string | null | undefined) {
  if (!value) return new Date().getFullYear();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().getFullYear()
    : parsed.getFullYear();
}

export async function GET(request: NextRequest) {
  const auth = await authorizeInstitutionAdmin(request);
  if (auth.response) return auth.response;

  const { admin } = auth;

  const [settingsResponse, certificatesResponse] = await Promise.all([
    supabaseAdmin
      .from("certificate_print_settings")
      .select("*")
      .eq("organization_id", admin.organizationId)
      .eq("event_id", admin.eventId)
      .maybeSingle(),
    supabaseAdmin
      .from("merit_certificates")
      .select("*")
      .eq("organization_id", admin.organizationId)
      .eq("event_id", admin.eventId)
      .order("issued_at", { ascending: false }),
  ]);

  if (settingsResponse.error) {
    return apiError(settingsResponse.error.message, 500);
  }

  if (certificatesResponse.error) {
    return apiError(certificatesResponse.error.message, 500);
  }

  return NextResponse.json({
    settings: settingsResponse.data || DEFAULT_SETTINGS,
    certificates: certificatesResponse.data || [],
  });
}

export async function PUT(request: NextRequest) {
  const auth = await authorizeInstitutionAdmin(request);
  if (auth.response) return auth.response;

  const { admin } = auth;
  const body = await request.json().catch(() => ({}));

  const messageTemplate = cleanText(
    body.message_template || DEFAULT_MESSAGE_TEMPLATE,
    12000,
  );

  if (!messageTemplate) {
    return apiError("Certificate wording cannot be empty.");
  }

  const textColor = cleanText(body.text_color || "#4f86a5", 20);
  if (!/^#[0-9a-fA-F]{6}$/.test(textColor)) {
    return apiError("Choose a valid text colour.");
  }

  const textAlign = ["left", "center", "right"].includes(body.text_align)
    ? body.text_align
    : "center";

  const payload = {
    organization_id: admin.organizationId,
    event_id: admin.eventId,
    message_template: messageTemplate,
    text_x_mm: safeNumber(body.text_x_mm, 46, 0, 280),
    text_y_mm: safeNumber(body.text_y_mm, 73, 0, 195),
    text_width_mm: safeNumber(body.text_width_mm, 205, 40, 290),
    font_size_pt: safeNumber(body.font_size_pt, 11.5, 6, 32),
    line_height: safeNumber(body.line_height, 1.55, 0.8, 3),
    text_color: textColor,
    text_align: textAlign,
    font_family: cleanText(
      body.font_family || "Arial, Helvetica, sans-serif",
      200,
    ),
    preview_template_url: cleanNullableText(
      body.preview_template_url,
      3000,
    ),
    preview_template_path: cleanNullableText(
      body.preview_template_path,
      1500,
    ),
    public_positions: cleanPublicPositions(body.public_positions),
    layout_config: cleanLayoutConfig(body.layout_config),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from("certificate_print_settings")
    .upsert(payload, { onConflict: "organization_id,event_id" })
    .select("*")
    .single();

  if (error) return apiError(error.message, 500);

  return NextResponse.json({ settings: data });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeInstitutionAdmin(request);
  if (auth.response) return auth.response;

  const { admin } = auth;
  const body = await request.json().catch(() => ({}));

  const resultId = cleanText(body.result_id, 100);
  const studentId = cleanText(body.student_id, 100);
  const messageText = cleanText(body.message_text, 12000);

  if (!resultId || !studentId || !messageText) {
    return apiError("Result, student and certificate wording are required.");
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("merit_certificates")
    .select("*")
    .eq("event_id", admin.eventId)
    .eq("result_id", resultId)
    .eq("student_id", studentId)
    .maybeSingle();

  if (existingError) return apiError(existingError.message, 500);

  if (existing) {
    return NextResponse.json(
      {
        error: "This certificate was already issued.",
        certificate: existing,
      },
      { status: 409 },
    );
  }

  const { data: result, error: resultError } = await supabaseAdmin
    .from("results")
    .select(
      "id, organization_id, event_id, programme_id, registration_id, grade, position, total_mark, average_mark, is_published",
    )
    .eq("id", resultId)
    .eq("organization_id", admin.organizationId)
    .eq("event_id", admin.eventId)
    .eq("is_published", true)
    .maybeSingle();

  if (resultError) return apiError(resultError.message, 500);
  if (!result) return apiError("Published result not found.", 404);

  const { data: registration, error: registrationError } = await supabaseAdmin
    .from("programme_registrations")
    .select("id, programme_id, student_id, team_id, group_name")
    .eq("id", result.registration_id)
    .eq("event_id", admin.eventId)
    .maybeSingle();

  if (registrationError) return apiError(registrationError.message, 500);
  if (!registration) return apiError("Registration not found.", 404);

  const { data: student, error: studentError } = await supabaseAdmin
    .from("students")
    .select("id, name, chest_no, gender, category_id, team_id")
    .eq("id", studentId)
    .eq("organization_id", admin.organizationId)
    .eq("event_id", admin.eventId)
    .maybeSingle();

  if (studentError) return apiError(studentError.message, 500);
  if (!student) return apiError("Student not found.", 404);

  const { data: programme, error: programmeError } = await supabaseAdmin
    .from("programmes")
    .select("id, name, category_id, programme_type")
    .eq("id", result.programme_id)
    .eq("organization_id", admin.organizationId)
    .eq("event_id", admin.eventId)
    .maybeSingle();

  if (programmeError) return apiError(programmeError.message, 500);
  if (!programme) return apiError("Programme not found.", 404);

  if (programme.programme_type === "group") {
    const { data: groupMember, error: groupMemberError } = await supabaseAdmin
      .from("programme_registrations")
      .select("id")
      .eq("event_id", admin.eventId)
      .eq("programme_id", programme.id)
      .eq("student_id", studentId)
      .eq("team_id", registration.team_id)
      .eq("group_name", registration.group_name)
      .maybeSingle();

    if (groupMemberError) return apiError(groupMemberError.message, 500);
    if (!groupMember) {
      return apiError("The selected student is not a member of this result group.");
    }
  } else if (registration.student_id !== studentId) {
    return apiError("The selected student does not match this result.");
  }

  const [organizationResponse, eventResponse, categoryResponse, teamResponse] =
    await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("id, name, place")
        .eq("id", admin.organizationId)
        .single(),
      supabaseAdmin
        .from("events")
        .select("id, title, venue, start_date, end_date")
        .eq("id", admin.eventId)
        .single(),
      programme.category_id
        ? supabaseAdmin
            .from("categories")
            .select("id, name")
            .eq("id", programme.category_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
      registration.team_id || student.team_id
        ? supabaseAdmin
            .from("teams")
            .select("id, name")
            .eq("id", registration.team_id || student.team_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
    ]);

  if (organizationResponse.error)
    return apiError(organizationResponse.error.message, 500);
  if (eventResponse.error) return apiError(eventResponse.error.message, 500);
  if (categoryResponse.error) return apiError(categoryResponse.error.message, 500);
  if (teamResponse.error) return apiError(teamResponse.error.message, 500);

  const { data: serial, error: serialError } = await supabaseAdmin.rpc(
    "next_merit_certificate_serial",
    { target_event_id: admin.eventId },
  );

  if (serialError) return apiError(serialError.message, 500);

  const year = formatCertificateYear(eventResponse.data.start_date);
  const certificateNumber = `FZ-${year}-${String(Number(serial || 1)).padStart(5, "0")}`;

  const lockedData = {
    student_name: student.name,
    chest_no: student.chest_no,
    gender: student.gender,
    organization_name: organizationResponse.data.name,
    organization_place: organizationResponse.data.place,
    event_title: eventResponse.data.title,
    event_venue: eventResponse.data.venue,
    event_start_date: eventResponse.data.start_date,
    event_end_date: eventResponse.data.end_date,
    programme_name: programme.name,
    programme_type: programme.programme_type,
    category_name: categoryResponse.data?.name || "General",
    team_name: teamResponse.data?.name || "",
    group_name: registration.group_name || "",
    grade: result.grade || "",
    position: result.position,
    total_mark: result.total_mark,
    average_mark: result.average_mark,
  };

  const { data: certificate, error: insertError } = await supabaseAdmin
    .from("merit_certificates")
    .insert({
      organization_id: admin.organizationId,
      event_id: admin.eventId,
      result_id: result.id,
      programme_id: programme.id,
      registration_id: registration.id,
      student_id: student.id,
      certificate_number: certificateNumber,
      message_text: messageText,
      locked_data: lockedData,
      issued_by: admin.userId,
      issued_at: new Date().toISOString(),
      last_printed_at: new Date().toISOString(),
      print_count: 1,
    })
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return apiError("This certificate was already issued.", 409);
    }
    return apiError(insertError.message, 500);
  }

  return NextResponse.json({ certificate }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeInstitutionAdmin(request);
  if (auth.response) return auth.response;

  const { admin } = auth;
  const body = await request.json().catch(() => ({}));
  const certificateId = cleanText(body.certificate_id, 100);
  const messageText = cleanText(body.message_text, 12000);

  if (!certificateId || !messageText) {
    return apiError("Certificate and wording are required.");
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("merit_certificates")
    .select("id, print_count")
    .eq("id", certificateId)
    .eq("organization_id", admin.organizationId)
    .eq("event_id", admin.eventId)
    .maybeSingle();

  if (existingError) return apiError(existingError.message, 500);
  if (!existing) return apiError("Issued certificate not found.", 404);

  const { data, error } = await supabaseAdmin
    .from("merit_certificates")
    .update({
      message_text: messageText,
      print_count: Number(existing.print_count || 1) + 1,
      last_printed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", certificateId)
    .select("*")
    .single();

  if (error) return apiError(error.message, 500);

  return NextResponse.json({ certificate: data });
}