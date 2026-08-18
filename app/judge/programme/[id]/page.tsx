/* eslint-disable */
"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Save,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type JudgeEntry = {
  registration_id: string;
  code_letter: string;
  saved_mark: number | null;
  type?: "individual" | "group";
};

type JudgeProgrammeData = {
  judge?: {
    id?: string;
    name?: string;
  };
  judge_name?: string;

  programme: {
    id: string;
    name: string;
    programme_type?: string;
    stage_type?: string;
    category_id?: string | null;
    category_name?: string | null;
    category?: {
      id?: string;
      name?: string | null;
    } | null;
    total_marks: number;
  };

  entries: JudgeEntry[];
};


function getCodeSequenceValue(codeLetter: string) {
  const normalized = String(codeLetter || "")
    .trim()
    .toUpperCase();

  if (!/^[A-Z]+$/.test(normalized)) {
    return Number.MAX_SAFE_INTEGER;
  }

  let value = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    value =
      value * 26 +
      (normalized.charCodeAt(index) - 64);
  }

  return value;
}

function compareCodeLetters(
  firstCode: string,
  secondCode: string,
) {
  const firstValue = getCodeSequenceValue(firstCode);
  const secondValue = getCodeSequenceValue(secondCode);

  if (firstValue !== secondValue) {
    return firstValue - secondValue;
  }

  return String(firstCode || "")
    .trim()
    .toUpperCase()
    .localeCompare(
      String(secondCode || "").trim().toUpperCase(),
    );
}

