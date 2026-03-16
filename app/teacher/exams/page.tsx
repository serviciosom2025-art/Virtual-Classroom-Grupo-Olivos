"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, FileQuestion, Settings, Users, Lock } from "lucide-react"
import Link from "next/link"
import { ExamPermissionsDialog } from "@/components/exams/exam-permissions-dialog"
import type { Exam, Folder } from "@/lib/types"

interface ExamWithDetails extends Exam {
  folder?: Folder
  questionCount?: number
}

export default function TeacherExamsPage() {
  const { user } = useAuth()
  const [exams, setExams] = useState<ExamWithDetails[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [selectedExamForPermissions, setSelectedExamForPermissions] = useState<ExamWithDetails | null>(null)
  
  const [newExam, setNewExam] = useState({
    title: "",
    description: "",
    folder_id: "",
    max_attempts: 3,
    questions_count: 10,
    randomize_questions: true,
    randomize_answers: true,
  })

  useEffect(() => {
    loadExams()
  }, [user])

  async function loadExams() {
    const supabase = createClient()

    // Load teacher's exams
    const { data: examsData } = await supabase
      .from("exams")
      .select(`
        *,
        folder:folders(*)
      `)
      .eq("created_by", user!.id)
      .order("created_at", { ascending: false })

    // Load question counts
    const examsWithCounts: ExamWithDetails[] = []
    for (const exam of examsData || []) {
      const { count } = await supabase
        .from("questions")
        .select("*", { count: "exact", head: true })
        .eq("exam_id", exam.id)

      examsWithCounts.push({
        ...exam,
        questionCount: count || 0,
      })
    }

    // Load folders
    const { data: foldersData } = await supabase
      .from("folders")
      .select("*")
      .order("name")

    setExams(examsWithCounts)
    setFolders(foldersData || [])
    setLoading(false)
  }

  const handleCreateExam = async () => {
    if (!newExam.title.trim()) return

    const supabase = createClient()
    const { error } = await supabase.from("exams").insert({
      ...newExam,
      folder_id: newExam.folder_id || null,
      created_by: user!.id,
    })

    if (!error) {
      setNewExam({
        title: "",
        description: "",
        folder_id: "",
        max_attempts: 3,
        questions_count: 10,
        randomize_questions: true,
        randomize_answers: true,
      })
      setDialogOpen(false)
      loadExams()
    }
  }

  const handleDeleteExam = async (examId: string) => {
    if (!confirm("Are you sure you want to delete this exam?")) return

    const supabase = createClient()
    await supabase.from("exams").delete().eq("id", examId)
    loadExams()
  }

  const handleToggleActive = async (examId: string, isActive: boolean) => {
    const supabase = createClient()
    await supabase
      .from("exams")
      .update({ is_active: !isActive })
      .eq("id", examId)
    loadExams()
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exams</h1>
          <p className="text-muted-foreground">Create and manage your exams</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Exam</DialogTitle>
              <DialogDescription>Set up a new exam for your students</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Field>
                <FieldLabel>Exam Title</FieldLabel>
                <Input
                  value={newExam.title}
                  onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                  placeholder="Enter exam title"
                />
              </Field>
              <Field>
                <FieldLabel>Description (Optional)</FieldLabel>
                <Input
                  value={newExam.description}
                  onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                  placeholder="Brief description"
                />
              </Field>
              <Field>
                <FieldLabel>Folder (Optional)</FieldLabel>
                <Select
                  value={newExam.folder_id || "none"}
                  onValueChange={(v) => setNewExam({ ...newExam, folder_id: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Max Attempts</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    value={newExam.max_attempts}
                    onChange={(e) => setNewExam({ ...newExam, max_attempts: parseInt(e.target.value) || 1 })}
                  />
                </Field>
                <Field>
                  <FieldLabel>Questions to Show</FieldLabel>
                  <Input
                    type="number"
                    min="1"
                    value={newExam.questions_count}
                    onChange={(e) => setNewExam({ ...newExam, questions_count: parseInt(e.target.value) || 1 })}
                  />
                </Field>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newExam.randomize_questions}
                    onCheckedChange={(v) => setNewExam({ ...newExam, randomize_questions: v })}
                  />
                  <Label>Randomize question order</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newExam.randomize_answers}
                    onCheckedChange={(v) => setNewExam({ ...newExam, randomize_answers: v })}
                  />
                  <Label>Randomize answer order</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateExam}>Create Exam</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No exams yet</h3>
            <p className="text-muted-foreground mb-4">Create your first exam to get started</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card key={exam.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {exam.title}
                      {exam.is_restricted && <Lock className="h-4 w-4 text-amber-500" />}
                    </CardTitle>
                    <CardDescription>{exam.folder?.name || "No folder"}</CardDescription>
                  </div>
                  <Badge variant={exam.is_active ? "default" : "secondary"}>
                    {exam.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Questions in bank:</span>
                    <span className="font-medium">{exam.questionCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Questions shown:</span>
                    <span className="font-medium">{exam.questions_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max attempts:</span>
                    <span className="font-medium">{exam.max_attempts}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" asChild>
                    <Link href={`/teacher/exams/${exam.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    title="Manage Access"
                    onClick={() => {
                      setSelectedExamForPermissions(exam)
                      setPermissionsDialogOpen(true)
                    }}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(exam.id, exam.is_active)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteExam(exam.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Exam Permissions Dialog */}
      {selectedExamForPermissions && (
        <ExamPermissionsDialog
          open={permissionsDialogOpen}
          onOpenChange={setPermissionsDialogOpen}
          examId={selectedExamForPermissions.id}
          examTitle={selectedExamForPermissions.title}
          isRestricted={selectedExamForPermissions.is_restricted || false}
          onSave={loadExams}
        />
      )}
    </div>
  )
}
