"use client"

import { useState, useEffect, use } from "react"
import { useAuth } from "@/lib/auth-context"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Edit, Trash2, Save } from "lucide-react"
import Link from "next/link"
import type { Exam, Question, Folder } from "@/lib/types"

export default function TeacherExamEditPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  const [newQuestion, setNewQuestion] = useState({
    question: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A" as "A" | "B" | "C" | "D",
  })

  useEffect(() => {
    loadExam()
  }, [examId])

  async function loadExam() {
    const supabase = createClient()

    const { data: examData } = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single()

    const { data: questionsData } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", examId)
      .order("created_at")

    const { data: foldersData } = await supabase
      .from("folders")
      .select("*")
      .order("name")

    setExam(examData)
    setQuestions(questionsData || [])
    setFolders(foldersData || [])
    setLoading(false)
  }

  const handleSaveExam = async () => {
    if (!exam) return

    setSaving(true)
    const supabase = createClient()

    await supabase
      .from("exams")
      .update({
        title: exam.title,
        description: exam.description,
        folder_id: exam.folder_id,
        max_attempts: exam.max_attempts,
        questions_count: exam.questions_count,
        randomize_questions: exam.randomize_questions,
        randomize_answers: exam.randomize_answers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", examId)

    setSaving(false)
  }

  const handleAddQuestion = async () => {
    if (!newQuestion.question.trim()) return

    const supabase = createClient()

    if (editingQuestion) {
      await supabase
        .from("questions")
        .update({
          question: newQuestion.question,
          option_a: newQuestion.option_a,
          option_b: newQuestion.option_b,
          option_c: newQuestion.option_c,
          option_d: newQuestion.option_d,
          correct_answer: newQuestion.correct_answer,
        })
        .eq("id", editingQuestion.id)
    } else {
      await supabase.from("questions").insert({
        exam_id: examId,
        ...newQuestion,
      })
    }

    resetQuestionForm()
    loadExam()
  }

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question)
    setNewQuestion({
      question: question.question,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
    })
    setQuestionDialogOpen(true)
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return

    const supabase = createClient()
    await supabase.from("questions").delete().eq("id", questionId)
    loadExam()
  }

  const resetQuestionForm = () => {
    setNewQuestion({
      question: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
    })
    setEditingQuestion(null)
    setQuestionDialogOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!exam) {
    return <div>Exam not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/teacher/exams">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Edit Exam</h1>
          <p className="text-muted-foreground">Configure exam settings and manage questions</p>
        </div>
        <Button onClick={handleSaveExam} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Exam Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Settings</CardTitle>
          <CardDescription>Configure how the exam works</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel>Exam Title</FieldLabel>
              <Input
                value={exam.title}
                onChange={(e) => setExam({ ...exam, title: e.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel>Folder</FieldLabel>
              <Select
                value={exam.folder_id || "none"}
                onValueChange={(v) => setExam({ ...exam, folder_id: v === "none" ? null : v })}
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
          </div>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              value={exam.description || ""}
              onChange={(e) => setExam({ ...exam, description: e.target.value })}
              rows={2}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field>
              <FieldLabel>Max Attempts</FieldLabel>
              <Input
                type="number"
                min="1"
                value={exam.max_attempts}
                onChange={(e) => setExam({ ...exam, max_attempts: parseInt(e.target.value) || 1 })}
              />
            </Field>
            <Field>
              <FieldLabel>Questions to Show</FieldLabel>
              <Input
                type="number"
                min="1"
                value={exam.questions_count}
                onChange={(e) => setExam({ ...exam, questions_count: parseInt(e.target.value) || 1 })}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Question Bank</CardTitle>
              <CardDescription>
                {questions.length} question{questions.length !== 1 ? "s" : ""} in bank
              </CardDescription>
            </div>
            <Dialog open={questionDialogOpen} onOpenChange={(open) => {
              if (!open) resetQuestionForm()
              setQuestionDialogOpen(open)
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingQuestion ? "Edit Question" : "Add Question"}</DialogTitle>
                  <DialogDescription>Create a multiple choice question</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Field>
                    <FieldLabel>Question</FieldLabel>
                    <Textarea
                      value={newQuestion.question}
                      onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                      placeholder="Enter the question"
                      rows={3}
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel>Option A</FieldLabel>
                      <Input
                        value={newQuestion.option_a}
                        onChange={(e) => setNewQuestion({ ...newQuestion, option_a: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Option B</FieldLabel>
                      <Input
                        value={newQuestion.option_b}
                        onChange={(e) => setNewQuestion({ ...newQuestion, option_b: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Option C</FieldLabel>
                      <Input
                        value={newQuestion.option_c}
                        onChange={(e) => setNewQuestion({ ...newQuestion, option_c: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Option D</FieldLabel>
                      <Input
                        value={newQuestion.option_d}
                        onChange={(e) => setNewQuestion({ ...newQuestion, option_d: e.target.value })}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel>Correct Answer</FieldLabel>
                    <RadioGroup
                      value={newQuestion.correct_answer}
                      onValueChange={(v) => setNewQuestion({ ...newQuestion, correct_answer: v as "A" | "B" | "C" | "D" })}
                      className="flex gap-4"
                    >
                      {["A", "B", "C", "D"].map((opt) => (
                        <div key={opt} className="flex items-center gap-2">
                          <RadioGroupItem value={opt} id={`correct-${opt}`} />
                          <Label htmlFor={`correct-${opt}`}>{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </Field>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetQuestionForm}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddQuestion}>
                    {editingQuestion ? "Update Question" : "Add Question"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {questions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No questions yet. Add questions to your question bank.
            </p>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium mb-2">
                        {index + 1}. {q.question}
                      </p>
                      <div className="grid gap-1 text-sm">
                        <p className={q.correct_answer === "A" ? "text-green-600 font-medium" : ""}>
                          A) {q.option_a}
                        </p>
                        <p className={q.correct_answer === "B" ? "text-green-600 font-medium" : ""}>
                          B) {q.option_b}
                        </p>
                        <p className={q.correct_answer === "C" ? "text-green-600 font-medium" : ""}>
                          C) {q.option_c}
                        </p>
                        <p className={q.correct_answer === "D" ? "text-green-600 font-medium" : ""}>
                          D) {q.option_d}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEditQuestion(q)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteQuestion(q.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
