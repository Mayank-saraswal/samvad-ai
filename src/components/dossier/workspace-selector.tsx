"use client";

import * as React from "react";
import {
  Plus,
  Shield,
  Waves,
  Building2,
  Scale,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Compass,
  Layers,
} from "lucide-react";
import { DOMAIN_PROFILES, type DomainProfileId, type DomainProfile } from "@/lib/domain/profiles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { createDocumentAction } from "@/app/actions";
import { cn } from "@/lib/utils";
import type { MembershipRole } from "@/server/documents/store";

interface WorkspaceSelectorProps {
  tenantId: string;
  userRole?: MembershipRole;
  initialDomain?: DomainProfileId;
  onDomainChange?: (domain: DomainProfileId) => void;
  className?: string;
}

const DOMAIN_ICONS: Record<DomainProfileId, React.ComponentType<{ className?: string }>> = {
  "public-safety": Shield,
  "disaster-response": Waves,
  "corporate-crisis": Building2,
  "legal-compliance": Scale,
};

const DOMAIN_THEMES: Record<
  DomainProfileId,
  {
    iconWrapClass: string;
    iconClass: string;
    cardBorderActive: string;
    pillBg: string;
    activeTagBg: string;
    accentBar: string;
    shortScope: string;
  }
> = {
  "public-safety": {
    iconWrapClass: "bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-300",
    iconClass: "text-amber-800 dark:text-amber-300",
    cardBorderActive: "border-amber-500/60 ring-2 ring-amber-500/20 bg-card shadow-soft",
    pillBg: "bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-200",
    activeTagBg: "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/30",
    accentBar: "bg-amber-500",
    shortScope: "FIR evidence, forensic logging & verified police press briefs",
  },
  "disaster-response": {
    iconWrapClass: "bg-sky-500/15 border-sky-500/30 text-sky-950 dark:text-sky-300",
    iconClass: "text-sky-800 dark:text-sky-300",
    cardBorderActive: "border-sky-500/60 ring-2 ring-sky-500/20 bg-card shadow-soft",
    pillBg: "bg-sky-500/15 border-sky-500/30 text-sky-950 dark:text-sky-200",
    activeTagBg: "bg-sky-500/20 text-sky-900 dark:text-sky-200 border-sky-500/30",
    accentBar: "bg-sky-500",
    shortScope: "Evacuation directives, storm advisories & civic relief SITREPs",
  },
  "corporate-crisis": {
    iconWrapClass: "bg-rose-500/15 border-rose-500/30 text-rose-950 dark:text-rose-300",
    iconClass: "text-rose-800 dark:text-rose-300",
    cardBorderActive: "border-rose-500/60 ring-2 ring-rose-500/20 bg-card shadow-soft",
    pillBg: "bg-rose-500/15 border-rose-500/30 text-rose-950 dark:text-rose-200",
    activeTagBg: "bg-rose-500/20 text-rose-900 dark:text-rose-200 border-rose-500/30",
    accentBar: "bg-rose-500",
    shortScope: "Cyber incident advisories, product recalls & stakeholder releases",
  },
  "legal-compliance": {
    iconWrapClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-950 dark:text-emerald-300",
    iconClass: "text-emerald-800 dark:text-emerald-300",
    cardBorderActive: "border-emerald-500/60 ring-2 ring-emerald-500/20 bg-card shadow-soft",
    pillBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-950 dark:text-emerald-200",
    activeTagBg: "bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-500/30",
    accentBar: "bg-emerald-500",
    shortScope: "Statutory filings, tribunal orders & regulatory compliance briefs",
  },
};

const DOMAIN_PRESETS: Record<DomainProfileId, readonly string[]> = {
  "public-safety": [
    "FIR 402/2026 - Cyber Fraud & Identity Theft",
    "Press Briefing - Interstate Robbery Ring Neutralized",
  ],
  "disaster-response": [
    "SITREP #04 - Coastal Storm Surge & Evacuation Directive",
    "Flash Flood Alert - District Emergency Mobilization",
  ],
  "corporate-crisis": [
    "Security Advisory - Incident Containment & System Audit",
    "Consumer Product Advisory - Immediate Safety Clarification",
  ],
  "legal-compliance": [
    "Statutory Filing - Regulatory & Environmental Compliance",
    "Judicial Affidavit Disclosure - Case Status Briefing",
  ],
};

