"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle2, Clock, BookOpen, FileText, Video, Presentation, Award } from "lucide-react"
import type { StudentProgress, ExamResult, File, Folder } from "@/lib/types"

interface ProgressWithDetails extends StudentProgress {
  file?: File
  folder?: Folder
}

interface ExamResultWithDetails extends ExamResult {
  exam?: {
    title: string
    folder?: Folder
  }
}

export default function StudentProgressPage() {
  const { user } = useAuth()
  const [progress, setProgress] = useState<ProgressWithDetails[]>([])
  const [examResults, setExamResults] = useState<ExamResultWithDetails[]>([])
  const [totalFiles, setTotalFiles] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadProgress()
    }
  }, [user])

  async function loadProgress() {
    const supabase = createClient()

    // Load student progress
    const { data: progressData } = await supabase
      .from("student_progress")
      .select(`
        *,
        file:files(*),
        folder:folders(*)
      `)
      .eq("student_id", user!.id)
      .order("completed_at", { ascending: false })

    // Load total files count
    const { count } = await supabase
      .from("files")
      .select("*", { count: "exact", head: true })

    // Load exam results
    const { data: resultsData } = await supabase
      .from("exam_results")
      .select(`
        *,
        exam:exams(
          title,
          folder:folders(*)
        )
      `)
      .eq("student_id", user!.id)
      .order("completed_at", { ascending: false })

    setProgress(progressData || [])
    setTotalFiles(count || 0)
    setExamResults(resultsData || [])
    setLoading(false)
  }

  const completedLessons = progress.filter(p => p.status === "completed").length
  const progressPercentage = totalFiles > 0 ? Math.round((completedLessons / totalFiles) * 100) : 0

  const getFileIcon = (file?: { type?: string; external_url?: string | null; name?: string }) => {
    const type = file?.type;
    const url = file?.external_url || "";
    const name = (file?.name || "").toLowerCase();
    
    // Handle Google Drive documents - detect PPT vs PDF
    if (type === "google_drive_document") {
      const isPPT = url.includes("/presentation/") || 
                    url.includes("docs.google.com/presentation") ||
                    name.endsWith(".pptx") || 
                    name.endsWith(".ppt");
      const isPDF = (url.includes("/file/d/") && !isPPT) ||
                    name.endsWith(".pdf");
      
      if (isPPT) {
        return <Presentation className="h-4 w-4 text-orange-500" />;
      } else if (isPDF) {
        return <FileText className="h-4 w-4 text-red-500" />;
      }
      return <FileText className="h-4 w-4 text-green-500" />;
    }
    
    switch (type) {
      case "video": return <Video className="h-4 w-4 text-purple-500" />
      case "external_video": return <Video className="h-4 w-4 text-indigo-500" />
      case "pdf": return <FileText className="h-4 w-4 text-red-500" />
      case "powerpoint": return <Presentation className="h-4 w-4 text-orange-500" />
      default: return <BookOpen className="h-4 w-4" />
    }
  }

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
        <h1 className="text-3xl font-bold tracking-tight">My Progress</h1>
        <p className="text-muted-foreground">Track your learning journey and achievements</p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Course Progress</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progressPercentage}%</div>
            <Progress value={progressPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {completedLessons} of {totalFiles} lessons completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Lessons</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedLessons}</div>
            <p className="text-xs text-muted-foreground">Total lessons completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exams Taken</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{examResults.length}</div>
            <p className="text-xs text-muted-foreground">Total exams completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {examResults.length > 0
                ? Math.round(
                    examResults.reduce((acc, r) => acc + (r.highest_score / r.total_questions) * 100, 0) /
                    examResults.length
                  )
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Based on highest scores</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="lessons" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lessons">Lesson Progress</TabsTrigger>
          <TabsTrigger value="exams">Exam Results</TabsTrigger>
        </TabsList>

        <TabsContent value="lessons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Lessons</CardTitle>
              <CardDescription>Your learning history</CardDescription>
            </CardHeader>
            <CardContent>
              {progress.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No lessons completed yet. Start learning to track your progress!
                </p>
              ) : (
                <div className="space-y-4">
                  {progress.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          {getFileIcon(item.file)}
                        </div>
                        <div>
                          <p className="font-medium">{item.file?.name || "Unknown Lesson"}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.folder?.name || "Unknown Folder"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={item.status === "completed" ? "default" : "secondary"}>
                          {item.status === "completed" ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" /> Pending</>
                          )}
                        </Badge>
                        {item.completed_at && (
                          <span className="text-sm text-muted-foreground">
                            {new Date(item.completed_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exam Results</CardTitle>
              <CardDescription>Your exam performance history</CardDescription>
            </CardHeader>
            <CardContent>
              {examResults.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No exams taken yet. Complete exams to see your results here!
                </p>
              ) : (
                <div className="space-y-4">
                  {examResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <Award className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">{result.exam?.title || "Unknown Exam"}</p>
                          <p className="text-sm text-muted-foreground">
                            {result.exam?.folder?.name || "General"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {result.highest_score}/{result.total_questions}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {Math.round((result.highest_score / result.total_questions) * 100)}%
                          </p>
                        </div>
                        <Badge variant="outline">
                          {result.attempts_used} attempt{result.attempts_used !== 1 ? "s" : ""}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(result.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
