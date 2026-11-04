import { NextRequest, NextResponse } from "next/server";

function backendApiUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  return (!configured || configured === "https://backend-production-5a7e4.up.railway.app/api"
    ? "https://darji-entire-app-production.up.railway.app/api"
    : configured).replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  try {
    const upstream = await fetch(`${backendApiUrl()}/auth/admin/google/start`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    const payload = await upstream.json() as { data?: { authorizationUrl?: string }; message?: string };
    if (!upstream.ok || !payload.data?.authorizationUrl) {
      return NextResponse.json({ message: payload.message ?? "Google sign-in is temporarily unavailable" }, { status: upstream.status || 503, headers: { "Cache-Control": "no-store" } });
    }
    const state = new URL(payload.data.authorizationUrl).searchParams.get("state");
    if (!state) return NextResponse.json({ message: "Could not start Google sign-in" }, { status: 502 });
    const response = NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set("darji_admin_google_state", state, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 10 * 60
    });
    return response;
  } catch {
    return NextResponse.json({ message: "Google sign-in is temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
