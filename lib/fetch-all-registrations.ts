import type { SupabaseClient } from "@supabase/supabase-js";

export type ProgrammeRegistration = {
  id: string;
  organization_id: string;
  event_id: string;
  programme_id: string;
  student_id: string | null;
  team_id: string | null;
  group_name: string | null;
  registration_no: string | null;
  status: string;
  created_at: string;
};

type FetchAllRegistrationsParams = {
  supabase: SupabaseClient;
  organizationId: string;
  eventId: string;
  programmeId?: string;
};

export async function fetchAllRegistrations({
  supabase,
  organizationId,
  eventId,
  programmeId,
}: FetchAllRegistrationsParams): Promise<ProgrammeRegistration[]> {
  const pageSize = 1000;
  const allRows: ProgrammeRegistration[] = [];

  let from = 0;

  while (true) {
    let query = supabase
      .from("programme_registrations")
      .select(`
        id,
        organization_id,
        event_id,
        programme_id,
        student_id,
        team_id,
        group_name,
        registration_no,
        status,
        created_at
      `)
      .eq("organization_id", organizationId)
      .eq("event_id", eventId)
      .eq("status", "registered")
      .order("created_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (programmeId) {
      query = query.eq("programme_id", programmeId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as ProgrammeRegistration[];

    allRows.push(...rows);

    if (rows.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return allRows;
}