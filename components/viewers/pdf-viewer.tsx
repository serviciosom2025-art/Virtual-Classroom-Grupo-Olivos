"use client";

import { useState } from "react";
import { Download, ExternalLink, Maximize2, Minimize2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PDFViewerProps {
  url: string;
  canDownload?: boolean;
}

export function PDFViewer({ url, canDownload = true }: PDFViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Always use Google Docs Viewer for consistent cross-browser support
  // This works for both students and admins
  const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!canDownload) {
      e.preventDefault();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (hasError) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-100 p-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Unable to load PDF</h3>
        <p className="text-slate-600 mb-4 text-center">
          The PDF could not be displayed in the browser.
        </p>
        {canDownload && (
          <Button asChild>
            <a href={url} download>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </a>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div 
      className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'} flex flex-col bg-slate-100`}
      onContextMenu={handleContextMenu}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <span className="text-sm text-slate-600">PDF Document</span>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          {canDownload && (
            <>
              <Button asChild variant="outline" size="sm">
                <a href={url} download>
                  <Download className="w-4 h-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="sm">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PDF Content - Use Google Docs Viewer for all users */}
      <div className="flex-1 overflow-hidden relative">
        <iframe
          src={googleViewerUrl}
          className="absolute inset-0 w-full h-full border-0"
          title="PDF Viewer"
          allow="fullscreen"
          onError={() => setHasError(true)}
        />
        {/* For students - overlay at top to cover Google Viewer's download button */}
        {!canDownload && (
          <div 
            className="absolute top-0 right-0 w-20 h-14 bg-[#f1f3f4]"
            style={{ zIndex: 10 }}
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
      </div>
    </div>
  );
}
