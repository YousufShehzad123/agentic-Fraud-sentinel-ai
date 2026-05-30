import { Link, useLocation } from "wouter";
import { LayoutDashboard, Activity, AlertTriangle, Briefcase, BarChart2, Bot, Shield } from "lucide-react";

const NAV = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/transactions", label: "Transactions", icon: Activity },
  { path: "/alerts", label: "Alerts", icon: AlertTriangle },
  { path: "/cases", label: "Cases", icon: Briefcase },
  { path: "/analytics", label: "Analytics", icon: BarChart2 },
  { path: "/agent", label: "ML Agent", icon: Bot },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-56 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <div className="text-sm font-bold tracking-widest text-primary uppercase">SentinelAI</div>
            <div className="text-[10px] text-muted-foreground tracking-wider">Fraud Detection</div>
          </div>
        </div>

        <div className="px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-[10px] text-muted-foreground tracking-widest uppercase">Agent Active</span>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(({ path, label, icon: Icon }) => {
            const isActive = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <Link key={path} href={path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2 rounded text-sm cursor-pointer transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="tracking-wide">{label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-border">
          <div className="text-[10px] text-muted-foreground">v2.0.0 · Easypaisa / JazzCash</div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
