
/*
  # Training System Schema

  ## Overview
  Full LMS (Learning Management System) with courses, modules, lessons, and progress tracking.

  ## Tables

  ### courses
  - Main training courses with metadata, category, and duration info.

  ### modules
  - Course sections grouping related lessons together.

  ### lessons
  - Individual learning units within a module (video, text, quiz).

  ### enrollments
  - Tracks which users are enrolled in which courses and overall progress.

  ### lesson_progress
  - Granular per-lesson completion tracking per user.

  ## Security
  - RLS enabled on all tables
  - Demo mode: users can read all courses/modules/lessons
  - Users can only manage their own progress/enrollments
*/

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'General',
  thumbnail_url text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'Iniciante',
  instructor text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published courses"
  ON courses FOR SELECT
  USING (published = true);

-- Modules table
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view modules"
  ON modules FOR SELECT
  USING (true);

-- Lessons table
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  lesson_type text NOT NULL DEFAULT 'video',
  duration_minutes integer NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons"
  ON lessons FOR SELECT
  USING (true);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress_percent integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, course_id)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments"
  ON enrollments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enrollments"
  ON enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own enrollments"
  ON enrollments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Lesson progress table
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lesson progress"
  ON lesson_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson progress"
  ON lesson_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson progress"
  ON lesson_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Seed sample courses
INSERT INTO courses (title, description, category, thumbnail_url, duration_minutes, level, instructor) VALUES
(
  'Liderança e Gestão de Equipes',
  'Aprenda as habilidades essenciais para liderar equipes de alto desempenho, gerenciar conflitos e inspirar resultados extraordinários.',
  'Liderança',
  'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800',
  180,
  'Intermediário',
  'Ana Paula Ribeiro'
),
(
  'Comunicação Assertiva no Trabalho',
  'Desenvolva habilidades de comunicação que transformam relações profissionais, aumentam a produtividade e constroem uma carreira sólida.',
  'Soft Skills',
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800',
  120,
  'Iniciante',
  'Carlos Mendes'
),
(
  'Excel Avançado para Gestão',
  'Domine funções avançadas, dashboards, macros e automações para análise de dados e relatórios gerenciais profissionais.',
  'Tecnologia',
  'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=800',
  240,
  'Avançado',
  'Fernanda Costa'
),
(
  'Segurança no Trabalho - NR-35',
  'Treinamento obrigatório sobre trabalho em altura, prevenção de acidentes e normas regulamentadoras essenciais.',
  'Segurança',
  'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=800',
  90,
  'Iniciante',
  'Roberto Alves'
),
(
  'Gestão de Projetos com Método Ágil',
  'Implemente Scrum, Kanban e frameworks ágeis para entregar projetos com mais eficiência, qualidade e satisfação do cliente.',
  'Gestão',
  'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800',
  210,
  'Intermediário',
  'Juliana Torres'
),
(
  'Atendimento ao Cliente de Excelência',
  'Técnicas avançadas de relacionamento com clientes, resolução de conflitos e fidelização para superar expectativas.',
  'Vendas',
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800',
  150,
  'Iniciante',
  'Marcos Oliveira'
);

-- Seed modules for first course
DO $$
DECLARE
  course1_id uuid;
  mod1_id uuid;
  mod2_id uuid;
  mod3_id uuid;
BEGIN
  SELECT id INTO course1_id FROM courses WHERE title = 'Liderança e Gestão de Equipes' LIMIT 1;

  INSERT INTO modules (course_id, title, order_index) VALUES (course1_id, 'Fundamentos da Liderança', 1) RETURNING id INTO mod1_id;
  INSERT INTO modules (course_id, title, order_index) VALUES (course1_id, 'Gestão de Pessoas', 2) RETURNING id INTO mod2_id;
  INSERT INTO modules (course_id, title, order_index) VALUES (course1_id, 'Resultados e Performance', 3) RETURNING id INTO mod3_id;

  INSERT INTO lessons (module_id, title, content, lesson_type, duration_minutes, order_index) VALUES
  (mod1_id, 'O que é liderança?', 'Nesta aula, exploraremos a definição de liderança, os diferentes estilos e como identificar seu perfil como líder. A liderança é a capacidade de influenciar pessoas em direção a objetivos comuns, criando um ambiente onde cada membro da equipe pode desenvolver seu potencial máximo.

**Principais conceitos:**
- Diferença entre líder e chefe
- Estilos de liderança (autocrático, democrático, liberal)
- Inteligência emocional no contexto da liderança
- Auto-avaliação: Qual é o seu estilo?', 'video', 20, 1),
  (mod1_id, 'Habilidades do líder moderno', 'O líder do século XXI precisa dominar um conjunto de habilidades que vão muito além do conhecimento técnico. Comunicação, empatia, visão estratégica e capacidade de adaptação são fundamentais.

**O que você aprenderá:**
- As 5 competências essenciais do líder moderno
- Como desenvolver escuta ativa
- Tomada de decisão sob pressão
- Construindo credibilidade e confiança', 'video', 25, 2),
  (mod1_id, 'Avaliação: Fundamentos', 'Teste seus conhecimentos sobre os fundamentos da liderança com questões práticas baseadas em situações reais do ambiente de trabalho.', 'quiz', 15, 3),
  (mod2_id, 'Motivação e engajamento', 'Descubra as principais teorias de motivação e como aplicá-las para manter sua equipe engajada e produtiva. Aprenda a identificar o que move cada membro e personalize sua abordagem.

**Teorias abordadas:**
- Hierarquia de Maslow
- Teoria dos dois fatores de Herzberg
- Teoria da autodeterminação
- Reconhecimento e feedback efetivo', 'video', 30, 1),
  (mod2_id, 'Feedback e avaliação de desempenho', 'O feedback é uma das ferramentas mais poderosas do líder. Aprenda a dar e receber feedback de forma construtiva, estruturar avaliações de desempenho e criar planos de desenvolvimento individual.', 'video', 25, 2),
  (mod3_id, 'Definindo metas e OKRs', 'Aprenda a definir objetivos claros e mensuráveis usando a metodologia OKR (Objectives and Key Results), alinhando a equipe em torno de resultados concretos.', 'video', 20, 1),
  (mod3_id, 'Cultura de alta performance', 'Como criar e manter uma cultura organizacional voltada para resultados, onde a excelência é o padrão e a melhoria contínua é um valor compartilhado.', 'video', 25, 2);
END $$;
