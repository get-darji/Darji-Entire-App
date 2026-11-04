import { NextRequest, NextResponse } from "next/server";

function backendApiUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  return (!configured || configured === "https://backend-production-5a7e4.up.railway.app/api"
    ? "https://darji-entire-app-production.up.railway.app/api"
    : configured).replace(/\/$/, "");
}

function loginRedirect(request: NextRequest, result: "connected" | "denied" | "error", accessToken?: string) {
  const url = new URL("/", request.nextUrl.origin);
  url.searchParams.set("section", "dashboard");
  url.searchParams.set("google_auth", result);
  if (accessToken) url.hash = new URLSearchParams({ accessToken }).toString();
  const response = NextResponse.redirect(url, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("darji_admin_google_state", "", { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/api/auth/google", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  if (searchParams.has("error")) return loginRedirect(request, "denied");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("darji_admin_google_state")?.value;
  if (!code || !state || !storedState || state !== storedState) return loginRedirect(request, "error");

  try {
    const upstream = await fetch(`${backendApiUrl()}/auth/admin/google/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, state }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20_000)
    });
    const payload = await upstream.json() as { data?: { accessToken?: string; refreshToken?: string }; message?: string };
    if (!upstream.ok || !payload.data?.accessToken || !payload.data.refreshToken) return loginRedirect(request, "error");

    const response = loginRedirect(request, "connected", payload.data.accessToken);
    response.cookies.set("darji_admin_refresh", payload.data.refreshToken, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 30 * 24 * 60 * 60
    });
    return response;
  } catch {
    return loginRedirect(request, "error");
  }
}
