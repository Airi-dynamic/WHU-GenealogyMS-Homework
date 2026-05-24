import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function getMemberWithAccess(memberId: string, userId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      genealogy: { include: { collaborators: { where: { userId } } } },
      parentRelations: { include: { parent: true } },
      childRelations: { include: { child: true } },
      marriagesAsP1: { include: { member2: true } },
      marriagesAsP2: { include: { member1: true } },
    },
  });
  if (!member) return null;
  const canAccess =
    member.genealogy.ownerId === userId ||
    member.genealogy.collaborators.length > 0;
  return canAccess ? member : null;
}

// 获取成员详情（含关系）
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  const member = await getMemberWithAccess(id, session.user!.id);
  if (!member) return NextResponse.json({ error: "成员不存在或无权访问" }, { status: 404 });

  const spouses = [
    ...member.marriagesAsP1.map((m) => ({ ...m.member2, marriageId: m.id })),
    ...member.marriagesAsP2.map((m) => ({ ...m.member1, marriageId: m.id })),
  ];
  const parents = member.parentRelations.map((r) => r.parent);
  const children = member.childRelations.map((r) => r.child);

  return NextResponse.json({ ...member, spouses, parents, children });
}

// 更新成员
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  const member = await getMemberWithAccess(id, session.user!.id);
  if (!member) return NextResponse.json({ error: "无权操作" }, { status: 403 });

  const data = await req.json();
  if (data.deathYear && data.birthYear && data.deathYear <= data.birthYear) {
    return NextResponse.json({ error: "逝世年份必须晚于出生年份" }, { status: 400 });
  }

  const updated = await prisma.member.update({
    where: { id },
    data: {
      name: data.name,
      gender: data.gender,
      birthYear: data.birthYear ?? null,
      deathYear: data.deathYear ?? null,
      bio: data.bio ?? null,
      generation: data.generation ?? null,
    },
  });
  return NextResponse.json(updated);
}

// 删除成员
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });
  const { id } = await params;

  const member = await getMemberWithAccess(id, session.user!.id);
  if (!member) return NextResponse.json({ error: "无权操作" }, { status: 403 });

  await prisma.member.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
