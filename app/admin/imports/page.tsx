/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import {
  getAdminContext,
  type AdminContext,
  type OrganizationType,
} from "@/lib/admin-context";
import { fetchAllRows } from "@/lib/fetch-all-rows";
import { supabase } from "@/lib/supabase";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  RefreshCcw,
  UploadCloud,
} from "lucide-react";
import * as XLSX from "xlsx";
import { ChangeEvent, useEffect, useMemo, useState } from "react";

type ImportType =
  | "teams"
  | "categories"
  | "classes"
  | "divisions"
  | "students"
  | "programmes"
  | "participants";

type ImportRow = Record<string, any>;

type ImportResult = {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
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

const IMPORT_ORDER: ImportType[] = [
  "teams",
  "categories",
  "classes",
  "divisions",
  "students",
  "programmes",
  "participants",
];

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

function importTypes(labels: Labels) {
  return [
    {
      id: "teams" as const,
      title: labels.teamPlural,
      description: `Import the ${labels.teamPlural.toLowerCase()} used for championship points.`,
    },
    {
      id: "categories" as const,
      title: labels.categoryPlural,
      description: `Import ${labels.categoryPlural.toLowerCase()} such as Lower Primary, Junior or General.`,
    },
    {
      id: "classes" as const,
      title: labels.classPlural,
      description: `Import ${labels.classPlural.toLowerCase()} and connect each one to a ${labels.category.toLowerCase()}.`,
    },
    {
      id: "divisions" as const,
      title: labels.divisionPlural,
      description: `Optional: import sections such as A, B or Science inside a ${labels.className.toLowerCase()}.`,
    },
    {
      id: "students" as const,
      title: "Students",
      description: `Import students with ${labels.className.toLowerCase()}, optional ${labels.division.toLowerCase()} and ${labels.team.toLowerCase()}.`,
    },
    {
      id: "programmes" as const,
      title: "Programmes",
      description:
        "Import individual, group, stage and off-stage programmes. Leave category_name blank or use GENERAL for automatic General programmes.",
    },
    {
      id: "participants" as const,
      title: "Participants",
      description: "Import programme registrations using student chest numbers.",
    },
  ];
}

function getTemplateRows(type: ImportType, organizationType: OrganizationType) {
  const schoolLike =
    organizationType === "school" || organizationType === "institution";

  const rows: Record<ImportType, ImportRow[]> = {
    teams: [
      { team_name: schoolLike ? "Red House" : "Ishq-e-Madeena", team_code: schoolLike ? "RH" : "IM", sort_order: 1 },
      { team_name: schoolLike ? "Blue House" : "Tajdar-e-Madeena", team_code: schoolLike ? "BH" : "TM", sort_order: 2 },
    ],
    categories: [
      { category_name: "Lower Primary", sort_order: 1 },
      { category_name: "Upper Primary", sort_order: 2 },
    ],
    classes: [
      { class_name: "Class 1", category_name: "Lower Primary", sort_order: 1 },
      { class_name: "Class 2", category_name: "Lower Primary", sort_order: 2 },
      { class_name: "Class 5", category_name: "Upper Primary", sort_order: 3 },
    ],
    divisions: [
      {
        category_name: "Lower Primary",
        class_name: "Class 1",
        division_name: "A",
        sort_order: 1,
      },
      {
        category_name: "Lower Primary",
        class_name: "Class 1",
        division_name: "B",
        sort_order: 2,
      },
    ],
    students: [
      {
        chest_no: "101",
        admission_no: "ADM101",
        name: "Afnan Mohamed",
        gender: "male",
        category_name: "Lower Primary",
        class_name: "Class 1",
        division_name: schoolLike ? "A" : "",
        team_name: schoolLike ? "Red House" : "Ishq-e-Madeena",
        guardian_name: "Parent 101",
        phone: "9876543210",
        status: "active",
      },
      {
        chest_no: "",
        admission_no: "ADM102",
        name: "Fathima Hana",
        gender: "female",
        category_name: "Lower Primary",
        class_name: "Class 1",
        division_name: schoolLike ? "B" : "",
        team_name: schoolLike ? "Blue House" : "Tajdar-e-Madeena",
        guardian_name: "Parent 102",
        phone: "9876543211",
        status: "active",
      },
    ],
    programmes: [
      {
        programme_name: "Qur'an Recitation",
        category_name: "Lower Primary",
        programme_type: "individual",
        stage_type: "stage",
        gender_scope: "all",
        duration_minutes: 5,
        total_marks: 100,
        sort_order: 1,
      },
      {
        programme_name: "Pencil Drawing",
        category_name: "Lower Primary",
        programme_type: "individual",
        stage_type: "off_stage",
        gender_scope: "all",
        duration_minutes: 60,
        total_marks: 100,
        sort_order: 2,
      },
    ],
    participants: [
      {
        programme_name: "Qur'an Recitation",
        category_name: "Lower Primary",
        chest_no: "101",
        team_name: schoolLike ? "Red House" : "Ishq-e-Madeena",
        group_name: "",
        status: "registered",
      },
    ],
  };

  return rows[type];
}

export default function AdminImportsPage() {
  const [context, setContext] = useState<AdminContext | null>(null);
  const [importType, setImportType] = useState<ImportType>("students");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void loadContext();
  }, []);

  const organizationType = context?.organizationType || "madrasa";
  const labels = getLabels(organizationType);
  const availableTypes = useMemo(
    () =>
      importTypes(labels).filter(
        (item) => organizationType !== "madrasa" || item.id !== "divisions",
      ),
    [organizationType],
  );
  const activeImport = availableTypes.find((item) => item.id === importType)!;
  const previewRows = useMemo(() => rows.slice(0, 8), [rows]);

  async function loadContext(forceRefresh = false) {
    setIsLoading(true);
    setError("");
    setSuccess("");

    const admin = await getAdminContext({ forceRefresh });

    if (admin.error || !admin.context) {
      setContext(null);
      setError(admin.error || "Please login again.");
      setIsLoading(false);
      return;
    }

    setContext(admin.context);
    setIsLoading(false);
  }

  function resetUpload(nextType?: ImportType) {
    setRows([]);
    setFileName("");
    setError("");
    setSuccess("");
    if (nextType) setImportType(nextType);
  }

  function addInstructionSheet(workbook: XLSX.WorkBook) {
    const instructions = [
      { step: 1, instruction: `Import ${labels.teamPlural}` },
      { step: 2, instruction: `Import ${labels.categoryPlural}` },
      { step: 3, instruction: `Import ${labels.classPlural}` },
      {
        step: 4,
        instruction: `Optional: import ${labels.divisionPlural}`,
      },
      { step: 5, instruction: "Import Students" },
      { step: 6, instruction: "Import Programmes" },
      { step: 7, instruction: "Import Participants" },
      {
        step: "Student note",
        instruction:
          "Leave chest_no blank to assign the next available chest number automatically. Existing chest numbers update the matching student.",
      },
      {
        step: "Name matching",
        instruction:
          "Category, class, division and team/house names must exactly match the structure already created in FestEazy.",
      },
      {
        step: "Safety",
        instruction:
          "Student import is validated fully before any row is saved. If validation fails, no student rows are imported.",
      },
      {
        step: "Programme matching",
        instruction:
          "Programmes are matched by programme name + category + gender + programme type + stage type. Boys and Girls rows with the same programme name are kept as separate programmes.",
      },
      {
        step: "Participant matching",
        instruction:
          "Participant import matches the programme using the student's gender and falls back to gender_scope = all for shared programmes. Keep category_name filled when the same programme name exists in more than one category.",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(instructions);
    worksheet["!cols"] = [{ wch: 18 }, { wch: 95 }];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Instructions");
  }

  function downloadTemplate(type: ImportType) {
    const workbook = XLSX.utils.book_new();
    addInstructionSheet(workbook);
    const worksheet = XLSX.utils.json_to_sheet(
      getTemplateRows(type, organizationType),
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName(type));
    XLSX.writeFile(workbook, `festeazy_${type}_template.xlsx`);
  }

  function downloadFullTemplate() {
    const workbook = XLSX.utils.book_new();
    addInstructionSheet(workbook);

    IMPORT_ORDER.filter(
      (type) => organizationType !== "madrasa" || type !== "divisions",
    ).forEach((type) => {
      const worksheet = XLSX.utils.json_to_sheet(
        getTemplateRows(type, organizationType),
      );
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName(type));
    });

    XLSX.writeFile(workbook, "festeazy_full_import_template.xlsx");
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    setRows([]);
    setError("");
    setSuccess("");
    setFileName(file?.name || "");

    if (!file) return;

    const allowed =
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls");

    if (!allowed) {
      setError("Upload an Excel file ending in .xlsx or .xls.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("The Excel file is too large. Maximum size is 10 MB.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const preferredSheet = workbook.SheetNames.find(
        (name) => normalizeKey(name) === normalizeKey(sheetName(importType)),
      );
      const sheet = workbook.Sheets[preferredSheet || workbook.SheetNames[0]];

      if (!sheet) {
        setError("No worksheet was found inside the Excel file.");
        return;
      }

      const rawRows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      }) as ImportRow[];

      const normalizedRows = rawRows
        .map((row) => normalizeRow(row))
        .filter((row) =>
          Object.values(row).some((value) => String(value).trim() !== ""),
        );

      if (normalizedRows.length > 5000) {
        setError("A maximum of 5,000 rows can be imported at a time.");
        return;
      }

      setRows(normalizedRows);

      if (normalizedRows.length === 0) {
        setError("The selected Excel worksheet is empty.");
      }
    } catch (readError: any) {
      setError(readError?.message || "Failed to read the Excel file.");
    }
  }

  async function importStudents(rowsToImport: ImportRow[]) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Login session expired. Please login again.");
    }

    const response = await fetch("/api/admin/students/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ rows: rowsToImport }),
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const rowErrors = Array.isArray(payload?.errors)
        ? `\n${payload.errors.join("\n")}`
        : "";
      throw new Error(
        `${String(payload?.error || "Student import failed.")}${rowErrors}`,
      );
    }

    return {
      inserted: Number(payload?.result?.inserted || 0),
      updated: Number(payload?.result?.updated || 0),
      skipped: Number(payload?.result?.skipped || 0),
      errors: [] as string[],
    };
  }

  async function handleImport() {
    if (!context) {
      setError("Institution and event context was not found. Refresh and retry.");
      return;
    }

    if (rows.length === 0) {
      setError("Upload an Excel file first.");
      return;
    }

    setIsImporting(true);
    setError("");
    setSuccess("");

    try {
      const result =
        importType === "students"
          ? await importStudents(rows)
          : await importReferenceData(importType, rows, context);

      setSuccess(
        `Import completed. Added: ${result.inserted}, Updated: ${result.updated}, Skipped: ${result.skipped}.`,
      );

      if (result.errors.length > 0) {
        setError(result.errors.slice(0, 20).join("\n"));
      }
    } catch (importError: any) {
      setError(importError?.message || "Import failed.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <AdminShell
      title="Import Data"
      subtitle={`Import the complete ${labels.organization.toLowerCase()} event structure using Excel templates.`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadContext(true)}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm disabled:opacity-50 sm:px-4"
          >
            <RefreshCcw
              size={16}
              className={isLoading ? "animate-spin" : ""}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={downloadFullTemplate}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white shadow-lg shadow-violet-900/20"
          >
            <Download size={16} />
            Full Template
          </button>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl space-y-5">
        {isLoading ? (
          <div className="flex min-h-96 items-center justify-center gap-3 rounded-[1.75rem] border border-slate-200 bg-white text-sm font-black text-slate-500 shadow-xl shadow-slate-900/5">
            <Loader2 className="animate-spin" size={18} />
            Loading import workspace...
          </div>
        ) : (
          <>
            {error && (
              <div className="whitespace-pre-line rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold leading-6 text-red-700">
                <div className="mb-1 flex items-center gap-2 font-black">
                  <AlertTriangle size={18} />
                  Import notice
                </div>
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700">
                <CheckCircle2 size={18} />
                {success}
              </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
              <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-900/5 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <FileSpreadsheet size={22} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-[-0.04em] text-slate-950">
                      Select Import Type
                    </h2>
                    <p className="text-xs font-bold text-slate-500">
                      Import one section at a time.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  {availableTypes.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => resetUpload(item.id)}
                      className={`rounded-xl border p-3.5 text-left transition ${
                        importType === item.id
                          ? "border-violet-300 bg-violet-50 ring-4 ring-violet-100"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <p className="text-sm font-black text-slate-950">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
                        {item.description}
                      </p>
                    </button>
                  ))}
                </div>
              </aside>

              <div className="space-y-5">
                <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                        Excel Import
                      </p>
                      <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950">
                        {activeImport.title}
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
                        Download the correct template, keep the column names,
                        fill your data and upload it back.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => downloadTemplate(importType)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 text-sm font-black text-violet-700"
                    >
                      <Download size={16} />
                      Download Template
                    </button>
                  </div>

                  {importType === "students" && (
                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold leading-6 text-blue-800">
                      <Info className="mt-0.5 shrink-0" size={18} />
                      <p>
                        Student import is transactional. All category, class,
                        division and {labels.team.toLowerCase()} names are
                        validated first. If one row is invalid, no student row
                        is saved. Leave <code>chest_no</code> empty for automatic
                        assignment.
                      </p>
                    </div>
                  )}

                  {importType === "programmes" && (
                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm font-bold leading-6 text-violet-800">
                      <Info className="mt-0.5 shrink-0" size={18} />
                      <p>
                        Boys and Girls programmes are kept separately even when
                        the programme name and category are the same. Programme
                        matching uses name, category, gender, type and stage.
                      </p>
                    </div>
                  )}

                  {importType === "participants" && (
                    <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-800">
                      <Info className="mt-0.5 shrink-0" size={18} />
                      <p>
                        Participant import selects the Boys or Girls programme
                        from the student&apos;s gender and automatically falls
                        back to shared <code>gender_scope = all</code> programmes.
                      </p>
                    </div>
                  )}

                  <label className="mt-5 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-violet-300 hover:bg-violet-50">
                    <UploadCloud className="text-violet-700" size={40} />
                    <p className="mt-4 text-lg font-black text-slate-950">
                      Upload Excel File
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      .xlsx or .xls · Maximum 10 MB · Up to 5,000 rows
                    </p>
                    {fileName && (
                      <p className="mt-3 max-w-full truncate rounded-full bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm">
                        {fileName}
                      </p>
                    )}
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-bold text-slate-500">
                      Rows ready: {" "}
                      <span className="font-black text-slate-950">
                        {rows.length}
                      </span>
                    </p>

                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={isImporting || rows.length === 0}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition hover:bg-violet-700 disabled:opacity-50"
                    >
                      {isImporting ? (
                        <Loader2 className="animate-spin" size={17} />
                      ) : (
                        <UploadCloud size={17} />
                      )}
                      {isImporting ? "Importing safely..." : "Import Now"}
                    </button>
                  </div>
                </section>

                <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
                  <div className="border-b border-slate-100 p-5">
                    <h3 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                      File Preview
                    </h3>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      Showing the first eight rows before import.
                    </p>
                  </div>

                  {previewRows.length === 0 ? (
                    <div className="p-10 text-center text-sm font-bold text-slate-500">
                      No Excel data uploaded yet.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            {Object.keys(previewRows[0]).map((header) => (
                              <th
                                key={header}
                                className="whitespace-nowrap px-4 py-3 text-[10px] font-black uppercase tracking-[0.13em] text-slate-400"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewRows.map((row, index) => (
                            <tr key={index}>
                              {Object.keys(previewRows[0]).map((header) => (
                                <td
                                  key={header}
                                  className="max-w-72 whitespace-nowrap px-4 py-3 font-bold text-slate-700"
                                >
                                  {String(row[header] ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5">
                  <h3 className="text-sm font-black text-amber-950">
                    Recommended import order
                  </h3>
                  <p className="mt-2 text-sm font-bold leading-7 text-amber-800">
                    {labels.teamPlural} → {labels.categoryPlural} →{" "}
                    {labels.classPlural} → optional {labels.divisionPlural} →
                    Students → Programmes → Participants.
                  </p>
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminShell>
  );
}

async function importReferenceData(
  type: Exclude<ImportType, "students">,
  rows: ImportRow[],
  context: AdminContext,
): Promise<ImportResult> {
  const result: ImportResult = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const helpers = await createImportHelpers(context);

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const rowNumber = index + 2;

    try {
      if (type === "teams") {
        const name = text(row.team_name);
        if (!name) throw new Error("team_name is required.");

        const code = text(row.team_code) || autoCode(name);
        const sortOrder = numberValue(row.sort_order, index + 1);
        const existing = helpers.teamMap.get(key(name));

        if (existing) {
          const { error } = await supabase
            .from("teams")
            .update({ name, code, sort_order: sortOrder })
            .eq("id", existing.id)
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId);
          if (error) throw error;
          helpers.teamMap.set(key(name), { ...existing, name, code });
          result.updated += 1;
        } else {
          const created = await helpers.getOrCreateTeam(
            name,
            code,
            sortOrder,
          );
          if (created?.id) result.inserted += 1;
        }
      }

      if (type === "categories") {
        const name = text(row.category_name);
        if (!name) throw new Error("category_name is required.");

        if (isAutomaticGeneralCategory(name)) {
          result.skipped += 1;
          continue;
        }

        const sortOrder = numberValue(row.sort_order, index + 1);
        const existing = helpers.categoryMap.get(key(name));

        if (existing) {
          const { error } = await supabase
            .from("categories")
            .update({ name, sort_order: sortOrder })
            .eq("id", existing.id)
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId);
          if (error) throw error;
          result.updated += 1;
        } else {
          const created = await helpers.getOrCreateCategory(name, sortOrder);
          if (created?.id) result.inserted += 1;
        }
      }

      if (type === "classes") {
        const className = text(row.class_name);
        const categoryName = text(row.category_name);
        if (!className) throw new Error("class_name is required.");
        if (!categoryName) throw new Error("category_name is required.");
        if (isAutomaticGeneralCategory(categoryName)) {
          throw new Error(
            "GENERAL is automatic for programmes and cannot contain classes.",
          );
        }

        const category = await helpers.getOrCreateCategory(
          categoryName,
          index + 1,
        );
        const classKey = `${category.id}__${key(className)}`;
        const existing = helpers.classMap.get(classKey);
        const sortOrder = numberValue(row.sort_order, index + 1);

        if (existing) {
          const { error } = await supabase
            .from("classes")
            .update({ name: className, sort_order: sortOrder })
            .eq("id", existing.id)
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId);
          if (error) throw error;
          result.updated += 1;
        } else {
          const created = await helpers.getOrCreateClass(
            className,
            category.id,
            sortOrder,
          );
          if (created?.id) result.inserted += 1;
        }
      }

      if (type === "divisions") {
        const categoryName = text(row.category_name);
        const className = text(row.class_name);
        const divisionName = text(row.division_name);
        if (!categoryName) throw new Error("category_name is required.");
        if (!className) throw new Error("class_name is required.");
        if (!divisionName) throw new Error("division_name is required.");
        if (isAutomaticGeneralCategory(categoryName)) {
          throw new Error(
            "GENERAL is automatic for programmes and cannot contain divisions.",
          );
        }

        const category = await helpers.getOrCreateCategory(
          categoryName,
          index + 1,
        );
        const classItem = await helpers.getOrCreateClass(
          className,
          category.id,
          index + 1,
        );
        const divisionKey = `${classItem.id}__${key(divisionName)}`;
        const existing = helpers.divisionMap.get(divisionKey);
        const sortOrder = numberValue(row.sort_order, index + 1);

        if (existing) {
          const { error } = await supabase
            .from("class_divisions")
            .update({
              name: divisionName,
              sort_order: sortOrder,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id)
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId);
          if (error) throw error;
          result.updated += 1;
        } else {
          const { data, error } = await supabase
            .from("class_divisions")
            .insert({
              organization_id: context.organizationId,
              event_id: context.eventId,
              class_id: classItem.id,
              name: divisionName,
              sort_order: sortOrder,
              is_active: true,
              updated_at: new Date().toISOString(),
            })
            .select("id, name, class_id")
            .single();
          if (error) throw error;
          helpers.divisionMap.set(divisionKey, data);
          result.inserted += 1;
        }
      }

      if (type === "programmes") {
        const programmeName = text(row.programme_name);
        if (!programmeName) throw new Error("programme_name is required.");

        const categoryName = text(row.category_name);
        const category =
          categoryName && !isAutomaticGeneralCategory(categoryName)
            ? await helpers.getOrCreateCategory(categoryName, index + 1)
            : null;
        const categoryId = category?.id || null;

        const programmeType = normalizeProgrammeType(row.programme_type);
        const stageType = normalizeStageType(row.stage_type);
        const genderScope = normalizeGenderScope(row.gender_scope);

        const mapKey = programmeKey(
          programmeName,
          categoryId,
          genderScope,
          programmeType,
          stageType,
        );
        const existing = helpers.programmeMap.get(mapKey);

        const payload = {
          organization_id: context.organizationId,
          event_id: context.eventId,
          name: programmeName,
          programme_type: programmeType,
          stage_type: stageType,
          category_id: categoryId,
          gender_scope: genderScope,
          max_participants_per_team: 1,
          max_members_per_group: 1,
          duration_minutes: numberValue(row.duration_minutes, 0),
          total_marks: numberValue(row.total_marks, 100),
          sort_order: numberValue(row.sort_order, index + 1),
          status: text(row.status) || "active",
        };

        if (existing) {
          const { error } = await supabase
            .from("programmes")
            .update(payload)
            .eq("id", existing.id)
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId);
          if (error) throw error;

          helpers.storeProgramme({
            ...existing,
            ...payload,
          });
          result.updated += 1;
        } else {
          const { data, error } = await supabase
            .from("programmes")
            .insert(payload)
            .select(
              "id, name, category_id, programme_type, stage_type, gender_scope",
            )
            .single();
          if (error) throw error;

          helpers.storeProgramme(data);
          result.inserted += 1;
        }
      }

      if (type === "participants") {
        const programmeName = text(row.programme_name);
        const chestNo = cleanChest(row.chest_no);
        if (!programmeName) throw new Error("programme_name is required.");
        if (!chestNo) throw new Error("chest_no is required.");

        const student = helpers.studentMap.get(key(chestNo));
        if (!student) {
          throw new Error(`Student not found for chest_no: ${chestNo}`);
        }

        const categoryName = text(row.category_name);
        const categoryId =
          categoryName && !isAutomaticGeneralCategory(categoryName)
            ? helpers.categoryMap.get(key(categoryName))?.id || null
            : null;

        if (
          categoryName &&
          !isAutomaticGeneralCategory(categoryName) &&
          !categoryId
        ) {
          throw new Error(`Category not found: ${categoryName}`);
        }

        const requestedGender = text(row.gender_scope)
          ? normalizeGenderScope(row.gender_scope)
          : normalizeGenderScope(student.gender);

        const programme = helpers.findProgrammeForParticipant(
          programmeName,
          categoryId,
          requestedGender,
        );

        if (!programme) {
          throw new Error(
            `Programme not found for ${programmeName} / ${
              categoryName || "General"
            } / ${genderLabel(requestedGender)}.`,
          );
        }

        const teamName = text(row.team_name);
        const team = teamName
          ? helpers.teamMap.get(key(teamName)) ||
            (await helpers.getOrCreateTeam(
              teamName,
              autoCode(teamName),
              index + 1,
            ))
          : null;
        const teamId = team?.id || student.team_id || null;
        const registrationKey = `${programme.id}_${student.id}`;
        const existing = helpers.registrationMap.get(registrationKey);
        const payload = {
          organization_id: context.organizationId,
          event_id: context.eventId,
          programme_id: programme.id,
          student_id: student.id,
          team_id: teamId,
          group_name: text(row.group_name) || null,
          registration_no:
            text(row.registration_no) ||
            buildRegistrationNo(
              programme.programme_type,
              chestNo,
              programmeName,
              teamName,
            ),
          status: normalizeRegistrationStatus(row.status),
        };

        if (existing) {
          const { error } = await supabase
            .from("programme_registrations")
            .update(payload)
            .eq("id", existing.id)
            .eq("organization_id", context.organizationId)
            .eq("event_id", context.eventId);
          if (error) throw error;
          result.updated += 1;
        } else {
          const { data, error } = await supabase
            .from("programme_registrations")
            .insert(payload)
            .select("id, programme_id, student_id")
            .single();
          if (error) throw error;
          helpers.registrationMap.set(registrationKey, data);
          result.inserted += 1;
        }
      }
    } catch (rowError: any) {
      result.skipped += 1;
      result.errors.push(
        `Row ${rowNumber}: ${rowError?.message || "Import failed"}`,
      );
    }
  }

  return result;
}

async function createImportHelpers(context: AdminContext) {
  const [categoryRes, classRes, divisionRes, teamRes, studentRes, programmeRes, registrationRes] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .eq("organization_id", context.organizationId)
        .eq("event_id", context.eventId),
      supabase
        .from("classes")
        .select("id, name, category_id")
        .eq("organization_id", context.organizationId)
        .eq("event_id", context.eventId),
      supabase
        .from("class_divisions")
        .select("id, name, class_id")
        .eq("organization_id", context.organizationId)
        .eq("event_id", context.eventId),
      supabase
        .from("teams")
        .select("id, name, code")
        .eq("organization_id", context.organizationId)
        .eq("event_id", context.eventId),
      supabase
        .from("students")
        .select("id, chest_no, name, gender, team_id")
        .eq("organization_id", context.organizationId)
        .eq("event_id", context.eventId),
      supabase
        .from("programmes")
        .select(
          "id, name, category_id, programme_type, stage_type, gender_scope",
        )
        .eq("organization_id", context.organizationId)
        .eq("event_id", context.eventId),
      fetchAllRows<any>((from, to) =>
        supabase
          .from("programme_registrations")
          .select("id, programme_id, student_id")
          .eq("organization_id", context.organizationId)
          .eq("event_id", context.eventId)
          .order("id", { ascending: true })
          .range(from, to),
      )
        .then((data) => ({ data, error: null }))
        .catch((error) => ({ data: null, error })),
    ]);

  const firstError =
    categoryRes.error ||
    classRes.error ||
    divisionRes.error ||
    teamRes.error ||
    studentRes.error ||
    programmeRes.error ||
    registrationRes.error;

  if (firstError) throw firstError;

  const categoryMap = new Map<string, any>();
  const classMap = new Map<string, any>();
  const divisionMap = new Map<string, any>();
  const teamMap = new Map<string, any>();
  const studentMap = new Map<string, any>();
  const programmeMap = new Map<string, any>();
  const programmeBaseMap = new Map<string, any[]>();
  const programmeNameMap = new Map<string, any[]>();
  const registrationMap = new Map<string, any>();

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
  (studentRes.data || []).forEach((item: any) => {
    studentMap.set(key(cleanChest(item.chest_no)), item);
  });
  function storeProgramme(item: any) {
    const exactKey = programmeKey(
      item.name,
      item.category_id,
      item.gender_scope,
      item.programme_type,
      item.stage_type,
    );
    programmeMap.set(exactKey, item);

    const baseKey = programmeBaseKey(item.name, item.category_id);
    const baseItems = programmeBaseMap.get(baseKey) || [];
    const nextBaseItems = [
      ...baseItems.filter((existing) => existing.id !== item.id),
      item,
    ];
    programmeBaseMap.set(baseKey, nextBaseItems);

    const nameKey = key(item.name);
    const nameItems = programmeNameMap.get(nameKey) || [];
    const nextNameItems = [
      ...nameItems.filter((existing) => existing.id !== item.id),
      item,
    ];
    programmeNameMap.set(nameKey, nextNameItems);
  }

  (programmeRes.data || []).forEach((item: any) => {
    storeProgramme(item);
  });
  (registrationRes.data || []).forEach((item: any) => {
    registrationMap.set(`${item.programme_id}_${item.student_id}`, item);
  });

  async function getOrCreateCategory(name: string, sortOrder = 999) {
    const existing = categoryMap.get(key(name));
    if (existing) return existing;

    const { data, error } = await supabase
      .from("categories")
      .insert({
        organization_id: context.organizationId,
        event_id: context.eventId,
        name,
        sort_order: sortOrder,
      })
      .select("id, name")
      .single();
    if (error) throw error;
    categoryMap.set(key(name), data);
    return data;
  }

  async function getOrCreateClass(
    name: string,
    categoryId: string,
    sortOrder = 999,
  ) {
    const mapKey = `${categoryId}__${key(name)}`;
    const existing = classMap.get(mapKey);
    if (existing) return existing;

    const { data, error } = await supabase
      .from("classes")
      .insert({
        organization_id: context.organizationId,
        event_id: context.eventId,
        category_id: categoryId,
        name,
        sort_order: sortOrder,
      })
      .select("id, name, category_id")
      .single();
    if (error) throw error;
    classMap.set(mapKey, data);
    return data;
  }

  async function getOrCreateTeam(
    name: string,
    code = "",
    sortOrder = 999,
  ) {
    const existing = teamMap.get(key(name));
    if (existing) return existing;

    const { data, error } = await supabase
      .from("teams")
      .insert({
        organization_id: context.organizationId,
        event_id: context.eventId,
        name,
        code: code || autoCode(name),
        sort_order: sortOrder,
      })
      .select("id, name, code")
      .single();
    if (error) throw error;
    teamMap.set(key(name), data);
    return data;
  }

  function findProgrammeForParticipant(
    name: string,
    categoryId: string | null,
    genderScope: string,
  ) {
    let candidates =
      programmeBaseMap.get(programmeBaseKey(name, categoryId)) || [];

    if (candidates.length === 0 && categoryId === null) {
      candidates = programmeNameMap.get(key(name)) || [];

      const distinctCategories = new Set(
        candidates.map((item) => item.category_id || "general"),
      );

      if (distinctCategories.size > 1) {
        throw new Error(
          `Multiple categories contain programme ${name}. Fill category_name in the Participants sheet.`,
        );
      }
    }

    const activeCandidates = candidates.filter(
      (item) => key(item.status || "active") !== "inactive",
    );
    const pool = activeCandidates.length > 0 ? activeCandidates : candidates;

    const exactGender = pool.filter(
      (item) => normalizeGenderScope(item.gender_scope) === genderScope,
    );
    if (exactGender.length === 1) return exactGender[0];
    if (exactGender.length > 1) {
      throw new Error(
        `Multiple ${genderLabel(genderScope)} variants were found for ${name}. Check programme type/stage duplicates.`,
      );
    }

    const shared = pool.filter(
      (item) => normalizeGenderScope(item.gender_scope) === "all",
    );
    if (shared.length === 1) return shared[0];
    if (shared.length > 1) {
      throw new Error(
        `Multiple shared variants were found for ${name}. Check programme type/stage duplicates.`,
      );
    }

    return null;
  }

  return {
    categoryMap,
    classMap,
    divisionMap,
    teamMap,
    studentMap,
    programmeMap,
    programmeBaseMap,
    programmeNameMap,
    registrationMap,
    storeProgramme,
    findProgrammeForParticipant,
    getOrCreateCategory,
    getOrCreateClass,
    getOrCreateTeam,
  };
}

function normalizeRow(row: ImportRow) {
  const normalized: ImportRow = {};
  Object.entries(row).forEach(([header, value]) => {
    normalized[normalizeKey(header)] = value;
  });
  return normalized;
}

function normalizeKey(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function key(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isAutomaticGeneralCategory(value: unknown) {
  return key(value) === "general";
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function cleanChest(value: unknown) {
  return text(value).replace(/^#+/, "");
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(text(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeGenderScope(value: unknown) {
  const normalized = key(value);
  if (normalized.includes("female") || normalized.includes("girl")) {
    return "female";
  }
  if (normalized.includes("male") || normalized.includes("boy")) {
    return "male";
  }
  return "all";
}

function normalizeProgrammeType(value: unknown) {
  return key(value).includes("group") ? "group" : "individual";
}

function normalizeStageType(value: unknown) {
  return key(value).replace("-", "_").includes("off")
    ? "off_stage"
    : "stage";
}

function normalizeRegistrationStatus(value: unknown) {
  const normalized = key(value);

  // Programme registrations use `registered` across Participants, Reports,
  // Green Room and Results. Older templates used `active`, so accept it as
  // an alias and normalize it instead of creating invisible registrations.
  if (!normalized || normalized === "active" || normalized === "registered") {
    return "registered";
  }

  return normalized;
}

function autoCode(name: string) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
}

function programmeBaseKey(name: string, categoryId: string | null) {
  return `${key(name)}__${categoryId || "general"}`;
}

function programmeKey(
  name: string,
  categoryId: string | null,
  genderScope: unknown,
  programmeType: unknown,
  stageType: unknown,
) {
  return [
    programmeBaseKey(name, categoryId),
    normalizeGenderScope(genderScope),
    normalizeProgrammeType(programmeType),
    normalizeStageType(stageType),
  ].join("__");
}

function genderLabel(value: unknown) {
  const gender = normalizeGenderScope(value);
  if (gender === "male") return "Boys";
  if (gender === "female") return "Girls";
  return "All";
}

function buildRegistrationNo(
  programmeType: string,
  chestNo: string,
  programmeName: string,
  teamName: string,
) {
  const prefix =
    programmeType === "group" ? `GRP-${autoCode(teamName || "TEAM")}` : "REG";
  return `${prefix}-${chestNo}-${autoCode(programmeName)}`;
}

function sheetName(type: ImportType) {
  const names: Record<ImportType, string> = {
    teams: "Teams",
    categories: "Categories",
    classes: "Classes",
    divisions: "Divisions",
    students: "Students",
    programmes: "Programmes",
    participants: "Participants",
  };
  return names[type];
}