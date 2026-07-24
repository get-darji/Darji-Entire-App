export const GENDER_FIT_OPTIONS = [
  { value: "Men", label: "Men", icon: "man-outline" },
  { value: "Women", label: "Women", icon: "woman-outline" },
  { value: "Kids", label: "Kids", icon: "person-outline" },
  { value: "Unisex / Uniform / Other", label: "Unisex / Uniform / Other", icon: "people-outline" }
] as const;

export type GenderFitType = (typeof GENDER_FIT_OPTIONS)[number]["value"];

export const GARMENTS_BY_GENDER: Record<GenderFitType, readonly string[]> = {
  Men: [
    "Kurta",
    "Kurta Pajama",
    "Shirt",
    "Trousers",
    "Suit",
    "Blazer",
    "Waistcoat",
    "Sherwani",
    "Pathani Suit",
    "Other"
  ],
  Women: [
    "Blouse",
    "Kurti",
    "Salwar Suit",
    "Dress",
    "Top",
    "Skirt",
    "Palazzo",
    "Lehenga",
    "Anarkali",
    "Other"
  ],
  Kids: [
    "Frock",
    "Dress",
    "Kurta",
    "Shirt",
    "Shorts",
    "Pants",
    "Lehenga",
    "Suit",
    "School Uniform",
    "Other"
  ],
  "Unisex / Uniform / Other": [
    "School Uniform",
    "Office Uniform",
    "Chef Uniform",
    "Medical Uniform",
    "College Uniform",
    "Custom Garment",
    "Other"
  ]
};

export const SERVICE_CATEGORIES = [
  {
    id: "new-stitching",
    label: "New Stitching",
    subtitle: "Stitch from fabric or design",
    icon: "cut-outline",
    workItems: [
      "Stitch from Fabric",
      "Copy Existing Garment",
      "Stitch from Reference / Design"
    ]
  },
  {
    id: "alteration-fitting",
    label: "Alteration & Fitting",
    subtitle: "Tighten, loosen, adjust & more",
    icon: "resize-outline",
    workItems: [
      "Tighten",
      "Loosen",
      "Waist Adjustment",
      "Sleeve Adjustment",
      "Shoulder Adjustment",
      "Neck Adjustment",
      "Shorten",
      "Lengthen",
      "General Fitting"
    ]
  },
  {
    id: "repair-mending",
    label: "Repair & Mending",
    subtitle: "Repair tears, zips, buttons & more",
    icon: "construct-outline",
    workItems: [
      "Torn Seam Repair",
      "Hole / Tear Repair",
      "Zip Repair",
      "Zip Replacement",
      "Button Replacement",
      "Hook Replacement",
      "Elastic Replacement",
      "Pocket Repair"
    ]
  },
  {
    id: "embroidery-custom",
    label: "Embroidery & Custom Work",
    subtitle: "Embroidery, lace, patch work",
    icon: "color-palette-outline",
    workItems: [
      "Embroidery",
      "Lace Work",
      "Border Work",
      "Patch / Appliqué Work",
      "Custom Design Modification"
    ]
  },
  {
    id: "finishing-work",
    label: "Finishing Work",
    subtitle: "Hemming, pico, lining & more",
    icon: "ribbon-outline",
    workItems: [
      "Hemming",
      "Pico",
      "Fall Stitching",
      "Lining Work",
      "Minor Finishing"
    ]
  },
  {
    id: "other",
    label: "Other",
    subtitle: "Describe the work needed",
    icon: "ellipsis-horizontal-outline",
    workItems: []
  }
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export function getServiceCategory(label?: string) {
  return SERVICE_CATEGORIES.find((category) => category.label === label);
}

export function getGarmentsForGender(gender?: string) {
  return gender && gender in GARMENTS_BY_GENDER
    ? GARMENTS_BY_GENDER[gender as GenderFitType]
    : [];
}

