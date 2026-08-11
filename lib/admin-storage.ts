import { supabase } from "@/lib/supabase";

export type AdminStorageAssetType =
  | "organization_logo"
  | "event_hero"
  | "team_logo"
  | "poster_template"
  | "poster_ad_banner"
  | "milestone_template"
  | "certificate_preview"
  | "gallery_image";

export type AdminStorageAsset = {
  bucket: string;
  path: string;
  publicUrl: string;
  displayUrl: string;
};

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Login session expired. Please login again.");
  }

  return session.access_token;
}

export async function uploadAdminStorageAsset(options: {
  file: File | Blob;
  assetType: AdminStorageAssetType;
  filename?: string;
}) {
  const token = await getAccessToken();
  const formData = new FormData();

  formData.append("assetType", options.assetType);
  formData.append(
    "file",
    options.file,
    options.filename || (options.file instanceof File ? options.file.name : "image.webp"),
  );

  const response = await fetch("/api/admin/storage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || "File upload failed.");
  }

  return payload.asset as AdminStorageAsset;
}

export async function deleteAdminStorageAsset(options: {
  bucket?: string | null;
  path?: string | null;
  url?: string | null;
}) {
  if (!options.bucket && !options.path && !options.url) return;

  const token = await getAccessToken();
  const response = await fetch("/api/admin/storage", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(options),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload?.error || "Stored file could not be deleted.");
  }

  return payload;
}
