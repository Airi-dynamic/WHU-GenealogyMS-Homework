import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// 获取当前用户的族谱列表（自建 + 受邀）
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const genealogies = await prisma.genealogy.findMany({
    where: {
      OR: [
        { ownerId: session.user!.id },
        { collaborators: { some: { userId: session.user!.id } } },
      ],
    },
    include: {
      owner: { select: { username: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(genealogies);
}

// 创建族谱
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { name, surname, createdYear } = await req.json();
  if (!name || !surname) {
    return NextResponse.json({ error: "谱名和姓氏为必填项" }, { status: 400 });
  }

  const genealogy = await prisma.genealogy.create({
    data: {
      name,
      surname,
      createdYear: createdYear ?? new Date().getFullYear(),
      ownerId: session.user!.id as string,
    },
  });
  return NextResponse.json(genealogy, { status: 201 });
}
