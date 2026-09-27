// Content mirrored from the customer app for the local web flow.
export const cancellationPolicySections = [
  {
    title: "Before Pickup",
    status: "Awaiting payment, confirmed, or pickup not started",
    cancellation: "Allowed",
    refund: "100% refund",
    charges: "No cancellation charges",
    reason: "If the package has not been picked up from your home, cancellation is free."
  },
  {
    title: "After Pickup, Before Tailor Handover",
    status: "Pickup started or clothes collected from customer",
    cancellation: "Allowed",
    refund: "Order refund after deducting charges",
    charges: "Delivery charge + cancellation fee",
    reason: "Once the rider has picked up the package, transport and handling charges apply even if tailoring has not started."
  },
  {
    title: "After Tailor Handover",
    status: "Delivered to tailor, stitching started, ready, or out for delivery",
    cancellation: "Not allowed",
    refund: "No refund",
    charges: "Full order amount may be charged",
    reason: "Once the package is handed over to the tailor, the order is locked and cannot be cancelled."
  }
] as const;

export const cancellationSpecialCases = [
  ["Tailor unable to complete the order", "Customer receives a full refund."],
  ["Cloth damaged by Darji or tailor", "Customer may receive a full refund or compensation according to company policy."],
  ["Delay beyond promised delivery date", "Darji may provide a partial refund, discount coupon, or free express delivery."]
] as const;

export const helpTopics = [
  {
    id: "pickup",
    icon: "shirt-outline",
    title: "How pickup works",
    subtitle: "Schedule a slot and our partner collects your garment.",
    details: [
      "Choose pickup address and preferred service while creating a request.",
      "Darji assigns a pickup partner and shares live status updates.",
      "Keep clothes packed and ready. The partner verifies the request before handover.",
      "After pickup, your garment is delivered to the selected tailor."
    ]
  },
  {
    id: "quotes",
    icon: "document-text-outline",
    title: "How quotes work",
    subtitle: "Tailors respond after reviewing uploaded photos.",
    details: [
      "Upload clear cloth photos and describe the work needed.",
      "Nearby tailors review the request and submit price and timeline.",
      "Compare quotes, ratings, and expected completion time.",
      "Select one quote to confirm and move to payment."
    ]
  },
  {
    id: "delivery",
    icon: "bicycle-outline",
    title: "How delivery works",
    subtitle: "We deliver your stitched order back to your doorstep.",
    details: [
      "Darji tracks pickup, tailor handover, stitching, and final delivery.",
      "You receive status updates when the order is dispatched.",
      "Delivery OTP may be used to complete secure handover.",
      "Report any delivery issue from Contact Support."
    ]
  },
  {
    id: "payments",
    icon: "wallet-outline",
    title: "Payments and refunds",
    subtitle: "UPI, cards and cash on delivery are supported.",
    details: [
      "You can pay online through Razorpay or use COD when available.",
      "Refunds follow the cancellation policy for the order status.",
      "Failed online payments can be retried from the order screen.",
      "Payment support can help with duplicate debit or refund delays."
    ]
  },
  {
    id: "pricing",
    icon: "receipt-outline",
    title: "Pricing and charges",
    subtitle: "Understand pricing, additional charges and payment details.",
    details: [
      "Tailors set the stitching or alteration quote after reviewing your request.",
      "Darji may add delivery, platform, small-order, or home-measurement fees.",
      "The final amount is shown before you confirm payment.",
      "Any cancellation charges are shown in the cancellation policy."
    ]
  },
  {
    id: "account",
    icon: "person-circle-outline",
    title: "My account",
    subtitle: "Update profile, addresses and manage your account.",
    details: [
      "Edit your name, gender, date of birth, and avatar from Profile.",
      "Saved addresses can be added, deleted, or selected during requests.",
      "Language and notification settings are separated under Preferences.",
      "Account deletion permanently clears the local profile data from this device."
    ]
  },
  {
    id: "orders",
    icon: "cube-outline",
    title: "My orders",
    subtitle: "Track your order status and view order details.",
    details: [
      "Open Orders to see active, pending, delivered, and cancelled requests.",
      "Track Order shows pickup, tailor handover, stitching, and delivery progress.",
      "Incomplete requests can be resumed from Orders.",
      "Invoices are available after eligible delivered orders."
    ]
  }
] as const;