export default function JudgeProgrammePage() {
  const router = useRouter();
  const params = useParams();

  const programmeId = Array.isArray(params.id)
    ? params.id[0]
    : String(params.id || "");

  const [data, setData] =
    useState<JudgeProgrammeData | null>(null);

  const [values, setValues] = useState<
    Record<string, string>
  >({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (programmeId) {
      load();
    }
  }, [programmeId]);

  const entries = useMemo(() => {
    return [...(data?.entries || [])].sort(
      (first, second) =>
        compareCodeLetters(
          first.code_letter,
          second.code_letter,
        ),
    );
  }, [data]);

  const marksLocked = useMemo(() => {
    return (
      entries.length > 0 &&
      entries.every(
        (entry) =>
          entry.saved_mark !== null &&
          entry.saved_mark !== undefined,
      )
    );
  }, [entries]);

  const judgeName =
    data?.judge?.name ||
    data?.judge_name ||
    "Judge";

  const categoryName = useMemo(() => {
    const directName = String(
      data?.programme?.category_name || "",
    ).trim();

    const nestedName = String(
      data?.programme?.category?.name || "",
    ).trim();

    return directName || nestedName || null;
  }, [data]);

  const programmeType =
    data?.programme?.programme_type === "group"
      ? "Group"
      : "Individual";

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/judge/programmes/${programmeId}`,
        {
          cache: "no-store",
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (response.status === 401) {
        router.push("/judge");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "Unable to load programme.",
        );
      }

      const loadedData =
        payload as JudgeProgrammeData;

      setData(loadedData);

      const nextValues: Record<string, string> =
        {};

      (loadedData.entries || []).forEach(
        (entry) => {
          nextValues[entry.registration_id] =
            entry.saved_mark === null ||
            entry.saved_mark === undefined
              ? ""
              : String(entry.saved_mark);
        },
      );

      setValues(nextValues);
    } catch (loadError: any) {
      setError(
        loadError?.message ||
          "Unable to load programme.",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateMark(
    registrationId: string,
    value: string,
  ) {
    if (marksLocked) {
      return;
    }

    setValues((current) => ({
      ...current,
      [registrationId]: value,
    }));

    if (error) {
      setError("");
    }

    if (message) {
      setMessage("");
    }
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!data?.programme) {
      setError("Programme information not found.");
      return;
    }

    if (marksLocked) {
      setError(
        "Marks are already submitted and locked. They cannot be edited by the judge.",
      );
      return;
    }

    if (entries.length === 0) {
      setError(
        "No present participant codes are available.",
      );
      return;
    }

    const scoreRows: Array<{
      registration_id: string;
      mark: number;
    }> = [];

    for (const entry of entries) {
      const rawValue = String(
        values[entry.registration_id] ?? "",
      ).trim();

      // A blank mark is intentionally treated as zero. This lets a judge
      // submit the whole programme even when one or more participants receive
      // no mark, without forcing the judge to type 0 into every empty field.
      const mark = rawValue === "" ? 0 : Number(rawValue);

      if (
        !Number.isFinite(mark) ||
        mark < 0 ||
        mark > data.programme.total_marks
      ) {
        setError(
          `Every mark must be between 0 and ${data.programme.total_marks}. Blank fields are saved as 0.`,
        );
        return;
      }

      scoreRows.push({
        registration_id: entry.registration_id,
        mark,
      });
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/judge/marks",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            programmeId,
            scores: scoreRows,
          }),
        },
      );

      const payload = await response
        .json()
        .catch(() => ({}));

      if (response.status === 401) {
        router.push("/judge");
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "Unable to submit marks.",
        );
      }

      setMessage(
        payload.calculation?.status ===
          "completed"
          ? "Marks submitted successfully. All judges have completed this programme and the result is ready for admin review."
          : "Your marks were saved successfully. Waiting for the remaining judges.",
      );

      await load();
    } catch (submitError: any) {
      setError(
        submitError?.message ||
          "Unable to submit marks.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-2xl">
          <Loader2
            className="mx-auto animate-spin text-violet-700"
            size={34}
          />

          <p className="mt-4 text-sm font-black text-slate-600">
            Loading mark sheet...
          </p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-xl rounded-[2rem] border border-red-200 bg-white p-7 text-center shadow-xl shadow-slate-900/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldCheck size={25} />
          </div>

          <h1 className="mt-4 text-2xl font-black text-slate-950">
            Unable to open programme
          </h1>

          <p className="mt-2 text-sm font-bold leading-6 text-red-700">
            {error || "Programme not found."}
          </p>

          <Link
            href="/judge"
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white"
          >
            <ArrowLeft size={16} />
            Back to Programmes
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc]">
      <style jsx global>{`
        .judge-mark-input::-webkit-inner-spin-button,
        .judge-mark-input::-webkit-outer-spin-button {
          margin: 0;
        }

        .judge-mark-input {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-700 sm:text-xs">
              Judge Mark Entry
            </p>

            <h1 className="mt-0.5 truncate text-xl font-black tracking-[-0.04em] text-slate-950">
              {data.programme.name}
            </h1>

            <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
              {judgeName}
            </p>
          </div>

          <Link
            href="/judge"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-8">
        {/* Error */}
        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {/* Success message */}
        {message && (
          <div className="mb-5 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            <CheckCircle2
              size={18}
              className="mt-0.5 shrink-0"
            />

            <span>{message}</span>
          </div>
        )}

        {/* Programme information */}
        <div className="rounded-[2rem] bg-gradient-to-br from-violet-700 via-violet-900 to-slate-950 p-6 text-white shadow-2xl shadow-violet-900/20 sm:p-7">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
            <ShieldCheck size={28} />
          </div>

          <h2 className="mt-5 text-3xl font-black tracking-[-0.06em] sm:text-4xl">
            {data.programme.name}
          </h2>

          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold leading-6 text-white/70">
            {categoryName && (
              <>
                <span>{categoryName}</span>
                <span aria-hidden="true">•</span>
              </>
            )}

            <span>{programmeType}</span>
            <span aria-hidden="true">•</span>
            <span>
              Maximum mark: {data.programme.total_marks}
            </span>
          </p>
        </div>

        {marksLocked && (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold leading-6 text-emerald-700">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-black">
                Marks submitted and locked
              </p>

              <p className="mt-1">
                You can view the submitted marks, but the
                judge cannot edit or submit them again.
                Contact the administrator when a correction
                is required.
              </p>
            </div>
          </div>
        )}

        {/* Mark form */}
        <form
          onSubmit={submit}
          className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5"
        >
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                Participants
              </h3>

              <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                Enter marks using code letters only.
                Student name, chest number, class and team
                are hidden. Any mark left blank will be saved as 0.
              </p>
            </div>

            <button
              type="submit"
              disabled={
                saving ||
                entries.length === 0 ||
                marksLocked
              }
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 text-sm font-black text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2
                  className="animate-spin"
                  size={18}
                />
              ) : (
                <Save size={18} />
              )}

              {saving
                ? "Saving..."
                : marksLocked
                  ? "Marks Locked"
                  : "Save Marks"}
            </button>
          </div>

          {entries.length > 0 && !marksLocked && (
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-xs font-black text-amber-800">
              Blank mark fields are automatically submitted as 0 marks.
            </div>
          )}

          {entries.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
                <Trophy size={29} />
              </div>

              <h3 className="mt-4 text-2xl font-black tracking-[-0.05em] text-slate-950">
                No participants
              </h3>

              <p className="mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
                No present Green Room codes are
                available. Ask the admin to generate
                codes and mark participants as present.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.map((entry) => {
                const code =
                  entry.code_letter || "?";

                const entryType =
                  entry.type === "group" ||
                  data.programme.programme_type ===
                    "group"
                    ? "Group Entry"
                    : "Individual Entry";

                return (
                  <div
                    key={entry.registration_id}
                    className="grid gap-5 px-5 py-5 transition-colors hover:bg-slate-50/70 md:grid-cols-[1fr_160px] md:items-center"
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-xl font-black text-violet-700">
                        {code}
                      </div>

                      <div className="min-w-0">
                        <p className="text-lg font-black text-slate-950">
                          Code {code}
                        </p>

                        <p className="mt-1 text-sm font-bold leading-5 text-slate-500">
                          Participant identity hidden for
                          fair judgement.
                        </p>

                        <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                          {entryType}
                        </span>
                      </div>
                    </div>

                    <label className="block">
                      <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                        Mark for Code {code}
                      </span>

                      <input
                        type="number"
                        min="0"
                        max={
                          data.programme.total_marks
                        }
                        step="0.01"
                        inputMode="decimal"
                        value={
                          values[
                            entry.registration_id
                          ] || ""
                        }
                        onChange={(event) =>
                          updateMark(
                            entry.registration_id,
                            event.target.value,
                          )
                        }
                        disabled={marksLocked}
                        readOnly={marksLocked}
                        placeholder="0"
                        className={`judge-mark-input mt-2 h-14 w-full rounded-2xl border px-4 text-lg font-black outline-none transition ${
                          marksLocked
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-600"
                            : "border-slate-200 bg-white text-slate-950 placeholder:text-slate-300 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        }`}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          )}

          {entries.length > 0 && !marksLocked && (
            <div className="border-t border-slate-200 bg-slate-50/70 p-4 sm:hidden">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-sm font-black text-white shadow-lg shadow-violet-900/20 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2
                    className="animate-spin"
                    size={18}
                  />
                ) : (
                  <Save size={18} />
                )}

                {saving
                  ? "Saving Marks..."
                  : "Save Marks"}
              </button>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}