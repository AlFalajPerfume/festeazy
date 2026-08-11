/* eslint-disable */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

type AuthorizedAdmin = {
  userId: string;
  organizationId: string;
  eventId: string;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function authorizeAdmin(
  request: NextRequest,
): Promise<
  | { admin: AuthorizedAdmin; response?: never }
  | { admin?: never; response: NextResponse }
> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: jsonError("Missing authorization token.", 401),
    };
  }

  const token = authHeader.slice("Bearer ".length).trim();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return {
      response: jsonError("Supabase environment variables are missing.", 500),
    };
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();

  if (userError || !user) {
    return {
      response: jsonError("Invalid or expired login session.", 401),
    };
  }

  const { data: userLink, error: linkError } = await supabaseAdmin
    .from("organization_users")
    .select("organization_id, role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (linkError) {
    return {
      response: jsonError(linkError.message, 500),
    };
  }

  if (!userLink) {
    return {
      response: jsonError(
        "This login is not connected to an institution.",
        403,
      ),
    };
  }

  const role = String(userLink.role || "").toLowerCase();

  if (!["admin", "madrasa_admin", "super_admin"].includes(role)) {
    return {
      response: jsonError(
        "Only the institution administrator can change the academic structure.",
        403,
      ),
    };
  }

  const { data: eventData, error: eventError } = await supabaseAdmin
    .from("events")
    .select("id")
    .eq("organization_id", userLink.organization_id)
    .maybeSingle();

  if (eventError) {
    return {
      response: jsonError(eventError.message, 500),
    };
  }

  if (!eventData) {
    return {
      response: jsonError("Event workspace not found.", 404),
    };
  }

  return {
    admin: {
      userId: user.id,
      organizationId: userLink.organization_id,
      eventId: eventData.id,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorizeAdmin(request);

    if (authorization.response) return authorization.response;

    const body = await request.json();
    const category = body?.category;
    const classes = Array.isArray(body?.classes) ? body.classes : [];

    if (!category || !String(category.name || "").trim()) {
      return jsonError("Category name is required.");
    }

    if (classes.length === 0) {
      return jsonError("Add at least one class.");
    }

    const { data, error } = await supabaseAdmin.rpc(
      "save_academic_structure",
      {
        target_organization_id: authorization.admin.organizationId,
        target_event_id: authorization.admin.eventId,
        category_data: category,
        classes_data: classes,
      },
    );

    if (error) {
      return jsonError(error.message, 409);
    }

    return NextResponse.json({
      success: true,
      structure: data,
    });
  } catch (error: any) {
    return jsonError(error?.message || "Unable to save academic structure.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authorization = await authorizeAdmin(request);

    if (authorization.response) return authorization.response;

    const body = await request.json();
    const categoryId = String(body?.categoryId || "").trim();

    if (!categoryId) {
      return jsonError("Category ID is required.");
    }

    const { data, error } = await supabaseAdmin.rpc(
      "delete_academic_category",
      {
        target_organization_id: authorization.admin.organizationId,
        target_event_id: authorization.admin.eventId,
        target_category_id: categoryId,
      },
    );

    if (error) {
      return jsonError(error.message, 409);
    }

    return NextResponse.json({
      success: true,
      result: data,
    });
  } catch (error: any) {
    return jsonError(error?.message || "Unable to delete category.", 500);
  }
}
