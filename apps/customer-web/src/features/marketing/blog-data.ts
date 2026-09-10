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
  | { type: "table"; title: string; columns: [string, string]; rows: Array<{ label: string; values: [string, string] }> }
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
  category: "Darji Stories";
  featured?: boolean;
  author: Author;
  blocks: ContentBlock[];
  tags: string[];
};

export const blogCategories = ["All Stories", "Darji Stories"] as const;

const amanKumarSah: Author = {
  name: "Aman Kumar Sah",
  role: "Founder & CEO, Darji",
  avatar: "/avatars/founder-pfp.png",
  bio: "Aman founded Darji in June 2026 to connect skilled local tailors directly with customers and make dependable tailoring easier to access."
};

export const blogArticles: BlogArticle[] = [
  {
    slug: "founder-story-darji",
    title: "Founder Story — Darji",
    subtitle: "How one founder turned his mother’s struggle into a mission to make tailoring easier for customers and fairer for tailors.",
    excerpt: "Darji began at home, with a skilled mother earning ₹20–30 per garment while spending hours travelling to collect and return the work.",
    date: "Sep 09, 2026",
    readTime: "6 min read",
    wordCount: 1120,
    image: "/editorial/story-origin.jpg",
    category: "Darji Stories",
    featured: true,
    author: amanKumarSah,
    tags: ["Founder Story", "Darji", "Tailors", "Doorstep Service"],
    blocks: [
      {
        type: "lead",
        text: "Most startups begin with a pitch deck, a market report, or a whiteboard session. Darji began somewhere far more ordinary: at home, watching a mother work."
      },
      {
        type: "quote",
        text: "If food, groceries and taxis can reach our doorstep, why can’t tailoring?",
        author: "Aman Kumar Sah",
        role: "Founder & CEO, Darji"
      },
      {
        type: "heading",
        text: "A Story That Didn’t Start in a Boardroom"
      },
      {
        type: "paragraph",
        text: "Aman Kumar Sah’s mother took on small tailoring jobs—hemming trousers, replacing buttons, and fixing torn seams. The work itself was never the hard part. The hard part was everything around it."
      },
      {
        type: "paragraph",
        text: "She would travel to a local dealer, collect garments, carry them home, complete each job with care, and then make the trip again to return them. For that entire cycle of walking, waiting, and back-and-forth travel, she might earn as little as ₹20 to ₹30."
      },
      {
        type: "paragraph",
        text: "Watching this pattern repeat week after week, Aman kept returning to the same thought: something about this doesn’t add up."
      },
      {
        type: "heading",
        text: "The Real Problem Wasn’t the Stitching—It Was Access"
      },
      {
        type: "paragraph",
        text: "The tailoring itself was never the bottleneck. His mother had the skill and experience. What she didn’t have was a direct, reliable way to reach people who needed that skill."
      },
      {
        type: "paragraph",
        text: "Across India, many skilled tailors and home-based garment workers face the same limitation. They can stitch, alter, repair, and customize clothing to a professional standard, but their income often depends on the dealers or shopkeepers they can reach rather than the quality of their work."
      },
      {
        type: "callout",
        badge: "The insight",
        title: "Skill was never the missing piece.",
        body: "They have the skill. They can do the work. What they consistently lack is direct access to customers."
      },
      {
        type: "quote",
        text: "What if the work could come to the tailor, instead of the tailor having to chase the work?"
      },
      {
        type: "heading",
        text: "The Customer Side of the Same Problem"
      },
      {
        type: "paragraph",
        text: "Finding a dependable tailor is still surprisingly inconvenient. It can mean asking for recommendations, visiting several shops, explaining the work, negotiating a price, and making repeated trips to drop off and collect the garment. Even then, customers may not know how the final result will turn out until it is too late to change it."
      },
      {
        type: "paragraph",
        text: "Meanwhile, food delivery, grocery shopping, and cab bookings had already become a few taps away. That contrast led Aman to the question that would define Darji."
      },
      {
        type: "quote",
        text: "If food, groceries and taxis can reach our doorstep, why can’t tailoring?",
        author: "Aman Kumar Sah",
        role: "Founder & CEO, Darji"
      },
      {
        type: "heading",
        text: "Building Darji: One Platform, Two Sides of the Same Coin"
      },
      {
        type: "paragraph",
        text: "Aman founded Darji in June 2026 with a clear goal: build one platform that solves the problem for tailors and customers together."
      },
      {
        type: "table",
        title: "How Darji helps both sides",
        columns: ["For customers", "For tailors"],
        rows: [
          { label: "Connection", values: ["Create a request online and connect with local tailors.", "Connect directly with nearby customers who need their skills."] },
          { label: "Choice", values: ["Compare quotations before choosing a tailor.", "Reduce dependence on middlemen and local dealers."] },
          { label: "Convenience", values: ["Track the order and use doorstep pickup and delivery.", "Spend more time on the craft and less time chasing work."] },
          { label: "Growth", values: ["Get a clearer, more predictable tailoring experience.", "Build a reputation and grow a customer base over time."] }
        ]
      },
      {
        type: "paragraph",
        text: "Darji is not trying to replace local tailors or make their skills obsolete. The goal is the opposite: to put technology to work for them, so their skill—not their access to dealers—determines how much they can earn."
      },
      {
        type: "heading",
        text: "Why This Story Matters Beyond One Family"
      },
      {
        type: "paragraph",
        text: "The idea began with something personal, but the pattern Aman saw at home reflects a much larger problem. Skilled workers need reliable access to customers, while customers need a simpler way to find trustworthy tailoring services."
      },
      {
        type: "comparison",
        title: "The gap Darji is working to close",
        beforeTitle: "Skilled tailors",
        beforeText: "Tailors, alteration experts, and garment specialists whose income is limited by access to customers rather than talent.",
        afterTitle: "Customers",
        afterText: "People who want reliable, convenient, and transparent tailoring but do not have an easy way to find it.",
        takeaway: "Darji uses technology as the bridge, not as a replacement for craftsmanship."
      },
      {
        type: "heading",
        text: "Where Darji Stands Today"
      },
      {
        type: "paragraph",
        text: "Darji is still in its early days. There are more tailors to onboard, more areas to reach, and more features to build. The platform is a work in progress, shaped by continuous learning rather than a fixed, finished plan."
      },
      {
        type: "numberedList",
        title: "The mission remains simple",
        items: [
          { step: "01", title: "Make tailoring more convenient", desc: "Give customers a clear, doorstep-first service without shop-hopping or repeated trips." },
          { step: "02", title: "Create fairer opportunities", desc: "Help tailors find more consistent work so skill, not access, can determine income." },
          { step: "03", title: "Connect people through technology", desc: "Close the gap between people who have a skill and people who need it." }
        ]
      },
      {
        type: "heading",
        text: "The Bottom Line"
      },
      {
        type: "paragraph",
        text: "Darji didn’t begin with a business plan or market report. It began with a simple, uncomfortable observation: a skilled woman travelling back and forth for a ₹20 job because access—not ability—was holding her back."
      },
      {
        type: "callout",
        badge: "Where it began",
        title: "It didn’t start in an office. It started at home.",
        body: "That observation became a question, and that question became Darji."
      }
    ]
  }
];

export function getArticleBySlug(slug: string) {
  return blogArticles.find((article) => article.slug === slug);
}

export function getRelatedArticles(slug: string, limit = 3) {
  return blogArticles.filter((article) => article.slug !== slug).slice(0, limit);
}
