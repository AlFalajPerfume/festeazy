/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import { getAdminContext } from "@/lib/admin-context";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { supabase } from "@/lib/supabase";
import {
  Edit3,
  Loader2,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Category = {
  id: string;
  name: string;
};

type Programme = {
  id: string;
  name: string;
  programme_type: string;
  stage_type: string;
  category_id: string | null;
  gender_scope: string;
  duration_minutes: number | null;
  total_marks: number;
  sort_order: number;
  status: string;
};

type Registration = {
  id: string;
  programme_id: string | null;
};

type FormState = {
  id: string | null;
  name: string;
  programmeType: string;
  stageType: string;
  categoryId: string;
  genderScope: string;
  durationMinutes: string;
  totalMarks: string;
  sortOrder: string;
  status: string;
};

const emptyForm: FormState = {
  id: null,
  name: "",
  programmeType: "individual",
  stageType: "stage",
  categoryId: "",
  genderScope: "all",
  durationMinutes: "5",
  totalMarks: "100",
  sortOrder: "0",
  status: "active",
};

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>(
    [],
  );

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");

  const [form, setForm] = useState<FormState>(emptyForm);
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  const registrationCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    registrations.forEach((registration) => {
      if (!registration.programme_id) return;

      counts[registration.programme_id] =
        (counts[registration.programme_id] || 0) + 1;
    });

    return counts;
  }, [registrations]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return programmes.filter((programme) => {
      const categoryName = getCategoryName(
        programme.category_id,
      ).toLowerCase();

      const matchesSearch =
        !keyword ||
        programme.name.toLowerCase().includes(keyword) ||
        categoryName.includes(keyword) ||
        getProgrammeTypeLabel(programme.programme_type)
          .toLowerCase()
          .includes(keyword) ||
        getStageTypeLabel(programme.stage_type)
          .toLowerCase()
          .includes(keyword) ||
        getGenderScopeLabel(programme.gender_scope)
          .toLowerCase()
          .includes(keyword);

      const matchesCategory =
        categoryFilter === "all" ||
        programme.category_id === categoryFilter ||
        (categoryFilter === "general" && !programme.category_id);

      const matchesType =
        typeFilter === "all" ||
        programme.programme_type === typeFilter;

      const matchesLocation =
        locationFilter === "all" ||
        programme.stage_type === locationFilter;

      const normalizedGender = normalizeGenderScope(programme.gender_scope);
      const matchesGender =
        genderFilter === "all" || normalizedGender === genderFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesType &&
        matchesLocation &&
        matchesGender
      );
    });
  }, [
    programmes,
    categories,
    search,
    categoryFilter,
    typeFilter,
    locationFilter,
    genderFilter,
  ]);

  async function load() {
    setLoading(true);
    setError("");

    const admin = await getAdminContext({
      forceRefresh: true,
    });

    if (admin.error || !admin.context) {
      setError(admin.error || "Unable to load workspace.");
      setLoading(false);
      return;
    }

    // Store the narrowed context in a local constant so TypeScript can safely
    // use it inside the pagination callback and Promise callbacks.
    const context = admin.context;

    const registrationRows = await fetchAllRows<Registration>((from, to) =>
      supabase
        .from("programme_registrations")
        .select("id, programme_id")
        .eq("organization_id", context.organizationId)
        .eq("event_id", context.eventId)
        .eq("status", "registered")
        .order("created_at", { ascending: true })
        .range(from, to),
    );

    const [programmeRes, categoryRes] = await Promise.all([
        supabase
          .from("programmes")
          .select(
            "id, name, programme_type, stage_type, category_id, gender_scope, duration_minutes, total_marks, sort_order, status",
          )
          .eq(
            "organization_id",
            context.organizationId,
          )
          .eq("event_id", context.eventId)
          .order("sort_order", {
            ascending: true,
          })
          .order("name", {
            ascending: true,
          }),

        supabase
          .from("categories")
          .select("id, name")
          .eq(
            "organization_id",
            context.organizationId,
          )
          .eq("event_id", context.eventId)
          .order("sort_order", {
            ascending: true,
          }),      ]);

    const firstError = programmeRes.error || categoryRes.error;

    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setProgrammes(
      (programmeRes.data || []) as Programme[],
    );

    setCategories((categoryRes.data || []) as Category[]);

    setRegistrations(registrationRows);

    setLoading(false);
  }

  function getCategoryName(id: string | null) {
    if (!id) return "General";

    return (
      categories.find((category) => category.id === id)
        ?.name || "General"
    );
  }

  function countParticipants(programmeId: string) {
    return registrationCounts[programmeId] || 0;
  }

  function openAdd() {
    const nextSortOrder =
      Math.max(0, ...programmes.map((item) => Number(item.sort_order || 0))) + 1;

    setForm({
      ...emptyForm,
      sortOrder: String(nextSortOrder),
    });

    setError("");
    setMessage("");
    setOpen(true);
  }

  function openEdit(programme: Programme) {
    setForm({
      id: programme.id,
      name: programme.name,
      programmeType:
        programme.programme_type || "individual",
      stageType: programme.stage_type || "stage",
      categoryId: programme.category_id || "",
      genderScope: programme.gender_scope || "all",
      durationMinutes:
        programme.duration_minutes === null
          ? ""
          : String(programme.duration_minutes),
      totalMarks: String(programme.total_marks ?? 100),
      sortOrder: String(programme.sort_order ?? 0),
      status: programme.status || "active",
    });

    setError("");
    setMessage("");
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setOpen(false);
    setForm(emptyForm);
    setError("");
  }

  async function callApi(
    method: "POST" | "DELETE",
    body: Record<string, unknown>,
  ) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "Your login session has expired. Please log in again.",
      );
    }

    const response = await fetch("/api/admin/programmes", {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        payload.error || "Unable to complete the request.",
      );
    }

    return payload;
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!form.name.trim()) {
      setError("Programme name is required.");
      return;
    }

    const totalMarks = Number(form.totalMarks);
    const sortOrder = Number(form.sortOrder || 0);

    const durationMinutes =
      form.durationMinutes.trim() === ""
        ? null
        : Number(form.durationMinutes);

    if (
      !Number.isFinite(totalMarks) ||
      !Number.isInteger(totalMarks) ||
      totalMarks < 1 ||
      totalMarks > 100
    ) {
      setError(
        "Maximum mark must be a whole number between 1 and 100.",
      );
      return;
    }

    if (
      durationMinutes !== null &&
      (!Number.isFinite(durationMinutes) ||
        durationMinutes < 0)
    ) {
      setError(
        "Duration must be zero or a positive number.",
      );
      return;
    }

    if (!Number.isFinite(sortOrder) || !Number.isInteger(sortOrder) || sortOrder < 1) {
      setError("Sort order must be a positive whole number.");
      return;
    }

    const duplicateSortOrder = programmes.find(
      (item) => item.id !== form.id && Number(item.sort_order) === sortOrder,
    );

    if (duplicateSortOrder) {
      setError(
        `Sort order ${sortOrder} is already used by “${duplicateSortOrder.name}”. Choose another order number.`,
      );
      return;
    }

    setSaving(true);

    try {
      const editingProgramme = Boolean(form.id);

      await callApi("POST", {
        programme: {
          id: form.id,
          name: form.name.trim(),
          programme_type: form.programmeType,
          stage_type: form.stageType,
          category_id: form.categoryId || null,
          gender_scope: form.genderScope,
          duration_minutes: durationMinutes,
          total_marks: totalMarks,
          sort_order: sortOrder,
          status: form.status,
        },
      });

      setOpen(false);
      setForm(emptyForm);

      setMessage(
        editingProgramme
          ? "Programme updated successfully."
          : "Programme created successfully.",
      );

      await load();
    } catch (saveError: any) {
      setError(
        saveError?.message ||
          "Unable to save the programme.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(programme: Programme) {
    const confirmed = window.confirm(
      `Delete "${programme.name}"?\n\nProgrammes with participants, marks or published results cannot be deleted.`,
    );

    if (!confirmed) return;

    setDeletingId(programme.id);
    setError("");
    setMessage("");

    try {
      await callApi("DELETE", {
        programmeId: programme.id,
      });

      setMessage("Programme deleted successfully.");

      await load();
    } catch (deleteError: any) {
      setError(
        deleteError?.message ||
          "Unable to delete the programme.",
      );
    } finally {
      setDeletingId("");
    }
  }

  function resetFilters() {
    setSearch("");
    setCategoryFilter("all");
    setTypeFilter("all");
    setLocationFilter("all");
    setGenderFilter("all");
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    categoryFilter !== "all" ||
    typeFilter !== "all" ||
    locationFilter !== "all" ||
    genderFilter !== "all";

  return (
    <AdminShell
      title="Programmes"
      subtitle="Create individual, group, stage and off-stage programmes."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="programme-secondary-button"
          >
            <RefreshCcw
              size={16}
              className={loading ? "animate-spin" : ""}
            />

            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={openAdd}
            className="programme-primary-button"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">Programme</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      }
    >
      <style jsx global>{`
        .programme-primary-button,
        .programme-secondary-button {
          display: inline-flex;
          height: 46px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 14px;
          padding: 0 17px;
          font-size: 14px;
          font-weight: 900;
          transition:
            transform 150ms ease,
            box-shadow 150ms ease,
            background 150ms ease;
        }

        .programme-primary-button {
          border: 1px solid #7c3aed;
          background: linear-gradient(
            135deg,
            #7c3aed,
            #9333ea
          );
          color: white;
          box-shadow: 0 8px 20px rgb(124 58 237 / 22%);
        }

        .programme-primary-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 24px rgb(124 58 237 / 28%);
        }

        .programme-primary-button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
          transform: none;
        }

        .programme-secondary-button {
          border: 1px solid #e2e8f0;
          background: white;
          color: #334155;
          box-shadow: 0 3px 8px rgb(15 23 42 / 5%);
        }

        .programme-secondary-button:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .programme-secondary-button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .programme-input {
          height: 48px;
          width: 100%;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: white;
          padding: 0 14px;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          outline: none;
          transition:
            border-color 150ms ease,
            box-shadow 150ms ease;
        }

        .programme-input::placeholder {
          color: #94a3b8;
          font-weight: 700;
        }

        .programme-input:focus {
          border-color: #a78bfa;
          box-shadow: 0 0 0 4px #ede9fe;
        }

        select.programme-input {
          cursor: pointer;
        }

        .programme-table-scrollbar::-webkit-scrollbar {
          height: 8px;
        }

        .programme-table-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .programme-table-scrollbar::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: #cbd5e1;
        }

        .programme-table-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      <div className="mx-auto max-w-[1500px] space-y-5">
        {error && !open && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        {/* Search and filter section */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/[0.03] sm:p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="relative">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search programme..."
                className="programme-input pl-11"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value)
              }
              className="programme-input"
            >
              <option value="all">All Categories</option>

              {programmes.some((programme) => !programme.category_id) && (
                <option value="general">General</option>
              )}

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value)
              }
              className="programme-input"
            >
              <option value="all">All Types</option>
              <option value="individual">Individual</option>
              <option value="group">Group</option>
            </select>

            <select
              value={locationFilter}
              onChange={(event) =>
                setLocationFilter(event.target.value)
              }
              className="programme-input"
            >
              <option value="all">All Locations</option>
              <option value="stage">Stage</option>
              <option value="off_stage">Off-Stage</option>
            </select>

            <select
              value={genderFilter}
              onChange={(event) => setGenderFilter(event.target.value)}
              className="programme-input"
            >
              <option value="all">All Genders</option>
              <option value="male">Boys</option>
              <option value="female">Girls</option>
              <option value="mixed">Mixed / All</option>
            </select>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-500">
                Showing {filtered.length} matching programme
                {filtered.length === 1 ? "" : "s"}.
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-black text-violet-700 hover:text-violet-900"
              >
                Clear Filters
              </button>
            </div>
          )}
        </section>

        {/* Programme list */}
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/[0.04]">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">
                Programme List
              </h2>

              <p className="mt-1 text-sm font-bold text-slate-500">
                Showing {filtered.length} of {programmes.length}{" "}
                programme
                {programmes.length === 1 ? "" : "s"}.
              </p>
            </div>

            <div className="w-fit rounded-full bg-violet-50 px-4 py-2 text-xs font-black text-violet-700">
              {programmes.length} Total Programmes
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[420px] items-center justify-center gap-3 font-black text-slate-500">
              <Loader2
                className="animate-spin text-violet-600"
                size={20}
              />
              Loading programmes...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Search size={25} />
              </div>

              <h3 className="mt-4 text-lg font-black text-slate-950">
                No programmes found
              </h3>

              <p className="mt-1 max-w-md text-sm font-semibold leading-6 text-slate-500">
                Change your search or filter selection to see
                more programmes.
              </p>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="programme-secondary-button mt-5"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="programme-table-scrollbar overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90">
                    <TableHeading className="w-[90px]">
                      Order
                    </TableHeading>

                    <TableHeading className="min-w-[230px]">
                      Programme Name
                    </TableHeading>

                    <TableHeading className="w-[145px]">
                      Type
                    </TableHeading>

                    <TableHeading className="w-[145px]">
                      Location
                    </TableHeading>

                    <TableHeading className="w-[180px]">
                      Category
                    </TableHeading>

                    <TableHeading className="w-[120px]">
                      Gender
                    </TableHeading>

                    <TableHeading className="w-[135px]">
                      Participants
                    </TableHeading>

                    <TableHeading className="w-[100px]">
                      Marks
                    </TableHeading>

                    <TableHeading className="w-[205px] text-right">
                      Actions
                    </TableHeading>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((programme, index) => {
                    const participantCount =
                      countParticipants(programme.id);

                    const order =
                      programme.sort_order > 0
                        ? programme.sort_order
                        : index + 1;

                    const inactive =
                      programme.status === "inactive";

                    return (
                      <tr
                        key={programme.id}
                        className={`border-b border-slate-100 transition-colors last:border-b-0 hover:bg-violet-50/30 ${
                          inactive ? "bg-slate-50/60" : "bg-white"
                        }`}
                      >
                        <td className="px-5 py-4 align-middle sm:px-6">
                          <span className="text-sm font-black text-violet-700">
                            {order}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-middle sm:px-6">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-black text-slate-950">
                                {programme.name}
                              </p>

                              {inactive && (
                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-600">
                                  Inactive
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs font-bold text-slate-500">
                              {formatDuration(
                                programme.duration_minutes,
                              )}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 align-middle sm:px-6">
                          <TypeBadge
                            type={programme.programme_type}
                          />
                        </td>

                        <td className="px-5 py-4 align-middle sm:px-6">
                          <LocationBadge
                            stageType={programme.stage_type}
                          />
                        </td>

                        <td className="px-5 py-4 align-middle sm:px-6">
                          <p className="max-w-[160px] text-sm font-extrabold leading-5 text-slate-600">
                            {getCategoryName(
                              programme.category_id,
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4 align-middle sm:px-6">
                          <span className="text-sm font-extrabold text-slate-600">
                            {getGenderLabel(
                              programme.gender_scope,
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-middle sm:px-6">
                          <span className="inline-flex min-w-8 items-center justify-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                            {participantCount}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-middle sm:px-6">
                          <span className="text-sm font-black text-slate-700">
                            {programme.total_marks}
                          </span>
                        </td>

                        <td className="px-5 py-4 align-middle sm:px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEdit(programme)
                              }
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-black text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                            >
                              <Edit3 size={15} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                remove(programme)
                              }
                              disabled={
                                deletingId === programme.id
                              }
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 text-xs font-black text-red-600 transition hover:border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === programme.id ? (
                                <Loader2
                                  className="animate-spin"
                                  size={15}
                                />
                              ) : (
                                <Trash2 size={15} />
                              )}

                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Add/Edit modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <form
            onSubmit={save}
            className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-violet-700">
                  Programme Setup
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {form.id
                    ? "Edit Programme"
                    : "Add Programme"}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Enter the programme details and marking
                  settings.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close programme form"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6 sm:py-6">
              {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Programme Name"
                  required
                  className="sm:col-span-2"
                >
                  <input
                    autoFocus
                    className="programme-input"
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Enter programme name"
                  />
                </Field>

                <Field label="Category">
                  <select
                    className="programme-input"
                    value={form.categoryId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                  >
                    <option value="">General</option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Programme Type">
                  <select
                    className="programme-input"
                    value={form.programmeType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        programmeType: event.target.value,
                      }))
                    }
                  >
                    <option value="individual">
                      Individual
                    </option>
                    <option value="group">Group</option>
                  </select>
                </Field>

                <Field label="Location">
                  <select
                    className="programme-input"
                    value={form.stageType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        stageType: event.target.value,
                      }))
                    }
                  >
                    <option value="stage">Stage</option>
                    <option value="off_stage">
                      Off-Stage
                    </option>
                  </select>
                </Field>

                <Field label="Gender">
                  <select
                    className="programme-input"
                    value={form.genderScope}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        genderScope: event.target.value,
                      }))
                    }
                  >
                    <option value="all">Mixed / All</option>
                    <option value="male">
                      Boys / Male
                    </option>
                    <option value="female">
                      Girls / Female
                    </option>
                  </select>
                </Field>

                <Field label="Duration in Minutes">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="programme-input"
                    value={form.durationMinutes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        durationMinutes: event.target.value,
                      }))
                    }
                    placeholder="Example: 5"
                  />
                </Field>

                <Field label="Maximum Mark" required>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    className="programme-input"
                    value={form.totalMarks}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        totalMarks: event.target.value,
                      }))
                    }
                    placeholder="Example: 100"
                  />
                </Field>

                <Field label="Sort Order">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="programme-input"
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sortOrder: event.target.value,
                      }))
                    }
                    placeholder="Example: 1"
                  />
                </Field>

                <Field label="Status">
                  <select
                    className="programme-input"
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </Field>
              </div>

              <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                <p className="text-sm font-black text-violet-900">
                  Overall marking
                </p>

                <p className="mt-1 text-xs font-semibold leading-5 text-violet-700">
                  Each judge gives one overall mark up to the
                  maximum mark selected for this programme.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-4 py-4 sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="programme-secondary-button"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="programme-primary-button"
              >
                {saving ? (
                  <Loader2
                    className="animate-spin"
                    size={16}
                  />
                ) : (
                  <Save size={16} />
                )}

                {saving
                  ? "Saving..."
                  : form.id
                    ? "Update Programme"
                    : "Save Programme"}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminShell>
  );
}

function TableHeading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:px-6 ${className}`}
    >
      {children}
    </th>
  );
}

function Field({
  label,
  children,
  required = false,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.13em] text-slate-500">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      {children}
    </label>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isGroup = type === "group";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-black ${
        isGroup
          ? "bg-blue-50 text-blue-700"
          : "bg-violet-50 text-violet-700"
      }`}
    >
      {isGroup ? "Group" : "Individual"}
    </span>
  );
}

function LocationBadge({
  stageType,
}: {
  stageType: string;
}) {
  const isOffStage = stageType === "off_stage";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-black ${
        isOffStage
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-700"
      }`}
    >
      {isOffStage ? "Off-Stage" : "Stage"}
    </span>
  );
}

function normalizeGenderScope(value: string | null | undefined) {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized.includes("female") || normalized.includes("girl")) {
    return "female";
  }

  if (normalized.includes("male") || normalized.includes("boy")) {
    return "male";
  }

  return "mixed";
}

function getGenderScopeLabel(value: string | null | undefined) {
  const normalized = normalizeGenderScope(value);
  if (normalized === "female") return "Girls";
  if (normalized === "male") return "Boys";
  return "Mixed / All";
}

function getProgrammeTypeLabel(type: string) {
  return type === "group" ? "Group" : "Individual";
}

function getStageTypeLabel(stageType: string) {
  return stageType === "off_stage"
    ? "Off-Stage"
    : "Stage";
}

function getGenderLabel(genderScope: string) {
  if (genderScope === "male") return "Boys";
  if (genderScope === "female") return "Girls";

  return "All";
}

function formatDuration(duration: number | null) {
  if (duration === null || duration === undefined) {
    return "No duration";
  }

  if (duration === 0) {
    return "0 mins";
  }

  return `${duration} ${duration === 1 ? "min" : "mins"}`;
}