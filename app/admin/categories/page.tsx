/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import {
  getAdminContext,
  type AdminContext,
  type OrganizationType,
} from "@/lib/admin-context";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  Layers3,
  Loader2,
  PencilLine,
  Plus,
  RefreshCcw,
  Save,
  School,
  Trash2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

type Category = {
  id: string;
  organization_id: string;
  event_id: string;
  name: string;
  description: string | null;
  gender_scope: string;
  chest_no_start: number | null;
  chest_no_end: number | null;
  sort_order: number;
};

type ClassItem = {
  id: string;
  organization_id: string;
  event_id: string;
  category_id: string | null;
  name: string;
  sort_order: number;
};

type DivisionItem = {
  id: string;
  organization_id: string;
  event_id: string;
  class_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

type StudentUsage = {
  id: string;
  category_id: string | null;
  class_id: string | null;
  division_id: string | null;
};

type ProgrammeUsage = {
  id: string;
  category_id: string | null;
};

type DivisionDraft = {
  key: string;
  id: string | null;
  name: string;
};

type ClassDraft = {
  key: string;
  id: string | null;
  name: string;
  divisionInput: string;
  divisions: DivisionDraft[];
};

type CategoryForm = {
  id: string | null;
  name: string;
  description: string;
  chestNoStart: string;
  chestNoEnd: string;
  classInput: string;
  classes: ClassDraft[];
};

const EMPTY_FORM: CategoryForm = {
  id: null,
  name: "",
  description: "",
  chestNoStart: "",
  chestNoEnd: "",
  classInput: "",
  classes: [],
};

function newKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function organizationLabels(type: OrganizationType) {
  if (type === "school") {
    return {
      organization: "School",
      category: "Category / Level",
      categoryPlural: "Categories / Levels",
      className: "Class",
      classPlural: "Classes",
      division: "Division / Section",
      divisionPlural: "Divisions / Sections",
      exampleCategories:
        "Lower Primary, Upper Primary, High School or General",
      exampleClasses: "Class 1, Class 2, Class 5",
    };
  }

  if (type === "institution") {
    return {
      organization: "Institution",
      category: "Category / Level",
      categoryPlural: "Categories / Levels",
      className: "Class / Batch",
      classPlural: "Classes / Batches",
      division: "Division / Section",
      divisionPlural: "Divisions / Sections",
      exampleCategories:
        "Junior, Senior, Batch Level or General",
      exampleClasses: "Batch A, First Year, Level 2",
    };
  }

  return {
    organization: "Madrasa",
    category: "Category",
    categoryPlural: "Categories",
    className: "Class",
    classPlural: "Classes",
    division: "Division / Section",
    divisionPlural: "Divisions / Sections",
    exampleCategories:
      "Lower Primary, Upper Primary, Junior or Senior",
    exampleClasses: "Class 1, Class 2, Class 5",
  };
}

export default function CategoriesPage() {
  const [context, setContext] =
    useState<AdminContext | null>(null);

  const [categories, setCategories] = useState<Category[]>(
    [],
  );
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [divisions, setDivisions] = useState<
    DivisionItem[]
  >([]);
  const [students, setStudents] = useState<StudentUsage[]>(
    [],
  );
  const [programmes, setProgrammes] = useState<
    ProgrammeUsage[]
  >([]);

  const [form, setForm] =
    useState<CategoryForm>(EMPTY_FORM);

  const [isModalOpen, setIsModalOpen] = useState(false);

  const [expandedCategories, setExpandedCategories] =
    useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPageData();
  }, []);

  const organizationType =
    context?.organizationType || "madrasa";

  const labels = organizationLabels(organizationType);

  const supportsDivisions =
    organizationType === "school" ||
    organizationType === "institution";

  const sortedCategories = useMemo(() => {
    return [...categories].sort(
      (first, second) =>
        Number(first.sort_order || 0) -
          Number(second.sort_order || 0) ||
        first.name.localeCompare(second.name),
    );
  }, [categories]);

  const totalUsedStudents = students.length;

  function categoryStudentCount(categoryId: string) {
    return students.filter(
      (student) => student.category_id === categoryId,
    ).length;
  }

  function categoryProgrammeCount(categoryId: string) {
    return programmes.filter(
      (programme) =>
        programme.category_id === categoryId,
    ).length;
  }

  function classStudentCount(classId: string) {
    return students.filter(
      (student) => student.class_id === classId,
    ).length;
  }

  function divisionStudentCount(divisionId: string) {
    return students.filter(
      (student) => student.division_id === divisionId,
    ).length;
  }

  function getClasses(categoryId: string) {
    return classes
      .filter(
        (classItem) =>
          classItem.category_id === categoryId,
      )
      .sort(
        (first, second) =>
          Number(first.sort_order || 0) -
            Number(second.sort_order || 0) ||
          first.name.localeCompare(second.name),
      );
  }

  function getDivisions(classId: string) {
    return divisions
      .filter(
        (division) => division.class_id === classId,
      )
      .sort(
        (first, second) =>
          Number(first.sort_order || 0) -
            Number(second.sort_order || 0) ||
          first.name.localeCompare(second.name),
      );
  }

  async function loadPageData(
    forceRefresh = false,
  ) {
    setIsLoading(true);
    setError("");
    setMessage("");

    const admin = await getAdminContext({
      forceRefresh,
    });

    if (admin.error || !admin.context) {
      setContext(null);
      setError(
        admin.error ||
          "Unable to load institution workspace.",
      );
      setIsLoading(false);
      return;
    }

    setContext(admin.context);

    const [
      categoryRes,
      classRes,
      divisionRes,
      studentRes,
      programmeRes,
    ] = await Promise.all([
      supabase
        .from("categories")
        .select(
          "id, organization_id, event_id, name, description, gender_scope, chest_no_start, chest_no_end, sort_order",
        )
        .eq(
          "organization_id",
          admin.context.organizationId,
        )
        .eq("event_id", admin.context.eventId)
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("classes")
        .select(
          "id, organization_id, event_id, category_id, name, sort_order",
        )
        .eq(
          "organization_id",
          admin.context.organizationId,
        )
        .eq("event_id", admin.context.eventId)
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("class_divisions")
        .select(
          "id, organization_id, event_id, class_id, name, sort_order, is_active",
        )
        .eq(
          "organization_id",
          admin.context.organizationId,
        )
        .eq("event_id", admin.context.eventId)
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("students")
        .select(
          "id, category_id, class_id, division_id",
        )
        .eq(
          "organization_id",
          admin.context.organizationId,
        )
        .eq("event_id", admin.context.eventId),

      supabase
        .from("programmes")
        .select("id, category_id")
        .eq(
          "organization_id",
          admin.context.organizationId,
        )
        .eq("event_id", admin.context.eventId),
    ]);

    const firstError =
      categoryRes.error ||
      classRes.error ||
      divisionRes.error ||
      studentRes.error ||
      programmeRes.error;

    if (firstError) {
      setError(firstError.message);
      setIsLoading(false);
      return;
    }

    setCategories(
      (categoryRes.data || []) as Category[],
    );
    setClasses((classRes.data || []) as ClassItem[]);
    setDivisions(
      (divisionRes.data || []) as DivisionItem[],
    );
    setStudents(
      (studentRes.data || []) as StudentUsage[],
    );
    setProgrammes(
      (programmeRes.data || []) as ProgrammeUsage[],
    );

    setIsLoading(false);
  }

  function openAddModal() {
    setForm(EMPTY_FORM);
    setError("");
    setMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(category: Category) {
    const classDrafts: ClassDraft[] = getClasses(
      category.id,
    ).map((classItem) => ({
      key: classItem.id,
      id: classItem.id,
      name: classItem.name,
      divisionInput: "",
      divisions: getDivisions(classItem.id).map(
        (division) => ({
          key: division.id,
          id: division.id,
          name: division.name,
        }),
      ),
    }));

    setForm({
      id: category.id,
      name: category.name || "",
      description: category.description || "",
      chestNoStart:
        category.chest_no_start === null
          ? ""
          : String(category.chest_no_start),
      chestNoEnd:
        category.chest_no_end === null
          ? ""
          : String(category.chest_no_end),
      classInput: "",
      classes: classDrafts,
    });

    setError("");
    setMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    if (isSaving) return;

    setIsModalOpen(false);
    setForm(EMPTY_FORM);
    setError("");
  }

  function addClass() {
    const name = form.classInput.trim();

    if (!name) return;

    const duplicate = form.classes.some(
      (classItem) =>
        normalize(classItem.name) === normalize(name),
    );

    if (duplicate) {
      setError(
        `${labels.className} "${name}" is already added.`,
      );
      return;
    }

    setForm((current) => ({
      ...current,
      classInput: "",
      classes: [
        ...current.classes,
        {
          key: newKey("class"),
          id: null,
          name,
          divisionInput: "",
          divisions: [],
        },
      ],
    }));

    setError("");
  }

  function updateClassName(
    key: string,
    name: string,
  ) {
    setForm((current) => ({
      ...current,
      classes: current.classes.map((classItem) =>
        classItem.key === key
          ? {
              ...classItem,
              name,
            }
          : classItem,
      ),
    }));
  }

  function removeClass(classDraft: ClassDraft) {
    if (classDraft.id) {
      const usage = classStudentCount(classDraft.id);

      if (usage > 0) {
        setError(
          `${classDraft.name} cannot be removed because ${usage} student${
            usage === 1 ? "" : "s"
          } currently use it.`,
        );
        return;
      }
    }

    setForm((current) => ({
      ...current,
      classes: current.classes.filter(
        (classItem) =>
          classItem.key !== classDraft.key,
      ),
    }));

    setError("");
  }

  function updateDivisionInput(
    classKey: string,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      classes: current.classes.map((classItem) =>
        classItem.key === classKey
          ? {
              ...classItem,
              divisionInput: value,
            }
          : classItem,
      ),
    }));
  }

  function addDivision(classKey: string) {
    const classDraft = form.classes.find(
      (classItem) => classItem.key === classKey,
    );

    if (!classDraft) return;

    const name = classDraft.divisionInput.trim();

    if (!name) return;

    const duplicate = classDraft.divisions.some(
      (division) =>
        normalize(division.name) === normalize(name),
    );

    if (duplicate) {
      setError(
        `${labels.division} "${name}" is already added.`,
      );
      return;
    }

    setForm((current) => ({
      ...current,
      classes: current.classes.map((classItem) =>
        classItem.key === classKey
          ? {
              ...classItem,
              divisionInput: "",
              divisions: [
                ...classItem.divisions,
                {
                  key: newKey("division"),
                  id: null,
                  name,
                },
              ],
            }
          : classItem,
      ),
    }));

    setError("");
  }

  function updateDivisionName(
    classKey: string,
    divisionKey: string,
    name: string,
  ) {
    setForm((current) => ({
      ...current,
      classes: current.classes.map((classItem) =>
        classItem.key === classKey
          ? {
              ...classItem,
              divisions: classItem.divisions.map(
                (division) =>
                  division.key === divisionKey
                    ? {
                        ...division,
                        name,
                      }
                    : division,
              ),
            }
          : classItem,
      ),
    }));
  }

  function removeDivision(
    classKey: string,
    division: DivisionDraft,
  ) {
    if (division.id) {
      const usage = divisionStudentCount(
        division.id,
      );

      if (usage > 0) {
        setError(
          `${labels.division} "${division.name}" cannot be removed because ${usage} student${
            usage === 1 ? "" : "s"
          } currently use it.`,
        );
        return;
      }
    }

    setForm((current) => ({
      ...current,
      classes: current.classes.map((classItem) =>
        classItem.key === classKey
          ? {
              ...classItem,
              divisions: classItem.divisions.filter(
                (item) =>
                  item.key !== division.key,
              ),
            }
          : classItem,
      ),
    }));

    setError("");
  }

  function validateForm() {
    if (!form.name.trim()) {
      return `${labels.category} name is required.`;
    }

    if (form.classes.length === 0) {
      return `Add at least one ${labels.className.toLowerCase()}.`;
    }

    const classNames = form.classes.map(
      (classItem) => normalize(classItem.name),
    );

    if (classNames.some((name) => !name)) {
      return `${labels.className} names cannot be empty.`;
    }

    if (
      new Set(classNames).size !== classNames.length
    ) {
      return `Duplicate ${labels.classPlural.toLowerCase()} are not allowed.`;
    }

    for (const classItem of form.classes) {
      const divisionNames = classItem.divisions.map(
        (division) => normalize(division.name),
      );

      if (
        divisionNames.some(
          (divisionName) => !divisionName,
        )
      ) {
        return `${labels.division} names cannot be empty.`;
      }

      if (
        new Set(divisionNames).size !==
        divisionNames.length
      ) {
        return `${classItem.name} contains duplicate ${labels.divisionPlural.toLowerCase()}.`;
      }
    }

    const start = form.chestNoStart
      ? Number(form.chestNoStart)
      : null;

    const end = form.chestNoEnd
      ? Number(form.chestNoEnd)
      : null;

    if (
      (start !== null &&
        (!Number.isInteger(start) || start < 0)) ||
      (end !== null &&
        (!Number.isInteger(end) || end < 0))
    ) {
      return "Chest number range must use positive whole numbers.";
    }

    if (
      start !== null &&
      end !== null &&
      end < start
    ) {
      return "Chest number end must be greater than or equal to the start.";
    }

    return "";
  }

  async function callStructureApi(
    method: "POST" | "DELETE",
    body: Record<string, unknown>,
  ) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "Login session expired. Please login again.",
      );
    }

    const response = await fetch(
      "/api/admin/academic-structure",
      {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      },
    );

    const payload = await response
      .json()
      .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        String(
          payload?.error ||
            "Unable to update academic structure.",
        ),
      );
    }

    return payload;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const editing = Boolean(form.id);

      await callStructureApi("POST", {
        category: {
          id: form.id,
          name: form.name.trim(),
          description:
            form.description.trim() || null,
          chest_no_start: form.chestNoStart
            ? Number(form.chestNoStart)
            : null,
          chest_no_end: form.chestNoEnd
            ? Number(form.chestNoEnd)
            : null,
        },
        classes: form.classes.map(
          (classItem, classIndex) => ({
            id: classItem.id,
            name: classItem.name.trim(),
            sort_order: classIndex + 1,
            divisions: supportsDivisions
              ? classItem.divisions.map(
                  (division, divisionIndex) => ({
                    id: division.id,
                    name: division.name.trim(),
                    sort_order:
                      divisionIndex + 1,
                  }),
                )
              : [],
          }),
        ),
      });

      setIsModalOpen(false);
      setForm(EMPTY_FORM);

      await loadPageData(true);

      setMessage(
        editing
          ? `${labels.category} updated safely.`
          : `${labels.category} created successfully.`,
      );
    } catch (saveError: any) {
      setError(
        saveError?.message ||
          "Unable to save changes.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCategory(
    category: Category,
  ) {
    const studentCount = categoryStudentCount(
      category.id,
    );

    const programmeCount = categoryProgrammeCount(
      category.id,
    );

    if (studentCount > 0 || programmeCount > 0) {
      setError(
        `${category.name} cannot be deleted because it is used by ${studentCount} student${
          studentCount === 1 ? "" : "s"
        } and ${programmeCount} programme${
          programmeCount === 1 ? "" : "s"
        }. Move or remove those records first.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete "${category.name}" and its unused classes${
        supportsDivisions ? " / divisions" : ""
      }?`,
    );

    if (!confirmed) return;

    setDeletingId(category.id);
    setError("");
    setMessage("");

    try {
      await callStructureApi("DELETE", {
        categoryId: category.id,
      });

      await loadPageData(true);

      setMessage(`${category.name} deleted.`);
    } catch (deleteError: any) {
      setError(
        deleteError?.message ||
          "Unable to delete category.",
      );
    } finally {
      setDeletingId("");
    }
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategories((current) =>
      current.includes(categoryId)
        ? current.filter(
            (id) => id !== categoryId,
          )
        : [...current, categoryId],
    );
  }

  return (
    <AdminShell
      title={
        supportsDivisions
          ? `${labels.categoryPlural}, ${labels.classPlural} & ${labels.divisionPlural}`
          : `${labels.categoryPlural} & ${labels.classPlural}`
      }
      subtitle={`Build the academic structure for this ${labels.organization.toLowerCase()} without breaking existing student records.`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadPageData(true)}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:px-4"
          >
            <RefreshCcw
              size={16}
              className={
                isLoading ? "animate-spin" : ""
              }
            />

            <span className="hidden sm:inline">
              Refresh
            </span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            disabled={!context}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:opacity-50"
          >
            <Plus size={17} />
            Add {labels.category}
          </button>
        </div>
      }
    >
      <style jsx global>{`
        .structure-input {
          height: 48px;
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0 0.9rem;
          font-size: 0.875rem;
          font-weight: 800;
          color: rgb(15 23 42);
          outline: none;
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        .structure-input:focus {
          border-color: rgb(167 139 250);
          box-shadow: 0 0 0 4px rgb(237 233 254);
        }

        .structure-table-scrollbar::-webkit-scrollbar {
          height: 8px;
        }

        .structure-table-scrollbar::-webkit-scrollbar-track {
          background: rgb(241 245 249);
        }

        .structure-table-scrollbar::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgb(203 213 225);
        }
      `}</style>

      <div className="mx-auto max-w-7xl space-y-5">
        {error && !isModalOpen && (
          <Notice
            tone="error"
            onClose={() => setError("")}
          >
            {error}
          </Notice>
        )}

        {message && !isModalOpen && (
          <Notice
            tone="success"
            onClose={() => setMessage("")}
          >
            {message}
          </Notice>
        )}

        {!context && !isLoading && (
          <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle
                className="mt-0.5 text-amber-700"
                size={22}
              />

              <div>
                <h2 className="text-xl font-black text-amber-950">
                  Event Setup required
                </h2>

                <p className="mt-2 text-sm font-bold leading-6 text-amber-800">
                  Complete the institution and event
                  setup before adding the academic
                  structure.
                </p>

                <Link
                  href="/admin/event-setup"
                  className="mt-4 inline-flex rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-black text-amber-950"
                >
                  Open Event Setup
                </Link>
              </div>
            </div>
          </section>
        )}

        {context && (
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Building2 size={19} />}
              label="Workspace Type"
              value={labels.organization}
            />

            <MetricCard
              icon={<Layers3 size={19} />}
              label={labels.categoryPlural}
              value={categories.length}
            />

            <MetricCard
              icon={<GraduationCap size={19} />}
              label={labels.classPlural}
              value={classes.length}
            />

            <MetricCard
              icon={<Users size={19} />}
              label="Connected Students"
              value={totalUsedStudents}
            />
          </section>
        )}

        {context && (
          <section className="rounded-[1.65rem] border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-900/20">
                  {organizationType === "school" ? (
                    <School size={22} />
                  ) : organizationType ===
                    "institution" ? (
                    <Building2 size={22} />
                  ) : (
                    <BookOpen size={22} />
                  )}
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
                    {context.organizationName}
                  </p>

                  <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">
                    {supportsDivisions
                      ? `${labels.className} → optional ${labels.division}`
                      : `${labels.category} → ${labels.className}`}
                  </h2>

                  <p className="mt-1 max-w-2xl text-sm font-bold leading-6 text-slate-500">
                    Existing class IDs are preserved
                    while editing. A class or division
                    connected to students cannot be
                    removed accidentally.
                  </p>
                </div>
              </div>

              {supportsDivisions && (
                <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                  Division support enabled
                </span>
              )}
            </div>
          </section>
        )}

        {/* List view */}
        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                Academic Structure
              </h2>

              <p className="mt-1 text-sm font-bold text-slate-500">
                Showing {sortedCategories.length}{" "}
                {sortedCategories.length === 1
                  ? labels.category.toLowerCase()
                  : labels.categoryPlural.toLowerCase()}
                .
              </p>
            </div>

            <span className="w-fit rounded-full bg-violet-50 px-4 py-2 text-xs font-black text-violet-700">
              {classes.length}{" "}
              {classes.length === 1
                ? labels.className
                : labels.classPlural}
            </span>
          </div>

          {isLoading ? (
            <div className="flex min-h-80 items-center justify-center gap-3 text-sm font-black text-slate-500">
              <Loader2
                className="animate-spin"
                size={18}
              />
              Loading academic structure...
            </div>
          ) : sortedCategories.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
                <Layers3 size={29} />
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">
                Add the first{" "}
                {labels.category.toLowerCase()}
              </h3>

              <p className="mt-2 max-w-lg text-sm font-bold leading-6 text-slate-500">
                Examples: {labels.exampleCategories}.
                You can add{" "}
                {labels.classPlural.toLowerCase()} inside
                each {labels.category.toLowerCase()}.
              </p>

              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white"
              >
                <Plus size={17} />
                Add {labels.category}
              </button>
            </div>
          ) : (
            <>
              {/* Mobile list */}
              <div className="divide-y divide-slate-100 md:hidden">
                {sortedCategories.map((category) => {
                  const categoryClasses = getClasses(
                    category.id,
                  );

                  const isExpanded =
                    expandedCategories.includes(
                      category.id,
                    );

                  const studentCount =
                    categoryStudentCount(category.id);

                  const programmeCount =
                    categoryProgrammeCount(category.id);

                  const divisionCount =
                    categoryClasses.reduce(
                      (total, classItem) =>
                        total +
                        getDivisions(classItem.id).length,
                      0,
                    );

                  return (
                    <article
                      key={category.id}
                      className="p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-violet-700">
                            {labels.category}
                          </span>

                          <h3 className="mt-2 text-lg font-black text-slate-950">
                            {category.name}
                          </h3>

                          {category.description && (
                            <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                              {category.description}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(category)
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
                          >
                            <PencilLine size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteCategory(category)
                            }
                            disabled={
                              deletingId === category.id
                            }
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 disabled:opacity-50"
                          >
                            {deletingId === category.id ? (
                              <Loader2
                                className="animate-spin"
                                size={15}
                              />
                            ) : (
                              <Trash2 size={15} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <SmallStat
                          label={labels.classPlural}
                          value={categoryClasses.length}
                        />

                        <SmallStat
                          label="Students"
                          value={studentCount}
                        />

                        <SmallStat
                          label="Programmes"
                          value={programmeCount}
                        />

                        <SmallStat
                          label="Chest Range"
                          value={
                            category.chest_no_start !==
                              null ||
                            category.chest_no_end !== null
                              ? `${
                                  category.chest_no_start ??
                                  "—"
                                }–${
                                  category.chest_no_end ??
                                  "—"
                                }`
                              : "Auto"
                          }
                        />
                      </div>

                      {supportsDivisions && (
                        <p className="mt-3 text-xs font-bold text-slate-500">
                          {divisionCount}{" "}
                          {divisionCount === 1
                            ? labels.division
                            : labels.divisionPlural}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          toggleCategory(category.id)
                        }
                        className="mt-3 flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left"
                      >
                        <span className="text-sm font-black text-slate-700">
                          View {labels.classPlural}
                        </span>

                        <ChevronDown
                          size={17}
                          className={`text-slate-500 transition ${
                            isExpanded
                              ? "rotate-180"
                              : ""
                          }`}
                        />
                      </button>

                      {isExpanded && (
                        <CategoryDetails
                          categoryClasses={
                            categoryClasses
                          }
                          supportsDivisions={
                            supportsDivisions
                          }
                          labels={labels}
                          getDivisions={getDivisions}
                          classStudentCount={
                            classStudentCount
                          }
                          divisionStudentCount={
                            divisionStudentCount
                          }
                        />
                      )}
                    </article>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="structure-table-scrollbar hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1100px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90">
                      <TableHeading className="min-w-[240px]">
                        {labels.category}
                      </TableHeading>

                      <TableHeading className="min-w-[250px]">
                        {labels.classPlural}
                      </TableHeading>

                      {supportsDivisions && (
                        <TableHeading className="w-[150px]">
                          {labels.divisionPlural}
                        </TableHeading>
                      )}

                      <TableHeading className="w-[140px]">
                        Chest Range
                      </TableHeading>

                      <TableHeading className="w-[110px]">
                        Students
                      </TableHeading>

                      <TableHeading className="w-[120px]">
                        Programmes
                      </TableHeading>

                      <TableHeading className="w-[160px] text-right">
                        Actions
                      </TableHeading>
                    </tr>
                  </thead>

                  <tbody>
                    {sortedCategories.map(
                      (category) => {
                        const categoryClasses =
                          getClasses(category.id);

                        const isExpanded =
                          expandedCategories.includes(
                            category.id,
                          );

                        const studentCount =
                          categoryStudentCount(
                            category.id,
                          );

                        const programmeCount =
                          categoryProgrammeCount(
                            category.id,
                          );

                        const divisionCount =
                          categoryClasses.reduce(
                            (total, classItem) =>
                              total +
                              getDivisions(
                                classItem.id,
                              ).length,
                            0,
                          );

                        return (
                          <>
                            <tr
                              key={category.id}
                              className="border-b border-slate-100 transition hover:bg-violet-50/30"
                            >
                              <td className="px-5 py-4 align-middle">
                                <div className="min-w-0">
                                  <p className="font-black text-slate-950">
                                    {category.name}
                                  </p>

                                  {category.description && (
                                    <p className="mt-1 max-w-[320px] text-xs font-bold leading-5 text-slate-500">
                                      {
                                        category.description
                                      }
                                    </p>
                                  )}
                                </div>
                              </td>

                              <td className="px-5 py-4 align-middle">
                                <div className="flex max-w-[300px] flex-wrap gap-1.5">
                                  {categoryClasses
                                    .slice(0, 4)
                                    .map((classItem) => (
                                      <span
                                        key={classItem.id}
                                        className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600"
                                      >
                                        {classItem.name}
                                      </span>
                                    ))}

                                  {categoryClasses.length >
                                    4 && (
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
                                      +
                                      {categoryClasses.length -
                                        4}{" "}
                                      more
                                    </span>
                                  )}

                                  {categoryClasses.length ===
                                    0 && (
                                    <span className="text-xs font-bold text-slate-400">
                                      No{" "}
                                      {labels.classPlural.toLowerCase()}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {supportsDivisions && (
                                <td className="px-5 py-4 align-middle">
                                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                                    {divisionCount}
                                  </span>
                                </td>
                              )}

                              <td className="px-5 py-4 align-middle text-sm font-black text-slate-700">
                                {category.chest_no_start !==
                                  null ||
                                category.chest_no_end !==
                                  null
                                  ? `${
                                      category.chest_no_start ??
                                      "—"
                                    } – ${
                                      category.chest_no_end ??
                                      "—"
                                    }`
                                  : "Auto"}
                              </td>

                              <td className="px-5 py-4 align-middle">
                                <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                                  {studentCount}
                                </span>
                              </td>

                              <td className="px-5 py-4 align-middle">
                                <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-black text-rose-700">
                                  {programmeCount}
                                </span>
                              </td>

                              <td className="px-5 py-4 align-middle">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      toggleCategory(
                                        category.id,
                                      )
                                    }
                                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                                  >
                                    <ChevronDown
                                      size={15}
                                      className={`transition ${
                                        isExpanded
                                          ? "rotate-180"
                                          : ""
                                      }`}
                                    />

                                    Details
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditModal(category)
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                                    aria-label={`Edit ${category.name}`}
                                  >
                                    <PencilLine
                                      size={15}
                                    />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteCategory(category)
                                    }
                                    disabled={
                                      deletingId ===
                                      category.id
                                    }
                                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                                    aria-label={`Delete ${category.name}`}
                                  >
                                    {deletingId ===
                                    category.id ? (
                                      <Loader2
                                        className="animate-spin"
                                        size={15}
                                      />
                                    ) : (
                                      <Trash2
                                        size={15}
                                      />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr
                                key={`${category.id}-details`}
                                className="border-b border-slate-100 bg-slate-50/70"
                              >
                                <td
                                  colSpan={
                                    supportsDivisions
                                      ? 7
                                      : 6
                                  }
                                  className="px-5 py-4"
                                >
                                  <CategoryDetails
                                    categoryClasses={
                                      categoryClasses
                                    }
                                    supportsDivisions={
                                      supportsDivisions
                                    }
                                    labels={labels}
                                    getDivisions={
                                      getDivisions
                                    }
                                    classStudentCount={
                                      classStudentCount
                                    }
                                    divisionStudentCount={
                                      divisionStudentCount
                                    }
                                  />
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[1.8rem] bg-white shadow-2xl sm:rounded-[1.8rem]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">
                  {form.id
                    ? "Edit safely"
                    : "Create structure"}
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950">
                  {form.id
                    ? `Edit ${labels.category}`
                    : `Add ${labels.category}`}
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  Existing class and division IDs remain
                  connected to students.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              {error && (
                <Notice
                  tone="error"
                  onClose={() => setError("")}
                >
                  {error}
                </Notice>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label={`${labels.category} Name *`}
                >
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder={`e.g. ${
                      organizationType === "madrasa"
                        ? "Lower Primary"
                        : "Primary"
                    }`}
                    className="structure-input"
                  />
                </Field>

                <Field label="Description">
                  <input
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description:
                          event.target.value,
                      }))
                    }
                    placeholder="Optional short description"
                    className="structure-input"
                  />
                </Field>

                <Field label="Chest Number Start">
                  <input
                    type="number"
                    min="0"
                    value={form.chestNoStart}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        chestNoStart:
                          event.target.value,
                      }))
                    }
                    placeholder="e.g. 101"
                    className="structure-input"
                  />
                </Field>

                <Field label="Chest Number End">
                  <input
                    type="number"
                    min="0"
                    value={form.chestNoEnd}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        chestNoEnd:
                          event.target.value,
                      }))
                    }
                    placeholder="e.g. 199"
                    className="structure-input"
                  />
                </Field>
              </div>

              <div className="my-6 h-px bg-slate-200" />

              <div>
                <h3 className="text-lg font-black text-slate-950">
                  {labels.classPlural}
                  {supportsDivisions
                    ? ` & ${labels.divisionPlural}`
                    : ""}
                </h3>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  Examples: {labels.exampleClasses}.
                </p>

                <div className="mt-4 flex gap-2">
                  <input
                    value={form.classInput}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        classInput:
                          event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addClass();
                      }
                    }}
                    placeholder={`Add ${labels.className.toLowerCase()}...`}
                    className="structure-input"
                  />

                  <button
                    type="button"
                    onClick={addClass}
                    className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
                  >
                    <Plus size={16} />
                    Add
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {form.classes.length === 0 ? (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                      <GraduationCap
                        className="mx-auto text-slate-300"
                        size={30}
                      />

                      <p className="mt-3 text-sm font-black text-slate-600">
                        No{" "}
                        {labels.classPlural.toLowerCase()}{" "}
                        added yet
                      </p>
                    </div>
                  ) : (
                    form.classes.map(
                      (classItem, classIndex) => {
                        const usage = classItem.id
                          ? classStudentCount(
                              classItem.id,
                            )
                          : 0;

                        return (
                          <div
                            key={classItem.key}
                            className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-black text-violet-700">
                                {classIndex + 1}
                              </span>

                              <div className="min-w-0 flex-1">
                                <input
                                  value={
                                    classItem.name
                                  }
                                  onChange={(event) =>
                                    updateClassName(
                                      classItem.key,
                                      event.target
                                        .value,
                                    )
                                  }
                                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                />

                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-black">
                                  {classItem.id ? (
                                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                                      Existing ID
                                      preserved
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700">
                                      New{" "}
                                      {
                                        labels.className
                                      }
                                    </span>
                                  )}

                                  {usage > 0 && (
                                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                                      Used by {usage}{" "}
                                      student
                                      {usage === 1
                                        ? ""
                                        : "s"}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  removeClass(
                                    classItem,
                                  )
                                }
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            {supportsDivisions && (
                              <div className="mt-4 border-t border-slate-200 pt-4">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                  Optional{" "}
                                  {
                                    labels.divisionPlural
                                  }
                                </p>

                                <div className="mt-3 flex gap-2">
                                  <input
                                    value={
                                      classItem.divisionInput
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      updateDivisionInput(
                                        classItem.key,
                                        event.target
                                          .value,
                                      )
                                    }
                                    onKeyDown={(
                                      event,
                                    ) => {
                                      if (
                                        event.key ===
                                        "Enter"
                                      ) {
                                        event.preventDefault();
                                        addDivision(
                                          classItem.key,
                                        );
                                      }
                                    }}
                                    placeholder="e.g. A, B or Science"
                                    className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                                  />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      addDivision(
                                        classItem.key,
                                      )
                                    }
                                    className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700"
                                  >
                                    <Plus size={14} />
                                    Add
                                  </button>
                                </div>

                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  {classItem.divisions.map(
                                    (division) => {
                                      const divisionUsage =
                                        division.id
                                          ? divisionStudentCount(
                                              division.id,
                                            )
                                          : 0;

                                      return (
                                        <div
                                          key={
                                            division.key
                                          }
                                          className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white p-2"
                                        >
                                          <input
                                            value={
                                              division.name
                                            }
                                            onChange={(
                                              event,
                                            ) =>
                                              updateDivisionName(
                                                classItem.key,
                                                division.key,
                                                event
                                                  .target
                                                  .value,
                                              )
                                            }
                                            className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 text-sm font-black text-slate-800 outline-none"
                                          />

                                          {divisionUsage >
                                            0 && (
                                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-black text-amber-700">
                                              {
                                                divisionUsage
                                              }
                                            </span>
                                          )}

                                          <button
                                            type="button"
                                            onClick={() =>
                                              removeDivision(
                                                classItem.key,
                                                division,
                                              )
                                            }
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600"
                                          >
                                            <X
                                              size={14}
                                            />
                                          </button>
                                        </div>
                                      );
                                    },
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      },
                    )
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={isSaving}
                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-900/20 disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2
                    className="animate-spin"
                    size={17}
                  />
                ) : (
                  <Save size={17} />
                )}

                {isSaving
                  ? "Saving safely..."
                  : "Save Structure"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  );
}

function CategoryDetails({
  categoryClasses,
  supportsDivisions,
  labels,
  getDivisions,
  classStudentCount,
  divisionStudentCount,
}: {
  categoryClasses: ClassItem[];
  supportsDivisions: boolean;
  labels: ReturnType<typeof organizationLabels>;
  getDivisions: (classId: string) => DivisionItem[];
  classStudentCount: (classId: string) => number;
  divisionStudentCount: (
    divisionId: string,
  ) => number;
}) {
  if (categoryClasses.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm font-bold text-slate-400">
        No {labels.classPlural.toLowerCase()} added.
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-2 lg:grid-cols-2">
      {categoryClasses.map((classItem) => {
        const classDivisions = getDivisions(
          classItem.id,
        );

        const usage = classStudentCount(classItem.id);

        return (
          <div
            key={classItem.id}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-black text-slate-900">
                {classItem.name}
              </p>

              <span className="text-[11px] font-black text-slate-400">
                {usage} student
                {usage === 1 ? "" : "s"}
              </span>
            </div>

            {supportsDivisions && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {classDivisions.length === 0 ? (
                  <span className="text-xs font-bold text-slate-400">
                    No divisions added
                  </span>
                ) : (
                  classDivisions.map((division) => (
                    <span
                      key={division.id}
                      className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700"
                    >
                      {division.name} ·{" "}
                      {divisionStudentCount(
                        division.id,
                      )}
                    </span>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TableHeading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-4 text-[10px] font-black uppercase tracking-[0.17em] text-slate-500 ${className}`}
    >
      {children}
    </th>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>

      {children}
    </label>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
          {icon}
        </div>

        <div className="min-w-0">
          <p className="truncate text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
            {label}
          </p>

          <p className="mt-0.5 truncate text-lg font-black text-slate-950">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function SmallStat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.13em] text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-black text-slate-800">
        {value}
      </p>
    </div>
  );
}

function Notice({
  tone,
  children,
  onClose,
}: {
  tone: "error" | "success";
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {tone === "error" ? (
          <AlertCircle
            className="mt-0.5 shrink-0"
            size={17}
          />
        ) : (
          <CheckCircle2
            className="mt-0.5 shrink-0"
            size={17}
          />
        )}

        <span>{children}</span>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}