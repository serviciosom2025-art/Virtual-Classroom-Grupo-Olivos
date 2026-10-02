"use client";

import { useState } from "react";
import { ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExternalLinkViewerProps {
  url: string;
  title: string;
}

function getEmbeddedUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const isLookerStudio = /(^|\.)((looker|data)studio)\.google\.com$/i.test(parsedUrl.hostname);

    if (!isLookerStudio || !parsedUrl.pathname.includes("/reporting/")) {
      return url;
    }

    parsedUrl.hostname = "lookerstudio.google.com";
    parsedUrl.pathname = parsedUrl.pathname
      .replace(/^\/u\/\d+/, "")
      .replace("/reporting/", "/embed/reporting/");
    return parsedUrl.toString();
  } catch {
    return url;
  }
}

export function ExternalLinkViewer({ url, title }: ExternalLinkViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const viewerUrl = getEmbeddedUrl(url);

  return (
    <div
      className={
        isExpanded
          ? "fixed inset-0 z-50 flex min-h-0 flex-col bg-slate-100"
          : "flex h-full min-h-0 flex-col bg-slate-100"
      }
    >
      <div className="flex items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <p className="truncate text-sm text-slate-600">{url}</p>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsExpanded((expanded) => !expanded)}
            aria-label={isExpanded ? "Collapse report" : "Expand report"}
            title={isExpanded ? "Collapse report" : "Expand report"}
          >
            {isExpanded ? <Minimize2 data-icon="inline-start" /> : <Maximize2 data-icon="inline-start" />}
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLink data-icon="inline-start" />
              Open in new window
            </a>
          </Button>
        </div>
      </div>
      <iframe
        src={viewerUrl}
        title={title}
        className="min-h-0 flex-1 border-0 bg-white"
        allow="clipboard-read; clipboard-write; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
