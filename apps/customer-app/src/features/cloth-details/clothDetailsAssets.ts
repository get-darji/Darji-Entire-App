import { ImageSourcePropType } from "react-native";

export interface ExplanationInfo {
  title: string;
  shortExplanation: string;
  detailedPoints?: string[];
  durationSeconds?: number;
}

export const FIT_ASSETS: Record<string, ImageSourcePropType> = {
  Men: require("../../../assets/cloth-details/order-v2/fit/men.jpg"),
  Women: require("../../../assets/cloth-details/order-v2/fit/women.jpg"),
  Kids: require("../../../assets/cloth-details/order-v2/fit/kids.jpg"),
  "Unisex / Uniform / Other": require("../../../assets/cloth-details/order-v2/fit/unisex.jpg")
};

export const CATEGORY_ASSETS: Record<string, ImageSourcePropType> = {
  "new-stitching": require("../../../assets/cloth-details/order-v2/categories/new_stitching.jpg"),
  "New Stitching": require("../../../assets/cloth-details/order-v2/categories/new_stitching.jpg"),
  "alteration-fitting": require("../../../assets/cloth-details/order-v2/categories/alteration.jpg"),
  "Alteration & Fitting": require("../../../assets/cloth-details/order-v2/categories/alteration.jpg"),
  "repair-mending": require("../../../assets/cloth-details/order-v2/categories/repair.jpg"),
  "Repair & Mending": require("../../../assets/cloth-details/order-v2/categories/repair.jpg"),
  "embroidery-custom": require("../../../assets/cloth-details/order-v2/categories/embroidery.jpg"),
  "Embroidery & Custom Work": require("../../../assets/cloth-details/order-v2/categories/embroidery.jpg"),
  "finishing-work": require("../../../assets/cloth-details/order-v2/categories/finishing.jpg"),
  "Finishing Work": require("../../../assets/cloth-details/order-v2/categories/finishing.jpg"),
  other: require("../../../assets/cloth-details/order-v2/categories/other.jpg"),
  Other: require("../../../assets/cloth-details/order-v2/categories/other.jpg")
};

export const GARMENT_ASSETS: Record<string, ImageSourcePropType> = {
  Kurta: require("../../../assets/cloth-details/order-v2/garments/kurta.jpg"),
  "Kurta Pajama": require("../../../assets/cloth-details/order-v2/garments/kurta_pajama.jpg"),
  Shirt: require("../../../assets/cloth-details/order-v2/garments/shirt.jpg"),
  Trousers: require("../../../assets/cloth-details/order-v2/garments/trousers.jpg"),
  Suit: require("../../../assets/cloth-details/order-v2/garments/suit.jpg"),
  Blazer: require("../../../assets/cloth-details/order-v2/garments/blazer.jpg"),
  Waistcoat: require("../../../assets/cloth-details/order-v2/garments/waistcoat.jpg"),
  Sherwani: require("../../../assets/cloth-details/order-v2/garments/sherwani.jpg"),
  "Pathani Suit": require("../../../assets/cloth-details/order-v2/garments/pathani_suit.jpg"),
  Blouse: require("../../../assets/cloth-details/order-v2/garments/blouse.jpg"),
  Kurti: require("../../../assets/cloth-details/order-v2/garments/kurti.jpg"),
  "Salwar Suit": require("../../../assets/cloth-details/order-v2/garments/salwar_suit.jpg"),
  Dress: require("../../../assets/cloth-details/order-v2/garments/dress.jpg"),
  Top: require("../../../assets/cloth-details/order-v2/garments/top.jpg"),
  Skirt: require("../../../assets/cloth-details/order-v2/garments/skirt.jpg"),
  Palazzo: require("../../../assets/cloth-details/order-v2/garments/palazzo.jpg"),
  Lehenga: require("../../../assets/cloth-details/order-v2/garments/lehenga.jpg"),
  Anarkali: require("../../../assets/cloth-details/order-v2/garments/anarkali.jpg"),
  Frock: require("../../../assets/cloth-details/order-v2/garments/kids_frock.jpg"),
  Shorts: require("../../../assets/cloth-details/order-v2/garments/kids_shorts.jpg"),
  Pants: require("../../../assets/cloth-details/order-v2/garments/kids_pants.jpg"),
  "School Uniform": require("../../../assets/cloth-details/order-v2/garments/school_uniform.jpg"),
  "Office Uniform": require("../../../assets/cloth-details/order-v2/garments/office_uniform.jpg"),
  "Chef Uniform": require("../../../assets/cloth-details/order-v2/garments/chef_uniform.jpg"),
  "Medical Uniform": require("../../../assets/cloth-details/order-v2/garments/medical_uniform.jpg"),
  "College Uniform": require("../../../assets/cloth-details/order-v2/garments/college_uniform.jpg"),
  "Custom Garment": require("../../../assets/cloth-details/order-v2/garments/custom_garment.jpg"),
  Other: require("../../../assets/cloth-details/order-v2/garments/other_garment.jpg")
};

