"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { Spinner } from "@/components/ui/spinner";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const { isLoading, settings } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  const sidebarColor = settings?.sidebar_color || "#1e293b";
  const backgroundColor = settings?.background_color || "#f8fafc";
  const useBackgroundImage = settings?.use_background_image || false;
  const backgroundImageUrl = settings?.background_image_url;

  return (
    <div 
      className="min-h-screen flex"
      style={{ 
        backgroundColor: useBackgroundImage ? undefined : backgroundColor,
        backgroundImage: useBackgroundImage && backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        sidebarColor={sidebarColor}
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? "ml-16" : "ml-64"}`}>
        <Navbar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
