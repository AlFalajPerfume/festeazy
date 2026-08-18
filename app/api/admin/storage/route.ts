import {
  apiError,
  authorizeInstitutionAdmin,
} from "@/lib/admin-api-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_BUCKETS = new Set([
  "organization-logos",
  "event-assets",
  "poster-templates",
  "gallery-images",
]);

const ASSET_RULES = {
  organization_logo: {
    bucket: "organization-logos",
    folder: "",
    maxBytes: 5 * 1024 * 1024,
  },
  event_hero: {
    bucket: "event-assets",
    folder: "hero",
    maxBytes: 8 * 1024 * 1024,
  },
  team_logo: {
    bucket: "event-assets",
    folder: "team-logos",
    maxBytes: 5 * 1024 * 1024,
  },
  poster_template: {
    bucket: "poster-templates",
    folder: "templates",
    maxBytes: 12 * 1024 * 1024,
  },
  poster_ad_banner: {
    bucket: "poster-templates",
    folder: "ad-banners",
    maxBytes: 8 * 1024 * 1024,
  },
  milestone_template: {
    bucket: "poster-templates",
    folder: "milestone-templates",
    maxBytes: 12 * 1024 * 1024,
  },
  milestone_logo: {
    bucket: "poster-templates",
    folder: "milestone-logos",
    maxBytes: 5 * 1024 * 1024,
  },
  certificate_preview: {
    bucket: "poster-templates",
    folder: "certificate-preview",
    maxBytes: 10 * 1024 * 1024,
  },
  gallery_image: {
    bucket: "gallery-images",
    folder: "gallery",
    maxBytes: 12 * 1024 * 1024,
  },
} as const;

type AssetType = keyof typeof ASSET_RULES;

function safeFilename(value: string) {
  const normalized = String(value || "image")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");

  return normalized || "image";
}

function extensionForMime(mime: string, fallbackName: string) {
  if (mime === "image/webp") return "webp";
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/gif") return "gif";

  const fallback = fallbackName.split(".").pop()?.toLowerCase();
  return fallback && /^[a-z0-9]{2,5}$/.test(fallback) ? fallback : "bin";
}

function parsePublicStorageUrl(urlValue: string) {
  try {
    const url = new URL(urlValue);
    const markers = [
      "/storage/v1/object/public/",
      "/storage/v1/object/sign/",
      "/storage/v1/object/authenticated/",
    ];

    for (const marker of markers) {
      const markerIndex = url.pathname.indexOf(marker);
      if (markerIndex === -1) continue;

      const remainder = decodeURIComponent(
        url.pathname.slice(markerIndex + marker.length),
      ).replace(/^\/+/, "");
      const slashIndex = remainder.indexOf("/");
      if (slashIndex <= 0) return null;

      return {
        bucket: remainder.slice(0, slashIndex),
        path: remainder.slice(slashIndex + 1),
      };
    }
  } catch {
    return null;
  }

  return null;
}

function assertOwnedPath(path: string, organizationId: string) {
  const cleanPath = path.replace(/^\/+/, "");
  if (!cleanPath.startsWith(`${organizationId}/`)) {
    throw new Error("The requested storage object does not belong to this institution.");
  }
  return cleanPath;
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeInstitutionAdmin(request);
  if (authorization.response) return authorization.response;

  try {
    const formData = await request.formData();
    const assetType = String(formData.get("assetType") || "") as AssetType;
    const file = formData.get("file");
    const rule = ASSET_RULES[assetType];

    if (!rule) return apiError("Unsupported storage asset type.", 400);
    if (!(file instanceof File)) return apiError("Choose an image file.", 400);
    if (!file.type.startsWith("image/")) {
      return apiError("Only image files are allowed.", 400);
    }
    if (file.size <= 0) return apiError("The selected file is empty.", 400);
    if (file.size > rule.maxBytes) {
      return apiError(
        `The selected file is too large. Maximum size is ${Math.round(
          rule.maxBytes / 1024 / 1024,
        )} MB.`,
        400,
      );
    }

    const originalName = safeFilename(file.name || "image");
    const extension = extensionForMime(file.type, originalName);
    const stem = originalName.replace(/\.[^.]+$/, "").slice(0, 80) || "image";
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}-${stem}.${extension}`;

    const baseFolder =
      assetType === "organization_logo"
        ? authorization.admin.organizationId
        : `${authorization.admin.organizationId}/${authorization.admin.eventId}`;
    const filePath = [baseFolder, rule.folder, uniqueName]
      .filter(Boolean)
      .join("/");

    const { error: uploadError } = await supabaseAdmin.storage
      .from(rule.bucket)
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      return apiError(uploadError.message || "Storage upload failed.", 500);
    }

    const { data: publicData } = supabaseAdmin.storage
      .from(rule.bucket)
      .getPublicUrl(filePath);
    const publicUrl = publicData.publicUrl;

    return NextResponse.json({
      success: true,
      asset: {
        bucket: rule.bucket,
        path: filePath,
        publicUrl,
        displayUrl: `${publicUrl}?v=${Date.now()}`,
      },
    });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "Storage upload failed.",
      500,
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authorization = await authorizeInstitutionAdmin(request);
  if (authorization.response) return authorization.response;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      bucket?: string | null;
      path?: string | null;
      url?: string | null;
    };

    let bucket = String(body.bucket || "").trim();
    let path = String(body.path || "").trim();

    if ((!bucket || !path) && body.url) {
      const parsed = parsePublicStorageUrl(String(body.url));
      if (parsed) {
        bucket = parsed.bucket;
        path = parsed.path;
      }
    }

    if (!bucket || !path) {
      return apiError("A valid storage bucket and object path are required.", 400);
    }
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return apiError("This storage bucket is not managed by FestEazy.", 403);
    }

    const ownedPath = assertOwnedPath(path, authorization.admin.organizationId);
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([ownedPath]);

    if (error) return apiError(error.message || "File deletion failed.", 500);

    return NextResponse.json({
      success: true,
      bucket,
      path: ownedPath,
      removed: data || [],
    });
  } catch (error) {
    return apiError(
      error instanceof Error ? error.message : "File deletion failed.",
      500,
    );
  }
}
