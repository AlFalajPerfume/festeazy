/* eslint-disable */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type GreenRoomAction =
  | "generate_all"
  | "generate_one"
  | "presence"
  | "reset";

type RequestBody = {
  action?: GreenRoomAction;
  programmeId?: string;
  registrationId?: string;
  isPresent?: boolean;
};

type ProgrammeRow = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_type: string | null;
  status: string | null;
};

type RegistrationRow = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_id: string | null;
  student_id: string | null;
  team_id: string | null;
  group_name: string | null;
  status: string | null;
};

type ProgrammeCodeRow = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_id: string;
  registration_id: string;
  code_letter: string;
  is_present: boolean;
  reset_count: number | null;
};

type GreenRoomEntry = {
  key: string;
  primaryRegistrationId: string;
  registrationIds: string[];
};

function getServerClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return {
    authClient: createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
    adminClient: createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
  };
}

type AdminClient = ReturnType<typeof getServerClients>["adminClient"];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  return authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
}

/**
 * Creates Excel-style letter codes:
 * 1 = A, 2 = B, ... 26 = Z, 27 = AA, 28 = AB.
 */
function numberToCode(index: number) {
  let number = index;
  let code = "";

  while (number > 0) {
    number -= 1;
    code = String.fromCharCode(65 + (number % 26)) + code;
    number = Math.floor(number / 26);
  }

  return code;
}

