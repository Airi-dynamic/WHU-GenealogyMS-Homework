"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, UserPlus, UserMinus, Search } from "lucide-react";

interface User { id: string; username: string; email: string; }
interface Collaborator { user: { id: string; username: string }; }

export default function InvitePage() {
  const { id: genealogyId } = useParams<{ id: string }>();
  const [q, setQ] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [searching, setSearching] = useState(false);
  const [msg, setMsg] = useState("");

  async function loadCollaborators() {
    const res = await fetch(`/api/genealogies/${genealogyId}`);
    const data = await res.json();
    setCollaborators(data.collaborators ?? []);
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setSearching(true);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    setSearchResults(await res.json());
    setSearching(false);
  }

  async function handleInvite(userId: string, username: string) {
    const res = await fetch(`/api/genealogies/${genealogyId}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) {
      setMsg(`已成功邀请 ${username}`);
      loadCollaborators();
    } else {
      const d = await res.json();
      setMsg(d.error);
    }
  }

  async function handleRemove(userId: string, username: string) {
    if (!confirm(`确定移除协作者 ${username}？`)) return;
    await fetch(`/api/genealogies/${genealogyId}/invite`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    loadCollaborators();
  }

  useEffect(() => { loadCollaborators(); }, []);

  return (
    <div className="max-w-xl">
      <Link href={`/genealogies/${genealogyId}`} className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5">
        <ArrowLeft size={15} /> 返回族谱
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
          <UserPlus size={20} className="text-emerald-600" /> 邀请协作者
        </h1>
        <p className="text-sm text-zinc-500 mt-1">邀请其他用户共同编辑此族谱</p>
      </div>

      {/* 搜索用户 */}
      <Card className="mb-4">
        <CardHeader><CardTitle>搜索用户</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <Input
              placeholder="按用户名搜索…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="outline" loading={searching}>
              <Search size={15} />
            </Button>
          </form>
          {msg && <p className="text-sm text-emerald-600 mb-2">{msg}</p>}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((u) => {
                const already = collaborators.some((c) => c.user.id === u.id);
                return (
                  <div key={u.id} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{u.username}</p>
                      <p className="text-xs text-zinc-400">{u.email}</p>
                    </div>
                    {already ? (
                      <span className="text-xs text-zinc-400">已邀请</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleInvite(u.id, u.username)}>
                        邀请
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 当前协作者 */}
      <Card>
        <CardHeader><CardTitle>当前协作者</CardTitle></CardHeader>
        <CardContent>
          {collaborators.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-4">暂无协作者</p>
          ) : (
            <div className="space-y-2">
              {collaborators.map((c) => (
                <div key={c.user.id} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                  <p className="text-sm font-medium text-zinc-800">{c.user.username}</p>
                  <button
                    onClick={() => handleRemove(c.user.id, c.user.username)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  >
                    <UserMinus size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
