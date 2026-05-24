import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAncestors } from "@/lib/queries/ancestors";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  const member = await prisma.member.findUnique({
    where: { id },
    include: { genealogy: { include: { collaborators: { where: { userId: session.user!.id } } } } },
  });
  if (!member) return NextResponse.json({ error: "成员不存在" }, { status: 404 });
  const canAccess =
    member.genealogy.ownerId === session.user!.id ||
    member.genealogy.collaborators.length > 0;
  if (!canAccess) return NextResponse.json({ error: "无权访问" }, { status: 403 });

  const ancestors = await getAncestors(id);
  return NextResponse.json(ancestors);
}
