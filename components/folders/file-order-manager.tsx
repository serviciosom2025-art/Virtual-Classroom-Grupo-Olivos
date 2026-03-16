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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GripVertical, FileText, Video, Presentation, Link2, Lock, Unlock } from "lucide-react";
import type { FileItem, Folder } from "@/lib/types";

interface FileOrderManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  folderName: string;
  files: FileItem[];
  sequentialOrder: boolean;
  onSave: () => void;
}

export function FileOrderManager({
  open,
  onOpenChange,
  folderId,
  folderName,
  files,
  sequentialOrder,
  onSave,
}: FileOrderManagerProps) {
  const [orderedFiles, setOrderedFiles] = useState<FileItem[]>([]);
  const [isSequential, setIsSequential] = useState(sequentialOrder);
  const [saving, setSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    // Sort files by position initially
    const sorted = [...files].sort((a, b) => (a.position || 0) - (b.position || 0));
    setOrderedFiles(sorted);
    setIsSequential(sequentialOrder);
  }, [files, sequentialOrder, open]);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4 text-blue-500" />;
      case "external_video":
        return <Link2 className="h-4 w-4 text-purple-500" />;
      case "pdf":
        return <FileText className="h-4 w-4 text-red-500" />;
      case "powerpoint":
        return <Presentation className="h-4 w-4 text-orange-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newFiles = [...orderedFiles];
    const [draggedFile] = newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);
    
    setOrderedFiles(newFiles);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveFile = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= orderedFiles.length) return;

    const newFiles = [...orderedFiles];
    [newFiles[fromIndex], newFiles[toIndex]] = [newFiles[toIndex], newFiles[fromIndex]];
    setOrderedFiles(newFiles);
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    try {
      // Update folder sequential_order setting
      await supabase
        .from("folders")
        .update({ sequential_order: isSequential })
        .eq("id", folderId);

      // Update file positions
      const updates = orderedFiles.map((file, index) => ({
        id: file.id,
        position: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from("files")
          .update({ position: update.position })
          .eq("id", update.id);
      }

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving file order:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage File Order</DialogTitle>
          <DialogDescription>
            Organize files in "{folderName}". Drag files to reorder them.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Sequential Order Toggle */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              {isSequential ? (
                <Lock className="h-4 w-4 text-amber-500" />
              ) : (
                <Unlock className="h-4 w-4 text-slate-500" />
              )}
              <div>
                <Label htmlFor="sequential-order" className="font-medium">
                  Sequential Order
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isSequential
                    ? "Students must complete files in order"
                    : "Students can view files in any order"}
                </p>
              </div>
            </div>
            <Switch
              id="sequential-order"
              checked={isSequential}
              onCheckedChange={setIsSequential}
            />
          </div>

          {/* File List */}
          {orderedFiles.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No files in this folder
            </p>
          ) : (
            <div className="space-y-1 max-h-[300px] overflow-y-auto">
              {orderedFiles.map((file, index) => (
                <div
                  key={file.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-2 p-2 rounded-lg border bg-background cursor-grab active:cursor-grabbing
                    transition-all duration-150
                    ${draggedIndex === index ? "opacity-50 scale-95" : ""}
                    ${dragOverIndex === index ? "border-primary border-2 bg-primary/5" : "border-border"}
                  `}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-600">
                    {index + 1}
                  </span>
                  {getFileIcon(file.type)}
                  <span className="flex-1 text-sm truncate">{file.name}</span>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveFile(index, "up")}
                      disabled={index === 0}
                    >
                      <span className="text-xs">↑</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveFile(index, "down")}
                      disabled={index === orderedFiles.length - 1}
                    >
                      <span className="text-xs">↓</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
