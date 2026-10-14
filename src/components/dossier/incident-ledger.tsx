"use client";

import * as React from "react";
import Link from "next/link";
import {
  Search,
  Shield,
  Waves,
  Building2,
  Scale,
  Clock,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Copy,
  Check,
  FolderOpen,
  Filter,
  X,
  FileCheck2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DocumentRecord } from "@/server/documents/store";
import { DOMAIN_PROFILES, type DomainProfileId } from "@/lib/domain/profiles";

interface IncidentLedgerProps {
  documents: readonly DocumentRecord[];
  className?: string;
}

const DOMAIN_ICONS: Record<DomainProfileId, React.ComponentType<{ className?: string }>> = {
  "public-safety": Shield,
  "disaster-response": Waves,
  "corporate-crisis": Building2,
  "legal-compliance": Scale,
};

const DOMAIN_META: Record<
  DomainProfileId,
  {
    label: string;
    badgeVariant: "gold" | "sky" | "coral" | "sage";
    iconClass: string;
    borderHover: string;
    pillBg: string;
  }
> = {
  "public-safety": {
    label: "Public Safety",
    badgeVariant: "gold",
    iconClass: "text-amber-800 dark:text-amber-300",
    borderHover: "hover:border-amber-500/40 hover:ring-amber-500/10",
    pillBg: "bg-amber-500/15 border-amber-500/30 text-amber-950 dark:text-amber-200",
  },
  "disaster-response": {
    label: "Disaster Response",
    badgeVariant: "sky",
    iconClass: "text-sky-800 dark:text-sky-300",
    borderHover: "hover:border-sky-500/40 hover:ring-sky-500/10",
    pillBg: "bg-sky-500/15 border-sky-500/30 text-sky-950 dark:text-sky-200",
  },
  "corporate-crisis": {
    label: "Corporate Crisis",
    badgeVariant: "coral",
    iconClass: "text-rose-800 dark:text-rose-300",
    borderHover: "hover:border-rose-500/40 hover:ring-rose-500/10",
    pillBg: "bg-rose-500/15 border-rose-500/30 text-rose-950 dark:text-rose-200",
  },
  "legal-compliance": {
    label: "Legal Compliance",
    badgeVariant: "sage",
    iconClass: "text-emerald-800 dark:text-emerald-300",
    borderHover: "hover:border-emerald-500/40 hover:ring-emerald-500/10",
    pillBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-950 dark:text-emerald-200",
  },
};

function inferDomainFromDoc(doc: DocumentRecord): DomainProfileId {
  const text = (doc.title + " " + doc.id).toLowerCase();
  if (
    text.includes("sitrep") ||
    text.includes("cyclone") ||
    text.includes("flood") ||
    text.includes("storm") ||
    text.includes("evacuation") ||
    text.includes("disaster")
  ) {
    return "disaster-response";
  }
  if (
    text.includes("security") ||
    text.includes("crisis") ||
    text.includes("statement") ||
    text.includes("advisory") ||
    text.includes("incident statement") ||
    text.includes("recall") ||
    text.includes("breach")
  ) {
    return "corporate-crisis";
  }
  if (
    text.includes("statutory") ||
    text.includes("compliance") ||
    text.includes("tribunal") ||
    text.includes("affidavit") ||
    text.includes("legal") ||
    text.includes("regulatory") ||
    text.includes("order")
  ) {
    return "legal-compliance";
  }
  return "public-safety";
}

