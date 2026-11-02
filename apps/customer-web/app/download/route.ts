import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.darji.customer";
const APPLE_STORE_INFO_URL = "https://www.getdarji.in/applestore";
const WEBSITE_URL = "https://www.getdarji.in";

export function GET(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const destination = /android/i.test(userAgent)
    ? PLAY_STORE_URL
    : /iphone|ipad|ipod/i.test(userAgent)
      ? APPLE_STORE_INFO_URL
      : WEBSITE_URL;

  const response = NextResponse.redirect(destination, { status: 302 });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Vary", "User-Agent");
  return response;
}
