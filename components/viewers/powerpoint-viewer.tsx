"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Maximize2, Minimize2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PowerPointViewerProps {
  url: string;
  fileName: string;
  canDownload?: boolean;
}

export function PowerPointViewer({ url, fileName, canDownload = true }: PowerPointViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewerError, setViewerError] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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

  // Navigate slides by simulating keyboard events on the iframe
  const navigateSlide = (direction: 'prev' | 'next') => {
    if (iframeRef.current) {
      // Focus the iframe and send keyboard event
      iframeRef.current.focus();
      const key = direction === 'next' ? 'ArrowRight' : 'ArrowLeft';
      const keyCode = direction === 'next' ? 39 : 37;
      
      // Try to send keyboard event to iframe
      try {
        iframeRef.current.contentWindow?.postMessage({
          type: 'keydown',
          key: key,
          keyCode: keyCode
        }, '*');
      } catch {
        // Cross-origin restriction - fall back to manual tracking
      }
      
      // Update local slide counter for visual feedback
      if (direction === 'next') {
        setCurrentSlide(prev => prev + 1);
      } else {
        setCurrentSlide(prev => Math.max(1, prev - 1));
      }
    }
  };

  // Handle keyboard navigation when viewer is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        setCurrentSlide(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        setCurrentSlide(prev => Math.max(1, prev - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      <div 
        className="flex-1 relative overflow-hidden"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(true)}
      >
        <iframe
          ref={iframeRef}
          src={officeViewerUrl}
          className="absolute inset-0 w-full h-full border-0"
          title={fileName}
          onError={() => setViewerError(true)}
          allow="fullscreen"
        />
        
        {/* Navigation Arrows - Always visible */}
        {showControls && (
          <>
            {/* Left Arrow - Previous Slide */}
            <button
              onClick={() => navigateSlide('prev')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-lg hover:scale-110"
              title="Previous slide (Left Arrow key)"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            
            {/* Right Arrow - Next Slide */}
            <button
              onClick={() => navigateSlide('next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-lg hover:scale-110"
              title="Next slide (Right Arrow key)"
              aria-label="Next slide"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
            
            {/* Slide indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-black/60 rounded-full text-white text-sm font-medium">
              Slide {currentSlide}
            </div>
          </>
        )}
        
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
