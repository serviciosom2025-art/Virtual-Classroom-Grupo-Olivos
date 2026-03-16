"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Folder, FolderOpen, FileVideo, FileText, FileSpreadsheet, Link2, Lock, CheckCircle } from "lucide-react";
import type { Folder as FolderType, FileItem } from "@/lib/types";

interface FolderTreeProps {
  folders: FolderType[];
  files: FileItem[];
  selectedFolderId: string | null;
  selectedFileId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onSelectFile: (file: FileItem) => void;
  expandedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  completedFileIds?: Set<string>;
  isStudentView?: boolean;
}

export function FolderTree({
  folders,
  files,
  selectedFolderId,
  selectedFileId,
  onSelectFolder,
  onSelectFile,
  expandedFolders,
  onToggleFolder,
  completedFileIds = new Set(),
  isStudentView = false,
}: FolderTreeProps) {
  // Build folder hierarchy
  const buildTree = (parentId: string | null): FolderType[] => {
    return folders
      .filter((f) => f.parent_id === parentId)
      .map((folder) => ({
        ...folder,
        children: buildTree(folder.id),
        files: files
          .filter((f) => f.folder_id === folder.id)
          .sort((a, b) => (a.position || 0) - (b.position || 0)),
      }));
  };

  // Check if a file is locked due to sequential order
  const isFileLocked = (folder: FolderType, fileIndex: number): boolean => {
    if (!isStudentView || !folder.sequential_order) return false;
    if (!folder.files || folder.files.length === 0) return false;
    
    // Check if all previous files are completed
    for (let i = 0; i < fileIndex; i++) {
      const prevFile = folder.files[i];
      if (!completedFileIds.has(prevFile.id)) {
        return true; // Previous file not completed, this one is locked
      }
    }
    return false;
  };

  const tree = buildTree(null);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "video":
        return <FileVideo className="w-4 h-4 text-purple-500" />;
      case "external_video":
        return <Link2 className="w-4 h-4 text-indigo-500" />;
      case "pdf":
        return <FileText className="w-4 h-4 text-red-500" />;
      case "powerpoint":
        return <FileSpreadsheet className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const renderFolder = (folder: FolderType, depth: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const hasChildren = (folder.children && folder.children.length > 0) || (folder.files && folder.files.length > 0);

    return (
      <div key={folder.id}>
        <div
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
            isSelected ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            onSelectFolder(folder.id);
            if (hasChildren) {
              onToggleFolder(folder.id);
            }
          }}
        >
          {hasChildren ? (
            <ChevronRight
              className={cn(
                "w-4 h-4 text-slate-400 transition-transform flex-shrink-0",
                isExpanded && "rotate-90"
              )}
            />
          ) : (
            <span className="w-4" />
          )}
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-blue-500 flex-shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
          )}
          <span className="truncate text-sm">{folder.name}</span>
        </div>

        {isExpanded && (
          <div>
            {folder.children?.map((child) => renderFolder(child, depth + 1))}
            {folder.files?.map((file, fileIndex) => {
              const locked = isFileLocked(folder, fileIndex);
              const completed = completedFileIds.has(file.id);
              
              return (
                <div
                  key={file.id}
                  className={cn(
                    "flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors",
                    locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                    selectedFileId === file.id ? "bg-blue-100 text-blue-700" : locked ? "" : "hover:bg-slate-100"
                  )}
                  style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
                  onClick={() => !locked && onSelectFile(file)}
                  title={locked ? "Complete previous files first" : undefined}
                >
                  {getFileIcon(file.type)}
                  <span className="truncate text-sm flex-1">{file.name}</span>
                  {isStudentView && locked && (
                    <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  )}
                  {isStudentView && completed && !locked && (
                    <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (tree.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No folders yet. Create one to get started.
      </div>
    );
  }

  return <div className="space-y-0.5">{tree.map((folder) => renderFolder(folder, 0))}</div>;
}
