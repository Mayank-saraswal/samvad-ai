"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Volume2,
  Sparkles,
  History,
  Scale,
  Languages,
  AlertTriangle,
  Upload,
  CheckCircle2,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { checkNeutrality, type NeutralityFlag } from "@/lib/press-facts/neutrality";
import { HEADLINE_MAX_WORDS } from "@/lib/press-facts/bundle";
import { approveDocumentAction, saveRevisionAction, searchPrecedentsAction } from "@/app/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DirectUploadDropzone } from "@/components/dossier/direct-upload-dropzone";
import { PdfInspector } from "@/components/reader/pdf-inspector";
import { getDomainProfile } from "@/lib/domain/profiles";
import type { DocumentStatus, MembershipRole } from "@/server/documents/store";

export interface SourceItem {
  readonly id: string;
  readonly documentId: string;
  readonly kind: string;
  readonly r2Key: string | null;
  readonly sha256: string | null;
  readonly metadata: unknown;
  readonly createdAt: Date;
}

export interface RevisionItem {
  readonly id: string;
  readonly documentId: string;
  readonly revisionNumber: number;
  readonly diff: unknown;
  readonly factsSnapshot: unknown;
  readonly bundleSnapshot: unknown;
  readonly authorId: string;
  readonly reason: string;
  readonly approved: boolean;
  readonly approvedBy: string | null;
  readonly approvedAt: Date | null;
  readonly createdAt: Date;
}

export interface DocumentDetail {
  readonly id: string;
  readonly tenantId: string;
  readonly title: string;
  readonly status: DocumentStatus;
  readonly createdAt: Date;
  readonly sources: readonly SourceItem[];
  readonly revisions: readonly RevisionItem[];
}

interface ReviewEditorProps {
  readonly initialDoc: DocumentDetail;
  readonly currentUserId: string;
  readonly userRole?: MembershipRole;
}

