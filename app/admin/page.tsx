"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FolderTree, ClipboardList, GraduationCap } from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  totalFolders: number;
  totalFiles: number;
  totalExams: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalFolders: 0,
    totalFiles: 0,
    totalExams: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient();

      const [profiles, folders, files, exams] = await Promise.all([
        supabase.from("profiles").select("role", { count: "exact" }),
        supabase.from("folders").select("id", { count: "exact" }),
        supabase.from("files").select("id", { count: "exact" }),
        supabase.from("exams").select("id", { count: "exact" }),
      ]);

      const profilesData = profiles.data || [];
      setStats({
        totalUsers: profiles.count || 0,
        totalStudents: profilesData.filter((p) => p.role === "student").length,
        totalTeachers: profilesData.filter((p) => p.role === "teacher").length,
        totalFolders: folders.count || 0,
        totalFiles: files.count || 0,
        totalExams: exams.count || 0,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "bg-blue-500",
      description: `${stats.totalTeachers} teachers, ${stats.totalStudents} students`,
    },
    {
      title: "Course Folders",
      value: stats.totalFolders,
      icon: FolderTree,
      color: "bg-emerald-500",
      description: `${stats.totalFiles} files uploaded`,
    },
    {
      title: "Total Exams",
      value: stats.totalExams,
      icon: ClipboardList,
      color: "bg-amber-500",
      description: "Active assessments",
    },
    {
      title: "Active Students",
      value: stats.totalStudents,
      icon: GraduationCap,
      color: "bg-purple-500",
      description: "Enrolled learners",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-600">Welcome back! Here&apos;s an overview of your platform.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="bg-white shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`w-9 h-9 ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">
                  {loading ? "-" : stat.value}
                </div>
                <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/admin/users"
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-slate-700">Manage Users</span>
            </a>
            <a
              href="/admin/folders"
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <FolderTree className="w-5 h-5 text-emerald-600" />
              <span className="text-slate-700">Manage Course Materials</span>
            </a>
            <a
              href="/admin/exams"
              className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <ClipboardList className="w-5 h-5 text-amber-600" />
              <span className="text-slate-700">Manage Exams</span>
            </a>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Platform Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Total Content</span>
                <span className="font-semibold text-slate-800">
                  {stats.totalFolders} folders, {stats.totalFiles} files
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">User Distribution</span>
                <span className="font-semibold text-slate-800">
                  {stats.totalTeachers} teachers, {stats.totalStudents} students
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Assessments</span>
                <span className="font-semibold text-slate-800">{stats.totalExams} exams</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
