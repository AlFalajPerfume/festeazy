import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient, type User } from "@supabase/supabase-js";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export type OrganizationType = "madrasa" | "school" | "institution";

export type SuperAdminAuthResult = {
  user: User;
  token: string;
};

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) return "";

  return authorization.slice(7).trim();
}

export async function requireSuperAdmin(
  request: NextRequest,
): Promise<SuperAdminAuthResult> {
  const token = getBearerToken(request);

  if (!token) {
    throw new SuperAdminRequestError(
      "Super Admin authentication is required.",
      401,
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new SuperAdminRequestError(
      "Supabase server environment variables are missing.",
      500,
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
    throw new SuperAdminRequestError(
      "Your Super Admin session is invalid or expired.",
      401,
    );
  }

  const { data: superAdmin, error: superAdminError } = await supabaseAdmin
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (superAdminError) {
    throw new SuperAdminRequestError(superAdminError.message, 500);
  }

  if (!superAdmin) {
    throw new SuperAdminRequestError(
      "Only a registered FestEazy Super Admin can perform this action.",
      403,
    );
  }

  return { user, token };
}

export class SuperAdminRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "SuperAdminRequestError";
    this.status = status;
  }
}

export function getRequestErrorResponse(error: unknown) {
  if (error instanceof SuperAdminRequestError) {
    return {
      message: error.message,
      status: error.status,
    };
  }

  return {
    message:
      error instanceof Error ? error.message : "Unexpected server error.",
    status: 500,
  };
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeOrganizationType(value: unknown): OrganizationType {
  const text = String(value || "").trim().toLowerCase();

  if (text === "school") return "school";
  if (text === "institution") return "institution";
  return "madrasa";
}

export function getOrganizationLabel(type: OrganizationType) {
  if (type === "school") return "School";
  if (type === "institution") return "Institution";
  return "Madrasa";
}

export function isValidActionPin(pin: string) {
  return /^\d{6}$/.test(pin);
}

export function hashActionPin(pin: string) {
  if (!isValidActionPin(pin)) {
    throw new SuperAdminRequestError(
      "The action PIN must contain exactly 6 digits.",
      400,
    );
  }

  const salt = randomBytes(24).toString("hex");
  const hash = scryptSync(pin, salt, 64).toString("hex");

  return { salt, hash };
}

export function verifyActionPin(pin: string, salt: string, expectedHash: string) {
  if (!isValidActionPin(pin)) return false;

  const actual = scryptSync(pin, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) return false;

  return timingSafeEqual(actual, expected);
}

export function addMonthsToIsoDate(value: string, months: number) {
  const date = parseIsoDate(value);

  if (!date) return "";

  const originalDay = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);

  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();

  date.setUTCDate(Math.min(originalDay, lastDay));

  return formatIsoDate(date);
}

export function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatIsoDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function todayIsoDate() {
  const now = new Date();
  return formatIsoDate(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
  );
}
