import { getDownloadUrl } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/auth";
import { isBlobUrl, isPublicMediaPath } from "@/lib/media";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url || !isBlobUrl(url)) {
    return NextResponse.json({ error: "Invalid media URL" }, { status: 400 });
  }

  if (!isPublicMediaPath(url)) {
    const admin = await getAdminContext();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const downloadUrl = await getDownloadUrl(url);
  return NextResponse.redirect(downloadUrl);
}
