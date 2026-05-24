import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, GitBranch, UserCheck } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  // 当前用户可访问的所有族谱
  const genealogies = await prisma.genealogy.findMany({
    where: {
      OR: [
        { ownerId: session.user!.id },
        { collaborators: { some: { userId: session.user!.id } } },
      ],
    },
    include: { _count: { select: { members: true } } },
  });

  const totalGenealogies = genealogies.length;
  const ownedGenealogies = genealogies.filter((g) => g.ownerId === session.user!.id).length;
  const totalMembers = genealogies.reduce((sum, g) => sum + g._count.members, 0);

  // 所有成员的男女统计
  const genderStats = await prisma.member.groupBy({
    by: ["gender"],
    where: {
      genealogy: {
        OR: [
          { ownerId: session.user!.id },
          { collaborators: { some: { userId: session.user!.id } } },
        ],
      },
    },
    _count: true,
  });
  const males = genderStats.find((s) => s.gender === "M")?._count ?? 0;
  const females = genderStats.find((s) => s.gender === "F")?._count ?? 0;
  const maleRatio = totalMembers > 0 ? ((males / totalMembers) * 100).toFixed(1) : "0";
  const femaleRatio = totalMembers > 0 ? ((females / totalMembers) * 100).toFixed(1) : "0";

  const stats = [
    { label: "族谱总数", value: totalGenealogies, sub: `其中 ${ownedGenealogies} 个由你创建`, icon: BookOpen, color: "text-emerald-600 bg-emerald-50" },
    { label: "成员总数", value: totalMembers.toLocaleString(), sub: "所有可访问族谱", icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "男性成员", value: males.toLocaleString(), sub: `占比 ${maleRatio}%`, icon: UserCheck, color: "text-indigo-600 bg-indigo-50" },
    { label: "女性成员", value: females.toLocaleString(), sub: `占比 ${femaleRatio}%`, icon: GitBranch, color: "text-pink-600 bg-pink-50" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">总览</h1>
        <p className="text-sm text-zinc-500 mt-1">欢迎回来，{session.user!.name}</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-500">{label}</p>
                  <p className="text-2xl font-bold text-zinc-900 mt-1">{value}</p>
                  <p className="text-xs text-zinc-400 mt-1">{sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${color}`}>
                  <Icon size={20} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 男女比例条形图 */}
      {totalMembers > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>性别比例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-500 w-10 text-right">{maleRatio}%</span>
              <div className="flex-1 h-5 rounded-full bg-zinc-100 overflow-hidden flex">
                <div
                  className="h-full bg-blue-400 transition-all"
                  style={{ width: `${maleRatio}%` }}
                />
                <div
                  className="h-full bg-pink-400 transition-all"
                  style={{ width: `${femaleRatio}%` }}
                />
              </div>
              <span className="text-sm text-zinc-500 w-10">{femaleRatio}%</span>
            </div>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <div className="w-3 h-3 rounded bg-blue-400" /> 男性
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <div className="w-3 h-3 rounded bg-pink-400" /> 女性
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 族谱列表概览 */}
      <Card>
        <CardHeader>
          <CardTitle>族谱概览</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {genealogies.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-zinc-400">暂无族谱，前往「我的族谱」创建</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500">谱名</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500">姓氏</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500">成员数</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500">角色</th>
                </tr>
              </thead>
              <tbody>
                {genealogies.map((g) => (
                  <tr key={g.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-zinc-800">{g.name}</td>
                    <td className="px-6 py-3 text-zinc-600">{g.surname}氏</td>
                    <td className="px-6 py-3 text-zinc-600">{g._count.members.toLocaleString()}</td>
                    <td className="px-6 py-3">
                      {g.ownerId === session.user!.id ? (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">创建者</span>
                      ) : (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">协作者</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
