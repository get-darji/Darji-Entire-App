import { z } from "zod";

export const CUSTOMER_WEBSITE_SLIDER_SETTING_KEY = "customer_website_slider";

function linearColorChannel(value: number) {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function customerWebsiteSliderContrastRatio(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!match) return 0;
    const [red, green, blue] = match.slice(1).map((channel) => linearColorChannel(Number.parseInt(channel, 16)));
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const imageSourceSchema = z.string().trim().min(1).max(2048).refine(
  (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
  "Use an absolute URL or a site-relative path"
);

export const customerWebsiteSliderSchema = z.object({
  enabled: z.boolean(),
  intervalSeconds: z.coerce.number().int().min(3).max(30),
  buttonText: z.string().trim().min(1).max(40),
  buttonColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  buttonTextColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  slides: z.array(
    z.object({
      id: z.string().trim().min(1).max(80),
      imageUrl: imageSourceSchema,
      altText: z.string().trim().min(2).max(160)
    })
  ).min(1).max(8)
}).superRefine((value, context) => {
  if (customerWebsiteSliderContrastRatio(value.buttonTextColor, value.buttonColor) < 4.5) {
    context.addIssue({
      code: "custom",
      message: "Button and text colors must have at least 4.5:1 contrast",
      path: ["buttonTextColor"]
    });
  }
});

export type CustomerWebsiteSlider = z.infer<typeof customerWebsiteSliderSchema>;

export function defaultCustomerWebsiteSlider(): CustomerWebsiteSlider {
  return {
    enabled: true,
    intervalSeconds: 5,
    buttonText: "Book pickup now",
    buttonColor: "#c2410c",
    buttonTextColor: "#ffffff",
    slides: [
      {
        id: "doorstep-pickup",
        imageUrl: "/customer-slider/doorstep-pickup.webp",
        altText: "Darji doorstep pickup and delivery service"
      },
      {
        id: "custom-tailoring",
        imageUrl: "/customer-slider/custom-tailoring.webp",
        altText: "Darji custom tailoring made for your style"
      },
      {
        id: "festive-special",
        imageUrl: "/customer-slider/festive-special.webp",
        altText: "Darji festive tailoring special"
      }
    ]
  };
}

export function normalizeCustomerWebsiteSlider(value: unknown): CustomerWebsiteSlider {
  const parsed = customerWebsiteSliderSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultCustomerWebsiteSlider();
}
