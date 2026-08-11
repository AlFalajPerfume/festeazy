/* eslint-disable */
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getAdminDataControlError,
  recordDataAction,
  requireOrganizationAdmin,
  verifyOrganizationActionPin,
} from "@/lib/admin-data-controls-server";
import { gzipSync } from "node:zlib";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGE_SIZE = 1000;

type BackupRequest = {
  pin?: string;
};

type BackupTable = {
  key: string;
  table: string;
  scope: "organization" | "event";
  columns?: string;
  optional?: boolean;
};

const BACKUP_TABLES: BackupTable[] = [
  {
    key: "organization_users",
    table: "organization_users",
    scope: "organization",
    columns: "email, role, is_active",
    optional: true,
  },
  { key: "event_settings", table: "event_settings", scope: "event" },
  { key: "teams", table: "teams", scope: "event" },
  { key: "categories", table: "categories", scope: "event" },
  { key: "classes", table: "classes", scope: "event" },
  {
    key: "class_divisions",
    table: "class_divisions",
    scope: "event",
    optional: true,
  },
  { key: "students", table: "students", scope: "event" },
  { key: "programmes", table: "programmes", scope: "event" },
  {
    key: "programme_registrations",
    table: "programme_registrations",
    scope: "event",
  },
  { key: "programme_codes", table: "programme_codes", scope: "event" },
  { key: "judges", table: "judges", scope: "event" },
  {
    key: "judge_assignments",
    table: "judge_assignments",
    scope: "event",
  },
  { key: "judge_scores", table: "judge_scores", scope: "event" },
  { key: "results", table: "results", scope: "event" },
  {
    key: "schedule_stages",
    table: "schedule_stages",
    scope: "event",
    optional: true,
  },
  {
    key: "schedule_items",
    table: "schedule_items",
    scope: "event",
    optional: true,
  },
  {
    key: "poster_templates",
    table: "poster_templates",
    scope: "event",
    optional: true,
  },
  {
    key: "result_posters",
    table: "result_posters",
    scope: "event",
    optional: true,
  },
  {
    key: "result_milestone_posters",
    table: "result_milestone_posters",
    scope: "event",
    optional: true,
  },
  {
    key: "gallery_images",
    table: "gallery_images",
    scope: "event",
    optional: true,
  },
];

function isMissingRelationError(error: any) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("could not find the table")
  );
}

