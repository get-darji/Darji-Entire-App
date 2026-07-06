const fs = require("fs");
const path = require("path");

function replaceOrThrow(source, searchValue, replaceValue, label) {
  if (!source.includes(searchValue)) {
    throw new Error(`Could not find block for ${label}`);
  }
  return source.replace(searchValue, replaceValue);
}

const dashboardPath = path.join("C:/Users/amank/Desktop/app/apps/customer-web/src/features/dashboard/customer-app-flow.tsx");
let dashboard = fs.readFileSync(dashboardPath, "utf8");

dashboard = replaceOrThrow(
  dashboard,
  'import { BrandLogo } from "@/src/components/brand-logo";\n',
  'import { BrandLogo } from "@/src/components/brand-logo";\nimport StaggeredMenu from "@/src/components/staggered-menu";\n',
  'dashboard import'
);

const oldHeader = `function AppHeader({
  screen,
  setScreen,
  signOut,
  syncing
}: {
  screen: CustomerScreen;
  setScreen: (screen: CustomerScreen) => void;
  signOut: () => void;
  syncing: boolean;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/86 backdrop-blur-xl">
      <div className="shell flex min-h-20 items-center justify-between gap-4">
        <Link href="/" className="shrink-0 rounded-xl">
          <BrandLogo imageClassName="h-[58px] w-auto" />
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {appNav.map((item) => {
            const Icon = item.icon;
            const active = item.screen === screen || (item.screen === "newRequest" && ["clothIssue", "summary", "quotes", "confirm"].includes(screen));
            return (
              <button key={item.screen} onClick={() => setScreen(item.screen)} className={\`focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition \${active ? "bg-[var(--darji-ink)] text-white" : "text-[var(--darji-muted)] hover:bg-[#f8fafc] hover:text-[var(--darji-ink)]"}\`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {syncing ? (
            <span className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[var(--darji-muted)] shadow-sm sm:inline-flex">
              <Loader2 className="h-4 w-4 animate-spin" /> Syncing
            </span>
          ) : null}
          <Button variant="ghost" className="min-h-10 px-4" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
`;

const newHeader = `function AppHeader({
  screen,
  setScreen,
  signOut,
  syncing
}: {
  screen: CustomerScreen;
  setScreen: (screen: CustomerScreen) => void;
  signOut: () => void;
  syncing: boolean;
}) {
  const mobileMenuItems = [
    { label: "Home", ariaLabel: "Open home dashboard", onSelect: () => setScreen("home") },
    { label: "Book", ariaLabel: "Start a new booking", onSelect: () => setScreen("newRequest") },
    { label: "Orders", ariaLabel: "Open your orders", onSelect: () => setScreen("orders") },
    { label: "Account", ariaLabel: "Open account details", onSelect: () => setScreen("account") },
    { label: "Support", ariaLabel: "Open support center", onSelect: () => setScreen("contactSupport") }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/88 backdrop-blur-xl">
      <div className="dashboard-shell flex min-h-18 items-center justify-between gap-3 py-3 sm:min-h-20 sm:gap-4">
        <Link href="/" className="shrink-0 rounded-xl">
          <BrandLogo imageClassName="h-[52px] w-auto sm:h-[58px]" />
        </Link>
        <nav className="hidden items-center gap-2 md:flex">
          {appNav.map((item) => {
            const Icon = item.icon;
            const active = item.screen === screen || (item.screen === "newRequest" && ["clothIssue", "summary", "quotes", "confirm"].includes(screen));
            return (
              <button key={item.screen} onClick={() => setScreen(item.screen)} className={\`focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black transition \${active ? "bg-[var(--darji-ink)] text-white" : "text-[var(--darji-muted)] hover:bg-[#f8fafc] hover:text-[var(--darji-ink)]"}\`}>
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          {syncing ? (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--darji-muted)] shadow-sm sm:hidden">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          ) : null}
          {syncing ? (
            <span className="hidden items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-[var(--darji-muted)] shadow-sm sm:inline-flex">
              <Loader2 className="h-4 w-4 animate-spin" /> Syncing
            </span>
          ) : null}
          <div className="hidden md:block">
            <Button variant="ghost" className="min-h-10 px-4" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
          <div className="md:hidden">
            <StaggeredMenu
              items={mobileMenuItems}
              footerActions={[
                { label: "Logout", onSelect: signOut },
                { label: "Book Service", onSelect: () => setScreen("newRequest"), tone: "accent" }
              ]}
              displayItemNumbering={true}
              logo={<BrandLogo imageClassName="h-[54px] w-auto" />}
              colors={["#fff6e7", "#ffe3c0", "#ff7000"]}
              menuButtonColor="#08111f"
              openMenuButtonColor="#08111f"
              accentColor="#ff7000"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
`;

