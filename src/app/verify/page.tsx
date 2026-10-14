"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  Lock,
  ArrowRight,
  FileCheck,
  QrCode,
  Fingerprint,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerificationGatewayPage(): React.JSX.Element {
  const router = useRouter();
  const [sealQuery, setSealQuery] = React.useState("");
  const [isVerifying, setIsVerifying] = React.useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = sealQuery.trim();
    if (!trimmed) return;
    setIsVerifying(true);
    router.push(`/verify/${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Soft Radial Luminous Green Glow Blob matching Loreline */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[42rem] bg-[radial-gradient(circle_at_50%_14%,rgba(212,233,74,0.38)_0%,rgba(212,233,74,0.14)_28%,transparent_60%)] animate-blob-slow" />

      <div className="relative z-10 flex-1 max-w-5xl w-full mx-auto p-6 sm:p-12 space-y-12">
        {/* Editorial Eyebrow & Headline */}
        <div className="text-center space-y-4 max-w-2xl mx-auto pt-4 sm:pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft/50 border border-brand/40 text-brand-ink text-xs font-semibold shadow-xs">
            <Fingerprint className="size-3.5 text-brand-ink" />
            <span>Public Cryptographic Registry</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-semibold tracking-tight text-foreground leading-[1.08]">
            Sovereign Disclosure <br className="hidden sm:inline" />
            Verification Gateway
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Verify the authenticity, editorial provenance, and SHA-256 seal of any official press statement, FIR summary, or emergency disclosure released via Samvaad AI.
          </p>
        </div>

        {/* Verification Search Bar Card */}
        <Card className="bg-card/90 backdrop-blur-md ring-1 ring-foreground/10 shadow-soft max-w-2xl mx-auto rounded-3xl p-2 sm:p-3">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                value={sealQuery}
                onChange={(e) => setSealQuery(e.target.value)}
                placeholder="Enter SHA-256 hash or Dossier ID (e.g. 0x8a92...)"
                className="pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-background border-border/80 rounded-2xl h-11 focus-visible:ring-brand"
              />
            </div>
            <Button
              type="submit"
              variant="default"
              size="default"
              disabled={!sealQuery.trim() || isVerifying}
              className="w-full sm:w-auto h-11 px-6 font-semibold gap-2 shrink-0 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <span className="size-3.5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  <span>Verify Seal</span>
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* 3 Core Verification Guarantees Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4">
          <Card className="bg-card/75 backdrop-blur-sm ring-1 ring-foreground/8 hover:ring-foreground/15 transition-all duration-300 rounded-2xl">
            <CardHeader className="pb-3">
              <div className="size-10 rounded-xl bg-sage-soft flex items-center justify-center text-sage mb-2 border border-sage/20">
                <CheckCircle2 className="size-5 text-emerald-700" />
              </div>
              <CardTitle className="text-lg font-display font-semibold tracking-tight">Zero-Hallucination OCR</CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                Every extracted sentence is directly anchored to bounding boxes on raw police case diaries, FIRs, and forensic affidavits.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card/75 backdrop-blur-sm ring-1 ring-foreground/8 hover:ring-foreground/15 transition-all duration-300 rounded-2xl">
            <CardHeader className="pb-3">
              <div className="size-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-700 dark:text-amber-300 mb-2 border border-amber-500/30">
                <Lock className="size-5 text-amber-700" />
              </div>
              <CardTitle className="text-lg font-display font-semibold tracking-tight">Immutable SHA-256 Seal</CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                Signed revisions freeze text, facts snapshot, and evidence attachments into an unalterable cryptographic chain.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card/75 backdrop-blur-sm ring-1 ring-foreground/8 hover:ring-foreground/15 transition-all duration-300 rounded-2xl">
            <CardHeader className="pb-3">
              <div className="size-10 rounded-xl bg-sky-soft flex items-center justify-center text-sky mb-2 border border-sky/20">
                <FileCheck className="size-5 text-sky-700" />
              </div>
              <CardTitle className="text-lg font-display font-semibold tracking-tight">Bilingual Attestation</CardTitle>
              <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                Dual-language Hindi and English press statements are synchronized with identical verified claim references.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Verification Instruction & Gateway footer */}
        <div className="p-6 sm:p-8 rounded-3xl bg-muted/40 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Badge variant="sage" className="text-[11px] font-mono">Civic &amp; Media Transparency</Badge>
              <span className="text-xs text-muted-foreground">• Open Public Access</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Journalists, legal counsel, and citizens can append any seal certificate hash to <code className="font-mono bg-background px-1.5 py-0.5 rounded text-foreground text-xs">/verify/[seal]</code> to inspect the full immutable public record.
            </p>
          </div>

          <Button
            variant="outline"
            size="default"
            render={<Link href="/dossiers" />}
            className="gap-2 shrink-0 cursor-pointer font-medium text-xs sm:text-sm"
          >
            <span>Incident Officer Desk</span>
            <ArrowRight className="size-3.5 opacity-70" />
          </Button>
        </div>
      </div>
    </div>
  );
}
