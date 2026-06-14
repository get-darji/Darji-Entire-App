import { zodResolver } from "@hookform/resolvers/zod";
import { requestOtpSchema, verifyOtpSchema, type ServiceItem } from "@darzi/shared";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, FlatList, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { z } from "zod";
import { api } from "./src/api";
import { useAppStore } from "./src/store";

type Screen = "home" | "cart" | "orders" | "profile";
type Order = { id: string; orderNumber: string; status: string; totalAmount: string; pickupScheduledAt: string };
type RequestOtpForm = z.input<typeof requestOtpSchema>;
type VerifyOtpForm = z.input<typeof verifyOtpSchema>;

function Field({ value, onChange, placeholder }: { value?: string; onChange: (value: string) => void; placeholder: string }) {
  return <TextInput className="mb-3 rounded-md border border-slate-300 bg-white px-3 py-3 text-base" value={value} onChangeText={onChange} placeholder={placeholder} />;
}

function AuthScreen() {
  const [otpRequested, setOtpRequested] = useState(false);
  const setSession = useAppStore((state) => state.setSession);
  const requestForm = useForm<RequestOtpForm>({ resolver: zodResolver(requestOtpSchema), defaultValues: { role: "CUSTOMER" } });
  const verifyForm = useForm<VerifyOtpForm>({ resolver: zodResolver(verifyOtpSchema), defaultValues: { role: "CUSTOMER" } });

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
        <Text className="mb-2 text-4xl font-bold text-ink">Darzi</Text>
        <Text className="mb-8 text-base text-slate-600">Custom stitching, pickup, and delivery.</Text>
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
              <Text className="text-center font-semibold text-white">Verify and continue</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function HomeScreen() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const addToCart = useAppStore((state) => state.addToCart);

  useEffect(() => {
    api<ServiceItem[]>("/catalog").then(setServices).catch((error) => Alert.alert("Catalog error", error.message));
  }, []);

  return (
    <FlatList
      className="bg-slate-50"
      contentContainerClassName="p-4"
      ListHeaderComponent={<Text className="mb-4 text-2xl font-bold text-ink">Services</Text>}
      data={services}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View className="mb-3 rounded-lg border border-slate-200 bg-white p-4">
          <Text className="text-lg font-semibold text-ink">{item.name}</Text>
          <Text className="mt-1 text-sm text-slate-600">{item.category} • {item.estimatedDelivery}</Text>
          <Text className="mt-2 text-slate-700">{item.description}</Text>
          <View className="mt-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-mint">Rs {item.price}</Text>
            <Pressable className="rounded-md bg-saffron px-4 py-2" onPress={() => addToCart(item)}>
              <Text className="font-semibold text-white">Add</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

function CartScreen() {
  const { cart, token, clearCart } = useAppStore();
  const total = useMemo(() => cart.reduce((sum, item) => sum + item.service.price * item.quantity, 0), [cart]);

  async function placeOrder() {
    if (!token || cart.length === 0) return;
    try {
      const address = await api<{ id: string }>("/addresses", {
        method: "POST",
        body: JSON.stringify({
          name: "Darzi Customer",
          phone: "9876543210",
          line1: "Home address",
          city: "New Delhi",
          state: "Delhi",
          pincode: "110001",
          landmark: "Main road",
          isDefault: true
        })
      }, token);
      await api("/orders", {
        method: "POST",
        body: JSON.stringify({
          addressId: address.id,
          pickupScheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          paymentMethod: "COD",
          instructions: "Call before pickup.",
          items: cart.map((item) => ({
            serviceId: item.service.id,
            quantity: item.quantity,
            instructions: item.instructions,
            measurement: { label: item.service.name, fields: { chest: 40, length: 29 } }
          }))
        })
      }, token);
      clearCart();
      Alert.alert("Order placed");
    } catch (error) {
      Alert.alert("Order failed", error instanceof Error ? error.message : "Try again");
    }
  }

  return (
    <ScrollView className="flex-1 bg-slate-50 p-4">
      <Text className="mb-4 text-2xl font-bold text-ink">Cart</Text>
      {cart.map((item) => (
        <View className="mb-3 rounded-lg border border-slate-200 bg-white p-4" key={item.service.id}>
          <Text className="font-semibold text-ink">{item.service.name}</Text>
          <Text className="text-slate-600">Qty {item.quantity} • Rs {item.service.price * item.quantity}</Text>
        </View>
      ))}
      <Text className="mb-4 text-xl font-bold text-ink">Total Rs {total}</Text>
      <Pressable className="rounded-md bg-mint px-4 py-4" onPress={placeOrder}>
        <Text className="text-center font-semibold text-white">Schedule pickup and place COD order</Text>
      </Pressable>
    </ScrollView>
  );
}

function OrdersScreen() {
  const token = useAppStore((state) => state.token);
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    if (token) api<Order[]>("/orders", {}, token).then(setOrders).catch(() => undefined);
  }, [token]);
  return (
    <FlatList
      className="bg-slate-50"
      contentContainerClassName="p-4"
      ListHeaderComponent={<Text className="mb-4 text-2xl font-bold text-ink">Orders</Text>}
      data={orders}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View className="mb-3 rounded-lg border border-slate-200 bg-white p-4">
          <Text className="font-semibold text-ink">{item.orderNumber}</Text>
          <Text className="mt-1 text-slate-600">{item.status}</Text>
          <Text className="mt-1 text-slate-600">Rs {item.totalAmount}</Text>
        </View>
      )}
    />
  );
}

function ProfileScreen() {
  const { user, signOut } = useAppStore();
  return (
    <View className="flex-1 bg-slate-50 p-4">
      <Text className="mb-2 text-2xl font-bold text-ink">Profile</Text>
      <Text className="mb-6 text-slate-600">{user?.phone}</Text>
      {["Addresses", "Wallet", "Coupons", "Support", "Order history"].map((item) => (
        <View className="mb-2 rounded-md bg-white p-4" key={item}>
          <Text className="font-medium text-ink">{item}</Text>
        </View>
      ))}
      <Pressable className="mt-4 rounded-md bg-ink px-4 py-3" onPress={signOut}>
        <Text className="text-center font-semibold text-white">Sign out</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const token = useAppStore((state) => state.token);
  const cartCount = useAppStore((state) => state.cart.length);
  const [screen, setScreen] = useState<Screen>("home");
  if (!token) return <AuthScreen />;
  const Current = screen === "home" ? HomeScreen : screen === "cart" ? CartScreen : screen === "orders" ? OrdersScreen : ProfileScreen;
  return (
    <SafeAreaView className="flex-1 bg-white">
      <Current />
      <View className="flex-row border-t border-slate-200 bg-white">
        {(["home", "cart", "orders", "profile"] as Screen[]).map((item) => (
          <Pressable className="flex-1 px-2 py-3" key={item} onPress={() => setScreen(item)}>
            <Text className={`text-center font-semibold ${screen === item ? "text-mint" : "text-slate-500"}`}>
              {item === "cart" ? `Cart (${cartCount})` : item[0].toUpperCase() + item.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
