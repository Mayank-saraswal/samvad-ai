import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

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
    const contentType =
      res.ContentType ||
      (key.toLowerCase().endsWith(".pdf")
        ? "application/pdf"
        : key.toLowerCase().endsWith(".png")
        ? "image/png"
        : key.toLowerCase().endsWith(".jpg") || key.toLowerCase().endsWith(".jpeg")
        ? "image/jpeg"
        : "application/octet-stream");

    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(res.ContentLength || bytes.length),
        "Content-Disposition": `inline; filename="${key.split("/").pop() || "evidence"}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: unknown) {
    console.error("[Storage Proxy] Failed to fetch file from R2:", err);
    return new NextResponse("Failed to load file from storage", { status: 500 });
  }
}
