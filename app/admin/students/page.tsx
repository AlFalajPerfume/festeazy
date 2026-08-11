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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  GraduationCap,
  Layers3,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Category = {
  id: string;
  name: string;
  chest_no_start: number | null;
  chest_no_end: number | null;
};

type ClassItem = {
  id: string;
  name: string;
  category_id: string | null;
};

type DivisionItem = {
  id: string;
  name: string;
  class_id: string;
  is_active: boolean;
};

type Team = {
  id: string;
  name: string;
  color: string | null;
};

type Student = {
  id: string;
  organization_id: string;
  event_id: string;
  chest_no: string | null;
  chest_no_sort: number | null;
  admission_no: string | null;
  name: string;
  gender: string;
  class_id: string | null;
  division_id: string | null;
  category_id: string | null;
  team_id: string | null;
  guardian_name: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

type StudentForm = {
  id: string | null;
  name: string;
  admission_no: string;
  chest_no: string;
  gender: string;
  category_id: string;
  class_id: string;
  division_id: string;
  team_id: string;
  guardian_name: string;
  phone: string;
  status: string;
};

type BulkForm = {
  category_id: string;
  class_id: string;
  division_id: string;
  team_id: string;
  gender: string;
  names: string;
};

type Labels = {
  organization: string;
  category: string;
  categoryPlural: string;
  className: string;
  classPlural: string;
  division: string;
  divisionPlural: string;
  team: string;
  teamPlural: string;
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const EMPTY_STUDENT_FORM: StudentForm = {
  id: null,
  name: "",
  admission_no: "",
  chest_no: "",
  gender: "male",
  category_id: "",
  class_id: "",
  division_id: "",
  team_id: "",
  guardian_name: "",
  phone: "",
  status: "active",
};

const EMPTY_BULK_FORM: BulkForm = {
  category_id: "",
  class_id: "",
  division_id: "",
  team_id: "",
  gender: "male",
  names: "",
};

function getLabels(type: OrganizationType): Labels {
  if (type === "school") {
    return {
      organization: "School",
      category: "Category / Level",
      categoryPlural: "Categories / Levels",
      className: "Class",
      classPlural: "Classes",
      division: "Division / Section",
      divisionPlural: "Divisions / Sections",
      team: "House",
      teamPlural: "Houses",
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
      team: "Team / House",
      teamPlural: "Teams / Houses",
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
    team: "Team",
    teamPlural: "Teams",
  };
}

function cleanSearch(value: string) {
  return value.replace(/[,%()]/g, " ").trim();
}

function cleanChest(value: string | null) {
  return String(value || "").replace(/^#+/, "").trim();
}

export default function StudentsPage() {
  const [context, setContext] = useState<AdminContext | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [students, setStudents] = useState<Student[]>([]);
  const [matchingCount, setMatchingCount] = useState(0);
  const [overallCount, setOverallCount] = useState(0);

  const [studentForm, setStudentForm] = useState<StudentForm>(
    EMPTY_STUDENT_FORM,
  );
  const [bulkForm, setBulkForm] = useState<BulkForm>(EMPTY_BULK_FORM);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isChestRebuildOpen, setIsChestRebuildOpen] = useState(false);
  const [chestRebuildCode, setChestRebuildCode] = useState("");
  const [chestRebuildError, setChestRebuildError] = useState("");
  const [isRebuildingChest, setIsRebuildingChest] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    if (!context) return;
    void loadStudents();
  }, [
    context?.organizationId,
    context?.eventId,
    debouncedSearch,
    categoryFilter,
    classFilter,
    divisionFilter,
    teamFilter,
    genderFilter,
    statusFilter,
    page,
    pageSize,
  ]);

  const organizationType = context?.organizationType || "madrasa";
  const labels = getLabels(organizationType);
  const supportsDivisions =
    organizationType === "school" || organizationType === "institution";

  const totalPages = Math.max(1, Math.ceil(matchingCount / pageSize));
  const pageFrom = matchingCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageTo = Math.min(page * pageSize, matchingCount);

  const activeFilterCount = [
    categoryFilter,
    classFilter,
    divisionFilter,
    teamFilter,
    genderFilter,
    statusFilter && statusFilter !== "active" ? statusFilter : "",
  ].filter(Boolean).length;

  const formClasses = useMemo(
    () =>
      classes.filter(
        (item) =>
          !studentForm.category_id ||
          item.category_id === studentForm.category_id,
      ),
    [classes, studentForm.category_id],
  );

  const formDivisions = useMemo(
    () =>
      divisions.filter(
        (item) =>
          item.is_active &&
          (!studentForm.class_id || item.class_id === studentForm.class_id),
      ),
    [divisions, studentForm.class_id],
  );

  const bulkClasses = useMemo(
    () =>
      classes.filter(
        (item) =>
          !bulkForm.category_id || item.category_id === bulkForm.category_id,
      ),
    [classes, bulkForm.category_id],
  );

  const bulkDivisions = useMemo(
    () =>
      divisions.filter(
        (item) =>
          item.is_active &&
          (!bulkForm.class_id || item.class_id === bulkForm.class_id),
      ),
    [divisions, bulkForm.class_id],
  );

  const filterClasses = useMemo(
    () =>
      classes.filter(
        (item) => !categoryFilter || item.category_id === categoryFilter,
      ),
    [classes, categoryFilter],
  );

  const filterDivisions = useMemo(
    () =>
      divisions.filter(
        (item) =>
          item.is_active && (!classFilter || item.class_id === classFilter),
      ),
    [divisions, classFilter],
  );

  async function loadWorkspace(forceRefresh = false) {
    setIsLoadingContext(true);
    setError("");
    setMessage("");

    const admin = await getAdminContext({ forceRefresh });

    if (admin.error || !admin.context) {
      setContext(null);
      setError(admin.error || "Unable to load institution workspace.");
      setIsLoadingContext(false);
      return;
    }

    const activeContext = admin.context;
    setContext(activeContext);

    const [categoryRes, classRes, divisionRes, teamRes, countRes] =
      await Promise.all([
        supabase
          .from("categories")
          .select("id, name, chest_no_start, chest_no_end")
          .eq("organization_id", activeContext.organizationId)
          .eq("event_id", activeContext.eventId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("classes")
          .select("id, name, category_id")
          .eq("organization_id", activeContext.organizationId)
          .eq("event_id", activeContext.eventId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("class_divisions")
          .select("id, name, class_id, is_active")
          .eq("organization_id", activeContext.organizationId)
          .eq("event_id", activeContext.eventId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("teams")
          .select("id, name, color")
          .eq("organization_id", activeContext.organizationId)
          .eq("event_id", activeContext.eventId)
          .order("sort_order", { ascending: true }),
        supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", activeContext.organizationId)
          .eq("event_id", activeContext.eventId),
      ]);

    const firstError =
      categoryRes.error ||
      classRes.error ||
      divisionRes.error ||
      teamRes.error ||
      countRes.error;

    if (firstError) {
      setError(firstError.message);
      setIsLoadingContext(false);
      return;
    }

    setCategories((categoryRes.data || []) as Category[]);
    setClasses((classRes.data || []) as ClassItem[]);
    setDivisions((divisionRes.data || []) as DivisionItem[]);
    setTeams((teamRes.data || []) as Team[]);
    setOverallCount(Number(countRes.count || 0));
    setIsLoadingContext(false);
  }

  async function loadStudents() {
    if (!context) return;

    setIsLoadingStudents(true);
    setError("");

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("students")
      .select(
        "id, organization_id, event_id, chest_no, chest_no_sort, admission_no, name, gender, class_id, division_id, category_id, team_id, guardian_name, phone, status, created_at",
        { count: "exact" },
      )
      .eq("organization_id", context.organizationId)
      .eq("event_id", context.eventId);

    const keyword = cleanSearch(debouncedSearch);

    if (keyword) {
      query = query.or(
        `name.ilike.%${keyword}%,chest_no.ilike.%${keyword}%,admission_no.ilike.%${keyword}%,guardian_name.ilike.%${keyword}%,phone.ilike.%${keyword}%`,
      );
    }

    if (categoryFilter) query = query.eq("category_id", categoryFilter);
    if (classFilter) query = query.eq("class_id", classFilter);
    if (divisionFilter) query = query.eq("division_id", divisionFilter);
    if (teamFilter) query = query.eq("team_id", teamFilter);
    if (genderFilter) query = query.eq("gender", genderFilter);
    if (statusFilter) query = query.eq("status", statusFilter);

    const { data, count, error: queryError } = await query
      .order("chest_no_sort", { ascending: true, nullsFirst: false })
      .order("chest_no", { ascending: true })
      .order("name", { ascending: true })
      .range(from, to);

    if (queryError) {
      setError(queryError.message);
      setStudents([]);
      setMatchingCount(0);
      setIsLoadingStudents(false);
      return;
    }

    const nextCount = Number(count || 0);
    const nextTotalPages = Math.max(1, Math.ceil(nextCount / pageSize));

    if (page > nextTotalPages) {
      setPage(nextTotalPages);
      setIsLoadingStudents(false);
      return;
    }

    setStudents((data || []) as Student[]);
    setMatchingCount(nextCount);
    setIsLoadingStudents(false);
  }

  function getCategoryName(id: string | null) {
    return categories.find((item) => item.id === id)?.name || "—";
  }

  function getClassName(id: string | null) {
    return classes.find((item) => item.id === id)?.name || "—";
  }

  function getDivisionName(id: string | null) {
    if (!id) return "—";
    return divisions.find((item) => item.id === id)?.name || "—";
  }

  function getTeamName(id: string | null) {
    return teams.find((item) => item.id === id)?.name || "—";
  }

  function openAddModal() {
    setStudentForm(EMPTY_STUDENT_FORM);
    setError("");
    setMessage("");
    setIsSingleModalOpen(true);
  }

  function startEdit(student: Student) {
    setStudentForm({
      id: student.id,
      name: student.name || "",
      admission_no: student.admission_no || "",
      chest_no: cleanChest(student.chest_no),
      gender: student.gender || "male",
      category_id: student.category_id || "",
      class_id: student.class_id || "",
      division_id: student.division_id || "",
      team_id: student.team_id || "",
      guardian_name: student.guardian_name || "",
      phone: student.phone || "",
      status: student.status || "active",
    });
    setError("");
    setMessage("");
    setIsSingleModalOpen(true);
  }

  function closeSingleModal() {
    if (isSaving) return;
    setIsSingleModalOpen(false);
    setStudentForm(EMPTY_STUDENT_FORM);
    setError("");
  }

  function openBulkModal() {
    setBulkForm(EMPTY_BULK_FORM);
    setError("");
    setMessage("");
    setIsBulkModalOpen(true);
  }

  function closeBulkModal() {
    if (isSaving) return;
    setIsBulkModalOpen(false);
    setBulkForm(EMPTY_BULK_FORM);
    setError("");
  }

  function updateStudentField(field: keyof StudentForm, value: string) {
    setStudentForm((current) => {
      if (field === "category_id") {
        return {
          ...current,
          category_id: value,
          class_id: "",
          division_id: "",
          chest_no: current.id ? current.chest_no : "",
        };
      }

      if (field === "class_id") {
        return { ...current, class_id: value, division_id: "" };
      }

      return { ...current, [field]: value };
    });
  }

  function updateBulkField(field: keyof BulkForm, value: string) {
    setBulkForm((current) => {
      if (field === "category_id") {
        return {
          ...current,
          category_id: value,
          class_id: "",
          division_id: "",
        };
      }

      if (field === "class_id") {
        return { ...current, class_id: value, division_id: "" };
      }

      return { ...current, [field]: value };
    });
  }

  async function callStudentApi(
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
  ) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Login session expired. Please login again.");
    }

    const response = await fetch("/api/admin/students", {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(String(payload?.error || "Student action failed."));
    }

    return payload;
  }

  async function handleSingleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!studentForm.name.trim()) {
      setError("Student name is required.");
      return;
    }

    if (
      !studentForm.category_id ||
      !studentForm.class_id ||
      !studentForm.team_id
    ) {
      setError(
        `Select ${labels.category.toLowerCase()}, ${labels.className.toLowerCase()} and ${labels.team.toLowerCase()}.`,
      );
      return;
    }

    setIsSaving(true);

    try {
      const payload = await callStudentApi("POST", {
        student: {
          ...studentForm,
          name: studentForm.name.trim(),
          admission_no: studentForm.admission_no.trim(),
          chest_no: studentForm.chest_no.trim(),
          guardian_name: studentForm.guardian_name.trim(),
          phone: studentForm.phone.trim(),
          division_id: studentForm.division_id || null,
        },
      });

      setIsSingleModalOpen(false);
      setStudentForm(EMPTY_STUDENT_FORM);
      setMessage(
        studentForm.id
          ? "Student updated successfully."
          : `Student added with chest number ${payload?.student?.chest_no || "assigned"}.`,
      );
      await loadWorkspace(true);
      await loadStudents();
    } catch (saveError: any) {
      setError(saveError?.message || "Unable to save student.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBulkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!bulkForm.category_id || !bulkForm.class_id || !bulkForm.team_id) {
      setError(
        `Select ${labels.category.toLowerCase()}, ${labels.className.toLowerCase()} and ${labels.team.toLowerCase()}.`,
      );
      return;
    }

    const parsedStudents = bulkForm.names
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [namePart, admissionPart] = line.split("|");
        return {
          name: String(namePart || "").trim(),
          admission_no: String(admissionPart || "").trim(),
        };
      })
      .filter((item) => item.name);

    if (parsedStudents.length === 0) {
      setError("Enter at least one student name.");
      return;
    }

    if (parsedStudents.length > 500) {
      setError("Bulk Add supports a maximum of 500 students at a time.");
      return;
    }

    setIsSaving(true);

    try {
      const payload = await callStudentApi("PUT", {
        common: {
          category_id: bulkForm.category_id,
          class_id: bulkForm.class_id,
          division_id: bulkForm.division_id || null,
          team_id: bulkForm.team_id,
          gender: bulkForm.gender,
          status: "active",
        },
        students: parsedStudents,
      });

      setIsBulkModalOpen(false);
      setBulkForm(EMPTY_BULK_FORM);
      setMessage(
        `${Number(payload?.result?.inserted || parsedStudents.length)} students added with automatic chest numbers.`,
      );
      setPage(1);
      await loadWorkspace(true);
      await loadStudents();
    } catch (saveError: any) {
      setError(saveError?.message || "Unable to add students.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteStudent(student: Student) {
    const confirmed = window.confirm(
      `Delete "${student.name}"? A student already registered in programmes cannot be deleted.`,
    );

    if (!confirmed) return;

    setDeletingId(student.id);
    setError("");
    setMessage("");

    try {
      await callStudentApi("DELETE", { studentId: student.id });
      setMessage("Student deleted successfully.");
      await loadWorkspace(true);
      await loadStudents();
    } catch (deleteError: any) {
      setError(deleteError?.message || "Unable to delete student.");
    } finally {
      setDeletingId("");
    }
  }

  function openChestRebuild() {
    setChestRebuildCode("");
    setChestRebuildError("");
    setError("");
    setMessage("");
    setIsChestRebuildOpen(true);
  }

  function closeChestRebuild() {
    if (isRebuildingChest) return;
    setIsChestRebuildOpen(false);
    setChestRebuildCode("");
    setChestRebuildError("");
  }

  async function rebuildChestNumbers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChestRebuildError("");

    if (chestRebuildCode.trim() !== "EAzy2026") {
      setChestRebuildError("Incorrect maintenance code.");
      return;
    }

    setIsRebuildingChest(true);

    try {
      const payload = await callStudentApi("PATCH", {
        action: "rebuild_chest_numbers",
        safetyCode: chestRebuildCode.trim(),
      });

      const updated = Number(payload?.result?.updated || 0);
      const categoryCount = Number(payload?.result?.categories || 0);

      setIsChestRebuildOpen(false);
      setChestRebuildCode("");
      setChestRebuildError("");
      setPage(1);

      await loadWorkspace(true);
      await loadStudents();

      setMessage(
        updated > 0
          ? `Chest numbers rebuilt for ${updated} student${updated === 1 ? "" : "s"} across ${categoryCount} categor${categoryCount === 1 ? "y" : "ies"}.`
          : "Chest numbers are already correct. No changes were needed.",
      );
    } catch (rebuildError: any) {
      setChestRebuildError(
        rebuildError?.message || "Unable to rebuild chest numbers.",
      );
    } finally {
      setIsRebuildingChest(false);
    }
  }

  function resetFilters() {
    setSearchText("");
    setDebouncedSearch("");
    setCategoryFilter("");
    setClassFilter("");
    setDivisionFilter("");
    setTeamFilter("");
    setGenderFilter("");
    setStatusFilter("active");
    setPage(1);
  }

  const refreshing = isLoadingContext || isLoadingStudents;

  return (
    <AdminShell
      title="Student Directory"
      subtitle={`Manage students, ${labels.classPlural.toLowerCase()}, optional ${labels.divisionPlural.toLowerCase()} and ${labels.teamPlural.toLowerCase()}.`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              await loadWorkspace(true);
              await loadStudents();
            }}
            disabled={refreshing}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 sm:px-4"
          >
            <RefreshCcw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={openBulkModal}
            disabled={!context}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-black text-violet-700 shadow-sm transition hover:bg-violet-100 disabled:opacity-50 sm:px-4"
          >
            <Users size={16} />
            <span className="hidden sm:inline">Bulk Add</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            disabled={!context}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:opacity-50"
          >
            <Plus size={16} />
            Student
          </button>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl space-y-5">
        {error && !isSingleModalOpen && !isBulkModalOpen && (
          <Notice tone="error" onClose={() => setError("")}>
            {error}
          </Notice>
        )}

        {message && !isSingleModalOpen && !isBulkModalOpen && (
          <Notice tone="success" onClose={() => setMessage("")}>
            {message}
          </Notice>
        )}

        {!context && !isLoadingContext && (
          <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 text-amber-700" size={22} />
              <div>
                <h2 className="text-xl font-black text-amber-950">
                  Event Setup required
                </h2>
                <p className="mt-2 text-sm font-bold leading-6 text-amber-800">
                  Complete the institution and event setup before adding
                  students.
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
              icon={<Users size={19} />}
              label="Total Students"
              value={overallCount}
            />
            <MetricCard
              icon={<GraduationCap size={19} />}
              label={labels.classPlural}
              value={classes.length}
            />
            <MetricCard
              icon={<Layers3 size={19} />}
              label={labels.divisionPlural}
              value={supportsDivisions ? divisions.length : "Optional"}
            />
            <MetricCard
              icon={<UserPlus size={19} />}
              label={labels.teamPlural}
              value={teams.length}
            />
          </section>
        )}

        {context && (
          <section className="rounded-[1.65rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search name, chest no, admission no, guardian or phone..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <button
                type="button"
                onClick={openChestRebuild}
                disabled={refreshing || isRebuildingChest}
                title="Rebuild Chest Numbers"
                aria-label="Rebuild Chest Numbers"
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-200 bg-violet-50 text-violet-700 shadow-sm transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCcw
                  size={18}
                  className={isRebuildingChest ? "animate-spin" : ""}
                />
              </button>

              <button
                type="button"
                onClick={() => setShowFilters((current) => !current)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700"
              >
                <Filter size={16} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-violet-600 px-2 py-0.5 text-[10px] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {showFilters && (
              <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-6">
                <FilterSelect
                  label={labels.category}
                  value={categoryFilter}
                  onChange={(value) => {
                    setCategoryFilter(value);
                    setClassFilter("");
                    setDivisionFilter("");
                    setPage(1);
                  }}
                  options={categories.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                  allLabel={`All ${labels.categoryPlural}`}
                />

                <FilterSelect
                  label={labels.className}
                  value={classFilter}
                  onChange={(value) => {
                    setClassFilter(value);
                    setDivisionFilter("");
                    setPage(1);
                  }}
                  options={filterClasses.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                  allLabel={`All ${labels.classPlural}`}
                />

                {supportsDivisions && (
                  <FilterSelect
                    label={labels.division}
                    value={divisionFilter}
                    onChange={(value) => {
                      setDivisionFilter(value);
                      setPage(1);
                    }}
                    options={filterDivisions.map((item) => ({
                      value: item.id,
                      label: item.name,
                    }))}
                    allLabel={`All ${labels.divisionPlural}`}
                  />
                )}

                <FilterSelect
                  label={labels.team}
                  value={teamFilter}
                  onChange={(value) => {
                    setTeamFilter(value);
                    setPage(1);
                  }}
                  options={teams.map((item) => ({
                    value: item.id,
                    label: item.name,
                  }))}
                  allLabel={`All ${labels.teamPlural}`}
                />

                <FilterSelect
                  label="Gender"
                  value={genderFilter}
                  onChange={(value) => {
                    setGenderFilter(value);
                    setPage(1);
                  }}
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                  ]}
                  allLabel="All Genders"
                />

                <FilterSelect
                  label="Status"
                  value={statusFilter}
                  onChange={(value) => {
                    setStatusFilter(value);
                    setPage(1);
                  }}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  allLabel="All Statuses"
                />

                <div className="flex items-end sm:col-span-2 xl:col-span-6">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs font-black text-violet-700 hover:text-violet-900"
                  >
                    Reset search and filters
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                Students
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                {matchingCount === 0
                  ? "No matching students"
                  : `Showing ${pageFrom}–${pageTo} of ${matchingCount} matching students`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-400">
                Rows
              </span>
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoadingContext || isLoadingStudents ? (
            <div className="flex min-h-80 items-center justify-center gap-3 text-sm font-black text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Loading students...
            </div>
          ) : students.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
                <Users size={29} />
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">
                No students found
              </h3>
              <p className="mt-2 max-w-lg text-sm font-bold leading-6 text-slate-500">
                Add one student, use Bulk Add, or import an Excel sheet.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  onClick={openAddModal}
                  className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white"
                >
                  Add Student
                </button>
                <Link
                  href="/admin/imports"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"
                >
                  Import Excel
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <TableHead>Chest</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>{labels.category}</TableHead>
                      <TableHead>{labels.className}</TableHead>
                      {supportsDivisions && (
                        <TableHead>{labels.division}</TableHead>
                      )}
                      <TableHead>{labels.team}</TableHead>
                      <TableHead>Guardian / Phone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead align="right">Actions</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/70">
                        <TableCell>
                          <span className="inline-flex min-w-14 justify-center rounded-xl bg-violet-50 px-3 py-2 font-black text-violet-700">
                            {cleanChest(student.chest_no) || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <p className="font-black text-slate-950">
                            {student.name}
                          </p>
                          <p className="mt-0.5 text-xs font-bold text-slate-400">
                            {student.admission_no || "No admission number"} ·{" "}
                            {formatGender(student.gender)}
                          </p>
                        </TableCell>
                        <TableCell>{getCategoryName(student.category_id)}</TableCell>
                        <TableCell>{getClassName(student.class_id)}</TableCell>
                        {supportsDivisions && (
                          <TableCell>
                            {getDivisionName(student.division_id)}
                          </TableCell>
                        )}
                        <TableCell>{getTeamName(student.team_id)}</TableCell>
                        <TableCell>
                          <p className="font-bold text-slate-700">
                            {student.guardian_name || "—"}
                          </p>
                          <p className="mt-0.5 text-xs font-bold text-slate-400">
                            {student.phone || "No phone"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={student.status} />
                        </TableCell>
                        <TableCell align="right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEdit(student)}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                              aria-label={`Edit ${student.name}`}
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteStudent(student)}
                              disabled={deletingId === student.id}
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                              aria-label={`Delete ${student.name}`}
                            >
                              {deletingId === student.id ? (
                                <Loader2 className="animate-spin" size={15} />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 lg:hidden">
                {students.map((student) => (
                  <article
                    key={student.id}
                    className="rounded-[1.3rem] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="inline-flex min-w-14 shrink-0 justify-center rounded-xl bg-violet-50 px-3 py-2 text-base font-black text-violet-700">
                          {cleanChest(student.chest_no) || "—"}
                        </span>
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-black leading-tight text-slate-950">
                            {student.name}
                          </h3>
                          <p className="mt-1 text-xs font-bold text-slate-400">
                            {student.admission_no || "No admission number"} ·{" "}
                            {formatGender(student.gender)}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={student.status} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <MobileDetail
                        label={labels.category}
                        value={getCategoryName(student.category_id)}
                      />
                      <MobileDetail
                        label={labels.className}
                        value={getClassName(student.class_id)}
                      />
                      {supportsDivisions && (
                        <MobileDetail
                          label={labels.division}
                          value={getDivisionName(student.division_id)}
                        />
                      )}
                      <MobileDetail
                        label={labels.team}
                        value={getTeamName(student.team_id)}
                      />
                    </div>

                    {(student.guardian_name || student.phone) && (
                      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600">
                        {student.guardian_name || "Guardian not added"}
                        {student.phone ? ` · ${student.phone}` : ""}
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(student)}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-xs font-black text-slate-700"
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteStudent(student)}
                        disabled={deletingId === student.id}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 text-xs font-black text-red-600 disabled:opacity-50"
                      >
                        {deletingId === student.id ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          {matchingCount > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs font-bold text-slate-500">
                Page {page} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || isLoadingStudents}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages || isLoadingStudents}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-950 px-3 text-xs font-black text-white disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {isChestRebuildOpen && (
        <ModalShell
          title="Rebuild Chest Numbers"
          subtitle="Reassign chest numbers using the ranges configured in Categories."
          onClose={closeChestRebuild}
          isBusy={isRebuildingChest}
        >
          <form onSubmit={rebuildChestNumbers}>
            <div className="space-y-4 px-5 py-5 sm:px-6">
              {chestRebuildError && (
                <Notice
                  tone="error"
                  onClose={() => setChestRebuildError("")}
                >
                  {chestRebuildError}
                </Notice>
              )}

              <div className="rounded-2xl border border-violet-100 bg-violet-50/70 p-4">
                <p className="text-sm font-black text-violet-950">
                  Chest number repair
                </p>
                <p className="mt-1 text-xs font-bold leading-5 text-violet-800">
                  FestEazy will validate every used category range first, then
                  rebuild student chest numbers in a stable order. Student IDs,
                  programme registrations, marks and results are not changed.
                </p>
              </div>

              <Field label="Maintenance Code">
                <input
                  type="password"
                  autoFocus
                  value={chestRebuildCode}
                  onChange={(event) => {
                    setChestRebuildCode(event.target.value);
                    if (chestRebuildError) setChestRebuildError("");
                  }}
                  placeholder="Enter maintenance code"
                  className="student-input"
                />
              </Field>

              <p className="text-[11px] font-bold leading-5 text-slate-500">
                If a category has no range, overlapping ranges, or too many
                students for its range, nothing will be changed and FestEazy
                will tell you what needs to be fixed.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeChestRebuild}
                disabled={isRebuildingChest}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRebuildingChest || !chestRebuildCode.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRebuildingChest ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Rebuilding...
                  </>
                ) : (
                  <>
                    <RefreshCcw size={16} />
                    Rebuild
                  </>
                )}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {isSingleModalOpen && (
        <ModalShell
          title={studentForm.id ? "Edit Student" : "Add Student"}
          subtitle={
            studentForm.id
              ? "Update the student without changing linked records."
              : "Leave chest number blank to assign the next available number automatically."
          }
          onClose={closeSingleModal}
          isBusy={isSaving}
        >
          <form onSubmit={handleSingleSubmit}>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">
              {error && (
                <Notice tone="error" onClose={() => setError("")}>
                  {error}
                </Notice>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Student Name *" className="sm:col-span-2">
                  <input
                    value={studentForm.name}
                    onChange={(event) =>
                      updateStudentField("name", event.target.value)
                    }
                    placeholder="Enter full student name"
                    className="student-input"
                  />
                </Field>

                <Field label="Admission Number">
                  <input
                    value={studentForm.admission_no}
                    onChange={(event) =>
                      updateStudentField("admission_no", event.target.value)
                    }
                    placeholder="Optional"
                    className="student-input"
                  />
                </Field>

                <Field label="Chest Number">
                  <input
                    value={studentForm.chest_no}
                    onChange={(event) =>
                      updateStudentField(
                        "chest_no",
                        event.target.value.replace(/^#+/, ""),
                      )
                    }
                    placeholder="Auto if left blank"
                    className="student-input"
                  />
                </Field>

                <Field label="Gender *">
                  <select
                    value={studentForm.gender}
                    onChange={(event) =>
                      updateStudentField("gender", event.target.value)
                    }
                    className="student-input"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    value={studentForm.status}
                    onChange={(event) =>
                      updateStudentField("status", event.target.value)
                    }
                    className="student-input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>

                <Field label={`${labels.category} *`}>
                  <select
                    value={studentForm.category_id}
                    onChange={(event) =>
                      updateStudentField("category_id", event.target.value)
                    }
                    className="student-input"
                  >
                    <option value="">Select {labels.category}</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={`${labels.className} *`}>
                  <select
                    value={studentForm.class_id}
                    onChange={(event) =>
                      updateStudentField("class_id", event.target.value)
                    }
                    disabled={!studentForm.category_id}
                    className="student-input disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">Select {labels.className}</option>
                    {formClasses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {supportsDivisions && (
                  <Field label={`${labels.division} — Optional`}>
                    <select
                      value={studentForm.division_id}
                      onChange={(event) =>
                        updateStudentField("division_id", event.target.value)
                      }
                      disabled={!studentForm.class_id}
                      className="student-input disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">No Division / Section</option>
                      {formDivisions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label={`${labels.team} *`}>
                  <select
                    value={studentForm.team_id}
                    onChange={(event) =>
                      updateStudentField("team_id", event.target.value)
                    }
                    className="student-input"
                  >
                    <option value="">Select {labels.team}</option>
                    {teams.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Guardian Name">
                  <input
                    value={studentForm.guardian_name}
                    onChange={(event) =>
                      updateStudentField("guardian_name", event.target.value)
                    }
                    placeholder="Optional"
                    className="student-input"
                  />
                </Field>

                <Field label="Phone">
                  <input
                    value={studentForm.phone}
                    onChange={(event) =>
                      updateStudentField("phone", event.target.value)
                    }
                    placeholder="Optional contact number"
                    className="student-input"
                  />
                </Field>
              </div>
            </div>

            <ModalActions
              onCancel={closeSingleModal}
              isSaving={isSaving}
              submitLabel={studentForm.id ? "Update Student" : "Add Student"}
            />
          </form>
        </ModalShell>
      )}

      {isBulkModalOpen && (
        <ModalShell
          title="Bulk Add Students"
          subtitle="Use one line per student. Optional format: Student Name | Admission Number"
          onClose={closeBulkModal}
          isBusy={isSaving}
        >
          <form onSubmit={handleBulkSubmit}>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">
              {error && (
                <Notice tone="error" onClose={() => setError("")}>
                  {error}
                </Notice>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={`${labels.category} *`}>
                  <select
                    value={bulkForm.category_id}
                    onChange={(event) =>
                      updateBulkField("category_id", event.target.value)
                    }
                    className="student-input"
                  >
                    <option value="">Select {labels.category}</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label={`${labels.className} *`}>
                  <select
                    value={bulkForm.class_id}
                    onChange={(event) =>
                      updateBulkField("class_id", event.target.value)
                    }
                    disabled={!bulkForm.category_id}
                    className="student-input disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    <option value="">Select {labels.className}</option>
                    {bulkClasses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                {supportsDivisions && (
                  <Field label={`${labels.division} — Optional`}>
                    <select
                      value={bulkForm.division_id}
                      onChange={(event) =>
                        updateBulkField("division_id", event.target.value)
                      }
                      disabled={!bulkForm.class_id}
                      className="student-input disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      <option value="">No Division / Section</option>
                      {bulkDivisions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label={`${labels.team} *`}>
                  <select
                    value={bulkForm.team_id}
                    onChange={(event) =>
                      updateBulkField("team_id", event.target.value)
                    }
                    className="student-input"
                  >
                    <option value="">Select {labels.team}</option>
                    {teams.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Gender *">
                  <select
                    value={bulkForm.gender}
                    onChange={(event) =>
                      updateBulkField("gender", event.target.value)
                    }
                    className="student-input"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </Field>

                <Field label="Student Names *" className="sm:col-span-2">
                  <textarea
                    value={bulkForm.names}
                    onChange={(event) =>
                      updateBulkField("names", event.target.value)
                    }
                    placeholder={
                      "Afnan Mohamed | ADM101\nFathima Hana | ADM102\nMuhammed Rayan"
                    }
                    className="min-h-56 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold leading-7 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                    Chest numbers are assigned safely from the selected category
                    range. The whole bulk operation succeeds together or nothing
                    is saved.
                  </p>
                </Field>
              </div>
            </div>

            <ModalActions
              onCancel={closeBulkModal}
              isSaving={isSaving}
              submitLabel="Add Students"
            />
          </form>
        </ModalShell>
      )}

      <style jsx global>{`
        .student-input {
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

        .student-input:focus {
          border-color: rgb(167 139 250);
          box-shadow: 0 0 0 4px rgb(237 233 254);
        }
      `}</style>
    </AdminShell>
  );
}

function formatGender(value: string) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "female") return "Female";
  if (normalized === "male") return "Male";
  return value || "—";
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

function TableHead({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-[0.13em] text-slate-400 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function TableCell({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <td
      className={`whitespace-nowrap px-4 py-3 font-bold text-slate-700 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </td>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = String(status || "active").toLowerCase() === "active";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function MobileDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words font-black text-slate-700">{value}</p>
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
      className={`mb-4 flex items-start justify-between gap-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      <div className="flex items-start gap-2">
        {tone === "error" ? (
          <AlertCircle className="mt-0.5 shrink-0" size={17} />
        ) : (
          <CheckCircle2 className="mt-0.5 shrink-0" size={17} />
        )}
        <span>{children}</span>
      </div>
      <button type="button" onClick={onClose} className="shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
  isBusy,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
  isBusy: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onClose();
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-t-[1.8rem] bg-white shadow-2xl sm:rounded-[1.8rem]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalActions({
  onCancel,
  isSaving,
  submitLabel,
}: {
  onCancel: () => void;
  isSaving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-900/20 disabled:opacity-60"
      >
        {isSaving ? (
          <Loader2 className="animate-spin" size={17} />
        ) : (
          <Save size={17} />
        )}
        {isSaving ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}