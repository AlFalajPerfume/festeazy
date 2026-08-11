import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  addMonthsToIsoDate,
  getOrganizationLabel,
  getRequestErrorResponse,
  hashActionPin,
  isValidActionPin,
  normalizeOrganizationType,
  parseIsoDate,
  requireSuperAdmin,
  slugify,
  todayIsoDate,
} from "@/lib/super-admin-server";
import { NextRequest, NextResponse } from "next/server";

type CreateOrganizationBody = {
  organizationType?: string;
  organizationName?: string;
  madrasaName?: string;
  publicSlug?: string;
  place?: string;
  phone?: string;
  adminEmail?: string;
  adminPassword?: string;
  actionPin?: string;
  eventTitle?: string;
  eventType?: string;
  tagline?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  planStart?: string;
  planEnd?: string;
  status?: string;
  isPublic?: boolean;
  createGreenRoomOperator?: boolean;
  operatorEmail?: string;
  operatorPassword?: string;
};

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function normalizeEventType(value: unknown) {
  const text = cleanText(value).toLowerCase();
  const allowed = new Set([
    "meelad",
    "arts_fest",
    "annual_day",
    "competition",
  ]);

  return allowed.has(text) ? text : "meelad";
}

function normalizeStatus(value: unknown) {
  return cleanText(value).toLowerCase() === "inactive" ? "inactive" : "active";
}

async function rollbackCreation(
  organizationId: string | null,
  userIds: Array<string | null>,
) {
  if (organizationId) {
    await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("id", organizationId);
  }

  for (const userId of userIds.filter(Boolean) as string[]) {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }
}

