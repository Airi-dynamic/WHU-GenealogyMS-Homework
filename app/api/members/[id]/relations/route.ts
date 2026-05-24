import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllRelationEdges, findRelationPath } from "@/lib/queries/relationship";
import { prisma } from "@/lib/db";

// 查询两个成员之间的亲缘通路
// GET /api/members/[id]/relations?targetId=xxx
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id: startId } = await params;
  const targetId = req.nextUrl.searchParams.get("targetId");

  if (!targetId) return NextResponse.json({ error: "缺少 targetId" }, { status: 400 });

  const member = await prisma.member.findUnique({
    where: { id: startId },
    include: { genealogy: { include: { collaborators: { where: { userId: session.user!.id } } } } },
  });
  if (!member) return NextResponse.json({ error: "成员不存在" }, { status: 404 });
  const canAccess =
    member.genealogy.ownerId === session.user!.id ||
    member.genealogy.collaborators.length > 0;
  if (!canAccess) return NextResponse.json({ error: "无权访问" }, { status: 403 });

  // 获取全部亲缘边
  const edges = await getAllRelationEdges(member.genealogyId);
  const path = findRelationPath(edges, startId, targetId);

  if (!path) return NextResponse.json({ found: false, path: [] });

  // 查询路径上每个成员的详情
  const members = await prisma.member.findMany({
    where: { id: { in: path } },
    select: { id: true, name: true, gender: true, birthYear: true, generation: true },
  });
  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));
  const pathWithDetails = path.map((id) => memberMap[id]).filter(Boolean);

  return NextResponse.json({ found: true, path: pathWithDetails });
}
