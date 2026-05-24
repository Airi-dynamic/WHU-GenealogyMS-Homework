"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  BookOpen, LayoutDashboard, Users, LogOut, ChevronRight,
} from "lucide-react";

interface SidebarProps {
  username: string;
}

const navItems = [
  { href: "/dashboard", label: "总览", icon: LayoutDashboard },
  { href: "/genealogies", label: "我的族谱", icon: BookOpen },
];

export function Sidebar({ username }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex flex-col bg-white border-r border-zinc-200 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-100">
        <div className="bg-emerald-600 text-white p-1.5 rounded-lg">
          <BookOpen size={16} />
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-900">寻根溯源</p>
          <p className="text-[10px] text-zinc-400">族谱管理系统</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <Icon size={16} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-zinc-100">
        <div className="flex items-center gap-2 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
            {username?.[0]?.toUpperCase()}
          </div>
          <span className="text-sm text-zinc-700 font-medium truncate">{username}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={15} />
          退出登录
        </button>
      </div>
    </aside>
  );
}
