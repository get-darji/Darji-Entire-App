"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus, Pencil, Plus, Trash2 } from "lucide-react";
import { extractError, createPromotionalBanner, listPromotionalBanners, removePromotionalBanner, reorderPromotionalBanners, savePromotionalBanner, uploadPromotionalBannerImage, type PromotionalBannerInput, type PromotionalBannerRecord } from "@/src/lib/api";

type Draft = PromotionalBannerInput & { id?: string };
const emptyDraft = (): Draft => ({ title: "", imageUrl: "", imagePublicId: "", altText: "", active: false, priority: 1, category: "GENERAL", actionType: "NONE", actionDestination: "", startsAt: null, expiresAt: null, requiredFestivalMode: "" });
const presets = [
  { title: "Darji Diwali Offers", altText: "Diwali offers for Darji customers", category: "FESTIVAL" as const, actionType: "COUPONS" as const, actionDestination: "", requiredFestivalMode: "diwali", priority: 1 },
  { title: "Free Delivery on First Order", altText: "Free delivery offer for eligible first orders. Terms and conditions apply.", category: "OFFER" as const, actionType: "TAILORING_REQUEST" as const, actionDestination: "", requiredFestivalMode: "", priority: 2 },
  { title: "More Exciting Offers", altText: "Contact Darji to learn about more offers", category: "GENERAL" as const, actionType: "CONTACT" as const, actionDestination: "", requiredFestivalMode: "", priority: 3 }
];

function localDate(value?: string | null) { return value ? new Date(value).toISOString().slice(0, 16) : ""; }
function bannerStatusLabel(status: PromotionalBannerRecord["status"]) { return status[0] + status.slice(1).toLowerCase(); }
function encodeWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