export function WorkspaceSelector({
  tenantId,
  userRole = "approver",
  initialDomain = "public-safety",
  onDomainChange,
  className,
}: WorkspaceSelectorProps): React.JSX.Element {
  const [selectedDomain, setSelectedDomain] = React.useState<DomainProfileId>(initialDomain);
  const [titleInput, setTitleInput] = React.useState("");
  const [appliedPreset, setAppliedPreset] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const activeProfile: DomainProfile = DOMAIN_PROFILES[selectedDomain];
  const Icon = DOMAIN_ICONS[selectedDomain];
  const theme = DOMAIN_THEMES[selectedDomain];
  const presets = DOMAIN_PRESETS[selectedDomain];

  const handleSelect = (id: DomainProfileId) => {
    setSelectedDomain(id);
    setTitleInput("");
    setAppliedPreset(null);
    onDomainChange?.(id);
  };

  const handleApplyPreset = (presetText: string) => {
    setTitleInput(presetText);
    setAppliedPreset(presetText);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* ======================================================== */}
      {/* SECTION 1: SECTOR WORKSPACES OPERATIONS HUB (SEPARATED) */}
      {/* ======================================================== */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              <Compass className="size-3.5 text-brand" />
              <span>Operational Sector Framework</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-display font-semibold tracking-tight text-foreground">
              Select Sector Workspace
            </h2>
          </div>
          <span className="text-xs text-muted-foreground font-mono self-start sm:self-auto">
            4 Domain Profiles Active
          </span>
        </div>

        {/* Responsive 4-Card Sector Grid with Micro-Animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(Object.keys(DOMAIN_PROFILES) as DomainProfileId[]).map((id, index) => {
            const profile = DOMAIN_PROFILES[id];
            const SectorIcon = DOMAIN_ICONS[id];
            const sectorTheme = DOMAIN_THEMES[id];
            const isSelected = id === selectedDomain;

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleSelect(id)}
                style={{ animationDelay: `${index * 50}ms` }}
                className={cn(
                  "group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl text-left transition-all duration-300 cursor-pointer select-none overflow-hidden",
                  "animate-in fade-in-50 slide-in-from-bottom-2 duration-300",
                  isSelected
                    ? cn(
                        sectorTheme.cardBorderActive,
                        "ring-offset-2 ring-offset-background",
                      )
                    : "bg-card/75 hover:bg-card border border-border/80 hover:border-foreground/30 hover:-translate-y-1 hover:shadow-soft shadow-xs",
                )}
              >
                {/* Active Sector Indicator Top Accent Stripe */}
                {isSelected && (
                  <div
                    className={cn(
                      "absolute top-0 inset-x-0 h-1 transition-all duration-300",
                      sectorTheme.accentBar,
                    )}
                  />
                )}

                <div className="space-y-3">
                  {/* Top Bar: Domain Icon + Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-xl border transition-transform duration-300 group-hover:scale-105",
                        sectorTheme.iconWrapClass,
                      )}
                    >
                      <SectorIcon className={cn("size-4.5", sectorTheme.iconClass)} />
                    </span>

                    {isSelected ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border",
                          sectorTheme.activeTagBg,
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-brand animate-ping" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity font-mono">
                        Select →
                      </span>
                    )}
                  </div>

                  {/* Title & Entity Name */}
                  <div className="space-y-1">
                    <h3
                      className={cn(
                        "font-display font-semibold text-sm sm:text-base tracking-tight transition-colors",
                        isSelected ? "text-foreground font-bold" : "text-foreground/90 group-hover:text-foreground",
                      )}
                    >
                      {profile.label}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="font-mono text-[11px] text-foreground font-medium">
                        {profile.entityName}
                      </span>
                    </div>
                  </div>

                  {/* Short Scope Descriptor */}
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {sectorTheme.shortScope}
                  </p>
                </div>

                {/* Footer: Officer Role Chip */}
                <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Role:</span>
                  <span className="text-foreground font-semibold truncate max-w-[150px]">
                    {profile.actorRole}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: INCIDENT DISPATCH & QUICK SCAFFOLD CONSOLE     */}
      {/* ======================================================== */}
      <div className="rounded-3xl bg-card/90 backdrop-blur-md border border-border/80 shadow-soft overflow-hidden transition-all duration-300">
        {/* Subtle Domain Accent Top Line */}
        <div className={cn("h-1 w-full", theme.accentBar)} />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Header Area: Active Domain Persona & Metadata */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-border/60">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border",
                    theme.pillBg,
                  )}
                >
                  <Icon className={cn("size-3.5", theme.iconClass)} />
                  <span>{activeProfile.entityName}</span>
                </span>

                <span className="text-xs text-muted-foreground font-mono bg-muted/60 px-2.5 py-1 rounded-lg border border-border/50">
                  Duty Role: <strong className="text-foreground font-semibold">{activeProfile.actorRole}</strong>
                </span>

                <Badge variant={activeProfile.badgeVariant} className="text-[11px] py-0.5 px-2 font-mono">
                  Sovereign Schema Active
                </Badge>
              </div>

              <h3 className="font-display font-semibold text-lg sm:text-xl text-foreground tracking-tight">
                Dispatch New {activeProfile.entityName}
              </h3>

              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
                {activeProfile.description}
              </p>
            </div>

            <div className="hidden lg:flex items-center gap-2 p-3 rounded-2xl bg-muted/40 border border-border/60 shrink-0 text-xs text-muted-foreground font-mono">
              <Layers className="size-4 text-brand" />
              <span>Multi-tenant Isolation</span>
            </div>
          </div>

          {/* Form Row: Input + Action Button */}
          {userRole === "auditor" ? (
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-border/80 bg-muted/40 text-xs text-muted-foreground font-mono">
              <Scale className="size-4 text-muted-foreground shrink-0" />
              <span>Auditor Restricted Mode: Incident registration is locked to officer credentials.</span>
            </div>
          ) : (
            <form action={createDocumentAction} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="hidden" name="domainProfileId" value={selectedDomain} />
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  name="title"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder={activeProfile.defaultTitlePlaceholder}
                  className="w-full text-xs sm:text-sm bg-background border-border/90 h-12 rounded-xl px-4 shadow-xs focus-visible:ring-brand font-medium placeholder:text-muted-foreground/60"
                  required
                />
              </div>
              <Button
                type="submit"
                variant="default"
                size="default"
                className="gap-2 h-12 px-6 font-semibold shrink-0 cursor-pointer shadow-soft hover:shadow-float text-xs sm:text-sm transition-all duration-200"
              >
                <Plus className="size-4" />
                <span>Create {activeProfile.entityName.split(" ")[0]}</span>
              </Button>
            </form>
          )}

          {/* Quick Template Suggestion Chips with Feedback */}
          {userRole !== "auditor" && presets && presets.length > 0 && (
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2.5 text-xs">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5 shrink-0 uppercase tracking-wider font-mono">
                <Sparkles className="size-3.5 text-brand" /> Quick Templates:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {presets.map((preset) => {
                  const isCurrent = appliedPreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={cn(
                        "group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] transition-all duration-200 cursor-pointer text-left truncate max-w-sm sm:max-w-md",
                        isCurrent
                          ? "bg-foreground text-background border-foreground font-semibold shadow-xs"
                          : "bg-muted/50 hover:bg-muted border-border/70 text-foreground/80 hover:text-foreground",
                      )}
                    >
                      <span>&ldquo;{preset}&rdquo;</span>
                      {isCurrent ? (
                        <CheckCircle2 className="size-3 text-emerald-400 shrink-0" />
                      ) : (
                        <ArrowRight className="size-2.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

