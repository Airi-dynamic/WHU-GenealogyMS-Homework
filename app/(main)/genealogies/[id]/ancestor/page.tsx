"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, GitBranch } from "lucide-react";
import { buildTree } from "@/lib/tree-builder";

const EChartsTree = dynamic(
  () => import("@/components/tree/echarts-tree").then((m) => m.EChartsTree),
  { ssr: false }
);

export default function AncestorPage() {
  const { id: genealogyId } = useParams<{ id: string }>();
  const [memberId, setMemberId] = useState("");
  const [treeData, setTreeData] = useState<object | null>(null);
  const [ancestors, setAncestors] = useState<{ id: string; name: string; generation: number | null; birthYear: number | null; depth: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rootName, setRootName] = useState("");

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId.trim()) { setError("请输入成员ID"); return; }
    setError(""); setLoading(true); setTreeData(null);

    const res = await fetch(`/api/members/${memberId.trim()}/ancestors`);
    if (!res.ok) { setError("成员不存在或无权访问"); setLoading(false); return; }

    const nodes = await res.json();
    if (!nodes.length) { setError("未找到该成员"); setLoading(false); return; }

    setRootName(nodes[0].name);
    setAncestors(nodes);
    const tree = buildTree(nodes, nodes[0].id);
    if (tree) setTreeData(tree);
    setLoading(false);
  }

  return (
    <div>
      <Link href={`/genealogies/${genealogyId}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5">
        <ArrowLeft size={15} /> 返回族谱
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <GitBranch size={20} className="text-emerald-600" /> 人物祖先查询
        </h1>
        <p className="text-sm text-zinc-500 mt-1">输入人物ID，以树状图展示其父辈以上的所有历代祖先</p>
      </div>

      <Card className="mb-5">
        <CardContent className="py-4">
          <form onSubmit={handleQuery} className="flex gap-3 items-end">
            <Input
              label="成员 ID"
              placeholder="从成员管理页面复制成员ID"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" loading={loading}>查询祖先</Button>
          </form>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </CardContent>
      </Card>

      {treeData && (
        <div className="space-y-4">
          {/* 祖先树图 */}
          <Card>
            <CardContent className="p-0 pt-4">
              <p className="px-4 text-sm text-zinc-500 mb-2">
                {rootName} 的祖先树（共 {ancestors.length - 1} 位祖先）
              </p>
              <EChartsTree data={treeData as any} height={500} orient="BT" />
            </CardContent>
          </Card>

          {/* 祖先列表（缩进）*/}
          <Card>
            <CardContent className="py-4">
              <p className="text-sm font-medium text-zinc-700 mb-3">祖先列表（按层级缩进）</p>
              <div className="space-y-1 font-mono text-sm">
                {ancestors.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 text-zinc-700"
                    style={{ paddingLeft: `${a.depth * 20}px` }}
                  >
                    <span className="text-zinc-300 select-none">{"└─"}</span>
                    <span className="font-medium">{a.name}</span>
                    {a.generation && <span className="text-zinc-400">第{a.generation}代</span>}
                    {a.birthYear && <span className="text-zinc-400">b.{a.birthYear}</span>}
                    {a.depth === 0 && <span className="text-emerald-500 text-xs">（本人）</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
