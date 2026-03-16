"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardList,
  Clock,
  Target,
  Trophy,
  PlayCircle,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";
import type { Exam, ExamResult } from "@/lib/types";

interface ExamWithResult extends Exam {
  result?: ExamResult;
}

export default function StudentExamsPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<ExamWithResult[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [examsRes, resultsRes, permissionsRes] = await Promise.all([
        supabase.from("exams").select("*").eq("is_active", true).gt("questions_count", 0).order("title"),
        supabase.from("exam_results").select("*").eq("student_id", user.id),
        supabase.from("exam_permissions").select("exam_id").eq("student_id", user.id),
      ]);

      const examsData = examsRes.data || [];
      const resultsData = resultsRes.data || [];
      const permissionsData = permissionsRes.data || [];
      
      // Filter exams based on permissions
      const permittedExamIds = new Set(permissionsData.map(p => p.exam_id));
      
      const accessibleExams = examsData.filter(exam => {
        // If exam is not restricted, show it
        if (!exam.is_restricted) return true;
        // If exam is restricted, only show if student has permission
        return permittedExamIds.has(exam.id);
      });

      const examsWithResults: ExamWithResult[] = accessibleExams.map((exam) => ({
        ...exam,
        result: resultsData.find((r) => r.exam_id === exam.id),
      }));

      setExams(examsWithResults);
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

  const completedExams = exams.filter((e) => e.result);
  const pendingExams = exams.filter((e) => !e.result);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Exams</h1>
        <p className="text-slate-600">Test your knowledge with available exams</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <ClipboardList className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Available Exams</p>
                <p className="text-2xl font-bold text-slate-800">{exams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Completed</p>
                <p className="text-2xl font-bold text-slate-800">{completedExams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Average Score</p>
                <p className="text-2xl font-bold text-slate-800">
                  {completedExams.length > 0
                    ? Math.round(
                        completedExams.reduce(
                          (acc, e) =>
                            acc + ((e.result!.highest_score / e.result!.total_questions) * 100),
                          0
                        ) / completedExams.length
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Exams */}
      {pendingExams.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Available to Take</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pendingExams.map((exam) => (
              <Card key={exam.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{exam.title}</CardTitle>
                      {exam.description && (
                        <CardDescription className="mt-1">{exam.description}</CardDescription>
                      )}
                    </div>
                    <Badge className="bg-blue-100 text-blue-700">New</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {exam.questions_count} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {exam.time_limit ? `${exam.time_limit} min` : "No limit"}
                    </span>
                    <span>{exam.max_attempts} attempts</span>
                  </div>
                  <Link href={`/student/exams/${exam.id}`}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Start Exam
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Exams */}
      {completedExams.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Completed</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {completedExams.map((exam) => {
              const scorePercent = Math.round(
                (exam.result!.highest_score / exam.result!.total_questions) * 100
              );
              const canRetake = exam.result!.attempts_used < exam.max_attempts;

              return (
                <Card key={exam.id} className="bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{exam.title}</CardTitle>
                        {exam.description && (
                          <CardDescription className="mt-1">{exam.description}</CardDescription>
                        )}
                      </div>
                      <Badge className={scorePercent >= 70 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                        {scorePercent}%
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Best Score</span>
                        <span className="font-medium">
                          {exam.result!.highest_score}/{exam.result!.total_questions}
                        </span>
                      </div>
                      <Progress value={scorePercent} className="h-2" />
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <span>
                          Attempts: {exam.result!.attempts_used}/{exam.max_attempts}
                        </span>
                        <span>
                          {new Date(exam.result!.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                      {canRetake && (
                        <Link href={`/student/exams/${exam.id}`}>
                          <Button variant="outline" className="w-full mt-2">
                            <PlayCircle className="w-4 h-4 mr-2" />
                            Retake Exam
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {exams.length === 0 && (
        <Card className="bg-white shadow-sm">
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No exams available yet</p>
            <p className="text-sm text-slate-400">Check back later for new exams</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
