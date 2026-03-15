"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  ClipboardList,
  Target,
} from "lucide-react";

interface ReportData {
  totalStudents: number;
  activeStudents: number;
  totalFiles: number;
  completedFiles: number;
  totalExams: number;
  examsTaken: number;
  avgExamScore: number;
  topExams: { title: string; attempts: number; avgScore: number }[];
  popularContent: { name: string; completions: number }[];
}

export default function TeacherReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      const [
        studentsRes,
        filesRes,
        examsRes,
        progressRes,
        resultsRes,
        attemptsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact" }).eq("role", "student"),
        supabase.from("files").select("id, name", { count: "exact" }),
        supabase.from("exams").select("id, title", { count: "exact" }),
        supabase.from("student_progress").select("*").eq("status", "completed"),
        supabase.from("exam_results").select("*"),
        supabase.from("exam_attempts").select("*"),
      ]);

      const uniqueActiveStudents = new Set([
        ...(progressRes.data || []).map((p) => p.student_id),
        ...(resultsRes.data || []).map((r) => r.student_id),
      ]);

      // Calculate avg exam score
      const results = resultsRes.data || [];
      const avgScore =
        results.length > 0
          ? Math.round(
              results.reduce((acc, r) => acc + (r.highest_score / r.total_questions) * 100, 0) /
                results.length
            )
          : 0;

      // Calculate top exams
      const examStats = new Map<string, { title: string; attempts: number; totalScore: number }>();
      const exams = examsRes.data || [];
      exams.forEach((e) => examStats.set(e.id, { title: e.title, attempts: 0, totalScore: 0 }));

      (attemptsRes.data || []).forEach((a) => {
        const exam = examStats.get(a.exam_id);
        if (exam) {
          exam.attempts++;
          exam.totalScore += (a.score / a.total_questions) * 100;
        }
      });

      const topExams = Array.from(examStats.values())
        .filter((e) => e.attempts > 0)
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 5)
        .map((e) => ({
          title: e.title,
          attempts: e.attempts,
          avgScore: Math.round(e.totalScore / e.attempts),
        }));

      // Calculate popular content
      const contentStats = new Map<string, { name: string; completions: number }>();
      const files = filesRes.data || [];
      files.forEach((f) => contentStats.set(f.id, { name: f.name, completions: 0 }));

      (progressRes.data || []).forEach((p) => {
        const file = contentStats.get(p.file_id);
        if (file) file.completions++;
      });

      const popularContent = Array.from(contentStats.values())
        .filter((c) => c.completions > 0)
        .sort((a, b) => b.completions - a.completions)
        .slice(0, 5);

      setData({
        totalStudents: studentsRes.count || 0,
        activeStudents: uniqueActiveStudents.size,
        totalFiles: filesRes.count || 0,
        completedFiles: (progressRes.data || []).length,
        totalExams: examsRes.count || 0,
        examsTaken: (attemptsRes.data || []).length,
        avgExamScore: avgScore,
        topExams,
        popularContent,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (!data) return null;

  const engagementRate =
    data.totalStudents > 0
      ? Math.round((data.activeStudents / data.totalStudents) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
        <p className="text-slate-600">Track student engagement and learning outcomes</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Engagement Rate</p>
                <p className="text-2xl font-bold text-slate-800">{engagementRate}%</p>
                <p className="text-xs text-slate-400">{data.activeStudents}/{data.totalStudents} students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Content Completions</p>
                <p className="text-2xl font-bold text-slate-800">{data.completedFiles}</p>
                <p className="text-xs text-slate-400">across {data.totalFiles} files</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Exam Attempts</p>
                <p className="text-2xl font-bold text-slate-800">{data.examsTaken}</p>
                <p className="text-xs text-slate-400">across {data.totalExams} exams</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Avg. Exam Score</p>
                <p className="text-2xl font-bold text-slate-800">{data.avgExamScore}%</p>
                <p className="text-xs text-slate-400">overall average</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Exams */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              Top Exams by Attempts
            </CardTitle>
            <CardDescription>Most popular exams among students</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topExams.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No exam data yet</p>
            ) : (
              <div className="space-y-4">
                {data.topExams.map((exam, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{exam.title}</p>
                        <p className="text-sm text-slate-500">{exam.attempts} attempts</p>
                      </div>
                    </div>
                    <Badge
                      className={
                        exam.avgScore >= 70
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      Avg: {exam.avgScore}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Popular Content */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              Most Completed Content
            </CardTitle>
            <CardDescription>Learning materials with highest completion</CardDescription>
          </CardHeader>
          <CardContent>
            {data.popularContent.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No completion data yet</p>
            ) : (
              <div className="space-y-4">
                {data.popularContent.map((content, index) => {
                  const maxCompletions = data.popularContent[0]?.completions || 1;
                  const percent = Math.round((content.completions / maxCompletions) * 100);

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-800 truncate max-w-[200px]">
                          {content.name}
                        </p>
                        <Badge variant="outline">{content.completions} completions</Badge>
                      </div>
                      <Progress value={percent} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
