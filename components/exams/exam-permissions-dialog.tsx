"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Search, Users, Lock, Unlock } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  email: string;
}

interface ExamPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examTitle: string;
  isRestricted: boolean;
  onSave: () => void;
}

export function ExamPermissionsDialog({
  open,
  onOpenChange,
  examId,
  examTitle,
  isRestricted: initialIsRestricted,
  onSave,
}: ExamPermissionsDialogProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isRestricted, setIsRestricted] = useState(initialIsRestricted);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all students
      const { data: studentsData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "student")
        .order("full_name");

      // Fetch current permissions for this exam
      const { data: permissionsData } = await supabase
        .from("exam_permissions")
        .select("student_id")
        .eq("exam_id", examId);

      setStudents(studentsData || []);
      
      const permittedIds = new Set(permissionsData?.map(p => p.student_id) || []);
      setSelectedStudents(permittedIds);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (open) {
      setIsRestricted(initialIsRestricted);
      fetchData();
    }
  }, [open, fetchData, initialIsRestricted]);

  const handleToggleStudent = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update exam restriction status
      await supabase
        .from("exams")
        .update({ is_restricted: isRestricted })
        .eq("id", examId);

      // Delete existing permissions
      await supabase
        .from("exam_permissions")
        .delete()
        .eq("exam_id", examId);

      // Insert new permissions if restricted
      if (isRestricted && selectedStudents.size > 0) {
        const permissions = Array.from(selectedStudents).map(studentId => ({
          exam_id: examId,
          student_id: studentId,
        }));

        await supabase.from("exam_permissions").insert(permissions);
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving permissions:", error);
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Manage Exam Access
          </DialogTitle>
          <DialogDescription>
            Configure which students can see and take the exam: <strong>{examTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Restriction Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {isRestricted ? (
                <Lock className="w-5 h-5 text-amber-500" />
              ) : (
                <Unlock className="w-5 h-5 text-green-500" />
              )}
              <div>
                <p className="font-medium text-sm">
                  {isRestricted ? "Restricted Access" : "Public Access"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isRestricted
                    ? "Only selected students can see this exam"
                    : "All students can see this exam"}
                </p>
              </div>
            </div>
            <Switch
              checked={isRestricted}
              onCheckedChange={setIsRestricted}
            />
          </div>

          {/* Student Selection (only shown when restricted) */}
          {isRestricted && (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Select All */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedStudents.size} of {students.length} students selected
                </span>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedStudents.size === filteredStudents.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              {/* Student List */}
              <div className="max-h-64 overflow-y-auto border rounded-lg">
                {loading ? (
                  <div className="flex items-center justify-center p-8">
                    <Spinner className="w-6 h-6" />
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No students found
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredStudents.map(student => (
                      <label
                        key={student.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedStudents.has(student.id)}
                          onCheckedChange={() => handleToggleStudent(student.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {student.full_name || "Unnamed"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {student.email}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Spinner className="w-4 h-4 mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
