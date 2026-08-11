import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getAdminDataControlError,
  requireOrganizationAdmin,
} from "@/lib/admin-data-controls-server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await requireOrganizationAdmin(request);

    const [securityRes, logsRes] = await Promise.all([
      supabaseAdmin
        .from("organization_security")
        .select("organization_id, pin_updated_at, locked_until")
        .eq("organization_id", context.organizationId)
        .maybeSingle(),
      supabaseAdmin
        .from("organization_data_action_logs")
        .select("id, action_type, status, details, created_at")
        .eq("organization_id", context.organizationId)
        .in("action_type", ["backup_download", "workspace_reset"])
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    if (securityRes.error) {
      throw new Error(securityRes.error.message);
    }

    if (logsRes.error) {
      throw new Error(logsRes.error.message);
    }

    return NextResponse.json({
      securityConfigured: Boolean(securityRes.data),
      pinUpdatedAt: securityRes.data?.pin_updated_at || null,
      lockedUntil: securityRes.data?.locked_until || null,
      organization: {
        id: context.organizationId,
        name: context.organizationName,
        type: context.organizationType,
      },
      event: {
        id: context.eventId,
        title: context.eventTitle,
      },
      recentActions: logsRes.data || [],
    });
  } catch (error) {
    const response = getAdminDataControlError(error);
    return NextResponse.json(
      { error: response.message, code: response.code },
      { status: response.status },
    );
  }
}
