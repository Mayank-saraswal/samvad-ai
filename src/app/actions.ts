"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStore, getVectorIndex } from "@/server/context";
import { structureFacts } from "@/lib/press-facts/facts";
import { checkNeutrality } from "@/lib/press-facts/neutrality";
import { buildDraftBundle, ENGLISH_PHRASES } from "@/lib/press-facts/bundle";
import { isOk } from "@/lib/result/result";
import { createMem0Adapter, createMemoryStoreFake } from "@/lib/memory/mem0";
import type { MembershipRole } from "@/server/documents/store";

export interface ActionResult<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

export async function resolveUserRole(
  store: ReturnType<typeof getStore>,
  userId: string,
  tenantId: string,
  orgId: string | null | undefined,
  orgRole: string | null | undefined
): Promise<MembershipRole> {
  if (orgRole === "org:admin") return "approver";
  if (orgRole === "org:member") return "contributor";
  if (orgRole === "org:auditor") return "auditor";

  const existing = await store.getMembership({ userId, tenantId });
  if (existing) return existing.role;

  // Personal account workspace owner defaults to approver
  if (!orgId) {
    await store.addMembership({ userId, tenantId, role: "approver" });
    return "approver";
  }

  // Member of an organization without special mapped role defaults to contributor
  await store.addMembership({ userId, tenantId, role: "contributor" });
  return "contributor";
}

export async function createDocumentAction(formData: FormData): Promise<void> {
  const { userId, isAuthenticated, orgId, orgRole } = await auth();
  if (!isAuthenticated || !userId) {
    throw new Error("Authentication required to create a press dossier.");
  }
  if (!orgId) {
    throw new Error("Active organization required. Please create or select a department organization.");
  }

  const title = formData.get("title");
  const tenantId = orgId;
  const domainProfileId = formData.get("domainProfileId") || "public-safety";

  if (typeof title !== "string" || !title.trim()) {
    throw new Error("Title is required.");
  }

  const store = getStore();
  const tId = tenantId.trim();

  // Enforce RBAC: Auditors cannot create dossiers
  const role = await resolveUserRole(store, userId, tId, orgId, orgRole);
  if (role === "auditor") {
    throw new Error("Auditors have read-only permissions and cannot create dossiers.");
  }

  const doc = await store.create({
    tenantId: tId,
    title: title.trim(),
  });

  // Auto-create initial revision
  await store.addRevision({
    documentId: doc.id,
    revisionNumber: 1,
    authorId: userId,
    reason: "Initial dossier scaffolding",
    diff: {
      title: doc.title,
      status: doc.status,
      domainProfileId: typeof domainProfileId === "string" ? domainProfileId : "public-safety",
    },
  });

  revalidatePath("/dossiers");
  redirect(`/dossiers/${doc.id}`);
}

export async function approveDocumentAction(input: {
  documentId: string;
  tenantId: string;
  waitTokenId?: string;
}): Promise<ActionResult<{ status: string }>> {
  const { userId, isAuthenticated, orgId, orgRole } = await auth();
  if (!isAuthenticated || !userId) {
    return { success: false, error: "Authentication required to approve a press note." };
  }

  try {
    const store = getStore();

    // Verify user is an approver in this tenant
    const role = await resolveUserRole(store, userId, input.tenantId, orgId, orgRole);
    if (role !== "approver") {
      return {
        success: false,
        error: `Access denied: Role '${role}' cannot certify releases. Approver role required.`,
      };
    }

    const approved = await store.approve({
      id: input.documentId,
      tenantId: input.tenantId,
      approvedBy: userId,
    });

    if (!approved) {
      return { success: false, error: "Document not found or tenant mismatch." };
    }

    if (input.waitTokenId) {
      try {
        const triggerSecretKey = process.env.TRIGGER_SECRET_KEY;
        if (triggerSecretKey) {
          await fetch(`https://api.trigger.dev/api/v1/waitpoints/tokens/${input.waitTokenId}/complete`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${triggerSecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: {
                status: "approved",
                approvedBy: userId,
                attestationConfirmed: true,
              },
            }),
          });
        }
      } catch (tokenErr) {
        console.error("Trigger waitpoint token completion note:", tokenErr);
      }
    }

    // Learn style and entity memory strictly from approved notes
    try {
      const mem0Key = process.env.MEM0_API_KEY;
      const memoryEngine = mem0Key ? createMem0Adapter({ apiKey: mem0Key }) : createMemoryStoreFake();
      await memoryEngine.addApprovedNote({
        userId,
        tenantId: input.tenantId,
        noteId: input.documentId,
        text: approved.title,
      });
    } catch (memErr) {
      console.error("Style memory update note:", memErr);
    }

    // Dispatch durable event to Inngest for async indexing and memory persistence
    try {
      const { inngest } = await import("@/inngest/client");
      await inngest.send({
        name: "document/approved",
        data: {
          documentId: input.documentId,
          tenantId: input.tenantId,
          title: approved.title,
          approvedBy: userId,
        },
      });
    } catch (inngestErr) {
      console.error("Inngest document/approved dispatch note:", inngestErr);
    }

    revalidatePath(`/dossiers/${input.documentId}`);
    revalidatePath("/dossiers");
    return { success: true, data: { status: approved.status } };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to approve document" };
  }
}

