import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getRequestErrorResponse,
  requireSuperAdmin,
} from "@/lib/super-admin-server";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CreateUserBody = {
  email?: string;
  password?: string;
  role?: string;
};

type ToggleUserBody = {
  linkId?: string;
  isActive?: boolean;
};

type RemoveUserBody = {
  linkId?: string;
};

const CREATABLE_ROLES = new Set(["admin", "green_room_operator"]);
const FULL_ADMIN_ROLES = new Set([
  "admin",
  "madrasa_admin",
  "manager",
  "owner",
  "super_admin",
]);

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function normalizeEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function normalizeRole(value: unknown) {
  const role = cleanText(value).toLowerCase();
  return CREATABLE_ROLES.has(role) ? role : "admin";
}

function roleLabel(role: string) {
  if (role === "green_room_operator") return "Green Room Operator";
  if (role === "madrasa_admin") return "Madrasa Admin";
  if (role === "super_admin") return "Super Admin";
  if (role === "manager") return "Manager";
  if (role === "viewer") return "Viewer";
  return "Admin";
}

async function getOrganization(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("id, name, slug, phone, email, place, logo_url, status")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) {
    throw new Response(
      JSON.stringify({ error: "Organization not found." }),
      {
        status: 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return data;
}

async function getOrganizationUsers(organizationId: string) {
  const { data, error } = await supabaseAdmin
    .from("organization_users")
    .select(
      "id, organization_id, user_id, role, is_active, email, created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

async function findAuthUserByEmail(email: string) {
  const perPage = 1000;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw new Error(error.message);

    const user = (data.users || []).find(
      (item) => String(item.email || "").toLowerCase() === email,
    );

    if (user) return user;
    if ((data.users || []).length < perPage) return null;
  }

  return null;
}

async function ensureAnotherActiveAdmin(
  organizationId: string,
  excludedLinkId: string,
) {
  const users = await getOrganizationUsers(organizationId);

  return users.some(
    (user) =>
      user.id !== excludedLinkId &&
      Boolean(user.is_active) &&
      FULL_ADMIN_ROLES.has(String(user.role || "").toLowerCase()),
  );
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

    const [organization, users] = await Promise.all([
      getOrganization(organizationId),
      getOrganizationUsers(organizationId),
    ]);

    return NextResponse.json({ organization, users });
  } catch (error) {
    if (error instanceof Response) return error;

    const response = getRequestErrorResponse(error);
    return NextResponse.json(
      { error: response.message },
      { status: response.status },
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  let createdAuthUserId: string | null = null;

  try {
    await requireSuperAdmin(request);
    const { id: organizationId } = await context.params;
    const body = (await request.json()) as CreateUserBody;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required." },
        { status: 400 },
      );
    }

    const organization = await getOrganization(organizationId);
    const email = normalizeEmail(body.email);
    const password = cleanText(body.password);
    const role = normalizeRole(body.role);

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid user email is required." },
        { status: 400 },
      );
    }

    let authUser = await findAuthUserByEmail(email);
    let createdNewLogin = false;

    if (!authUser) {
      if (password.length < 8) {
        return NextResponse.json(
          {
            error:
              "A temporary password with at least 8 characters is required for a new login.",
          },
          { status: 400 },
        );
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          role,
          organization_id: organizationId,
          organization_name: organization.name,
        },
      });

      if (error || !data.user) {
        return NextResponse.json(
          { error: error?.message || "Unable to create the user login." },
          { status: 500 },
        );
      }

      authUser = data.user;
      createdAuthUserId = data.user.id;
      createdNewLogin = true;
    }

    const { data: existingLinks, error: existingLinksError } =
      await supabaseAdmin
        .from("organization_users")
        .select("id, organization_id, user_id, role, is_active, email")
        .eq("user_id", authUser.id);

    if (existingLinksError) throw new Error(existingLinksError.message);

    const otherOrganizationLink = (existingLinks || []).find(
      (link) => link.organization_id !== organizationId,
    );

    if (otherOrganizationLink) {
      if (createdAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      }

      return NextResponse.json(
        {
          error:
            "This login is already connected to another organization. Use a different email address.",
        },
        { status: 409 },
      );
    }

    const currentLink = (existingLinks || []).find(
      (link) => link.organization_id === organizationId,
    );

    if (currentLink) {
      const { error: updateError } = await supabaseAdmin
        .from("organization_users")
        .update({
          email,
          role,
          is_active: true,
        })
        .eq("id", currentLink.id);

      if (updateError) throw new Error(updateError.message);

      return NextResponse.json({
        success: true,
        createdNewLogin,
        linkedExistingLogin: !createdNewLogin,
        message: `${roleLabel(role)} access updated and activated.`,
      });
    }

    const { error: insertError } = await supabaseAdmin
      .from("organization_users")
      .insert({
        organization_id: organizationId,
        user_id: authUser.id,
        email,
        role,
        is_active: true,
      });

    if (insertError) {
      if (createdAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
        createdAuthUserId = null;
      }
      throw new Error(insertError.message);
    }

    return NextResponse.json({
      success: true,
      createdNewLogin,
      linkedExistingLogin: !createdNewLogin,
      message: createdNewLogin
        ? `${roleLabel(role)} login created successfully.`
        : `Existing login linked as ${roleLabel(role)}. Its current password was not changed.`,
    });
  } catch (error) {
    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
    }

    if (error instanceof Response) return error;

    const response = getRequestErrorResponse(error);
    return NextResponse.json(
      { error: response.message },
      { status: response.status },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireSuperAdmin(request);
    const { id: organizationId } = await context.params;
    const body = (await request.json()) as ToggleUserBody;
    const linkId = cleanText(body.linkId);
    const isActive = Boolean(body.isActive);

    if (!organizationId || !linkId) {
      return NextResponse.json(
        { error: "Organization and user link IDs are required." },
        { status: 400 },
      );
    }

    const { data: link, error: linkError } = await supabaseAdmin
      .from("organization_users")
      .select("id, organization_id, role, is_active, email")
      .eq("id", linkId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (linkError) throw new Error(linkError.message);

    if (!link) {
      return NextResponse.json(
        { error: "Organization user link not found." },
        { status: 404 },
      );
    }

    if (
      !isActive &&
      Boolean(link.is_active) &&
      FULL_ADMIN_ROLES.has(String(link.role || "").toLowerCase())
    ) {
      const hasAnotherAdmin = await ensureAnotherActiveAdmin(
        organizationId,
        linkId,
      );

      if (!hasAnotherAdmin) {
        return NextResponse.json(
          {
            error:
              "This is the last active administrator. Create another Admin before deactivating it.",
          },
          { status: 409 },
        );
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("organization_users")
      .update({ is_active: isActive })
      .eq("id", linkId)
      .eq("organization_id", organizationId);

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({
      success: true,
      message: isActive ? "User access activated." : "User access deactivated.",
    });
  } catch (error) {
    if (error instanceof Response) return error;

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
    const body = (await request.json()) as RemoveUserBody;
    const linkId = cleanText(body.linkId);

    if (!organizationId || !linkId) {
      return NextResponse.json(
        { error: "Organization and user link IDs are required." },
        { status: 400 },
      );
    }

    const { data: link, error: linkError } = await supabaseAdmin
      .from("organization_users")
      .select("id, organization_id, role, is_active, email")
      .eq("id", linkId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (linkError) throw new Error(linkError.message);

    if (!link) {
      return NextResponse.json(
        { error: "Organization user link not found." },
        { status: 404 },
      );
    }

    if (
      Boolean(link.is_active) &&
      FULL_ADMIN_ROLES.has(String(link.role || "").toLowerCase())
    ) {
      const hasAnotherAdmin = await ensureAnotherActiveAdmin(
        organizationId,
        linkId,
      );

      if (!hasAnotherAdmin) {
        return NextResponse.json(
          {
            error:
              "This is the last active administrator. Create another Admin before removing it.",
          },
          { status: 409 },
        );
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from("organization_users")
      .delete()
      .eq("id", linkId)
      .eq("organization_id", organizationId);

    if (deleteError) throw new Error(deleteError.message);

    return NextResponse.json({
      success: true,
      message:
        "Organization access removed. The Supabase Authentication login was not deleted.",
    });
  } catch (error) {
    if (error instanceof Response) return error;

    const response = getRequestErrorResponse(error);
    return NextResponse.json(
      { error: response.message },
      { status: response.status },
    );
  }
}
