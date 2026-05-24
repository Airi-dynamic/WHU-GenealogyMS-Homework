import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function checkAccess(genealogyId: string, userId: string) {
  const g = await prisma.genealogy.findUnique({
    where: { id: genealogyId },
    include: { collaborators: { where: { userId } } },
  });
  if (!g) return null;
  const canAccess = g.ownerId === userId || g.collaborators.length > 0;
  return canAccess ? g : null;
}

// 获取单个族谱详情
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  const g = await prisma.genealogy.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, username: true } },
      collaborators: { include: { user: { select: { id: true, username: true } } } },
      _count: { select: { members: true } },
    },
  });
  if (!g) return NextResponse.json({ error: "族谱不存在" }, { status: 404 });

  const canAccess =
    g.ownerId === session.user!.id ||
    g.collaborators.some((c) => c.userId === session.user!.id);
  if (!canAccess) return NextResponse.json({ error: "无权访问" }, { status: 403 });

  return NextResponse.json({ ...g, isOwner: g.ownerId === session.user!.id });
}

// 更新族谱
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  const g = await prisma.genealogy.findUnique({ where: { id } });
  if (!g || g.ownerId !== session.user!.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const data = await req.json();
  const updated = await prisma.genealogy.update({
    where: { id },
    data: {
      name: data.name,
      surname: data.surname,
      createdYear: data.createdYear,
    },
  });
  return NextResponse.json(updated);
}

// 删除族谱
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  const g = await prisma.genealogy.findUnique({ where: { id } });
  if (!g || g.ownerId !== session.user!.id) {
    return NextResponse.json({ error: "无权删除" }, { status: 403 });
  }

  await prisma.genealogy.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
