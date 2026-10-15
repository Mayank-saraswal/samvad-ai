"use client";

import * as React from "react";
import Link from "next/link";
import { PricingTable, useAuth } from "@clerk/nextjs";
import {
  ShieldAlert,
  ExternalLink,
  Building2,
  User,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SOVEREIGN_PLANS } from "@/lib/billing/plans";

interface ClerkPricingTableProps {
  initialFor?: "organization" | "user";
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

class BillingErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: (error: string) => React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback: (error: string) => React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || "Billing disabled or error rendering pricing table",
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("[Clerk Billing] Caught PricingTable initialization error:", error.message, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.state.errorMessage ?? "");
    }
    return this.props.children;
  }
}

export function ClerkPricingTable({
  initialFor = "organization",
  className,
}: ClerkPricingTableProps): React.JSX.Element {
  const { orgId, isSignedIn } = useAuth();
  const [targetType, setTargetType] = React.useState<"organization" | "user">(
    orgId ? "organization" : initialFor,
  );

  return (
    <div className={cn("space-y-8", className)}>
      {/* Target Selector: Organization Plans (B2B) vs Personal Officer Plans */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-1.5 p-1 rounded-2xl bg-card/90 backdrop-blur-md border border-border/80 shadow-xs">
          <button
            type="button"
            onClick={() => setTargetType("organization")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer",
              targetType === "organization"
                ? "bg-background text-foreground shadow-xs ring-1 ring-foreground/15"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Building2 className="size-3.5 text-brand" />
            <span>Department Organizations</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-brand-soft/70 text-brand-ink">
              B2B
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTargetType("user")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2 cursor-pointer",
              targetType === "user"
                ? "bg-background text-foreground shadow-xs ring-1 ring-foreground/15 font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <User className="size-3.5" />
            <span>Individual Officer</span>
          </button>
        </div>
      </div>

      {/* Clerk Official PricingTable Component wrapped with Billing Safe Fallback */}
      <div className="w-full">
        <BillingErrorBoundary
          fallback={(errorMsg) => (
            <div className="rounded-3xl border border-border/80 bg-card/75 backdrop-blur-md p-6 sm:p-10 text-center space-y-6 shadow-soft max-w-4xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-300 mx-auto">
                <ShieldAlert className="size-6" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h3 className="text-xl font-display font-semibold text-foreground">
                  Clerk Billing Gateway Standby
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  The official Clerk <code className="font-mono text-foreground font-semibold">&lt;PricingTable /&gt;</code> is configured. To activate checkout buttons in your local environment, toggle Billing in your Clerk Dashboard:
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <a
                  href="https://dashboard.clerk.com/last-active?path=billing/settings"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-foreground text-background text-xs font-semibold shadow-xs hover:opacity-90 transition-opacity"
                >
                  <span>Open Clerk Billing Settings</span>
                  <ExternalLink className="size-3.5" />
                </a>

                <a
                  href="https://dashboard.clerk.com/last-active?path=billing/plans"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold hover:bg-muted/50 transition-colors"
                >
                  <span>Configure Organization Plans</span>
                  <ExternalLink className="size-3.5" />
                </a>
              </div>

              {/* Offline Plan Preview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 text-left border-t border-border/60">
                {SOVEREIGN_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col justify-between",
                      plan.isPopular
                        ? "border-brand/60 bg-brand-soft/20 ring-1 ring-brand/30 shadow-xs"
                        : "border-border/70 bg-card/60",
                    )}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-semibold text-sm text-foreground">
                          {plan.name}
                        </span>
                        {plan.badge && (
                          <Badge variant="brand" className="text-[10px] font-mono">
                            {plan.badge}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold font-mono text-foreground">
                          ${plan.priceMonthly}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">/month</span>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                        {plan.description}
                      </p>

                      <ul className="space-y-1.5 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                        {plan.features.slice(0, 3).map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <Check className="size-3 text-emerald-500 shrink-0" />
                            <span className="truncate">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-4 mt-3 border-t border-border/40">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Slug: <strong className="text-foreground">{plan.slug}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        >
          <div className="clerk-pricing-wrapper w-full max-w-5xl mx-auto rounded-3xl overflow-hidden shadow-soft border border-border/80 bg-card/85 backdrop-blur-md p-4 sm:p-8">
            <PricingTable
              for={targetType}
              newSubscriptionRedirectUrl="/dossiers"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "rounded-2xl border border-border/80 bg-background/95 shadow-soft",
                },
              }}
            />
          </div>
        </BillingErrorBoundary>
      </div>
    </div>
  );
}
