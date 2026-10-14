"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Show,
  UserButton,
  OrganizationSwitcher,
  useUser,
} from "@clerk/nextjs";
import {
  ShieldCheck,
  FileText,
  Menu,
  X,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SamvaadLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

interface NavLinkItem {
  readonly label: string;
  readonly href: string;
  readonly icon?: React.ComponentType<{ className?: string }>;
}

const PUBLIC_NAV_LINKS: readonly NavLinkItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/#about" },
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/#pricing" },
];

const AUTH_NAV_LINKS: readonly NavLinkItem[] = [
  { label: "Home", href: "/" },
  { label: "Press Desk", href: "/dossiers", icon: ShieldCheck },
  { label: "Active Directory", href: "/dossiers/directory", icon: FolderOpen },
  { label: "Verification", href: "/verify", icon: CheckCircle2 },
];

export function SiteHeader(): React.JSX.Element | null {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 12);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
    return null;
  }

  const activeLinks = isSignedIn ? AUTH_NAV_LINKS : PUBLIC_NAV_LINKS;

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 pointer-events-none transition-[padding] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        scrolled ? "pt-2.5 sm:pt-3 px-3 sm:px-6" : "pt-2 sm:pt-3 px-4 sm:px-6 lg:px-8",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto w-full mx-auto flex items-center justify-between gap-2 sm:gap-4 transition-[max-width,border-radius,padding,box-shadow,border-color,background-color,backdrop-filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
          scrolled
            ? "bg-white/75 dark:bg-zinc-950/75 backdrop-blur-2xl backdrop-saturate-180 max-w-5xl px-4 sm:px-6 py-2 sm:py-2.5 rounded-[28px] border border-white/80 dark:border-white/15 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.08),inset_0_1px_2px_0_rgba(255,255,255,0.9)] dark:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5),inset_0_1px_1px_0_rgba(255,255,255,0.12)]"
            : "bg-transparent border-transparent shadow-none backdrop-blur-none max-w-[76rem] px-0 py-2 sm:py-2.5 rounded-none",
        )}
      >
        {/* Brand & Transparent Logo with Prominent Size and Intensity Adaptation */}
        <div className="flex items-center gap-3 shrink-0">
          <SamvaadLogo size="default" themeIntensity="auto" />
        </div>

        {/* Center Nav Links — Frosted glass pill */}
        <nav
          className={cn(
            "hidden md:flex items-center gap-0.5 lg:gap-1 px-1 py-1 rounded-full transition-all duration-500",
            scrolled
              ? "bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border border-white/60 dark:border-white/10 shadow-xs"
              : "bg-white/40 dark:bg-zinc-900/40 backdrop-blur-sm border border-black/5 dark:border-white/10 shadow-none",
          )}
          aria-label="Main Navigation"
        >
          {activeLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : link.href === "/dossiers"
                  ? pathname === "/dossiers" || (pathname.startsWith("/dossiers/") && pathname !== "/dossiers/directory")
                  : pathname.startsWith(link.href) && !link.href.includes("#");

            return (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "px-2.5 lg:px-3.5 py-1 text-xs font-medium rounded-full transition-all duration-200 flex items-center gap-1.5",
                  isActive
                    ? "bg-white/90 dark:bg-zinc-800 text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-zinc-800/60",
                )}
              >
                {link.icon && <link.icon className="size-3.5 opacity-80" />}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section — Action Buttons using Loreline Button System */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Signed Out View */}
          <Show when="signed-out">
            <Button
              variant="ghost"
              size="default"
              className="text-xs font-medium text-foreground hover:text-foreground/80 px-3 py-1.5"
              render={<Link href="/sign-in" />}
            >
              Sign in
            </Button>

            <Button
              variant="default"
              size="default"
              className="text-xs font-semibold px-3.5 sm:px-4 py-1.5"
              render={<Link href="/sign-up" />}
            >
              <ShieldCheck className="size-3.5" />
              <span>Get Started</span>
            </Button>
          </Show>

          {/* Signed In View */}
          <Show when="signed-in">
            <div className="flex items-center gap-2">
              <OrganizationSwitcher
                hidePersonal={true}
                afterCreateOrganizationUrl="/dossiers"
                afterSelectOrganizationUrl="/dossiers"
                afterLeaveOrganizationUrl="/dossiers"
                appearance={{
                  elements: {
                    rootBox: "flex items-center",
                    organizationSwitcherTrigger:
                      "text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-full border border-border bg-card hover:bg-card/80 text-foreground transition-all cursor-pointer shadow-xs",
                  },
                }}
              />

              <Button
                variant="default"
                size="default"
                className="hidden sm:inline-flex text-xs font-semibold px-3.5 py-1.5"
                render={<Link href="/dossiers" />}
              >
                <FileText className="size-3.5" />
                <span>Incident Desk</span>
              </Button>

              <UserButton
                appearance={{
                  elements: {
                    avatarBox:
                      "size-8 rounded-full ring-2 ring-brand/40 hover:ring-brand transition-all",
                  },
                }}
              />
            </div>
          </Show>

          {/* Mobile Navigation Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-1.5 rounded-full text-foreground hover:bg-card transition-colors cursor-pointer"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown Card */}
      {mobileMenuOpen && (
        <div className="pointer-events-auto md:hidden max-w-5xl mx-3 sm:mx-6 mt-2 p-3.5 rounded-2xl bg-background/98 dark:bg-zinc-950/98 border border-border shadow-float backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-1">
            {activeLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : link.href === "/dossiers"
                    ? pathname === "/dossiers" || (pathname.startsWith("/dossiers/") && pathname !== "/dossiers/directory")
                    : pathname.startsWith(link.href) && !link.href.includes("#");

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "px-3.5 py-2 text-sm font-medium rounded-xl transition-colors flex items-center justify-between",
                    isActive
                      ? "bg-card text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-card hover:text-foreground",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    {link.icon && <link.icon className="size-4 opacity-75" />}
                    <span>{link.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>

          <Show when="signed-out">
            <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
              <Button
                variant="default"
                size="lg"
                className="w-full text-xs font-semibold py-2.5"
                render={<Link href="/sign-up" onClick={() => setMobileMenuOpen(false)} />}
              >
                <ShieldCheck className="size-4" />
                <span>Get Started</span>
              </Button>
            </div>
          </Show>

          <Show when="signed-in">
            <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
              <Button
                variant="default"
                size="lg"
                className="w-full text-xs font-semibold py-2.5"
                render={<Link href="/dossiers" onClick={() => setMobileMenuOpen(false)} />}
              >
                <FileText className="size-4" />
                <span>Open Incident Desk</span>
              </Button>
            </div>
          </Show>
        </div>
      )}
    </header>
  );
}

