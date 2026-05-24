import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getLongestLivingGeneration,
  getOldUnmarriedMales,
  getMembersEarlierThanGenerationAvg,
} from "@/lib/queries/statistics";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id: genealogyId } = await params;
  const type = req.nextUrl.searchParams.get("type");

  const g = await prisma.genealogy.findUnique({
    where: { id: genealogyId },
    include: { collaborators: { where: { userId: session.user!.id } } },
  });
  if (!g) return NextResponse.json({ error: "族谱不存在" }, { status: 404 });
  if (g.ownerId !== session.user!.id && g.collaborators.length === 0) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  if (type === "longestGeneration") {
    return NextResponse.json(await getLongestLivingGeneration(genealogyId));
  }
  if (type === "oldUnmarriedMales") {
    return NextResponse.json(await getOldUnmarriedMales(genealogyId));
  }
  if (type === "earlyBirthByGeneration") {
    return NextResponse.json(await getMembersEarlierThanGenerationAvg(genealogyId));
  }
  return NextResponse.json({ error: "未知分析类型" }, { status: 400 });
}
