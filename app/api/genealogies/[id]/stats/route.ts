import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGenealogyStats } from "@/lib/queries/statistics";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  const g = await prisma.genealogy.findUnique({
    where: { id },
    include: { collaborators: { where: { userId: session.user!.id } } },
  });
  if (!g) return NextResponse.json({ error: "族谱不存在" }, { status: 404 });
  if (g.ownerId !== session.user!.id && g.collaborators.length === 0) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const stats = await getGenealogyStats(id);
  return NextResponse.json(stats);
}