export async function saveRevisionAction(input: {
  documentId: string;
  revisionNumber: number;
  reason: string;
  diff: Record<string, unknown>;
  factsSnapshot?: unknown;
  bundleSnapshot?: unknown;
}): Promise<ActionResult<{ revisionId: string }>> {
  const { userId, isAuthenticated, orgId, orgRole } = await auth();
  if (!isAuthenticated || !userId) {
    return { success: false, error: "Authentication required to save revision." };
  }

  try {
    const store = getStore();
    const doc = await store.get({ id: input.documentId });
    if (!doc) {
      return { success: false, error: "Document not found." };
    }
    if (doc.status === "approved") {
      return {
        success: false,
        error: "Document is digitally sealed and approved. Revisions are permanently locked.",
      };
    }

    const role = await resolveUserRole(store, userId, doc.tenantId, orgId, orgRole);
    if (role === "auditor") {
      return { success: false, error: "Auditors have read-only permissions and cannot save revisions." };
    }

    const rev = await store.addRevision({
      documentId: input.documentId,
      revisionNumber: input.revisionNumber,
      authorId: userId,
      reason: input.reason,
      diff: input.diff,
      factsSnapshot: input.factsSnapshot,
      bundleSnapshot: input.bundleSnapshot,
    });

    revalidatePath(`/dossiers/${input.documentId}`);
    return { success: true, data: { revisionId: rev.id } };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to save revision" };
  }
}

export async function processEvidenceAction(input: {
  documentId: string;
  rawText: string;
  sourceId: string;
}): Promise<ActionResult<{
  flags: ReturnType<typeof checkNeutrality>;
  bundle: ReturnType<typeof buildDraftBundle>;
}>> {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) {
    return { success: false, error: "Authentication required to analyze evidence." };
  }

  // 1. Run neutrality scan
  const flags = checkNeutrality(input.rawText);

  // 2. Build default fallback facts
  const spans = [{ sourceId: input.sourceId, locator: "evidence-1", text: input.rawText }];
  const factsRes = structureFacts({
    spans,
    claims: {
      event: [{ spanIndex: 0, value: input.rawText.slice(0, 80) }],
    },
  });

  if (!isOk(factsRes)) {
    return { success: false, error: "Fact structuring failed." };
  }

  // 3. Build draft bundle
  const bundle = buildDraftBundle(factsRes.value, ENGLISH_PHRASES);

  return {
    success: true,
    data: { flags, bundle },
  };
}

