"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, GitBranch, Search, TreePine, Network, ArrowLeft, UserPlus, BarChart2 } from "lucide-react";

interface GenealogyDetail {
  id: string;
  name: string;
  surname: string;
  createdYear: number;
  isOwner: boolean;
  owner: { username: string };
  collaborators: { user: { id: string; username: string } }[];
  _count: { members: number };
}

interface Stats { total: number; males: number; females: number; }

export default function GenealogyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [g, setG] = useState<GenealogyDetail | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch(`/api/genealogies/${id}`).then((r) => r.json()).then(setG);
    fetch(`/api/genealogies/${id}/stats`).then((r) => r.json()).then(setStats);
  }, [id]);

  if (!g) return <div className="text-center py-20 text-zinc-400">加载中…</div>;

  const maleRatio = stats && stats.total > 0 ? ((stats.males / stats.total) * 100).toFixed(1) : "0";
  const femaleRatio = stats && stats.total > 0 ? ((stats.females / stats.total) * 100).toFixed(1) : "0";

  const actions = [
    { href: `/genealogies/${id}/members`, icon: Users, label: "成员管理", desc: "增删改查、模糊搜索" },
    { href: `/genealogies/${id}/tree`, icon: TreePine, label: "树形预览", desc: "层级结构展示" },
    { href: `/genealogies/${id}/ancestor`, icon: GitBranch, label: "祖先查询", desc: "追溯某人历代祖先" },
    { href: `/genealogies/${id}/relation`, icon: Network, label: "亲缘通路", desc: "查询两人关系路径" },
    ...(g.isOwner ? [{ href: `/genealogies/${id}/invite`, icon: UserPlus, label: "邀请协作", desc: "邀请他人共同编辑" }] : []),
  ];

  return (
    <div>
      <Link href="/genealogies" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5">
        <ArrowLeft size={15} /> 返回族谱列表
      </Link>

      {/* 标题 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-zinc-900">{g.name}</h1>
            <Badge variant={g.isOwner ? "success" : "blue"}>{g.isOwner ? "创建者" : "协作者"}</Badge>
          </div>
          <p className="text-sm text-zinc-500">
            {g.surname}氏 · {g.createdYear}年修谱 · 创建者：{g.owner.username}
          </p>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-zinc-900">{stats.total.toLocaleString()}</p>
              <p className="text-xs text-zinc-500 mt-1">总成员数</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.males.toLocaleString()}</p>
              <p className="text-xs text-zinc-500 mt-1">男性 ({maleRatio}%)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <p className="text-2xl font-bold text-pink-600">{stats.females.toLocaleString()}</p>
              <p className="text-xs text-zinc-500 mt-1">女性 ({femaleRatio}%)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 功能入口 */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {actions.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg shrink-0">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-800">{label}</p>
                  <p className="text-xs text-zinc-400">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* 协作者列表 */}
      {g.collaborators.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm font-medium text-zinc-700 mb-2">协作者</p>
            <div className="flex flex-wrap gap-2">
              {g.collaborators.map((c) => (
                <span key={c.user.id} className="text-xs bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">
                  {c.user.username}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
