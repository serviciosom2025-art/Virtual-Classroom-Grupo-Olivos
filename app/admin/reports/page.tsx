"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Search, Users, BookOpen, Award, TrendingUp } from "lucide-react"
import type { Profile, ExamAttempt } from "@/lib/types"

interface StudentProgressReport {
  student: Profile
  completedLessons: number
  totalLessons: number
  progressPercentage: number
}

interface ExamResultReport {
  student: Profile
  examTitle: string
  folderName: string
  highestScore: number
  totalQuestions: number
  attemptsUsed: number
  completedAt: string
  attempts: ExamAttempt[]
}

export default function AdminReportsPage() {
  const [progressReports, setProgressReports] = useState<StudentProgressReport[]>([])
  const [examReports, setExamReports] = useState<ExamResultReport[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadReports()
  }, [])

  async function loadReports() {
    const supabase = createClient()

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

    // Load exam attempts directly (this is where exam data is stored)
    const { data: examAttempts } = await supabase
      .from("exam_attempts")
      .select(`
        *,
        student:profiles!exam_attempts_student_id_fkey(*),
        exam:exams(
          title,
          folder:folders(name)
        )
      `)
      .order("completed_at", { ascending: false })

    // Group attempts by student and exam to create reports
    const examData: ExamResultReport[] = []
    const groupedAttempts = new Map<string, {
      student: Profile
      exam: any
      attempts: ExamAttempt[]
      highestScore: number
      totalQuestions: number
      completedAt: string
    }>()

    for (const attempt of examAttempts || []) {
      const key = `${attempt.student_id}-${attempt.exam_id}`
      
      if (!groupedAttempts.has(key)) {
        groupedAttempts.set(key, {
          student: attempt.student,
          exam: attempt.exam,
          attempts: [],
          highestScore: attempt.highest_score || attempt.score || 0,
          totalQuestions: attempt.total_questions || 0,
          completedAt: attempt.completed_at,
        })
      }
      
      const group = groupedAttempts.get(key)!
      group.attempts.push(attempt)
      
      // Track highest score
      const score = attempt.score || attempt.highest_score || 0
      if (score > group.highestScore) {
        group.highestScore = score
      }
    }

    for (const [key, group] of groupedAttempts) {
      examData.push({
        student: group.student,
        examTitle: group.exam?.title || "Unknown Exam",
        folderName: group.exam?.folder?.name || "General",
        highestScore: group.highestScore,
        totalQuestions: group.totalQuestions,
        attemptsUsed: group.attempts.length,
        completedAt: group.completedAt,
        attempts: group.attempts,
      })
    }

    setProgressReports(progressData)
    setExamReports(examData)
    setLoading(false)
  }

  const toggleExpanded = (studentId: string) => {
    const newExpanded = new Set(expandedStudents)
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId)
    } else {
      newExpanded.add(studentId)
    }
    setExpandedStudents(newExpanded)
  }

  const filteredProgress = progressReports.filter(
    (r) =>
      r.student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredExams = examReports.filter(
    (r) =>
      r.student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.examTitle.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Summary statistics
  const totalStudents = progressReports.length
  const averageProgress = progressReports.length > 0
    ? Math.round(progressReports.reduce((acc, r) => acc + r.progressPercentage, 0) / progressReports.length)
    : 0
  const totalExamsTaken = examReports.length
  const averageExamScore = examReports.length > 0
    ? Math.round(
        examReports.reduce((acc, r) => acc + (r.highestScore / r.totalQuestions) * 100, 0) /
        examReports.length
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
              <CardDescription>View all exam attempts and scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredExams.map((report, index) => (
                  <Collapsible
                    key={`${report.student.id}-${report.examTitle}-${index}`}
                    open={expandedStudents.has(`${report.student.id}-${index}`)}
                    onOpenChange={() => toggleExpanded(`${report.student.id}-${index}`)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-4 h-auto"
                        >
                          <div className="flex items-center gap-4 text-left">
                            {expandedStudents.has(`${report.student.id}-${index}`) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <div>
                              <p className="font-medium">
                                {report.student.full_name || "Unnamed"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {report.examTitle} - {report.folderName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant="outline">
                              {report.attemptsUsed} attempt{report.attemptsUsed !== 1 ? "s" : ""}
                            </Badge>
                            <div className="text-right">
                              <p className="font-bold">
                                {report.highestScore}/{report.totalQuestions}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Highest Score
                              </p>
                            </div>
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-4 pt-0 border-t">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Attempt</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Percentage</TableHead>
                                <TableHead>Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {report.attempts.map((attempt) => (
                                <TableRow key={attempt.id}>
                                  <TableCell>Attempt {attempt.attempt_number}</TableCell>
                                  <TableCell>
                                    {attempt.score}/{attempt.total_questions}
                                  </TableCell>
                                  <TableCell>
                                    {Math.round((attempt.score / attempt.total_questions) * 100)}%
                                  </TableCell>
                                  <TableCell>
                                    {new Date(attempt.completed_at).toLocaleString()}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
                {filteredExams.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No exam results found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
