export type ContentBlock =
  | { type: "lead"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "subheading"; text: string }
  | { type: "quote"; text: string; author?: string; role?: string }
  | { type: "callout"; title: string; body: string; badge?: string }
  | { type: "image"; url: string; alt: string; caption?: string; credit?: string; fullWidth?: boolean }
  | { type: "numberedList"; title?: string; items: Array<{ step: string; title: string; desc: string }> }
  | { type: "comparison"; title: string; beforeTitle: string; beforeText: string; afterTitle: string; afterText: string; takeaway?: string }
  | { type: "takeaways"; title: string; items: string[] };

export type Author = {
  name: string;
  role: string;
  avatar: string;
  bio: string;
};

export type BlogArticle = {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  date: string;
  readTime: string;
  wordCount: number;
  image: string;
  category: "Tailoring" | "Alterations" | "Clothing Care" | "Fashion & Style" | "Craft & Heritage" | "Darji Stories";
  featured?: boolean;
  author: Author;
  blocks: ContentBlock[];
  tags: string[];
};

export const blogCategories = [
  "All Stories",
  "Tailoring",
  "Alterations",
  "Clothing Care",
  "Fashion & Style",
  "Craft & Heritage",
  "Darji Stories"
] as const;

export const defaultAuthors: Record<string, Author> = {
  masterRafiq: {
    name: "Master Rafiq Ahmed",
    role: "Master Cutter & Bespoke Pattern Specialist (32 yrs exp)",
    avatar: "/avatars/uncle.png",
    bio: "Trained under Chandni Chowk's royal tailoring lineages. Specializes in bespoke achkans, bandhgalas, and structural suit jacket tapering."
  },
  sunitaSharma: {
    name: "Sunita Sharma",
    role: "Senior Blouse Drape & Couture Fitting Lead (22 yrs exp)",
    avatar: "/avatars/aunt.png",
    bio: "Authority on regional Indian saree drapes, princess-cut blouse armhole calibration, and bespoke lehenga fitting."
  },
  ananyaSen: {
    name: "Ananya Sen",
    role: "Head of Garment Engineering & Quality at Darji",
    avatar: "/avatars/young female.png",
    bio: "Textile engineer and former runway production lead. Obsessed with translating human body posture into millimeter-exact pattern data."
  },
  vikramJoshi: {
    name: "Vikram Joshi",
    role: "Founder & Product Storyteller at Darji",
    avatar: "/avatars/young male.png",
    bio: "Building the digital infrastructure for India's 6 million independent tailoring craftspeople."
  }
};

