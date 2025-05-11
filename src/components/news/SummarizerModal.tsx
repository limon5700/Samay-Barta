
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SummarizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleTitle: string;
  summary: string;
  isLoading: boolean;
  error?: string;
}

export default function SummarizerModal({
  isOpen,
  onClose,
  articleTitle,
  summary,
  isLoading,
  error,
}: SummarizerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card shadow-xl rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl text-primary">AI Summary</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Summary for: <span className="font-semibold">{articleTitle}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 min-h-[150px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Generating summary...</p>
            </div>
          ) : error ? (
            <div className="text-destructive-foreground bg-destructive p-4 rounded-md text-center">
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          ) : (
            <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-background">
              <p className="text-sm text-foreground whitespace-pre-wrap">{summary || "No summary available."}</p>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose} variant="outline" className="transition-colors">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