function buildAllowedCodes(totalEntries: number) {
  return Array.from(
    { length: Math.max(0, totalEntries) },
    (_, index) => numberToCode(index + 1),
  );
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function normalizeGroupValue(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function buildEntries(
  programme: ProgrammeRow,
  registrations: RegistrationRow[],
): GreenRoomEntry[] {
  const activeRegistrations = registrations
    .filter(
      (registration) =>
        registration.programme_id === programme.id &&
        registration.status !== "cancelled" &&
        registration.status !== "inactive",
    )
    .sort((a, b) => a.id.localeCompare(b.id));

  if (String(programme.programme_type || "").toLowerCase() !== "group") {
    return activeRegistrations.map((registration) => ({
      key: registration.id,
      primaryRegistrationId: registration.id,
      registrationIds: [registration.id],
    }));
  }

  const grouped = new Map<string, GreenRoomEntry>();

  for (const registration of activeRegistrations) {
    const key = [
      registration.team_id || "no-team",
      normalizeGroupValue(registration.group_name) || "group",
    ].join("::");

    const current = grouped.get(key);

    if (current) {
      current.registrationIds.push(registration.id);
      current.registrationIds.sort((a, b) => a.localeCompare(b));
      current.primaryRegistrationId = current.registrationIds[0];
      continue;
    }

    grouped.set(key, {
      key,
      primaryRegistrationId: registration.id,
      registrationIds: [registration.id],
    });
  }

  return Array.from(grouped.values());
}

async function authenticateAdmin(request: NextRequest) {
  const accessToken = getAccessToken(request);

  if (!accessToken) {
    throw new Response(
      JSON.stringify({ error: "Admin authentication is required." }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { authClient, adminClient } = getServerClients();

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Response(
      JSON.stringify({ error: "Your login session is invalid or expired." }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { data: organizationUser, error: organizationUserError } =
    await adminClient
      .from("organization_users")
      .select("organization_id, role, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

  if (organizationUserError) {
    throw new Error(organizationUserError.message);
  }

  if (!organizationUser) {
    throw new Response(
      JSON.stringify({
        error: "This login is not connected to an active organization.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const allowedRoles = new Set([
    "admin",
    "owner",
    "manager",
    "super_admin",
    "madrasa_admin",
    "green_room_operator",
  ]);

  if (!allowedRoles.has(String(organizationUser.role || "").toLowerCase())) {
    throw new Response(
      JSON.stringify({
        error: "You do not have permission to manage Green Room codes.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return {
    user,
    adminClient,
    organizationId: String(organizationUser.organization_id),
  };
}

async function loadProgrammeWorkspace(
  adminClient: AdminClient,
  organizationId: string,
  programmeId: string,
) {
  const { data: programmeData, error: programmeError } = await adminClient
    .from("programmes")
    .select("id, organization_id, event_id, programme_type, status")
    .eq("id", programmeId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (programmeError) {
    throw new Error(programmeError.message);
  }

  if (!programmeData) {
    throw new Response(
      JSON.stringify({ error: "Programme not found for this organization." }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const programme = programmeData as ProgrammeRow;

  if (programme.status === "inactive") {
    throw new Response(
      JSON.stringify({ error: "This programme is inactive." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const [registrationResult, codeResult] = await Promise.all([
    adminClient
      .from("programme_registrations")
      .select(
        "id, organization_id, event_id, programme_id, student_id, team_id, group_name, status",
      )
      .eq("organization_id", organizationId)
      .eq("event_id", programme.event_id)
      .eq("programme_id", programme.id)
      .order("id", { ascending: true }),

    adminClient
      .from("programme_codes")
      .select(
        "id, organization_id, event_id, programme_id, registration_id, code_letter, is_present, reset_count",
      )
      .eq("organization_id", organizationId)
      .eq("event_id", programme.event_id)
      .eq("programme_id", programme.id)
      .order("id", { ascending: true }),
  ]);

  if (registrationResult.error) {
    throw new Error(registrationResult.error.message);
  }

  if (codeResult.error) {
    throw new Error(codeResult.error.message);
  }

  const registrations =
    (registrationResult.data || []) as RegistrationRow[];
  const codes = (codeResult.data || []) as ProgrammeCodeRow[];
  const entries = buildEntries(programme, registrations);

  return {
    programme,
    registrations,
    codes,
    entries,
  };
}

function findEntryByRegistration(
  entries: GreenRoomEntry[],
  registrationId: string,
) {
  return (
    entries.find(
      (entry) =>
        entry.primaryRegistrationId === registrationId ||
        entry.registrationIds.includes(registrationId),
    ) || null
  );
}

function normalizeCodeLetter(value: string | null | undefined) {
  return String(value || "").trim().toUpperCase();
}

function getCodesForEntry(codes: ProgrammeCodeRow[], entry: GreenRoomEntry) {
  return codes.filter((code) => entry.registrationIds.includes(code.registration_id));
}

function getCodeIntegrityIssues(
  entries: GreenRoomEntry[],
  codes: ProgrammeCodeRow[],
) {
  const codeLetterMap = new Map<string, ProgrammeCodeRow[]>();
  const registrationMap = new Map<string, ProgrammeCodeRow[]>();

  for (const code of codes) {
    const letter = normalizeCodeLetter(code.code_letter);
    if (letter) {
      const rows = codeLetterMap.get(letter) || [];
      rows.push(code);
      codeLetterMap.set(letter, rows);
    }

    const rows = registrationMap.get(code.registration_id) || [];
    rows.push(code);
    registrationMap.set(code.registration_id, rows);
  }

  const duplicateLetters = Array.from(codeLetterMap.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([letter]) => letter);

  const duplicateRegistrations = Array.from(registrationMap.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([registrationId]) => registrationId);

  const entriesWithMultipleCodes = entries
    .filter((entry) => getCodesForEntry(codes, entry).length > 1)
    .map((entry) => entry.key);

  return {
    duplicateLetters,
    duplicateRegistrations,
    entriesWithMultipleCodes,
  };
}

function assertCodeIntegrityForGeneration(
  entries: GreenRoomEntry[],
  codes: ProgrammeCodeRow[],
) {
  const issues = getCodeIntegrityIssues(entries, codes);

  if (
    issues.duplicateLetters.length === 0 &&
    issues.duplicateRegistrations.length === 0 &&
    issues.entriesWithMultipleCodes.length === 0
  ) {
    return;
  }

  const details: string[] = [];
  if (issues.duplicateLetters.length > 0) {
    details.push(`duplicate code letters: ${issues.duplicateLetters.join(", ")}`);
  }
  if (issues.duplicateRegistrations.length > 0) {
    details.push(`${issues.duplicateRegistrations.length} registration(s) with multiple code rows`);
  }
  if (issues.entriesWithMultipleCodes.length > 0) {
    details.push(`${issues.entriesWithMultipleCodes.length} participant/group entry(s) with multiple codes`);
  }

  throw new Response(
    JSON.stringify({
      error: `Green Room code data contains ${details.join("; ")}. Reset the affected code(s) before generating new ones.`,
    }),
    {
      status: 409,
      headers: { "Content-Type": "application/json" },
    },
  );
}

async function ensureNotLocked(
  adminClient: AdminClient,
  programme: ProgrammeRow,
  entry: GreenRoomEntry,
) {
  const [scoreResult, resultResult] = await Promise.all([
    adminClient
      .from("judge_scores")
      .select("id")
      .eq("organization_id", programme.organization_id)
      .eq("event_id", programme.event_id)
      .eq("programme_id", programme.id)
      .in("registration_id", entry.registrationIds)
      .limit(1),

    adminClient
      .from("results")
      .select("id, grade, is_published")
      .eq("organization_id", programme.organization_id)
      .eq("event_id", programme.event_id)
      .eq("programme_id", programme.id)
      .in("registration_id", entry.registrationIds)
      .limit(20),
  ]);

  if (scoreResult.error) {
    throw new Error(scoreResult.error.message);
  }

  if (resultResult.error) {
    throw new Error(resultResult.error.message);
  }

  const hasJudgeScores = (scoreResult.data || []).length > 0;
  const hasLockedResult = (resultResult.data || []).some(
    (result: any) =>
      Boolean(result.is_published) ||
      (result.grade != null && String(result.grade) !== "Absent"),
  );

  if (hasJudgeScores || hasLockedResult) {
    throw new Response(
      JSON.stringify({
        error:
          "This code is locked because judge marks or result data already exist.",
      }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function generateAll(
  adminClient: AdminClient,
  userId: string,
  workspace: Awaited<ReturnType<typeof loadProgrammeWorkspace>>,
) {
  const { programme, entries, codes } = workspace;

  assertCodeIntegrityForGeneration(entries, codes);

  if (entries.length === 0) {
    return {
      generated_count: 0,
      total_entries: 0,
      allowed_codes: [],
    };
  }

  const allowedCodes = buildAllowedCodes(entries.length);
  const usedCodes = new Set(
    codes
      .map((code) => String(code.code_letter || "").trim().toUpperCase())
      .filter(Boolean),
  );

  const entriesWithoutCodes = entries.filter(
    (entry) => getCodesForEntry(codes, entry).length === 0,
  );

  const availableCodes = shuffle(
    allowedCodes.filter((code) => !usedCodes.has(code)),
  );

  if (availableCodes.length < entriesWithoutCodes.length) {
    throw new Response(
      JSON.stringify({
        error:
          "There are not enough unused codes in the permitted participant range. Reset the incorrect old codes and try again.",
      }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const rows = entriesWithoutCodes.map((entry, index) => ({
    organization_id: programme.organization_id,
    event_id: programme.event_id,
    programme_id: programme.id,
    registration_id: entry.primaryRegistrationId,
    code_letter: availableCodes[index],
    is_present: true,
    generated_at: new Date().toISOString(),
    generated_by: userId,
    reset_count: 0,
    notes: null,
  }));

  if (rows.length > 0) {
    const { data: insertedRows, error: insertError } = await adminClient
      .from("programme_codes")
      .insert(rows)
      .select("id");

    if (insertError) {
      throw new Error(insertError.message);
    }

    const { data: currentCodeRows, error: verifyError } = await adminClient
      .from("programme_codes")
      .select(
        "id, organization_id, event_id, programme_id, registration_id, code_letter, is_present, reset_count",
      )
      .eq("organization_id", programme.organization_id)
      .eq("event_id", programme.event_id)
      .eq("programme_id", programme.id);

    if (verifyError) {
      throw new Error(verifyError.message);
    }

    const integrity = getCodeIntegrityIssues(
      entries,
      (currentCodeRows || []) as ProgrammeCodeRow[],
    );

    if (
      integrity.duplicateLetters.length > 0 ||
      integrity.duplicateRegistrations.length > 0 ||
      integrity.entriesWithMultipleCodes.length > 0
    ) {
      const insertedIds = (insertedRows || []).map((item: any) => String(item.id));
      if (insertedIds.length > 0) {
        await adminClient.from("programme_codes").delete().in("id", insertedIds);
      }

      throw new Response(
        JSON.stringify({
          error:
            "A concurrent code generation conflict was detected. No new duplicate codes were kept; refresh and try again.",
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  return {
    generated_count: rows.length,
    total_entries: entries.length,
    allowed_codes: allowedCodes,
  };
}

async function generateOne(
  adminClient: AdminClient,
  userId: string,
  workspace: Awaited<ReturnType<typeof loadProgrammeWorkspace>>,
  registrationId: string,
) {
  const { programme, entries, codes } = workspace;

  assertCodeIntegrityForGeneration(entries, codes);

  const entry = findEntryByRegistration(entries, registrationId);

  if (!entry) {
    throw new Response(
      JSON.stringify({
        error: "Registration was not found in this programme.",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const existingCode = getCodesForEntry(codes, entry)[0] || null;

  if (existingCode) {
    return {
      ...existingCode,
      already_exists: true,
    };
  }

  const allowedCodes = buildAllowedCodes(entries.length);
  const usedCodes = new Set(
    codes
      .map((code) => String(code.code_letter || "").trim().toUpperCase())
      .filter(Boolean),
  );
  const availableCodes = allowedCodes.filter(
    (code) => !usedCodes.has(code),
  );

  if (availableCodes.length === 0) {
    throw new Response(
      JSON.stringify({
        error:
          "No unused code is available inside this programme's participant range.",
      }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const codeLetter =
    availableCodes[Math.floor(Math.random() * availableCodes.length)];

  const { data, error: insertError } = await adminClient
    .from("programme_codes")
    .insert({
      organization_id: programme.organization_id,
      event_id: programme.event_id,
      programme_id: programme.id,
      registration_id: entry.primaryRegistrationId,
      code_letter: codeLetter,
      is_present: true,
      generated_at: new Date().toISOString(),
      generated_by: userId,
      reset_count: 0,
      notes: null,
    })
    .select(
      "id, organization_id, event_id, programme_id, registration_id, code_letter, is_present, generated_at, generated_by, reset_count, notes",
    )
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { data: currentCodeRows, error: verifyError } = await adminClient
    .from("programme_codes")
    .select(
      "id, organization_id, event_id, programme_id, registration_id, code_letter, is_present, reset_count",
    )
    .eq("organization_id", programme.organization_id)
    .eq("event_id", programme.event_id)
    .eq("programme_id", programme.id);

  if (verifyError) {
    throw new Error(verifyError.message);
  }

  const integrity = getCodeIntegrityIssues(
    entries,
    (currentCodeRows || []) as ProgrammeCodeRow[],
  );

  if (
    integrity.duplicateLetters.length > 0 ||
    integrity.duplicateRegistrations.length > 0 ||
    integrity.entriesWithMultipleCodes.length > 0
  ) {
    await adminClient.from("programme_codes").delete().eq("id", data.id);

    throw new Response(
      JSON.stringify({
        error:
          "A concurrent code generation conflict was detected. The duplicate row was removed; refresh and try again.",
      }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return data;
}

async function updatePresence(
  adminClient: AdminClient,
  workspace: Awaited<ReturnType<typeof loadProgrammeWorkspace>>,
  registrationId: string,
  isPresent: boolean,
) {
  const { entries, codes } = workspace;
  const entry = findEntryByRegistration(entries, registrationId);

  if (!entry) {
    throw new Response(
      JSON.stringify({
        error: "Registration was not found in this programme.",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  await ensureNotLocked(adminClient, workspace.programme, entry);

  const entryCodes = getCodesForEntry(codes, entry);

  if (entryCodes.length > 1) {
    throw new Response(
      JSON.stringify({
        error:
          "This participant/group has multiple Green Room code rows. Reset the code first to clean the duplicate data.",
      }),
      {
        status: 409,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const code = entryCodes[0] || null;

  if (!code) {
    throw new Response(
      JSON.stringify({
        error: "Generate a code before updating attendance.",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const { data, error: updateError } = await adminClient
    .from("programme_codes")
    .update({ is_present: isPresent })
    .eq("id", code.id)
    .select(
      "id, organization_id, event_id, programme_id, registration_id, code_letter, is_present",
    )
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  return data;
}

async function resetCode(
  adminClient: AdminClient,
  workspace: Awaited<ReturnType<typeof loadProgrammeWorkspace>>,
  registrationId: string,
) {
  const { entries, codes } = workspace;
  const entry = findEntryByRegistration(entries, registrationId);

  if (!entry) {
    throw new Response(
      JSON.stringify({
        error: "Registration was not found in this programme.",
      }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  await ensureNotLocked(adminClient, workspace.programme, entry);

  const entryCodes = getCodesForEntry(codes, entry);

  if (entryCodes.length === 0) {
    return {
      reset: false,
      message: "No code exists for this participant.",
    };
  }

  const { error: deleteError } = await adminClient
    .from("programme_codes")
    .delete()
    .in(
      "id",
      entryCodes.map((code) => code.id),
    );

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  return {
    reset: true,
    previous_code: entryCodes.map((code) => code.code_letter).join(", "),
    deleted_count: entryCodes.length,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as RequestBody;
    const action = body.action;
    const programmeId = String(body.programmeId || "").trim();

    if (
      !action ||
      !["generate_all", "generate_one", "presence", "reset"].includes(action)
    ) {
      return jsonError("A valid Green Room action is required.");
    }

    if (!programmeId) {
      return jsonError("Programme ID is required.");
    }

    const { user, adminClient, organizationId } =
      await authenticateAdmin(request);

    const workspace = await loadProgrammeWorkspace(
      adminClient,
      organizationId,
      programmeId,
    );

    let result: unknown;

    if (action === "generate_all") {
      result = await generateAll(adminClient, user.id, workspace);
    } else {
      const registrationId = String(body.registrationId || "").trim();

      if (!registrationId) {
        return jsonError("Registration ID is required.");
      }

      if (action === "generate_one") {
        result = await generateOne(
          adminClient,
          user.id,
          workspace,
          registrationId,
        );
      } else if (action === "presence") {
        if (typeof body.isPresent !== "boolean") {
          return jsonError("isPresent must be true or false.");
        }

        result = await updatePresence(
          adminClient,
          workspace,
          registrationId,
          body.isPresent,
        );
      } else {
        result = await resetCode(
          adminClient,
          workspace,
          registrationId,
        );
      }
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }

    console.error("Green Room API error:", error);

    return NextResponse.json(
      {
        error:
          error?.message || "Green Room operation failed unexpectedly.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "FestEazy Green Room API is working.",
  });
}