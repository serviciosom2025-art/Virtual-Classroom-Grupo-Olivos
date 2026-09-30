"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";

interface ExamLockContextType {
  isExamInProgress: boolean;
  examTitle: string;
  examExitWarning: string;
  setExamInProgress: (inProgress: boolean, title?: string, exitWarning?: string) => void;
}

const ExamLockContext = createContext<ExamLockContextType | undefined>(undefined);

export function ExamLockProvider({ children }: { children: ReactNode }) {
  const [isExamInProgress, setIsExamInProgress] = useState(false);
  const [examTitle, setExamTitle] = useState("");
  const [examExitWarning, setExamExitWarning] = useState("");

  const setExamInProgress = useCallback((inProgress: boolean, title?: string, exitWarning?: string) => {
    setIsExamInProgress(inProgress);
    setExamTitle(title || "");
    setExamExitWarning(exitWarning || "");
  }, []);

  // Warn before browser refresh, back, or tab close during an exam.
  useEffect(() => {
    if (!isExamInProgress) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = examExitWarning || "Refreshing or leaving this exam will count as an attempt.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [examExitWarning, isExamInProgress]);

  return (
    <ExamLockContext.Provider value={{ isExamInProgress, examTitle, examExitWarning, setExamInProgress }}>
      {children}
    </ExamLockContext.Provider>
  );
}

export function useExamLock() {
  const context = useContext(ExamLockContext);
  if (context === undefined) {
    throw new Error("useExamLock must be used within an ExamLockProvider");
  }
  return context;
}
