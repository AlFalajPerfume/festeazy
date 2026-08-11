/* eslint-disable */
import {
  getAdminDataControlError,
  requireOrganizationAdmin,
} from "@/lib/admin-data-controls-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

function jsonError(error: unknown) {
  const parsed = getAdminDataControlError(error);
  return NextResponse.json(
    { error: parsed.message, code: parsed.code },
    { status: parsed.status },
  );
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireOrganizationAdmin(request);
    const body = await request.json();
    const student = body?.student || {};

    const { data, error } = await supabaseAdmin.rpc("save_student_record", {
      target_organization_id: context.organizationId,
      target_event_id: context.eventId,
      student_data: student,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ success: true, student: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await requireOrganizationAdmin(request);
    const body = await request.json();
    const common = body?.common || {};
    const students = Array.isArray(body?.students) ? body.students : [];

    const { data, error } = await supabaseAdmin.rpc("bulk_create_students", {
      target_organization_id: context.organizationId,
      target_event_id: context.eventId,
      common_data: common,
      students_data: students,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await requireOrganizationAdmin(request);
    const body = await request.json();
    const studentId = String(body?.studentId || "").trim();

    if (!studentId) {
      return NextResponse.json(
        { error: "Student ID is required." },
        { status: 400 },
      );
    }

    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .select("id, name")
      .eq("id", studentId)
      .eq("organization_id", context.organizationId)
      .eq("event_id", context.eventId)
      .maybeSingle();

    if (studentError) throw new Error(studentError.message);

    if (!student) {
      return NextResponse.json(
        { error: "Student record was not found." },
        { status: 404 },
      );
    }

    const { count, error: registrationError } = await supabaseAdmin
      .from("programme_registrations")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", context.organizationId)
      .eq("event_id", context.eventId)
      .eq("student_id", studentId);

    if (registrationError) throw new Error(registrationError.message);

    if (Number(count || 0) > 0) {
      return NextResponse.json(
        {
          error: `${student.name} cannot be deleted because the student is registered in ${count} programme${count === 1 ? "" : "s"}. Remove those programme registrations first.`,
        },
        { status: 409 },
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from("students")
      .delete()
      .eq("id", studentId)
      .eq("organization_id", context.organizationId)
      .eq("event_id", context.eventId);

    if (deleteError) throw new Error(deleteError.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
