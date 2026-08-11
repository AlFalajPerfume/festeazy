/* eslint-disable */
"use client";

import AdminShell from "@/components/admin/AdminShell";
import { supabase } from "@/lib/supabase";
import {
  deleteAdminStorageAsset,
  uploadAdminStorageAsset,
} from "@/lib/admin-storage";
import {
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  RefreshCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";

type OrganizationUser = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
};

type EventInfo = {
  id: string;
  organization_id: string;
  title: string;
};

type GalleryImage = {
  id: string;
  organization_id: string;
  event_id: string;
  title: string | null;
  description: string | null;
  image_url: string;
  storage_path: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export default function GalleryAdminPage() {
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const activeCount = useMemo(
    () => images.filter((image) => image.is_active).length,
    [images],
  );

  async function loadData() {
    setIsLoading(true);
    setError("");
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Please login again.");
      setIsLoading(false);
      return;
    }

    const { data: orgUserData, error: orgUserError } = await supabase
      .from("organization_users")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (orgUserError) {
      setError(orgUserError.message);
      setIsLoading(false);
      return;
    }

    if (!orgUserData) {
      setError("This login is not connected to any madrasa.");
      setIsLoading(false);
      return;
    }

    const activeOrgUser = orgUserData as OrganizationUser;

    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .select("id, organization_id, title")
      .eq("organization_id", activeOrgUser.organization_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (eventError) {
      setError(eventError.message);
      setIsLoading(false);
      return;
    }

    if (!eventData) {
      setError("Event setup not found.");
      setIsLoading(false);
      return;
    }

    const activeEvent = eventData as EventInfo;
    setEventInfo(activeEvent);

    const { data: galleryData, error: galleryError } = await supabase
      .from("gallery_images")
      .select("*")
      .eq("event_id", activeEvent.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (galleryError) {
      setError(galleryError.message);
      setIsLoading(false);
      return;
    }

    setImages((galleryData || []) as GalleryImage[]);
    setIsLoading(false);
  }

  async function uploadImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!eventInfo) {
      setError("Event not found.");
      return;
    }

    if (!selectedFile) {
      setError("Please choose an image.");
      return;
    }

    setIsUploading(true);

    let uploadedAsset;

    try {
      uploadedAsset = await uploadAdminStorageAsset({
        file: selectedFile,
        assetType: "gallery_image",
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Gallery image upload failed.",
      );
      setIsUploading(false);
      return;
    }

    const { data: insertedData, error: insertError } = await supabase
      .from("gallery_images")
      .insert({
        organization_id: eventInfo.organization_id,
        event_id: eventInfo.id,
        title: title.trim() || selectedFile.name.replace(/\.[^/.]+$/, ""),
        description: description.trim() || null,
        image_url: uploadedAsset.publicUrl,
        storage_path: uploadedAsset.path,
        sort_order: Number(sortOrder || 1),
        is_active: true,
      })
      .select("*")
      .single();

    if (insertError) {
      await deleteAdminStorageAsset({
        bucket: uploadedAsset.bucket,
        path: uploadedAsset.path,
      }).catch(() => undefined);
      setError(insertError.message);
      setIsUploading(false);
      return;
    }

    setImages((current) => [insertedData as GalleryImage, ...current]);
    resetForm();
    setShowModal(false);
    setMessage("Gallery image uploaded successfully.");
    setIsUploading(false);
  }

  function resetForm() {
    setTitle("");
    setDescription("");
    setSortOrder(1);
    setSelectedFile(null);
  }

  async function toggleImage(image: GalleryImage) {
    setError("");
    setMessage("");

    const { data, error: updateError } = await supabase
      .from("gallery_images")
      .update({ is_active: !image.is_active })
      .eq("id", image.id)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setImages((current) =>
      current.map((item) => (item.id === image.id ? (data as GalleryImage) : item)),
    );
  }

  async function deleteImage(image: GalleryImage) {
    const confirmed = confirm("Delete this gallery image?");
    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("gallery_images")
      .delete()
      .eq("id", image.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await deleteAdminStorageAsset({
      bucket: "gallery-images",
      path: image.storage_path,
      url: image.image_url,
    });

    setImages((current) => current.filter((item) => item.id !== image.id));
    setMessage("Gallery image deleted.");
  }

  return (
    <AdminShell
      title="Gallery"
      subtitle="Upload event photos and show them on the public portal."
      actions={
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCcw size={17} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-900/20 hover:bg-violet-700"
          >
            <ImagePlus size={17} />
            Upload Photo
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Photos" value={images.length} />
          <StatCard label="Visible Photos" value={activeCount} />
          <StatCard label="Hidden Photos" value={images.length - activeCount} />
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em] text-slate-950">
                Gallery Photos
              </h2>
              <p className="mt-1 text-sm font-bold text-slate-500">
                These photos will appear in the public event gallery.
              </p>
            </div>

            {eventInfo && (
              <span className="rounded-2xl bg-violet-50 px-4 py-2 text-xs font-black text-violet-700">
                {eventInfo.title}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2 className="animate-spin text-violet-700" size={34} />
            </div>
          ) : images.length === 0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-50 text-violet-700">
                <Camera size={30} />
              </div>
              <h3 className="mt-5 text-2xl font-black tracking-[-0.05em] text-slate-950">
                No photos uploaded yet
              </h3>
              <p className="mt-2 max-w-md text-sm font-bold leading-6 text-slate-500">
                Upload event photos here. They will automatically show on the public gallery section.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-lg shadow-slate-900/5"
                >
                  <div className="relative h-60 bg-slate-100">
                    <img
                      src={image.image_url}
                      alt={image.title || "Gallery image"}
                      className="h-full w-full object-cover"
                    />

                    <span
                      className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] shadow-lg ${
                        image.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {image.is_active ? "Visible" : "Hidden"}
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black tracking-[-0.04em] text-slate-950">
                          {image.title || "Event Photo"}
                        </h3>

                        <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                          Sort Order: {image.sort_order}
                        </p>
                      </div>
                    </div>

                    {image.description && (
                      <p className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-slate-500">
                        {image.description}
                      </p>
                    )}

                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => toggleImage(image)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
                      >
                        {image.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                        {image.is_active ? "Hide" : "Show"}
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteImage(image)}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <form
            onSubmit={uploadImage}
            className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-black tracking-[-0.05em] text-slate-950">
                  Upload Gallery Photo
                </h2>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Add photos to the public event gallery.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowModal(false);
                }}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-black"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Photo Title
                </label>

                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Opening Ceremony"
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Description Optional
                </label>

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Short caption for this photo..."
                  className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Sort Order
                </label>

                <input
                  type="number"
                  min={1}
                  value={sortOrder}
                  onChange={(event) => setSortOrder(Number(event.target.value || 1))}
                  className="mt-2 h-14 w-full rounded-2xl border border-slate-200 px-4 text-sm font-bold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Image File
                </label>

                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setSelectedFile(file);

                    if (file && !title.trim()) {
                      setTitle(file.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-violet-900/20 disabled:opacity-60"
            >
              {isUploading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Upload size={18} />
              )}
              Upload Photo
            </button>
          </form>
        </div>
      )}
    </AdminShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-4xl font-black tracking-[-0.06em] text-slate-950">
        {value}
      </p>
    </div>
  );
}