const KIDS_GARMENT_ASSETS: Record<string, ImageSourcePropType> = {
  Frock: require("../../../assets/cloth-details/order-v2/garments/kids_frock.jpg"),
  Dress: require("../../../assets/cloth-details/order-v2/garments/kids_dress.jpg"),
  Kurta: require("../../../assets/cloth-details/order-v2/garments/kids_kurta.jpg"),
  Shirt: require("../../../assets/cloth-details/order-v2/garments/kids_shirt.jpg"),
  Shorts: require("../../../assets/cloth-details/order-v2/garments/kids_shorts.jpg"),
  Pants: require("../../../assets/cloth-details/order-v2/garments/kids_pants.jpg"),
  Lehenga: require("../../../assets/cloth-details/order-v2/garments/kids_lehenga.jpg"),
  Suit: require("../../../assets/cloth-details/order-v2/garments/kids_suit.jpg"),
  "School Uniform": require("../../../assets/cloth-details/order-v2/garments/kids_school_uniform.jpg"),
  Other: require("../../../assets/cloth-details/order-v2/garments/kids_other.jpg")
};

export const WORK_SERVICE_ASSETS: Record<string, ImageSourcePropType> = {
  // New Stitching
  "Stitch from Fabric": require("../../../assets/cloth-details/order-v2/services/stitch_from_fabric.jpg"),
  "Copy Existing Garment": require("../../../assets/cloth-details/order-v2/services/copy_garment.jpg"),
  "Stitch from Reference / Design": require("../../../assets/cloth-details/order-v2/services/stitch_from_reference.jpg"),

  // Alteration & Fitting
  Tighten: require("../../../assets/cloth-details/order-v2/services/tighten.jpg"),
  Loosen: require("../../../assets/cloth-details/order-v2/services/loosen.jpg"),
  "Waist Adjustment": require("../../../assets/cloth-details/order-v2/services/waist_adjustment.jpg"),
  "Sleeve Adjustment": require("../../../assets/cloth-details/order-v2/services/sleeve_adjustment.jpg"),
  "Shoulder Adjustment": require("../../../assets/cloth-details/order-v2/services/shoulder_adjustment.jpg"),
  "Neck Adjustment": require("../../../assets/cloth-details/order-v2/services/neck_adjustment.jpg"),
  Shorten: require("../../../assets/cloth-details/order-v2/services/shorten.jpg"),
  Lengthen: require("../../../assets/cloth-details/order-v2/services/lengthen.jpg"),
  "General Fitting": require("../../../assets/cloth-details/order-v2/services/general_fitting.jpg"),

  // Repair & Mending
  "Torn Seam Repair": require("../../../assets/cloth-details/order-v2/services/torn_seam_repair.jpg"),
  "Hole / Tear Repair": require("../../../assets/cloth-details/order-v2/services/hole_repair.jpg"),
  "Zip Repair": require("../../../assets/cloth-details/order-v2/services/zip_repair.jpg"),
  "Zip Replacement": require("../../../assets/cloth-details/order-v2/services/zip_replacement.jpg"),
  "Button Replacement": require("../../../assets/cloth-details/order-v2/services/button_replacement.jpg"),
  "Hook Replacement": require("../../../assets/cloth-details/order-v2/services/hook_replacement.jpg"),
  "Elastic Replacement": require("../../../assets/cloth-details/order-v2/services/elastic_replacement.jpg"),
  "Pocket Repair": require("../../../assets/cloth-details/order-v2/services/pocket_repair.jpg"),

  // Embroidery & Custom Work
  Embroidery: require("../../../assets/cloth-details/order-v2/services/embroidery_detail.jpg"),
  "Lace Work": require("../../../assets/cloth-details/order-v2/services/lace_work.jpg"),
  "Border Work": require("../../../assets/cloth-details/order-v2/services/border_work.jpg"),
  "Patch / Appliqué Work": require("../../../assets/cloth-details/order-v2/services/patch_work.jpg"),
  "Custom Design Modification": require("../../../assets/cloth-details/order-v2/services/custom_modification.jpg"),

  // Finishing Work
  Hemming: require("../../../assets/cloth-details/order-v2/services/hemming.jpg"),
  Pico: require("../../../assets/cloth-details/order-v2/services/pico.jpg"),
  "Fall Stitching": require("../../../assets/cloth-details/order-v2/services/fall_stitching.jpg"),
  "Lining Work": require("../../../assets/cloth-details/order-v2/services/lining_work.jpg"),
  "Minor Finishing": require("../../../assets/cloth-details/order-v2/services/minor_finishing.jpg")
};

