"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Check, ChevronRight, Clock3, Heart, KeyRound, Loader2, MapPin, PackageCheck, Ruler, Search, Star, Truck, X } from "lucide-react";
import { customerApi, errorMessage } from "@/src/lib/api";
import type { Coupon, CustomerTailor, HandoffOtp, NotificationPreferences, TailoringRequest } from "@/src/lib/types";
import { useAuthStore } from "@/src/store/auth-store";
import { couponLabel } from "@/src/lib/pricing";
import { uiText as t, useCustomerPreferences } from "./customer-preferences";
import { useCustomerDialog } from "./customer-dialog";
import { cancellationPolicySections, cancellationSpecialCases, fabricCareTips, helpTopics, measurementGuides } from "./mobile-guide-content";

export const extraScreens = ["search", "services", "favoriteTailors", "settings", "appLanguage", "notificationPreferences", "notifications", "coupons", "customerStories", "rateApp", "measurementGuide", "fabricCare", "cancellationPolicy", "faq", "appInfo", "trackOrder"] as const;
export type ExtraScreen = typeof extraScreens[number];
export const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 font-bold text-[#102642] disabled:opacity-50";
const input = "w-full rounded-lg border border-gray-300 bg-white p-3 text-base focus:outline-amber-500";

export function ExtraPage({ title, back, children }: { title: string; back: () => void; children: ReactNode }) {
  return <section className="mx-auto max-w-4xl space-y-6 pb-8 text-[#102642]">
    <header className="flex items-center gap-3"><button onClick={back} title={t("Back")} className="rounded-full bg-white p-3"><ArrowLeft size={22} /></button><h1 className="text-2xl font-bold">{t(title)}</h1></header>
    {children}
  </section>;
}

export function QueryMessage({ loading, error, empty }: { loading?: boolean; error?: unknown; empty?: boolean }) {
  if (loading) return <div role="status" className="flex justify-center p-8"><Loader2 className="animate-spin text-amber-500" aria-label={t("Loading")} /></div>;
  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-4 text-red-700">{t(errorMessage(error))}</p>;
  if (empty) return <p className="py-8 text-center text-gray-500">{t("Nothing here yet")}</p>;
  return null;
}

export function LanguageSwitcher() {
  const language = useCustomerPreferences((state) => state.language);
  const setLanguage = useCustomerPreferences((state) => state.setLanguage);
  return <div className="inline-flex shrink-0 rounded-lg border border-gray-200 bg-white p-1" aria-label="Language">
    {(["en", "hi"] as const).map((value) => <button key={value} aria-pressed={language === value} onClick={() => setLanguage(value)} className={`min-h-10 min-w-12 rounded-md px-3 font-bold ${value === language ? "bg-amber-500 text-black" : "text-gray-600"}`}>{value === "en" ? "EN" : "हिं"}</button>)}
  </div>;
}

export function TailorDirectory({ savedOnly, onBook }: { savedOnly: boolean; onBook: () => void }) {
  const userId = useAuthStore((state) => state.user?.id ?? "");
  const favorites = useCustomerPreferences((state) => state.favorites[userId]);
  const toggleFavorite = useCustomerPreferences((state) => state.toggleFavorite);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerTailor>();
  const query = useQuery({ queryKey: ["customer", "tailors"], queryFn: customerApi.tailors });
  const rows = (query.data ?? []).filter((tailor) => (!savedOnly || favorites?.includes(tailor.id)) && `${tailor.shopName ?? ""} ${tailor.specialization?.join(" ") ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <div className="relative"><Search size={20} className="absolute left-3 top-3.5 text-gray-400" /><input className={`${input} pl-10`} aria-label={t("Search tailors")} placeholder={t("Search tailors")} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
    <QueryMessage loading={query.isLoading} error={query.error} empty={!query.isLoading && !rows.length} />
    <div className="grid gap-4 sm:grid-cols-2">{rows.map((tailor) => <article key={tailor.id} className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-start gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-amber-100 font-bold">{tailor.user?.avatarUrl ? <img src={tailor.user.avatarUrl} alt="" className="h-full w-full object-cover" /> : (tailor.shopName ?? "D").slice(0, 2)}</div><button className="min-w-0 flex-1 text-left" onClick={() => setSelected(tailor)}><h2 className="break-words text-lg font-bold">{tailor.shopName ?? t("Tailor")}</h2><p className="text-sm text-gray-500">{tailor.specialization?.map(t).join(", ")}</p></button><button title={t("Save tailor")} aria-pressed={Boolean(favorites?.includes(tailor.id))} onClick={() => toggleFavorite(userId, tailor.id)} className="p-2 text-red-500"><Heart size={22} fill={favorites?.includes(tailor.id) ? "currentColor" : "none"} /></button></div>
      <p className="my-4 flex items-center gap-2 text-sm"><Star size={16} className="text-amber-500" />{tailor.rating ? `${tailor.rating} (${tailor.ratingCount ?? 0})` : t("New tailor")}</p>
      <button className="flex w-full items-center justify-between border-t pt-3 font-bold" onClick={() => setSelected(tailor)}>{t("View Profile")}<ChevronRight size={18} /></button>
    </article>)}</div>
    <button className={primaryButton} onClick={onBook}>{t("Book Pickup")}</button>
    {selected ? <TailorProfile tailor={selected} onClose={() => setSelected(undefined)} /> : null}
  </>;
}

export function TailorProfile({ tailor, onClose }: { tailor: CustomerTailor; onClose: () => void }) {
  const dialog = useState(() => ({ current: null as HTMLDialogElement | null }))[0];
  useEffect(() => { dialog.current?.showModal(); }, [dialog]);
  const shop = tailor.verification?.shop;
  const address = [shop?.shopAddressLine ?? shop?.shopAddress ?? shop?.address, shop?.shopArea ?? shop?.area, shop?.shopCity ?? shop?.city, shop?.shopState, shop?.shopPincode].filter(Boolean).join(", ");
  return <dialog ref={(node) => { dialog.current = node; }} onCancel={onClose} className="m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-auto rounded-lg border border-amber-200 bg-white p-6 text-[#102642] backdrop:bg-black/40">
    <div className="flex items-start justify-between gap-4"><h2 className="text-xl font-bold">{tailor.shopName ?? t("Tailor Profile")}</h2><button autoFocus title={t("Close")} onClick={onClose}><X /></button></div>
    <p className="mt-5 text-gray-600">{tailor.user?.name}</p><p className="mt-4 break-words">{address || t("Address not available")}</p>
    <p className="mt-4">{tailor.specialization?.map(t).join(", ")}</p>
    <p className="mt-5 font-bold text-emerald-700">{t(tailor.isAvailable === false ? "Unavailable" : "Available")}</p>
  </dialog>;
}

function PreferencesScreen() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [values, setValues] = useState<NotificationPreferences>(user?.notificationPreferences?.customer ?? {});
  const save = useMutation({ mutationFn: customerApi.notificationPreferences, onSuccess: (next) => { setValues(next); if (user) setUser({ ...user, notificationPreferences: { ...user.notificationPreferences, customer: next } }); } });
  const rows = [["notifications", "Notifications"], ["orderUpdates", "Order updates"], ["offersPromotions", "Offers & promotions"], ["pickupReminders", "Pickup reminders"], ["deliveryUpdates", "Delivery updates"]] as const;
  return <><div className="divide-y divide-gray-200">{rows.map(([key, label]) => <label key={key} className="flex min-h-16 items-center justify-between gap-4 py-4 font-bold">{t(label)}<input type="checkbox" role="switch" checked={values[key] !== false} disabled={save.isPending} onChange={(event) => { const next = { ...values, [key]: event.target.checked }; setValues(next); save.mutate(next); }} className="h-6 w-6 accent-amber-500" /></label>)}</div><QueryMessage loading={save.isPending} error={save.error} />{save.isSuccess ? <p role="status" className="text-emerald-700">{t("Saved")}</p> : null}</>;
}

export function OrderActions({ order, refresh }: { order: TailoringRequest; refresh: () => void }) {
  const prompt = useCustomerDialog();
  const [reason, setReason] = useState("");
  const recover = useMutation({ mutationFn: () => customerApi.recoverCheckout(order.id), onSuccess: async (result) => { refresh(); await prompt("Payment status", result.status === "paid" ? "Payment received" : result.message ?? "Payment is pending"); } });
  const cancel = useMutation({ mutationFn: () => customerApi.cancelRequest(order.id, reason), onSuccess: () => refresh() });
  const normalizedStatus = String(order.orderStatus ?? "").toLowerCase();
  const finished = ["completed", "delivered", "cancelled"].includes(normalizedStatus) || order.status === "CANCELLED";
  const reachedTailor = ["received_by_tailor", "ready_for_delivery", "out_for_delivery"].includes(normalizedStatus) || ["WORKING", "READY"].includes(String(order.workStatus));
  const pickedUp = ["pickup_started", "picked_up_from_customer"].includes(normalizedStatus);
  const canCancel = !finished && !reachedTailor;
  const cancellationMessage = pickedUp
    ? `This order has been picked up. The cancellation fee will be exactly your delivery charge (${formatMoney(order.deliveryFee ?? 0)}). Continue?`
    : "Pickup has not started, so no cancellation fee applies. Continue?";
  return <div className="space-y-4 border-t border-gray-200 pt-5">
    {order.status === "PAYMENT_PENDING" && order.paymentMethod !== "COD" ? <button className={primaryButton} disabled={recover.isPending} onClick={() => recover.mutate()}>{recover.isPending ? <Loader2 className="animate-spin" size={18} /> : null}{t("Check payment status")}</button> : null}
    {canCancel ? <><div className="rounded-lg border border-gray-200 bg-white p-4"><p className="text-sm font-bold text-gray-700">{t(pickedUp ? `Cancellation fee: ${formatMoney(order.deliveryFee ?? 0)}` : "Free cancellation before pickup")}</p><p className="mt-1 text-xs text-gray-500">{t(pickedUp ? "After pickup, the fee is exactly the delivery charge. No extra surcharge is added." : "Cancellation closes once the order reaches the tailor.")}</p></div><input value={reason} onChange={(event) => setReason(event.target.value)} className={input} placeholder={t("Cancellation reason")} aria-label={t("Cancellation reason")} maxLength={500} /><button className="min-h-11 rounded-lg border border-red-200 px-5 py-3 font-bold text-red-600 disabled:opacity-50" disabled={cancel.isPending || reason.trim().length < 3} onClick={async () => { if (await prompt("Cancel order", cancellationMessage, true)) cancel.mutate(); }}>{cancel.isPending ? <Loader2 className="animate-spin" /> : t("Cancel order")}</button></> : null}
    <QueryMessage error={cancel.error ?? recover.error} />
  </div>;
}

export function DeliveryTracking({ order }: { order: TailoringRequest }) {
  const queryClient = useQueryClient();
  const tasks = useQuery({ queryKey: ["customer", "tracking", order.id], queryFn: () => customerApi.handoffOtps(order.id), refetchInterval: 15000 });
  const visit = useQuery({ queryKey: ["customer", "measurement", order.id], queryFn: () => customerApi.measurementVisit(order.id), retry: false, refetchInterval: 30000 });
  const task = tasks.data?.find((item) => item.type === "tailor_to_customer" && item.taskStatus === "pending" && item.batchStatus === "scheduled" && item.batchId && (!item.batchLockAt || new Date(item.batchLockAt).getTime() > Date.now()));
  const slots = useQuery({ queryKey: ["customer", "slots", task?.taskId], queryFn: () => customerApi.deliverySlots(task!.taskId), enabled: Boolean(task), refetchInterval: 30000 });
  const reschedule = useMutation({ mutationFn: (index: number) => customerApi.rescheduleDelivery(task!.taskId, slots.data![index]), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customer"] }) });
  return <div className="space-y-5">
    <section className="overflow-hidden rounded-lg bg-[#101318] text-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center">
        <div><p className="text-xs font-bold uppercase text-amber-400">{t("Live order tracking")}</p><h2 className="mt-1 text-xl font-black">{order.id.slice(-8).toUpperCase()}</h2></div>
        <span className="inline-flex w-fit items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm font-bold"><Clock3 className="h-4 w-4 text-amber-400" />{t(String(order.orderStatus ?? order.status).replaceAll("_", " "))}</span>
      </div>
      <div className="grid gap-px bg-white/10 sm:grid-cols-3">
        <div className="flex items-center gap-3 bg-[#101318] p-4"><MapPin className="h-5 w-5 text-amber-400" /><span className="text-sm font-bold">{t("Customer pickup")}</span></div>
        <div className="flex items-center gap-3 bg-[#101318] p-4"><Ruler className="h-5 w-5 text-amber-400" /><span className="text-sm font-bold">{t("Tailor service")}</span></div>
        <div className="flex items-center gap-3 bg-[#101318] p-4"><Truck className="h-5 w-5 text-amber-400" /><span className="text-sm font-bold">{t("Doorstep delivery")}</span></div>
      </div>
    </section>
    <QueryMessage loading={tasks.isLoading} error={tasks.error} />
    <div className="grid gap-4 md:grid-cols-2">{tasks.data?.map((item) => <article key={`${item.taskId}-${item.stage}`} className="overflow-hidden rounded-lg border border-gray-200 bg-white"><div className="flex items-center justify-between gap-4 bg-[#101318] px-5 py-4 text-white"><h2 className="flex items-center gap-2 font-black">{item.type === "customer_to_tailor" ? <PackageCheck className="h-5 w-5 text-amber-400" /> : <Truck className="h-5 w-5 text-amber-400" />}{t(item.type === "customer_to_tailor" ? "Pickup" : "Delivery")}</h2><span className="text-xs font-bold uppercase text-gray-300">{t(item.taskStatus ?? "Pending")}</span></div><div className="p-5">{item.verified ? <p className="flex items-center gap-2 font-bold text-emerald-700"><Check size={18} />{t("Completed")}</p> : item.otp ? <div className="rounded-lg border border-amber-300 bg-amber-400 p-4 text-[#101318]"><p className="flex items-center gap-2 text-xs font-black uppercase"><KeyRound className="h-4 w-4" />{t("Share OTP at handoff")}</p><p className="mt-2 text-3xl font-black tracking-widest tabular-nums">{item.otp}</p></div> : <p className="font-bold text-gray-500">{t("OTP will appear when the partner is assigned")}</p>}<p className="mt-4 flex items-center gap-2 text-sm font-semibold text-gray-600"><Clock3 className="h-4 w-4 text-amber-600" />{formatWindow(item)}</p>{item.lastFailureReason ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{item.lastFailureReason}</p> : null}</div></article>)}</div>
    {visit.data && !["CANCELLED", "EXPIRED"].includes(visit.data.status) ? <section className="overflow-hidden rounded-lg bg-[#101318] text-white"><div className="flex items-center gap-3 border-b border-white/10 px-5 py-4"><Ruler className="h-5 w-5 text-amber-400" /><h2 className="font-black">{t("Measurement visit")}</h2></div><div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-bold">{visit.data.preferredMeasurementSlot}</p><p className="mt-2 text-sm text-gray-300">{t("Share this only when the tailor arrives at your home")}</p></div><div className={visit.data.status === "SUBMITTED" ? "rounded-lg bg-emerald-500/20 px-4 py-3 font-black text-emerald-300" : "rounded-lg bg-amber-400 px-5 py-3 text-center text-[#101318]"}>{visit.data.status === "SUBMITTED" ? t("Completed") : <><p className="text-xs font-black uppercase">{t("Visit OTP")}</p><p className="mt-1 text-3xl font-black tracking-widest tabular-nums">{visit.data.otp}</p></>}</div></div></section> : null}
    {slots.data?.length ? <section className="rounded-lg border border-gray-200 bg-white p-5"><h2 className="mb-3 font-black">{t("Reschedule delivery")}</h2><div className="grid gap-2 sm:grid-cols-2">{slots.data.map((slot, index) => <button aria-pressed={false} disabled={reschedule.isPending} onClick={() => reschedule.mutate(index)} className="min-h-12 rounded-lg border border-gray-300 bg-white px-4 py-3 text-left font-bold transition hover:border-amber-500 hover:bg-amber-50 disabled:opacity-50" key={slot.roundAt}>{slot.label}</button>)}</div></section> : null}
    <QueryMessage error={slots.error ?? reschedule.error} />
    {reschedule.isSuccess ? <p role="status" className="text-emerald-700">{t("Delivery updated")}</p> : null}
  </div>;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function formatWindow(item: HandoffOtp) {
  const start = item.etaWindowStart ?? item.nextScheduledBatch ?? item.roundAt;
  if (!start) return t("Time pending");
  const locale = useCustomerPreferences.getState().language === "hi" ? "hi-IN" : "en-IN";
  const format = (value: string) => new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
  return `${format(start)}${item.etaWindowEnd ? ` - ${format(item.etaWindowEnd)}` : ""}`;
}

function ReviewScreen({ orders }: { orders: TailoringRequest[] }) {
  const completed = orders.filter((order) => String(order.orderStatus).toLowerCase() === "completed");
  const [orderId, setOrderId] = useState(completed[0]?.id ?? "");
  const [kind, setKind] = useState<"app" | "tailor" | "delivery">("app");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const save = useMutation({ mutationFn: () => customerApi.review({ orderId, kind, rating, comment }) });
  return <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (!save.isPending) save.mutate(); }}>
    <label className="block font-bold">{t("Order")}<select required className={`${input} mt-2`} value={orderId} onChange={(event) => { setOrderId(event.target.value); save.reset(); }}><option value="">{t("Select order")}</option>{completed.map((order) => <option key={order.id} value={order.id}>{order.id.slice(-8).toUpperCase()} - {order.clothType}</option>)}</select></label>
    <div className="flex flex-wrap gap-3">{(["app", "tailor", "delivery"] as const).map((value) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => { setKind(value); save.reset(); }} className={`rounded-lg border px-4 py-2 ${kind === value ? "border-amber-500 bg-amber-50" : "bg-white"}`}>{t(value === "app" ? "Darji" : value === "tailor" ? "Tailor" : "Delivery")}</button>)}</div>
    <div className="flex gap-2" role="group" aria-label={t("Rating")}>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value}`} aria-pressed={rating === value} onClick={() => setRating(value)} className="p-2 text-amber-500"><Star size={30} fill={value <= rating ? "currentColor" : "none"} /></button>)}</div>
    <textarea className={input} rows={4} maxLength={1000} aria-label={t("Your review")} placeholder={t("Your review")} value={comment} onChange={(event) => setComment(event.target.value)} />
    <button className={primaryButton} disabled={!orderId || !rating || save.isPending || save.isSuccess}>{save.isPending ? <Loader2 className="animate-spin" /> : t("Submit review")}</button><QueryMessage error={save.error} />{save.isSuccess ? <p role="status" className="text-emerald-700">{t("Thank you for your review")}</p> : null}
  </form>;
}

