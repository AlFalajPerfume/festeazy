/* eslint-disable */
import {
  getAdminDataControlError,
  requireOrganizationAdmin,
} from "@/lib/admin-data-controls-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

type ImportRow = Record<string, unknown>;

function key(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeGender(value: unknown) {
  const normalized = key(value);
  if (normalized.includes("female") || normalized.includes("girl")) {
    return "female";
  }
  if (normalized.includes("male") || normalized.includes("boy")) {
    return "male";
  }
  return normalized || "male";
}

function cleanChest(value: unknown) {
  return text(value).replace(/^#+/, "");
}

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
    const rows = Array.isArray(body?.rows) ? (body.rows as ImportRow[]) : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "The uploaded student sheet is empty." },
        { status: 400 },
      );
    }

    if (rows.length > 5000) {
      return NextResponse.json(
        { error: "A maximum of 5,000 students can be imported at a time." },
        { status: 400 },
      );
    }

    const [categoryRes, classRes, divisionRes, teamRes] = await Promise.all([
      supabaseAdmin
        .from("categories")
        .select("id, name")
        .eq("organization_id", context.organizationId)
        .eq("event_id", context.eventId),
      supabaseAdmin
        .from("classes")
        .select("id, name, category_id")
        .eq("organization_id", context.organizationId)
        .eq("event_id", context.eventId),
      supabaseAdmin
        .from("class_divisions")
        .select("id, name, class_id, is_active")
        .eq("organization_id", context.organizationId)
        .eq("event_id", context.eventId)
        .eq("is_active", true),
      supabaseAdmin
        .from("teams")
        .select("id, name")
        .eq("organization_id", context.organizationId)
        .eq("event_id", context.eventId),
    ]);

    const metadataError =
      categoryRes.error || classRes.error || divisionRes.error || teamRes.error;

    if (metadataError) throw new Error(metadataError.message);

    const categoryMap = new Map<string, any>();
    const classMap = new Map<string, any>();
    const divisionMap = new Map<string, any>();
    const teamMap = new Map<string, any>();

    (categoryRes.data || []).forEach((item: any) => {
      categoryMap.set(key(item.name), item);
    });

    (classRes.data || []).forEach((item: any) => {
      classMap.set(`${item.category_id}__${key(item.name)}`, item);
    });

    (divisionRes.data || []).forEach((item: any) => {
      divisionMap.set(`${item.class_id}__${key(item.name)}`, item);
    });

    (teamRes.data || []).forEach((item: any) => {
      teamMap.set(key(item.name), item);
    });

    const errors: string[] = [];
    const resolvedRows: Record<string, unknown>[] = [];
    const uploadedChests = new Set<string>();

    rows.forEach((row, index) => {
      const excelRow = index + 2;
      const name = text(row.name);
      const categoryName = text(row.category_name);
      const className = text(row.class_name);
      const divisionName = text(row.division_name);
      const teamName = text(row.team_name);
      const chestNo = cleanChest(row.chest_no);

      if (!name) errors.push(`Row ${excelRow}: name is required.`);
      if (!categoryName) {
        errors.push(`Row ${excelRow}: category_name is required.`);
      }
      if (!className) errors.push(`Row ${excelRow}: class_name is required.`);
      if (!teamName) errors.push(`Row ${excelRow}: team_name is required.`);

      const category = categoryMap.get(key(categoryName));
      if (categoryName && !category) {
        errors.push(
          `Row ${excelRow}: category "${categoryName}" does not exist. Import or create the academic structure first.`,
        );
      }

      const classItem = category
        ? classMap.get(`${category.id}__${key(className)}`)
        : null;

      if (category && className && !classItem) {
        errors.push(
          `Row ${excelRow}: class "${className}" was not found inside "${categoryName}".`,
        );
      }

      const division =
        divisionName && classItem
          ? divisionMap.get(`${classItem.id}__${key(divisionName)}`)
          : null;

      if (divisionName && classItem && !division) {
        errors.push(
          `Row ${excelRow}: division/section "${divisionName}" was not found inside "${className}".`,
        );
      }

      const team = teamMap.get(key(teamName));
      if (teamName && !team) {
        errors.push(
          `Row ${excelRow}: team/house "${teamName}" does not exist.`,
        );
      }

      if (chestNo) {
        const chestKey = key(chestNo);
        if (uploadedChests.has(chestKey)) {
          errors.push(
            `Row ${excelRow}: chest number "${chestNo}" is repeated in the uploaded file.`,
          );
        }
        uploadedChests.add(chestKey);
      }

      if (name && category && classItem && team && (!divisionName || division)) {
        resolvedRows.push({
          chest_no: chestNo,
          admission_no: text(row.admission_no) || null,
          name,
          gender: normalizeGender(row.gender),
          category_id: category.id,
          class_id: classItem.id,
          division_id: division?.id || null,
          team_id: team.id,
          guardian_name: text(row.guardian_name) || null,
          phone: text(row.phone) || null,
          status: text(row.status) || "active",
        });
      }
    });

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "The student sheet contains validation errors.",
          errors: errors.slice(0, 100),
          totalErrors: errors.length,
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.rpc("import_students_batch", {
      target_organization_id: context.organizationId,
      target_event_id: context.eventId,
      students_data: resolvedRows,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error) {
    return jsonError(error);
  }
}
