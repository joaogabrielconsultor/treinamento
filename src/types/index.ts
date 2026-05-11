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

export interface LoginBanco {
  id: string;
  nome: string;
  login: string;
  senha: string;
  url: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  created_at: string;
}

export interface Bank {
  id: string;
  name: string;
  created_at: string;
}

export interface Convenio {
  id: string;
  name: string;
  created_at: string;
}

export interface TableCategory {
  id: string;
  name: string;
  multiplier: number;
  created_at: string;
}

export interface FinancialTable {
  id: string;
  name: string;
  bank: string;
  bank_id: string | null;
  convenio_id: string | null;
  category_id: string | null;
  active: boolean;
  comissao_empresa: number;
  comissao_corretor: number;
  coeficiente: number;
  created_at: string;
  category_name?: string;
  category_multiplier?: number;
  bank_name?: string;
  convenio_name?: string;
}

export interface CommissionRange {
  id: string;
  financial_table_id: string;
  tipo_proposta: string;
  expires_at: string | null;
  convenio_descricao: string;
  parceiro: string;
  prazo_inicial: number | null;
  prazo_final: number | null;
  juros_inicial: number | null;
  juros_final: number | null;
  coef_inicial: number | null;
  coef_final: number | null;
  comissao_empresa: number;
  comissao_corretor: number;
  disponivel_para: string;
  category_id: string | null;
  min_value: number;
  max_value: number | null;
  base_points: number;
  multiplier: number | null;
  created_at: string;
  category_name?: string;
  category_multiplier?: number;
  table_name?: string;
  bank_name?: string;
  convenio_name?: string;
}

export interface ScoringRule {
  id: string;
  table_id: string;
  min_value: number;
  max_value: number | null;
  points: number;
  created_at: string;
}

export type ProposalStatus = 'Digitada' | 'Em análise' | 'Aprovada' | 'Paga' | 'Cancelada';

export interface Proposal {
  id: string;
  user_id: string;
  proposal_number: string;
  value: number;
  product: string;
  product_id: string | null;
  bank: string;
  bank_id: string | null;
  convenio: string;
  convenio_id: string | null;
  table_id: string | null;
  client_name: string;
  client_cpf: string;
  client_phone: string;
  status: ProposalStatus;
  points_earned: number;
  coeficiente: number;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
  table_name?: string;
  category_name?: string;
  bank_name?: string;
  convenio_name?: string;
  product_name?: string;
  comissao_corretor_pct?: number;
  comissao_valor?: number;
}

export interface RankingEntry {
  user_id: string;
  full_name: string;
  email: string;
  total_points: number;
  proposals_paid: number;
  total_value: number;
  position: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition_type: string;
  condition_value: number;
  earned?: boolean;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  best_streak: number;
  last_activity_date: string | null;
}

export interface MonthlyGoal {
  id: string;
  user_id: string;
  month: number;
  year: number;
  target_points: number;
  target_proposals: number;
}

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface ProductionStats {
  today: { value: number; count: number };
  month: { value: number; count: number };
  avg_ticket: number;
  proposals: {
    total_proposals: number;
    paid: number;
    in_analysis: number;
    approved: number;
    typed: number;
    cancelled: number;
  };
  best_broker: { full_name: string; points: number } | null;
  top_table: { name: string; count: number } | null;
  my_points: number;
  my_position: number | null;
  my_commission_total?: number;
}

export type ViewType =
  | 'dashboard'
  | 'catalog'
  | 'course'
  | 'lesson'
  | 'auth'
  | 'admin-users'
  | 'admin-courses'
  | 'admin-course-edit'
  | 'login-bancos'
  | 'admin-personalizacao'
  | 'proposals'
  | 'ranking'
  | 'production'
  | 'admin-proposals'
  | 'admin-financial-tables'
  | 'admin-categories'
  | 'admin-banks'
  | 'admin-convenios'
  | 'admin-products'
  | 'admin-reports';

export type AuthMode = 'login';
