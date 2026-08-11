import { supabaseAdmin } from "@/lib/supabase-admin";

export type ManagedStorageObject = {
  bucket: string;
  path: string;
  size: number | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type OrganizationStorageHealth = {
  generatedAt: string;
  totalFiles: number;
  referencedFiles: number;
  orphanFiles: number;
  totalBytes: number;
  orphanBytes: number;
  orphans: ManagedStorageObject[];
};

export function storageAssetKey(bucket: string, path: string) {
  return `${bucket}:${path.replace(/^\/+/, "")}`;
}

export function parseSupabaseStorageUrl(value: unknown) {
  const text = String(value || "").trim();
  if (!text || text.startsWith("/")) return null;

  try {
    const url = new URL(text);
    const markers = [
      "/storage/v1/object/public/",
      "/storage/v1/object/sign/",
      "/storage/v1/object/authenticated/",
    ];

    for (const marker of markers) {
      const index = url.pathname.indexOf(marker);
      if (index === -1) continue;

      const remainder = decodeURIComponent(
        url.pathname.slice(index + marker.length),
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

export async function listManagedStorageFolder(bucket: string, root: string) {
  const objects: ManagedStorageObject[] = [];

  async function walk(path: string) {
    let offset = 0;

    while (true) {
      const { data, error } = await supabaseAdmin.storage.from(bucket).list(path, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        const message = String(error.message || "").toLowerCase();
        if (message.includes("bucket not found") || message.includes("not found")) {
          return;
        }
        throw new Error(`${bucket}/${path}: ${error.message}`);
      }

      const items = data || [];
      for (const item of items) {
        const itemPath = path ? `${path}/${item.name}` : item.name;
        if (item.metadata) {
          objects.push({
            bucket,
            path: itemPath,
            size: Number(item.metadata?.size || 0) || null,
            createdAt: item.created_at || null,
            updatedAt: item.updated_at || null,
          });
        } else {
          await walk(itemPath);
        }
      }

      if (items.length < 1000) break;
      offset += 1000;
    }
  }

  await walk(root.replace(/^\/+|\/+$/g, ""));
  return objects;
}

export async function getOrganizationStorageHealth(
  organizationId: string,
  eventId: string,
): Promise<OrganizationStorageHealth> {
  const references = new Set<string>();

  function addUrl(value: unknown) {
    const parsed = parseSupabaseStorageUrl(value);
    if (parsed) references.add(storageAssetKey(parsed.bucket, parsed.path));
  }

  function addPath(bucket: string, value: unknown) {
    const path = String(value || "").replace(/^\/+/, "").trim();
    if (path) references.add(storageAssetKey(bucket, path));
  }

  const [organizationRes, settingsRes, teamsRes, templatesRes, galleryRes, certificateRes] =
    await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("logo_url")
        .eq("id", organizationId)
        .maybeSingle(),
      supabaseAdmin
        .from("event_settings")
        .select("hero_image_url")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .maybeSingle(),
      supabaseAdmin
        .from("teams")
        .select("logo_url")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId),
      supabaseAdmin
        .from("poster_templates")
        .select("image_url, ad_banner_url")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId),
      supabaseAdmin
        .from("gallery_images")
        .select("image_url, storage_path")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId),
      supabaseAdmin
        .from("certificate_print_settings")
        .select("preview_template_url, preview_template_path")
        .eq("organization_id", organizationId)
        .eq("event_id", eventId)
        .maybeSingle(),
    ]);

  const firstError =
    organizationRes.error ||
    settingsRes.error ||
    teamsRes.error ||
    templatesRes.error ||
    galleryRes.error ||
    certificateRes.error;
  if (firstError) {
    throw new Error(firstError.message || "Unable to read stored asset references.");
  }

  addUrl(organizationRes.data?.logo_url);
  addUrl(settingsRes.data?.hero_image_url);
  (teamsRes.data || []).forEach((row) => addUrl(row.logo_url));
  (templatesRes.data || []).forEach((row) => {
    addUrl(row.image_url);
    addUrl(row.ad_banner_url);
  });
  (galleryRes.data || []).forEach((row) => {
    addUrl(row.image_url);
    addPath("gallery-images", row.storage_path);
  });
  addUrl(certificateRes.data?.preview_template_url);
  addPath("poster-templates", certificateRes.data?.preview_template_path);

  const folderResults = await Promise.all([
    listManagedStorageFolder("organization-logos", organizationId),
    listManagedStorageFolder("event-assets", `${organizationId}/${eventId}`),
    listManagedStorageFolder("poster-templates", `${organizationId}/${eventId}`),
    listManagedStorageFolder("gallery-images", `${organizationId}/${eventId}`),
  ]);

  const objects = folderResults.flat();
  const orphans = objects.filter(
    (item) => !references.has(storageAssetKey(item.bucket, item.path)),
  );
  const referencedObjects = objects.filter((item) =>
    references.has(storageAssetKey(item.bucket, item.path)),
  );

  return {
    generatedAt: new Date().toISOString(),
    totalFiles: objects.length,
    referencedFiles: referencedObjects.length,
    orphanFiles: orphans.length,
    totalBytes: objects.reduce((sum, item) => sum + Number(item.size || 0), 0),
    orphanBytes: orphans.reduce((sum, item) => sum + Number(item.size || 0), 0),
    orphans,
  };
}

export async function removeManagedStorageObjects(objects: ManagedStorageObject[]) {
  const byBucket = new Map<string, string[]>();

  for (const object of objects) {
    const paths = byBucket.get(object.bucket) || [];
    paths.push(object.path);
    byBucket.set(object.bucket, paths);
  }

  let removedCount = 0;
  for (const [bucket, paths] of byBucket.entries()) {
    for (let index = 0; index < paths.length; index += 1000) {
      const batch = paths.slice(index, index + 1000);
      const { error } = await supabaseAdmin.storage.from(bucket).remove(batch);
      if (error) throw new Error(`${bucket}: ${error.message}`);
      removedCount += batch.length;
    }
  }

  return removedCount;
}
