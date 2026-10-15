/**
 * Drizzle adapter — production {@link DocumentsStore} over Lakebase Postgres.
 * Internal seam: instantiated by the route layer with a real database, never
 * by feature code or unit tests. Timestamps come from the database row.
 */
import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/db/schema";
import {
  isDocumentStatus,
  isMembershipRole,
  type DocumentDetailRecord,
  type DocumentRecord,
  type DocumentsStore,
  type MembershipRecord,
  type RevisionRecord,
  type SourceRecord,
  type SubscriptionRecord,
} from "./store";

export function createDrizzleDocumentsStore(db: NodePgDatabase<typeof schema>): DocumentsStore {
  return {
    async create(input): Promise<DocumentRecord> {
      const inserted = await db
        .insert(schema.documents)
        .values({ tenantId: input.tenantId, title: input.title })
        .returning({
          id: schema.documents.id,
          tenantId: schema.documents.tenantId,
          title: schema.documents.title,
          status: schema.documents.status,
          createdAt: schema.documents.createdAt,
        });
      const row = inserted[0];
      if (!row || !isDocumentStatus(row.status)) throw new Error("documents insert returned an unexpected row");
      return { id: row.id, tenantId: row.tenantId, title: row.title, status: row.status, createdAt: row.createdAt };
    },

    async list(tenantId, limit): Promise<readonly DocumentRecord[]> {
      const rows = await db
        .select({
          id: schema.documents.id,
          tenantId: schema.documents.tenantId,
          title: schema.documents.title,
          status: schema.documents.status,
          createdAt: schema.documents.createdAt,
        })
        .from(schema.documents)
        .where(eq(schema.documents.tenantId, tenantId))
        .orderBy(desc(schema.documents.createdAt))
        .limit(limit);
      const records: DocumentRecord[] = [];
      for (const row of rows) {
        if (isDocumentStatus(row.status)) {
          records.push({ id: row.id, tenantId: row.tenantId, title: row.title, status: row.status, createdAt: row.createdAt });
        }
      }
      return records;
    },

    async get(input): Promise<DocumentDetailRecord | null> {
      const condition = input.tenantId
        ? and(eq(schema.documents.id, input.id), eq(schema.documents.tenantId, input.tenantId))
        : eq(schema.documents.id, input.id);

      const docRows = await db
        .select({
          id: schema.documents.id,
          tenantId: schema.documents.tenantId,
          title: schema.documents.title,
          status: schema.documents.status,
          createdAt: schema.documents.createdAt,
        })
        .from(schema.documents)
        .where(condition)
        .limit(1);

      const doc = docRows[0];
      if (!doc || !isDocumentStatus(doc.status)) return null;

      const sourceRows = await db
        .select()
        .from(schema.sources)
        .where(eq(schema.sources.documentId, doc.id));

      const sources: SourceRecord[] = sourceRows.map((s) => ({
        id: s.id,
        documentId: s.documentId,
        kind: s.kind,
        r2Key: s.r2Key,
        sha256: s.sha256,
        metadata: s.metadata,
        createdAt: s.createdAt,
      }));

      const revisionRows = await db
        .select()
        .from(schema.revisions)
        .where(eq(schema.revisions.documentId, doc.id))
        .orderBy(schema.revisions.revisionNumber);

      const revisions: RevisionRecord[] = revisionRows.map((r) => ({
        id: r.id,
        documentId: r.documentId,
        revisionNumber: r.revisionNumber,
        diff: r.diff,
        factsSnapshot: r.factsSnapshot,
        bundleSnapshot: r.bundleSnapshot,
        authorId: r.authorId,
        reason: r.reason,
        approved: r.approved,
        approvedBy: r.approvedBy,
        approvedAt: r.approvedAt,
        createdAt: r.createdAt,
      }));

      return {
        id: doc.id,
        tenantId: doc.tenantId,
        title: doc.title,
        status: doc.status,
        createdAt: doc.createdAt,
        sources,
        revisions,
      };
    },

    async addSource(input): Promise<SourceRecord> {
      const inserted = await db
        .insert(schema.sources)
        .values({
          documentId: input.documentId,
          kind: input.kind,
          r2Key: input.r2Key ?? null,
          sha256: input.sha256 ?? null,
          metadata: input.metadata ?? null,
        })
        .returning();

      const row = inserted[0];
      if (!row) throw new Error("sources insert returned no rows");
      return {
        id: row.id,
        documentId: row.documentId,
        kind: row.kind,
        r2Key: row.r2Key,
        sha256: row.sha256,
        metadata: row.metadata,
        createdAt: row.createdAt,
      };
    },

    async addRevision(input): Promise<RevisionRecord> {
      const inserted = await db
        .insert(schema.revisions)
        .values({
          documentId: input.documentId,
          revisionNumber: input.revisionNumber,
          diff: input.diff,
          factsSnapshot: input.factsSnapshot ?? null,
          bundleSnapshot: input.bundleSnapshot ?? null,
          authorId: input.authorId,
          reason: input.reason,
          approved: false,
        })
        .returning();

      const row = inserted[0];
      if (!row) throw new Error("revisions insert returned no rows");
      return {
        id: row.id,
        documentId: row.documentId,
        revisionNumber: row.revisionNumber,
        diff: row.diff,
        factsSnapshot: row.factsSnapshot,
        bundleSnapshot: row.bundleSnapshot,
        authorId: row.authorId,
        reason: row.reason,
        approved: row.approved,
        approvedBy: row.approvedBy,
        approvedAt: row.approvedAt,
        createdAt: row.createdAt,
      };
    },

    async approve(input): Promise<DocumentRecord | null> {
      // Guard: if already approved, return row without changes.
      const existing = await db
        .select({
          id: schema.documents.id,
          tenantId: schema.documents.tenantId,
          title: schema.documents.title,
          status: schema.documents.status,
          createdAt: schema.documents.createdAt,
        })
        .from(schema.documents)
        .where(and(eq(schema.documents.id, input.id), eq(schema.documents.tenantId, input.tenantId)))
        .limit(1);
      const current = existing[0];
      if (!current || !isDocumentStatus(current.status)) return null;
      if (current.status === "approved") {
        return {
          id: current.id,
          tenantId: current.tenantId,
          title: current.title,
          status: current.status,
          createdAt: current.createdAt,
        };
      }

      const updated = await db
        .update(schema.documents)
        .set({ status: "approved", updatedAt: new Date() })
        .where(and(eq(schema.documents.id, input.id), eq(schema.documents.tenantId, input.tenantId)))
        .returning({
          id: schema.documents.id,
          tenantId: schema.documents.tenantId,
          title: schema.documents.title,
          status: schema.documents.status,
          createdAt: schema.documents.createdAt,
        });

      const row = updated[0];
      if (!row || !isDocumentStatus(row.status)) return null;

      // Update only the latest revision (max revisionNumber) to approved.
      const revRows = await db
        .select({ id: schema.revisions.id, revisionNumber: schema.revisions.revisionNumber })
        .from(schema.revisions)
        .where(eq(schema.revisions.documentId, input.id))
        .orderBy(desc(schema.revisions.revisionNumber))
        .limit(1);
      const latest = revRows[0];
      if (latest) {
        await db
          .update(schema.revisions)
          .set({
            approved: true,
            approvedBy: input.approvedBy,
            approvedAt: new Date(),
          })
          .where(eq(schema.revisions.id, latest.id));
      }

      return {
        id: row.id,
        tenantId: row.tenantId,
        title: row.title,
        status: row.status,
        createdAt: row.createdAt,
      };
    },

    async getMembership(input): Promise<MembershipRecord | null> {
      const rows = await db
        .select()
        .from(schema.memberships)
        .where(
          and(
            eq(schema.memberships.userId, input.userId),
            eq(schema.memberships.tenantId, input.tenantId),
          )
        )
        .limit(1);
      const row = rows[0];
      if (!row || !isMembershipRole(row.role)) return null;
      return {
        id: row.id,
        userId: row.userId,
        tenantId: row.tenantId,
        role: row.role,
        createdAt: row.createdAt,
      };
    },

    async addMembership(input): Promise<MembershipRecord> {
      const inserted = await db
        .insert(schema.memberships)
        .values({
          userId: input.userId,
          tenantId: input.tenantId,
          role: input.role,
        })
        .returning();
      const row = inserted[0];
      if (!row || !isMembershipRole(row.role)) {
        throw new Error("membership insert returned unexpected row");
      }
      return {
        id: row.id,
        userId: row.userId,
        tenantId: row.tenantId,
        role: row.role,
        createdAt: row.createdAt,
      };
    },

    async listMemberships(userId): Promise<readonly MembershipRecord[]> {
      const rows = await db
        .select()
        .from(schema.memberships)
        .where(eq(schema.memberships.userId, userId));
      const records: MembershipRecord[] = [];
      for (const row of rows) {
        if (isMembershipRole(row.role)) {
          records.push({
            id: row.id,
            userId: row.userId,
            tenantId: row.tenantId,
            role: row.role,
            createdAt: row.createdAt,
          });
        }
      }
      return records;
    },

    async upsertSubscription(input): Promise<SubscriptionRecord> {
      const inserted = await db
        .insert(schema.subscriptions)
        .values({
          id: input.id,
          entityId: input.entityId,
          payerType: input.payerType ?? "organization",
          planSlug: input.planSlug,
          status: input.status,
          currentPeriodEnd: input.currentPeriodEnd ?? null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.subscriptions.id,
          set: {
            entityId: input.entityId,
            payerType: input.payerType ?? "organization",
            planSlug: input.planSlug,
            status: input.status,
            currentPeriodEnd: input.currentPeriodEnd ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();
      const row = inserted[0];
      if (!row) throw new Error("subscriptions upsert returned no row");
      return {
        id: row.id,
        entityId: row.entityId,
        payerType: row.payerType,
        planSlug: row.planSlug,
        status: row.status,
        currentPeriodEnd: row.currentPeriodEnd,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    },

    async getSubscription(entityId): Promise<SubscriptionRecord | null> {
      const rows = await db
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.entityId, entityId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        id: row.id,
        entityId: row.entityId,
        payerType: row.payerType,
        planSlug: row.planSlug,
        status: row.status,
        currentPeriodEnd: row.currentPeriodEnd,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    },
  };
}
