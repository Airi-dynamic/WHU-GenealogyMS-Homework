"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewGenealogyPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", surname: "", createdYear: new Date().getFullYear() });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/genealogies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push(`/genealogies/${data.id}`);
  }

  return (
    <div className="max-w-lg">
      <Link href="/genealogies" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-6">
        <ArrowLeft size={15} /> 返回族谱列表
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>新建族谱</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="name"
              label="谱名"
              placeholder="如：张氏家谱"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              id="surname"
              label="姓氏"
              placeholder="如：张"
              value={form.surname}
              onChange={(e) => setForm({ ...form, surname: e.target.value })}
              required
            />
            <Input
              id="createdYear"
              label="修谱年份"
              type="number"
              min={1000}
              max={2100}
              value={form.createdYear}
              onChange={(e) => setForm({ ...form, createdYear: parseInt(e.target.value) })}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={loading}>创建族谱</Button>
              <Link href="/genealogies"><Button type="button" variant="ghost">取消</Button></Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
