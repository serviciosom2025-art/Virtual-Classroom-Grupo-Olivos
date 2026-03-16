"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { FolderTree } from "@/components/folders/folder-tree";
import { FileViewer } from "@/components/viewers/file-viewer";
import { X, PanelLeftClose, PanelLeft } from "lucide-react";
import type { Folder, FileItem, StudentProgress, FolderPermission } from "@/lib/types";

export default function StudentCoursesPage() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderPanelCollapsed, setFolderPanelCollapsed] = useState(false);

  const supabase = createClient();

  // Filter folders based on permissions - hierarchical filtering
  const filterFoldersForStudent = useCallback((
    allFolders: Folder[],
    allFiles: FileItem[],
    permissions: FolderPermission[]
  ): { filteredFolders: Folder[]; filteredFiles: FileItem[] } => {
    if (!user) return { filteredFolders: [], filteredFiles: [] };

    const permittedFolderIds = new Set(permissions.map(p => p.folder_id));
    
    // Determine which folders the student can directly access
    // A folder is accessible if:
    // 1. It's not restricted (is_restricted = false or null), OR
    // 2. It's restricted AND the student has explicit permission
    const directlyAccessibleFolderIds = new Set<string>();
    
    allFolders.forEach(folder => {
      if (!folder.is_restricted || permittedFolderIds.has(folder.id)) {
        directlyAccessibleFolderIds.add(folder.id);
      }
    });
    
    // Check if a folder has any accessible content (files or accessible subfolders)
    const hasAccessibleContent = (folderId: string): boolean => {
      // Check for files in this folder
      const folderFiles = allFiles.filter(f => f.folder_id === folderId);
      if (folderFiles.length > 0) {
        return true;
      }
      
      // Check children recursively - only accessible children
      const childFolders = allFolders.filter(f => f.parent_id === folderId);
      for (const child of childFolders) {
        // Only consider child if it's directly accessible
        if (directlyAccessibleFolderIds.has(child.id)) {
          if (hasAccessibleContent(child.id)) {
            return true;
          }
        }
      }
      
      return false;
    };
    
    // Build the final set of folders to show
    // A folder is shown if:
    // 1. It's directly accessible, AND
    // 2. It has accessible content OR it's needed as a path to accessible content
    const foldersToShow = new Set<string>();
    
    // First, find all directly accessible folders that have content
    const accessibleWithContent = new Set<string>();
    allFolders.forEach(folder => {
      if (directlyAccessibleFolderIds.has(folder.id) && hasAccessibleContent(folder.id)) {
        accessibleWithContent.add(folder.id);
      }
    });
    
    // Now add these folders and their accessible ancestors
    accessibleWithContent.forEach(folderId => {
      foldersToShow.add(folderId);
      
      // Walk up the tree, only adding ancestors that are accessible
      let currentFolder = allFolders.find(f => f.id === folderId);
      while (currentFolder?.parent_id) {
        const parentId = currentFolder.parent_id;
        // Only add parent if it's accessible (not restricted or has permission)
        if (directlyAccessibleFolderIds.has(parentId)) {
          foldersToShow.add(parentId);
        }
        currentFolder = allFolders.find(f => f.id === parentId);
      }
    });
    
    // Filter folders - only show folders that are both accessible and in foldersToShow
    const filteredFolders = allFolders.filter(folder => 
      foldersToShow.has(folder.id) && directlyAccessibleFolderIds.has(folder.id)
    );
    
    // Filter files - only show files in directly accessible folders
    const filteredFiles = allFiles.filter(file => directlyAccessibleFolderIds.has(file.folder_id));
    
    return { filteredFolders, filteredFiles };
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [foldersRes, filesRes, progressRes, permissionsRes] = await Promise.all([
        supabase.from("folders").select("*").order("name"),
        supabase.from("files").select("*").order("position, name"),
        supabase.from("student_progress").select("*").eq("student_id", user.id),
        supabase.from("folder_permissions").select("*").eq("student_id", user.id),
      ]);

      const allFolders = foldersRes.data || [];
      const allFiles = filesRes.data || [];
      const permissions = permissionsRes.data || [];
      
      // Apply permission filtering
      const { filteredFolders, filteredFiles } = filterFoldersForStudent(allFolders, allFiles, permissions);

      setFolders(filteredFolders);
      setFiles(filteredFiles);
      setProgress(progressRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, filterFoldersForStudent]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkComplete = async () => {
    if (!user || !selectedFile) return;

    const existingProgress = progress.find((p) => p.file_id === selectedFile.id);

    if (existingProgress) {
      await supabase
        .from("student_progress")
        .update({
          status: existingProgress.status === "completed" ? "pending" : "completed",
          completed_at: existingProgress.status === "completed" ? null : new Date().toISOString(),
        })
        .eq("id", existingProgress.id);
    } else {
      await supabase.from("student_progress").insert({
        student_id: user.id,
        file_id: selectedFile.id,
        folder_id: selectedFile.folder_id,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    }

    fetchData();
  };

  const isFileCompleted = (fileId: string) => {
    return progress.some((p) => p.file_id === fileId && p.status === "completed");
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Sidebar - Folder Tree */}
      {!folderPanelCollapsed ? (
        <Card className="w-80 flex-shrink-0 bg-white shadow-sm flex flex-col">
          <CardHeader className="pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Course Materials</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFolderPanelCollapsed(true)}
                title="Collapse folder panel"
              >
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-3">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner className="w-6 h-6 text-blue-600" />
              </div>
            ) : (
              <FolderTree
                folders={folders}
                files={files}
                selectedFolderId={selectedFolderId}
                selectedFileId={selectedFile?.id || null}
                onSelectFolder={setSelectedFolderId}
                onSelectFile={setSelectedFile}
                expandedFolders={expandedFolders}
                onToggleFolder={toggleFolder}
                completedFileIds={new Set(progress.filter(p => p.status === "completed").map(p => p.file_id || ""))}
                isStudentView={true}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="w-12 flex-shrink-0 bg-white shadow-sm">
          <CardContent className="p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFolderPanelCollapsed(false)}
              title="Show folder panel"
            >
              <PanelLeft className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Content - File Viewer */}
      <Card className="flex-1 bg-white shadow-sm overflow-hidden flex flex-col">
        {selectedFile && (
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <span className="font-medium text-sm truncate">{selectedFile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => setSelectedFile(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        <CardContent className="flex-1 h-full p-0 overflow-hidden">
          {selectedFile ? (
            <FileViewer
              file={selectedFile}
              showProgress={true}
              onMarkComplete={handleMarkComplete}
              isCompleted={isFileCompleted(selectedFile.id)}
              canDownload={false}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              <div className="text-center">
                <p className="text-lg font-medium">Select a lesson</p>
                <p className="text-sm">Choose a file from the folder tree to start learning</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
