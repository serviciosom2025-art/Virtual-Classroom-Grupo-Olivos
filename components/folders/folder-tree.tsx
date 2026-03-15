"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, Folder, FolderOpen, FileVideo, FileText, FileSpreadsheet } from "lucide-react";
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
}: FolderTreeProps) {
  // Build folder hierarchy
  const buildTree = (parentId: string | null): FolderType[] => {
    return folders
      .filter((f) => f.parent_id === parentId)
      .map((folder) => ({
        ...folder,
        children: buildTree(folder.id),
        files: files.filter((f) => f.folder_id === folder.id),
      }));
  };

  const tree = buildTree(null);

  const getFileIcon = (type: string) => {
    switch (type) {
      case "video":
        return <FileVideo className="w-4 h-4 text-purple-500" />;
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
            {folder.files?.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
                  selectedFileId === file.id ? "bg-blue-100 text-blue-700" : "hover:bg-slate-100"
                )}
                style={{ paddingLeft: `${(depth + 1) * 16 + 24}px` }}
                onClick={() => onSelectFile(file)}
              >
                {getFileIcon(file.type)}
                <span className="truncate text-sm">{file.name}</span>
              </div>
            ))}
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
