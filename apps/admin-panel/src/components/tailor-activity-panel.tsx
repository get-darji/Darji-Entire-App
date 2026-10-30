"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { extractError, getAdminTailorActivity, type TailorActivityLink } from "../lib/api";

const currency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
const time = (value: string | null) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const label = (value: string) => value.replaceAll("_", " ");

export function TailorActivityPanel({ tailorId, onOpenRecord }: { tailorId: string; onOpenRecord: (link: TailorActivityLink) => Promise<void> }) {
  const [tab, setTab] = useState<"orders" | "measurements" | "earnings">("orders");
  const [filter, setFilter] = useState<"all" | "completed" | "credits" | "payouts">("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [opening, setOpening] = useState<string>();
  const [openError, setOpenError] = useState<string>();
  const activity = useQuery({ queryKey: ["admin", "tailor-activity", tailorId], queryFn: () => getAdminTailorActivity(tailorId), refetchInterval: 15000 });
  const select = (next: typeof tab, nextFilter: typeof filter = "all") => { setTab(next); setFilter(nextFilter); setSearch(""); setPage(1); };
  async function open(link: TailorActivityLink) {
    if (opening) return;
    setOpening(link.id); setOpenError(undefined);
    try { await onOpenRecord(link); } catch (error) { setOpenError(extractError(error)); } finally { setOpening(undefined); }
  }
  if (activity.isPending) return <p className="p-4 text-sm text-slate-500">Loading saved orders, visits and wallet records…</p>;
  if (!activity.data) return <div className="p-4"><p className="text-sm text-rose-700">{extractError(activity.error)}</p><button className="mt-3 rounded-xl border px-3 py-2 text-sm" onClick={() => void activity.refetch()}>Try again</button></div>;
  const data = activity.data;
  const sourceRows = tab === "orders" ? data.orders.filter((order) => filter !== "completed" || ["delivered", "completed"].includes(order.status.toLowerCase()))
    : tab === "measurements" ? data.measurementVisits.filter((visit) => filter !== "completed" || visit.status === "SUBMITTED")
      : data.earnings.filter((entry) => filter === "credits" ? entry.direction === "CREDIT" && ["ORDER_EARNING", "BONUS", "ADJUSTMENT"].includes(entry.category) : filter === "payouts" ? entry.direction === "DEBIT" && entry.category === "WEEKLY_PAYOUT" : true);
  const rows = sourceRows.filter((row) => !search.trim() || JSON.stringify(row).toLowerCase().includes(search.trim().toLowerCase()));
  const pages = Math.max(1, Math.ceil(rows.length / 25));
  const currentPage = Math.min(page, pages);
  const start = (currentPage - 1) * 25;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
      { title: "All orders", value: String(data.summary.orders), note: `${data.summary.activeOrders} active · ${data.summary.cancelledOrders} cancelled`, click: () => select("orders") },
      { title: "Completed orders", value: String(data.summary.completedOrders), note: "Delivered / completed", click: () => select("orders", "completed") },
      { title: "Visits completed", value: String(data.summary.completedMeasurements), note: `${data.summary.measurementAssignments} measurement assignments`, click: () => select("measurements", "completed") },
      { title: "Recorded earnings", value: currency(data.summary.recordedEarnings), note: "Credited earnings, bonuses and adjustments", click: () => select("earnings", "credits") },
      { title: "Paid out", value: currency(data.summary.paidOut), note: "Recorded wallet payouts", click: () => select("earnings", "payouts") },
      { title: "Wallet balance", value: currency(data.summary.walletBalance), note: "Current saved wallet balance", click: () => select("earnings") }
    ].map((card) => <button key={card.title} onClick={card.click} type="button" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-orange-300 hover:bg-orange-50"><p className="text-xs font-semibold text-slate-500">{card.title}</p><p className="mt-2 text-xl font-bold text-slate-900">{card.value}</p><p className="mt-1 text-xs text-slate-500">{card.note}</p></button>)}</div>
    <div className="flex flex-wrap gap-2">{([ ["orders", "Orders"], ["measurements", "Measurement visits"], ["earnings", "Earnings & payouts"] ] as const).map(([key, text]) => <button type="button" aria-pressed={tab === key} className={`rounded-xl px-3 py-2 text-sm ${tab === key ? "bg-slate-950 text-white" : "border border-slate-200 text-slate-700"}`} key={key} onClick={() => select(key)}>{text}</button>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-2"><input aria-label="Search tailor activity" className="h-10 rounded-xl border border-slate-200 bg-transparent px-3 text-sm" placeholder="Search name, number, ID or status" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} /><p className="text-xs text-slate-500">{rows.length} records{filter !== "all" ? ` · ${label(filter)}` : ""} · Updated {time(data.checkedAt)}</p></div>
    {activity.isError ? <p className="text-sm text-rose-700">Could not refresh: {extractError(activity.error)}</p> : null}
    {openError ? <p className="text-sm text-rose-700">Could not open the saved record: {openError}</p> : null}
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500">{(tab === "orders" ? ["Order", "Customer", "Status", "Order value", "Created"] : tab === "measurements" ? ["Visit", "Customer", "Status", "Visit payout", "Scheduled"] : ["Entry", "Details", "Type", "Amount", "Date"]).map((title) => <th className="px-2 py-3" key={title}>{title}</th>)}</tr></thead><tbody>
      {tab === "orders" ? (rows as typeof data.orders).slice(start, start + 25).map((order) => <tr className="border-b" key={order.id}><td className="px-2 py-3"><button disabled={Boolean(opening)} className="font-semibold text-orange-700 underline-offset-2 hover:underline" onClick={() => void open({ id: order.id, source: order.source })}>{opening === order.id ? "Opening…" : order.number}</button></td><td className="px-2 py-3">{order.customerName}<p className="text-xs text-slate-500">{order.customerPhone}</p></td><td className="px-2 py-3">{label(order.status)}</td><td className="px-2 py-3">{currency(order.amount)}</td><td className="whitespace-nowrap px-2 py-3">{time(order.createdAt)}</td></tr>) : null}
      {tab === "measurements" ? (rows as typeof data.measurementVisits).slice(start, start + 25).map((visit) => <tr className="border-b" key={visit.id}><td className="px-2 py-3"><button disabled={Boolean(opening)} className="font-semibold text-orange-700 hover:underline" onClick={() => void open({ id: visit.id, source: "MEASUREMENT" })}>{opening === visit.id ? "Opening…" : visit.number}</button></td><td className="px-2 py-3">{visit.customerName}</td><td className="px-2 py-3">{label(visit.status)}</td><td className="px-2 py-3">{currency(visit.payout)}</td><td className="whitespace-nowrap px-2 py-3">{time(visit.scheduledAt)}</td></tr>) : null}
      {tab === "earnings" ? (rows as typeof data.earnings).slice(start, start + 25).map((entry) => <tr className="border-b" key={entry.id}><td className="px-2 py-3">{entry.link ? <button disabled={Boolean(opening)} className="font-semibold text-orange-700 hover:underline" onClick={() => void open(entry.link!)}>Open linked {entry.link.source === "MEASUREMENT" ? "visit" : "order"}</button> : label(entry.category)}</td><td className="max-w-xs px-2 py-3">{entry.remarks || label(entry.category)}</td><td className="px-2 py-3">{label(entry.direction)}</td><td className={`px-2 py-3 font-semibold ${entry.direction === "CREDIT" ? "text-emerald-700" : "text-rose-700"}`}>{entry.direction === "CREDIT" ? "+" : "−"}{currency(entry.amount)}</td><td className="whitespace-nowrap px-2 py-3">{time(entry.createdAt)}</td></tr>) : null}
      {!rows.length ? <tr><td colSpan={5} className="px-2 py-6 text-slate-500">No saved records match this view.</td></tr> : null}
    </tbody></table></div>
    <div className="flex items-center justify-between text-sm"><p>Page {currentPage} of {pages}</p><div className="flex gap-2"><button className="rounded-lg border px-3 py-2 disabled:opacity-40" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</button><button className="rounded-lg border px-3 py-2 disabled:opacity-40" disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Next</button></div></div>
  </div>;
}
