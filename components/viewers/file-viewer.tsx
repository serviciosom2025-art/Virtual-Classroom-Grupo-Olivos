"use client";

import { VideoPlayer } from "./video-player";
import { PDFViewer } from "./pdf-viewer";
import { PowerPointViewer } from "./powerpoint-viewer";
import { ExternalVideoPlayer } from "./external-video-player";
import { GoogleDriveViewer } from "./google-drive-viewer";
import type { FileItem } from "@/lib/types";

interface FileViewerProps {
  file: FileItem;
  showProgress?: boolean;
  onMarkComplete?: () => void;
  isCompleted?: boolean;
  canDownload?: boolean;
}

export function FileViewer({ file, showProgress, onMarkComplete, isCompleted, canDownload = true }: FileViewerProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <h3 className="font-medium text-slate-800 truncate">{file.name}</h3>
        {showProgress && onMarkComplete && (
          <button
            onClick={onMarkComplete}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isCompleted
                ? "bg-emerald-100 text-emerald-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isCompleted ? "COMPLETED" : "MARK AS COMPLETED"}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {file.type === "video" && <VideoPlayer url={file.file_url} canDownload={canDownload} />}
        {file.type === "pdf" && <PDFViewer url={file.file_url} canDownload={canDownload} />}
        {file.type === "powerpoint" && <PowerPointViewer url={file.file_url} fileName={file.name} canDownload={canDownload} />}
        {file.type === "external_video" && file.external_url && (
          <ExternalVideoPlayer url={file.external_url} title={file.name} />
        )}
        {file.type === "google_drive_document" && file.external_url && (
          <GoogleDriveViewer url={file.external_url} title={file.name} />
        )}
      </div>
    </div>
  );
}
