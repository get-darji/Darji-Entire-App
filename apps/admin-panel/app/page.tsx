"use client";

import {
  BarChart3,
  Bell,
  CreditCard,
  Moon,
  PackageCheck,
  Scissors,
  Search,
  Settings,
  Sun,
  Ticket,
  Truck,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

type Section = "Dashboard" | "Customers" | "Tailors" | "Delivery Partners" | "Orders" | "Coupons" | "Payments" | "Analytics" | "Settings" | "Support Tickets";
type Analytics = { revenue: number; customers: number; activeTailors: number; activeDeliveryPartners: number; orders: number; openTickets: number };
type Order = { id: string; orderNumber: string; status: string; totalAmount: string; customer?: { phone: string; name?: string }; tailorId?: string; pickupPartnerId?: string };
type Person = { id: string; user: { phone: string; name?: string }; shopName?: string; vehicleNumber?: string; isAvailable: boolean };
type Coupon = { id: string; code: string; description: string; discountType: string; discountValue: string; isActive: boolean };
type Payment = { id: string; method: string; status: string; amount: string; order?: { orderNumber: string } };
type TicketRow = { id: string; subject: string; status: string; user?: { phone: string }; order?: { orderNumber: string } };

const sections: Array<{ label: Section; icon: React.ComponentType<{ size?: number }> }> = [
  { label: "Dashboard", icon: BarChart3 },
  { label: "Customers", icon: Users },
  { label: "Tailors", icon: Scissors },
  { label: "Delivery Partners", icon: Truck },
  { label: "Orders", icon: PackageCheck },
  { label: "Coupons", icon: Ticket },
  { label: "Payments", icon: CreditCard },
  { label: "Analytics", icon: BarChart3 },
  { label: "Settings", icon: Settings },
  { label: "Support Tickets", icon: Bell }
];

async function request<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message ?? "Request failed");
  return body.data as T;
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [phone, setPhone] = useState("9999999999");
  const [otp, setOtp] = useState("");
  const [requested, setRequested] = useState(false);
  const [error, setError] = useState("");

  async function sendOtp() {
    setError("");
    try {
      const result = await request<{ otp?: string }>("/auth/request-otp", undefined, { method: "POST", body: JSON.stringify({ phone, role: "ADMIN" }) });
      if (result.otp) setOtp(result.otp);
      setRequested(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to request OTP");
    }
  }

  async function verify() {
    setError("");
    try {
      const session = await request<{ accessToken: string }>("/auth/verify-otp", undefined, { method: "POST", body: JSON.stringify({ phone, otp, role: "ADMIN" }) });
      onLogin(session.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to verify OTP");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-4">
      <section className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-950">Darzi Admin</h1>
        <p className="mt-2 text-sm text-slate-600">Operations, assignment, payments, and support.</p>
        <input className="mt-6 w-full rounded-md border border-slate-300 px-3 py-3" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile number" />
        {requested ? <input className="mt-3 w-full rounded-md border border-slate-300 px-3 py-3" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="OTP" /> : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button className="mt-4 w-full rounded-md bg-slate-950 px-4 py-3 font-semibold text-white" onClick={requested ? verify : sendOtp}>
          {requested ? "Verify" : "Send OTP"}
        </button>
      </section>
    </main>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: React.ComponentType<{ size?: number }>; accent: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`rounded-md p-2 ${accent}`}><Icon size={18} /></span>
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

function DataToolbar({ search, setSearch, status, setStatus }: { search: string; setSearch: (value: string) => void; status: string; setStatus: (value: string) => void }) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
        <Search size={18} className="text-slate-500" />
        <input className="w-full bg-transparent outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
      </div>
      <select className="rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900" value={status} onChange={(event) => setStatus(event.target.value)}>
        <option value="">All statuses</option>
        <option value="ORDER_PLACED">Order placed</option>
        <option value="PICKUP_ASSIGNED">Pickup assigned</option>
        <option value="READY">Ready</option>
        <option value="DELIVERED">Delivered</option>
      </select>
    </div>
  );
}

function Rows({ rows }: { rows: Array<Record<string, unknown>> }) {
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).slice(0, 6);
  if (rows.length === 0) return <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900">No records found.</p>;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-slate-800">
            <tr>{keys.map((key) => <th className="px-4 py-3" key={key}>{key}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr className="border-t border-slate-100 dark:border-slate-800" key={index}>
                {keys.map((key) => <td className="px-4 py-3" key={key}>{String(row[key] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [section, setSection] = useState<Section>("Dashboard");
  const [analytics, setAnalytics] = useState<Analytics>({ revenue: 0, customers: 0, activeTailors: 0, activeDeliveryPartners: 0, orders: 0, openTickets: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [tailors, setTailors] = useState<Person[]>([]);
  const [partners, setPartners] = useState<Person[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dark, setDark] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      request<Analytics>("/analytics", token),
      request<Order[]>("/orders", token),
      request<Person[]>("/tailors", token),
      request<Person[]>("/delivery-partners", token),
      request<Coupon[]>("/coupons", token),
      request<Payment[]>("/payments", token),
      request<TicketRow[]>("/support", token)
    ])
      .then(([a, o, t, d, c, p, s]) => {
        setAnalytics(a);
        setOrders(o);
        setTailors(t);
        setPartners(d);
        setCoupons(c);
        setPayments(p);
        setTickets(s);
      })
      .catch(console.error);
  }, [token]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const text = `${order.orderNumber} ${order.customer?.phone ?? ""} ${order.status}`.toLowerCase();
      return text.includes(search.toLowerCase()) && (!status || order.status === status);
    });
  }, [orders, search, status]);

  const pagedOrders = filteredOrders.slice((page - 1) * 8, page * 8);

  async function assign(orderId: string, type: "tailor" | "pickup" | "delivery", id: string) {
    await request(`/orders/${orderId}/assign`, token, {
      method: "PATCH",
      body: JSON.stringify(type === "tailor" ? { tailorId: id } : { deliveryPartnerId: id, mode: type })
    });
    const refreshed = await request<Order[]>("/orders", token);
    setOrders(refreshed);
  }

  if (!token) return <Login onLogin={setToken} />;

  return (
    <main className="min-h-screen bg-[#f6f7f9] text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Darzi</h1>
            <button className="rounded-md border border-slate-300 p-2 dark:border-slate-700" onClick={() => setDark((value) => !value)} aria-label="Toggle dark mode">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
          <nav className="grid gap-1">
            {sections.map(({ label, icon: Icon }) => (
              <button className={`flex items-center gap-3 rounded-md px-3 py-2 text-left text-sm ${section === label ? "bg-teal-700 text-white" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"}`} key={label} onClick={() => setSection(label)}>
                <Icon size={18} /> {label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="p-4 md:p-6">
          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold">{section}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Revenue, assignments, support, and platform controls.</p>
            </div>
            <button className="rounded-md bg-slate-950 px-4 py-2 font-semibold text-white dark:bg-white dark:text-slate-950" onClick={() => setToken("")}>Sign out</button>
          </div>

          {section === "Dashboard" || section === "Analytics" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                <StatCard label="Revenue" value={`Rs ${Number(analytics.revenue).toFixed(0)}`} icon={CreditCard} accent="bg-emerald-100 text-emerald-800" />
                <StatCard label="Customers" value={analytics.customers} icon={Users} accent="bg-amber-100 text-amber-800" />
                <StatCard label="Active Tailors" value={analytics.activeTailors} icon={Scissors} accent="bg-sky-100 text-sky-800" />
                <StatCard label="Delivery Partners" value={analytics.activeDeliveryPartners} icon={Truck} accent="bg-rose-100 text-rose-800" />
                <StatCard label="Orders" value={analytics.orders} icon={PackageCheck} accent="bg-violet-100 text-violet-800" />
              </div>
              <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 font-semibold">Order Pipeline</h3>
                {["ORDER_PLACED", "PICKUP_ASSIGNED", "AT_TAILOR", "READY", "DELIVERED"].map((item) => {
                  const count = orders.filter((order) => order.status === item).length;
                  return (
                    <div className="mb-3 grid grid-cols-[150px_1fr_40px] items-center gap-3" key={item}>
                      <span className="text-xs text-slate-500">{item}</span>
                      <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-3 rounded-full bg-teal-700" style={{ width: `${Math.max(8, Math.min(100, count * 18))}%` }} /></div>
                      <span className="text-right text-sm">{count}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {section === "Orders" ? (
            <>
              <DataToolbar search={search} setSearch={setSearch} status={status} setStatus={setStatus} />
              <div className="grid gap-4">
                {pagedOrders.map((order) => (
                  <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" key={order.id}>
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div><p className="font-semibold">{order.orderNumber}</p><p className="text-sm text-slate-500">{order.customer?.phone} • {order.status} • Rs {order.totalAmount}</p></div>
                      <div className="grid gap-2 md:grid-cols-3">
                        <select className="rounded-md border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => event.target.value && assign(order.id, "tailor", event.target.value)} defaultValue="">
                          <option value="">Assign tailor</option>
                          {tailors.map((tailor) => <option key={tailor.id} value={tailor.id}>{tailor.shopName ?? tailor.user.phone}</option>)}
                        </select>
                        <select className="rounded-md border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => event.target.value && assign(order.id, "pickup", event.target.value)} defaultValue="">
                          <option value="">Assign pickup</option>
                          {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.user.phone}</option>)}
                        </select>
                        <select className="rounded-md border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950" onChange={(event) => event.target.value && assign(order.id, "delivery", event.target.value)} defaultValue="">
                          <option value="">Assign delivery</option>
                          {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.user.phone}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
                <span className="text-sm text-slate-500">Page {page}</span>
                <button className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700" disabled={page * 8 >= filteredOrders.length} onClick={() => setPage((value) => value + 1)}>Next</button>
              </div>
            </>
          ) : null}

          {section === "Tailors" ? <Rows rows={tailors.map((row) => ({ id: row.id, name: row.user.name, phone: row.user.phone, shop: row.shopName, available: row.isAvailable }))} /> : null}
          {section === "Delivery Partners" ? <Rows rows={partners.map((row) => ({ id: row.id, name: row.user.name, phone: row.user.phone, vehicle: row.vehicleNumber, available: row.isAvailable }))} /> : null}
          {section === "Customers" ? <Rows rows={orders.map((row) => ({ order: row.orderNumber, customer: row.customer?.phone, status: row.status, amount: row.totalAmount }))} /> : null}
          {section === "Coupons" ? <Rows rows={coupons.map((row) => ({ code: row.code, description: row.description, type: row.discountType, value: row.discountValue, active: row.isActive }))} /> : null}
          {section === "Payments" ? <Rows rows={payments.map((row) => ({ order: row.order?.orderNumber, method: row.method, status: row.status, amount: row.amount }))} /> : null}
          {section === "Support Tickets" ? <Rows rows={tickets.map((row) => ({ subject: row.subject, status: row.status, user: row.user?.phone, order: row.order?.orderNumber }))} /> : null}
          {section === "Settings" ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-semibold">Platform Settings</h3>
              <p className="mt-2 text-sm text-slate-500">Settings API is available at <code>/api/settings</code>. Configure pickup fees, support phone, Google Maps, Cloudinary, and Firebase keys through environment variables and settings records.</p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
