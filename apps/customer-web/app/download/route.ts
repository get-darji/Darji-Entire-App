import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.darji.customer";
const APPLE_STORE_INFO_URL = "https://www.getdarji.in/applestore";
const WEBSITE_URL = "https://www.getdarji.in";
const DOWNLOAD_URL = "https://www.getdarji.in/download";

export function GET(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const isSearchCrawler = /bot|crawler|spider|slurp|bingpreview/i.test(userAgent);
  const destination = !isSearchCrawler && /android/i.test(userAgent)
    ? PLAY_STORE_URL
    : !isSearchCrawler && /iphone|ipad|ipod/i.test(userAgent)
      ? APPLE_STORE_INFO_URL
      : null;

  if (!destination) {
    return new NextResponse(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#fbf7f0" />
    <meta name="description" content="Download the Darji app for Android from Google Play, or explore Darji for iPhone. Get the Darji tailoring app for doorstep stitching, alterations and clothing care." />
    <meta name="keywords" content="Darji download, Get Darji download, download Darji app, Darji app Android, Darji app iPhone, tailoring app India" />
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    <link rel="canonical" href="${DOWNLOAD_URL}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="en_IN" />
    <meta property="og:site_name" content="Darji" />
    <meta property="og:title" content="Download Darji App for Android &amp; iPhone" />
    <meta property="og:description" content="Get Darji on Google Play or find out about Darji for iPhone. Doorstep tailoring, stitching and alterations made simple." />
    <meta property="og:url" content="${DOWNLOAD_URL}" />
    <meta property="og:image" content="https://www.getdarji.in/og-image.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Download Darji App for Android &amp; iPhone" />
    <meta name="twitter:description" content="Get Darji on Google Play or find out about Darji for iPhone. Doorstep tailoring, stitching and alterations made simple." />
    <meta name="twitter:image" content="https://www.getdarji.in/og-image.jpg" />
    <title>Download Darji App for Android &amp; iPhone | Darji</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; color: #172033; background: #fbf7f0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .page { position: relative; isolation: isolate; display: flex; min-height: 100vh; flex-direction: column; overflow: hidden; }
      .page:before, .page:after { position: absolute; z-index: -1; width: 34rem; height: 34rem; border-radius: 50%; content: ""; filter: blur(70px); opacity: .3; }
      .page:before { top: -18rem; right: -10rem; background: #f4b75c; }
      .page:after { bottom: -22rem; left: -12rem; background: #ff7000; opacity: .12; }
      header, footer { width: min(100% - 40px, 1180px); margin: 0 auto; }
      header { display: flex; align-items: center; justify-content: space-between; padding: 24px 0; }
      .brand { display: inline-flex; align-items: center; gap: 11px; color: #172033; font-size: 17px; font-weight: 800; letter-spacing: -.03em; text-decoration: none; }
      .brand img { width: 52px; height: 42px; object-fit: contain; }
      .home { color: #596579; font-size: 14px; font-weight: 700; text-decoration: none; }
      .home:hover { color: #d45d00; }
      main { display: grid; width: min(100% - 40px, 1180px); flex: 1; align-items: center; gap: 52px; margin: 0 auto; padding: 36px 0 72px; }
      .eyebrow { display: inline-flex; align-items: center; gap: 9px; margin: 0; color: #ad4b00; font-size: 12px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
      .eyebrow:before { width: 8px; height: 8px; border-radius: 50%; background: #ff7000; box-shadow: 0 0 0 5px #ff70001c; content: ""; }
      h1 { max-width: 720px; margin: 20px 0 0; color: #111b2d; font-family: Georgia, "Times New Roman", serif; font-size: clamp(48px, 7vw, 88px); font-weight: 600; line-height: .98; letter-spacing: -.055em; }
      h1 span { color: #e36a10; }
      .intro { max-width: 610px; margin: 22px 0 0; color: #596579; font-size: clamp(16px, 2vw, 19px); line-height: 1.75; }
      .card { width: min(100%, 510px); justify-self: end; padding: 30px; border: 1px solid #eadfd3; border-radius: 26px; background: #fffdf9; box-shadow: 0 24px 70px #6d4c2b12; }
      .card-title { margin: 0 0 18px; color: #25324a; font-size: 14px; font-weight: 800; }
      .stores { display: grid; gap: 12px; }
      .store { display: flex; min-height: 72px; align-items: center; gap: 15px; padding: 13px 18px; border: 1px solid #e9e1d7; border-radius: 16px; background: #fff; color: #172033; text-decoration: none; transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease; }
      .store:hover { transform: translateY(-2px); border-color: #ffb36e; box-shadow: 0 12px 26px #a24b1615; }
      .icon { display: grid; width: 44px; height: 44px; flex: none; place-items: center; border-radius: 13px; background: #fff1e5; color: #e36a10; }
      .icon svg { width: 25px; height: 25px; }
      .copy { display: grid; gap: 3px; }
      .copy small { color: #727d8e; font-size: 11px; font-weight: 700; letter-spacing: .04em; }
      .copy strong { color: #172033; font-size: 16px; font-weight: 850; }
      .arrow { margin-left: auto; color: #b24b00; font-size: 22px; }
      .note { margin: 16px 2px 0; color: #7b8491; font-size: 12px; line-height: 1.6; }
      footer { display: flex; justify-content: space-between; gap: 18px; padding: 20px 0 26px; border-top: 1px solid #e9e1d7; color: #778296; font-size: 12px; }
      footer a { color: #596579; font-weight: 700; text-decoration: none; }
      footer a:hover { color: #d45d00; }
      @media (min-width: 850px) { main { grid-template-columns: 1.15fr .85fr; } }
      @media (max-width: 849px) { main { gap: 30px; padding-top: 44px; } .card { justify-self: start; } }
      @media (max-width: 480px) { header, footer, main { width: min(100% - 32px, 1180px); } header { padding: 18px 0; } main { padding: 28px 0 48px; } .card { padding: 22px 18px; border-radius: 20px; } .store { min-height: 68px; } footer { flex-direction: column; } }
      @media (prefers-reduced-motion: reduce) { *, *:before, *:after { scroll-behavior: auto !important; transition-duration: .01ms !important; } }
    </style>
  </head>
  <body>
    <div class="page">
      <header>
        <a class="brand" href="${WEBSITE_URL}" aria-label="Darji home"><img src="/darji-logo-cropped.png" alt="" /> <span>Thoughtful tailoring, made simple.</span></a>
        <a class="home" href="${WEBSITE_URL}">Explore Darji <span aria-hidden="true">↗</span></a>
      </header>
      <main>
        <section aria-labelledby="download-title">
          <p class="eyebrow">Made for every stitch</p>
          <h1 id="download-title">Download the <span>Darji app.</span></h1>
          <p class="intro">Get the Darji tailoring app for Android on Google Play, or explore Darji for iPhone. Book doorstep stitching, alterations and clothing care with local professionals.</p>
        </section>
        <section class="card" aria-label="Choose your app store">
          <p class="card-title">Choose your device</p>
          <nav class="stores" aria-label="Darji app stores">
            <a class="store" href="${PLAY_STORE_URL}" aria-label="Download Darji for Android on Google Play">
              <span class="icon"><svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#34a853" d="M5 3.8v40.4L27.8 24z"/><path fill="#4285f4" d="m5 44.2 27-14.7-9.2-5.5z"/><path fill="#fbbc04" d="m5 3.8 17.8 18.3 9.2-5.5z"/><path fill="#ea4335" d="m22.8 22.1 9.2-5.5 9.2 5.4c1.8 1.1 1.8 2.8 0 3.9L32 31z"/></svg></span>
              <span class="copy"><small>ANDROID APP</small><strong>Darji on Google Play</strong></span><span class="arrow" aria-hidden="true">↗</span>
            </a>
            <a class="store" href="${APPLE_STORE_INFO_URL}" aria-label="Darji for iPhone and App Store launch information">
              <span class="icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.37 12.1c.02 2.1 1.84 2.8 1.86 2.81-.02.05-.29 1-.96 1.98-.58.85-1.18 1.7-2.13 1.72-.93.02-1.23-.56-2.3-.56s-1.4.54-2.28.58c-.92.03-1.61-.91-2.2-1.76-1.2-1.73-2.12-4.89-.89-7.02a3.4 3.4 0 0 1 2.87-1.74c.9-.02 1.74.61 2.3.61.54 0 1.56-.76 2.63-.65.45.02 1.72.18 2.54 1.37-.07.04-1.52.89-1.5 2.66M14.64 6.9c.48-.58.81-1.39.72-2.2-.7.03-1.55.47-2.05 1.05-.45.52-.84 1.34-.73 2.13.78.06 1.58-.4 2.06-.98"/></svg></span>
              <span class="copy"><small>FOR IPHONE</small><strong>Darji on the App Store</strong></span><span class="arrow" aria-hidden="true">↗</span>
            </a>
          </nav>
          <p class="note">The iPhone link opens our App Store launch page with the latest availability details.</p>
        </section>
        <script type="application/ld+json">${JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${DOWNLOAD_URL}#webpage`,
          url: DOWNLOAD_URL,
          name: "Download Darji App for Android and iPhone",
          description: "Download the Darji tailoring app for Android from Google Play, or explore Darji for iPhone.",
          isPartOf: { "@id": "https://www.getdarji.in/#website" },
          about: { "@id": "https://www.getdarji.in/#organization" },
          breadcrumb: { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: WEBSITE_URL },
            { "@type": "ListItem", position: 2, name: "Download Darji", item: DOWNLOAD_URL }
          ] }
        })}</script>
      </main>
      <footer><span>© ${new Date().getFullYear()} Darji Technologies Private Limited</span><a href="${WEBSITE_URL}">Visit getdarji.in</a></footer>
    </div>
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
