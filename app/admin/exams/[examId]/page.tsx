"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  AlertCircle,
} from "lucide-react";
import type { Exam, Question } from "@/lib/types";
import Link from "next/link";

export default function ExamEditPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form state
  const [formQuestion, setFormQuestion] = useState({
    question: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A" as "A" | "B" | "C" | "D",
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [examRes, questionsRes] = await Promise.all([
      supabase.from("exams").select("*").eq("id", examId).single(),
      supabase.from("questions").select("*").eq("exam_id", examId).order("created_at"),
    ]);

    if (examRes.error) {
      router.push("/admin/exams");
      return;
    }

    setExam(examRes.data);
    setQuestions(questionsRes.data || []);
    setLoading(false);
  }, [examId, router, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormQuestion({
      question: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
    });
    setEditingQuestion(null);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editingQuestion) {
      // Update existing question
      const { error } = await supabase
        .from("questions")
        .update({
          question: formQuestion.question,
          option_a: formQuestion.option_a,
          option_b: formQuestion.option_b,
          option_c: formQuestion.option_c,
          option_d: formQuestion.option_d,
          correct_answer: formQuestion.correct_answer,
        })
        .eq("id", editingQuestion.id);

      if (!error) {
        setAddDialogOpen(false);
        resetForm();
        fetchData();
      }
    } else {
      // Add new question
      const { error } = await supabase.from("questions").insert({
        exam_id: examId,
        ...formQuestion,
      });

      if (!error) {
        // Update question count
        await supabase
          .from("exams")
          .update({ questions_count: questions.length + 1 })
          .eq("id", examId);

        setAddDialogOpen(false);
        resetForm();
        fetchData();
      }
    }

    setSaving(false);
  };

  const handleEditQuestion = (question: Question) => {
    setFormQuestion({
      question: question.question,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
    });
    setEditingQuestion(question);
    setAddDialogOpen(true);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    const { error } = await supabase.from("questions").delete().eq("id", questionId);

    if (!error) {
      // Update question count
      await supabase
        .from("exams")
        .update({ questions_count: Math.max(0, questions.length - 1) })
        .eq("id", examId);

      fetchData();
    }
  };

  const getAnswerLabel = (answer: string) => {
    switch (answer) {
      case "A":
        return "Option A";
      case "B":
        return "Option B";
      case "C":
        return "Option C";
      case "D":
        return "Option D";
      default:
        return answer;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-slate-500">Exam not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/exams">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{exam.title}</h1>
          <p className="text-slate-600">{exam.description || "No description"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="secondary">{questions.length} questions</Badge>
          <Badge variant="secondary">{exam.max_attempts} attempts allowed</Badge>
          {exam.time_limit && <Badge variant="secondary">{exam.time_limit} min limit</Badge>}
        </div>
        <Dialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            setAddDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingQuestion ? "Edit Question" : "Add New Question"}</DialogTitle>
              <DialogDescription>
                Enter the question and four answer options (A, B, C, D)
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddQuestion} className="space-y-4 mt-4">
              <Field>
                <FieldLabel>Question</FieldLabel>
                <Textarea
                  value={formQuestion.question}
                  onChange={(e) => setFormQuestion({ ...formQuestion, question: e.target.value })}
                  placeholder="Enter your question here..."
                  rows={3}
                  required
                />
              </Field>

              <div className="grid gap-4">
                <Field>
                  <FieldLabel>Option A</FieldLabel>
                  <Input
                    value={formQuestion.option_a}
                    onChange={(e) => setFormQuestion({ ...formQuestion, option_a: e.target.value })}
                    placeholder="Answer option A"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Option B</FieldLabel>
                  <Input
                    value={formQuestion.option_b}
                    onChange={(e) => setFormQuestion({ ...formQuestion, option_b: e.target.value })}
                    placeholder="Answer option B"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Option C</FieldLabel>
                  <Input
                    value={formQuestion.option_c}
                    onChange={(e) => setFormQuestion({ ...formQuestion, option_c: e.target.value })}
                    placeholder="Answer option C"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Option D</FieldLabel>
                  <Input
                    value={formQuestion.option_d}
                    onChange={(e) => setFormQuestion({ ...formQuestion, option_d: e.target.value })}
                    placeholder="Answer option D"
                    required
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel>Correct Answer</FieldLabel>
                <Select
                  value={formQuestion.correct_answer}
                  onValueChange={(value) =>
                    setFormQuestion({ ...formQuestion, correct_answer: value as "A" | "B" | "C" | "D" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Option A</SelectItem>
                    <SelectItem value="B">Option B</SelectItem>
                    <SelectItem value="C">Option C</SelectItem>
                    <SelectItem value="D">Option D</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                  {saving && <Spinner className="w-4 h-4 mr-2" />}
                  <Save className="w-4 h-4 mr-2" />
                  {editingQuestion ? "Update" : "Add"} Question
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {questions.length === 0 ? (
        <Card className="bg-white shadow-sm">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No questions yet</p>
            <p className="text-sm text-slate-400">Add questions to make this exam available to students</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <Card key={question.id} className="bg-white shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <CardTitle className="text-base">{question.question}</CardTitle>
                      <CardDescription className="mt-1">
                        Correct answer: <span className="font-medium text-emerald-600">{getAnswerLabel(question.correct_answer)}</span>
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditQuestion(question)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuestion(question.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      question.correct_answer === "A"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : "bg-slate-50 border border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className="font-medium">A:</span> {question.option_a}
                  </div>
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      question.correct_answer === "B"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : "bg-slate-50 border border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className="font-medium">B:</span> {question.option_b}
                  </div>
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      question.correct_answer === "C"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : "bg-slate-50 border border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className="font-medium">C:</span> {question.option_c}
                  </div>
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      question.correct_answer === "D"
                        ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                        : "bg-slate-50 border border-slate-200 text-slate-700"
                    }`}
                  >
                    <span className="font-medium">D:</span> {question.option_d}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
