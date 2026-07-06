const fs = require("fs");
const path = require("path");

const menuPath = path.join("C:/Users/amank/Desktop/app/apps/customer-web/src/components/staggered-menu.tsx");
let menu = fs.readFileSync(menuPath, "utf8");
menu = menu.replace('import type { ReactNode } from "react";', 'import type { CSSProperties, ReactNode } from "react";');
menu = menu.replace('style={{ ["--sm-accent" as string]: accentColor } as React.CSSProperties}', 'style={{ ["--sm-accent" as string]: accentColor } as CSSProperties}');
fs.writeFileSync(menuPath, menu);

const dashboardPath = path.join("C:/Users/amank/Desktop/app/apps/customer-web/src/features/dashboard/customer-app-flow.tsx");
let dashboard = fs.readFileSync(dashboardPath, "utf8");
dashboard = dashboard.replace('className="dashboard-shell flex min-h-18 items-center justify-between gap-3 py-3 sm:min-h-20 sm:gap-4"', 'className="dashboard-shell flex min-h-[4.5rem] items-center justify-between gap-3 py-3 sm:min-h-20 sm:gap-4"');
fs.writeFileSync(dashboardPath, dashboard);
