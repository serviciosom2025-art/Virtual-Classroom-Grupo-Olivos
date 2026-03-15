"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  ClipboardList,
  Target,
  Eye,
  CheckCircle,
  XCircle,
  FolderOpen,
  Search,
  Award,
  ChevronDown,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Profile } from "@/lib/types";

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

interface StudentProgressReport {
  student: Profile;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
}

interface CompletedLesson {
  id: string;
  file_name: string;
  folder_path: string;
  completed_at: string;
}

interface FolderOption {
  id: string;
  name: string;
  path: string;
  depth: number;
}

interface FileWithFolder {
  id: string;
  folder_id: string | null;
}

interface ExamAttemptWithDetails {
  id: string;
  student_id: string;
  exam_id: string;
  score: number;
  total_questions: number;
  attempt_number: number;
  completed_at: string;
  answers: Record<string, string>;
  student_name: string;
  student_email: string;
  exam_title: string;
}

interface QuestionDetail {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  student_answer: string;
  is_correct: boolean;
}

export default function TeacherReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressReports, setProgressReports] = useState<StudentProgressReport[]>([]);
  const [examAttempts, setExamAttempts] = useState<ExamAttemptWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentProgressReport | null>(null);
  const [completedLessonsList, setCompletedLessonsList] = useState<CompletedLesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttemptWithDetails | null>(null);
  const [questionDetails, setQuestionDetails] = useState<QuestionDetail[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [allFiles, setAllFiles] = useState<FileWithFolder[]>([]);
  const [allProgressRecords, setAllProgressRecords] = useState<{student_id: string, file_id: string}[]>([]);
  const [folderMap, setFolderMap] = useState<Map<string, {id: string, name: string, parent_id: string | null}>>(new Map());

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
        foldersRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email", { count: "exact" }).eq("role", "student"),
        supabase.from("files").select("id, name, folder_id", { count: "exact" }),
        supabase.from("exams").select("id, title", { count: "exact" }),
        supabase.from("student_progress").select("*").eq("status", "completed"),
        supabase.from("exam_results").select("*"),
        supabase.from("exam_attempts").select("*"),
        supabase.from("folders").select("id, name, parent_id").order("name"),
      ]);

      // Build folder map and options
      const fMap = new Map(foldersRes.data?.map(f => [f.id, f]) || []);
      setFolderMap(fMap);

      // Build folder path for each folder
      function getFolderPath(folderId: string): string {
        const parts: string[] = [];
        let currentId: string | null = folderId;
        while (currentId) {
          const folder = fMap.get(currentId);
          if (folder) {
            parts.unshift(folder.name);
            currentId = folder.parent_id;
          } else {
            break;
          }
        }
        return parts.join(" / ");
      }

      // Calculate folder depth
      function getFolderDepth(folderId: string): number {
        let depth = 0;
        let currentId: string | null = folderId;
        while (currentId) {
          const folder = fMap.get(currentId);
          if (folder?.parent_id) {
            depth++;
            currentId = folder.parent_id;
          } else {
            break;
          }
        }
        return depth;
      }

      // Build sorted folder options
      const folderOptions: FolderOption[] = (foldersRes.data || [])
        .map(f => ({
          id: f.id,
          name: f.name,
          path: getFolderPath(f.id),
          depth: getFolderDepth(f.id)
        }))
        .sort((a, b) => a.path.localeCompare(b.path));

      setFolders(folderOptions);
      setAllFiles(filesRes.data?.map(f => ({ id: f.id, folder_id: f.folder_id })) || []);
      setAllProgressRecords(progressRes.data?.map(p => ({ student_id: p.student_id, file_id: p.file_id })) || []);

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

      // Load student progress reports
      const students = studentsRes.data || [];
      const totalFiles = filesRes.count || 0;
      const progressData: StudentProgressReport[] = [];
      
      for (const student of students) {
        const completedCount = (progressRes.data || []).filter(
          (p) => p.student_id === student.id
        ).length;
        
        progressData.push({
          student: student as Profile,
          completedLessons: completedCount,
          totalLessons: totalFiles,
          progressPercentage: totalFiles ? Math.round((completedCount / totalFiles) * 100) : 0,
        });
      }
      setProgressReports(progressData);

      // Load exam attempts with details
      const allAttempts: ExamAttemptWithDetails[] = (attemptsRes.data || []).map(attempt => {
        const student = students.find(s => s.id === attempt.student_id);
        const exam = exams.find(e => e.id === attempt.exam_id);
        return {
          id: attempt.id,
          student_id: attempt.student_id,
          exam_id: attempt.exam_id,
          score: attempt.score,
          total_questions: attempt.total_questions,
          attempt_number: attempt.attempt_number,
          completed_at: attempt.completed_at,
          answers: attempt.answers || {},
          student_name: student?.full_name || "Unknown",
          student_email: student?.email || "",
          exam_title: exam?.title || "Unknown Exam",
        };
      });

      // Group by student_id + exam_id and keep only the highest score
      const highestScoreMap = new Map<string, ExamAttemptWithDetails>();
      allAttempts.forEach(attempt => {
        const key = `${attempt.student_id}-${attempt.exam_id}`;
        const existing = highestScoreMap.get(key);
        if (!existing || attempt.score > existing.score) {
          highestScoreMap.set(key, attempt);
        }
      });

      const highestScoreAttempts = Array.from(highestScoreMap.values())
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
      
      setExamAttempts(highestScoreAttempts);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function viewStudentProgress(report: StudentProgressReport) {
    setSelectedStudent(report);
    setLoadingLessons(true);

    const { data: progressData } = await supabase
      .from("student_progress")
      .select(`
        id,
        completed_at,
        file:files(id, name, folder_id)
      `)
      .eq("student_id", report.student.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false });

    const { data: foldersData } = await supabase
      .from("folders")
      .select("id, name, parent_id");

    const localFolderMap = new Map(foldersData?.map(f => [f.id, f]) || []);
    
    function getFolderPath(folderId: string | null): string {
      if (!folderId) return "Root";
      const parts: string[] = [];
      let currentId: string | null = folderId;
      while (currentId) {
        const folder = localFolderMap.get(currentId);
        if (folder) {
          parts.unshift(folder.name);
          currentId = folder.parent_id;
        } else {
          break;
        }
      }
      return parts.join(" / ") || "Root";
    }

    // Get descendant folder IDs for filtering
    function getLocalDescendantFolderIds(folderId: string): string[] {
      const descendants: string[] = [folderId];
      const queue = [folderId];
      while (queue.length > 0) {
        const currentId = queue.shift()!;
        localFolderMap.forEach((folder, id) => {
          if (folder.parent_id === currentId && !descendants.includes(id)) {
            descendants.push(id);
            queue.push(id);
          }
        });
      }
      return descendants;
    }

    // Filter lessons based on selected folder
    const includedFolderIds = selectedFolderId === "all" 
      ? null 
      : getLocalDescendantFolderIds(selectedFolderId);

    const lessons: CompletedLesson[] = (progressData || [])
      .filter(p => {
        if (!p.file) return false;
        // If no folder filter, include all
        if (!includedFolderIds) return true;
        // Check if file's folder is in the included folders
        const fileFolderId = (p.file as any).folder_id;
        return fileFolderId && includedFolderIds.includes(fileFolderId);
      })
      .map(p => ({
        id: p.id,
        file_name: (p.file as any).name,
        folder_path: getFolderPath((p.file as any).folder_id),
        completed_at: p.completed_at,
      }));

    setCompletedLessonsList(lessons);
    setLoadingLessons(false);
  }

  async function viewAttemptDetails(attempt: ExamAttemptWithDetails) {
    setSelectedAttempt(attempt);
    setLoadingDetails(true);

    const { data: questions } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", attempt.exam_id)
      .order("created_at");

    const details: QuestionDetail[] = (questions || []).map(q => {
      const studentAnswer = attempt.answers[q.id] || "";
      let selectedOption = "";
      if (studentAnswer === q.option_a) selectedOption = "A";
      else if (studentAnswer === q.option_b) selectedOption = "B";
      else if (studentAnswer === q.option_c) selectedOption = "C";
      else if (studentAnswer === q.option_d) selectedOption = "D";
      
      return {
        id: q.id,
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        student_answer: selectedOption,
        is_correct: selectedOption === q.correct_answer,
      };
    });

    setQuestionDetails(details);
    setLoadingDetails(false);
  }

  // Helper function to get all descendant folder IDs
  function getDescendantFolderIds(folderId: string): string[] {
    const descendants: string[] = [folderId];
    const queue = [folderId];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      folderMap.forEach((folder, id) => {
        if (folder.parent_id === currentId && !descendants.includes(id)) {
          descendants.push(id);
          queue.push(id);
        }
      });
    }
    return descendants;
  }

  // Calculate filtered progress based on folder selection
  const filteredProgressByFolder = progressReports.map(report => {
    if (selectedFolderId === "all") {
      return report;
    }

    // Get all folder IDs that should be included (selected folder + descendants)
    const includedFolderIds = getDescendantFolderIds(selectedFolderId);

    // Filter files to only those in the selected folder hierarchy
    const filteredFiles = allFiles.filter(f => 
      f.folder_id && includedFolderIds.includes(f.folder_id)
    );
    const filteredFileIds = new Set(filteredFiles.map(f => f.id));

    // Count completed files in the filtered set
    const completedInFolder = allProgressRecords.filter(
      p => p.student_id === report.student.id && filteredFileIds.has(p.file_id)
    ).length;

    const totalInFolder = filteredFiles.length;

    return {
      ...report,
      completedLessons: completedInFolder,
      totalLessons: totalInFolder,
      progressPercentage: totalInFolder ? Math.round((completedInFolder / totalInFolder) * 100) : 0,
    };
  });

  const filteredProgress = filteredProgressByFolder.filter(
    (r) =>
      r.student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredExams = examAttempts.filter(
    (r) =>
      r.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.exam_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Search and Tabs for detailed reports */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students or exams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filter by folder..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Folders</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  <span style={{ paddingLeft: `${folder.depth * 12}px` }}>
                    {folder.depth > 0 ? "└ " : ""}{folder.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="progress">Lesson Progress</TabsTrigger>
          <TabsTrigger value="exams">Exam Results</TabsTrigger>
        </TabsList>

        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>Student Progress</CardTitle>
              <CardDescription>Track lesson completion for all students</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProgress.map((report) => (
                    <TableRow key={report.student.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.student.full_name || "Unnamed"}</p>
                          <p className="text-sm text-muted-foreground">{report.student.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{report.completedLessons}</TableCell>
                      <TableCell>{report.totalLessons}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${report.progressPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm">{report.progressPercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewStudentProgress(report)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams">
          <Card>
            <CardHeader>
              <CardTitle>Exam Results</CardTitle>
              <CardDescription>Showing highest score per student for each exam</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((attempt) => {
                    const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
                    return (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{attempt.student_name}</p>
                            <p className="text-sm text-muted-foreground">{attempt.student_email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{attempt.exam_title}</TableCell>
                        <TableCell>{attempt.score}/{attempt.total_questions}</TableCell>
                        <TableCell>
                          <Badge variant={percentage >= 70 ? "default" : percentage >= 50 ? "secondary" : "destructive"}>
                            {percentage}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(attempt.completed_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewAttemptDetails(attempt)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredExams.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No exam results found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Student Progress Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Completed Lessons: {selectedStudent?.student.full_name || "Student"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedStudent?.completedLessons} of {selectedStudent?.totalLessons} lessons completed ({selectedStudent?.progressPercentage}%)
            </p>
          </DialogHeader>

          {loadingLessons ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-8 h-8 text-blue-600" />
            </div>
          ) : completedLessonsList.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No completed lessons found
            </p>
          ) : (
            <div className="space-y-2 mt-4">
              {completedLessonsList.map((lesson) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 border-green-200"
                >
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{lesson.file_name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <FolderOpen className="h-3 w-3" />
                      <span className="truncate">{lesson.folder_path}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(lesson.completed_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Exam Details Dialog */}
      <Dialog open={!!selectedAttempt} onOpenChange={() => setSelectedAttempt(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Exam Results: {selectedAttempt?.exam_title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Student: {selectedAttempt?.student_name} | Score: {selectedAttempt?.score}/{selectedAttempt?.total_questions} ({selectedAttempt ? Math.round((selectedAttempt.score / selectedAttempt.total_questions) * 100) : 0}%)
            </p>
          </DialogHeader>

          {loadingDetails ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="w-8 h-8 text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {questionDetails.map((q, index) => (
                <div
                  key={q.id}
                  className={`p-4 rounded-lg border ${
                    q.is_correct ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {q.is_correct ? (
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        {index + 1}. {q.question}
                      </p>
                      <div className="grid gap-1 text-sm">
                        {[
                          { key: "A", value: q.option_a },
                          { key: "B", value: q.option_b },
                          { key: "C", value: q.option_c },
                          { key: "D", value: q.option_d },
                        ].filter(opt => opt.value).map((opt) => {
                          const isCorrect = opt.key === q.correct_answer;
                          const isStudentAnswer = opt.key === q.student_answer;
                          return (
                            <div
                              key={opt.key}
                              className={`p-2 rounded ${
                                isCorrect
                                  ? "bg-green-100 text-green-800 font-medium"
                                  : isStudentAnswer && !isCorrect
                                  ? "bg-red-100 text-red-800"
                                  : "bg-white"
                              }`}
                            >
                              <span className="font-semibold">{opt.key}.</span> {opt.value}
                              {isCorrect && " (Correct)"}
                              {isStudentAnswer && !isCorrect && " (Student's answer)"}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
