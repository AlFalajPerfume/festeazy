import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getOrganizationLabel,
  getRequestErrorResponse,
  hashActionPin,
  isValidActionPin,
  normalizeOrganizationType,
  parseIsoDate,
  requireSuperAdmin,
  slugify,
} from "@/lib/super-admin-server";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateOrganizationBody = {
  organizationType?: string;
  organizationName?: string;
  publicSlug?: string;
  phone?: string;
  email?: string;
  place?: string;
  status?: string;
  planStart?: string;
  planEnd?: string;
  eventTitle?: string;
  eventType?: string;
  tagline?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  isPublic?: boolean;
  newActionPin?: string;
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

async function removeStorageFolder(bucket: string, folder: string) {
  const cleanFolder = folder.replace(/^\/+|\/+$/g, "");
  if (!cleanFolder) return;

  const filesToRemove: string[] = [];

  async function walk(path: string) {
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(path, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });

    if (error || !data) return;

    for (const item of data) {
      const itemPath = path ? `${path}/${item.name}` : item.name;

      if (item.metadata) {
        filesToRemove.push(itemPath);
      } else {
        await walk(itemPath);
      }
    }
  }

  await walk(cleanFolder);

  for (let index = 0; index < filesToRemove.length; index += 1000) {
    const batch = filesToRemove.slice(index, index + 1000);
    const { error } = await supabaseAdmin.storage.from(bucket).remove(batch);
    if (error) {
      throw new Error(`${bucket}/${cleanFolder}: ${error.message}`);
    }
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireSuperAdmin(request);
    const { id: organizationId } = await context.params;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required." },
        { status: 400 },
      );
    }

    const [organizationRes, eventRes, securityRes] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select(
          "id, name, slug, organization_type, phone, email, place, logo_url, status, plan_start, plan_end, created_at, updated_at",
        )
        .eq("id", organizationId)
        .maybeSingle(),
      supabaseAdmin
        .from("events")
        .select(
          "id, organization_id, title, event_type, tagline, venue, start_date, end_date, public_slug, is_public, created_at, updated_at",
        )
        .eq("organization_id", organizationId)
        .maybeSingle(),
      supabaseAdmin
        .from("organization_security")
        .select("organization_id, pin_updated_at, locked_until")
        .eq("organization_id", organizationId)
        .maybeSingle(),
    ]);

    if (organizationRes.error) {
      throw new Error(organizationRes.error.message);
    }

    if (!organizationRes.data) {
      return NextResponse.json(
        { error: "Organization not found." },
        { status: 404 },
      );
    }

    if (eventRes.error) {
      throw new Error(eventRes.error.message);
    }

    if (securityRes.error) {
      throw new Error(securityRes.error.message);
    }

    return NextResponse.json({
      organization: organizationRes.data,
      event: eventRes.data || null,
      security: {
        hasActionPin: Boolean(securityRes.data),
        pinUpdatedAt: securityRes.data?.pin_updated_at || null,
        lockedUntil: securityRes.data?.locked_until || null,
      },
    });
  } catch (error) {
    const response = getRequestErrorResponse(error);
    return NextResponse.json(
      { error: response.message },
      { status: response.status },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { user: superAdminUser } = await requireSuperAdmin(request);
    const { id: organizationId } = await context.params;
    const body = (await request.json()) as UpdateOrganizationBody;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required." },
        { status: 400 },
      );
    }

    const { data: existingOrganization, error: organizationLookupError } =
      await supabaseAdmin
        .from("organizations")
        .select("id, name, organization_type")
        .eq("id", organizationId)
        .maybeSingle();

    if (organizationLookupError) {
      throw new Error(organizationLookupError.message);
    }

    if (!existingOrganization) {
      return NextResponse.json(
        { error: "Organization not found." },
        { status: 404 },
      );
    }

    const { data: existingEvent, error: eventLookupError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (eventLookupError) {
      throw new Error(eventLookupError.message);
    }

    const organizationType = normalizeOrganizationType(
      body.organizationType || existingOrganization.organization_type,
    );
    const organizationLabel = getOrganizationLabel(organizationType);
    const organizationName = cleanText(body.organizationName);
    const publicSlug = slugify(cleanText(body.publicSlug));
    const phone = cleanText(body.phone);
    const email = cleanText(body.email).toLowerCase();
    const place = cleanText(body.place);
    const planStart = cleanText(body.planStart);
    const planEnd = cleanText(body.planEnd);
    const eventTitle = cleanText(body.eventTitle);
    const eventType = normalizeEventType(body.eventType);
    const tagline = cleanText(body.tagline);
    const venue = cleanText(body.venue);
    const startDate = cleanText(body.startDate);
    const endDate = cleanText(body.endDate);
    const newActionPin = cleanText(body.newActionPin);
    const status = normalizeStatus(body.status);
    const isPublic = body.isPublic !== false;

    if (!organizationName) {
      return NextResponse.json(
        { error: `${organizationLabel} name is required.` },
        { status: 400 },
      );
    }

    if (!publicSlug) {
      return NextResponse.json(
        { error: "A valid public portal slug is required." },
        { status: 400 },
      );
    }

    if (!eventTitle) {
      return NextResponse.json(
        { error: "Event title is required." },
        { status: 400 },
      );
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: "The organization email address is invalid." },
        { status: 400 },
      );
    }

    if (planStart && !parseIsoDate(planStart)) {
      return NextResponse.json(
        { error: "Plan start date is invalid." },
        { status: 400 },
      );
    }

    if (planEnd && !parseIsoDate(planEnd)) {
      return NextResponse.json(
        { error: "Plan end date is invalid." },
        { status: 400 },
      );
    }

    if (planStart && planEnd && planEnd < planStart) {
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

    if (newActionPin && !isValidActionPin(newActionPin)) {
      return NextResponse.json(
        { error: "The new action PIN must contain exactly 6 digits." },
        { status: 400 },
      );
    }

    const [slugOrgRes, slugEventRes] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("slug", publicSlug)
        .neq("id", organizationId)
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from("events")
        .select("id")
        .eq("public_slug", publicSlug)
        .neq("organization_id", organizationId)
        .limit(1)
        .maybeSingle(),
    ]);

    if (slugOrgRes.error) throw new Error(slugOrgRes.error.message);
    if (slugEventRes.error) throw new Error(slugEventRes.error.message);

    if (slugOrgRes.data || slugEventRes.data) {
      return NextResponse.json(
        { error: "This public portal slug is already in use." },
        { status: 409 },
      );
    }

    const { data: organization, error: organizationUpdateError } =
      await supabaseAdmin
        .from("organizations")
        .update({
          name: organizationName,
          slug: publicSlug,
          organization_type: organizationType,
          phone: phone || null,
          email: email || null,
          place: place || null,
          status,
          plan_start: planStart || null,
          plan_end: planEnd || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", organizationId)
        .select("*")
        .single();

    if (organizationUpdateError) {
      throw new Error(organizationUpdateError.message);
    }

    let event;

    if (existingEvent) {
      const { data, error } = await supabaseAdmin
        .from("events")
        .update({
          title: eventTitle,
          event_type: eventType,
          tagline: tagline || null,
          venue: venue || null,
          start_date: startDate || null,
          end_date: endDate || null,
          public_slug: publicSlug,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingEvent.id)
        .eq("organization_id", organizationId)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      event = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("events")
        .insert({
          organization_id: organizationId,
          title: eventTitle,
          event_type: eventType,
          tagline: tagline || null,
          venue: venue || null,
          start_date: startDate || null,
          end_date: endDate || null,
          public_slug: publicSlug,
          is_public: isPublic,
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      event = data;
    }

    let actionPinChanged = false;

    if (newActionPin) {
      const { salt, hash } = hashActionPin(newActionPin);

      const { error: pinError } = await supabaseAdmin
        .from("organization_security")
        .upsert(
          {
            organization_id: organizationId,
            action_pin_hash: hash,
            action_pin_salt: salt,
            failed_attempts: 0,
            locked_until: null,
            pin_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id" },
        );

      if (pinError) throw new Error(pinError.message);

      actionPinChanged = true;

      await supabaseAdmin.from("organization_data_action_logs").insert({
        organization_id: organizationId,
        event_id: event?.id || null,
        requested_by: superAdminUser.id,
        action_type: "pin_changed",
        status: "completed",
        details: {
          source: "super_admin_edit",
        },
      });
    }

    return NextResponse.json({
      success: true,
      organization,
      event,
      actionPinChanged,
    });
  } catch (error) {
    const response = getRequestErrorResponse(error);
    return NextResponse.json(
      { error: response.message },
      { status: response.status },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireSuperAdmin(request);
    const { id: organizationId } = await context.params;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required." },
        { status: 400 },
      );
    }

    const requestBody = (await request.json().catch(() => ({}))) as {
      confirmationName?: string;
    };
    const confirmationName = cleanText(requestBody.confirmationName);

    const { data: organization, error: organizationError } = await supabaseAdmin
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .maybeSingle();

    if (organizationError) throw new Error(organizationError.message);

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found or already deleted." },
        { status: 404 },
      );
    }

    if (
      confirmationName.toLowerCase() !==
      String(organization.name).trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: "The confirmation name does not match the organization name." },
        { status: 400 },
      );
    }

    const { data: eventRows, error: eventsError } = await supabaseAdmin
      .from("events")
      .select("id")
      .eq("organization_id", organizationId);

    if (eventsError) throw new Error(eventsError.message);

    const eventIds = (eventRows || []).map((item) => String(item.id));

    const { data: deletedData, error: deleteError } = await supabaseAdmin.rpc(
      "delete_madrasa_completely",
      {
        target_organization_id: organizationId,
      },
    );

    if (deleteError) {
      return NextResponse.json(
        {
          error:
            deleteError.message ||
            "Database deletion failed. Verify the permanent-deletion SQL function.",
        },
        { status: 500 },
      );
    }

    const storageTargets = [organizationId, ...eventIds];
    const buckets = [
      "organization-logos",
      "event-assets",
      "poster-templates",
      "gallery-images",
      "event-gallery",
      "certificates",
    ];

    await Promise.allSettled(
      buckets.flatMap((bucket) =>
        storageTargets.map((folder) => removeStorageFolder(bucket, folder)),
      ),
    );

    return NextResponse.json({
      success: true,
      organizationId,
      organizationName: organization.name,
      details: deletedData,
    });
  } catch (error) {
    const response = getRequestErrorResponse(error);
    return NextResponse.json(
      { error: response.message },
      { status: response.status },
    );
  }
}
