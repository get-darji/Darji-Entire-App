import { zodResolver } from "@hookform/resolvers/zod";
import { requestOtpSchema, verifyOtpSchema } from "@darzi/shared";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, FlatList, Linking, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { z } from "zod";
import { api } from "./src/api";
import { useAppStore } from "./src/store";

type Screen = "dashboard" | "pickups" | "earnings" | "profile";
type RequestOtpForm = z.input<typeof requestOtpSchema>;
type VerifyOtpForm = z.input<typeof verifyOtpSchema>;
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  paymentMethod: string;
  address: { line1: string; city: string; latitude?: number; longitude?: number };
  customer: { name?: string; phone: string };
};

function Field({ value, onChange, placeholder }: { value?: string; onChange: (value: string) => void; placeholder: string }) {
  return <TextInput className="mb-3 rounded-md border border-slate-300 bg-white px-3 py-3 text-base" value={value} onChangeText={onChange} placeholder={placeholder} />;
}

function AuthScreen() {
  const [otpRequested, setOtpRequested] = useState(false);
  const setSession = useAppStore((state) => state.setSession);
  const requestForm = useForm<RequestOtpForm>({ resolver: zodResolver(requestOtpSchema), defaultValues: { role: "DELIVERY_PARTNER" } });
  const verifyForm = useForm<VerifyOtpForm>({ resolver: zodResolver(verifyOtpSchema), defaultValues: { role: "DELIVERY_PARTNER" } });

  async function requestOtp(values: RequestOtpForm) {
    const result = await api<{ otp?: string }>("/auth/request-otp", { method: "POST", body: JSON.stringify(values) });
    verifyForm.setValue("phone", values.phone);
    if (result.otp) verifyForm.setValue("otp", result.otp);
    setOtpRequested(true);
  }

  async function verify(values: VerifyOtpForm) {
    const session = await api<{ accessToken: string; user: { id: string; phone: string; role: string } }>("/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(values)
    });
    setSession(session.accessToken, session.user);
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-1 justify-center px-6">
        <Text className="mb-2 text-4xl font-bold text-ink">Darzi Delivery</Text>
        <Text className="mb-8 text-base text-slate-600">Pickup, proof, COD, and delivery tracking.</Text>
        {!otpRequested ? (
          <>
            <Controller control={requestForm.control} name="phone" render={({ field }) => <Field {...field} placeholder="Mobile number" />} />
            <Pressable className="rounded-md bg-ink px-4 py-4" onPress={requestForm.handleSubmit(requestOtp, () => Alert.alert("Enter a valid mobile number"))}>
              <Text className="text-center font-semibold text-white">Send OTP</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Controller control={verifyForm.control} name="otp" render={({ field }) => <Field {...field} placeholder="OTP" />} />
            <Pressable className="rounded-md bg-mint px-4 py-4" onPress={verifyForm.handleSubmit(verify, () => Alert.alert("Enter the OTP"))}>
              <Text className="text-center font-semibold text-white">Verify</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function useOrders() {
  const token = useAppStore((state) => state.token);
  const [orders, setOrders] = useState<Order[]>([]);
  const load = () => {
    if (!token) return;
    void api<Order[]>("/orders", {}, token).then(setOrders).catch((error) => Alert.alert("Orders error", error.message));
  };
  useEffect(load, [token]);
  return { orders, load, token };
}

function DashboardScreen() {
  const { orders } = useOrders();
  const pending = orders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status));
  const completed = orders.filter((order) => order.status === "DELIVERED");
  return (
    <View className="flex-1 bg-slate-50 p-4">
      <Text className="mb-4 text-2xl font-bold text-ink">Dashboard</Text>
      <View className="mb-3 rounded-lg bg-white p-4"><Text className="text-slate-600">Pending pickups</Text><Text className="text-3xl font-bold text-ink">{pending.length}</Text></View>
      <View className="mb-3 rounded-lg bg-white p-4"><Text className="text-slate-600">Completed deliveries</Text><Text className="text-3xl font-bold text-ink">{completed.length}</Text></View>
      <View className="rounded-lg bg-white p-4"><Text className="text-slate-600">Today's earnings</Text><Text className="text-3xl font-bold text-mint">Rs {completed.length * 60}</Text></View>
    </View>
  );
}

function PickupsScreen() {
  const { orders, load, token } = useOrders();
  async function updateStatus(orderId: string, status: string) {
    if (!token) return;
    await api(`/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status, imageUrl: "https://example.com/proof.jpg" }) }, token);
    load();
  }
  function navigate(order: Order) {
    const q = encodeURIComponent(`${order.address.line1}, ${order.address.city}`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  }
  return (
    <FlatList
      className="bg-slate-50"
      contentContainerClassName="p-4"
      ListHeaderComponent={<Text className="mb-4 text-2xl font-bold text-ink">Pickup Requests</Text>}
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View className="mb-3 rounded-lg border border-slate-200 bg-white p-4">
          <Text className="font-semibold text-ink">{item.orderNumber}</Text>
          <Text className="mt-1 text-slate-600">{item.customer.phone} • {item.status}</Text>
          <Text className="mt-2 text-slate-700">{item.address.line1}, {item.address.city}</Text>
          {item.paymentMethod === "COD" ? <Text className="mt-1 font-semibold text-saffron">Collect COD: Rs {item.totalAmount}</Text> : null}
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Pressable className="rounded-md bg-ink px-3 py-2" onPress={() => navigate(item)}><Text className="font-semibold text-white">Navigate</Text></Pressable>
            <Pressable className="rounded-md bg-mint px-3 py-2" onPress={() => updateStatus(item.id, "CLOTH_PICKED")}><Text className="font-semibold text-white">Picked</Text></Pressable>
            <Pressable className="rounded-md bg-saffron px-3 py-2" onPress={() => updateStatus(item.id, "AT_TAILOR")}><Text className="font-semibold text-white">At tailor</Text></Pressable>
            <Pressable className="rounded-md bg-mint px-3 py-2" onPress={() => updateStatus(item.id, "DELIVERED")}><Text className="font-semibold text-white">Delivered</Text></Pressable>
          </View>
        </View>
      )}
    />
  );
}

function EarningsScreen() {
  const { orders } = useOrders();
  const delivered = orders.filter((order) => order.status === "DELIVERED").length;
  const weekly = delivered * 60;
  const monthly = delivered * 60;
  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      <Text className="mb-4 text-2xl font-bold text-ink">Earnings</Text>
      <View className="mb-3 rounded-lg bg-white p-4"><Text className="text-slate-600">Daily</Text><Text className="text-3xl font-bold text-mint">Rs {delivered * 60}</Text></View>
      <View className="mb-3 rounded-lg bg-white p-4"><Text className="text-slate-600">Weekly</Text><Text className="text-3xl font-bold text-mint">Rs {weekly}</Text></View>
      <View className="rounded-lg bg-white p-4"><Text className="text-slate-600">Monthly</Text><Text className="text-3xl font-bold text-mint">Rs {monthly}</Text></View>
    </ScrollView>
  );
}

function ProfileScreen() {
  const { token, signOut } = useAppStore();
  const [available, setAvailable] = useState(true);
  async function toggle(value: boolean) {
    setAvailable(value);
    if (token) await api("/delivery-partners/me/availability", { method: "PATCH", body: JSON.stringify({ isAvailable: value }) }, token).catch(() => undefined);
  }
  return (
    <View className="flex-1 bg-slate-50 p-4">
      <Text className="mb-4 text-2xl font-bold text-ink">Profile</Text>
      <View className="mb-4 flex-row items-center justify-between rounded-lg bg-white p-4"><Text className="font-semibold text-ink">Available</Text><Switch value={available} onValueChange={toggle} /></View>
      <Pressable className="rounded-md bg-ink px-4 py-3" onPress={signOut}><Text className="text-center font-semibold text-white">Sign out</Text></Pressable>
    </View>
  );
}

export default function App() {
  const token = useAppStore((state) => state.token);
  const [screen, setScreen] = useState<Screen>("dashboard");
  if (!token) return <AuthScreen />;
  const Current = screen === "dashboard" ? DashboardScreen : screen === "pickups" ? PickupsScreen : screen === "earnings" ? EarningsScreen : ProfileScreen;
  return (
    <SafeAreaView className="flex-1 bg-white">
      <Current />
      <View className="flex-row border-t border-slate-200 bg-white">
        {(["dashboard", "pickups", "earnings", "profile"] as Screen[]).map((item) => (
          <Pressable className="flex-1 px-2 py-3" key={item} onPress={() => setScreen(item)}>
            <Text className={`text-center text-xs font-semibold ${screen === item ? "text-mint" : "text-slate-500"}`}>{item[0].toUpperCase() + item.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
