/* eslint-disable */
import { supabase } from "@/lib/supabase";

export type OrganizationType = "madrasa" | "school" | "institution";
export type AdminRole =
  | "admin"
  | "madrasa_admin"
  | "super_admin"
  | "green_room_operator";

export type AdminContext = {
  userId: string;
  email: string;
  role: AdminRole;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationType: OrganizationType;
  organizationPhone: string;
  organizationEmail: string;
  organizationPlace: string;
  organizationLogoUrl: string;
  organizationStatus: string;
  planStart: string;
  planEnd: string;
  eventId: string;
  eventTitle: string;
  publicSlug: string;
  eventIsPublic: boolean;
  eventVenue: string;
  eventStartDate: string;
  eventEndDate: string;
};

type CachedAdminContext = {
  value: AdminContext;
  storedAt: number;
};

const CACHE_KEY = "festeazy_admin_context_v3";
const CACHE_TTL_MS = 10 * 60 * 1000;

let memoryCache: CachedAdminContext | null = null;
let pendingRequest: Promise<{
  context: AdminContext | null;
  error: string | null;
}> | null = null;

function normalizeOrganizationType(value: unknown): OrganizationType {
  if (value === "school" || value === "institution") return value;
  return "madrasa";
}

function readSessionCache(userId: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedAdminContext;

    if (!parsed?.value || parsed.value.userId !== userId) return null;
    if (Date.now() - Number(parsed.storedAt || 0) > CACHE_TTL_MS) return null;

    return parsed;
  } catch {
    return null;
  }
}

function storeCache(value: AdminContext) {
  const next: CachedAdminContext = {
    value,
    storedAt: Date.now(),
  };

  memoryCache = next;

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
      // Memory cache remains available when sessionStorage is unavailable.
    }
  }
}

export function clearAdminContextCache() {
  memoryCache = null;
  pendingRequest = null;

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(CACHE_KEY);
      window.sessionStorage.removeItem("festeazy_admin_context_v2");
    } catch {
      // Ignore unavailable storage.
    }
  }
}

export async function getAdminContext(options?: {
  forceRefresh?: boolean;
}): Promise<{
  context: AdminContext | null;
  error: string | null;
}> {
  const forceRefresh = Boolean(options?.forceRefresh);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return { context: null, error: sessionError.message };
  }

  if (!session?.user) {
    clearAdminContextCache();
    return { context: null, error: "Not logged in." };
  }

  const user = session.user;

  if (!forceRefresh) {
    if (
      memoryCache &&
      memoryCache.value.userId === user.id &&
      Date.now() - memoryCache.storedAt <= CACHE_TTL_MS
    ) {
      return { context: memoryCache.value, error: null };
    }

    const stored = readSessionCache(user.id);

    if (stored) {
      memoryCache = stored;
      return { context: stored.value, error: null };
    }

    if (pendingRequest) return pendingRequest;
  }

  pendingRequest = (async () => {
    const { data: userLink, error: linkError } = await supabase
      .from("organization_users")
      .select(
        `
        role,
        is_active,
        organization_id,
        organizations (
          id,
          name,
          slug,
          organization_type,
          phone,
          email,
          place,
          logo_url,
          status,
          plan_start,
          plan_end
        )
      `,
      )
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (linkError) {
      return { context: null, error: linkError.message };
    }

    if (!userLink) {
      return {
        context: null,
        error:
          "This login is not connected to an institution. Please contact Festeazy admin.",
      };
    }

    const organization = Array.isArray(userLink.organizations)
      ? userLink.organizations[0]
      : userLink.organizations;

    if (!organization) {
      return {
        context: null,
        error: "Institution profile not found for this login.",
      };
    }

    /*
     * Festeazy uses one event per organization. The unique database index
     * created in Phase 1 guarantees that a second event cannot be added.
     */
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select(
        "id, title, public_slug, is_public, venue, start_date, end_date",
      )
      .eq("organization_id", userLink.organization_id)
      .maybeSingle();

    if (eventError) {
      return { context: null, error: eventError.message };
    }

    if (!eventData) {
      return {
        context: null,
        error: "No event workspace was found for this institution.",
      };
    }

    const context: AdminContext = {
      userId: user.id,
      email: user.email || "",
      role: String(userLink.role || "admin") as AdminRole,
      organizationId: organization.id,
      organizationName: organization.name || "",
      organizationSlug: organization.slug || "",
      organizationType: normalizeOrganizationType(
        organization.organization_type,
      ),
      organizationPhone: organization.phone || "",
      organizationEmail: organization.email || "",
      organizationPlace: organization.place || "",
      organizationLogoUrl: organization.logo_url || "",
      organizationStatus: organization.status || "active",
      planStart: organization.plan_start || "",
      planEnd: organization.plan_end || "",
      eventId: eventData.id,
      eventTitle: eventData.title || "",
      publicSlug: eventData.public_slug || "",
      eventIsPublic: Boolean(eventData.is_public),
      eventVenue: eventData.venue || "",
      eventStartDate: eventData.start_date || "",
      eventEndDate: eventData.end_date || "",
    };

    storeCache(context);
    return { context, error: null };
  })();

  try {
    return await pendingRequest;
  } finally {
    pendingRequest = null;
  }
}