export async function POST(request: NextRequest) {
  let createdOrganizationId: string | null = null;
  let createdAdminUserId: string | null = null;
  let createdOperatorUserId: string | null = null;

  try {
    const { user: superAdminUser } = await requireSuperAdmin(request);
    const body = (await request.json()) as CreateOrganizationBody;

    const organizationType = normalizeOrganizationType(body.organizationType);
    const organizationLabel = getOrganizationLabel(organizationType);
    const organizationName = cleanText(
      body.organizationName || body.madrasaName,
    );
    const adminEmail = cleanText(body.adminEmail).toLowerCase();
    const adminPassword = cleanText(body.adminPassword);
    const phone = cleanText(body.phone);
    const place = cleanText(body.place);
    const eventTitle = cleanText(body.eventTitle);
    const eventType = normalizeEventType(body.eventType);
    const tagline = cleanText(body.tagline);
    const venue = cleanText(body.venue);
    const startDate = cleanText(body.startDate);
    const endDate = cleanText(body.endDate);
    const actionPin = cleanText(body.actionPin);
    const status = normalizeStatus(body.status);
    const isPublic = body.isPublic !== false;
    const createGreenRoomOperator = Boolean(body.createGreenRoomOperator);
    const operatorEmail = cleanText(body.operatorEmail).toLowerCase();
    const operatorPassword = cleanText(body.operatorPassword);

    const requestedPlanStart = cleanText(body.planStart) || todayIsoDate();
    const requestedPlanEnd =
      cleanText(body.planEnd) || addMonthsToIsoDate(requestedPlanStart, 3);

    if (!organizationName) {
      return NextResponse.json(
        { error: `${organizationLabel} name is required.` },
        { status: 400 },
      );
    }

    if (!adminEmail || !/^\S+@\S+\.\S+$/.test(adminEmail)) {
      return NextResponse.json(
        { error: "A valid administrator email is required." },
        { status: 400 },
      );
    }

    if (adminPassword.length < 8) {
      return NextResponse.json(
        { error: "The administrator password must have at least 8 characters." },
        { status: 400 },
      );
    }

    if (createGreenRoomOperator) {
      if (!operatorEmail || !/^\S+@\S+\.\S+$/.test(operatorEmail)) {
        return NextResponse.json(
          { error: "A valid Green Room operator email is required." },
          { status: 400 },
        );
      }

      if (operatorEmail === adminEmail) {
        return NextResponse.json(
          {
            error:
              "The Green Room operator email must be different from the administrator email.",
          },
          { status: 400 },
        );
      }

      if (operatorPassword.length < 8) {
        return NextResponse.json(
          {
            error:
              "The Green Room operator password must have at least 8 characters.",
          },
          { status: 400 },
        );
      }
    }

    if (!isValidActionPin(actionPin)) {
      return NextResponse.json(
        { error: "The secure action PIN must contain exactly 6 digits." },
        { status: 400 },
      );
    }

    if (!eventTitle) {
      return NextResponse.json(
        { error: "Event title is required." },
        { status: 400 },
      );
    }

    if (!parseIsoDate(requestedPlanStart) || !parseIsoDate(requestedPlanEnd)) {
      return NextResponse.json(
        { error: "Plan start and end dates must be valid dates." },
        { status: 400 },
      );
    }

    if (requestedPlanEnd < requestedPlanStart) {
      return NextResponse.json(
        { error: "Plan end date cannot be before the plan start date." },
        { status: 400 },
      );
    }

    if (startDate && !parseIsoDate(startDate)) {
      return NextResponse.json(
        { error: "Event start date is invalid." },
        { status: 400 },
      );
    }

    if (endDate && !parseIsoDate(endDate)) {
      return NextResponse.json(
        { error: "Event end date is invalid." },
        { status: 400 },
      );
    }

    if (startDate && endDate && endDate < startDate) {
      return NextResponse.json(
        { error: "Event end date cannot be before the start date." },
        { status: 400 },
      );
    }

    const requestedSlug = slugify(
      cleanText(body.publicSlug) || organizationName,
    );

    if (!requestedSlug) {
      return NextResponse.json(
        { error: "A valid public portal slug is required." },
        { status: 400 },
      );
    }

    const [existingOrganization, existingEvent] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("slug", requestedSlug)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("events")
        .select("id")
        .eq("public_slug", requestedSlug)
        .limit(1)
        .maybeSingle(),
    ]);

    if (existingOrganization.error) {
      throw new Error(existingOrganization.error.message);
    }

    if (existingEvent.error) {
      throw new Error(existingEvent.error.message);
    }

    if (existingOrganization.data || existingEvent.data) {
      return NextResponse.json(
        { error: "This public portal slug is already in use." },
        { status: 409 },
      );
    }

    const { data: createdUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
        user_metadata: {
          role: "admin",
          organization_type: organizationType,
          organization_name: organizationName,
        },
      });

    if (createUserError || !createdUser.user) {
      return NextResponse.json(
        {
          error:
            createUserError?.message || "Failed to create administrator login.",
        },
        { status: 500 },
      );
    }

    createdAdminUserId = createdUser.user.id;

    if (createGreenRoomOperator) {
      const { data: createdOperator, error: createOperatorError } =
        await supabaseAdmin.auth.admin.createUser({
          email: operatorEmail,
          password: operatorPassword,
          email_confirm: true,
          user_metadata: {
            role: "green_room_operator",
            organization_type: organizationType,
            organization_name: organizationName,
          },
        });

      if (createOperatorError || !createdOperator.user) {
        await rollbackCreation(null, [createdAdminUserId]);
        createdAdminUserId = null;

        return NextResponse.json(
          {
            error:
              createOperatorError?.message ||
              "Failed to create the Green Room operator login.",
          },
          { status: 500 },
        );
      }

      createdOperatorUserId = createdOperator.user.id;
    }

    const { data: organization, error: organizationError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: organizationName,
        slug: requestedSlug,
        organization_type: organizationType,
        phone: phone || null,
        email: adminEmail,
        place: place || null,
        status,
        plan_start: requestedPlanStart,
        plan_end: requestedPlanEnd,
        logo_url: null,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (organizationError || !organization) {
      await rollbackCreation(null, [createdAdminUserId, createdOperatorUserId]);
      return NextResponse.json(
        {
          error:
            organizationError?.message || `Failed to create ${organizationLabel}.`,
        },
        { status: 500 },
      );
    }

    createdOrganizationId = organization.id;

    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .insert({
        organization_id: organization.id,
        title: eventTitle,
        event_type: eventType,
        tagline: tagline || "Celebrating knowledge, talent and tradition",
        venue: venue || null,
        start_date: startDate || null,
        end_date: endDate || null,
        public_slug: requestedSlug,
        is_public: isPublic,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (eventError || !event) {
      await rollbackCreation(createdOrganizationId, [createdAdminUserId, createdOperatorUserId]);
      return NextResponse.json(
        { error: eventError?.message || "Failed to create the event." },
        { status: 500 },
      );
    }

    const { error: orgUserError } = await supabaseAdmin
      .from("organization_users")
      .insert({
        organization_id: organization.id,
        user_id: createdAdminUserId,
        email: adminEmail,
        role: "admin",
        is_active: true,
      });

    if (orgUserError) {
      await rollbackCreation(createdOrganizationId, [createdAdminUserId, createdOperatorUserId]);
      return NextResponse.json(
        { error: orgUserError.message },
        { status: 500 },
      );
    }

    if (createGreenRoomOperator && createdOperatorUserId) {
      const { error: operatorLinkError } = await supabaseAdmin
        .from("organization_users")
        .insert({
          organization_id: organization.id,
          user_id: createdOperatorUserId,
          email: operatorEmail,
          role: "green_room_operator",
          is_active: true,
        });

      if (operatorLinkError) {
        await rollbackCreation(createdOrganizationId, [
          createdAdminUserId,
          createdOperatorUserId,
        ]);

        return NextResponse.json(
          { error: operatorLinkError.message },
          { status: 500 },
        );
      }
    }

    const { error: settingsError } = await supabaseAdmin
      .from("event_settings")
      .upsert(
        {
          organization_id: organization.id,
          event_id: event.id,
          contact_number: phone || null,
          whatsapp_number: phone || null,
          hero_image_url: null,
          theme_color: "emerald",
          show_points: true,
          show_student_search: true,
          show_gallery: true,
          show_schedule: true,
          show_posters: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "event_id" },
      );

    if (settingsError) {
      await rollbackCreation(createdOrganizationId, [createdAdminUserId, createdOperatorUserId]);
      return NextResponse.json(
        { error: settingsError.message },
        { status: 500 },
      );
    }

    const { salt, hash } = hashActionPin(actionPin);

    const { error: securityError } = await supabaseAdmin
      .from("organization_security")
      .insert({
        organization_id: organization.id,
        action_pin_hash: hash,
        action_pin_salt: salt,
        failed_attempts: 0,
        locked_until: null,
        pin_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (securityError) {
      await rollbackCreation(createdOrganizationId, [createdAdminUserId, createdOperatorUserId]);
      return NextResponse.json(
        { error: securityError.message },
        { status: 500 },
      );
    }

    await supabaseAdmin.from("organization_data_action_logs").insert({
      organization_id: organization.id,
      event_id: event.id,
      requested_by: superAdminUser.id,
      action_type: "pin_changed",
      status: "completed",
      details: {
        source: "organization_creation",
      },
    });

    return NextResponse.json({
      success: true,
      organization,
      event,
      admin: {
        id: createdAdminUserId,
        email: adminEmail,
      },
      operator:
        createGreenRoomOperator && createdOperatorUserId
          ? {
              id: createdOperatorUserId,
              email: operatorEmail,
              role: "green_room_operator",
            }
          : null,
      plan: {
        start: requestedPlanStart,
        end: requestedPlanEnd,
      },
      actionPinConfigured: true,
    });
  } catch (error) {
    if (
      createdOrganizationId ||
      createdAdminUserId ||
      createdOperatorUserId
    ) {
      await rollbackCreation(createdOrganizationId, [
        createdAdminUserId,
        createdOperatorUserId,
      ]);
    }

    const response = getRequestErrorResponse(error);

    return NextResponse.json(
      { error: response.message },
      { status: response.status },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "FestEazy organization creation API is available.",
  });
}
