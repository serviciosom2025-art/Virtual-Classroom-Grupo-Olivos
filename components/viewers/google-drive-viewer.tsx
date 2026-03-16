"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { FileText, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleDriveViewerProps {
  url: string;
  title: string;
}

export function GoogleDriveViewer({ url, title }: GoogleDriveViewerProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // Convert Google Drive sharing link to embed/preview link
      const converted = convertGoogleDriveUrl(url);
      if (converted) {
        setEmbedUrl(converted);
        setError(null);
      } else {
        setError("Could not process the Google Drive link. Please ensure it's a valid sharing link.");
      }
    } catch {
      setError("Invalid Google Drive URL format");
    }
  }, [url]);

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Convert various Google Drive URL formats to embeddable preview URL
  function convertGoogleDriveUrl(originalUrl: string): string | null {
    // Handle different Google Drive URL formats
    
    // Format 1: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    // Format 2: https://drive.google.com/open?id=FILE_ID
    // Format 3: https://docs.google.com/presentation/d/FILE_ID/edit?usp=sharing
    // Format 4: https://docs.google.com/document/d/FILE_ID/edit?usp=sharing

    let fileId: string | null = null;

    // Try to extract file ID from different URL patterns
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,           // /file/d/FILE_ID
      /\/presentation\/d\/([a-zA-Z0-9_-]+)/,   // /presentation/d/FILE_ID
      /\/document\/d\/([a-zA-Z0-9_-]+)/,       // /document/d/FILE_ID
      /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/,   // /spreadsheets/d/FILE_ID
      /[?&]id=([a-zA-Z0-9_-]+)/,               // ?id=FILE_ID or &id=FILE_ID
    ];

    for (const pattern of patterns) {
      const match = originalUrl.match(pattern);
      if (match) {
        fileId = match[1];
        break;
      }
    }

    if (!fileId) {
      return null;
    }

    // Determine if it's a Google Docs/Slides/Sheets or a regular file
    if (originalUrl.includes("docs.google.com/presentation")) {
      // Google Slides - use embed URL with rm=minimal to hide branding
      return `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000&rm=minimal`;
    } else if (originalUrl.includes("docs.google.com/document")) {
      // Google Docs - use preview URL
      return `https://docs.google.com/document/d/${fileId}/preview?rm=minimal`;
    } else if (originalUrl.includes("docs.google.com/spreadsheets")) {
      // Google Sheets - use preview URL
      return `https://docs.google.com/spreadsheets/d/${fileId}/preview?rm=minimal`;
    } else {
      // Regular file (PDF, PPTX, etc.) - use preview URL that prevents download
      return `https://drive.google.com/file/d/${fileId}/preview?rm=minimal`;
    }
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-100">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <FileText className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Unable to Load Document</h3>
          <p className="text-sm text-slate-500 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Fullscreen overlay - rendered via Portal to escape parent overflow:hidden
  const fullscreenOverlay = isFullscreen ? createPortal(
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header with title and collapse button - always on top */}
      <div className="flex-shrink-0 h-14 bg-slate-900 flex items-center justify-between px-4 border-b border-slate-700">
        <h3 className="text-white font-medium truncate">{title}</h3>
        <Button
          variant="default"
          size="sm"
          className="bg-red-600 hover:bg-red-700 text-white border-0 font-medium"
          onClick={toggleFullscreen}
        >
          <Minimize2 className="h-4 w-4 mr-2" />
          Collapse / Exit
        </Button>
      </div>
      
      {/* Document container - full width display */}
      <div className="flex-1 relative">
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allow="autoplay"
          allowFullScreen
          title={title}
        />
        {/* Small overlay to cover just the popup icon in top-right */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-slate-900 pointer-events-none" />
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      {fullscreenOverlay}
      <div ref={containerRef} className="h-full w-full bg-slate-900 relative">
        {/* Expand button */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-2 right-14 z-10 bg-slate-800/80 hover:bg-slate-700 text-white border-0"
          onClick={toggleFullscreen}
        >
          <Maximize2 className="h-4 w-4 mr-2" />
          Expand
        </Button>
        
        {/* Small overlay to cover just the popup icon in top-right corner */}
        <div className="absolute top-0 right-0 w-12 h-12 bg-slate-900 z-[5] pointer-events-none" />
        
        {/* Document iframe - full size */}
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allow="autoplay"
          allowFullScreen
          title={title}
        />
      </div>
    </>
  );
}
