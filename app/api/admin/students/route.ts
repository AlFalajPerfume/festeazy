/* eslint-disable */
import {
  getAdminDataControlError,
  requireOrganizationAdmin,
} from "@/lib/admin-data-controls-server";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

const CHEST_REBUILD_CODE = "EAzy2026";
const UPDATE_BATCH_SIZE = 24;

type ChestCategory = {
  id: string;
  name: string;
  chest_no_start: number | null;
  chest_no_end: number | null;
  sort_order: number | null;
};

type ChestStudent = {
  id: string;
  name: string;
  category_id: string | null;
  chest_no: string | null;
  chest_no_sort: number | null;
  created_at: string | null;
  status: string | null;
};

type ChestAssignment = {
  student: ChestStudent;
  chestNo: string;
  chestSort: number;
};

function jsonError(error: unknown) {
  const parsed = getAdminDataControlError(error);
  return NextResponse.json(
    { error: parsed.message, code: parsed.code },
    { status: parsed.status },
  );
}

function numericChest(student: ChestStudent) {
  if (student.chest_no_sort !== null && student.chest_no_sort !== undefined) {
    const sortValue = Number(student.chest_no_sort);
    if (Number.isFinite(sortValue)) return sortValue;
  }

  const chestText = String(student.chest_no || "")
    .replace(/^#+/, "")
    .trim();
  if (chestText) {
    const parsed = Number(chestText);
    if (Number.isFinite(parsed)) return parsed;
  }

  return Number.MAX_SAFE_INTEGER;
}

function stableStudentSort(first: ChestStudent, second: ChestStudent) {
  return (
    numericChest(first) - numericChest(second) ||
    String(first.created_at || "").localeCompare(String(second.created_at || "")) ||
    first.name.localeCompare(second.name) ||
    first.id.localeCompare(second.id)
  );
}

function nextTemporaryNumbers(
  count: number,
  blocked: Set<number>,
  preferredStart: number,
) {
  const values: number[] = [];
  let candidate = preferredStart;

  while (values.length < count) {
    if (candidate < 1_500_000_000) {
      throw new Error("Unable to reserve temporary chest numbers safely.");
    }

    if (!blocked.has(candidate)) {
      values.push(candidate);
      blocked.add(candidate);
    }

    candidate -= 1;
  }

  return values;
}

async function updateChestAssignments(
  organizationId: string,
  eventId: string,
  assignments: { id: string; chestNo: string | null }[],
) {
  for (let start = 0; start < assignments.length; start += UPDATE_BATCH_SIZE) {
    const chunk = assignments.slice(start, start + UPDATE_BATCH_SIZE);

    const results = await Promise.all(
      chunk.map(async (assignment) => {
        const { error } = await supabaseAdmin
          .from("students")
          .update({
            // chest_no_sort is a generated/database-managed column.
            // Updating chest_no is enough; PostgreSQL recalculates chest_no_sort automatically.
            chest_no: assignment.chestNo,
          })
          .eq("id", assignment.id)
          .eq("organization_id", organizationId)
          .eq("event_id", eventId);

        return error;
      }),
    );

    const firstError = results.find(Boolean);
    if (firstError) {
      throw new Error(firstError.message);
    }
  }
}

async function rollbackChestNumbers(
  organizationId: string,
  eventId: string,
  changed: ChestAssignment[],
) {
  if (changed.length === 0) return;

  const blocked = new Set<number>();
  changed.forEach(({ student }) => {
    const current = Number(String(student.chest_no || "").replace(/^#+/, "").trim());
    if (Number.isFinite(current)) blocked.add(current);
  });

  const rollbackTemps = nextTemporaryNumbers(
    changed.length,
    blocked,
    1_900_000_000,
  );

  try {
    await updateChestAssignments(
      organizationId,
      eventId,
      changed.map((assignment, index) => ({
        id: assignment.student.id,
        chestNo: String(rollbackTemps[index]),
      })),
    );

    await updateChestAssignments(
      organizationId,
      eventId,
      changed.map((assignment) => ({
        id: assignment.student.id,
        chestNo: assignment.student.chest_no,
      })),
    );
  } catch {
    // Best-effort rollback. The original error is returned to the caller.
  }
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

export async function PATCH(request: NextRequest) {
  try {
    const context = await requireOrganizationAdmin(request);
    const body = await request.json();

    if (String(body?.action || "") !== "rebuild_chest_numbers") {
      return NextResponse.json({ error: "Unknown student action." }, { status: 400 });
    }

    if (String(body?.safetyCode || "").trim() !== CHEST_REBUILD_CODE) {
      return NextResponse.json(
        { error: "Incorrect maintenance code." },
        { status: 403 },
      );
    }

    const [categories, students] = await Promise.all([
      fetchAllRows<ChestCategory>((from, to) =>
        supabaseAdmin
          .from("categories")
          .select("id, name, chest_no_start, chest_no_end, sort_order")
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true })
          .range(from, to),
      ),
      fetchAllRows<ChestStudent>((from, to) =>
        supabaseAdmin
          .from("students")
          .select(
            "id, name, category_id, chest_no, chest_no_sort, created_at, status",
          )
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .order("created_at", { ascending: true })
          .range(from, to),
      ),
    ]);

    if (students.length === 0) {
      return NextResponse.json({
        success: true,
        result: { updated: 0, categories: 0, summary: [] },
      });
    }

    const categoryById = new Map(categories.map((category) => [category.id, category]));
    const invalidCategoryStudents = students.filter(
      (student) => !student.category_id || !categoryById.has(student.category_id),
    );

    if (invalidCategoryStudents.length > 0) {
      return NextResponse.json(
        {
          error: `${invalidCategoryStudents.length} student${invalidCategoryStudents.length === 1 ? " is" : "s are"} not linked to a valid category. Fix those student records before rebuilding chest numbers.`,
        },
        { status: 409 },
      );
    }

    const studentsByCategory = new Map<string, ChestStudent[]>();
    students.forEach((student) => {
      const categoryId = student.category_id as string;
      const current = studentsByCategory.get(categoryId) || [];
      current.push(student);
      studentsByCategory.set(categoryId, current);
    });

    const usedCategories = categories
      .filter((category) => (studentsByCategory.get(category.id)?.length || 0) > 0)
      .sort(
        (first, second) =>
          Number(first.sort_order || 0) - Number(second.sort_order || 0) ||
          first.name.localeCompare(second.name),
      );

    const missingRanges = usedCategories.filter(
      (category) =>
        category.chest_no_start === null || category.chest_no_end === null,
    );

    if (missingRanges.length > 0) {
      return NextResponse.json(
        {
          error: `Set a chest number range for: ${missingRanges.map((item) => item.name).join(", ")}.`,
        },
        { status: 409 },
      );
    }

    for (const category of usedCategories) {
      const start = Number(category.chest_no_start);
      const end = Number(category.chest_no_end);

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        end < start
      ) {
        return NextResponse.json(
          { error: `${category.name} has an invalid chest number range.` },
          { status: 409 },
        );
      }
    }

    const rangesByStart = [...usedCategories].sort(
      (first, second) =>
        Number(first.chest_no_start) - Number(second.chest_no_start),
    );

    for (let index = 1; index < rangesByStart.length; index += 1) {
      const previous = rangesByStart[index - 1];
      const current = rangesByStart[index];

      if (Number(current.chest_no_start) <= Number(previous.chest_no_end)) {
        return NextResponse.json(
          {
            error: `Chest number ranges overlap between ${previous.name} and ${current.name}. Fix the ranges before rebuilding.`,
          },
          { status: 409 },
        );
      }
    }

    const assignments: ChestAssignment[] = [];
    const summary: Array<{
      category: string;
      students: number;
      from: number;
      to: number;
    }> = [];

    for (const category of usedCategories) {
      const members = [...(studentsByCategory.get(category.id) || [])].sort(
        stableStudentSort,
      );
      const start = Number(category.chest_no_start);
      const end = Number(category.chest_no_end);
      const capacity = end - start + 1;

      if (members.length > capacity) {
        return NextResponse.json(
          {
            error: `${category.name} has ${members.length} students but its range ${start}-${end} only has ${capacity} chest numbers.`,
          },
          { status: 409 },
        );
      }

      members.forEach((student, index) => {
        const chestSort = start + index;
        assignments.push({
          student,
          chestNo: String(chestSort),
          chestSort,
        });
      });

      summary.push({
        category: category.name,
        students: members.length,
        from: start,
        to: members.length > 0 ? start + members.length - 1 : start,
      });
    }

    const changed = assignments.filter(
      (assignment) =>
        String(assignment.student.chest_no || "").replace(/^#+/, "").trim() !==
          assignment.chestNo,
    );

    if (changed.length === 0) {
      return NextResponse.json({
        success: true,
        result: {
          updated: 0,
          categories: usedCategories.length,
          summary,
        },
      });
    }

    const blockedTemporaryNumbers = new Set<number>();
    students.forEach((student) => {
      const parsed = Number(String(student.chest_no || "").replace(/^#+/, "").trim());
      if (Number.isFinite(parsed)) blockedTemporaryNumbers.add(parsed);
    });
    assignments.forEach((assignment) =>
      blockedTemporaryNumbers.add(assignment.chestSort),
    );

    const temporaryNumbers = nextTemporaryNumbers(
      changed.length,
      blockedTemporaryNumbers,
      2_140_000_000,
    );

    try {
      await updateChestAssignments(
        context.organizationId,
        context.eventId,
        changed.map((assignment, index) => ({
          id: assignment.student.id,
          chestNo: String(temporaryNumbers[index]),
        })),
      );

      await updateChestAssignments(
        context.organizationId,
        context.eventId,
        changed.map((assignment) => ({
          id: assignment.student.id,
          chestNo: assignment.chestNo,
        })),
      );
    } catch (updateError) {
      await rollbackChestNumbers(
        context.organizationId,
        context.eventId,
        changed,
      );
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      result: {
        updated: changed.length,
        categories: usedCategories.length,
        summary,
      },
    });
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