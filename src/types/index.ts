export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string;
  duration_minutes: number;
  level: string;
  instructor: string;
  published: boolean;
  created_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
  lessons?: Lesson[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content: string;
  lesson_type: 'video' | 'text' | 'quiz';
  duration_minutes: number;
  order_index: number;
  created_at: string;
  video_url?: string;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  progress_percent: number;
  completed: boolean;
  enrolled_at: string;
  completed_at: string | null;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export type ViewType =
  | 'dashboard'
  | 'catalog'
  | 'course'
  | 'lesson'
  | 'auth'
  | 'admin-users'
  | 'admin-courses'
  | 'admin-course-edit';

export type AuthMode = 'login';
