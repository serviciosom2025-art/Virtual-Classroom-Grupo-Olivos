"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Users, BookOpen, ClipboardList, Trophy } from "lucide-react";

interface StudentData {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  completedFiles: number;
  totalFiles: number;
  examsCompleted: number;
  avgScore: number;
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalFiles, setTotalFiles] = useState(0);

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      // Fetch students
      const { data: studentsData } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("full_name");

      // Fetch total files count
      const { count: filesCount } = await supabase.from("files").select("id", { count: "exact" });
      setTotalFiles(filesCount || 0);

      // Fetch all progress and results
      const [progressRes, resultsRes] = await Promise.all([
        supabase.from("student_progress").select("*").eq("status", "completed"),
        supabase.from("exam_results").select("*"),
      ]);

      const progressByStudent = new Map<string, number>();
      (progressRes.data || []).forEach((p) => {
        progressByStudent.set(p.student_id, (progressByStudent.get(p.student_id) || 0) + 1);
      });

      const resultsByStudent = new Map<string, { count: number; totalScore: number }>();
      (resultsRes.data || []).forEach((r) => {
        const existing = resultsByStudent.get(r.student_id) || { count: 0, totalScore: 0 };
        resultsByStudent.set(r.student_id, {
          count: existing.count + 1,
          totalScore: existing.totalScore + (r.highest_score / r.total_questions) * 100,
        });
      });

      const enrichedStudents: StudentData[] = (studentsData || []).map((student) => {
        const results = resultsByStudent.get(student.id);
        return {
          id: student.id,
          full_name: student.full_name || "Unknown",
          email: student.email || "",
          created_at: student.created_at,
          completedFiles: progressByStudent.get(student.id) || 0,
          totalFiles: filesCount || 0,
          examsCompleted: results?.count || 0,
          avgScore: results ? Math.round(results.totalScore / results.count) : 0,
        };
      });

      setStudents(enrichedStudents);
      setFilteredStudents(enrichedStudents);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredStudents(students);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredStudents(
        students.filter(
          (s) =>
            s.full_name.toLowerCase().includes(query) ||
            s.email.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, students]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  // Stats
  const avgProgress =
    students.length > 0 && totalFiles > 0
      ? Math.round(
          students.reduce((acc, s) => acc + (s.completedFiles / totalFiles) * 100, 0) /
            students.length
        )
      : 0;

  const avgExamScore =
    students.filter((s) => s.examsCompleted > 0).length > 0
      ? Math.round(
          students.filter((s) => s.examsCompleted > 0).reduce((acc, s) => acc + s.avgScore, 0) /
            students.filter((s) => s.examsCompleted > 0).length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Students</h1>
        <p className="text-slate-600">View and track student progress</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Students</p>
                <p className="text-2xl font-bold text-slate-800">{students.length}</p>
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
                <p className="text-sm text-slate-500">Avg. Progress</p>
                <p className="text-2xl font-bold text-slate-800">{avgProgress}%</p>
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
                <p className="text-sm text-slate-500">Exams Completed</p>
                <p className="text-2xl font-bold text-slate-800">
                  {students.reduce((acc, s) => acc + s.examsCompleted, 0)}
                </p>
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
                <p className="text-sm text-slate-500">Avg. Exam Score</p>
                <p className="text-2xl font-bold text-slate-800">{avgExamScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Students Table */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">All Students</CardTitle>
              <CardDescription>{filteredStudents.length} students</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No students found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Course Progress</TableHead>
                  <TableHead>Exams</TableHead>
                  <TableHead>Avg. Score</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const progressPercent =
                    totalFiles > 0
                      ? Math.round((student.completedFiles / totalFiles) * 100)
                      : 0;

                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {student.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{student.full_name}</p>
                            <p className="text-sm text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-32">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-500">
                              {student.completedFiles}/{totalFiles}
                            </span>
                            <span className="font-medium">{progressPercent}%</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{student.examsCompleted} completed</Badge>
                      </TableCell>
                      <TableCell>
                        {student.examsCompleted > 0 ? (
                          <Badge
                            className={
                              student.avgScore >= 70
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }
                          >
                            {student.avgScore}%
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(student.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