function StoriesScreen() {
  const query = useQuery({ queryKey: ["customer", "stories"], queryFn: customerApi.stories });
  return <><QueryMessage loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.data?.length} /><div className="grid gap-4 sm:grid-cols-2">{query.data?.map((story) => <article key={story.id} className="rounded-lg border bg-white p-5"><h2 className="font-bold">{story.name}</h2><p className="my-3 flex gap-1 text-amber-500">{Array.from({ length: story.rating }, (_, index) => <Star key={index} size={16} fill="currentColor" />)}</p><p className="whitespace-pre-wrap leading-7">{story.review}</p><p className="mt-3 text-sm text-gray-500">{story.location}</p></article>)}</div></>;
}

function MeasurementGuide() {
  const [cloth, setCloth] = useState<keyof typeof measurementGuides>("Shirt / Pants");
  const guide = measurementGuides[cloth] ?? Object.values(measurementGuides)[0];
  return <><select aria-label={t("Cloth Type")} className={input} value={cloth} onChange={(event) => setCloth(event.target.value as keyof typeof measurementGuides)}>{Object.keys(measurementGuides).map((value) => <option key={value} value={value}>{t(value)}</option>)}</select><img src="/measurements.png" alt={t("Measurement guide")} className="mx-auto h-64 w-full object-contain" /><div className="overflow-auto"><table className="w-full border-collapse text-left text-sm"><caption className="mb-3 text-left font-bold">{t("Measurements in inches")}</caption><thead><tr><th className="border p-3">{t("Size")}</th>{guide.fields.map((field) => <th className="border p-3" key={field}>{t(field)}</th>)}</tr></thead><tbody>{guide.sizeChart.map((row) => <tr key={row.size}><th className="border p-3">{row.size}</th>{guide.fields.map((field) => <td key={field} className="border p-3">{(row.values as Record<string, string>)[field] ?? "-"}</td>)}</tr>)}</tbody></table></div></>;
}

