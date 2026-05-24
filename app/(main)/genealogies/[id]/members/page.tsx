"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { MemberForm } from "@/components/forms/member-form";
import { ArrowLeft, Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight, Copy, Check, IdCard } from "lucide-react";

interface Member {
  id: string;
  name: string;
  gender: string;
  birthYear: number | null;
  deathYear: number | null;
  generation: number | null;
  bio: string | null;
}

// 单个 ID 复制按钮
function CopyIdButton({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button
      onClick={handleCopy}
      title="复制完整 ID"
      className="p-1 rounded hover:bg-zinc-100 transition-colors"
    >
      {copied
        ? <Check size={13} className="text-emerald-500" />
        : <Copy size={13} className="text-zinc-400 hover:text-zinc-600" />}
    </button>
  );
}

// ID 详情弹窗
function IdModal({ member, onClose }: { member: Member; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(member.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <Modal open onClose={onClose} title="成员 ID">
      <div className="space-y-3">
        <div>
          <p className="text-sm text-zinc-500 mb-1">成员姓名</p>
          <p className="font-medium text-zinc-900">{member.name}</p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 mb-1">完整 ID（用于祖先查询 / 亲缘通路查询）</p>
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
            <code className="flex-1 text-sm font-mono text-zinc-800 break-all select-all">{member.id}</code>
            <button
              onClick={handleCopy}
              className="shrink-0 p-1.5 rounded hover:bg-zinc-200 transition-colors"
              title="复制"
            >
              {copied
                ? <Check size={15} className="text-emerald-500" />
                : <Copy size={15} className="text-zinc-500" />}
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-1">点击 ID 文本可全选，点击复制按钮可一键复制</p>
        </div>
      </div>
    </Modal>
  );
}

export default function MembersPage() {
  const { id: genealogyId } = useParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [inputQ, setInputQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [viewingId, setViewingId] = useState<Member | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ genealogyId, page: String(page), pageSize: String(pageSize) });
    if (query) params.set("q", query);
    const res = await fetch(`/api/members?${params}`);
    const data = await res.json();
    setMembers(data.members ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [genealogyId, page, query]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setQuery(inputQ);
  }

  async function handleDelete(memberId: string) {
    if (!confirm("确定删除该成员？")) return;
    await fetch(`/api/members/${memberId}`, { method: "DELETE" });
    load();
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <Link href={`/genealogies/${genealogyId}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5">
        <ArrowLeft size={15} /> 返回族谱
      </Link>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">成员管理</h1>
          <p className="text-sm text-zinc-500 mt-0.5">共 {total.toLocaleString()} 位成员</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={15} /> 添加成员
        </Button>
      </div>

      {/* 搜索框 */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <Input
          placeholder="按姓名模糊搜索…"
          value={inputQ}
          onChange={(e) => setInputQ(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" variant="outline" size="md">
          <Search size={15} /> 搜索
        </Button>
        {query && (
          <Button type="button" variant="ghost" onClick={() => { setInputQ(""); setQuery(""); setPage(1); }}>
            清除
          </Button>
        )}
      </form>

      {/* 提示 */}
      <p className="text-xs text-zinc-400 mb-2 flex items-center gap-1">
        <IdCard size={13} /> 点击 ID 列的
        <Copy size={11} className="inline" />
        图标可一键复制完整ID；点击
        <IdCard size={11} className="inline" />
        图标可查看完整 ID 弹窗
      </p>

      {/* 成员表格 */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">姓名</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">性别</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">出生年</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">逝世年</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">辈分</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">ID（前8位）</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10 text-zinc-400">加载中…</td></tr>
            ) : members.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-10 text-zinc-400">暂无成员</td></tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-800">{m.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.gender === "M" ? "blue" : "default"}>
                      {m.gender === "M" ? "男" : "女"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{m.birthYear ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{m.deathYear ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{m.generation ? `第${m.generation}代` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-zinc-400">{m.id.slice(0, 8)}…</span>
                      <CopyIdButton id={m.id} />
                      <button
                        onClick={() => setViewingId(m)}
                        title="查看完整 ID"
                        className="p-1 rounded hover:bg-zinc-100 transition-colors"
                      >
                        <IdCard size={13} className="text-zinc-400 hover:text-zinc-600" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditing(m); setShowForm(true); }}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
            <span className="text-xs text-zinc-500">
              第 {page} / {totalPages} 页，共 {total.toLocaleString()} 条
            </span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={14} />
              </Button>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 添加/编辑成员 Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        title={editing ? "编辑成员" : "添加成员"}
        className="max-w-xl"
      >
        <MemberForm
          genealogyId={genealogyId}
          initial={editing}
          onSuccess={() => { setShowForm(false); setEditing(null); load(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      </Modal>

      {/* ID 查看弹窗 */}
      {viewingId && <IdModal member={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
}
