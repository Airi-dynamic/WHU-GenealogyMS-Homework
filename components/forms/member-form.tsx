"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface MemberFormProps {
  genealogyId: string;
  initial?: {
    id?: string;
    name?: string;
    gender?: string;
    birthYear?: number | null;
    deathYear?: number | null;
    bio?: string | null;
    generation?: number | null;
  } | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function MemberForm({ genealogyId, initial, onSuccess, onCancel }: MemberFormProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    gender: initial?.gender ?? "M",
    birthYear: initial?.birthYear ? String(initial.birthYear) : "",
    deathYear: initial?.deathYear ? String(initial.deathYear) : "",
    bio: initial?.bio ?? "",
    generation: initial?.generation ? String(initial.generation) : "",
    parentIds: [] as string[],
    parentInput: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEdit = !!initial?.id;

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      genealogyId,
      name: form.name,
      gender: form.gender,
      birthYear: form.birthYear ? parseInt(form.birthYear) : null,
      deathYear: form.deathYear ? parseInt(form.deathYear) : null,
      bio: form.bio || null,
      generation: form.generation ? parseInt(form.generation) : null,
      parentIds: form.parentIds,
    };

    const url = isEdit ? `/api/members/${initial!.id}` : "/api/members";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          id="name"
          label="姓名 *"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
        />
        <Select
          id="gender"
          label="性别 *"
          value={form.gender}
          onChange={(e) => set("gender", e.target.value)}
        >
          <option value="M">男</option>
          <option value="F">女</option>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Input
          id="birthYear"
          label="出生年份"
          type="number"
          placeholder="如 1960"
          value={form.birthYear}
          onChange={(e) => set("birthYear", e.target.value)}
        />
        <Input
          id="deathYear"
          label="逝世年份"
          type="number"
          placeholder="如 2020"
          value={form.deathYear}
          onChange={(e) => set("deathYear", e.target.value)}
        />
        <Input
          id="generation"
          label="辈分（代）"
          type="number"
          placeholder="如 5"
          value={form.generation}
          onChange={(e) => set("generation", e.target.value)}
        />
      </div>

      <Textarea
        id="bio"
        label="生平简介"
        placeholder="简要描述该成员的生平事迹…"
        rows={3}
        value={form.bio}
        onChange={(e) => set("bio", e.target.value)}
      />

      {!isEdit && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-700">父/母 ID（可选，输入ID后按回车）</label>
          <div className="flex gap-2">
            <Input
              placeholder="粘贴父母成员ID"
              value={form.parentInput}
              onChange={(e) => set("parentInput", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = form.parentInput.trim();
                  if (val && !form.parentIds.includes(val)) {
                    setForm((f) => ({ ...f, parentIds: [...f.parentIds, val], parentInput: "" }));
                  }
                }
              }}
            />
          </div>
          {form.parentIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.parentIds.map((pid) => (
                <span key={pid} className="inline-flex items-center gap-1 text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                  {pid.slice(0, 10)}…
                  <button type="button" onClick={() => setForm((f) => ({ ...f, parentIds: f.parentIds.filter((x) => x !== pid) }))}>×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-3 pt-1">
        <Button type="submit" loading={loading}>{isEdit ? "保存修改" : "添加成员"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>取消</Button>
      </div>
    </form>
  );
}
