import { zodResolver } from "@hookform/resolvers/zod";
import { requestOtpSchema, verifyOtpSchema } from "@darzi/shared";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, FlatList, Pressable, SafeAreaView, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { z } from "zod";
import { api } from "./src/api";
import { useAppStore } from "./src/store";

type Screen = "dashboard" | "orders" | "earnings" | "profile";
type RequestOtpForm = z.input<typeof requestOtpSchema>;
type VerifyOtpForm = z.input<typeof verifyOtpSchema>;
type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  customer: { name?: string; phone: string };
  items: Array<{ service: { name: string }; measurement?: { fields: Record<string, string | number> }; instructions?: string }>;
};

function Field({ value, onChange, placeholder }: { value?: string; onChange: (value: string) => void; placeholder: string }) {
  return <TextInput className="mb-3 rounded-md border border-slate-300 bg-white px-3 py-3 text-base" value={value} onChangeText={onChange} placeholder={placeholder} />;
}

function AuthScreen() {
  const [otpRequested, setOtpRequested] = useState(false);
  const setSession = useAppStore((state) => state.setSession);
  const requestForm = useForm<RequestOtpForm>({ resolver: zodResolver(requestOtpSchema), defaultValues: { role: "TAILOR" } });
  const verifyForm = useForm<VerifyOtpForm>({ resolver: zodResolver(verifyOtpSchema), defaultValues: { role: "TAILOR" } });

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
        <Text className="mb-2 text-4xl font-bold text-ink">Darzi Tailor</Text>
        <Text className="mb-8 text-base text-slate-600">Manage assigned stitching work.</Text>
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
  const active = orders.filter((order) => !["READY", "DELIVERED", "CANCELLED"].includes(order.status));
  const completed = orders.filter((order) => ["READY", "DELIVERED"].includes(order.status));
  return (
    <View className="flex-1 bg-slate-50 p-4">
      <Text className="mb-4 text-2xl font-bold text-ink">Dashboard</Text>
      <View className="mb-3 rounded-lg bg-white p-4"><Text className="text-slate-600">Active orders</Text><Text className="text-3xl font-bold text-ink">{active.length}</Text></View>
      <View className="mb-3 rounded-lg bg-white p-4"><Text className="text-slate-600">Completed orders</Text><Text className="text-3xl font-bold text-ink">{completed.length}</Text></View>
      <View className="rounded-lg bg-white p-4"><Text className="text-slate-600">Estimated earnings</Text><Text className="text-3xl font-bold text-mint">Rs {completed.reduce((sum, order) => sum + Number(order.totalAmount) * 0.45, 0).toFixed(0)}</Text></View>
    </View>
  );
}

function OrdersScreen() {
  const { orders, load, token } = useOrders();
  async function updateStatus(orderId: string, status: string) {
    if (!token) return;
    await api(`/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, token);
    load();
  }
  return (
    <FlatList
      className="bg-slate-50"
      contentContainerClassName="p-4"
      ListHeaderComponent={<Text className="mb-4 text-2xl font-bold text-ink">Assigned Orders</Text>}
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View className="mb-3 rounded-lg border border-slate-200 bg-white p-4">
          <Text className="font-semibold text-ink">{item.orderNumber}</Text>
          <Text className="mt-1 text-slate-600">{item.customer?.phone} • {item.status}</Text>
          {item.items.map((orderItem, index) => (
            <Text className="mt-2 text-slate-700" key={`${item.id}-${index}`}>{orderItem.service.name}: {JSON.stringify(orderItem.measurement?.fields ?? {})}</Text>
          ))}
          <View className="mt-3 flex-row flex-wrap gap-2">
            {["CUTTING", "STITCHING_STARTED", "FINISHING", "READY"].map((status) => (
              <Pressable className="rounded-md bg-mint px-3 py-2" key={status} onPress={() => updateStatus(item.id, status)}>
                <Text className="text-xs font-semibold text-white">{status.replace("_", " ")}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    />
  );
}

function EarningsScreen() {
  const { orders } = useOrders();
  const readyOrders = orders.filter((order) => ["READY", "DELIVERED"].includes(order.status));
  const earnings = useMemo(() => readyOrders.reduce((sum, order) => sum + Number(order.totalAmount) * 0.45, 0), [readyOrders]);
  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      <Text className="mb-4 text-2xl font-bold text-ink">Earnings</Text>
      <View className="rounded-lg bg-white p-4"><Text className="text-slate-600">Total</Text><Text className="text-4xl font-bold text-mint">Rs {earnings.toFixed(0)}</Text></View>
      {readyOrders.map((order) => <Text className="mt-4 text-slate-700" key={order.id}>{order.orderNumber} • Rs {(Number(order.totalAmount) * 0.45).toFixed(0)}</Text>)}
    </ScrollView>
  );
}

function ProfileScreen() {
  const { token, signOut } = useAppStore();
  const [available, setAvailable] = useState(true);
  async function toggle(value: boolean) {
    setAvailable(value);
    if (token) await api("/tailors/me/availability", { method: "PATCH", body: JSON.stringify({ isAvailable: value }) }, token).catch(() => undefined);
  }
  return (
    <View className="flex-1 bg-slate-50 p-4">
      <Text className="mb-4 text-2xl font-bold text-ink">Profile</Text>
      <View className="mb-4 flex-row items-center justify-between rounded-lg bg-white p-4"><Text className="font-semibold text-ink">Available</Text><Switch value={available} onValueChange={toggle} /></View>
      <View className="mb-4 rounded-lg bg-white p-4"><Text className="font-semibold text-ink">Working hours</Text><Text className="mt-1 text-slate-600">10:00 AM - 8:00 PM</Text></View>
      <Pressable className="rounded-md bg-ink px-4 py-3" onPress={signOut}><Text className="text-center font-semibold text-white">Sign out</Text></Pressable>
    </View>
  );
}

export default function App() {
  const token = useAppStore((state) => state.token);
  const [screen, setScreen] = useState<Screen>("dashboard");
  if (!token) return <AuthScreen />;
  const Current = screen === "dashboard" ? DashboardScreen : screen === "orders" ? OrdersScreen : screen === "earnings" ? EarningsScreen : ProfileScreen;
  return (
    <SafeAreaView className="flex-1 bg-white">
      <Current />
      <View className="flex-row border-t border-slate-200 bg-white">
        {(["dashboard", "orders", "earnings", "profile"] as Screen[]).map((item) => (
          <Pressable className="flex-1 px-2 py-3" key={item} onPress={() => setScreen(item)}>
            <Text className={`text-center text-xs font-semibold ${screen === item ? "text-mint" : "text-slate-500"}`}>{item[0].toUpperCase() + item.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
