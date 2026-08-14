/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import SearchableProgrammeSelect from "@/components/admin/SearchableProgrammeSelect";
import { supabase } from "@/lib/supabase";
import { getAdminContext } from "@/lib/admin-context";
import {
  AlertCircle,
  Check,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Gavel,
  Loader2,
  Phone,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

type OrganizationUser = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
};

type EventInfo = {
  id: string;
  organization_id: string;
  title: string;
};

type Judge = {
  id: string;
  organization_id: string;
  event_id: string;
  name: string;
  phone: string | null;
  login_pin: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

type Programme = {
  id: string;
  name: string;
  programme_type: string;
  stage_type: string;
  category_id: string | null;
  gender_scope: string;
  sort_order: number;
};

type Category = {
  id: string;
  name: string;
};

type JudgeAssignment = {
  id: string;
  organization_id: string;
  event_id: string;
  judge_id: string;
  programme_id: string;
};

type JudgeForm = {
  name: string;
  phone: string;
  login_pin: string;
  notes: string;
  is_active: boolean;
  programme_ids: string[];
};

const emptyForm: JudgeForm = {
  name: "",
  phone: "",
  login_pin: "",
  notes: "",
  is_active: true,
  programme_ids: [],
};

export default function JudgesPage() {
  const [orgUser, setOrgUser] = useState<OrganizationUser | null>(null);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);

  const [judges, setJudges] = useState<Judge[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);

  const [form, setForm] = useState<JudgeForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [searchText, setSearchText] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadPageData();
  }, []);

  const filteredJudges = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return judges
      .filter((judge) => {
        if (!keyword) return true;

        return (
          judge.name.toLowerCase().includes(keyword) ||
          String(judge.phone || "")
            .toLowerCase()
            .includes(keyword)
        );
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [judges, searchText]);

  async function loadPageData() {
    setIsLoading(true);
    setError("");
    setMessage("");

    const { context, error: contextError } = await getAdminContext();

    if (contextError || !context) {
      setError(contextError || "Please login again.");
      setIsLoading(false);
      return;
    }

    const activeOrgUser: OrganizationUser = {
      id: context.userId,
      organization_id: context.organizationId,
      user_id: context.userId,
      role: context.role,
      is_active: true,
    };

    const activeEvent: EventInfo = {
      id: context.eventId,
      organization_id: context.organizationId,
      title: context.eventTitle,
    };

    setOrgUser(activeOrgUser);
    setEventInfo(activeEvent);

    const [judgeRes, programmeRes, categoryRes, assignmentRes] =
      await Promise.all([
        supabase
          .from("judges")
          .select("*")
          .eq("event_id", activeEvent.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("programmes")
          .select(
            "id, name, programme_type, stage_type, category_id, gender_scope, sort_order",
          )
          .eq("event_id", activeEvent.id)
          .eq("status", "active")
          .order("sort_order", { ascending: true }),

        supabase
          .from("categories")
          .select("id, name")
          .eq("event_id", activeEvent.id)
          .order("sort_order", { ascending: true }),

        supabase
          .from("judge_assignments")
          .select("*")
          .eq("event_id", activeEvent.id),
      ]);

    if (judgeRes.error) {
      setError(judgeRes.error.message);
      setIsLoading(false);
      return;
    }

    if (programmeRes.error) {
      setError(programmeRes.error.message);
      setIsLoading(false);
      return;
    }

    if (categoryRes.error) {
      setError(categoryRes.error.message);
      setIsLoading(false);
      return;
    }

    if (assignmentRes.error) {
      setError(assignmentRes.error.message);
      setIsLoading(false);
      return;
    }

    setJudges((judgeRes.data || []) as Judge[]);
    setProgrammes((programmeRes.data || []) as Programme[]);
    setCategories((categoryRes.data || []) as Category[]);
    setAssignments((assignmentRes.data || []) as JudgeAssignment[]);
    setIsLoading(false);
  }

  function getAssignedProgrammeIds(judgeId: string) {
    return assignments
      .filter((item) => item.judge_id === judgeId)
      .map((item) => item.programme_id);
  }

  function getAssignedProgrammes(judgeId: string) {
    const ids = getAssignedProgrammeIds(judgeId);
    return programmes.filter((programme) => ids.includes(programme.id));
  }

  function getCategoryName(id: string | null) {
    if (!id) return "General";
    return categories.find((item) => item.id === id)?.name || "-";
  }

  function openAddModal() {
    setEditingId("");
    setForm({
      ...emptyForm,
      login_pin: generatePin(),
    });
    setShowPin(false);
    setError("");
    setMessage("");
    setIsModalOpen(true);
  }

  function openEditModal(judge: Judge) {
    setEditingId(judge.id);
    setForm({
      name: judge.name || "",
      phone: judge.phone || "",
      login_pin: judge.login_pin || "",
      notes: judge.notes || "",
      is_active: judge.is_active,
      programme_ids: getAssignedProgrammeIds(judge.id),
    });
    setShowPin(false);
    setError("");
    setMessage("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId("");
    setForm(emptyForm);
    setError("");
  }

  function generatePin() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  function updateField(field: keyof JudgeForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function replaceProgrammeIds(programmeIds: string[]) {
    setForm((current) => ({
      ...current,
      programme_ids: Array.from(new Set(programmeIds)),
    }));
  }

  function toggleProgramme(programmeId: string) {
    setForm((current) => {
      if (current.programme_ids.includes(programmeId)) {
        return {
          ...current,
          programme_ids: current.programme_ids.filter(
            (id) => id !== programmeId,
          ),
        };
      }

      return {
        ...current,
        programme_ids: [...current.programme_ids, programmeId],
      };
    });
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Copied.");
    } catch {
      setError("Copy failed.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!orgUser || !eventInfo) {
      setError("Event setup not found.");
      return;
    }

    if (!form.name.trim()) {
      setError("Judge name is required.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Phone number is required.");
      return;
    }

    if (!form.login_pin.trim()) {
      setError("Login PIN is required.");
      return;
    }

    setIsSaving(true);

    const payload = {
      organization_id: orgUser.organization_id,
      event_id: eventInfo.id,
      name: form.name.trim(),
      phone: form.phone.replace(/\s+/g, "").trim(),
      login_pin: form.login_pin.trim(),
      notes: form.notes.trim() || null,
      is_active: form.is_active,
    };

    let judgeId = editingId;

    if (editingId) {
      const { error: updateError } = await supabase
        .from("judges")
        .update(payload)
        .eq("id", editingId);

      if (updateError) {
        setError(updateError.message);
        setIsSaving(false);
        return;
      }

      await supabase
        .from("judge_assignments")
        .delete()
        .eq("judge_id", editingId);
    } else {
      const { data: insertedJudge, error: insertError } = await supabase
        .from("judges")
        .insert(payload)
        .select("id")
        .single();

      if (insertError) {
        setError(insertError.message);
        setIsSaving(false);
        return;
      }

      judgeId = insertedJudge.id;
    }

    if (form.programme_ids.length > 0) {
      const assignmentPayload = form.programme_ids.map((programmeId) => ({
        organization_id: orgUser.organization_id,
        event_id: eventInfo.id,
        judge_id: judgeId,
        programme_id: programmeId,
      }));

      const { error: assignmentError } = await supabase
        .from("judge_assignments")
        .insert(assignmentPayload);

      if (assignmentError) {
        setError(assignmentError.message);
        setIsSaving(false);
        return;
      }
    }

    setMessage(
      editingId ? "Judge updated successfully." : "Judge added successfully.",
    );
    setIsSaving(false);
    closeModal();
    await loadPageData();
  }

  async function toggleJudgeStatus(judge: Judge) {
    const { error: updateError } = await supabase
      .from("judges")
      .update({ is_active: !judge.is_active })
      .eq("id", judge.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage(judge.is_active ? "Judge deactivated." : "Judge activated.");
    await loadPageData();
  }

  async function deleteJudge(judge: Judge) {
    const confirmed = window.confirm(`Delete judge "${judge.name}"?`);
    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("judges")
      .delete()
      .eq("id", judge.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setMessage("Judge deleted successfully.");
    await loadPageData();
  }

  return (
    <AdminShell
      title="Judges"
      subtitle="Manage judges, PIN access and programme assignments."
      actions={
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadPageData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700"
          >
            <Plus size={17} />
            Judge
          </button>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {error && !isModalOpen && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {message && !isModalOpen && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        {!eventInfo && !isLoading && (
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-lg shadow-amber-900/5">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 text-amber-700" size={22} />
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-amber-950">
                  Event Setup required
                </h2>
                <p className="mt-2 text-sm font-bold leading-6 text-amber-800">
                  Complete Event Setup before adding judges.
                </p>
                <Link
                  href="/admin/event-setup"
                  className="mt-5 inline-flex rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-amber-950 transition hover:bg-amber-400"
                >
                  Go to Event Setup
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <Search size={18} className="text-slate-400" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search judge by name or phone..."
              className="w-full bg-transparent text-sm font-bold outline-none"
            />
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <StatCard title="Total Judges" value={judges.length} />
          <StatCard
            title="Active Judges"
            value={judges.filter((judge) => judge.is_active).length}
          />
          <StatCard title="Assigned Programmes" value={assignments.length} />
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                Judge List
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                Showing {filteredJudges.length} of {judges.length} judges.
              </p>
            </div>

            <div className="rounded-2xl bg-violet-50 px-4 py-2 text-sm font-black text-violet-700">
              {eventInfo?.title || "Event"}
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-black text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Loading judges...
            </div>
          ) : filteredJudges.length === 0 ? (
            <EmptyState onAdd={openAddModal} />
          ) : (
            <div className="grid gap-5 p-5 lg:grid-cols-2 xl:grid-cols-3">
              {filteredJudges.map((judge) => {
                const assigned = getAssignedProgrammes(judge.id);

                return (
                  <div
                    key={judge.id}
                    className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                          <Gavel size={22} />
                        </div>

                        <div>
                          <h3 className="text-lg font-black text-slate-950">
                            {judge.name}
                          </h3>
                          <span
                            className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black ${
                              judge.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {judge.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleJudgeStatus(judge)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                      >
                        {judge.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <Phone size={16} className="text-slate-400" />
                        {judge.phone || "-"}
                      </div>

                      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                            Login PIN
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-950">
                            {judge.login_pin || "-"}
                          </p>
                        </div>

                        {judge.login_pin && (
                          <button
                            type="button"
                            onClick={() => copyText(judge.login_pin || "")}
                            className="rounded-xl bg-white p-2 text-slate-500 shadow-sm transition hover:text-violet-700"
                          >
                            <Copy size={16} />
                          </button>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                          Assigned Programmes
                        </p>

                        {assigned.length === 0 ? (
                          <p className="mt-2 text-sm font-bold text-slate-400">
                            No programmes assigned
                          </p>
                        ) : (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {assigned.slice(0, 4).map((programme) => (
                              <span
                                key={programme.id}
                                className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700"
                              >
                                {programme.name}
                              </span>
                            ))}

                            {assigned.length > 4 && (
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                                +{assigned.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() => openEditModal(judge)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                      >
                        <Edit3 size={15} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteJudge(judge)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {isModalOpen && (
          <JudgeModal
            title={editingId ? "Edit Judge" : "Add Judge"}
            form={form}
            programmes={programmes}
            categories={categories}
            getCategoryName={getCategoryName}
            error={error}
            isSaving={isSaving}
            showPin={showPin}
            setShowPin={setShowPin}
            updateField={updateField}
            toggleProgramme={toggleProgramme}
            replaceProgrammeIds={replaceProgrammeIds}
            generatePin={() =>
              setForm((current) => ({ ...current, login_pin: generatePin() }))
            }
            onClose={closeModal}
            onSubmit={handleSubmit}
            submitLabel={editingId ? "Update Judge" : "Save Judge"}
          />
        )}
      </div>
    </AdminShell>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
        <UserCheck size={24} />
      </div>
      <p className="mt-5 text-3xl font-black tracking-[-0.06em] text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-sm font-black text-slate-500">{title}</p>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
        <Gavel size={28} />
      </div>
      <h3 className="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">
        No judges added
      </h3>
      <p className="mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
        Add judges and assign programmes for mark entry.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white"
      >
        Add Judge
      </button>
    </div>
  );
}

function JudgeModal({
  title,
  form,
  programmes,
  categories,
  getCategoryName,
  error,
  isSaving,
  showPin,
  setShowPin,
  updateField,
  toggleProgramme,
  replaceProgrammeIds,
  generatePin,
  onClose,
  onSubmit,
  submitLabel,
}: {
  title: string;
  form: JudgeForm;
  programmes: Programme[];
  categories: Category[];
  getCategoryName: (id: string | null) => string;
  error: string;
  isSaving: boolean;
  showPin: boolean;
  setShowPin: (value: boolean) => void;
  updateField: (field: keyof JudgeForm, value: string | boolean) => void;
  toggleProgramme: (programmeId: string) => void;
  replaceProgrammeIds: (programmeIds: string[]) => void;
  generatePin: () => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
}) {
  const [programmePickerValue, setProgrammePickerValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  function normalizeGender(value: string | null | undefined) {
    const normalized = String(value || "").trim().toLowerCase();

    if (normalized.includes("female") || normalized.includes("girl")) {
      return "female";
    }

    if (normalized.includes("male") || normalized.includes("boy")) {
      return "male";
    }

    return "all";
  }

  function normalizeStage(value: string | null | undefined) {
    const normalized = String(value || "stage")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");

    return normalized === "off_stage" || normalized === "offstage"
      ? "off_stage"
      : "stage";
  }

  const filteredProgrammes = useMemo(() => {
    return programmes
      .filter((programme) => {
        const matchesCategory =
          categoryFilter === "all" ||
          (categoryFilter === "general"
            ? !programme.category_id
            : programme.category_id === categoryFilter);

        const normalizedGender = normalizeGender(programme.gender_scope);
        const matchesGender =
          genderFilter === "all" ||
          (genderFilter === "mixed"
            ? normalizedGender === "all"
            : normalizedGender === genderFilter);

        const matchesType =
          typeFilter === "all" || programme.programme_type === typeFilter;

        const matchesStage =
          stageFilter === "all" ||
          normalizeStage(programme.stage_type) === stageFilter;

        return matchesCategory && matchesGender && matchesType && matchesStage;
      })
      .sort((a, b) => {
        const firstOrder = Number(a.sort_order || 9999);
        const secondOrder = Number(b.sort_order || 9999);

        if (firstOrder !== secondOrder) return firstOrder - secondOrder;
        return a.name.localeCompare(b.name);
      });
  }, [
    programmes,
    categoryFilter,
    genderFilter,
    typeFilter,
    stageFilter,
  ]);

  const selectedProgrammes = useMemo(() => {
    const selectedIds = new Set(form.programme_ids);

    return programmes
      .filter((programme) => selectedIds.has(programme.id))
      .sort((a, b) => {
        const firstOrder = Number(a.sort_order || 9999);
        const secondOrder = Number(b.sort_order || 9999);

        if (firstOrder !== secondOrder) return firstOrder - secondOrder;
        return a.name.localeCompare(b.name);
      });
  }, [programmes, form.programme_ids]);

  const filteredSelectedProgrammes = useMemo(() => {
    const selectedIds = new Set(form.programme_ids);
    return filteredProgrammes.filter((programme) =>
      selectedIds.has(programme.id),
    );
  }, [filteredProgrammes, form.programme_ids]);

  const availableProgrammes = useMemo(() => {
    const selectedIds = new Set(form.programme_ids);
    return filteredProgrammes.filter(
      (programme) => !selectedIds.has(programme.id),
    );
  }, [filteredProgrammes, form.programme_ids]);

  const hasProgrammeFilters =
    categoryFilter !== "all" ||
    genderFilter !== "all" ||
    typeFilter !== "all" ||
    stageFilter !== "all";

  function resetProgrammeFilters() {
    setCategoryFilter("all");
    setGenderFilter("all");
    setTypeFilter("all");
    setStageFilter("all");
    setProgrammePickerValue("");
  }

  function addProgramme(programmeId: string) {
    if (!programmeId) return;

    if (!form.programme_ids.includes(programmeId)) {
      toggleProgramme(programmeId);
    }

    setProgrammePickerValue("");
  }

  function selectAllProgrammes() {
    replaceProgrammeIds([
      ...form.programme_ids,
      ...filteredProgrammes.map((programme) => programme.id),
    ]);
    setProgrammePickerValue("");
  }

  function clearProgrammes() {
    const visibleProgrammeIds = new Set(
      filteredProgrammes.map((programme) => programme.id),
    );

    replaceProgrammeIds(
      form.programme_ids.filter(
        (programmeId) => !visibleProgrammeIds.has(programmeId),
      ),
    );
    setProgrammePickerValue("");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="h-[96dvh] w-full max-w-3xl overflow-y-auto rounded-t-[1.75rem] bg-white shadow-2xl sm:h-auto sm:max-h-[92vh] sm:rounded-[2rem]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6 sm:py-5">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
              {title}
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Add judge details and assign programmes.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-4 pb-28 sm:p-6 sm:pb-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Judge Name *"
              value={form.name}
              onChange={(value) => updateField("name", value)}
              placeholder="e.g. Abdul Rahman Ustad"
            />

            <InputField
              label="Mobile Number *"
              value={form.phone}
              onChange={(value) => updateField("phone", value)}
              placeholder="e.g. 9876543210"
            />

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Login PIN *
              </label>
              <div className="mt-2 flex gap-2">
                <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
                  <input
                    type={showPin ? "text" : "password"}
                    value={form.login_pin}
                    onChange={(event) =>
                      updateField("login_pin", event.target.value)
                    }
                    placeholder="4 digit PIN"
                    className="w-full bg-transparent text-sm font-bold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-slate-400"
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={generatePin}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Generate
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Status
              </label>
              <select
                value={form.is_active ? "active" : "inactive"}
                onChange={(event) =>
                  updateField("is_active", event.target.value === "active")
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                rows={3}
                placeholder="Optional notes..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-black text-slate-950">
                Assign Programmes
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Filter the programme list, then assign only the programmes this
                judge should value.
              </p>
            </div>

            <div className="space-y-4 p-4">
              {programmes.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
                  No programmes found. Add programmes first.
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-950">
                          Programme Filters
                        </p>
                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Narrow the programme list before assigning to this judge.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-violet-700 shadow-sm ring-1 ring-slate-200">
                          {filteredProgrammes.length} matching
                        </span>

                        {hasProgrammeFilters && (
                          <button
                            type="button"
                            onClick={resetProgrammeFilters}
                            className="text-xs font-black text-violet-700 hover:text-violet-900"
                          >
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <select
                        value={categoryFilter}
                        onChange={(event) => {
                          setCategoryFilter(event.target.value);
                          setProgrammePickerValue("");
                        }}
                        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="all">All Categories</option>
                        {programmes.some((programme) => !programme.category_id) && (
                          <option value="general">General</option>
                        )}
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={genderFilter}
                        onChange={(event) => {
                          setGenderFilter(event.target.value);
                          setProgrammePickerValue("");
                        }}
                        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="all">All Genders</option>
                        <option value="male">Boys</option>
                        <option value="female">Girls</option>
                        <option value="mixed">Mixed / All</option>
                      </select>

                      <select
                        value={typeFilter}
                        onChange={(event) => {
                          setTypeFilter(event.target.value);
                          setProgrammePickerValue("");
                        }}
                        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="all">All Types</option>
                        <option value="individual">Individual</option>
                        <option value="group">Group</option>
                      </select>

                      <select
                        value={stageFilter}
                        onChange={(event) => {
                          setStageFilter(event.target.value);
                          setProgrammePickerValue("");
                        }}
                        className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                      >
                        <option value="all">All Locations</option>
                        <option value="stage">Stage</option>
                        <option value="off_stage">Off-stage</option>
                      </select>
                    </div>
                  </div>

                  {filteredProgrammes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-400">
                      No programmes match the selected filters.
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                          Search & Add Programme
                        </label>

                        <SearchableProgrammeSelect
                          value={programmePickerValue}
                          onChange={addProgramme}
                          options={availableProgrammes.map((programme) => ({
                            id: programme.id,
                            name: programme.name,
                            sort_order: programme.sort_order,
                            categoryName: getCategoryName(
                              programme.category_id,
                            ),
                            programmeType: programme.programme_type,
                            stageType: programme.stage_type,
                          }))}
                          closeOnSelect={false}
                          clearQueryOnSelect={false}
                          placeholder={
                            availableProgrammes.length === 0
                              ? "All matching programmes assigned"
                              : "Search filtered programme to assign..."
                          }
                          emptyText="No unassigned programmes match the selected filters"
                        />
                      </div>

                      <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-700">
                            Filtered: {filteredSelectedProgrammes.length} /{" "}
                            {filteredProgrammes.length} selected
                          </p>
                          {hasProgrammeFilters && (
                            <p className="mt-1 text-xs font-bold text-slate-500">
                              Overall: {selectedProgrammes.length} / {programmes.length}{" "}
                              selected
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                          {filteredSelectedProgrammes.length <
                            filteredProgrammes.length && (
                            <button
                              type="button"
                              onClick={selectAllProgrammes}
                              className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-black text-violet-700 transition hover:bg-violet-50"
                            >
                              Select All Matching
                            </button>
                          )}

                          {filteredSelectedProgrammes.length > 0 && (
                            <button
                              type="button"
                              onClick={clearProgrammes}
                              className="rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50"
                            >
                              Clear Matching
                            </button>
                          )}
                        </div>
                      </div>

                      {filteredSelectedProgrammes.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-bold text-slate-400">
                          No programmes from the current filter are assigned yet.
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200">
                          <div className="divide-y divide-slate-100">
                            {filteredSelectedProgrammes.map((programme) => (
                              <div
                                key={programme.id}
                                className="flex items-center justify-between gap-4 px-4 py-3"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-black text-slate-950">
                                    {programme.sort_order}. {programme.name}
                                  </p>
                                  <p className="mt-1 text-xs font-bold capitalize text-slate-500">
                                    {getCategoryName(programme.category_id)} •{" "}
                                    {programme.programme_type === "group"
                                      ? "Group"
                                      : "Individual"}{" "}
                                    • {normalizeStage(programme.stage_type) === "off_stage"
                                      ? "Off-stage"
                                      : "Stage"}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => toggleProgramme(programme.id)}
                                  className="shrink-0 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-20 flex justify-end gap-3 border-t border-slate-200 bg-white p-4 sm:static sm:bg-transparent sm:p-0 sm:pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:opacity-60"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </div>
  );
}