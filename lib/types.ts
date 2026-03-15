export type UserRole = "admin" | "teacher" | "student";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  children?: Folder[];
  files?: FileItem[];
  exams?: Exam[];
}

export interface FileItem {
  id: string;
  name: string;
  type: "video" | "pdf" | "powerpoint";
  file_url: string;
  folder_id: string;
  uploaded_by: string;
  file_size: number | null;
  created_at: string;
  updated_at: string;
}

export interface StudentProgress {
  id: string;
  student_id: string;
  file_id: string | null;
  folder_id: string | null;
  status: "pending" | "completed";
  completed_at: string | null;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  folder_id: string | null;
  created_by: string;
  max_attempts: number;
  questions_count: number;
  randomize_questions: boolean;
  randomize_answers: boolean;
  time_limit: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  exam_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  student_id: string;
  exam_id: string;
  attempt_number: number;
  score: number;
  total_questions: number;
  answers: Record<string, string> | null;
  completed_at: string;
  created_at: string;
}

export interface ExamResult {
  id: string;
  student_id: string;
  exam_id: string;
  folder_id: string | null;
  highest_score: number;
  total_questions: number;
  attempts_used: number;
  completed_at: string;
  updated_at: string;
}

export interface PlatformSettings {
  id: string;
  platform_name: string;
  logo_url: string | null;
  sidebar_color: string;
  primary_color: string;
  background_color: string;
  background_image_url: string | null;
  use_background_image: boolean;
  created_at: string;
  updated_at: string;
}
