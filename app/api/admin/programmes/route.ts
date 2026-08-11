/* eslint-disable */
import {
  apiError,
  authorizeInstitutionAdmin,
} from "@/lib/admin-api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeInstitutionAdmin(request);
    if (authorization.response) return authorization.response;

    const body = await request.json();
    const programme = body?.programme;

    if (!programme?.name?.trim()) {
      return apiError("Programme name is required.");
    }

    const totalMarks = Number(programme.total_marks);
    const sortOrder = Number(programme.sort_order);

    if (
      !Number.isFinite(totalMarks) ||
      !Number.isInteger(totalMarks) ||
      totalMarks < 1 ||
      totalMarks > 100
    ) {
      return apiError("Maximum mark must be a whole number from 1 to 100.");
    }

    if (!Number.isFinite(sortOrder) || !Number.isInteger(sortOrder) || sortOrder < 1) {
      return apiError("Sort order must be a positive whole number.");
    }

    const { data, error } = await supabaseAdmin.rpc(
      "save_programme_definition",
      {
        target_organization_id: authorization.admin.organizationId,
        target_event_id: authorization.admin.eventId,
        programme_data: {
          ...programme,
          total_marks: totalMarks,
          sort_order: sortOrder,
        },
        criteria_data: [],
      },
    );

    if (error) return apiError(error.message, 409);

    return NextResponse.json({ success: true, programme: data });
  } catch (error: any) {
    return apiError(error?.message || "Unable to save programme.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authorization = await authorizeInstitutionAdmin(request);
    if (authorization.response) return authorization.response;

    const body = await request.json();
    const programmeId = String(body?.programmeId || "").trim();

    if (!programmeId) return apiError("Programme ID is required.");

    const { data, error } = await supabaseAdmin.rpc(
      "delete_programme_definition",
      {
        target_organization_id: authorization.admin.organizationId,
        target_event_id: authorization.admin.eventId,
        target_programme_id: programmeId,
      },
    );

    if (error) return apiError(error.message, 409);

    return NextResponse.json({ success: true, result: data });
  } catch (error: any) {
    return apiError(error?.message || "Unable to delete programme.", 500);
  }
}
