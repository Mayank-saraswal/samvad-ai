/**
 * db schema module — Postgres table definitions (Drizzle).
 *
 * Interface: the exported table objects (`documents`, `sources`). Drizzle
 * infers row types from them, so callers get full type safety with no manual
 * DTOs and no `any`. Timestamps are timezone-aware; ids are database-generated
 * UUIDs so callers never invent keys. `sources.r2Key` stores the key built by
 * the r2 module — the seam between the two modules is that string, nothing more.
 */
import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: text("tenant_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DocumentRow = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export const SOURCES_KINDS = ["form", "pdf", "image", "audio"] as const;
export type SourceKind = (typeof SOURCES_KINDS)[number];

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  r2Key: text("r2_key"),
  sha256: text("sha256"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SourceRow = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

export const MEMBERSHIP_ROLES = ["contributor", "approver", "auditor"] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const memberships = pgTable("memberships", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(),
  tenantId: text("tenant_id").notNull(),
  role: text("role").notNull().default("contributor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MembershipRow = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;

export const revisions = pgTable("revisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  revisionNumber: integer("revision_number").notNull(),
  diff: jsonb("diff").notNull(),
  factsSnapshot: jsonb("facts_snapshot"),
  bundleSnapshot: jsonb("bundle_snapshot"),
  authorId: text("author_id").notNull(),
  reason: text("reason").notNull().default("Initial draft"),
  approved: boolean("approved").notNull().default(false),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RevisionRow = typeof revisions.$inferSelect;
export type NewRevision = typeof revisions.$inferInsert;

export const subscriptions = pgTable("subscriptions", {
  id: text("id").primaryKey(), // Clerk subscription ID e.g. sub_xxx
  entityId: text("entity_id").notNull(), // organization_id or user_id
  payerType: text("payer_type").notNull().default("organization"), // organization | user
  planSlug: text("plan_slug").notNull(), // e.g. org:starter, org:pro, org:enterprise
  status: text("status").notNull(), // active, past_due, canceled, etc.
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
