"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  FileEdit,
  Trash2,
  Copy,
  ClipboardList,
  Users,
  Lock,
  Pencil,
} from "lucide-react";
import type { Exam, Folder } from "@/lib/types";
import Link from "next/link";
import { ExamPermissionsDialog } from "@/components/exams/exam-permissions-dialog";

export default function ExamsPage() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [selectedExamForPermissions, setSelectedExamForPermissions] = useState<Exam | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [examToRename, setExamToRename] = useState<Exam | null>(null);
  const [newTitle, setNewTitle] = useState("");

  // Form state
  const [newExam, setNewExam] = useState({
    title: "",
    description: "",
    folder_id: "",
    max_attempts: 3,
    time_limit: 30,
    questions_to_show: 10,
    randomize_questions: true,
    randomize_answers: true,
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    try {
      const [examsRes, foldersRes] = await Promise.all([
        supabase.from("exams").select("*").order("created_at", { ascending: false }),
        supabase.from("folders").select("*").order("name"),
      ]);
      setExams(examsRes.data || []);
      setFolders(foldersRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFormLoading(true);

    const { error } = await supabase.from("exams").insert({
      title: newExam.title,
      description: newExam.description,
      folder_id: newExam.folder_id || null,
      created_by: user.id,
      max_attempts: newExam.max_attempts,
      time_limit: newExam.time_limit,
      questions_count: newExam.questions_to_show,
      randomize_questions: newExam.randomize_questions,
      randomize_answers: newExam.randomize_answers,
      is_active: true,
    });

    if (!error) {
      setNewExam({
        title: "",
        description: "",
        folder_id: "",
        max_attempts: 3,
        time_limit: 30,
        questions_to_show: 10,
        randomize_questions: true,
        randomize_answers: true,
      });
      setCreateDialogOpen(false);
      fetchData();
    }
    setFormLoading(false);
  };

  const handleDeleteExam = async (examId: string) => {
    if (actionLoading) return;
    if (!confirm("Are you sure? This will delete the exam and all its questions.")) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.from("exams").delete().eq("id", examId);
      if (!error) {
        await fetchData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (exam: Exam) => {
    if (actionLoading) return;
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("exams")
        .update({ is_active: !exam.is_active })
        .eq("id", exam.id);

      if (!error) {
        await fetchData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenameExam = async () => {
    if (!examToRename || !newTitle.trim() || actionLoading) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("exams")
        .update({ title: newTitle.trim() })
        .eq("id", examToRename.id);

      if (!error) {
        setRenameDialogOpen(false);
        setExamToRename(null);
        setNewTitle("");
        await fetchData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicateExam = async (exam: Exam) => {
    if (!user) return;

    // Get questions for this exam
    const { data: questions } = await supabase
      .from("questions")
      .select("*")
      .eq("exam_id", exam.id);

    // Create new exam
    const { data: newExamData, error: examError } = await supabase
      .from("exams")
      .insert({
        title: `${exam.title} (Copy)`,
        description: exam.description,
        folder_id: exam.folder_id,
        created_by: user.id,
        max_attempts: exam.max_attempts,
        questions_count: exam.questions_count,
        randomize_questions: exam.randomize_questions,
        randomize_answers: exam.randomize_answers,
        time_limit: exam.time_limit,
        is_active: false,
      })
      .select()
      .single();

    if (examError || !newExamData) return;

    // Duplicate questions
    if (questions && questions.length > 0) {
      const newQuestions = questions.map((q) => ({
        exam_id: newExamData.id,
        question: q.question,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
      }));

      await supabase.from("questions").insert(newQuestions);
    }

    fetchData();
  };

  const filteredExams = exams.filter((exam) =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFolderName = (folderId: string | null) => {
    if (!folderId) return "No folder";
    const folder = folders.find((f) => f.id === folderId);
    return folder?.name || "Unknown";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Exam Management</h1>
          <p className="text-slate-600">Create and manage exams for your students</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New Exam</DialogTitle>
              <DialogDescription>
                Set up a new exam with questions and settings
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateExam} className="space-y-4 mt-4">
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={newExam.title}
                  onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                  placeholder="e.g., Week 1 Quiz"
                  required
                />
              </Field>

              <Field>
                <FieldLabel>Description (Optional)</FieldLabel>
                <Textarea
                  value={newExam.description}
                  onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                  placeholder="Brief description of the exam"
                  rows={2}
                />
              </Field>

              <Field>
                <FieldLabel>Folder (Optional)</FieldLabel>
                <Select
                  value={newExam.folder_id || "none"}
                  onValueChange={(value) => setNewExam({ ...newExam, folder_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a folder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No folder</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
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
                    min={1}
                    max={10}
                    value={newExam.max_attempts}
                    onChange={(e) =>
                      setNewExam({ ...newExam, max_attempts: parseInt(e.target.value) || 1 })
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel>Questions to Show</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    value={newExam.questions_to_show}
                    onChange={(e) =>
                      setNewExam({ ...newExam, questions_to_show: parseInt(e.target.value) || 1 })
                    }
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel>Time Limit (minutes)</FieldLabel>
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={newExam.time_limit}
                  onChange={(e) =>
                    setNewExam({ ...newExam, time_limit: parseInt(e.target.value) || 30 })
                  }
                />
              </Field>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={newExam.randomize_questions}
                    onCheckedChange={(checked) =>
                      setNewExam({ ...newExam, randomize_questions: checked })
                    }
                    id="randomize-q"
                  />
                  <Label htmlFor="randomize-q">Randomize question order</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={newExam.randomize_answers}
                    onCheckedChange={(checked) =>
                      setNewExam({ ...newExam, randomize_answers: checked })
                    }
                    id="randomize-a"
                  />
                  <Label htmlFor="randomize-a">Randomize answer order</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={formLoading} className="bg-blue-600 hover:bg-blue-700">
                  {formLoading && <Spinner className="w-4 h-4 mr-2" />}
                  Create Exam
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner className="w-6 h-6 text-blue-600" />
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <p>No exams found</p>
              <p className="text-sm">Create your first exam to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Time Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {exam.title}
                        {exam.is_restricted && <Lock className="h-4 w-4 text-amber-500" />}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {getFolderName(exam.folder_id)}
                    </TableCell>
                    <TableCell>{exam.questions_count}</TableCell>
                    <TableCell>{exam.max_attempts}</TableCell>
                    <TableCell>{exam.time_limit ? `${exam.time_limit} min` : "Unlimited"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={exam.is_active ? "default" : "secondary"}
                        className={exam.is_active ? "bg-emerald-100 text-emerald-700" : ""}
                      >
                        {exam.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/exams/${exam.id}`}>
                              <FileEdit className="w-4 h-4 mr-2" />
                              Edit Questions
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setExamToRename(exam);
                              setNewTitle(exam.title);
                              setRenameDialogOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedExamForPermissions(exam);
                              setPermissionsDialogOpen(true);
                            }}
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Manage Access
                            {exam.is_restricted && <Lock className="w-3 h-3 ml-2 text-amber-500" />}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicateExam(exam)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(exam)}>
                            {exam.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteExam(exam.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Exam Permissions Dialog */}
      {selectedExamForPermissions && (
        <ExamPermissionsDialog
          open={permissionsDialogOpen}
          onOpenChange={setPermissionsDialogOpen}
          examId={selectedExamForPermissions.id}
          examTitle={selectedExamForPermissions.title}
          isRestricted={selectedExamForPermissions.is_restricted || false}
          onSave={fetchData}
        />
      )}

      {/* Rename Exam Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Exam</DialogTitle>
            <DialogDescription>Enter a new name for this exam</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Field>
              <FieldLabel>Exam Title</FieldLabel>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter exam title"
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameExam} disabled={!newTitle.trim()}>
              Rename
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
