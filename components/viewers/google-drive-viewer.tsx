"use client";

import { useEffect, useState } from "react";
import { FileText, Presentation, ExternalLink } from "lucide-react";

interface GoogleDriveViewerProps {
  url: string;
  title: string;
}

export function GoogleDriveViewer({ url, title }: GoogleDriveViewerProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      // Google Slides - use embed URL
      return `https://docs.google.com/presentation/d/${fileId}/embed?start=false&loop=false&delayms=3000`;
    } else if (originalUrl.includes("docs.google.com/document")) {
      // Google Docs - use preview URL
      return `https://docs.google.com/document/d/${fileId}/preview`;
    } else if (originalUrl.includes("docs.google.com/spreadsheets")) {
      // Google Sheets - use preview URL
      return `https://docs.google.com/spreadsheets/d/${fileId}/preview`;
    } else {
      // Regular file (PDF, PPTX, etc.) - use preview URL that prevents download
      return `https://drive.google.com/file/d/${fileId}/preview`;
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
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Google Drive
          </a>
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

  return (
    <div className="h-full w-full bg-slate-900">
      <iframe
        src={embedUrl}
        className="w-full h-full border-0"
        allow="autoplay"
        allowFullScreen
        title={title}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}
