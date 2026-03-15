"use client";

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";

interface ExamLockContextType {
  isExamInProgress: boolean;
  examTitle: string;
  setExamInProgress: (inProgress: boolean, title?: string) => void;
}

const ExamLockContext = createContext<ExamLockContextType | undefined>(undefined);

export function ExamLockProvider({ children }: { children: ReactNode }) {
  const [isExamInProgress, setIsExamInProgress] = useState(false);
  const [examTitle, setExamTitle] = useState("");

  const setExamInProgress = useCallback((inProgress: boolean, title?: string) => {
    setIsExamInProgress(inProgress);
    setExamTitle(title || "");
  }, []);

  // Prevent browser back/forward navigation and page refresh during exam
  useEffect(() => {
    if (!isExamInProgress) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "You have an exam in progress. Are you sure you want to leave?";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isExamInProgress]);

  return (
    <ExamLockContext.Provider value={{ isExamInProgress, examTitle, setExamInProgress }}>
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
