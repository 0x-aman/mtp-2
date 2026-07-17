"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Clock,
  Drill,
  FileUp,
  LogOut,
  Menu,
  PackagePlus,
  Settings
} from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Inventory", icon: Boxes },
  { href: "/rent", label: "Rent", icon: Clock },
  { href: "/products/new", label: "New Product", icon: PackagePlus },
  { href: "/import/csv", label: "Import CSV", icon: FileUp },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Drill className="size-6" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold leading-5">MAHALAXMI</span>
        <span className="block truncate text-xs text-muted-foreground">POWER TOOLS</span>
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
              "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
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

function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Button type="submit" variant="outline" className="w-full justify-start">
        <LogOut />
        Logout
      </Button>
    </form>
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Open navigation">
          <Menu />
        </Button>
      </DialogTrigger>
      <DialogContent className="left-3 top-3 h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-80 translate-x-0 translate-y-0 content-start overflow-y-auto p-4 sm:left-4 sm:top-4 sm:h-[calc(100dvh-2rem)]">
        <DialogHeader>
          <DialogTitle>
            <Brand />
          </DialogTitle>
          <DialogDescription className="sr-only">Primary navigation</DialogDescription>
        </DialogHeader>
        <NavLinks onNavigate={() => setOpen(false)} />
        <div className="mt-auto pt-4">
          <LogoutButton />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-card px-4 py-5 lg:flex lg:flex-col">
          <Brand />
          <div className="mt-8 flex-1">
            <NavLinks />
          </div>
          <LogoutButton />
        </aside>

        <div className="lg:pl-72">
          <header className="sticky top-0 z-20 border-b bg-background/92 backdrop-blur">
            <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3 lg:hidden">
                <MobileMenu />
                <Brand />
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

          <main className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
