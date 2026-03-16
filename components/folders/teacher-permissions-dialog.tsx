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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, Search, Eye, Pencil, Globe, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Profile } from "@/lib/types";

interface TeacherPermission {
  teacher_id: string;
  can_view: boolean;
  can_edit: boolean;
}

interface TeacherPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  isTeacherRestricted?: boolean;
  onSave: () => void;
}

export function TeacherPermissionsDialog({
  open,
  onOpenChange,
  folderId,
  folderName,
  isTeacherRestricted = false,
  onSave,
}: TeacherPermissionsDialogProps) {
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [permissions, setPermissions] = useState<Map<string, TeacherPermission>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [restricted, setRestricted] = useState(isTeacherRestricted);

  const supabase = createClient();

  useEffect(() => {
    if (open) {
      setRestricted(isTeacherRestricted);
      fetchData();
    }
  }, [open, folderId, isTeacherRestricted]);

  const fetchData = async () => {
    setLoading(true);

    // Fetch all teachers
    const { data: teachersData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher")
      .eq("is_active", true)
      .order("full_name");

    // Fetch current permissions for this folder
    const { data: permissionsData } = await supabase
      .from("teacher_folder_permissions")
      .select("teacher_id, can_view, can_edit")
      .eq("folder_id", folderId);

    setTeachers(teachersData || []);
    
    // Build permissions map
    const permMap = new Map<string, TeacherPermission>();
    permissionsData?.forEach((p) => {
      permMap.set(p.teacher_id, {
        teacher_id: p.teacher_id,
        can_view: p.can_view,
        can_edit: p.can_edit,
      });
    });
    setPermissions(permMap);
    setLoading(false);
  };

  const handleToggleView = (teacherId: string) => {
    const newPermissions = new Map(permissions);
    const existing = newPermissions.get(teacherId);
    
    if (existing?.can_view) {
      // If removing view, also remove edit
      newPermissions.delete(teacherId);
    } else {
      // Add view permission
      newPermissions.set(teacherId, {
        teacher_id: teacherId,
        can_view: true,
        can_edit: existing?.can_edit || false,
      });
    }
    setPermissions(newPermissions);
  };

  const handleToggleEdit = (teacherId: string) => {
    const newPermissions = new Map(permissions);
    const existing = newPermissions.get(teacherId);
    
    if (existing?.can_edit) {
      // Remove edit but keep view
      newPermissions.set(teacherId, {
        ...existing,
        can_edit: false,
      });
    } else {
      // Add edit permission (and view if not already set)
      newPermissions.set(teacherId, {
        teacher_id: teacherId,
        can_view: true,
        can_edit: true,
      });
    }
    setPermissions(newPermissions);
  };

  const handleSelectAllView = () => {
    const newPermissions = new Map(permissions);
    const allHaveView = filteredTeachers.every((t) => permissions.get(t.id)?.can_view);
    
    if (allHaveView) {
      // Remove all permissions
      filteredTeachers.forEach((t) => newPermissions.delete(t.id));
    } else {
      // Add view to all
      filteredTeachers.forEach((t) => {
        const existing = newPermissions.get(t.id);
        newPermissions.set(t.id, {
          teacher_id: t.id,
          can_view: true,
          can_edit: existing?.can_edit || false,
        });
      });
    }
    setPermissions(newPermissions);
  };

  const handleSelectAllEdit = () => {
    const newPermissions = new Map(permissions);
    const allHaveEdit = filteredTeachers.every((t) => permissions.get(t.id)?.can_edit);
    
    if (allHaveEdit) {
      // Remove edit from all but keep view
      filteredTeachers.forEach((t) => {
        const existing = newPermissions.get(t.id);
        if (existing) {
          newPermissions.set(t.id, { ...existing, can_edit: false });
        }
      });
    } else {
      // Add edit (and view) to all
      filteredTeachers.forEach((t) => {
        newPermissions.set(t.id, {
          teacher_id: t.id,
          can_view: true,
          can_edit: true,
        });
      });
    }
    setPermissions(newPermissions);
  };

  const handleSave = async () => {
    setSaving(true);

    // Update the folder's is_teacher_restricted status
    await supabase
      .from("folders")
      .update({ is_teacher_restricted: restricted })
      .eq("id", folderId);

    // Delete existing permissions for this folder
    await supabase
      .from("teacher_folder_permissions")
      .delete()
      .eq("folder_id", folderId);

    // Only insert specific permissions if restricted
    if (restricted) {
      const permissionsToInsert = Array.from(permissions.values())
        .filter((p) => p.can_view || p.can_edit)
        .map((p) => ({
          folder_id: folderId,
          teacher_id: p.teacher_id,
          can_view: p.can_view,
          can_edit: p.can_edit,
        }));

      if (permissionsToInsert.length > 0) {
        await supabase.from("teacher_folder_permissions").insert(permissionsToInsert);
      }
    }

    setSaving(false);
    onSave();
    onOpenChange(false);
  };

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const viewCount = Array.from(permissions.values()).filter((p) => p.can_view).length;
  const editCount = Array.from(permissions.values()).filter((p) => p.can_edit).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Teacher Access - {folderName}
          </DialogTitle>
          <DialogDescription>
            Control which teachers can view and/or edit this folder and its contents.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="w-6 h-6" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Restricted Toggle */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3">
                {restricted ? (
                  <Lock className="w-5 h-5 text-amber-500" />
                ) : (
                  <Globe className="w-5 h-5 text-green-500" />
                )}
                <div>
                  <Label className="text-base font-medium">
                    {restricted ? "Restricted Access" : "Public Access"}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {restricted
                      ? "Only selected teachers can access this folder"
                      : "All teachers can view and edit this folder"}
                  </p>
                </div>
              </div>
              <Switch
                checked={restricted}
                onCheckedChange={setRestricted}
              />
            </div>

            {/* Only show teacher selection when restricted */}
            {restricted && (
              <>
                {/* Summary Badges */}
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="gap-1">
                    <Eye className="w-3 h-3" />
                    {viewCount} can view
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Pencil className="w-3 h-3" />
                    {editCount} can edit
                  </Badge>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="text-blue-800">
                    <strong>View:</strong> Teacher can see this folder and its files.
                    <br />
                    <strong>Edit:</strong> Teacher can add, modify, or delete files in this folder.
                  </p>
                  <p className="text-blue-600 mt-1 text-xs">
                    Note: Teachers without any permissions will not see this folder.
                  </p>
                </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search teachers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Header Row */}
            <div className="flex items-center gap-3 pb-2 border-b text-sm font-medium">
              <div className="flex-1">Teacher</div>
              <div className="w-24 text-center flex items-center justify-center gap-1">
                <Checkbox
                  checked={filteredTeachers.length > 0 && filteredTeachers.every((t) => permissions.get(t.id)?.can_view)}
                  onCheckedChange={handleSelectAllView}
                />
                <Eye className="w-4 h-4" />
                View
              </div>
              <div className="w-24 text-center flex items-center justify-center gap-1">
                <Checkbox
                  checked={filteredTeachers.length > 0 && filteredTeachers.every((t) => permissions.get(t.id)?.can_edit)}
                  onCheckedChange={handleSelectAllEdit}
                />
                <Pencil className="w-4 h-4" />
                Edit
              </div>
            </div>

            {/* Teacher List */}
            <ScrollArea className="h-[300px] border rounded-lg">
              {filteredTeachers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No teachers found
                </p>
              ) : (
                <div className="divide-y">
                  {filteredTeachers.map((teacher) => {
                    const perm = permissions.get(teacher.id);
                    return (
                      <div
                        key={teacher.id}
                        className="flex items-center gap-3 p-3 hover:bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {teacher.full_name || "No name"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {teacher.email}
                          </p>
                        </div>
                        <div className="w-24 flex justify-center">
                          <Checkbox
                            checked={perm?.can_view || false}
                            onCheckedChange={() => handleToggleView(teacher.id)}
                          />
                        </div>
                        <div className="w-24 flex justify-center">
                          <Checkbox
                            checked={perm?.can_edit || false}
                            onCheckedChange={() => handleToggleEdit(teacher.id)}
                            disabled={!perm?.can_view}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving && <Spinner className="w-4 h-4 mr-2" />}
            Save Permissions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