export const fabricCareTips = [
  { title: "Cotton Care", copy: "Wash inside-out in cold water and dry in shade to keep colors fresh.", icon: "shirt-outline" },
  { title: "Silk & Delicates", copy: "Use gentle wash or dry clean. Never wring silk, chiffon, or georgette.", icon: "sparkles-outline" },
  { title: "Denim Life", copy: "Wash jeans less often, turn them inside-out, and skip high heat drying.", icon: "water-outline" },
  { title: "White Clothes", copy: "Separate whites, treat stains early, and avoid mixing with bright fabrics.", icon: "sunny-outline" },
  { title: "Storage Tip", copy: "Hang structured garments and fold knits so shoulders do not stretch.", icon: "cube-outline" },
  { title: "Linen Finish", copy: "Steam linen while slightly damp and store it on broad hangers to reduce deep creases.", icon: "leaf-outline" },
  { title: "Wool Safety", copy: "Air wool garments between wears and use dry clean for coats, blazers, and heavy suits.", icon: "snow-outline" },
  { title: "Embroidery Care", copy: "Turn embellished clothes inside-out and use a laundry bag before gentle washing.", icon: "color-palette-outline" },
  { title: "Saree Storage", copy: "Refold silk sarees every few months so permanent crease marks do not form.", icon: "ribbon-outline" },
  { title: "Stain First Aid", copy: "Blot stains from the outside in. Avoid rubbing because it pushes marks deeper.", icon: "medical-outline" },
  { title: "Color Bleed Check", copy: "Test a hidden corner with a damp white cloth before washing bright fabrics.", icon: "eyedrop-outline" },
  { title: "Zipper Care", copy: "Close zippers and hooks before washing to protect delicate fabric surfaces.", icon: "construct-outline" },
  { title: "Knitwear Shape", copy: "Dry sweaters flat on a towel. Hanging wet knits can stretch the shoulders.", icon: "resize-outline" },
  { title: "Blazer Care", copy: "Brush after use, air it out, and avoid frequent washing unless there is visible dirt.", icon: "business-outline" },
  { title: "Ironing Heat", copy: "Start with low heat for synthetics, medium for cotton blends, and steam only when safe.", icon: "flame-outline" }
] as const;

export const measurementGuides = {
  "Kurta / Salwar": {
    fields: ["Chest", "Shoulder", "Kurta Length", "Sleeve Length", "Neck", "Waist", "Hip", "Salwar Length"],
    sizeChart: [
      { size: "S", values: { Chest: "91", Waist: "76", Hip: "97", Length: "102" } },
      { size: "M", values: { Chest: "97", Waist: "81", Hip: "102", Length: "107" } },
      { size: "L", values: { Chest: "102", Waist: "86", Hip: "107", Length: "112" } },
      { size: "XL", values: { Chest: "107", Waist: "91", Hip: "112", Length: "117" } }
    ]
  },
  "Saree / Blouse": {
    fields: ["Bust", "Under Bust", "Shoulder", "Blouse Length", "Sleeve Length", "Armhole", "Front Neck Depth", "Back Neck Depth"],
    sizeChart: [
      { size: "S", values: { Bust: "86", Waist: "71", Shoulder: "34", Length: "36" } },
      { size: "M", values: { Bust: "91", Waist: "76", Shoulder: "36", Length: "37" } },
      { size: "L", values: { Bust: "97", Waist: "81", Shoulder: "37", Length: "38" } },
      { size: "XL", values: { Bust: "102", Waist: "86", Shoulder: "38", Length: "39" } }
    ]
  },
  "Shirt / Pants": {
    fields: ["Chest", "Shoulder", "Shirt Length", "Sleeve Length", "Neck", "Waist", "Seat / Hip", "Pant Length", "Inseam"],
    sizeChart: [
      { size: "S", values: { Chest: "97", Waist: "76", Shoulder: "43", Pant: "99" } },
      { size: "M", values: { Chest: "102", Waist: "81", Shoulder: "46", Pant: "102" } },
      { size: "L", values: { Chest: "107", Waist: "86", Shoulder: "48", Pant: "104" } },
      { size: "XL", values: { Chest: "112", Waist: "91", Shoulder: "51", Pant: "107" } }
    ]
  },
  "Suit / Blazer": {
    fields: ["Chest", "Shoulder", "Sleeve Length", "Blazer Length", "Waist", "Seat / Hip", "Trouser Length", "Inseam"],
    sizeChart: [
      { size: "S", values: { Chest: "97", Waist: "76", Shoulder: "43", Blazer: "71" } },
      { size: "M", values: { Chest: "102", Waist: "81", Shoulder: "46", Blazer: "74" } },
      { size: "L", values: { Chest: "107", Waist: "86", Shoulder: "48", Blazer: "76" } },
      { size: "XL", values: { Chest: "112", Waist: "91", Shoulder: "51", Blazer: "79" } }
    ]
  },
  Dress: {
    fields: ["Bust", "Waist", "Hip", "Dress Length", "Shoulder", "Sleeve Length", "Armhole"],
    sizeChart: [
      { size: "S", values: { Bust: "86", Waist: "71", Hip: "97", Length: "97" } },
      { size: "M", values: { Bust: "91", Waist: "76", Hip: "102", Length: "102" } },
      { size: "L", values: { Bust: "97", Waist: "81", Hip: "107", Length: "107" } },
      { size: "XL", values: { Bust: "102", Waist: "86", Hip: "112", Length: "112" } }
    ]
  },
  Others: {
    fields: ["Chest / Bust", "Waist", "Hip", "Shoulder", "Length", "Sleeve Length"],
    sizeChart: [
      { size: "S", values: { Chest: "86-91", Waist: "71-76", Hip: "91-97", Length: "As needed" } },
      { size: "M", values: { Chest: "91-97", Waist: "76-81", Hip: "97-102", Length: "As needed" } },
      { size: "L", values: { Chest: "97-102", Waist: "81-86", Hip: "102-107", Length: "As needed" } },
      { size: "XL", values: { Chest: "102-107", Waist: "86-91", Hip: "107-112", Length: "As needed" } }
    ]
  }
};


