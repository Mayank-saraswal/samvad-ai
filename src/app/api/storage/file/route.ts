import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getStore } from "@/server/context";

const KEY_RE =
  /^tenants\/[A-Za-z0-9_-]{1,64}\/docs\/[A-Za-z0-9_-]{1,64}\/(source\.[a-z0-9]{2,5}|figures\/[A-Za-z0-9_-]{1,80}\.[a-z0-9]{2,5})$/;

export async function GET(req: NextRequest) {
  const { userId, isAuthenticated } = await auth();
  if (!isAuthenticated || !userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");

  if (!key) {
    return new NextResponse("Missing key parameter", { status: 400 });
  }

  if (!KEY_RE.test(key)) {
    return new NextResponse("Invalid key", { status: 400 });
  }

  // Verify document ownership: parse tenant/doc from key, require
  // membership in tenant and existence of the document in that tenant.
  const parts = key.split("/");
  const tenantId = parts[1] ?? "";
  const docId = parts[3] ?? "";
  try {
    const store = getStore();
    const membership = await store.getMembership({ userId, tenantId });
    if (!membership) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const doc = await store.get({ id: docId, tenantId });
    if (!doc) {
      return new NextResponse("Document not found", { status: 404 });
    }
  } catch (err: unknown) {
    console.error("[Storage Proxy] Ownership check failed:", err);
    return new NextResponse("Failed to verify ownership", { status: 500 });
  }

  const endpoint = process.env.R2_S3_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET || "samvaad-ai";

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    return new NextResponse("Storage service unconfigured", { status: 500 });
  }

  try {
    const s3 = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });

    const res = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    if (!res.Body) {
      return new NextResponse("File body empty", { status: 404 });
    }

    const bytes = await res.Body.transformToByteArray();
    const lower = key.toLowerCase();
    const contentType =
      res.ContentType ||
      (lower.endsWith(".pdf")
        ? "application/pdf"
        : lower.endsWith(".png")
        ? "image/png"
        : lower.endsWith(".jpg") || lower.endsWith(".jpeg")
        ? "image/jpeg"
        : lower.endsWith(".webp")
        ? "image/webp"
        : lower.endsWith(".gif")
        ? "image/gif"
        : "application/octet-stream");

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(res.ContentLength || bytes.length),
        "Content-Disposition": `inline; filename="${key.split("/").pop() || "evidence"}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: unknown) {
    console.error("[Storage Proxy] Failed to fetch file from R2:", err);
    return new NextResponse("Failed to load file from storage", { status: 500 });
  }
}
