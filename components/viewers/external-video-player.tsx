"use client";

import { useState, useEffect } from "react";
import { AlertCircle, ExternalLink } from "lucide-react";

interface ExternalVideoPlayerProps {
  url: string;
  title?: string;
}

// Convert Google Drive/OneDrive sharing links to embeddable URLs
function getEmbedUrl(url: string): { embedUrl: string; provider: "google" | "onedrive" | "unknown" } {
  // Google Drive patterns
  // https://drive.google.com/file/d/FILE_ID/view
  // https://drive.google.com/open?id=FILE_ID
  const googleDriveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
  const googleDriveMatch2 = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  
  if (googleDriveMatch) {
    const fileId = googleDriveMatch[1];
    return {
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      provider: "google"
    };
  }
  
  if (googleDriveMatch2) {
    const fileId = googleDriveMatch2[1];
    return {
      embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
      provider: "google"
    };
  }

  // OneDrive patterns
  // https://onedrive.live.com/embed?id=...
  // https://1drv.ms/v/...
  // https://onedrive.live.com/?id=...&cid=...
  if (url.includes("onedrive.live.com/embed")) {
    return { embedUrl: url, provider: "onedrive" };
  }

  if (url.includes("1drv.ms")) {
    // Convert 1drv.ms short links to embed format
    // The user should provide the embed link directly for best results
    return { embedUrl: url.replace("1drv.ms/v/", "1drv.ms/e/"), provider: "onedrive" };
  }

  if (url.includes("onedrive.live.com")) {
    // Try to convert to embed URL
    const embedUrl = url.replace("onedrive.live.com/?", "onedrive.live.com/embed?");
    return { embedUrl, provider: "onedrive" };
  }

  // SharePoint / OneDrive for Business
  if (url.includes("sharepoint.com") || url.includes("-my.sharepoint.com")) {
    // For SharePoint, we need to modify the URL to use embed
    let embedUrl = url;
    if (!url.includes("embed")) {
      embedUrl = url.replace("/:v:/", "/embed/");
    }
    return { embedUrl, provider: "onedrive" };
  }

  // Unknown provider - try to use as-is
  return { embedUrl: url, provider: "unknown" };
}

export function ExternalVideoPlayer({ url, title }: ExternalVideoPlayerProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const { embedUrl, provider } = getEmbedUrl(url);

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [url]);

  const handleLoad = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/50 rounded-lg p-8">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium mb-2">Unable to load video</p>
        <p className="text-sm text-muted-foreground text-center mb-4">
          The video could not be embedded. Make sure the sharing settings allow embedding.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          Open in new tab
        </a>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
            <p className="text-white text-sm">Loading video...</p>
          </div>
        </div>
      )}
      <iframe
        src={embedUrl}
        className="w-full h-full"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        onLoad={handleLoad}
        onError={handleError}
        title={title || "External Video"}
        style={{
          border: "none",
        }}
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
      />
      {/* Overlay to prevent right-click and interactions that could reveal URL */}
      <div 
        className="absolute inset-0 z-20 pointer-events-none"
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
