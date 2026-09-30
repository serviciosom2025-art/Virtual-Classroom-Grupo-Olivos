import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const examId = typeof body.examId === "string" ? body.examId : "";
    const totalQuestions = Number(body.totalQuestions);
    const folderId = typeof body.folderId === "string" ? body.folderId : null;

    if (!examId || !Number.isFinite(totalQuestions) || totalQuestions < 0) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { data: existingResult, error: resultError } = await supabase
      .from("exam_results")
      .select("id, attempts_used")
      .eq("exam_id", examId)
      .eq("student_id", authData.user.id)
      .maybeSingle();

    if (resultError) throw resultError;

    if (existingResult) {
      const { error } = await supabase
        .from("exam_results")
        .update({
          attempts_used: existingResult.attempts_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingResult.id)
        .eq("student_id", authData.user.id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from("exam_results").insert({
        student_id: authData.user.id,
        exam_id: examId,
        folder_id: folderId,
        highest_score: 0,
        total_questions: totalQuestions,
        attempts_used: 1,
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error recording abandoned exam attempt:", error);
    return NextResponse.json({ error: "Could not record attempt" }, { status: 500 });
  }
}