dashboard = replaceOrThrow(dashboard, oldHeader, newHeader, 'AppHeader');

dashboard = dashboard.replace(/function BottomNav\([\s\S]*?\n\}\n\nfunction LoadingScreen/, 'function LoadingScreen');

dashboard = dashboard.replace('<div className="grid gap-6 pb-6">', '<div className="grid gap-4 pb-4 sm:gap-6 sm:pb-6">');
dashboard = dashboard.replace('className="rounded-[2rem] border border-[#dfe8f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfe_100%)] p-4 shadow-[0_20px_54px_rgba(8,17,31,0.07)] sm:p-5"', 'className="rounded-[1.6rem] border border-[#dfe8f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfe_100%)] p-4 shadow-[0_20px_54px_rgba(8,17,31,0.07)] sm:rounded-[2rem] sm:p-5"');
dashboard = dashboard.replace('className="overflow-hidden rounded-[2rem] border border-[#efcf92] bg-[linear-gradient(180deg,#fffaf0_0%,#fff6e7_100%)] p-6 shadow-[0_26px_70px_rgba(246,163,19,0.12)] sm:p-7"', 'className="overflow-hidden rounded-[1.75rem] border border-[#efcf92] bg-[linear-gradient(180deg,#fffaf0_0%,#fff6e7_100%)] p-5 shadow-[0_26px_70px_rgba(246,163,19,0.12)] sm:rounded-[2rem] sm:p-7"');
dashboard = dashboard.replace('className="mt-4 max-w-3xl text-4xl font-black leading-[1.02] text-[var(--darji-ink)] md:text-5xl"', 'className="mt-4 max-w-3xl text-[2.3rem] font-black leading-[1.02] text-[var(--darji-ink)] sm:text-4xl md:text-5xl"');
dashboard = dashboard.replaceAll('className="mt-1 text-3xl font-black text-[var(--darji-ink)]"', 'className="mt-1 text-[1.7rem] font-black text-[var(--darji-ink)] sm:text-3xl"');
dashboard = dashboard.replaceAll('className="rounded-[2rem] border border-[#dfe8f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfe_100%)] p-5 shadow-[0_20px_54px_rgba(8,17,31,0.07)]"', 'className="rounded-[1.75rem] border border-[#dfe8f2] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbfe_100%)] p-4 shadow-[0_20px_54px_rgba(8,17,31,0.07)] sm:rounded-[2rem] sm:p-5"');
dashboard = dashboard.replace('    <main className="min-h-screen bg-[var(--darji-page)] pb-24 md:pb-0">', '    <main className="min-h-screen bg-[var(--darji-page)] pb-8 md:pb-0">');
dashboard = dashboard.replace('      <div className="shell py-7">', '      <div className="dashboard-shell py-4 sm:py-7">');
dashboard = dashboard.replace('      <BottomNav screen={screen} setScreen={setAppScreen} />\n', '');

fs.writeFileSync(dashboardPath, dashboard);

const heroPath = path.join("C:/Users/amank/Desktop/app/apps/customer-web/src/features/marketing/premium-hero.tsx");
let hero = fs.readFileSync(heroPath, "utf8");
hero = hero.replace(/\n\s*<div className="mt-8 grid gap-3 rounded-\[1\.75rem\][\s\S]*?<\/div>\n\s*<\/div>\n\n\s*<div className="darji-hero-image/, '\n          </div>\n\n          <div className="darji-hero-image');
fs.writeFileSync(heroPath, hero);

const globalsPath = path.join("C:/Users/amank/Desktop/app/apps/customer-web/app/globals.css");
let globals = fs.readFileSync(globalsPath, "utf8");
if (!globals.includes('.dashboard-shell')) {
  globals += '\n\n.dashboard-shell {\n  width: min(1280px, calc(100% - 44px));\n  margin: 0 auto;\n}\n\n@media (max-width: 767px) {\n  .dashboard-shell {\n    width: min(100%, calc(100% - 20px));\n  }\n}\n';
}
fs.writeFileSync(globalsPath, globals);
