/**
 * documents store — persistence seam for press-note documents.
 *
 * Interface: {@link DocumentsStore} (create + list scoped by tenant). The
 * tRPC router depends only on this port; tests use the in-memory adapter
 * below while production wires the Drizzle adapter (`drizzle-documents.ts`).
 * Rows carry plain data — no ORM types leak to callers.
 */
export const DOCUMENT_STATUSES = ["draft", "processing", "ready", "approved", "failed"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface DocumentRecord {
  readonly id: string;
  readonly tenantId: string;
  readonly title: string;
  readonly status: DocumentStatus;
  readonly createdAt: Date;
}

export interface SourceRecord {
  readonly id: string;
  readonly documentId: string;
  readonly kind: string;
  readonly r2Key: string | null;
  readonly sha256: string | null;
  readonly metadata: unknown;
  readonly createdAt: Date;
}

export interface RevisionRecord {
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

export interface DocumentDetailRecord extends DocumentRecord {
  readonly sources: readonly SourceRecord[];
  readonly revisions: readonly RevisionRecord[];
}

export const MEMBERSHIP_ROLES = ["contributor", "approver", "auditor"] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export interface MembershipRecord {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly role: MembershipRole;
  readonly createdAt: Date;
}

export interface SubscriptionRecord {
  readonly id: string;
  readonly entityId: string;
  readonly payerType: string;
  readonly planSlug: string;
  readonly status: string;
  readonly currentPeriodEnd: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function isMembershipRole(value: string): value is MembershipRole {
  return (MEMBERSHIP_ROLES as readonly string[]).includes(value);
}

export interface DocumentsStore {
  create(input: { tenantId: string; title: string }): Promise<DocumentRecord>;
  list(tenantId: string, limit: number): Promise<readonly DocumentRecord[]>;
  get(input: { id: string; tenantId?: string }): Promise<DocumentDetailRecord | null>;
  addSource(input: { documentId: string; kind: string; r2Key?: string; sha256?: string; metadata?: unknown }): Promise<SourceRecord>;
  addRevision(input: { documentId: string; revisionNumber: number; authorId: string; diff: unknown; reason: string; factsSnapshot?: unknown; bundleSnapshot?: unknown }): Promise<RevisionRecord>;
  approve(input: { id: string; tenantId: string; approvedBy: string }): Promise<DocumentRecord | null>;
  getMembership(input: { userId: string; tenantId: string }): Promise<MembershipRecord | null>;
  addMembership(input: { userId: string; tenantId: string; role: MembershipRole }): Promise<MembershipRecord>;
  listMemberships(userId: string): Promise<readonly MembershipRecord[]>;
  upsertSubscription(input: {
    id: string;
    entityId: string;
    payerType?: string;
    planSlug: string;
    status: string;
    currentPeriodEnd?: Date | null;
  }): Promise<SubscriptionRecord>;
  getSubscription(entityId: string): Promise<SubscriptionRecord | null>;
}

export function isDocumentStatus(value: string): value is DocumentStatus {
  return (DOCUMENT_STATUSES as readonly string[]).includes(value);
}

export function createMemoryDocumentsStore(): DocumentsStore & { size(): number } {
  const docs: DocumentRecord[] = [];
  const sources: SourceRecord[] = [];
  const revisions: RevisionRecord[] = [];
  const memberships: MembershipRecord[] = [];
  const subscriptions: SubscriptionRecord[] = [];
  let docCounter = 0;
  let sourceCounter = 0;
  let revCounter = 0;
  let memCounter = 0;

  return {
    async create(input) {
      docCounter += 1;
      const row: DocumentRecord = {
        id: `doc-${docCounter}`,
        tenantId: input.tenantId,
        title: input.title,
        status: "draft",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      };
      docs.push(row);
      return row;
    },
    async list(tenantId, limit) {
      return docs.filter((r) => r.tenantId === tenantId).slice(0, limit);
    },
    async get(input) {
      const doc = docs.find((d) => d.id === input.id && (input.tenantId ? d.tenantId === input.tenantId : true));
      if (!doc) return null;
      return {
        ...doc,
        sources: sources.filter((s) => s.documentId === doc.id),
        revisions: revisions.filter((r) => r.documentId === doc.id),
      };
    },
    async addSource(input) {
      sourceCounter += 1;
      const row: SourceRecord = {
        id: `src-${sourceCounter}`,
        documentId: input.documentId,
        kind: input.kind,
        r2Key: input.r2Key ?? null,
        sha256: input.sha256 ?? null,
        metadata: input.metadata ?? null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      };
      sources.push(row);
      return row;
    },
    async addRevision(input) {
      const duplicate = revisions.find(
        (r) => r.documentId === input.documentId && r.revisionNumber === input.revisionNumber,
      );
      if (duplicate) throw new Error(`duplicate revisionNumber ${input.revisionNumber} for document ${input.documentId}`);
      revCounter += 1;
      const row: RevisionRecord = {
        id: `rev-${revCounter}`,
        documentId: input.documentId,
        revisionNumber: input.revisionNumber,
        diff: input.diff,
        factsSnapshot: input.factsSnapshot ?? null,
        bundleSnapshot: input.bundleSnapshot ?? null,
        authorId: input.authorId,
        reason: input.reason,
        approved: false,
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      };
      revisions.push(row);
      return row;
    },
    async approve(input) {
      const idx = docs.findIndex((d) => d.id === input.id && d.tenantId === input.tenantId);
      if (idx === -1) return null;
      const current = docs[idx];
      if (!current) return null;
      const updated: DocumentRecord = {
        ...current,
        status: "approved",
      };
      docs[idx] = updated;

      // Mark the latest revision approved
      const docRevs = revisions.filter((r) => r.documentId === input.id);
      const latestRev = docRevs[docRevs.length - 1];
      if (latestRev) {
        const revIdx = revisions.findIndex((r) => r.id === latestRev.id);
        if (revIdx !== -1) {
          revisions[revIdx] = {
            ...latestRev,
            approved: true,
            approvedBy: input.approvedBy,
            approvedAt: new Date("2026-01-01T00:00:00Z"),
          };
        }
      }
      return updated;
    },
    async getMembership(input) {
      const found = memberships.find((m) => m.userId === input.userId && m.tenantId === input.tenantId);
      return found ?? null;
    },
    async addMembership(input) {
      const existing = memberships.find((m) => m.userId === input.userId && m.tenantId === input.tenantId);
      if (existing) {
        const updated: MembershipRecord = { ...existing, role: input.role };
        const idx = memberships.indexOf(existing);
        memberships[idx] = updated;
        return updated;
      }
      memCounter += 1;
      const row: MembershipRecord = {
        id: `mem-${memCounter}`,
        userId: input.userId,
        tenantId: input.tenantId,
        role: input.role,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      };
      memberships.push(row);
      return row;
    },
    async listMemberships(userId) {
      return memberships.filter((m) => m.userId === userId);
    },
    async upsertSubscription(input) {
      const existingIdx = subscriptions.findIndex((s) => s.id === input.id || s.entityId === input.entityId);
      const row: SubscriptionRecord = {
        id: input.id,
        entityId: input.entityId,
        payerType: input.payerType ?? "organization",
        planSlug: input.planSlug,
        status: input.status,
        currentPeriodEnd: input.currentPeriodEnd ?? null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        updatedAt: new Date("2026-01-01T00:00:00Z"),
      };
      if (existingIdx >= 0) {
        subscriptions[existingIdx] = row;
      } else {
        subscriptions.push(row);
      }
      return row;
    },
    async getSubscription(entityId) {
      return subscriptions.find((s) => s.entityId === entityId) ?? null;
    },
    size() {
      return docs.length;
    },
  };
}
