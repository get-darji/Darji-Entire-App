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
      : null;

  if (!destination) {
    return new NextResponse(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0b1220" />
    <title>Download Darji</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #0b1220; color: #fff; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      main { width: min(100%, 560px); padding: 52px 42px; border: 1px solid #263449; border-radius: 28px; background: #111c2d; text-align: center; box-shadow: 0 28px 80px #0005; }
      .brand { margin: 0; color: #ff7600; font-size: 18px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; }
      h1 { margin: 18px 0 10px; font-size: clamp(32px, 7vw, 46px); line-height: 1.08; letter-spacing: -.04em; }
      .intro { margin: 0 0 30px; color: #aebbd0; font-size: 16px; line-height: 1.6; }
      .stores { display: grid; gap: 14px; }
      .store { display: flex; min-height: 76px; align-items: center; justify-content: center; gap: 14px; padding: 14px 20px; border-radius: 15px; color: #fff; text-decoration: none; font-size: 17px; font-weight: 750; transition: transform .15s ease, background .15s ease; }
      .store:hover { transform: translateY(-2px); }
      .play { background: #203c31; border: 1px solid #347853; }
      .play:hover { background: #28513f; }
      .apple { background: #242d3c; border: 1px solid #465267; }
      .apple:hover { background: #303b4d; }
      svg { width: 30px; height: 30px; flex: none; }
      @media (max-width: 480px) { main { padding: 40px 22px; } }
    </style>
  </head>
  <body>
    <main>
      <p class="brand">Darji</p>
      <h1>Get the Darji app</h1>
      <p class="intro">Choose your app store to discover Darji and get started.</p>
      <nav class="stores" aria-label="Download Darji">
        <a class="store play" href="${PLAY_STORE_URL}" aria-label="Get Darji on Google Play">
          <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#34a853" d="M5 3.8v40.4L27.8 24z"/><path fill="#4285f4" d="m5 44.2 27-14.7-9.2-5.5z"/><path fill="#fbbc04" d="m5 3.8 17.8 18.3 9.2-5.5z"/><path fill="#ea4335" d="m22.8 22.1 9.2-5.5 9.2 5.4c1.8 1.1 1.8 2.8 0 3.9L32 31z"/></svg>
          <span>Darji on Google Play</span>
        </a>
        <a class="store apple" href="${APPLE_STORE_INFO_URL}" aria-label="Get Darji for iPhone on the App Store">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.37 12.1c.02 2.1 1.84 2.8 1.86 2.81-.02.05-.29 1-.96 1.98-.58.85-1.18 1.7-2.13 1.72-.93.02-1.23-.56-2.3-.56s-1.4.54-2.28.58c-.92.03-1.61-.91-2.2-1.76-1.2-1.73-2.12-4.89-.89-7.02a3.4 3.4 0 0 1 2.87-1.74c.9-.02 1.74.61 2.3.61.54 0 1.56-.76 2.63-.65.45.02 1.72.18 2.54 1.37-.07.04-1.52.89-1.5 2.66M14.64 6.9c.48-.58.81-1.39.72-2.2-.7.03-1.55.47-2.05 1.05-.45.52-.84 1.34-.73 2.13.78.06 1.58-.4 2.06-.98"/></svg>
          <span>Darji on the App Store</span>
        </a>
      </nav>
    </main>
  </body>
</html>`, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store, max-age=0", Vary: "User-Agent" }
    });
  }

  const response = NextResponse.redirect(destination, { status: 302 });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Vary", "User-Agent");
  return response;
}