export async function searchPrecedentsAction(input: {
  tenantId: string;
  queryText: string;
}): Promise<ActionResult<readonly { id: string; text: string; score: number }[]>> {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return { success: false, error: "Authentication required to search precedents." };
  }

  try {
    const vectorIndex = getVectorIndex();

    const searchRes = await vectorIndex.searchSimilar({
      tenantId: input.tenantId,
      vector: [0.95, 0.05, 0.0],
      limit: 5,
      minScore: 0.5,
    });

    if (!isOk(searchRes)) {
      const msg =
        searchRes.error.kind === "invalid-input"
          ? searchRes.error.issues.join(", ")
          : searchRes.error.message;
      return { success: false, error: msg };
    }

    return {
      success: true,
      data: searchRes.value.map((p) => ({
        id: p.id,
        text: p.text,
        score: p.score,
      })),
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to search precedents",
    };
  }
}

export async function mintUploadTicketAction(input: {
  tenantId: string;
  documentId: string;
  extension: string;
  contentType: string;
  contentLengthBytes: number;
}): Promise<ActionResult<{ uploadUrl: string; key: string; expiresAt: string }>> {
  const { userId, isAuthenticated, orgId, orgRole } = await auth();
  if (!isAuthenticated || !userId) {
    return { success: false, error: "Authentication required to upload files." };
  }

  try {
    const store = getStore();
    const role = await resolveUserRole(store, userId, input.tenantId, orgId, orgRole);
    if (role === "auditor") {
      return { success: false, error: "Auditors have read-only permissions and cannot upload files." };
    }

    const { getR2 } = await import("@/server/context");
    const r2 = getR2();
    if (!r2) {
      return { success: false, error: "Storage module not configured." };
    }

    const { tenantId: tIdValidator, documentId: dIdValidator } = await import("@/lib/r2/r2");
    const tId = tIdValidator(input.tenantId);
    const dId = dIdValidator(input.documentId);
    if (!isOk(tId) || !isOk(dId)) {
      return { success: false, error: "Invalid tenant or document id." };
    }

    const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50MB
    const isPdf = input.contentType === "application/pdf" || input.extension.toLowerCase() === "pdf";
    if (isPdf && input.contentLengthBytes > MAX_PDF_BYTES) {
      return {
        success: false,
        error: "PDF exceeds maximum allowed size of 50 MB. Upload rejected.",
      };
    }

    const grant = await r2.createUploadGrant({
      tenant: tId.value,
      document: dId.value,
      extension: input.extension,
      contentType: input.contentType,
      contentLengthBytes: input.contentLengthBytes,
    });

    if (!isOk(grant)) {
      const msg = grant.error.kind === "invalid-input" ? grant.error.issues.join(", ") : "Failed to mint upload grant";
      return { success: false, error: msg };
    }

    return {
      success: true,
      data: {
        uploadUrl: grant.value.uploadUrl,
        key: grant.value.key,
        expiresAt: grant.value.expiresAt.toISOString(),
      },
    };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to mint upload ticket" };
  }
}

export async function completeUploadAction(input: {
  tenantId: string;
  documentId: string;
  key: string;
  kind: "form" | "pdf" | "image" | "audio";
  sha256?: string;
}): Promise<ActionResult<{ sourceId: string }>> {
  const { userId, isAuthenticated, orgId, orgRole } = await auth();
  if (!isAuthenticated || !userId) {
    return { success: false, error: "Authentication required to complete upload." };
  }

  try {
    const store = getStore();
    const role = await resolveUserRole(store, userId, input.tenantId, orgId, orgRole);
    if (role === "auditor") {
      return { success: false, error: "Auditors have read-only permissions and cannot complete file uploads." };
    }

    const source = await store.addSource({
      documentId: input.documentId,
      kind: input.kind,
      r2Key: input.key,
      sha256: input.sha256,
    });

    // Notify Inngest durable event bus
    try {
      const { inngest } = await import("@/inngest/client");
      await inngest.send({
        name: "upload/complete",
        data: {
          documentId: input.documentId,
          tenantId: input.tenantId,
          sourceId: source.id,
          kind: input.kind,
          r2Key: input.key,
        },
      });
    } catch (inngestErr) {
      console.error("Inngest event dispatch note:", inngestErr);
    }

    revalidatePath(`/dossiers/${input.documentId}`);
    return { success: true, data: { sourceId: source.id } };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to complete upload" };
  }
}

