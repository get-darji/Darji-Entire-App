import { EditorialFooter } from "@/src/components/editorial-footer";
import { MarketingHeader } from "./site-actions";

type LegalSection = { title: string; body: string };

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <main className="min-h-screen bg-[#f8f7f4] text-[#101010] selection:bg-black selection:text-white">
      <MarketingHeader />
      <header className="bg-[#080808] py-20 text-white sm:py-28">
        <div className="shell max-w-4xl">
          <h1 className="max-w-3xl font-editorial text-[clamp(3.2rem,7vw,6rem)] font-normal leading-[0.94] tracking-[-0.03em]">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/66">{intro}</p>
        </div>
      </header>
      <article className="shell max-w-4xl py-16 sm:py-24">
        <div className="divide-y divide-black/10 border-y border-black/10">
          {sections.map((section) => (
            <section key={section.title} className="grid gap-4 py-9 md:grid-cols-[0.42fr_1fr] md:gap-12">
              <h2 className="font-editorial text-2xl font-normal text-black">{section.title}</h2>
              <p className="max-w-[68ch] text-base leading-8 text-[#4b5563]">{section.body}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 text-sm text-[#6b7280]">Questions? Email <a className="font-semibold text-black underline underline-offset-4" href="mailto:support@darji.in">support@darji.in</a>.</p>
      </article>
      <EditorialFooter />
    </main>
  );
}
