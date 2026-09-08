import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { EditorialFooter } from "@/src/components/editorial-footer";
import { MarketingHeader } from "./site-actions";

export type LegalSection = {
  id: string;
  title: string;
  audience?: "Everyone" | "Customers" | "Tailors" | "Delivery partners";
  paragraphs: string[];
  bullets?: string[];
  note?: string;
};

type LegalPageProps = {
  title: string;
  intro: string;
  updatedOn: string;
  sections: LegalSection[];
  companion: { label: string; href: string };
};

export function LegalPage({ title, intro, updatedOn, sections, companion }: LegalPageProps) {
  return (
    <main className="min-h-screen bg-[#f8f7f4] text-[#101010] selection:bg-[#ff7000] selection:text-white">
      <MarketingHeader />

      <header className="bg-[#080808] py-20 text-white sm:py-28">
        <div className="shell max-w-6xl">
          <h1 className="max-w-4xl text-balance font-editorial text-[clamp(3.2rem,7vw,6rem)] font-normal leading-[0.94] tracking-[-0.03em]">
            {title}
          </h1>
          <p className="mt-7 max-w-[68ch] text-base leading-8 text-white/70 sm:text-lg">{intro}</p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/14 pt-5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
            <span>Updated {updatedOn}</span>
            <span>Customers · Tailors · Delivery partners</span>
          </div>
        </div>
      </header>

      <article className="shell max-w-6xl py-14 sm:py-20">
        <div className="grid items-start gap-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-20">
          <aside className="lg:sticky lg:top-28">
            <p className="font-editorial text-2xl text-[#08111f]">On this page</p>
            <nav aria-label="Legal page sections" className="mt-5 border-t border-black/12">
              <ol className="divide-y divide-black/10">
                {sections.map((section, index) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="focus-ring group flex min-h-12 items-center gap-3 py-3 text-sm leading-snug text-[#526176] transition hover:text-[#ff7000]">
                      <span className="w-6 shrink-0 tabular-nums text-black/38">{String(index + 1).padStart(2, "0")}</span>
                      <span className="font-semibold">{section.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div className="border-t border-black/12">
            {sections.map((section) => (
              <section id={section.id} key={section.id} className="scroll-mt-28 border-b border-black/12 py-10 sm:py-14">
                {section.audience ? <p className="mb-4 inline-flex min-h-7 items-center rounded-full bg-[#fff0e5] px-3 text-xs font-bold uppercase tracking-[0.12em] text-[#b84f00]">{section.audience}</p> : null}
                <h2 className="max-w-3xl text-balance font-editorial text-[clamp(2rem,4vw,3.25rem)] font-normal leading-[1.04] tracking-[-0.025em] text-[#08111f]">{section.title}</h2>
                <div className="mt-6 max-w-[72ch] space-y-5 text-[0.98rem] leading-8 text-[#526176] sm:text-base">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.bullets ? (
                    <ul className="space-y-3 pt-1 text-[#263448]">
                      {section.bullets.map((item) => <li key={item} className="grid grid-cols-[0.55rem_1fr] gap-3"><span aria-hidden="true" className="mt-[0.72rem] h-2 w-2 rounded-full bg-[#ff7000]" /><span>{item}</span></li>)}
                    </ul>
                  ) : null}
                  {section.note ? <p className="mt-7 rounded-[14px] bg-[#ece9e3] px-5 py-4 font-semibold leading-7 text-[#243044]">{section.note}</p> : null}
                </div>
              </section>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-8 rounded-[16px] bg-[#08111f] p-7 text-white sm:p-10 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Mail className="h-6 w-6 text-[#ff8a32]" aria-hidden="true" />
            <h2 className="mt-5 font-editorial text-3xl font-normal">Questions about this document?</h2>
            <p className="mt-3 max-w-2xl leading-7 text-white/68">Email <a className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white" href="mailto:support@darji.in">support@darji.in</a> with your account phone number and a clear description of your request. Never send an OTP by email.</p>
          </div>
          <Link href={companion.href} className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 border border-white/28 px-5 text-sm font-bold transition hover:border-white hover:bg-white hover:text-[#08111f]">{companion.label} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </article>

      <EditorialFooter />
    </main>
  );
}
