/* eslint-disable */

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export type AuthorizedAdmin = {
  userId: string;
  organizationId: string;
  eventId: string;
  role: string;
};

export function apiError(message: string, status = 400) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
    },
  );
}

export async function authorizeInstitutionAdmin(
  request: NextRequest,
): Promise<
  | {
      admin: AuthorizedAdmin;
      response?: never;
    }
  | {
      admin?: never;
      response: NextResponse;
    }
> {
  /*
   * Read the access token supplied by the frontend.
   */
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      response: apiError("Missing authorization token.", 401),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );

    return {
      response: apiError(
        "Supabase environment variables are missing.",
        500,
      ),
    };
  }

  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return {
      response: apiError("Missing authorization token.", 401),
    };
  }

  /*
   * Create a temporary Supabase client using the token sent
   * by the current browser/device.
   *
   * Each device should have its own Supabase session.
   */
  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  /*
   * Securely validate the token with Supabase Auth.
   */
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser(token);

  if (userError || !user) {
    console.error("Admin token validation failed:", {
      message: userError?.message,
      status: userError?.status,
    });

    return {
      response: apiError(
        "Your login session has expired. Please log in again.",
        401,
      ),
    };
  }

  /*
   * Find the organisation connected to this authenticated user.
   */
  const { data: link, error: linkError } = await supabaseAdmin
    .from("organization_users")
    .select("organization_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (linkError) {
    console.error("Organisation user lookup failed:", linkError);

    return {
      response: apiError(
        "Unable to verify the institution account.",
        500,
      ),
    };
  }

  if (!link) {
    return {
      response: apiError(
        "This login is not connected to an institution.",
        403,
      ),
    };
  }

  const organizationId = String(link.organization_id);
  const role = String(link.role || "").toLowerCase();

  const permittedRoles = [
    "admin",
    "madrasa_admin",
    "super_admin",
  ];

  if (!permittedRoles.includes(role)) {
    return {
      response: apiError(
        "Only the institution administrator can perform this action.",
        403,
      ),
    };
  }

  /*
   * Find the event workspace belonging to the organisation.
   */
  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1)
    .maybeSingle();

  if (eventError) {
    console.error("Event workspace lookup failed:", eventError);

    return {
      response: apiError(
        "Unable to verify the event workspace.",
        500,
      ),
    };
  }

  if (!event) {
    return {
      response: apiError("Event workspace not found.", 404),
    };
  }

  return {
    admin: {
      userId: user.id,
      organizationId,
      eventId: String(event.id),
      role,
    },
  };
}