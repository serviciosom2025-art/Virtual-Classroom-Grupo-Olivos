"use client";

import { useState } from "react";
import { Download, Maximize2, Minimize2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PowerPointViewerProps {
  url: string;
  fileName: string;
  canDownload?: boolean;
}

export function PowerPointViewer({ url, fileName, canDownload = true }: PowerPointViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerError, setViewerError] = useState(false);

  // Use Microsoft Office Online Viewer for PPTX files
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!canDownload) {
      e.preventDefault();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (viewerError) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-100 p-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
        <div className="text-center max-w-md">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">{fileName}</h3>
          <p className="text-slate-600 mb-6">
            Unable to display this presentation in the browser.
            {canDownload ? " You can download it to view locally." : " Please try again later."}
          </p>
          {canDownload && (
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <a href={url} download={fileName}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'} flex flex-col bg-slate-900`}
      onContextMenu={handleContextMenu}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <span className="text-white text-sm truncate max-w-[50%]">{fileName}</span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="text-white hover:bg-white/10"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          {canDownload && (
            <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <a href={url} download={fileName}>
                <Download className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Viewer */}
      <div className="flex-1 relative overflow-hidden">
        <iframe
          src={officeViewerUrl}
          className="absolute inset-0 w-full h-full border-0"
          title={fileName}
          onError={() => setViewerError(true)}
          allow="fullscreen"
        />
        {/* For students - overlay to cover Office viewer's download/menu buttons in bottom right */}
        {!canDownload && (
          <>
            {/* Cover bottom-right menu buttons */}
            <div 
              className="absolute bottom-0 right-0 w-24 h-12 bg-black"
              style={{ zIndex: 10 }}
              onContextMenu={(e) => e.preventDefault()}
            />
          </>
        )}
      </div>
    </div>
  );
}
