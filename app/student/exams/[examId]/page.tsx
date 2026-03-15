"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Trophy,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import type { Exam, Question, ExamResult } from "@/lib/types";

type ExamState = "intro" | "taking" | "result";

interface ShuffledQuestion extends Question {
  shuffledOptions: { key: string; value: string }[];
}

export default function ExamTakingPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const { user } = useAuth();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [existingResult, setExistingResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [examState, setExamState] = useState<ExamState>("intro");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);

  const supabase = createClient();

  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const [examRes, questionsRes, resultRes] = await Promise.all([
        supabase.from("exams").select("*").eq("id", examId).single(),
        supabase.from("questions").select("*").eq("exam_id", examId),
        supabase.from("exam_results").select("*").eq("exam_id", examId).eq("student_id", user.id).single(),
      ]);

      if (examRes.error || !examRes.data) {
        router.push("/student/exams");
        return;
      }

      setExam(examRes.data);
      setExistingResult(resultRes.data || null);

      // Process questions
      let processedQuestions = questionsRes.data || [];

      // Always shuffle questions first to get random selection from the bank
      // This ensures different questions are shown on each attempt
      processedQuestions = shuffleArray(processedQuestions);

      // Limit questions to the configured questions_count
      const questionsToShow = examRes.data.questions_count || processedQuestions.length;
      processedQuestions = processedQuestions.slice(0, questionsToShow);

      // If randomize_questions is disabled, sort by created_at or id for consistent order within the selected questions
      if (!examRes.data.randomize_questions) {
        processedQuestions = processedQuestions.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }

      // Shuffle answer options if enabled
      const shuffledQuestions: ShuffledQuestion[] = processedQuestions.map((q) => {
        // Normalize option values to handle special characters (Spanish accents, etc.)
        // Only include options that have actual values
        const allOptions = [
          { key: "A", value: q.option_a },
          { key: "B", value: q.option_b },
          { key: "C", value: q.option_c },
          { key: "D", value: q.option_d },
        ];
        
        // Filter out null/undefined/empty options first, then normalize
        let options = allOptions
          .filter(opt => opt.value != null && opt.value !== "")
          .map(opt => ({
            key: opt.key,
            value: String(opt.value).normalize("NFC")
          }));

        if (examRes.data.randomize_answers && options.length > 0) {
          options = shuffleArray(options);
        }

        return { ...q, shuffledOptions: options };
      });

      setQuestions(shuffledQuestions);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, examId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Timer effect
  useEffect(() => {
    if (examState !== "taking" || timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examState, timeLeft]);

  const startExam = () => {
    if (exam?.time_limit) {
      setTimeLeft(exam.time_limit * 60);
    }
    setExamState("taking");
    setAnswers({});
    setCurrentQuestionIndex(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (questionId: string, answer: string) => {
    // Normalize the answer string to handle special characters (Spanish accents, etc.)
    const normalizedAnswer = answer?.normalize("NFC") || "";
    setAnswers((prev) => ({ ...prev, [questionId]: normalizedAnswer }));
  };

  const handleSubmitExam = async () => {
    if (!user || !exam) return;
    setSubmitting(true);
    setShowSubmitDialog(false);

    // Calculate score
    let score = 0;
    questions.forEach((q) => {
      if (q.shuffledOptions && answers[q.id]) {
        // Normalize strings for comparison to handle special characters (Spanish accents, etc.)
        const normalizedAnswer = answers[q.id]?.normalize("NFC") || "";
        const selectedOption = q.shuffledOptions.find((opt) => {
          const normalizedOptValue = opt.value?.normalize("NFC") || "";
          return normalizedAnswer === normalizedOptValue;
        });
        if (selectedOption && selectedOption.key === q.correct_answer) {
          score++;
        }
      }
    });

    const totalQuestions = questions.length;
    const attemptNumber = (existingResult?.attempts_used || 0) + 1;

    // Save attempt
    await supabase.from("exam_attempts").insert({
      student_id: user.id,
      exam_id: examId,
      attempt_number: attemptNumber,
      score,
      total_questions: totalQuestions,
      answers,
      completed_at: new Date().toISOString(),
    });

    // Update or create result
    if (existingResult) {
      await supabase
        .from("exam_results")
        .update({
          highest_score: Math.max(existingResult.highest_score, score),
          attempts_used: attemptNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingResult.id);
    } else {
      await supabase.from("exam_results").insert({
        student_id: user.id,
        exam_id: examId,
        folder_id: exam.folder_id,
        highest_score: score,
        total_questions: totalQuestions,
        attempts_used: attemptNumber,
        completed_at: new Date().toISOString(),
      });
    }

    setResult({ score, total: totalQuestions });
    setExamState("result");
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  if (!exam) {
    return null;
  }

  // Check if max attempts reached
  const attemptsLeft = exam.max_attempts - (existingResult?.attempts_used || 0);
  const canTakeExam = attemptsLeft > 0;

  // Intro Screen
  if (examState === "intro") {
    return (
      <div className="max-w-2xl mx-auto">
        <Link href="/student/exams">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exams
          </Button>
        </Link>

        <Card className="bg-white shadow-sm">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">{exam.title}</CardTitle>
            {exam.description && (
              <CardDescription className="text-base mt-2">{exam.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-800">{exam.questions_count}</p>
                <p className="text-sm text-slate-500">Questions</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-800">
                  {exam.time_limit ? `${exam.time_limit}m` : "∞"}
                </p>
                <p className="text-sm text-slate-500">Time Limit</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-800">{attemptsLeft}</p>
                <p className="text-sm text-slate-500">Attempts Left</p>
              </div>
            </div>

            {existingResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-700 mb-2">
                  <Trophy className="w-5 h-5" />
                  <span className="font-medium">Previous Best Score</span>
                </div>
                <p className="text-2xl font-bold text-emerald-800">
                  {existingResult.highest_score}/{existingResult.total_questions}{" "}
                  <span className="text-base font-normal">
                    ({Math.round((existingResult.highest_score / existingResult.total_questions) * 100)}%)
                  </span>
                </p>
              </div>
            )}

            {canTakeExam ? (
              <Button
                onClick={startExam}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
              >
                {existingResult ? "Retake Exam" : "Start Exam"}
              </Button>
            ) : (
              <div className="text-center p-4 bg-slate-100 rounded-lg">
                <p className="text-slate-600">You have used all your attempts for this exam.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Result Screen
  if (examState === "result" && result) {
    const scorePercent = Math.round((result.score / result.total) * 100);
    const passed = scorePercent >= 70;

    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white shadow-sm">
          <CardContent className="py-12 text-center">
            <div
              className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${
                passed ? "bg-emerald-100" : "bg-amber-100"
              }`}
            >
              {passed ? (
                <Trophy className="w-12 h-12 text-emerald-600" />
              ) : (
                <RotateCcw className="w-12 h-12 text-amber-600" />
              )}
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {passed ? "Congratulations!" : "Keep Practicing!"}
            </h2>
            <p className="text-slate-500 mb-6">
              {passed
                ? "You passed the exam successfully."
                : "You can retake the exam to improve your score."}
            </p>

            <div className="inline-block p-6 bg-slate-50 rounded-xl mb-6">
              <p className="text-5xl font-bold text-slate-800 mb-1">
                {result.score}/{result.total}
              </p>
              <p className="text-lg text-slate-500">{scorePercent}% correct</p>
            </div>

            <Progress value={scorePercent} className="h-3 mb-8" />

            <div className="flex gap-4 justify-center">
              <Link href="/student/exams">
                <Button variant="outline">Back to Exams</Button>
              </Link>
              {attemptsLeft - 1 > 0 && (
                <Button onClick={startExam} className="bg-blue-600 hover:bg-blue-700">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake Exam
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Taking Exam Screen
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // Safety check - if no questions or invalid index or no options, show loading
  if (!currentQuestion || !currentQuestion.shuffledOptions || currentQuestion.shuffledOptions.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{exam.title}</h1>
          <p className="text-sm text-slate-500">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>
        {timeLeft !== null && (
          <Badge
            className={`text-lg px-4 py-2 ${
              timeLeft < 60 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
            }`}
          >
            <Clock className="w-4 h-4 mr-2" />
            {formatTime(timeLeft)}
          </Badge>
        )}
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
          <span>Progress</span>
          <span>
            {answeredCount}/{questions.length} answered
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Question */}
      <Card className="bg-white shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.shuffledOptions.map((option, index) => {
            if (!option || option.value == null) return null;
            const answerValue = answers[currentQuestion.id];
            const normalizedAnswer = answerValue ? String(answerValue).normalize("NFC") : "";
            const normalizedValue = String(option.value).normalize("NFC");
            const isSelected = normalizedAnswer !== "" && normalizedAnswer === normalizedValue;
            return (
              <button
                key={index}
                onClick={() => handleAnswer(currentQuestion.id, option.value)}
                className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full mr-3 text-sm font-medium ${
                    isSelected ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span className={isSelected ? "text-blue-800" : "text-slate-700"}>
                  {option.value}
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        {currentQuestionIndex === questions.length - 1 ? (
          <Button
            onClick={() => setShowSubmitDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={submitting}
          >
            {submitting && <Spinner className="w-4 h-4 mr-2" />}
            <CheckCircle className="w-4 h-4 mr-2" />
            Submit Exam
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Question Navigator */}
      <Card className="bg-white shadow-sm mt-6">
        <CardContent className="py-4">
          <p className="text-sm text-slate-500 mb-3">Jump to question:</p>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, index) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = index === currentQuestionIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent
                      ? "bg-blue-600 text-white"
                      : isAnswered
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answeredCount} out of {questions.length} questions.
              {answeredCount < questions.length && (
                <span className="block mt-2 text-amber-600">
                  Warning: {questions.length - answeredCount} questions are unanswered.
                </span>
              )}
              Are you sure you want to submit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Exam</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmitExam}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Submit Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
