/**
 * tRPC foundation — router seam for the app.
 *
 * Interface: {@link createAppRouter} builds the router from an injected
 * {@link DocumentsStore}; context carries only the session
 * (`{ user: { id } } | null`), mapped from Clerk at the route layer.
 * `health` is public; everything else goes through `protectedProcedure`,
 * which rejects null sessions with UNAUTHORIZED before any store is touched.
 * Tenant enforcement: operations require verified membership for the caller
 * in the target tenant, with role gates (approver for approvals, contributor/approver
 * for mutations, auditor for read-only).
 */
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { documentId, tenantId, type R2Module } from "@/lib/r2/r2";
import { isOk } from "@/lib/result/result";
import { type DocumentsStore, type MembershipRole } from "./documents/store";
import { type VectorIndex } from "@/lib/vector/qdrant";

export interface Session {
  readonly user: { readonly id: string };
}

export interface Context {
  readonly session: Session | null;
}

const t = initTRPC.context<Context>().create();

const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) throw new TRPCError({ code: "UNAUTHORIZED", message: "sign-in required" });
  return next({ ctx: { ...ctx, session: ctx.session } });
});

const tenantInput = z
  .string()
  .refine((value: string): value is string => isOk(tenantId(value)), {
    message: "tenant id must match [A-Za-z0-9_-]{1,64}",
  });

const documentInput = z
  .string()
  .refine((value: string): value is string => isOk(documentId(value)), {
    message: "document id must match [A-Za-z0-9_-]{1,64}",
  });

