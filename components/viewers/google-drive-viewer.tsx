"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { FileText, Maximize2, Minimize2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GoogleDriveViewerProps {
  url: string;
  title: string;
}

export function GoogleDriveViewer({ url, title }: GoogleDriveViewerProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPresentation, setIsPresentation] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fullscreenIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    try {
      // Convert Google Drive sharing link to embed/preview link
      const converted = convertGoogleDriveUrl(url);
      if (converted) {
        setEmbedUrl(converted.url);
        setIsPresentation(converted.isPresentation);
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

  // Navigate slides for presentations
  const navigateSlide = useCallback((direction: 'prev' | 'next') => {
    // Try to send keyboard event to the active iframe
    const activeIframe = isFullscreen ? fullscreenIframeRef.current : iframeRef.current;
    if (activeIframe) {
      activeIframe.focus();
      try {
        // Try posting message to iframe
        activeIframe.contentWindow?.postMessage({
          type: 'keydown',
          key: direction === 'next' ? 'ArrowRight' : 'ArrowLeft'
        }, '*');
      } catch {
        // Cross-origin restriction
      }
    }
    
    // Update local slide counter for visual feedback
    if (direction === 'next') {
      setCurrentSlide(prev => prev + 1);
    } else {
      setCurrentSlide(prev => Math.max(1, prev - 1));
    }
  }, [isFullscreen]);

  // Convert various Google Drive URL formats to embeddable preview URL
  function convertGoogleDriveUrl(originalUrl: string): { url: string; isPresentation: boolean } | null {
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
    // Also check if file name suggests it's a PowerPoint
    const isPptx = originalUrl.toLowerCase().includes('.pptx') || 
                   originalUrl.toLowerCase().includes('.ppt') ||
                   originalUrl.includes("docs.google.com/presentation");
    
    if (originalUrl.includes("docs.google.com/presentation")) {
      // Google Slides - use embed URL with rm=minimal to hide branding
      return { 
        url: `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000&rm=minimal`,
        isPresentation: true 
      };
    } else if (originalUrl.includes("docs.google.com/document")) {
      // Google Docs - use preview URL
      return { url: `https://docs.google.com/document/d/${fileId}/preview?rm=minimal`, isPresentation: false };
    } else if (originalUrl.includes("docs.google.com/spreadsheets")) {
      // Google Sheets - use preview URL
      return { url: `https://docs.google.com/spreadsheets/d/${fileId}/preview?rm=minimal`, isPresentation: false };
    } else {
      // Regular file (PDF, PPTX, etc.) - use preview URL that prevents download
      // PPTX files from Drive also need navigation arrows
      return { url: `https://drive.google.com/file/d/${fileId}/preview?rm=minimal`, isPresentation: isPptx };
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
          ref={fullscreenIframeRef}
          src={embedUrl}
          className="w-full h-full border-0"
          allow="autoplay"
          allowFullScreen
          title={title}
        />
        {/* Navigation Arrows for presentations */}
        {isPresentation && (
          <>
            {/* Left Arrow - Previous Slide */}
            <button
              onClick={() => navigateSlide('prev')}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-lg hover:scale-110"
              title="Previous slide"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
            
            {/* Right Arrow - Next Slide */}
            <button
              onClick={() => navigateSlide('next')}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-14 h-14 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-lg hover:scale-110"
              title="Next slide"
              aria-label="Next slide"
            >
              <ChevronRight className="w-10 h-10" />
            </button>
            
            {/* Slide indicator */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-5 py-2.5 bg-black/60 rounded-full text-white text-base font-medium">
              Slide {currentSlide}
            </div>
          </>
        )}
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
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full border-0"
          allow="autoplay"
          allowFullScreen
          title={title}
        />
        
        {/* Navigation Arrows for presentations */}
        {isPresentation && (
          <>
            {/* Left Arrow - Previous Slide */}
            <button
              onClick={() => navigateSlide('prev')}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-lg hover:scale-110"
              title="Previous slide"
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            
            {/* Right Arrow - Next Slide */}
            <button
              onClick={() => navigateSlide('next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-lg hover:scale-110"
              title="Next slide"
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
      </div>
    </>
  );
}
