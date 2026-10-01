"use client";

import { ExternalLink } from "lucide-react";
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
  const viewerUrl = getEmbeddedUrl(url);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
      <div className="flex items-center justify-between gap-3 border-b bg-white px-4 py-3">
        <p className="truncate text-sm text-slate-600">{url}</p>
        <Button asChild size="sm" variant="outline">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink data-icon="inline-start" />
            Open in new window
          </a>
        </Button>
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