export function createAppRouter(
  store: DocumentsStore,
  r2?: R2Module | null,
  vectorIndex?: VectorIndex | null,
) {
  async function requireMembership(
    userId: string,
    targetTenant: string,
    requiredRole?: MembershipRole,
  ) {
    const membership = await store.getMembership({ userId, tenantId: targetTenant });
    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Tenant membership required for tenant '${targetTenant}'`,
      });
    }
    if (requiredRole === "approver" && membership.role !== "approver") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Approver role required, current role is '${membership.role}'`,
      });
    }
    if (requiredRole === "contributor" && membership.role === "auditor") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Auditor role has read-only access",
      });
    }
    return membership;
  }

  return t.router({
    health: publicProcedure.query(() => ({ status: "ok" as const, service: "samvaad-ai" as const })),

    memberships: t.router({
      list: protectedProcedure
        .query(({ ctx }) => store.listMemberships(ctx.session.user.id)),

      get: protectedProcedure
        .input(z.object({ tenantId: tenantInput }))
        .query(({ input, ctx }) =>
          store.getMembership({ userId: ctx.session.user.id, tenantId: input.tenantId }),
        ),

      join: protectedProcedure
        .input(
          z.object({
            tenantId: tenantInput,
          }),
        )
        .mutation(async ({ input, ctx }) => {
          const existing = await store.getMembership({
            userId: ctx.session.user.id,
            tenantId: input.tenantId,
          });
          if (existing) return existing;
          return store.addMembership({
            userId: ctx.session.user.id,
            tenantId: input.tenantId,
            role: "contributor",
          });
        }),
    }),

    documents: t.router({
      create: protectedProcedure
        .input(z.object({ tenantId: tenantInput, title: z.string().min(1).max(200) }))
        .mutation(async ({ input, ctx }) => {
          await requireMembership(ctx.session.user.id, input.tenantId, "contributor");
          return store.create({ tenantId: input.tenantId, title: input.title });
        }),

      list: protectedProcedure
        .input(z.object({ tenantId: tenantInput, limit: z.number().int().min(1).max(100).default(20) }))
        .query(async ({ input, ctx }) => {
          await requireMembership(ctx.session.user.id, input.tenantId);
          return store.list(input.tenantId, input.limit);
        }),

      get: protectedProcedure
        .input(z.object({ tenantId: tenantInput, id: z.string().min(1) }))
        .query(async ({ input, ctx }) => {
          await requireMembership(ctx.session.user.id, input.tenantId);
          const doc = await store.get({ id: input.id, tenantId: input.tenantId });
          if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "document not found" });
          return doc;
        }),

      approve: protectedProcedure
        .input(z.object({ tenantId: tenantInput, id: z.string().min(1) }))
        .mutation(async ({ input, ctx }) => {
          await requireMembership(ctx.session.user.id, input.tenantId, "approver");
          const approved = await store.approve({
            id: input.id,
            tenantId: input.tenantId,
            approvedBy: ctx.session.user.id,
          });
          if (!approved) throw new TRPCError({ code: "NOT_FOUND", message: "document not found" });
          return approved;
        }),

      addRevision: protectedProcedure
        .input(
          z.object({
            tenantId: tenantInput,
            documentId: z.string().min(1),
            revisionNumber: z.number().int().min(1),
            diff: z.record(z.string(), z.unknown()),
            reason: z.string().min(1).max(500),
            factsSnapshot: z.unknown().optional(),
            bundleSnapshot: z.unknown().optional(),
          })
        )
        .mutation(async ({ input, ctx }) => {
          await requireMembership(ctx.session.user.id, input.tenantId, "contributor");
          const doc = await store.get({ id: input.documentId, tenantId: input.tenantId });
          if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "document not found" });
          if (doc.tenantId !== input.tenantId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "document does not belong to tenant" });
          }
          if (doc.status === "approved") {
            throw new TRPCError({ code: "FORBIDDEN", message: "approved documents are sealed" });
          }
          return store.addRevision({
            documentId: input.documentId,
            revisionNumber: input.revisionNumber,
            authorId: ctx.session.user.id,
            diff: input.diff,
            reason: input.reason,
            factsSnapshot: input.factsSnapshot,
            bundleSnapshot: input.bundleSnapshot,
          });
        }),
    }),

    r2: t.router({
      mint: protectedProcedure
        .input(
          z.object({
            tenantId: tenantInput,
            documentId: documentInput,
            extension: z.string().min(1).max(10),
            contentType: z.string().min(1),
            contentLengthBytes: z.number().int().positive().max(500 * 1024 * 1024),
          })
        )
        .mutation(async ({ input, ctx }) => {
          await requireMembership(ctx.session.user.id, input.tenantId, "contributor");
          if (!r2) throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "storage module not wired" });
          const tId = tenantId(input.tenantId);
          const dId = documentId(input.documentId);
          if (!isOk(tId) || !isOk(dId)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "invalid tenant or document id" });
          }
          const grant = await r2.createUploadGrant({
            tenant: tId.value,
            document: dId.value,
            extension: input.extension,
            contentType: input.contentType,
            contentLengthBytes: input.contentLengthBytes,
          });
          if (!isOk(grant)) {
            if (grant.error.kind === "invalid-input") {
              throw new TRPCError({ code: "BAD_REQUEST", message: grant.error.issues.join(", ") });
            }
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "failed to mint upload grant" });
          }
          return grant.value;
        }),

      complete: protectedProcedure
        .input(
          z.object({
            tenantId: tenantInput,
            documentId: z.string().min(1),
            key: z.string().min(1),
            kind: z.enum(["form", "pdf", "image", "audio"]),
            sha256: z.string().min(1),
          })
        )
        .mutation(async ({ input, ctx }) => {
          await requireMembership(ctx.session.user.id, input.tenantId, "contributor");
          const expectedPrefix = `tenants/${input.tenantId}/docs/${input.documentId}/`;
          if (!input.key.startsWith(expectedPrefix)) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "key does not match tenant/document scope" });
          }
          const doc = await store.get({ id: input.documentId, tenantId: input.tenantId });
          if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "document not found" });
          if (doc.tenantId !== input.tenantId) {
            throw new TRPCError({ code: "FORBIDDEN", message: "document does not belong to tenant" });
          }
          return store.addSource({
            documentId: input.documentId,
            kind: input.kind,
            r2Key: input.key,
            sha256: input.sha256,
          });
        }),
    }),

    precedents: t.router({
      search: protectedProcedure
        .input(
          z.object({
            tenantId: tenantInput,
            vector: z.array(z.number()).min(1),
            limit: z.number().int().min(1).max(20).default(5),
            minScore: z.number().min(0).max(1).default(0.5),
          })
        )
        .query(async ({ input, ctx }) => {
          await requireMembership(ctx.session.user.id, input.tenantId);
          if (!vectorIndex) {
            throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "vector index not wired" });
          }
          const search = await vectorIndex.searchSimilar({
            tenantId: input.tenantId,
            vector: input.vector,
            limit: input.limit,
            minScore: input.minScore,
          });
          if (!isOk(search)) {
            const errMessage =
              search.error.kind === "invalid-input"
                ? search.error.issues.join(", ")
                : search.error.message;
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: errMessage });
          }
          return search.value;
        }),
    }),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
