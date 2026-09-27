import { NextRequest, NextResponse } from "next/server";

const actions = new Set(["request-otp", "verify-otp", "refresh", "logout"]);

export async function POST(request: NextRequest, context: { params: Promise<{ action: string }> }) {
  const { action } = await context.params;
  if (!actions.has(action)) return NextResponse.json({ message: "Not found" }, { status: 404 });
  // Cookie-authenticated mutations must originate from this admin website.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ message: "Invalid origin" }, { status: 403 });
  }
  const configured = process.env.NEXT_PUBLIC_API_URL;
  const backend = (!configured || configured === "https://backend-production-5a7e4.up.railway.app/api"
    ? "https://darji-entire-app-production.up.railway.app/api" : configured).replace(/\/$/, "");
  try {
    const upstream = await fetch(`${backend}/auth/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie")?.split(";").filter((part) => part.trim().startsWith("darzi_admin_refresh=")).join(";") ?? "",
        authorization: request.headers.get("authorization") ?? ""
      },
      body: await request.text(),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(30000)
    });
    const response = new NextResponse(await upstream.text(), {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
    for (const cookie of upstream.headers.getSetCookie()) response.headers.append("Set-Cookie", cookie);
    return response;
  } catch {
    return NextResponse.json({ message: "Authentication service is temporarily unavailable. Please retry." }, { status: 503 });
  }
}
