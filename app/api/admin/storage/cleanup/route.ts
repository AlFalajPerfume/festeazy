import {
  apiError,
  authorizeInstitutionAdmin,
} from "@/lib/admin-api-auth";
import {
  getOrganizationStorageHealth,
  removeManagedStorageObjects,
} from "@/lib/admin-storage-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authorization = await authorizeInstitutionAdmin(request);
  if (authorization.response) return authorization.response;

  try {
    const health = await getOrganizationStorageHealth(
      authorization.admin.organizationId,
      authorization.admin.eventId,
    );
    return NextResponse.json({ success: true, health });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Storage audit failed.",
      500,
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authorization = await authorizeInstitutionAdmin(request);
  if (authorization.response) return authorization.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      confirmation?: string;
    };

    if (String(body.confirmation || "") !== "DELETE ORPHAN FILES") {
      return apiError('Type "DELETE ORPHAN FILES" to confirm cleanup.', 400);
    }

    const health = await getOrganizationStorageHealth(
      authorization.admin.organizationId,
      authorization.admin.eventId,
    );
    const removedCount = await removeManagedStorageObjects(health.orphans);
    const refreshedHealth = await getOrganizationStorageHealth(
      authorization.admin.organizationId,
      authorization.admin.eventId,
    );

    return NextResponse.json({
      success: true,
      removedCount,
      health: refreshedHealth,
    });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Storage cleanup failed.",
      500,
    );
  }
}
