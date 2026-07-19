import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type IncomingRequestType = "pickup" | "delivery";

export type IncomingRequestInfoRow = {
  label: string;
  value?: string | number | null;
  icon: ComponentProps<typeof Ionicons>["name"];
};

export type IncomingRequestPayload = {
  id: string;
  orderId?: string;
  title: string;
  subtitle?: string;
  requestType: IncomingRequestType;
  customerName?: string;
  pickupAddress?: string;
  dropAddress?: string;
  distance?: string;
  estimatedTime?: string;
  expectedEarnings?: string;
  orderValue?: string;
  orderType?: string;
  expiresAt?: string;
  rows?: IncomingRequestInfoRow[];
};