export const blogArticles: BlogArticle[] = [
  {
    slug: "the-art-of-the-perfect-saree-blouse-fit",
    title: "The Art of the Saree Blouse: Darts, Armhole Calibration, and Modern Draping",
    subtitle: "Why the simplest garment is the hardest to cut, and how millimeter precision transforms poise and posture.",
    excerpt: "From Kanjeevaram silks to breezy chanderis, the saree blouse is an architectural feat. Here is the master tailor’s breakdown of cup depth, shoulder slope, and bust dart geometry.",
    date: "Sep 02, 2026",
    readTime: "6 min read",
    wordCount: 1380,
    image: "/editorial/blog-saree-blouse.jpg",
    category: "Fashion & Style",
    featured: true,
    author: defaultAuthors.sunitaSharma,
    tags: ["Saree Blouse", "Bespoke Couture", "Pattern Cutting", "Indian Fashion"],
    blocks: [
      {
        type: "lead",
        text: "There is an old saying among Old Delhi’s master cut-and-sew artisans: 'A suit covers the body; a saree blouse constructs its harmony.' No other garment in global fashion requires such structural tension combined with absolute freedom of movement."
      },
      {
        type: "paragraph",
        text: "When a saree blouse pulls backward at the neckline, bunches uncomfortably under the armpit, or gaps around the bust apex, the flaw is almost never in the fabric. It lies in the pattern curve—specifically the diagonal balance between the high point shoulder (HPS) and the under-bust apex point."
      },
      {
        type: "callout",
        badge: "Master Tailor's Rule",
        title: "The 1.5 cm Armhole Inset Principle",
        body: "For stiff silks (Banarasi, Paithani, Raw Silk), the front armhole must be scooped precisely 1.5 cm deeper than modern Western bodice blocks to accommodate the forward roll of the shoulder during Indian festive gatherings."
      },
      {
        type: "heading",
        text: "The Three Sacred Cut Geometries"
      },
      {
        type: "paragraph",
        text: "Depending on the drape weight of your saree and your chest contour, choosing the right pattern architecture determines whether you will feel effortlessly poised or constantly pulling your pallu back into place:"
      },
      {
        type: "numberedList",
        title: "Pattern Architectures Breakdown",
        items: [
          {
            step: "01",
            title: "Princess Cut (Four-Panel Contour)",
            desc: "Eliminates cross-chest dart lines, creating a seamless sculpt that flatters lightweight organza, georgette, and modern cocktail sarees."
          },
          {
            step: "02",
            title: "Traditional 4-Dart Katori Cut",
            desc: "The quintessential artisanal pattern for heavy heirloom silks. Distributes fabric tension across side, waist, center, and armhole darts for maximum bust support without stiff padding."
          },
          {
            step: "03",
            title: "Corset-Stitched Extended Hem",
            desc: "Modern structured silhouette featuring light flexible boning along the side seams, ideal for backless drapes and heavy zardozi embroidery."
          }
        ]
      },
      {
        type: "quote",
        text: "A well-cut blouse shouldn’t feel like armor. It should feel like a second skin that understands how you breathe, turn, and laugh.",
        author: "Sunita Sharma",
        role: "Darji Master Blouse Specialist"
      },
      {
        type: "comparison",
        title: "The Fit Diagnostic: Commercial Ready-Made vs. Darji Doorstep Tailored",
        beforeTitle: "Off-the-Rack Ready Blouse",
        beforeText: "Standardized symmetric armholes, non-adjustable shoulder straps that slip down, stiff synthetic foam padding that warps after dry cleaning, rigid neckline that chokes the collarbone.",
        afterTitle: "Darji Doorstep Bespoke Cut",
        afterText: "Custom asymmetric armhole depth matched to your posture, hand-sewn cotton interlining (astrat), breathable soft-cup reinforcement, invisible hook placket reinforcement with 2 inches of inner alteration margin.",
        takeaway: "Bespoke cut garments last over a decade and can be let out or taken in as your body naturally evolves."
      },
      {
        type: "heading",
        text: "How Darji Preserves Your Measurements"
      },
      {
        type: "paragraph",
        text: "When our doorstep fit expert visits your home, they do not just record basic bust and waist circumference. We document your shoulder slope angle, preferred neck plunge, cup spacing, and fabric grain alignment in your digital Darji Fit Profile. That means every subsequent blouse ordered—whether for Diwali or a family wedding—is cut to your exact anatomical memory."
      }
    ]
  },
  {
    slug: "how-to-alter-a-mens-suit-jacket",
    title: "The Master Tailor’s Guide to Suit Jacket Alterations: Shoulders, Sleeves & Drape",
    subtitle: "What can be perfectly tailored, what requires delicate surgery, and what should never be touched on a jacket.",
    excerpt: "Before discarding or settling for an ill-fitting blazer, understand the anatomy of lapel rolls, sleeve pitch, and waist suppression from master bespoke artisans.",
    date: "Sep 01, 2026",
    readTime: "7 min read",
    wordCount: 1620,
    image: "/editorial/blog-suit-alteration.jpg",
    category: "Alterations",
    featured: true,
    author: defaultAuthors.masterRafiq,
    tags: ["Suit Alterations", "Menswear", "Tailoring", "Bespoke Style"],
    blocks: [
      {
        type: "lead",
        text: "Nine out of ten off-the-rack suits purchased in stores look ordinary not because of the fabric, but because of three centimeters of excess cloth through the torso and a misplaced sleeve pitch. In the bespoke world, a jacket is sculpted, not merely sewn."
      },
      {
        type: "paragraph",
        text: "When clients book a Darji alteration pickup for their jackets, they often ask: 'Can this vintage Italian wool blazer really fit me like a custom Savile Row piece?' The answer depends on understanding which alteration axes maintain the jacket's structural soul."
      },
      {
        type: "heading",
        text: "The Hierarchy of Jacket Alterations"
      },
      {
        type: "numberedList",
        title: "From Effortless Tweaks to High-Precision Surgery",
        items: [
          {
            step: "01",
            title: "Sleeve Length & Shirt Cuff Reveal (High Precision)",
            desc: "The jacket sleeve should terminate precisely at the wrist bone, allowing 1.2 cm (half an inch) of crisp dress shirt cuff to peek through. If your jacket has functional buttonholes (surgeon cuffs), our master tailors shorten from the shoulder crown rather than the cuff edge."
          },
          {
            step: "02",
            title: "Waist Suppression (The V-Taper)",
            desc: "Taking in the two side seams and the center back vent removes the boxy potato-sack look and creates a clean athletic silhouette that elongates your torso."
          },
          {
            step: "03",
            title: "Shoulder Pad Reduction & Collar Roll Reset (Artisanal Surgery)",
            desc: "Fixing collar roll (that unsightly bump beneath your back collar) requires releasing the collar seam, trimming the canvas lining, and resetting the pitch to match your natural forward neck posture."
          }
        ]
      },
      {
        type: "callout",
        badge: "Craft Secret",
        title: "Never Alter Shoulder Seam Width By More Than 1.5 cm",
        body: "The shoulder seam is the foundation from which the entire jacket chest canvas hangs. If a jacket's shoulder extends more than 2 cm beyond your deltoid bone, it is generally better to exchange the jacket size rather than reconstruct the chest piece from scratch."
      },
      {
        type: "quote",
        text: "The jacket should kiss the collar of your shirt without gapping, drape cleanly over your chest without pulling horizontal X-creases at the button, and fall flush over your hips.",
        author: "Master Rafiq Ahmed",
        role: "Darji Master Pattern Cutter"
      },
      {
        type: "heading",
        text: "How Darji Doorstep Alteration Works For Formalwear"
      },
      {
        type: "paragraph",
        text: "Our doorstep fit partners carry specialized chalk pins, collar pitch guides, and measuring calipers to your home or office. We mark the exact drape lines while you stand in your natural posture, then transport your garment in protective dust-proof garment bags directly to our certified master tailoring guild."
      }
    ]
  },
  {
    slug: "fabric-care-secrets-linen-silk-khadi",
    title: "Raw Silk, Belgian Linen, and Handspun Khadi: Longevity Rituals for Natural Fibres",
    subtitle: "How to steam, press, preserve, and wash your most precious artisanal textiles so they improve with every passing decade.",
    excerpt: "Natural fibers are living materials that breathe, shift, and respond to moisture. Stop dry-cleaning raw silk to death and discover the ancestral care secrets of Indian master weavers.",
    date: "Aug 29, 2026",
    readTime: "5 min read",
    wordCount: 1240,
    image: "/animations/thread-roll.png",
    category: "Clothing Care",
    author: defaultAuthors.ananyaSen,
    tags: ["Fabric Care", "Linen", "Mulberry Silk", "Khadi", "Garment Longevity"],
    blocks: [
      {
        type: "lead",
        text: "Synthetic polyester garments degrade predictably into microplastics. Handwoven natural textiles—Matka silk, Belgian flax linen, combed Egyptian cotton, and organic desi khadi—possess a unique cellular memory. Treated with reverence, they soften, drape, and gain lustrous character with every year."
      },
      {
        type: "paragraph",
        text: "Yet modern urban laundry habits (harsh chemical dry-cleaning, scalding drum dryers, and excessive detergent salts) strip the natural sericin protein from silk and fracture the cellulose fibers of linen."
      },
      {
        type: "heading",
        text: "The Master Fabric Preservation Guide"
      },
      {
        type: "numberedList",
        title: "Caring For Delicate Natural Fibres",
        items: [
          {
            step: "01",
            title: "Mulberry & Tussar Raw Silk: The Steam & Shadow Rule",
            desc: "Never expose raw silk to direct midday sun. Always press on the reverse side while the cloth is slightly damp, using a clean muslin pressing cloth (astrat) between the iron and the silk."
          },
          {
            step: "02",
            title: "100% Belgian & Irish Linen: Embrace the Relaxed Crease",
            desc: "Linen fibers break if ironed bone dry with excessive pressure along the same fold line. Use high steam at medium-high heat and hang garments on wide contoured cedar hangers to maintain shoulder geometry."
          },
          {
            step: "03",
            title: "Handspun Khadi: The Cold Salt Rinse",
            desc: "Before first wear, soaking handspun khadi in cold water with a teaspoon of rock salt sets natural vegetable dyes and strengthens the handspun warp tension."
          }
        ]
      },
      {
        type: "callout",
        badge: "Darji Wardrobe Tip",
        title: "Ditch Wire Hangers Immediately",
        body: "Thin dry-cleaner wire hangers deform jacket shoulder pads and create permanent fabric stretching across delicate knit and silk garments. Use contoured wooden hangers with velvet crossbars."
      },
      {
        type: "takeaways",
        title: "Key Rituals For Heirlooms That Last Decades",
        items: [
          "Store heavy zari and Banarasi sarees rolled in unbleached white mulmul cloth rather than plastic garment bags.",
          "Refold heirloom silks along different crease lines every six months to prevent fiber fatigue.",
          "Use steam revival instead of repeated washing for wool suits and cashmere cardigans.",
          "Trust Darji's doorstep artisan pressing and restoration service for delicate zari restitching."
        ]
      }
    ]
  },
  {
    slug: "the-unseen-tailors-of-old-delhi",
    title: "The Unseen Guild: Portraits and Stories from Old Delhi’s 3rd-Generation Master Cutters",
    subtitle: "Behind the heavy wooden doors of Ballimaran and Shahjahanabad, master artisans preserve centuries of bespoke craftsmanship.",
    excerpt: "A deep-dive editorial into the generational knowledge of Indian tailors, the tactile intuition of master shears, and how Darji is bridging heritage craft with digital respect.",
    date: "Aug 26, 2026",
    readTime: "8 min read",
    wordCount: 1850,
    image: "/editorial/hero-tailor.jpg",
    category: "Craft & Heritage",
    featured: true,
    author: defaultAuthors.vikramJoshi,
    tags: ["Indian Heritage", "Master Artisans", "Delhi Crafts", "Storytelling"],
    blocks: [
      {
        type: "lead",
        text: "Walk through the narrow labyrinth of Ballimaran in Old Delhi at six in the morning, and before the tea vendors kindle their coal fires, you will hear the rhythmic, metallic snip-snip of 12-inch cast-iron tailoring shears echoing against limestone arches."
      },
      {
        type: "paragraph",
        text: "Here sits Master Rafiq Ahmed, whose grandfather drafted ceremonial sherwanis for royal courts and early post-independence dignitaries. Rafiq carries no computer, yet within three seconds of resting his palm against a customer’s shoulder blade, he knows if their right shoulder dips by 6 millimeters from carrying a laptop bag."
      },
      {
        type: "quote",
        text: "The cloth talks to you. If you pull it too tight, it fights back. If you cut it with love, it embraces the person who wears it for twenty years.",
        author: "Master Rafiq Ahmed",
        role: "Senior Guild Master, Ballimaran Studio"
      },
      {
        type: "heading",
        text: "The Tragedy of Broken Access"
      },
      {
        type: "paragraph",
        text: "For decades, these master craftsmen were trapped in an invisible economic corner: dependent on middlemen, negotiating in humid alleyways, and struggling to connect with modern young professionals across Gurgaon, South Delhi, and Whitefield who desperately craved authentic custom fit but could not brave three hours of traffic to visit."
      },
      {
        type: "callout",
        badge: "The Darji Mission",
        title: "Dignity, Direct Income, and Digital Scale",
        body: "Darji directly integrates verified neighborhood master artisans into our digital platform. We handle doorstep logistics, digitized customer measurements, insured transit, and premium packaging—so master tailors earn 40% more per garment while focusing purely on their lifelong craft."
      },
      {
        type: "heading",
        text: "Re-imagining the Tailoring Guild"
      },
      {
        type: "paragraph",
        text: "When you book a custom stitching or alteration order on Darji, your garment does not vanish into an anonymous sweatshop. It is routed to a certified master specialist in your city whose skills match your exact garment type—whether that is delicate hand-hemmed pashmina, raw silk sherwani, or tailored linen trousers."
      }
    ]
  },
  {
    slug: "why-doorstep-tailoring-needs-a-new-standard",
    title: "Why Doorstep Tailoring Needs a New Standard: The Architecture of Modern Garment Logistics",
    subtitle: "How Darji connects customers, verified master tailors, and delivery into one transparent ecosystem.",
    excerpt: "The Darji approach to photographic intake, verified partner matching, 7-point quality audits, and why the future of wardrobe care happens at your front door.",
    date: "Aug 20, 2026",
    readTime: "5 min read",
    wordCount: 1150,
    image: "/animations/cta-tailoring.png",
    category: "Darji Stories",
    author: defaultAuthors.vikramJoshi,
    tags: ["Manifesto", "Product", "Logistics", "Doorstep Service"],
    blocks: [
      {
        type: "lead",
        text: "Tailoring has always been intensely personal. A millimeter of seam margin defines the difference between a shirt that feels restrictive and one that moves with effortless poise. Yet for decades, the process of getting clothes fitted remained frustratingly broken."
      },
      {
        type: "paragraph",
        text: "Customers were forced to endure long commutes, chaotic fitting rooms, uncertain delivery dates, and the dreaded loop of having to re-explain fit issues three separate times. We built Darji because your wardrobe deserves a seamless, respectful, high-tech standard."
      },
      {
        type: "heading",
        text: "The Five Pillars of the Darji Standard"
      },
      {
        type: "numberedList",
        items: [
          {
            step: "01",
            title: "Doorstep Fitting & Photographic Intake",
            desc: "Schedule a calibrated pickup slot. Our concierge records measurements, fitting annotations, and fabric notes so nothing is lost in translation."
          },
          {
            step: "02",
            title: "Verified Master Tailor Routing",
            desc: "Garments are assigned specifically to artisans who specialize in that garment category (e.g. bridal blouse, formal suits, denim tapering)."
          },
          {
            step: "03",
            title: "7-Point Quality Check",
            desc: "Before return delivery, every seam, dart, hem, and stitch tension is audited against original customer notes by our quality desk."
          },
          {
            step: "04",
            title: "Transparent Upfront Pricing & Real-Time Tracking",
            desc: "No vague counter estimates or surprise price hikes. Live milestone tracking from pickup to artisan workbench to final delivery."
          },
          {
            step: "05",
            title: "Perfect Fit Guarantee",
            desc: "If the fit isn't 100% right on the first try, we re-collect and readjust the garment with complimentary express turnaround."
          }
        ]
      },
      {
        type: "quote",
        text: "Technology should never displace the master tailor’s hand. It should remove the friction so their craftsmanship shines.",
        author: "Vikram Joshi",
        role: "Founder, Darji"
      }
    ]
  },
  {
    slug: "how-darji-handles-measurements",
    title: "Measurements as Living Context: Beyond Tape Inches to Posture, Drape & Movement",
    subtitle: "Why two people with identical chest measurements wear clothes completely differently, and how Darji captures your true fit.",
    excerpt: "Photos, annotations, home fitting visits, and the subtle fit variables that shape a garment you love wearing every day.",
    date: "Aug 15, 2026",
    readTime: "4 min read",
    wordCount: 980,
    image: "/measurements.png",
    category: "Tailoring",
    author: defaultAuthors.ananyaSen,
    tags: ["Measurements", "Fitting Science", "Garment Tech", "Bespoke"],
    blocks: [
      {
        type: "lead",
        text: "A tape measure only captures two dimensions of a three-dimensional, living human being. When you record a 38-inch chest, that number fails to disclose whether the wearer has square athletic shoulders, a slight forward neck tilt, or prefers a relaxed drape over an Italian slim cut."
      },
      {
        type: "paragraph",
        text: "At Darji, we treat measurements as a rich context profile rather than isolated numbers. By pairing high-definition garment photos with calibrated home measurements and customer fit preferences, we ensure our tailoring partners execute with pinpoint accuracy."
      },
      {
        type: "callout",
        badge: "The Fit Vault",
        title: "Your Digital Darji Profile",
        body: "Once your measurements are recorded during your first Darji pickup visit, they are encrypted and stored in your profile. You can order repeat custom shirts, trousers, and kurta sets with a single tap."
      }
    ]
  },
  {
    slug: "building-trust-between-customers-tailors-and-delivery",
    title: "Building Trust in the Handoff: The Three-Way Harmony of Customer, Maker, and Courier",
    subtitle: "A behind-the-scenes look at how Darji coordinates three distinct worlds into one seamless service promise.",
    excerpt: "Most service failures occur in the blind spots between handoffs. Here is how Darji engineered transparency into every step of the journey.",
    date: "Aug 10, 2026",
    readTime: "5 min read",
    wordCount: 1100,
    image: "/animations/service-custom-stitching.png",
    category: "Darji Stories",
    author: defaultAuthors.vikramJoshi,
    tags: ["Operations", "Trust", "Tailoring Community", "Customer Experience"],
    blocks: [
      {
        type: "lead",
        text: "Trust in service design is not built by marketing slogans; it is built at the moments of transfer. When a customer hands over an expensive heirloom saree or an imported wool blazer, they need absolute certainty that their garment is insured, tracked, and treated with museum-grade care."
      },
      {
        type: "paragraph",
        text: "We spent eighteen months studying where traditional tailoring experiences broke down. The answer was almost universally in the handoffs: between customer notes and the tailor's workbench, and between the tailor's shop and the customer's doorstep."
      },
      {
        type: "heading",
        text: "Eliminating the Blind Spots"
      },
      {
        type: "paragraph",
        text: "Darji’s platform connects all three participants in real time. The customer receives status notifications with photos of the finished stitch. The tailor receives annotated digital cards with exact seam lines. And our doorstep delivery captains operate with padded, dust-sealed garment transit boxes."
      }
    ]
  }
];

export function getArticleBySlug(slug: string): BlogArticle | undefined {
  return blogArticles.find((article) => article.slug === slug);
}

export function getRelatedArticles(currentSlug: string, count = 3): BlogArticle[] {
  const current = getArticleBySlug(currentSlug);
  return blogArticles
    .filter((a) => a.slug !== currentSlug)
    .sort((a, b) => (a.category === current?.category ? -1 : 1))
    .slice(0, count);
}
