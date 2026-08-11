import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient, type User } from "@supabase/supabase-js";
import { timingSafeEqual, scryptSync } from "node:crypto";
import type { NextRequest } from "next/server";

export type OrganizationType = "madrasa" | "school" | "institution";

export type OrganizationAdminContext = {
  user: User;
  token: string;
  role: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationType: OrganizationType;
  eventId: string;
  eventTitle: string;
};

export class AdminDataControlError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "DATA_CONTROL_ERROR") {
    super(message);
    this.name = "AdminDataControlError";
    this.status = status;
    this.code = code;
  }
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return "";
  return authorization.slice(7).trim();
}

function normalizeOrganizationType(value: unknown): OrganizationType {
  const type = String(value || "").trim().toLowerCase();
  if (type === "school") return "school";
  if (type === "institution") return "institution";
  return "madrasa";
}

export function getOrganizationLabel(type: OrganizationType) {
  if (type === "school") return "School";
  if (type === "institution") return "Institution";
  return "Madrasa";
}

export async function requireOrganizationAdmin(
  request: NextRequest,
): Promise<OrganizationAdminContext> {
  const token = getBearerToken(request);

  if (!token) {
    throw new AdminDataControlError(
      "Administrator authentication is required.",
      401,
      "AUTH_REQUIRED",
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new AdminDataControlError(
      "Supabase server environment variables are missing.",
      500,
      "SERVER_CONFIG_MISSING",
    );
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser(token);

  if (userError || !user) {
    throw new AdminDataControlError(
      "Your administrator session is invalid or expired.",
      401,
      "SESSION_INVALID",
    );
  }

  const { data: link, error: linkError } = await supabaseAdmin
    .from("organization_users")
    .select("organization_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (linkError) {
    throw new AdminDataControlError(linkError.message, 500, "LINK_LOOKUP_FAILED");
  }

  if (!link) {
    throw new AdminDataControlError(
      "This login is not connected to an active organization.",
      403,
      "ORGANIZATION_LINK_MISSING",
    );
  }

  const role = String(link.role || "").trim().toLowerCase();
  const allowedRoles = new Set(["admin", "madrasa_admin"]);

  if (!allowedRoles.has(role)) {
    throw new AdminDataControlError(
      "Only the organization administrator can use data controls.",
      403,
      "ADMIN_ROLE_REQUIRED",
    );
  }

  const [organizationRes, eventRes] = await Promise.all([
    supabaseAdmin
      .from("organizations")
      .select("id, name, slug, organization_type, status")
      .eq("id", link.organization_id)
      .maybeSingle(),
    supabaseAdmin
      .from("events")
      .select("id, title")
      .eq("organization_id", link.organization_id)
      .limit(2),
  ]);

  if (organizationRes.error) {
    throw new AdminDataControlError(
      organizationRes.error.message,
      500,
      "ORGANIZATION_LOOKUP_FAILED",
    );
  }

  if (!organizationRes.data) {
    throw new AdminDataControlError(
      "Organization profile was not found.",
      404,
      "ORGANIZATION_NOT_FOUND",
    );
  }

  if (String(organizationRes.data.status || "active") !== "active") {
    throw new AdminDataControlError(
      "This organization account is not active.",
      403,
      "ORGANIZATION_INACTIVE",
    );
  }

  if (eventRes.error) {
    throw new AdminDataControlError(
      eventRes.error.message,
      500,
      "EVENT_LOOKUP_FAILED",
    );
  }

  if (!eventRes.data || eventRes.data.length === 0) {
    throw new AdminDataControlError(
      "Event setup was not found.",
      404,
      "EVENT_NOT_FOUND",
    );
  }

  if (eventRes.data.length > 1) {
    throw new AdminDataControlError(
      "More than one event exists for this organization. Contact FestEazy support before using data controls.",
      409,
      "MULTIPLE_EVENTS_FOUND",
    );
  }

  const organization = organizationRes.data;
  const event = eventRes.data[0];

  return {
    user,
    token,
    role,
    organizationId: organization.id,
    organizationName: organization.name || "Organization",
    organizationSlug: organization.slug || "organization",
    organizationType: normalizeOrganizationType(
      organization.organization_type,
    ),
    eventId: event.id,
    eventTitle: event.title || "Event",
  };
}

function isValidPin(pin: string) {
  return /^\d{6}$/.test(pin);
}

function verifyHash(pin: string, salt: string, expectedHash: string) {
  if (!isValidPin(pin)) return false;

  const actual = scryptSync(pin, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

async function writeAuditLog(input: {
  organizationId: string;
  eventId: string;
  userId: string;
  actionType:
    | "backup_download"
    | "workspace_reset"
    | "pin_failed"
    | "pin_locked";
  status: "requested" | "completed" | "failed" | "blocked";
  details?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("organization_data_action_logs").insert({
    organization_id: input.organizationId,
    event_id: input.eventId,
    requested_by: input.userId,
    action_type: input.actionType,
    status: input.status,
    details: input.details || {},
  });
}

export async function verifyOrganizationActionPin(input: {
  context: OrganizationAdminContext;
  pin: string;
}) {
  const pin = String(input.pin || "").trim();
  const { context } = input;

  if (!isValidPin(pin)) {
    throw new AdminDataControlError(
      "Enter the six-digit secure action PIN.",
      400,
      "PIN_FORMAT_INVALID",
    );
  }

  const { data: security, error: securityError } = await supabaseAdmin
    .from("organization_security")
    .select(
      "organization_id, action_pin_hash, action_pin_salt, failed_attempts, locked_until",
    )
    .eq("organization_id", context.organizationId)
    .maybeSingle();

  if (securityError) {
    throw new AdminDataControlError(
      securityError.message,
      500,
      "PIN_LOOKUP_FAILED",
    );
  }

  if (!security) {
    throw new AdminDataControlError(
      "A secure action PIN has not been configured. Ask the FestEazy Super Admin to set one.",
      409,
      "PIN_NOT_CONFIGURED",
    );
  }

  const now = new Date();
  const lockedUntil = security.locked_until
    ? new Date(security.locked_until)
    : null;

  if (lockedUntil && lockedUntil.getTime() > now.getTime()) {
    const minutes = Math.max(
      1,
      Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000),
    );

    await writeAuditLog({
      organizationId: context.organizationId,
      eventId: context.eventId,
      userId: context.user.id,
      actionType: "pin_locked",
      status: "blocked",
      details: { locked_until: security.locked_until },
    });

    throw new AdminDataControlError(
      `Too many incorrect attempts. Try again in approximately ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      423,
      "PIN_TEMPORARILY_LOCKED",
    );
  }

  const valid = verifyHash(
    pin,
    security.action_pin_salt,
    security.action_pin_hash,
  );

  if (!valid) {
    const previousAttempts = Number(security.failed_attempts || 0);
    const nextAttempts = previousAttempts + 1;
    const shouldLock = nextAttempts >= 5;
    const nextLockedUntil = shouldLock
      ? new Date(now.getTime() + 15 * 60 * 1000).toISOString()
      : null;

    const { error: updateError } = await supabaseAdmin
      .from("organization_security")
      .update({
        failed_attempts: shouldLock ? 0 : nextAttempts,
        locked_until: nextLockedUntil,
        updated_at: now.toISOString(),
      })
      .eq("organization_id", context.organizationId);

    if (updateError) {
      throw new AdminDataControlError(
        updateError.message,
        500,
        "PIN_ATTEMPT_UPDATE_FAILED",
      );
    }

    await writeAuditLog({
      organizationId: context.organizationId,
      eventId: context.eventId,
      userId: context.user.id,
      actionType: shouldLock ? "pin_locked" : "pin_failed",
      status: shouldLock ? "blocked" : "failed",
      details: {
        attempts: nextAttempts,
        locked_until: nextLockedUntil,
      },
    });

    if (shouldLock) {
      throw new AdminDataControlError(
        "Too many incorrect attempts. Data controls are locked for 15 minutes.",
        423,
        "PIN_TEMPORARILY_LOCKED",
      );
    }

    const remaining = 5 - nextAttempts;
    throw new AdminDataControlError(
      `Incorrect action PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining before temporary lockout.`,
      403,
      "PIN_INCORRECT",
    );
  }

  const { error: clearError } = await supabaseAdmin
    .from("organization_security")
    .update({
      failed_attempts: 0,
      locked_until: null,
      updated_at: now.toISOString(),
    })
    .eq("organization_id", context.organizationId);

  if (clearError) {
    throw new AdminDataControlError(
      clearError.message,
      500,
      "PIN_RESET_FAILED",
    );
  }

  return true;
}

export async function recordDataAction(input: {
  context: OrganizationAdminContext;
  actionType: "backup_download" | "workspace_reset";
  status: "requested" | "completed" | "failed" | "blocked";
  details?: Record<string, unknown>;
}) {
  await writeAuditLog({
    organizationId: input.context.organizationId,
    eventId: input.context.eventId,
    userId: input.context.user.id,
    actionType: input.actionType,
    status: input.status,
    details: input.details,
  });
}

export function getAdminDataControlError(error: unknown) {
  if (error instanceof AdminDataControlError) {
    return {
      message: error.message,
      status: error.status,
      code: error.code,
    };
  }

  return {
    message: error instanceof Error ? error.message : "Unexpected server error.",
    status: 500,
    code: "UNEXPECTED_SERVER_ERROR",
  };
}
