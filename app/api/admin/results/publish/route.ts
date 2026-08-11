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
    const action = String(body?.action || "");

    if (action === "publish_all") {
      const { data, error } = await supabaseAdmin.rpc(
        "publish_all_ready_results",
        {
          target_organization_id: authorization.admin.organizationId,
          target_event_id: authorization.admin.eventId,
        },
      );

      if (error) return apiError(error.message, 409);
      return NextResponse.json({ success: true, result: data });
    }

    const programmeId = String(body?.programmeId || "").trim();
    if (!programmeId) return apiError("Programme ID is required.");

    const shouldPublish = action === "publish";
    if (!shouldPublish && action !== "revoke") {
      return apiError("Unsupported publication action.");
    }

    const { data, error } = await supabaseAdmin.rpc(
      "set_programme_result_publication",
      {
        target_organization_id: authorization.admin.organizationId,
        target_event_id: authorization.admin.eventId,
        target_programme_id: programmeId,
        next_is_published: shouldPublish,
      },
    );

    if (error) return apiError(error.message, 409);

    return NextResponse.json({ success: true, result: data });
  } catch (error: any) {
    return apiError(error?.message || "Unable to update result publication.", 500);
  }
}