export const EXPLANATIONS: Record<string, ExplanationInfo> = {
  // Fit types
  Men: {
    title: "Men's Tailoring",
    shortExplanation: "Bespoke tailoring, custom suits, kurtas, shirts, trousers, and ethnic wear tailored for men.",
    durationSeconds: 24
  },
  Women: {
    title: "Women's Tailoring",
    shortExplanation: "Designer blouses, kurtis, suits, lehengas, dresses, and customized fittings for women.",
    durationSeconds: 26
  },
  Kids: {
    title: "Kids' Tailoring",
    shortExplanation: "Comfortable, neatly stitched festive frocks, kurtas, uniforms, and party wear for boys and girls.",
    durationSeconds: 20
  },
  "Unisex / Uniform / Other": {
    title: "Uniforms & Custom Apparel",
    shortExplanation: "School, medical, corporate uniforms, and customized garments stitched to exact requirements.",
    durationSeconds: 25
  },

  // Service Categories
  "New Stitching": {
    title: "New Stitching Service",
    shortExplanation: "Stitch a brand-new custom garment from your raw fabric, existing sample, or design reference.",
    detailedPoints: [
      "Expert tailor visits your home for precision measurements",
      "Custom neckline, sleeve, and fit styling of your choice",
      "High quality thread and inner seam finishes"
    ],
    durationSeconds: 38
  },
  "Alteration & Fitting": {
    title: "Alteration & Fitting",
    shortExplanation: "Adjust your existing clothes to fit you perfectly — tighten, loosen, shorten, or reshape.",
    detailedPoints: [
      "Precision waist, chest, shoulder, and sleeve adjustments",
      "Preserves original stitches and clean garment lines",
      "Quick turnaround with doorstep pickup"
    ],
    durationSeconds: 32
  },
  "Repair & Mending": {
    title: "Repair & Mending",
    shortExplanation: "Restore your favorite clothes by repairing torn seams, holes, zips, buttons, and hooks.",
    detailedPoints: [
      "Invisible darning for tears and holes",
      "Heavy-duty smooth zipper and button replacement",
      "Reinforced pocket and seam repairs"
    ],
    durationSeconds: 30
  },
  "Embroidery & Custom Work": {
    title: "Embroidery & Custom Work",
    shortExplanation: "Elevate your garment with handcrafted zari embroidery, designer laces, borders, and motifs.",
    detailedPoints: [
      "Fine thread and zari hand embroidery",
      "Gotta patti, lace attachment, and border styling",
      "Custom neckline and back pattern modifications"
    ],
    durationSeconds: 35
  },
  "Finishing Work": {
    title: "Finishing Work",
    shortExplanation: "Professional finishing touches including hemming, pico, saree fall stitching, and soft lining.",
    detailedPoints: [
      "Delicate pico edging for dupattas and sarees",
      "Protective saree fall stitching with twin lockstitch",
      "Invisible bottom hemming and clean edge sealing"
    ],
    durationSeconds: 28
  },

  // Work Services
  Hemming: {
    title: "Hemming",
    shortExplanation: "Hemming turns under and stitches the raw lower edge of trousers, skirts, or kurtas for a clean finish.",
    durationSeconds: 22
  },
  Pico: {
    title: "Pico",
    shortExplanation: "Pico creates a delicate, decorative rolled zigzag edge along light fabrics like chiffon, georgette, and dupattas.",
    durationSeconds: 20
  },
  "Fall Stitching": {
    title: "Fall Stitching",
    shortExplanation: "Attaches a soft cotton protective border to the bottom inner edge of a saree to give weight and graceful drape.",
    durationSeconds: 25
  },
  "Lining Work": {
    title: "Lining Work",
    shortExplanation: "Adds a comfortable, breathable inner fabric layer inside your garment for opacity, comfort, and structure.",
    durationSeconds: 26
  },
  "Minor Finishing": {
    title: "Minor Finishing",
    shortExplanation: "Includes seam thread trimming, hook tighteners, edge sealing, and steam pressing for a showroom finish.",
    durationSeconds: 18
  },
  Tighten: {
    title: "Tighten Garment",
    shortExplanation: "Takes in excess fabric along the sides or contours to give a closer, sharper fit.",
    durationSeconds: 20
  },
  Loosen: {
    title: "Loosen Garment",
    shortExplanation: "Opens existing internal seam allowances to provide extra room, comfort, and breathing space.",
    durationSeconds: 20
  },
  "Waist Adjustment": {
    title: "Waist Adjustment",
    shortExplanation: "Alters the waistband on trousers, jeans, or skirts to fit snugly and comfortably around your waist.",
    durationSeconds: 22
  },
  "Sleeve Adjustment": {
    title: "Sleeve Adjustment",
    shortExplanation: "Shortens, lengthens, or narrows the sleeves and cuffs for the ideal arm fit and look.",
    durationSeconds: 20
  },
  "Shoulder Adjustment": {
    title: "Shoulder Adjustment",
    shortExplanation: "Adjusts the shoulder slope and seam position to eliminate drooping or tightness.",
    durationSeconds: 24
  },
  "Neck Adjustment": {
    title: "Neck Adjustment",
    shortExplanation: "Reshapes or deepens collars and necklines for optimal comfort and your desired neckline cut.",
    durationSeconds: 22
  },
  Shorten: {
    title: "Shorten Length",
    shortExplanation: "Reduces the total length of your garment to match your exact preferred height.",
    durationSeconds: 18
  },
  Lengthen: {
    title: "Lengthen Garment",
    shortExplanation: "Releases hem allowances to add length to kurtas, trousers, or skirts.",
    durationSeconds: 20
  },
  "General Fitting": {
    title: "General Fitting",
    shortExplanation: "Comprehensive multi-point assessment where a tailor adjusts all key fitting points for a bespoke feel.",
    durationSeconds: 28
  },
  "Torn Seam Repair": {
    title: "Torn Seam Repair",
    shortExplanation: "Restitches separated or split fabric seams using heavy-duty reinforced matching thread.",
    durationSeconds: 19
  },
  "Hole / Tear Repair": {
    title: "Hole / Tear Repair (Darning)",
    shortExplanation: "Invisible darning neatly weaves matching threads across tears or holes to restore the fabric weave.",
    durationSeconds: 25
  },
  "Zip Repair": {
    title: "Zip Repair",
    shortExplanation: "Fixes misaligned teeth or replaces faulty slider pulls so your zipper slides smoothly again.",
    durationSeconds: 20
  },
  "Zip Replacement": {
    title: "Zip Replacement",
    shortExplanation: "Replaces broken or jammed zippers with a brand new, smooth, color-matched heavy duty zipper.",
    durationSeconds: 24
  },
  "Button Replacement": {
    title: "Button Replacement",
    shortExplanation: "Replaces missing or broken buttons with matching high-quality horn, mother-of-pearl, or metal buttons.",
    durationSeconds: 18
  },
  "Hook Replacement": {
    title: "Hook Replacement",
    shortExplanation: "Attaches secure, rust-proof metal hooks and eyelets for blouses, skirts, or trousers.",
    durationSeconds: 18
  },
  "Elastic Replacement": {
    title: "Elastic Replacement",
    shortExplanation: "Replaces worn-out, stretched elastic bands with durable new high-stretch elastic in waistbands.",
    durationSeconds: 20
  },
  "Pocket Repair": {
    title: "Pocket Repair",
    shortExplanation: "Repairs torn inner pocket linings and reinforces pocket openings with bartack stitches.",
    durationSeconds: 20
  },
  Embroidery: {
    title: "Embroidery Work",
    shortExplanation: "Adds custom thread, zari, sequins, or floral embroidery motifs to enhance your outfit.",
    durationSeconds: 30
  },
  "Lace Work": {
    title: "Lace Work",
    shortExplanation: "Stitches delicate designer lace along hemlines, cuffs, or necklines for an elevated aesthetic.",
    durationSeconds: 22
  },
  "Border Work": {
    title: "Border Work",
    shortExplanation: "Attaches gotta patti, velvet, or embroidered borders along dupattas, sarees, or lehengas.",
    durationSeconds: 25
  },
  "Patch / Appliqué Work": {
    title: "Patch / Appliqué Work",
    shortExplanation: "Stitches decorative or reinforcing fabric patches and motifs seamlessly onto garments.",
    durationSeconds: 24
  },
  "Custom Design Modification": {
    title: "Custom Design Modification",
    shortExplanation: "Customizes cuts, neck styles, sleeve patterns, and styling details to your creative vision.",
    durationSeconds: 30
  },
  "Stitch from Fabric": {
    title: "Stitch from Fabric",
    shortExplanation: "Tailors a complete new custom outfit from your raw unstitched fabric to your exact measurements.",
    durationSeconds: 35
  },
  "Copy Existing Garment": {
    title: "Copy Existing Garment",
    shortExplanation: "Replicates the exact fit, cut, and pattern of your favorite well-fitting sample garment.",
    durationSeconds: 30
  },
  "Stitch from Reference / Design": {
    title: "Stitch from Reference / Design",
    shortExplanation: "Tailors a custom outfit based on a photo, sketch, or design inspiration you share with us.",
    durationSeconds: 32
  },

  // Garments
  Kurta: {
    title: "Kurta",
    shortExplanation: "Classic traditional tunic with custom collar, placket, and side slit styling.",
    durationSeconds: 22
  },
  "Kurta Pajama": {
    title: "Kurta Pajama Set",
    shortExplanation: "Coordinated two-piece traditional kurta with comfortable tailored pajama or churidar trousers.",
    durationSeconds: 24
  },
  Shirt: {
    title: "Shirt",
    shortExplanation: "Formal or casual shirt with tailored collar, cuffs, placket, and custom body fit.",
    durationSeconds: 22
  },
  Trousers: {
    title: "Trousers",
    shortExplanation: "Tailored formal or casual trousers with custom waistband, pleats, and crisp leg crease.",
    durationSeconds: 22
  },
  Suit: {
    title: "2-Piece / 3-Piece Suit",
    shortExplanation: "Bespoke tailored suit jacket and matching trousers crafted for weddings, business, and formal occasions.",
    durationSeconds: 30
  },
  Blazer: {
    title: "Blazer",
    shortExplanation: "Structured single or double-breasted sport coat with custom notch/peak lapels and pocket styling.",
    durationSeconds: 25
  },
  Waistcoat: {
    title: "Waistcoat / Nehru Jacket",
    shortExplanation: "Sleeveless tailored vest or Nehru jacket with mandarin collar and welt pockets.",
    durationSeconds: 22
  },
  Sherwani: {
    title: "Sherwani",
    shortExplanation: "Royal long tailored wedding coat with ornate zari embroidery, mandarin collar, and royal buttons.",
    durationSeconds: 32
  },
  "Pathani Suit": {
    title: "Pathani Suit",
    shortExplanation: "Traditional collared suit with shoulder epaulettes, chest flap pockets, and salwar pants.",
    durationSeconds: 24
  },
  Blouse: {
    title: "Saree Blouse",
    shortExplanation: "Designer padded or non-padded saree choli with custom front/back neck designs and sleeve trims.",
    durationSeconds: 25
  },
  Kurti: {
    title: "Kurti",
    shortExplanation: "Contemporary or ethnic tunic with customized neckline, side slits, and length.",
    durationSeconds: 22
  },
  "Salwar Suit": {
    title: "Salwar Suit Set",
    shortExplanation: "Three-piece ethnic ensemble including tailored kameez top, pleated salwar pants, and dupatta finishing.",
    durationSeconds: 26
  },
  Dress: {
    title: "Dress / Gown",
    shortExplanation: "A-line, maxi, or flared western/indo-western dress tailored to your silhouette.",
    durationSeconds: 24
  },
  Top: {
    title: "Top / Blouse",
    shortExplanation: "Modern tailored top with custom sleeves, collar, and hem finish.",
    durationSeconds: 20
  },
  Skirt: {
    title: "Skirt",
    shortExplanation: "Flared, pleated, or pencil skirt with custom waistband and hem length.",
    durationSeconds: 20
  },
  Palazzo: {
    title: "Palazzo Pants",
    shortExplanation: "Wide-leg flowing comfortable trousers with elasticated or tailored waistband.",
    durationSeconds: 20
  },
  Lehenga: {
    title: "Lehenga Choli",
    shortExplanation: "Grand multi-kali flared skirt with heavy zari border, custom choli blouse, and dupatta styling.",
    durationSeconds: 30
  },
  Anarkali: {
    title: "Anarkali Suit",
    shortExplanation: "Floor-length umbrella flared royal gown with fitted bodice and rich hem borders.",
    durationSeconds: 28
  },
  Frock: {
    title: "Kids Frock",
    shortExplanation: "Adorable party frock with ruffled flare, soft inner lining, and back zipper/tie bow.",
    durationSeconds: 20
  },
  Shorts: {
    title: "Shorts",
    shortExplanation: "Casual or tailored shorts with custom rise, pockets, and hem finish.",
    durationSeconds: 18
  },
  Pants: {
    title: "Pants",
    shortExplanation: "Everyday or school pants with comfortable elasticated/fitted waistband.",
    durationSeconds: 20
  },
  "School Uniform": {
    title: "School Uniform",
    shortExplanation: "Durable school shirts, skirts, pinafores, and trousers stitched to school dress code standards.",
    durationSeconds: 22
  },
  "Office Uniform": {
    title: "Office Uniform",
    shortExplanation: "Professional corporate blazers, shirts, and trousers with company branding accommodations.",
    durationSeconds: 24
  },
  "Chef Uniform": {
    title: "Chef Uniform",
    shortExplanation: "Double-breasted breathable chef coats, aprons, and kitchen trousers.",
    durationSeconds: 22
  },
  "Medical Uniform": {
    title: "Medical Scrubs / Coat",
    shortExplanation: "Comfortable antimicrobial scrubs and doctor coats with deep functional pockets.",
    durationSeconds: 22
  },
  "College Uniform": {
    title: "College Uniform",
    shortExplanation: "College blazers, ties, shirts, and tailored trousers stitched to institutional specifications.",
    durationSeconds: 22
  },
  "Custom Garment": {
    title: "Custom Garment",
    shortExplanation: "Any custom tailoring project crafted precisely to your personalized measurements and instructions.",
    durationSeconds: 25
  },
  Other: {
    title: "Custom Request",
    shortExplanation: "Describe any special garment or tailoring service and our master tailors will handle it.",
    durationSeconds: 20
  }
};

export function getClothDetailsAsset(type: "fit" | "category" | "garment" | "service", name: string, gender?: string): ImageSourcePropType {
  switch (type) {
    case "fit":
      return FIT_ASSETS[name] ?? FIT_ASSETS["Unisex / Uniform / Other"];
    case "category":
      return CATEGORY_ASSETS[name] ?? CATEGORY_ASSETS["Other"];
    case "garment":
      if (gender === "Kids" && KIDS_GARMENT_ASSETS[name]) return KIDS_GARMENT_ASSETS[name];
      return GARMENT_ASSETS[name] ?? GARMENT_ASSETS["Other"];
    case "service":
      return WORK_SERVICE_ASSETS[name] ?? WORK_SERVICE_ASSETS["Minor Finishing"];
    default:
      return FIT_ASSETS["Men"];
  }
}

export function getExplanationData(key: string, defaultTitle?: string): ExplanationInfo {
  return (
    EXPLANATIONS[key] ?? {
      title: defaultTitle || key,
      shortExplanation: `Professional tailoring and alteration service for ${defaultTitle || key}.`,
      durationSeconds: 20
    }
  );
}
