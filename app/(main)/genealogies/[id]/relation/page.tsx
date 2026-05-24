"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Network, ArrowRight, CheckCircle, XCircle } from "lucide-react";

interface PathMember {
  id: string;
  name: string;
  gender: string;
  birthYear: number | null;
  generation: number | null;
}

export default function RelationPage() {
  const { id: genealogyId } = useParams<{ id: string }>();
  const [idA, setIdA] = useState("");
  const [idB, setIdB] = useState("");
  const [result, setResult] = useState<{ found: boolean; path: PathMember[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!idA.trim() || !idB.trim()) { setError("请输入两个成员ID"); return; }
    if (idA.trim() === idB.trim()) { setError("两个ID不能相同"); return; }
    setError(""); setLoading(true); setResult(null);

    const res = await fetch(`/api/members/${idA.trim()}/relations?targetId=${idB.trim()}`);
    if (!res.ok) { setError("查询失败，请检查ID是否正确"); setLoading(false); return; }

    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div>
      <Link href={`/genealogies/${genealogyId}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5">
        <ArrowLeft size={15} /> 返回族谱
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <Network size={20} className="text-emerald-600" /> 人物亲缘关系查询
        </h1>
        <p className="text-sm text-zinc-500 mt-1">输入两个成员ID，查询是否存在亲缘关系通路并展示路径</p>
      </div>

      <Card className="mb-5">
        <CardContent className="py-4">
          <form onSubmit={handleQuery} className="flex flex-wrap gap-3 items-end">
            <Input
              label="成员 A 的 ID"
              placeholder="粘贴成员ID"
              value={idA}
              onChange={(e) => setIdA(e.target.value)}
              className="flex-1 min-w-48"
            />
            <div className="pb-1.5 text-zinc-400">
              <ArrowRight size={18} />
            </div>
            <Input
              label="成员 B 的 ID"
              placeholder="粘贴成员ID"
              value={idB}
              onChange={(e) => setIdB(e.target.value)}
              className="flex-1 min-w-48"
            />
            <Button type="submit" loading={loading}>查询亲缘</Button>
          </form>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent className="py-5">
            {!result.found ? (
              <div className="flex items-center gap-3 text-zinc-500">
                <XCircle size={20} className="text-red-400" />
                <p className="font-medium">两人之间不存在亲缘关系通路</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <CheckCircle size={18} className="text-emerald-500" />
                  <p className="text-sm font-medium text-zinc-700">
                    找到亲缘通路，共 <span className="text-emerald-600 font-bold">{result.path.length - 1}</span> 步
                  </p>
                </div>

                {/* 路径可视化 */}
                <div className="flex flex-wrap items-center gap-2">
                  {result.path.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm
                            ${i === 0 ? "bg-emerald-500" : i === result.path.length - 1 ? "bg-blue-500" : "bg-zinc-400"}`}
                        >
                          {m.name[0]}
                        </div>
                        <p className="text-xs font-medium text-zinc-700 mt-1 text-center">{m.name}</p>
                        <div className="flex gap-1 mt-0.5">
                          <Badge variant={m.gender === "M" ? "blue" : "default"} className="text-[10px] px-1 py-0">
                            {m.gender === "M" ? "男" : "女"}
                          </Badge>
                          {m.generation && (
                            <Badge variant="warning" className="text-[10px] px-1 py-0">
                              第{m.generation}代
                            </Badge>
                          )}
                        </div>
                      </div>
                      {i < result.path.length - 1 && (
                        <ArrowRight size={16} className="text-zinc-300 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                {/* 路径文字描述 */}
                <div className="mt-5 p-3 bg-zinc-50 rounded-lg">
                  <p className="text-xs text-zinc-500">亲缘路径（ID链）：</p>
                  <p className="text-xs font-mono text-zinc-600 mt-1 break-all">
                    {result.path.map((m) => m.id).join(" → ")}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