async function fetchAllRows(input: {
  table: string;
  columns?: string;
  organizationId: string;
  eventId: string;
  scope: "organization" | "event";
  optional?: boolean;
}) {
  const rows: any[] = [];
  let from = 0;

  while (true) {
    let query = (supabaseAdmin as any)
      .from(input.table)
      .select(input.columns || "*")
      .eq("organization_id", input.organizationId)
      .range(from, from + PAGE_SIZE - 1);

    if (input.scope === "event") {
      query = query.eq("event_id", input.eventId);
    }

    const { data, error } = await query;

    if (error) {
      if (input.optional && isMissingRelationError(error)) {
        return { rows: [], skipped: true, warning: error.message };
      }

      throw new Error(`${input.table}: ${error.message}`);
    }

    const page = data || [];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { rows, skipped: false, warning: null };
}

async function listStorageFolder(
  bucket: string,
  rootFolder: string,
  optional = true,
) {
  const files: Array<{
    bucket: string;
    path: string;
    size: number | null;
    created_at: string | null;
    updated_at: string | null;
  }> = [];

  async function walk(path: string) {
    let offset = 0;

    while (true) {
      const { data, error } = await supabaseAdmin.storage.from(bucket).list(path, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        const message = String(error.message || "").toLowerCase();
        if (
          optional &&
          (message.includes("bucket not found") ||
            message.includes("not found") ||
            message.includes("does not exist"))
        ) {
          return;
        }

        throw new Error(`${bucket}/${path}: ${error.message}`);
      }

      const items = data || [];

      for (const item of items) {
        const itemPath = path ? `${path}/${item.name}` : item.name;

        if (item.metadata) {
          files.push({
            bucket,
            path: itemPath,
            size: Number(item.metadata?.size || 0) || null,
            created_at: item.created_at || null,
            updated_at: item.updated_at || null,
          });
        } else {
          await walk(itemPath);
        }
      }

      if (items.length < 1000) break;
      offset += 1000;
    }
  }

  await walk(rootFolder.replace(/^\/+|\/+$/g, ""));
  return files;
}

function safeFilename(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "organization";
}

export async function POST(request: NextRequest) {
  let context: Awaited<ReturnType<typeof requireOrganizationAdmin>> | null = null;

  try {
    context = await requireOrganizationAdmin(request);
    const body = (await request.json()) as BackupRequest;

    await verifyOrganizationActionPin({
      context,
      pin: String(body.pin || ""),
    });

    await recordDataAction({
      context,
      actionType: "backup_download",
      status: "requested",
      details: { format: "json+gzip", schema_version: 1 },
    });

    const [organizationRes, eventRes] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select(
          "id, name, slug, organization_type, phone, email, place, logo_url, status, plan_start, plan_end, created_at, updated_at",
        )
        .eq("id", context.organizationId)
        .single(),
      supabaseAdmin
        .from("events")
        .select("*")
        .eq("id", context.eventId)
        .eq("organization_id", context.organizationId)
        .single(),
    ]);

    if (organizationRes.error) throw new Error(organizationRes.error.message);
    if (eventRes.error) throw new Error(eventRes.error.message);

    const data: Record<string, unknown> = {};
    const counts: Record<string, number> = {};
    const warnings: string[] = [];

    for (const item of BACKUP_TABLES) {
      const result = await fetchAllRows({
        table: item.table,
        columns: item.columns,
        organizationId: context.organizationId,
        eventId: context.eventId,
        scope: item.scope,
        optional: item.optional,
      });

      data[item.key] = result.rows;
      counts[item.key] = result.rows.length;

      if (result.warning) {
        warnings.push(`${item.table}: ${result.warning}`);
      }
    }

    const storageManifests = await Promise.all([
      listStorageFolder(
        "event-assets",
        `${context.organizationId}/${context.eventId}`,
      ),
      listStorageFolder("organization-logos", context.organizationId),
      listStorageFolder(
        "poster-templates",
        `${context.organizationId}/${context.eventId}`,
      ),
      listStorageFolder(
        "gallery-images",
        `${context.organizationId}/${context.eventId}`,
      ),
    ]);

    const storageManifest = storageManifests.flat();

    const backup = {
      format: "festeazy-workspace-backup",
      schema_version: 1,
      generated_at: new Date().toISOString(),
      generated_by: {
        user_id: context.user.id,
        email: context.user.email || null,
        role: context.role,
      },
      organization: organizationRes.data,
      event: eventRes.data,
      counts,
      data,
      storage_manifest: storageManifest,
      warnings,
      restore_note:
        "This backup contains database records and a manifest of uploaded files. It does not embed the binary image files. Keep the original Supabase Storage project active if those file URLs must remain available.",
    };

    const json = JSON.stringify(backup, null, 2);
    const compressed = gzipSync(Buffer.from(json, "utf8"), { level: 9 });
    const date = new Date().toISOString().slice(0, 10);
    const filename = `${safeFilename(context.organizationSlug)}-${date}-festeazy-backup.json.gz`;

    await recordDataAction({
      context,
      actionType: "backup_download",
      status: "completed",
      details: {
        filename,
        compressed_bytes: compressed.byteLength,
        uncompressed_bytes: Buffer.byteLength(json),
        counts,
        storage_manifest_count: storageManifest.length,
        warning_count: warnings.length,
      },
    });

    return new NextResponse(compressed, {
      status: 200,
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (context) {
      await recordDataAction({
        context,
        actionType: "backup_download",
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
