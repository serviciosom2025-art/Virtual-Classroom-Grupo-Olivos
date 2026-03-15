"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { Spinner } from "@/components/ui/spinner";
import { Plus, Trash2, ArrowLeft, Edit2 } from "lucide-react";
import type { Exam, Question } from "@/lib/types";

export default function QuestionsPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
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

    setExam(examRes.data);
    setQuestions(questionsRes.data || []);
    setLoading(false);
  }, [supabase, examId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormData({
      question: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
    });
    setEditingQuestion(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    if (editingQuestion) {
      const { error } = await supabase
        .from("questions")
        .update(formData)
        .eq("id", editingQuestion.id);
      if (!error) {
        resetForm();
        setDialogOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from("questions").insert({
        ...formData,
        exam_id: examId,
      });
      if (!error) {
        resetForm();
        setDialogOpen(false);
        fetchData();
      }
    }
    setFormLoading(false);
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    const { error } = await supabase.from("questions").delete().eq("id", questionId);
    if (!error) {
      fetchData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/exams")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">{exam?.title}</h1>
          <p className="text-slate-600">Manage question bank ({questions.length} questions)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? "Edit Question" : "Add New Question"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <Field>
                <FieldLabel>Question</FieldLabel>
                <Textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Enter your question"
                  rows={3}
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>Option A</FieldLabel>
                  <Input
                    value={formData.option_a}
                    onChange={(e) => setFormData({ ...formData, option_a: e.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Option B</FieldLabel>
                  <Input
                    value={formData.option_b}
                    onChange={(e) => setFormData({ ...formData, option_b: e.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Option C</FieldLabel>
                  <Input
                    value={formData.option_c}
                    onChange={(e) => setFormData({ ...formData, option_c: e.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel>Option D</FieldLabel>
                  <Input
                    value={formData.option_d}
                    onChange={(e) => setFormData({ ...formData, option_d: e.target.value })}
                    required
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel>Correct Answer</FieldLabel>
                <Select
                  value={formData.correct_answer}
                  onValueChange={(value) => setFormData({ ...formData, correct_answer: value as "A" | "B" | "C" | "D" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700">
                  {formLoading && <Spinner className="w-4 h-4 mr-2" />}
                  {editingQuestion ? "Save Changes" : "Add Question"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {questions.length === 0 ? (
        <Card className="bg-white shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">No questions yet. Add your first question to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <Card key={q.id} className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-medium">
                    Question {index + 1}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(q)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(q.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-800 mb-4">{q.question}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "A", value: q.option_a },
                    { label: "B", value: q.option_b },
                    { label: "C", value: q.option_c },
                    { label: "D", value: q.option_d },
                  ].map((option) => (
                    <div
                      key={option.label}
                      className={`p-3 rounded-lg border ${
                        q.correct_answer === option.label
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <span className="font-medium mr-2">{option.label}.</span>
                      {option.value}
                      {q.correct_answer === option.label && (
                        <span className="ml-2 text-emerald-600 text-sm">(Correct)</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
