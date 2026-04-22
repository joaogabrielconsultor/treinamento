-- EduTrain Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (auth)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Courses
CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Geral',
  thumbnail_url text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'Iniciante',
  instructor text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Modules
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  lesson_type text NOT NULL DEFAULT 'video' CHECK (lesson_type IN ('video','text','quiz')),
  duration_minutes integer NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  progress_percent integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(user_id, course_id)
);

-- Lesson progress
CREATE TABLE IF NOT EXISTS lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- ───────────────────────────── SEED DATA ─────────────────────────────

-- Admin user (senha: admin123)
INSERT INTO users (full_name, email, password_hash, role) VALUES
('Administrador', 'admin@edutrain.com', crypt('admin123', gen_salt('bf')), 'admin')
ON CONFLICT (email) DO NOTHING;

-- Courses
INSERT INTO courses (title, description, category, thumbnail_url, duration_minutes, level, instructor) VALUES
(
  'Liderança e Gestão de Equipes',
  'Desenvolva habilidades essenciais de liderança, aprenda a motivar equipes, dar feedbacks eficazes e alcançar resultados extraordinários.',
  'Gestão',
  'https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=800',
  180, 'Intermediário', 'Carlos Mendes'
),
(
  'Excel Avançado para Gestão',
  'Domine funções avançadas, dashboards, macros e automações para análise de dados e relatórios gerenciais profissionais.',
  'Tecnologia',
  'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=800',
  240, 'Avançado', 'Fernanda Costa'
),
(
  'Segurança no Trabalho - NR-35',
  'Treinamento obrigatório sobre trabalho em altura, prevenção de acidentes e normas regulamentadoras essenciais.',
  'Segurança',
  'https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=800',
  90, 'Iniciante', 'Roberto Alves'
),
(
  'Gestão de Projetos com Método Ágil',
  'Implemente Scrum, Kanban e frameworks ágeis para entregar projetos com mais eficiência e qualidade.',
  'Gestão',
  'https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg?auto=compress&cs=tinysrgb&w=800',
  210, 'Intermediário', 'Juliana Torres'
),
(
  'Atendimento ao Cliente de Excelência',
  'Técnicas avançadas de relacionamento com clientes, resolução de conflitos e fidelização.',
  'Vendas',
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800',
  150, 'Iniciante', 'Marcos Oliveira'
);

-- Modules e Lessons para o curso 1 (Liderança)
DO $$
DECLARE
  c1 uuid; m1 uuid; m2 uuid; m3 uuid;
BEGIN
  SELECT id INTO c1 FROM courses WHERE title = 'Liderança e Gestão de Equipes' LIMIT 1;

  INSERT INTO modules (course_id, title, order_index) VALUES (c1, 'Fundamentos da Liderança', 1) RETURNING id INTO m1;
  INSERT INTO modules (course_id, title, order_index) VALUES (c1, 'Gestão de Pessoas', 2) RETURNING id INTO m2;
  INSERT INTO modules (course_id, title, order_index) VALUES (c1, 'Resultados e Performance', 3) RETURNING id INTO m3;

  INSERT INTO lessons (module_id, title, content, lesson_type, duration_minutes, order_index) VALUES
  (m1, 'O que é liderança?',
   'Nesta aula, exploraremos a definição de liderança e os diferentes estilos.

**Principais conceitos:**
- Diferença entre líder e chefe
- Estilos de liderança (autocrático, democrático, liberal)
- Inteligência emocional no contexto da liderança', 'video', 20, 1),
  (m1, 'Habilidades do líder moderno',
   'O líder do século XXI precisa dominar comunicação, empatia e visão estratégica.

**O que você aprenderá:**
- As 5 competências essenciais do líder moderno
- Como desenvolver escuta ativa
- Tomada de decisão sob pressão', 'video', 25, 2),
  (m1, 'Avaliação: Fundamentos', 'Teste seus conhecimentos sobre os fundamentos da liderança.', 'quiz', 15, 3),
  (m2, 'Motivação e engajamento',
   'Descubra as principais teorias de motivação e como aplicá-las.

**Teorias abordadas:**
- Hierarquia de Maslow
- Teoria dos dois fatores de Herzberg
- Reconhecimento e feedback efetivo', 'video', 30, 1),
  (m2, 'Feedback e avaliação de desempenho',
   'O feedback é uma das ferramentas mais poderosas do líder. Aprenda a dar e receber feedback de forma construtiva.', 'video', 25, 2),
  (m3, 'Definindo metas e OKRs',
   'Aprenda a definir objetivos claros usando a metodologia OKR (Objectives and Key Results).', 'video', 20, 1),
  (m3, 'Cultura de alta performance',
   'Como criar e manter uma cultura organizacional voltada para resultados.', 'video', 25, 2);

  -- Modules para curso 2 (Excel)
  SELECT id INTO c1 FROM courses WHERE title = 'Excel Avançado para Gestão' LIMIT 1;
  INSERT INTO modules (course_id, title, order_index) VALUES (c1, 'Funções Avançadas', 1) RETURNING id INTO m1;
  INSERT INTO modules (course_id, title, order_index) VALUES (c1, 'Dashboards e Gráficos', 2) RETURNING id INTO m2;
  INSERT INTO lessons (module_id, title, content, lesson_type, duration_minutes, order_index) VALUES
  (m1, 'PROCV e ÍNDICE/CORRESP', 'Domine as funções de busca mais poderosas do Excel para cruzar dados entre planilhas.', 'video', 30, 1),
  (m1, 'Tabelas Dinâmicas', 'Aprenda a criar e personalizar tabelas dinâmicas para análise de dados.', 'video', 40, 2),
  (m2, 'Criando Dashboards Profissionais', 'Monte dashboards interativos com segmentações e gráficos dinâmicos.', 'video', 50, 1);
END $$;
