"use client";

import { useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Folder } from "@/lib/types";

interface FolderOrderManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
  onSave: () => void;
}

export function FolderOrderManager({ open, onOpenChange, folders, onSave }: FolderOrderManagerProps) {
  const [orderedFolders, setOrderedFolders] = useState<Folder[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOrderedFolders([...folders].sort((a, b) => (a.position || 0) - (b.position || 0)));
  }, [folders, open]);

  const moveFolder = (from: number, to: number) => {
    if (to < 0 || to >= orderedFolders.length) return;
    const next = [...orderedFolders];
    [next[from], next[to]] = [next[to], next[from]];
    setOrderedFolders(next);
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    try {
      for (const [index, folder] of orderedFolders.entries()) {
        await supabase.from("folders").update({ position: index + 1 }).eq("id", folder.id);
      }
      onSave();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sort Main Folders</DialogTitle>
          <DialogDescription>Drag the main folders into the order you want them displayed.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[360px] space-y-2 overflow-y-auto py-4">
          {orderedFolders.map((folder, index) => (
            <div
              key={folder.id}
              draggable
              onDragStart={() => setDraggedIndex(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedIndex !== null) moveFolder(draggedIndex, index);
                setDraggedIndex(null);
              }}
              className="flex items-center gap-2 rounded-lg border bg-background p-2"
            >
              <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden="true" />
              <span className="flex-1 truncate text-sm">{folder.name}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => moveFolder(index, index - 1)} disabled={index === 0}>↑</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => moveFolder(index, index + 1)} disabled={index === orderedFolders.length - 1}>↓</Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save order"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

