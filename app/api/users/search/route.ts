import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// 按用户名搜索用户（用于邀请协作者）
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q) return NextResponse.json([]);

  const users = await prisma.user.findMany({
    where: {
      username: { contains: q, mode: "insensitive" },
      id: { not: session.user!.id },
    },
    select: { id: true, username: true, email: true },
    take: 10,
  });
  return NextResponse.json(users);
}
