"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Crosshair, MapPinned, Pencil, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { checkServiceArea, createServiceArea, deleteServiceArea, extractError, getLaunchRequests, getServiceAreas, updateServiceArea } from "@/src/lib/api";
import type { LaunchRequest, LaunchRequestGroup, ServiceArea, ServiceAreaCheck } from "@/src/types/admin";

const ServiceAreaMap = dynamic(() => import("./service-area-map"), { ssr: false, loading: () => <div className="h-[430px] animate-pulse rounded-2xl bg-slate-100" /> });
type Draft = { id?: string; name: string; isActive: boolean; edgeToleranceMeters: number; polygon: Array<[number, number]> };
const emptyDraft: Draft = { name: "", isActive: true, edgeToleranceMeters: 150, polygon: [] };

export function ServiceAreasAdmin() {
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testLatitude, setTestLatitude] = useState("");
  const [testLongitude, setTestLongitude] = useState("");
  const [testingLocation, setTestingLocation] = useState(false);
  const [testResult, setTestResult] = useState<ServiceAreaCheck>();

  async function load() {
    setLoading(true);
    try { setAreas(await getServiceAreas()); } catch (error) { toast.error(extractError(error)); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  async function save() {
    if (draft.name.trim().length < 2 || draft.polygon.length < 3) return toast.error("Enter a name and draw at least three boundary points.");
    setSaving(true);
    try {
      const payload = { name: draft.name.trim(), isActive: draft.isActive, edgeToleranceMeters: Number(draft.edgeToleranceMeters), polygon: draft.polygon };
      if (draft.id) await updateServiceArea(draft.id, payload); else await createServiceArea(payload);
      toast.success(draft.id ? "Service area updated" : "Service area created");
      setDraft(emptyDraft);
      await load();
    } catch (error) { toast.error(extractError(error)); } finally { setSaving(false); }
  }

  async function testLocation(latitude = Number(testLatitude), longitude = Number(testLongitude)) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      toast.error("Enter valid latitude and longitude values.");
      return;
    }
    setTestingLocation(true);
    setTestResult(undefined);
    try {
      setTestResult(await checkServiceArea(latitude, longitude));
      setTestLatitude(String(latitude));
      setTestLongitude(String(longitude));
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setTestingLocation(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) return toast.error("Location is not supported by this browser.");
    setTestingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => void testLocation(position.coords.latitude, position.coords.longitude),
      () => {
        setTestingLocation(false);
        toast.error("Allow location access in the browser and try again.");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black text-slate-900">Service Areas</h1><p className="mt-1 text-sm text-slate-500">GPS polygons are the only source of truth for customer and partner eligibility.</p></div><button onClick={() => void load()} className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold"><RefreshCw size={16} /> Refresh</button></div>
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <div className="space-y-3 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2"><MapPinned className="text-orange-500" /><h2 className="text-lg font-extrabold">{draft.id ? "Edit area" : "Draw a new area"}</h2></div>
          <label className="block text-sm font-bold">Area name<input className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Janakpuri" /></label>
          <label className="block text-sm font-bold">Boundary tolerance (metres)<input type="number" min={0} max={5000} className="mt-2 w-full rounded-xl border px-3 py-2.5 font-normal" value={draft.edgeToleranceMeters} onChange={(event) => setDraft({ ...draft, edgeToleranceMeters: Number(event.target.value) })} /></label>
          <label className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-sm font-bold"><span>Area active</span><input type="checkbox" className="h-5 w-5 accent-orange-500" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} /></label>
          <div className="text-xs text-slate-500">{draft.polygon.length} boundary point{draft.polygon.length === 1 ? "" : "s"}</div>
          <button disabled={saving} onClick={() => void save()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 font-black text-white disabled:opacity-50"><Plus size={17} /> {saving ? "Saving…" : draft.id ? "Save changes" : "Create service area"}</button>
          {draft.id ? <button onClick={() => setDraft(emptyDraft)} className="w-full rounded-xl border px-4 py-2.5 font-bold">Cancel editing</button> : null}
          <div className="border-t pt-3"><h3 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">Configured areas</h3>{loading ? <p className="text-sm text-slate-500">Loading…</p> : areas.map((area) => <div key={area.id} className="mb-2 rounded-xl border p-3"><div className="flex items-start justify-between gap-2"><div><div className="font-extrabold">{area.name}</div><div className="text-xs text-slate-500">{area.isActive ? "Active" : "Inactive"} · {area.edgeToleranceMeters}m tolerance</div></div><div className="flex gap-1"><button aria-label={`Edit ${area.name}`} className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setDraft({ ...area })}><Pencil size={15} /></button><button aria-label={`Delete ${area.name}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50" onClick={() => { if (!confirm(`Delete ${area.name}?`)) return; void deleteServiceArea(area.id).then(load).catch((error) => toast.error(extractError(error))); }}><Trash2 size={15} /></button></div></div></div>)}</div>
          <div className="border-t pt-4">
            <div className="flex items-center gap-2"><Crosshair className="text-orange-500" size={19} /><h3 className="font-extrabold">Test a location</h3></div>
            <p className="mt-1 text-xs leading-5 text-slate-500">Check exactly what customers and partners will see without changing a service area.</p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Latitude<input inputMode="decimal" className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" value={testLatitude} onChange={(event) => setTestLatitude(event.target.value)} placeholder="28.62" /></label>
              <label className="text-xs font-bold text-slate-600">Longitude<input inputMode="decimal" className="mt-1 w-full rounded-xl border px-3 py-2.5 text-sm font-normal" value={testLongitude} onChange={(event) => setTestLongitude(event.target.value)} placeholder="77.08" /></label>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <button disabled={testingLocation} onClick={() => void testLocation()} className="rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-black text-white disabled:opacity-50">{testingLocation ? "Checking..." : "Check coordinates"}</button>
              <button disabled={testingLocation} onClick={useCurrentLocation} className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-black disabled:opacity-50"><Crosshair size={15} /> Use my location</button>
            </div>
            {testResult ? <div className={`mt-3 flex items-start gap-3 rounded-xl p-3 text-sm ${testResult.available ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{testResult.available ? <CheckCircle2 className="mt-0.5 shrink-0" size={18} /> : <XCircle className="mt-0.5 shrink-0" size={18} />}<div><div className="font-black">{testResult.available ? "Serviceable location" : "Outside every active area"}</div>{testResult.serviceArea ? <div className="mt-0.5 text-xs">Matched: {testResult.serviceArea.name}</div> : null}</div></div> : null}
          </div>
        </div>
        <ServiceAreaMap points={draft.polygon} onChange={(polygon) => setDraft({ ...draft, polygon })} existingAreas={areas.filter((area) => area.id !== draft.id)} />
      </div>
    </div>
  );
}

export function LaunchRequestsAdmin() {
  const [rows, setRows] = useState<LaunchRequest[]>([]);
  const [groups, setGroups] = useState<LaunchRequestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() { setLoading(true); try { const data = await getLaunchRequests(); setRows(data.requests); setGroups(data.grouped); } catch (error) { toast.error(extractError(error)); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const roleCounts = useMemo(() => rows.reduce<Record<string, number>>((result, row) => ({ ...result, [row.role]: (result[row.role] ?? 0) + 1 }), {}), [rows]);
  return <div className="space-y-6"><div className="flex items-center justify-between"><div><h1 className="text-3xl font-black">Launch Requests</h1><p className="mt-1 text-sm text-slate-500">Demand is grouped into approximate GPS cells for analytics only.</p></div><button className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-bold" onClick={() => void load()}><RefreshCw size={16} /> Refresh</button></div><div className="grid gap-4 md:grid-cols-4"><Metric label="Total requests" value={rows.length} />{Object.entries(roleCounts).map(([role, count]) => <Metric key={role} label={role.replaceAll("_", " ")} value={count} />)}</div><div className="grid gap-6 xl:grid-cols-2"><section className="rounded-3xl border bg-white p-5"><h2 className="mb-4 text-lg font-extrabold">Demand hotspots</h2>{loading ? "Loading…" : groups.map((group) => <div key={group._id} className="flex items-center justify-between border-b py-3 last:border-0"><div><div className="font-bold">{group.areaLabel || `GPS cell ${group._id}`}</div><div className="text-xs text-slate-500">Latest {new Date(group.latestRequestAt).toLocaleString()}</div></div><span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-black text-orange-700">{group.count}</span></div>)}</section><section className="overflow-hidden rounded-3xl border bg-white"><div className="p-5 text-lg font-extrabold">Recent requests</div><div className="max-h-[560px] overflow-auto">{rows.map((row) => <div key={row.id} className="border-t p-4 text-sm"><div className="flex justify-between gap-4"><span className="font-bold">{row.phone}</span><span className="text-slate-500">{row.role.replaceAll("_", " ")}</span></div><div className="mt-1 text-xs text-slate-500">{row.latitude.toFixed(5)}, {row.longitude.toFixed(5)} · {new Date(row.lastRequestedAt ?? row.createdAt ?? "").toLocaleString()}</div></div>)}</div></section></div></div>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border bg-white p-5"><div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-3xl font-black">{value}</div></div>; }
