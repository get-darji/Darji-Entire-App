"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

type CustomerWebsiteSliderProps = {
  onBookPickup: () => void;
};

type ExploreCard = {
  title: string;
  description: string;
  image: string;
  alt: string;
  tone: string;
  size: "feature" | "standard" | "wide" | "half";
};

const exploreCards: ExploreCard[] = [
  { title: "Home & Décor", description: "Curtains, cushions, covers & more", image: "/custom-requests/home_decor.jpg", alt: "Custom curtains, cushions and coordinated home décor", tone: "bg-[#fbf5eb]", size: "feature" },
  { title: "Devotional", description: "Deity outfits, chunri, aasans & more", image: "/custom-requests/devotional_clothing.jpg", alt: "Handmade devotional clothing and fabric accessories", tone: "bg-[#fcf1ef]", size: "standard" },
  { title: "Doll & Toy", description: "Miniature outfits and accessories", image: "/custom-requests/doll_toy_clothing.jpg", alt: "Custom clothing and accessories for dolls and toys", tone: "bg-[#fff2f2]", size: "standard" },
  { title: "Bags & Accessories", description: "Totes, potlis, pouches and slings", image: "/custom-requests/bags_fabric_accessories.jpg", alt: "Custom fabric bags, potlis, pouches and accessories", tone: "bg-[#f5f5e9]", size: "standard" },
  { title: "Personalized", description: "Patches, badges, labels & more", image: "/custom-requests/personalized_fabric_items.jpg", alt: "Personalized fabric patches, badges and labels", tone: "bg-[#f0f4fd]", size: "standard" },
  { title: "Pet Clothing", description: "Pet outfits, bandanas and beds", image: "/custom-requests/pet_clothing_accessories.jpg", alt: "Custom clothing, bandanas and bedding for pets", tone: "bg-[#fff8ed]", size: "wide" },
  { title: "Costumes", description: "School, dance, event and stage wear", image: "/custom-requests/costumes_special_projects.jpg", alt: "Custom costumes for school, dance and stage events", tone: "bg-[#f8f1fc]", size: "half" },
  { title: "Upcycling", description: "Turn old fabric into something new", image: "/custom-requests/upcycling.jpg", alt: "Old garments transformed into new fabric creations", tone: "bg-[#eff7f0]", size: "half" },
  { title: "Other Custom", description: "Share photos, dimensions and your idea", image: "/custom-requests/other_custom_request.jpg", alt: "Custom fashion sketch, fabric swatches and measurements", tone: "bg-[#fff8ed]", size: "wide" }
];

const spanClasses: Record<ExploreCard["size"], string> = {
  feature: "col-span-2 md:col-span-8",
  standard: "col-span-1 md:col-span-4",
  wide: "col-span-2 md:col-span-12",
  half: "col-span-1 md:col-span-6"
};

function ExploreCard({ card, index, onSelect }: { card: ExploreCard; index: number; onSelect: () => void }) {
  const isHorizontal = card.size === "feature" || card.size === "wide" || card.size === "half";
  const isResponsiveHalf = card.size === "half";

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.045, 0.25), ease: [0.16, 1, 0.3, 1] }}
      className={`${spanClasses[card.size]} ${card.tone} group relative isolate overflow-hidden rounded-[1.65rem] sm:rounded-[2.25rem] ${
        isResponsiveHalf ? "min-h-[300px] sm:min-h-[390px] md:min-h-[260px]" : isHorizontal ? "min-h-[210px] sm:min-h-[260px]" : "min-h-[300px] sm:min-h-[390px]"
      }`}
    >
      <div
        className={`pointer-events-none absolute rounded-[42%] bg-white/48 blur-[1px] transition-transform duration-700 group-hover:scale-105 ${
          isResponsiveHalf
            ? "left-[9%] top-[6%] h-[57%] w-[82%] md:-bottom-8 md:left-auto md:right-[-4%] md:top-auto md:h-[96%] md:w-[61%]"
            : isHorizontal ? "-bottom-8 right-[-4%] h-[96%] w-[61%]" : "left-[9%] top-[6%] h-[57%] w-[82%]"
        }`}
        aria-hidden="true"
      />

      <div className={`relative z-10 flex h-full ${isResponsiveHalf ? "min-h-[300px] flex-col sm:min-h-[390px] md:min-h-[260px] md:flex-row md:items-stretch" : isHorizontal ? "min-h-[210px] flex-row items-stretch sm:min-h-[260px]" : "min-h-[300px] flex-col sm:min-h-[390px]"}`}>
        <div className={`${isResponsiveHalf ? "h-[58%] w-full px-2 pb-0 pt-3 sm:px-4 sm:pt-5 md:order-2 md:h-auto md:w-[62%] md:py-4" : isHorizontal ? "order-2 w-[58%] px-1 pb-2 pt-3 sm:w-[62%] sm:px-4 sm:py-4" : "h-[58%] w-full px-2 pb-0 pt-3 sm:px-4 sm:pt-5"} relative flex items-center justify-center`}>
          <img
            src={card.image}
            alt={card.alt}
            className="h-full w-full object-contain drop-shadow-[0_14px_18px_rgba(51,43,32,0.12)] transition-transform duration-700 ease-out group-hover:scale-[1.035]"
            loading={index < 2 ? "eager" : "lazy"}
          />
        </div>

        <div className={`relative z-10 flex ${isResponsiveHalf ? "min-h-[42%] flex-1 flex-col px-5 pb-5 pt-2 sm:px-7 sm:pb-7 md:w-[38%] md:flex-none md:justify-center md:px-7 md:py-8" : isHorizontal ? "w-[42%] flex-col justify-center px-5 py-6 sm:w-[38%] sm:px-9 sm:py-8" : "min-h-[42%] flex-1 flex-col px-5 pb-5 pt-2 sm:px-7 sm:pb-7"}`}>
          <h3 className="font-editorial text-[1.35rem] font-medium leading-[1.02] tracking-[-0.035em] text-[#151515] sm:text-[2rem]">{card.title}</h3>
          <p className="mt-2 text-[0.72rem] font-medium leading-[1.55] text-[#68727d] sm:text-[0.95rem]">{card.description}</p>
          <button
            type="button"
            onClick={onSelect}
            aria-label={`Start a ${card.title} request`}
            className="focus-ring mt-auto grid h-10 w-10 place-items-center rounded-full border border-[#9ba2a7]/65 bg-white/20 text-[#151515] transition duration-300 hover:border-[#151515] hover:bg-[#151515] hover:text-white sm:h-12 sm:w-12"
          >
            <ArrowRight className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export function CustomerWebsiteSlider({ onBookPickup }: CustomerWebsiteSliderProps) {
  return (
    <section className="overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28" aria-labelledby="explore-custom-heading">
      <div className="mx-auto max-w-[1180px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-9 max-w-xl sm:mb-12"
        >
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.34em] text-[#68727d] sm:text-xs">Explore</p>
          <h2 id="explore-custom-heading" className="mt-4 font-editorial text-[2.55rem] font-medium leading-[0.98] tracking-[-0.045em] text-[#111111] sm:text-6xl">
            More Things<br />We Can Make
          </h2>
          <p className="mt-4 max-w-md text-sm font-medium leading-relaxed text-[#68727d] sm:text-lg">
            From home décor to tiny outfits and one-of-a-kind fabric projects.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-12">
          {exploreCards.map((card, index) => (
            <ExploreCard key={card.title} card={card} index={index} onSelect={onBookPickup} />
          ))}
        </div>
      </div>
    </section>
  );
}
