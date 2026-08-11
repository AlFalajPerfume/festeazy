/* eslint-disable */
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getOrganizationStorageHealth,
  removeManagedStorageObjects,
} from "@/lib/admin-storage-server";
import {
  getAdminDataControlError,
  recordDataAction,
  requireOrganizationAdmin,
  verifyOrganizationActionPin,
} from "@/lib/admin-data-controls-server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ResetRequest = {
  pin?: string;
  confirmation?: string;
  acknowledgement?: boolean;
};

export async function POST(request: NextRequest) {
  let context: Awaited<ReturnType<typeof requireOrganizationAdmin>> | null = null;

  try {
    context = await requireOrganizationAdmin(request);
    const body = (await request.json()) as ResetRequest;

    const confirmation = String(body.confirmation || "").trim();

    if (!body.acknowledgement) {
      return NextResponse.json(
        {
          error:
            "Confirm that you understand the event workspace data will be permanently removed.",
          code: "RESET_ACKNOWLEDGEMENT_REQUIRED",
        },
        { status: 400 },
      );
    }

    if (confirmation !== context.organizationName) {
      return NextResponse.json(
        {
          error: `Type the exact organization name: ${context.organizationName}`,
          code: "RESET_CONFIRMATION_MISMATCH",
        },
        { status: 400 },
      );
    }

    await verifyOrganizationActionPin({
      context,
      pin: String(body.pin || ""),
    });

    await recordDataAction({
      context,
      actionType: "workspace_reset",
      status: "requested",
      details: {
        confirmation_matched: true,
        preserve_organization: true,
        preserve_event: true,
      },
    });

    const { data, error: resetError } = await supabaseAdmin.rpc(
      "reset_organization_workspace",
      {
        target_organization_id: context.organizationId,
        target_event_id: context.eventId,
      },
    );

    if (resetError) {
      throw new Error(resetError.message);
    }

    const storageHealth = await getOrganizationStorageHealth(
      context.organizationId,
      context.eventId,
    );
    const removedStorageFiles = await removeManagedStorageObjects(
      storageHealth.orphans,
    );

    await recordDataAction({
      context,
      actionType: "workspace_reset",
      status: "completed",
      details: {
        summary: data || {},
        orphan_storage_files_removed: removedStorageFiles,
        referenced_storage_files_preserved: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "The event workspace was reset successfully.",
      summary: data || {},
      removedStorageFiles,
      preserved: [
        "Organization profile",
        "Administrator login",
        "Plan dates",
        "Organization logo",
        "Event record",
        "Event title and dates",
        "Public slug",
        "Public portal settings",
        "Referenced organization logo and active public portal assets",
      ],
      note:
        "Database records were reset. Referenced branding files were preserved and unreferenced event files were removed from Supabase Storage.",
    });
  } catch (error) {
    if (context) {
      await recordDataAction({
        context,
        actionType: "workspace_reset",
        status: "failed",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }

    const response = getAdminDataControlError(error);
    return NextResponse.json(
      { error: response.message, code: response.code },
      { status: response.status },
    );
  }
}
