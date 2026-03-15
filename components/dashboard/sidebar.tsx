"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Users,
  FolderTree,
  FileText,
  ClipboardList,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Home,
  BookOpen,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  sidebarColor: string;
}

export function Sidebar({ collapsed, onToggle, sidebarColor }: SidebarProps) {
  const { profile, settings } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const role = profile?.role || "student";

  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: Home },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/folders", label: "Course Materials", icon: FolderTree },
    { href: "/admin/exams", label: "Exams", icon: ClipboardList },
    { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const teacherLinks = [
    { href: "/teacher", label: "Dashboard", icon: Home },
    { href: "/teacher/content", label: "Course Materials", icon: FolderTree },
    { href: "/teacher/exams", label: "Exams", icon: ClipboardList },
    { href: "/teacher/students", label: "Students", icon: Users },
    { href: "/teacher/reports", label: "Reports", icon: BarChart3 },
  ];

  const studentLinks = [
    { href: "/student", label: "Dashboard", icon: Home },
    { href: "/student/courses", label: "My Courses", icon: BookOpen },
    { href: "/student/exams", label: "My Exams", icon: ClipboardList },
    { href: "/student/progress", label: "My Progress", icon: BarChart3 },
  ];

  const links = role === "admin" ? adminLinks : role === "teacher" ? teacherLinks : studentLinks;

  const isActive = (href: string) => {
    if (href === `/${role}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen flex flex-col transition-all duration-300 z-20",
        collapsed ? "w-16" : "w-64"
      )}
      style={{ backgroundColor: sidebarColor }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10">
        {!collapsed && (
          <div className="flex items-center gap-3">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
            )}
            <span className="font-semibold text-white truncate">
              {settings?.platform_name || "Virtual Classroom"}
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <li key={link.href}>
                <button
                  onClick={() => router.push(link.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                  title={collapsed ? link.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="truncate">{link.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full text-white/70 hover:text-white hover:bg-white/10"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