export function IncidentLedger({ documents, className }: IncidentLedgerProps): React.JSX.Element {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "draft" | "approved">("all");
  const [sectorFilter, setSectorFilter] = React.useState<"all" | DomainProfileId>("all");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopyId = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 2000);
  };

  const filteredDocs = React.useMemo(() => {
    return documents.filter((doc) => {
      // 1. Status Filter
      if (statusFilter === "draft" && doc.status !== "draft") return false;
      if (statusFilter === "approved" && doc.status !== "approved") return false;

      // 2. Sector Filter
      const domain = inferDomainFromDoc(doc);
      if (sectorFilter !== "all" && domain !== sectorFilter) return false;

      // 3. Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesId = doc.id.toLowerCase().includes(q);
        const matchesDomain = DOMAIN_META[domain].label.toLowerCase().includes(q);
        return matchesTitle || matchesId || matchesDomain;
      }

      return true;
    });
  }, [documents, search, statusFilter, sectorFilter]);

  const draftTotal = documents.filter((d) => d.status === "draft").length;
  const approvedTotal = documents.filter((d) => d.status === "approved").length;

  return (
    <div className={cn("space-y-5", className)}>
      {/* Management Toolbar: Search Bar + Sector Pills + Status Tabs */}
      <div className="flex flex-col gap-4 p-4 sm:p-5 rounded-2xl bg-card/85 backdrop-blur-md border border-border/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Live Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search active incidents by title, reference, or sector..."
              className="pl-10 pr-9 text-xs sm:text-sm bg-background border-border/80 rounded-xl h-10 focus-visible:ring-brand"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs: All | In Review | Sealed */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              All ({documents.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("draft")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
                statusFilter === "draft"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>In Review ({draftTotal})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("approved")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5",
                statusFilter === "approved"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="size-1.5 rounded-full bg-emerald-500" />
              <span>Sealed ({approvedTotal})</span>
            </button>
          </div>
        </div>

        {/* Sector Quick Filter Strip */}
        <div className="pt-3 border-t border-border/50 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mr-1">
            <Filter className="size-3" /> Sector:
          </span>

          <button
            type="button"
            onClick={() => setSectorFilter("all")}
            className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer border",
              sectorFilter === "all"
                ? "bg-foreground text-background border-foreground font-semibold"
                : "bg-muted/40 text-muted-foreground hover:text-foreground border-border/60",
            )}
          >
            All Sectors
          </button>

          {(Object.keys(DOMAIN_PROFILES) as DomainProfileId[]).map((id) => {
            const meta = DOMAIN_META[id];
            const Icon = DOMAIN_ICONS[id];
            const isSelected = sectorFilter === id;
            const count = documents.filter((d) => inferDomainFromDoc(d) === id).length;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setSectorFilter(id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border",
                  isSelected
                    ? "bg-background text-foreground shadow-xs ring-1 ring-foreground/20 font-semibold border-foreground/30"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted/70 border-border/60",
                )}
              >
                <Icon className={cn("size-3 shrink-0", meta.iconClass)} />
                <span>{meta.label}</span>
                {count > 0 && (
                  <span className="text-[10px] font-mono opacity-70 px-1 py-0.2 rounded-full bg-foreground/10">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Incident Cards Grid */}
      {documents.length === 0 ? (
        <Card className="border border-dashed border-border/80 p-12 text-center space-y-4 bg-card/60 backdrop-blur-sm rounded-3xl">
          <div className="w-14 h-14 rounded-2xl bg-brand-soft/60 flex items-center justify-center mx-auto text-brand-ink ring-1 ring-brand/30 shadow-xs">
            <FolderOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="font-display font-semibold text-lg text-foreground tracking-tight">
              No active incident disclosures yet
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Choose a sector domain above and click a quick template or type a title to scaffold your first incident dossier.
            </p>
          </div>
        </Card>
      ) : filteredDocs.length === 0 ? (
        <div className="p-12 text-center space-y-3 rounded-2xl border border-dashed border-border/80 bg-card/40">
          <p className="text-sm font-semibold text-foreground">No incidents match your filter</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No dossier items match the selected search query or sector filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
              setSectorFilter("all");
            }}
            className="text-xs mt-2"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredDocs.map((doc, idx) => {
            const domainId = inferDomainFromDoc(doc);
            const domain = DOMAIN_META[domainId];
            const Icon = DOMAIN_ICONS[domainId];
            const profile = DOMAIN_PROFILES[domainId];
            const isApproved = doc.status === "approved";
            const shortId = doc.id.slice(0, 8);
            const isCopied = copiedId === doc.id;

            return (
              <Card
                key={doc.id}
                style={{ animationDelay: `${idx * 60}ms` }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl bg-card/90 backdrop-blur-md border border-border/80 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-float p-0",
                  domain.borderHover,
                  "animate-in fade-in-50 slide-in-from-bottom-3 duration-300",
                )}
              >
                {/* Subtle top domain accent indicator stripe */}
                <div
                  className={cn(
                    "h-1 w-full transition-opacity duration-300 opacity-60 group-hover:opacity-100",
                    isApproved
                      ? "bg-emerald-500"
                      : domainId === "public-safety"
                        ? "bg-amber-500"
                        : domainId === "disaster-response"
                          ? "bg-sky-500"
                          : domainId === "corporate-crisis"
                            ? "bg-rose-500"
                            : "bg-emerald-600",
                  )}
                />

                <CardContent className="p-5 sm:p-6 flex flex-col justify-between h-full space-y-4">
                  {/* Top Row: Sector Badge + Status Badge */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border",
                        domain.pillBg,
                      )}
                    >
                      <Icon className={cn("size-3.5 shrink-0", domain.iconClass)} />
                      <span>{profile.entityName}</span>
                    </span>

                    {isApproved ? (
                      <Badge variant="sage" className="gap-1.5 text-xs font-mono py-0.5 px-2.5">
                        <ShieldCheck className="size-3 text-emerald-600" />
                        <span>Sealed &amp; Certified</span>
                      </Badge>
                    ) : (
                      <Badge variant="gold" className="gap-1.5 text-xs font-mono py-0.5 px-2.5">
                        <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Draft Review</span>
                      </Badge>
                    )}
                  </div>

                  {/* Middle Title Area */}
                  <div className="space-y-1.5">
                    <Link
                      href={`/dossiers/${doc.id}`}
                      className="block font-display font-semibold text-lg sm:text-xl text-foreground tracking-tight group-hover:text-foreground/85 transition-colors line-clamp-2"
                    >
                      {doc.title}
                    </Link>
                    <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                      {profile.label} • {profile.description}
                    </p>
                  </div>

                  {/* Cryptographic ID & Timestamp Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs text-muted-foreground font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-muted-foreground">ID:</span>
                      <button
                        type="button"
                        onClick={(e) => handleCopyId(e, doc.id)}
                        title="Click to copy full ID"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60 hover:bg-muted text-[11px] text-foreground transition-colors cursor-pointer border border-border/40 font-mono"
                      >
                        <span>#{shortId}</span>
                        {isCopied ? (
                          <Check className="size-3 text-emerald-600" />
                        ) : (
                          <Copy className="size-3 opacity-60 group-hover/btn:opacity-100" />
                        )}
                      </button>
                    </div>

                    <span className="text-[11px] text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Action Bar Footer */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isApproved && (
                        <Link
                          href={`/verify/${doc.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800 hover:text-emerald-950 dark:text-emerald-300 hover:underline"
                        >
                          <FileCheck2 className="size-3" />
                          <span>Proof ↗</span>
                        </Link>
                      )}
                    </div>

                    <Button
                      variant={isApproved ? "outline" : "default"}
                      size="sm"
                      render={<Link href={`/dossiers/${doc.id}`} />}
                      className="gap-1.5 font-semibold text-xs h-9 px-4 cursor-pointer group/btn"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="size-3.5 transition-transform duration-200 group-hover/btn:translate-x-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
