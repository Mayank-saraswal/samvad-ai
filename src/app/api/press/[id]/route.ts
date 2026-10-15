import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStore } from "@/server/context";
import { getProgressTracker, percentFromStages } from "@/lib/press-note/progress";

interface RouteParams {
  readonly params: Promise<{ id: string }>;
}

/**
 * GET /api/press/[id] — pipeline status derived from stored sources/revisions.
 * Loreline pattern: progress committed per batch, frontend polls every 2s.
 */
export async function GET(_req: Request, { params }: RouteParams) {
  const { userId, isAuthenticated, orgId, orgRole } = await auth();
  if (!isAuthenticated || !userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const store = getStore();
  // Membership rows are provisioned lazily (uploads/approvals create them),
  // so an active Clerk org session is sufficient proof of belonging: map the
  // org role and backfill the row instead of 403ing legitimate officers.
  const role =
    orgRole === "org:admin" ? "approver" : orgRole === "org:auditor" ? "auditor" : "contributor";
  const existing = await store.getMembership({ userId, tenantId: orgId });
  if (!existing) {
    try {
      await store.addMembership({ userId, tenantId: orgId, role });
    } catch {
      // Race with a concurrent provision — the row now exists, carry on.
    }
  }
  const doc = await store.get({ id, tenantId: orgId });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const latest = doc.revisions[doc.revisions.length - 1];
  const diff = (latest?.diff ?? {}) as Record<string, unknown>;
  const pib = (diff["pib"] ?? null) as Record<string, unknown> | null;

  const docSources = doc.sources.filter((s) => s.kind === "pdf" || s.kind === "image").length;
  const audioSources = doc.sources.filter((s) => s.kind === "audio").length;

  // Prefer live marks from an actually-executing run; fall back to
  // DB-derived state only when no fresh run exists.
  const live = getProgressTracker().read(id);
  type UiStage = "pending" | "indexing" | "ready" | "skipped" | "failed";
  const toUi = (status: string): UiStage =>
    status === "running" ? "indexing" : status === "ready" ? "ready" : status === "failed" ? "failed" : status === "skipped" ? "skipped" : "pending";
  const pipeline = live
    ? {
        ocr: toUi(live.ocr.status),
        stt: toUi(live.stt.status),
        facts: toUi(live.facts.status),
        draft: toUi(live.draft.status),
        percent: pib !== null ? 100 : percentFromStages(live),
        detail: {
          ocr: live.ocr.detail,
          stt: live.stt.detail,
          facts: live.facts.detail,
          draft: live.draft.detail,
        },
      }
    : {
        ocr: (docSources === 0 ? "skipped" : pib ? "ready" : doc.sources.length > 0 ? "indexing" : "pending") as UiStage,
        stt: (audioSources === 0 ? "skipped" : pib ? "ready" : "indexing") as UiStage,
        facts: (pib ? "ready" : "pending") as UiStage,
        draft: (pib ? "ready" : latest ? "indexing" : "pending") as UiStage,
        percent: pib !== null ? 100 : 0,
      };

  return NextResponse.json({
    doc: {
      id: doc.id,
      tenantId: doc.tenantId,
      title: doc.title,
      status: doc.status,
      sources: doc.sources.map((s) => ({
        id: s.id,
        kind: s.kind,
        r2Key: s.r2Key,
      })),
      revisionsCount: doc.revisions.length,
      latestRevisionNumber: latest?.revisionNumber ?? 0,
    },
    pib,
    pipeline,
  });
}
