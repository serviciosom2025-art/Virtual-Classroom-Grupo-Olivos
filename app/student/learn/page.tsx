"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { FolderTree } from "@/components/folders/folder-tree";
import { FileViewer } from "@/components/viewers/file-viewer";
import type { Folder, FileItem, StudentProgress } from "@/lib/types";

function LearnContent() {
  const searchParams = useSearchParams();
  const initialFolderId = searchParams.get("folder");
  const { user } = useAuth();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [progress, setProgress] = useState<StudentProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [foldersRes, filesRes, progressRes] = await Promise.all([
        supabase.from("folders").select("*").order("name"),
        supabase.from("files").select("*").order("name"),
        supabase.from("student_progress").select("*").eq("student_id", user.id),
      ]);

      setFolders(foldersRes.data || []);
      setFiles(filesRes.data || []);
      setProgress(progressRes.data || []);

      // Expand initial folder if specified
      if (initialFolderId) {
        setExpandedFolders(new Set([initialFolderId]));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, initialFolderId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const isFileCompleted = (fileId: string) => {
    return progress.some((p) => p.file_id === fileId && p.status === "completed");
  };

  const handleMarkComplete = async () => {
    if (!selectedFile || !user) return;

    const existingProgress = progress.find((p) => p.file_id === selectedFile.id);

    if (existingProgress) {
      // Update existing progress
      await supabase
        .from("student_progress")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", existingProgress.id);
    } else {
      // Create new progress record
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-6">
      {/* Sidebar - Folder Tree */}
      <Card className="w-80 flex-shrink-0 bg-white shadow-sm flex flex-col">
        <CardHeader className="pb-3 border-b flex-shrink-0">
          <CardTitle className="text-lg">Course Materials</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-3">
          <FolderTree
            folders={folders}
            files={files}
            selectedFolderId={selectedFolderId}
            selectedFileId={selectedFile?.id || null}
            onSelectFolder={setSelectedFolderId}
            onSelectFile={setSelectedFile}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
          />
        </CardContent>
      </Card>

      {/* Main Content - File Viewer */}
      <Card className="flex-1 bg-white shadow-sm overflow-hidden">
        <CardContent className="h-full p-0">
          {selectedFile ? (
            <FileViewer
              file={selectedFile}
              showProgress
              onMarkComplete={handleMarkComplete}
              isCompleted={isFileCompleted(selectedFile.id)}
              canDownload={false}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              <div className="text-center">
                <p className="text-lg font-medium">Select a file to view</p>
                <p className="text-sm">Choose a file from the folder tree on the left</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function StudentLearnPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    }>
      <LearnContent />
    </Suspense>
  );
}
