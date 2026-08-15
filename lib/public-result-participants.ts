import { fetchAllRows } from "@/lib/fetch-all-rows";

type ResultReference = {
  registration_id: string | null;
  programme_id: string | null;
};

export type PublicResultRegistration = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_id: string | null;
  student_id: string | null;
  team_id: string | null;
  group_name: string | null;
  registration_no: string | null;
  status: string;
  created_at: string;
};

export type PublicResultStudent = {
  id: string;
  chest_no: string | null;
  name: string;
  class_id: string | null;
  category_id: string | null;
  team_id: string | null;
};

const IN_FILTER_CHUNK = 120;

function unique(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function chunk<T>(values: T[], size = IN_FILTER_CHUNK) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function groupKey(registration: PublicResultRegistration) {
  return [
    registration.programme_id || "",
    registration.team_id || "",
    String(registration.group_name || "").trim().toLowerCase(),
  ].join("::");
}

async function fetchRegistrationsByIds(
  supabase: any,
  organizationId: string,
  eventId: string,
  registrationIds: string[],
) {
  if (registrationIds.length === 0) return [] as PublicResultRegistration[];

  const rows: PublicResultRegistration[] = [];

  for (const ids of chunk(registrationIds)) {
    const pageRows = await fetchAllRows<PublicResultRegistration>((from, to) =>
      supabase
        .from("programme_registrations")
        .select(
          "id, organization_id, event_id, programme_id, student_id, team_id, group_name, registration_no, status, created_at",
        )
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .in("id", ids)
        .order("created_at", { ascending: true })
        .range(from, to),
    );
    rows.push(...pageRows);
  }

  return rows;
}

async function fetchGroupCandidates(
  supabase: any,
  organizationId: string,
  eventId: string,
  programmeIds: string[],
) {
  if (programmeIds.length === 0) return [] as PublicResultRegistration[];

  const rows: PublicResultRegistration[] = [];

  for (const ids of chunk(programmeIds)) {
    const pageRows = await fetchAllRows<PublicResultRegistration>((from, to) =>
      supabase
        .from("programme_registrations")
        .select(
          "id, organization_id, event_id, programme_id, student_id, team_id, group_name, registration_no, status, created_at",
        )
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .in("programme_id", ids)
        .neq("status", "cancelled")
        .neq("status", "inactive")
        .order("created_at", { ascending: true })
        .range(from, to),
    );
    rows.push(...pageRows);
  }

  return rows;
}

async function fetchStudentsByIds(
  supabase: any,
  organizationId: string,
  eventId: string,
  studentIds: string[],
) {
  if (studentIds.length === 0) return [] as PublicResultStudent[];

  const rows: PublicResultStudent[] = [];

  for (const ids of chunk(studentIds)) {
    const pageRows = await fetchAllRows<PublicResultStudent>((from, to) =>
      supabase
        .from("students")
        .select("id, chest_no, name, class_id, category_id, team_id")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .in("id", ids)
        .order("chest_no_sort", { ascending: true })
        .range(from, to),
    );
    rows.push(...pageRows);
  }

  return rows;
}

/**
 * Loads only registration/student rows required to render published results.
 * Individual results load their exact registration. Group results additionally
 * load the members of the matching programme + team + group name.
 */
export async function loadPublicResultParticipants({
  supabase,
  organizationId,
  eventId,
  results,
  groupProgrammeIds,
}: {
  supabase: any;
  organizationId: string;
  eventId: string;
  results: ResultReference[];
  groupProgrammeIds: string[];
}) {
  const resultRegistrationIds = unique(
    results.map((result) => result.registration_id),
  );

  const resultRegistrations = await fetchRegistrationsByIds(
    supabase,
    organizationId,
    eventId,
    resultRegistrationIds,
  );

  const groupProgrammeIdSet = new Set(groupProgrammeIds);
  const resultGroupKeys = new Set(
    resultRegistrations
      .filter(
        (registration) =>
          registration.programme_id &&
          groupProgrammeIdSet.has(registration.programme_id),
      )
      .map(groupKey),
  );

  const groupCandidateProgrammeIds = unique(
    resultRegistrations
      .filter((registration) => resultGroupKeys.has(groupKey(registration)))
      .map((registration) => registration.programme_id),
  );

  const groupCandidates = await fetchGroupCandidates(
    supabase,
    organizationId,
    eventId,
    groupCandidateProgrammeIds,
  );

  const registrationMap = new Map<string, PublicResultRegistration>();
  resultRegistrations.forEach((registration) => {
    registrationMap.set(registration.id, registration);
  });
  groupCandidates.forEach((registration) => {
    if (resultGroupKeys.has(groupKey(registration))) {
      registrationMap.set(registration.id, registration);
    }
  });

  const registrations = Array.from(registrationMap.values()).sort((a, b) =>
    String(a.created_at || "").localeCompare(String(b.created_at || "")),
  );

  const studentIds = unique(
    registrations.map((registration) => registration.student_id),
  );

  const students = await fetchStudentsByIds(
    supabase,
    organizationId,
    eventId,
    studentIds,
  );

  return { registrations, students };
}
