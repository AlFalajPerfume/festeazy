/* eslint-disable */
import {
  apiError,
  authorizeInstitutionAdmin,
} from "@/lib/admin-api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

type ParticipationRuleRow = {
  limits_enabled: boolean;
  max_individual_programmes: number | null;
  max_group_programmes: number | null;
  max_total_programmes: number | null;
  max_stage_programmes: number | null;
  max_off_stage_programmes: number | null;
  max_male_programmes: number | null;
  max_female_programmes: number | null;
};

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeInstitutionAdmin(request);
    if (authorization.response) return authorization.response;

    const body = await request.json();
    const programmeId = String(body?.programmeId || "").trim();
    const teamId = body?.teamId ? String(body.teamId) : null;
    const groupName = body?.groupName ? String(body.groupName).trim() : null;
    const studentIds: string[] = Array.isArray(body?.studentIds)
      ? Array.from(
          new Set<string>(
            body.studentIds.map((value: unknown) => String(value)),
          ),
        )
      : [];

    if (!programmeId) return apiError("Programme ID is required.");
    if (studentIds.length === 0) return apiError("Select at least one student.");

    const organizationId = authorization.admin.organizationId;
    const eventId = authorization.admin.eventId;

    const [{ data: programme, error: programmeError }, { data: ruleData, error: ruleError }] =
      await Promise.all([
        supabaseAdmin
          .from("programmes")
          .select("id, name, programme_type, stage_type, category_id, gender_scope, status")
          .eq("id", programmeId)
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .single(),

        supabaseAdmin
          .from("event_participation_rules")
          .select(
            "limits_enabled, max_individual_programmes, max_group_programmes, max_total_programmes, max_stage_programmes, max_off_stage_programmes, max_male_programmes, max_female_programmes",
          )
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .maybeSingle(),
      ]);

    if (programmeError || !programme) {
      return apiError(programmeError?.message || "Programme was not found.", 404);
    }

    if (ruleError) return apiError(ruleError.message, 409);

    const rules = (ruleData || {
      limits_enabled: false,
      max_individual_programmes: null,
      max_group_programmes: null,
      max_total_programmes: null,
      max_stage_programmes: null,
      max_off_stage_programmes: null,
      max_male_programmes: null,
      max_female_programmes: null,
    }) as ParticipationRuleRow;

    // General programmes are excluded from all participation limits.
    if (rules.limits_enabled && programme.category_id) {
      const { data: selectedStudents, error: selectedStudentsError } =
        await supabaseAdmin
          .from("students")
          .select("id, name, chest_no, gender")
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .in("id", studentIds);

      if (selectedStudentsError) {
        return apiError(selectedStudentsError.message, 409);
      }

      const selectedStudentById = new Map(
        (selectedStudents || []).map((student) => [student.id, student]),
      );

      const { data: existingRegistrations, error: registrationError } =
        await supabaseAdmin
          .from("programme_registrations")
          .select("student_id, programme_id")
          .eq("organization_id", organizationId)
          .eq("event_id", eventId)
          .eq("status", "registered")
          .in("student_id", studentIds);

      if (registrationError) return apiError(registrationError.message, 409);

      const programmeIds = Array.from(
        new Set(
          (existingRegistrations || [])
            .map((row) => row.programme_id)
            .filter(Boolean),
        ),
      );

      const programmeDetailsById = new Map<
        string,
        {
          type: "individual" | "group";
          stageType: "stage" | "off_stage";
          isGeneral: boolean;
        }
      >();

      if (programmeIds.length > 0) {
        const { data: programmeTypes, error: programmeTypesError } =
          await supabaseAdmin
            .from("programmes")
            .select("id, programme_type, stage_type, category_id")
            .eq("organization_id", organizationId)
            .eq("event_id", eventId)
            .in("id", programmeIds);

        if (programmeTypesError) {
          return apiError(programmeTypesError.message, 409);
        }

        (programmeTypes || []).forEach((item) => {
          programmeDetailsById.set(item.id, {
            type:
              item.programme_type === "group" ? "group" : "individual",
            stageType:
              item.stage_type === "off_stage" ? "off_stage" : "stage",
            isGeneral: !item.category_id,
          });
        });
      }

      const usageByStudent = new Map<
        string,
        {
          individual: number;
          group: number;
          stage: number;
          offStage: number;
          total: number;
        }
      >();
      const countedStudentProgrammes = new Set<string>();

      (existingRegistrations || []).forEach((registration) => {
        if (!registration.student_id || !registration.programme_id) return;

        const uniqueKey = `${registration.student_id}:${registration.programme_id}`;
        if (countedStudentProgrammes.has(uniqueKey)) return;
        countedStudentProgrammes.add(uniqueKey);

        const current = usageByStudent.get(registration.student_id) || {
          individual: 0,
          group: 0,
          stage: 0,
          offStage: 0,
          total: 0,
        };

        const programmeDetails = programmeDetailsById.get(
          registration.programme_id,
        );

        // Existing General registrations do not count toward limits.
        if (!programmeDetails || programmeDetails.isGeneral) return;

        if (programmeDetails.type === "group") {
          current.group += 1;
        } else {
          current.individual += 1;
        }

        if (programmeDetails.stageType === "off_stage") {
          current.offStage += 1;
        } else {
          current.stage += 1;
        }

        current.total += 1;
        usageByStudent.set(registration.student_id, current);
      });

      const currentProgrammeType =
        programme.programme_type === "group" ? "group" : "individual";
      const currentStageType =
        programme.stage_type === "off_stage" ? "off_stage" : "stage";

      const normalizeGender = (value: unknown) => {
        const normalized = String(value || "").trim().toLowerCase();

        if (normalized.includes("female") || normalized.includes("girl")) {
          return "female";
        }

        if (normalized.includes("male") || normalized.includes("boy")) {
          return "male";
        }

        return normalized;
      };

      const violation = studentIds.find((studentId) => {
        const current = usageByStudent.get(studentId) || {
          individual: 0,
          group: 0,
          stage: 0,
          offStage: 0,
          total: 0,
        };

        const nextIndividual =
          current.individual + (currentProgrammeType === "individual" ? 1 : 0);
        const nextGroup =
          current.group + (currentProgrammeType === "group" ? 1 : 0);
        const nextStage =
          current.stage + (currentStageType === "stage" ? 1 : 0);
        const nextOffStage =
          current.offStage + (currentStageType === "off_stage" ? 1 : 0);
        const nextTotal = current.total + 1;
        const studentGender = normalizeGender(
          selectedStudentById.get(studentId)?.gender,
        );
        const genderLimit =
          studentGender === "female"
            ? rules.max_female_programmes
            : studentGender === "male"
              ? rules.max_male_programmes
              : null;

        return (
          (rules.max_individual_programmes !== null &&
            nextIndividual > rules.max_individual_programmes) ||
          (rules.max_group_programmes !== null &&
            nextGroup > rules.max_group_programmes) ||
          (rules.max_total_programmes !== null &&
            nextTotal > rules.max_total_programmes) ||
          (rules.max_stage_programmes !== null &&
            nextStage > rules.max_stage_programmes) ||
          (rules.max_off_stage_programmes !== null &&
            nextOffStage > rules.max_off_stage_programmes) ||
          (genderLimit !== null && nextTotal > genderLimit)
        );
      });

      if (violation) {
        const current = usageByStudent.get(violation) || {
          individual: 0,
          group: 0,
          stage: 0,
          offStage: 0,
          total: 0,
        };

        const student = selectedStudentById.get(violation) || null;

        const studentLabel = student
          ? `#${String(student.chest_no || "").replace("#", "")} ${student.name}`
          : "Selected student";

        if (
          currentProgrammeType === "individual" &&
          rules.max_individual_programmes !== null &&
          current.individual + 1 > rules.max_individual_programmes
        ) {
          return apiError(
            `${studentLabel} has reached the individual programme limit (${current.individual}/${rules.max_individual_programmes}).`,
            409,
          );
        }

        if (
          currentProgrammeType === "group" &&
          rules.max_group_programmes !== null &&
          current.group + 1 > rules.max_group_programmes
        ) {
          return apiError(
            `${studentLabel} has reached the group programme limit (${current.group}/${rules.max_group_programmes}).`,
            409,
          );
        }

        if (
          currentStageType === "stage" &&
          rules.max_stage_programmes !== null &&
          current.stage + 1 > rules.max_stage_programmes
        ) {
          return apiError(
            `${studentLabel} has reached the Stage programme limit (${current.stage}/${rules.max_stage_programmes}).`,
            409,
          );
        }

        if (
          currentStageType === "off_stage" &&
          rules.max_off_stage_programmes !== null &&
          current.offStage + 1 > rules.max_off_stage_programmes
        ) {
          return apiError(
            `${studentLabel} has reached the Off-Stage programme limit (${current.offStage}/${rules.max_off_stage_programmes}).`,
            409,
          );
        }

        const studentGender = normalizeGender(student?.gender);
        const genderLimit =
          studentGender === "female"
            ? rules.max_female_programmes
            : studentGender === "male"
              ? rules.max_male_programmes
              : null;

        if (genderLimit !== null && current.total + 1 > genderLimit) {
          return apiError(
            `${studentLabel} has reached the ${
              studentGender === "female" ? "girls" : "boys"
            } overall programme limit (${current.total}/${genderLimit}).`,
            409,
          );
        }

        return apiError(
          `${studentLabel} has reached the total programme limit (${current.total}/${rules.max_total_programmes}).`,
          409,
        );
      }
    }

    const { data, error } = await supabaseAdmin.rpc(
      "register_programme_entries",
      {
        target_organization_id: organizationId,
        target_event_id: eventId,
        target_programme_id: programmeId,
        target_team_id: teamId,
        target_group_name: groupName,
        target_student_ids: studentIds,
      },
    );

    if (error) return apiError(error.message, 409);

    return NextResponse.json({ success: true, result: data });
  } catch (error: any) {
    return apiError(error?.message || "Unable to register participants.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authorization = await authorizeInstitutionAdmin(request);
    if (authorization.response) return authorization.response;

    const body = await request.json();
    const registrationIds = Array.isArray(body?.registrationIds)
      ? body.registrationIds.map((value: unknown) => String(value))
      : [];

    if (registrationIds.length === 0) {
      return apiError("No registration was selected.");
    }

    const { data, error } = await supabaseAdmin.rpc(
      "delete_programme_entry",
      {
        target_organization_id: authorization.admin.organizationId,
        target_event_id: authorization.admin.eventId,
        target_registration_ids: registrationIds,
      },
    );

    if (error) return apiError(error.message, 409);

    return NextResponse.json({ success: true, result: data });
  } catch (error: any) {
    return apiError(error?.message || "Unable to delete registration.", 500);
  }
}
