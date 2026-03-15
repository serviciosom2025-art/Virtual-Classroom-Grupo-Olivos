"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  FileVideo,
  FileText,
  ClipboardList,
  Trophy,
  Clock,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import type { Folder, FileItem, Exam, StudentProgress, ExamResult } from "@/lib/types";

interface DashboardStats {
  totalFiles: number;
  completedFiles: number;
  totalExams: number;
  completedExams: number;
  recentActivity: {
    type: "file" | "exam";
    name: string;
    date: string;
    status: string;
  }[];
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [filesRes, examsRes, progressRes, resultsRes, foldersRes] = await Promise.all([
        supabase.from("files").select("*"),
        supabase.from("exams").select("*").eq("is_active", true),
        supabase.from("student_progress").select("*").eq("student_id", user.id),
        supabase.from("exam_results").select("*").eq("student_id", user.id),
        supabase.from("folders").select("*").order("name"),
      ]);

      const files = filesRes.data || [];
      const exams = examsRes.data || [];
      const progress = progressRes.data || [];
      const results = resultsRes.data || [];

      const completedFileIds = new Set(
        progress.filter((p) => p.status === "completed").map((p) => p.file_id)
      );

      // Recent activity
      const recentActivity: DashboardStats["recentActivity"] = [];

      // Add completed files
      progress
        .filter((p) => p.status === "completed" && p.completed_at)
        .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
        .slice(0, 3)
        .forEach((p) => {
          const file = files.find((f) => f.id === p.file_id);
          if (file) {
            recentActivity.push({
              type: "file",
              name: file.name,
              date: p.completed_at!,
              status: "Completed",
            });
          }
        });

      // Add exam results
      results
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 3)
        .forEach((r) => {
          const exam = exams.find((e) => e.id === r.exam_id);
          if (exam) {
            recentActivity.push({
              type: "exam",
              name: exam.title,
              date: r.updated_at,
              status: `Score: ${r.highest_score}/${r.total_questions}`,
            });
          }
        });

      recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setStats({
        totalFiles: files.length,
        completedFiles: completedFileIds.size,
        totalExams: exams.length,
        completedExams: results.length,
        recentActivity: recentActivity.slice(0, 5),
      });

      setFolders(foldersRes.data?.filter((f) => !f.parent_id) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  const progressPercent =
    stats && stats.totalFiles > 0
      ? Math.round((stats.completedFiles / stats.totalFiles) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Welcome back!</h1>
        <p className="text-slate-600">Continue your learning journey</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Learning Progress</p>
                <p className="text-2xl font-bold text-slate-800">{progressPercent}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <Progress value={progressPercent} className="mt-4 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Materials Completed</p>
                <p className="text-2xl font-bold text-slate-800">
                  {stats?.completedFiles || 0}
                  <span className="text-base font-normal text-slate-400">
                    /{stats?.totalFiles || 0}
                  </span>
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Exams Taken</p>
                <p className="text-2xl font-bold text-slate-800">
                  {stats?.completedExams || 0}
                  <span className="text-base font-normal text-slate-400">
                    /{stats?.totalExams || 0}
                  </span>
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Achievements</p>
                <p className="text-2xl font-bold text-slate-800">
                  {progressPercent >= 100 ? "1" : "0"}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Course Folders */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Course Materials</CardTitle>
            <CardDescription>Browse and study learning materials</CardDescription>
          </CardHeader>
          <CardContent>
            {folders.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No materials available yet</p>
            ) : (
              <div className="space-y-3">
                {folders.slice(0, 5).map((folder) => (
                  <Link key={folder.id} href={`/student/learn?folder=${folder.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{folder.name}</p>
                        <p className="text-sm text-slate-500">Click to view contents</p>
                      </div>
                    </div>
                  </Link>
                ))}
                {folders.length > 5 && (
                  <Link href="/student/learn">
                    <p className="text-sm text-blue-600 text-center pt-2 hover:underline">
                      View all {folders.length} folders
                    </p>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Your latest learning activities</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats?.recentActivity?.length ? (
              <p className="text-slate-500 text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-50"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        activity.type === "exam" ? "bg-purple-100" : "bg-emerald-100"
                      }`}
                    >
                      {activity.type === "exam" ? (
                        <ClipboardList className="w-5 h-5 text-purple-600" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{activity.name}</p>
                      <p className="text-sm text-slate-500">{activity.status}</p>
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(activity.date).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
