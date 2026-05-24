"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, TreePine } from "lucide-react";
import { buildTree } from "@/lib/tree-builder";

const EChartsTree = dynamic(
  () => import("@/components/tree/echarts-tree").then((m) => m.EChartsTree),
  { ssr: false }
);

export default function TreePage() {
  const { id: genealogyId } = useParams<{ id: string }>();
  const [memberId, setMemberId] = useState("");
  const [direction, setDirection] = useState<"ancestors" | "descendants">("descendants");
  const [treeData, setTreeData] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rootName, setRootName] = useState("");

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId.trim()) { setError("请输入成员ID"); return; }
    setError(""); setLoading(true); setTreeData(null);

    const url = `/api/members/${memberId.trim()}/${direction}`;
    const res = await fetch(url);
    if (!res.ok) { setError("成员不存在或无权访问"); setLoading(false); return; }

    const nodes = await res.json();
    if (!nodes.length) { setError("未找到相关数据"); setLoading(false); return; }

    setRootName(nodes[0].name);
    const tree = buildTree(nodes, nodes[0].id);
    if (!tree) { setError("构建树形结构失败"); setLoading(false); return; }

    setTreeData(tree);
    setLoading(false);
  }

  return (
    <div>
      <Link href={`/genealogies/${genealogyId}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5">
        <ArrowLeft size={15} /> 返回族谱
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <TreePine size={20} className="text-emerald-600" /> 树形预览
        </h1>
        <p className="text-sm text-zinc-500 mt-1">输入成员ID，以树状图展示其祖先或后代层级关系</p>
      </div>

      <Card className="mb-5">
        <CardContent className="py-4">
          <form onSubmit={handleQuery} className="flex flex-wrap gap-3 items-end">
            <Input
              label="成员 ID"
              placeholder="从成员管理页面复制 ID"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="flex-1 min-w-48"
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-zinc-700">方向</label>
              <div className="flex gap-1">
                {(["descendants", "ancestors"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDirection(d)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      direction === d
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    {d === "descendants" ? "向下（后代）" : "向上（祖先）"}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" loading={loading}>查询</Button>
          </form>
          {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
        </CardContent>
      </Card>

      {treeData && (
        <Card>
          <CardContent className="p-0 pt-4">
            <p className="px-4 text-sm text-zinc-500 mb-2">
              {direction === "descendants" ? "后代树" : "祖先树"}：{rootName}
            </p>
            <EChartsTree data={treeData as any} height={560} orient={direction === "ancestors" ? "BT" : "TB"} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
