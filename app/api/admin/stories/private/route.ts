import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/server/auth";
import { prisma } from "@/lib/server/prisma";

export async function PATCH(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  let slug: string | null = null;
  try {
    const json = await request.json();
    slug = typeof json?.slug === "string" ? json.slug : null;
  } catch {
    // fall through to query param check
  }
  if (!slug) {
    const url = new URL(request.url);
    slug = url.searchParams.get("slug");
  }
  if (!slug) {
    return NextResponse.json({ error: "Missing story code." }, { status: 400 });
  }
  try {
    await prisma.twineStory.update({
      where: { slug },
      data: { visibility: "PRIVATE" },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/admin/stories/private] Failed to set story private", error);
    const message = error instanceof Error ? error.message || "Unable to set story private." : "Unable to set story private.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
