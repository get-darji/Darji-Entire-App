"use client";

import { useDeferredValue, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { extractError, getOtpDeliveries, getOtpDeliveryCallbackSetup, type OtpDeliveryStatus, type OtpPeriod } from "../lib/api";

const periods: Array<{ key: OtpPeriod; label: string }> = [{ key: "24h", label: "Last 24 hours" }, { key: "7d", label: "Last 7 days" }, { key: "30d", label: "Last 30 days" }, { key: "lifetime", label: "Lifetime" }];

const labels: Record<OtpDeliveryStatus, string> = {
  PENDING: "Awaiting delivery report",
  DELIVERED: "Delivered · 2Factor report",
  FAILED: "Delivery failed",
  REJECTED: "Rejected by operator",
  REQUEST_FAILED: "Provider request failed"
};

function displayTime(value: string | null) {
  return value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" }) : "—";
}

export function OtpDeliveryPanel() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [period, setPeriod] = useState<OtpPeriod>("lifetime");
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const callbackSetup = useMutation({ mutationFn: getOtpDeliveryCallbackSetup, gcTime: 0, onSuccess: () => { setCopied(false); setCopyError(false); } });
  const searchPhone = useDeferredValue(phone);
  const history = useQuery({
    queryKey: ["admin", "otp-deliveries", searchPhone, status, period, page],
    queryFn: () => getOtpDeliveries({ phone: searchPhone || undefined, status: status || undefined, period, page, pageSize: 25 }),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    retry: 1
  });
  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h3 className="text-xl font-semibold">OTP SMS analytics</h3><p className="mt-1 text-sm text-[var(--muted)]">Select a period to see its destination numbers. Updates every 5 seconds. Sent totals count requests accepted by 2Factor; delivery reports confirm delivery separately.</p></div>
        <button className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm disabled:opacity-50" disabled={history.isFetching} onClick={() => void history.refetch()}>{history.isFetching ? "Updating…" : "Refresh"}</button>
      </div>
      {history.data ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{periods.map((item) => <button key={item.key} type="button" aria-pressed={period === item.key} className={`rounded-xl border p-4 text-left transition ${period === item.key ? "border-orange-400 bg-orange-50 ring-1 ring-orange-300" : "border-[var(--panel-border)] hover:bg-orange-50/50"}`} onClick={() => { setPeriod(item.key); setPage(1); setPhone(""); setStatus(""); }}><p className="text-sm text-[var(--muted)]">{item.label}</p><p className="mt-2 text-2xl font-semibold">{history.data.periodCounts[item.key].toLocaleString("en-IN")}</p><p className="mt-1 text-xs text-[var(--muted)]">SMS requests accepted · view numbers</p></button>)}</div> : null}
      <div className="mt-4 flex flex-wrap gap-3">
        <input aria-label="Search OTP destination number" className="h-10 rounded-xl border border-[var(--panel-border)] bg-transparent px-3 text-sm" placeholder="Search phone number" inputMode="numeric" value={phone} onChange={(event) => { setPhone(event.target.value.replace(/\D/g, "").slice(0, 10)); setPage(1); }} />
        <select aria-label="Filter OTP delivery status" className="h-10 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">All sent SMS</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
        <button className="h-10 rounded-xl border border-[var(--panel-border)] px-3 text-sm disabled:opacity-50" disabled={callbackSetup.isPending} onClick={() => callbackSetup.mutate()}>{callbackSetup.isPending ? "Loading setup…" : "Set up delivery reports"}</button>
      </div>
      {callbackSetup.data ? <div className="mt-4 rounded-xl border border-[var(--panel-border)] p-4">
        <p className="text-sm font-medium">Connect your 2Factor delivery reports</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Copy this private URL into the SMS OTP callback setting in your 2Factor account. Keep it private; it authenticates delivery reports.</p>
        <div className="mt-3 flex flex-wrap gap-2"><input aria-label="2Factor SMS OTP callback URL" className="min-w-0 flex-1 rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2 text-xs" value={callbackSetup.data.url} readOnly onFocus={(event) => event.currentTarget.select()} /><button className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm" onClick={async () => { if (!callbackSetup.data) return; try { await navigator.clipboard.writeText(callbackSetup.data.url); setCopied(true); setCopyError(false); } catch { setCopyError(true); } }}>{copied ? "Copied" : "Copy callback URL"}</button></div>
        {copyError ? <p className="mt-2 text-xs text-[var(--muted)]">Select the URL above and copy it manually.</p> : null}
        <p className="mt-2 text-xs text-[var(--muted)]">Register the copied URL in 2Factor to start receiving reports. Delivery is confirmed only when their report arrives.</p>
      </div> : null}
      {callbackSetup.isError ? <p className="mt-3 text-sm text-rose-700">Could not load callback setup: {extractError(callbackSetup.error)}</p> : null}
      {history.data ? <>
        {!history.data.callbackConfigured ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Delivery callback is not configured on the backend. Accepted requests will stay pending until 2Factor delivery reports are connected.</p> : null}
        <p className="mt-3 text-xs text-[var(--muted)]">{history.data.lastReportAt ? `Last provider delivery report received ${displayTime(history.data.lastReportAt)}.` : "No provider delivery report has arrived yet. The callback URL must also be registered in your 2Factor account."}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">{[
          ["Delivered", history.data.counts.DELIVERED],
          ["Awaiting report", history.data.counts.PENDING],
          ["Delivery failed / rejected", history.data.counts.FAILED + history.data.counts.REJECTED],
          ["Provider request failed", history.data.counts.REQUEST_FAILED]
        ].map(([label, count]) => <div className="rounded-xl border border-[var(--panel-border)] p-3" key={label}><p className="text-xs text-[var(--muted)]">{label} · {periods.find((item) => item.key === period)?.label}</p><p className="mt-1 text-xl font-semibold">{Number(count).toLocaleString("en-IN")}</p></div>)}</div>
        {period === "lifetime" && history.data.legacyAcceptedWithoutDetails > 0 ? <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">The lifetime total includes {history.data.legacyAcceptedWithoutDetails.toLocaleString("en-IN")} older accepted requests recorded before phone-level history was available. Their destination numbers cannot be reconstructed.</p> : null}
        {history.data.historyStartedAt ? <p className="mt-3 text-xs text-[var(--muted)]">Phone-level history begins {displayTime(history.data.historyStartedAt)}.</p> : null}
        <p className="mt-3 text-xs text-[var(--muted)]">Last checked {displayTime(history.data.checkedAt)}. An accepted request is pending until a delivery report arrives. Delivery confirms the provider report; it does not confirm the person read the message.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--panel-border)] text-xs text-[var(--muted)]">{["Phone", "Account type", "Requested", "Delivery status", "Report received"].map((title) => <th className="px-3 py-3 font-medium" key={title}>{title}</th>)}</tr></thead><tbody>
          {history.data.rows.map((row) => <tr className="border-b border-[var(--panel-border)]" key={row.id}><td className="whitespace-nowrap px-3 py-3"><a className="font-medium" href={`tel:+91${row.phone}`}>+91 {row.phone}</a></td><td className="px-3 py-3">{row.role?.replaceAll("_", " ") ?? "—"}</td><td className="whitespace-nowrap px-3 py-3">{displayTime(row.requestedAt)}</td><td className="px-3 py-3"><span className={row.status === "DELIVERED" ? "text-emerald-700" : row.status === "PENDING" ? "text-amber-700" : "text-rose-700"}>{row.status === "PENDING" && Date.now() - Date.parse(row.requestedAt) > 10 * 60 * 1000 ? "No delivery report received" : labels[row.status]}</span>{row.failureReason ? <p className="mt-1 max-w-xs text-xs text-[var(--muted)]">{row.failureReason}</p> : null}</td><td className="whitespace-nowrap px-3 py-3">{displayTime(row.reportedAt)}</td></tr>)}
          {!history.data.rows.length ? <tr><td className="px-3 py-6 text-[var(--muted)]" colSpan={5}>No matching OTP SMS records. History starts when this backend update is deployed.</td></tr> : null}
        </tbody></table></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm"><p>{history.data.pagination.total.toLocaleString("en-IN")} matching records · Page {history.data.pagination.page} of {history.data.pagination.totalPages}</p><div className="flex gap-2"><button className="rounded-lg border border-[var(--panel-border)] px-3 py-2 disabled:opacity-40" disabled={history.isFetching || history.data.pagination.page <= 1} onClick={() => setPage(history.data!.pagination.page - 1)}>Previous</button><button className="rounded-lg border border-[var(--panel-border)] px-3 py-2 disabled:opacity-40" disabled={history.isFetching || history.data.pagination.page >= history.data.pagination.totalPages} onClick={() => setPage(history.data!.pagination.page + 1)}>Next</button></div></div>
      </> : null}
      {history.isError ? <p className="mt-4 text-sm text-rose-700">Could not refresh delivery status: {extractError(history.error)}</p> : null}
      {history.isPending ? <p className="mt-4 text-sm text-[var(--muted)]">Loading OTP delivery history…</p> : null}
    </section>
  );
}
