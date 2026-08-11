/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import {
  deleteAdminStorageAsset,
  uploadAdminStorageAsset,
} from "@/lib/admin-storage";
import {
  AlertCircle,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type EventInfo = {
  id: string;
  organization_id: string;
  title: string;
  is_public?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Team = {
  id: string;
  organization_id: string;
  event_id: string;
  name: string;
  code: string | null;
  leader_name: string | null;
  description: string | null;
  logo_url: string | null;
  sort_order: number | null;
  created_at: string;
};

type Student = {
  id: string;
  team_id: string | null;
};

export default function TeamsPage() {
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [leaderName, setLeaderName] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  const totalTeams = teams.length;
  const totalStudents = students.length;
  const averageMembers =
    totalTeams > 0 ? (totalStudents / totalTeams).toFixed(1) : "0";

  function getTeamMembers(teamId: string) {
    return students.filter((student) => student.team_id === teamId).length;
  }

  function getInitials(value: string) {
    return String(value || "T")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  async function getCurrentEvent() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return { event: null, error: sessionError.message };
    }

    if (!session?.user) {
      return { event: null, error: "Please login again." };
    }

    const { data: userLink, error: userLinkError } = await supabase
      .from("organization_users")
      .select("organization_id")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (userLinkError || !userLink) {
      return {
        event: null,
        error:
          "This login is not connected to any madrasa. Please contact FestEazy admin.",
      };
    }

    let { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, organization_id, title, is_public, created_at, updated_at")
      .eq("organization_id", userLink.organization_id)
      .eq("is_public", true)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!eventData && !eventError) {
      const fallbackEvent = await supabase
        .from("events")
        .select("id, organization_id, title, is_public, created_at, updated_at")
        .eq("organization_id", userLink.organization_id)
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      eventData = fallbackEvent.data;
      eventError = fallbackEvent.error;
    }

    if (eventError) {
      return { event: null, error: eventError.message };
    }

    return { event: eventData as EventInfo | null, error: "" };
  }

  async function loadData() {
    setIsLoading(true);
    setError("");
    setMessage("");

    const current = await getCurrentEvent();

    if (current.error) {
      setError(current.error);
      setEventInfo(null);
      setTeams([]);
      setStudents([]);
      setIsLoading(false);
      return;
    }

    setEventInfo(current.event);

    if (!current.event) {
      setTeams([]);
      setStudents([]);
      setIsLoading(false);
      return;
    }

    const [teamsRes, studentsRes] = await Promise.all([
      supabase
        .from("teams")
        .select(
          "id, organization_id, event_id, name, code, leader_name, description, logo_url, sort_order, created_at",
        )
        .eq("organization_id", current.event.organization_id)
        .eq("event_id", current.event.id)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),

      supabase
        .from("students")
        .select("id, team_id")
        .eq("organization_id", current.event.organization_id)
        .eq("event_id", current.event.id),
    ]);

    if (teamsRes.error) {
      setError(teamsRes.error.message);
      setIsLoading(false);
      return;
    }

    if (studentsRes.error) {
      setError(studentsRes.error.message);
      setIsLoading(false);
      return;
    }

    setTeams((teamsRes.data || []) as Team[]);
    setStudents((studentsRes.data || []) as Student[]);
    setIsLoading(false);
  }

  function openCreateModal() {
    setEditingTeam(null);
    setTeamName("");
    setTeamCode("");
    setLeaderName("");
    setDescription("");
    setLogoUrl("");
    setLogoFile(null);
    setError("");
    setMessage("");
    setShowModal(true);
  }

  function openEditModal(team: Team) {
    setEditingTeam(team);
    setTeamName(team.name || "");
    setTeamCode(team.code || "");
    setLeaderName(team.leader_name || "");
    setDescription(team.description || "");
    setLogoUrl(team.logo_url || "");
    setLogoFile(null);
    setError("");
    setMessage("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingTeam(null);
    setTeamName("");
    setTeamCode("");
    setLeaderName("");
    setDescription("");
    setLogoUrl("");
    setLogoFile(null);
    setIsUploading(false);
  }

  function removeLogo() {
    setLogoFile(null);
    setLogoUrl("");
  }

  async function uploadLogo() {
    if (!logoFile) return null;

    if (!eventInfo) return null;

    setIsUploading(true);

    const uploadedAsset = await uploadAdminStorageAsset({
      file: logoFile,
      assetType: "team_logo",
    });

    setIsUploading(false);
    return uploadedAsset;
  }

  async function handleSave() {
    setError("");
    setMessage("");

    if (!eventInfo) {
      setError("Please complete Event Setup first.");
      return;
    }

    if (!teamName.trim()) {
      setError("Please enter team name.");
      return;
    }

    let uploadedLogoAsset: Awaited<ReturnType<typeof uploadLogo>> = null;

    try {
      setIsSaving(true);

      const previousLogoUrl = editingTeam?.logo_url || null;
      uploadedLogoAsset = await uploadLogo();
      const finalLogoUrl = uploadedLogoAsset
        ? uploadedLogoAsset.publicUrl
        : logoUrl || null;

      const payload = {
        organization_id: eventInfo.organization_id,
        event_id: eventInfo.id,
        name: teamName.trim(),
        code: teamCode.trim() || null,
        leader_name: leaderName.trim() || null,
        description: description.trim() || null,
        logo_url: finalLogoUrl,
        sort_order:
          editingTeam?.sort_order ||
          Math.max(0, ...teams.map((item) => Number(item.sort_order || 0))) + 1,
      };

      if (editingTeam) {
        const { error: updateError } = await supabase
          .from("teams")
          .update(payload)
          .eq("id", editingTeam.id)
          .eq("organization_id", eventInfo.organization_id)
          .eq("event_id", eventInfo.id);

        if (updateError) throw new Error(updateError.message);

        setMessage("Team updated successfully.");
      } else {
        const { error: insertError } = await supabase.from("teams").insert(payload);

        if (insertError) throw new Error(insertError.message);

        setMessage("Team created successfully.");
      }

      uploadedLogoAsset = null;

      if (previousLogoUrl && previousLogoUrl !== finalLogoUrl) {
        await deleteAdminStorageAsset({ url: previousLogoUrl }).catch((cleanupError) => {
          console.warn("Previous team logo cleanup failed:", cleanupError);
        });
      }

      closeModal();
      await loadData();
    } catch (err: any) {
      if (uploadedLogoAsset) {
        await deleteAdminStorageAsset({
          bucket: uploadedLogoAsset.bucket,
          path: uploadedLogoAsset.path,
        }).catch(() => undefined);
      }
      setError(err.message || "Something went wrong.");
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  }

  async function deleteTeam(team: Team) {
    if (!eventInfo) return;

    const memberCount = getTeamMembers(team.id);

    if (memberCount > 0) {
      setError(
        `${team.name} has ${memberCount} students. Move those students to another team before deleting.`,
      );
      return;
    }

    const confirmDelete = window.confirm(`Delete ${team.name}?`);
    if (!confirmDelete) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("teams")
      .delete()
      .eq("id", team.id)
      .eq("organization_id", eventInfo.organization_id)
      .eq("event_id", eventInfo.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (team.logo_url) {
      await deleteAdminStorageAsset({ url: team.logo_url });
    }

    setMessage("Team and stored logo deleted successfully.");
    await loadData();
  }

  return (
    <AdminShell
      title="Manage Teams"
      subtitle="Create team names, leaders and logos for the public points table."
      actions={
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            disabled={!eventInfo}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:opacity-50"
          >
            <Plus size={18} />
            Create Team
          </button>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {!eventInfo && !isLoading && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 text-amber-700" size={22} />
              <div>
                <h2 className="text-xl font-black text-amber-950">
                  Event Setup required
                </h2>
                <p className="mt-2 text-sm font-bold text-amber-800">
                  First create your madrasa and event details.
                </p>
                <Link
                  href="/admin/event-setup"
                  className="mt-4 inline-flex rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-amber-950"
                >
                  Go to Event Setup
                </Link>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Teams" value={isLoading ? "..." : totalTeams} />
          <StatCard
            label="Total Students"
            value={isLoading ? "..." : totalStudents}
          />
          <StatCard
            label="Avg. Members / Team"
            value={isLoading ? "..." : averageMembers}
          />
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="border-b border-slate-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                  Teams / Houses
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Team logos and leaders will show in the public points table.
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                <Users size={22} />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-black text-slate-500">
              <Loader2 className="animate-spin" size={18} />
              Loading teams...
            </div>
          ) : teams.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
                <Users size={28} />
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">
                No teams added
              </h3>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Click Create Team to add your first team.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
              {teams.map((team) => (
                <article
                  key={team.id}
                  className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-lg shadow-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <div className="relative bg-gradient-to-br from-violet-50 via-white to-amber-50 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] border border-white bg-white text-xl font-black text-violet-700 shadow-lg shadow-slate-900/10">
                        {team.logo_url ? (
                          <img
                            src={team.logo_url}
                            alt={team.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          getInitials(team.name)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          {team.code && (
                            <span className="rounded-full bg-violet-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-violet-700">
                              {team.code}
                            </span>
                          )}

                          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500 shadow-sm">
                            {getTeamMembers(team.id)} Members
                          </span>
                        </div>

                        <h3 className="mt-3 line-clamp-2 text-xl font-black tracking-[-0.05em] text-slate-950">
                          {team.name}
                        </h3>

                        <div className="mt-2 flex items-center gap-2 text-sm font-bold text-slate-600">
                          <UserRound size={16} className="text-violet-700" />
                          <span className="truncate">
                            {team.leader_name || "Leader not added"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {team.description && (
                      <p className="mt-4 line-clamp-3 text-sm font-bold leading-6 text-slate-500">
                        {team.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50 p-4">
                    <button
                      type="button"
                      onClick={() => openEditModal(team)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                    >
                      <Pencil size={16} />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteTeam(team)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                  {editingTeam ? "Edit Team" : "Create Team"}
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Add team leader and logo for public portal.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Team Name"
                  value={teamName}
                  onChange={setTeamName}
                  placeholder="Ishq-e-Madeena"
                />

                <TextInput
                  label="Team Code Optional"
                  value={teamCode}
                  onChange={(value) => setTeamCode(value.toUpperCase())}
                  placeholder="IM"
                />

                <div className="md:col-span-2">
                  <TextInput
                    label="Team Leader Name"
                    value={leaderName}
                    onChange={setLeaderName}
                    placeholder="e.g. Leader Name"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Description Optional
                </label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  placeholder="Small note about this team..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Team Logo Optional
                </label>

                <div className="mt-2 grid gap-4 md:grid-cols-[120px_1fr] md:items-center">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 text-xl font-black text-violet-700">
                    {logoPreviewUrl || logoUrl ? (
                      <img
                        src={logoPreviewUrl || logoUrl}
                        alt="Team logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImagePlus className="text-slate-400" size={32} />
                    )}
                  </div>

                  <div>
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700">
                      <Upload size={17} />
                      Choose Logo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0] || null;
                          setLogoFile(file);
                        }}
                      />
                    </label>

                    {(logoUrl || logoPreviewUrl) && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="ml-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700"
                      >
                        Remove
                      </button>
                    )}

                    <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
                      Recommended: square logo 512 × 512 px, PNG or JPG.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || isUploading}
                  className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:opacity-60"
                >
                  {isSaving || isUploading ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <Save size={17} />
                  )}
                  {editingTeam ? "Update Team" : "Create Team"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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
        className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-4xl font-black tracking-[-0.08em] text-slate-950">
        {value}
      </p>
    </div>
  );
}