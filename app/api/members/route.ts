import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function canAccessGenealogy(genealogyId: string, userId: string) {
  const g = await prisma.genealogy.findUnique({
    where: { id: genealogyId },
    include: { collaborators: { where: { userId } } },
  });
  if (!g) return false;
  return g.ownerId === userId || g.collaborators.length > 0;
}

// 列出族谱成员（支持姓名模糊搜索）
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const genealogyId = req.nextUrl.searchParams.get("genealogyId");
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") ?? "20");

  if (!genealogyId) return NextResponse.json({ error: "缺少 genealogyId" }, { status: 400 });
  if (!(await canAccessGenealogy(genealogyId, session.user!.id))) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const where = {
    genealogyId,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: [{ generation: "asc" }, { birthYear: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.member.count({ where }),
  ]);

  return NextResponse.json({ members, total, page, pageSize });
}

// 创建成员
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await req.json();
  const { genealogyId, name, gender, birthYear, deathYear, bio, generation, parentIds, spouseIds } = body;

  if (!genealogyId || !name || !gender) {
    return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
  }
  if (!(await canAccessGenealogy(genealogyId, session.user!.id))) {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }
  if (deathYear && birthYear && deathYear <= birthYear) {
    return NextResponse.json({ error: "逝世年份必须晚于出生年份" }, { status: 400 });
  }

  const member = await prisma.member.create({
    data: {
      genealogyId,
      name,
      gender,
      birthYear: birthYear ?? null,
      deathYear: deathYear ?? null,
      bio: bio ?? null,
      generation: generation ?? null,
    },
  });

  // 建立亲子关系
  if (parentIds?.length) {
    await prisma.parentChild.createMany({
      data: parentIds.map((pid: string) => ({ parentId: pid, childId: member.id })),
      skipDuplicates: true,
    });
  }

  // 建立婚姻关系
  if (spouseIds?.length) {
    await prisma.marriage.createMany({
      data: spouseIds.map((sid: string) => ({ member1Id: member.id, member2Id: sid })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json(member, { status: 201 });
}
