"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Clock,
  Drill,
  FileUp,
  FileText,
  LogOut,
  PackagePlus,
  ReceiptText,
  Settings
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Inventory", icon: Boxes },
  { href: "/rent", label: "Rent", icon: Clock },
  { href: "/sales", label: "Sales", icon: ReceiptText },
  { href: "/bill", label: "Bill Generator", icon: FileText },
  { href: "/products/new", label: "New Product", icon: PackagePlus },
  { href: "/import/csv", label: "Import CSV", icon: FileUp },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

const mobileNavItems = [
  { href: "/", label: "Inventory", icon: Boxes },
  { href: "/rent", label: "Rent", icon: Clock },
  { href: "/sales", label: "Sales", icon: ReceiptText },
  { href: "/add", label: "Add", icon: PackagePlus },
  { href: "/settings", label: "Settings", icon: Settings }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/" || (pathname.startsWith("/products") && pathname !== "/products/new");
  }

  if (href === "/rent" && pathname.startsWith("/machines") && pathname !== "/machines/new") {
    return true;
  }

  if (href === "/add") {
    return pathname === "/add" || pathname === "/products/new" || pathname.startsWith("/machines") || pathname.startsWith("/import");
  }

  if (href === "/more") {
    return pathname === "/more" || pathname.startsWith("/analytics") || pathname.startsWith("/settings") || pathname.startsWith("/sales") || pathname.startsWith("/bill");
  }

  if (href === "/settings" && (pathname.startsWith("/settings") || pathname.startsWith("/bill") || pathname === "/more")) {
    return true;
  }

  if (href === "/import/csv" && pathname.startsWith("/import")) {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex min-w-0 items-center", compact ? "gap-2" : "gap-3")}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground",
          compact ? "size-9" : "size-11"
        )}
      >
        <Drill className={compact ? "size-5" : "size-6"} />
      </span>
      <span className="min-w-0">
        <span className={cn("block truncate font-bold", compact ? "text-xs leading-4" : "text-sm leading-5")}>
          MAHALAXMI
        </span>
        <span className="block truncate text-[11px] text-muted-foreground">POWER TOOLS</span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-1.5 pb-[calc(0.35rem+env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "grid min-w-0 place-items-center gap-0.5 rounded-md px-1 py-1.5 text-[10px] font-medium leading-none text-muted-foreground",
                active && "bg-primary/10 text-primary"
              )}
            >
              <Icon className="size-4" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" size="sm" className="w-full justify-start">
        <LogOut />
        Logout
      </Button>
    </form>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card px-3 py-4 lg:flex lg:flex-col">
          <Brand />
          <div className="mt-6 flex-1">
            <NavLinks />
          </div>
          <LogoutButton />
        </aside>

        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 border-b bg-background/92 backdrop-blur">
            <div className="flex h-12 items-center justify-between gap-3 px-3 sm:px-4 lg:h-14 lg:px-6">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <Brand compact />
              </div>
              <div className="hidden min-w-0 lg:block">
                <p className="text-sm font-medium">Inventory</p>
                <p className="text-xs text-muted-foreground">MAHALAXMI POWER TOOLS</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="px-2.5 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-4 sm:pb-[calc(5rem+env(safe-area-inset-bottom))] lg:px-6 lg:pb-6">
            {children}
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </TooltipProvider>
  );
}
