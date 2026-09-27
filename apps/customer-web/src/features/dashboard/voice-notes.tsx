"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Upload, Loader2 } from "lucide-react";
import { customerApi, errorMessage } from "@/src/lib/api";
import type { UploadedMedia } from "@/src/lib/types";
import { uiText as t } from "./customer-preferences";

export function VoiceNotes({ value, onChange }: { value: UploadedMedia[]; onChange: (notes: UploadedMedia[]) => void }) {
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; clearTimeout(timer.current); if (recorder.current?.state === "recording") recorder.current.stop(); recorder.current?.stream.getTracks().forEach((track) => track.stop()); }; }, []);
  async function upload(files: File[]) {
    if (!files.length || uploading) return;
    if (value.length + files.length > 3 || files.some((file) => !file.type.startsWith("audio/") || file.size > 10 * 1024 * 1024)) { setError("Add up to 3 voice notes, 10 MB each"); return; }
    setUploading(true); setError("");
    try { const rows = await customerApi.uploadMedia(files); if (mounted.current) onChange([...value, ...rows]); }
    catch (error) { if (mounted.current) setError(errorMessage(error)); }
    finally { if (mounted.current) setUploading(false); }
  }
  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") { setError("Recording is unavailable. Upload an audio file instead."); return; }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      const next = new MediaRecorder(stream); recorder.current = next;
      const chunks: Blob[] = [];
      next.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      next.onstop = () => {
        clearTimeout(timer.current); stream.getTracks().forEach((track) => track.stop());
        if (!mounted.current) return;
        setRecording(false);
        const type = next.mimeType || "audio/webm";
        const file = new File(chunks, `voice-note.${type.includes("mp4") ? "m4a" : "webm"}`, { type });
        void upload([file]);
      };
      next.start(); setRecording(true); timer.current = setTimeout(() => { if (next.state === "recording") next.stop(); }, 120000);
    } catch (error) { recorder.current?.stream.getTracks().forEach((track) => track.stop()); setError(errorMessage(error)); }
  }
  return <section className="space-y-3"><h3 className="font-bold">{t("Voice notes")}</h3><div className="flex flex-wrap gap-3"><button type="button" className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-3 disabled:opacity-50" disabled={uploading || value.length >= 3} onClick={() => recording ? recorder.current?.stop() : void start()}>{recording ? <Square size={18} className="text-red-600" /> : <Mic size={18} />}{t(recording ? "Stop recording" : "Record")}</button><label className="inline-flex items-center gap-2 rounded-lg border bg-white px-4 py-3"><Upload size={18} />{t("Upload audio")}<input type="file" className="sr-only" accept="audio/*" disabled={recording || uploading || value.length >= 3} onChange={(event) => { void upload(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></label>{uploading ? <Loader2 className="animate-spin" /> : null}</div>{value.map((note, index) => <div className="flex min-w-0 items-center gap-2" key={note.publicId}><audio controls src={note.url} className="min-w-0 flex-1" /><button title={t("Remove voice note")} disabled={recording || uploading} onClick={() => onChange(value.filter((_, i) => i !== index))}><Trash2 size={20} /></button></div>)}{error ? <p role="alert" className="text-sm text-red-700">{t(error)}</p> : null}</section>;
}
