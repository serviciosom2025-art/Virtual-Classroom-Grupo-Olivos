"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExternalLinkViewerProps {
  url: string;
  title: string;
}

export function ExternalLinkViewer({ url, title }: ExternalLinkViewerProps) {
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
        src={url}
        title={title}
        className="min-h-0 flex-1 border-0 bg-white"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
