"use client";

import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { extractError, getOtpDeliveries, type OtpDeliveryStatus } from "../lib/api";

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
  const searchPhone = useDeferredValue(phone);
  const history = useQuery({
    queryKey: ["admin", "otp-deliveries", searchPhone, status],
    queryFn: () => getOtpDeliveries({ phone: searchPhone || undefined, status: status || undefined }),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    retry: 1
  });
  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h3 className="text-lg font-semibold">OTP SMS delivery</h3><p className="mt-1 text-sm text-[var(--muted)]">Delivery reports from 2Factor. Updates every 5 seconds. History retained for 90 days.</p></div>
        <button className="rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm disabled:opacity-50" disabled={history.isFetching} onClick={() => void history.refetch()}>{history.isFetching ? "Updating…" : "Refresh"}</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <input aria-label="Search OTP destination number" className="h-10 rounded-xl border border-[var(--panel-border)] bg-transparent px-3 text-sm" placeholder="Search phone number" inputMode="numeric" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} />
        <select aria-label="Filter OTP delivery status" className="h-10 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      </div>
      {history.data ? <>
        {!history.data.callbackConfigured ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Delivery callback is not configured on the backend. Accepted requests will stay pending until 2Factor delivery reports are connected.</p> : null}
        <p className="mt-3 text-xs text-[var(--muted)]">{history.data.lastReportAt ? `Last provider delivery report received ${displayTime(history.data.lastReportAt)}.` : "No provider delivery report has arrived yet. The callback URL must also be registered in your 2Factor account."}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">{[
          ["Delivered", history.data.counts.DELIVERED],
          ["Awaiting report", history.data.counts.PENDING],
          ["Delivery failed / rejected", history.data.counts.FAILED + history.data.counts.REJECTED],
          ["Provider request failed", history.data.counts.REQUEST_FAILED]
        ].map(([label, count]) => <div className="rounded-xl border border-[var(--panel-border)] p-3" key={label}><p className="text-xs text-[var(--muted)]">{label} · last 90 days</p><p className="mt-1 text-xl font-semibold">{Number(count).toLocaleString("en-IN")}</p></div>)}</div>
        <p className="mt-3 text-xs text-[var(--muted)]">Last checked {displayTime(history.data.checkedAt)}. An accepted request is pending until a delivery report arrives. Delivery confirms the provider report; it does not confirm the person read the message.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--panel-border)] text-xs text-[var(--muted)]">{["Phone", "Account type", "Requested", "Delivery status", "Report received"].map((title) => <th className="px-3 py-3 font-medium" key={title}>{title}</th>)}</tr></thead><tbody>
          {history.data.rows.map((row) => <tr className="border-b border-[var(--panel-border)]" key={row.id}><td className="whitespace-nowrap px-3 py-3"><a className="font-medium" href={`tel:+91${row.phone}`}>+91 {row.phone}</a></td><td className="px-3 py-3">{row.role?.replaceAll("_", " ") ?? "—"}</td><td className="whitespace-nowrap px-3 py-3">{displayTime(row.requestedAt)}</td><td className="px-3 py-3"><span className={row.status === "DELIVERED" ? "text-emerald-700" : row.status === "PENDING" ? "text-amber-700" : "text-rose-700"}>{row.status === "PENDING" && Date.now() - Date.parse(row.requestedAt) > 10 * 60 * 1000 ? "No delivery report received" : labels[row.status]}</span>{row.failureReason ? <p className="mt-1 max-w-xs text-xs text-[var(--muted)]">{row.failureReason}</p> : null}</td><td className="whitespace-nowrap px-3 py-3">{displayTime(row.reportedAt)}</td></tr>)}
          {!history.data.rows.length ? <tr><td className="px-3 py-6 text-[var(--muted)]" colSpan={5}>No matching OTP SMS records. History starts when this backend update is deployed.</td></tr> : null}
        </tbody></table></div>
      </> : null}
      {history.isError ? <p className="mt-4 text-sm text-rose-700">Could not refresh delivery status: {extractError(history.error)}</p> : null}
      {history.isPending ? <p className="mt-4 text-sm text-[var(--muted)]">Loading OTP delivery history…</p> : null}
    </section>
  );
}
