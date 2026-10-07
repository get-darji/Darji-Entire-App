"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  FileClock,
  ShieldAlert,
  Smartphone,
  Trash2
} from "lucide-react";
import { EditorialFooter } from "@/src/components/editorial-footer";
import { customerApi, errorMessage } from "@/src/lib/api";
import { MarketingHeader } from "./site-actions";

const deletionSteps = [
  ["Open the Darji app", "Sign in with the account you want to delete."],
  ["Go to Profile / Account Settings", "Open your profile and find the account controls."],
  ["Tap Delete Account", "Review what deletion means before continuing."],
  ["Confirm the deletion request", "Darji will record your request for secure processing."]
] as const;

const deletedItems = [
  "Profile information connected to your Darji account",
  "Saved addresses and account preferences",
  "Uploaded tailoring-request photos, media, measurements, and notes",
  "Other personal data linked to your account, where deletion is permitted"
];

function normalizeIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

export function DeleteAccountPage() {
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const normalizedPhone = normalizeIndianPhone(phone);
  const phoneValid = /^[6-9]\d{9}$/.test(normalizedPhone);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phoneValid || !confirmed || submitting) return;
    setSubmitting(true);
    setFormError("");
    try {
      await customerApi.requestAccountDeletion({ phone: normalizedPhone, reason: reason.trim() || undefined });
      setSubmitted(true);
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#fdfaf6] text-[#08111f]">
      <MarketingHeader />

      <section className="relative overflow-hidden border-b border-[#eee4dc] px-0 py-16 sm:py-24">
        <div aria-hidden="true" className="absolute -right-24 -top-28 h-96 w-96 rounded-full bg-[#ff7000]/10 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-40 -left-28 h-96 w-96 rounded-full bg-[#c6924b]/10 blur-3xl" />
        <div className="shell relative max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff7000]/20 bg-[#fff0e5] px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-[#b84f00]">
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Account privacy
          </div>
          <h1 className="mt-7 max-w-4xl text-balance font-editorial text-[clamp(3.25rem,7vw,6.4rem)] font-normal leading-[0.92] tracking-[-0.035em] text-[#08111f]">
            Delete Your Darji Account
          </h1>
          <p className="mt-7 max-w-[66ch] text-base font-medium leading-8 text-[#526176] sm:text-lg">
            You can permanently request deletion of your Darji account and associated personal data. Use the Darji app when possible, or submit a request below if you cannot access it.
          </p>
        </div>
      </section>

      <section className="shell max-w-6xl py-12 sm:py-18">
        <div className="grid items-start gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <section aria-labelledby="in-app-title" className="rounded-[28px] border border-[#eee4dc] bg-white p-6 shadow-[0_24px_70px_rgba(8,17,31,0.07)] sm:p-9">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#08111f] text-[#ff9a3d]">
                <Smartphone className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#ff7000]">Recommended</p>
                <h2 id="in-app-title" className="mt-1 font-editorial text-3xl font-medium tracking-[-0.02em]">Request deletion in the app</h2>
              </div>
            </div>

            <ol className="mt-8 space-y-3">
              {deletionSteps.map(([title, description], index) => (
                <li key={title} className="grid grid-cols-[2.75rem_1fr] gap-4 rounded-2xl border border-[#eee4dc] bg-[#fffdfa] p-4 sm:p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff0e5] text-sm font-black tabular-nums text-[#b84f00]">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-extrabold text-[#08111f]">Step {index + 1}: {title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#687589]">{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="request-form-title" className="rounded-[28px] border border-[#e9d7bd] bg-[#fffaf2] p-6 shadow-[0_24px_70px_rgba(121,78,20,0.09)] sm:p-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b84f00]">Alternative option</p>
            <h2 id="request-form-title" className="mt-2 font-editorial text-4xl font-medium tracking-[-0.025em]">Can&apos;t access the app?</h2>
            <p className="mt-4 text-sm leading-7 text-[#5b6879]">Submit the registered phone number below. This records a deletion request for verification; it does not instantly delete an account.</p>

            {submitted ? (
              <div role="status" aria-live="polite" className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-700" aria-hidden="true" />
                <h3 className="mt-4 text-xl font-extrabold text-[#08111f]">Request received</h3>
                <p className="mt-2 text-sm leading-6 text-[#526176]">If this phone number is linked to a Darji account, the request has been recorded. Our team may contact you to verify ownership before deletion.</p>
              </div>
            ) : (
              <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
                <div>
                  <label htmlFor="deletion-phone" className="text-sm font-extrabold text-[#08111f]">Registered phone number</label>
                  <div className="mt-2 flex min-h-14 overflow-hidden rounded-xl border border-[#dfd1bd] bg-white transition focus-within:border-[#ff7000] focus-within:ring-3 focus-within:ring-[#ff7000]/12">
                    <span className="grid place-items-center border-r border-[#eee4dc] px-4 text-sm font-bold text-[#526176]">+91</span>
                    <input id="deletion-phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" required aria-invalid={phone.length > 0 && !phoneValid} aria-describedby="deletion-phone-help" value={phone} onChange={(event) => setPhone(event.target.value.slice(0, 14))} placeholder="98765 43210" className="min-w-0 flex-1 bg-transparent px-4 text-base font-semibold text-[#08111f] outline-none placeholder:text-[#9aa4b1]" />
                  </div>
                  <p id="deletion-phone-help" className={`mt-2 text-xs font-medium ${phone.length > 0 && !phoneValid ? "text-rose-700" : "text-[#7b8797]"}`}>{phone.length > 0 && !phoneValid ? "Enter a valid 10 digit Indian mobile number." : "Use the number registered with your Darji account."}</p>
                </div>

                <div>
                  <label htmlFor="deletion-reason" className="text-sm font-extrabold text-[#08111f]">Reason or message <span className="font-medium text-[#7b8797]">(optional)</span></label>
                  <textarea id="deletion-reason" name="reason" rows={4} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Tell us anything that may help us process your request." className="mt-2 w-full resize-y rounded-xl border border-[#dfd1bd] bg-white px-4 py-3 text-sm leading-6 text-[#08111f] outline-none transition placeholder:text-[#9aa4b1] focus:border-[#ff7000] focus:ring-3 focus:ring-[#ff7000]/12" />
                  <p className="mt-1 text-right text-xs tabular-nums text-[#7b8797]">{reason.length}/1000</p>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#ead8be] bg-white p-4">
                  <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#ff7000]" />
                  <span className="text-sm font-semibold leading-6 text-[#3f4c5e]">I understand that account deletion is permanent and cannot be undone.</span>
                </label>

                {formError ? <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">Could not submit the request: {formError}</p> : null}

                <button type="submit" disabled={!phoneValid || !confirmed || submitting} className="focus-ring inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ff7000] px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(255,112,0,0.22)] transition hover:-translate-y-0.5 hover:bg-[#e56500] disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-[#d5c9ba] disabled:shadow-none">
                  {submitting ? "Submitting request..." : "Request Account Deletion"}
                  {!submitting ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
                </button>
              </form>
            )}
          </section>
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <section aria-labelledby="deleted-title" className="rounded-[26px] border border-[#eee4dc] bg-white p-6 sm:p-8">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff0e5] text-[#d45d00]"><Database className="h-5 w-5" aria-hidden="true" /></span>
            <h2 id="deleted-title" className="mt-5 font-editorial text-3xl font-medium">What will be deleted</h2>
            <ul className="mt-5 space-y-3">
              {deletedItems.map((item) => <li key={item} className="flex gap-3 text-sm leading-6 text-[#526176]"><Check className="mt-1 h-4 w-4 shrink-0 text-[#ff7000]" aria-hidden="true" /><span>{item}</span></li>)}
            </ul>
          </section>

          <section aria-labelledby="retained-title" className="rounded-[26px] border border-[#eee4dc] bg-white p-6 sm:p-8">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#fff0e5] text-[#d45d00]"><FileClock className="h-5 w-5" aria-hidden="true" /></span>
            <h2 id="retained-title" className="mt-5 font-editorial text-3xl font-medium">Data we may retain</h2>
            <p className="mt-5 text-sm leading-7 text-[#526176]">Certain transaction, payment, invoice, fraud-prevention, dispute, security, tax, accounting, or legally required records may be retained for the period required by law or a legitimate compliance need. Access remains limited and the information is not kept longer than necessary for those purposes.</p>
          </section>
        </div>

        <section aria-labelledby="warning-title" className="mt-8 grid gap-5 rounded-[26px] border border-[#f2c28f] bg-[#fff3e4] p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#08111f] text-[#ff9a3d]"><ShieldAlert className="h-6 w-6" aria-hidden="true" /></span>
          <div>
            <h2 id="warning-title" className="text-lg font-black text-[#08111f]">Account deletion is permanent</h2>
            <p className="mt-1 text-sm leading-6 text-[#5c6572]">Once an approved deletion request is completed, the account and deletable account-linked information cannot be restored.</p>
          </div>
          <Link href="/" className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#d9b17e] bg-white px-5 text-sm font-black text-[#08111f] transition hover:border-[#ff7000] hover:text-[#d45d00]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to Darji
          </Link>
        </section>
      </section>

      <EditorialFooter />
    </main>
  );
}
