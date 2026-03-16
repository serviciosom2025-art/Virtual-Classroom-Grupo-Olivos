"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Lock, Unlock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/lib/types";

interface FolderPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  isRestricted: boolean;
  onSave: () => void;
}

export function FolderPermissionsDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
  isRestricted: initialIsRestricted,
  onSave,
}: FolderPermissionsDialogProps) {
  const [students, setStudents] = useState<Profile[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isRestricted, setIsRestricted] = useState(initialIsRestricted);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, folderId]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all students
    const { data: studentsData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .eq("is_active", true)
      .order("full_name");

    // Fetch current permissions for this folder
    const { data: permissionsData } = await supabase
      .from("folder_permissions")
      .select("student_id")
      .eq("folder_id", folderId);

    // Fetch folder's current restricted status
    const { data: folderData } = await supabase
      .from("folders")
      .select("is_restricted")
      .eq("id", folderId)
      .single();

    setStudents(studentsData || []);
    setSelectedStudents(new Set(permissionsData?.map((p) => p.student_id) || []));
    setIsRestricted(folderData?.is_restricted || false);
    setLoading(false);
  };

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
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleSave = async () => {
    setSaving(true);

    // Update folder's restricted status
    await supabase
      .from("folders")
      .update({ is_restricted: isRestricted })
      .eq("id", folderId);

    // Delete existing permissions
    await supabase.from("folder_permissions").delete().eq("folder_id", folderId);

    // If restricted and students are selected, add new permissions
    if (isRestricted && selectedStudents.size > 0) {
      const permissions = Array.from(selectedStudents).map((studentId) => ({
        folder_id: folderId,
        student_id: studentId,
      }));

      await supabase.from("folder_permissions").insert(permissions);
    }

    setSaving(false);
    onSave();
    onOpenChange(false);
  };

  const filteredStudents = students.filter(
    (student) =>
      student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Manage Access - {folderName}
          </DialogTitle>
          <DialogDescription>
            Control which students can see this folder and its contents.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Restriction Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                {isRestricted ? (
                  <Lock className="w-5 h-5 text-amber-500" />
                ) : (
                  <Unlock className="w-5 h-5 text-green-500" />
                )}
                <div>
                  <p className="font-medium">
                    {isRestricted ? "Restricted Access" : "Public Access"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isRestricted
                      ? "Only selected students can view this folder"
                      : "All students can view this folder"}
                  </p>
                </div>
              </div>
              <Button
                variant={isRestricted ? "default" : "outline"}
                size="sm"
                onClick={() => setIsRestricted(!isRestricted)}
              >
                {isRestricted ? "Make Public" : "Restrict"}
              </Button>
            </div>

            {/* Student Selection (only show when restricted) */}
            {isRestricted && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Select students who can access this folder:
                  </p>
                  <Badge variant="secondary">
                    {selectedStudents.size} of {students.length} selected
                  </Badge>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Select All */}
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    id="select-all"
                    checked={selectedStudents.size === filteredStudents.length && filteredStudents.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select All
                  </label>
                </div>

                {/* Student List */}
                <ScrollArea className="h-[250px] border rounded-lg p-2">
                  {filteredStudents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No students found
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {filteredStudents.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                          onClick={() => handleToggleStudent(student.id)}
                        >
                          <Checkbox
                            checked={selectedStudents.has(student.id)}
                            onCheckedChange={() => handleToggleStudent(student.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {student.full_name || "No name"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {student.email}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {isRestricted && selectedStudents.size === 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                    Warning: No students selected. This folder will be hidden from all students.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Spinner className="w-4 h-4 mr-2" />}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