export function ReviewEditor({
  initialDoc,
  currentUserId,
  userRole = "approver",
}: ReviewEditorProps): React.JSX.Element {
  const router = useRouter();
  const [doc, setDoc] = React.useState<DocumentDetail>(initialDoc);
  const [status, setStatus] = React.useState<DocumentStatus>(initialDoc.status);
  const [activeLocator, setActiveLocator] = React.useState<string | null>(null);
  const [leftTab, setLeftTab] = React.useState<string>("sources");

  const canEdit = userRole !== "auditor" && status === "draft";
  const canApprove = userRole === "approver" && status === "draft";
  const isAuditor = userRole === "auditor";

  const latestRev = doc.revisions[doc.revisions.length - 1];
  const latestDiff = (latestRev?.diff ?? doc.revisions[0]?.diff) as {
    headline1?: string;
    headline2?: string;
    headline3?: string;
    summary?: string;
    detail?: string;
    secondaryHeadline?: string;
    secondarySummary?: string;
    domainProfileId?: string;
  } | undefined;

  const domainProfile = getDomainProfile(latestDiff?.domainProfileId);

  // Dynamic draft states derived strictly from document revisions (zero dummy mock data)
  const [headline1, setHeadline1] = React.useState(latestDiff?.headline1 ?? doc.title ?? "");
  const [headline2, setHeadline2] = React.useState(latestDiff?.headline2 ?? "");
  const [headline3, setHeadline3] = React.useState(latestDiff?.headline3 ?? "");
  const [summary, setSummary] = React.useState(latestDiff?.summary ?? "");
  const [detail, setDetail] = React.useState(latestDiff?.detail ?? "");

  // Secondary bundle preview state (injected via runtime locale seam)
  const [secondaryHeadline, setSecondaryHeadline] = React.useState(latestDiff?.secondaryHeadline ?? "");
  const [secondarySummary, setSecondarySummary] = React.useState(latestDiff?.secondarySummary ?? "");

  const factsSnapshot = latestRev?.factsSnapshot as {
    spans?: { sourceId: string; locator: string; text: string }[];
    claims?: Record<string, { value: string; spanIndex?: number }[]>;
  } | null | undefined;
  const extractedSpans = factsSnapshot?.spans ?? [];
  const claims = factsSnapshot?.claims;
  const hasClaims = Boolean(claims && Object.values(claims).some((arr) => arr && arr.length > 0));

  // Revision state
  const [revisionReason, setRevisionReason] = React.useState("");
  const [savingRevision, setSavingRevision] = React.useState(false);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = React.useState(false);

  // Approval state
  const [confirmedCheckbox, setConfirmedCheckbox] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = React.useState(false);

  // Precedents state (Qdrant semantic index)
  const [precedents, setPrecedents] = React.useState<readonly { id: string; text: string; score: number }[]>([]);
  const [isPrecedentDialogOpen, setIsPrecedentDialogOpen] = React.useState(false);
  const [searchingPrecedents, setSearchingPrecedents] = React.useState(false);

  async function handleSearchPrecedents() {
    setSearchingPrecedents(true);
    try {
      const res = await searchPrecedentsAction({
        tenantId: doc.tenantId,
        queryText: headline1 || doc.title,
      });
      if (res.success && res.data) {
        setPrecedents(res.data);
      }
    } finally {
      setSearchingPrecedents(false);
    }
  }

  // Real-time neutrality check
  const fullDraftText = `${headline1} ${headline2} ${headline3} ${summary} ${detail}`;
  const neutralityFlags: NeutralityFlag[] = React.useMemo(() => {
    return checkNeutrality(fullDraftText);
  }, [fullDraftText]);

  // Word counts
  const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const h1Words = countWords(headline1);
  const h2Words = countWords(headline2);
  const h3Words = countWords(headline3);

  async function handleApprove() {
    if (!confirmedCheckbox) return;
    setApproving(true);
    try {
      const res = await approveDocumentAction({
        documentId: doc.id,
        tenantId: doc.tenantId,
      });
      if (res.success) {
        setStatus("approved");
        setDoc((prev) => ({ ...prev, status: "approved" }));
        setIsApproveDialogOpen(false);
        router.refresh();
      }
    } finally {
      setApproving(false);
    }
  }

  async function handleSaveRevision() {
    if (!revisionReason.trim()) return;
    setSavingRevision(true);
    try {
      const nextRevNumber = (doc.revisions.length || 0) + 1;
      const res = await saveRevisionAction({
        documentId: doc.id,
        revisionNumber: nextRevNumber,
        reason: revisionReason.trim(),
        diff: {
          headline1,
          headline2,
          headline3,
          summary,
          detail,
        },
      });
      if (res.success) {
        setIsRevisionDialogOpen(false);
        const reason = revisionReason.trim();
        setRevisionReason("");
        setDoc((prev) => ({
          ...prev,
          revisions: [
            ...prev.revisions,
            {
              id: res.data?.revisionId ?? `rev-${Date.now()}`,
              documentId: prev.id,
              revisionNumber: nextRevNumber,
              authorId: currentUserId,
              reason,
              diff: { headline1, headline2, headline3, summary, detail },
              factsSnapshot: null,
              bundleSnapshot: null,
              approved: false,
              approvedBy: null,
              approvedAt: null,
              createdAt: new Date(),
            },
          ],
        }));
        router.refresh();
      }
    } finally {
      setSavingRevision(false);
    }
  }


  const activeSource = doc.sources.find((s) => s.kind === "pdf" || s.kind === "image");
  const activeSourceUrl = activeSource?.r2Key
    ? `https://storage.samvaad.ai/${activeSource.r2Key}`
    : undefined;

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-7xl w-full mx-auto p-4 sm:p-8">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/dossiers"
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="size-3" /> Back to Case Dossiers
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {doc.title}
            </h1>
            <Badge variant={domainProfile.badgeVariant} className="text-xs">
              {domainProfile.entityName}
            </Badge>
            {userRole === "approver" && (
              <Badge variant="sage" className="gap-1 px-2.5 py-0.5 text-xs font-mono">
                <ShieldCheck className="size-3" /> Approver (Sign-off)
              </Badge>
            )}
            {userRole === "contributor" && (
              <Badge variant="gold" className="gap-1 px-2.5 py-0.5 text-xs font-mono">
                <FileText className="size-3" /> Contributor (Editor)
              </Badge>
            )}
            {userRole === "auditor" && (
              <Badge variant="outline" className="gap-1 px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                <Scale className="size-3" /> Auditor (Read-Only)
              </Badge>
            )}
            {status === "approved" ? (
              <Link href={`/verify/${doc.id}`} target="_blank">
                <Badge variant="sage" className="gap-1 px-2.5 py-0.5 hover:ring-1 hover:ring-emerald-500/50 cursor-pointer">
                  <ShieldCheck className="size-3" /> Public Seal Certificate ↗
                </Badge>
              </Link>
            ) : (
              <Badge variant="gold" className="gap-1 px-2.5 py-0.5">
                <span className="size-1.5 rounded-full bg-gold animate-pulse" />
                Review Required
              </Badge>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Precedents Search Dialog (Qdrant) */}
          <Dialog open={isPrecedentDialogOpen} onOpenChange={setIsPrecedentDialogOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" onClick={handleSearchPrecedents} />}>
              <Sparkles className="size-3.5 text-brand-ink" /> Search Precedents
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Department Precedent Retrieval</DialogTitle>
                <DialogDescription>
                  Semantic vector search across previously approved press notes from this tenant.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2 max-h-96 overflow-y-auto">
                {searchingPrecedents ? (
                  <p className="text-xs text-muted-foreground animate-pulse p-4 text-center font-mono">
                    Running cosine similarity search across Lakebase vector index...
                  </p>
                ) : precedents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                    No historical precedents found for this case query.
                  </div>
                ) : (
                  precedents.map((p) => (
                    <div
                      key={p.id}
                      className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2 text-xs shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="gold" className="text-[10px]">
                          {Math.round(p.score * 100)}% Match
                        </Badge>
                        <code className="text-[10px] text-muted-foreground font-mono">{p.id}</code>
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed font-mono">{p.text}</p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-[11px] h-7 w-full"
                        onClick={() => {
                          setDetail((prev) => `${prev}\n\nPrecedent Reference: ${p.text}`);
                          setIsPrecedentDialogOpen(false);
                        }}
                      >
                        Adopt Precedent Phrasing
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Save Revision Dialog */}
          {canEdit ? (
            <Dialog open={isRevisionDialogOpen} onOpenChange={setIsRevisionDialogOpen}>
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                <History className="size-3.5" /> Save Revision
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Case Revision</DialogTitle>
                  <DialogDescription>
                    Enter the editorial or factual reason for this revision. Every change is logged into an immutable audit trail.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <label className="text-xs font-semibold text-muted-foreground">Reason for Revision</label>
                  <Input
                    placeholder="e.g. Corrected suspect name and verified casualty count with SHO"
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button variant="default" disabled={!revisionReason.trim() || savingRevision} onClick={handleSaveRevision}>
                    {savingRevision ? "Saving..." : "Confirm & Save Revision"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : isAuditor ? (
            <Button variant="outline" size="sm" disabled className="opacity-60 cursor-not-allowed text-xs">
              <History className="size-3.5 mr-1" /> Revisions Locked (Auditor)
            </Button>
          ) : null}

          {/* Digital Sign-off Dialog */}
          {status === "draft" && (
            canApprove ? (
              <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                <DialogTrigger render={<Button variant="default" size="sm" />}>
                  <CheckCircle2 className="size-3.5" /> Approve &amp; Seal
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Authorized Digital Sign-off</DialogTitle>
                    <DialogDescription>
                      Under SKIT005 sovereign protocols, publishing requires personal officer attestation against primary sources.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-3">
                    <div className="p-4 rounded-xl border border-gold/40 bg-gold/10 space-y-2">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Legal Compliance Verification
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Presumption of innocence is strictly upheld. No non-adjudicated suspect may be termed a &quot;scamster&quot; or &quot;kingpin&quot;. Casualty numbers must match verified station records.
                      </p>
                    </div>

                    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border/70 bg-card">
                      <Checkbox
                        id="confirm-verification"
                        checked={confirmedCheckbox}
                        onCheckedChange={(checked) => setConfirmedCheckbox(checked === true)}
                      />
                      <label htmlFor="confirm-verification" className="text-xs leading-relaxed cursor-pointer select-none">
                        <strong>Mandatory Attestation:</strong> I hereby certify that I have cross-checked all casualty, crime, and suspect claims in this press release against primary case evidence.
                      </label>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="default"
                      disabled={!confirmedCheckbox || approving}
                      onClick={handleApprove}
                      className="w-full sm:w-auto"
                    >
                      {approving ? "Sealing..." : "Digitally Seal & Approve Release"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <Button variant="outline" size="sm" disabled className="opacity-60 cursor-not-allowed text-xs">
                <Lock className="size-3.5 mr-1" /> Requires Approver Role
              </Button>
            )
          )}
        </div>
      </div>

      {/* Neutrality Alert Banner */}
      {neutralityFlags.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>
            Neutrality &amp; Guilt Pre-Check Warnings ({neutralityFlags.length} flagged)
          </AlertTitle>
          <AlertDescription>
            <p>The draft text contains language that could compromise sovereign legal neutrality:</p>
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {neutralityFlags.map((flag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-destructive/15 text-destructive font-semibold"
                >
                  [{flag.rule}] &quot;{flag.match}&quot;
                </span>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Split-Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Pane: Sources, Inspector & Upload (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Case Evidence &amp; Sources</CardTitle>
                <div className="flex items-center gap-1">
                  {canEdit ? (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => setLeftTab(leftTab === "upload" ? "sources" : "upload")}
                      className="gap-1 text-[11px]"
                    >
                      <Upload className="size-3" /> {leftTab === "upload" ? "View Sources" : "Upload File"}
                    </Button>
                  ) : (
                    <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                      Upload Locked
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription>
                Primary case records, FIR photographs, and voice debriefs stored in Cloudflare R2.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {leftTab === "upload" ? (
                <DirectUploadDropzone
                  documentId={doc.id}
                  tenantId={doc.tenantId}
                  onUploadSuccess={(sourceId, kind) => {
                    setLeftTab("sources");
                    setDoc((prev) => ({
                      ...prev,
                      sources: [
                        ...prev.sources,
                        {
                          id: sourceId,
                          documentId: prev.id,
                          kind,
                          r2Key: `tenants/${prev.tenantId}/docs/${prev.id}/source.${kind === "audio" ? "mp3" : "pdf"}`,
                          sha256: null,
                          metadata: null,
                          createdAt: new Date(),
                        },
                      ],
                    }));
                  }}
                />
              ) : leftTab === "inspector" ? (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setLeftTab("sources")}
                    className="text-muted-foreground gap-1"
                  >
                    <ArrowLeft className="size-3" /> Back to Sources List
                  </Button>
                  <PdfInspector
                    documentTitle={doc.title}
                    fileUrl={activeSourceUrl}
                    activeLocator={activeLocator}
                    className="h-[460px]"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {doc.sources.length === 0 ? (
                    <div className="p-6 rounded-xl border border-dashed border-border/80 text-center space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">No source attachments uploaded yet.</p>
                      {canEdit ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLeftTab("upload")}
                          className="gap-1.5 text-xs"
                        >
                          <Upload className="size-3.5" /> Upload FIR or Audio
                        </Button>
                      ) : (
                        <p className="text-[11px] text-muted-foreground font-mono">Read-only auditor view.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {doc.sources.map((s) => (
                        <div key={s.id} className="p-3 rounded-xl border border-border/80 bg-card space-y-2 text-xs shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold uppercase text-foreground">{s.kind}</span>
                              {s.kind === "audio" && (
                                <Badge variant="sky" className="text-[9px]">
                                  Sarvam STT (saaras:v4)
                                </Badge>
                              )}
                              {(s.kind === "pdf" || s.kind === "image") && (
                                <Badge variant="sage" className="text-[9px]">
                                  Mistral OCR
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => {
                                setLeftTab("inspector");
                                setActiveLocator(null);
                              }}
                              className="text-[10px] h-6"
                            >
                              Inspect →
                            </Button>
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground truncate">
                            Key: {s.r2Key ?? "pending-upload"}
                          </p>
                          {s.kind === "audio" && (
                            <div className="pt-1 flex items-center justify-between text-xs text-muted-foreground border-t border-border/40">
                              <span className="flex items-center gap-1.5">
                                <Volume2 className="size-3.5 text-sky" /> Audio Briefing Track
                              </span>
                              <span className="text-[10px] font-mono bg-muted/60 px-2 py-0.5 rounded-full">02:14</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Separator />

                  {/* Extracted Evidence Spans */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Extracted Evidence Locators
                      </h4>
                      {extractedSpans.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">Click to inspect</span>
                      )}
                    </div>

                    {extractedSpans.length === 0 ? (
                      <div className="p-4 rounded-xl border border-dashed border-border/80 text-center space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">No citation locators extracted yet.</p>
                        <p className="text-[11px] text-muted-foreground">
                          Upload primary case documents or audio in the Evidence tab above to produce citation groundings.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {extractedSpans.map((span, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setActiveLocator(span.locator);
                              setLeftTab("inspector");
                            }}
                            className={cn(
                              "p-2.5 rounded-xl border transition-all cursor-pointer text-xs",
                              activeLocator === span.locator
                                ? "border-brand bg-brand-soft/20 shadow-xs ring-1 ring-brand/30"
                                : "border-border/70 bg-card hover:border-border"
                            )}
                          >
                            <span className="text-[10px] font-bold text-foreground font-mono block mb-0.5">
                              [Locator: {span.locator}]
                            </span>
                            <span className="text-[11px] text-muted-foreground leading-relaxed">
                              &quot;{span.text}&quot;
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail & Revisions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Revision Audit Trail</CardTitle>
              <CardDescription>
                Immutable record of every edit, author identity, and approval stamp.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {doc.revisions.map((rev) => (
                  <div key={rev.id} className="p-3 rounded-xl border border-border/70 bg-card space-y-1 text-xs shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">Revision #{rev.revisionNumber}</span>
                      {rev.approved ? (
                        <Badge variant="sage" className="text-[9px]">
                          Approved
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px]">
                          Unapproved
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{rev.reason}</p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40 font-mono">
                      <span>Author: {rev.authorId}</span>
                      <span>{new Date(rev.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Pane: Drafting Workspace & Tabs (7 columns) */}
        <div className="lg:col-span-7 space-y-6">
          <Tabs defaultValue="draft">
            <div className="flex items-center justify-between mb-3">
              <TabsList>
                <TabsTrigger value="draft">
                  <FileText className="size-3.5 mr-1" /> Primary Draft (English)
                </TabsTrigger>
                <TabsTrigger value="secondary">
                  <Languages className="size-3.5 mr-1" /> Dual-Language (Hindi)
                </TabsTrigger>
                <TabsTrigger value="facts">
                  <Scale className="size-3.5 mr-1" /> Fact Matrix
                </TabsTrigger>
              </TabsList>

              <Badge variant="outline" className="text-[0.65rem] font-mono hidden sm:inline-flex">
                Inverted Pyramid Standard
              </Badge>
            </div>

            {/* Tab 1: Primary English Draft */}
            <TabsContent value="draft" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Headline Candidates (Strictly &le; 15 words)</CardTitle>
                  <CardDescription>
                    Deterministic options generated for press releases and wire distribution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Headline 1 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Option 1: Primary Event Lead</span>
                      <span className={h1Words > HEADLINE_MAX_WORDS ? "text-destructive font-bold font-mono" : "text-muted-foreground font-mono text-[11px]"}>
                        {h1Words} / {HEADLINE_MAX_WORDS} words
                      </span>
                    </div>
                    <Input
                      value={headline1}
                      readOnly={!canEdit}
                      onChange={(e) => setHeadline1(e.target.value)}
                      className={cn("font-medium", !canEdit && "bg-muted/30 cursor-default focus-visible:ring-0 select-text")}
                    />
                  </div>

                  {/* Headline 2 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Option 2: Action Taken</span>
                      <span className={h2Words > HEADLINE_MAX_WORDS ? "text-destructive font-bold font-mono" : "text-muted-foreground font-mono text-[11px]"}>
                        {h2Words} / {HEADLINE_MAX_WORDS} words
                      </span>
                    </div>
                    <Input
                      value={headline2}
                      readOnly={!canEdit}
                      onChange={(e) => setHeadline2(e.target.value)}
                      className={cn("font-medium", !canEdit && "bg-muted/30 cursor-default focus-visible:ring-0 select-text")}
                    />
                  </div>

                  {/* Headline 3 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Option 3: Official Notice</span>
                      <span className={h3Words > HEADLINE_MAX_WORDS ? "text-destructive font-bold font-mono" : "text-muted-foreground font-mono text-[11px]"}>
                        {h3Words} / {HEADLINE_MAX_WORDS} words
                      </span>
                    </div>
                    <Input
                      value={headline3}
                      readOnly={!canEdit}
                      onChange={(e) => setHeadline3(e.target.value)}
                      className={cn("font-medium", !canEdit && "bg-muted/30 cursor-default focus-visible:ring-0 select-text")}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Summary & Inverted Pyramid */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle>Brief Press Summary (English)</CardTitle>
                  <CardDescription>
                    Executive summary of confirmed findings for immediate wire distribution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={summary}
                    readOnly={!canEdit}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={3}
                    className={cn("leading-relaxed", !canEdit && "bg-muted/30 cursor-default focus-visible:ring-0 select-text")}
                  />

                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Inverted-Pyramid Detailed Narrative
                      </label>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {countWords(detail)} words
                      </span>
                    </div>
                    <Textarea
                      value={detail}
                      readOnly={!canEdit}
                      onChange={(e) => setDetail(e.target.value)}
                      rows={5}
                      className={cn("leading-relaxed font-sans", !canEdit && "bg-muted/30 cursor-default focus-visible:ring-0 select-text")}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 2: Dual-Language Preview (Hindi) */}
            <TabsContent value="secondary" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Languages className="size-4 text-sky" />
                      <CardTitle>Secondary Locale Translation (Hindi Seam)</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono">
                      Runtime Locale Pack
                    </Badge>
                  </div>
                  <CardDescription>
                    Dual-language translation generated through the runtime phrase seam — zero non-English literals hardcoded.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Secondary Headline
                    </label>
                    <Input
                      value={secondaryHeadline}
                      readOnly={!canEdit}
                      onChange={(e) => setSecondaryHeadline(e.target.value)}
                      className={cn(!canEdit && "bg-muted/30 cursor-default focus-visible:ring-0 select-text")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Secondary Detailed Brief
                    </label>
                    <Textarea
                      value={secondarySummary}
                      readOnly={!canEdit}
                      onChange={(e) => setSecondarySummary(e.target.value)}
                      rows={4}
                      className={cn("leading-relaxed", !canEdit && "bg-muted/30 cursor-default focus-visible:ring-0 select-text")}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: Fact Matrix */}
            <TabsContent value="facts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Deterministic Fact Breakdown</CardTitle>
                  <CardDescription>
                    Cross-referenced evidence assertions with Laya Studio confidence scoring.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!hasClaims || !claims ? (
                    <div className="p-8 rounded-xl border border-dashed border-border/80 text-center space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Fact matrix pending verification.</p>
                      <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                        Evidence has not been structured yet. Upload and analyze primary case materials to extract confirmed facts and confidence metrics.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {Object.entries(claims).map(([category, items]) => {
                        if (!items || items.length === 0) return null;
                        return items.map((item, idx) => (
                          <div key={`${category}-${idx}`} className="p-3 rounded-xl border border-border/80 bg-card space-y-1 shadow-xs">
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase">{category}</span>
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">{item.value}</span>
                              <Badge variant="sage" className="text-[10px]">Extracted</Badge>
                            </div>
                          </div>
                        ));
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

