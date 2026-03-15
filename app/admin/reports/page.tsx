"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Users, BookOpen, Award, TrendingUp, Eye, CheckCircle, XCircle, FileText, FolderOpen } from "lucide-react"
import type { Profile } from "@/lib/types"

interface CompletedLesson {
  id: string
  file_name: string
  folder_path: string
  completed_at: string
}

interface StudentProgressReport {
  student: Profile
  completedLessons: number
  totalLessons: number
  progressPercentage: number
}

interface ExamAttemptWithDetails {
  id: string
  student_id: string
  exam_id: string
  score: number
  total_questions: number
  attempt_number: number
  completed_at: string
  answers: Record<string, string>
  student_name: string
  student_email: string
  exam_title: string
}

interface QuestionDetail {
  id: string
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  student_answer: string
  is_correct: boolean
}

export default function AdminReportsPage() {
  const [progressReports, setProgressReports] = useState<StudentProgressReport[]>([])
  const [examAttempts, setExamAttempts] = useState<ExamAttemptWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedAttempt, setSelectedAttempt] = useState<ExamAttemptWithDetails | null>(null)
  const [questionDetails, setQuestionDetails] = useState<QuestionDetail[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentProgressReport | null>(null)
  const [completedLessonsList, setCompletedLessonsList] = useState<CompletedLesson[]>([])
  const [loadingLessons, setLoadingLessons] = useState(false)

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    const supabase = createClient()

    try {
      // Load all students
      const { data: students } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("full_name")

      // Load total files count
      const { count: totalFiles } = await supabase
        .from("files")
        .select("*", { count: "exact", head: true })

      // Load progress for each student
      const progressData: StudentProgressReport[] = []
      for (const student of students || []) {
        const { count: completedCount } = await supabase
          .from("student_progress")
          .select("*", { count: "exact", head: true })
          .eq("student_id", student.id)
          .eq("status", "completed")

        progressData.push({
          student,
          completedLessons: completedCount || 0,
          totalLessons: totalFiles || 0,
          progressPercentage: totalFiles ? Math.round(((completedCount || 0) / totalFiles) * 100) : 0,
        })
      }

      // Load exam attempts with separate queries for better reliability
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("*")
        .order("completed_at", { ascending: false })

      // Load profiles and exams to join manually
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "student")

      const { data: exams } = await supabase
        .from("exams")
        .select("id, title")

      // Create lookup maps
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])
      const examMap = new Map(exams?.map(e => [e.id, e]) || [])

      // Build exam attempts with details
      const allAttempts: ExamAttemptWithDetails[] = (attempts || []).map(attempt => {
        const profile = profileMap.get(attempt.student_id)
        const exam = examMap.get(attempt.exam_id)
        return {
          id: attempt.id,
          student_id: attempt.student_id,
          exam_id: attempt.exam_id,
          score: attempt.score,
          total_questions: attempt.total_questions,
          attempt_number: attempt.attempt_number,
          completed_at: attempt.completed_at,
          answers: attempt.answers || {},
          student_name: profile?.full_name || "Unknown",
          student_email: profile?.email || "",
          exam_title: exam?.title || "Unknown Exam",
        }
      })

      // Group by student_id + exam_id and keep only the highest score
      const highestScoreMap = new Map<string, ExamAttemptWithDetails>()
      allAttempts.forEach(attempt => {
        const key = `${attempt.student_id}-${attempt.exam_id}`
        const existing = highestScoreMap.get(key)
        if (!existing || attempt.score > existing.score) {
          highestScoreMap.set(key, attempt)
        }
      })

      // Convert map to array and sort by date
      const highestScoreAttempts = Array.from(highestScoreMap.values())
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())

      setProgressReports(progressData)
      setExamAttempts(highestScoreAttempts)
    } catch (error) {
      console.error("Error loading reports:", error)
    } finally {
      setLoading(false)
    }
  }

  async function viewStudentProgress(report: StudentProgressReport) {
    setSelectedStudent(report)
    setLoadingLessons(true)

    const supabase = createClient()
    
    // Load completed lessons for this student with file and folder info
    const { data: progressData } = await supabase
      .from("student_progress")
      .select(`
        id,
        completed_at,
        file:files(id, name, folder_id)
      `)
      .eq("student_id", report.student.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })

    // Load folders to get paths
    const { data: folders } = await supabase
      .from("folders")
      .select("id, name, parent_id")

    // Build folder path lookup
    const folderMap = new Map(folders?.map(f => [f.id, f]) || [])
    
    function getFolderPath(folderId: string | null): string {
      if (!folderId) return "Root"
      const parts: string[] = []
      let currentId: string | null = folderId
      while (currentId) {
        const folder = folderMap.get(currentId)
        if (folder) {
          parts.unshift(folder.name)
          currentId = folder.parent_id
        } else {
          break
        }
      }
      return parts.join(" / ") || "Root"
    }

    const lessons: CompletedLesson[] = (progressData || [])
      .filter(p => p.file)
      .map(p => ({
        id: p.id,
        file_name: (p.file as any).name,
        folder_path: getFolderPath((p.file as any).folder_id),
        completed_at: p.completed_at,
      }))

    setCompletedLessonsList(lessons)
    setLoadingLessons(false)
  }

  async function viewAttemptDetails(attempt: ExamAttemptWithDetails) {
    setSelectedAttempt(attempt)
    setLoadingDetails(true)

    const supabase = createClient()
    
    // Load questions for this exam
    const { data: questions } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", attempt.exam_id)
      .order("created_at")

    // Map questions with student answers
    const details: QuestionDetail[] = (questions || []).map(q => {
      const studentAnswer = attempt.answers[q.id] || ""
      // Determine which option the student selected
      let selectedOption = ""
      if (studentAnswer === q.option_a) selectedOption = "A"
      else if (studentAnswer === q.option_b) selectedOption = "B"
      else if (studentAnswer === q.option_c) selectedOption = "C"
      else if (studentAnswer === q.option_d) selectedOption = "D"
      
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
      }
    })

    setQuestionDetails(details)
    setLoadingDetails(false)
  }

  const filteredProgress = progressReports.filter(
    (r) =>
      r.student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredExams = examAttempts.filter(
    (r) =>
      r.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.exam_title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Summary statistics
  const totalStudents = progressReports.length
  const averageProgress = progressReports.length > 0
    ? Math.round(progressReports.reduce((acc, r) => acc + r.progressPercentage, 0) / progressReports.length)
    : 0
  const totalExamsTaken = examAttempts.length
  const averageExamScore = examAttempts.length > 0
    ? Math.round(
        examAttempts.reduce((acc, r) => acc + (r.score / r.total_questions) * 100, 0) /
        examAttempts.length
      )
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">View student progress and exam results</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageProgress}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exams Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExamsTaken}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Exam Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageExamScore}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students or exams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
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
                    <TableHead>Email</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProgress.map((report) => (
                    <TableRow key={report.student.id}>
                      <TableCell className="font-medium">
                        {report.student.full_name || "Unnamed"}
                      </TableCell>
                      <TableCell>{report.student.email}</TableCell>
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
                    const percentage = Math.round((attempt.score / attempt.total_questions) * 100)
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
                    )
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                          const isCorrect = opt.key === q.correct_answer
                          const isStudentAnswer = opt.key === q.student_answer
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
                          )
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
  )
}
