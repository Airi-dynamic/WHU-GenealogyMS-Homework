import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// 邀请用户成为族谱协作者
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id: genealogyId } = await params;

  const g = await prisma.genealogy.findUnique({ where: { id: genealogyId } });
  if (!g || g.ownerId !== session.user!.id) {
    return NextResponse.json({ error: "仅族谱创建者可邀请协作者" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "缺少userId" }, { status: 400 });
  if (userId === session.user!.id) {
    return NextResponse.json({ error: "不能邀请自己" }, { status: 400 });
  }

  await prisma.genealogyCollaborator.upsert({
    where: { genealogyId_userId: { genealogyId, userId } },
    update: {},
    create: { genealogyId, userId },
  });
  return NextResponse.json({ success: true });
}

// 移除协作者
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id: genealogyId } = await params;

  const g = await prisma.genealogy.findUnique({ where: { id: genealogyId } });
  if (!g || g.ownerId !== session.user!.id) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const { userId } = await req.json();
  await prisma.genealogyCollaborator.deleteMany({
    where: { genealogyId, userId },
  });
  return NextResponse.json({ success: true });
}