export function PromotionalBannerManager() {
  const queryClient = useQueryClient();
  const banners = useQuery({ queryKey: ["promotional-banners"], queryFn: listPromotionalBanners });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceFileName, setSourceFileName] = useState("");
  const [fileInfo, setFileInfo] = useState<{ width: number; height: number; originalSize: number } | null>(null);
  const [fileError, setFileError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loadingStarter, setLoadingStarter] = useState(false);
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["promotional-banners"] });

  const save = useMutation({
    mutationFn: async (value: Draft) => {
      let imageUrl = value.imageUrl;
      let imagePublicId = value.imagePublicId ?? "";
      if (file) {
        setUploading(true);
        const uploaded = await uploadPromotionalBannerImage(file);
        imageUrl = uploaded.url; imagePublicId = uploaded.publicId;
      }
      if (!imageUrl) throw new Error("Choose a banner image before saving.");
      const payload = { ...value, imageUrl, imagePublicId, startsAt: value.startsAt ? new Date(value.startsAt).toISOString() : null, expiresAt: value.expiresAt ? new Date(value.expiresAt).toISOString() : null };
      return value.id ? savePromotionalBanner({ ...payload, id: value.id }) : createPromotionalBanner(payload);
    },
    onSuccess: () => { toast.success("Promotional banner saved"); setDraft(null); setFile(null); setFileInfo(null); refresh(); },
    onError: (error) => toast.error(extractError(error)),
    onSettled: () => setUploading(false)
  });
  const remove = useMutation({ mutationFn: removePromotionalBanner, onSuccess: () => { toast.success("Banner deleted"); refresh(); }, onError: (error) => toast.error(extractError(error)) });
  const reorder = useMutation({ mutationFn: reorderPromotionalBanners, onSuccess: refresh, onError: (error) => toast.error(extractError(error)) });

  const startEdit = (banner?: PromotionalBannerRecord) => {
    setFile(null); setSourceFileName(""); setFileInfo(null); setFileError("");
    setDraft(banner ? { ...banner, startsAt: localDate(banner.startsAt), expiresAt: localDate(banner.expiresAt), requiredFestivalMode: banner.requiredFestivalMode ?? "" } : { ...emptyDraft(), priority: (banners.data?.length ?? 0) + 1 });
  };
  const selectFile = async (selected?: File) => {
    setFileError(""); setFile(null); setSourceFileName(""); setFileInfo(null);
    if (!selected) return;
    if (!("image/png,image/jpeg,image/webp".split(",").includes(selected.type))) { setFileError("Choose a PNG, JPG, JPEG, or WebP image."); return; }
    try {
      const bitmap = await createImageBitmap(selected);
      const { width, height } = bitmap; bitmap.close();
      if (width < 1000 || height < 400) { setFileError(`Minimum dimensions are 1000 × 400 px. Selected: ${width} × ${height}.`); return; }
      if (Math.abs(width / height - 2.5) > 0.18) { setFileError(`Use an image close to 2.5:1. Selected: ${width} × ${height}.`); return; }
      const image = await createImageBitmap(selected);
      const scale = Math.min(1500 / width, 600 / height, 1);
      const canvas = document.createElement("canvas"); canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image optimization is unavailable in this browser.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height); image.close();
      let optimizedBlob: Blob | null = null;
      for (const quality of [0.88, 0.8, 0.72, 0.64]) {
        optimizedBlob = await encodeWebp(canvas, quality);
        if (optimizedBlob && optimizedBlob.size <= 2 * 1024 * 1024) break;
      }
      if (!optimizedBlob || optimizedBlob.size > 2 * 1024 * 1024) { setFileError("The optimized image is still over 2 MB. Choose a simpler image."); return; }
      setFile(new File([optimizedBlob], selected.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" }));
      setSourceFileName(selected.name);
      setFileInfo({ width, height, originalSize: selected.size });
    } catch { setFileError("The selected file could not be decoded as an image."); }
  };
  const loadStarterImage = async (index: number) => {
    const names = ["diwali.webp", "free-delivery.webp", "more-offers.webp"];
    setLoadingStarter(true);
    try {
      const response = await fetch(`/promotional-banners/${names[index]}`);
      if (!response.ok) throw new Error("The suggested image could not be loaded.");
      const blob = await response.blob();
      await selectFile(new File([blob], names[index], { type: "image/webp" }));
    } catch (error) { setFileError(extractError(error)); }
    finally { setLoadingStarter(false); }
  };

  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-bold">Promotional Banners</h2><p className="mt-1 text-sm text-[var(--muted)]">Manage the carousel shown on the Customer App home screen.</p></div><div className="flex flex-wrap gap-2"><select aria-label="Create a starter banner" className="h-10 rounded-xl border border-[var(--panel-border)] bg-white px-3 text-sm" defaultValue="" onChange={(event) => { const value = event.target.value; if (value !== "") { const index = Number(value); const preset = presets[index]; setDraft({ ...emptyDraft(), ...preset }); setFile(null); setSourceFileName(""); setFileInfo(null); setFileError(""); void loadStarterImage(index); } event.target.value = ""; }}><option value="" disabled>Add a suggested banner…</option>{presets.map((preset, index) => <option key={preset.title} value={index}>{preset.title}</option>)}</select><button className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-bold text-white" onClick={() => startEdit()} type="button"><Plus size={16} /> Add banner</button></div></div>

    {draft ? <section className="grid gap-5 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between"><h3 className="font-bold">{draft.id ? "Edit banner" : "New banner"}</h3><button className="text-sm text-[var(--muted)] underline" onClick={() => { setDraft(null); setFile(null); }} type="button">Cancel</button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold">Banner title<input className="mt-1 h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3 font-normal" maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
          <label className="text-sm font-semibold">Accessibility description<input className="mt-1 h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3 font-normal" maxLength={240} value={draft.altText} onChange={(e) => setDraft({ ...draft, altText: e.target.value })} /></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[var(--panel-border)] bg-white p-3 text-sm"><ImagePlus size={20} className="text-orange-600" /><span><b>{file ? "Replace selected image" : "Choose banner image"}</b><span className="mt-1 block text-xs text-[var(--muted)]">PNG, JPG, JPEG or WebP · maximum 2 MB</span></span><input className="sr-only" accept="image/png,image/jpeg,image/webp" type="file" onChange={(e) => void selectFile(e.target.files?.[0])} /></label>
          <label className="text-sm font-semibold">Display priority<input className="mt-1 h-11 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3 font-normal" type="number" min={1} max={10000} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} /></label>
        </div>
        <p className="-mt-2 text-xs text-[var(--muted)]">Recommended: 1500 × 600 px (2.5:1). PNG, JPG or WebP. Maximum 2 MB. Keep important text away from the edges. Images are optimized as WebP before upload.</p>
        {fileInfo && file ? <p className="text-xs text-[var(--muted)]">{sourceFileName} · {fileInfo.width} × {fileInfo.height} px · {(fileInfo.originalSize / 1024).toFixed(0)} KB source → {(file.size / 1024).toFixed(0)} KB WebP ({file.type.split("/")[1]?.toUpperCase()})</p> : null}
        {fileError ? <p role="alert" className="text-sm text-rose-700">{fileError}</p> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold">Category<select className="mt-1 h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3 font-normal" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as Draft["category"] })}>{[["GENERAL", "General"], ["FESTIVAL", "Festival"], ["OFFER", "Offer"], ["ANNOUNCEMENT", "Announcement"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="text-sm font-semibold">Click action<select className="mt-1 h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3 font-normal" value={draft.actionType} onChange={(e) => setDraft({ ...draft, actionType: e.target.value as Draft["actionType"], actionDestination: "" })}>{[["NONE", "No action"], ["SCREEN", "Customer App screen"], ["COUPONS", "Coupons / Offers"], ["TAILORING_REQUEST", "Start tailoring request"], ["EXTERNAL_URL", "External URL"], ["CONTACT", "Contact Darji"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="text-sm font-semibold">Festival requirement<select className="mt-1 h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3 font-normal" value={draft.requiredFestivalMode} onChange={(e) => setDraft({ ...draft, requiredFestivalMode: e.target.value })}><option value="">Always eligible</option><option value="diwali">Diwali mode</option></select></label>
        </div>
        {draft.actionType === "SCREEN" ? <label className="block text-sm font-semibold">Customer App screen<select className="mt-1 h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3 font-normal" value={draft.actionDestination} onChange={(e) => setDraft({ ...draft, actionDestination: e.target.value })}><option value="">Select a screen</option>{[["search", "Search"], ["orders", "Orders"], ["profile", "Profile"], ["savedAddresses", "Addresses"], ["services", "Services"], ["helpCenter", "Help center"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label> : null}
        {draft.actionType === "EXTERNAL_URL" ? <label className="block text-sm font-semibold">HTTPS destination<input className="mt-1 h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3 font-normal" type="url" placeholder="https://example.com/offer" value={draft.actionDestination} onChange={(e) => setDraft({ ...draft, actionDestination: e.target.value })} /></label> : null}
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-semibold">Start date and time (optional)<input className="mt-1 h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3 font-normal" type="datetime-local" value={draft.startsAt ?? ""} onChange={(e) => setDraft({ ...draft, startsAt: e.target.value || null })} /></label><label className="text-sm font-semibold">Expiry date and time (optional)<input className="mt-1 h-10 w-full rounded-xl border border-[var(--panel-border)] bg-white px-3 font-normal" type="datetime-local" value={draft.expiresAt ?? ""} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value || null })} /></label></div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} type="checkbox" /> Enabled</label>
        <button className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50" disabled={save.isPending || uploading || loadingStarter || !draft.title.trim() || !draft.altText.trim() || Boolean(fileError)} onClick={() => save.mutate(draft)} type="button">{loadingStarter ? "Preparing image…" : uploading ? "Uploading…" : save.isPending ? "Saving…" : "Save banner"}</button>
      </div>
      <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Customer App preview</p><div className="mx-auto w-full max-w-[300px] overflow-hidden rounded-[22px] border-[6px] border-slate-900 bg-white p-2 shadow-lg"><div className="mb-2 flex justify-center"><span className="h-1 w-12 rounded-full bg-slate-300" /></div>{previewUrl || draft.imageUrl ? <img alt={draft.altText || "Banner preview"} className="aspect-[2.5/1] w-full rounded-xl object-contain" src={previewUrl || draft.imageUrl} /> : <div className="flex aspect-[2.5/1] items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-500">Select a banner image</div>}<p className="px-1 py-2 text-xs text-slate-500">Home · Offers</p></div></div>
    </section> : null}

    {banners.isLoading ? <div className="rounded-2xl border border-[var(--panel-border)] p-6 text-sm text-[var(--muted)]">Loading banners…</div> : null}
    {banners.isError ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Could not load banners. {extractError(banners.error)} <button className="ml-2 underline" onClick={() => void banners.refetch()}>Try again</button></div> : null}
    {(banners.data ?? []).map((banner, index, items) => <article key={banner.id} className="grid gap-3 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-3 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center sm:p-4">
      <img alt={banner.altText} className="aspect-[2.5/1] w-full rounded-xl bg-slate-100 object-contain sm:w-[150px]" src={banner.imageUrl} />
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{banner.title}</h3><span className={`rounded-full px-2 py-1 text-xs font-bold ${banner.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : banner.status === "SCHEDULED" ? "bg-blue-100 text-blue-800" : banner.status === "EXPIRED" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{bannerStatusLabel(banner.status)}</span></div><p className="mt-1 text-xs text-[var(--muted)]">Priority {banner.priority} · {banner.startsAt ? new Date(banner.startsAt).toLocaleString() : "No start"} · {banner.expiresAt ? new Date(banner.expiresAt).toLocaleString() : "No expiry"} · {banner.requiredFestivalMode || "Any festival state"}</p></div>
      <div className="flex flex-wrap gap-1"><button aria-label="Move up" className="rounded-lg p-2 hover:bg-black/5 disabled:opacity-30" disabled={index === 0 || reorder.isPending} onClick={() => void reorder.mutateAsync(items.map((item) => item.id).filter((id) => id !== banner.id).flatMap((id, i, arr) => i === index - 1 ? [banner.id, id] : [id]).slice(0, items.length))} type="button"><ArrowUp size={16} /></button><button aria-label="Move down" className="rounded-lg p-2 hover:bg-black/5 disabled:opacity-30" disabled={index === items.length - 1 || reorder.isPending} onClick={() => { const ids = items.map((item) => item.id); [ids[index], ids[index + 1]] = [ids[index + 1]!, ids[index]!]; void reorder.mutate(ids); }} type="button"><ArrowDown size={16} /></button><button aria-label="Edit banner" className="rounded-lg p-2 hover:bg-black/5" onClick={() => startEdit(banner)} type="button"><Pencil size={16} /></button><button aria-label="Delete banner" className="rounded-lg p-2 text-rose-700 hover:bg-rose-50" onClick={() => { if (window.confirm(`Delete “${banner.title}”?`)) remove.mutate(banner.id); }} type="button"><Trash2 size={16} /></button><button className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs font-bold" onClick={() => save.mutate({ ...banner, active: !banner.active })} type="button">{banner.active ? "Disable" : "Enable"}</button></div>
    </article>)}
    {!banners.isLoading && !banners.isError && (banners.data?.length ?? 0) === 0 ? <div className="rounded-2xl border border-dashed border-[var(--panel-border)] p-8 text-center text-sm text-[var(--muted)]">No promotional banners yet. Add one or choose a suggested banner to get started.</div> : null}
  </div>;
}