export function CustomerExtraScreen({ screen, go, orders, coupons, selectedOrder, openOrder }: { screen: ExtraScreen; go: (screen: string) => void; orders: TailoringRequest[]; coupons: Coupon[]; selectedOrder?: TailoringRequest; openOrder: (order: TailoringRequest) => void }) {
  const titles: Record<ExtraScreen, string> = { search: "Find Tailors", services: "Services", favoriteTailors: "Saved Tailors", settings: "Settings", appLanguage: "App language", notificationPreferences: "Notifications", notifications: "Notifications", coupons: "Coupons", customerStories: "Customer stories", rateApp: "Rate your experience", measurementGuide: "Measurement guide", fabricCare: "Fabric & Care Tips", cancellationPolicy: "Cancellation policy", faq: "Help Center", appInfo: "About Darji", trackOrder: "Track Order" };
  return <ExtraPage title={titles[screen]} back={() => go(screen === "trackOrder" ? "orderDetails" : "profile")}>
    {screen === "search" || screen === "favoriteTailors" ? <TailorDirectory savedOnly={screen === "favoriteTailors"} onBook={() => go("newRequest")} /> : null}
    {screen === "appLanguage" ? <LanguageSwitcher /> : null}
    {screen === "settings" ? <div className="divide-y">{[["appLanguage", "App language"], ["notificationPreferences", "Notifications"], ["savedAddresses", "Saved Addresses"], ["editProfile", "Edit Profile"]].map(([id, label]) => <button key={id} className="flex w-full items-center justify-between py-5 font-bold" onClick={() => go(id)}>{t(label)}<ChevronRight size={20} /></button>)}</div> : null}
    {screen === "notificationPreferences" ? <PreferencesScreen /> : null}
    {screen === "notifications" ? <NotificationInbox orders={orders} openOrder={openOrder} /> : null}
    {screen === "coupons" ? <div className="grid gap-4 sm:grid-cols-2">{coupons.filter((coupon) => coupon.isActive && (!coupon.expiresAt || Date.parse(coupon.expiresAt) > Date.now())).map((coupon) => <article key={coupon.code} className="rounded-lg border border-dashed border-amber-400 bg-white p-5"><h2 className="font-bold">{coupon.code}</h2><p className="mt-3">{t(couponLabel(coupon))}</p><p className="mt-3 text-sm text-gray-500">{coupon.description}</p><button className="mt-5 font-bold text-amber-700" onClick={() => go("newRequest")}>{t("Book Pickup")}</button></article>)}{!coupons.length ? <QueryMessage empty /> : null}</div> : null}
    {screen === "customerStories" ? <StoriesScreen /> : null}
    {screen === "rateApp" ? <ReviewScreen orders={orders} /> : null}
    {screen === "measurementGuide" ? <MeasurementGuide /> : null}
    {screen === "fabricCare" ? <div className="grid gap-4 sm:grid-cols-2">{fabricCareTips.map((tip) => <article className="rounded-lg border bg-white p-5" key={tip.title}><h2 className="font-bold">{t(tip.title)}</h2><p className="mt-3 leading-7 text-gray-600">{t(tip.copy)}</p></article>)}</div> : null}
    {screen === "faq" ? <div className="divide-y">{helpTopics.map((topic) => <details className="py-5" key={topic.id}><summary className="cursor-pointer font-bold">{t(topic.title)}</summary><p className="mt-3 text-gray-500">{t(topic.subtitle)}</p><ul className="mt-3 list-disc space-y-3 pl-5 leading-7">{topic.details.map((detail) => <li key={detail}>{t(detail)}</li>)}</ul></details>)}<button className="py-5 font-bold" onClick={() => go("cancellationPolicy")}>{t("Cancellation policy")}</button></div> : null}
    {screen === "cancellationPolicy" ? <div className="space-y-6">{cancellationPolicySections.map((section) => <section className="border-b pb-5" key={section.title}><h2 className="text-lg font-bold">{t(section.title)}</h2><p className="my-3">{t(section.status)}</p><p className="font-bold">{t(section.refund)} · {t(section.charges)}</p><p className="mt-3 leading-7 text-gray-600">{t(section.reason)}</p></section>)}{cancellationSpecialCases.map(([title, copy]) => <div key={title}><h3 className="font-bold">{t(title)}</h3><p className="mt-2">{t(copy)}</p></div>)}</div> : null}
    {screen === "services" ? <div className="grid gap-4 sm:grid-cols-3">{["Alteration", "New Stitching", "Custom Tailoring"].map((label) => <button key={label} className="rounded-lg border bg-white p-6 text-left font-bold" onClick={() => go("newRequest")}>{t(label)}<ChevronRight className="mt-4 text-amber-500" /></button>)}</div> : null}
    {screen === "appInfo" ? <div className="space-y-5"><img src="/darji-loader-transparent.png" alt="Darji" className="h-24 object-contain" /><h2 className="text-xl font-bold">{t("Darji")}</h2><a className="block underline" href="/about">{t("About Darji")}</a><a className="block underline" href="/privacy">{t("Privacy Policy")}</a><a className="block underline" href="/terms">{t("Terms of Service")}</a></div> : null}
    {screen === "trackOrder" ? selectedOrder ? <><p className="font-bold">{selectedOrder.id.slice(-8).toUpperCase()}</p><DeliveryTracking order={selectedOrder} /></> : <button className={primaryButton} onClick={() => go("orders")}>{t("Orders")}</button> : null}
  </ExtraPage>;
}

function NotificationInbox({ orders, openOrder }: { orders: TailoringRequest[]; openOrder: (order: TailoringRequest) => void }) {
  const query = useQuery({ queryKey: ["customer", "notifications"], queryFn: customerApi.notifications, refetchInterval: 30000 });
  return <><QueryMessage loading={query.isLoading} error={query.error} empty={!query.isLoading && !query.data?.length} /><div className="divide-y">{query.data?.map((notice) => {
    const order = orders.find((row) => row.id === (notice.data?.orderId ?? notice.data?.requestId));
    return <article className="py-5" key={notice.id}><h2 className="flex items-center gap-2 font-bold"><Bell size={18} className="text-amber-500" />{t(notice.title ?? "Notification")}</h2><p className="mt-3 whitespace-pre-wrap text-gray-600">{t(notice.body ?? notice.message ?? "")}</p>{notice.createdAt ? <p className="mt-2 text-xs text-gray-400">{new Date(notice.createdAt).toLocaleString()}</p> : null}{order ? <button onClick={() => openOrder(order)} className="mt-3 font-bold text-amber-700">{t("View Details")}</button> : null}</article>;
  })}</div></>;
}
