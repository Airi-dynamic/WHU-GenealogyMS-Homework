"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, BookOpen, Users, ChevronRight, Trash2 } from "lucide-react";

interface Genealogy {
  id: string;
  name: string;
  surname: string;
  createdYear: number;
  ownerId: string;
  owner: { username: string };
  _count: { members: number };
}

export default function GenealogiesPage() {
  const [genealogies, setGenealogies] = useState<Genealogy[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/genealogies");
    const data = await res.json();
    setGenealogies(data);
    setLoading(false);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("确定删除该族谱？此操作不可撤销。")) return;
    await fetch(`/api/genealogies/${id}`, { method: "DELETE" });
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">我的族谱</h1>
          <p className="text-sm text-zinc-500 mt-1">管理你创建或受邀参与的族谱</p>
        </div>
        <Link href="/genealogies/new">
          <Button>
            <Plus size={16} /> 新建族谱
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20 text-zinc-400">加载中…</div>
      ) : genealogies.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={40} className="mx-auto text-zinc-200 mb-3" />
          <p className="text-zinc-400">暂无族谱</p>
          <Link href="/genealogies/new" className="mt-4 inline-block">
            <Button variant="outline" size="sm">创建第一个族谱</Button>
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {genealogies.map((g) => (
            <Link key={g.id} href={`/genealogies/${g.id}`} className="group">
              <Card className="hover:shadow-md transition-shadow h-full">
                <CardContent className="py-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                      <BookOpen size={18} />
                    </div>
                    <div className="flex items-center gap-1">
                      {g.owner && (
                        <span className="text-xs text-zinc-400">by {g.owner.username}</span>
                      )}
                      <button
                        onClick={(e) => handleDelete(g.id, e)}
                        className="opacity-0 group-hover:opacity-100 ml-2 p-1 text-zinc-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-semibold text-zinc-900 mb-1">{g.name}</h3>
                  <p className="text-sm text-zinc-500 mb-3">{g.surname}氏 · {g.createdYear}年</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sm text-zinc-500">
                      <Users size={14} />
                      {g._count.members.toLocaleString()} 人
                    </div>
                    <ChevronRight size={16} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
